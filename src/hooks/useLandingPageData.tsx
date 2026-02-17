'use client';

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

export interface LandingPageConfig {
  id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  business_name: string;
  business_tagline: string;
  phone: string;
  email: string;
  address: string;
  logo_url?: string;
}

export interface SectionItem {
  id: string;
  section_id: string;
  item_order: number;
  title?: string;
  description?: string;
  icon_name?: string;
  image_url?: string;
  metadata?: any;
}

export interface Section {
  id: string;
  section_type: string;
  section_order: number;
  is_visible: boolean;
  title?: string;
  subtitle?: string;
  content?: any;
  background_image_url?: string;
  section_items?: SectionItem[];
}

// Default fallback data
const defaultConfig: LandingPageConfig = {
  id: '1',
  primary_color: '#2563eb',
  secondary_color: '#1e40af',
  accent_color: '#00BCD4',
  business_name: 'Cleaning Service',
  business_tagline: 'Professional Cleaning Services',
  phone: '(555) 123-4567',
  email: 'info@cleaningservice.com',
  address: '123 Clean St, Chicago, IL 60601',
  logo_url: '/logo.png'
};

const mockSections: Section[] = [
  // Hero Section
  {
    id: 'hero',
    section_type: 'hero',
    section_order: 1,
    is_visible: true,
    title: 'Professional Cleaning Services in Chicago',
    subtitle: 'Book your cleaning service today and experience the difference',
    background_image_url: '/hero-bg.jpg',
    section_items: [
      {
        id: 'hero-cta',
        section_id: 'hero',
        item_order: 1,
        title: 'Book Now',
        description: 'Schedule your cleaning in less than 60 seconds',
        metadata: {
          buttonText: 'Get Started',
          buttonLink: '/book-now'
        }
      }
    ]
  },
  
  // How It Works Section
  {
    id: 'how-it-works',
    section_type: 'how_it_works',
    section_order: 2,
    is_visible: true,
    title: 'How It Works',
    subtitle: 'Simple and convenient cleaning service in 3 easy steps',
    section_items: [
      {
        id: 'step-1',
        section_id: 'how-it-works',
        item_order: 1,
        title: 'Book Online',
        description: 'Choose your service and schedule a time that works for you',
        icon_name: 'calendar'
      },
      {
        id: 'step-2',
        section_id: 'how-it-works',
        item_order: 2,
        title: 'Get Confirmed',
        description: 'Receive instant confirmation and prepare for your cleaning',
        icon_name: 'check-circle'
      },
      {
        id: 'step-3',
        section_id: 'how-it-works',
        item_order: 3,
        title: 'Relax & Enjoy',
        description: 'Sit back and let our professionals handle the cleaning',
        icon_name: 'sparkles'
      }
    ]
  },

  // Services Section
  {
    id: 'services',
    section_type: 'services',
    section_order: 3,
    is_visible: true,
    title: 'Our Services',
    subtitle: 'Professional cleaning services tailored to your needs',
    section_items: [
      {
        id: 'service-1',
        section_id: 'services',
        item_order: 1,
        title: 'Standard Cleaning',
        description: 'Thorough cleaning of your entire home',
        icon_name: 'home',
        metadata: {
          price: '$120',
          duration: '2-3 hours'
        }
      },
      {
        id: 'service-2',
        section_id: 'services',
        item_order: 2,
        title: 'Deep Cleaning',
        description: 'Intensive cleaning for a spotless home',
        icon_name: 'spray-can',
        metadata: {
          price: '$250',
          duration: '4-6 hours'
        }
      },
      {
        id: 'service-3',
        section_id: 'services',
        item_order: 3,
        title: 'Move In/Out',
        description: 'Perfect for new beginnings',
        icon_name: 'truck',
        metadata: {
          price: '$300+',
          duration: 'Varies'
        }
      }
    ]
  },

  // Reviews Section
  {
    id: 'reviews',
    section_type: 'reviews',
    section_order: 4,
    is_visible: true,
    title: 'What Our Customers Say',
    subtitle: 'Hear from our satisfied customers',
    section_items: [
      {
        id: 'review-1',
        section_id: 'reviews',
        item_order: 1,
        title: 'Amazing Service!',
        description: 'The team did an incredible job cleaning my apartment. It looks brand new!',
        metadata: {
          author: 'Sarah M.',
          rating: 5
        }
      },
      {
        id: 'review-2',
        section_id: 'reviews',
        item_order: 2,
        title: 'Highly Recommended',
        description: 'Professional, punctual, and thorough. Will definitely book again!',
        metadata: {
          author: 'James T.',
          rating: 5
        }
      }
    ]
  },

  // Referral Section
  {
    id: 'referral',
    section_type: 'referral',
    section_order: 5,
    is_visible: true,
    title: 'Refer a Friend',
    subtitle: 'Earn $25 for every friend you refer',
    content: 'Share your unique referral code with friends and both of you get $25 off your next cleaning!'
  },

  // Contact Section
  {
    id: 'contact',
    section_type: 'contact',
    section_order: 6,
    is_visible: true,
    title: 'Contact Us',
    subtitle: 'Get in touch with our team',
    section_items: [
      {
        id: 'contact-phone',
        section_id: 'contact',
        item_order: 1,
        title: 'Phone',
        description: '(555) 123-4567',
        icon_name: 'phone',
        metadata: {
          type: 'phone'
        }
      },
      {
        id: 'contact-email',
        section_id: 'contact',
        item_order: 2,
        title: 'Email',
        description: 'info@orbytcleaners.com',
        icon_name: 'mail',
        metadata: {
          type: 'email'
        }
      },
      {
        id: 'contact-address',
        section_id: 'contact',
        item_order: 3,
        title: 'Address',
        description: '123 Clean St, Chicago, IL 60601',
        icon_name: 'map-pin',
        metadata: {
          type: 'address'
        }
      }
    ]
  }
];

export const useLandingPageData = () => {
  const searchParams = useSearchParams();
  const urlBusinessId = searchParams?.get('business') ?? null;

  return useQuery({
    queryKey: ['landing-page-data', urlBusinessId],
    queryFn: async () => {
      // Use business ID from URL only (no localStorage for business isolation)
      if (typeof window === 'undefined') {
        return {
          config: defaultConfig,
          sections: mockSections
        };
      }

      if (!urlBusinessId) {
        return {
          config: defaultConfig,
          sections: mockSections
        };
      }

      try {
        let businessName = 'Cleaning Service';

        const businessResponse = await fetch(`/api/businesses?business_id=${urlBusinessId}`);
        if (businessResponse.ok) {
          const businessData = await businessResponse.json();
          if (businessData.businesses && businessData.businesses.length > 0) {
            const currentBusiness = businessData.businesses.find((biz: any) => biz.id === urlBusinessId);
            if (currentBusiness?.name) {
              businessName = currentBusiness.name;
            }
          }
        }

        if (businessName === 'Cleaning Service') {
          const industriesResponse = await fetch(`/api/industries?business_id=${urlBusinessId}`);
          if (industriesResponse.ok) {
            const industriesData = await industriesResponse.json();
            if (industriesData.industries?.length > 0) {
              const cleaningIndustries = industriesData.industries.filter((ind: any) =>
                ind.name?.toLowerCase().includes('cleaning') ||
                ind.name?.toLowerCase().includes('home') ||
                ind.name?.toLowerCase().includes('maid') ||
                ind.name?.toLowerCase().includes('janitorial')
              );
              const targetIndustry = cleaningIndustries[0] || industriesData.industries[0];
              businessName = targetIndustry.name || 'Cleaning Service';
            }
          }
        }

        const config: LandingPageConfig = {
          id: '1',
          primary_color: '#2563eb',
          secondary_color: '#1e40af',
          accent_color: '#00BCD4',
          business_name: businessName,
          business_tagline: 'Professional Cleaning Services',
          phone: '(555) 123-4567',
          email: 'info@cleaningservice.com',
          address: '123 Clean St, Chicago, IL 60601',
          logo_url: '/logo.png'
        };

        return {
          config,
          sections: mockSections
        };
      } catch (error) {
        console.error('Error fetching landing page data:', error);
        return {
          config: defaultConfig,
          sections: mockSections
        };
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
