'use client';

import Link from 'next/link';
import PlatformHeader from '@/components/PlatformHeader';

type Testimonial = {
  quote: string;
  author: string;
  role: string;
  rating: number;
  avatar: string;
  avatarImage?: string;
};

const testimonials: Testimonial[] = [
  {
    quote: "Scheduling used to eat up my week. Now it's mostly handled. Reminders go out, clients show up.",
    author: "Sofia Ramirez",
    role: "Owner, Prime Care Services",
    rating: 5,
    avatar: "👩‍💼",
    avatarImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=face"
  },
  {
    quote: "Best move we made. Saves us hours every week.",
    author: "Luis Navarro",
    role: "Operations Manager, Fresh Start",
    rating: 5,
    avatar: "👨‍💼",
    avatarImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=face"
  },
  {
    quote: "Tried a few tools. This one stuck. My team actually uses it, and customers can book on their own.",
    author: "Emma Rivera",
    role: "Founder, Edge & Fade",
    rating: 5,
    avatar: "👩‍💻",
    avatarImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=face"
  },
  {
    quote: "Support was great. They got our booking page set up the way we wanted.",
    author: "Anthony Cruz",
    role: "Director, Elite Cleaners",
    rating: 5,
    avatar: "🧑‍💼",
    avatarImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=face"
  },
  {
    quote: "Used to track everything in messages and a notebook. Now it's all in one place and clients book online.",
    author: "Daniel Reyes",
    role: "CEO, Crystal Clear Services",
    rating: 5,
    avatar: "👩‍🎓",
    avatarImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=face"
  },
  {
    quote: "Set up in a day. Simple, and it actually helped us stay organized.",
    author: "Robert Taylor",
    role: "CTO, Pristine Pro",
    rating: 5,
    avatar: "👨‍🔧",
    avatarImage: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=96&h=96&fit=crop&crop=face"
  }
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
                    <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-slate-500/50 flex items-center justify-center ring-2 ring-white/20">
                      {testimonial.avatarImage ? (
                        <img src={testimonial.avatarImage} alt={testimonial.author} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">{testimonial.avatar}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{testimonial.author}</p>
                      <p className="text-sm text-slate-300">{testimonial.role}</p>
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
