'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, HelpCircle, MessageSquare, LifeBuoy, BookOpen, User, Zap, Menu, X } from 'lucide-react';

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

/** Orbyt Service platform header: logo, main nav, Support, Log In. Use on platform pages (home, terms, privacy, features, etc.). */
export default function PlatformHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-900/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/images/orbit.png"
            alt="Orbyt Service"
            className="h-8 w-8"
          />
          <span className="text-base font-bold text-white uppercase tracking-wide">
            Orbyt Service
          </span>
        </Link>
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
          <Link href="/testimonials" className="relative pb-0.5 text-white transition-colors hover:text-primary after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0 after:bg-primary after:transition-[width] after:content-[''] hover:after:w-full">
            Testimonials
          </Link>
          <SupportDropdown />
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="hidden sm:inline-flex items-center justify-center rounded-md border border-white/60 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 hover:border-primary hover:text-primary"
          >
            Log In
          </Link>
          <button
            type="button"
            className="sm:hidden p-2 text-white hover:text-primary"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-white/10 bg-slate-900/98 px-4 py-4 flex flex-col gap-2">
          <Link href="/why-premium" className="text-white hover:text-primary py-2" onClick={() => setMobileOpen(false)}>Why Orbyt</Link>
          <Link href="/about" className="text-white hover:text-primary py-2" onClick={() => setMobileOpen(false)}>About Us</Link>
          <Link href="/features" className="text-white hover:text-primary py-2" onClick={() => setMobileOpen(false)}>Features</Link>
          <Link href="/pricing" className="text-white hover:text-primary py-2" onClick={() => setMobileOpen(false)}>Pricing</Link>
          <Link href="/testimonials" className="text-white hover:text-primary py-2" onClick={() => setMobileOpen(false)}>Testimonials</Link>
          <Link href="/help-center" className="text-white hover:text-primary py-2" onClick={() => setMobileOpen(false)}>Support</Link>
          <Link href="/auth/login" className="text-white hover:text-primary py-2 font-medium" onClick={() => setMobileOpen(false)}>Log In</Link>
        </div>
      )}
    </header>
  );
}
