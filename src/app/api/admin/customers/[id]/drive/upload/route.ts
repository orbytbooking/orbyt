import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '@/lib/auth-helpers';
import { assertUserCanManageBusinessTenant } from '@/lib/bookingApiAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'customer-drive-files';
const SIGNED_SEC = 31536000;

function getFileType(fileName: string): 'document' | 'image' | 'video' | 'other' {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image';
  if (['mp4', 'avi', 'mov', 'wmv'].includes(ext || '')) return 'video';
  if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'].includes(ext || '')) return 'document';
  return 'other';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function POST(
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const businessIdRaw =
      (formData.get('businessId') as string) || request.headers.get('x-business-id');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!businessIdRaw) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const access = await assertUserCanManageBusinessTenant(user.id, businessIdRaw);
    if (access === 'no_service_role') {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    if (access === 'denied') {
      return NextResponse.json({ error: 'Business not found or access denied' }, { status: 403 });
    }

    const businessId = businessIdRaw;

    const { data: cust, error: custErr } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (custErr || !cust) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${businessId}/${customerId}/${Date.now()}-${sanitized}`;

    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('Admin customer drive upload storage:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 });
    }

    let finalUrl: string;
    const { data: urlData, error: urlError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, SIGNED_SEC);

    if (urlError || !urlData?.signedUrl) {
      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
      finalUrl = publicData.publicUrl;
    } else {
      finalUrl = urlData.signedUrl;
    }

    const { data: newFile, error: insertError } = await supabase
      .from('customer_drive_files')
      .insert({
        customer_id: customerId,
        business_id: businessId,
        name: file.name,
        type: 'file',
        file_type: getFileType(file.name),
        size_bytes: file.size,
        storage_path: filePath,
        storage_url: finalUrl,
        parent_id: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Admin customer drive DB insert:', insertError);
      await supabase.storage.from(BUCKET).remove([filePath]);
      return NextResponse.json({ error: 'Failed to create file record' }, { status: 500 });
    }

    return NextResponse.json(
      {
        file: {
          id: newFile.id,
          name: newFile.name,
          type: newFile.type,
          fileType: newFile.file_type || undefined,
          size: formatFileSize(newFile.size_bytes || 0),
          uploadedAt: newFile.created_at,
          url: finalUrl,
          parentId: newFile.parent_id || null,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    console.error('Admin customer drive upload:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
