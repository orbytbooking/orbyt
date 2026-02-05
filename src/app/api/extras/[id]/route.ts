import { NextRequest, NextResponse } from 'next/server';
import { extrasService } from '@/lib/extras';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== API DEBUG ===');
    console.log('Request URL:', request.url);
    
    // Handle params as Promise for Next.js 15+
    const resolvedParams = await params;
    console.log('Resolved params:', resolvedParams);
    
    const { id } = resolvedParams;
    console.log('Extracted ID:', id);
    console.log('ID type:', typeof id);
    console.log('ID length:', id?.length);

    if (!id || id === 'undefined' || id === 'null') {
      console.log('❌ ID validation failed');
      return NextResponse.json(
        { error: 'Extra ID is required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('❌ UUID validation failed for:', id);
      return NextResponse.json(
        { error: 'Invalid Extra ID format' },
        { status: 400 }
      );
    }

    console.log('✅ ID validation passed, fetching extra...');
    const extra = await extrasService.getExtraById(id);
    
    if (!extra) {
      console.log('❌ Extra not found in database');
      return NextResponse.json(
        { error: 'Extra not found' },
        { status: 404 }
      );
    }

    console.log('✅ Extra found:', extra.name);
    console.log('=== END API DEBUG ===');
    return NextResponse.json({ extra });
  } catch (error) {
    console.error('💥 API Error fetching extra:', error);
    return NextResponse.json(
      { error: 'Failed to fetch extra' },
      { status: 500 }
    );
  }
}
