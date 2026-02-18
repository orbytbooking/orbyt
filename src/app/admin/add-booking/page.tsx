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
import { Plus, Minus, Search, X, User, Shirt, Sofa, Droplets, Wind, Trash2, Flower2, Flame, Warehouse, Paintbrush, CreditCard } from "lucide-react";
import Image from "next/image";
import { useBusiness } from "@/contexts/BusinessContext";
import { getTodayLocalDate, formatDateLocal } from "@/lib/date-utils";

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
  occurrence_time?: "onetime" | "recurring";
  frequency_repeats?: string;
  shorter_job_length?: "yes" | "no";
  shorter_job_length_by?: string;
  exclude_first_appointment?: boolean;
  frequency_discount?: "all" | "exclude-first";
  charge_one_time_price?: boolean;
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
  address: "",
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
  cardNumber: "",
  notes: "",
  adjustServiceTotal: false,
  adjustPrice: false,
  adjustmentAmount: "",
  adjustmentServiceTotalAmount: "",
  adjustTime: false,
  adjustedHours: "00",
  adjustedMinutes: "00",
  keyInfoOption: "",
  keepKeyWithProvider: false,
  customerNoteForProvider: "",
  couponCodeTab: "coupon-code",
  couponCode: "",
  couponType: "coupon-code",
  giftCardCode: "",
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
    address: false,
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
  const [isFirstAppointment, setIsFirstAppointment] = useState(true);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [filteredProvidersByDate, setFilteredProvidersByDate] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

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
              icon: e.icon,
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
              icon: e.icon,
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
          
          console.log('=== ADMIN BOOKING DEBUG ===');
          console.log('Fetched categories:', categories);
          console.log('Selected frequency:', newBooking.frequency);
          console.log('Frequency dependencies:', frequencyDependencies);
          console.log('All categories with frequency settings:', categories.map(cat => ({
            name: cat.name,
            service_category_frequency: cat.service_category_frequency,
            selected_frequencies: cat.selected_frequencies
          })));
          
          // Apply frequency-based filtering logic
          let filteredCategories = categories.filter((category: ServiceCategory) => {
            // If service_category_frequency is false (No), always show the service category
            if (!category.service_category_frequency) {
              console.log(`Service "${category.name}": service_category_frequency is false, showing always`);
              return true;
            }
            
            // If service_category_frequency is true (Yes), filter by frequency dependencies
            if (frequencyDependencies && frequencyDependencies.serviceCategories && frequencyDependencies.serviceCategories.length > 0) {
              const isIncluded = frequencyDependencies.serviceCategories.includes(String(category.id));
              console.log(`Service "${category.name}": service_category_frequency is true, frequency filter result: ${isIncluded}`);
              return isIncluded;
            }
            
            // If no frequency dependencies are available yet, hide frequency-dependent services
            console.log(`Service "${category.name}": service_category_frequency is true, but no frequency dependencies available`);
            return false;
          });
          
          console.log('Filtered categories:', filteredCategories);
          setServiceCategories(filteredCategories);
        } else {
          // Fetch service categories
          const categories = await serviceCategoriesService.getServiceCategoriesByIndustry(currentIndustry.id);
          console.log('=== ADMIN BOOKING DEBUG (CURRENT INDUSTRY) ===');
          console.log('Fetched categories:', categories);
          console.log('Selected frequency:', newBooking.frequency);
          console.log('Frequency dependencies:', frequencyDependencies);
          console.log('All categories with frequency settings:', categories.map(cat => ({
            name: cat.name,
            service_category_frequency: cat.service_category_frequency,
            selected_frequencies: cat.selected_frequencies
          })));
          
          // Apply frequency-based filtering logic
          let filteredCategories = categories.filter((category: ServiceCategory) => {
            // If service_category_frequency is false (No), always show the service category
            if (!category.service_category_frequency) {
              console.log(`Service "${category.name}": service_category_frequency is false, showing always`);
              return true;
            }
            
            // If service_category_frequency is true (Yes), filter by frequency dependencies
            if (frequencyDependencies && frequencyDependencies.serviceCategories && frequencyDependencies.serviceCategories.length > 0) {
              const isIncluded = frequencyDependencies.serviceCategories.includes(String(category.id));
              console.log(`Service "${category.name}": service_category_frequency is true, frequency filter result: ${isIncluded}`);
              return isIncluded;
            }
            
            // If no frequency dependencies are available yet, hide frequency-dependent services
            console.log(`Service "${category.name}": service_category_frequency is true, but no frequency dependencies available`);
            return false;
          });
          
          console.log('Filtered categories:', filteredCategories);
          setServiceCategories(filteredCategories);
        }
      } catch (error) {
        console.error('Error updating service categories:', error);
        setServiceCategories([]);
      }
    };

    updateServiceCategories();
  }, [frequencyDependencies, currentBusiness, newBooking.frequency]);

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
      
      // Apply filtering based on service category configuration
      if (newBooking.service) {
        console.log('🔍 Service selected, checking service category configuration...');
        
        const selectedServiceCategory = serviceCategories.find(cat => cat.name === newBooking.service);
        console.log('Selected service category:', selectedServiceCategory);
        
        if (selectedServiceCategory) {
          console.log('✅ Service category found!');
          console.log('service_category_frequency:', selectedServiceCategory.service_category_frequency);
          
          // Check if service category uses frequency-based filtering
          if (selectedServiceCategory.service_category_frequency) {
            // Use frequency dependencies configuration
            console.log('📋 Using FREQUENCY dependencies for extras');
            if (frequencyDependencies && frequencyDependencies.extras && frequencyDependencies.extras.length > 0) {
              console.log('Frequency extras:', frequencyDependencies.extras);
              filteredExtras = filteredExtras.filter((e: any) => 
                frequencyDependencies.extras.includes(String(e.id))
              );
              console.log('After frequency filtering:', filteredExtras.length);
            } else {
              console.log('⚠️ No frequency dependencies available, hiding all extras');
              filteredExtras = [];
            }
          } else {
            // Use service category's own extras configuration
            console.log('📋 Using SERVICE CATEGORY configuration for extras');
            console.log('Service category extras:', selectedServiceCategory.extras);
            
            if (selectedServiceCategory.extras && selectedServiceCategory.extras.length > 0) {
              console.log('✅ Service category has extras configured:', selectedServiceCategory.extras);
              
              filteredExtras = filteredExtras.filter((e: any) => {
                const extraId = String(e.id);
                const matches = selectedServiceCategory.extras.some((serviceExtraId: any) => {
                  return String(serviceExtraId) === extraId;
                });
                
                console.log(`Extra ${e.name} (ID: ${e.id}): ${matches ? 'INCLUDED' : 'EXCLUDED'}`);
                return matches;
              });
              console.log('After service category filtering:', filteredExtras.length);
            } else {
              console.log('❌ Service category has no extras configured, hiding all extras');
              filteredExtras = [];
            }
          }
        } else {
          console.log('⚠️ Service category not found for name:', newBooking.service);
          console.log('Available service names:', serviceCategories.map(cat => cat.name));
        }
      } else {
        console.log('ℹ️ No service selected, showing all extras');
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
          console.log('=== LOADED PRICING PARAMETERS ===');
          console.log('Raw pricing data:', pricingData.pricingParameters);
          pricingData.pricingParameters.forEach((param: any, index: number) => {
            console.log(`${index + 1}. ${param.name}:`, {
              id: param.id,
              variable_category: param.variable_category,
              show_based_on_frequency: param.show_based_on_frequency,
              show_based_on_service_category: param.show_based_on_service_category,
              frequency: param.frequency,
              service_category: param.service_category
            });
          });
          
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
    
    console.log('=== BOOKING FORM DEBUG ===');
    console.log('Current newBooking state:', {
      frequency: newBooking.frequency,
      service: newBooking.service
    });
    
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
    address: !newBooking.address.trim(),
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
    
    let response: Response;
    try {
      response = await fetch('/api/bookings', {
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
        address: newBooking.address,
        service: newBooking.service,
        frequency: newBooking.frequency,
        date: newBooking.selectedDate,
        time: newBooking.selectedTime,
        status: status,
        amount: calculateTotalAmount,
        service_total: calculateServiceTotal,
        extras_total: calculateExtrasTotal,
        partial_cleaning_discount: calculatePartialCleaningDiscount,
        frequency_discount: calculateFrequencyDiscount,
        payment_method: newBooking.paymentMethod || null,
        notes: newBooking.notes,
        duration: newBooking.duration,
        duration_unit: newBooking.durationUnit,
        selected_extras: newBooking.selectedExtras,
        extra_quantities: newBooking.extraQuantities,
        category_values: categoryValues,
        is_partial_cleaning: isPartialCleaning,
        excluded_areas: selectedExcludeParams,
        exclude_quantities: newBooking.excludeQuantities,
        service_provider_id: newBooking.serviceProvider,
        provider_wage: providerWage,
        provider_wage_type: providerWageType,
        private_booking_notes: newBooking.privateBookingNotes,
        private_customer_notes: newBooking.privateCustomerNotes,
        service_provider_notes: newBooking.serviceProviderNotes,
        waiting_list: newBooking.waitingList,
        priority: newBooking.priority,
        zip_code: newBooking.zipCode,
      }),
      });
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to server. Please check your connection.',
        variant: 'destructive',
      });
      return;
    }

    let result: any;
    let rawText = "";
    try {
      rawText = await response.text();
      if (!rawText) {
        console.error('Empty response from server', { status: response.status, statusText: response.statusText });
        toast({
          title: 'Error',
          description: `Server returned empty response. Status: ${response.status} ${response.statusText}`,
          variant: 'destructive',
        });
        return;
      }
      result = JSON.parse(rawText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, { status: response.status, statusText: response.statusText, rawText });
      toast({
        title: 'Error',
        description: `Server returned invalid response. Status: ${response.status} ${response.statusText}`,
        variant: 'destructive',
      });
      return;
    }

    if (!response.ok) {
      console.error('Booking insertion error:', { status: response.status, statusText: response.statusText, result, rawText });
      const errorMessage =
        (result && typeof result === 'object' ? (result.error || result.details || result.message) : null) ||
        rawText ||
        'Unknown error';
      const errorHint = result.hint ? `\n\nHint: ${result.hint}` : '';
      toast({
        title: 'Error',
        description: `Failed to add booking: ${errorMessage}${errorHint}`,
        variant: 'destructive',
      });
      return;
    }

    // Show warning if provider_wage columns are not available
    if (result.warning) {
      toast({
        title: 'Warning',
        description: result.warning,
        variant: 'default',
      });
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
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while creating the booking';
    toast({
      title: 'Error',
      description: errorMessage,
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

  // Filter providers based on selected date - only show providers with availability on that date
  useEffect(() => {
    const filterProvidersByDate = async () => {
      if (!newBooking.selectedDate || allProviders.length === 0) {
        setFilteredProvidersByDate([]);
        // Clear selected provider if date is cleared
        if (!newBooking.selectedDate && selectedProvider) {
          setSelectedProvider(null);
          setNewBooking(prev => ({ ...prev, serviceProvider: '', selectedTime: '' }));
          setAvailableTimeSlots([]);
        }
        return;
      }

      try {
        setLoadingProviders(true);
        const availableProvidersList: Provider[] = [];

        console.log(`🔍 Filtering ${allProviders.length} providers for date: ${newBooking.selectedDate}`);

        // Check each provider for availability on the selected date
        for (const provider of allProviders) {
          try {
            const url = `/api/admin/providers/${provider.id}/available-slots?date=${newBooking.selectedDate}&businessId=${currentBusiness?.id || ''}`;
            console.log(`  Checking provider ${provider.name} (${provider.id})...`);
            
            const response = await fetch(url);

            if (response.ok) {
              const data = await response.json();
              console.log(`    Response: ${data.availableSlots?.length || 0} slots found`);
              // If provider has any available slots on this date, include them
              if (data.availableSlots && data.availableSlots.length > 0) {
                console.log(`    ✅ Provider ${provider.name} is available`);
                availableProvidersList.push(provider);
              } else {
                console.log(`    ❌ Provider ${provider.name} has no available slots`);
              }
            } else {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              console.error(`    ❌ Failed to check availability for ${provider.name}:`, response.status, errorData);
            }
          } catch (error) {
            console.error(`    ❌ Error checking availability for provider ${provider.id}:`, error);
          }
        }

        console.log(`📊 Found ${availableProvidersList.length} available providers out of ${allProviders.length} total`);
        setFilteredProvidersByDate(availableProvidersList);

        // If currently selected provider is not in the filtered list, clear selection
        if (selectedProvider && !availableProvidersList.some(p => p.id === selectedProvider.id)) {
          setSelectedProvider(null);
          setNewBooking(prev => ({ ...prev, serviceProvider: '', selectedTime: '' }));
        }
      } catch (error) {
        console.error('Error filtering providers by date:', error);
        setFilteredProvidersByDate([]);
      } finally {
        setLoadingProviders(false);
      }
    };

    filterProvidersByDate();
  }, [newBooking.selectedDate, allProviders, selectedProvider, currentBusiness?.id]);

  // Fetch available time slots for ALL providers on the selected date
  useEffect(() => {
    const fetchAvailableSlotsForDate = async () => {
      if (!newBooking.selectedDate || allProviders.length === 0) {
        setAvailableTimeSlots([]);
        setNewBooking(prev => ({ ...prev, selectedTime: '' }));
        return;
      }

      try {
        setLoadingTimeSlots(true);
        const slotSet = new Set<string>();

        console.log(`🔍 Fetching available time slots for all providers on ${newBooking.selectedDate}`);

        for (const provider of allProviders) {
          try {
            const url = `/api/admin/providers/${provider.id}/available-slots?date=${newBooking.selectedDate}&businessId=${currentBusiness?.id || ''}`;
            console.log(`  Checking provider ${provider.name} (${provider.id}) for time slots...`);

            const response = await fetch(url);

            if (response.ok) {
              const data = await response.json();
              const slots: string[] = data.availableSlots || [];

              if (slots.length > 0) {
                console.log(`    ✅ Provider ${provider.name} has ${slots.length} slots`);
                slots.forEach((slot) => slotSet.add(slot));
              } else {
                console.log(`    ❌ Provider ${provider.name} has no slots for this date`);
              }
            } else {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              console.error(`    ❌ Failed to fetch slots for ${provider.name}:`, response.status, errorData);
            }
          } catch (error) {
            console.error(`    ❌ Error fetching slots for provider ${provider.id}:`, error);
          }
        }

        const sortedSlots = Array.from(slotSet).sort((a, b) => {
          const [aHour, aMin] = a.split(':').map(Number);
          const [bHour, bMin] = b.split(':').map(Number);
          return aHour * 60 + aMin - (bHour * 60 + bMin);
        });

        console.log(`📊 Found ${sortedSlots.length} unique time slots across all providers`);

        setAvailableTimeSlots(sortedSlots);

        // Clear selected time if it's no longer available for the selected date
        if (newBooking.selectedTime && !sortedSlots.includes(newBooking.selectedTime)) {
          console.log(`   Clearing selected time ${newBooking.selectedTime} - not available on this date`);
          setNewBooking(prev => ({ ...prev, selectedTime: '' }));
        }
      } catch (error) {
        console.error('Error fetching available slots for date:', error);
        setAvailableTimeSlots([]);
      } finally {
        setLoadingTimeSlots(false);
      }
    };

    fetchAvailableSlotsForDate();
  }, [newBooking.selectedDate, allProviders, currentBusiness?.id]);

  // Filter available providers based on selected date and time
  // Only runs when both date AND time are selected
  useEffect(() => {
    const filterProviders = async () => {
      // Only filter providers when both date and time are selected
      if (!newBooking.selectedDate || !newBooking.selectedTime) {
        // Don't clear selected provider if user manually selected one
        // Only clear if we're filtering and no providers match
        return;
      }

      // Check which providers are available for the selected date and time
      const availableProvidersList: Provider[] = [];

      for (const provider of allProviders) {
        try {
          const response = await fetch(
            `/api/admin/providers/${provider.id}/available-slots?date=${newBooking.selectedDate}`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.availableSlots && data.availableSlots.includes(newBooking.selectedTime)) {
              availableProvidersList.push(provider);
            }
          }
        } catch (error) {
          console.error(`Error checking availability for provider ${provider.id}:`, error);
        }
      }

      setAvailableProviders(availableProvidersList);

      // Only auto-select or clear if user hasn't manually selected a provider
      // Check if currently selected provider is still available
      if (selectedProvider) {
        const isStillAvailable = availableProvidersList.some(p => p.id === selectedProvider.id);
        if (!isStillAvailable && availableProvidersList.length > 0) {
          // Current provider not available, but others are - suggest switching
          // Don't auto-switch, just update available list
        } else if (!isStillAvailable && availableProvidersList.length === 0) {
          // No providers available for this time slot
          // Keep selection but show warning in UI
        }
      } else if (availableProvidersList.length > 0) {
        // Auto-select first available provider if none selected
        setSelectedProvider(availableProvidersList[0]);
        setNewBooking(prev => ({ ...prev, serviceProvider: availableProvidersList[0].id }));
      }
    };

    filterProviders();
  }, [newBooking.selectedDate, newBooking.selectedTime, allProviders, selectedProvider]);


  const handleAssignProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setNewBooking(prev => ({ ...prev, serviceProvider: provider.id }));
    // Set wage and wage type from provider data
    setProviderWage(provider.wage?.toString() || '');
    setProviderWageType(provider.wageType || 'hourly');
    setShowAllProvidersModal(false);
    
    // Clear selected time if provider/date changes and time is no longer available
    if (newBooking.selectedDate && newBooking.selectedTime) {
      // Check if the selected time is still available for this provider
      // The useEffect will fetch slots and clear if needed
      const checkTimeAvailability = async () => {
        try {
          const response = await fetch(
            `/api/admin/providers/${provider.id}/available-slots?date=${newBooking.selectedDate}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.availableSlots && !data.availableSlots.includes(newBooking.selectedTime)) {
              // Time not available, clear it
              setNewBooking(prev => ({ ...prev, selectedTime: '' }));
            }
          }
        } catch (error) {
          console.error('Error checking time availability:', error);
        }
      };
      checkTimeAvailability();
    }
    
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

  // Calculate service total based on pricing parameters
  const calculateServiceTotal = useMemo(() => {
    if (!newBooking.service || !newBooking.frequency) {
      console.log('⚠️ calculateServiceTotal: Missing service or frequency', { service: newBooking.service, frequency: newBooking.frequency });
      return 0;
    }

    // Find matching pricing parameter based on selected variables
    const matchingParam = pricingParameters.find(param => {
      // Check if all variable categories match
      let matches = true;
      
      // Check frequency match if parameter uses frequency filtering
      if (param.show_based_on_frequency && param.frequency) {
        const allowedFrequencies = param.frequency.split(', ').map(f => f.trim());
        if (!allowedFrequencies.includes(newBooking.frequency)) {
          matches = false;
        }
      }
      
      // Check service category match if parameter uses service category filtering
      if (param.show_based_on_service_category && param.service_category) {
        const allowedServices = param.service_category.split(', ').map(s => s.trim());
        if (!allowedServices.includes(newBooking.service)) {
          matches = false;
        }
      }
      
      // Check if variable category value matches
      if (param.variable_category && categoryValues[param.variable_category]) {
        if (param.name !== categoryValues[param.variable_category]) {
          matches = false;
        }
      }
      
      return matches;
    });

    // If matching pricing parameter found, use its price
    if (matchingParam?.price) {
      console.log('✅ calculateServiceTotal: Using pricing parameter', { param: matchingParam.name, price: matchingParam.price });
      return matchingParam.price;
    }

    // Fallback: Check if service category has a fixed price
    const selectedServiceCategory = serviceCategories.find(cat => cat.name === newBooking.service);
    if (selectedServiceCategory?.service_category_price?.enabled && selectedServiceCategory.service_category_price?.price) {
      const price = parseFloat(selectedServiceCategory.service_category_price.price);
      if (!isNaN(price) && price > 0) {
        console.log('✅ calculateServiceTotal: Using service category fixed price', { price });
        return price;
      }
    }

    // Fallback: Check if service category has hourly pricing
    if (selectedServiceCategory?.hourly_service?.enabled && selectedServiceCategory.hourly_service?.price) {
      const hourlyPrice = parseFloat(selectedServiceCategory.hourly_service.price);
      if (!isNaN(hourlyPrice) && hourlyPrice > 0 && newBooking.duration) {
        const hours = parseFloat(newBooking.duration) || 0;
        const calculatedPrice = hourlyPrice * hours;
        console.log('✅ calculateServiceTotal: Using hourly pricing', { hourlyPrice, hours, calculatedPrice });
        return calculatedPrice;
      }
    }

    console.warn('⚠️ calculateServiceTotal: No pricing found', { 
      service: newBooking.service, 
      frequency: newBooking.frequency,
      pricingParamsCount: pricingParameters.length,
      serviceCategoryFound: !!selectedServiceCategory,
      categoryPriceEnabled: selectedServiceCategory?.service_category_price?.enabled,
      hourlyPriceEnabled: selectedServiceCategory?.hourly_service?.enabled
    });
    return 0;
  }, [newBooking.service, newBooking.frequency, newBooking.duration, categoryValues, pricingParameters, serviceCategories]);

  // Calculate extras total
  const calculateExtrasTotal = useMemo(() => {
    let total = 0;
    
    newBooking.selectedExtras?.forEach(extraId => {
      const extra = extras.find(e => e.id === extraId);
      if (extra) {
        const quantity = newBooking.extraQuantities[extraId] || 1;
        total += extra.price * quantity;
      }
    });
    
    return total;
  }, [newBooking.selectedExtras, newBooking.extraQuantities, extras]);

  // Calculate partial cleaning discount
  const calculatePartialCleaningDiscount = useMemo(() => {
    if (!isPartialCleaning || selectedExcludeParams.length === 0) {
      return 0;
    }

    let discount = 0;
    selectedExcludeParams.forEach(paramId => {
      const param = excludeParameters.find(p => p.id === paramId);
      if (param && param.price) {
        const quantity = newBooking.excludeQuantities[paramId] || 1;
        discount += param.price * quantity;
      }
    });

    return discount;
  }, [isPartialCleaning, selectedExcludeParams, excludeParameters, newBooking.excludeQuantities]);

  // Calculate adjusted job length for recurring frequencies
  const calculateAdjustedDuration = useMemo(() => {
    if (!newBooking.frequency || !newBooking.duration) {
      return { duration: newBooking.duration, durationUnit: newBooking.durationUnit };
    }

    const selectedFreq = frequencies.find(f => f.name === newBooking.frequency);
    if (!selectedFreq) {
      return { duration: newBooking.duration, durationUnit: newBooking.durationUnit };
    }

    // Only apply job length adjustment for recurring frequencies
    if (selectedFreq.occurrence_time !== 'recurring') {
      return { duration: newBooking.duration, durationUnit: newBooking.durationUnit };
    }

    // Check if shorter job length is enabled
    if (selectedFreq.shorter_job_length !== 'yes') {
      return { duration: newBooking.duration, durationUnit: newBooking.durationUnit };
    }

    // If this is the first appointment and we should exclude it from shorter length
    if (isFirstAppointment && selectedFreq.exclude_first_appointment) {
      return { duration: newBooking.duration, durationUnit: newBooking.durationUnit };
    }

    // Apply the percentage reduction
    const reductionPercentage = parseFloat(selectedFreq.shorter_job_length_by || '0');
    if (reductionPercentage <= 0) {
      return { duration: newBooking.duration, durationUnit: newBooking.durationUnit };
    }

    // Calculate reduced duration
    const originalDuration = parseFloat(newBooking.duration);
    const reducedDuration = originalDuration * (1 - reductionPercentage / 100);
    
    // Convert to appropriate format
    if (newBooking.durationUnit === 'Hours') {
      const hours = Math.floor(reducedDuration);
      const minutes = Math.round((reducedDuration - hours) * 60);
      
      if (minutes >= 30) {
        return { 
          duration: hours.toString().padStart(2, '0'), 
          durationUnit: 'Hours',
          displayText: `${hours} Hr ${minutes} Min`
        };
      } else {
        return { 
          duration: hours.toString().padStart(2, '0'), 
          durationUnit: 'Hours',
          displayText: `${hours} Hr`
        };
      }
    } else {
      return { 
        duration: Math.round(reducedDuration).toString().padStart(2, '0'), 
        durationUnit: newBooking.durationUnit 
      };
    }
  }, [newBooking.frequency, newBooking.duration, newBooking.durationUnit, frequencies, isFirstAppointment]);

  // Calculate frequency discount with first appointment exclusion logic
  const calculateFrequencyDiscount = useMemo(() => {
    if (!newBooking.frequency) {
      return 0;
    }

    const selectedFreq = frequencies.find(f => f.name === newBooking.frequency);
    if (!selectedFreq || !selectedFreq.discount) {
      return 0;
    }

    // For recurring frequencies, check if we should exclude the first appointment
    if (selectedFreq.occurrence_time === 'recurring') {
      // If frequency_discount is "exclude-first" and this is the first appointment, no discount
      if (selectedFreq.frequency_discount === 'exclude-first' && isFirstAppointment) {
        return 0;
      }
    }

    const subtotal = calculateServiceTotal + calculateExtrasTotal - calculatePartialCleaningDiscount;
    
    if (selectedFreq.discountType === '%') {
      return (subtotal * selectedFreq.discount) / 100;
    } else {
      return selectedFreq.discount;
    }
  }, [newBooking.frequency, frequencies, calculateServiceTotal, calculateExtrasTotal, calculatePartialCleaningDiscount, isFirstAppointment]);

  // Calculate total amount
  const calculateTotalAmount = useMemo(() => {
    let subtotal = calculateServiceTotal + calculateExtrasTotal;
    
    // Apply service total adjustment if enabled
    if (newBooking.adjustServiceTotal && newBooking.adjustmentServiceTotalAmount) {
      const adjustment = parseFloat(newBooking.adjustmentServiceTotalAmount);
      if (!isNaN(adjustment)) {
        subtotal = adjustment; // Replace service total with adjusted amount
      }
    }
    
    const totalDiscount = calculatePartialCleaningDiscount + calculateFrequencyDiscount;
    let finalAmount = Math.max(0, subtotal - totalDiscount);
    
    // Apply final price adjustment if enabled
    if (newBooking.adjustPrice && newBooking.adjustmentAmount) {
      const adjustment = parseFloat(newBooking.adjustmentAmount);
      if (!isNaN(adjustment)) {
        finalAmount = adjustment; // Replace final amount with adjusted amount
      }
    }
    
    return finalAmount;
  }, [calculateServiceTotal, calculateExtrasTotal, calculatePartialCleaningDiscount, calculateFrequencyDiscount, newBooking.adjustServiceTotal, newBooking.adjustmentServiceTotalAmount, newBooking.adjustPrice, newBooking.adjustmentAmount]);

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
              {(() => {
                const selectedFreq = frequencies.find(f => f.name === newBooking.frequency);
                const adjustedDuration = calculateAdjustedDuration;
                const isRecurring = selectedFreq?.occurrence_time === 'recurring';
                const hasAdjustment = isRecurring && selectedFreq?.shorter_job_length === 'yes' && parseFloat(selectedFreq?.shorter_job_length_by || '0') > 0;
                
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Length</span>
                      <span className="font-medium">
                        {hasAdjustment && adjustedDuration.displayText ? adjustedDuration.displayText : 
                          `${newBooking.duration} ${newBooking.durationUnit === "Hours" ? "Hr" : "Min"}${newBooking.duration !== "01" && newBooking.durationUnit === "Hours" ? " 0 Min" : ""}`}
                      </span>
                    </div>
                    {hasAdjustment && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Original Length</span>
                        <span className="text-muted-foreground line-through">
                          {newBooking.duration} {newBooking.durationUnit === "Hours" ? "Hr" : "Min"}
                        </span>
                      </div>
                    )}
                    {isRecurring && selectedFreq?.frequency_repeats && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Repeats</span>
                        <span className="text-muted-foreground">
                          {selectedFreq.frequency_repeats.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Total</span>
                <span className="font-medium">${calculateServiceTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Extras Total</span>
                <span className="font-medium">${calculateExtrasTotal.toFixed(2)}</span>
              </div>
              {calculatePartialCleaningDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Partial Cleaning Discount</span>
                  <span className="font-medium text-green-600">-${calculatePartialCleaningDiscount.toFixed(2)}</span>
                </div>
              )}
              {(() => {
                const selectedFreq = frequencies.find(f => f.name === newBooking.frequency);
                const isRecurring = selectedFreq?.occurrence_time === 'recurring';
                const excludeFirst = selectedFreq?.frequency_discount === 'exclude-first';
                
                if (calculateFrequencyDiscount > 0) {
                  return (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frequency Discount</span>
                      <span className="font-medium text-green-600">-${calculateFrequencyDiscount.toFixed(2)}</span>
                    </div>
                  );
                } else if (isRecurring && excludeFirst && isFirstAppointment && selectedFreq?.discount) {
                  return (
                    <div className="flex justify-between text-xs">
                      <span className="text-amber-600">Frequency Discount (Applied from 2nd booking)</span>
                      <span className="text-amber-600">
                        {selectedFreq.discountType === '%' ? `${selectedFreq.discount}%` : `$${selectedFreq.discount.toFixed(2)}`}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="border-t pt-2 mt-2"></div>
              <div className="flex justify-between font-semibold text-base">
                <span>TOTAL</span>
                <span>${calculateTotalAmount.toFixed(2)}</span>
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

            {/* Zip Code */}
            <div>
              <Label htmlFor="zipCode" className="text-sm font-medium mb-2 block">Zip Code</Label>
              <Input
                id="zipCode"
                placeholder="Enter zip code"
                value={newBooking.zipCode}
                onChange={(e) => setNewBooking({ ...newBooking, zipCode: e.target.value })}
              />
            </div>

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

            {/* Address */}
            <div>
              <Label htmlFor="address" className="text-sm font-medium mb-2 block">Address</Label>
              <Input
                id="address"
                placeholder="Enter service address"
                value={newBooking.address}
                onChange={(e) => {
                  setNewBooking({ ...newBooking, address: e.target.value });
                  setErrors(prev => ({ ...prev, address: false }));
                }}
                className={errors.address ? "border-red-500" : ""}
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

            {/* First Appointment Toggle for Recurring Frequencies */}
            {(() => {
              const selectedFreq = frequencies.find(f => f.name === newBooking.frequency);
              const isRecurring = selectedFreq?.occurrence_time === 'recurring';
              const hasDiscountExclusion = selectedFreq?.frequency_discount === 'exclude-first';
              const hasShorterLength = selectedFreq?.shorter_job_length === 'yes' && selectedFreq?.exclude_first_appointment;
              
              if (isRecurring && (hasDiscountExclusion || hasShorterLength)) {
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="first-appointment"
                        checked={isFirstAppointment}
                        onCheckedChange={(checked) => setIsFirstAppointment(!!checked)}
                      />
                      <div className="flex-1">
                        <Label htmlFor="first-appointment" className="text-sm font-medium cursor-pointer">
                          This is the first appointment
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {hasDiscountExclusion && hasShorterLength && (
                            <>First appointment uses original job length and one-time pricing (no frequency discount)</>
                          )}
                          {hasDiscountExclusion && !hasShorterLength && (
                            <>First appointment charged at one-time price (no frequency discount)</>
                          )}
                          {!hasDiscountExclusion && hasShorterLength && (
                            <>First appointment uses original job length</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Dynamic Variable Categories from Pricing Parameters with Service Category and Frequency Filtering */}
            {variableCategories.length > 0 && (
              <div className={`grid gap-4 ${variableCategories.length === 1 ? 'md:grid-cols-1' : variableCategories.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                {variableCategories.map((category) => {
                  const categoryOptions = pricingParameters.filter(p => p.variable_category === category);
                  
                  console.log(`=== DEBUGGING CATEGORY: ${category} ===`);
                  console.log('Selected frequency:', newBooking.frequency);
                  console.log('Selected service:', newBooking.service);
                  console.log('Category options:', categoryOptions);
                  
                  // Start with all category options
                  let filteredOptions = categoryOptions;
                  
                  // Check if service category uses frequency-based filtering
                  const selectedServiceCategory = serviceCategories.find(cat => cat.name === newBooking.service);
                  
                  if (selectedServiceCategory) {
                    console.log('service_category_frequency:', selectedServiceCategory.service_category_frequency);
                    
                    if (selectedServiceCategory.service_category_frequency) {
                      // Use frequency dependencies - apply pricing parameter's own frequency/service filtering
                      console.log('📋 Using FREQUENCY dependencies for variables');
                      
                      // Apply frequency filtering if parameter has show_based_on_frequency enabled
                      filteredOptions = filteredOptions.filter(option => {
                        console.log(`\n🔍 Processing option: ${option.name}`);
                        console.log('  - show_based_on_frequency:', option.show_based_on_frequency);
                        console.log('  - show_based_on_service_category:', option.show_based_on_service_category);
                        console.log('  - option.frequency:', option.frequency);
                        console.log('  - option.service_category:', option.service_category);
                        
                        // If this parameter doesn't use frequency filtering, include it
                        if (!option.show_based_on_frequency) {
                          console.log('  ✅ PASS: No frequency filtering required');
                          return true;
                        }
                        
                        // If frequency is selected, check if this parameter's frequency includes the selected frequency
                        if (newBooking.frequency && option.frequency) {
                          const allowedFrequencies = option.frequency.split(', ').map(f => f.trim());
                          const frequencyMatch = allowedFrequencies.includes(newBooking.frequency);
                          console.log('  - Frequency check:', { allowedFrequencies, selected: newBooking.frequency, match: frequencyMatch });
                          if (frequencyMatch) {
                            console.log('  ✅ PASS: Frequency matches');
                            return true;
                          } else {
                            console.log('  ❌ FAIL: Frequency does not match');
                            return false;
                          }
                        }
                        
                        // If no frequency is selected but parameter requires frequency filtering, exclude it
                        console.log('  ❌ FAIL: No frequency selected but filtering required');
                        return false;
                      });
                      
                      console.log('After frequency filtering:', filteredOptions.length, 'options remaining');
                      
                      // Apply service category filtering if parameter has show_based_on_service_category enabled
                      filteredOptions = filteredOptions.filter(option => {
                        console.log(`\n🔍 Service category check for: ${option.name}`);
                        console.log('  - show_based_on_service_category:', option.show_based_on_service_category);
                        
                        // If this parameter doesn't use service category filtering, include it
                        if (!option.show_based_on_service_category) {
                          console.log('  ✅ PASS: No service category filtering required');
                          return true;
                        }
                        
                        // If service is selected, check if this parameter's service category includes the selected service
                        if (newBooking.service && option.service_category) {
                          const allowedServiceCategories = option.service_category.split(', ').map(sc => sc.trim());
                          const serviceMatch = allowedServiceCategories.includes(newBooking.service);
                          console.log('  - Service category check:', { 
                            allowedServiceCategories, 
                            selected: newBooking.service, 
                            match: serviceMatch 
                          });
                          if (serviceMatch) {
                            console.log('  ✅ PASS: Service category matches');
                            return true;
                          } else {
                            console.log('  ❌ FAIL: Service category does not match');
                            return false;
                          }
                        }
                        
                        // If no service is selected but parameter requires service category filtering, exclude it
                        console.log('  ❌ FAIL: No service selected but filtering required');
                        return false;
                      });
                      
                      console.log('After service category filtering:', filteredOptions.length, 'options remaining');
                    } else {
                      // Use service category's own variables configuration
                      console.log('📋 Using SERVICE CATEGORY configuration for variables');
                      
                      if (selectedServiceCategory.variables && selectedServiceCategory.variables[category]) {
                        // If service category has variables configured for this category, show only those
                        const allowedVariables = selectedServiceCategory.variables[category];
                        filteredOptions = filteredOptions.filter(option => 
                          allowedVariables.includes(option.name)
                        );
                        console.log('After service category variables filtering:', filteredOptions.length);
                      } else {
                        // If service category has no variables configured for this category, show none
                        console.log('No variables configured for this category in service category');
                        filteredOptions = [];
                      }
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
              // Apply filtering based on service category configuration
              let filteredExcludeParams = excludeParameters;
              
              if (newBooking.service) {
                const selectedServiceCategory = serviceCategories.find(cat => cat.name === newBooking.service);
                
                if (selectedServiceCategory) {
                  // Check if service category uses frequency-based filtering
                  if (selectedServiceCategory.service_category_frequency) {
                    // Use frequency dependencies configuration
                    console.log('📋 Using FREQUENCY dependencies for exclude parameters');
                    if (frequencyDependencies && frequencyDependencies.excludeParameters && frequencyDependencies.excludeParameters.length > 0) {
                      filteredExcludeParams = filteredExcludeParams.filter(param => 
                        frequencyDependencies.excludeParameters.includes(param.name)
                      );
                    } else {
                      // No frequency dependencies available
                      filteredExcludeParams = [];
                    }
                  } else {
                    // Use service category's own exclude parameters configuration
                    console.log('📋 Using SERVICE CATEGORY configuration for exclude parameters');
                    if (selectedServiceCategory.selected_exclude_parameters && selectedServiceCategory.selected_exclude_parameters.length > 0) {
                      filteredExcludeParams = filteredExcludeParams.filter(param => 
                        selectedServiceCategory.selected_exclude_parameters.includes(param.name)
                      );
                    } else {
                      // Service category has no exclude parameters configured
                      filteredExcludeParams = [];
                    }
                  }
                }
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
                  
                  {newBooking.adjustServiceTotal && (
                    <div className="ml-[28px]">
                      <div>
                        <Input
                          id="adjustment-service-total-amount"
                          type="number"
                          placeholder="Enter amount"
                          value={newBooking.adjustmentServiceTotalAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow positive whole numbers (no decimals, no negative)
                            if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0)) {
                              setNewBooking({ ...newBooking, adjustmentServiceTotalAmount: value });
                            }
                          }}
                          min="0"
                          step="1"
                          className="w-32"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="adjust-price"
                      checked={newBooking.adjustPrice}
                      onCheckedChange={(checked) => setNewBooking({ ...newBooking, adjustPrice: !!checked })}
                    />
                    <Label htmlFor="adjust-price" className="text-sm text-white">Do you want to adjust price?</Label>
                  </div>
                  
                  {newBooking.adjustPrice && (
                    <div className="ml-[28px]">
                      <div>
                        <Input
                          id="adjustment-amount"
                          type="number"
                          placeholder="Enter amount"
                          value={newBooking.adjustmentAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow positive whole numbers (no decimals, no negative)
                            if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0)) {
                              setNewBooking({ ...newBooking, adjustmentAmount: value });
                            }
                          }}
                          min="0"
                          step="1"
                          className="w-32"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="adjust-time"
                      checked={newBooking.adjustTime}
                      onCheckedChange={(checked) => setNewBooking({ ...newBooking, adjustTime: !!checked })}
                    />
                    <Label htmlFor="adjust-time" className="text-sm text-white">Do you want to adjust time?</Label>
                  </div>
                  
                  {newBooking.adjustTime && (
                    <div className="ml-[28px]">
                      <div className="flex items-center space-x-2">
                        <Select
                          value={newBooking.adjustedHours}
                          onValueChange={(value) => setNewBooking({ ...newBooking, adjustedHours: value })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue placeholder="Hours" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 25 }, (_, i) => i).map((hour) => (
                              <SelectItem key={hour} value={hour.toString()}>
                                {hour.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <span className="text-white">:</span>
                        
                        <Select
                          value={newBooking.adjustedMinutes}
                          onValueChange={(value) => setNewBooking({ ...newBooking, adjustedMinutes: value })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue placeholder="Min" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                              <SelectItem key={minute} value={minute.toString().padStart(2, '0')}>
                                {minute.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
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
                      onChange={(e) => setNewBooking({ ...newBooking, selectedDate: e.target.value, selectedTime: '' })}
                      min={getTodayLocalDate()}
                    />
                  </div>
                  <div>
                    <Label htmlFor="selected-time" className="text-sm font-medium mb-2 block text-white">
                      Select Time
                      {newBooking.selectedDate && (
                        <span className="text-xs text-gray-400 ml-2">
                          {loadingTimeSlots ? 'Loading...' : `${availableTimeSlots.length} time slots available`}
                        </span>
                      )}
                    </Label>
                    <Select 
                      value={newBooking.selectedTime} 
                      onValueChange={(value) => setNewBooking({ ...newBooking, selectedTime: value })}
                      disabled={!newBooking.selectedDate || loadingTimeSlots}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !newBooking.selectedDate 
                            ? "Select date first"
                            : loadingTimeSlots
                            ? "Loading slots..."
                            : availableTimeSlots.length === 0
                            ? "No slots available for this date"
                            : "--:-- --"
                        } />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {newBooking.selectedDate ? (
                          loadingTimeSlots ? (
                            <SelectItem value="loading" disabled>
                              Loading available slots...
                            </SelectItem>
                          ) : availableTimeSlots.length > 0 ? (
                            availableTimeSlots.map((time) => {
                              const [hours, minutes] = time.split(':').map(Number);
                              const period = hours >= 12 ? 'PM' : 'AM';
                              const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                              const displayTime = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
                              return (
                                <SelectItem key={time} value={time}>
                                  {displayTime}
                                </SelectItem>
                              );
                            })
                          ) : (
                            <SelectItem value="no-slots" disabled>
                              No time slots available for this date
                            </SelectItem>
                          )
                        ) : (
                          <SelectItem value="select-date" disabled>
                            Please select a date first
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {newBooking.selectedDate && availableTimeSlots.length === 0 && !loadingTimeSlots && (
                      <p className="text-xs text-yellow-400 mt-1">
                        No available time slots for this date. Please select a different date.
                      </p>
                    )}
                  </div>
                </div>

                {/* Provider Selection */}
                <div>
                  <Label htmlFor="provider-select" className="text-sm font-medium mb-2 block text-white">
                    Select Provider {
                      newBooking.selectedDate 
                        ? (loadingProviders 
                            ? '(Checking availability...)' 
                            : `(${filteredProvidersByDate.length} available on ${formatDateLocal(newBooking.selectedDate)})`)
                        : allProviders.length > 0 && `(${allProviders.length} total)`
                    }
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedProvider?.id || undefined}
                      onValueChange={(value) => {
                        const provider = filteredProvidersByDate.find(p => p.id === value);
                        if (provider) {
                          handleAssignProvider(provider);
                        }
                      }}
                      disabled={!newBooking.selectedDate || loadingProviders}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={
                          !newBooking.selectedDate 
                            ? "Select date first" 
                            : loadingProviders
                            ? "Checking availability..."
                            : filteredProvidersByDate.length === 0
                            ? "No providers available on this date"
                            : "Select a provider..."
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProvidersByDate.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedProvider && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProvider(null);
                          setNewBooking(prev => ({ ...prev, serviceProvider: '', selectedTime: '' }));
                        }}
                        className="text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {selectedProvider && (
                    <p className="text-xs text-gray-400 mt-1">
                      Selected: {selectedProvider.name}
                    </p>
                  )}
                  {!newBooking.selectedDate && (
                    <p className="text-xs text-yellow-400 mt-1">
                      Please select a date first to see available providers
                    </p>
                  )}
                  {newBooking.selectedDate && !loadingProviders && filteredProvidersByDate.length === 0 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      No providers have availability on {formatDateLocal(newBooking.selectedDate)}. Please select a different date.
                    </p>
                  )}
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
            
            {/* Key Information & Job Notes */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-white">Key Information & Job Notes</h3>
              <p className="text-sm text-gray-400 mb-4">You can turn this description off or modify it at anytime.</p>
              
              <div className="space-y-4">
                {/* Radio buttons for key access */}
                <div>
                  <Label className="text-sm font-medium mb-2 block text-white">Key Access</Label>
                  <RadioGroup
                    value={newBooking.keyInfoOption}
                    onValueChange={(value) => setNewBooking({ ...newBooking, keyInfoOption: value })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="someone-home" id="someone-home" />
                      <Label htmlFor="someone-home" className="text-sm text-white">Someone Will Be At Home</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hide-keys" id="hide-keys" />
                      <Label htmlFor="hide-keys" className="text-sm text-white">I Will Hide The Keys</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Checkbox for keeping key with provider */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="keep-key-with-provider"
                    checked={newBooking.keepKeyWithProvider}
                    onCheckedChange={(checked) => setNewBooking({ ...newBooking, keepKeyWithProvider: !!checked })}
                  />
                  <Label htmlFor="keep-key-with-provider" className="text-sm text-white">Keep Key With Provider</Label>
                </div>
                
                {/* Customer note for provider */}
                <div>
                  <Label className="text-sm font-medium mb-2 block text-white">Customer Note For Provider</Label>
                  <Textarea
                    placeholder="Special Notes And Instructions"
                    value={newBooking.customerNoteForProvider}
                    onChange={(e) => setNewBooking({ ...newBooking, customerNoteForProvider: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            </div>
            
            {/* Coupon Code & Gift Cards */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-black">Coupon Code & Gift Cards</h3>
              
              {/* Tabs */}
              <div className="flex space-x-4 mb-4 border-b border-gray-200">
                <button
                  onClick={() => setNewBooking({ ...newBooking, couponCodeTab: "coupon-code" })}
                  className={`pb-2 text-base font-semibold ${newBooking.couponCodeTab === "coupon-code" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Coupon Code
                </button>
                <button
                  onClick={() => setNewBooking({ ...newBooking, couponCodeTab: "gift-card" })}
                  className={`pb-2 text-base font-semibold ${newBooking.couponCodeTab === "gift-card" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Gift Cards
                </button>
              </div>
              
              {/* Tab Content */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                {newBooking.couponCodeTab === "coupon-code" ? (
                  <div className="space-y-6">
                    {/* Radio Buttons */}
                    <RadioGroup
                      value={newBooking.couponType}
                      onValueChange={(value) => setNewBooking({ ...newBooking, couponType: value })}
                      className="flex space-x-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value="coupon-code" 
                          id="coupon-code-radio" 
                          className="text-blue-600"
                        />
                        <Label htmlFor="coupon-code-radio" className="text-sm font-medium text-gray-900">Coupon Code</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value="amount" 
                          id="amount" 
                        />
                        <Label htmlFor="amount" className="text-sm font-medium text-gray-900">Amount</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value="percent" 
                          id="percent" 
                        />
                        <Label htmlFor="percent" className="text-sm font-medium text-gray-900">% Amount</Label>
                      </div>
                    </RadioGroup>
                    
                    {/* Input Section */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Label htmlFor="coupon-code-input" className="text-sm font-medium text-gray-900">Enter Coupon Code</Label>
                        <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-xs">i</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Input
                          id="coupon-code-input"
                          placeholder="Enter coupon code"
                          value={newBooking.couponCode}
                          onChange={(e) => setNewBooking({ ...newBooking, couponCode: e.target.value })}
                          className="flex-1 border-gray-300"
                        />
                        <Button
                          onClick={() => {
                            toast({
                              title: "Coupon Code Applied",
                              description: `Coupon code "${newBooking.couponCode}" has been applied.`,
                            });
                          }}
                          className="bg-sky-400 hover:bg-sky-500 text-white px-6"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="gift-card-code" className="text-sm font-medium text-gray-900">Gift Card Code</Label>
                      <div className="flex space-x-2 mt-2">
                        <Input
                          id="gift-card-code"
                          placeholder="Enter gift card code"
                          value={newBooking.giftCardCode}
                          onChange={(e) => setNewBooking({ ...newBooking, giftCardCode: e.target.value })}
                          className="flex-1 border-gray-300"
                        />
                        <Button
                          onClick={() => {
                            toast({
                              title: "Gift Card Applied",
                              description: `Gift card "${newBooking.giftCardCode}" has been applied.`,
                            });
                          }}
                          className="bg-sky-400 hover:bg-sky-500 text-white px-6"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
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
                      <SelectItem value="Credit Card">New Credit Card</SelectItem>
                      <SelectItem value="Cash">Cash/Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newBooking.paymentMethod === "Credit Card" && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2 text-black">Add new card</h4>
                    <div className="relative flex items-center">
                      <CreditCard className="absolute left-3 text-gray-400 w-5 h-5 z-10" />
                      <Input
                        id="card-number"
                        placeholder="Card number"
                        value={newBooking.cardNumber}
                        onChange={(e) => setNewBooking({ ...newBooking, cardNumber: e.target.value })}
                        className="pl-10 pr-32 border-gray-300"
                      />
                      <Button
                        variant="ghost"
                        className="absolute right-0 top-1/2 -translate-y-1/2 h-full bg-green-900 text-white hover:bg-green-800 rounded-l-none"
                        onClick={() => {
                          toast({
                            title: "Autofill",
                            description: "Autofill functionality not implemented.",
                          });
                        }}
                      >
                        Autofill <span className="underline ml-1">link</span>
                      </Button>
                    </div>
                  </div>
                )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}

export default AddBookingPage;
