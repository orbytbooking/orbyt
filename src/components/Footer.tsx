'use client'

import { Facebook, Twitter, Linkedin, Youtube, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

const Footer = ({ data, branding, headerData }: { data?: any; branding?: any; headerData?: any }) => {
  const router = useRouter();
  const pathname = usePathname();

  // Use Orbyt Service platform branding on platform legal/marketing pages (no business context)
  const isPlatformPage = pathname === "/terms-and-conditions" || pathname === "/privacy-policy" || pathname === "/" || pathname === "/features" || pathname.startsWith("/login") || pathname === "/customer-auth" || pathname === "/contact-support" || pathname.startsWith("/help-center");
  const usePlatformFooter = isPlatformPage && !data && !branding;
  const platformBranding = usePlatformFooter
    ? {
        companyName: "Orbyt Service",
        logo: "/images/orbit.png",
        description: "Your service business, in Orbyt. Bookings, payments, and everything in between.",
        email: "support@orbyt.com",
        copyright: `© ${new Date().getFullYear()} Orbyt Service. All rights reserved.`,
      }
    : null;

  const displayName = platformBranding?.companyName ?? headerData?.companyName ?? branding?.companyName ?? "Cleaning Service";
  const displayLogo = platformBranding?.logo ?? branding?.logo;
  const displayDescription = platformBranding?.description ?? data?.description ?? "Professional cleaning services you can trust. Experience the difference with our expert team.";
  const displayEmail = platformBranding?.email ?? data?.email ?? "info@orbyt.com";
  const displayCopyright = platformBranding?.copyright ?? data?.copyright ?? `© ${new Date().getFullYear()} ${displayName}. All rights reserved.`;

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
              {displayLogo && !displayLogo.startsWith("blob:") ? (
                <img src={displayLogo} alt={displayName} className="h-16 w-16" />
              ) : (
                <div className="h-16 w-16 bg-gray-200 rounded flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <h3 className="text-2xl font-bold gradient-text">{displayName}</h3>
            </div>
            <p className="text-navy-foreground/80 mb-4">
              {displayDescription}
            </p>
            {!usePlatformFooter && (
              <p className="text-navy-foreground/80 mb-4">
                Call: {data?.phone || "+1 234 567 8900"}
              </p>
            )}
            <p className="text-navy-foreground/80">
              Email: {displayEmail}
            </p>
          </div>
          
          <div className={`grid gap-4 ${(data?.quickLinks || []).filter((l: any) => l?.text && l?.url).length > 0 ? "grid-cols-2" : ""}`}>
            {(data?.quickLinks || []).filter((link: any) => link?.text && link?.url).length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-navy-foreground/80">
                {(data?.quickLinks || []).filter((link: any) => link?.text && link?.url).map((link: any, index: number) => (
                  <li key={index}>
                    <Link 
                      href={link.url || '#'}
                      className="hover:text-primary transition-colors"
                    >
                      {link.text || 'Link'}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            )}
            <div>
              <h4 className="font-semibold mb-3">{usePlatformFooter ? "Legal" : "Orbyt Service"}</h4>
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
              {!usePlatformFooter && <p className="text-xs text-navy-foreground/60 mt-1">Platform terms and privacy</p>}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-navy-foreground/20">
          <p className="text-navy-foreground/80 mb-4 md:mb-0">
            {displayCopyright}
          </p>
          
          <div className="flex gap-4">
            <Link href={data?.socialLinks?.facebook || '#'} className="w-10 h-10 rounded-full bg-navy-foreground/10 flex items-center justify-center hover:bg-primary transition-all hover:scale-110 border border-navy-foreground/20">
              <Facebook className="w-5 h-5" />
            </Link>
            <Link href={data?.socialLinks?.twitter || '#'} className="w-10 h-10 rounded-full bg-navy-foreground/10 flex items-center justify-center hover:bg-primary transition-all hover:scale-110 border border-navy-foreground/20">
              <Twitter className="w-5 h-5" />
            </Link>
            <Link href={data?.socialLinks?.instagram || '#'} className="w-10 h-10 rounded-full bg-navy-foreground/10 flex items-center justify-center hover:bg-primary transition-all hover:scale-110 border border-navy-foreground/20">
              <Linkedin className="w-5 h-5" />
            </Link>
            <Link href={data?.socialLinks?.linkedin || '#'} className="w-10 h-10 rounded-full bg-navy-foreground/10 flex items-center justify-center hover:bg-primary transition-all hover:scale-110 border border-navy-foreground/20">
              <Youtube className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;