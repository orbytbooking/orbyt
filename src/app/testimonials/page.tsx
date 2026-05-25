'use client';

import Link from 'next/link';
import PlatformHeader from '@/components/PlatformHeader';

type Testimonial = {
  quote: string;
  author: string;
  reviewedAgo: string;
  rating: number;
};

const testimonialAvatarBgs = [
  'bg-violet-600',
  'bg-teal-600',
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-sky-600',
  'bg-fuchsia-600',
] as const;

function testimonialInitial(author: string) {
  return author.trim().charAt(0).toUpperCase() || '?';
}

const testimonials: Testimonial[] = [
  {
    quote: "Scheduling used to eat up my week. Now it's mostly handled. Reminders go out, clients show up.",
    author: "Sofia Ramirez",
    reviewedAgo: "4 months ago",
    rating: 5,
  },
  {
    quote: "Best move we made. Saves us hours every week.",
    author: "Luis Navarro",
    reviewedAgo: "2 weeks ago",
    rating: 5,
  },
  {
    quote: "Tried a few tools. This one stuck. My team actually uses it, and customers can book on their own.",
    author: "Emma Rivera",
    reviewedAgo: "5 months ago",
    rating: 5,
  },
  {
    quote: "Support was great. They got our booking page set up the way we wanted.",
    author: "Anthony Cruz",
    reviewedAgo: "1 month ago",
    rating: 5,
  },
  {
    quote: "Used to track everything in messages and a notebook. Now it's all in one place and clients book online.",
    author: "Daniel Reyes",
    reviewedAgo: "3 months ago",
    rating: 5,
  },
  {
    quote: "Set up in a day. Simple, and it actually helped us stay organized.",
    author: "Robert Taylor",
    reviewedAgo: "6 months ago",
    rating: 5,
  },
];

export default function TestimonialsPage() {
  return (
    <div className="min-h-screen relative">
      {/* Hero background: same as landing hero */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/images/hero-bg-space.png)',
          backgroundAttachment: 'fixed',
        }}
        aria-hidden
      />
      <PlatformHeader />

      <main className="relative z-10 pt-24 pb-20">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-12 pb-16 sm:pt-16 sm:pb-20">
          <div className="absolute inset-0 bg-slate-950/50" aria-hidden />
          <div className="container relative z-10 mx-auto max-w-3xl text-center">
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">Testimonials</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-5">
              Businesses already in Orbyt
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
              See what service business owners and teams are saying about Orbyt—scheduling, reminders, and payments in one place.
            </p>
          </div>
        </section>

        {/* Testimonials grid — liquid glass cards on hero bg */}
        <section className="px-4 py-16 sm:py-20">
          <div className="container mx-auto max-w-6xl">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="rounded-2xl p-6 flex flex-col border border-white/20 bg-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:bg-white/10 hover:border-white/30 transition-all duration-300"
                  style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.2)' }}
                >
                  <p className="text-slate-200 leading-relaxed flex-1 mb-6">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                    <div
                      className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold text-white ring-2 ring-white/20 ${testimonialAvatarBgs[index % testimonialAvatarBgs.length]}`}
                      aria-hidden
                    >
                      {testimonialInitial(testimonial.author)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{testimonial.author}</p>
                      <p className="text-sm text-slate-300">{testimonial.reviewedAgo}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA — liquid glass bar */}
        <section className="px-4 py-12">
          <div className="container mx-auto max-w-2xl text-center rounded-2xl border border-white/20 bg-white/5 backdrop-blur-xl py-10 px-6" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.2)' }}>
            <h2 className="text-2xl font-bold text-white mb-3">Ready to join them?</h2>
            <p className="text-slate-300 mb-6">
              Try Orbyt free for 14 days. No credit card required.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors duration-200"
            >
              Try free for 14 days
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
