'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface NavigationProps {
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    companyName?: string;
    domain?: string;
  };
  inline?: boolean; // Add prop for inline positioning
}

const Navigation = ({ branding, inline = false }: NavigationProps = {}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isCustomer, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Handle hash changes and initial page load with hash
  useEffect(() => {
    const handleHashChange = () => {
      // Only handle if we're on the website builder page
      if (pathname === '/my-website') {
        const hash = window.location.hash.substring(1);
        if (hash) {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    };

    // Initial check
    if (pathname === '/my-website' && window.location.hash) {
      handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [pathname]);

  // Helper function to handle section click with proper typing
  const handleSectionClick = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault();
    
    if (pathname !== '/my-website') {
      // If not on the website builder page, navigate to website builder with hash
      router.push(`/my-website#${sectionId}`);
    } else {
      // If already on website builder page, just scroll to the section
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState({}, '', `/my-website#${sectionId}`);
      }
    }
    
    setMobileMenuOpen(false);
  };

  return (
    <nav className={`${inline ? 'relative' : 'fixed top-0 left-0 right-0'} z-50 bg-background/95 backdrop-blur-md border-b border-primary/20 shadow-lg`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-4">
            <Link href="/my-website" className="flex items-center gap-4 cursor-pointer">
              {branding?.logo && !branding.logo.startsWith('blob:') ? (
                <img src={branding.logo} alt={branding.companyName || "Cleaning Service"} className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <span className="text-2xl font-bold gradient-text">
                {branding?.companyName || "Cleaning Service"}
              </span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/my-website#how-it-works"
              onClick={(e) => handleSectionClick(e, 'how-it-works')}
              className="text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              How It Works
            </Link>
            <Link 
              href="/my-website#services"
              onClick={(e) => handleSectionClick(e, 'services')}
              className="text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Services
            </Link>
            <Link 
              href="/my-website#reviews"
              onClick={(e) => handleSectionClick(e, 'reviews')}
              className="text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Reviews
            </Link>
            <Link 
              href="/my-website#contact"
              onClick={(e) => handleSectionClick(e, 'contact')}
              className="text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Contact
            </Link>
            <Button variant="outline" size="sm" asChild>
              <Link href={user && isCustomer ? "/customer/dashboard" : "/login"}>
                {user && isCustomer ? "My Dashboard" : "Login"}
              </Link>
            </Button>
            <Button 
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                if (user && isCustomer) {
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
              href="/my-website#how-it-works"
              onClick={(e) => handleSectionClick(e, 'how-it-works')}
              className="block text-foreground hover:text-primary transition-colors w-full text-left py-2 px-4"
            >
              How It Works
            </Link>
            <Link
              href="/my-website#services"
              onClick={(e) => handleSectionClick(e, 'services')}
              className="block text-foreground hover:text-primary transition-colors w-full text-left py-2 px-4"
            >
              Services
            </Link>
            <Link
              href="/my-website#reviews"
              onClick={(e) => handleSectionClick(e, 'reviews')}
              className="block text-foreground hover:text-primary transition-colors w-full text-left py-2 px-4"
            >
              Reviews
            </Link>
            <Link
              href="/my-website#contact"
              onClick={(e) => handleSectionClick(e, 'contact')}
              className="block text-foreground hover:text-primary transition-colors w-full text-left py-2 px-4"
            >
              Contact
            </Link>
            <div className="flex flex-col space-y-2 pt-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={user && isCustomer ? "/customer/dashboard" : "/login"}>
                  {user && isCustomer ? "My Dashboard" : "Login"}
                </Link>
              </Button>
              <Button 
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  if (user && isCustomer) {
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
