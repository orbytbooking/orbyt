'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';

const stats = [
  { value: '10,000+', label: 'Happy clients' },
  { value: '50,000+', label: 'Bookings completed' },
  { value: '500+', label: 'Businesses' },
];

const testimonials = [
  {
    quote: "Orbyt Booking helped reduce the time I spend scheduling clients. The system keeps track of appointments and reminders, which saves me a lot of time every week.",
    author: "Sofia Ramirez",
    role: "Owner, Prime Care Services",
    rating: 5,
  },
  {
    quote: "The best investment we've made for our cleaning business. The automated scheduling saves us hours every week.",
    author: "Luis Navarro",
    role: "Operations Manager, Fresh Start",
    rating: 5,
  },
  {
    quote: "I've tried a few booking tools before, but Orbyt Booking is by far the easiest one for my team. Our customers can book anytime, and we can manage everything from one dashboard.",
    author: "Emma Rivera",
    role: "Founder, Edge & Fade",
    rating: 5,
  },
  {
    quote: "The customer support is outstanding. They helped us set up our booking page exactly how we wanted it.",
    author: "Anthony Cruz",
    role: "Director, Elite Cleaners",
    rating: 5,
  },
  {
    quote: "Orbyt Booking has made managing my appointments so much easier. Before, I had to keep track of everything through messages and a notebook. Now my customers can book online and everything is organized in one place.",
    author: "Daniel Reyes",
    role: "CEO, Crystal Clear Services",
    rating: 5,
  },
  {
    quote: "What I like most about Orbyt Booking is how simple it is to use. I was able to set up my services and start accepting bookings the same day. It really helped my cleaning business stay organized.",
    author: "Robert Taylor",
    role: "CTO, Pristine Pro",
    rating: 5,
  },
];

export default function CustomersPage() {
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
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight mb-2">Trusted by service businesses</h1>
        <p className="text-lg text-slate-600 mb-10">
          Thousands of cleaners and local service pros use Orbyt to fill their calendars, get paid on time, and spend less time on admin.
        </p>

        <div className="flex flex-wrap justify-center gap-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm mb-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-slate-800 tabular-nums">{stat.value}</p>
              <p className="text-sm font-medium uppercase tracking-wider text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-6">What our customers say</h2>
        <div className="space-y-6">
          {testimonials.map((t) => (
            <div key={t.author} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 mb-4">&ldquo;{t.quote}&rdquo;</p>
              <p className="font-semibold text-slate-800">{t.author}</p>
              <p className="text-sm text-slate-500">{t.role}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/auth/login" className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 text-white font-medium hover:opacity-90 transition-opacity">
            Start free trial
          </Link>
        </div>
      </main>
    </div>
  );
}
