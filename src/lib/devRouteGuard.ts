import { NextRequest, NextResponse } from 'next/server';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function hasDevApiSecretBypass(request: NextRequest): boolean {
  const devSecret = process.env.DEV_API_SECRET;
  if (!devSecret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${devSecret}`;
}

/**
 * Returns a 404 NextResponse in production so dev/test routes are not publicly reachable.
 * Returns null in non-production, or when Authorization: Bearer <DEV_API_SECRET> matches.
 */
export function blockInProduction(request?: NextRequest): NextResponse | null {
  if (!isProduction()) return null;
  if (request && hasDevApiSecretBypass(request)) return null;
  return new NextResponse(null, { status: 404 });
}
