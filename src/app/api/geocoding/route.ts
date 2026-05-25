import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('Google Maps API key not configured');
  return key;
}

type AddressComponent = { long_name: string; short_name: string; types: string[] };

function getComponent(components: AddressComponent[], type: string): string {
  const c = components.find((x) => x.types.includes(type));
  return c?.long_name || c?.short_name || '';
}

function mapGoogleToAddress(components: AddressComponent[]) {
  return {
    suburb: getComponent(components, 'sublocality') || getComponent(components, 'neighborhood'),
    city: getComponent(components, 'locality') || getComponent(components, 'administrative_area_level_2'),
    state: getComponent(components, 'administrative_area_level_1'),
    postcode: getComponent(components, 'postal_code'),
    country: getComponent(components, 'country'),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
      return NextResponse.json({ error: 'Missing lat or lon parameters' }, { status: 400 });
    }

    const key = getApiKey();
    const url = `${GOOGLE_GEOCODE_URL}?latlng=${lat},${lon}&key=${key}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS' || !data.results?.[0]) {
      return NextResponse.json({
        display_name: `Location at ${lat}, ${lon}`,
        address: { suburb: 'Unknown', city: 'Unknown', state: 'Unknown', postcode: '', country: '' },
        lat,
        lon,
      });
    }

    const r = data.results[0];
    const components = r.address_components || [];
    const address = mapGoogleToAddress(components);

    return NextResponse.json({
      display_name: r.formatted_address || `Location at ${lat}, ${lon}`,
      address: {
        ...address,
        postcode: address.postcode || '',
      },
      lat: r.geometry?.location?.lat ?? lat,
      lon: r.geometry?.location?.lng ?? lon,
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    return NextResponse.json({
      display_name: `Location at ${lat}, ${lon}`,
      address: { suburb: 'Unknown', city: 'Unknown', state: 'Unknown', postcode: '', country: '' },
      lat,
      lon,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { q } = body;

    if (!q) {
      return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
    }

    const key = getApiKey();
    const url = `${GOOGLE_GEOCODE_URL}?address=${encodeURIComponent(q)}&key=${key}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS' || !Array.isArray(data.results)) {
      return NextResponse.json([]);
    }

    const mapped = data.results.slice(0, 5).map((r: any) => {
      const components = r.address_components || [];
      const address = mapGoogleToAddress(components);
      return {
        display_name: r.formatted_address,
        lat: r.geometry?.location?.lat,
        lon: r.geometry?.location?.lng,
        address: {
          house_number: getComponent(components, 'street_number'),
          road: getComponent(components, 'route'),
          city: address.city,
          state: address.state,
          postcode: address.postcode,
          country: address.country,
        },
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json([]);
  }
}
