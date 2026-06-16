import { NextRequest, NextResponse } from 'next/server';
import { requireAdminTenantContext } from '@/lib/adminTenantContext';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase: supabaseAdmin, businessId } = ctx;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Provider ID required' }, { status: 400 });
    }

    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .select('id')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (providerError || !provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file || !file.type?.startsWith('image/')) {
      return NextResponse.json({ error: 'Valid image file required' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size max 5MB' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `providers/${id}-${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, buffer, { cacheControl: '3600', upsert: true, contentType: file.type });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from('avatars').getPublicUrl(filePath);

    const { error: updateError } = await supabaseAdmin
      .from('service_providers')
      .update({ profile_image_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('business_id', businessId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 });
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Avatar API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
