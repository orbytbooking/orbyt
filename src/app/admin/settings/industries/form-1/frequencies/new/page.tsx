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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Info,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { bookingFormScopeFromSearchParams } from "@/lib/bookingFormScope";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  normalizeFrequencyPopupDisplay,
  type FrequencyPopupDisplay,
} from "@/lib/frequencyPopupDisplay";

function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [fontSizeLabel, setFontSizeLabel] = useState("12pt");
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = value || "";
  }, [value]);

  const execCommand = (command: string, cmdValue?: string) => {
    document.execCommand(command, false, cmdValue);
    editorRef.current?.focus();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const updateContent = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const applyFontSize = (pt: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      const span = document.createElement("span");
      span.style.fontSize = pt;
      span.appendChild(document.createTextNode("\u200b"));
      range.insertNode(span);
      range.setStart(span.firstChild!, 1);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      try {
        const span = document.createElement("span");
        span.style.fontSize = pt;
        span.appendChild(range.extractContents());
        range.insertNode(span);
      } catch {
        document.execCommand("styleWithCSS", false, "true");
        document.execCommand("fontSize", false, "3");
      }
    }
    onChange(ed.innerHTML);
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white dark:bg-background">
      <div className="border-b bg-muted/50 p-2 flex items-center gap-1 flex-wrap">
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("bold")} className="h-8 w-8 p-0 shrink-0" title="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("italic")} className="h-8 w-8 p-0 shrink-0" title="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("underline")} className="h-8 w-8 p-0 shrink-0" title="Underline">
          <Underline className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("strikeThrough")} className="h-8 w-8 p-0 shrink-0" title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = typeof window !== "undefined" ? window.prompt("Enter URL:") : null;
            if (url) execCommand("createLink", url);
          }}
          className="h-8 w-8 p-0 shrink-0"
          title="Insert link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-0.5 shrink-0" />
        <Select value={fontSizeLabel} onValueChange={(v) => { setFontSizeLabel(v); applyFontSize(v); }}>
          <SelectTrigger className="h-8 w-[72px] text-xs shrink-0" aria-label="Font size">
            <SelectValue placeholder="12pt" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10pt">10pt</SelectItem>
            <SelectItem value="12pt">12pt</SelectItem>
            <SelectItem value="14pt">14pt</SelectItem>
            <SelectItem value="18pt">18pt</SelectItem>
            <SelectItem value="24pt">24pt</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-px h-6 bg-border mx-0.5 shrink-0" />
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("justifyLeft")} className="h-8 w-8 p-0 shrink-0" title="Align left">
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("justifyCenter")} className="h-8 w-8 p-0 shrink-0" title="Align center">
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("justifyRight")} className="h-8 w-8 p-0 shrink-0" title="Align right">
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("justifyFull")} className="h-8 w-8 p-0 shrink-0" title="Justify">
          <AlignJustify className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-0.5 shrink-0" />
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("insertUnorderedList")} className="h-8 w-8 p-0 shrink-0" title="Bullet list">
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("insertOrderedList")} className="h-8 w-8 p-0 shrink-0" title="Numbered list">
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("removeFormat")}
          className="h-8 px-2 text-xs shrink-0"
          title="Clear formatting"
        >
          Tx
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={updateContent}
        className="min-h-[220px] p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 text-[12pt]"
        style={{ whiteSpace: "pre-wrap" }}
      />
    </div>
  );
}

interface Industry {
  id: string;
  name: string;
  description: string | null;
  business_id: string;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

export default function FrequencyNewPage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const industryIdFromUrl = params.get("industryId");
  const editId = params.get("editId");
  const bookingFormScope = bookingFormScopeFromSearchParams(params.get("bookingFormScope"));
  const scopeQs = `&bookingFormScope=${bookingFormScope}`;
  const { currentBusiness } = useBusiness();

  type LocationRow = {
    id: string;
    name: string;
    city?: string;
    state?: string;
    postal_code?: string;
    address?: string;
    active?: boolean;
  };

  type Row = {
    id: string;
    name: string;
    discount: number;
    discountType?: "%" | "$";
    display: "Both" | "Booking" | "Quote";
    isDefault?: boolean;
    description?: string;
    differentOnCustomerEnd?: boolean;
    showExplanation?: boolean;
    enablePopup?: boolean;
    occurrenceTime?: string;
    excludedProviders?: string[];
    // Dependencies
    addToOtherIndustries?: boolean;
    enabledIndustries?: string[];
    showBasedOnLocation?: boolean;
    locationIds?: string[];
    serviceCategories?: string[];
    bathroomVariables?: string[];
    sqftVariables?: string[];
    bedroomVariables?: string[];
    excludeParameters?: string[];
    extras?: string[];
  };
  const [loadingFrequency, setLoadingFrequency] = useState(false);
  
  // Dynamic data states
  const [pricingParameters, setPricingParameters] = useState<any[]>([]);
  const [loadingPricingParams, setLoadingPricingParams] = useState(true);
  const [industryId, setIndustryId] = useState<string | null>(industryIdFromUrl || null);
  const [loadingExtras, setLoadingExtras] = useState(true);
  const [extras, setExtras] = useState<any[]>([]);
  const [excludeParameters, setExcludeParameters] = useState<any[]>([]);
  const [loadingServiceCategories, setLoadingServiceCategories] = useState(true);
  const [loadingExcludeParams, setLoadingExcludeParams] = useState(true);

  const [form, setForm] = useState({
    name: "",
    description: "",
    differentOnCustomerEnd: false,
    showExplanation: false,
    enablePopup: false,
    explanationTooltipText: "",
    popupContent: "",
    popupDisplay: "customer_frontend_backend_admin" as FrequencyPopupDisplay,
    display: "Both" as Row["display"],
    occurrenceTime: "",
    discount: "0",
    discountType: "%" as Row["discountType"],
    isDefault: false,
    excludedProviders: [] as string[],
    // Recurring frequency options
    frequencyRepeats: "",
    shorterJobLength: "yes" as "yes" | "no",
    shorterJobLengthBy: "0",
    excludeFirstAppointment: false,
    frequencyDiscount: "all" as "all" | "exclude-first",
    chargeOneTimePrice: false,
    // Dependencies
    addToOtherIndustries: false,
    enabledIndustries: [] as string[],
    showBasedOnLocation: false,
    locationIds: [] as string[],
    serviceCategories: [] as string[],
    bathroomVariables: [] as string[],
    sqftVariables: [] as string[],
    bedroomVariables: [] as string[],
    excludeParameters: [] as string[],
    extras: [] as string[],
  });

  const [errors, setErrors] = useState({
    name: "",
    discount: "",
    occurrenceTime: "",
  });

  const [touched, setTouched] = useState({
    name: false,
    discount: false,
    occurrenceTime: false,
  });

  // Fetch providers from API
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  
  // Load providers from API
  useEffect(() => {
    const fetchProviders = async () => {
      if (!currentBusiness?.id) {
        setLoadingProviders(false);
        return;
      }
      
      try {
        setLoadingProviders(true);
        const response = await fetch(`/api/admin/providers?businessId=${currentBusiness.id}`);
        const data = await response.json();
        
        if (response.ok && data.providers) {
          setProviders(data.providers.map((p: any) => ({ id: p.id, name: p.name })));
        }
      } catch (error) {
        console.error('Error fetching providers:', error);
      } finally {
        setLoadingProviders(false);
      }
    };

    fetchProviders();
  }, [currentBusiness]);
  
  // Load data for dependencies
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [serviceCategories, setServiceCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  
  const bathroomOptions = ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5"];
  const sqftOptions = [
    "1 - 1249 Sq Ft", "1250 - 1499 Sq Ft", "1500 - 1799 Sq Ft", "1800 - 2099 Sq Ft",
    "2100 - 2399 Sq Ft", "2400 - 2699 Sq Ft", "2700 - 3000 Sq Ft", "3000 - 3299 Sq Ft",
    "3300 - 3699 Sq Ft", "3700 - 3999", "4000+"
  ];
  const bedroomOptions = ["0", "1", "2", "3", "4", "5"];

  useEffect(() => {
    if (industryIdFromUrl) setIndustryId(industryIdFromUrl);
  }, [industryIdFromUrl]);

  useEffect(() => {
    const fetchFrequency = async () => {
      if (!editId || !industryId) return;
      
      try {
        setLoadingFrequency(true);
        const response = await fetch(
          `/api/industry-frequency?industryId=${industryId}&includeAll=true${scopeQs}`,
        );
        const data = await response.json();
        
        if (response.ok && data.frequencies) {
          const existing = data.frequencies.find((f: any) => f.id === editId);
          if (existing) {
            setForm({
              name: existing.name,
              description: existing.description || "",
              differentOnCustomerEnd: !!existing.different_on_customer_end,
              showExplanation: !!existing.show_explanation,
              enablePopup: !!existing.enable_popup,
              explanationTooltipText: existing.explanation_tooltip_text || "",
              popupContent: existing.popup_content || "",
              popupDisplay: normalizeFrequencyPopupDisplay(existing.popup_display),
              display: existing.display,
              occurrenceTime: existing.occurrence_time || "",
              discount: String(existing.discount ?? 0),
              discountType: existing.discount_type || "%",
              isDefault: !!existing.is_default,
              excludedProviders: existing.excluded_providers || [],
              // Recurring frequency options
              frequencyRepeats: existing.frequency_repeats || "",
              shorterJobLength: existing.shorter_job_length || "yes",
              shorterJobLengthBy: existing.shorter_job_length_by || "0",
              excludeFirstAppointment: !!existing.exclude_first_appointment,
              frequencyDiscount: existing.frequency_discount || "all",
              chargeOneTimePrice: !!existing.charge_one_time_price,
              addToOtherIndustries: !!existing.add_to_other_industries,
              enabledIndustries: existing.enabled_industries || [],
              showBasedOnLocation: !!existing.show_based_on_location,
              locationIds: existing.location_ids || [],
              serviceCategories: existing.service_categories || [],
              bathroomVariables: existing.bathroom_variables || [],
              sqftVariables: existing.sqft_variables || [],
              bedroomVariables: existing.bedroom_variables || [],
              excludeParameters: existing.exclude_parameters || [],
              extras: existing.extras || [],
            });
          }
        }
      } catch (error) {
        console.error('Error fetching frequency:', error);
      } finally {
        setLoadingFrequency(false);
      }
    };

    fetchFrequency();
  }, [editId, industryId, bookingFormScope]);

  // Load industries from API
  useEffect(() => {
    const fetchIndustries = async () => {
      if (!currentBusiness) {
        setLoadingIndustries(false);
        return;
      }
      
      try {
        setLoadingIndustries(true);
        const response = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const data = await response.json();
        
        if (response.ok && data.industries) {
          setIndustries(data.industries);
          // Find the current industry ID
          const currentIndustry = data.industries.find((ind: Industry) => ind.name === industry);
          if (currentIndustry) {
            setIndustryId(currentIndustry.id);
          }
        }
      } catch (error) {
        console.error('Error fetching industries:', error);
      } finally {
        setLoadingIndustries(false);
      }
    };

    fetchIndustries();
  }, [currentBusiness, industry, industryIdFromUrl]);
  
  // Load service categories from API
  useEffect(() => {
    const fetchServiceCategories = async () => {
      if (!industryId) {
        setLoadingServiceCategories(false);
        return;
      }
      
      try {
        setLoadingServiceCategories(true);
        const response = await fetch(
          `/api/service-categories?industryId=${industryId}&businessId=${encodeURIComponent(currentBusiness?.id ?? "")}${scopeQs}`,
        );
        const data = await response.json();
        
        if (response.ok && data.serviceCategories) {
          setServiceCategories(data.serviceCategories.map((c: any) => ({ id: String(c.id), name: c.name })));
        }
      } catch (error) {
        console.error('Error fetching service categories:', error);
      } finally {
        setLoadingServiceCategories(false);
      }
    };

    fetchServiceCategories();
  }, [industryId, bookingFormScope, currentBusiness?.id]);

  // Load extras from API
  useEffect(() => {
    const fetchExtras = async () => {
      if (!industryId) {
        setLoadingExtras(false);
        return;
      }
      
      try {
        setLoadingExtras(true);
        const baseQs = `industryId=${encodeURIComponent(industryId)}&businessId=${encodeURIComponent(currentBusiness?.id ?? "")}${scopeQs}`;
        const urls =
          bookingFormScope === "form2"
            ? [
                `/api/extras?${baseQs}`,
                `/api/extras?${baseQs}&listingKind=addon`,
                `/api/extras?${baseQs}&listingKind=extra`,
              ]
            : [`/api/extras?${baseQs}&listingKind=extra`];

        const payloads = await Promise.all(
          urls.map(async (u) => {
            const r = await fetch(u);
            const data = r.ok ? await r.json() : { extras: [] };
            const inferredListingKind =
              u.includes("listingKind=addon") ? "addon" : u.includes("listingKind=extra") ? "extra" : null;
            return { data, inferredListingKind };
          }),
        );
        const merged = payloads.flatMap(({ data, inferredListingKind }) =>
          (Array.isArray(data.extras) ? data.extras : []).map((e: any) => ({
            ...e,
            listing_kind: e?.listing_kind ?? inferredListingKind ?? (bookingFormScope === "form2" ? "addon" : "extra"),
          })),
        );
        const deduped = merged.filter(
          (e: any, idx: number, arr: any[]) => arr.findIndex((x) => String(x?.id) === String(e?.id)) === idx,
        );
        setExtras(
          deduped.map((e: any) => ({
            id: e.id,
            name: e.name,
            listing_kind: e.listing_kind === "extra" ? "extra" : "addon",
          })),
        );
      } catch (error) {
        console.error('Error fetching extras:', error);
      } finally {
        setLoadingExtras(false);
      }
    };

    fetchExtras();
  }, [industryId, bookingFormScope, currentBusiness?.id]);

  // Load locations from API
  useEffect(() => {
    const fetchLocations = async () => {
      if (!currentBusiness?.id) {
        setLocations([]);
        return;
      }
      
      try {
        const response = await fetch(`/api/locations?business_id=${currentBusiness.id}`);
        const data = await response.json();
        
        if (response.ok && data.locations) {
          setLocations(
            data.locations.map((loc: any) => ({
              id: String(loc.id),
              name: String(loc.name || ""),
              city: loc.city || undefined,
              state: loc.state || undefined,
              postal_code: loc.postalCode || loc.postal_code || undefined,
              address: loc.address || undefined,
              active: typeof loc.active === "boolean" ? loc.active : undefined,
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLocations([]);
      }
    };

    fetchLocations();
  }, [currentBusiness]);

  // Load pricing parameters from API
  useEffect(() => {
    const fetchPricingParameters = async () => {
      if (!industryId || !currentBusiness?.id) {
        setLoadingPricingParams(false);
        return;
      }

      try {
        setLoadingPricingParams(true);
        const response = await fetch(
          `/api/pricing-parameters?industryId=${encodeURIComponent(industryId)}&businessId=${encodeURIComponent(currentBusiness.id)}${scopeQs}`,
        );
        const data = await response.json();
        
        if (response.ok && data.pricingParameters) {
          setPricingParameters(data.pricingParameters);
        }
      } catch (error) {
        console.error('Error fetching pricing parameters:', error);
      } finally {
        setLoadingPricingParams(false);
      }
    };

    fetchPricingParameters();
  }, [industryId, currentBusiness?.id, bookingFormScope]);

  // Load exclude parameters from API
  useEffect(() => {
    const fetchExcludeParameters = async () => {
      if (!industryId) {
        setLoadingExcludeParams(false);
        return;
      }
      
      try {
        setLoadingExcludeParams(true);
        const response = await fetch(`/api/exclude-parameters?industryId=${industryId}`);
        const data = await response.json();
        
        if (response.ok && data.excludeParameters) {
          setExcludeParameters(data.excludeParameters);
        }
      } catch (error) {
        console.error('Error fetching exclude parameters:', error);
      } finally {
        setLoadingExcludeParams(false);
      }
    };

    fetchExcludeParameters();
  }, [industryId]);


  useEffect(() => {
    if (!form.showBasedOnLocation && form.locationIds.length > 0) {
      setForm(p => ({ ...p, locationIds: [] }));
    }
  }, [form.showBasedOnLocation, form.locationIds.length]);

  const validateField = (fieldName: string, value: string) => {
    let error = "";
    
    if (fieldName === "name") {
      if (!value.trim()) {
        error = "Name is required";
      }
    } else if (fieldName === "discount") {
      const discountValue = Number(value);
      if (isNaN(discountValue) || value.trim() === "") {
        error = "Discount must be a valid number";
      } else if (discountValue < 0) {
        error = "Discount cannot be negative";
      } else if (discountValue === 0) {
        // Clear error when value is exactly 0 (valid)
        error = "";
      }
    } else if (fieldName === "occurrenceTime") {
      if (!value || value.trim() === "") {
        error = "Occurrence time is required";
      }
    }
    
    setErrors(prev => ({ ...prev, [fieldName]: error }));
    return error === "";
  };

  const validateForm = () => {
    const nameValid = validateField("name", form.name);
    const discountValid = validateField("discount", form.discount);
    const occurrenceTimeValid = validateField("occurrenceTime", form.occurrenceTime);
    
    setTouched({ name: true, discount: true, occurrenceTime: true });
    
    return nameValid && discountValid && occurrenceTimeValid;
  };

  const save = async () => {
    if (!validateForm()) {
      return;
    }

    if (!currentBusiness || !industryId) {
      alert('Business or Industry information is missing. Please try again.');
      return;
    }
    
    const discount = Number(form.discount) || 0;

    const frequencyData = {
      business_id: currentBusiness.id,
      industry_id: industryId,
      name: form.name.trim(),
      description: form.description,
      different_on_customer_end: form.differentOnCustomerEnd,
      show_explanation: form.showExplanation,
      enable_popup: form.enablePopup,
      explanation_tooltip_text: form.explanationTooltipText || undefined,
      popup_content: form.popupContent || undefined,
      popup_display: form.popupDisplay,
      display: form.display,
      occurrence_time: form.occurrenceTime,
      discount,
      discount_type: form.discountType,
      is_default: form.isDefault,
      excluded_providers: form.excludedProviders,
      // Recurring frequency options
      frequency_repeats: form.frequencyRepeats,
      shorter_job_length: form.shorterJobLength,
      shorter_job_length_by: form.shorterJobLengthBy,
      exclude_first_appointment: form.excludeFirstAppointment,
      frequency_discount: form.frequencyDiscount,
      charge_one_time_price: form.chargeOneTimePrice,
      add_to_other_industries: form.addToOtherIndustries,
      enabled_industries: form.enabledIndustries,
      show_based_on_location: form.showBasedOnLocation,
      location_ids: form.showBasedOnLocation ? form.locationIds : [],
      service_categories: form.serviceCategories,
      bathroom_variables: form.bathroomVariables,
      sqft_variables: form.sqftVariables,
      bedroom_variables: form.bedroomVariables,
      exclude_parameters: form.excludeParameters,
      extras: form.extras,
      booking_form_scope: bookingFormScope,
    };

    try {
      if (editId) {
        const response = await fetch('/api/industry-frequency', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, ...frequencyData }),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(`Failed to update frequency: ${error.error}`);
          return;
        }
      } else {
        const response = await fetch('/api/industry-frequency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(frequencyData),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(`Failed to create frequency: ${error.error}`);
          return;
        }
      }

      router.push(
        `/admin/settings/industries/form-1/frequencies?industry=${encodeURIComponent(industry)}${scopeQs}`,
      );
    } catch (error) {
      console.error('Error saving frequency:', error);
      alert('An error occurred while saving the frequency. Please try again.');
    }
  };

  const form2AddonRows = bookingFormScope === "form2" ? extras.filter((e) => e.listing_kind !== "extra") : [];
  const form2ExtraRows = bookingFormScope === "form2" ? extras.filter((e) => e.listing_kind === "extra") : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit Frequency" : "Add Frequency"}</CardTitle>
          <CardDescription>Configure a frequency option for {industry}.</CardDescription>
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
              <TooltipProvider delayDuration={200}>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="freq-name">Name <span className="text-red-500">*</span></Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none" aria-label="About name">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      This label appears on booking and admin when customers choose a frequency.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input 
                  id="freq-name" 
                  value={form.name} 
                  onChange={(e) => {
                    setForm(p => ({ ...p, name: e.target.value }));
                    if (touched.name) {
                      validateField("name", e.target.value);
                    }
                  }}
                  onBlur={() => {
                    setTouched(prev => ({ ...prev, name: true }));
                    validateField("name", form.name);
                  }}
                  placeholder="Ex. Weekly"
                  className={touched.name && errors.name ? "border-red-500" : ""}
                />
                {touched.name && errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="diff-customer" className="mt-0.5" checked={form.differentOnCustomerEnd} onCheckedChange={(v) => setForm(p => ({ ...p, differentOnCustomerEnd: !!v }))} />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Label htmlFor="diff-customer" className="text-sm cursor-pointer">Different on customer end</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none" aria-label="About customer end">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      When enabled, you can use a different name or copy on the public booking form than in admin.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="freq-desc">Description</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none" aria-label="About description">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      Internal notes or customer-facing explanation of how this frequency behaves when scheduling.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Textarea id="freq-desc" rows={3} value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Add Description" />
              </div>

              <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="show-explanation-icon"
                    checked={form.showExplanation}
                    onCheckedChange={(checked) => setForm((p) => ({ ...p, showExplanation: !!checked }))}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="show-explanation-icon" className="text-sm font-medium cursor-pointer">
                        Show explanation icon on form
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none" aria-label="About explanation icon">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          When enabled, an info icon appears next to this frequency on the booking form. Use the text below for the tooltip.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {form.showExplanation && (
                      <Textarea
                        placeholder="e.g. 15% off total price if you book a weekly clean!"
                        value={form.explanationTooltipText}
                        onChange={(e) => setForm((p) => ({ ...p, explanationTooltipText: e.target.value }))}
                        className="min-h-[80px] resize-y bg-background mt-2"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-sky-200/90 bg-sky-50/90 p-4 dark:border-sky-900/55 dark:bg-sky-950/30">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="enable-popup-on-selection"
                    className="mt-0.5"
                    checked={form.enablePopup}
                    onCheckedChange={(checked) => setForm((p) => ({ ...p, enablePopup: !!checked }))}
                  />
                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="enable-popup-on-selection" className="text-sm font-medium cursor-pointer">
                        Enable popup on selection
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none" aria-label="About popup on selection">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-sm text-sm leading-snug">
                          If someone selects this frequency, do you want a message to show? For example, you can explain an offer: if they switch to another frequency they could save an extra 20%. Use the editor below for that message; it opens as a popup when this frequency is chosen on the booking form.
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {form.enablePopup && (
                      <div className="space-y-4">
                        <RichTextEditor
                          value={form.popupContent}
                          onChange={(v) => setForm((p) => ({ ...p, popupContent: v }))}
                        />

                        <div className="space-y-3 border-t border-sky-200/80 pt-4 dark:border-sky-800/60">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-sm font-medium">Display popup on</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none"
                                  aria-label="About where the popup appears"
                                >
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs text-sm leading-snug">
                                If you don&apos;t need the popup on selection to show on admin/staff but want it on the customer end, you can control that here. If you&apos;d like it for both, you can set that up here too.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <RadioGroup
                            value={form.popupDisplay}
                            onValueChange={(v) =>
                              setForm((p) => ({ ...p, popupDisplay: v as FrequencyPopupDisplay }))
                            }
                            className="grid gap-2"
                          >
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <RadioGroupItem value="customer_frontend_backend_admin" />
                              Customer frontend, backend &amp; admin
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <RadioGroupItem value="customer_backend_admin" />
                              Customer backend &amp; admin
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <RadioGroupItem value="customer_frontend_backend" />
                              Customer only (frontend &amp; backend)
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <RadioGroupItem value="admin_only" />
                              Admin only
                            </label>
                          </RadioGroup>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </TooltipProvider>

              <div className="space-y-2">
                <Label>Display</Label>
                <RadioGroup
                  value={form.display}
                  onValueChange={(v: Row["display"]) => setForm(p => ({ ...p, display: v }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="Both" /> Customer frontend, backend & admin</label>
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="Booking" /> Customer backend & admin</label>
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="Quote" /> Admin only</label>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Set occurrence time <span className="text-red-500">*</span></Label>
                <Select 
                  value={form.occurrenceTime} 
                  onValueChange={(v) => {
                    setForm(p => ({ ...p, occurrenceTime: v }));
                    setTouched(prev => ({ ...prev, occurrenceTime: true }));
                    validateField("occurrenceTime", v);
                  }}
                >
                  <SelectTrigger className={`w-full ${touched.occurrenceTime && errors.occurrenceTime ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onetime">One time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
                {touched.occurrenceTime && errors.occurrenceTime && (
                  <p className="text-sm text-red-500">{errors.occurrenceTime}</p>
                )}
              </div>

              {/* Recurring Frequency Options */}
              {form.occurrenceTime === "recurring" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Frequency repeats every</Label>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </div>
                    <Select 
                      value={form.frequencyRepeats} 
                      onValueChange={(v) => setForm(p => ({ ...p, frequencyRepeats: v }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="daily-no-sat-sun">Daily (No Saturday/Sunday)</SelectItem>
                      <SelectItem value="daily-no-sun">Daily (No Sunday)</SelectItem>
                      <SelectItem value="every-mon-fri">Every Monday & Friday</SelectItem>
                      <SelectItem value="every-mon-wed-fri">Every Monday, Wednesday, Friday</SelectItem>
                      <SelectItem value="every-tue-thu">Every Tuesday And Thursday</SelectItem>
                      <SelectItem value="sat-sun">Saturday & Sunday</SelectItem>
                      <SelectItem value="every-week">Every Week</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="every-tue-wed-fri">Every Tuesday, Wednesday & Friday</SelectItem>
                      <SelectItem value="every-mon-wed">Every Monday & Wednesday</SelectItem>
                      <SelectItem value="every-mon-thu">Every Monday & Thursday</SelectItem>
                      <SelectItem value="every-2-weeks">Every 2 Weeks</SelectItem>
                      <SelectItem value="every-3-weeks">Every 3 Weeks</SelectItem>
                      <SelectItem value="every-4-weeks">Every 4 Weeks</SelectItem>
                      <SelectItem value="every-5-weeks">Every 5 Weeks</SelectItem>
                      <SelectItem value="every-6-weeks">Every 6 Weeks</SelectItem>
                      <SelectItem value="every-7-weeks">Every 7 Weeks</SelectItem>
                      <SelectItem value="every-8-weeks">Every 8 Weeks</SelectItem>
                      <SelectItem value="every-9-weeks">Every 9 Weeks</SelectItem>
                      <SelectItem value="every-10-weeks">Every 10 Weeks</SelectItem>
                      <SelectItem value="every-11-weeks">Every 11 Weeks</SelectItem>
                      <SelectItem value="every-12-weeks">Every 12 Weeks</SelectItem>
                      <SelectItem value="every-24-weeks">Every 24 Weeks</SelectItem>
                    </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label>Shorter job length when the plan is selected?</Label>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </div>
                    <RadioGroup
                      value={form.shorterJobLength}
                      onValueChange={(v: "yes" | "no") => setForm(p => ({ ...p, shorterJobLength: v }))}
                      className="flex gap-4"
                    >
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="yes" /> Yes
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="no" /> No
                      </label>
                    </RadioGroup>
                  </div>

                  {form.shorterJobLength === "yes" && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>By:</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              value={form.shorterJobLengthBy} 
                              onChange={(e) => setForm(p => ({ ...p, shorterJobLengthBy: e.target.value }))}
                              className="w-20"
                              placeholder="0"
                            />
                            <span className="text-sm">% from original one-time length.</span>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="exclude-first" 
                          checked={form.excludeFirstAppointment} 
                          onCheckedChange={(v) => setForm(p => ({ ...p, excludeFirstAppointment: !!v }))} 
                        />
                        <Label htmlFor="exclude-first" className="text-sm">
                          Exclude first appointment and use original one time job length
                        </Label>
                      </div>
                    </>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label>Frequency discount</Label>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </div>
                    <RadioGroup
                      value={form.frequencyDiscount}
                      onValueChange={(v: "all" | "exclude-first") => setForm(p => ({ ...p, frequencyDiscount: v }))}
                      className="flex flex-col gap-2"
                    >
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="all" /> Applicable on all bookings
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="exclude-first" /> Exclude 1st booking and charges as one time
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="charge-one-time" 
                      checked={form.chargeOneTimePrice} 
                      onCheckedChange={(v) => setForm(p => ({ ...p, chargeOneTimePrice: !!v }))} 
                    />
                    <Label htmlFor="charge-one-time" className="text-sm">
                      Charge one time price if cancelled after 1st appointment
                    </Label>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Discount <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="col-span-2 space-y-0">
                  <Input 
                    id="freq-discount" 
                    type="number" 
                    min="0"
                    value={form.discount} 
                    onChange={(e) => {
                      const value = e.target.value;
                      // Prevent negative values by setting to 0 if negative is entered
                      const sanitizedValue = value === "" || Number(value) >= 0 ? value : "0";
                      setForm(p => ({ ...p, discount: sanitizedValue }));
                      if (touched.discount) {
                        validateField("discount", sanitizedValue);
                      }
                    }}
                    onBlur={() => {
                      setTouched(prev => ({ ...prev, discount: true }));
                      validateField("discount", form.discount);
                    }}
                    className={touched.discount && errors.discount ? "border-red-500" : ""}
                  />
                  {touched.discount && errors.discount && (
                    <p className="text-sm text-red-500">{errors.discount}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select value={form.discountType} onValueChange={(v: Row["discountType"]) => setForm(p => ({ ...p, discountType: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="%" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="%">% (Percentage)</SelectItem>
                      <SelectItem value="$">$ (Fixed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="default" checked={form.isDefault} onCheckedChange={(v) => setForm(p => ({ ...p, isDefault: !!v }))} />
                <Label htmlFor="default" className="text-sm">Default</Label>
              </div>
            </TabsContent>

            {/* DEPENDENCIES TAB */}
            <TabsContent value="dependencies" className="mt-4 space-y-6">
              {/* Add to Other Industries */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Would you like to add this frequency to other industries?</Label>
                  <RadioGroup
                    value={form.addToOtherIndustries ? "yes" : "no"}
                    onValueChange={(v) => setForm(p => ({ ...p, addToOtherIndustries: v === "yes" }))}
                    className="mt-3 flex gap-4"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="yes" /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="no" /> No
                    </label>
                  </RadioGroup>
                </div>

                {form.addToOtherIndustries && (
                  <div className="pl-4 border-l-2 border-muted space-y-3">
                    <Label className="text-sm font-medium">Select Industries</Label>
                    {loadingIndustries ? (
                      <p className="text-sm text-muted-foreground italic py-2">
                        Loading industries...
                      </p>
                    ) : industries.filter(ind => ind.name !== industry).length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-2">
                        No other industries available. Add industries from the admin portal first.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {industries.filter(ind => ind.name !== industry).map((ind) => (
                          <div key={ind.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`industry-${ind.id}`}
                              checked={form.enabledIndustries.includes(ind.name)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setForm(p => ({ ...p, enabledIndustries: [...p.enabledIndustries, ind.name] }));
                                } else {
                                  setForm(p => ({ ...p, enabledIndustries: p.enabledIndustries.filter(i => i !== ind.name) }));
                                }
                              }}
                            />
                            <Label htmlFor={`industry-${ind.id}`} className="text-sm cursor-pointer">{ind.name}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-1">{industry}</h3>
                  <p className="text-sm text-muted-foreground">{bookingFormScope === "form2" ? "Form 2" : "Form 1"}</p>
                </div>

                {/* Location-based Display */}
                <div className="space-y-3 mb-6">
                  <Label className="text-base font-semibold">Should the frequency show based on the location?</Label>
                  <p className="text-sm text-muted-foreground">
                    <strong>Yes:</strong> Customer must enter their zip code first. This frequency will only show when their zip matches one of the selected locations below.<br />
                    <strong>No:</strong> Frequency shows everywhere using your general location/service area settings.
                  </p>
                  <RadioGroup
                    value={form.showBasedOnLocation ? "yes" : "no"}
                    onValueChange={(v) => setForm(p => ({ ...p, showBasedOnLocation: v === "yes" }))}
                    className="flex gap-4"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="yes" /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="no" /> No
                    </label>
                  </RadioGroup>
                </div>

                {form.showBasedOnLocation && (
                  <div className="space-y-3 mb-6">
                    <Label className="text-base font-semibold">Locations</Label>
                    {locations.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No locations added yet. Add locations from the Locations section.
                      </p>
                    ) : (
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="select-all-locations"
                            checked={form.locationIds.length === locations.length && locations.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm(p => ({ ...p, locationIds: locations.map(l => l.id) }));
                              } else {
                                setForm(p => ({ ...p, locationIds: [] }));
                              }
                            }}
                          />
                          <Label htmlFor="select-all-locations" className="text-sm font-medium cursor-pointer">Select All</Label>
                        </div>
                        {locations.map((loc) => (
                          <div key={loc.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`location-${loc.id}`}
                              checked={form.locationIds.includes(loc.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setForm(p => ({ ...p, locationIds: [...p.locationIds, loc.id] }));
                                } else {
                                  setForm(p => ({ ...p, locationIds: p.locationIds.filter(id => id !== loc.id) }));
                                }
                              }}
                            />
                            <Label htmlFor={`location-${loc.id}`} className="text-sm cursor-pointer">{loc.name}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Service Category */}
                <div className="space-y-3 mb-6 border p-4 rounded-md bg-white">
                  <Label className="text-base font-semibold">Service Category</Label>
                  {loadingServiceCategories ? (
                    <p className="text-sm text-muted-foreground italic py-2">
                      Loading service categories...
                    </p>
                  ) : serviceCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-2">
                      No service categories found. Add service categories from the Service Categories section.
                    </p>
                  ) : (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all-categories"
                          checked={form.serviceCategories.length === serviceCategories.length && serviceCategories.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, serviceCategories: serviceCategories.map(c => String(c.id)) }));
                            } else {
                              setForm(p => ({ ...p, serviceCategories: [] }));
                            }
                          }}
                        />
                        <Label htmlFor="select-all-categories" className="text-sm font-medium cursor-pointer">Select All</Label>
                      </div>
                      {serviceCategories.map((cat) => (
                        <div key={cat.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`cat-${cat.id}`}
                            checked={form.serviceCategories.includes(String(cat.id))}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm(p => ({ ...p, serviceCategories: [...p.serviceCategories, String(cat.id)] }));
                              } else {
                                setForm(p => ({ ...p, serviceCategories: p.serviceCategories.filter(c => c !== String(cat.id)) }));
                              }
                            }}
                          />
                          <Label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer">{cat.name}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Variables Section */}
                <div className="space-y-4 mb-6 border p-4 rounded-md bg-white">
                  <div>
                    <Label className="text-base font-semibold">Variables</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select which variable(s) will display for this frequency. Any variables that have not been checked off in this section will not display when this frequency is selected on the booking form.
                    </p>
                  </div>

                  {loadingPricingParams ? (
                    <p className="text-sm text-muted-foreground italic">
                      Loading pricing parameters...
                    </p>
                  ) : pricingParameters.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No pricing parameters added yet. Add pricing parameters from the Pricing section.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {/* Group parameters by category */}
                      {['Bathroom', 'Sq Ft', 'Bedroom'].map(category => {
                        const categoryParams = pricingParameters.filter(v => v.variable_category === category);
                        if (categoryParams.length === 0) return null;
                        
                        return (
                          <div key={category} className="space-y-2">
                            <Label className="text-sm font-semibold">{category}</Label>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`select-all-${category.toLowerCase()}`}
                                checked={
                                  category === 'Bathroom' ? form.bathroomVariables.length === categoryParams.length && categoryParams.length > 0 :
                                  category === 'Sq Ft' ? form.sqftVariables.length === categoryParams.length && categoryParams.length > 0 :
                                  form.bedroomVariables.length === categoryParams.length && categoryParams.length > 0
                                }
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    if (category === 'Bathroom') {
                                      setForm(p => ({ ...p, bathroomVariables: categoryParams.map(v => v.name) }));
                                    } else if (category === 'Sq Ft') {
                                      setForm(p => ({ ...p, sqftVariables: categoryParams.map(v => v.name) }));
                                    } else {
                                      setForm(p => ({ ...p, bedroomVariables: categoryParams.map(v => v.name) }));
                                    }
                                  } else {
                                    if (category === 'Bathroom') {
                                      setForm(p => ({ ...p, bathroomVariables: [] }));
                                    } else if (category === 'Sq Ft') {
                                      setForm(p => ({ ...p, sqftVariables: [] }));
                                    } else {
                                      setForm(p => ({ ...p, bedroomVariables: [] }));
                                    }
                                  }
                                }}
                              />
                              <Label htmlFor={`select-all-${category.toLowerCase()}`} className="text-sm font-medium cursor-pointer">Select All</Label>
                            </div>
                            <div className="grid grid-cols-8 gap-2">
                              {categoryParams.map((param) => (
                                <div key={param.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`param-${param.id}`}
                                    checked={
                                      category === 'Bathroom' ? form.bathroomVariables.includes(param.name) :
                                      category === 'Sq Ft' ? form.sqftVariables.includes(param.name) :
                                      form.bedroomVariables.includes(param.name)
                                    }
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        if (category === 'Bathroom') {
                                          setForm(p => ({ ...p, bathroomVariables: [...p.bathroomVariables, param.name] }));
                                        } else if (category === 'Sq Ft') {
                                          setForm(p => ({ ...p, sqftVariables: [...p.sqftVariables, param.name] }));
                                        } else {
                                          setForm(p => ({ ...p, bedroomVariables: [...p.bedroomVariables, param.name] }));
                                        }
                                      } else {
                                        if (category === 'Bathroom') {
                                          setForm(p => ({ ...p, bathroomVariables: p.bathroomVariables.filter(v => v !== param.name) }));
                                        } else if (category === 'Sq Ft') {
                                          setForm(p => ({ ...p, sqftVariables: p.sqftVariables.filter(v => v !== param.name) }));
                                        } else {
                                          setForm(p => ({ ...p, bedroomVariables: p.bedroomVariables.filter(v => v !== param.name) }));
                                        }
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`param-${param.id}`} className="text-sm cursor-pointer">{param.name}</Label>
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
                <div className="space-y-3 mb-6 border p-4 rounded-md bg-white">
                  <Label className="text-base font-semibold">Exclude Parameters</Label>
                  <p className="text-sm text-muted-foreground">
                    Select which exclusion parameter(s) will display for this frequency. Any exclusion parameters that have not been checked off in this section will not display when this frequency is selected on the booking form.
                  </p>
                  {loadingExcludeParams ? (
                    <p className="text-sm text-muted-foreground italic py-2">
                      Loading exclude parameters...
                    </p>
                  ) : excludeParameters.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-2">
                      No exclude parameters found. Add exclude parameters from the Pricing Parameters section.
                    </p>
                  ) : (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all-exclude"
                          checked={form.excludeParameters.length === excludeParameters.length && excludeParameters.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, excludeParameters: excludeParameters.map(param => param.name) }));
                            } else {
                              setForm(p => ({ ...p, excludeParameters: [] }));
                            }
                          }}
                        />
                        <Label htmlFor="select-all-exclude" className="text-sm font-medium cursor-pointer">Select All</Label>
                      </div>
                      {excludeParameters.map((param) => (
                        <div key={param.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`exclude-${param.id}`}
                            checked={form.excludeParameters.includes(param.name)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm(p => ({ ...p, excludeParameters: [...p.excludeParameters, param.name] }));
                              } else {
                                setForm(p => ({ ...p, excludeParameters: p.excludeParameters.filter(e => e !== param.name) }));
                              }
                            }}
                          />
                          <Label htmlFor={`exclude-${param.id}`} className="text-sm cursor-pointer">{param.name}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form 2 Add-ons */}
                {bookingFormScope === "form2" && (
                  <div className="space-y-3 mb-6 border p-4 rounded-md bg-white">
                    <Label className="text-base font-semibold">Add-ons</Label>
                    <p className="text-sm text-muted-foreground">
                      Select which add-on(s) will display for this frequency.
                    </p>
                    {loadingExtras ? (
                      <p className="text-sm text-muted-foreground italic">Loading add-ons...</p>
                    ) : form2AddonRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No add-ons added yet. Add add-ons from the Add-ons section.
                      </p>
                    ) : (
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="select-all-addons"
                            checked={form2AddonRows.every((addon) => form.extras.includes(String(addon.id)))}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm((p) => ({
                                  ...p,
                                  extras: Array.from(new Set([...p.extras, ...form2AddonRows.map((e) => String(e.id))])),
                                }));
                              } else {
                                const addonIds = new Set(form2AddonRows.map((e) => String(e.id)));
                                setForm((p) => ({ ...p, extras: p.extras.filter((id) => !addonIds.has(id)) }));
                              }
                            }}
                          />
                          <Label htmlFor="select-all-addons" className="text-sm font-medium cursor-pointer">Select All</Label>
                        </div>
                        {form2AddonRows.map((addon) => (
                          <div key={addon.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`addon-${addon.id}`}
                              checked={form.extras.includes(String(addon.id))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setForm((p) => ({ ...p, extras: [...p.extras, String(addon.id)] }));
                                } else {
                                  setForm((p) => ({ ...p, extras: p.extras.filter((e) => e !== String(addon.id)) }));
                                }
                              }}
                            />
                            <Label htmlFor={`addon-${addon.id}`} className="text-sm cursor-pointer">{addon.name}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Extras */}
                <div className="space-y-3 mb-6 border p-4 rounded-md bg-white">
                  <Label className="text-base font-semibold">Extras</Label>
                  <p className="text-sm text-muted-foreground">
                    Select which extra(s) will display for frequency. Any extras that have not been checked off in this section will not display when frequency is selected on the booking form.
                  </p>
                  {loadingExtras ? (
                    <p className="text-sm text-muted-foreground italic">
                      Loading extras...
                    </p>
                  ) : (bookingFormScope === "form2" ? form2ExtraRows.length === 0 : extras.length === 0) ? (
                    <p className="text-sm text-muted-foreground italic">
                      No extras added yet. Add extras from the Extras section.
                    </p>
                  ) : (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all-extras"
                          checked={
                            bookingFormScope === "form2"
                              ? form2ExtraRows.length > 0 &&
                                form2ExtraRows.every((extra) => form.extras.includes(String(extra.id)))
                              : form.extras.length === extras.length && extras.length > 0
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              if (bookingFormScope === "form2") {
                                setForm((p) => ({
                                  ...p,
                                  extras: Array.from(new Set([...p.extras, ...form2ExtraRows.map((e) => String(e.id))])),
                                }));
                              } else {
                                setForm(p => ({ ...p, extras: extras.map(e => String(e.id)) }));
                              }
                            } else {
                              if (bookingFormScope === "form2") {
                                const extraIds = new Set(form2ExtraRows.map((e) => String(e.id)));
                                setForm((p) => ({ ...p, extras: p.extras.filter((id) => !extraIds.has(id)) }));
                              } else {
                                setForm(p => ({ ...p, extras: [] }));
                              }
                            }
                          }}
                        />
                        <Label htmlFor="select-all-extras" className="text-sm font-medium cursor-pointer">Select All</Label>
                      </div>
                      {(bookingFormScope === "form2" ? form2ExtraRows : extras).map((extra) => (
                        <div key={extra.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`extra-${extra.id}`}
                            checked={form.extras.includes(String(extra.id))}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm(p => ({ ...p, extras: [...p.extras, String(extra.id)] }));
                              } else {
                                setForm(p => ({ ...p, extras: p.extras.filter(e => e !== String(extra.id)) }));
                              }
                            }}
                          />
                          <Label htmlFor={`extra-${extra.id}`} className="text-sm cursor-pointer">{extra.name}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* PROVIDERS TAB */}
            <TabsContent value="providers" className="mt-4 space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">Providers</Label>
                <p className="text-sm text-muted-foreground">
                  Check the providers you want to exclude from this frequency.
                </p>
                
                {loadingProviders ? (
                  <p className="text-sm text-muted-foreground italic">
                    Loading providers...
                  </p>
                ) : providers.length === 0 ? (
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
              onClick={() =>
                router.push(
                  `/admin/settings/industries/form-1/frequencies?industry=${encodeURIComponent(industry)}${industryId ? `&industryId=${industryId}` : ""}${scopeQs}`,
                )
              }
            >
              Cancel
            </Button>
            <Button onClick={save} className="text-white" style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}>{editId ? "Save" : "Create"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
