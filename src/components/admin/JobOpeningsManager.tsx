'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, ArrowLeft, Save, X, Upload, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, Link as LinkIcon, ExternalLink, Eye } from 'lucide-react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const JOB_OPENINGS_STORAGE_KEY = 'premier_pro_job_openings';

export type JobOpening = {
  id: string;
  title: string;
  slug: string;
  headerContent: string;
  bannerImage?: {
    url: string;
    enabled: boolean;
  };
  firstIcon?: {
    url: string;
    enabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_OPENINGS: JobOpening[] = [];

// Simple Rich Text Editor Component
const RichTextEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="border-b bg-muted/50 p-2 flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('bold')}
          className="h-8 w-8 p-0"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('italic')}
          className="h-8 w-8 p-0"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('underline')}
          className="h-8 w-8 p-0"
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('justifyLeft')}
          className="h-8 w-8 p-0"
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('justifyCenter')}
          className="h-8 w-8 p-0"
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('justifyRight')}
          className="h-8 w-8 p-0"
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('insertUnorderedList')}
          className="h-8 w-8 p-0"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('insertOrderedList')}
          className="h-8 w-8 p-0"
          title="Numbered List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = prompt('Enter URL:');
            if (url) execCommand('createLink', url);
          }}
          className="h-8 w-8 p-0"
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={updateContent}
        className="min-h-[200px] p-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
        style={{ whiteSpace: 'pre-wrap' }}
      />
    </div>
  );
};

export function JobOpeningsManager() {
  const { toast } = useToast();
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [form, setForm] = useState<Omit<JobOpening, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    slug: '',
    headerContent: '',
    bannerImage: {
      url: '',
      enabled: false,
    },
    firstIcon: {
      url: '',
      enabled: false,
    },
  });

  // Load openings from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(JOB_OPENINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOpenings(parsed);
          return;
        }
      }
      setOpenings(DEFAULT_OPENINGS);
    } catch (e) {
      console.error('Error loading job openings:', e);
      setOpenings(DEFAULT_OPENINGS);
    }
  }, []);

  // Save openings to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined' || openings.length === 0) return;
    try {
      localStorage.setItem(JOB_OPENINGS_STORAGE_KEY, JSON.stringify(openings));
    } catch (e) {
      console.error('Error saving job openings:', e);
    }
  }, [openings]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (title: string) => {
    setForm({
      ...form,
      title,
      slug: form.slug || generateSlug(title),
    });
  };

  const handleImageUpload = (type: 'bannerImage' | 'firstIcon', file: File | null) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm({
        ...form,
        [type]: {
          url: reader.result as string,
          enabled: form[type]?.enabled || true,
        },
      });
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm({
      title: '',
      slug: '',
      headerContent: '',
      bannerImage: {
        url: '',
        enabled: false,
      },
      firstIcon: {
        url: '',
        enabled: false,
      },
    });
    setEditingId(null);
  };

  const handleEdit = (opening: JobOpening) => {
    setForm({
      title: opening.title,
      slug: opening.slug,
      headerContent: opening.headerContent,
      bannerImage: opening.bannerImage || { url: '', enabled: false },
      firstIcon: opening.firstIcon || { url: '', enabled: false },
    });
    setEditingId(opening.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setOpenings(openings.filter(o => o.id !== deleteId));
    toast({
      title: 'Job opening deleted',
      description: 'The job opening has been removed.',
      variant: 'default',
    });
    setDeleteId(null);
    if (editingId === deleteId) {
      resetForm();
      setShowForm(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title.trim()) {
      toast({
        title: 'Validation error',
        description: 'Please enter a job title.',
        variant: 'destructive',
      });
      return;
    }

    if (!form.slug.trim()) {
      toast({
        title: 'Validation error',
        description: 'Please enter a slug.',
        variant: 'destructive',
      });
      return;
    }

    const now = new Date().toISOString();

    if (editingId) {
      // Update existing opening
      setOpenings(openings.map(o => 
        o.id === editingId 
          ? { 
              ...o,
              ...form,
              updatedAt: now,
            }
          : o
      ));
      toast({
        title: 'Job opening updated',
        description: 'The job opening has been updated successfully.',
        variant: 'default',
      });
    } else {
      // Add new opening
      const newOpening: JobOpening = {
        id: Date.now().toString(),
        ...form,
        createdAt: now,
        updatedAt: now,
      };
      setOpenings([...openings, newOpening]);
      toast({
        title: 'Job opening created',
        description: 'The new job opening has been added successfully.',
        variant: 'default',
      });
    }
    
    resetForm();
    setShowForm(false);
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-medium">
              {editingId ? 'Edit Job Opening' : 'Add New Job Opening'}
            </h3>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input 
                  id="title" 
                  placeholder="Enter Job Title" 
                  value={form.title} 
                  onChange={(e) => handleTitleChange(e.target.value)} 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input 
                  id="slug" 
                  placeholder="Enter Slug" 
                  value={form.slug} 
                  onChange={(e) => setForm({ ...form, slug: e.target.value })} 
                  required 
                />
                <p className="text-xs text-muted-foreground">
                  URL-friendly version of the title (auto-generated from title)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Header Content</CardTitle>
              <CardDescription>Rich text content for the job opening header</CardDescription>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                value={form.headerContent}
                onChange={(value) => setForm({ ...form, headerContent: value })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Banner Image</CardTitle>
              <CardDescription>Recommended size: 1920 x 900 pixels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="banner-enabled">Enabled</Label>
                <Switch
                  id="banner-enabled"
                  checked={form.bannerImage.enabled}
                  onCheckedChange={(checked) => 
                    setForm({ 
                      ...form, 
                      bannerImage: { ...form.bannerImage, enabled: checked } 
                    })
                  }
                />
              </div>
              {form.bannerImage.enabled && (
                <div className="space-y-2">
                  <Label>Upload Banner Image</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('bannerImage', e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    {form.bannerImage.url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setForm({ ...form, bannerImage: { url: '', enabled: false } })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {form.bannerImage.url && (
                    <div className="mt-2 rounded-lg overflow-hidden border">
                      <img 
                        src={form.bannerImage.url} 
                        alt="Banner preview" 
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>First Icon</CardTitle>
              <CardDescription>Recommended size: 120 x 120 pixels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="icon-enabled">Enabled</Label>
                <Switch
                  id="icon-enabled"
                  checked={form.firstIcon.enabled}
                  onCheckedChange={(checked) => 
                    setForm({ 
                      ...form, 
                      firstIcon: { ...form.firstIcon, enabled: checked } 
                    })
                  }
                />
              </div>
              {form.firstIcon.enabled && (
                <div className="space-y-2">
                  <Label>Upload Icon</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('firstIcon', e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    {form.firstIcon.url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setForm({ ...form, firstIcon: { url: '', enabled: false } })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {form.firstIcon.url && (
                    <div className="mt-2 rounded-lg overflow-hidden border w-32 h-32 flex items-center justify-center border-dashed">
                      <img 
                        src={form.firstIcon.url} 
                        alt="Icon preview" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Job Openings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage job openings for your hiring process
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/job-application" target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Application Form
            </Link>
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Opening
          </Button>
        </div>
      </div>

      {openings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No job openings found. Get started by creating a new opening.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Opening
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {openings.map((opening) => (
            <Card key={opening.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{opening.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Slug: {opening.slug} • Created: {new Date(opening.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      asChild
                    >
                      <Link href={`/job-openings/${opening.slug}`} target="_blank">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(opening)}
                      title="Edit opening"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(opening.id)}
                      title="Delete opening"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {opening.bannerImage?.url && opening.bannerImage.enabled && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img 
                      src={opening.bannerImage.url} 
                      alt="Banner" 
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}
                {opening.headerContent && (
                  <div 
                    className="text-sm text-muted-foreground [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4"
                    dangerouslySetInnerHTML={{ __html: opening.headerContent }}
                  />
                )}
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={`/job-openings/${opening.slug}`} target="_blank">
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Job Opening
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Opening</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this job opening? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

