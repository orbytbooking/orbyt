import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';

interface LeadFormProps {
  lead?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    tags: string[];
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const statusOptions = ['new', 'contacted', 'qualified', 'lost'];

export function LeadForm({ lead, onSubmit, onCancel, loading }: LeadFormProps) {
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    status: lead?.status || 'new',
    tags: lead?.tags || []
  });
  const [newTag, setNewTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      tags: formData.tags
    };
    
    onSubmit(submitData);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter lead name"
          required
        />
      </div>

      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Enter email address"
          required
        />
      </div>

      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="Enter phone number"
        />
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        >
          {statusOptions.map(status => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="tags">Tags</Label>
        
        {/* Current tags display */}
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.tags.map((tag, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-100 text-cyan-800 border border-cyan-300 rounded-full text-sm"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-cyan-600 hover:text-cyan-800 focus:outline-none"
                  title="Remove tag"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Add new tag input */}
        <div className="flex gap-2">
          <Input
            id="tags"
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={handleTagKeyPress}
            placeholder="Add a tag..."
            className="flex-1"
          />
          <Button
            type="button"
            onClick={addTag}
            disabled={!newTag.trim() || formData.tags.includes(newTag.trim())}
            variant="outline"
            className="px-3"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-1">
          Press Enter or click + to add a tag. Click X to remove existing tags.
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}
        </Button>
      </div>
    </form>
  );
}
