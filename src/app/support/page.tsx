'use client';

import Link from 'next/link';
import { Mail, MessageCircle, BookOpen, HelpCircle } from 'lucide-react';

const supportChannels = [
  {
    name: 'Email support',
    description: 'Send us a message anytime. We typically respond within 24 hours on business days. All plans include email support.',
    href: '/contact-support',
    icon: Mail,
  },
  {
    name: 'Help Center',
    description: 'Articles, FAQs, and guides on getting started, account settings, billing, and using Orbyt day to day.',
    href: '/help-center',
    icon: BookOpen,
  },
  {
    name: 'FAQs',
    description: 'Quick answers to the most common questions about pricing, features, and how Orbyt works.',
    href: '/help-center/faqs',
    icon: HelpCircle,
  },
  {
    name: 'Chat support',
    description: 'Growth and Premium plans get access to chat support for faster help. Available during business hours.',
    icon: MessageCircle,
  },
];

const byPlan = [
  { plan: 'Starter', support: 'Email support. We typically respond within 24 hours.' },
  { plan: 'Growth', support: 'Email + chat support. Faster response times and setup guidance.' },
  { plan: 'Premium', support: 'Priority support. Skip the queue and get help when you need it.' },
];

export default function SupportPage() {
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
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight mb-2">Support</h1>
        <p className="text-lg text-slate-600 mb-10">
          We’re here to help you get the most out of Orbyt. Choose how you’d like to get in touch or find answers yourself.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 mb-12">
          {supportChannels.map((channel) => {
            const Icon = channel.icon;
            const content = (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-full flex flex-col">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-700 mb-4">
                  <Icon className="h-6 w-6" />
                </span>
                <h2 className="text-lg font-semibold text-slate-800 mb-2">{channel.name}</h2>
                <p className="text-slate-600 text-sm flex-1">{channel.description}</p>
                {'href' in channel && channel.href && (
                  <Link href={channel.href} className="mt-4 text-sm font-medium text-primary hover:underline">
                    Go to {channel.name}
                  </Link>
                )}
              </div>
            );
            return 'href' in channel && channel.href ? (
              <Link key={channel.name} href={channel.href}>
                {content}
              </Link>
            ) : (
              <div key={channel.name}>{content}</div>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Support by plan</h2>
          <ul className="space-y-4">
            {byPlan.map((item) => (
              <li key={item.plan} className="flex justify-between gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <span className="font-medium text-slate-800">{item.plan}</span>
                <span className="text-slate-600 text-right">{item.support}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-center text-slate-600">
          Need to talk to us? <Link href="/contact-support" className="text-primary font-medium hover:underline">Send us a message</Link>. We typically respond within 24 hours.
        </p>
      </main>
    </div>
  );
}
