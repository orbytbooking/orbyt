import { NextRequest, NextResponse } from 'next/server';
import { excludeParametersService } from '@/lib/exclude-parameters';

export async function POST(request: NextRequest) {
  try {
    const { updates } = await request.json();

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates must be an array' },
        { status: 400 }
      );
    }

    await excludeParametersService.updateExcludeParameterOrder(updates);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering exclude parameters:', error);
    return NextResponse.json(
      { error: 'Failed to reorder exclude parameters' },
      { status: 500 }
    );
  }
}
