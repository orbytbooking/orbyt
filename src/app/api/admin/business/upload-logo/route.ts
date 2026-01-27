import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth-helpers';

// Create Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('=== BUSINESS LOGO UPLOAD DEBUG ===');
    
    // Get authenticated user
    const user = await getAuthenticatedUser();
    
    if (!user) {
      console.error('User not authenticated');
      return createUnauthorizedResponse('User not authenticated');
    }
    
    console.log('✅ Auth successful for user:', user.id);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const businessId = formData.get('businessId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed' 
      }, { status: 400 });
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size too large. Maximum size is 5MB' 
      }, { status: 400 });
    }

    // Generate unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${businessId}/logo-${Date.now()}.${fileExt}`;

    // Create service client for storage operations
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await serviceSupabase.storage
      .from('business-logos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload file',
        details: uploadError.message 
      }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = serviceSupabase.storage
      .from('business-logos')
      .getPublicUrl(fileName);

    // Update business record with logo URL
    const { data: business, error: updateError } = await supabase
      .from('businesses')
      .update({ 
        logo_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .select()
      .single();

    if (updateError) {
      console.error('Business update error:', updateError);
      // Try to delete uploaded file if business update fails
      await serviceSupabase.storage
        .from('business-logos')
        .remove([fileName]);
      
      return NextResponse.json({ 
        error: 'Failed to update business with logo URL',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('Logo uploaded successfully:', publicUrl);

    return NextResponse.json({ 
      success: true,
      logo_url: publicUrl,
      business: business
    });

  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('=== BUSINESS LOGO DELETE DEBUG ===');
    
    // Get authenticated user
    const user = await getAuthenticatedUser();
    
    if (!user) {
      console.error('User not authenticated');
      return createUnauthorizedResponse('User not authenticated');
    }
    
    console.log('✅ Auth successful for user:', user.id);

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    // Get current business to find logo URL
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('logo_url')
      .eq('id', businessId)
      .single();

    if (fetchError) {
      console.error('Business fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 });
    }

    if (business?.logo_url) {
      // Extract file path from URL
      const urlParts = business.logo_url.split('/');
      const filePath = urlParts.slice(-2).join('/'); // businessId/filename

      // Create service client for storage operations
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Delete file from storage
      const { error: deleteError } = await serviceSupabase.storage
        .from('business-logos')
        .remove([filePath]);

      if (deleteError) {
        console.error('File delete error:', deleteError);
        // Continue with business update even if file deletion fails
      }
    }

    // Update business record to remove logo URL
    const { data: updatedBusiness, error: updateError } = await supabase
      .from('businesses')
      .update({ 
        logo_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .select()
      .single();

    if (updateError) {
      console.error('Business update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update business',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('Logo deleted successfully for business:', businessId);

    return NextResponse.json({ 
      success: true,
      business: updatedBusiness
    });

  } catch (error) {
    console.error('Logo delete error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
