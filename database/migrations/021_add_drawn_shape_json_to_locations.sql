-- Store drawn service area as JSON (GeoJSON-style: type, coordinates, properties) for BookingKoala-style map
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS drawn_shape_json jsonb;

COMMENT ON COLUMN public.locations.drawn_shape_json IS 'Array of drawn shapes: [{ type, coordinates, properties? }]. Used to restore polygon/circle/rectangle on map when editing.';