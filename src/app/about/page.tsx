'use client';

import Link from 'next/link';
import {
  Users,
  Target,
  Star,
  Zap,
  Shield,
  Heart,
  Briefcase,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const values = [
  {
    icon: Zap,
    title: 'Simplicity first',
    description: 'We strip away complexity so you can go live in minutes. One link, one booking page, one place for your team and your clients, with no IT required.',
  },
  {
    icon: Shield,
    title: 'Built to last',
    description: 'Reliable scheduling, reminders that actually send, and payments that land on time. We run the system so you can run the business.',
  },
  {
    icon: Heart,
    title: 'Support that shows up',
    description: 'Real help when you need it. Documentation, chat, and a team that cares about service businesses, not just ticket counts.',
  },
  {
    icon: Briefcase,
    title: 'Your business, your rules',
    description: 'Pricing your way: fixed, hourly, by job, or percentage. Your brand, your services, your availability. Orbyt bends to you.',
  },
];

const whyOrbytPoints = [
  'Go live in minutes with one link and one booking page. No decay, no dead ends.',
  'Automated reminders and confirmations so fewer clients ghost and more show up.',
  'Fully customizable pricing: fixed, hourly, by job, by room, or percentage. Your model, your rules.',
  'One place for bookings, payments, and your team. No juggling spreadsheets or sticky notes.',
  'Support that keeps you in Orbyt, not on hold. We’re here when you need us.',
];

const industries = [
  'Cleaning',
  'Lawn care & landscaping',
  'Salons & barbershops',
  'Moving & storage',
  'Pet care',
  'Home services',
  'Tutoring & coaching',
  'And more',
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/images/orbit.png" alt="Orbyt Service" className="h-8 w-8" />
            <span className="text-base font-bold text-slate-800 uppercase tracking-wide">Orbyt Service</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/why-premium" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Why Orbyt</Link>
            <Link href="/about" className="text-sm font-medium text-primary">About Us</Link>
            <Link href="/features" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Features</Link>
            <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Pricing</Link>
            <Link href="/testimonials" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Testimonials</Link>
            <Link href="/support" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Support</Link>
            <a href="/auth/login" className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">Log In</a>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-100 to-slate-50 px-4 pt-12 pb-16 sm:pt-16 sm:pb-20">
          <div className="container mx-auto max-w-3xl text-center">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-primary mb-8 transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to home
            </Link>
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">About Orbyt</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-5">
              We put service businesses at the center
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto mb-8">
              Scheduling, reminders, and payments orbit around you, not the other way around. One platform, one loop, built for how you actually work.
            </p>
            <Link href="/customers" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
              See who else is in Orbyt
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Our story */}
        <section className="px-4 py-16 sm:py-20 bg-white">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-6">Our story</h2>
            <div className="prose prose-slate prose-lg max-w-none text-slate-600 space-y-4">
              <p>
                Service businesses run on trust and timing. Clients need to book easily; you need to show up, get paid, and keep the calendar full. Too many tools were built for retail or SaaS: fixed menus, rigid pricing, and dashboards that don’t match how cleaners, movers, salons, and pet pros actually quote and work.
              </p>
              <p>
                We built Orbyt so your business stays at the center. One link for your clients, one place for your team, and pricing that bends to you: by job, by hour, by room, or by percentage. Reminders and payments run in the background so you can focus on the work. No IT, no lock-in. Just an orbit that works.
              </p>
            </div>
          </div>
        </section>

        {/* Who we are, Mission, Why Orbyt: three cards */}
        <section className="px-4 py-16 sm:py-20 bg-slate-50">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-center mb-12">Who we are & what we stand for</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-5">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Who we are</h3>
                <p className="text-slate-600 leading-relaxed">
                  Orbyt is the platform where bookings, payments, and your team share one orbit. We serve cleaning companies, salons, movers, pet services, and every kind of service business that quotes by job, hour, or custom rules. You run the show; we keep the loop running: scheduling, reminders, and payments in one place.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-5">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Our mission</h3>
                <p className="text-slate-600 leading-relaxed">
                  Every service business deserves an orbit that just works: fewer no-shows, less admin, and clients who can book in one click. We build the system so you can run the business, with support that actually shows up when you need it.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-5">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Why Orbyt</h3>
                <ul className="space-y-3 text-slate-600">
                  {whyOrbytPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="px-4 py-16 sm:py-20 bg-white">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-center mb-4">What we care about</h2>
            <p className="text-slate-600 text-center max-w-xl mx-auto mb-12">
              These aren’t buzzwords; they’re how we build and support Orbyt every day.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200 text-primary mb-4">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Who we serve */}
        <section className="px-4 py-16 sm:py-20 bg-slate-50">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4">Who we serve</h2>
            <p className="text-slate-600 mb-10 max-w-xl mx-auto">
              Orbyt is built for service businesses that quote flexibly and run on appointments, from solo pros to growing teams.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {industries.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center rounded-full bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                >
                  {name}
                </span>
              ))}
            </div>
            <Link href="/industries" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
              See all industries we support
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16 sm:py-20 bg-gradient-to-b from-slate-100 to-white">
          <div className="container mx-auto max-w-2xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4">Ready to get in Orbyt?</h2>
            <p className="text-slate-600 mb-8">
              See what keeps your orbit running: bookings, team, payments, and more, all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/features"
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-primary bg-white px-6 py-3 text-sm font-semibold text-primary hover:bg-primary hover:text-white transition-colors"
              >
                Explore features
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Start free trial
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
