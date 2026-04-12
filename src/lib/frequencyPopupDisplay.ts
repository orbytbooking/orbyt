/** Stored on `industry_frequency.popup_display` and `industry_service_category.popup_display` */
export type FrequencyPopupDisplay =
  | "customer_frontend_backend_admin"
  | "customer_backend_admin"
  | "customer_frontend_backend"
  | "admin_only";

/** Where the booking UI is running (drives which `popup_display` values apply). */
export type BookingPopupSurface =
  | "admin_staff"
  | "customer_public_frontend"
  | "customer_backend";

export function normalizeFrequencyPopupDisplay(raw: string | null | undefined): FrequencyPopupDisplay {
  const v = (raw || "").trim();
  if (
    v === "customer_frontend_backend_admin" ||
    v === "customer_backend_admin" ||
    v === "customer_frontend_backend" ||
    v === "admin_only"
  ) {
    return v;
  }
  return "customer_frontend_backend_admin";
}

/**
 * Matrix for “Display popup on”:
 *
 * - **customer_frontend_backend_admin** → all surfaces (public book-now, logged-in customer booking, admin/staff).
 * - **customer_backend_admin** → customer backend + admin/staff; not anonymous public book-now.
 * - **customer_frontend_backend** → customer-facing only (public + logged-in customer); not admin/staff.
 * - **admin_only** → admin/staff booking only.
 */
export function popupDisplayAppliesToSurface(
  popupDisplay: string | null | undefined,
  surface: BookingPopupSurface,
): boolean {
  const d = normalizeFrequencyPopupDisplay(popupDisplay);
  switch (surface) {
    case "admin_staff":
      return (
        d === "customer_frontend_backend_admin" ||
        d === "customer_backend_admin" ||
        d === "admin_only"
      );
    case "customer_public_frontend":
      return d === "customer_frontend_backend_admin" || d === "customer_frontend_backend";
    case "customer_backend":
      return (
        d === "customer_frontend_backend_admin" ||
        d === "customer_backend_admin" ||
        d === "customer_frontend_backend"
      );
    default:
      return false;
  }
}

/** Admin “New Booking” and similar staff flows */
export function frequencyPopupShowsOnAdminBooking(popupDisplay: string | null | undefined): boolean {
  return popupDisplayAppliesToSurface(popupDisplay, "admin_staff");
}

/** Anonymous public book-now */
export function frequencyPopupShowsOnPublicBooking(popupDisplay: string | null | undefined): boolean {
  return popupDisplayAppliesToSurface(popupDisplay, "customer_public_frontend");
}

/** Logged-in customer on book-now (or customer portal booking using same rules) */
export function frequencyPopupShowsOnCustomerBackendBooking(popupDisplay: string | null | undefined): boolean {
  return popupDisplayAppliesToSurface(popupDisplay, "customer_backend");
}
