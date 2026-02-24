-- Reserve Slot "Maximum settings" per-day slots (time spot, max jobs, display on)
-- One row per business; maximum_by_day and quick_add_spots stored as JSONB.
CREATE TABLE IF NOT EXISTS public.business_reserve_slot_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  maximum_by_day jsonb NOT NULL DEFAULT '{}',
  quick_add_spots jsonb NOT NULL DEFAULT '[]',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_reserve_slot_settings_pkey PRIMARY KEY (id),
  CONSTRAINT business_reserve_slot_settings_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_reserve_slot_settings_business ON public.business_reserve_slot_settings(business_id);

COMMENT ON TABLE public.business_reserve_slot_settings IS 'Reserve Slot Maximum settings: per-day time spots with max_jobs and display_on';
COMMENT ON COLUMN public.business_reserve_slot_settings.maximum_by_day IS 'JSON: { "Sunday": { "enabled": bool, "slots": [{ "id", "time", "maxJobs", "displayOn" }] }, ... }';
COMMENT ON COLUMN public.business_reserve_slot_settings.quick_add_spots IS 'JSON array of time strings e.g. ["08:00","08:30"]';
