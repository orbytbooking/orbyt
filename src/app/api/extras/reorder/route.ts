import { NextRequest, NextResponse } from 'next/server';
import { extrasService } from '@/lib/extras';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates array is required' },
        { status: 400 }
      );
    }

    // Validate each update has required fields
    for (const update of updates) {
      if (!update.id || typeof update.sort_order !== 'number') {
        return NextResponse.json(
          { error: 'Each update must have id and sort_order' },
          { status: 400 }
        );
      }
    }

    await extrasService.updateExtraOrder(updates);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering extras:', error);
    return NextResponse.json(
      { error: 'Failed to reorder extras' },
      { status: 500 }
    );
  }
}
