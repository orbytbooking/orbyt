import { NextRequest, NextResponse } from 'next/server';

// OpenStreetMap Nominatim API configuration
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Geocoding: Convert address to coordinates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, city, state, postalCode, country = 'USA' } = body;

    if (!address && !city) {
      return NextResponse.json({ error: 'Address or city is required' }, { status: 400 });
    }

    // Build query string
    const queryParts = [];
    if (address) queryParts.push(address);
    if (city) queryParts.push(city);
    if (state) queryParts.push(state);
    if (postalCode) queryParts.push(postalCode);
    if (country) queryParts.push(country);

    const queryString = queryParts.join(', ');

    const url = `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(queryString)}&limit=5`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Orbyt Location Manager (contact@orbyt.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform the response to a more useful format
    const results = data.map((item: any) => ({
      display_name: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      address: {
        house_number: item.address?.house_number,
        road: item.address?.road,
        city: item.address?.city || item.address?.town || item.address?.village,
        state: item.address?.state,
        postalCode: item.address?.postcode,
        country: item.address?.country
      },
      importance: item.importance,
      type: item.type,
      class: item.class
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in geocoding:', error);
    return NextResponse.json({ 
      error: 'Failed to geocode address',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Reverse geocoding: Convert coordinates to address
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    const url = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Orbyt Location Manager (contact@orbyt.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 404 });
    }

    // Transform the response
    const result = {
      display_name: data.display_name,
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
      address: {
        house_number: data.address?.house_number,
        road: data.address?.road,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        postalCode: data.address?.postcode,
        country: data.address?.country
      },
      type: data.type,
      class: data.class
    };

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return NextResponse.json({ 
      error: 'Failed to reverse geocode coordinates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
