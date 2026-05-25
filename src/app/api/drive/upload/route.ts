import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileType, fileSize, ownerType, ownerId, folderPath = '' } = body;

    if (!fileName || !fileType || !ownerType || !ownerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // TODO: Add proper authentication check later
    // For now, skip auth to test storage bucket setup

    // Generate unique file path
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const storagePath = `${ownerType}/${ownerId}/${folderPath}/${uniqueFileName}`;

    // Create signed upload URL
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
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // TODO: Add proper authentication check later
    // For now, skip auth to test storage bucket setup

    // Create signed download URL
    const { data, error } = await supabaseAdmin.storage
      .from('drive-files')
      .createSignedUrl(filePath, 3600); // 1 hour

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
