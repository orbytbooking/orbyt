-- Daily settings grid, admin reserved time blocks, and per-location booking spots (admin UI) as JSONB.
ALTER TABLE public.business_reserve_slot_settings
  ADD COLUMN IF NOT EXISTS extended_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.business_reserve_slot_settings.extended_settings IS
  'JSON: { dailySettings?: [], slots?: reserved blocks [{id,startDate,endDate,startTime,endTime,reason}], bookingSpots?: { locations: [...] } }';
