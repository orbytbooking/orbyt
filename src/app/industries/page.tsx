'use client';

import Link from 'next/link';

const industries = [
  {
    name: 'Home cleaning',
    description: 'Residential and recurring cleaning. Set pricing by bedrooms, bathrooms, square footage, or custom quotes. Manage teams and schedules in one place.',
  },
  {
    name: 'Office cleaning',
    description: 'Commercial cleaning with flexible scheduling and multi-location support. Invoicing and contract-friendly billing.',
  },
  {
    name: 'Carpet & upholstery cleaning',
    description: 'Job-based pricing by room count or area. Add-ons for stain treatment and protection. Easy scheduling and reminders.',
  },
  {
    name: 'Window cleaning',
    description: 'Per-window or per-job pricing. Track recurring services and one-off jobs. Perfect for residential and commercial.',
  },
  {
    name: 'Lawn care & landscaping',
    description: 'Seasonal and one-time services. Price by property size or service type. Route planning and team assignment.',
  },
  {
    name: 'Pet grooming & dog walking',
    description: 'Per-pet pricing and recurring walks. Customer and pet profiles. Booking forms that fit your service menu.',
  },
  {
    name: 'Moving & junk removal',
    description: 'Quote by truck load, distance, or item count. Deposit and payment collection. Flexible scheduling.',
  },
  {
    name: 'HVAC & home services',
    description: 'Service calls, maintenance plans, and repairs. Variable pricing and technician scheduling. Invoicing and parts tracking.',
  },
  {
    name: 'Salon & barber',
    description: 'Stylists and chairs. Service menus and add-ons. Waitlists and no-show reduction with reminders.',
  },
  {
    name: 'Fitness & personal training',
    description: 'Sessions, packages, and memberships. Trainer availability and client dashboards. Payments and recurring billing.',
  },
  {
    name: 'Photography',
    description: 'Session types and packages. Calendar and deposit collection. Galleries and delivery tracking.',
  },
  {
    name: 'Tutoring & education',
    description: 'Subject and duration-based pricing. Recurring or one-off sessions. Parent and student accounts.',
  },
];

export default function IndustriesPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/images/orbit.png" alt="Orbyt Booking" className="h-8 w-8" />
            <span className="text-base font-bold text-slate-800 uppercase tracking-wide">Orbyt Booking</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/#features" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Features</Link>
            <Link href="/#pricing" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Pricing</Link>
            <a href="/auth/login" className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">Log In</a>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-primary mb-6">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight mb-2">Who Orbyt is for</h1>
        <p className="text-lg text-slate-600 mb-10">
          Orbyt is built for service businesses with fully customizable pricing. Set rates by job, fixed price, per hour, or percentage. From cleaning and lawn care to salons and tutoring, one platform handles scheduling, your pricing model, and payments.
        </p>

        <div className="space-y-6">
          {industries.map((industry) => (
            <div key={industry.name} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">{industry.name}</h2>
              <p className="text-slate-600">{industry.description}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-slate-600 text-center">
          Don&apos;t see your industry? Orbyt&apos;s flexible pricing and booking work for many service types. <Link href="/contact-support" className="text-primary font-medium hover:underline">Contact us</Link> to see if we&apos;re a fit.
        </p>
        <div className="mt-8 text-center">
          <Link href="/auth/login" className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 text-white font-medium hover:opacity-90 transition-opacity">
            Start free trial
          </Link>
        </div>
      </main>
    </div>
  );
}
