import { NextRequest, NextResponse } from 'next/server';
import { pricingVariablesService } from '@/lib/pricing-variables';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get('industryId');

    if (!industryId) {
      return NextResponse.json(
        { error: 'Industry ID is required' },
        { status: 400 }
      );
    }

    const variables = await pricingVariablesService.getByIndustry(industryId);
    return NextResponse.json({ variables });
  } catch (error) {
    console.error('Error fetching pricing variables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing variables' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { industryId, businessId, variables: variablesPayload } = body;

    if (!industryId || !businessId) {
      return NextResponse.json(
        { error: 'industryId and businessId are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(variablesPayload)) {
      return NextResponse.json(
        { error: 'variables must be an array' },
        { status: 400 }
      );
    }

    const variables = await pricingVariablesService.saveBulk(
      industryId,
      businessId,
      variablesPayload
    );
    return NextResponse.json({ variables });
  } catch (error) {
    console.error('Error saving pricing variables:', error);
    return NextResponse.json(
      { error: 'Failed to save pricing variables' },
      { status: 500 }
    );
  }
}
