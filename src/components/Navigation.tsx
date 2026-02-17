'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerAccount } from "@/hooks/useCustomerAccount";

interface NavigationProps {
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    companyName?: string;
    domain?: string;
  };
  inline?: boolean; // Add prop for inline positioning
  headerData?: {
    companyName?: string;
    logo?: string;
    showNavigation?: boolean;
    navigationLinks?: Array<{ text: string; url: string }>;
  };
}

const Navigation = ({ branding, inline = false, headerData }: NavigationProps = {}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isCustomer, loading } = useAuth();
  const { customerAccount } = useCustomerAccount(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Check if we're in editor mode (inline=true or on admin page)
  const isEditorMode = inline || pathname.startsWith('/admin');

  // Get business context for customer auth
  const getCustomerAuthUrl = () => {
    // Try URL parameters first
    const urlBusinessId = searchParams.get('business');
    if (urlBusinessId) {
      return `/customer-auth?business=${urlBusinessId}`;
    }
    
    return '/customer-auth';
  };

  // Get business context for booking form
  const getBookingUrl = () => {
    // Try URL parameters first
    const urlBusinessId = searchParams.get('business');
    if (urlBusinessId) {
      return `/book-now?business=${urlBusinessId}`;
    }
    
    return '/book-now';
  };

  // Get business context for login form
  const getLoginUrl = () => {
    // Try URL parameters first
    const urlBusinessId = searchParams.get('business');
    if (urlBusinessId) {
      return `/login?business=${urlBusinessId}`;
    }
    
    return '/login';
  };

  // Get business context for website URL
  const getBusinessWebsiteUrl = () => {
    // Try URL parameters first
    const urlBusinessId = searchParams.get('business');
    if (urlBusinessId) {
      return `/my-website?business=${urlBusinessId}`;
    }
    
    return '/my-website';
  };

  // Check if current page should use customer auth
  const shouldUseCustomerAuth = () => {
    return pathname.startsWith('/my-website') || 
           pathname.startsWith('/login') || 
           pathname.startsWith('/customer-auth') ||
           pathname.startsWith('/book-now');
  };

  // On customer-facing pages, also check customer auth (separate Supabase client from business auth)
  const isCustomerLoggedIn = shouldUseCustomerAuth() ? Boolean(customerAccount) : (user && isCustomer);
  const getDashboardUrl = () => {
    const urlBusinessId = searchParams.get('business');
    return urlBusinessId ? `/customer/dashboard?business=${urlBusinessId}` : "/customer/dashboard";
  };

  // Handle hash changes and initial page load with hash
  useEffect(() => {
    const handleHashChange = () => {
      // Handle hash scrolling on any page that might have sections
      const hash = window.location.hash.substring(1);
      if (hash) {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    // Initial check for hash on page load
    if (window.location.hash) {
      handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [pathname]);

  // Helper function to handle section click with proper typing
  const handleSectionClick = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault();
    
    // Try to find the section on the current page first
    const element = document.getElementById(sectionId);
    
    if (element) {
      // If section exists on current page, scroll to it
      element.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState({}, '', `${pathname}#${sectionId}`);
    } else {
      // If section doesn't exist on current page, navigate to business-specific website with hash
      router.push(`${getBusinessWebsiteUrl()}#${sectionId}`);
    }
    
    setMobileMenuOpen(false);
  };

  return (
    <nav className={`${inline ? 'relative' : 'fixed top-0 left-0 right-0'} z-50 bg-background/95 backdrop-blur-md border-b border-primary/20 shadow-lg`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-4">
            <Link href={getBusinessWebsiteUrl()} className="flex items-center gap-4 cursor-pointer">
              {(headerData?.logo || branding?.logo) && !(headerData?.logo || branding?.logo)?.startsWith('blob:') ? (
                <img src={headerData?.logo || branding?.logo} alt={headerData?.companyName || branding?.companyName || "ORBIT"} className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <span className="text-2xl font-bold gradient-text">
                {headerData?.companyName || branding?.companyName || "ORBIT"}
              </span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          {(headerData?.showNavigation !== false) && (
            <div className="hidden md:flex items-center space-x-8">
              {headerData?.navigationLinks?.map((link, index) => (
                <Link 
                  key={index}
                  href={link.url.startsWith('#') ? `${getBusinessWebsiteUrl()}${link.url}` : link.url}
                  onClick={(e) => {
                    if (link.url.startsWith('#')) {
                      const sectionId = link.url.substring(1);
                      handleSectionClick(e, sectionId);
                    }
                  }}
                  className="text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  {link.text}
                </Link>
              ))}
              {/* Fallback navigation when headerData is not provided */}
              {!headerData?.navigationLinks && (
                <>
                  <Link 
                    href={`${getBusinessWebsiteUrl()}#how-it-works`}
                    onClick={(e) => handleSectionClick(e, 'how-it-works')}
                    className="text-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    How It Works
                  </Link>
                  <Link 
                    href={`${getBusinessWebsiteUrl()}#services`}
                    onClick={(e) => handleSectionClick(e, 'services')}
                    className="text-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    Services
                  </Link>
                  <Link 
                    href={`${getBusinessWebsiteUrl()}#reviews`}
                    onClick={(e) => handleSectionClick(e, 'reviews')}
                    className="text-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    Reviews
                  </Link>
                  <Link 
                    href={`${getBusinessWebsiteUrl()}#contact`}
                    onClick={(e) => handleSectionClick(e, 'contact')}
                    className="text-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    Contact
                  </Link>
                </>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link 
                  href={isEditorMode ? '#' : (isCustomerLoggedIn ? getDashboardUrl() : (shouldUseCustomerAuth() ? getCustomerAuthUrl() : getLoginUrl()))}
                  onClick={(e) => {
                    if (isEditorMode) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                >
                  {isCustomerLoggedIn ? "My Dashboard" : "Login"}
                </Link>
              </Button>
              <Button 
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  if (!isEditorMode) {
                    router.push(getBookingUrl());
                  }
                }}
              >
                Book Now
              </Button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (headerData?.showNavigation !== false) && (
          <div className="md:hidden py-4 space-y-4">
            {headerData?.navigationLinks?.map((link, index) => (
              <Link
                key={index}
                href={link.url.startsWith('#') ? `${getBusinessWebsiteUrl()}${link.url}` : link.url}
                onClick={(e) => {
                  if (link.url.startsWith('#')) {
                    const sectionId = link.url.substring(1);
                    handleSectionClick(e, sectionId);
                  }
                  setMobileMenuOpen(false);
                }}
                className="block text-foreground hover:text-primary transition-colors w-full text-left py-2 px-4"
              >
                {link.text}
              </Link>
            ))}
            {/* Fallback navigation when headerData is not provided */}
            {!headerData?.navigationLinks && (
              <>
                <Link
                  href={`${getBusinessWebsiteUrl()}#how-it-works`}
                  onClick={(e) => {
                    handleSectionClick(e, 'how-it-works');
                    setMobileMenuOpen(false);
                  }}
                  className="block text-foreground hover:text-primary transition-colors w-full text-left py-2 px-4"
                >
                  How It Works
                </Link>
                <Link
                  href={`${getBusinessWebsiteUrl()}#services`}
                  onClick={(e) => {
                    handleSectionClick(e, 'services');
                    setMobileMenuOpen(false);
                  }}
                  className="block text-foreground hover:text-primary transition-colors w-full text-left py-2 px-4"
                >
                  Services
                </Link>
                <Link
                  href={`${getBusinessWebsiteUrl()}#reviews`}
                  onClick={(e) => {
                    handleSectionClick(e, 'reviews');
                    setMobileMenuOpen(false);
                  }}
                  className="block text-foreground hover:text-primary transition-colors w-full text-left py-2 px-4"
                >
                  Reviews
                </Link>
                <Link
                  href={`${getBusinessWebsiteUrl()}#contact`}
                  onClick={(e) => {
                    handleSectionClick(e, 'contact');
                    setMobileMenuOpen(false);
                  }}
                  className="block text-foreground hover:text-primary transition-colors w-full text-left py-2 px-4"
                >
                  Contact
                </Link>
              </>
            )}
            <div className="flex flex-col space-y-2 pt-2">
              <Button variant="outline" size="sm" asChild>
                <Link 
                  href={isEditorMode ? '#' : (isCustomerLoggedIn ? getDashboardUrl() : (shouldUseCustomerAuth() ? getCustomerAuthUrl() : getLoginUrl()))}
                  onClick={(e) => {
                    if (isEditorMode) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                >
                  {isCustomerLoggedIn ? "My Dashboard" : "Login"}
                </Link>
              </Button>
              <Button 
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  if (!isEditorMode) {
                    router.push(getBookingUrl());
                  }
                }}
              >
                Book Now
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
