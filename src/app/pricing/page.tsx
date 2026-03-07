'use client';

import Link from 'next/link';
import { Check, X } from 'lucide-react';

type FeatureValue = boolean | string;

type PlanFeature = {
  name: string;
  category?: string;
  starter: FeatureValue;
  growth: FeatureValue;
  premium: FeatureValue;
};

const features: PlanFeature[] = [
  { name: 'Providers / Managers', category: 'Team', starter: true, growth: true, premium: true },
  { name: 'Provider accounts', category: 'Team', starter: '3', growth: '10', premium: 'Unlimited' },
  { name: 'Campaigns', category: 'Marketing', starter: '1 campaign', growth: '5 campaigns', premium: 'Unlimited' },
  { name: 'Hiring workspace', category: 'Team', starter: false, growth: true, premium: true },
  { name: 'Website builder', category: 'Branding', starter: 'Basic', growth: 'Advanced', premium: 'Advanced + custom' },
  { name: 'Custom domain', category: 'Branding', starter: false, growth: true, premium: true },
  { name: 'SSL protection', category: 'Security', starter: true, growth: true, premium: true },
  { name: 'Booking forms & customization', category: 'Booking', starter: '1 form', growth: 'Custom forms', premium: 'Unlimited' },
  { name: 'Import tool', category: 'Data', starter: false, growth: true, premium: true },
  { name: 'Export bookings', category: 'Data', starter: true, growth: true, premium: true },
  { name: 'Mobile access', category: 'Access', starter: true, growth: true, premium: true },
  { name: 'Customer dashboard', category: 'Dashboards', starter: true, growth: true, premium: true },
  { name: 'Provider / Team dashboard', category: 'Dashboards', starter: true, growth: true, premium: true },
  { name: 'Admin / Business dashboard', category: 'Dashboards', starter: true, growth: true, premium: true },
  { name: 'Smart scheduling', category: 'Booking', starter: true, growth: true, premium: true },
  { name: 'Calendar', category: 'Booking', starter: true, growth: true, premium: true },
  { name: 'Unassigned bookings & drafts', category: 'Booking', starter: true, growth: true, premium: true },
  { name: 'Online payments', category: 'Payments', starter: true, growth: true, premium: true },
  { name: 'Invoicing', category: 'Payments', starter: false, growth: true, premium: true },
  { name: 'Cancellation fees', category: 'Booking', starter: false, growth: true, premium: true },
  { name: 'Third party integrations', category: 'Integrations', starter: false, growth: 'Limited', premium: 'Full API' },
  { name: 'Cart abandonment & email lists', category: 'Marketing', starter: 'Basic via third party', growth: 'Basic via third party', premium: 'Leads module + advanced' },
  { name: 'Remove Orbyt branding', category: 'Branding', starter: false, growth: true, premium: true },
  { name: 'Schedule automatically', category: 'Booking', starter: true, growth: true, premium: true },
  { name: 'Email / analytics tracking', category: 'Reports', starter: false, growth: true, premium: true },
  { name: 'Team alerts', category: 'Notifications', starter: false, growth: true, premium: true },
  { name: 'Team & clock in/out', category: 'Team', starter: false, growth: true, premium: true },
  { name: 'Referral & rating system', category: 'Marketing', starter: false, growth: true, premium: true },
  { name: 'Automatic reviews', category: 'Marketing', starter: false, growth: true, premium: true },
  { name: 'Team logs & history', category: 'Reports', starter: false, growth: true, premium: true },
  { name: 'Location & time zones', category: 'Settings', starter: true, growth: true, premium: true },
  { name: 'Translation', category: 'Settings', starter: '1 language', growth: '1 language', premium: 'Multilingual' },
  { name: 'Coupons', category: 'Marketing', starter: true, growth: true, premium: true },
  { name: 'Daily discounts', category: 'Marketing', starter: false, growth: true, premium: true },
  { name: 'Email notifications', category: 'Notifications', starter: true, growth: true, premium: true },
  { name: 'SMS notifications', category: 'Notifications', starter: false, growth: true, premium: true },
  { name: 'AI Virtual Receptionist', category: 'AI', starter: false, growth: true, premium: true },
  { name: 'Advanced reports', category: 'Reports', starter: false, growth: 'Basic', premium: 'Full' },
  { name: 'Support', category: 'Support', starter: 'Email', growth: 'Email + chat', premium: 'Priority' },
];

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) {
    return (
      <td className="px-4 py-3 text-center">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600" aria-hidden>
          <Check className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </td>
    );
  }
  if (value === false) {
    return (
      <td className="px-4 py-3 text-center">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400" aria-hidden>
          <X className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </td>
    );
  }
  return (
    <td className="px-4 py-3 text-center text-sm text-slate-600">
      {value}
    </td>
  );
}

export default function PricingDetailsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/images/orbit.png" alt="Orbyt Booking logo" className="h-8 w-8" />
            <span className="text-base font-bold text-slate-800 uppercase tracking-wide">Orbyt Booking</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/#features" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">
              Features
            </Link>
            <a
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Log In
            </a>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Page header */}
        <div className="mb-10">
          <Link href="/#pricing" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-primary mb-4">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to pricing
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight mb-2">
            Compare plans in detail
          </h1>
          <p className="text-lg text-slate-600">
            See exactly what you get with each plan. All plans include unlimited bookings.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-1">Starter</h2>
            <p className="text-sm text-slate-600 mb-4">Solo operators and small teams</p>
            <div className="mb-4">
              <span className="text-3xl font-bold text-sky-500">$19</span>
              <span className="text-slate-600 text-sm ml-1">/mo</span>
            </div>
            <a
              href="/auth/login"
              className="block w-full py-2.5 text-center rounded-lg border-2 border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Get started
            </a>
          </div>

          <div className="rounded-2xl border-2 border-primary bg-white p-6 shadow-md relative">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              Most popular
            </span>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Growth</h2>
            <p className="text-sm text-slate-600 mb-4">Growing teams that need more</p>
            <div className="mb-4">
              <span className="text-3xl font-bold text-sky-500">$49</span>
              <span className="text-slate-600 text-sm ml-1">/mo</span>
            </div>
            <a
              href="/auth/login"
              className="block w-full py-2.5 text-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Try free for 14 days
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-1">Premium</h2>
            <p className="text-sm text-slate-600 mb-4">Everything unlocked</p>
            <div className="mb-4">
              <span className="text-3xl font-bold text-sky-500">$110</span>
              <span className="text-slate-600 text-sm ml-1">/mo</span>
            </div>
            <a
              href="/auth/login"
              className="block w-full py-2.5 text-center rounded-lg border-2 border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Get started
            </a>
          </div>
        </div>

        {/* Comparison table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-4 text-left text-sm font-semibold text-slate-800">Feature</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-800">Starter</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-800">Growth</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-800">Premium</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, i) => (
                  <tr
                    key={feature.name}
                    className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {feature.name}
                    </td>
                    <FeatureCell value={feature.starter} />
                    <FeatureCell value={feature.growth} />
                    <FeatureCell value={feature.premium} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-slate-600 mb-4">No credit card required. Cancel anytime.</p>
          <a
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-3 text-white font-medium hover:opacity-90 transition-opacity"
          >
            Start free trial
          </a>
        </div>
      </main>
    </div>
  );
}
