import { NextRequest, NextResponse } from 'next/server';
import { extrasService, pickIndustryExtraWritePayload } from '@/lib/extras';

function messageFromUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
}

function supabaseErrorPayload(error: unknown) {
  const message = messageFromUnknownError(error);
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : undefined;
  const details =
    error && typeof error === 'object' && 'details' in error
      ? (error as { details: unknown }).details
      : undefined;
  const hint =
    error && typeof error === 'object' && 'hint' in error ? (error as { hint: unknown }).hint : undefined;

  let userMessage = message;
  if (code === 'PGRST204') {
    userMessage += ` Run pending SQL in database/migrations on your Supabase DB (e.g. 095_industry_extras_manual_multiply_pricing.sql, 116_industry_extras_customer_end_popup_apply_bookings.sql), then reload the schema or wait for the API cache to refresh.`;
  }

  return { userMessage, code, details, hint };
}

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
    const extraData = pickIndustryExtraWritePayload(body) as Parameters<
      typeof extrasService.createExtra
    >[0];

    console.log('Received extra data:', JSON.stringify(extraData, null, 2));

    if (!extraData.industry_id) {
      return NextResponse.json(
        { error: 'Industry ID is required' },
        { status: 400 }
      );
    }

    if (!extraData.business_id) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    const name = typeof extraData.name === 'string' ? extraData.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    extraData.name = name;

    const extra = await extrasService.createExtra(extraData);
    
    console.log('Extra created successfully:', extra);
    return NextResponse.json({ extra }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating extra:', error);
    const { userMessage, code, details, hint } = supabaseErrorPayload(error);
    console.error('Supabase error:', code, details, hint);
    return NextResponse.json(
      {
        error: userMessage,
        details: details ?? hint ?? undefined,
        code: code || undefined,
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...rest } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Extra ID is required' },
        { status: 400 }
      );
    }

    const updateData = pickIndustryExtraWritePayload(rest) as Record<string, unknown>;
    delete updateData.business_id;
    delete updateData.industry_id;

    const nameRaw = updateData.name;
    if (nameRaw !== undefined) {
      const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';
      if (!name) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      updateData.name = name;
    }

    const extra = await extrasService.updateExtra(id, updateData);
    
    return NextResponse.json({ extra });
  } catch (error: unknown) {
    console.error('Error updating extra:', error);
    const { userMessage, code, details, hint } = supabaseErrorPayload(error);
    return NextResponse.json(
      {
        error: userMessage,
        details: details ?? hint ?? undefined,
        code: code || undefined,
      },
      { status: 500 },
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
