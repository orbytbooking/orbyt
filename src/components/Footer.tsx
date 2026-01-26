'use client'

import { Facebook, Twitter, Linkedin, Youtube } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

const Footer = () => {
  const router = useRouter();
  const pathname = usePathname();

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
  };

  return (
    <footer className="bg-navy text-navy-foreground py-12 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="container mx-auto relative z-10">
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/images/logo.png" alt="Orbyt Cleaners" className="h-16 w-16" />
              <h3 className="text-2xl font-bold gradient-text">Orbyt Cleaners</h3>
            </div>
            <p className="text-navy-foreground/80 mb-4">
              Call: +1 234 567 890
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-navy-foreground/80">
                <li>
                  <Link 
                    href="/builder#how-it-works"
                    onClick={(e) => handleSectionClick(e, 'how-it-works')} 
                    className="hover:text-primary transition-colors"
                  >
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/builder#services"
                    onClick={(e) => handleSectionClick(e, 'services')} 
                    className="hover:text-primary transition-colors"
                  >
                    Services
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/builder#reviews"
                    onClick={(e) => handleSectionClick(e, 'reviews')} 
                    className="hover:text-primary transition-colors"
                  >
                    Reviews
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-navy-foreground/80">
                <li>
                  <Link 
                    href="/terms-and-conditions" 
                    className="hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push('/terms-and-conditions');
                    }}
                  >
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/privacy-policy" 
                    className="hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push('/privacy-policy');
                    }}
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-navy-foreground/20">
          <p className="text-navy-foreground/80 mb-4 md:mb-0">
            © 2025 Orbyt Cleaners. All rights reserved.
          </p>
          
          <div className="flex gap-4">
            <Link href="#" className="w-10 h-10 rounded-full bg-navy-foreground/10 flex items-center justify-center hover:bg-primary transition-all hover:scale-110 border border-navy-foreground/20">
              <Facebook className="w-5 h-5" />
            </Link>
            <Link href="#" className="w-10 h-10 rounded-full bg-navy-foreground/10 flex items-center justify-center hover:bg-primary transition-all hover:scale-110 border border-navy-foreground/20">
              <Twitter className="w-5 h-5" />
            </Link>
            <Link href="#" className="w-10 h-10 rounded-full bg-navy-foreground/10 flex items-center justify-center hover:bg-primary transition-all hover:scale-110 border border-navy-foreground/20">
              <Linkedin className="w-5 h-5" />
            </Link>
            <Link href="#" className="w-10 h-10 rounded-full bg-navy-foreground/10 flex items-center justify-center hover:bg-primary transition-all hover:scale-110 border border-navy-foreground/20">
              <Youtube className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;