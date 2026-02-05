import { NextRequest, NextResponse } from 'next/server';
import { excludeParametersService } from '@/lib/exclude-parameters';

export async function GET(request: NextRequest) {
  try {
    console.log('=== EXCLUDE PARAMETERS API DEBUG ===');
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get('industryId');

    console.log('📥 industryId:', industryId);
    console.log('📥 industryId type:', typeof industryId);
    console.log('📥 industryId value:', JSON.stringify(industryId));

    if (!industryId) {
      console.log('❌ No industryId provided');
      return NextResponse.json(
        { error: 'Industry ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching exclude parameters for industryId:', industryId);
    const excludeParameters = await excludeParametersService.getExcludeParametersByIndustry(industryId);
    
    console.log('📦 Raw service result:', excludeParameters);
    console.log('📦 excludeParameters type:', typeof excludeParameters);
    console.log('📦 excludeParameters length:', excludeParameters?.length || 0);
    
    if (excludeParameters && excludeParameters.length > 0) {
      console.log('✅ Found exclude parameters:');
      excludeParameters.forEach((param, index) => {
        console.log(`  ${index + 1}. ID: ${param.id}, Name: ${param.name}, Description: ${param.description || 'N/A'}`);
      });
    } else {
      console.log('❌ No exclude parameters found');
    }
    
    console.log('=== END EXCLUDE PARAMETERS API DEBUG ===');
    
    return NextResponse.json({ excludeParameters });
  } catch (error) {
    console.error('💥 Error fetching exclude parameters:', error);
    console.error('💥 Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
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
