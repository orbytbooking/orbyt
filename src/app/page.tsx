'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, HelpCircle, MessageSquare, LifeBuoy, BookOpen, User, Zap, Users, Target, Star } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type Testimonial = {
  quote: string;
  author: string;
  role: string;
  rating: number;
  avatar: string;
};

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  
  const testimonials: Testimonial[] = [
    {
      quote: "Orbyt Booking helped reduce the time I spend scheduling clients. The system keeps track of appointments and reminders, which saves me a lot of time every week.",
      author: "Sofia Ramirez",
      role: "Owner, Prime Care Services",
      rating: 5,
      avatar: "👩‍💼"
    },
    {
      quote: "The best investment we've made for our cleaning business. The automated scheduling saves us hours every week.",
      author: "Luis Navarro.",
      role: "Operations Manager, Fresh Start",
      rating: 5,
      avatar: "👨‍💼"
    },
    {
      quote: "I’ve tried a few booking tools before, but Orbyt Booking is by far the easiest one for my team. Our customers can book anytime, and we can manage everything from one dashboard.",
      author: "Emily Rodriguez",
      role: "Founder, Edge & Fade",
      rating: 5,
      avatar: "👩‍💻"
    },
    {
      quote: "The customer support is outstanding. They helped us set up our booking page exactly how we wanted it.",
      author: "Anthony Cruz",
      role: "Director, Elite Cleaners",
      rating: 5,
      avatar: "🧑‍💼"
    },
    {
      quote: "Orbyt Booking has made managing my appointments so much easier. Before, I had to keep track of everything through messages and a notebook. Now my customers can book online and everything is organized in one place.",
      author: "Daniel Reyes",
      role: "CEO, Crystal Clear Services",
      rating: 5,
      avatar: "👩‍🎓"
    },
    {
      quote: "What I like most about Orbyt Booking is how simple it is to use. I was able to set up my services and start accepting bookings the same day. It really helped my cleaning business stay organized",
      author: "Robert Taylor",
      role: "CTO, Pristine Pro",
      rating: 5,
      avatar: "👨‍🔧"
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
      {/* Fixed hero background — stays in place while content scrolls (like ArtChain) */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/images/hero-bg-space.png)',
          backgroundAttachment: 'fixed',
        }}
        aria-hidden
      />
      <div className="relative z-10 flex flex-col min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-900/30 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <a href="/" className="flex items-center gap-3">
            <img
              src="/images/orbit.png"
              alt="Orbyt Booking logo"
              className="h-8 w-8"
            />
            <span className="text-base font-bold text-white uppercase tracking-wide">
              Orbyt Booking
            </span>
          </a>
          <nav className="hidden gap-8 text-sm font-medium text-white sm:flex">
            <a href="#about-us" className="relative pb-0.5 text-white transition-colors hover:text-primary after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0 after:bg-primary after:transition-[width] after:content-[''] hover:after:w-full">
              About Us
            </a>
            <a href="#features" className="relative pb-0.5 text-white transition-colors hover:text-primary after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0 after:bg-primary after:transition-[width] after:content-[''] hover:after:w-full">
              Features
            </a>
            <a href="#pricing" className="relative pb-0.5 text-white transition-colors hover:text-primary after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0 after:bg-primary after:transition-[width] after:content-[''] hover:after:w-full">
              Pricing
            </a>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center gap-1 text-sm font-medium text-white transition-colors hover:text-primary [&[data-state=open]]:text-primary">
                  Support
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="min-w-[220px] bg-slate-900/95 backdrop-blur border border-white/10 rounded-md p-2 shadow-xl z-50" sideOffset={10} align="end">
                  <Link href="/help-center">
                    <DropdownMenu.Item className="group text-sm rounded-sm flex items-center px-2 py-2 outline-none cursor-pointer text-white hover:bg-white/10 hover:text-primary">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      <span>Help Center</span>
                    </DropdownMenu.Item>
                  </Link>
                  <Link href="/help-center/faqs">
                    <DropdownMenu.Item className="group text-sm rounded-sm flex items-center px-2 py-2 outline-none cursor-pointer text-white hover:bg-white/10 hover:text-primary">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>FAQs</span>
                    </DropdownMenu.Item>
                  </Link>
                  <Link href="/contact-support">
                    <DropdownMenu.Item className="group text-sm rounded-sm flex items-center px-2 py-2 outline-none cursor-pointer text-white hover:bg-white/10 hover:text-primary">
                      <LifeBuoy className="mr-2 h-4 w-4" />
                      <span>Contact Support</span>
                    </DropdownMenu.Item>
                  </Link>
                  <Link href="/help-center/tutorials">
                    <DropdownMenu.Item className="group text-sm rounded-sm flex items-center px-2 py-2 outline-none cursor-pointer text-white hover:bg-white/10 hover:text-primary">
                      <BookOpen className="mr-2 h-4 w-4" />
                      <span>Tutorials</span>
                    </DropdownMenu.Item>
                  </Link>
                  <Link href="/help-center/account">
                    <DropdownMenu.Item className="group text-sm rounded-sm flex items-center px-2 py-2 outline-none cursor-pointer text-white hover:bg-white/10 hover:text-primary">
                      <User className="mr-2 h-4 w-4" />
                      <span>Account Support</span>
                    </DropdownMenu.Item>
                  </Link>
                  <Link href="/help-center/feature-requests">
                    <DropdownMenu.Item className="group text-sm rounded-sm flex items-center px-2 py-2 outline-none cursor-pointer text-white hover:bg-white/10 hover:text-primary">
                      <Zap className="mr-2 h-4 w-4" />
                      <span>Request a Feature</span>
                    </DropdownMenu.Item>
                  </Link>
                  <DropdownMenu.Arrow className="fill-slate-900" />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
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
      </header>

      <section className="relative pt-28 pb-16 px-4 text-white overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/70" aria-hidden />
        <div className="container relative z-10 mx-auto grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-200">
              Orbyt Booking • For Service Businesses
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight font-space-grotesk">
              The <span className="text-primary">perfect platform</span> to make your service business <span className="text-primary">work smarter for you</span>.
            </h1>
            <p className="text-base sm:text-lg text-slate-200 max-w-xl font-sans">
              Orbyt Booking gives cleaners and local service businesses a modern booking experience with built-in online scheduling, automated reminders, and payments.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
              >
                Start free trial
              </a>
            </div>
            <div className="flex flex-wrap gap-6 pt-4 text-xs text-slate-300">
              <div>
                <p className="font-semibold text-white">Built for cleaning & home services</p>
                <p>No code, no plugins, just bookings that work.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Reduce no‑shows</p>
                <p>Automatic confirmations and reminder texts.</p>
              </div>
            </div>
          </div>

          <div className="relative group">
            <div
              className="relative rounded-3xl border border-slate-400/20 bg-slate-900/50 backdrop-blur-xl p-8 overflow-hidden"
              style={{ boxShadow: '0 0 0 1px rgba(148,163,184,0.1), 0 0 40px -5px rgba(30,58,138,0.2), 0 0 60px -15px rgba(15,23,42,0.25)' }}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-serif text-white leading-none select-none" aria-hidden>"</span>
                    <h3 className="text-xl font-bold text-white">
                      Trusted by Industry Leaders
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={goToPrev}
                      className="p-2.5 rounded-full bg-gray-800/90 hover:bg-gray-700/90 border border-white/20 backdrop-blur-sm transition-colors"
                      aria-label="Previous testimonial"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button 
                      onClick={goToNext}
                      className="p-2.5 rounded-full bg-gray-800/90 hover:bg-gray-700/90 border border-white/20 backdrop-blur-sm transition-colors"
                      aria-label="Next testimonial"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
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
                        <div className="flex-1 flex items-start pt-1">
                          <p className="text-white text-[15px] leading-relaxed relative pl-5">
                            <span className="absolute left-0 -top-1 text-5xl font-serif text-white leading-none">"</span>
                            {testimonial.quote}
                          </p>
                        </div>
                        <div className="mt-6 pt-5 border-t border-gray-400/40 flex items-center gap-4">
                          <div className="text-3xl shrink-0">{testimonial.avatar}</div>
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
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`rounded-full transition-all duration-300 ${
                          index === currentSlide 
                            ? 'bg-primary h-2 w-8' 
                            : 'bg-white/30 h-2 w-2 hover:bg-white/50'
                        }`}
                        aria-label={`Go to testimonial ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us — same page, white background, three separate white cards */}
      <section id="about-us" className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight mb-4">About Us</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We’re on a mission to make scheduling simple for cleaners and local service businesses.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Who We Are</h3>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Orbyt Booking is built for cleaning companies, home service providers, and local businesses that want a professional booking experience without the complexity. We combine online scheduling, automated reminders, and payments in one place so you can focus on your work instead of back-and-forth with clients.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Our Mission</h3>
              </div>
              <p className="text-slate-600 leading-relaxed">
                We believe every service business deserves tools that are easy to use and reliable. Our goal is to help you reduce no-shows, save time on admin, and give your customers a smooth way to book—so you can grow your business with confidence.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Why Choose Orbyt</h3>
              </div>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Simple setup—get your booking page live in minutes</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Automated reminders to cut no-shows</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Built for cleaners and home services</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Support when you need it</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 px-4 bg-background">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Powerful Features for Your Business</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Everything you need to manage your service business efficiently and effectively.
            </p>
            <Link 
              href="/features" 
              className="inline-flex items-center text-primary font-medium hover:underline"
            >
              Explore all features
              <svg className="ml-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Customer Account */}
            <div className="group rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Customer Account</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Easy appointment booking
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Service history tracking
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Secure payment portal
                </li>
              </ul>
            </div>

            {/* Provider Account */}
            <div className="group rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Provider Account</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Appointment management
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Team scheduling
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Service customization
                </li>
              </ul>
            </div>

            {/* Business Account */}
            <div className="group rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Business Account</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Multi-location management
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Advanced analytics
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Enterprise support
                </li>
              </ul>
            </div>

            {/* Website Builder */}
            <div className="group rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Website Builder</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Drag-and-drop editor
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Mobile-responsive templates
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Custom domain support
                </li>
              </ul>
            </div>

            {/* Notifications */}
            <div className="group rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Notifications</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Email & SMS alerts
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Customizable templates
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Automated reminders
                </li>
              </ul>
            </div>

            {/* Reports */}
            <div className="group rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Advanced Reports</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Revenue tracking
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Customer insights
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Exportable data
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Our Process — same overlay as hero; steps in cards */}
      <section className="relative py-16 px-4 overflow-hidden text-white">
        <div className="absolute inset-0 bg-slate-950/70" aria-hidden />
        <div className="container relative z-10 mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight inline-block">
              Our Process
            </h2>
            <div className="mt-2 h-1 w-16 sm:w-20 bg-purple-500 rounded-full mx-auto" aria-hidden />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch">
            {/* Step 1 — card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-lg p-6 sm:p-8 flex flex-col items-center text-center md:items-start md:text-left">
              <div className="hidden md:flex items-center justify-center w-full mb-2">
                <span className="flex-1 h-px bg-slate-500 mr-2 min-w-0" aria-hidden />
                <span className="inline-flex items-center justify-center w-24 h-24 text-5xl font-bold text-transparent shrink-0" style={{ WebkitTextStroke: '2px rgb(51 65 85)' }}>
                  01
                </span>
                <span className="flex-1 h-px bg-slate-500 ml-2 min-w-0" aria-hidden />
              </div>
              <span className="md:hidden inline-flex items-center justify-center w-20 h-20 text-4xl font-bold text-transparent mb-0" style={{ WebkitTextStroke: '2px rgb(51 65 85)' }}>
                01
              </span>
              <h3 className="text-purple-500 font-bold text-lg mt-4 md:mt-2 mb-2">Step 1</h3>
              <p className="text-slate-700 text-sm leading-relaxed max-w-sm mx-auto md:mx-0">
                Create your free account in minutes. Add your business details and connect your calendar so you’re ready to accept bookings.
              </p>
            </div>
            {/* Step 2 — card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-lg p-6 sm:p-8 flex flex-col items-center text-center md:items-start md:text-left">
              <div className="hidden md:flex items-center justify-center w-full mb-2">
                <span className="flex-1 h-px bg-slate-500 mr-2 min-w-0" aria-hidden />
                <span className="inline-flex items-center justify-center w-24 h-24 text-5xl font-bold text-transparent shrink-0" style={{ WebkitTextStroke: '2px rgb(51 65 85)' }}>
                  02
                </span>
                <span className="flex-1 h-px bg-slate-500 ml-2 min-w-0" aria-hidden />
              </div>
              <span className="md:hidden inline-flex items-center justify-center w-20 h-20 text-4xl font-bold text-transparent mb-0" style={{ WebkitTextStroke: '2px rgb(51 65 85)' }}>
                02
              </span>
              <h3 className="text-purple-500 font-bold text-lg mt-4 md:mt-2 mb-2">Step 2</h3>
              <p className="text-slate-700 text-sm leading-relaxed max-w-sm mx-auto md:mx-0">
                Set up your services, pricing, and availability. Customize your booking page to match your brand and decide when you want to be booked.
              </p>
            </div>
            {/* Step 3 — card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-lg p-6 sm:p-8 flex flex-col items-center text-center md:items-start md:text-left">
              <div className="hidden md:flex items-center justify-center w-full mb-2">
                <span className="flex-1 h-px bg-slate-500 mr-2 min-w-0" aria-hidden />
                <span className="inline-flex items-center justify-center w-24 h-24 text-5xl font-bold text-transparent shrink-0" style={{ WebkitTextStroke: '2px rgb(51 65 85)' }}>
                  03
                </span>
                <span className="flex-1 h-px bg-slate-500 ml-2 min-w-0" aria-hidden />
              </div>
              <span className="md:hidden inline-flex items-center justify-center w-20 h-20 text-4xl font-bold text-transparent mb-0" style={{ WebkitTextStroke: '2px rgb(51 65 85)' }}>
                03
              </span>
              <h3 className="text-purple-500 font-bold text-lg mt-4 md:mt-2 mb-2">Step 3</h3>
              <p className="text-slate-700 text-sm leading-relaxed max-w-sm mx-auto md:mx-0">
                Share your booking link with clients. They pick a time, get reminders, and you get a clear schedule—no more back-and-forth or no-shows.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-12">
            <div className="space-y-3">
              <span className="inline-block rounded-lg bg-violet-200/80 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-violet-800">
                Extra Package
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-800">
                Choose Your Perfect Plan
              </h2>
            </div>
            <p className="text-slate-600 max-w-xl text-base lg:text-right">
              Explore our range of plans designed to meet your unique business needs—from solo operators to established teams.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Starter Plan */}
            <div className="rounded-3xl bg-white/95 p-6 sm:p-8 shadow-lg shadow-slate-200/60 flex flex-col h-full border border-white/80">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Starter Plan</h3>
              <p className="text-slate-600 text-sm mb-6">Perfect for solo operators and small teams getting started</p>
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
                  Buy Plan
                </a>
              </div>
            </div>

            {/* Growth Plan */}
            <div className="rounded-3xl bg-white/95 p-6 sm:p-8 shadow-lg shadow-slate-200/60 flex flex-col h-full border border-white/80">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Growth Plan</h3>
              <p className="text-slate-600 text-sm mb-6">For growing teams that need more automation and control</p>
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
                  Buy Plan
                </a>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="rounded-3xl bg-white/95 p-6 sm:p-8 shadow-lg shadow-slate-200/60 flex flex-col h-full border border-white/80">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Premium Plan</h3>
              <p className="text-slate-600 text-sm mb-6">For established businesses that want everything unlocked</p>
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
                  Buy Plan
                </a>
              </div>
            </div>
          </div>

          {/* Plan details accordion - FAQ style */}
          <div className="mt-12 max-w-3xl mx-auto">
            <h3 className="text-2xl font-semibold text-center mb-4">
              What&apos;s included in each plan
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Scroll through the plans below to see a detailed breakdown of features and how they help your business.
            </p>
            <Accordion type="single" collapsible className="w-full space-y-3">
              <AccordionItem value="starter" className="rounded-xl border border-slate-200/80 bg-slate-100/90 dark:bg-slate-800/40 dark:border-slate-700/80 shadow-sm overflow-hidden border-b-0">
                <AccordionTrigger className="px-4 py-3.5 text-left hover:no-underline hover:bg-slate-200/40 dark:hover:bg-slate-700/40 transition-colors [&[data-state=open]]:rounded-none">
                  Starter – solo operators and small teams just getting started.
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
                  Growth – growing teams that need advanced automation and greater control.
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><span className="font-medium text-foreground">Advanced scheduling &amp; routing:</span> Assign jobs to the right team members and optimize routes.</li>
                    <li><span className="font-medium text-foreground">Team management:</span> Add multiple staff, manage availability, and see who is booked where.</li>
                    <li><span className="font-medium text-foreground">Email &amp; chat support:</span> Get faster help from our support team as you scale.</li>
                    <li><span className="font-medium text-foreground">Custom branding:</span> Match Orbyt Booking to your brand with your logo and colors.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pro" className="rounded-xl border border-slate-200/80 bg-slate-100/90 dark:bg-slate-800/40 dark:border-slate-700/80 shadow-sm overflow-hidden border-b-0">
                <AccordionTrigger className="px-4 py-3.5 text-left hover:no-underline hover:bg-slate-200/40 dark:hover:bg-slate-700/40 transition-colors [&[data-state=open]]:rounded-none">
                  Pro – established businesses that want full access to all features.
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><span className="font-medium text-foreground">Everything in Growth:</span> Includes all features from the Starter and Growth plans.</li>
                    <li><span className="font-medium text-foreground">Priority support:</span> Skip the line with priority response times from our team.</li>
                    <li><span className="font-medium text-foreground">API access:</span> Connect Orbyt Booking to your other tools and internal systems.</li>
                    <li><span className="font-medium text-foreground">Advanced reporting:</span> Deeper insights into revenue, team performance, and customer behavior.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          {/* Pricing FAQ */}
          <div className="mt-12 max-w-4xl mx-auto grid gap-6 md:grid-cols-3">
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
          </div>
        </div>
      </section>

      {/* Try it for free section — hero image with same overlay as hero */}
      <section className="relative py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/70" aria-hidden />
        <div className="container relative z-10 mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-lg text-slate-200 mb-8">Join thousands of businesses that trust Orbyt Booking. Try it for free today!</p>
          
          <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-md border border-slate-400 bg-white/95 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
            <button 
              type="button"
              className="bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-md transition-colors whitespace-nowrap"
            >
              Start Free Trial
            </button>
          </div>
          <p className="text-sm text-slate-300 mt-3">No credit card required. 14-day free trial.</p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <div className="rounded-2xl overflow-hidden h-full">
                <img 
                  src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80" 
                  alt="Friendly customer support team"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="md:w-1/2 text-center md:text-left">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">We're Here to Help</h2>
              <p className="text-muted-foreground mb-6">
                Our dedicated support team is ready to assist you with any questions or concerns you might have about our services.
              </p>
              <div className="space-y-4">
                <a 
                  href="mailto:hello@orbitbooking.com" 
                  className="inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-md transition-colors group"
                >
                  Send us a message
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 transition-transform group-hover:translate-x-1">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </a>
                <p className="text-sm text-muted-foreground">
                  We typically respond within 24 hours
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-navy text-navy-foreground py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/images/orbit.png" alt="Orbyt Booking" className="h-12 w-12" />
                <h3 className="text-2xl font-bold">Orbyt Booking</h3>
              </div>
              <p className="text-navy-foreground/80 mb-4 text-sm">
              Modern booking for cleaners and local service businesses.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#features" className="hover:underline">Features</a></li>
                  <li><a href="#pricing" className="hover:underline">Pricing</a></li>
                  <li><a href="#" className="hover:underline">Testimonials</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#about-us" className="hover:underline">About Us</a></li>
                  <li><a href="#" className="hover:underline">Contact</a></li>
                  <li><a href="#" className="hover:underline">Careers</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10">
            <p className="text-center text-sm text-navy-foreground/60">
              &copy; {new Date().getFullYear()} Orbyt Booking. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      </div>
    </main>
  );
}
