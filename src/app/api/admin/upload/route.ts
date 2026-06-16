import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
} from '@/lib/adminTenantContext';
import { createForbiddenResponse } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, user } = ctx;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'No user ID provided' }, { status: 400 });
    }

    if (userId !== user.id) {
      return createForbiddenResponse('You can only upload a profile picture for your own account');
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size should not be more than 5MB' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: 'Failed to upload file: ' + error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({
        profile_picture: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.warn('File uploaded but profile update failed:', updateError);
    }

    return NextResponse.json({
      url: publicUrl,
      path: filePath,
      profile: profile ?? null
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
