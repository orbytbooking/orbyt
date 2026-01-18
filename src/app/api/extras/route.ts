import { NextRequest, NextResponse } from 'next/server';
import { extrasService } from '@/lib/extras';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get('industryId');
    const businessId = searchParams.get('businessId');

    if (!industryId) {
      return NextResponse.json(
        { error: 'Industry ID is required' },
        { status: 400 }
      );
    }

    const extras = await extrasService.getExtrasByIndustry(industryId);
    
    return NextResponse.json({ extras });
  } catch (error) {
    console.error('Error fetching extras:', error);
    return NextResponse.json(
      { error: 'Failed to fetch extras' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { industryId, ...extraData } = body;

    if (!industryId) {
      return NextResponse.json(
        { error: 'Industry ID is required' },
        { status: 400 }
      );
    }

    const extra = await extrasService.createExtra({
      industry_id: industryId,
      ...extraData
    });
    
    return NextResponse.json({ extra }, { status: 201 });
  } catch (error) {
    console.error('Error creating extra:', error);
    return NextResponse.json(
      { error: 'Failed to create extra' },
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
        { error: 'Extra ID is required' },
        { status: 400 }
      );
    }

    const extra = await extrasService.updateExtra(id, updateData);
    
    return NextResponse.json({ extra });
  } catch (error) {
    console.error('Error updating extra:', error);
    return NextResponse.json(
      { error: 'Failed to update extra' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json(
        { error: 'Extra ID is required' },
        { status: 400 }
      );
    }

    if (permanent) {
      await extrasService.permanentlyDeleteExtra(id);
    } else {
      await extrasService.deleteExtra(id);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting extra:', error);
    return NextResponse.json(
      { error: 'Failed to delete extra' },
      { status: 500 }
    );
  }
}
