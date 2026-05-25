import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('=== PROVIDER DRIVE GET API ===');
    
    // Create service role client for server-side operations
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

    // Get parent_id from query params (null for root folder)
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const parentIdValue = parentId === 'null' || parentId === null ? null : parentId;

    // Fetch files for this provider
    let query = supabaseAdmin
      .from('provider_drive_files')
      .select('*')
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id);

    // Filter by parent_id
    if (parentIdValue === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', parentIdValue);
    }

    const { data: files, error: filesError } = await query.order('created_at', { ascending: false });

    if (filesError) {
      console.error('Error fetching files:', filesError);
      return NextResponse.json(
        { error: 'Failed to fetch files' },
        { status: 500 }
      );
    }

    // Transform files to match frontend format
    const transformedFiles = files?.map(file => ({
      id: file.id,
      name: file.name,
      type: file.type,
      fileType: file.file_type || undefined,
      size: file.size_bytes ? formatFileSize(file.size_bytes) : undefined,
      uploadedAt: file.created_at,
      url: file.storage_url || undefined,
      parentId: file.parent_id || null,
    })) || [];

    return NextResponse.json({ files: transformedFiles });

  } catch (error) {
    console.error('Drive API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== PROVIDER DRIVE POST API ===');
    
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

    const body = await request.json();
    const { name, type, parentId, fileType, sizeBytes, storagePath, storageUrl } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Validate parent_id belongs to same business if provided
    if (parentId && parentId !== 'null') {
      const { data: parentFile, error: parentError } = await supabaseAdmin
        .from('provider_drive_files')
        .select('business_id, provider_id')
        .eq('id', parentId)
        .single();

      if (parentError || !parentFile) {
        return NextResponse.json(
          { error: 'Parent folder not found' },
          { status: 404 }
        );
      }

      // Ensure parent belongs to same business
      if (parentFile.business_id !== provider.business_id) {
        return NextResponse.json(
          { error: 'Cannot access folder from another business' },
          { status: 403 }
        );
      }

      // Ensure parent belongs to same provider
      if (parentFile.provider_id !== provider.id) {
        return NextResponse.json(
          { error: 'Cannot access folder from another provider' },
          { status: 403 }
        );
      }
    }

    // Insert file/folder record
    const { data: newFile, error: insertError } = await supabaseAdmin
      .from('provider_drive_files')
      .insert({
        provider_id: provider.id,
        business_id: provider.business_id,
        name,
        type,
        file_type: fileType || null,
        size_bytes: sizeBytes || null,
        storage_path: storagePath || null,
        storage_url: storageUrl || null,
        parent_id: parentId === 'null' || parentId === null ? null : parentId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating file:', insertError);
      return NextResponse.json(
        { error: 'Failed to create file/folder' },
        { status: 500 }
      );
    }

    // Transform response to match frontend format
    const transformedFile = {
      id: newFile.id,
      name: newFile.name,
      type: newFile.type,
      fileType: newFile.file_type || undefined,
      size: newFile.size_bytes ? formatFileSize(newFile.size_bytes) : undefined,
      uploadedAt: newFile.created_at,
      url: newFile.storage_url || undefined,
      parentId: newFile.parent_id || null,
    };

    return NextResponse.json({ file: transformedFile }, { status: 201 });

  } catch (error) {
    console.error('Drive POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('=== PROVIDER DRIVE DELETE API ===');
    
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

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get file to check ownership and get storage path (with business isolation)
    const { data: file, error: fileError } = await supabaseAdmin
      .from('provider_drive_files')
      .select('*')
      .eq('id', fileId)
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id) // CRITICAL: Ensure business isolation
      .single();

    if (fileError || !file) {
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      );
    }

    // If it's a folder, check if it has children (within same business)
    if (file.type === 'folder') {
      const { data: children, error: childrenError } = await supabaseAdmin
        .from('provider_drive_files')
        .select('id')
        .eq('parent_id', fileId)
        .eq('business_id', provider.business_id) // CRITICAL: Only check children in same business
        .limit(1);

      if (childrenError) {
        console.error('Error checking children:', childrenError);
      }

      if (children && children.length > 0) {
        return NextResponse.json(
          { error: 'Cannot delete folder with files inside. Please delete all files first.' },
          { status: 400 }
        );
      }
    }

    // Delete file from storage if it exists
    if (file.storage_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('provider-drive-files')
        .remove([file.storage_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete file record from database (with business isolation)
    const { error: deleteError } = await supabaseAdmin
      .from('provider_drive_files')
      .delete()
      .eq('id', fileId)
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id); // CRITICAL: Ensure business isolation

    if (deleteError) {
      console.error('Error deleting file:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Drive DELETE API error:', error);
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
