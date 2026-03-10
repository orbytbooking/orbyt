'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronDown, HelpCircle, MessageSquare, LifeBuoy, BookOpen, User, Zap, Users, Target, Star } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

function SupportDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 text-sm font-medium transition-colors outline-none ${open ? 'text-primary' : 'text-white hover:text-primary'}`}
      >
        Support
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full pt-1 min-w-[220px] max-h-[min(70vh,320px)] overflow-y-auto overflow-x-hidden bg-slate-900/95 backdrop-blur border border-white/10 rounded-md p-2 shadow-xl z-50 [scrollbar-gutter:stable]">
          <Link href="/help-center" className="flex items-center px-2 py-2 text-sm rounded-sm text-white hover:bg-white/10 hover:text-primary transition-colors">
            <HelpCircle className="mr-2 h-4 w-4 shrink-0" />
            <span>Help Center</span>
          </Link>
          <Link href="/help-center/faqs" className="flex items-center px-2 py-2 text-sm rounded-sm text-white hover:bg-white/10 hover:text-primary transition-colors">
            <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
            <span>FAQs</span>
          </Link>
          <Link href="/contact-support" className="flex items-center px-2 py-2 text-sm rounded-sm text-white hover:bg-white/10 hover:text-primary transition-colors">
            <LifeBuoy className="mr-2 h-4 w-4 shrink-0" />
            <span>Contact Support</span>
          </Link>
          <Link href="/help-center/tutorials" className="flex items-center px-2 py-2 text-sm rounded-sm text-white hover:bg-white/10 hover:text-primary transition-colors">
            <BookOpen className="mr-2 h-4 w-4 shrink-0" />
            <span>Tutorials</span>
          </Link>
          <Link href="/help-center/account" className="flex items-center px-2 py-2 text-sm rounded-sm text-white hover:bg-white/10 hover:text-primary transition-colors">
            <User className="mr-2 h-4 w-4 shrink-0" />
            <span>Account Support</span>
          </Link>
          <Link href="/help-center/feature-requests" className="flex items-center px-2 py-2 text-sm rounded-sm text-white hover:bg-white/10 hover:text-primary transition-colors">
            <Zap className="mr-2 h-4 w-4 shrink-0" />
            <span>Request a Feature</span>
          </Link>
        </div>
      )}
    </div>
  );
}

const scrollReveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};
const slideInLeft = {
  hidden: { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0 },
};
const slideInRight = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0 },
};
const viewport = { once: false, amount: 0.12 };
const transition = { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] };
const stagger = { visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
const cardHover = { scale: 1.02, y: -4, transition: { duration: 0.2 } };
const buttonHover = { scale: 1.03 };
const buttonTap = { scale: 0.98 };

type Testimonial = {
  quote: string;
  author: string;
  role: string;
  rating: number;
  avatar: string;
  avatarImage?: string;
};

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  
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

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToNext = useCallback(() => {
    setCurrentSlide(prev => (prev === testimonials.length - 1 ? 0 : prev + 1));
  }, [testimonials.length]);

  const goToPrev = () => {
    setCurrentSlide(prev => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(() => {
      goToNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [goToNext]);

  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Fixed hero background: stays in place while content scrolls */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/images/hero-bg-space.png)',
          backgroundAttachment: 'fixed',
        }}
        aria-hidden
      />
      <div className="relative z-10 flex flex-col min-h-screen">
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-900/30 backdrop-blur-md"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <a href="/" className="flex items-center gap-3">
            <img
              src="/images/orbit.png"
              alt="Orbyt Service logo"
              className="h-8 w-8"
            />
            <span className="text-base font-bold text-white uppercase tracking-wide">
              Orbyt Service
            </span>
          </a>
          <nav className="hidden gap-8 text-sm font-medium text-white sm:flex">
            <Link href="/why-premium" className="relative pb-0.5 text-white transition-colors hover:text-primary after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0 after:bg-primary after:transition-[width] after:content-[''] hover:after:w-full">
              Why Orbyt
            </Link>
            <Link href="/about" className="relative pb-0.5 text-white transition-colors hover:text-primary after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0 after:bg-primary after:transition-[width] after:content-[''] hover:after:w-full">
              About Us
            </Link>
            <Link href="/features" className="relative pb-0.5 text-white transition-colors hover:text-primary after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0 after:bg-primary after:transition-[width] after:content-[''] hover:after:w-full">
              Features
            </Link>
            <Link href="/pricing" className="relative pb-0.5 text-white transition-colors hover:text-primary after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0 after:bg-primary after:transition-[width] after:content-[''] hover:after:w-full">
              Pricing
            </Link>
            <SupportDropdown />
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-md border border-white/60 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 hover:border-primary hover:text-primary"
            >
              Log In
            </a>
          </div>
        </div>
      </motion.header>

      <section className="relative pt-28 pb-16 px-4 text-white overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/70" aria-hidden />
        <div className="container relative z-10 mx-auto grid gap-12 lg:grid-cols-[1.1fr_1fr] items-center max-w-6xl">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-200">
              Your Service Business, In Orbyt.
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight font-space-grotesk">
              You&apos;re the center. <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Everything else Orbyts.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-200 max-w-xl font-sans">
              One platform for bookings, reminders, and payments. Set it once. We keep the loop running so you can run the business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.a
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors duration-200"
                whileHover={buttonHover}
                whileTap={buttonTap}
              >
                Try free for 14 days
              </motion.a>
            </div>
            <motion.div className="flex flex-wrap gap-6 mt-6 text-xs text-slate-300" initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={scrollReveal} transition={{ ...transition, delay: 0.3 }}>
                <p className="font-semibold text-white">One link. Every industry.</p>
                <p>Live in minutes. Bookings roll in 24/7.</p>
              </motion.div>
              <motion.div variants={scrollReveal} transition={{ ...transition, delay: 0.4 }}>
                <p className="font-semibold text-white">Fewer ghosts, more guests.</p>
                <p>Auto confirmations and SMS reminders.</p>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            className="relative group lg:translate-x-4"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div
              className="relative rounded-3xl border border-slate-400/20 bg-slate-900/50 backdrop-blur-xl p-8 overflow-hidden"
              style={{ boxShadow: '0 0 0 1px rgba(148,163,184,0.1), 0 0 40px -5px rgba(30,58,138,0.2), 0 0 60px -15px rgba(15,23,42,0.25)' }}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Businesses already in Orbyt
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={goToPrev}
                      className="p-2.5 rounded-full bg-gray-800/90 hover:bg-gray-700/90 border border-white/20 backdrop-blur-sm transition-colors"
                      aria-label="Previous testimonial"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </motion.button>
                    <motion.button
                      onClick={goToNext}
                      className="p-2.5 rounded-full bg-gray-800/90 hover:bg-gray-700/90 border border-white/20 backdrop-blur-sm transition-colors"
                      aria-label="Next testimonial"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  </div>
                </div>
                
                <div className="relative h-80 overflow-hidden">
                  {testimonials.map((testimonial: Testimonial, index: number) => (
                    <div 
                      key={index} 
                      className={`absolute inset-0 transition-all duration-700 transform ${
                        index === currentSlide 
                          ? 'opacity-100 translate-x-0 z-10' 
                          : index < currentSlide 
                            ? 'opacity-0 -translate-x-4' 
                            : 'opacity-0 translate-x-4'
                      }`}
                    >
                      <div className="h-full flex flex-col rounded-xl bg-slate-800/40 backdrop-blur-md p-6 border border-white/10">
                        <div className="flex-1 flex items-start">
                          <p className="text-white text-base leading-relaxed">
                            {testimonial.quote}
                          </p>
                        </div>
                        <div className="mt-6 pt-5 border-t border-gray-400/30 flex items-center gap-4">
                          <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-slate-600 flex items-center justify-center">
                            {testimonial.avatarImage ? (
                              <img src={testimonial.avatarImage} alt={testimonial.author} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl">{testimonial.avatar}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white">{testimonial.author}</p>
                            <p className="text-sm text-white/80 font-normal">{testimonial.role}</p>
                            <div className="flex gap-0.5 mt-1.5">
                              {Array.from({ length: testimonial.rating }).map((_, i) => (
                                <svg key={i} className="w-4 h-4 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    {testimonials.map((_: Testimonial, index: number) => (
                    <motion.button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`rounded-full transition-colors duration-300 ${
                        index === currentSlide
                          ? 'bg-primary h-2 w-8'
                          : 'bg-white/30 h-2 w-2 hover:bg-white/50'
                      }`}
                      aria-label={`Go to testimonial ${index + 1}`}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Industries + trust stats */}
      <section className="py-16 px-4 bg-white">
        <motion.div
          className="container mx-auto max-w-5xl"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
        >
          <motion.div className="text-center mb-10" variants={scrollReveal} transition={transition}>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight mb-3">
              Your Service Business, In Orbyt.
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto mb-6">
              Cleaning, lawn care, salons, moving, pet services, and beyond. Different crafts. One Orbyt.
            </p>
            <motion.div whileHover={buttonHover} whileTap={buttonTap}>
              <Link
                href="/industries"
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-primary bg-white px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white transition-colors"
              >
                See all industries
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </motion.div>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              { value: '1,000+', label: 'Clients in Orbyt' },
              { value: '5,000+', label: 'Bookings completed' },
              { value: '100+', label: 'Businesses running' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="rounded-2xl bg-slate-50 border border-slate-200/80 px-6 py-8 text-center cursor-default"
                variants={scrollReveal}
                transition={transition}
                whileHover={{ scale: 1.03, y: -4, boxShadow: '0 12px 24px -8px rgba(15,23,42,0.15)' }}
              >
                <p className="text-3xl sm:text-4xl font-bold text-slate-800 tabular-nums">{stat.value}</p>
                <p className="text-sm font-medium text-slate-500 mt-1.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* What makes us different */}
      <section id="differentiators" className="relative py-20 px-4 bg-slate-50 overflow-hidden">
        <motion.div
          className="container mx-auto max-w-6xl"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
        >
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div className="lg:pl-0" variants={scrollReveal} transition={transition}>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight mb-4">
                What sets Orbyt apart
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Built for service businesses across industries, not a generic booking tool. Cleaning, lawn care, salons, and more.
              </p>
              <ul className="space-y-5">
                {[
                  { num: '1', title: 'Pricing that fits how you actually quote', desc: 'By job, by room, by sq ft, by hour. Orbyt bends to your pricing model, not the other way around.' },
                  { num: '2', title: 'One link for your whole business', desc: 'Book, pay, reschedule. One page. No juggling tools or plugins. Everything stays in Orbyt.' },
                  { num: '3', title: 'AI receptionist, not a chatbot', desc: 'Real-time answers about your services and availability. Visitors book instead of bouncing.' },
                ].map((item, i) => (
                  <motion.li
                    key={item.num}
                    className="flex gap-4"
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={viewport}
                    transition={{ ...transition, delay: i * 0.08 }}
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center text-sm font-semibold">{item.num}</span>
                    <div>
                      <p className="font-semibold text-slate-800">{item.title}</p>
                      <p className="text-slate-600 text-sm mt-0.5">{item.desc}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              className="relative lg:mt-8"
              variants={scrollReveal}
              transition={transition}
              whileHover={{ scale: 1.02 }}
            >
              <div className="rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                <img
                  src="/images/dashboard.png"
                  alt="Orbyt admin dashboard, bookings and provider management"
                  className="w-full h-auto object-cover"
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* About Us */}
      <section id="about-us" className="relative py-16 px-4 bg-slate-50">
        <motion.div
          className="container relative z-0 mx-auto max-w-6xl"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
        >
          <motion.p className="text-center mb-6" variants={scrollReveal} transition={transition}>
            <Link href="/customers" className="text-sm font-medium text-primary hover:underline">
              See who else is in Orbyt
            </Link>
          </motion.p>
          <motion.div className="text-center mb-10" variants={scrollReveal} transition={transition}>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight mb-4">About Us</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We put service businesses at the center. Scheduling, reminders, and payments Orbyt around you.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <motion.div
              className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 p-6 sm:p-8 cursor-default"
              variants={scrollReveal}
              transition={transition}
              whileHover={cardHover}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Who We Are</h3>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Orbyt is where bookings, payments, and your team share one Orbyt. Pricing is fully customizable: fixed, per hour, by job, or percentage. You run the show. We keep the loop running.
              </p>
            </motion.div>
            <motion.div
              className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 p-6 sm:p-8 cursor-default"
              variants={scrollReveal}
              transition={transition}
              whileHover={cardHover}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Our Mission</h3>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Every service business deserves an Orbyt that just works. Fewer no-shows, less admin, clients who book in one click. We run the system so you can run the business.
              </p>
            </motion.div>
            <motion.div
              className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 p-6 sm:p-8 cursor-default"
              variants={scrollReveal}
              transition={transition}
              whileHover={cardHover}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Why Orbyt</h3>
              </div>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Live in minutes. One link, one booking page, no Orbyt decay.</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Reminders on autopilot. Fewer ghosts, more show-ups.</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Customizable pricing: fixed, hourly, by job, or percentage. Your rules.</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Support that keeps you in Orbyt, not on hold.</li>
              </ul>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section id="features" className="py-16 px-4 bg-background">
        <motion.div
          className="container mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
        >
          <motion.div className="text-center max-w-3xl mx-auto mb-10" variants={scrollReveal} transition={transition}>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">What keeps your Orbyt running</h2>
            <p className="text-lg text-muted-foreground mb-6">
              One platform. Bookings, teams, payments, and marketing. All in the same loop.
            </p>
            <Link
              href="/features"
              className="inline-flex items-center text-primary font-medium hover:underline"
            >
              See everything in Orbyt
              <svg className="ml-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </Link>
          </motion.div>

          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" variants={stagger}>
            <motion.div variants={scrollReveal} transition={transition}>
              <Link href="/features#customer-account" className="group block h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Customer Account</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center gap-2"><span className="text-primary shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Easy appointment booking</li>
                  <li className="flex items-center gap-2"><span className="text-primary shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Service history tracking</li>
                  <li className="flex items-center gap-2"><span className="text-primary shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Secure payment portal</li>
                </ul>
              </Link>
            </motion.div>

            <motion.div variants={scrollReveal} transition={transition}>
              <Link href="/features#provider-account" className="group block h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Provider Account</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center gap-2"><span className="text-blue-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Appointment management</li>
                  <li className="flex items-center gap-2"><span className="text-blue-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Team scheduling</li>
                  <li className="flex items-center gap-2"><span className="text-blue-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Service customization</li>
                </ul>
              </Link>
            </motion.div>

            <motion.div variants={scrollReveal} transition={transition}>
              <Link href="/features#business-account" className="group block h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Business Account</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center gap-2"><span className="text-indigo-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Multi-location management</li>
                  <li className="flex items-center gap-2"><span className="text-indigo-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Advanced analytics</li>
                  <li className="flex items-center gap-2"><span className="text-indigo-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Enterprise support</li>
                </ul>
              </Link>
            </motion.div>

            <motion.div variants={scrollReveal} transition={transition}>
              <Link href="/features#website-builder" className="group block h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-green-200 transition-all">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Website Builder</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center gap-2"><span className="text-green-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Drag-and-drop editor</li>
                  <li className="flex items-center gap-2"><span className="text-green-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Mobile-responsive templates</li>
                  <li className="flex items-center gap-2"><span className="text-green-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Custom domain support</li>
                </ul>
              </Link>
            </motion.div>

            <motion.div variants={scrollReveal} transition={transition}>
              <Link href="/features#smart-notifications" className="group block h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Smart Notifications</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center gap-2"><span className="text-amber-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Email & SMS alerts</li>
                  <li className="flex items-center gap-2"><span className="text-amber-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Customizable templates</li>
                  <li className="flex items-center gap-2"><span className="text-amber-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Automated reminders</li>
                </ul>
              </Link>
            </motion.div>

            <motion.div variants={scrollReveal} transition={transition}>
              <Link href="/features#advanced-reports" className="group block h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-purple-200 transition-all">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Advanced Reports</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center gap-2"><span className="text-purple-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Revenue tracking</li>
                  <li className="flex items-center gap-2"><span className="text-purple-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Customer insights</li>
                  <li className="flex items-center gap-2"><span className="text-purple-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Exportable data</li>
                </ul>
              </Link>
            </motion.div>

            <motion.div variants={scrollReveal} transition={transition}>
              <Link href="/features#ai-receptionist" className="group block h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-cyan-200 transition-all">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">AI Virtual Receptionist</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center gap-2"><span className="text-cyan-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Answers questions about services & booking</li>
                  <li className="flex items-center gap-2"><span className="text-cyan-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Available on your booking page & admin</li>
                  <li className="flex items-center gap-2"><span className="text-cyan-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Instant answers so visitors book with confidence</li>
                </ul>
              </Link>
            </motion.div>

            <motion.div variants={scrollReveal} transition={transition}>
              <Link href="/features" className="group block h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-pink-200 transition-all">
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Marketing & Promotions</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center gap-2"><span className="text-pink-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Coupons & daily discounts</li>
                  <li className="flex items-center gap-2"><span className="text-pink-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Gift cards & campaigns</li>
                  <li className="flex items-center gap-2"><span className="text-pink-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Scripts for cold-calling & follow-ups</li>
                </ul>
              </Link>
            </motion.div>

            <motion.div variants={scrollReveal} transition={transition}>
              <Link href="/features" className="group block h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Hiring & Team</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center gap-2"><span className="text-emerald-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Onboarding & prospect tracking</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Interviews & quizzes with scorecards</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Contacts & hiring reports</li>
                </ul>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Our Process */}
      <section className="relative py-16 px-4 overflow-hidden text-white">
        <div className="absolute inset-0 bg-slate-950/70" aria-hidden />
        <motion.div
          className="container relative z-10 mx-auto max-w-6xl"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
        >
          <motion.div className="text-center mb-14" variants={scrollReveal} transition={transition}>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight inline-block">
              Get in Orbyt in three steps
            </h2>
            <div className="mt-2 h-1 w-16 sm:w-20 bg-purple-500 rounded-full mx-auto" aria-hidden />
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch">
            {/* Step 1 */}
            <motion.div
              className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-lg p-6 sm:p-8 flex flex-col items-center text-center md:items-start md:text-left cursor-default"
              variants={scrollReveal}
              transition={transition}
              whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.2)' }}
            >
              <div className="hidden md:flex items-center justify-center w-full mb-2">
                <span className="flex-1 h-px bg-slate-500 mr-2 min-w-0" aria-hidden />
                <span className="inline-flex items-center justify-center w-24 h-24 text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent shrink-0">
                  01
                </span>
                <span className="flex-1 h-px bg-slate-500 ml-2 min-w-0" aria-hidden />
              </div>
              <span className="md:hidden inline-flex items-center justify-center w-20 h-20 text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-0">
                01
              </span>
              <h3 className="text-black font-bold text-lg mt-4 md:mt-2 mb-2">Step 1</h3>
              <p className="text-slate-700 text-sm leading-relaxed max-w-sm mx-auto md:mx-0">
                Create your free account in minutes. Add your business details and connect your calendar so you’re ready to accept bookings.
              </p>
            </motion.div>
            {/* Step 2 */}
            <motion.div
              className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-lg p-6 sm:p-8 flex flex-col items-center text-center md:items-start md:text-left cursor-default"
              variants={scrollReveal}
              transition={transition}
              whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.2)' }}
            >
              <div className="hidden md:flex items-center justify-center w-full mb-2">
                <span className="flex-1 h-px bg-slate-500 mr-2 min-w-0" aria-hidden />
                <span className="inline-flex items-center justify-center w-24 h-24 text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent shrink-0">
                  02
                </span>
                <span className="flex-1 h-px bg-slate-500 ml-2 min-w-0" aria-hidden />
              </div>
              <span className="md:hidden inline-flex items-center justify-center w-20 h-20 text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-0">
                02
              </span>
              <h3 className="text-black font-bold text-lg mt-4 md:mt-2 mb-2">Step 2</h3>
              <p className="text-slate-700 text-sm leading-relaxed max-w-sm mx-auto md:mx-0">
                Add services, set your pricing, and open your calendar. One link, your brand, your rules.
              </p>
            </motion.div>
            {/* Step 3 */}
            <motion.div
              className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-lg p-6 sm:p-8 flex flex-col items-center text-center md:items-start md:text-left cursor-default"
              variants={scrollReveal}
              transition={transition}
              whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.2)' }}
            >
              <div className="hidden md:flex items-center justify-center w-full mb-2">
                <span className="flex-1 h-px bg-slate-500 mr-2 min-w-0" aria-hidden />
                <span className="inline-flex items-center justify-center w-24 h-24 text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent shrink-0">
                  03
                </span>
                <span className="flex-1 h-px bg-slate-500 ml-2 min-w-0" aria-hidden />
              </div>
              <span className="md:hidden inline-flex items-center justify-center w-20 h-20 text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-0">
                03
              </span>
              <h3 className="text-black font-bold text-lg mt-4 md:mt-2 mb-2">Step 3</h3>
              <p className="text-slate-700 text-sm leading-relaxed max-w-sm mx-auto md:mx-0">
                Share your link. Clients book, get reminded, and show up. Your schedule runs itself. You run the business.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section id="pricing" className="py-16 px-4 bg-white">
        <motion.div
          className="container mx-auto max-w-6xl"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
        >
          <motion.div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-12" variants={scrollReveal} transition={transition}>
            <div className="space-y-3">
              <span className="inline-block rounded-lg bg-violet-200/80 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-violet-800">
                Pricing
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-800">
                Pick your Orbyt
              </h2>
            </div>
            <div className="flex flex-col gap-2 lg:items-end">
              <p className="text-slate-600 max-w-xl text-base lg:text-right">
                Solo pilot or full crew. Same loop: unlimited bookings, no per-booking fees. Scale when you're ready.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-primary bg-white px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white transition-colors lg:self-end"
              >
                View full comparison & see all features
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </motion.div>

          <motion.div className="grid md:grid-cols-3 gap-6 lg:gap-8" variants={stagger}>
            {/* Starter Plan */}
            <motion.div
              className="rounded-3xl bg-white/95 p-6 sm:p-8 shadow-lg shadow-slate-200/60 flex flex-col h-full border border-white/80 cursor-default"
              variants={scrollReveal}
              transition={transition}
              whileHover={{ y: -6, scale: 1.02, boxShadow: '0 24px 48px -12px rgba(15,23,42,0.2)' }}
            >
              <h3 className="text-xl font-bold text-slate-800 mb-2">Starter</h3>
              <p className="text-slate-600 text-sm mb-6">Solo or small crew. Get in Orbyt without the bloat.</p>
              <div className="mb-6 flex items-baseline">
                <span className="text-4xl font-bold text-sky-500">$19</span>
                <span className="text-slate-600 text-sm ml-1">monthly</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm text-slate-700 min-h-[200px]">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
                  Core scheduling & calendar
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
                  Unlimited bookings
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
                  Email support
                </li>
              </ul>
              <div className="mt-auto">
                <a
                  href="/auth/login"
                  className="block w-full py-3 px-6 text-center rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium shadow-sm hover:opacity-90 transition-opacity"
                >
                  Get started
                </a>
              </div>
            </motion.div>

            {/* Growth Plan */}
            <motion.div
              className="rounded-3xl bg-white/95 p-6 sm:p-8 shadow-lg shadow-slate-200/60 flex flex-col h-full border border-white/80 cursor-default"
              variants={scrollReveal}
              transition={transition}
              whileHover={{ y: -6, scale: 1.02, boxShadow: '0 24px 48px -12px rgba(15,23,42,0.2)' }}
            >
              <h3 className="text-xl font-bold text-slate-800 mb-2">Growth</h3>
              <p className="text-slate-600 text-sm mb-6">Bigger team, more automation. The loop gets smarter.</p>
              <div className="mb-6 flex items-baseline">
                <span className="text-4xl font-bold text-sky-500">$49</span>
                <span className="text-slate-600 text-sm ml-1">monthly</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm text-slate-700 min-h-[200px]">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
                  Advanced scheduling & routing
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
                  Unlimited bookings
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
                  Email & chat support
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
                  Custom branding
                </li>
              </ul>
              <div className="mt-auto">
                <a
                  href="/auth/login"
                  className="block w-full py-3 px-6 text-center rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium shadow-sm hover:opacity-90 transition-opacity"
                >
                  Get started
                </a>
              </div>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              className="rounded-3xl bg-white/95 p-6 sm:p-8 shadow-lg shadow-slate-200/60 flex flex-col h-full border border-white/80 cursor-default"
              variants={scrollReveal}
              transition={transition}
              whileHover={{ y: -6, scale: 1.02, boxShadow: '0 24px 48px -12px rgba(15,23,42,0.2)' }}
            >
              <h3 className="text-xl font-bold text-slate-800 mb-2">Premium</h3>
              <p className="text-slate-600 text-sm mb-6">Full Orbyt. API, priority support, no limits.</p>
              <div className="mb-6 flex items-baseline">
                <span className="text-4xl font-bold text-sky-500">$110</span>
                <span className="text-slate-600 text-sm ml-1">monthly</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm text-slate-700 min-h-[200px]">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
                  Everything in Growth
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
                  Unlimited bookings
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
                  Priority support
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
                  API access
                </li>
              </ul>
              <div className="mt-auto">
                <a
                  href="/auth/login"
                  className="block w-full py-3 px-6 text-center rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium shadow-sm hover:opacity-90 transition-opacity"
                >
                  Get started
                </a>
              </div>
            </motion.div>
          </motion.div>

          <motion.p className="text-center mt-6" variants={scrollReveal} transition={transition}>
            <Link href="/why-premium" className="text-sm font-medium text-primary hover:underline">
              Why upgrade to Premium?
            </Link>
          </motion.p>

          {/* Plan details accordion - FAQ style */}
          <motion.div className="mt-12 max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={viewport} variants={scrollReveal} transition={transition}>
            <h3 className="text-2xl font-semibold text-center mb-4">
              What’s in each Orbyt
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              The fine print. Same unlimited bookings, different levels of automation and support.
            </p>
            <Accordion type="single" collapsible className="w-full space-y-3">
              <AccordionItem value="starter" className="rounded-xl border border-slate-200/80 bg-slate-100/90 dark:bg-slate-800/40 dark:border-slate-700/80 shadow-sm overflow-hidden border-b-0">
                <AccordionTrigger className="px-4 py-3.5 text-left hover:no-underline hover:bg-slate-200/40 dark:hover:bg-slate-700/40 transition-colors [&[data-state=open]]:rounded-none">
                  Starter: solo operators and small teams just getting started.
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><span className="font-medium text-foreground">Core scheduling &amp; calendar:</span> Accept bookings online 24/7 and see everything in a simple calendar view.</li>
                    <li><span className="font-medium text-foreground">Unlimited bookings:</span> Take as many appointments as you want with no extra per‑booking fees.</li>
                    <li><span className="font-medium text-foreground">Email reminders:</span> Reduce no‑shows with automatic confirmation and reminder emails.</li>
                    <li><span className="font-medium text-foreground">Basic customer profiles:</span> Keep track of client details and service history in one place.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="growth" className="rounded-xl border border-slate-200/80 bg-slate-100/90 dark:bg-slate-800/40 dark:border-slate-700/80 shadow-sm overflow-hidden border-b-0">
                <AccordionTrigger className="px-4 py-3.5 text-left hover:no-underline hover:bg-slate-200/40 dark:hover:bg-slate-700/40 transition-colors [&[data-state=open]]:rounded-none">
                  Growth: growing teams that need advanced automation and greater control.
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><span className="font-medium text-foreground">Advanced scheduling &amp; routing:</span> Assign jobs to the right team members and optimize routes.</li>
                    <li><span className="font-medium text-foreground">Team management:</span> Add multiple staff, manage availability, and see who is booked where.</li>
                    <li><span className="font-medium text-foreground">Email &amp; chat support:</span> Get faster help from our support team as you scale.</li>
                    <li><span className="font-medium text-foreground">Custom branding:</span> Match Orbyt Service to your brand with your logo and colors.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pro" className="rounded-xl border border-slate-200/80 bg-slate-100/90 dark:bg-slate-800/40 dark:border-slate-700/80 shadow-sm overflow-hidden border-b-0">
                <AccordionTrigger className="px-4 py-3.5 text-left hover:no-underline hover:bg-slate-200/40 dark:hover:bg-slate-700/40 transition-colors [&[data-state=open]]:rounded-none">
                  Pro: established businesses that want full access to all features.
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><span className="font-medium text-foreground">Everything in Growth:</span> Includes all features from the Starter and Growth plans.</li>
                    <li><span className="font-medium text-foreground">Priority support:</span> Skip the line with priority response times from our team.</li>
                    <li><span className="font-medium text-foreground">API access:</span> Connect Orbyt Service to your other tools and internal systems.</li>
                    <li><span className="font-medium text-foreground">Advanced reporting:</span> Deeper insights into revenue, team performance, and customer behavior.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
          
          {/* Pricing FAQ */}
          <motion.div className="mt-12 max-w-4xl mx-auto grid gap-6 md:grid-cols-3" variants={scrollReveal} transition={transition}>
            <div>
              <h4 className="font-semibold mb-2 text-sm">Do you charge per booking?</h4>
              <p className="text-sm text-muted-foreground">
                No. All plans include unlimited bookings. Your price is fixed by plan, not by how many appointments you get.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-sm">Can I cancel at any time?</h4>
              <p className="text-sm text-muted-foreground">
                Yes. There are no long‑term contracts. You can upgrade, downgrade, or cancel your subscription whenever you need.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-sm">What about onboarding & support?</h4>
              <p className="text-sm text-muted-foreground">
                Starter includes email support, Growth adds chat support and setup guidance, and Pro includes priority support and strategy calls.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Try it for free section */}
      <section className="relative py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/70" aria-hidden />
        <motion.div
          className="container relative z-10 mx-auto max-w-4xl text-center"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={scrollReveal}
          transition={transition}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to get in Orbyt?</h2>
          <p className="text-lg text-slate-200 mb-8">Join the loop. Try Orbyt free and see why businesses stay.</p>
          
          <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-md border border-slate-400 bg-white/95 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
            <motion.button
              type="button"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200 whitespace-nowrap"
              whileHover={buttonHover}
              whileTap={buttonTap}
            >
              Start Free Trial
            </motion.button>
          </div>
          <p className="text-sm text-slate-300 mt-3">No credit card required. 14-day free trial.</p>
          <p className="mt-4">
            <Link href="/support" className="text-sm text-slate-300 hover:text-white transition-colors">
              Support options and response times
            </Link>
          </p>
        </motion.div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 bg-white">
        <motion.div
          className="container mx-auto max-w-6xl"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={scrollReveal}
          transition={transition}
        >
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <div className="rounded-2xl overflow-hidden h-full">
                <img 
                  src="/images/contact-support.png" 
                  alt="We're here to help, support and connectivity"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="md:w-1/2 text-center md:text-left">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">We keep you in Orbyt</h2>
              <p className="text-muted-foreground mb-6">
                Stuck? Have a question? We're here. Drop us a line and we'll get you back in the loop.
              </p>
              <div className="space-y-4">
                <motion.a
                  href="mailto:hello@orbytservice.com"
                  className="inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200 group"
                  whileHover={buttonHover}
                  whileTap={buttonTap}
                >
                  Send us a message
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 transition-transform group-hover:translate-x-1">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </motion.a>
                <p className="text-sm text-muted-foreground">
                  We typically respond within 24 hours
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="bg-navy text-navy-foreground py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <motion.div
          className="container mx-auto relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={scrollReveal}
          transition={transition}
        >
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/images/orbit.png" alt="Orbyt Service" className="h-12 w-12" />
                <h3 className="text-2xl font-bold">Orbyt Service</h3>
              </div>
              <p className="text-navy-foreground/80 mb-4 text-sm">
              Your service business, in Orbyt. Bookings, payments, and everything in between. All in one loop.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#features" className="hover:underline">Features</a></li>
                  <li><a href="#pricing" className="hover:underline">Pricing</a></li>
                  <li><Link href="/customers" className="hover:underline">Customers</Link></li>
                  <li><Link href="/industries" className="hover:underline">Industries</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#about-us" className="hover:underline">About Us</a></li>
                  <li><Link href="/support" className="hover:underline">Support</Link></li>
                  <li><Link href="/why-premium" className="hover:underline">Why Premium</Link></li>
                  <li><a href="/contact-support" className="hover:underline">Contact</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10">
            <p className="text-center text-sm text-navy-foreground/60">
              &copy; {new Date().getFullYear()} Orbyt Service. All rights reserved.
            </p>
          </div>
        </motion.div>
      </footer>
      </div>
    </main>
  );
}
