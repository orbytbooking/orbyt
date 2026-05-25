'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, ExternalLink } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';

const JOB_FORM_STORAGE_KEY = 'orbyt_job_form_fields';

export type FieldType = 
  | 'text' 
  | 'email' 
  | 'phone' 
  | 'textarea' 
  | 'number' 
  | 'date' 
  | 'file' 
  | 'select' 
  | 'checkbox' 
  | 'radio';

export type JobFormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  order: number;
  options?: string[]; // For select, radio, checkbox
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
};

const DEFAULT_FIELDS: JobFormField[] = [
  {
    id: '1',
    label: 'Full Name',
    type: 'text',
    required: true,
    placeholder: 'Enter your full name',
    order: 1,
  },
  {
    id: '2',
    label: 'Email Address',
    type: 'email',
    required: true,
    placeholder: 'Enter your email',
    order: 2,
  },
  {
    id: '3',
    label: 'Phone Number',
    type: 'phone',
    required: true,
    placeholder: 'Enter your phone number',
    order: 3,
  },
  {
    id: '4',
    label: 'Position Applied For',
    type: 'text',
    required: true,
    placeholder: 'Enter the position you are applying for',
    order: 4,
  },
  {
    id: '5',
    label: 'Resume/CV',
    type: 'file',
    required: true,
    order: 5,
  },
  {
    id: '6',
    label: 'Cover Letter',
    type: 'textarea',
    required: false,
    placeholder: 'Tell us why you are interested in this position...',
    order: 6,
  },
];

export function JobFormManager() {
  const { toast } = useToast();
  const [fields, setFields] = useState<JobFormField[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [form, setForm] = useState<Omit<JobFormField, 'id' | 'order'>>({
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    options: [],
    validation: {},
  });

  // Load fields from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(JOB_FORM_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFields(parsed);
          return;
        }
      }
      // If no stored fields, use defaults
      setFields(DEFAULT_FIELDS);
      localStorage.setItem(JOB_FORM_STORAGE_KEY, JSON.stringify(DEFAULT_FIELDS));
    } catch (e) {
      console.error('Error loading job form fields:', e);
      setFields(DEFAULT_FIELDS);
    }
  }, []);

  // Save fields to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined' || fields.length === 0) return;
    try {
      localStorage.setItem(JOB_FORM_STORAGE_KEY, JSON.stringify(fields));
    } catch (e) {
      console.error('Error saving job form fields:', e);
    }
  }, [fields]);

  const resetForm = () => {
    setForm({
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      options: [],
      validation: {},
    });
    setEditingId(null);
  };

  const handleEdit = (field: JobFormField) => {
    setForm({
      label: field.label,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder || '',
      options: field.options || [],
      validation: field.validation || {},
    });
    setEditingId(field.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setFields(fields.filter(f => f.id !== deleteId));
    toast({
      title: 'Field deleted',
      description: 'The field has been removed from the form.',
      variant: 'default',
    });
    setDeleteId(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newFields = [...fields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    // Update order numbers
    newFields.forEach((field, i) => {
      field.order = i + 1;
    });
    setFields(newFields);
  };

  const handleMoveDown = (index: number) => {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    // Update order numbers
    newFields.forEach((field, i) => {
      field.order = i + 1;
    });
    setFields(newFields);
  };

  const addOption = () => {
    setForm({
      ...form,
      options: [...(form.options || []), ''],
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(form.options || [])];
    newOptions[index] = value;
    setForm({ ...form, options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = [...(form.options || [])];
    newOptions.splice(index, 1);
    setForm({ ...form, options: newOptions });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.label.trim()) {
      toast({
        title: 'Validation error',
        description: 'Please enter a field label.',
        variant: 'destructive',
      });
      return;
    }

    if ((form.type === 'select' || form.type === 'radio') && (!form.options || form.options.length === 0)) {
      toast({
        title: 'Validation error',
        description: 'Please add at least one option for select/radio fields.',
        variant: 'destructive',
      });
      return;
    }

    if (editingId) {
      // Update existing field
      setFields(fields.map(f => 
        f.id === editingId 
          ? { 
              ...f, 
              label: form.label.trim(),
              type: form.type,
              required: form.required,
              placeholder: form.placeholder?.trim() || undefined,
              options: (form.type === 'select' || form.type === 'radio') ? form.options?.filter(o => o.trim()) : undefined,
              validation: form.validation,
            }
          : f
      ));
      toast({
        title: 'Field updated',
        description: 'The field has been updated successfully.',
        variant: 'default',
      });
    } else {
      // Add new field
      const newField: JobFormField = {
        id: Date.now().toString(),
        label: form.label.trim(),
        type: form.type,
        required: form.required,
        placeholder: form.placeholder?.trim() || undefined,
        options: (form.type === 'select' || form.type === 'radio') ? form.options?.filter(o => o.trim()) : undefined,
        validation: form.validation,
        order: fields.length + 1,
      };
      setFields([...fields, newField]);
      toast({
        title: 'Field created',
        description: 'The new field has been added to the form.',
        variant: 'default',
      });
    }
    
    resetForm();
    setShowForm(false);
  };

  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            {editingId ? 'Edit Field' : 'Add New Field'}
          </h3>
          <Button
            variant="ghost"
            onClick={() => {
              resetForm();
              setShowForm(false);
            }}
          >
            Back to List
          </Button>
        </div>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="label">Field Label *</Label>
            <Input 
              id="label" 
              placeholder="e.g., Full Name, Email Address" 
              value={form.label} 
              onChange={(e) => setForm({ ...form, label: e.target.value })} 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Field Type *</Label>
            <Select 
              value={form.type} 
              onValueChange={(v: FieldType) => {
                setForm({ 
                  ...form, 
                  type: v,
                  options: (v === 'select' || v === 'radio') ? (form.options || ['']) : undefined,
                });
              }}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select field type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="textarea">Textarea</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="file">File Upload</SelectItem>
                <SelectItem value="select">Dropdown (Select)</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
                <SelectItem value="radio">Radio Button</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="placeholder">Placeholder Text</Label>
            <Input 
              id="placeholder" 
              placeholder="e.g., Enter your name..." 
              value={form.placeholder || ''} 
              onChange={(e) => setForm({ ...form, placeholder: e.target.value })} 
            />
            <p className="text-xs text-muted-foreground">
              {form.type === 'file' ? 'Note: File uploads don\'t use placeholder text' : 'Optional hint text shown in the field'}
            </p>
          </div>

          {(form.type === 'select' || form.type === 'radio') && (
            <div className="space-y-2">
              <Label>Options *</Label>
              <div className="space-y-2">
                {(form.options || []).map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                      disabled={(form.options || []).length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="required"
              checked={form.required}
              onCheckedChange={(checked) => setForm({ ...form, required: checked })}
            />
            <Label htmlFor="required" className="cursor-pointer">
              Required field
            </Label>
          </div>

          <div className="flex justify-end space-x-4">
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
              {editingId ? 'Update Field' : 'Add Field'}
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
          <h2 className="text-2xl font-bold">Job Application Form</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize the fields for your job application form
          </p>
        </div>
        <div className="flex gap-2">
          {sortedFields.length > 0 && (
            <Button variant="outline" asChild>
              <Link href="/job-application" target="_blank">
                <Eye className="h-4 w-4 mr-2" />
                Preview Form
                <ExternalLink className="h-3 w-3 ml-2" />
              </Link>
            </Button>
          )}
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>
      </div>

      {sortedFields.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            No fields found. Get started by creating a new field.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedFields.map((field, index) => {
            const originalIndex = fields.findIndex(f => f.id === field.id);
            return (
              <div key={field.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex flex-col gap-1 mt-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveUp(originalIndex)}
                        disabled={originalIndex === 0}
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveDown(originalIndex)}
                        disabled={originalIndex === fields.length - 1}
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          #{field.order}
                        </span>
                        <h3 className="font-medium text-lg">{field.label}</h3>
                        {field.required && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                            Required
                          </span>
                        )}
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full capitalize">
                          {field.type}
                        </span>
                      </div>
                      {field.placeholder && (
                        <p className="text-sm text-muted-foreground">
                          Placeholder: {field.placeholder}
                        </p>
                      )}
                      {field.options && field.options.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Options: {field.options.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleEdit(field)}
                      title="Edit field"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(field.id)}
                      title="Delete field"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this field? This action cannot be undone.
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

