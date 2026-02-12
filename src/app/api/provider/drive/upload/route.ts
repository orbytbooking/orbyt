import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('=== PROVIDER DRIVE UPLOAD API ===');
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user session with token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get provider data
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (providerError || !provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const parentId = formData.get('parentId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Generate unique file path with business isolation
    // Format: {business_id}/{provider_id}/{timestamp}-{filename}
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${provider.business_id}/${provider.id}/${Date.now()}-${sanitizedFileName}`;

    // Upload file to Supabase storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('provider-drive-files')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Generate signed URL for private bucket (valid for 1 year)
    let finalUrl: string;
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('provider-drive-files')
      .createSignedUrl(filePath, 31536000); // 1 year expiry

    if (urlError || !urlData) {
      console.error('Error generating signed URL:', urlError);
      // Fallback to public URL if signed URL fails
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('provider-drive-files')
        .getPublicUrl(filePath);
      
      finalUrl = publicUrlData.publicUrl;
    } else {
      finalUrl = urlData.signedUrl;
    }

    // Determine file type
    const getFileType = (fileName: string): "document" | "image" | "video" | "other" => {
      const extension = fileName.split(".").pop()?.toLowerCase();
      
      if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension || "")) {
        return "image";
      }
      if (["mp4", "avi", "mov", "wmv"].includes(extension || "")) {
        return "video";
      }
      if (["pdf", "doc", "docx", "txt", "xls", "xlsx"].includes(extension || "")) {
        return "document";
      }
      return "other";
    };

    // Insert file record into database
    const { data: newFile, error: insertError } = await supabaseAdmin
      .from('provider_drive_files')
      .insert({
        provider_id: provider.id,
        business_id: provider.business_id,
        name: file.name,
        type: 'file',
        file_type: getFileType(file.name),
        size_bytes: file.size,
        storage_path: filePath,
        storage_url: finalUrl,
        parent_id: parentId === 'null' || parentId === null ? null : parentId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating file record:', insertError);
      // Try to delete uploaded file from storage
      await supabaseAdmin.storage
        .from('provider-drive-files')
        .remove([filePath]);
      
      return NextResponse.json(
        { error: 'Failed to create file record' },
        { status: 500 }
      );
    }

    // Transform response to match frontend format
    const transformedFile = {
      id: newFile.id,
      name: newFile.name,
      type: newFile.type,
      fileType: newFile.file_type || undefined,
      size: formatFileSize(newFile.size_bytes || 0),
      uploadedAt: newFile.created_at,
      url: newFile.storage_url || undefined,
      parentId: newFile.parent_id || null,
    };

    return NextResponse.json({ file: transformedFile }, { status: 201 });

  } catch (error) {
    console.error('Drive upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
