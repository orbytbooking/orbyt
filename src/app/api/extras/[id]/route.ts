import { NextRequest, NextResponse } from 'next/server';
import { extrasService } from '@/lib/extras';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Extra ID is required' },
        { status: 400 }
      );
    }

    const extra = await extrasService.getExtraById(id);
    
    if (!extra) {
      return NextResponse.json(
        { error: 'Extra not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ extra });
  } catch (error) {
    console.error('Error fetching extra:', error);
    return NextResponse.json(
      { error: 'Failed to fetch extra' },
      { status: 500 }
    );
  }
}
