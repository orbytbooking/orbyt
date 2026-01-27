import { supabase } from '@/lib/supabaseClient';

export interface ServiceCategory {
  id: string;
  business_id: string;
  industry_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  display: 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only';
  display_service_length_customer: 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only';
  display_service_length_provider: boolean;
  can_customer_edit_service: boolean;
  service_fee_enabled: boolean;
  service_category_frequency: boolean;
  selected_frequencies?: string[];
  variables?: { [key: string]: string[] };
  exclude_parameters?: {
    pets: boolean;
    smoking: boolean;
    deepCleaning: boolean;
  };
  selected_exclude_parameters?: string[];
  extras?: number[];
  extras_config?: {
    tip: {
      enabled: boolean;
      saveTo: 'all' | 'first';
      display: 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only';
    };
    parking: {
      enabled: boolean;
      saveTo: 'all' | 'first';
      display: 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only';
    };
  };
  expedited_charge?: {
    enabled: boolean;
    amount: string;
    displayText: string;
    currency: string;
  };
  cancellation_fee?: {
    enabled: boolean;
    type: 'single' | 'multiple';
    fee: string;
    currency: string;
    payProvider: boolean;
    providerFee: string;
    providerCurrency: string;
    chargeTiming: 'beforeDay' | 'hoursBefore';
    beforeDayTime: string;
    hoursBefore: string;
  };
  hourly_service?: {
    enabled: boolean;
    price: string;
    currency: string;
    priceCalculationType: 'customTime' | 'pricingParametersTime';
    countExtrasSeparately: boolean;
  };
  service_category_price?: {
    enabled: boolean;
    price: string;
    currency: string;
  };
  service_category_time?: {
    enabled: boolean;
    hours: string;
    minutes: string;
  };
  minimum_price?: {
    enabled: boolean;
    checkAmountType: 'discounted' | 'final';
    price: string;
    checkRecurringSchedule: boolean;
    textToDisplay: boolean;
    noticeText: string;
  };
  override_provider_pay?: {
    enabled: boolean;
    amount: string;
    currency: string;
  };
  excluded_providers?: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceCategoryData {
  business_id: string;
  industry_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  display?: ServiceCategory['display'];
  display_service_length_customer?: ServiceCategory['display_service_length_customer'];
  display_service_length_provider?: boolean;
  can_customer_edit_service?: boolean;
  service_fee_enabled?: boolean;
  service_category_frequency?: boolean;
  selected_frequencies?: string[];
  variables?: { [key: string]: string[] };
  exclude_parameters?: {
    pets: boolean;
    smoking: boolean;
    deepCleaning: boolean;
  };
  selected_exclude_parameters?: string[];
  extras?: number[];
  extras_config?: ServiceCategory['extras_config'];
  expedited_charge?: ServiceCategory['expedited_charge'];
  cancellation_fee?: ServiceCategory['cancellation_fee'];
  hourly_service?: ServiceCategory['hourly_service'];
  service_category_price?: ServiceCategory['service_category_price'];
  service_category_time?: ServiceCategory['service_category_time'];
  minimum_price?: ServiceCategory['minimum_price'];
  override_provider_pay?: ServiceCategory['override_provider_pay'];
  excluded_providers?: string[];
  sort_order?: number;
}

export interface UpdateServiceCategoryData extends Partial<CreateServiceCategoryData> {}

class ServiceCategoriesService {
  private supabase;

  constructor() {
    this.supabase = supabase;
  }

  async getServiceCategoriesByIndustry(industryId: string): Promise<ServiceCategory[]> {
    const { data, error } = await this.supabase
      .from('industry_service_category')
      .select('*')
      .eq('industry_id', industryId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching service categories:', error);
      throw error;
    }

    return data || [];
  }

  async getServiceCategoryById(id: string): Promise<ServiceCategory | null> {
    const { data, error } = await this.supabase
      .from('industry_service_category')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching service category:', error);
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  }

  async createServiceCategory(categoryData: CreateServiceCategoryData): Promise<ServiceCategory> {
    const { data, error } = await this.supabase
      .from('industry_service_category')
      .insert(categoryData)
      .select()
      .single();

    if (error) {
      console.error('Error creating service category:', error);
      throw error;
    }

    return data;
  }

  async updateServiceCategory(id: string, updateData: UpdateServiceCategoryData): Promise<ServiceCategory> {
    const { data, error } = await this.supabase
      .from('industry_service_category')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service category:', error);
      throw error;
    }

    return data;
  }

  async deleteServiceCategory(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('industry_service_category')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting service category:', error);
      throw error;
    }
  }

  async updateServiceCategoryOrder(updates: Array<{ id: string; sort_order: number }>): Promise<void> {
    const promises = updates.map(({ id, sort_order }) =>
      this.supabase
        .from('industry_service_category')
        .update({ sort_order })
        .eq('id', id)
    );

    const results = await Promise.all(promises);
    
    for (const result of results) {
      if (result.error) {
        console.error('Error updating service category order:', result.error);
        throw result.error;
      }
    }
  }

  async migrateFromLocalStorage(industryId: string, industryName: string): Promise<void> {
    try {
      const storageKey = `service_categories_${industryName}`;
      const stored = localStorage.getItem(storageKey);
      
      if (!stored || stored === "null") {
        console.log(`No service categories found in localStorage for ${industryName}`);
        return;
      }

      const localStorageCategories = JSON.parse(stored);
      if (!Array.isArray(localStorageCategories) || localStorageCategories.length === 0) {
        console.log(`No valid service categories array found in localStorage for ${industryName}`);
        return;
      }

      console.log(`Migrating ${localStorageCategories.length} service categories from localStorage to database for ${industryName}`);

      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: business } = await this.supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      
      if (!business) throw new Error('Business not found');

      const dbCategories: CreateServiceCategoryData[] = localStorageCategories.map((category, index) => ({
        business_id: business.id,
        industry_id: industryId,
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        display: category.display || 'customer_frontend_backend_admin',
        display_service_length_customer: category.displayServiceLengthCustomer || 'admin_only',
        display_service_length_provider: category.displayServiceLengthProvider || false,
        can_customer_edit_service: category.canCustomerEditService || false,
        service_fee_enabled: category.serviceFeeEnabled || false,
        service_category_frequency: category.serviceCategoryFrequency || false,
        selected_frequencies: category.selectedFrequencies || [],
        variables: category.variables || {},
        exclude_parameters: category.excludeParameters || {
          pets: false,
          smoking: false,
          deepCleaning: false
        },
        selected_exclude_parameters: category.selectedExcludeParameters || [],
        extras: category.extras || [],
        extras_config: category.extrasConfig || {
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
        },
        expedited_charge: category.expeditedCharge || {
          enabled: false,
          amount: "",
          displayText: "",
          currency: "$"
        },
        cancellation_fee: category.cancellationFee || {
          enabled: false,
          type: 'single',
          fee: "",
          currency: "$",
          payProvider: false,
          providerFee: "",
          providerCurrency: "$",
          chargeTiming: 'beforeDay',
          beforeDayTime: "",
          hoursBefore: ""
        },
        hourly_service: category.hourlyService || {
          enabled: false,
          price: "",
          currency: "$",
          priceCalculationType: 'customTime',
          countExtrasSeparately: false
        },
        service_category_price: category.serviceCategoryPrice || {
          enabled: false,
          price: "",
          currency: "$"
        },
        service_category_time: category.serviceCategoryTime || {
          enabled: false,
          hours: "0",
          minutes: "0"
        },
        minimum_price: category.minimumPrice || {
          enabled: false,
          checkAmountType: 'discounted',
          price: "",
          checkRecurringSchedule: false,
          textToDisplay: false,
          noticeText: ""
        },
        override_provider_pay: category.overrideProviderPay || {
          enabled: false,
          amount: "",
          currency: "$"
        },
        excluded_providers: category.excludedProviders || [],
        sort_order: index
      }));

      const { data, error } = await this.supabase
        .from('industry_service_category')
        .insert(dbCategories)
        .select();

      if (error) {
        console.error('Error migrating service categories:', error);
        throw error;
      }

      console.log(`Successfully migrated ${data?.length || 0} service categories to database`);

      localStorage.removeItem(storageKey);
      console.log(`Cleared localStorage for ${industryName} service categories`);

    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }
}

export const serviceCategoriesService = new ServiceCategoriesService();
