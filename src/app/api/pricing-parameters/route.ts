import { NextRequest, NextResponse } from 'next/server';
import { pricingParametersService } from '@/lib/pricing-parameters';

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

    const pricingParameters = await pricingParametersService.getPricingParametersByIndustry(industryId);
    
    return NextResponse.json({ pricingParameters });
  } catch (error) {
    console.error('Error fetching pricing parameters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing parameters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const paramData = await request.json();
    
    console.log('Received pricing parameter data:', JSON.stringify(paramData, null, 2));

    if (!paramData.industry_id) {
      return NextResponse.json(
        { error: 'Industry ID is required' },
        { status: 400 }
      );
    }

    if (!paramData.business_id) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    if (!paramData.variable_category) {
      return NextResponse.json(
        { error: 'Variable category is required' },
        { status: 400 }
      );
    }

    const pricingParameter = await pricingParametersService.createPricingParameter(paramData);
    
    console.log('Pricing parameter created successfully:', pricingParameter);
    return NextResponse.json({ pricingParameter }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating pricing parameter:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error?.stack);
    console.error('Supabase error:', error?.code, error?.details, error?.hint);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create pricing parameter',
        details: error?.details || error?.hint || undefined,
        code: error?.code || undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    console.log('PUT - Received update data:', JSON.stringify(updateData, null, 2));
    console.log('PUT - Pricing parameter ID:', id);

    if (!id) {
      return NextResponse.json(
        { error: 'Pricing parameter ID is required' },
        { status: 400 }
      );
    }

    const pricingParameter = await pricingParametersService.updatePricingParameter(id, updateData);
    
    console.log('PUT - Pricing parameter updated successfully:', pricingParameter);
    return NextResponse.json({ pricingParameter });
  } catch (error: any) {
    console.error('Error updating pricing parameter:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error?.stack);
    console.error('Supabase error:', error?.code, error?.details, error?.hint);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update pricing parameter',
        details: error?.details || error?.hint || undefined,
        code: error?.code || undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Pricing parameter ID is required' },
        { status: 400 }
      );
    }

    await pricingParametersService.deletePricingParameter(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pricing parameter:', error);
    return NextResponse.json(
      { error: 'Failed to delete pricing parameter' },
      { status: 500 }
    );
  }
}
