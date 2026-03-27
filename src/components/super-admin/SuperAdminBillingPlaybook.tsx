"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  ExternalLink,
  Layers,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

const ITEMS: { icon: typeof CreditCard; title: string; where: string }[] = [
  {
    icon: TrendingUp,
    title: "View all subscriptions",
    where: "Table below lists every platform subscription (plan, status, renewal, Stripe IDs). Use Refresh after changes.",
  },
  {
    icon: ArrowDownUp,
    title: "Upgrade / downgrade plans",
    where: "Businesses tab → Edit → Plan. Or tenant changes plan in Stripe Customer Portal (Open Stripe portal on a business).",
  },
  {
    icon: AlertTriangle,
    title: "Handle failed payments",
    where: "Watch past_due status and failed payment counts. Open Stripe Dashboard → Customers → subscription to retry or update payment method. Stripe webhooks keep Orbyt in sync.",
  },
  {
    icon: RefreshCw,
    title: "Refunds & credits",
    where: "Issued in Stripe (invoice or payment). Refunded rows appear in platform_payments when wired; use Stripe as source of truth for money movement.",
  },
  {
    icon: DollarSign,
    title: "Revenue tracking",
    where: "Overview & Analytics show subscription revenue by plan and recent platform payments. Upcoming renewals lists expected MRR from active subs.",
  },
  {
    icon: Layers,
    title: "Plans & feature limits",
    where: "Plans tab: create tiers (Basic / Pro / Premium), set max calendars, staff/users, and bookings per month. Empty limit = unlimited.",
  },
];

export function SuperAdminBillingPlaybook() {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 to-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-emerald-50/80 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <CreditCard className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-gray-900 text-sm sm:text-base">
              Billing &amp; subscription management
            </p>
            <p className="text-xs text-gray-600 truncate">Your revenue engine — how to use Orbyt + Stripe</p>
          </div>
        </div>
        {open ? (
          <ChevronDown className="h-5 w-5 text-gray-500 shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500 shrink-0" />
        )}
      </button>
      {open && (
        <ul className="px-4 pb-4 pt-0 space-y-2.5 border-t border-emerald-100/80">
          {ITEMS.map((item) => (
            <li key={item.title} className="flex gap-3 text-sm">
              <item.icon className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden />
              <div>
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="text-gray-600 text-xs leading-relaxed">{item.where}</p>
              </div>
            </li>
          ))}
          <li className="flex gap-3 text-sm pt-1 border-t border-emerald-100/60">
            <ExternalLink className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden />
            <p className="text-xs text-gray-600">
              <span className="font-medium text-gray-800">Stripe Dashboard</span> —{" "}
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:underline"
              >
                dashboard.stripe.com
              </a>{" "}
              for invoices, refunds, and payment method updates.
            </p>
          </li>
        </ul>
      )}
    </div>
  );
}
