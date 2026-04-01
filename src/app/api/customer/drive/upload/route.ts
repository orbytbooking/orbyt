import { NextResponse } from 'next/server';

/** Customer portal is view-only; admins upload from Admin → Customers → profile → My drive. */
export async function POST() {
  return NextResponse.json(
    { error: 'Customers cannot upload files here. Your business adds documents to your profile.' },
    { status: 403 },
  );
}
