/**
 * Coarse admin CRM modules (matches main sidebar). Values are stored on staff + tenant_users as JSON:
 * { "dashboard": true, "bookings": false, ... }. Null/legacy = all allowed.
 */
export const ADMIN_MODULE_DEFS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "bookings", label: "Bookings" },
  { key: "customers", label: "Customers" },
  { key: "leads", label: "Leads" },
  { key: "hiring", label: "Hiring" },
  { key: "providers", label: "Providers" },
  { key: "marketing", label: "Marketing" },
  { key: "reports", label: "Reports" },
  { key: "logs", label: "Logs" },
  { key: "settings", label: "Settings" },
] as const;

export type AdminModuleKey = (typeof ADMIN_MODULE_DEFS)[number]["key"];

const ALL_KEYS = ADMIN_MODULE_DEFS.map((m) => m.key) as AdminModuleKey[];

export function defaultAllModulesAllowed(): Record<AdminModuleKey, boolean> {
  return Object.fromEntries(ALL_KEYS.map((k) => [k, true])) as Record<AdminModuleKey, boolean>;
}

/** Normalize client/API payload into a full map (defaults true for missing keys). */
export function normalizeModulePermissionsMap(raw: unknown): Record<AdminModuleKey, boolean> {
  const out = defaultAllModulesAllowed();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;
  for (const k of ALL_KEYS) {
    if (k in o) out[k] = Boolean(o[k]);
  }
  return out;
}

/** DB value: null/undefined => treat as full access (legacy). */
export function effectiveModuleAllowed(
  isOwner: boolean,
  permissions: Record<string, boolean> | null | undefined,
  moduleKey: string
): boolean {
  if (isOwner) return true;
  if (permissions == null) return true;
  if (typeof permissions !== "object" || Array.isArray(permissions)) return true;
  const v = (permissions as Record<string, boolean>)[moduleKey];
  if (v === false) return false;
  return true;
}

const PATH_RULES: { prefix: string; module: AdminModuleKey }[] = [
  { prefix: "/admin/dashboard", module: "dashboard" },
  { prefix: "/admin/bookings", module: "bookings" },
  { prefix: "/admin/booking-charges", module: "bookings" },
  { prefix: "/admin/add-booking", module: "bookings" },
  { prefix: "/admin/customers", module: "customers" },
  { prefix: "/admin/leads", module: "leads" },
  { prefix: "/admin/hiring", module: "hiring" },
  { prefix: "/admin/providers", module: "providers" },
  { prefix: "/admin/provider-payments", module: "providers" },
  { prefix: "/admin/add-provider", module: "providers" },
  { prefix: "/admin/marketing", module: "marketing" },
  { prefix: "/admin/reports", module: "reports" },
  { prefix: "/admin/logs", module: "logs" },
  { prefix: "/admin/settings", module: "settings" },
  { prefix: "/admin/website-builder", module: "settings" },
];

/** Paths any signed-in admin user may open without a module flag (profile, etc.). */
const ALWAYS_ALLOWED_PREFIXES = ["/admin/profile"];

export function pathnameToRequiredAdminModule(pathname: string): AdminModuleKey | null {
  const p = pathname.split("?")[0] || "";
  if (!p.startsWith("/admin")) return null;
  for (const pre of ALWAYS_ALLOWED_PREFIXES) {
    if (p === pre || p.startsWith(pre + "/")) return null;
  }
  if (p === "/admin" || p === "/admin/") return "dashboard";
  for (const { prefix, module } of PATH_RULES) {
    if (p === prefix || p.startsWith(prefix + "/")) return module;
  }
  return null;
}

const MODULE_HOME: Record<AdminModuleKey, string> = {
  dashboard: "/admin/dashboard",
  bookings: "/admin/bookings",
  customers: "/admin/customers",
  leads: "/admin/leads",
  hiring: "/admin/hiring",
  providers: "/admin/providers",
  marketing: "/admin/marketing",
  reports: "/admin/reports",
  logs: "/admin/logs",
  settings: "/admin/settings",
};

export function firstAllowedAdminPath(
  isOwner: boolean,
  permissions: Record<string, boolean> | null | undefined
): string {
  for (const k of ALL_KEYS) {
    if (effectiveModuleAllowed(isOwner, permissions, k)) return MODULE_HOME[k];
  }
  return "/admin/profile";
}
