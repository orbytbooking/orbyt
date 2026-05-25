import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';
import { resolveTenantBusinessId } from '@/lib/tenantBusinessAccess';
import { assertUserHasAdminModuleAccess } from '@/lib/bookingApiAuth';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }

    // Check user role - only allow owners and admins
    const userRole = user.user_metadata?.role || 'owner';
    if (userRole === 'customer') {
      return createForbiddenResponse('Customers cannot access admin endpoints');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const resolved = await resolveTenantBusinessId(supabase, user.id, request);
    if ('error' in resolved) {
      const status = resolved.error === 'FORBIDDEN' ? 403 : 404;
      return NextResponse.json({ error: 'Business not found or access denied' }, { status });
    }
    const settingsOk = await assertUserHasAdminModuleAccess(
      user.id,
      resolved.businessId,
      'settings'
    );
    if (settingsOk === 'no_service_role') {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    if (settingsOk === 'denied') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const business = { id: resolved.businessId };

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'logo', 'hero', 'section'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `website/${business.id}/${type}/${timestamp}_${randomString}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('website-assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('website-assets')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }

    // Check user role - only allow owners and admins
    const userRole = user.user_metadata?.role || 'owner';
    if (userRole === 'customer') {
      return createForbiddenResponse('Customers cannot access admin endpoints');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const resolved = await resolveTenantBusinessId(supabase, user.id, request);
    if ('error' in resolved) {
      const status = resolved.error === 'FORBIDDEN' ? 403 : 404;
      return NextResponse.json({ error: 'Business not found or access denied' }, { status });
    }
    const settingsOk = await assertUserHasAdminModuleAccess(
      user.id,
      resolved.businessId,
      'settings'
    );
    if (settingsOk === 'no_service_role') {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    if (settingsOk === 'denied') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const business = { id: resolved.businessId };

    const { fileName } = await request.json();

    if (!fileName) {
      return NextResponse.json({ error: 'No file name provided' }, { status: 400 });
    }

    // Security: Ensure file belongs to this business
    if (!fileName.includes(`website/${business.id}/`)) {
      return NextResponse.json({ error: 'Unauthorized file access' }, { status: 403 });
    }

    // Delete from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from('website-assets')
      .remove([fileName]);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: 'Delete failed: ' + deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Image delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
