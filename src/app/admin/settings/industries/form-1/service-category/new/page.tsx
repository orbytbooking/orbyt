"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info, Loader2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, Link as LinkIcon, Plus, Trash2, AlertCircle, ChevronDown, Pencil } from "lucide-react";
import { serviceCategoriesService, ServiceCategory } from "@/lib/serviceCategories";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

// Simple Rich Text Editor for popup content
function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = value || "";
  }, [value]);
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };
  const updateContent = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };
  return (
    <div className="border rounded-lg overflow-hidden bg-white dark:bg-background">
      <div className="border-b bg-muted/50 p-2 flex items-center gap-2 flex-wrap">
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("bold")} className="h-8 w-8 p-0" title="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("italic")} className="h-8 w-8 p-0" title="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("underline")} className="h-8 w-8 p-0" title="Underline">
          <Underline className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("justifyLeft")} className="h-8 w-8 p-0" title="Align Left">
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("justifyCenter")} className="h-8 w-8 p-0" title="Align Center">
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("justifyRight")} className="h-8 w-8 p-0" title="Align Right">
          <AlignRight className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("insertUnorderedList")} className="h-8 w-8 p-0" title="Bullet List">
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => { const url = prompt("Enter URL:"); if (url) execCommand("createLink", url); }} className="h-8 w-8 p-0" title="Insert Link">
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>
      <div ref={editorRef} contentEditable onInput={updateContent} className="min-h-[200px] p-4 focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ whiteSpace: "pre-wrap" }} />
    </div>
  );
}

export default function ServiceCategoryNewPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const industry = params.get("industry") || "Industry";
  const industryIdFromUrl = params.get("industryId");
  const editId = params.get("editId") || null;

  const [loading, setLoading] = useState(false);
  const [industryId, setIndustryId] = useState<string | null>(industryIdFromUrl);

  const [form, setForm] = useState({
    name: "",
    description: "",
    showExplanationIconOnForm: false,
    explanationTooltipText: "",
    enablePopupOnSelection: false,
    popupContent: "",
    excludedProviders: [] as string[],
    serviceCategoryFrequency: false,
    selectedFrequencies: [] as string[],
    variables: {} as { [key: string]: string[] },
    excludeParameters: {
      pets: false,
      smoking: false,
      deepCleaning: false
    },
    extras: [] as number[],
    selectedExcludeParameters: [] as string[],
    display: "customer_frontend_backend_admin",
    displayServiceLengthCustomer: "admin_only",
    enableServiceLengthTooltipCustomer: false,
    serviceLengthTooltipTextCustomer: "",
    displayServiceLengthProvider: false,
    enableServiceLengthTooltipProvider: false,
    serviceLengthTooltipTextProvider: "",
    canCustomerEditService: false,
    serviceFeeEnabled: false,
    expeditedCharge: {
      enabled: false,
      amount: "",
      displayText: "",
      currency: "$",
      textToDisplayEnabled: false
    },
    cancellationFee: {
      enabled: false,
      type: 'single' as 'single' | 'multiple',
      fee: "",
      currency: "$",
      payProvider: false,
      providerFee: "",
      providerCurrency: "$",
      chargeTiming: 'beforeDay' as 'beforeDay' | 'hoursBefore',
      beforeDayTime: "",
      hoursBefore: "",
      multipleFees: [] as Array<{
        id: string;
        fee: string;
        currency: string;
        chargeTiming: 'beforeDay' | 'hoursBefore';
        beforeDayTime: string;
        daysBefore?: string;
        hoursBefore: string;
        minutesBefore?: string;
        payProvider: boolean;
        providerFee: string;
        providerCurrency: string;
      }>
    },
    hourlyService: {
      enabled: false,
      price: "",
      currency: "$",
      priceCalculationType: 'customTime' as 'customTime' | 'pricingParametersTime',
      countExtrasSeparately: false
    },
    serviceCategoryPrice: {
      enabled: false,
      price: "",
      currency: "$"
    },
    serviceCategoryTime: {
      enabled: false,
      hours: "0",
      minutes: "0"
    },
    minimumPrice: {
      enabled: false,
      checkAmountType: 'discounted' as 'discounted' | 'final',
      price: "",
      checkRecurringSchedule: false,
      textToDisplay: false,
      noticeText: ""
    },
    overrideProviderPay: {
      enabled: false,
      amount: "",
      payType: "hourly" as "fixed" | "hourly"
    },
    extrasConfig: {
      tip: {
        enabled: false,
        saveTo: 'all' as 'all' | 'first',
        display: 'customer_frontend_backend_admin' as 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only'
      },
      parking: {
        enabled: false,
        saveTo: 'all' as 'all' | 'first',
        display: 'customer_frontend_backend_admin' as 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only'
      }
    }
  });

  // Fetch pricing parameters and extras from localStorage
  const [pricingParameters, setPricingParameters] = useState<{ [key: string]: any[] }>({});
  const [availableExtras, setAvailableExtras] = useState<Array<{ id: number; name: string }>>([]);
  const [excludeParameters, setExcludeParameters] = useState<any[]>([]);
  const [frequencies, setFrequencies] = useState<string[]>([]);

  // Fetch providers from localStorage
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);

  // Error state for real-time validation
  const [errors, setErrors] = useState<{
    cancellationFee?: string;
    cancellationMultipleFeesEmpty?: string;
    providerFee?: string;
    beforeDayTime?: string;
    hoursBefore?: string;
    expeditedCharge?: string;
    hourlyService?: string;
    serviceCategoryPrice?: string;
    serviceCategoryTime?: string;
    minimumPrice?: string;
    overrideProviderPay?: string;
  }>({});

  // Add cancellation fee modal (for multiple fees)
  const [addCancellationFeeModalOpen, setAddCancellationFeeModalOpen] = useState(false);
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [addFeeModalError, setAddFeeModalError] = useState<string | null>(null);
  const [newCancellationFee, setNewCancellationFee] = useState({
    chargeTiming: 'beforeDay' as 'beforeDay' | 'hoursBefore',
    beforeDayTime: '01:00',
    daysBefore: '1',
    hoursBefore: '1',
    minutesBefore: '00',
    fee: '',
    currency: '$',
    payProvider: false,
    providerFee: '',
    providerCurrency: '$'
  });

  // Format 24h time "HH:mm" to "01:00 AM"
  const formatTimeToAmPm = (time24: string) => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    if (isNaN(h)) return time24;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${period}`;
  };

  const getFeeTimeDescription = (entry: { chargeTiming: string; beforeDayTime: string; daysBefore?: string; hoursBefore: string; minutesBefore?: string }) => {
    if (entry.chargeTiming === 'beforeDay') {
      const time = formatTimeToAmPm(entry.beforeDayTime);
      const days = entry.daysBefore || '1';
      return `If they cancel after ${time} the ${days} day(s) before the job.`;
    }
    const h = entry.hoursBefore || '0';
    const m = entry.minutesBefore || '00';
    return `If they cancel ${h} hour${h !== '1' ? 's' : ''} ${m} minutes before the job.`;
  };

  const openAddFeeModal = () => {
    setEditingFeeId(null);
    setNewCancellationFee({
      chargeTiming: 'beforeDay',
      beforeDayTime: '01:00',
      daysBefore: '1',
      hoursBefore: '1',
      minutesBefore: '00',
      fee: '',
      currency: '$',
      payProvider: false,
      providerFee: '',
      providerCurrency: '$'
    });
    setAddFeeModalError(null);
    setAddCancellationFeeModalOpen(true);
  };

  const openEditFeeModal = (entry: typeof form.cancellationFee.multipleFees[0]) => {
    setEditingFeeId(entry.id);
    setNewCancellationFee({
      chargeTiming: entry.chargeTiming,
      beforeDayTime: entry.beforeDayTime || '01:00',
      daysBefore: entry.daysBefore || '1',
      hoursBefore: entry.hoursBefore || '1',
      minutesBefore: entry.minutesBefore || '00',
      fee: entry.fee,
      currency: entry.currency,
      payProvider: entry.payProvider,
      providerFee: entry.providerFee,
      providerCurrency: entry.providerCurrency
    });
    setAddFeeModalError(null);
    setAddCancellationFeeModalOpen(true);
  };

  const addFeeFromModal = () => {
    if (!newCancellationFee.fee.trim()) {
      setAddFeeModalError('Please enter a valid cancellation fees.');
      return;
    }
    setAddFeeModalError(null);
    if (editingFeeId) {
      setForm(p => ({
        ...p,
        cancellationFee: {
          ...p.cancellationFee,
          multipleFees: p.cancellationFee.multipleFees.map(f =>
            f.id === editingFeeId
              ? {
                  ...f,
                  fee: newCancellationFee.fee.trim(),
                  currency: newCancellationFee.currency,
                  chargeTiming: newCancellationFee.chargeTiming,
                  beforeDayTime: newCancellationFee.chargeTiming === 'beforeDay' ? newCancellationFee.beforeDayTime : '',
                  daysBefore: newCancellationFee.chargeTiming === 'beforeDay' ? newCancellationFee.daysBefore : undefined,
                  hoursBefore: newCancellationFee.chargeTiming === 'hoursBefore' ? newCancellationFee.hoursBefore : '',
                  minutesBefore: newCancellationFee.chargeTiming === 'hoursBefore' ? newCancellationFee.minutesBefore : undefined,
                  payProvider: newCancellationFee.payProvider,
                  providerFee: newCancellationFee.providerFee,
                  providerCurrency: newCancellationFee.providerCurrency
                }
              : f
          )
        }
      }));
    } else {
      setForm(p => ({
        ...p,
        cancellationFee: {
          ...p.cancellationFee,
          multipleFees: [
            ...p.cancellationFee.multipleFees,
            {
              id: `fee-${Date.now()}`,
              fee: newCancellationFee.fee.trim(),
              currency: newCancellationFee.currency,
              chargeTiming: newCancellationFee.chargeTiming,
              beforeDayTime: newCancellationFee.chargeTiming === 'beforeDay' ? newCancellationFee.beforeDayTime : '',
              daysBefore: newCancellationFee.chargeTiming === 'beforeDay' ? newCancellationFee.daysBefore : undefined,
              hoursBefore: newCancellationFee.chargeTiming === 'hoursBefore' ? newCancellationFee.hoursBefore : '',
              minutesBefore: newCancellationFee.chargeTiming === 'hoursBefore' ? newCancellationFee.minutesBefore : undefined,
              payProvider: newCancellationFee.payProvider,
              providerFee: newCancellationFee.providerFee,
              providerCurrency: newCancellationFee.providerCurrency
            }
          ]
        }
      }));
      setErrors(prev => ({ ...prev, cancellationMultipleFeesEmpty: undefined }));
    }
    setEditingFeeId(null);
    setAddCancellationFeeModalOpen(false);
  };

  useEffect(() => {
    if (editId) {
      loadCategory();
    }
  }, [editId]);

  const loadCategory = async () => {
    try {
      setLoading(true);
      const category = await serviceCategoriesService.getServiceCategoryById(editId!);
      if (category) {
        console.log('=== LOAD CATEGORY DEBUG ===');
        console.log('Category extras from DB:', category.extras);
        console.log('Type of category.extras:', typeof category.extras);
        console.log('Is array?', Array.isArray(category.extras));
        if (Array.isArray(category.extras)) {
          console.log('Extras types:', category.extras.map(e => typeof e));
          console.log('Extras values:', category.extras);
        }
        
        // Ensure extras are always numbers for consistency
        const normalizedExtras = Array.isArray(category.extras) 
          ? category.extras.map(e => typeof e === 'string' ? parseInt(e, 10) : e).filter(e => !isNaN(e))
          : [];
        
        console.log('Normalized extras:', normalizedExtras);
        
        setForm({
          name: category.name,
          description: category.description || "",
          showExplanationIconOnForm: category.show_explanation_icon_on_form ?? false,
          explanationTooltipText: category.explanation_tooltip_text || "",
          enablePopupOnSelection: category.enable_popup_on_selection ?? false,
          popupContent: category.popup_content || "",
          enableServiceLengthTooltipCustomer: category.enable_service_length_tooltip_customer ?? false,
          serviceLengthTooltipTextCustomer: category.service_length_tooltip_text_customer || "",
          enableServiceLengthTooltipProvider: category.enable_service_length_tooltip_provider ?? false,
          serviceLengthTooltipTextProvider: category.service_length_tooltip_text_provider || "",
          excludedProviders: category.excluded_providers || [],
          serviceCategoryFrequency: category.service_category_frequency || false,
          selectedFrequencies: category.selected_frequencies || [],
          variables: category.variables || {},
          excludeParameters: category.exclude_parameters || {
            pets: false,
            smoking: false,
            deepCleaning: false
          },
          extras: normalizedExtras,
          selectedExcludeParameters: category.selected_exclude_parameters || [],
          display: category.display || "customer_frontend_backend_admin",
          displayServiceLengthCustomer: category.display_service_length_customer || "admin_only",
          displayServiceLengthProvider: category.display_service_length_provider || false,
          canCustomerEditService: category.can_customer_edit_service || false,
          serviceFeeEnabled: category.service_fee_enabled || false,
          expeditedCharge: (() => {
            const ec = category.expedited_charge || { enabled: false, amount: "", displayText: "", currency: "$" };
            return {
              ...ec,
              textToDisplayEnabled: !!(ec.displayText && ec.displayText.trim())
            };
          })(),
          cancellationFee: (() => {
            const cf = category.cancellation_fee || {
              enabled: false,
              type: 'single' as const,
              fee: "",
              currency: "$",
              payProvider: false,
              providerFee: "",
              providerCurrency: "$",
              chargeTiming: 'beforeDay' as const,
              beforeDayTime: "",
              hoursBefore: ""
            };
            const multipleFees = (category.cancellation_fee as any)?.multiple_fees ?? [];
            return {
              ...cf,
              multipleFees: Array.isArray(multipleFees) ? multipleFees.map((f: any, i: number) => ({
                id: f.id ?? `fee-${i}-${Date.now()}`,
                fee: f.fee ?? "",
                currency: f.currency ?? "$",
                chargeTiming: f.chargeTiming ?? f.charge_timing ?? 'beforeDay',
                beforeDayTime: f.beforeDayTime ?? f.before_day_time ?? "",
                daysBefore: f.daysBefore ?? f.days_before,
                hoursBefore: f.hoursBefore ?? f.hours_before ?? "",
                minutesBefore: f.minutesBefore ?? f.minutes_before,
                payProvider: f.payProvider ?? f.pay_provider ?? false,
                providerFee: f.providerFee ?? f.provider_fee ?? "",
                providerCurrency: f.providerCurrency ?? f.provider_currency ?? "$"
              })) : []
            };
          })(),
          hourlyService: category.hourly_service || {
            enabled: false,
            price: "",
            currency: "$",
            priceCalculationType: 'customTime',
            countExtrasSeparately: false
          },
          serviceCategoryPrice: category.service_category_price || {
            enabled: false,
            price: "",
            currency: "$"
          },
          serviceCategoryTime: category.service_category_time || {
            enabled: false,
            hours: "0",
            minutes: "0"
          },
          minimumPrice: category.minimum_price || {
            enabled: false,
            checkAmountType: 'discounted',
            price: "",
            checkRecurringSchedule: false,
            textToDisplay: false,
            noticeText: ""
          },
          overrideProviderPay: (() => {
            const o = category.override_provider_pay as { enabled?: boolean; amount?: string; currency?: string; payType?: "fixed" | "hourly" } | undefined;
            if (!o) return { enabled: false, amount: "", payType: "hourly" as "fixed" | "hourly" };
            const payType = o.payType ?? (o.currency === "$" ? "fixed" : "hourly");
            return { enabled: !!o.enabled, amount: o.amount ?? "", payType };
          })(),
          extrasConfig: category.extras_config || {
            tip: {
              enabled: false,
              saveTo: 'all',
              display: 'customer_frontend_backend_admin'
            },
            parking: {
              enabled: false,
              saveTo: 'all',
              display: 'customer_frontend_backend_admin'
            }
          }
        });
        const cf = category.cancellation_fee as any;
        if (cf?.type === 'multiple' && (!Array.isArray(cf?.multiple_fees) || cf.multiple_fees.length === 0)) {
          setErrors(prev => ({ ...prev, cancellationMultipleFeesEmpty: "It should not remain empty, please add at least one cancellation fee." }));
        }
      }
    } catch (error) {
      console.error('Error loading category:', error);
      toast({
        title: "Error",
        description: "Failed to load service category.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load pricing parameters from database
  useEffect(() => {
    const fetchPricingParameters = async () => {
      if (!industryId) return;
      
      try {
        console.log('Fetching pricing parameters for industryId:', industryId);
        const response = await fetch(`/api/pricing-parameters?industryId=${encodeURIComponent(industryId)}`);
        console.log('Pricing parameters API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Pricing parameters API response data:', data);
          
          if (data.pricingParameters && Array.isArray(data.pricingParameters)) {
            console.log('Setting available pricing parameters:', data.pricingParameters);
            // Group pricing parameters by variable_category for display
            const groupedParams: { [key: string]: any[] } = {};
            data.pricingParameters.forEach((param: any) => {
              const category = param.variable_category || 'Other';
              if (!groupedParams[category]) {
                groupedParams[category] = [];
              }
              groupedParams[category].push({
                id: param.id,
                name: param.name,
                category: param.variable_category
              });
            });
            setPricingParameters(groupedParams);
          } else {
            console.log('No pricing parameters array in response');
            setPricingParameters({});
          }
        } else {
          console.error('API response not ok:', response.status, response.statusText);
          setPricingParameters({});
        }
      } catch (error) {
        console.error('Error fetching pricing parameters:', error);
        setPricingParameters({});
      }
    };
    
    if (industryId) {
      fetchPricingParameters();
    }
  }, [industryId]);

  // Fetch industryId if not in URL
  useEffect(() => {
    const fetchIndustryId = async () => {
      try {
        // Get current business ID from localStorage
        const currentBusinessId = localStorage.getItem('currentBusinessId');
        
        let response;
        if (currentBusinessId) {
          response = await fetch(`/api/industries?business_id=${currentBusinessId}`);
        } else {
          response = await fetch('/api/industries');
        }
        
        const data = await response.json();
        const currentIndustry = data.industries?.find((ind: any) => ind.name === industry);
        
        if (currentIndustry) {
          setIndustryId(currentIndustry.id);
        }
      } catch (error) {
        console.error('Error fetching industry ID:', error);
      }
    };
    
    if (!industryIdFromUrl && industry) {
      fetchIndustryId();
    }
  }, [industry, industryIdFromUrl]);

  // Load extras from database
  useEffect(() => {
    const fetchExtras = async () => {
      if (!industryId) return;
      
      try {
        console.log('Fetching extras for industryId:', industryId);
        const response = await fetch(`/api/extras?industryId=${encodeURIComponent(industryId)}`);
        console.log('Extras API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Extras API response data:', data);
          
          if (data.extras && Array.isArray(data.extras)) {
            console.log('Setting available extras:', data.extras);
            setAvailableExtras(data.extras.map((e: any) => ({ id: e.id, name: e.name })));
          } else {
            console.log('No extras array in response');
          }
        } else {
          console.error('API response not ok:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching extras:', error);
      }
    };
    
    if (industryId) {
      fetchExtras();
    }
  }, [industryId]);

  // Load frequencies from database
  useEffect(() => {
    const fetchFrequencies = async () => {
      if (!industryId) return;
      
      try {
        console.log('Fetching frequencies for industryId:', industryId);
        const response = await fetch(`/api/industry-frequency?industryId=${encodeURIComponent(industryId)}&includeAll=true`);
        console.log('Frequencies API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Frequencies API response data:', data);
          
          if (data.frequencies && Array.isArray(data.frequencies)) {
            console.log('Setting available frequencies:', data.frequencies);
            // Extract frequency names from the database response
            const frequencyNames = data.frequencies.map((f: any) => f.name || f.occurrence_time).filter(Boolean);
            setFrequencies(frequencyNames);
          } else {
            console.log('No frequencies array in response');
            setFrequencies([]);
          }
        } else {
          console.error('API response not ok:', response.status, response.statusText);
          setFrequencies([]);
        }
      } catch (error) {
        console.error('Error fetching frequencies:', error);
        setFrequencies([]);
      }
    };
    
    if (industryId) {
      fetchFrequencies();
    }
  }, [industryId]);

  // Load exclude parameters from database
  useEffect(() => {
    const fetchExcludeParameters = async () => {
      if (!industryId) return;
      
      try {
        console.log('Fetching exclude parameters for industryId:', industryId);
        const response = await fetch(`/api/exclude-parameters?industryId=${encodeURIComponent(industryId)}`);
        console.log('Exclude parameters API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Exclude parameters API response data:', data);
          
          if (data.excludeParameters && Array.isArray(data.excludeParameters)) {
            console.log('Setting available exclude parameters:', data.excludeParameters);
            setExcludeParameters(data.excludeParameters);
          } else {
            console.log('No exclude parameters array in response');
            setExcludeParameters([]);
          }
        } else {
          console.error('API response not ok:', response.status, response.statusText);
          setExcludeParameters([]);
        }
      } catch (error) {
        console.error('Error fetching exclude parameters:', error);
        setExcludeParameters([]);
      }
    };
    
    if (industryId) {
      fetchExcludeParameters();
    }
  }, [industryId]);

  // Fetch providers from database
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .single();
        
        if (!business) return;
        
        console.log('Fetching providers for businessId:', business.id);
        const response = await fetch(`/api/admin/providers?businessId=${encodeURIComponent(business.id)}`);
        console.log('Providers API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Providers API response data:', data);
          
          if (data.providers && Array.isArray(data.providers)) {
            console.log('Setting available providers:', data.providers);
            setProviders(data.providers.map((p: any) => ({ 
              id: p.id, 
              name: p.name 
            })));
          } else {
            console.log('No providers array in response');
            setProviders([]);
          }
        } else {
          console.error('API response not ok:', response.status, response.statusText);
          setProviders([]);
        }
      } catch (error) {
        console.error('Error fetching providers:', error);
        setProviders([]);
      }
    };
    
    fetchProviders();
  }, []);


  // Real-time validation functions
  const validateCancellationFee = (value: string) => {
    if (form.cancellationFee.enabled && !value.trim()) {
      setErrors(prev => ({ ...prev, cancellationFee: "Cancellation fee amount is required" }));
    } else {
      setErrors(prev => ({ ...prev, cancellationFee: undefined }));
    }
  };

  const validateProviderFee = (value: string) => {
    if (form.cancellationFee.payProvider && !value.trim()) {
      setErrors(prev => ({ ...prev, providerFee: "Provider fee amount is required" }));
    } else {
      setErrors(prev => ({ ...prev, providerFee: undefined }));
    }
  };

  const validateBeforeDayTime = (value: string) => {
    if (form.cancellationFee.enabled && form.cancellationFee.chargeTiming === 'beforeDay' && !value.trim()) {
      setErrors(prev => ({ ...prev, beforeDayTime: "Time is required" }));
    } else {
      setErrors(prev => ({ ...prev, beforeDayTime: undefined }));
    }
  };

  const validateHoursBefore = (value: string) => {
    if (form.cancellationFee.enabled && form.cancellationFee.chargeTiming === 'hoursBefore' && !value.trim()) {
      setErrors(prev => ({ ...prev, hoursBefore: "Hours is required" }));
    } else {
      setErrors(prev => ({ ...prev, hoursBefore: undefined }));
    }
  };

  const validateExpeditedCharge = (value: string) => {
    if (form.expeditedCharge.enabled && !value.trim()) {
      setErrors(prev => ({ ...prev, expeditedCharge: "Expedited charge amount is required" }));
    } else {
      setErrors(prev => ({ ...prev, expeditedCharge: undefined }));
    }
  };

  const validateHourlyService = (value: string) => {
    if (form.hourlyService.enabled && !value.trim()) {
      setErrors(prev => ({ ...prev, hourlyService: "Hourly service price is required" }));
    } else {
      setErrors(prev => ({ ...prev, hourlyService: undefined }));
    }
  };

  const validateServiceCategoryPrice = (value: string) => {
    if (form.serviceCategoryPrice.enabled && !value.trim()) {
      setErrors(prev => ({ ...prev, serviceCategoryPrice: "Service category price is required" }));
    } else {
      setErrors(prev => ({ ...prev, serviceCategoryPrice: undefined }));
    }
  };

  const validateServiceCategoryTime = (hours: string, minutes: string) => {
    if (form.serviceCategoryTime.enabled && !hours.trim() && !minutes.trim()) {
      setErrors(prev => ({ ...prev, serviceCategoryTime: "Hours or minutes is required" }));
    } else {
      setErrors(prev => ({ ...prev, serviceCategoryTime: undefined }));
    }
  };

  const validateMinimumPrice = (value: string) => {
    if (form.minimumPrice.enabled && !value.trim()) {
      setErrors(prev => ({ ...prev, minimumPrice: "Minimum price is required" }));
    } else {
      setErrors(prev => ({ ...prev, minimumPrice: undefined }));
    }
  };

  const validateOverrideProviderPay = (value: string) => {
    if (form.overrideProviderPay.enabled && !value.trim()) {
      setErrors(prev => ({ ...prev, overrideProviderPay: "Override provider pay amount is required" }));
    } else {
      setErrors(prev => ({ ...prev, overrideProviderPay: undefined }));
    }
  };

  const save = async () => {
    console.log('=== SAVE DEBUG ===');
    console.log('Form name:', form.name);
    console.log('Form name trimmed:', form.name.trim());
    console.log('Industry ID:', industryId);
    console.log('Industry:', industry);
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Authenticated user:', user);
    
    if (!user) {
      alert("You must be logged in to create a service category.");
      return;
    }
    
    if (!form.name.trim()) {
      alert("Service category name is required");
      return;
    }

    if (!industryId) {
      alert("Industry ID is required. Please refresh the page and try again.");
      return;
    }

    if (form.cancellationFee.enabled && form.cancellationFee.type === 'multiple' && form.cancellationFee.multipleFees.length === 0) {
      setErrors(prev => ({ ...prev, cancellationMultipleFeesEmpty: "It should not remain empty, please add at least one cancellation fee." }));
      alert("Please add at least one cancellation fee when using multiple fees.");
      return;
    }

    if (form.cancellationFee.enabled && form.cancellationFee.type === 'single') {
      if (!form.cancellationFee.fee.trim()) {
        alert("Cancellation fee amount is required when cancellation fee is enabled");
        return;
      }
      if (form.cancellationFee.payProvider && !form.cancellationFee.providerFee.trim()) {
        alert("Provider fee amount is required when paying provider is enabled");
        return;
      }
      if (form.cancellationFee.chargeTiming === 'beforeDay' && !form.cancellationFee.beforeDayTime.trim()) {
        alert("Time is required when 'If they cancel after' option is selected");
        return;
      }
      if (form.cancellationFee.chargeTiming === 'hoursBefore' && !form.cancellationFee.hoursBefore.trim()) {
        alert("Hours is required when 'If they cancel' option is selected");
        return;
      }
    }

    if (form.expeditedCharge.enabled && !form.expeditedCharge.amount.trim()) {
      alert("Expedited charge amount is required when expedited charge is enabled");
      return;
    }

    if (form.hourlyService.enabled && !form.hourlyService.price.trim()) {
      alert("Hourly service price is required when hourly service is enabled");
      return;
    }

    if (form.serviceCategoryPrice.enabled && !form.serviceCategoryPrice.price.trim()) {
      alert("Service category price is required when price is enabled");
      return;
    }

    if (form.serviceCategoryTime.enabled && (!form.serviceCategoryTime.hours.trim() && !form.serviceCategoryTime.minutes.trim())) {
      alert("Hours or minutes is required when service time is enabled");
      return;
    }

    if (form.minimumPrice.enabled && !form.minimumPrice.price.trim()) {
      alert("Minimum price is required when minimum price is enabled");
      return;
    }

    if (form.overrideProviderPay.enabled && !form.overrideProviderPay.amount.trim()) {
      alert("Override provider pay amount is required when override is enabled");
      return;
    }

    try {
      setLoading(true);

      // User authentication already checked above
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('Looking up business for user:', user.id);
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      
      console.log('Business lookup result:', { business, businessError });
      
      if (businessError) {
        console.error('Business lookup error:', businessError);
        throw new Error(`Business lookup failed: ${businessError.message}`);
      }
      
      if (!business) throw new Error('Business not found');

      if (!industryId) {
        throw new Error('Industry ID is required');
      }

      const categoryData = {
        business_id: business.id,
        industry_id: industryId,
        name: form.name.trim(),
        description: form.description,
        show_explanation_icon_on_form: form.showExplanationIconOnForm,
        explanation_tooltip_text: form.explanationTooltipText || undefined,
        enable_popup_on_selection: form.enablePopupOnSelection,
        popup_content: form.popupContent || undefined,
        enable_service_length_tooltip_customer: form.enableServiceLengthTooltipCustomer,
        service_length_tooltip_text_customer: form.serviceLengthTooltipTextCustomer || undefined,
        enable_service_length_tooltip_provider: form.enableServiceLengthTooltipProvider,
        service_length_tooltip_text_provider: form.serviceLengthTooltipTextProvider || undefined,
        display: form.display as 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only',
        display_service_length_customer: form.displayServiceLengthCustomer as 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only',
        display_service_length_provider: form.displayServiceLengthProvider,
        can_customer_edit_service: form.canCustomerEditService,
        service_fee_enabled: form.serviceFeeEnabled,
        service_category_frequency: form.serviceCategoryFrequency,
        selected_frequencies: form.selectedFrequencies,
        variables: form.variables,
        exclude_parameters: form.excludeParameters,
        selected_exclude_parameters: form.selectedExcludeParameters,
        extras: form.extras,
        extras_config: form.extrasConfig,
        expedited_charge: (() => {
          const ec = form.expeditedCharge;
          return { enabled: ec.enabled, amount: ec.amount, displayText: ec.displayText, currency: ec.currency || "$" };
        })(),
        cancellation_fee: (() => {
          const cf = form.cancellationFee;
          const base = {
            enabled: cf.enabled,
            type: cf.type,
            fee: cf.fee,
            currency: cf.currency,
            payProvider: cf.payProvider,
            providerFee: cf.providerFee,
            providerCurrency: cf.providerCurrency,
            chargeTiming: cf.chargeTiming,
            beforeDayTime: cf.beforeDayTime,
            hoursBefore: cf.hoursBefore
          };
          if (cf.type === 'multiple' && cf.multipleFees?.length) {
            return { ...base, multiple_fees: cf.multipleFees };
          }
          return base;
        })(),
        hourly_service: form.hourlyService,
        service_category_price: form.serviceCategoryPrice,
        service_category_time: form.serviceCategoryTime,
        minimum_price: form.minimumPrice,
        override_provider_pay: form.overrideProviderPay,
        excluded_providers: form.excludedProviders
      };

      // Validate and sanitize data before saving
      const sanitizedCategoryData = {
        ...categoryData,
        // Ensure arrays are properly formatted
        selected_frequencies: Array.isArray(form.selectedFrequencies) ? form.selectedFrequencies.filter(f => typeof f === 'string' && f.trim()) : [],
        selected_exclude_parameters: Array.isArray(form.selectedExcludeParameters) ? form.selectedExcludeParameters.filter(p => typeof p === 'string' && p.trim()) : [],
        extras: Array.isArray(form.extras) ? form.extras.filter(e => typeof e === 'number' && !isNaN(e)) : [],
        // Ensure objects are properly structured
        variables: typeof form.variables === 'object' && form.variables !== null ? form.variables : {},
        exclude_parameters: typeof form.excludeParameters === 'object' && form.excludeParameters !== null ? {
          pets: Boolean(form.excludeParameters.pets),
          smoking: Boolean(form.excludeParameters.smoking),
          deepCleaning: Boolean(form.excludeParameters.deepCleaning)
        } : {
          pets: false,
          smoking: false,
          deepCleaning: false
        },
        // Ensure other complex objects are properly structured
        extras_config: form.extrasConfig || {
          tip: { enabled: false, saveTo: 'all', display: 'customer_frontend_backend_admin' },
          parking: { enabled: false, saveTo: 'all', display: 'customer_frontend_backend_admin' }
        },
        expedited_charge: (() => {
          const ec = form.expeditedCharge || { enabled: false, amount: "", displayText: "", currency: "$" };
          return { enabled: ec.enabled, amount: ec.amount, displayText: ec.displayText, currency: ec.currency || "$" };
        })(),
        cancellation_fee: (() => {
          const cf = form.cancellationFee || {
            enabled: false,
            type: 'single' as const,
            fee: "",
            currency: "$",
            payProvider: false,
            providerFee: "",
            providerCurrency: "$",
            chargeTiming: 'beforeDay' as const,
            beforeDayTime: "",
            hoursBefore: "",
            multipleFees: []
          };
          const base = {
            enabled: cf.enabled,
            type: cf.type,
            fee: cf.fee,
            currency: cf.currency,
            payProvider: cf.payProvider,
            providerFee: cf.providerFee,
            providerCurrency: cf.providerCurrency,
            chargeTiming: cf.chargeTiming,
            beforeDayTime: cf.beforeDayTime,
            hoursBefore: cf.hoursBefore
          };
          if (cf.type === 'multiple' && cf.multipleFees?.length) {
            return { ...base, multiple_fees: cf.multipleFees };
          }
          return base;
        })(),
        hourly_service: form.hourlyService || {
          enabled: false,
          price: "",
          currency: "$",
          priceCalculationType: 'customTime',
          countExtrasSeparately: false
        },
        service_category_price: form.serviceCategoryPrice || {
          enabled: false,
          price: "",
          currency: "$"
        },
        service_category_time: form.serviceCategoryTime || {
          enabled: false,
          hours: "0",
          minutes: "0"
        },
        minimum_price: form.minimumPrice || {
          enabled: false,
          checkAmountType: 'discounted',
          price: "",
          checkRecurringSchedule: false,
          textToDisplay: false,
          noticeText: ""
        },
        override_provider_pay: form.overrideProviderPay || {
          enabled: false,
          amount: "",
          payType: "hourly"
        }
      };

      console.log('=== SANITIZED CATEGORY DATA ===');
      console.log('SanitizedData:', JSON.stringify(sanitizedCategoryData, null, 2));

      if (editId) {
        console.log('=== UPDATING SERVICE CATEGORY ===');
        console.log('EditId:', editId);
        try {
          const result = await serviceCategoriesService.updateServiceCategory(editId, sanitizedCategoryData);
          console.log('Update successful:', result);
          toast({
            title: "Success",
            description: "Service category updated successfully.",
          });
        } catch (updateError) {
          console.error('Update failed:', updateError);
          throw updateError;
        }
      } else {
        console.log('=== CREATING SERVICE CATEGORY ===');
        try {
          const result = await serviceCategoriesService.createServiceCategory(sanitizedCategoryData);
          console.log('Create successful:', result);
          toast({
            title: "Success",
            description: "Service category created successfully.",
          });
        } catch (createError) {
          console.error('Create failed:', createError);
          throw createError;
        }
      }

      router.push(`/admin/settings/industries/form-1/service-category?industry=${encodeURIComponent(industry)}`);
    } catch (error) {
      console.error('Error saving category:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        form: form,
        industryId: industryId
      });
      toast({
        title: "Error",
        description: `Failed to save service category: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit Service Category" : "Add Service Category"}</CardTitle>
          <CardDescription>
            Configure a service category for {industry}.
            {!industryId && (
              <span className="text-red-500 ml-2">⚠️ Loading industry information...</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
              <TabsTrigger value="providers">Providers</TabsTrigger>
            </TabsList>

            {/* DETAILS TAB */}
            <TabsContent value="details" className="mt-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="category-name">Name *</Label>
                <Input 
                  id="category-name" 
                  value={form.name} 
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} 
                  placeholder="Ex. Kitchen, Bathroom, etc." 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-desc">Description</Label>
                <Textarea 
                  id="category-desc" 
                  rows={3} 
                  value={form.description} 
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} 
                  placeholder="Add a brief description of this category" 
                />
              </div>

              {/* Show explanation icon on form */}
              <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                <TooltipProvider>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="show-explanation-icon"
                      checked={form.showExplanationIconOnForm}
                      onCheckedChange={(checked) => setForm(p => ({ ...p, showExplanationIconOnForm: !!checked }))}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="show-explanation-icon" className="text-sm font-medium cursor-pointer">
                          Show explanation icon on form
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            When enabled, an info icon is shown on the form. Use the tooltip text below to explain this service category.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {form.showExplanationIconOnForm && (
                        <Textarea
                          placeholder="Add Tooltip Text"
                          value={form.explanationTooltipText}
                          onChange={(e) => setForm(p => ({ ...p, explanationTooltipText: e.target.value }))}
                          className="min-h-[80px] resize-y bg-background mt-2"
                        />
                      )}
                    </div>
                  </div>
                </TooltipProvider>
              </div>

              {/* Enable popup on selection */}
              <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                <TooltipProvider>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="enable-popup-on-selection"
                      checked={form.enablePopupOnSelection}
                      onCheckedChange={(checked) => setForm(p => ({ ...p, enablePopupOnSelection: !!checked }))}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="enable-popup-on-selection" className="text-sm font-medium cursor-pointer">
                          Enable popup on selection
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            When enabled, a popup with the content below is shown when this service category is selected on the booking form.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {form.enablePopupOnSelection && (
                        <div className="mt-2">
                          <RichTextEditor
                            value={form.popupContent}
                            onChange={(v) => setForm(p => ({ ...p, popupContent: v }))}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipProvider>
              </div>

              {/* Display Settings */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Display</h4>
                <p className="text-xs text-muted-foreground">Where do you want this service category to show up?</p>
                <RadioGroup
                  value={form.display}
                  onValueChange={(value) => setForm(p => ({ ...p, display: value }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="customer_frontend_backend_admin" /> Customer frontend, backend & admin
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="customer_backend_admin" /> Customer backend & admin
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="admin_only" /> Admin only
                  </label>
                </RadioGroup>
              </div>

              {/* Display Service Length on Customer End */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Display service length on customer end</h4>
                <p className="text-xs text-muted-foreground">Would you like the customer to see how long the service will take in the summary box?</p>
                <RadioGroup
                  value={form.displayServiceLengthCustomer}
                  onValueChange={(value) => setForm(p => ({ ...p, displayServiceLengthCustomer: value }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="customer_frontend_backend_admin" /> Customer frontend, backend & admin
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="customer_backend_admin" /> Customer backend & admin
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="admin_only" /> Admin only
                  </label>
                </RadioGroup>
                <TooltipProvider>
                  <div className="flex items-start gap-2 pt-2">
                    <Checkbox
                      id="enable-service-length-tooltip-customer"
                      checked={form.enableServiceLengthTooltipCustomer}
                      onCheckedChange={(checked) => setForm(p => ({ ...p, enableServiceLengthTooltipCustomer: !!checked }))}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="enable-service-length-tooltip-customer" className="text-sm font-medium cursor-pointer">
                          Enable tooltip for service length on customer end
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            When enabled, a tooltip with the text below is shown for the service length on the customer end.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {form.enableServiceLengthTooltipCustomer && (
                        <Textarea
                          placeholder="Add Length Tooltip Text"
                          value={form.serviceLengthTooltipTextCustomer}
                          onChange={(e) => setForm(p => ({ ...p, serviceLengthTooltipTextCustomer: e.target.value }))}
                          className="min-h-[80px] resize-y bg-background mt-2"
                        />
                      )}
                    </div>
                  </div>
                </TooltipProvider>
              </div>

              {/* Display Service Length on Provider End */}
              <TooltipProvider>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">Display service length on provider end</h4>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        Choose whether providers can see how long the service will take.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <RadioGroup
                  value={form.displayServiceLengthProvider ? "yes" : "no"}
                  onValueChange={(value) => setForm(p => ({ ...p, displayServiceLengthProvider: value === "yes" }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="yes" /> Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="no" /> No
                  </label>
                </RadioGroup>
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="enable-service-length-tooltip-provider"
                        checked={form.enableServiceLengthTooltipProvider}
                        onCheckedChange={(checked) => setForm(p => ({ ...p, enableServiceLengthTooltipProvider: !!checked }))}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor="enable-service-length-tooltip-provider" className="text-sm font-medium cursor-pointer">
                            Enable tooltip for service length on provider end
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              When enabled, a tooltip with the text below is shown for the service length on the provider end.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        {form.enableServiceLengthTooltipProvider && (
                          <Textarea
                            placeholder="Add Length Tooltip Text"
                            value={form.serviceLengthTooltipTextProvider}
                            onChange={(e) => setForm(p => ({ ...p, serviceLengthTooltipTextProvider: e.target.value }))}
                            className="min-h-[80px] resize-y bg-background mt-2"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TooltipProvider>

              {/* Can Customer Edit Service */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Can customer edit this service?</h4>
                <RadioGroup
                  value={form.canCustomerEditService ? "yes" : "no"}
                  onValueChange={(value) => setForm(p => ({ ...p, canCustomerEditService: value === "yes" }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="yes" /> Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="no" /> No
                  </label>
                </RadioGroup>
              </div>

              {/* Service Fee */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Will you charge a service fee for this service category?</h4>
                <RadioGroup
                  value={form.serviceFeeEnabled ? "yes" : "no"}
                  onValueChange={(value) => setForm(p => ({ ...p, serviceFeeEnabled: value === "yes" }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="yes" /> Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="no" /> No
                  </label>
                </RadioGroup>
              </div>

              {/* Expedited Charge */}
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <TooltipProvider>
                  <div className="space-y-4">
                    {/* Expedited charge (same day) */}
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="expedited-charge"
                        checked={form.expeditedCharge.enabled}
                        onCheckedChange={(checked) => {
                          const enabled = !!checked;
                          setForm(p => ({
                            ...p,
                            expeditedCharge: { ...p.expeditedCharge, enabled }
                          }));
                          if (!enabled) setErrors(prev => ({ ...prev, expeditedCharge: undefined }));
                        }}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor="expedited-charge" className="text-sm font-medium cursor-pointer">
                            Expedited charge (same day)
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              Charge applied for same-day or expedited bookings.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        {form.expeditedCharge.enabled && (
                          <div className="flex items-center rounded-md border bg-background overflow-hidden">
                            <span className="flex items-center px-3 h-10 text-sm font-medium border-r bg-muted/50 text-muted-foreground">$</span>
                            <Input
                              id="expedited-amount"
                              type="text"
                              inputMode="decimal"
                              placeholder="Amount"
                              value={form.expeditedCharge.amount}
                              onChange={(e) => {
                                setForm(p => ({
                                  ...p,
                                  expeditedCharge: { ...p.expeditedCharge, amount: e.target.value }
                                }));
                                validateExpeditedCharge(e.target.value);
                              }}
                              onBlur={(e) => validateExpeditedCharge(e.target.value)}
                              className={`border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 w-32 ${errors.expeditedCharge && !form.expeditedCharge.amount.trim() ? 'border-red-500' : ''}`}
                            />
                          </div>
                        )}
                        {form.expeditedCharge.enabled && !form.expeditedCharge.amount.trim() && errors.expeditedCharge && (
                          <p className="text-red-700 dark:text-red-400 text-xs font-semibold">{errors.expeditedCharge}</p>
                        )}
                      </div>
                    </div>

                    {/* Text to display - only when expedited charge is enabled; align checkbox with $ symbol */}
                    {form.expeditedCharge.enabled && (
                      <div className="flex items-start gap-2 ml-6">
                        <Checkbox
                          id="expedited-text-to-display"
                          checked={form.expeditedCharge.textToDisplayEnabled}
                          onCheckedChange={(checked) => setForm(p => ({
                            ...p,
                            expeditedCharge: { ...p.expeditedCharge, textToDisplayEnabled: !!checked }
                          }))}
                        />
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="expedited-text-to-display" className="text-sm font-medium cursor-pointer">
                            Text to display
                          </Label>
                          {form.expeditedCharge.textToDisplayEnabled && (
                            <Textarea
                              id="expedited-display-text"
                              placeholder="Add Expedited Text"
                              value={form.expeditedCharge.displayText}
                              onChange={(e) => setForm(p => ({
                                ...p,
                                expeditedCharge: { ...p.expeditedCharge, displayText: e.target.value }
                              }))}
                              className="min-h-[80px] resize-y bg-background"
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipProvider>
              </div>

              {/* Cancellation Fee */}
              <div className="space-y-4">
                <TooltipProvider>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="cancellation-fee"
                      checked={form.cancellationFee.enabled}
                      onCheckedChange={(checked) => {
                        const enabled = !!checked;
                        setForm(p => ({ ...p, cancellationFee: { ...p.cancellationFee, enabled } }));
                        if (!enabled) setErrors(prev => ({ ...prev, cancellationFee: undefined, cancellationMultipleFeesEmpty: undefined }));
                      }}
                    />
                    <Label htmlFor="cancellation-fee" className="text-sm font-medium cursor-pointer">
                      Cancellation fee
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        Charge applied when a customer cancels according to your timing rules.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>

                {form.cancellationFee.enabled && (
                  <div className="ml-6 space-y-4">
                    {/* Fee Type: Single or Multiple */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-sm font-semibold">Do you want to set a single cancellation fee or multiple cancellation fees?</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            Single: one fee for all cancellations. Multiple: different fees for different timeframes (e.g. 24h vs 48h before).
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <RadioGroup
                        value={form.cancellationFee.type}
                        onValueChange={(value: 'single' | 'multiple') => {
                          setForm(p => ({ ...p, cancellationFee: { ...p.cancellationFee, type: value } }));
                          if (value === 'single') {
                            setErrors(prev => ({ ...prev, cancellationMultipleFeesEmpty: undefined }));
                          } else if (value === 'multiple' && form.cancellationFee.multipleFees.length === 0) {
                            setErrors(prev => ({ ...prev, cancellationMultipleFeesEmpty: "It should not remain empty, please add at least one cancellation fee." }));
                          } else {
                            setErrors(prev => ({ ...prev, cancellationMultipleFeesEmpty: undefined }));
                          }
                        }}
                        className="flex gap-4 pt-1"
                      >
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <RadioGroupItem value="single" /> Single
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <RadioGroupItem value="multiple" /> Multiple
                        </label>
                      </RadioGroup>
                    </div>

                    {form.cancellationFee.type === 'single' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="cancellation-fee-amount" className="text-sm">Cancellation fee</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              id="cancellation-fee-amount"
                              type="number"
                              placeholder="50.00"
                              value={form.cancellationFee.fee}
                              onChange={(e) => {
                                setForm(p => ({ ...p, cancellationFee: { ...p.cancellationFee, fee: e.target.value } }));
                                validateCancellationFee(e.target.value);
                              }}
                              onBlur={(e) => validateCancellationFee(e.target.value)}
                              className={`w-24 ${errors.cancellationFee ? 'border-red-500' : ''}`}
                            />
                            <Select
                              value={form.cancellationFee.currency}
                              onValueChange={(value) => setForm(p => ({ ...p, cancellationFee: { ...p.cancellationFee, currency: value } }))}
                            >
                              <SelectTrigger className="w-16">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="$">$</SelectItem>
                                <SelectItem value="%">%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {errors.cancellationFee && (
                            <p className="text-red-700 dark:text-red-400 text-xs font-semibold">{errors.cancellationFee}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Label className="text-sm">Do you want to pay a cancellation fee to the Provider?</Label>
                            <div className="flex items-center gap-2 shrink-0">
                              <Switch
                                id="pay-provider"
                                checked={form.cancellationFee.payProvider}
                                onCheckedChange={(checked) => setForm(p => ({ ...p, cancellationFee: { ...p.cancellationFee, payProvider: checked } }))}
                              />
                              <Label htmlFor="pay-provider" className="text-sm">{form.cancellationFee.payProvider ? "Enabled" : "Disabled"}</Label>
                            </div>
                          </div>
                        </div>
                        {form.cancellationFee.payProvider && (
                          <div className="space-y-2">
                            <Label htmlFor="provider-fee-amount" className="text-sm">Provider fee amount</Label>
                            <div className="flex gap-2 items-center">
                              <Input
                                id="provider-fee-amount"
                                type="number"
                                placeholder="0.00"
                                value={form.cancellationFee.providerFee}
                                onChange={(e) => {
                                  setForm(p => ({ ...p, cancellationFee: { ...p.cancellationFee, providerFee: e.target.value } }));
                                  validateProviderFee(e.target.value);
                                }}
                                onBlur={(e) => validateProviderFee(e.target.value)}
                                className={`w-24 ${errors.providerFee ? 'border-red-500' : ''}`}
                              />
                              <Select value={form.cancellationFee.providerCurrency} onValueChange={(value) => setForm(p => ({ ...p, cancellationFee: { ...p.cancellationFee, providerCurrency: value } }))}>
                                <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="$">$</SelectItem>
                                  <SelectItem value="%">%</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {errors.providerFee && <p className="text-red-700 dark:text-red-400 text-xs font-semibold">{errors.providerFee}</p>}
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label className="text-sm">When will your customers be charged a cancellation fee?</Label>
                          <RadioGroup
                            value={form.cancellationFee.chargeTiming}
                            onValueChange={(value: 'beforeDay' | 'hoursBefore') => setForm(p => ({ ...p, cancellationFee: { ...p.cancellationFee, chargeTiming: value } }))}
                            className="grid gap-2"
                          >
                            <label className="flex items-center gap-2 text-sm">
                              <RadioGroupItem value="beforeDay" />
                              If they cancel after:
                              <Input
                                type="time"
                                value={form.cancellationFee.beforeDayTime}
                                onChange={(e) => {
                                  setForm(p => ({ ...p, cancellationFee: { ...p.cancellationFee, beforeDayTime: e.target.value } }));
                                  validateBeforeDayTime(e.target.value);
                                }}
                                onBlur={(e) => validateBeforeDayTime(e.target.value)}
                                className={`w-32 h-8 ${errors.beforeDayTime ? 'border-red-500' : ''}`}
                              />
                              the day before the job.
                            </label>
                            {errors.beforeDayTime && <p className="text-red-700 dark:text-red-400 text-xs ml-6 font-semibold">{errors.beforeDayTime}</p>}
                            <label className="flex items-center gap-2 text-sm">
                              <RadioGroupItem value="hoursBefore" />
                              If they cancel:
                              <Input
                                type="number"
                                min={1}
                                max={24}
                                value={form.cancellationFee.hoursBefore}
                                onChange={(e) => {
                                  setForm(p => ({ ...p, cancellationFee: { ...p.cancellationFee, hoursBefore: e.target.value } }));
                                  validateHoursBefore(e.target.value);
                                }}
                                onBlur={(e) => validateHoursBefore(e.target.value)}
                                className={`w-16 h-8 ${errors.hoursBefore ? 'border-red-500' : ''}`}
                              />
                              Hours before the job.
                            </label>
                            {errors.hoursBefore && <p className="text-red-700 dark:text-red-400 text-xs ml-6 font-semibold">{errors.hoursBefore}</p>}
                          </RadioGroup>
                        </div>
                      </>
                    )}

                    {form.cancellationFee.type === 'multiple' && (
                      <>
                        <h4 className="text-sm font-semibold">Cancellation fee</h4>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <p className="text-xs text-muted-foreground max-w-xl">
                            Create multiple cancellation fees based on different cancellation timeframes. In the case of multiple cancellation fees for the same time period, the most recent cancellation fee settings will be used.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={openAddFeeModal}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Fee
                          </Button>
                        </div>
                        {form.cancellationFee.multipleFees.length > 0 && (
                          <div className="rounded-lg border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                  <TableHead className="font-semibold">Amount Charged</TableHead>
                                  <TableHead className="font-semibold">Provider Compensation</TableHead>
                                  <TableHead className="font-semibold">Time</TableHead>
                                  <TableHead className="font-semibold w-[100px]">Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {form.cancellationFee.multipleFees.map((entry) => (
                                  <TableRow key={entry.id}>
                                    <TableCell>
                                      {entry.currency} {entry.fee ? (isNaN(Number(entry.fee)) ? entry.fee : Number(entry.fee).toFixed(2)) : '0.00'}
                                    </TableCell>
                                    <TableCell>
                                      {entry.payProvider && entry.providerFee ? `${entry.providerCurrency} ${(isNaN(Number(entry.providerFee)) ? entry.providerFee : Number(entry.providerFee).toFixed(2))}` : '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {getFeeTimeDescription(entry)}
                                    </TableCell>
                                    <TableCell>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-8 gap-1">
                                            Options
                                            <ChevronDown className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => openEditFeeModal(entry)}>
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Edit
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => {
                                              const nextFees = form.cancellationFee.multipleFees.filter(f => f.id !== entry.id);
                                              setForm(p => ({
                                                ...p,
                                                cancellationFee: { ...p.cancellationFee, multipleFees: nextFees }
                                              }));
                                              if (nextFees.length === 0) {
                                                setErrors(prev => ({ ...prev, cancellationMultipleFeesEmpty: "It should not remain empty, please add at least one cancellation fee." }));
                                              } else {
                                                setErrors(prev => ({ ...prev, cancellationMultipleFeesEmpty: undefined }));
                                              }
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                        {form.cancellationFee.type === 'multiple' && form.cancellationFee.multipleFees.length === 0 && (
                          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3">
                            <p className="text-sm font-medium text-destructive">
                              {errors.cancellationMultipleFeesEmpty ?? "It should not remain empty, please add at least one cancellation fee."}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Add a cancellation fee modal */}
              <Dialog open={addCancellationFeeModalOpen} onOpenChange={(open) => { setAddCancellationFeeModalOpen(open); if (!open) { setAddFeeModalError(null); setEditingFeeId(null); } }}>
                <DialogContent className="max-w-xl sm:max-w-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{editingFeeId ? 'Edit cancellation fee' : 'Add a cancellation fee'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-2">
                    <TooltipProvider>
                      {/* Section 1: When will your customers be charged */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-sm font-semibold">When will your customers be charged a cancellation fee?</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex text-orange-500 hover:text-orange-600">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              Set the timeframe after which a cancellation will incur this fee.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <RadioGroup
                          value={newCancellationFee.chargeTiming}
                          onValueChange={(v: 'beforeDay' | 'hoursBefore') => setNewCancellationFee(p => ({ ...p, chargeTiming: v }))}
                          className="space-y-3"
                        >
                          <label className="flex flex-wrap items-center gap-2 text-sm cursor-pointer">
                            <RadioGroupItem value="beforeDay" />
                            If they cancel after:
                            <Input
                              type="time"
                              className="w-28 h-8"
                              value={newCancellationFee.beforeDayTime}
                              onChange={(e) => setNewCancellationFee(p => ({ ...p, beforeDayTime: e.target.value }))}
                            />
                            the
                            <Select
                              value={newCancellationFee.daysBefore}
                              onValueChange={(v) => setNewCancellationFee(p => ({ ...p, daysBefore: v }))}
                            >
                              <SelectTrigger className="w-16 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                                  <SelectItem key={n} value={String(n)}>{String(n).padStart(2, '0')}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            day(s) before the job.
                          </label>
                          <label className="flex flex-wrap items-center gap-2 text-sm cursor-pointer">
                            <RadioGroupItem value="hoursBefore" />
                            If they cancel:
                            <Select
                              value={newCancellationFee.hoursBefore}
                              onValueChange={(v) => setNewCancellationFee(p => ({ ...p, hoursBefore: v }))}
                            >
                              <SelectTrigger className="w-16 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                                  <SelectItem key={n} value={String(n)}>{String(n).padStart(2, '0')}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            hour
                            <Select
                              value={newCancellationFee.minutesBefore}
                              onValueChange={(v) => setNewCancellationFee(p => ({ ...p, minutesBefore: v }))}
                            >
                              <SelectTrigger className="w-16 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 60 }, (_, i) => {
                                  const m = String(i).padStart(2, '0');
                                  return <SelectItem key={m} value={m}>{m}</SelectItem>;
                                })}
                              </SelectContent>
                            </Select>
                            minutes before the job.
                          </label>
                        </RadioGroup>
                      </div>

                      {/* Section 2: Cancellation fee amount */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Cancellation fee</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="Amount"
                            value={newCancellationFee.fee}
                            onChange={(e) => {
                              setNewCancellationFee(p => ({ ...p, fee: e.target.value }));
                              if (addFeeModalError) setAddFeeModalError(null);
                            }}
                            className={`flex-1 ${addFeeModalError ? 'border-destructive' : ''}`}
                          />
                          <Select
                            value={newCancellationFee.currency}
                            onValueChange={(v) => setNewCancellationFee(p => ({ ...p, currency: v }))}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="$">$</SelectItem>
                              <SelectItem value="%">%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {addFeeModalError && (
                          <p className="text-sm text-destructive flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {addFeeModalError}
                          </p>
                        )}
                      </div>

                      {/* Section 3: Pay to provider */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-sm font-semibold">Is some or all of the cancellation fee paid to the provider?</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex text-orange-500 hover:text-orange-600">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              When enabled, a portion of the fee can be paid to the provider.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-center gap-2 flex-nowrap min-w-0">
                          <Switch
                            checked={newCancellationFee.payProvider}
                            onCheckedChange={(c) => setNewCancellationFee(p => ({ ...p, payProvider: !!c }))}
                          />
                          <span className="text-sm whitespace-nowrap">{newCancellationFee.payProvider ? 'Enabled' : 'Disabled'}</span>
                        </div>
                      </div>
                    </TooltipProvider>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="default" onClick={addFeeFromModal}>
                      {editingFeeId ? 'Save' : 'Next'}
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => { setAddCancellationFeeModalOpen(false); setAddFeeModalError(null); }}>
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Set Service Category Price */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="service-category-price"
                    checked={form.serviceCategoryPrice.enabled}
                    onCheckedChange={(checked) => setForm(p => ({
                      ...p,
                      serviceCategoryPrice: { ...p.serviceCategoryPrice, enabled: checked as boolean }
                    }))}
                  />
                  <Label htmlFor="service-category-price" className="text-sm font-medium">
                    Set service category price
                  </Label>
                </div>
                
                {form.serviceCategoryPrice.enabled && (
                  <div className="ml-6 space-y-2">
                    <div className="flex gap-2 items-center">
                      <span className="text-sm font-medium">$</span>
                      <Input
                        id="service-category-price-amount"
                        type="number"
                        placeholder="0.00"
                        value={form.serviceCategoryPrice.price}
                        onChange={(e) => {
                          setForm(p => ({
                            ...p,
                            serviceCategoryPrice: { ...p.serviceCategoryPrice, price: e.target.value }
                          }));
                          validateServiceCategoryPrice(e.target.value);
                        }}
                        onBlur={(e) => validateServiceCategoryPrice(e.target.value)}
                        className={`w-24 ${errors.serviceCategoryPrice ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.serviceCategoryPrice && (
                      <p className="text-red-500 dark:text-red-400 text-xs font-medium">{errors.serviceCategoryPrice}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Set Service Category Time */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="service-category-time"
                    checked={form.serviceCategoryTime.enabled}
                    onCheckedChange={(checked) => setForm(p => ({
                      ...p,
                      serviceCategoryTime: { ...p.serviceCategoryTime, enabled: checked as boolean }
                    }))}
                  />
                  <Label htmlFor="service-category-time" className="text-sm font-medium">
                    Set service category time
                  </Label>
                </div>
                
                {form.serviceCategoryTime.enabled && (
                  <div className="ml-6 space-y-2">
                    <div className="text-xs text-red-500 mb-2">
                      Note: This option will not work in case of hourly service (custom time based).
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="space-y-1">
                        <Label className="text-xs">Hours</Label>
                        <Select
                          value={form.serviceCategoryTime.hours}
                          onValueChange={(value) => {
                            setForm(p => ({
                              ...p,
                              serviceCategoryTime: { ...p.serviceCategoryTime, hours: value }
                            }));
                            validateServiceCategoryTime(value, form.serviceCategoryTime.minutes);
                          }}
                        >
                          <SelectTrigger className={`w-20 ${errors.serviceCategoryTime ? 'border-red-500' : ''}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Minutes</Label>
                        <Select
                          value={form.serviceCategoryTime.minutes}
                          onValueChange={(value) => {
                            setForm(p => ({
                              ...p,
                              serviceCategoryTime: { ...p.serviceCategoryTime, minutes: value }
                            }));
                            validateServiceCategoryTime(form.serviceCategoryTime.hours, value);
                          }}
                        >
                          <SelectTrigger className={`w-20 ${errors.serviceCategoryTime ? 'border-red-500' : ''}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 60 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {errors.serviceCategoryTime && (
                          <p className="text-red-700 dark:text-red-400 text-xs font-semibold">{errors.serviceCategoryTime}</p>
                        )}
                  </div>
                )}
              </div>

              {/* Set Minimum Price */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="minimum-price"
                    checked={form.minimumPrice.enabled}
                    onCheckedChange={(checked) => setForm(p => ({
                      ...p,
                      minimumPrice: { ...p.minimumPrice, enabled: checked as boolean }
                    }))}
                  />
                  <Label htmlFor="minimum-price" className="text-sm font-medium">
                    Set minimum price
                  </Label>
                </div>

                {form.minimumPrice.enabled && (
                  <div className="ml-6 space-y-4">
                    {/* Check Amount Type */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">On which amount you want to check minimum price?</h5>
                      <RadioGroup
                        value={form.minimumPrice.checkAmountType}
                        onValueChange={(value) => setForm(p => ({
                          ...p,
                          minimumPrice: { ...p.minimumPrice, checkAmountType: value as 'discounted' | 'final' }
                        }))}
                        className="flex gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="discounted" id="discounted-total" />
                          <Label htmlFor="discounted-total">Discounted total</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="final" id="final-total" />
                          <Label htmlFor="final-total">Final total</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Price</h5>
                      <div className="flex gap-2 items-center">
                        <span className="text-sm font-medium">$</span>
                        <Input
                          id="minimum-price-amount"
                          type="number"
                          placeholder="0.00"
                          value={form.minimumPrice.price}
                          onChange={(e) => {
                            setForm(p => ({
                              ...p,
                              minimumPrice: { ...p.minimumPrice, price: e.target.value }
                            }));
                            validateMinimumPrice(e.target.value);
                          }}
                          onBlur={(e) => validateMinimumPrice(e.target.value)}
                          className={`w-24 ${errors.minimumPrice ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.minimumPrice && (
                        <p className="text-red-500 dark:text-red-400 text-xs font-medium">{errors.minimumPrice}</p>
                      )}
                    </div>

                    {/* Check Recurring Schedule */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="check-recurring-schedule"
                        checked={form.minimumPrice.checkRecurringSchedule}
                        onCheckedChange={(checked) => setForm(p => ({
                          ...p,
                          minimumPrice: { ...p.minimumPrice, checkRecurringSchedule: checked as boolean }
                        }))}
                      />
                      <Label htmlFor="check-recurring-schedule" className="text-sm font-medium">
                        Check minimum price for complete recurring schedule.
                      </Label>
                    </div>

                    {/* Text to Display */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="text-to-display"
                          checked={form.minimumPrice.textToDisplay}
                          onCheckedChange={(checked) => setForm(p => ({
                            ...p,
                            minimumPrice: { ...p.minimumPrice, textToDisplay: checked as boolean }
                          }))}
                        />
                        <Label htmlFor="text-to-display" className="text-sm font-medium">
                          Text to display
                        </Label>
                      </div>

                      {form.minimumPrice.textToDisplay && (
                        <div className="ml-6">
                          <Textarea
                            id="minimum-notice-text"
                            placeholder="Add Minimum Notice Text"
                            value={form.minimumPrice.noticeText}
                            onChange={(e) => setForm(p => ({
                              ...p,
                              minimumPrice: { ...p.minimumPrice, noticeText: e.target.value }
                            }))}
                            rows={3}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Override Provider Pay */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="override-provider-pay"
                    checked={form.overrideProviderPay.enabled}
                    onCheckedChange={(checked) => setForm(p => ({
                      ...p,
                      overrideProviderPay: { ...p.overrideProviderPay, enabled: checked as boolean }
                    }))}
                  />
                  <Label htmlFor="override-provider-pay" className="text-sm font-medium">
                    Override provider pay
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex text-amber-500 hover:text-amber-600 focus:outline-none">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-sm text-muted-foreground font-normal">
                        Every provider can have a specific amount they get paid, but here you can override the fee. For example, if you have a re-clean service and you want to pay the provider $0 for this service, you can put $0 in this field. If a customer books this service, the provider will get $0 no matter what the customer selects under this service. You can still override this and give them any amount you want during the booking. Simply change the $0 that will by default show there to any number you want.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {form.overrideProviderPay.enabled && (
                  <div className="ml-6 space-y-2">
                    <div className="flex gap-2 items-center flex-wrap">
                      <Input
                        id="override-provider-pay-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={form.overrideProviderPay.amount}
                        onChange={(e) => {
                          setForm(p => ({
                            ...p,
                            overrideProviderPay: { ...p.overrideProviderPay, amount: e.target.value }
                          }));
                          validateOverrideProviderPay(e.target.value);
                        }}
                        onBlur={(e) => validateOverrideProviderPay(e.target.value)}
                        className={`w-24 ${errors.overrideProviderPay ? 'border-red-500' : ''}`}
                      />
                      <Select
                        value={form.overrideProviderPay.payType}
                        onValueChange={(value: "fixed" | "hourly") => setForm(p => ({
                          ...p,
                          overrideProviderPay: { ...p.overrideProviderPay, payType: value }
                        }))}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">$</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {errors.overrideProviderPay && (
                      <p className="text-red-700 dark:text-red-400 text-xs font-semibold">{errors.overrideProviderPay}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Hourly Service */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">Is it an hourly service?</h4>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <RadioGroup
                  value={form.hourlyService.enabled ? "yes" : "no"}
                  onValueChange={(value) => setForm(p => ({ 
                    ...p, 
                    hourlyService: { ...p.hourlyService, enabled: value === "yes" ? true : false }
                  }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="yes" /> Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="no" /> No
                  </label>
                </RadioGroup>

                {form.hourlyService.enabled && (
                  <div className="ml-6 space-y-4">
                    {/* Hourly Price */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="hourly-price-amount" className="text-sm">Hourly price</Label>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-sm font-medium">$</span>
                        <Input
                          id="hourly-price-amount"
                          type="number"
                          placeholder="50.00"
                          value={form.hourlyService.price}
                          onChange={(e) => {
                            setForm(p => ({
                              ...p,
                              hourlyService: { ...p.hourlyService, price: e.target.value }
                            }));
                            validateHourlyService(e.target.value);
                          }}
                          onBlur={(e) => validateHourlyService(e.target.value)}
                          className={`w-24 ${errors.hourlyService ? 'border-red-500' : ''}`}
                        />
                        <span className="text-sm text-muted-foreground">/Hr</span>
                      </div>
                      {errors.hourlyService && (
                        <p className="text-red-500 dark:text-red-400 text-xs font-medium">{errors.hourlyService}</p>
                      )}
                    </div>

                    {/* Calculate price based on custom time or pricing parameters time? */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Would you like to calculate the price of an hourly service based on a custom time or based on the pricing parameters time?</Label>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <RadioGroup
                        value={form.hourlyService.priceCalculationType}
                        onValueChange={(value: 'customTime' | 'pricingParametersTime') => setForm(p => ({
                          ...p,
                          hourlyService: { ...p.hourlyService, priceCalculationType: value }
                        }))}
                        className="grid gap-2"
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="customTime" /> Based on custom time
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="pricingParametersTime" /> Based on the pricing parameters time
                        </label>
                      </RadioGroup>
                    </div>

                    {/* Count extras as a separate charge? */}
                    {form.hourlyService.priceCalculationType === 'customTime' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Would you like to count extras as a separate charge?</Label>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <RadioGroup
                          value={form.hourlyService.countExtrasSeparately ? "yes" : "no"}
                          onValueChange={(value) => setForm(p => ({
                            ...p,
                            hourlyService: { ...p.hourlyService, countExtrasSeparately: value === "yes" ? true : false }
                          }))}
                          className="grid gap-2"
                        >
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="yes" /> Yes
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="no" /> No
                          </label>
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Extras Configuration */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Extras</h3>
                <p className="text-sm text-muted-foreground">
                  If you want to add variables to your forms for this service you can activate them here.
                </p>

                {/* Tip Configuration */}
                <div className="border p-4 rounded-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Tip</h4>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Switch
                      id="tip-enabled"
                      checked={form.extrasConfig.tip.enabled}
                      onCheckedChange={(checked) => setForm(p => ({
                        ...p,
                        extrasConfig: {
                          ...p.extrasConfig,
                          tip: { ...p.extrasConfig.tip, enabled: checked }
                        }
                      }))}
                    />
                  </div>

                  {form.extrasConfig.tip.enabled && (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">Save to</p>
                        <Select
                          value={form.extrasConfig.tip.saveTo}
                          onValueChange={(value) => setForm(p => ({
                            ...p,
                            extrasConfig: {
                              ...p.extrasConfig,
                              tip: { ...p.extrasConfig.tip, saveTo: value as 'all' | 'first' }
                            }
                          }))}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="first">First</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">Booking(s)</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">Display</p>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <RadioGroup
                          value={form.extrasConfig.tip.display}
                          onValueChange={(value) => setForm(p => ({
                            ...p,
                            extrasConfig: {
                              ...p.extrasConfig,
                              tip: { ...p.extrasConfig.tip, display: value as 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only' }
                            }
                          }))}
                          className="flex items-center gap-4"
                        >
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="customer_frontend_backend_admin" /> Customer frontend, backend & admin
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="customer_backend_admin" /> Customer backend & admin
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="admin_only" /> Admin only
                          </label>
                        </RadioGroup>
                      </div>
                    </>
                  )}
                </div>

                {/* Parking Configuration */}
                <div className="border p-4 rounded-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Parking</h4>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Switch
                      id="parking-enabled"
                      checked={form.extrasConfig.parking.enabled}
                      onCheckedChange={(checked) => setForm(p => ({
                        ...p,
                        extrasConfig: {
                          ...p.extrasConfig,
                          parking: { ...p.extrasConfig.parking, enabled: checked }
                        }
                      }))}
                    />
                  </div>

                  {form.extrasConfig.parking.enabled && (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">Save to</p>
                        <Select
                          value={form.extrasConfig.parking.saveTo}
                          onValueChange={(value) => setForm(p => ({
                            ...p,
                            extrasConfig: {
                              ...p.extrasConfig,
                              parking: { ...p.extrasConfig.parking, saveTo: value as 'all' | 'first' }
                            }
                          }))}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="first">First</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">Booking(s)</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">Display</p>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <RadioGroup
                          value={form.extrasConfig.parking.display}
                          onValueChange={(value) => setForm(p => ({
                            ...p,
                            extrasConfig: {
                              ...p.extrasConfig,
                              parking: { ...p.extrasConfig.parking, display: value as 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only' }
                            }
                          }))}
                          className="flex items-center gap-4"
                        >
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="customer_frontend_backend_admin" /> Customer frontend, backend & admin
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="customer_backend_admin" /> Customer backend & admin
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="admin_only" /> Admin only
                          </label>
                        </RadioGroup>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* DEPENDENCIES TAB */}
            <TabsContent value="dependencies" className="mt-4 space-y-6">
              <div className="space-y-6">
                {/* Service Category Frequency */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Should the service category show based on the frequency?</h4>
                  <RadioGroup
                    value={form.serviceCategoryFrequency ? "yes" : "no"}
                    onValueChange={(value) => setForm(p => ({ ...p, serviceCategoryFrequency: value === "yes" ? true : false }))}
                    className="grid gap-2"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="yes" /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="no" /> No
                    </label>
                  </RadioGroup>
                </div>

                {form.serviceCategoryFrequency && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Select Frequencies</h4>
                    <div className="space-y-2 p-4 border rounded-lg bg-white">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all-frequencies"
                          checked={form.selectedFrequencies.length === frequencies.length && frequencies.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, selectedFrequencies: frequencies }));
                            } else {
                              setForm(p => ({ ...p, selectedFrequencies: [] }));
                            }
                          }}
                        />
                        <Label htmlFor="select-all-frequencies" className="text-sm font-medium cursor-pointer">Select All</Label>
                      </div>
                      {frequencies.map((frequency, index) => (
                        <div key={index} className="flex items-center gap-2 ml-6">
                          <Checkbox
                            id={`frequency-${index}`}
                            checked={form.selectedFrequencies.includes(frequency)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm(p => ({ ...p, selectedFrequencies: [...p.selectedFrequencies, frequency] }));
                              } else {
                                setForm(p => ({ ...p, selectedFrequencies: p.selectedFrequencies.filter(f => f !== frequency) }));
                              }
                            }}
                          />
                          <Label htmlFor={`frequency-${index}`} className="text-sm font-normal cursor-pointer">
                            {frequency}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    {frequencies.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        No frequencies added yet. Add frequencies from the Frequencies section.
                      </p>
                    )}
                  </div>
                )}

                {/* Variables */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium">Variables</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select which variable(s) will display for this service category. Any variables that have not been checked off in this section will not display when this service category is selected on the booking form.
                    </p>
                  </div>
                  
                  {Object.keys(pricingParameters).length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No pricing parameters added yet. Add pricing parameters from the Pricing section.
                    </p>
                  ) : (
                    <div className="space-y-4 p-4 border rounded-lg bg-white">
                      {/* Group variables by category dynamically */}
                      {Object.keys(pricingParameters).map(category => {
                        const categoryParams = pricingParameters[category] || [];
                        if (categoryParams.length === 0) return null;
                        
                        return (
                          <div key={category} className="space-y-2">
                            <h4 className="text-sm font-semibold">{category}</h4>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`select-all-service-${category.toLowerCase().replace(' ', '-')}`}
                                checked={form.variables[category]?.length === categoryParams.length && categoryParams.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setForm(p => ({
                                      ...p,
                                      variables: {
                                        ...p.variables,
                                        [category]: categoryParams.map(param => param.name)
                                      }
                                    }));
                                  } else {
                                    setForm(p => ({
                                      ...p,
                                      variables: {
                                        ...p.variables,
                                        [category]: []
                                      }
                                    }));
                                  }
                                }}
                              />
                              <Label htmlFor={`select-all-service-${category.toLowerCase().replace(' ', '-')}`} className="text-sm cursor-pointer">Select All</Label>
                            </div>
                            <div className="grid grid-cols-10 gap-2">
                              {categoryParams.map((param) => (
                                <div key={param.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`service-variable-${param.id}`}
                                    checked={form.variables[category]?.includes(param.name) || false}
                                    onCheckedChange={(checked) => {
                                      const currentSelections = form.variables[category] || [];
                                      if (checked) {
                                        setForm(p => ({
                                          ...p,
                                          variables: {
                                            ...p.variables,
                                            [category]: [...currentSelections, param.name]
                                          }
                                        }));
                                      } else {
                                        setForm(p => ({
                                          ...p,
                                          variables: {
                                            ...p.variables,
                                            [category]: currentSelections.filter(item => item !== param.name)
                                          }
                                        }));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`service-variable-${param.id}`} className="text-sm cursor-pointer">{param.name}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Exclude Parameters */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Exclude Parameters</h4>
                  {excludeParameters.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No exclude parameters added yet. Add exclude parameters from the Pricing section.
                    </p>
                  ) : (
                    <div className="space-y-2 p-4 border rounded-lg bg-white">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all-exclude-params"
                          checked={form.selectedExcludeParameters.length === excludeParameters.length && excludeParameters.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, selectedExcludeParameters: excludeParameters.map(param => param.name) }));
                            } else {
                              setForm(p => ({ ...p, selectedExcludeParameters: [] }));
                            }
                          }}
                        />
                        <Label htmlFor="select-all-exclude-params" className="text-sm font-medium cursor-pointer">Select All</Label>
                      </div>
                      {excludeParameters.map((param) => (
                        <div key={param.id} className="flex items-center gap-2 ml-6">
                          <Checkbox
                            id={`exclude-param-${param.id}`}
                            checked={form.selectedExcludeParameters.includes(param.name)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm(p => ({ ...p, selectedExcludeParameters: [...p.selectedExcludeParameters, param.name] }));
                              } else {
                                setForm(p => ({ ...p, selectedExcludeParameters: p.selectedExcludeParameters.filter(name => name !== param.name) }));
                              }
                            }}
                          />
                          <Label htmlFor={`exclude-param-${param.id}`} className="text-sm font-normal cursor-pointer">
                            {param.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Extras */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Extras</h4>
                  <div className="space-y-2 p-4 border rounded-lg bg-white">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all-extras"
                        checked={form.extras.length === availableExtras.length && availableExtras.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const extraIds = availableExtras.map(e => typeof e.id === 'string' ? parseInt(e.id, 10) : e.id);
                            setForm(p => ({ ...p, extras: extraIds }));
                          } else {
                            setForm(p => ({ ...p, extras: [] }));
                          }
                        }}
                      />
                      <Label htmlFor="select-all-extras" className="text-sm font-medium cursor-pointer">Select All</Label>
                    </div>
                    {availableExtras.map((extra) => {
                      const extraId = typeof extra.id === 'string' ? parseInt(extra.id, 10) : extra.id;
                      console.log(`=== CHECKBOX DEBUG for extra ${extra.name} ===`);
                      console.log('Extra ID:', extraId, 'Type:', typeof extraId);
                      console.log('Form extras:', form.extras);
                      console.log('Form extras types:', form.extras.map(e => typeof e));
                      console.log('Includes result:', form.extras.includes(extraId));
                      
                      return (
                      <div key={extra.id} className="flex items-center gap-2 ml-6">
                        <Checkbox
                          id={`extra-${extra.id}`}
                          checked={form.extras.includes(extraId)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, extras: [...p.extras, extraId] }));
                            } else {
                              setForm(p => ({ ...p, extras: p.extras.filter(e => e !== extraId) }));
                            }
                          }}
                        />
                        <Label htmlFor={`extra-${extra.id}`} className="text-sm font-normal cursor-pointer">
                          {extra.name}
                        </Label>
                      </div>
                      );
                    })}
                  </div>
                  
                  {availableExtras.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      No extras added yet. Add extras from the Extras section.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* PROVIDERS TAB */}
            <TabsContent value="providers" className="mt-4 space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Check the providers you want to exclude from this service category.
                </p>
                
                {providers.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No providers added yet. Add providers from the Providers section in the admin dashboard.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <Label>Providers</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all-providers"
                          checked={form.excludedProviders.length === providers.length && providers.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, excludedProviders: providers.map(pr => pr.id) }));
                            } else {
                              setForm(p => ({ ...p, excludedProviders: [] }));
                            }
                          }}
                        />
                        <Label htmlFor="select-all-providers" className="text-sm font-medium cursor-pointer">Select All</Label>
                      </div>
                      {providers.map((provider) => (
                        <div key={provider.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`provider-${provider.id}`}
                            checked={form.excludedProviders.includes(provider.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm(p => ({ ...p, excludedProviders: [...p.excludedProviders, provider.id] }));
                              } else {
                                setForm(p => ({ ...p, excludedProviders: p.excludedProviders.filter(c => c !== provider.id) }));
                              }
                            }}
                          />
                          <Label htmlFor={`provider-${provider.id}`} className="text-sm font-normal cursor-pointer">{provider.name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => router.push(`/admin/settings/industries/form-1/service-category?industry=${encodeURIComponent(industry)}`)}
            >
              Cancel
            </Button>
            <Button 
              onClick={save} 
              className="text-white" 
              style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}
              disabled={loading || !form.name.trim() || !industryId}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editId ? "Saving..." : "Creating..."}
                </>
              ) : (
                editId ? "Save" : "Create"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
