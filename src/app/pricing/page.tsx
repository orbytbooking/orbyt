'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { PRICING_FEATURES, type FeatureValue } from '@/lib/pricing/pricingFeatures';

type PricingPlanRow = {
  id?: string;
  slug: string;
  name: string;
  amount_cents: number | null;
  pricing_features: Record<string, FeatureValue> | null;
};

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
  const [plans, setPlans] = useState<PricingPlanRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/platform/pricing-plans');
        const j = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) return;
        setPlans((j?.plans ?? []) as PricingPlanRow[]);
      } catch {
        // Non-fatal: pricing page will fall back to hardcoded defaults.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const planBySlug = useMemo(() => {
    const out: Record<string, PricingPlanRow> = {};
    for (const p of plans ?? []) out[p.slug] = p;
    return out;
  }, [plans]);

  const formatPrice = (slug: string, fallbackDollars: number) => {
    const cents = planBySlug[slug]?.amount_cents ?? null;
    if (cents === null || cents === undefined) return fallbackDollars;
    return Math.round((cents / 100) * 100) / 100;
  };

  const getFeatureValue = (planSlug: string, featureName: string, fallback: FeatureValue): FeatureValue => {
    const v = planBySlug[planSlug]?.pricing_features?.[featureName];
    return v !== undefined ? v : fallback;
  };

  const priceStarter = formatPrice('starter', 25);
  const priceGrowth = formatPrice('growth', 55);
  const pricePremium = formatPrice('premium', 149);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/images/orbit.png" alt="Orbyt Service logo" className="h-8 w-8" />
            <span className="text-base font-bold text-slate-800 uppercase tracking-wide">Orbyt Service</span>
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
              <span className="text-3xl font-bold text-sky-500">${priceStarter}</span>
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
              <span className="text-3xl font-bold text-sky-500">${priceGrowth}</span>
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
              <span className="text-3xl font-bold text-sky-500">${pricePremium}</span>
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
                {PRICING_FEATURES.map((feature, i) => (
                  <tr
                    key={feature.name}
                    className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {feature.name}
                    </td>
                    <FeatureCell
                      value={getFeatureValue('starter', feature.name, feature.starter)}
                    />
                    <FeatureCell
                      value={getFeatureValue('growth', feature.name, feature.growth)}
                    />
                    <FeatureCell
                      value={getFeatureValue('premium', feature.name, feature.premium)}
                    />
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
