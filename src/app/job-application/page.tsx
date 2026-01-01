'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Download, Printer, FileText } from 'lucide-react';
import type { JobFormField } from '@/components/admin/JobFormManager';

const JOB_FORM_STORAGE_KEY = 'premier_pro_job_form_fields';

export default function JobApplicationPage() {
  const { toast } = useToast();
  const [fields, setFields] = useState<JobFormField[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(JOB_FORM_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sorted = [...parsed].sort((a, b) => a.order - b.order);
          setFields(sorted);
          // Initialize form data
          const initialData: Record<string, any> = {};
          sorted.forEach(field => {
            if (field.type === 'checkbox') {
              initialData[field.id] = false;
            } else if (field.type === 'select' || field.type === 'radio') {
              initialData[field.id] = '';
            } else {
              initialData[field.id] = '';
            }
          });
          setFormData(initialData);
        }
      }
    } catch (e) {
      console.error('Error loading form fields:', e);
    }
  }, []);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleFileChange = (fieldId: string, file: File | null) => {
    if (file) {
      setFormData(prev => ({ ...prev, [fieldId]: file.name }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validate required fields
    const missingFields = fields
      .filter(f => f.required && !formData[f.id])
      .map(f => f.label);
    
    if (missingFields.length > 0) {
      toast({
        title: 'Validation Error',
        description: `Please fill in required fields: ${missingFields.join(', ')}`,
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    // Here you would typically send the data to your backend
    // For now, we'll just show a success message
    toast({
      title: 'Application Submitted',
      description: 'Your job application has been submitted successfully.',
      variant: 'default',
    });

    setIsSubmitting(false);
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleDownloadForm = () => {
    // Use browser's print functionality which allows saving as PDF
    window.print();
  };

  const renderField = (field: JobFormField) => {
    const value = formData[field.id] || '';
    const fieldId = `field-${field.id}`;

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={fieldId}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
            rows={5}
            className="resize-none"
          />
        );
      
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => handleInputChange(field.id, val)}
            required={field.required}
          >
            <SelectTrigger id={fieldId}>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, idx) => (
                <SelectItem key={idx} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'radio':
        return (
          <RadioGroup
            value={value}
            onValueChange={(val) => handleInputChange(field.id, val)}
            required={field.required}
          >
            {field.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${fieldId}-${idx}`} />
                <Label htmlFor={`${fieldId}-${idx}`} className="font-normal cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              checked={value}
              onCheckedChange={(checked) => handleInputChange(field.id, checked)}
              required={field.required}
            />
            <Label htmlFor={fieldId} className="font-normal cursor-pointer">
              {field.placeholder || 'I agree'}
            </Label>
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-2">
            <Input
              id={fieldId}
              type="file"
              onChange={(e) => handleFileChange(field.id, e.target.files?.[0] || null)}
              required={field.required}
              className="cursor-pointer"
            />
            {value && (
              <p className="text-sm text-muted-foreground">Selected: {value}</p>
            )}
          </div>
        );
      
      case 'date':
        return (
          <Input
            id={fieldId}
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );
      
      case 'number':
        return (
          <Input
            id={fieldId}
            type="number"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );
      
      default:
        return (
          <Input
            id={fieldId}
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );
    }
  };

  if (fields.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Application Form Available</h2>
          <p className="text-muted-foreground">
            The job application form has not been configured yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Actions */}
        <div className="mb-6 flex justify-between items-center no-print">
          <h1 className="text-3xl font-bold">Job Application Form</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadForm}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Formal Form Template */}
        <div id="job-application-form" className="bg-white shadow-lg rounded-lg p-8 md:p-12">
          {/* Header */}
          <div className="text-center border-b-4 border-black pb-6 mb-8 print-header">
            <h1 className="text-3xl font-bold uppercase tracking-wide mb-2">
              Job Application Form
            </h1>
            <p className="text-sm text-muted-foreground">
              Please complete all sections of this application form
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All information provided will be kept confidential
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information Section */}
            <div className="section">
              <h2 className="text-xl font-bold border-b-2 border-black pb-2 mb-6 uppercase">
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fields.map((field) => (
                  <div key={field.id} className="field-group">
                    <Label htmlFor={`field-${field.id}`} className="text-sm font-semibold mb-2 block">
                      {field.label}
                      {field.required && <span className="text-red-600 ml-1">*</span>}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </div>

            {/* Signature Section */}
            <div className="mt-12 pt-8 border-t-2 border-gray-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">
                    Applicant Signature <span className="text-red-600">*</span>
                  </Label>
                  <div className="border-b-2 border-black h-16 mb-2"></div>
                  <p className="text-xs text-muted-foreground">Sign above</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold mb-2 block">
                    Date <span className="text-red-600">*</span>
                  </Label>
                  <div className="border-b-2 border-black h-16 mb-2"></div>
                  <p className="text-xs text-muted-foreground">Date signed</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8 flex justify-end gap-4 no-print">
              <Button type="button" variant="outline" onClick={handleDownloadForm}>
                <Download className="h-4 w-4 mr-2" />
                Download/Print PDF
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            padding: 0 !important;
          }
          #job-application-form {
            box-shadow: none !important;
            padding: 20px !important;
            max-width: 100% !important;
          }
          .print-header {
            page-break-after: avoid;
          }
          .section {
            page-break-inside: avoid;
          }
          button, input, textarea, select {
            border: 1px solid #000 !important;
            background: white !important;
          }
          input[type="file"] {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

