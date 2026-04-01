import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const BUCKET = 'customer-drive-files';
const SIGNED_SEC = 31536000;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function requireCustomerDriveContext(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return { error: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }) };
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const businessId = request.nextUrl.searchParams.get('business');
  if (!businessId) {
    return { error: NextResponse.json({ error: 'Business ID required' }, { status: 400 }) };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('business_id', businessId)
    .single();

  if (customerError || !customer) {
    return { error: NextResponse.json({ error: 'Customer not found' }, { status: 404 }) };
  }

  const { data: opts, error: optsError } = await supabase
    .from('business_store_options')
    .select('customer_my_drive_enabled')
    .eq('business_id', businessId)
    .maybeSingle();

  if (optsError) {
    console.error('Store options (my drive):', optsError);
    return { error: NextResponse.json({ error: optsError.message }, { status: 500 }) };
  }

  if (opts?.customer_my_drive_enabled !== true) {
    return { error: NextResponse.json({ error: 'My Drive is not enabled for this business' }, { status: 403 }) };
  }

  return { supabase, customerId: customer.id as string, businessId };
}

export async function GET(request: NextRequest) {
  const ctx = await requireCustomerDriveContext(request);
  if ('error' in ctx && ctx.error) return ctx.error;
  const { supabase, customerId, businessId } = ctx;

  try {
    const { data: rows, error } = await supabase
      .from('customer_drive_files')
      .select('*')
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .eq('type', 'file')
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Customer drive list:', error);
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }

    const files = await Promise.all(
      (rows || []).map(async (file) => {
        let url = file.storage_url || undefined;
        if (file.storage_path) {
          const { data: signed, error: signErr } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(file.storage_path, SIGNED_SEC);
          if (!signErr && signed?.signedUrl) url = signed.signedUrl;
        }
        return {
          id: file.id,
          name: file.name,
          type: file.type,
          fileType: file.file_type || undefined,
          size: file.size_bytes != null ? formatFileSize(Number(file.size_bytes)) : undefined,
          uploadedAt: file.created_at,
          url,
          parentId: file.parent_id || null,
        };
      }),
    );

    return NextResponse.json({ files });
  } catch (e) {
    console.error('Customer drive GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Customer portal is view-only; admins remove files from CRM customer profile. */
export async function DELETE() {
  return NextResponse.json(
    { error: 'Customers cannot delete drive files. Contact your business if a file should be removed.' },
    { status: 403 },
  );
}
