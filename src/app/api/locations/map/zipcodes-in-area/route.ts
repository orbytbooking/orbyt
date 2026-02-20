import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('Google Maps API key not configured (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY)');
  return key;
}

// Extract postal code from Google Geocoding address_components
function getPostalCodeFromComponents(components: { long_name: string; short_name: string; types: string[] }[]): string | null {
  const pc = components.find((c) => c.types.includes('postal_code'));
  const raw = pc?.long_name || pc?.short_name;
  if (typeof raw !== 'string') return null;
  const match = raw.match(/\d{5}/);
  return match ? match[0] : raw.trim() || null;
}

// Ray-casting point-in-polygon. Polygon ring: array of [lng, lat].
function pointInPolygon(lng: number, lat: number, ring: number[][]): boolean {
  const n = ring.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// Get polygon ring (array of [lng, lat]) from shape. Handles GeoJSON Feature, geometry object, or raw coordinates.
function getPolygonRing(shape: {
  type: string;
  coordinates: any;
  properties?: { radius?: number };
}): number[][] | null {
  let coords = shape.coordinates;
  let type = (shape.type ?? '').toString().toLowerCase();
  const radiusMeters: number | undefined = shape.properties?.radius;

  // Unwrap GeoJSON Feature (coordinates = { type, geometry, properties })
  if (coords && typeof coords === 'object' && 'geometry' in coords) {
    const geom = (coords as { geometry?: { type?: string; coordinates?: any } }).geometry;
    if (geom) {
      type = (geom.type ?? type).toString().toLowerCase();
      coords = geom.coordinates;
    }
  }
  // Unwrap geometry object (coordinates = { type, coordinates })
  if (coords && typeof coords === 'object' && 'coordinates' in coords && !Array.isArray(coords)) {
    const geom = coords as { type?: string; coordinates?: any };
    type = (geom.type ?? type).toString().toLowerCase();
    coords = geom.coordinates;
  }

  if (!coords) return null;

  const looksLikeRing = Array.isArray(coords[0]) && Array.isArray(coords[0][0]);
  const looksLikePoint = Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === 'number';

  // Circle or Rectangle (OpenLayers rectangle = Circle with center + radius), or Point + radius
  if (radiusMeters != null && radiusMeters > 0 && looksLikePoint &&
      (type === 'circle' || type === 'rectangle' || type === 'point')) {
    const center: [number, number] = [Number(coords[0]), Number(coords[1])];
    const R = 6371000;
    const latRad = (center[1] * Math.PI) / 180;
    const dLng = (radiusMeters / (R * Math.cos(latRad))) * (180 / Math.PI);
    const dLat = (radiusMeters / R) * (180 / Math.PI);
    const ring: number[][] = [];
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * 2 * Math.PI;
      ring.push([
        center[0] + dLng * Math.cos(angle),
        center[1] + dLat * Math.sin(angle),
      ]);
    }
    ring.push(ring[0]);
    return ring;
  }

  // Polygon: GeoJSON ring (exterior ring has 3+ points)
  if (type === 'polygon' || looksLikeRing) {
    const ring = looksLikeRing ? coords[0] : coords;
    if (!Array.isArray(ring) || ring.length < 3) return null;
    return ring.map((p: number[]) => (Array.isArray(p) ? [Number(p[0]), Number(p[1])] : null)).filter(Boolean) as number[][];
  }

  return null;
}

// Sample up to `maxPoints` points inside the polygon (grid + filter).
function samplePointsInPolygon(ring: number[][], maxPoints: number): Array<{ lat: number; lng: number }> {
  let minLng = ring[0][0], maxLng = ring[0][0], minLat = ring[0][1], maxLat = ring[0][1];
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const points: Array<{ lat: number; lng: number }> = [];
  const steps = 8;
  const dLng = (maxLng - minLng) / steps;
  const dLat = (maxLat - minLat) / steps;
  for (let i = 0; i <= steps && points.length < maxPoints; i++) {
    for (let j = 0; j <= steps && points.length < maxPoints; j++) {
      const lng = minLng + i * dLng;
      const lat = minLat + j * dLat;
      if (pointInPolygon(lng, lat, ring)) {
        points.push({ lat, lng });
      }
    }
  }
  return points.slice(0, maxPoints);
}

// Reverse geocode one point via Google and return postcode (zip).
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = getApiKey();
  const url = `${GOOGLE_GEOCODE_URL}?latlng=${lat},${lng}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) return null;
  const components = data.results[0]?.address_components;
  if (!Array.isArray(components)) return null;
  return getPostalCodeFromComponents(components);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const shape = body?.shape;

    if (!shape || !shape.type) {
      return NextResponse.json(
        { error: 'Request body must include shape: { type, coordinates, properties? }' },
        { status: 400 }
      );
    }

    const ring = getPolygonRing(shape);
    if (!ring) {
      return NextResponse.json(
        { error: 'Could not get polygon from shape. Supported: polygon, rectangle, circle (with properties.radius).' },
        { status: 400 }
      );
    }

    const points = samplePointsInPolygon(ring, 20);
    if (points.length === 0) {
      return NextResponse.json({ zipcodes: [], count: 0 });
    }

    const zipSet = new Set<string>();
    for (const { lat, lng } of points) {
      const zip = await reverseGeocode(lat, lng);
      if (zip) zipSet.add(zip);
    }

    const zipcodes = Array.from(zipSet).sort();
    return NextResponse.json({ zipcodes, count: zipcodes.length });
  } catch (error) {
    console.error('Error in zipcodes-in-area:', error);
    return NextResponse.json(
      {
        error: 'Failed to get zipcodes for area',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
