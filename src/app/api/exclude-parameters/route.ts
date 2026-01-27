import { NextRequest, NextResponse } from 'next/server';
import { excludeParametersService } from '@/lib/exclude-parameters';

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

    const excludeParameters = await excludeParametersService.getExcludeParametersByIndustry(industryId);
    
    return NextResponse.json({ excludeParameters });
  } catch (error) {
    console.error('Error fetching exclude parameters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exclude parameters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const paramData = await request.json();
    
    console.log('Received exclude parameter data:', JSON.stringify(paramData, null, 2));

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

    const excludeParameter = await excludeParametersService.createExcludeParameter(paramData);
    
    console.log('Exclude parameter created successfully:', excludeParameter);
    return NextResponse.json({ excludeParameter }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating exclude parameter:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error?.stack);
    console.error('Supabase error:', error?.code, error?.details, error?.hint);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create exclude parameter',
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

    if (!id) {
      return NextResponse.json(
        { error: 'Exclude parameter ID is required' },
        { status: 400 }
      );
    }

    const excludeParameter = await excludeParametersService.updateExcludeParameter(id, updateData);
    
    return NextResponse.json({ excludeParameter });
  } catch (error) {
    console.error('Error updating exclude parameter:', error);
    return NextResponse.json(
      { error: 'Failed to update exclude parameter' },
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
        { error: 'Exclude parameter ID is required' },
        { status: 400 }
      );
    }

    await excludeParametersService.deleteExcludeParameter(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting exclude parameter:', error);
    return NextResponse.json(
      { error: 'Failed to delete exclude parameter' },
      { status: 500 }
    );
  }
}
