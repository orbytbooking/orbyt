'use client'

import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCustomerAuthenticated, setIsCustomerAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuthState = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .single();
        
        setIsCustomerAuthenticated(!!customer);
      } else {
        setIsCustomerAuthenticated(false);
      }
    };

    checkAuthState();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsCustomerAuthenticated(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAuthState();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      // Update URL with hash without page reload
      window.history.pushState({}, '', `/builder#${sectionId}`);
    }
    setMobileMenuOpen(false);
  };

  // Handle hash changes and initial page load with hash
  useEffect(() => {
    const handleHashChange = () => {
      // Only handle if we're on the builder page
      if (pathname === '/builder') {
        const hash = window.location.hash.substring(1);
        if (hash) {
          const element = document.getElementById(hash);
          if (element) {
            // Small delay to ensure all components are mounted
            setTimeout(() => {
              element.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        }
      }
    };

    // Initial check
    if (pathname === '/builder' && window.location.hash) {
      handleHashChange();
    }

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [pathname]);

  // Helper function to handle section click with proper typing
  const handleSectionClick = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault();
    
    if (pathname !== '/builder') {
      // If not on the builder page, navigate to builder with hash
      router.push(`/builder#${sectionId}`);
    } else {
      // If already on builder page, just scroll to the section
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState({}, '', `/builder#${sectionId}`);
      }
    }
    
    setMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-primary/20 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/builder" className="flex items-center gap-3 cursor-pointer">
            <img src="/images/logo.png" alt="Orbyt Cleaners" className="h-12 w-12" />
            <span className="text-xl font-bold gradient-text">Orbyt Cleaners</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/builder#how-it-works"
              onClick={(e) => handleSectionClick(e, 'how-it-works')}
              className="text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              How It Works
            </Link>
            <Link 
              href="/builder#services"
              onClick={(e) => handleSectionClick(e, 'services')}
              className="text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Services
            </Link>
            <Link 
              href="/builder#reviews"
              onClick={(e) => handleSectionClick(e, 'reviews')}
              className="text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Reviews
            </Link>
            <Link 
              href="/builder#contact"
              onClick={(e) => handleSectionClick(e, 'contact')}
              className="text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Contact
            </Link>
            <Button variant="outline" size="sm" asChild>
              <Link href={isCustomerAuthenticated ? "/customer/dashboard" : "/login"}>
                {isCustomerAuthenticated ? "My Dashboard" : "Login"}
              </Link>
            </Button>
            <Button 
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                if (isCustomerAuthenticated) {
                  router.push("/customer/dashboard");
                } else {
                  router.push("/login");
                }
              }}
            >
              Book Now
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            <Link
              href="/builder#how-it-works"
              onClick={(e) => handleSectionClick(e, 'how-it-works')}
              className="block text-foreground hover:text-primary transition-colors w-full text-left py-2 px-4"
            >
              How It Works
            </Link>
            <Link
              href="/builder#services"
              onClick={(e) => handleSectionClick(e, 'services')}
              className="block text-foreground hover:text-primary transition-colors w-full text-left py-2 px-4"
            >
              Services
            </Link>
            <Link
              href="/builder#reviews"
              onClick={(e) => handleSectionClick(e, 'reviews')}
              className="block text-foreground hover:text-primary transition-colors w-full text-left py-2 px-4"
            >
              Reviews
            </Link>
            <Link
              href="/builder#contact"
              onClick={(e) => handleSectionClick(e, 'contact')}
              className="block text-foreground hover:text-primary transition-colors w-full text-left py-2 px-4"
            >
              Contact
            </Link>
            <div className="flex flex-col space-y-2 pt-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={isCustomerAuthenticated ? "/builder/customer/dashboard" : "/builder/login"}>
                  {isCustomerAuthenticated ? "My Dashboard" : "Login"}
                </Link>
              </Button>
              <Button 
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  if (isCustomerAuthenticated) {
                    router.push("/customer/dashboard");
                  } else {
                    router.push("/login");
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
