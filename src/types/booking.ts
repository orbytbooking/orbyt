export interface IndustryFrequency {
  id: string;
  business_id: string;
  industry_id: string;
  name: string;
  description?: string;
  different_on_customer_end?: boolean;
  show_explanation?: boolean;
  enable_popup?: boolean;
  display: "Both" | "Booking" | "Quote";
  occurrence_time: string;
  discount?: number;
  discount_type?: "%" | "$";
  is_default?: boolean;
  excluded_providers?: string[];
  frequency_repeats?: string;
  shorter_job_length?: string;
  shorter_job_length_by?: string;
  exclude_first_appointment?: boolean;
  frequency_discount?: string;
  charge_one_time_price?: boolean;
  add_to_other_industries?: boolean;
  enabled_industries?: string[];
  show_based_on_location?: boolean;
  location_ids?: string[];
  service_categories?: string[];
  bathroom_variables?: string[];
  sqft_variables?: string[];
  bedroom_variables?: string[];
  exclude_parameters?: string[];
  extras?: string[];
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FrequencyRow {
  id: string;
  name: string;
  display: "Both" | "Booking" | "Quote";
  isDefault?: boolean;
  discount?: number;
  discountType?: "%" | "$";
}

export interface Extra {
  id: string;
  name: string;
  time: number; // in minutes
  serviceCategory: string;
  price: number;
  display: "frontend-backend-admin" | "backend-admin" | "admin-only" | "Both" | "Booking" | "Quote"; // Support legacy values
  qtyBased: boolean;
  exemptFromDiscount?: boolean;
  description?: string;
  serviceChecklists?: string[];
}

export interface BookingFormState {
  customerType: "new" | "existing";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  duration: string;
  durationUnit: "Hours" | "Minutes";
  frequency: string;
  selectedExtras: string[];
  privateBookingNotes: string[];
  privateCustomerNotes: string[];
  serviceProviderNotes: string[];
  privateBookingNote: string;
  privateCustomerNote: string;
  serviceProviderNote: string;
  notifyMoreTime: boolean;
  address: string;
  zipCode: string;
  serviceProvider: string;
  waitingList: boolean;
  scheduleType: "From Schedule" | "Manual";
  selectedDate: string;
  selectedTime: string;
  priority: "Low" | "Medium" | "High";
  paymentMethod: string;
  notes: string;
  adjustServiceTotal: boolean;
  adjustPrice: boolean;
  excludeCancellationFee: boolean;
  excludeMinimumFee: boolean;
  excludeCustomerNotification: boolean;
  excludeProviderNotification: boolean;
}
