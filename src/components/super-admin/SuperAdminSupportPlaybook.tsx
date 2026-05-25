"use client";

import { useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Eye,
  LogIn,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";

const ITEMS: { icon: typeof Building2; title: string; where: string }[] = [
  {
    icon: Eye,
    title: "View all businesses",
    where: "Use the Businesses tab. Search by name, owner name, or email.",
  },
  {
    icon: Plus,
    title: "Create tenants",
    where: "Businesses → Create business. Optionally link an existing owner by email.",
  },
  {
    icon: Pencil,
    title: "Edit tenants",
    where: "Businesses → Edit on a row. Update name, plan, contact fields, and account active flag.",
  },
  {
    icon: Trash2,
    title: "Delete tenants",
    where: "Businesses → Delete (destructive). Confirm in the dialog.",
  },
  {
    icon: UserX,
    title: "Suspend or activate accounts",
    where: "Businesses → Suspend / Activate toggles is_active. Or Edit → Account active.",
  },
  {
    icon: CreditCard,
    title: "Assign or change subscription plans",
    where: "Edit → Plan (Starter / Growth / Premium). Syncs platform_subscriptions when configured.",
  },
  {
    icon: Shield,
    title: "See usage and limits",
    where: "View opens the detail modal: bookings, providers, customers, team profiles, revenue, storage vs plan limit.",
  },
  {
    icon: LogIn,
    title: "Impersonate tenant (login as them)",
    where: "Businesses → Log in as tenant (requires an owner). Opens /admin as that user for support.",
  },
];

export function SuperAdminSupportPlaybook() {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/90 to-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-blue-50/80 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <p className="font-semibold text-gray-900 text-sm sm:text-base">Support toolkit</p>
            <p className="text-xs text-gray-600 truncate">
              What you can do here — use daily for tenant support
            </p>
          </div>
        </div>
        {open ? (
          <ChevronDown className="h-5 w-5 text-gray-500 shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500 shrink-0" />
        )}
      </button>
      {open && (
        <ul className="px-4 pb-4 pt-0 space-y-2.5 border-t border-blue-100/80">
          {ITEMS.map((item) => (
            <li key={item.title} className="flex gap-3 text-sm">
              <item.icon className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" aria-hidden />
              <div>
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="text-gray-600 text-xs leading-relaxed">{item.where}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
