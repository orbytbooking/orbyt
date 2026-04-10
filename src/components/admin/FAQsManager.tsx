'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
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
import { useBusiness } from '@/contexts/BusinessContext';
import { withTenantBusiness } from '@/lib/adminTenantFetch';

export type FAQ = {
  id: string;
  question: string;
  answer: string;
  order: number;
};

const SAMPLE_FAQS: Omit<FAQ, 'id'>[] = [
  {
    question: 'How do I book an appointment?',
    answer:
      "You can book an appointment by clicking the 'Book Now' button on our homepage and following the simple booking process.",
    order: 1,
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards, PayPal, and in some cases, cash on delivery. All online payments are processed securely.',
    order: 2,
  },
  {
    question: 'Can I reschedule or cancel my appointment?',
    answer:
      'Yes, you can reschedule or cancel your appointment up to 24 hours before your scheduled time through your account dashboard.',
    order: 3,
  },
  {
    question: 'What are your working hours?',
    answer:
      'Our customer support is available 24/7. Service hours vary by location and service type, which you can see during the booking process.',
    order: 4,
  },
  {
    question: 'Do you offer recurring cleaning services?',
    answer:
      'Yes, we offer weekly, bi-weekly, and monthly cleaning services. You can set up a recurring schedule during booking.',
    order: 5,
  },
];

export function FAQsManager() {
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id ?? null;

  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [insertingSamples, setInsertingSamples] = useState(false);

  const [form, setForm] = useState<Omit<FAQ, 'id' | 'order'>>({
    question: '',
    answer: '',
  });

  const loadFaqs = useCallback(async () => {
    if (!businessId) {
      setFaqs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/faqs', withTenantBusiness(businessId));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const list = Array.isArray(data.faqs) ? data.faqs : [];
      setFaqs(
        list.map((f: { id: string; question: string; answer: string; order?: number }, i: number) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
          order: typeof f.order === 'number' ? f.order : i,
        }))
      );
    } catch (e) {
      console.error('FAQs load:', e);
      toast({
        title: 'Could not load FAQs',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void loadFaqs();
  }, [loadFaqs]);

  const persistOrder = async (ordered: FAQ[]) => {
    if (!businessId || ordered.length === 0) return;
    setSavingOrder(true);
    try {
      const res = await fetch(
        '/api/admin/faqs',
        withTenantBusiness(businessId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds: ordered.map((f) => f.id) }),
        })
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const list = Array.isArray(data.faqs) ? data.faqs : [];
      setFaqs(
        list.map((f: { id: string; question: string; answer: string; order?: number }, i: number) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
          order: typeof f.order === 'number' ? f.order : i,
        }))
      );
    } catch (e) {
      console.error('FAQs reorder:', e);
      toast({
        title: 'Could not save order',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
      void loadFaqs();
    } finally {
      setSavingOrder(false);
    }
  };

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

  const confirmDelete = async () => {
    if (!deleteId || !businessId) return;
    try {
      const res = await fetch(
        `/api/admin/faqs/${encodeURIComponent(deleteId)}`,
        withTenantBusiness(businessId, { method: 'DELETE' })
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setFaqs((prev) => prev.filter((f) => f.id !== deleteId));
      toast({
        title: 'FAQ deleted',
        description: 'The FAQ has been removed.',
        variant: 'default',
      });
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0 || !businessId) return;
    const sorted = [...faqs].sort((a, b) => a.order - b.order);
    const newFaqs = [...sorted];
    [newFaqs[index - 1], newFaqs[index]] = [newFaqs[index], newFaqs[index - 1]];
    newFaqs.forEach((faq, i) => {
      faq.order = i + 1;
    });
    setFaqs(newFaqs);
    await persistOrder(newFaqs);
  };

  const handleMoveDown = async (index: number) => {
    if (!businessId) return;
    const sorted = [...faqs].sort((a, b) => a.order - b.order);
    if (index === sorted.length - 1) return;
    const newFaqs = [...sorted];
    [newFaqs[index], newFaqs[index + 1]] = [newFaqs[index + 1], newFaqs[index]];
    newFaqs.forEach((faq, i) => {
      faq.order = i + 1;
    });
    setFaqs(newFaqs);
    await persistOrder(newFaqs);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    if (!form.question.trim() || !form.answer.trim()) {
      toast({
        title: 'Validation error',
        description: 'Please fill in both question and answer fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingId) {
        const res = await fetch(
          `/api/admin/faqs/${encodeURIComponent(editingId)}`,
          withTenantBusiness(businessId, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: form.question.trim(),
              answer: form.answer.trim(),
            }),
          })
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        const f = data.faq as { id: string; question: string; answer: string; order: number };
        setFaqs((prev) =>
          prev.map((x) =>
            x.id === f.id ? { id: f.id, question: f.question, answer: f.answer, order: f.order } : x
          )
        );
        toast({
          title: 'FAQ updated',
          description: 'The FAQ has been updated successfully.',
          variant: 'default',
        });
      } else {
        const res = await fetch(
          '/api/admin/faqs',
          withTenantBusiness(businessId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: form.question.trim(),
              answer: form.answer.trim(),
            }),
          })
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        const f = data.faq as { id: string; question: string; answer: string; order: number };
        setFaqs((prev) => [...prev, { id: f.id, question: f.question, answer: f.answer, order: f.order }]);
        toast({
          title: 'FAQ created',
          description: 'The new FAQ has been added successfully.',
          variant: 'default',
        });
      }
      resetForm();
      setShowForm(false);
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleInsertSamples = async () => {
    if (!businessId) return;
    setInsertingSamples(true);
    try {
      for (const s of SAMPLE_FAQS) {
        const res = await fetch(
          '/api/admin/faqs',
          withTenantBusiness(businessId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: s.question, answer: s.answer }),
          })
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
      }
      await loadFaqs();
      toast({
        title: 'Sample FAQs added',
        description: 'You can edit or reorder them anytime.',
        variant: 'default',
      });
    } catch (e) {
      toast({
        title: 'Could not add samples',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setInsertingSamples(false);
    }
  };

  const filteredFaqs = faqs
    .filter((faq) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        faq.question.toLowerCase().includes(searchLower) ||
        faq.answer.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => a.order - b.order);

  const sortedFaqs = [...faqs].sort((a, b) => a.order - b.order);

  if (!businessId) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Select a business workspace to manage FAQs.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading FAQs…
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{editingId ? 'Edit FAQ' : 'Add New FAQ'}</h3>
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
            <Button type="submit">{editingId ? 'Update FAQ' : 'Add FAQ'}</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Manage FAQs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Stored per business in the database (<code className="text-xs">orbyt_faqs</code>). Shown on
            your live website FAQ section when present.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {faqs.length === 0 && (
            <Button variant="outline" onClick={() => void handleInsertSamples()} disabled={insertingSamples}>
              {insertingSamples ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Insert sample FAQs
            </Button>
          )}
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add FAQ
          </Button>
        </div>
      </div>

      {savingOrder && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving order…
        </p>
      )}

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
            {searchTerm ? 'No FAQs match your search.' : 'No FAQs yet. Add your own or insert samples.'}
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {!searchTerm && (
              <Button variant="outline" onClick={() => void handleInsertSamples()} disabled={insertingSamples}>
                Insert sample FAQs
              </Button>
            )}
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add FAQ
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFaqs.map((faq) => {
            const originalIndex = sortedFaqs.findIndex((f) => f.id === faq.id);
            return (
              <div key={faq.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">#{faq.order}</span>
                      <h3 className="font-medium text-lg">{faq.question}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{faq.answer}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => void handleMoveUp(originalIndex)}
                        disabled={originalIndex === 0 || savingOrder}
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => void handleMoveDown(originalIndex)}
                        disabled={originalIndex === sortedFaqs.length - 1 || savingOrder}
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
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(faq.id)}
                      title="Delete"
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
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
