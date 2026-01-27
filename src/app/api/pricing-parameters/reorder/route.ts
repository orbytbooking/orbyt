import { NextRequest, NextResponse } from 'next/server';
import { pricingParametersService } from '@/lib/pricing-parameters';

export async function POST(request: NextRequest) {
  try {
    const { updates } = await request.json();

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates must be an array' },
        { status: 400 }
      );
    }

    await pricingParametersService.updatePricingParameterOrder(updates);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering pricing parameters:', error);
    return NextResponse.json(
      { error: 'Failed to reorder pricing parameters' },
      { status: 500 }
    );
  }
}
