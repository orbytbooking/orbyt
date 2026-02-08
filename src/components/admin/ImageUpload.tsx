'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  onImageUpload: (url: string) => void;
  onImageDelete: (url: string) => void;
  currentImage?: string;
  type: 'logo' | 'hero' | 'section';
  maxSize?: number; // in MB
  acceptedTypes?: string[];
}

export function ImageUpload({ 
  onImageUpload, 
  onImageDelete, 
  currentImage, 
  type, 
  maxSize = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: `Please upload a valid image file (${acceptedTypes.join(', ')})`,
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: `Please upload an image smaller than ${maxSize}MB`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const xhr = new XMLHttpRequest();
      
      // Track progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            onImageUpload(response.url);
            toast({
              title: 'Image uploaded successfully',
              description: 'Your image has been uploaded and is ready to use.',
            });
          } else {
            throw new Error(response.error || 'Upload failed');
          }
        } else {
          throw new Error('Upload failed');
        }
        setUploading(false);
        setProgress(0);
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        toast({
          title: 'Upload failed',
          description: 'There was an error uploading your image. Please try again.',
          variant: 'destructive',
        });
        setUploading(false);
        setProgress(0);
      });

      // Send request
      xhr.open('POST', '/api/admin/upload-website-image');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('supabase.auth.token') || ''}`);
      xhr.send(formData);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your image. Please try again.',
        variant: 'destructive',
      });
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!currentImage) return;

    try {
      const response = await fetch('/api/admin/upload-website-image', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || ''}`,
        },
        body: JSON.stringify({ fileName: currentImage.split('/').pop() }),
      });

      if (response.ok) {
        onImageDelete(currentImage);
        toast({
          title: 'Image deleted',
          description: 'The image has been removed successfully.',
        });
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: 'There was an error deleting the image. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {currentImage ? (
        <div className="relative group">
          <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <img
              src={currentImage}
              alt="Uploaded image"
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Replace
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={uploading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
        >
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <div className="text-gray-600 dark:text-gray-300">
            <p className="text-sm font-medium">Click to upload image</p>
            <p className="text-xs mt-1">
              PNG, JPG, GIF, WebP up to {maxSize}MB
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose File
          </Button>
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}
    </div>
  );
}
