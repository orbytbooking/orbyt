'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, ArrowUp, ArrowDown } from 'lucide-react';
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

const FAQS_STORAGE_KEY = 'premier_pro_faqs';

export type FAQ = {
  id: string;
  question: string;
  answer: string;
  order: number;
};

const DEFAULT_FAQS: FAQ[] = [
  {
    id: '1',
    question: 'How do I book an appointment?',
    answer: 'You can book an appointment by clicking the \'Book Now\' button on our homepage and following the simple booking process.',
    order: 1,
  },
  {
    id: '2',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, PayPal, and in some cases, cash on delivery. All online payments are processed securely.',
    order: 2,
  },
  {
    id: '3',
    question: 'Can I reschedule or cancel my appointment?',
    answer: 'Yes, you can reschedule or cancel your appointment up to 24 hours before your scheduled time through your account dashboard.',
    order: 3,
  },
  {
    id: '4',
    question: 'What are your working hours?',
    answer: 'Our customer support is available 24/7. Service hours vary by location and service type, which you can see during the booking process.',
    order: 4,
  },
  {
    id: '5',
    question: 'Do you offer recurring cleaning services?',
    answer: 'Yes, we offer weekly, bi-weekly, and monthly cleaning services. You can set up a recurring schedule during booking.',
    order: 5,
  },
];

export function FAQsManager() {
  const { toast } = useToast();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [form, setForm] = useState<Omit<FAQ, 'id' | 'order'>>({
    question: '',
    answer: '',
  });

  // Load FAQs from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(FAQS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFaqs(parsed);
          return;
        }
      }
      // If no stored FAQs, use defaults
      setFaqs(DEFAULT_FAQS);
      localStorage.setItem(FAQS_STORAGE_KEY, JSON.stringify(DEFAULT_FAQS));
    } catch (e) {
      console.error('Error loading FAQs:', e);
      setFaqs(DEFAULT_FAQS);
    }
  }, []);

  // Save FAQs to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined' || faqs.length === 0) return;
    try {
      localStorage.setItem(FAQS_STORAGE_KEY, JSON.stringify(faqs));
    } catch (e) {
      console.error('Error saving FAQs:', e);
    }
  }, [faqs]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const resetForm = () => {
    setForm({
      question: '',
      answer: '',
    });
    setEditingId(null);
  };

  const handleEdit = (faq: FAQ) => {
    setForm({
      question: faq.question,
      answer: faq.answer,
    });
    setEditingId(faq.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setFaqs(faqs.filter(f => f.id !== deleteId));
    toast({
      title: 'FAQ deleted',
      description: 'The FAQ has been removed.',
      variant: 'default',
    });
    setDeleteId(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newFaqs = [...faqs];
    [newFaqs[index - 1], newFaqs[index]] = [newFaqs[index], newFaqs[index - 1]];
    // Update order numbers
    newFaqs.forEach((faq, i) => {
      faq.order = i + 1;
    });
    setFaqs(newFaqs);
  };

  const handleMoveDown = (index: number) => {
    if (index === faqs.length - 1) return;
    const newFaqs = [...faqs];
    [newFaqs[index], newFaqs[index + 1]] = [newFaqs[index + 1], newFaqs[index]];
    // Update order numbers
    newFaqs.forEach((faq, i) => {
      faq.order = i + 1;
    });
    setFaqs(newFaqs);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.question.trim() || !form.answer.trim()) {
      toast({
        title: 'Validation error',
        description: 'Please fill in both question and answer fields.',
        variant: 'destructive',
      });
      return;
    }

    if (editingId) {
      // Update existing FAQ
      setFaqs(faqs.map(f => 
        f.id === editingId 
          ? { ...f, question: form.question.trim(), answer: form.answer.trim() }
          : f
      ));
      toast({
        title: 'FAQ updated',
        description: 'The FAQ has been updated successfully.',
        variant: 'default',
      });
    } else {
      // Add new FAQ
      const newFAQ: FAQ = {
        id: Date.now().toString(),
        question: form.question.trim(),
        answer: form.answer.trim(),
        order: faqs.length + 1,
      };
      setFaqs([...faqs, newFAQ]);
      toast({
        title: 'FAQ created',
        description: 'The new FAQ has been added successfully.',
        variant: 'default',
      });
    }
    
    resetForm();
    setShowForm(false);
  };

  // Filter FAQs based on search term
  const filteredFaqs = faqs
    .filter(faq => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        faq.question.toLowerCase().includes(searchLower) ||
        faq.answer.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => a.order - b.order);

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            {editingId ? 'Edit FAQ' : 'Add New FAQ'}
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
            <Label htmlFor="question">Question *</Label>
            <Input 
              id="question" 
              name="question" 
              placeholder="e.g., How do I book an appointment?" 
              value={form.question} 
              onChange={onChange} 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="answer">Answer *</Label>
            <Textarea 
              id="answer" 
              name="answer" 
              rows={6}
              placeholder="Provide a detailed answer to the question..." 
              value={form.answer} 
              onChange={onChange} 
              required 
            />
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
              {editingId ? 'Update FAQ' : 'Add FAQ'}
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
          <h2 className="text-2xl font-bold">Manage FAQs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add, edit, and organize frequently asked questions for your website
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add FAQ
        </Button>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search FAQs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredFaqs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'No FAQs match your search.' : 'No FAQs found. Get started by creating a new FAQ.'}
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add FAQ
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFaqs.map((faq, index) => {
            const originalIndex = faqs.findIndex(f => f.id === faq.id);
            return (
              <div key={faq.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        #{faq.order}
                      </span>
                      <h3 className="font-medium text-lg">{faq.question}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {faq.answer}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMoveUp(originalIndex)}
                        disabled={originalIndex === 0}
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMoveDown(originalIndex)}
                        disabled={originalIndex === faqs.length - 1}
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleEdit(faq)}
                      title="Edit FAQ"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(faq.id)}
                      title="Delete FAQ"
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
            <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this FAQ? This action cannot be undone.
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

