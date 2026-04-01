import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '@/lib/auth-helpers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'customer-drive-files';
const SIGNED_SEC = 31536000;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function resolveAdminBusinessId(
  request: NextRequest,
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ businessId: string } | { error: NextResponse }> {
  const candidate =
    request.headers.get('x-business-id') || request.nextUrl.searchParams.get('businessId');
  if (candidate) {
    const { data: business, error } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', candidate)
      .eq('owner_id', userId)
      .maybeSingle();
    if (error || !business) {
      return {
        error: NextResponse.json({ error: 'Business not found or access denied' }, { status: 404 }),
      };
    }
    return { businessId: business.id };
  }
  const { data: business, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();
  if (error || !business) {
    return { error: NextResponse.json({ error: 'Business not found' }, { status: 404 }) };
  }
  return { businessId: business.id };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    if (user.user_metadata?.role === 'customer') return createForbiddenResponse('Access denied');

    const { id: customerId } = await params;
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const resolved = await resolveAdminBusinessId(request, supabase, user.id);
    if ('error' in resolved && resolved.error) return resolved.error;
    const { businessId } = resolved;

    const { data: cust, error: custErr } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (custErr || !cust) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { data: rows, error } = await supabase
      .from('customer_drive_files')
      .select('*')
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .eq('type', 'file')
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin customer drive list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
    console.error('Admin customer drive GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    if (user.user_metadata?.role === 'customer') return createForbiddenResponse('Access denied');

    const { id: customerId } = await params;
    const fileId = request.nextUrl.searchParams.get('id');
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }
    if (!fileId) {
      return NextResponse.json({ error: 'File id required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const resolved = await resolveAdminBusinessId(request, supabase, user.id);
    if ('error' in resolved && resolved.error) return resolved.error;
    const { businessId } = resolved;

    const { data: row, error: fetchErr } = await supabase
      .from('customer_drive_files')
      .select('id, storage_path')
      .eq('id', fileId)
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (row.storage_path) {
      await supabase.storage.from(BUCKET).remove([row.storage_path]);
    }

    const { error: delErr } = await supabase.from('customer_drive_files').delete().eq('id', fileId);
    if (delErr) {
      console.error('Admin customer drive delete:', delErr);
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Admin customer drive DELETE:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
