'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, HelpCircle, MessageSquare, LifeBuoy, BookOpen, User, Zap } from 'lucide-react';
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
      quote: "Orbit Booking has completely transformed how we manage appointments. Our no-show rate dropped by 80% after implementing their reminder system.",
      author: "Sarah Johnson",
      role: "Owner, Sparkling Clean",
      rating: 5,
      avatar: "👩‍💼"
    },
    {
      quote: "The best investment we've made for our cleaning business. The automated scheduling saves us hours every week.",
      author: "Michael Chen",
      role: "Operations Manager, Fresh Start",
      rating: 5,
      avatar: "👨‍💼"
    },
    {
      quote: "Our clients love the professional booking experience. It's made our business look much more established.",
      author: "Emily Rodriguez",
      role: "Founder, Clean Sweep Co.",
      rating: 5,
      avatar: "👩‍💻"
    },
    {
      quote: "The customer support is outstanding. They helped us set up our booking page exactly how we wanted it.",
      author: "David Kim",
      role: "Director, Elite Cleaners",
      rating: 5,
      avatar: "🧑‍💼"
    },
    {
      quote: "We've seen a 40% increase in bookings since switching to Orbit. The mobile experience is fantastic!",
      author: "Lisa Wong",
      role: "CEO, Crystal Clear Services",
      rating: 5,
      avatar: "👩‍🎓"
    },
    {
      quote: "Integrating Orbit with our existing tools was seamless. It just works!",
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
    <main className="min-h-screen flex flex-col bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/orbit.png"
              alt="Orbit Booking logo"
              className="h-9 w-9"
            />
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-900 tracking-wide">
                Orbit Booking
              </span>
            </div>
          </div>
          <div className="hidden gap-6 text-sm font-medium text-black sm:flex">
            <a href="#features" className="hover:text-primary transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-primary transition-colors">
              Pricing
            </a>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center text-sm font-medium text-black hover:text-primary transition-colors">
                  Support
                  <ChevronDown className="ml-1 h-4 w-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="min-w-[220px] bg-white rounded-md p-2 shadow-lg border border-gray-200 z-50" sideOffset={10} align="end">
                  <Link href="/help-center">
                    <DropdownMenu.Item className="group text-sm rounded-sm flex items-center px-2 py-2 outline-none cursor-pointer hover:bg-gray-50 hover:text-primary">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      <span>Help Center</span>
                    </DropdownMenu.Item>
                  </Link>
                  <Link href="/help-center/faqs">
                    <DropdownMenu.Item className="group text-sm rounded-sm flex items-center px-2 py-2 outline-none cursor-pointer hover:bg-gray-50 hover:text-primary">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>FAQs</span>
                    </DropdownMenu.Item>
                  </Link>
                  <Link href="/contact-support">
                    <DropdownMenu.Item className="group text-sm rounded-sm flex items-center px-2 py-2 outline-none cursor-pointer hover:bg-gray-50 hover:text-primary">
                      <LifeBuoy className="mr-2 h-4 w-4" />
                      <span>Contact Support</span>
                    </DropdownMenu.Item>
                  </Link>
                  <Link href="/help-center/tutorials">
                    <DropdownMenu.Item className="group text-sm rounded-sm flex items-center px-2 py-2 outline-none cursor-pointer hover:bg-gray-50 hover:text-primary">
                      <BookOpen className="mr-2 h-4 w-4" />
                      <span>Tutorials</span>
                    </DropdownMenu.Item>
                  </Link>
                  <Link href="/help-center/account">
                    <DropdownMenu.Item className="group text-sm rounded-sm flex items-center px-2 py-2 outline-none cursor-pointer hover:bg-gray-50 hover:text-primary">
                      <User className="mr-2 h-4 w-4" />
                      <span>Account Support</span>
                    </DropdownMenu.Item>
                  </Link>
                  <Link href="/help-center/feature-requests">
                    <DropdownMenu.Item className="group text-sm rounded-sm flex items-center px-2 py-2 outline-none cursor-pointer hover:bg-gray-50 hover:text-primary">
                      <Zap className="mr-2 h-4 w-4" />
                      <span>Request a Feature</span>
                    </DropdownMenu.Item>
                  </Link>
                  <DropdownMenu.Arrow className="fill-white" />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden rounded-md px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary transition-colors sm:inline-flex"
            >
              Demo
            </button>
            <a
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Log In
            </a>
          </div>
        </div>
      </header>

      <section className="pt-28 pb-16 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="container mx-auto grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-200">
              Orbit Booking • For Service Businesses
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight font-space-grotesk">
              The <span className="text-primary">perfect platform</span> to make your service business <span className="text-primary">work smarter for you</span>.
            </h1>
            <p className="text-base sm:text-lg text-slate-200 max-w-xl font-sans">
              Orbit Booking gives cleaners and local service businesses a modern booking experience with built-in online scheduling, automated reminders, and payments.
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
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 via-purple-500/20 to-blue-500/20 blur-3xl opacity-70 group-hover:opacity-100 transition-all duration-700" aria-hidden="true" />
            <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/95 to-slate-800/95 p-8 shadow-2xl backdrop-blur-sm overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full filter blur-3xl" />
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full filter blur-3xl" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <svg className="h-6 w-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                      </svg>
                    </div>
                    <h3 className="ml-3 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
                      Trusted by Industry Leaders
                    </h3>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={goToPrev}
                      className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                      aria-label="Previous testimonial"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button 
                      onClick={goToNext}
                      className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
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
                      className={`absolute inset-0 p-1 transition-all duration-700 transform ${
                        index === currentSlide 
                          ? 'opacity-100 translate-x-0 z-10' 
                          : index < currentSlide 
                            ? 'opacity-0 -translate-x-4' 
                            : 'opacity-0 translate-x-4'
                      }`}
                    >
                      <div className="h-full flex flex-col bg-gradient-to-br from-slate-800/50 to-slate-900/70 p-6 rounded-xl border border-white/5 backdrop-blur-sm">
                        <div className="flex-1 flex items-center">
                          <p className="text-slate-200 text-base leading-relaxed relative">
                            <span className="absolute -left-6 -top-2 text-4xl opacity-10">"</span>
                            {testimonial.quote}
                          </p>
                        </div>
                        <div className="mt-8 pt-5 border-t border-white/5">
                          <div className="flex items-center">
                            <div className="text-3xl mr-4">{testimonial.avatar}</div>
                            <div>
                              <p className="font-semibold text-white">{testimonial.author}</p>
                              <p className="text-slate-400 text-sm">{testimonial.role}</p>
                              <div className="flex mt-1">
                                {Array.from({ length: testimonial.rating }).map((_, i) => (
                                  <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
                    {testimonials.map((_: Testimonial, index: number) => (
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          index === currentSlide 
                            ? 'bg-gradient-to-r from-primary to-blue-400 w-8' 
                            : 'bg-white/20 w-2.5 hover:bg-white/40'
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

      <section id="pricing" className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Simple and transparent pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan for your service business.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="border-2 border-transparent rounded-xl p-6 hover:shadow-lg transition-shadow flex flex-col h-full">
              <h3 className="text-lg font-semibold mb-2">Starter</h3>
              <p className="text-muted-foreground text-sm mb-6">Perfect for solo operators and small teams getting started</p>
              <div className="mb-6">
                <span className="text-3xl font-bold">$19</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm min-h-[200px]">
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Core scheduling & calendar
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited bookings
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Email support
                </li>
              </ul>
              <div className="mt-auto">
                <button className="w-full py-3 px-6 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors font-medium">
                  Start Starter for Free
                </button>
              </div>
            </div>

            {/* Growth Plan (Featured) */}
            <div className="border-2 border-primary rounded-xl p-6 shadow-lg relative -mx-[1px] flex flex-col h-full">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-medium px-3 py-1 rounded-full">
                Most Popular
              </div>
              <h3 className="text-lg font-semibold mb-2">Growth</h3>
              <p className="text-muted-foreground text-sm mb-6">For growing teams that need more automation and control</p>
              <div className="mb-6">
                <span className="text-3xl font-bold">$49</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm min-h-[200px]">
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Advanced scheduling & routing
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited bookings
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Email & chat support
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Custom branding
                </li>
              </ul>
              <div className="mt-auto">
                <button className="w-full py-3 px-6 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors font-medium">
                  Start Growth for Free
                </button>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="border-2 border-transparent rounded-xl p-6 hover:shadow-lg transition-shadow flex flex-col h-full">
              <h3 className="text-lg font-semibold mb-2">Pro</h3>
              <p className="text-muted-foreground text-sm mb-6">For established businesses that want everything unlocked</p>
              <div className="mb-6">
                <span className="text-3xl font-bold">$99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm min-h-[200px]">
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Everything in Growth
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited bookings
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority support
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  API access
                </li>
              </ul>
              <div className="mt-auto">
                <button className="w-full py-3 px-6 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors font-medium">
                  Start Pro for Free
                </button>
              </div>
            </div>
          </div>

          {/* Plan details accordion (similar to BookingKoala options with descriptions) */}
          <div className="mt-12 max-w-3xl mx-auto">
            <h3 className="text-2xl font-semibold text-center mb-4">
              What&apos;s included in each plan
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Scroll through the plans below to see a detailed breakdown of features and how they help your business.
            </p>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="starter">
                <AccordionTrigger className="text-left">
                  Starter – solo operators and small teams just getting started.
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><span className="font-medium text-foreground">Core scheduling &amp; calendar:</span> Accept bookings online 24/7 and see everything in a simple calendar view.</li>
                    <li><span className="font-medium text-foreground">Unlimited bookings:</span> Take as many appointments as you want with no extra per‑booking fees.</li>
                    <li><span className="font-medium text-foreground">Email reminders:</span> Reduce no‑shows with automatic confirmation and reminder emails.</li>
                    <li><span className="font-medium text-foreground">Basic customer profiles:</span> Keep track of client details and service history in one place.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="growth">
                <AccordionTrigger className="text-left">
                  Growth – growing teams that need advanced automation and greater control.
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><span className="font-medium text-foreground">Advanced scheduling &amp; routing:</span> Assign jobs to the right team members and optimize routes.</li>
                    <li><span className="font-medium text-foreground">Team management:</span> Add multiple staff, manage availability, and see who is booked where.</li>
                    <li><span className="font-medium text-foreground">Email &amp; chat support:</span> Get faster help from our support team as you scale.</li>
                    <li><span className="font-medium text-foreground">Custom branding:</span> Match Orbit Booking to your brand with your logo and colors.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pro">
                <AccordionTrigger className="text-left">
                  Pro – established businesses that want full access to all features.
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><span className="font-medium text-foreground">Everything in Growth:</span> Includes all features from the Starter and Growth plans.</li>
                    <li><span className="font-medium text-foreground">Priority support:</span> Skip the line with priority response times from our team.</li>
                    <li><span className="font-medium text-foreground">API access:</span> Connect Orbit Booking to your other tools and internal systems.</li>
                    <li><span className="font-medium text-foreground">Advanced reporting:</span> Deeper insights into revenue, team performance, and customer behavior.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          {/* Plan comparison table */}
          <div className="mt-12">
            <h3 className="text-2xl font-semibold text-center mb-4">
              Compare plans side by side
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              See which tools are included in each plan. All plans include unlimited bookings and access to our support team.
            </p>
            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Features</th>
                    <th className="py-3 px-4 text-center font-semibold">Starter</th>
                    <th className="py-3 px-4 text-center font-semibold">Growth</th>
                    <th className="py-3 px-4 text-center font-semibold">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Online booking & calendar', starter: true, growth: true, pro: true },
                    { label: 'Customer portal', starter: true, growth: true, pro: true },
                    { label: 'Provider mobile access', starter: false, growth: true, pro: true },
                    { label: 'Smart scheduling & routing', starter: false, growth: true, pro: true },
                    { label: 'Coupons & daily discounts', starter: false, growth: true, pro: true },
                    { label: 'Gift cards & scripts workspace', starter: false, growth: true, pro: true },
                    { label: 'Hiring pipeline & quizzes', starter: false, growth: true, pro: true },
                    { label: 'Advanced reports & exports', starter: false, growth: true, pro: true },
                    { label: 'API access', starter: false, growth: false, pro: true },
                    { label: 'Priority support', starter: false, growth: false, pro: true },
                  ].map((row) => (
                    <tr key={row.label} className="border-t">
                      <td className="py-3 px-4 text-sm text-muted-foreground">{row.label}</td>
                      {(['starter', 'growth', 'pro'] as const).map((plan) => (
                        <td key={plan} className="py-3 px-4 text-center">
                          {row[plan] ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs">
                              ✓
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      {/* Try it for free section */}
      <section className="bg-gradient-to-r from-primary/5 to-accent/5 py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-lg text-muted-foreground mb-8">Join thousands of businesses that trust Orbit Booking. Try it for free today!</p>
          
          <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
            <button 
              type="button"
              className="bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-md transition-colors whitespace-nowrap"
            >
              Start Free Trial
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">No credit card required. 14-day free trial.</p>
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
                <img src="/images/orbit.png" alt="Orbit Booking" className="h-12 w-12" />
                <h3 className="text-2xl font-bold">Orbit Booking</h3>
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
                  <li><a href="#" className="hover:underline">About Us</a></li>
                  <li><a href="#" className="hover:underline">Contact</a></li>
                  <li><a href="#" className="hover:underline">Careers</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10">
            <p className="text-center text-sm text-navy-foreground/60">
              &copy; {new Date().getFullYear()} Orbit Booking. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
