'use client';

import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import ServicesSection from "@/components/ServicesSection";
import Reviews from "@/components/Reviews";
import Contact from "@/components/Contact";
import FAQs from "@/components/FAQs";
import Footer from "@/components/Footer";
import { useWebsiteConfig } from "@/hooks/useWebsiteConfig";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function BuilderLanding() {
  const { config, isLoading } = useWebsiteConfig();

  if (isLoading) {
    return (
      <main>
        <div className="min-h-screen">
          <Skeleton className="h-16 w-full" />
          <div className="container mx-auto px-4 py-8 space-y-8">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (!config) {
    return (
      <main>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">No Website Configuration</h1>
            <p className="text-gray-600 mb-8">This business hasn't configured their website yet.</p>
            <Button onClick={() => window.location.href = '/admin/website-builder'}>
              Configure Website
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Get visible sections in order
  const visibleSections = config.sections
    .filter(s => s.visible)
    .sort((a, b) => {
      const orderA = config.sections.findIndex(s => s.id === a.id);
      const orderB = config.sections.findIndex(s => s.id === b.id);
      return orderA - orderB;
    });

  return (
    <main>
      {visibleSections.map((section) => {
        switch (section.type) {
          case 'header':
            return <Navigation key={section.id} branding={config.branding} />;
          case 'hero':
            return <Hero key={section.id} data={section.data} branding={config.branding} />;
          case 'how-it-works':
            return <HowItWorks key={section.id} data={section.data} />;
          case 'services':
            return <ServicesSection key={section.id} data={section.data} />;
          case 'reviews':
            return <Reviews key={section.id} data={section.data} />;
          case 'faqs':
            return <FAQs key={section.id} data={section.data} />;
          case 'contact':
            return <Contact key={section.id} data={section.data} />;
          case 'footer':
            return <Footer key={section.id} data={section.data} branding={config.branding} />;
          default:
            return null;
        }
      })}
    </main>
  );
}
