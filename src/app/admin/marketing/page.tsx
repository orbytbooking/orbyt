'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Search, PlusCircle, Mail, Send, Users, Eye, Edit, Trash2, X } from 'lucide-react';
import { useEffect, useState } from "react";
import { DailyDiscountsForm } from "@/components/admin/marketing/DailyDiscountsForm";
import { GiftCardInstances } from "@/components/admin/marketing/GiftCardInstances";
import { SendGiftCard } from "@/components/admin/marketing/SendGiftCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import { useBusiness } from '@/contexts/BusinessContext';
import { useWebsiteConfig } from '@/hooks/useWebsiteConfig';
import Link from "next/link";

type Coupon = {
  id: string;
  name: string;
  code: string;
  description: string;
  discount: string;
  status: 'active' | 'inactive';
};

type GiftCard = {
  id: string;
  name: string;
  description?: string;
  code: string;
  amount: number;
  active: boolean;
  expires_in_months: number;
  auto_generate_codes: boolean;
  created_at: string;
  updated_at: string;
};

type GiftCardInstance = {
  id: string;
  gift_card_id: string;
  unique_code: string;
  original_amount: number;
  current_balance: number;
  purchaser_id?: string;
  recipient_id?: string;
  purchaser_email?: string;
  recipient_email?: string;
  purchase_date: string;
  expires_at: string;
  status: 'active' | 'expired' | 'fully_redeemed' | 'cancelled';
  message?: string;
  gift_card?: GiftCard;
};

type ScriptCategory = 'Cold Calling' | 'Follow-up' | 'SMS';

type Script = {
  id: string;
  title: string;
  category: ScriptCategory;
  content: string;
  updatedAt: string;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  joinDate: string;
  totalBookings: number;
  totalSpent: string;
  status: 'active' | 'inactive';
  lastBooking: string;
};

type EmailCampaign = {
  id: string;
  subject: string;
  body: string;
  template: 'holiday' | 'coupon' | 'advertisement' | 'custom';
  recipients: string[];
  sentAt?: string;
  createdAt: string;
};

// Database replaces localStorage for all marketing data

export default function MarketingPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('coupons');
  const [couponTab, setCouponTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [newGiftCard, setNewGiftCard] = useState({ 
    name: '', 
    code: '', 
    amount: '', 
    description: '',
    expires_in_months: '',
    auto_generate_codes: true 
  });

  // Reset function for gift card form
  const resetGiftCardForm = () => {
    setNewGiftCard({ 
      name: '', 
      code: '', 
      amount: '', 
      description: '',
      expires_in_months: '',
      auto_generate_codes: true 
    });
  };
  const [scripts, setScripts] = useState<Script[]>([]);
  const [newScript, setNewScript] = useState<{ title: string; category: ScriptCategory; content: string }>({
    title: '',
    category: 'Cold Calling',
    content: '',
  });
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [isEditingScript, setIsEditingScript] = useState(false);
  
  // Email Campaigns state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [customEmails, setCustomEmails] = useState<string[]>([]);
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [useCustomEmails, setUseCustomEmails] = useState(false);
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('');
  const [campaignTemplate, setCampaignTemplate] = useState<'holiday' | 'coupon' | 'advertisement' | 'custom'>('custom');
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isEditingCampaign, setIsEditingCampaign] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const { currentBusiness } = useBusiness();

  // Load coupons from Supabase (multitenant)
  useEffect(() => {
    if (!currentBusiness?.id) return;
    const fetchCoupons = async () => {
      const client = supabaseAdmin || supabase;
      if (!client) return;
      
      const { data, error } = await client
        .from('marketing_coupons')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setCoupons(
          data.map((c: any) => ({
            id: c.id,
            name: c.name || '',
            code: c.code,
            description: c.description,
            discount: c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`,
            status: c.active ? 'active' : 'inactive',
          }))
        );
      }
    };
    fetchCoupons();
  }, [currentBusiness]);

  // Load gift cards from API (server-side with service role key)
  useEffect(() => {
    if (!currentBusiness?.id) return;
    const fetchGiftCards = async () => {
      try {
        const response = await fetch(`/api/marketing/gift-cards?business_id=${currentBusiness.id}`);
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch gift cards');
        }
        
        if (result.data) {
          setGiftCards(result.data);
        }
      } catch (error: any) {
        console.error('Error fetching gift cards:', error);
      }
    };
    fetchGiftCards();
  }, [currentBusiness]);

  // Load scripts from database (multitenant)
  useEffect(() => {
    if (!currentBusiness?.id) return;
    const fetchScripts = async () => {
      try {
        const response = await fetch(`/api/marketing/scripts?business_id=${currentBusiness.id}`);
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch scripts');
        }
        
        if (result.data) {
          setScripts(result.data);
        }
      } catch (error: any) {
        console.error('Error fetching scripts:', error);
      }
    };
    fetchScripts();
  }, [currentBusiness]);

  // Load customers from database (multitenant)
  useEffect(() => {
    if (!currentBusiness?.id) return;
    const fetchCustomers = async () => {
      try {
        const response = await fetch(`/api/customers?business_id=${currentBusiness.id}`);
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch customers');
        }
        
        if (result.data) {
          setCustomers(result.data);
        }
      } catch (error: any) {
        console.error('Error fetching customers:', error);
        // Fallback to empty array if API fails
        setCustomers([]);
      }
    };
    fetchCustomers();
  }, [currentBusiness]);

  // Load email campaigns from database (multitenant)
  useEffect(() => {
    if (!currentBusiness?.id) return;
    const fetchCampaigns = async () => {
      try {
        const response = await fetch(`/api/marketing/email-campaigns?business_id=${currentBusiness.id}`);
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch email campaigns');
        }
        
        if (result.data) {
          setCampaigns(result.data);
        }
      } catch (error: any) {
        console.error('Error fetching email campaigns:', error);
      }
    };
    fetchCampaigns();
  }, [currentBusiness]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  
  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         coupon.description.toLowerCase().includes(searchTerm.toLowerCase());
    return coupon.status === couponTab && matchesSearch;
  });

  // Add a new coupon to Supabase
  const addCoupon = async (coupon: Omit<Coupon, 'id'>) => {
    if (!currentBusiness?.id) return;
    const discount_type = coupon.discount.includes('%') ? 'percentage' : 'fixed';
    const discount_value = parseFloat(coupon.discount.replace(/[^\d.]/g, ''));
    const { data, error } = await supabase
      .from('marketing_coupons')
      .insert({
        business_id: currentBusiness.id,
        code: coupon.code,
        description: coupon.description,
        discount_type,
        discount_value,
        active: coupon.status === 'active',
      })
      .select();
    if (!error && data) {
      setCoupons((prev) => [
        {
          id: data[0].id,
          name: data[0].name || '',
          code: data[0].code,
          description: data[0].description,
          discount: data[0].discount_type === 'percentage' ? `${data[0].discount_value}%` : `$${data[0].discount_value}`,
          status: data[0].active ? 'active' : 'inactive',
        },
        ...prev,
      ]);
    }
  };

  const handleEditCoupon = (id: string) => {
    const coupon = coupons.find(c => c.id === id);
    if (coupon) {
      window.location.href = `/admin/marketing/coupons/${id}/edit`;
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    const coupon = coupons.find(c => c.id === id);
    if (!coupon) return;
    if (!confirm(`Are you sure you want to delete coupon "${coupon.code}"?`)) return;
    
    // For DELETE operations, we need the admin client to bypass RLS
    if (!supabaseAdmin) {
      toast({
        title: 'Configuration Error',
        description: 'Service role key not configured. Please contact your administrator.',
        variant: 'destructive',
      });
      return;
    }
    
    const { error } = await supabaseAdmin
      .from('marketing_coupons')
      .delete()
      .eq('id', id)
      .eq('business_id', currentBusiness?.id || '');
    if (!error) {
      setCoupons((prev) => prev.filter(c => c.id !== id));
      toast({
        title: 'Coupon Deleted',
        description: `Coupon "${coupon.code}" has been deleted.`,
      });
    }
  };


  const handleAddGiftCard = async () => {
    const amountNumber = Number(newGiftCard.amount);
    const expiresMonths = Number(newGiftCard.expires_in_months) || 12;
    
    if (!newGiftCard.name || !newGiftCard.code || isNaN(amountNumber) || amountNumber <= 0 || !currentBusiness?.id) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields with valid values',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/marketing/gift-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: currentBusiness.id,
          name: newGiftCard.name.trim(),
          code: newGiftCard.code.trim().toUpperCase(),
          description: newGiftCard.description.trim(),
          amount: amountNumber,
          expires_in_months: expiresMonths,
          auto_generate_codes: newGiftCard.auto_generate_codes,
          active: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create gift card');
      }

      if (result.data) {
        setGiftCards((prev) => [result.data, ...prev]);
        resetGiftCardForm();
        toast({
          title: 'Gift Card Created',
          description: `Gift card "${result.data.name}" has been created successfully.`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create gift card',
        variant: 'destructive',
      });
    }
  };

  const toggleGiftCardActive = async (id: string) => {
    const card = giftCards.find(gc => gc.id === id);
    if (!card || !currentBusiness?.id) return;

    try {
      const response = await fetch('/api/marketing/gift-cards', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          business_id: currentBusiness.id,
          active: !card.active,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update gift card');
      }

      setGiftCards((prev) =>
        prev.map((gc) =>
          gc.id === id ? { ...gc, active: !gc.active } : gc
        )
      );

      toast({
        title: 'Gift Card Updated',
        description: `Gift card "${card.name}" has been ${!card.active ? 'activated' : 'deactivated'}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update gift card',
        variant: 'destructive',
      });
    }
  };

  const deleteGiftCard = async (id: string) => {
    const card = giftCards.find(gc => gc.id === id);
    if (!card || !currentBusiness?.id) return;

    if (!confirm(`Are you sure you want to delete gift card "${card.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/marketing/gift-cards?id=${id}&business_id=${currentBusiness.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete gift card');
      }

      setGiftCards((prev) => prev.filter((gc) => gc.id !== id));
      toast({
        title: 'Gift Card Deleted',
        description: `Gift card "${card.name}" has been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete gift card',
        variant: 'destructive',
      });
    }
  };

  const handleSaveScript = async () => {
    if (!newScript.title.trim() || !newScript.content.trim() || !currentBusiness?.id) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      let response;
      const scriptData = {
        business_id: currentBusiness.id,
        title: newScript.title.trim(),
        category: newScript.category,
        content: newScript.content.trim(),
      };

      if (isEditingScript && selectedScriptId) {
        // Update existing script
        response = await fetch('/api/marketing/scripts', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: selectedScriptId,
            ...scriptData,
          }),
        });
      } else {
        // Create new script
        response = await fetch('/api/marketing/scripts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(scriptData),
        });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save script');
      }

      if (result.data) {
        if (isEditingScript) {
          // Update existing script in state
          setScripts((prev) =>
            prev.map((script) =>
              script.id === selectedScriptId ? result.data : script
            )
          );
          toast({
            title: 'Script Updated',
            description: `Script "${result.data.title}" has been updated successfully.`,
          });
        } else {
          // Add new script to state
          setScripts((prev) => [result.data, ...prev]);
          setSelectedScriptId(result.data.id);
          toast({
            title: 'Script Created',
            description: `Script "${result.data.title}" has been created successfully.`,
          });
        }

        // Reset form
        setNewScript({ title: '', category: 'Cold Calling', content: '' });
        setIsEditingScript(false);
        setSelectedScriptId(null);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save script',
        variant: 'destructive',
      });
    }
  };

  const handleEditScript = (script: Script) => {
    setNewScript({
      title: script.title,
      category: script.category,
      content: script.content,
    });
    setSelectedScriptId(script.id);
    setIsEditingScript(true);
  };

  const handleCancelEdit = () => {
    setNewScript({ title: '', category: 'Cold Calling', content: '' });
    setIsEditingScript(false);
    setSelectedScriptId(null);
  };

  const selectedScript = scripts.find((s) => s.id === selectedScriptId) ?? scripts[0];

  const deleteScript = async (id: string) => {
    if (!currentBusiness?.id) return;
    
    const script = scripts.find(s => s.id === id);
    if (!script) return;
    
    if (!confirm(`Are you sure you want to delete script "${script.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/marketing/scripts?id=${id}&business_id=${currentBusiness.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete script');
      }

      const next = scripts.filter((s) => s.id !== id);
      setScripts(next);
      if (selectedScriptId === id) {
        setSelectedScriptId(next[0]?.id ?? null);
      }
      
      toast({
        title: 'Script Deleted',
        description: `Script "${script.title}" has been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete script',
        variant: 'destructive',
      });
    }
  };

  // Email Campaigns functions
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      customer.id.toLowerCase().includes(customerSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const allCustomersSelected = filteredCustomers.length > 0 && 
    filteredCustomers.every(c => selectedCustomers.has(c.id));

  const handleSelectAll = () => {
    if (allCustomersSelected) {
      setSelectedCustomers(new Set());
    } else {
      const allIds = new Set(filteredCustomers.map(c => c.id));
      setSelectedCustomers(allIds);
    }
  };

  const handleToggleCustomer = (customerId: string) => {
    const next = new Set(selectedCustomers);
    if (next.has(customerId)) {
      next.delete(customerId);
    } else {
      next.add(customerId);
    }
    setSelectedCustomers(next);
  };

  const applyTemplate = (template: 'holiday' | 'coupon' | 'advertisement' | 'custom') => {
    setCampaignTemplate(template);
    
    switch (template) {
      case 'holiday':
        setCampaignSubject('🎉 Special Holiday Offer - Limited Time!');
        setCampaignBody(`Dear Valued Customer,

We hope this message finds you well! As we approach the holiday season, we wanted to extend a special offer to our loyal customers.

🎁 Holiday Special: Get 20% off your next cleaning service!

This is the perfect time to give your home that extra sparkle before the holidays. Book your cleaning service now and use code: HOLIDAY20

Offer valid until December 31st. Don't miss out!

Thank you for being a valued customer.

Best regards,
-The Orbyt Team`);
        break;
      case 'coupon':
        setCampaignSubject('💰 Exclusive Coupon Just For You!');
        setCampaignBody(`Hello [Customer Name],

We appreciate your continued trust in our services!

As a token of our appreciation, here's an exclusive coupon just for you:

✨ Save $25 on your next booking
Use code: SAVE25

This coupon can be applied to any service booking. Simply enter the code at checkout.

We look forward to serving you again soon!

Warm regards,
Orbyt Cleaners`);
        break;
      case 'advertisement':
        setCampaignSubject('🌟 Discover Our Premium Cleaning Services');
        setCampaignBody(`Hi [Customer Name],

We're excited to introduce you to our comprehensive range of cleaning services designed to keep your home spotless!

✨ Our Services Include:
• Deep Cleaning
• Regular Maintenance
• Move-in/Move-out Cleaning
• Commercial Cleaning

Why choose us?
✓ Professional & Trusted Team
✓ Flexible Scheduling
✓ 100% Satisfaction Guarantee
✓ Easy Online Booking

Book your service today and experience the difference!

Visit our website or call us to schedule.

Thank you,
Orbyt Cleaners`);
        break;
      default:
        setCampaignSubject('');
        setCampaignBody('');
    }
  };

  const handleSendCampaign = async () => {
    if (!campaignSubject.trim() || !campaignBody.trim() || !currentBusiness?.id) {
      toast({
        title: 'Error',
        description: 'Please fill in both subject and body',
        variant: 'destructive',
      });
      return;
    }

    if (getAllRecipients().length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one customer or add custom email',
        variant: 'destructive',
      });
      return;
    }

    try {
      let response;
      const campaignData = {
        business_id: currentBusiness.id,
        subject: campaignSubject.trim(),
        body: campaignBody.trim(),
        template: campaignTemplate,
        recipients: getAllRecipients(),
        sent_at: isEditingCampaign ? null : new Date().toISOString(), // Only set sent_at when actually sending
      };

      if (isEditingCampaign && selectedCampaignId) {
        // Update existing campaign (don't send)
        response = await fetch('/api/marketing/email-campaigns', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: selectedCampaignId,
            ...campaignData,
          }),
        });
      } else {
        // Create new campaign and send
        response = await fetch('/api/marketing/email-campaigns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(campaignData),
        });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save campaign');
      }

      if (result.data) {
        if (isEditingCampaign) {
          // Update existing campaign in state
          setCampaigns((prev) =>
            prev.map((campaign) =>
              campaign.id === selectedCampaignId ? result.data : campaign
            )
          );
          toast({
            title: 'Campaign Updated',
            description: `Campaign "${result.data.subject}" has been updated successfully.`,
          });
        } else {
          // Add new campaign to state
          setCampaigns((prev) => [result.data, ...prev]);
          toast({
            title: 'Campaign Sent!',
            description: `Email sent to ${getAllRecipients().length} recipient${getAllRecipients().length !== 1 ? 's' : ''}`,
          });
        }

        // Reset form
        resetCampaignForm();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save campaign',
        variant: 'destructive',
      });
    }
  };

  const handleAddCustomEmail = () => {
    const email = customEmailInput.trim();
    if (email && !customEmails.includes(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCustomEmails([...customEmails, email]);
      setCustomEmailInput('');
    } else if (email) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveCustomEmail = (emailToRemove: string) => {
    setCustomEmails(customEmails.filter(email => email !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomEmail();
    }
  };

  const getAllRecipients = () => {
    const customerEmails = Array.from(selectedCustomers).map(customerId => {
      const customer = customers.find(c => c.id === customerId);
      return customer?.email;
    }).filter(email => email); // Remove undefined

    if (useCustomEmails) {
      return [...customerEmails, ...customEmails];
    }
    return customerEmails;
  };

  const resetCampaignForm = () => {
    setCampaignSubject('');
    setCampaignBody('');
    setCampaignTemplate('custom');
    setSelectedCustomers(new Set());
    setCustomEmails([]);
    setCustomEmailInput('');
    setUseCustomEmails(false);
    setIsEditingCampaign(false);
    setSelectedCampaignId(null);
  };

  const handleEditCampaign = (campaign: EmailCampaign) => {
    setCampaignSubject(campaign.subject);
    setCampaignBody(campaign.body);
    setCampaignTemplate(campaign.template);
    setSelectedCustomers(new Set(campaign.recipients));
    setSelectedCampaignId(campaign.id);
    setIsEditingCampaign(true);
  };

  const handleCancelEditCampaign = () => {
    resetCampaignForm();
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="daily-discounts">Daily Discounts</TabsTrigger>
          <TabsTrigger value="gift-cards">Gift Card Templates</TabsTrigger>
          <TabsTrigger value="send-gift-card">Send Gift Card</TabsTrigger>
          <TabsTrigger value="gift-card-instances">Gift Card Instances</TabsTrigger>
          <TabsTrigger value="scripts">Scripts</TabsTrigger>
          <TabsTrigger value="email-campaigns">Email Campaigns</TabsTrigger>
        </TabsList>
        
        <TabsContent value="coupons">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Coupons</CardTitle>
                  <CardDescription>
                    Create and manage discount coupons for your customers.
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search coupons..."
                      className="pl-9 h-10 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button asChild className="w-full sm:w-auto">
                    <Link href="/admin/marketing/coupons/new" className="inline-flex items-center gap-2 whitespace-nowrap">
                      <PlusCircle className="h-4 w-4" /> Add Coupon
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={couponTab} onValueChange={setCouponTab} className="space-y-4">
                <TabsList>
                  <TabsTrigger value="active">Active coupons</TabsTrigger>
                  <TabsTrigger value="inactive">Inactive coupons</TabsTrigger>
                </TabsList>
                
                <TabsContent value="active" className="mt-0">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCoupons.length > 0 ? (
                          filteredCoupons.map((coupon) => (
                            <TableRow key={coupon.id}>
                              <TableCell className="font-medium">{coupon.name}</TableCell>
                              <TableCell className="font-medium">{coupon.code}</TableCell>
                              <TableCell>{coupon.description}</TableCell>
                              <TableCell>{coupon.discount}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditCoupon(coupon.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 h-8 w-8 p-0 hover:bg-red-50"
                                    onClick={() => handleDeleteCoupon(coupon.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                              No coupons found. Create your first coupon to get started.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                
                <TabsContent value="inactive" className="mt-0">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCoupons.length > 0 ? (
                          filteredCoupons.map((coupon) => (
                            <TableRow key={coupon.id}>
                              <TableCell className="font-medium">{coupon.name}</TableCell>
                              <TableCell className="font-medium">{coupon.code}</TableCell>
                              <TableCell>{coupon.description}</TableCell>
                              <TableCell>{coupon.discount}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditCoupon(coupon.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 h-8 w-8 p-0 hover:bg-red-50"
                                    onClick={() => handleDeleteCoupon(coupon.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                              No inactive coupons found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="daily-discounts">
          <DailyDiscountsForm />
        </TabsContent>
        
        <TabsContent value="send-gift-card">
          <SendGiftCard />
        </TabsContent>
        
        <TabsContent value="gift-card-instances">
          <GiftCardInstances />
        </TabsContent>
        
        <TabsContent value="gift-cards">
          <Card>
            <CardHeader>
              <CardTitle>Gift Cards</CardTitle>
              <CardDescription>
                Create digital gift cards your customers can purchase and redeem on bookings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create gift card form */}
              <div className="grid gap-3 md:grid-cols-[2fr_2fr_1fr_1fr_auto]">
                <Input
                  placeholder="Gift card name (e.g. New customer gift)"
                  value={newGiftCard.name}
                  onChange={(e) => setNewGiftCard((prev) => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Code (e.g. WELCOME50)"
                  value={newGiftCard.code}
                  onChange={(e) => setNewGiftCard((prev) => ({ ...prev, code: e.target.value }))}
                />
                <Input
                  type="number"
                  min={1}
                  placeholder="Amount"
                  value={newGiftCard.amount}
                  onChange={(e) => setNewGiftCard((prev) => ({ ...prev, amount: e.target.value }))}
                  className="md:col-span-1"
                />
                <Input
                  type="number"
                  min={1}
                  max={60}
                  placeholder="Expires (months)"
                  value={newGiftCard.expires_in_months}
                  onChange={(e) => setNewGiftCard((prev) => ({ ...prev, expires_in_months: e.target.value }))}
                  className="md:col-span-1"
                />
                <Button onClick={handleAddGiftCard} className="whitespace-nowrap">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              
              {/* Additional gift card options */}
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Input
                  placeholder="Description (optional)"
                  value={newGiftCard.description}
                  onChange={(e) => setNewGiftCard((prev) => ({ ...prev, description: e.target.value }))}
                />
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-generate"
                    checked={newGiftCard.auto_generate_codes}
                    onCheckedChange={(checked) => setNewGiftCard((prev) => ({ ...prev, auto_generate_codes: checked }))}
                  />
                  <Label htmlFor="auto-generate" className="text-sm">Auto-generate unique codes</Label>
                </div>
              </div>

              {/* Gift cards table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Auto Codes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[140px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {giftCards.length > 0 ? (
                      giftCards.map((card) => (
                        <TableRow key={card.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{card.name}</div>
                              {card.description && (
                                <div className="text-sm text-muted-foreground">{card.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-mono text-sm">{card.code}</div>
                              {card.auto_generate_codes && (
                                <div className="text-xs text-muted-foreground">Auto-generates</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>${card.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {card.expires_in_months} month{card.expires_in_months !== 1 ? 's' : ''}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {card.auto_generate_codes ? 'Yes' : 'No'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                card.active
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {card.active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleGiftCardActive(card.id)}
                            >
                              {card.active ? 'Disable' : 'Enable'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => deleteGiftCard(card.id)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                          No gift cards yet. Create your first one above.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scripts">
          <Card>
            <CardHeader>
              <CardTitle>Scripts</CardTitle>
              <CardDescription>
                Store and share cold‑calling, follow‑up, and SMS scripts so your team stays on message.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* New script form */}
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                  <Input
                    placeholder="Script title (e.g. Cold call – new leads)"
                    value={newScript.title}
                    onChange={(e) => setNewScript((prev) => ({ ...prev, title: e.target.value }))}
                  />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={newScript.category}
                    onChange={(e) =>
                      setNewScript((prev) => ({ ...prev, category: e.target.value as ScriptCategory }))
                    }
                  >
                    <option value="Cold Calling">Cold Calling</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
                <Textarea
                  rows={5}
                  placeholder="Write your script here..."
                  value={newScript.content}
                  onChange={(e) => setNewScript((prev) => ({ ...prev, content: e.target.value }))}
                />
                <div className="flex justify-end">
                  <Button onClick={handleSaveScript}>
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Save Script
                  </Button>
                </div>
              </div>

              {/* Scripts list + preview */}
              <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
                <div className="rounded-md border bg-muted/30 max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Saved scripts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scripts.length > 0 ? (
                        scripts.map((script) => (
                          <TableRow
                            key={script.id}
                            className={`cursor-pointer ${
                              selectedScript && script.id === selectedScript.id ? 'bg-primary/5' : ''
                            }`}
                          >
                            <TableCell>
                              <div
                                className="w-full text-left"
                                onClick={() => setSelectedScriptId(script.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelectedScriptId(script.id);
                                  }
                                }}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <div className="text-sm font-medium">{script.title}</div>
                                      <div className="text-[11px] text-muted-foreground">
                                        {script.category} • {new Date(script.updatedAt).toLocaleDateString()}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteScript(script.id);
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell className="h-20 text-center text-muted-foreground">
                            No scripts yet. Add your first script above.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="rounded-md border p-4 min-h-[200px] bg-white">
                  {selectedScript ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold">{selectedScript.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {selectedScript.category} •{" "}
                            {new Date(selectedScript.updatedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <pre className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                        {selectedScript.content}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select a script on the left to preview it here.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email-campaigns">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
            {/* Main Campaign Editor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Create Email Campaign
                </CardTitle>
                <CardDescription>
                  Send marketing emails to your customers. Select customers, compose your message, and send.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Template Selection */}
                <div className="space-y-2">
                  <Label>Email Template</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={campaignTemplate === 'holiday' ? 'default' : 'outline'}
                      onClick={() => applyTemplate('holiday')}
                      className="w-full"
                    >
                      🎉 Holiday
                    </Button>
                    <Button
                      variant={campaignTemplate === 'coupon' ? 'default' : 'outline'}
                      onClick={() => applyTemplate('coupon')}
                      className="w-full"
                    >
                      💰 Coupon
                    </Button>
                    <Button
                      variant={campaignTemplate === 'advertisement' ? 'default' : 'outline'}
                      onClick={() => applyTemplate('advertisement')}
                      className="w-full"
                    >
                      🌟 Advertisement
                    </Button>
                    <Button
                      variant={campaignTemplate === 'custom' ? 'default' : 'outline'}
                      onClick={() => applyTemplate('custom')}
                      className="w-full"
                    >
                      ✏️ Custom
                    </Button>
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="campaign-subject">Email Subject *</Label>
                  <Input
                    id="campaign-subject"
                    placeholder="Enter email subject..."
                    value={campaignSubject}
                    onChange={(e) => setCampaignSubject(e.target.value)}
                  />
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <Label htmlFor="campaign-body">Email Body *</Label>
                  <Textarea
                    id="campaign-body"
                    rows={12}
                    placeholder="Compose your email message here..."
                    value={campaignBody}
                    onChange={(e) => setCampaignBody(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Use [Customer Name] as a placeholder that will be replaced with each customer's name.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </Button>
                  <Button
                    onClick={handleSendCampaign}
                    disabled={!campaignSubject.trim() || !campaignBody.trim() || getAllRecipients().length === 0}
                    className="flex-1"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send to {getAllRecipients().length} Recipient{getAllRecipients().length !== 1 ? 's' : ''}
                  </Button>
                </div>

                {/* Preview */}
                {showPreview && (
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-sm">Email Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm">
                        <div className="font-semibold mb-2">Subject:</div>
                        <div className="text-muted-foreground">{campaignSubject || '(No subject)'}</div>
                      </div>
                      <div className="text-sm">
                        <div className="font-semibold mb-2">Body:</div>
                        <div className="text-muted-foreground whitespace-pre-wrap">{campaignBody || '(No body)'}</div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Customer Selection Sidebar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Recipients ({getAllRecipients().length} total)
                </CardTitle>
                <CardDescription>
                  Choose customers and add custom emails to receive this campaign.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    className="pl-9"
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  />
                </div>

                {/* Custom Email Toggle */}
                <div className="flex items-center space-x-2 p-2 rounded-md border bg-muted/50">
                  <Switch
                    id="use-custom-emails"
                    checked={useCustomEmails}
                    onCheckedChange={setUseCustomEmails}
                  />
                  <Label
                    htmlFor="use-custom-emails"
                    className="text-sm font-medium cursor-pointer flex-1"
                  >
                    Add Custom Emails
                  </Label>
                </div>

                {/* Custom Email Input */}
                {useCustomEmails && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter custom email..."
                        value={customEmailInput}
                        onChange={(e) => setCustomEmailInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={handleAddCustomEmail}
                        disabled={!customEmailInput.trim()}
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Custom Email List */}
                    {customEmails.length > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {customEmails.map((email, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                          >
                            <span className="truncate">{email}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCustomEmail(email)}
                              className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Select All */}
                <div className="flex items-center space-x-2 p-2 rounded-md border bg-muted/50">
                  <Checkbox
                    id="select-all"
                    checked={allCustomersSelected}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label
                    htmlFor="select-all"
                    className="text-sm font-medium cursor-pointer flex-1"
                  >
                    Select All ({filteredCustomers.length} customers)
                  </Label>
                </div>

                {/* Customer List */}
                <div className="border rounded-md max-h-[500px] overflow-y-auto">
                  {filteredCustomers.length > 0 ? (
                    <div className="divide-y">
                      {filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          className="flex items-center space-x-3 p-3 hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={`customer-${customer.id}`}
                            checked={selectedCustomers.has(customer.id)}
                            onCheckedChange={() => handleToggleCustomer(customer.id)}
                          />
                          <Label
                            htmlFor={`customer-${customer.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="text-sm font-medium">{customer.name}</div>
                            <div className="text-xs text-muted-foreground">{customer.email}</div>
                            <div className="text-xs text-muted-foreground">
                              {customer.totalBookings} booking{customer.totalBookings !== 1 ? 's' : ''} • {customer.status}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No customers found</p>
                      <p className="text-xs mt-1">Add customers in the Customers section first</p>
                    </div>
                  )}
                </div>

                {/* Stats */}
                {(customers.length > 0 || customEmails.length > 0) && (
                  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                    {customers.length > 0 && (
                      <>
                        <div>Total customers: {customers.length}</div>
                        <div>Active customers: {customers.filter(c => c.status === 'active').length}</div>
                        <div>Selected customers: {selectedCustomers.size}</div>
                      </>
                    )}
                    {customEmails.length > 0 && (
                      <div>Custom emails: {customEmails.length}</div>
                    )}
                    <div className="font-medium">Total recipients: {getAllRecipients().length}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Past Campaigns */}
          {campaigns.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Past Campaigns</CardTitle>
                <CardDescription>
                  View your previously sent email campaigns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Sent Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">{campaign.subject}</TableCell>
                          <TableCell>
                            <span className="capitalize">{campaign.template}</span>
                          </TableCell>
                          <TableCell>{campaign.recipients.length} customer{campaign.recipients.length !== 1 ? 's' : ''}</TableCell>
                          <TableCell>
                            {campaign.sentAt ? new Date(campaign.sentAt).toLocaleString() : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
