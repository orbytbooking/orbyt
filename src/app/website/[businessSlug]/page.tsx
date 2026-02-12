'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

interface BusinessWebsiteProps {
  params: {
    businessSlug: string;
  };
}

export default function BusinessWebsite({ params }: BusinessWebsiteProps) {
  const { config, isLoading } = useWebsiteConfig();
  const [businessName, setBusinessName] = useState<string>('');
  const [businessId, setBusinessId] = useState<string>('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Fetch business data based on slug or ID
  useEffect(() => {
    const fetchBusinessData = async () => {
      // Get business ID from URL params first, then fallback to slug
      const urlBusinessId = searchParams.get('business');
      const businessId = urlBusinessId || params.businessSlug;
      
      if (businessId) {
        setBusinessId(businessId);
        
        try {
          let businessName = '';
          
          // Try to get business name from businesses API first
          const response = await fetch(`/api/businesses?business_id=${businessId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.businesses && data.businesses.length > 0) {
              businessName = data.businesses[0].name;
            }
          }
          
          // Fallback to industries API if businesses API fails
          if (!businessName) {
            const industriesResponse = await fetch(`/api/industries?business_id=${businessId}`);
            if (industriesResponse.ok) {
              const industriesData = await industriesResponse.json();
              if (industriesData.industries && industriesData.industries.length > 0) {
                businessName = industriesData.industries[0].name || 'Cleaning Service';
              }
            }
          }
          
          setBusinessName(businessName || 'Cleaning Service');
        } catch (error) {
          console.error('Error fetching business name:', error);
          setBusinessName('Cleaning Service');
        }
      } else {
        setBusinessName('Cleaning Service');
      }
    };

    fetchBusinessData();
  }, [params.businessSlug, searchParams]);

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
            <p className="text-gray-500 mb-4">Business: {businessName}</p>
            <p className="text-gray-500 mb-4">Business ID: {businessId}</p>
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
            return <Navigation key={section.id} branding={config.branding} headerData={section.data} />;
          case 'hero':
            return <div key={section.id} id="hero"><Hero data={section.data} branding={config.branding} /></div>;
          case 'how-it-works':
            return <div key={section.id} id="how-it-works"><HowItWorks data={section.data} /></div>;
          case 'services':
            return <div key={section.id} id="services"><ServicesSection data={section.data} /></div>;
          case 'reviews':
            return <div key={section.id} id="reviews"><Reviews data={section.data} /></div>;
          case 'faqs':
            return <div key={section.id} id="faqs"><FAQs data={section.data} /></div>;
          case 'contact':
            return <div key={section.id} id="contact"><Contact data={section.data} /></div>;
          case 'footer':
            return <Footer key={section.id} data={section.data} branding={config.branding} headerData={config.sections.find(s => s.type === 'header')?.data} />;
          default:
            return null;
        }
      })}
    </main>
  );
}
