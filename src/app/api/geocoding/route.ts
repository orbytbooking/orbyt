import { NextRequest, NextResponse } from 'next/server';

// Add delay to respect Nominatim's usage policy (1 request per second max)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const format = searchParams.get('format') || 'json';
    const addressdetails = searchParams.get('addressdetails') || '1';

    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Missing lat or lon parameters' },
        { status: 400 }
      );
    }

    // Add delay to respect rate limiting
    await delay(1000);

    // Make request to Nominatim with proper headers
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=${format}&lat=${lat}&lon=${lon}&addressdetails=${addressdetails}`,
      {
        headers: {
          'User-Agent': 'OrbytBooking/1.0 (https://orbytbooking.com; contact@orbytbooking.com)',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 403) {
        // Return a fallback response when rate limited
        return NextResponse.json({
          display_name: `Location at ${lat}, ${lon}`,
          address: {
            suburb: 'Unknown',
            city: 'Unknown',
            state: 'Unknown',
            postcode: '',
          },
          lat: lat,
          lon: lon,
        });
      }
      throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Geocoding error:', error);
    // Return fallback data on error
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    
    return NextResponse.json({
      display_name: `Location at ${lat}, ${lon}`,
      address: {
        suburb: 'Unknown',
        city: 'Unknown', 
        state: 'Unknown',
        postcode: '',
      },
      lat: lat,
      lon: lon,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { q } = body;

    if (!q) {
      return NextResponse.json(
        { error: 'Missing search query' },
        { status: 400 }
      );
    }

    // Add delay to respect rate limiting
    await delay(1000);

    // Forward geocoding (address to coordinates)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=5`,
      {
        headers: {
          'User-Agent': 'OrbytBooking/1.0 (https://orbytbooking.com; contact@orbytbooking.com)',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 403) {
        // Return empty results when rate limited
        return NextResponse.json([]);
      }
      throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json([]);
  }
}
