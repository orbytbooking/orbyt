-- Locations Management Schema for Multi-Tenant Application
-- Supports OpenStreetMap integration with geocoding and location management

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Locations table with geographic support
CREATE TABLE IF NOT EXISTS locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    
    -- Geographic coordinates
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Location metadata
    location_type VARCHAR(50) DEFAULT 'service_area', -- service_area, store, office, etc.
    active BOOLEAN DEFAULT true,
    
    -- OpenStreetMap specific data
    osm_place_id VARCHAR(50),
    osm_type VARCHAR(20), -- node, way, relation
    osm_class VARCHAR(50),
    osm_display_name TEXT,
    
    -- Service area configuration
    service_radius_km DECIMAL(8,3), -- For circular service areas
    service_area_polygon GEOMETRY(POLYGON, 4326), -- For custom polygon service areas
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT locations_business_active_check CHECK (active IS NOT NULL),
    CONSTRAINT locations_coords_check CHECK (
        (latitude IS NULL AND longitude IS NULL) OR 
        (latitude IS NOT NULL AND longitude IS NOT NULL)
    ),
    CONSTRAINT locations_latitude_check CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
    CONSTRAINT locations_longitude_check CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
    CONSTRAINT locations_radius_check CHECK (service_radius_km IS NULL OR service_radius_km > 0)
);

-- Create spatial index for geographic queries
CREATE INDEX IF NOT EXISTS idx_locations_geometry ON locations USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_locations_business_id ON locations(business_id);
CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(active);
CREATE INDEX IF NOT EXISTS idx_locations_city_state ON locations(city, state);
CREATE INDEX IF NOT EXISTS idx_locations_postal_code ON locations(postal_code);
CREATE INDEX IF NOT EXISTS idx_locations_created_at ON locations(created_at);

-- Location zip codes for service area management
CREATE TABLE IF NOT EXISTS location_zip_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'USA',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT location_zip_codes_unique UNIQUE(location_id, zip_code, country)
);

CREATE INDEX IF NOT EXISTS idx_location_zip_codes_location_id ON location_zip_codes(location_id);
CREATE INDEX IF NOT EXISTS idx_location_zip_codes_zip_code ON location_zip_codes(zip_code);

-- Location search history for analytics and optimization
CREATE TABLE IF NOT EXISTS location_search_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    search_type VARCHAR(50) NOT NULL, -- geocoding, reverse_geocoding, proximity
    results_count INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_search_history_business_id ON location_search_history(business_id);
CREATE INDEX IF NOT EXISTS idx_location_search_history_created_at ON location_search_history(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_locations_updated_at 
    BEFORE UPDATE ON locations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to check if a point is within service area
CREATE OR REPLACE FUNCTION is_point_in_service_area(
    target_lat DECIMAL,
    target_lng DECIMAL,
    location_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    location_record RECORD;
    point_geom GEOMETRY;
BEGIN
    -- Get location data
    SELECT * INTO location_record 
    FROM locations 
    WHERE id = location_id AND active = true;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Create point geometry
    point_geom := ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326);
    
    -- Check circular service area
    IF location_record.service_radius_km IS NOT NULL AND 
       location_record.latitude IS NOT NULL AND 
       location_record.longitude IS NOT NULL THEN
       
        RETURN ST_DWithin(
            point_geom,
            ST_SetSRID(ST_MakePoint(location_record.longitude, location_record.latitude), 4326),
            location_record.service_radius_km * 1000 -- Convert km to meters
        );
    END IF;
    
    -- Check polygon service area
    IF location_record.service_area_polygon IS NOT NULL THEN
        RETURN ST_Contains(location_record.service_area_polygon, point_geom);
    END IF;
    
    -- Default: check if within 50km of location coordinates
    IF location_record.latitude IS NOT NULL AND location_record.longitude IS NOT NULL THEN
        RETURN ST_DWithin(
            point_geom,
            ST_SetSRID(ST_MakePoint(location_record.longitude, location_record.latitude), 4326),
            50000 -- 50km default
        );
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to find locations within radius
CREATE OR REPLACE FUNCTION find_locations_within_radius(
    target_lat DECIMAL,
    target_lng DECIMAL,
    radius_km DECIMAL,
    business_id_param UUID,
    active_only BOOLEAN DEFAULT true
)
RETURNS TABLE(
    location_id UUID,
    name VARCHAR,
    address TEXT,
    city VARCHAR,
    state VARCHAR,
    postal_code VARCHAR,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.name,
        l.address,
        l.city,
        l.state,
        l.postal_code,
        l.latitude,
        l.longitude,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography
        ) / 1000 as distance_km
    FROM locations l
    WHERE 
        l.business_id = business_id_param
        AND (NOT active_only OR l.active = true)
        AND l.latitude IS NOT NULL 
        AND l.longitude IS NOT NULL
        AND ST_DWithin(
            ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography,
            radius_km * 1000
        )
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_zip_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_search_history ENABLE ROW LEVEL SECURITY;

-- Locations RLS policies
CREATE POLICY "Business users can view their own locations" ON locations
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Business users can insert their own locations" ON locations
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Business users can update their own locations" ON locations
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Business users can delete their own locations" ON locations
    FOR DELETE USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Location zip codes RLS policies
CREATE POLICY "Business users can view their own location zip codes" ON location_zip_codes
    FOR SELECT USING (
        location_id IN (
            SELECT id FROM locations WHERE 
            business_id IN (
                SELECT id FROM businesses WHERE owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "Business users can manage their own location zip codes" ON location_zip_codes
    FOR ALL USING (
        location_id IN (
            SELECT id FROM locations WHERE 
            business_id IN (
                SELECT id FROM businesses WHERE owner_id = auth.uid()
            )
        )
    );

-- Location search history RLS policies
CREATE POLICY "Business users can view their own search history" ON location_search_history
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Business users can insert their own search history" ON location_search_history
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON locations TO authenticated;
GRANT ALL ON location_zip_codes TO authenticated;
GRANT ALL ON location_search_history TO authenticated;
GRANT EXECUTE ON FUNCTION is_point_in_service_area TO authenticated;
GRANT EXECUTE ON FUNCTION find_locations_within_radius TO authenticated;

-- Add helpful comments
COMMENT ON TABLE locations IS 'Main locations table with OpenStreetMap integration and geographic support';
COMMENT ON TABLE location_zip_codes IS 'Service area zip codes for each location';
COMMENT ON TABLE location_search_history IS 'Analytics table for location search queries';
COMMENT ON FUNCTION is_point_in_service_area IS 'Check if a point is within a location service area';
COMMENT ON FUNCTION find_locations_within_radius IS 'Find all locations within a specified radius';

-- Sample data for testing (optional)
-- This would typically be handled by the application
-- INSERT INTO locations (business_id, name, address, city, state, postal_code, latitude, longitude) 
-- VALUES 
--     ('your-business-uuid', 'Downtown Office', '123 Main St', 'New York', 'NY', '10001', 40.7128, -74.0060),
--     ('your-business-uuid', 'Brooklyn Branch', '456 Atlantic Ave', 'Brooklyn', 'NY', '11201', 40.6892, -73.9442);
