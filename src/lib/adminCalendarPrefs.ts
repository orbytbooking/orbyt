/** Mirrors `business_store_options` admin calendar columns (client-side defaults). */
export type AdminCalendarPrefsState = {
  admin_bookings_default_view: "calendar" | "listing";
  admin_calendar_view_mode: "month" | "week" | "day";
  admin_calendar_month_display: "names" | "dots";
  admin_calendar_multi_booking_layout: "side_by_side" | "overlapped";
  admin_calendar_hide_non_working_hours: boolean;
};

export const DEFAULT_ADMIN_CALENDAR_PREFS: AdminCalendarPrefsState = {
  admin_bookings_default_view: "calendar",
  admin_calendar_view_mode: "month",
  admin_calendar_month_display: "names",
  admin_calendar_multi_booking_layout: "side_by_side",
  admin_calendar_hide_non_working_hours: false,
};

export function parseAdminCalendarPrefs(options: Record<string, unknown> | null | undefined): AdminCalendarPrefsState {
  if (!options) return { ...DEFAULT_ADMIN_CALENDAR_PREFS };
  const o = options;
  return {
    admin_bookings_default_view: o.admin_bookings_default_view === "listing" ? "listing" : "calendar",
    admin_calendar_view_mode: ["month", "week", "day"].includes(String(o.admin_calendar_view_mode))
      ? (o.admin_calendar_view_mode as AdminCalendarPrefsState["admin_calendar_view_mode"])
      : "month",
    admin_calendar_month_display: o.admin_calendar_month_display === "dots" ? "dots" : "names",
    admin_calendar_multi_booking_layout:
      o.admin_calendar_multi_booking_layout === "overlapped" ? "overlapped" : "side_by_side",
    admin_calendar_hide_non_working_hours: o.admin_calendar_hide_non_working_hours === true,
  };
}
