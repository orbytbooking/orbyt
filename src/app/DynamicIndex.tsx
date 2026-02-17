'use client';

import { useSearchParams } from "next/navigation";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Services from "@/components/Services";
import ServicesSection from "@/components/ServicesSection";
import Reviews from "@/components/Reviews";
import Referral from "@/components/Referral";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { useLandingPageData } from "@/hooks/useLandingPageData";
import { Skeleton } from "@/components/ui/skeleton";

const DynamicIndex = () => {
  const searchParams = useSearchParams();
  const businessId = searchParams?.get('business') ?? undefined;
  const { data, isLoading } = useLandingPageData();

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-b" />
        <div className="pt-32 pb-20 px-4 container mx-auto space-y-8">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load landing page data</p>
      </div>
    );
  }

  // Map section types to components
  const sectionComponents: Record<string, React.ReactNode> = {
    hero: <Hero key="hero" businessId={businessId} />,
    how_it_works: <HowItWorks key="how_it_works" />,
    services: <ServicesSection key="services-section" />,
    services_list: <Services key="services" />,
    reviews: <Reviews key="reviews" />,
    referral: <Referral key="referral" />,
    contact: <Contact key="contact" />
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        {data.sections.map((section) => 
          sectionComponents[section.section_type] || null
        )}
      </main>
      <Footer />
    </div>
  );
};

export default DynamicIndex;
