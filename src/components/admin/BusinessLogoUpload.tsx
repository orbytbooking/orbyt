'use client';
import { useState, useRef, useEffect } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';

interface BusinessLogoUploadProps {
  businessId?: string;
  currentLogo?: string | null;
  onLogoUpdate?: (logoUrl: string | null) => void;
  className?: string;
}

export default function BusinessLogoUpload({ 
  businessId, 
  currentLogo, 
  onLogoUpdate,
  className = ''
}: BusinessLogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentLogo || null);
  const [tempPreview, setTempPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentBusiness } = useBusiness();

  const targetBusinessId = businessId || currentBusiness?.id;

  // Clean up blob URLs when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (tempPreview && tempPreview.startsWith('blob:')) {
        URL.revokeObjectURL(tempPreview);
      }
    };
  }, [tempPreview]);

  // Update preview when currentLogo changes
  useEffect(() => {
    if (currentLogo && !tempPreview) {
      // Don't set blob URLs as permanent preview
      if (!currentLogo.startsWith('blob:')) {
        setPreview(currentLogo);
      }
    }
  }, [currentLogo, tempPreview]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !targetBusinessId) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size too large. Maximum size is 5MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Create temporary preview using blob URL (better than data URL for performance)
      const tempUrl = URL.createObjectURL(file);
      setTempPreview(tempUrl);
      setPreview(tempUrl);

      // Upload file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('businessId', targetBusinessId);

      const response = await fetch('/api/admin/business/upload-logo', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload logo');
      }

      // Clean up temporary blob URL
      if (tempPreview) {
        URL.revokeObjectURL(tempPreview);
        setTempPreview(null);
      }

      // Set permanent URL from server
      setPreview(result.logo_url);
      onLogoUpdate?.(result.logo_url);
      setError(null);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
      
      // Clean up temporary blob URL on error
      if (tempPreview) {
        URL.revokeObjectURL(tempPreview);
        setTempPreview(null);
      }
      
      // Reset to original logo
      setPreview(currentLogo || null);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!targetBusinessId) return;

    setUploading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/business/upload-logo?businessId=${targetBusinessId}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete logo');
      }

      // Clean up any temporary blob URL
      if (tempPreview && tempPreview.startsWith('blob:')) {
        URL.revokeObjectURL(tempPreview);
        setTempPreview(null);
      }

      setPreview(null);
      onLogoUpdate?.(null);
      setError(null);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete logo');
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Determine the actual source for the image
  const getImageSrc = () => {
    if (!preview) return null;
    
    // If it's a blob URL, use it directly (for temporary preview)
    if (preview.startsWith('blob:')) {
      return preview;
    }
    
    // For regular URLs, ensure they're valid
    try {
      new URL(preview);
      return preview;
    } catch {
      // Invalid URL, return null
      return null;
    }
  };

  return (
    <div className={`business-logo-upload ${className}`}>
      <div className="flex items-center space-x-4">
        {/* Logo Preview */}
        <div className="relative">
          {preview ? (
            <div className="relative group">
              <img
                src={getImageSrc() || ''}
                alt="Business Logo"
                className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                onError={(e) => {
                  console.error('Image load error:', preview);
                  // Reset to null if image fails to load
                  setPreview(null);
                  setTempPreview(null);
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={handleDelete}
                  disabled={uploading}
                  className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 disabled:opacity-50"
                  title="Delete logo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div 
              onClick={handleClick}
              className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
            >
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          )}
          
          {uploading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          
          <div className="space-y-2">
            <button
              onClick={handleClick}
              disabled={uploading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : preview ? 'Change Logo' : 'Upload Logo'}
            </button>
            
            {preview && (
              <button
                onClick={handleDelete}
                disabled={uploading}
                className="ml-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove
              </button>
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
          
          <p className="text-gray-500 text-sm mt-1">
            JPEG, PNG, GIF, or WebP (max 5MB)
          </p>
        </div>
      </div>
    </div>
  );
}
