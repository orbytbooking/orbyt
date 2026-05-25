'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';

const premiumBenefits = [
  {
    title: 'Priority support',
    description: 'Get faster responses from our team. Priority support means you skip the queue so you can focus on running your business instead of waiting on tickets.',
  },
  {
    title: 'API access',
    description: 'Connect Orbyt to your existing tools: CRMs, accounting software, or custom apps. Sync data, automate workflows, and build on top of your booking engine.',
  },
  {
    title: 'Advanced reporting',
    description: 'Deeper insights into revenue, team performance, and customer behavior. Export data and run reports that help you make better decisions as you scale.',
  },
  {
    title: 'Unlimited provider accounts',
    description: 'Add as many providers or team members as you need. No cap on growth. Ideal for multi-location or larger teams.',
  },
  {
    title: 'Full marketing & automation',
    description: 'Campaigns, leads module, daily discounts, referral and rating system, and automatic reviews. Everything you need to fill your calendar and retain customers.',
  },
  {
    title: 'Multilingual',
    description: 'Run your booking page and provider dashboards in multiple languages. Perfect for teams and customers who speak different languages.',
  },
];

export default function WhyPremiumPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/images/orbit.png" alt="Orbyt Service" className="h-8 w-8" />
            <span className="text-base font-bold text-slate-800 uppercase tracking-wide">Orbyt Service</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/#pricing" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Pricing</Link>
            <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Compare plans</Link>
            <a href="/auth/login" className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">Log In</a>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <Link href="/#pricing" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-primary mb-6">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to pricing
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight mb-2">Why upgrade to Premium?</h1>
        <p className="text-lg text-slate-600 mb-10">
          Premium is for established businesses that want everything unlocked: priority support, API access, advanced reporting, and no limits on team size or automation.
        </p>

        <div className="space-y-8">
          {premiumBenefits.map((benefit) => (
            <div key={benefit.title} className="flex gap-4">
              <span className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Check className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">{benefit.title}</h2>
                <p className="text-slate-600">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-700 font-medium mb-4">Premium includes everything in Growth, plus the benefits above. No per-booking fees. Unlimited bookings.</p>
          <Link href="/auth/login" className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 text-white font-medium hover:opacity-90 transition-opacity">
            Get Premium
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          Not sure which plan fits? <Link href="/pricing" className="text-primary font-medium hover:underline">Compare all plans</Link> or <Link href="/contact-support" className="text-primary font-medium hover:underline">contact us</Link>.
        </p>
      </main>
    </div>
  );
}
