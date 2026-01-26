'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useBusiness } from '@/contexts/BusinessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as const;

type Discount = {
  id: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  days: string[];
  appliesTo: string;
  services: string;
  categories: string;
  active: boolean;
};


export function DailyDiscountsForm() {
  const { toast } = useToast();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const { currentBusiness } = useBusiness();

  // Load discounts from Supabase
  useEffect(() => {
    if (!currentBusiness?.id) return;
    const fetchDiscounts = async () => {
      const { data, error } = await supabase
        .from('marketing_daily_discounts')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setDiscounts(
          data.map((d: any) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            discountType: d.discount_type,
            discountValue: d.discount_value.toString(),
            startDate: d.start_date || '',
            endDate: d.end_date || '',
            startTime: d.start_time || '',
            endTime: d.end_time || '',
            days: d.days || [],
            appliesTo: d.applies_to || '',
            services: d.services || '',
            categories: d.categories || '',
            active: d.active,
          }))
        );
      }
    };
    fetchDiscounts();
  }, [currentBusiness]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState<Omit<Discount, 'id'>>({
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    appliesTo: 'all',
    services: '',
    categories: '',
    active: true,
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value } as Omit<Discount, 'id'>));
  };

  const toggleDay = (day: string, checked: boolean) => {
    setForm((s) => {
      const daysSet = new Set(s.days);
      if (checked) daysSet.add(day);
      else daysSet.delete(day);
      return { ...s, days: Array.from(daysSet) } as Omit<Discount, 'id'>;
    });
  };

  // Helper function to check if a day is selected
  const isDaySelected = (day: string) => form.days.includes(day);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      appliesTo: 'all',
      services: '',
      categories: '',
      active: true,
    });
    setEditingId(null);
  };

  const handleEdit = (discount: Discount) => {
    setForm({
      name: discount.name,
      description: discount.description,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      startDate: discount.startDate,
      endDate: discount.endDate,
      startTime: discount.startTime,
      endTime: discount.endTime,
      days: [...discount.days],
      appliesTo: discount.appliesTo,
      services: discount.services,
      categories: discount.categories,
      active: discount.active,
    });
    setEditingId(discount.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('marketing_daily_discounts')
      .delete()
      .eq('id', id)
      .eq('business_id', currentBusiness?.id || '');
    if (!error) {
      setDiscounts((prev) => prev.filter(d => d.id !== id));
      toast({
        title: 'Discount deleted',
        description: 'The discount has been removed.',
        variant: 'default',
      });
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness?.id) {
      toast({ title: 'Error', description: 'No business selected', variant: 'destructive' });
      return;
    }
    const payload = {
      business_id: currentBusiness.id,
      name: form.name,
      description: form.description,
      discount_type: form.discountType,
      discount_value: parseFloat(form.discountValue),
      start_date: form.startDate || null,
      end_date: form.endDate || null,
      start_time: form.startTime || null,
      end_time: form.endTime || null,
      days: form.days,
      applies_to: form.appliesTo,
      services: form.services,
      categories: form.categories,
      active: form.active,
    };
    if (editingId) {
      // Update existing discount
      const { error } = await supabase
        .from('marketing_daily_discounts')
        .update(payload)
        .eq('id', editingId)
        .eq('business_id', currentBusiness.id);
      if (!error) {
        setDiscounts(discounts.map(d => d.id === editingId ? {
          id: editingId,
          name: payload.name,
          description: payload.description,
          discountType: payload.discount_type,
          discountValue: payload.discount_value.toString(),
          startDate: payload.start_date || '',
          endDate: payload.end_date || '',
          startTime: payload.start_time || '',
          endTime: payload.end_time || '',
          days: payload.days || [],
          appliesTo: payload.applies_to || '',
          services: payload.services || '',
          categories: payload.categories || '',
          active: payload.active,
        } : d));
        toast({
          title: 'Discount updated',
          description: `${form.name} has been updated.`,
          variant: 'default',
        });
      }
    } else {
      // Add new discount
      const { data, error } = await supabase
        .from('marketing_daily_discounts')
        .insert(payload)
        .select();
      if (!error && data) {
        setDiscounts((prev) => [
          {
            id: data[0].id,
            name: payload.name,
            description: payload.description,
            discountType: payload.discount_type,
            discountValue: payload.discount_value.toString(),
            startDate: payload.start_date || '',
            endDate: payload.end_date || '',
            startTime: payload.start_time || '',
            endTime: payload.end_time || '',
            days: payload.days || [],
            appliesTo: payload.applies_to || '',
            services: payload.services || '',
            categories: payload.categories || '',
            active: payload.active,
          },
          ...prev,
        ]);
        toast({
          title: 'Discount created',
          description: `${form.name} has been added.`,
          variant: 'default',
        });
      }
    }
    resetForm();
    setShowForm(false);
  };


  const formatTimeRange = (start: string, end: string) => {
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDays = (days: string[]) => {
    if (!days || days.length === 0) return '';
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && 
        days.includes('Mon') && 
        days.includes('Tue') && 
        days.includes('Wed') && 
        days.includes('Thu') && 
        days.includes('Fri')) {
      return 'Weekdays';
    }
    if (days.length === 2 && 
        days.includes('Sat') && 
        days.includes('Sun')) {
      return 'Weekends';
    }
    return days.join(', ');
  };

  // Filter discounts based on search term
  const filteredDiscounts = discounts.filter(discount => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      discount.name.toLowerCase().includes(searchLower) ||
      discount.description.toLowerCase().includes(searchLower) ||
      discount.discountValue.includes(searchTerm) ||
      `${discount.discountValue}%`.includes(searchTerm) ||
      `$${discount.discountValue}`.includes(searchTerm)
    );
  });

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            {editingId ? 'Edit Discount' : 'Add New Discount'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Happy Hour" value={form.name} onChange={onChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountType">Discount Type</Label>
              <Select 
                value={form.discountType} 
                onValueChange={(v: 'percentage' | 'fixed') => 
                  setForm((s) => ({ ...s, discountType: v } as Omit<Discount, 'id'>))
                }
              >
                <SelectTrigger id="discountType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountValue">Discount Value</Label>
              <div className="relative">
                <Input 
                  id="discountValue" 
                  name="discountValue" 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  placeholder={form.discountType === 'percentage' ? 'e.g. 15' : 'e.g. 10.00'}
                  value={form.discountValue} 
                  onChange={onChange} 
                  required 
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                  {form.discountType === 'percentage' ? '%' : '$'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appliesTo">Applies To</Label>
              <Select value={form.appliesTo} onValueChange={(v) => setForm((s) => ({ ...s, appliesTo: v }))}>
                <SelectTrigger id="appliesTo">
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All services</SelectItem>
                  <SelectItem value="categories">Specific categories</SelectItem>
                  <SelectItem value="services">Specific services</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Active Days</Label>
              <div className="flex flex-wrap gap-3 pt-2">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day}`}
                      checked={isDaySelected(day)}
                      onCheckedChange={(checked) => toggleDay(day, checked as boolean)}
                    />
                    <Label htmlFor={`day-${day}`} className="text-sm font-normal">
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Time Range</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startTime" className="text-xs text-muted-foreground">Start Time</Label>
                  <Input 
                    id="startTime" 
                    name="startTime" 
                    type="time" 
                    value={form.startTime} 
                    onChange={onChange} 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="endTime" className="text-xs text-muted-foreground">End Time</Label>
                  <Input 
                    id="endTime" 
                    name="endTime" 
                    type="time" 
                    value={form.endTime} 
                    onChange={onChange} 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startDate" className="text-xs text-muted-foreground">Start Date</Label>
                  <Input 
                    id="startDate" 
                    name="startDate" 
                    type="date" 
                    value={form.startDate} 
                    onChange={onChange} 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-xs text-muted-foreground">End Date</Label>
                  <Input 
                    id="endDate" 
                    name="endDate" 
                    type="date" 
                    value={form.endDate} 
                    onChange={onChange} 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Describe this discount..." 
                value={form.description} 
                onChange={onChange} 
                rows={3} 
              />
            </div>

            <div className="flex items-center justify-between pt-6">
              <div className="space-y-0.5">
                <Label htmlFor="active" className="text-base">Active</Label>
                <p className="text-sm text-muted-foreground">
                  {form.active ? 'This discount is active' : 'This discount is inactive'}
                </p>
              </div>
              <Switch 
                id="active" 
                checked={form.active} 
                onCheckedChange={(checked) => setForm((s) => ({ ...s, active: checked }))} 
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" className="ml-auto">Save Changes</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Daily Discounts</h2>
        <div className="flex items-center space-x-4">
          <div className="relative w-64">
            <Input
              type="text"
              placeholder="Search discounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Hide Form' : 'Add Discount'}
          </Button>
        </div>
      </div>

      {filteredDiscounts.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'No discounts match your search.' : 'No discounts found. Get started by creating a new discount.'}
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Discount
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Schedule</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Discount</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {discounts.map((discount) => (
                  <tr key={discount.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">
                      <div className="font-medium">{discount.name}</div>
                      {discount.description && (
                        <div className="text-sm text-muted-foreground">{discount.description}</div>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatTime(discount.startTime)} - {formatTime(discount.endTime)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{formatDays(discount.days)}</div>
                    </td>
                    <td className="p-4 align-middle">
                      <span className="font-medium">
                        {discount.discountType === 'percentage' 
                          ? `${discount.discountValue}% Off` 
                          : `$${discount.discountValue} Off`}
                      </span>
                    </td>
                    <td className="p-4 align-middle">
                      <Badge variant={discount.active ? 'default' : 'secondary'}>
                        {discount.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEdit(discount)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(discount.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
