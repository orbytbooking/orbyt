"use client";

import { supabase } from '@/lib/supabaseClient';
import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { serviceCategoriesService, ServiceCategory } from '@/lib/serviceCategories';
import { getFrequencyDependencies } from '@/lib/frequencyFilter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Minus, Search, X, User, Shirt, Sofa, Droplets, Wind, Trash2, Flower2, Flame, Warehouse, Paintbrush } from "lucide-react";
import Image from "next/image";
import { useBusiness } from "@/contexts/BusinessContext";

type Extra = {
  id: string;
  name: string;
  icon?: string;
  time: number; // in minutes
  serviceCategory: string;
  price: number;
  display: "frontend-backend-admin" | "backend-admin" | "admin-only" | "Both" | "Booking" | "Quote"; // Support legacy values
  qtyBased: boolean;
  maximumQuantity?: number;
  exemptFromDiscount?: boolean;
  description?: string;
  serviceChecklists?: string[];
};

type FrequencyRow = {
  id: string;
  name: string;
  display: "Both" | "Booking" | "Quote";
  isDefault?: boolean;
  discount?: number;
  discountType?: "%" | "$";
};

type Provider = {
  id: string;
  name: string;
  available: boolean;
  rating?: number;
  specialties?: string[];
  wage?: number;
  wageType?: 'percentage' | 'fixed' | 'hourly';
};

type ProviderWithWage = Provider & {
  tempWage?: number;
  tempWageType?: 'percentage' | 'fixed' | 'hourly';
};

type PricingParameter = {
  id: string;
  name: string;
  price: number;
  time_minutes: number;
  display: string;
  service_category: string;
  frequency: string;
  variable_category: string;
  description: string;
  is_default: boolean;
  show_based_on_frequency: boolean;
  show_based_on_service_category: boolean;
  excluded_extras: string[];
  excluded_services: string[];
  sort_order: number;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  joinDate?: string;
  totalBookings?: number;
  totalSpent?: string;
  status?: string;
  lastBooking?: string;
};

const INDUSTRY_NAME = "Home Cleaning";
const FALLBACK_INDUSTRY_NAME = "Industry";

const createEmptyBookingForm = () => ({
  customerType: "new",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  service: "",
  duration: "02",
  durationUnit: "Hours",
  frequency: "",
  selectedExtras: [] as string[],
  extraQuantities: {} as Record<string, number>,
  excludeQuantities: {} as Record<string, number>,
  privateBookingNotes: [] as string[],
  privateCustomerNotes: [] as string[],
  serviceProviderNotes: [] as string[],
  privateBookingNote: "",
  privateCustomerNote: "",
  serviceProviderNote: "",
  notifyMoreTime: false,
  zipCode: "",
  serviceProvider: "",
  waitingList: false,
  scheduleType: "From Schedule",
  selectedDate: "",
  selectedTime: "",
  priority: "Medium",
  paymentMethod: "",
  notes: "",
  adjustServiceTotal: false,
  adjustPrice: false,
  excludeCancellationFee: false,
  excludeMinimumFee: false,
  excludeCustomerNotification: false,
  excludeProviderNotification: false,
});

function AddBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const [newBooking, setNewBooking] = useState(createEmptyBookingForm());
  const [errors, setErrors] = useState({
    firstName: false,
    lastName: false,
    email: false,
    service: false,
    selectedDate: false,
    selectedTime: false,
  });
  const [frequencies, setFrequencies] = useState<FrequencyRow[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [allExtras, setAllExtras] = useState<Extra[]>([]);
  const [pricingParameters, setPricingParameters] = useState<PricingParameter[]>([]);
  const [variableCategories, setVariableCategories] = useState<string[]>([]);
  const [categoryValues, setCategoryValues] = useState<Record<string, string>>({});
  const [isPartialCleaning, setIsPartialCleaning] = useState(false);
  const [excludeParameters, setExcludeParameters] = useState<any[]>([]);
  const [selectedExcludeParams, setSelectedExcludeParams] = useState<string[]>([]);
  const [frequencyDependencies, setFrequencyDependencies] = useState<any>(null);
  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showPrivateBookingNote, setShowPrivateBookingNote] = useState(false);
  const [showPrivateCustomerNote, setShowPrivateCustomerNote] = useState(false);
  const [showServiceProviderNote, setShowServiceProviderNote] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  const [showAllProvidersModal, setShowAllProvidersModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [providerWage, setProviderWage] = useState<string>('');
  const [providerWageType, setProviderWageType] = useState<'percentage' | 'fixed' | 'hourly'>('hourly');
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);

  // Load frequencies from API
  useEffect(() => {
    const fetchFrequencies = async () => {
      if (!currentBusiness) return;
      
      try {
        // First get the industry ID for Home Cleaning
        const industriesResponse = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const industriesData = await industriesResponse.json();
        
        if (!industriesResponse.ok || !industriesData.industries) {
          console.error('Failed to fetch industries:', industriesData.error);
          return;
        }
        
        const currentIndustry = industriesData.industries.find((ind: any) => ind.name === INDUSTRY_NAME);
        
        if (!currentIndustry) {
          console.log('Home Cleaning industry not found, checking for fallback industry');
          const fallbackIndustry = industriesData.industries.find((ind: any) => ind.name === FALLBACK_INDUSTRY_NAME);
          
          if (!fallbackIndustry) {
            console.log('No suitable industry found');
            return;
          }
          
          // Use fallback industry
          const frequenciesResponse = await fetch(`/api/industry-frequency?industryId=${fallbackIndustry.id}`);
          const frequenciesData = await frequenciesResponse.json();
          
          if (frequenciesResponse.ok && frequenciesData.frequencies) {
            const visibleFrequencies = frequenciesData.frequencies.filter(
              (f: any) => f && (f.display === "Both" || f.display === "Booking")
            );
            
            if (visibleFrequencies.length > 0) {
              setFrequencies(visibleFrequencies);
              
              const defaultFrequency = visibleFrequencies.find((f: any) => f.isDefault) || visibleFrequencies[0];
              if (defaultFrequency) {
                setNewBooking(prev => 
                  prev.frequency ? prev : { ...prev, frequency: defaultFrequency.name }
                );
              }
            }
          }
        } else {
          // Use Home Cleaning industry
          const frequenciesResponse = await fetch(`/api/industry-frequency?industryId=${currentIndustry.id}`);
          const frequenciesData = await frequenciesResponse.json();
          
          if (frequenciesResponse.ok && frequenciesData.frequencies) {
            const visibleFrequencies = frequenciesData.frequencies.filter(
              (f: any) => f && (f.display === "Both" || f.display === "Booking")
            );
            
            if (visibleFrequencies.length > 0) {
              setFrequencies(visibleFrequencies);
              
              const defaultFrequency = visibleFrequencies.find((f: any) => f.isDefault) || visibleFrequencies[0];
              if (defaultFrequency) {
                setNewBooking(prev => 
                  prev.frequency ? prev : { ...prev, frequency: defaultFrequency.name }
                );
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading frequencies:', error);
      }
    };

    fetchFrequencies();
  }, [currentBusiness]);

  // Load frequency dependencies when frequency changes
  useEffect(() => {
    const fetchFrequencyDependencies = async () => {
      if (!currentBusiness || !newBooking.frequency) {
        setFrequencyDependencies(null);
        return;
      }
      
      try {
        // Get the industry ID for Home Cleaning
        const industriesResponse = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const industriesData = await industriesResponse.json();
        
        if (!industriesResponse.ok || !industriesData.industries) {
          console.error('Failed to fetch industries:', industriesData.error);
          return;
        }
        
        const currentIndustry = industriesData.industries.find((ind: any) => ind.name === INDUSTRY_NAME);
        
        if (!currentIndustry) {
          console.log('Home Cleaning industry not found, checking for fallback industry');
          const fallbackIndustry = industriesData.industries.find((ind: any) => ind.name === FALLBACK_INDUSTRY_NAME);
          
          if (!fallbackIndustry) {
            console.log('No suitable industry found for frequency dependencies');
            return;
          }
          
          const dependencies = await getFrequencyDependencies(fallbackIndustry.id, newBooking.frequency);
          setFrequencyDependencies(dependencies);
        } else {
          const dependencies = await getFrequencyDependencies(currentIndustry.id, newBooking.frequency);
          setFrequencyDependencies(dependencies);
        }
      } catch (error) {
        console.error('Error loading frequency dependencies:', error);
        setFrequencyDependencies(null);
      }
    };

    fetchFrequencyDependencies();
  }, [currentBusiness, newBooking.frequency]);

  // Update exclude parameters when frequency dependencies change
  useEffect(() => {
    const updateExcludeParameters = async () => {
      if (!currentBusiness) return;
      
      try {
        // Get the industry ID for Home Cleaning
        const industriesResponse = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const industriesData = await industriesResponse.json();
        
        if (!industriesResponse.ok || !industriesData.industries) {
          console.error('Failed to fetch industries:', industriesData.error);
          return;
        }
        
        const currentIndustry = industriesData.industries.find((ind: any) => ind.name === INDUSTRY_NAME);
        
        if (!currentIndustry) {
          console.log('Home Cleaning industry not found, checking for fallback industry');
          const fallbackIndustry = industriesData.industries.find((ind: any) => ind.name === FALLBACK_INDUSTRY_NAME);
          
          if (!fallbackIndustry) {
            console.log('No suitable industry found for exclude parameters');
            return;
          }
          
          // Fetch exclude parameters
          const excludeResponse = await fetch(`/api/exclude-parameters?industryId=${fallbackIndustry.id}`);
          const excludeData = await excludeResponse.json();
          
          if (excludeData.excludeParameters) {
            // Apply frequency dependency filter if frequency is selected
            if (frequencyDependencies && frequencyDependencies.excludeParameters && frequencyDependencies.excludeParameters.length > 0) {
              const filteredExcludeParams = excludeData.excludeParameters.filter((param: any) => 
                frequencyDependencies.excludeParameters.includes(param.name)
              );
              setExcludeParameters(filteredExcludeParams);
            } else {
              // If no frequency dependencies or no exclude parameters selected, show none
              setExcludeParameters([]);
            }
          }
        } else {
          // Fetch exclude parameters
          const excludeResponse = await fetch(`/api/exclude-parameters?industryId=${currentIndustry.id}`);
          const excludeData = await excludeResponse.json();
          
          if (excludeData.excludeParameters) {
            // Apply frequency dependency filter if frequency is selected
            if (frequencyDependencies && frequencyDependencies.excludeParameters && frequencyDependencies.excludeParameters.length > 0) {
              const filteredExcludeParams = excludeData.excludeParameters.filter((param: any) => 
                frequencyDependencies.excludeParameters.includes(param.name)
              );
              setExcludeParameters(filteredExcludeParams);
            } else {
              // If no frequency dependencies or no exclude parameters selected, show none
              setExcludeParameters([]);
            }
          }
        }
      } catch (error) {
        console.error('Error updating exclude parameters:', error);
        setExcludeParameters([]);
      }
    };

    updateExcludeParameters();
  }, [frequencyDependencies, currentBusiness]);

  // Load extras from API (initial load only - no filtering)
  useEffect(() => {
    const fetchExtras = async () => {
      if (!currentBusiness) return;
      
      try {
        // First get the industry ID for Home Cleaning
        const industriesResponse = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const industriesData = await industriesResponse.json();
        
        if (!industriesResponse.ok || !industriesData.industries) {
          console.error('Failed to fetch industries:', industriesData.error);
          return;
        }
        
        const currentIndustry = industriesData.industries.find((ind: any) => ind.name === INDUSTRY_NAME);
        
        if (!currentIndustry) {
          console.log('Home Cleaning industry not found, checking for fallback industry');
          const fallbackIndustry = industriesData.industries.find((ind: any) => ind.name === FALLBACK_INDUSTRY_NAME);
          
          if (!fallbackIndustry) {
            console.log('No suitable industry found for extras');
            return;
          }
          
          // Use fallback industry
          const extrasResponse = await fetch(`/api/extras?industryId=${fallbackIndustry.id}`);
          const extrasData = await extrasResponse.json();
          
          if (extrasResponse.ok && extrasData.extras) {
            const visibleExtras = extrasData.extras.filter(
              (e: any) => e && (e.display === "frontend-backend-admin" || e.display === "Both" || e.display === "Booking")
            );
            
            // Convert database format to form format (no filtering here - service-specific useEffect handles it)
            const formattedExtras = visibleExtras.map((e: any) => ({
              id: e.id,
              name: e.name,
              time: e.time_minutes,
              serviceCategory: e.service_category || '',
              price: e.price,
              display: e.display,
              qtyBased: e.qty_based,
              maximumQuantity: e.maximum_quantity,
              exemptFromDiscount: e.exempt_from_discount,
              description: e.description,
              serviceChecklists: []
            }));
            
            console.log('=== EXTRAS DEBUG (FALLBACK) ===');
            console.log('Raw extras data:', visibleExtras);
            console.log('Formatted extras:', formattedExtras);
            console.log('qtyBased values:', formattedExtras.map(extra => ({ name: extra.name, qtyBased: extra.qtyBased })));
            
            setAllExtras(formattedExtras);
            // Don't set extras here - let the filtering useEffect handle it
          }
        } else {
          // Use Home Cleaning industry
          const extrasResponse = await fetch(`/api/extras?industryId=${currentIndustry.id}`);
          const extrasData = await extrasResponse.json();
          
          if (extrasResponse.ok && extrasData.extras) {
            const visibleExtras = extrasData.extras.filter(
              (e: any) => e && (e.display === "frontend-backend-admin" || e.display === "Both" || e.display === "Booking")
            );
            
            // Convert database format to form format (no filtering here - service-specific useEffect handles it)
            const formattedExtras = visibleExtras.map((e: any) => ({
              id: e.id,
              name: e.name,
              time: e.time_minutes,
              serviceCategory: e.service_category || '',
              price: e.price,
              display: e.display,
              qtyBased: e.qty_based,
              maximumQuantity: e.maximum_quantity,
              exemptFromDiscount: e.exempt_from_discount,
              description: e.description,
              serviceChecklists: []
            }));
            
            console.log('=== EXTRAS DEBUG (MAIN) ===');
            console.log('Raw extras data:', visibleExtras);
            console.log('Formatted extras:', formattedExtras);
            console.log('qtyBased values:', formattedExtras.map(extra => ({ name: extra.name, qtyBased: extra.qtyBased })));
            
            setAllExtras(formattedExtras);
            // Don't set extras here - let the filtering useEffect handle it
          }
        }
      } catch (error) {
        console.error('Error loading extras:', error);
      }
    };

    fetchExtras();
  }, [currentBusiness]);

  // Update service categories when frequency dependencies change
  useEffect(() => {
    const updateServiceCategories = async () => {
      if (!currentBusiness) return;
      
      try {
        // Get the industry ID for Home Cleaning
        const industriesResponse = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const industriesData = await industriesResponse.json();
        
        if (!industriesResponse.ok || !industriesData.industries) {
          console.error('Failed to fetch industries:', industriesData.error);
          return;
        }
        
        const currentIndustry = industriesData.industries.find((ind: any) => ind.name === INDUSTRY_NAME);
        
        if (!currentIndustry) {
          console.log('Home Cleaning industry not found, checking for fallback industry');
          const fallbackIndustry = industriesData.industries.find((ind: any) => ind.name === FALLBACK_INDUSTRY_NAME);
          
          if (!fallbackIndustry) {
            console.log('No suitable industry found for service categories');
            return;
          }
          
          // Fetch service categories
          const categories = await serviceCategoriesService.getServiceCategoriesByIndustry(fallbackIndustry.id);
          // Apply frequency dependency filter if frequency is selected
          let filteredCategories = categories;
          // Don't filter by frequency here - let users see all services first
          // Frequency filtering will happen in the frequency section based on selected service
          
          console.log('=== ADMIN BOOKING DEBUG ===');
          console.log('Fetched categories:', categories);
          console.log('Selected frequency:', newBooking.frequency);
          console.log('All categories with frequency settings:', categories.map(cat => ({
            name: cat.name,
            service_category_frequency: cat.service_category_frequency,
            selected_frequencies: cat.selected_frequencies
          })));
          
          console.log('Filtered categories:', filteredCategories);
          setServiceCategories(filteredCategories);
        } else {
          // Fetch service categories
          const categories = await serviceCategoriesService.getServiceCategoriesByIndustry(currentIndustry.id);
          console.log('=== ADMIN BOOKING DEBUG (CURRENT INDUSTRY) ===');
          console.log('Fetched categories:', categories);
          console.log('Selected frequency:', newBooking.frequency);
          console.log('All categories with frequency settings:', categories.map(cat => ({
            name: cat.name,
            service_category_frequency: cat.service_category_frequency,
            selected_frequencies: cat.selected_frequencies
          })));
          
          // Apply frequency dependency filter if frequency is selected
          let filteredCategories = categories;
          // Don't filter by frequency here - let users see all services first
          // Frequency filtering will happen in the frequency section based on selected service
          
          console.log('Filtered categories:', filteredCategories);
          setServiceCategories(filteredCategories);
        }
      } catch (error) {
        console.error('Error updating service categories:', error);
        setServiceCategories([]);
      }
    };

    updateServiceCategories();
  }, [frequencyDependencies, currentBusiness]);

  // Debug extras rendering
  useEffect(() => {
    if (extras.length > 0) {
      console.log('=== RENDERING EXTRAS ===');
      console.log('Extras to render:', extras);
      console.log('Extras qtyBased values:', extras.map(extra => ({ name: extra.name, qtyBased: extra.qtyBased })));
    }
  }, [extras]);

  // Filter extras based on service category and frequency dependencies
  useEffect(() => {
    const filterExtras = () => {
      console.log('=== EXTRAS FILTERING DEBUG ===');
      console.log('allExtras length:', allExtras?.length);
      console.log('allExtras:', allExtras);
      console.log('newBooking.service:', newBooking.service);
      console.log('serviceCategories length:', serviceCategories?.length);
      console.log('frequencyDependencies:', frequencyDependencies);
      
      if (!currentBusiness || allExtras.length === 0) {
        console.log('❌ No business or no extras available');
        setExtras([]);
        return;
      }
      
      // Start with all extras
      let filteredExtras = [...allExtras];
      console.log('Starting with all extras:', filteredExtras.length);
      
      // First, apply service category filtering if a service is selected
      if (newBooking.service) {
        console.log('🔍 Service selected, applying service category filtering...');
        console.log('Available service categories:', serviceCategories.map(cat => ({ name: cat.name, extras: cat.extras })));
        
        const selectedServiceCategory = serviceCategories.find(cat => cat.name === newBooking.service);
        console.log('Selected service category:', selectedServiceCategory);
        console.log('Looking for service name:', `"${newBooking.service}"`);
        
        if (selectedServiceCategory) {
          console.log('✅ Service category found!');
          console.log('Service category extras:', selectedServiceCategory.extras);
          console.log('Service category extras type:', typeof selectedServiceCategory.extras);
          console.log('Service category extras length:', selectedServiceCategory.extras?.length);
          
          if (selectedServiceCategory.extras && selectedServiceCategory.extras.length > 0) {
            console.log('✅ Service category has extras configured:', selectedServiceCategory.extras);
            console.log('Service category extras types:', selectedServiceCategory.extras.map(id => ({ id, type: typeof id })));
            console.log('Available extra IDs:', allExtras.map(e => ({ id: e.id, name: e.name, type: typeof e.id })));
            
            filteredExtras = filteredExtras.filter((e: any) => {
              // Check if extras array contains strings or numbers and match accordingly
              const extraId = String(e.id);
              const matches = selectedServiceCategory.extras.some((extraId: any) => {
                const serviceExtraId = String(extraId);
                return serviceExtraId === extraId;
              });
              
              console.log(`Extra ${e.name} (ID: ${e.id}, type: ${typeof e.id}):`);
              console.log(`  Match result:`, matches);
              
              return matches;
            });
            console.log('After service category filtering:', filteredExtras.length);
          } else {
            console.log('❌ Service category has no extras configured, hiding all extras');
            console.log('extras field:', selectedServiceCategory.extras);
            console.log('extras field type:', typeof selectedServiceCategory.extras);
            console.log('extras field length:', selectedServiceCategory.extras?.length);
            filteredExtras = [];
          }
        } else {
          console.log('⚠️ Service category not found for name:', newBooking.service);
          console.log('Available service names:', serviceCategories.map(cat => cat.name));
        }
      } else {
        console.log('ℹ️ No service selected, showing all extras');
      }
      
      // Then, apply frequency dependency filter if frequency is selected
      if (frequencyDependencies && frequencyDependencies.extras && frequencyDependencies.extras.length > 0) {
        console.log('🔍 Applying frequency dependency filtering...');
        console.log('Frequency extras:', frequencyDependencies.extras);
        filteredExtras = filteredExtras.filter((e: any) => 
          frequencyDependencies.extras.includes(String(e.id))
        );
        console.log('After frequency filtering:', filteredExtras.length);
      } else {
        console.log('ℹ️ No frequency dependencies to apply');
      }
      
      console.log('✅ Final filtered extras:', filteredExtras.length);
      console.log('Final extras:', filteredExtras);
      setExtras(filteredExtras);
      console.log('=== END EXTRAS FILTERING DEBUG ===');
    };

    filterExtras();
  }, [newBooking.service, serviceCategories, frequencyDependencies, allExtras]);

  // Load providers from API
  useEffect(() => {
    const fetchProviders = async () => {
      if (!currentBusiness?.id) {
        setAllProviders([]);
        return;
      }
      
      try {
        const response = await fetch(`/api/admin/providers?businessId=${currentBusiness.id}`);
        const data = await response.json();
        
        if (response.ok && data.providers) {
          setAllProviders(data.providers.map((p: any) => ({
            id: p.id,
            name: p.name,
            available: true, // Default to available, can be updated from database
            rating: p.rating || 0,
            specialties: p.specialties || [],
            wage: p.wage || 0,
            wageType: p.wageType || 'hourly'
          })));
        }
      } catch (error) {
        console.error('Error loading providers:', error);
        setAllProviders([]);
      }
    };

    fetchProviders();
  }, [currentBusiness]);

  // Load customers from API
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!currentBusiness) {
        setCustomers([]);
        return;
      }
      
      try {
        const response = await fetch(`/api/customers?business_id=${currentBusiness.id}`);
        const data = await response.json();
        
        if (response.ok && data.data) {
          setCustomers(data.data);
        }
      } catch (error) {
        console.error('Error loading customers:', error);
        setCustomers([]);
      }
    };

    fetchCustomers();
  }, [currentBusiness]);

  // Load pricing parameters and service categories from database
  useEffect(() => {
    const fetchPricingParameters = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (!business) return;

        const industriesResponse = await fetch(`/api/industries?business_id=${business.id}`);
        const industriesData = await industriesResponse.json();
        const currentIndustry = industriesData.industries?.find((ind: any) => ind.name === INDUSTRY_NAME);
        
        if (!currentIndustry) return;

        const pricingResponse = await fetch(`/api/pricing-parameters?industryId=${currentIndustry.id}`);
        const pricingData = await pricingResponse.json();
        
        if (pricingData.pricingParameters) {
          setPricingParameters(pricingData.pricingParameters);
          
          // Extract unique variable categories
          const categories = Array.from(
            new Set(pricingData.pricingParameters.map((p: PricingParameter) => p.variable_category))
          ).filter(Boolean) as string[];
          
          setVariableCategories(categories);
          
          // Initialize category values
          const initialValues: Record<string, string> = {};
          categories.forEach(cat => {
            initialValues[cat] = '';
          });
          setCategoryValues(initialValues);
        }

        // Fetch exclude parameters
        const excludeResponse = await fetch(`/api/exclude-parameters?industryId=${currentIndustry.id}`);
        const excludeData = await excludeResponse.json();
        
        if (excludeData.excludeParameters) {
          // Apply frequency dependency filter if frequency is selected
          if (frequencyDependencies && frequencyDependencies.excludeParameters && frequencyDependencies.excludeParameters.length > 0) {
            const filteredExcludeParams = excludeData.excludeParameters.filter((param: any) => 
              frequencyDependencies.excludeParameters.includes(param.name)
            );
            setExcludeParameters(filteredExcludeParams);
          } else {
            // If no frequency dependencies or no exclude parameters selected, show none
            setExcludeParameters([]);
          }
        }

        // Fetch service categories
        const categories = await serviceCategoriesService.getServiceCategoriesByIndustry(currentIndustry.id);
        
        // Apply frequency dependency filter if frequency is selected
        let filteredCategories = categories;
        if (frequencyDependencies && frequencyDependencies.serviceCategories && frequencyDependencies.serviceCategories.length > 0) {
          filteredCategories = categories.filter((category: ServiceCategory) => 
            frequencyDependencies.serviceCategories.includes(String(category.id))
          );
        } else {
          // If no frequency dependencies or no service categories selected, show none
          filteredCategories = [];
        }
        
        setServiceCategories(filteredCategories);
      } catch (error) {
        console.error('Error loading pricing parameters:', error);
      }
    };

    fetchPricingParameters();
  }, []);

  // Handle query parameters for pre-filling customer information
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    const customerName = searchParams.get('customerName');
    const customerEmail = searchParams.get('customerEmail');
    
    if (customerId && customerName && customerEmail) {
      const nameParts = customerName.split(' ');
      setNewBooking(prev => ({
        ...prev,
        customerType: 'existing',
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: customerEmail
      }));
    }
  }, [searchParams]);

  // Handle customer search
  const handleCustomerSearch = (search: string) => {
    setCustomerSearch(search);
    if (search.trim() === "") {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
      return;
    }
    
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.email.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredCustomers(filtered);
    setShowCustomerDropdown(true);
  };

  // Handle customer selection
  const selectCustomer = (customer: Customer) => {
    const nameParts = customer.name.split(' ');
    setNewBooking(prev => ({
      ...prev,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: customer.email,
      phone: customer.phone || ''
    }));
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    setFilteredCustomers([]);
  };



const handleAddBooking = async (status: string = 'pending') => {
  // Validate required fields
  const nextErrors = {
    firstName: !newBooking.firstName.trim(),
    lastName: !newBooking.lastName.trim(),
    email: !newBooking.email.trim(),
    service: !newBooking.service.trim(),
    selectedDate: !newBooking.selectedDate.trim(),
    selectedTime: !newBooking.selectedTime.trim(),
  };

  const hasError = Object.values(nextErrors).some(Boolean);
  setErrors(nextErrors);

  if (hasError) {
    toast({
      title: "Error",
      description: "Please fill in all required fields",
      variant: "destructive",
    });
    return;
  }

  const customerName = `${newBooking.firstName} ${newBooking.lastName}`.trim();
  const customerEmail = newBooking.email.trim();
  const customerPhone = newBooking.phone.trim();

  try {
    // Get current user and their business
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to create bookings',
        variant: 'destructive',
      });
      return;
    }

    // Get the user's business (assuming they have one)
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (businessError || !business) {
      toast({
        title: 'Business Error',
        description: 'No business found for this user',
        variant: 'destructive',
      });
      return;
    }

    // Insert booking using the API endpoint
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-business-id': business.id,
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        service: newBooking.service,
        date: newBooking.selectedDate,
        time: newBooking.selectedTime,
        status: status,
        amount: 0,
        payment_method: newBooking.paymentMethod || null,
        notes: newBooking.notes,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Booking insertion error:', result);
      toast({
        title: 'Error',
        description: `Failed to add booking: ${result.error || 'Unknown error'}`,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Booking Added',
      description: `New booking created for ${customerName}`,
    });

    setTimeout(() => {
      router.push('/admin/bookings');
    }, 100);
  } catch (error) {
    console.error('Unexpected error:', error);
    toast({
      title: 'Error',
      description: 'An unexpected error occurred while creating the booking',
      variant: 'destructive',
    });
  }
};

  const handleCancel = () => {
    router.push("/admin/bookings");
  };

  const handleAddPrivateBookingNote = () => {
    if (newBooking.privateBookingNote.trim()) {
      setNewBooking(prev => ({
        ...prev,
        privateBookingNotes: [...prev.privateBookingNotes, prev.privateBookingNote],
        privateBookingNote: ""
      }));
      toast({
        title: "Note Added",
        description: "Private booking note has been added.",
      });
    }
  };

  const handleAddPrivateCustomerNote = () => {
    if (newBooking.privateCustomerNote.trim()) {
      setNewBooking(prev => ({
        ...prev,
        privateCustomerNotes: [...prev.privateCustomerNotes, prev.privateCustomerNote],
        privateCustomerNote: ""
      }));
      toast({
        title: "Note Added",
        description: "Private customer note has been added.",
      });
    }
  };

  const handleAddServiceProviderNote = () => {
    if (newBooking.serviceProviderNote.trim()) {
      setNewBooking(prev => ({
        ...prev,
        serviceProviderNotes: [...prev.serviceProviderNotes, prev.serviceProviderNote],
        serviceProviderNote: ""
      }));
      toast({
        title: "Note Added",
        description: "Service provider note has been added.",
      });
    }
  };

  const handleDeletePrivateBookingNote = (index: number) => {
    setNewBooking(prev => ({
      ...prev,
      privateBookingNotes: prev.privateBookingNotes.filter((_, i) => i !== index)
    }));
    toast({
      title: "Note Deleted",
      description: "Private booking note has been removed.",
    });
  };

  const handleDeletePrivateCustomerNote = (index: number) => {
    setNewBooking(prev => ({
      ...prev,
      privateCustomerNotes: prev.privateCustomerNotes.filter((_, i) => i !== index)
    }));
    toast({
      title: "Note Deleted",
      description: "Private customer note has been removed.",
    });
  };

  // Filter available providers based on selected date and time
  useEffect(() => {
    if (newBooking.selectedDate && newBooking.selectedTime) {
      // Filter providers who are available
      const available = allProviders.filter(provider => provider.available);
      setAvailableProviders(available);
      
      // Auto-select first available provider
      if (available.length > 0 && !selectedProvider) {
        setSelectedProvider(available[0]);
        setNewBooking(prev => ({ ...prev, serviceProvider: available[0].id }));
      }
    } else {
      setAvailableProviders([]);
      setSelectedProvider(null);
      setNewBooking(prev => ({ ...prev, serviceProvider: '' }));
    }
  }, [newBooking.selectedDate, newBooking.selectedTime]);


  const handleAssignProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setNewBooking(prev => ({ ...prev, serviceProvider: provider.id }));
    // Set wage and wage type from provider data
    setProviderWage(provider.wage?.toString() || '');
    setProviderWageType(provider.wageType || 'hourly');
    setShowAllProvidersModal(false);
    toast({
      title: 'Provider Assigned',
      description: `${provider.name} has been assigned to this booking.`,
    });
  };

  // Helper function to get provider initials
  const getProviderInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDeleteServiceProviderNote = (index: number) => {
    setNewBooking(prev => ({
      ...prev,
      serviceProviderNotes: prev.serviceProviderNotes.filter((_, i) => i !== index)
    }));
    toast({
      title: "Note Deleted",
      description: "Service provider note has been removed.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_2fr]">
        {/* Summary Sidebar - Now on the LEFT */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Industry</span>
                <span className="font-medium">Home Cleaning</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{newBooking.service || ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency</span>
                <span className="font-medium">{newBooking.frequency || "Not selected"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Length</span>
                <span className="font-medium">{newBooking.duration} {newBooking.durationUnit === "Hours" ? "Hr" : "Min"} {newBooking.duration !== "01" && newBooking.durationUnit === "Hours" ? "0 Min" : ""}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Total</span>
                <span className="font-medium">$0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Extras Total</span>
                <span className="font-medium">$0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Partial Cleaning Discount</span>
                <span className="font-medium text-green-600">-$0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency Discount</span>
                <span className="font-medium text-green-600">-$0.00</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>TOTAL</span>
                <span>$0.00</span>
              </div>
            </CardContent>
          </Card>

          {/* Note Cards */}
          <div className="space-y-3">
            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 px-4">
                <CardTitle className="text-base font-medium text-white">Private Booking Note</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrivateBookingNote(!showPrivateBookingNote)}
                  className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900 ml-auto"
                >
                  {showPrivateBookingNote ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </CardHeader>
              {showPrivateBookingNote && (
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Add private booking note..."
                        value={newBooking.privateBookingNote}
                        onChange={(e) => setNewBooking({ ...newBooking, privateBookingNote: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPrivateBookingNote()}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleAddPrivateBookingNote}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {newBooking.privateBookingNotes.length > 0 && (
                      <div className="space-y-2">
                        {newBooking.privateBookingNotes.map((note, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm border">
                            <span className="flex-1">{note}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePrivateBookingNote(index)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 px-4">
                <CardTitle className="text-base font-medium text-white">Private Customer Note</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrivateCustomerNote(!showPrivateCustomerNote)}
                  className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900 ml-auto"
                >
                  {showPrivateCustomerNote ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </CardHeader>
              {showPrivateCustomerNote && (
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Add private customer note..."
                        value={newBooking.privateCustomerNote}
                        onChange={(e) => setNewBooking({ ...newBooking, privateCustomerNote: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPrivateCustomerNote()}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleAddPrivateCustomerNote}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {newBooking.privateCustomerNotes.length > 0 && (
                      <div className="space-y-2">
                        {newBooking.privateCustomerNotes.map((note, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm border">
                            <span className="flex-1">{note}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePrivateCustomerNote(index)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 px-4">
                <CardTitle className="text-base font-medium text-white">Note For Service Provider</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowServiceProviderNote(!showServiceProviderNote)}
                  className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900 ml-auto"
                >
                  {showServiceProviderNote ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </CardHeader>
              {showServiceProviderNote && (
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Add note for service provider..."
                        value={newBooking.serviceProviderNote}
                        onChange={(e) => setNewBooking({ ...newBooking, serviceProviderNote: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddServiceProviderNote()}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleAddServiceProviderNote}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {newBooking.serviceProviderNotes.length > 0 && (
                      <div className="space-y-2">
                        {newBooking.serviceProviderNotes.map((note, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm border">
                            <span className="flex-1">{note}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteServiceProviderNote(index)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Exclude Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exclude-cancellation-fee"
                checked={newBooking.excludeCancellationFee}
                onCheckedChange={(checked) => setNewBooking({ ...newBooking, excludeCancellationFee: !!checked })}
              />
              <Label htmlFor="exclude-cancellation-fee" className="text-sm text-white">Exclude cancellation fee</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exclude-minimum-fee"
                checked={newBooking.excludeMinimumFee}
                onCheckedChange={(checked) => setNewBooking({ ...newBooking, excludeMinimumFee: !!checked })}
              />
              <Label htmlFor="exclude-minimum-fee" className="text-sm text-white">Exclude minimum fee</Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 w-full">
            <Button
              onClick={() => handleAddBooking('pending')}
              className="text-white w-full transition-all duration-200 hover:opacity-90 hover:shadow-lg"
              style={{ backgroundColor: '#10B981' }}
            >
              Save Booking
            </Button>
            <Button
              onClick={() => handleAddBooking('draft')}
              className="text-white w-full transition-all duration-200 hover:opacity-90 hover:shadow-lg"
              style={{ backgroundColor: '#A7B3D1' }}
            >
              Save As Draft
            </Button>
            <Button
              onClick={() => handleAddBooking('quote')}
              className="text-white w-full transition-all duration-200 hover:opacity-90 hover:shadow-lg"
              style={{ backgroundColor: '#F5A250' }}
            >
              Save As Quote
            </Button>
          </div>
        </div>

        {/* Customer Details - Now on the RIGHT */}
        <div className="space-y-4">
          <Card className="border-primary/20 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Type Selection */}
            <div>
              <RadioGroup
                value={newBooking.customerType}
                onValueChange={(value) => {
                  setNewBooking({ ...newBooking, customerType: value });
                  if (value === 'new') {
                    setCustomerSearch('');
                    setShowCustomerDropdown(false);
                  }
                }}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new-customer" />
                  <Label htmlFor="new-customer" className="font-medium">New customer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing-customer" />
                  <Label htmlFor="existing-customer" className="font-medium">Existing customer</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Customer Search - Only show when existing customer is selected */}
            {newBooking.customerType === 'existing' && (
              <div className="relative">
                <Label htmlFor="customer-search" className="text-sm font-medium mb-2 block">Search Customer</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customer-search"
                    placeholder="Search by name or email..."
                    value={customerSearch}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    onFocus={() => customerSearch && setShowCustomerDropdown(true)}
                    className="pl-10"
                  />
                </div>
                
                {/* Customer Dropdown */}
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => selectCustomer(customer)}
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                        {customer.phone && <div className="text-sm text-gray-500">{customer.phone}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Name Fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium mb-2 block">First name</Label>
                <Input
                  id="firstName"
                  placeholder="Enter your first name"
                  value={newBooking.firstName}
                  onChange={(e) => {
                    setNewBooking({ ...newBooking, firstName: e.target.value });
                    setErrors(prev => ({ ...prev, firstName: false }));
                  }}
                  className={errors.firstName ? "border-red-500" : ""}
                  disabled={newBooking.customerType === 'existing'}
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-medium mb-2 block">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Enter your last name"
                  value={newBooking.lastName}
                  onChange={(e) => {
                    setNewBooking({ ...newBooking, lastName: e.target.value });
                    setErrors(prev => ({ ...prev, lastName: false }));
                  }}
                  className={errors.lastName ? "border-red-500" : ""}
                  disabled={newBooking.customerType === 'existing'}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm font-medium mb-2 block">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={newBooking.email}
                onChange={(e) => {
                  setNewBooking({ ...newBooking, email: e.target.value });
                  setErrors(prev => ({ ...prev, email: false }));
                }}
                className={errors.email ? "border-red-500" : ""}
                disabled={newBooking.customerType === 'existing'}
              />
            </div>

            {/* Service Type */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Select value={newBooking.service} onValueChange={(value) => { setNewBooking({ ...newBooking, service: value }); setErrors(prev => ({ ...prev, service: false })); }}>
                  <SelectTrigger className={errors.service ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceCategories.length > 0 ? (
                      serviceCategories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-services" disabled>
                        No service categories available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Time Duration - Only show for services containing "Hourly" or "Hours" */}
            {(newBooking.service.includes('Hourly') || newBooking.service.includes('Hours')) && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Select Time Duration</Label>
                <div className="flex gap-3">
                  <Select value={newBooking.duration} onValueChange={(value) => setNewBooking({ ...newBooking, duration: value })}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01">01</SelectItem>
                      <SelectItem value="02">02</SelectItem>
                      <SelectItem value="03">03</SelectItem>
                      <SelectItem value="04">04</SelectItem>
                      <SelectItem value="05">05</SelectItem>
                      <SelectItem value="06">06</SelectItem>
                      <SelectItem value="07">07</SelectItem>
                      <SelectItem value="08">08</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newBooking.durationUnit} onValueChange={(value) => setNewBooking({ ...newBooking, durationUnit: value })}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hours">Hours</SelectItem>
                      <SelectItem value="Minutes">Minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 mt-3">
                  <Checkbox
                    id="notify-more-time"
                    checked={newBooking.notifyMoreTime}
                    onCheckedChange={(checked) => setNewBooking({ ...newBooking, notifyMoreTime: !!checked })}
                  />
                  <Label htmlFor="notify-more-time" className="text-sm">Notify me if the job requires more time.</Label>
                </div>
              </div>
            )}

            {/* Frequency */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Frequency</Label>
              {(() => {
                // Filter frequencies based on selected service category
                let availableFrequencies = frequencies;
                
                if (newBooking.service) {
                  // Find the selected service category
                  const selectedServiceCategory = serviceCategories.find(cat => cat.name === newBooking.service);
                  
                  if (selectedServiceCategory && selectedServiceCategory.service_category_frequency) {
                    // If service has frequency filtering enabled, show only configured frequencies
                    const selectedFrequencies = selectedServiceCategory.selected_frequencies || [];
                    availableFrequencies = frequencies.filter(freq => 
                      selectedFrequencies.some(selectedFreq => 
                        selectedFreq.toLowerCase().replace(/[-\s]/g, '') === freq.name.toLowerCase().replace(/[-\s]/g, '')
                      )
                    );
                    
                    console.log(`Service "${newBooking.service}" frequency filtering:`, {
                      serviceCategory: selectedServiceCategory,
                      selectedFrequencies: selectedFrequencies,
                      availableFrequencies: availableFrequencies.map(f => f.name)
                    });
                  }
                  // If service doesn't have frequency filtering, show all frequencies
                }
                
                return availableFrequencies.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {availableFrequencies.map((freq) => (
                      <Button
                        key={freq.id}
                        type="button"
                        variant={newBooking.frequency === freq.name ? "default" : "outline"}
                        onClick={() =>
                          setNewBooking((prev) => ({ ...prev, frequency: freq.name }))
                        }
                        className={
                          newBooking.frequency === freq.name
                            ? "bg-cyan-100 border-cyan-400 text-cyan-700 hover:bg-cyan-200 transition-all duration-200"
                            : "hover:bg-cyan-100 hover:border-cyan-400 hover:text-cyan-700 transition-all duration-200"
                        }
                      >
                        {freq.name}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground p-4 border border-dashed border-gray-300 rounded-lg">
                    {newBooking.service ? 
                      `No frequencies configured for "${newBooking.service}"` : 
                      "Select a service to see available frequencies"
                    }
                  </div>
                );
              })()}
            </div>

            
            {/* Dynamic Variable Categories from Pricing Parameters with Service Category and Frequency Filtering */}
            {variableCategories.length > 0 && (
              <div className={`grid gap-4 ${variableCategories.length === 1 ? 'md:grid-cols-1' : variableCategories.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                {variableCategories.map((category) => {
                  const categoryOptions = pricingParameters.filter(p => p.variable_category === category);
                  
                  // First, apply service category filtering if a service is selected
                  let filteredOptions = categoryOptions;
                  if (newBooking.service) {
                    const selectedServiceCategory = serviceCategories.find(cat => cat.name === newBooking.service);
                    if (selectedServiceCategory && selectedServiceCategory.variables && selectedServiceCategory.variables[category]) {
                      // If service category has variables configured for this category, show only those
                      const allowedVariables = selectedServiceCategory.variables[category];
                      filteredOptions = filteredOptions.filter(option => 
                        allowedVariables.includes(option.name)
                      );
                    } else if (selectedServiceCategory && (!selectedServiceCategory.variables || !selectedServiceCategory.variables[category] || selectedServiceCategory.variables[category].length === 0)) {
                      // If service category has no variables configured for this category, show none
                      filteredOptions = [];
                    }
                  }
                  
                  // Then, apply frequency filtering if frequency dependencies exist
                  if (frequencyDependencies) {
                    let allowedOptions: string[] = [];
                    
                    switch (category) {
                      case 'Bathroom':
                        allowedOptions = frequencyDependencies.bathroomVariables || [];
                        break;
                      case 'Sq Ft':
                        allowedOptions = frequencyDependencies.sqftVariables || [];
                        break;
                      case 'Bedroom':
                        allowedOptions = frequencyDependencies.bedroomVariables || [];
                        break;
                      default:
                        // For other categories, use the service category filtered options
                        allowedOptions = filteredOptions.map(opt => opt.name);
                    }
                    
                    // Only show checked options if any are checked, otherwise hide the entire category
                    if (allowedOptions.length > 0) {
                      filteredOptions = filteredOptions.filter(option => 
                        allowedOptions.includes(option.name)
                      );
                    } else {
                      // If no options are checked for this category in frequency, don't show the category at all
                      return null;
                    }
                  }
                  
                  // Don't render if no filtered options
                  if (filteredOptions.length === 0) {
                    return null;
                  }
                  
                  return (
                    <div key={category}>
                      <Label htmlFor={category} className="text-sm font-medium mb-2 block">{category}</Label>
                      <Select 
                        value={categoryValues[category] || ''} 
                        onValueChange={(value) => setCategoryValues({ ...categoryValues, [category]: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${category.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredOptions.map((option) => (
                            <SelectItem key={option.id} value={option.name}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            )}

            {/* Partial Cleaning Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="partial-cleaning"
                checked={isPartialCleaning}
                onCheckedChange={(checked) => setIsPartialCleaning(!!checked)}
              />
              <Label htmlFor="partial-cleaning" className="text-sm font-medium">This Is Partial Cleaning Only</Label>
            </div>

            {/* Exclude Parameters - Show when partial cleaning is checked */}
            {isPartialCleaning && (() => {
              // First, apply service category filtering if a service is selected
              let filteredExcludeParams = excludeParameters;
              if (newBooking.service) {
                const selectedServiceCategory = serviceCategories.find(cat => cat.name === newBooking.service);
                if (selectedServiceCategory && selectedServiceCategory.selected_exclude_parameters && selectedServiceCategory.selected_exclude_parameters.length > 0) {
                  // If service category has exclude parameters configured, show only those
                  filteredExcludeParams = filteredExcludeParams.filter(param => 
                    selectedServiceCategory.selected_exclude_parameters.includes(param.name)
                  );
                } else if (selectedServiceCategory && (!selectedServiceCategory.selected_exclude_parameters || selectedServiceCategory.selected_exclude_parameters.length === 0)) {
                  // If service category has no exclude parameters configured, show none
                  filteredExcludeParams = [];
                }
              }
              
              // Then, apply frequency dependency filter if frequency is selected
              if (frequencyDependencies && frequencyDependencies.excludeParameters && frequencyDependencies.excludeParameters.length > 0) {
                filteredExcludeParams = filteredExcludeParams.filter(param => 
                  frequencyDependencies.excludeParameters.includes(param.name)
                );
              }
              
              // Don't show the entire Exclude Parameters section if no parameters are available
              if (filteredExcludeParams.length === 0) {
                return null;
              }
              
              return (
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="text-base font-semibold">Select What Does Not Need To Be Done</h3>
                  <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                    {filteredExcludeParams.map((param) => (
                      <div 
                        key={param.id} 
                        className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedExcludeParams.includes(param.id) 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedExcludeParams(prev => 
                            prev.includes(param.id) 
                              ? prev.filter(id => id !== param.id)
                              : [...prev, param.id]
                          );
                        }}
                      >
                        {param.icon ? (
                          param.icon.startsWith('data:image/') ? (
                            <img src={param.icon} alt={param.name} className="w-16 h-16 mb-2 object-contain" />
                          ) : (
                            (() => {
                              const iconMap: Record<string, any> = {
                                'laundry': Shirt,
                                'furniture': Sofa,
                                'water': Droplets,
                                'odor': Wind,
                                'trash': Trash2,
                                'plants': Flower2,
                                'fire': Flame,
                                'storage': Warehouse,
                                'paint': Paintbrush,
                              };
                              const IconComponent = iconMap[param.icon];
                              return IconComponent ? (
                                <IconComponent className="w-16 h-16 mb-2 text-gray-700" />
                              ) : (
                                <div className="text-4xl mb-2">🏠</div>
                              );
                            })()
                          )
                        ) : (
                          <div className="text-4xl mb-2">🏠</div>
                        )}
                        <span className="text-sm font-medium text-center">{param.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Extras - Display filtered extras */}
            {extras.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-3 block">Select Extras</Label>
                <div className="grid gap-1 md:grid-cols-3 lg:grid-cols-4">
                  {extras.map((extra) => (
                    <div 
                      key={extra.id} 
                      className={`relative p-3 border rounded-lg transition-all cursor-pointer ${
                        newBooking.selectedExtras?.includes(extra.id) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-12 h-12 flex items-center justify-center">
                          {extra.icon ? (
                            (() => {
                              // Check if it's a data URL (uploaded image) or regular URL
                              if (extra.icon.startsWith('data:') || extra.icon.startsWith('http')) {
                                return (
                                  <Image 
                                    src={extra.icon} 
                                    alt={extra.name} 
                                    width={48} 
                                    height={48}
                                    className="object-contain"
                                  />
                                );
                              } else {
                                // It's a lucide icon identifier
                                const iconMap: Record<string, any> = {
                                  'laundry': Shirt,
                                  'furniture': Sofa,
                                  'water': Droplets,
                                  'odor': Wind,
                                  'trash': Trash2,
                                  'plants': Flower2,
                                  'fire': Flame,
                                  'storage': Warehouse,
                                  'paint': Paintbrush,
                                };
                                const IconComponent = iconMap[extra.icon];
                                return IconComponent ? (
                                  <IconComponent className="w-12 h-12 text-gray-700" />
                                ) : (
                                  <div className="text-3xl">🔧</div>
                                );
                              }
                            })()
                          ) : (
                            <div className="text-3xl">🔧</div>
                          )}
                        </div>
                        <div className="font-medium text-gray-900 text-center mb-2">{extra.name}</div>
                        <div className="flex items-center justify-center w-full">
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentQty = newBooking.extraQuantities[extra.id] || 0;
                                if (currentQty > 0) {
                                  const newQty = currentQty - 1;
                                  setNewBooking(prev => ({
                                    ...prev,
                                    extraQuantities: { ...prev.extraQuantities, [extra.id]: newQty }
                                  }));
                                  if (newQty === 0 && newBooking.selectedExtras?.includes(extra.id)) {
                                    setNewBooking(prev => ({
                                      ...prev,
                                      selectedExtras: prev.selectedExtras?.filter(id => id !== extra.id)
                                    }));
                                  }
                                }
                              }}
                              className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 transition-colors"
                              disabled={(newBooking.extraQuantities[extra.id] || 0) === 0}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">
                              {newBooking.extraQuantities[extra.id] || 0}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentQty = newBooking.extraQuantities[extra.id] || 0;
                                const maxQty = extra.maximumQuantity && extra.maximumQuantity > 0 ? extra.maximumQuantity : Infinity;
                                const newQty = Math.min(currentQty + 1, maxQty);
                                setNewBooking(prev => ({
                                  ...prev,
                                  extraQuantities: { ...prev.extraQuantities, [extra.id]: newQty }
                                }));
                                if (!newBooking.selectedExtras?.includes(extra.id)) {
                                  setNewBooking(prev => ({
                                    ...prev,
                                    selectedExtras: [...(prev.selectedExtras || []), extra.id]
                                  }));
                                }
                              }}
                              className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                              disabled={(newBooking.extraQuantities[extra.id] || 0) >= (extra.maximumQuantity && extra.maximumQuantity > 0 ? extra.maximumQuantity : Infinity)}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Booking Adjustments */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Booking Adjustments</h3>
              <div className="space-y-4">
                {/* Adjustment Checkboxes */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="adjust-service-total"
                      checked={newBooking.adjustServiceTotal}
                      onCheckedChange={(checked) => setNewBooking({ ...newBooking, adjustServiceTotal: !!checked })}
                    />
                    <Label htmlFor="adjust-service-total" className="text-sm text-white">Do you want to adjust service total?</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="adjust-price"
                      checked={newBooking.adjustPrice}
                      onCheckedChange={(checked) => setNewBooking({ ...newBooking, adjustPrice: !!checked })}
                    />
                    <Label htmlFor="adjust-price" className="text-sm text-white">Do you want to adjust price?</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="zipCode" className="text-sm font-medium mb-2 block text-white">Zip Code</Label>
                  <Input
                    id="zipCode"
                    placeholder="Enter zip code"
                    value={newBooking.zipCode}
                    onChange={(e) => setNewBooking({ ...newBooking, zipCode: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Service Provider</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="waiting-list"
                    checked={newBooking.waitingList}
                    onCheckedChange={(checked) => setNewBooking({ ...newBooking, waitingList: !!checked })}
                  />
                  <Label htmlFor="waiting-list" className="text-sm text-white">Waiting List</Label>
                </div>
                
                {newBooking.waitingList && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block text-white">Priority</Label>
                    <RadioGroup
                      value={newBooking.priority}
                      onValueChange={(value) => setNewBooking({ ...newBooking, priority: value })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Low" id="priority-low" />
                        <Label htmlFor="priority-low" className="text-sm text-white">Low</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Medium" id="priority-medium" />
                        <Label htmlFor="priority-medium" className="text-sm text-white">Medium</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="High" id="priority-high" />
                        <Label htmlFor="priority-high" className="text-sm text-white">High</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
                
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="selected-date" className="text-sm font-medium mb-2 block text-white">Select Date</Label>
                    <Input
                      id="selected-date"
                      type="date"
                      value={newBooking.selectedDate}
                      onChange={(e) => setNewBooking({ ...newBooking, selectedDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="selected-time" className="text-sm font-medium mb-2 block text-white">Select Arrival Time</Label>
                    <Select value={newBooking.selectedTime} onValueChange={(value) => setNewBooking({ ...newBooking, selectedTime: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="--:-- --" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        <SelectItem value="06:00">06:00 AM</SelectItem>
                        <SelectItem value="06:30">06:30 AM</SelectItem>
                        <SelectItem value="07:00">07:00 AM</SelectItem>
                        <SelectItem value="07:30">07:30 AM</SelectItem>
                        <SelectItem value="08:00">08:00 AM</SelectItem>
                        <SelectItem value="08:30">08:30 AM</SelectItem>
                        <SelectItem value="09:00">09:00 AM</SelectItem>
                        <SelectItem value="09:30">09:30 AM</SelectItem>
                        <SelectItem value="10:00">10:00 AM</SelectItem>
                        <SelectItem value="10:30">10:30 AM</SelectItem>
                        <SelectItem value="11:00">11:00 AM</SelectItem>
                        <SelectItem value="11:30">11:30 AM</SelectItem>
                        <SelectItem value="12:00">12:00 PM</SelectItem>
                        <SelectItem value="12:30">12:30 PM</SelectItem>
                        <SelectItem value="13:00">01:00 PM</SelectItem>
                        <SelectItem value="13:30">01:30 PM</SelectItem>
                        <SelectItem value="14:00">02:00 PM</SelectItem>
                        <SelectItem value="14:30">02:30 PM</SelectItem>
                        <SelectItem value="15:00">03:00 PM</SelectItem>
                        <SelectItem value="15:30">03:30 PM</SelectItem>
                        <SelectItem value="16:00">04:00 PM</SelectItem>
                        <SelectItem value="16:30">04:30 PM</SelectItem>
                        <SelectItem value="17:00">05:00 PM</SelectItem>
                        <SelectItem value="17:30">05:30 PM</SelectItem>
                        <SelectItem value="18:00">06:00 PM</SelectItem>
                        <SelectItem value="18:30">06:30 PM</SelectItem>
                        <SelectItem value="19:00">07:00 PM</SelectItem>
                        <SelectItem value="19:30">07:30 PM</SelectItem>
                        <SelectItem value="20:00">08:00 PM</SelectItem>
                        <SelectItem value="20:30">08:30 PM</SelectItem>
                        <SelectItem value="21:00">09:00 PM</SelectItem>
                        <SelectItem value="21:30">09:30 PM</SelectItem>
                        <SelectItem value="22:00">10:00 PM</SelectItem>
                        <SelectItem value="22:30">10:30 PM</SelectItem>
                        <SelectItem value="23:00">11:00 PM</SelectItem>
                        <SelectItem value="23:30">11:30 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                    {/* Available Provider Display */}
                {newBooking.selectedDate && newBooking.selectedTime && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block text-white">Available Provider</Label>
                    {selectedProvider ? (
                      <div className="p-3 border border-cyan-200 bg-cyan-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {getProviderInitials(selectedProvider.name)}
                            </div>
                            <div>
                              <div className="font-medium text-black">{selectedProvider.name}</div>
                              <div className="grid gap-2 mt-2">
                                <div className="flex gap-2 items-center">
                                  <div className="text-sm text-black">Wage</div>
                                  <Input
                                    type="number"
                                    placeholder="Amount"
                                    value={providerWage}
                                    onChange={(e) => setProviderWage(e.target.value)}
                                    className="flex-1 h-8 text-sm"
                                  />
                                  <Select value={providerWageType} onValueChange={(value: 'percentage' | 'fixed' | 'hourly') => setProviderWageType(value)}>
                                    <SelectTrigger className="w-24 h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="percentage">%</SelectItem>
                                      <SelectItem value="fixed">$</SelectItem>
                                      <SelectItem value="hourly">/hr</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {availableProviders.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAllProvidersModal(true)}
                                className="text-xs"
                              >
                                {`See All (${availableProviders.length})`}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 border border-gray-200 bg-gray-50 rounded-lg">
                        <div className="text-gray-500">No available providers for selected date and time</div>
                      </div>
                    )}
                    
                    {/* All Providers Modal */}
                    <Dialog open={showAllProvidersModal} onOpenChange={setShowAllProvidersModal}>
                      <DialogContent className="sm:max-w-[800px]">
                        <DialogHeader>
                          <DialogTitle>All Available Providers</DialogTitle>
                          <DialogDescription>Select a provider from the list below.</DialogDescription>
                        </DialogHeader>
                        <div className="mt-3 space-y-2">
                          <div className="grid grid-cols-3 gap-4">
                            {availableProviders.map((provider) => (
                              <div
                                key={provider.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selectedProvider?.id === provider.id
                                    ? 'border-cyan-300 bg-cyan-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={() => {
                                  handleAssignProvider(provider);
                                  setShowAllProvidersModal(false);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                                      selectedProvider?.id === provider.id
                                        ? 'bg-cyan-600'
                                        : 'bg-gray-400'
                                    }`}>
                                      {getProviderInitials(provider.name)}
                                    </div>
                                    <div>
                                      <div className="font-medium">{provider.name}</div>
                                    </div>
                                  </div>
                                  {selectedProvider?.id === provider.id && (
                                    <div className="text-black text-sm font-medium">Selected</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                    
                                      </div>
            </div>
                <div>
                  <Label htmlFor="payment" className="text-sm font-medium mb-2 block text-white">Payment Method</Label>
                  <Select value={newBooking.paymentMethod} onValueChange={(value) => setNewBooking({ ...newBooking, paymentMethod: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes" className="text-sm font-medium mb-2 block">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Add any special instructions"
                    value={newBooking.notes}
                    onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                  />
                </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}

export default AddBookingPage;
