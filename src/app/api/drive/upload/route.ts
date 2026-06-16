import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
  type ServiceSupabase,
} from '@/lib/adminTenantContext';
import { blockInProduction } from '@/lib/devRouteGuard';

async function assertOwnerBelongsToBusiness(
  supabase: ServiceSupabase,
  ownerType: string,
  ownerId: string,
  businessId: string
): Promise<NextResponse | null> {
  if (ownerType === 'business') {
    if (ownerId !== businessId) {
      return NextResponse.json({ error: 'Owner does not match business' }, { status: 403 });
    }
    return null;
  }

  if (ownerType === 'provider') {
    const { data } = await supabase
      .from('service_providers')
      .select('id')
      .eq('id', ownerId)
      .eq('business_id', businessId)
      .maybeSingle();
    if (!data) {
      return NextResponse.json({ error: 'Provider not found in this business' }, { status: 403 });
    }
    return null;
  }

  if (ownerType === 'customer') {
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('id', ownerId)
      .eq('business_id', businessId)
      .maybeSingle();
    if (!data) {
      return NextResponse.json({ error: 'Customer not found in this business' }, { status: 403 });
    }
    return null;
  }

  return NextResponse.json({ error: 'Invalid owner type' }, { status: 400 });
}

function assertStoragePathBelongsToOwner(
  filePath: string,
  ownerType: string,
  ownerId: string
): NextResponse | null {
  const prefix = `${ownerType}/${ownerId}/`;
  if (!filePath.startsWith(prefix)) {
    return NextResponse.json({ error: 'File path access denied' }, { status: 403 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const blocked = blockInProduction(request);
    if (blocked) return blocked;

    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase: supabaseAdmin, businessId } = ctx;

    const body = await request.json();
    const { fileName, fileType, ownerType, ownerId, folderPath = '' } = body;

    if (!fileName || !fileType || !ownerType || !ownerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      (typeof body.businessId === 'string' ? body.businessId.trim() : '') ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const ownerDenied = await assertOwnerBelongsToBusiness(
      supabaseAdmin,
      ownerType,
      ownerId,
      businessId
    );
    if (ownerDenied) return ownerDenied;

    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const storagePath = `${ownerType}/${ownerId}/${folderPath}/${uniqueFileName}`.replace(/\/+/g, '/');

    const { data, error } = await supabaseAdmin.storage
      .from('drive-files')
      .createSignedUrl(storagePath, 600);

    if (error) {
      console.error('Error creating signed upload URL:', error);
      return NextResponse.json(
        { error: 'Failed to generate upload URL', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      storagePath
    });
  } catch (error) {
    console.error('Upload URL generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const blocked = blockInProduction(request);
    if (blocked) return blocked;

    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase: supabaseAdmin, businessId } = ctx;

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');
    const ownerType = searchParams.get('ownerType');
    const ownerId = searchParams.get('ownerId');

    if (!filePath || !ownerType || !ownerId) {
      return NextResponse.json(
        { error: 'filePath, ownerType, and ownerId are required' },
        { status: 400 }
      );
    }

    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      searchParams.get('businessId')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const ownerDenied = await assertOwnerBelongsToBusiness(
      supabaseAdmin,
      ownerType,
      ownerId,
      businessId
    );
    if (ownerDenied) return ownerDenied;

    const pathDenied = assertStoragePathBelongsToOwner(filePath, ownerType, ownerId);
    if (pathDenied) return pathDenied;

    const { data, error } = await supabaseAdmin.storage
      .from('drive-files')
      .createSignedUrl(filePath, 3600);

    if (error) {
      console.error('Error creating download URL:', error);
      return NextResponse.json(
        { error: 'Failed to generate download URL', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ downloadUrl: data.signedUrl });
  } catch (error) {
    console.error('Download URL generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
