import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('Google Maps API key not configured (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY)');
  return key;
}

type AddressComponent = { long_name: string; short_name: string; types: string[] };

function getComponent(components: AddressComponent[], type: string): string {
  const c = components.find((x) => x.types.includes(type));
  return c?.long_name || c?.short_name || '';
}

function mapGoogleToResult(r: any) {
  const components = r.address_components || [];
  const city = getComponent(components, 'locality') || getComponent(components, 'administrative_area_level_2');
  return {
    display_name: r.formatted_address || '',
    latitude: typeof r.geometry?.location?.lat === 'number' ? r.geometry.location.lat : parseFloat(r.geometry?.location?.lat),
    longitude: typeof r.geometry?.location?.lng === 'number' ? r.geometry.location.lng : parseFloat(r.geometry?.location?.lng),
    address: {
      house_number: getComponent(components, 'street_number'),
      road: getComponent(components, 'route'),
      city: city || undefined,
      state: getComponent(components, 'administrative_area_level_1') || undefined,
      postalCode: getComponent(components, 'postal_code') || undefined,
      country: getComponent(components, 'country') || undefined,
    },
    importance: 0,
    type: r.types?.[0] || 'address',
    class: 'place',
  };
}

// Forward geocoding: address/search query to coordinates (used by LocationSearch)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, city, state, postalCode, country = 'USA' } = body;

    const query = [address, city, state, postalCode, country].filter(Boolean).join(', ') || body.address;
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Address or query is required' }, { status: 400 });
    }

    const key = getApiKey();
    const url = `${GOOGLE_GEOCODE_URL}?address=${encodeURIComponent(query)}&key=${key}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS' || !Array.isArray(data.results)) {
      return NextResponse.json({ results: [] });
    }

    const results = data.results.slice(0, 5).map(mapGoogleToResult);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in locations/map geocoding:', error);
    return NextResponse.json(
      {
        error: 'Failed to geocode address',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Reverse geocoding: coordinates to address
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    const key = getApiKey();
    const url = `${GOOGLE_GEOCODE_URL}?latlng=${lat},${lon}&key=${key}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS' || !data.results?.[0]) {
      return NextResponse.json({ error: 'No address found for coordinates' }, { status: 404 });
    }

    const r = data.results[0];
    const result = mapGoogleToResult(r);
    return NextResponse.json({
      result: {
        display_name: result.display_name,
        latitude: result.latitude,
        longitude: result.longitude,
        address: result.address,
        type: result.type,
        class: result.class,
      },
    });
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return NextResponse.json(
      {
        error: 'Failed to reverse geocode coordinates',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
