import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeFrequencyPopupDisplay } from "@/lib/frequencyPopupDisplay";

const POPUP = normalizeFrequencyPopupDisplay("customer_frontend_backend_admin");

/** Same default frequency set as Form 2; stored in `industry_form3_frequencies`. */
const FORM3_DEFAULT_FREQUENCY_ROWS: Array<{
  name: string;
  occurrence_time: "onetime" | "recurring";
  discount: number;
  is_default: boolean;
  frequency_repeats: string | null;
  shorter_job_length: string;
  shorter_job_length_by: string;
  frequency_discount: string;
}> = [
  {
    name: "2x per week",
    occurrence_time: "recurring",
    discount: 0,
    is_default: false,
    frequency_repeats: "every-mon-fri",
    shorter_job_length: "no",
    shorter_job_length_by: "0",
    frequency_discount: "all",
  },
  {
    name: "3x per week",
    occurrence_time: "recurring",
    discount: 0,
    is_default: false,
    frequency_repeats: "every-mon-wed-fri",
    shorter_job_length: "no",
    shorter_job_length_by: "0",
    frequency_discount: "all",
  },
  {
    name: "Daily 5x per week",
    occurrence_time: "recurring",
    discount: 10,
    is_default: false,
    frequency_repeats: "daily-no-sat-sun",
    shorter_job_length: "no",
    shorter_job_length_by: "0",
    frequency_discount: "all",
  },
  {
    name: "One-Time",
    occurrence_time: "onetime",
    discount: 0,
    is_default: true,
    frequency_repeats: null,
    shorter_job_length: "no",
    shorter_job_length_by: "0",
    frequency_discount: "all",
  },
  {
    name: "Weekly",
    occurrence_time: "recurring",
    discount: 15,
    is_default: false,
    frequency_repeats: "every-week",
    shorter_job_length: "no",
    shorter_job_length_by: "0",
    frequency_discount: "all",
  },
  {
    name: "Every Other Week",
    occurrence_time: "recurring",
    discount: 10,
    is_default: false,
    frequency_repeats: "every-2-weeks",
    shorter_job_length: "no",
    shorter_job_length_by: "0",
    frequency_discount: "all",
  },
  {
    name: "Monthly",
    occurrence_time: "recurring",
    discount: 5,
    is_default: false,
    frequency_repeats: "every-4-weeks",
    shorter_job_length: "no",
    shorter_job_length_by: "0",
    frequency_discount: "all",
  },
];

export async function seedForm3DefaultFrequenciesIfEmpty(
  supabase: SupabaseClient,
  businessId: string,
  industryId: string,
): Promise<{ applied: boolean; skipped?: boolean; error?: string }> {
  try {
    const { count, error: cErr } = await supabase
      .from("industry_form3_frequencies")
      .select("*", { count: "exact", head: true })
      .eq("industry_id", industryId)
      .eq("booking_form_scope", "form3");

    if (cErr) {
      return { applied: false, error: cErr.message };
    }
    if ((count ?? 0) > 0) {
      return { applied: false, skipped: true };
    }

    const rows = FORM3_DEFAULT_FREQUENCY_ROWS.map((fr) => ({
      business_id: businessId,
      industry_id: industryId,
      booking_form_scope: "form3",
      name: fr.name,
      display: "Both",
      occurrence_time: fr.occurrence_time,
      discount: fr.discount,
      discount_type: "%",
      is_default: fr.is_default,
      popup_display: POPUP,
      frequency_repeats: fr.frequency_repeats,
      shorter_job_length: fr.shorter_job_length,
      shorter_job_length_by: fr.shorter_job_length_by,
      exclude_first_appointment: false,
      frequency_discount: fr.frequency_discount,
      charge_one_time_price: false,
      service_categories: [] as string[],
      bathroom_variables: [] as string[],
      sqft_variables: [] as string[],
      bedroom_variables: [] as string[],
      exclude_parameters: [] as string[],
      extras: [] as string[],
      show_based_on_location: false,
      location_ids: [] as string[],
      is_active: true,
    }));

    const { error: insErr } = await supabase.from("industry_form3_frequencies").insert(rows);
    if (insErr) {
      return { applied: false, error: insErr.message };
    }

    const { error: defErr } = await supabase
      .from("industry_form3_frequencies")
      .update({ is_default: false })
      .eq("business_id", businessId)
      .eq("industry_id", industryId)
      .eq("booking_form_scope", "form3");
    if (defErr) {
      return { applied: false, error: defErr.message };
    }

    const { data: oneTime, error: otErr } = await supabase
      .from("industry_form3_frequencies")
      .select("id")
      .eq("industry_id", industryId)
      .eq("booking_form_scope", "form3")
      .eq("name", "One-Time")
      .maybeSingle();
    if (otErr) {
      return { applied: false, error: otErr.message };
    }
    if (oneTime?.id) {
      const { error: u2 } = await supabase
        .from("industry_form3_frequencies")
        .update({ is_default: true })
        .eq("id", oneTime.id)
        .eq("business_id", businessId)
        .eq("industry_id", industryId);
      if (u2) {
        return { applied: false, error: u2.message };
      }
    }

    return { applied: true };
  } catch (e) {
    return { applied: false, error: e instanceof Error ? e.message : "seed failed" };
  }
}
