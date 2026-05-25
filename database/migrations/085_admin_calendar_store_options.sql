-- Admin Bookings / dashboard calendar display preferences (General > Store options > Calendar Settings)
ALTER TABLE public.business_store_options
  ADD COLUMN IF NOT EXISTS admin_bookings_default_view text NOT NULL DEFAULT 'calendar'
    CHECK (admin_bookings_default_view = ANY (ARRAY['calendar'::text, 'listing'::text])),
  ADD COLUMN IF NOT EXISTS admin_calendar_view_mode text NOT NULL DEFAULT 'month'
    CHECK (admin_calendar_view_mode = ANY (ARRAY['month'::text, 'week'::text, 'day'::text])),
  ADD COLUMN IF NOT EXISTS admin_calendar_month_display text NOT NULL DEFAULT 'names'
    CHECK (admin_calendar_month_display = ANY (ARRAY['names'::text, 'dots'::text])),
  ADD COLUMN IF NOT EXISTS admin_calendar_multi_booking_layout text NOT NULL DEFAULT 'side_by_side'
    CHECK (admin_calendar_multi_booking_layout = ANY (ARRAY['side_by_side'::text, 'overlapped'::text])),
  ADD COLUMN IF NOT EXISTS admin_calendar_hide_non_working_hours boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.business_store_options.admin_bookings_default_view IS 'Default admin /admin/bookings view: calendar or listing';
COMMENT ON COLUMN public.business_store_options.admin_calendar_view_mode IS 'Default calendar granularity: month, week, or day';
COMMENT ON COLUMN public.business_store_options.admin_calendar_month_display IS 'Month grid cells: customer name chips or status dots';
COMMENT ON COLUMN public.business_store_options.admin_calendar_multi_booking_layout IS 'Multiple bookings same day: side_by_side or overlapped';
COMMENT ON COLUMN public.business_store_options.admin_calendar_hide_non_working_hours IS 'When calendar shows a time grid, hide provider non-working hours (reserved for timeline views)';
