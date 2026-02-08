'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useBusiness } from '@/contexts/BusinessContext';

export interface WebsiteSection {
  id: string;
  type: 'hero' | 'services' | 'how-it-works' | 'reviews' | 'faqs' | 'contact' | 'footer';
  visible: boolean;
  data: any;
}

export interface WebsiteConfig {
  sections: WebsiteSection[];
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logo: string;
    companyName: string;
    domain: string;
  };
  template: string;
}

const defaultConfig: WebsiteConfig = {
  sections: [
    {
      id: 'hero',
      type: 'hero',
      visible: true,
      data: {
        title: 'Thanks For Stopping By',
        subtitle: 'Let Us Connect You With Top Providers',
        description: 'Experience hassle-free booking with instant confirmation, vetted professionals, and premium service quality.',
        backgroundImage: '/images/hero-background-chicago.png',
        button1Text: 'Book Service',
        button1Link: '/book-now',
        button2Text: 'Contact Us',
        button2Link: '#contact',
      }
    },
    {
      id: 'how-it-works',
      type: 'how-it-works',
      visible: true,
      data: {
        title: 'How It Works?',
        steps: [
          { title: 'Book Appointment', description: 'Use our simple platform to book an appointment with verified top providers.', image: '/images/book-appointment.jpg' },
          { title: 'Get Confirmation', description: 'You will receive a confirmation from us when your appointment is confirmed.', image: '/images/get-confirmation.jpg' },
          { title: 'Relax, Sit Done!', description: 'You are all set to see your top provider. Don\'t stress, we got you covered.', image: '/images/relax-sit-done.jpg' },
        ]
      }
    },
    {
      id: 'services',
      type: 'services',
      visible: true,
      data: {
        title: 'Our Services',
        subtitle: 'Professional cleaning services tailored to your needs',
        services: [
          { title: 'Residential Cleaning', description: 'Professional home cleaning services to keep your living space spotless and fresh.', features: ['Regular cleaning', 'Deep cleaning', 'Move-in/out cleaning', 'Custom services'], image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop' },
          { title: 'Commercial Cleaning', description: 'Maintain a clean and professional workspace with our commercial cleaning solutions.', features: ['Office cleaning', 'Retail spaces', 'Medical facilities', 'Industrial cleaning'], image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop' },
          { title: 'Specialty Services', description: 'Specialized cleaning services for your unique needs.', features: ['Carpet cleaning', 'Window washing', 'Upholstery cleaning', 'Disinfection'], image: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=600&h=400&fit=crop' },
          { title: 'Post-Construction Cleaning', description: 'Thorough cleaning after renovation or construction projects.', features: ['Dust removal', 'Debris cleanup', 'Surface polishing', 'Final touch-ups'], image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop' },
          { title: 'Green Eco-Friendly Cleaning', description: 'Environmentally safe cleaning using eco-friendly products and methods.', features: ['Non-toxic products', 'Sustainable practices', 'Safe for pets & kids', 'Allergen-free'], image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&h=400&fit=crop' },
          { title: 'Event Cleaning Services', description: 'Pre and post-event cleaning for parties, weddings, and corporate events.', features: ['Setup cleaning', 'During event support', 'Post-event cleanup', 'Waste management'], image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=400&fit=crop' },
          { title: 'Deep Cleaning Services', description: 'Comprehensive deep cleaning to restore your space to pristine condition.', features: ['Baseboard cleaning', 'Inside appliances', 'Behind furniture', 'Detailed sanitization'], image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=600&h=400&fit=crop' },
          { title: 'Window Cleaning', description: 'Crystal clear windows inside and out for a brighter, more inviting space.', features: ['Interior windows', 'Exterior windows', 'Window frames', 'Screen cleaning'], image: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=600&h=400&fit=crop' },
          { title: 'Carpet & Rug Cleaning', description: 'Professional carpet and rug cleaning to remove stains, odors, and allergens.', features: ['Steam cleaning', 'Stain removal', 'Odor elimination', 'Protective treatment'], image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop' },
          { title: 'Kitchen Deep Cleaning', description: 'Thorough kitchen cleaning including appliances, cabinets, and hard-to-reach areas.', features: ['Oven cleaning', 'Refrigerator cleaning', 'Cabinet cleaning', 'Exhaust fan cleaning'], image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=600&h=400&fit=crop' },
          { title: 'Bathroom Sanitization', description: 'Complete bathroom cleaning and sanitization for a hygienic environment.', features: ['Tile & grout cleaning', 'Shower deep clean', 'Toilet sanitization', 'Mirror polishing'], image: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=600&h=400&fit=crop' },
        ]
      }
    },
    {
      id: 'reviews',
      type: 'reviews',
      visible: true,
      data: {
        title: 'What Our Customers Say',
        reviews: []
      }
    },
    {
      id: 'contact',
      type: 'contact',
      visible: true,
      data: {
        title: 'Contact Us',
        email: 'info@orbyt.com',
        phone: '+1 234 567 8900',
        address: '123 Main St, Chicago, IL 60601'
      }
    },
  ],
  branding: {
    primaryColor: '#00D4E8',
    secondaryColor: '#00BCD4',
    logo: '/images/logo.png',
    companyName: 'Orbyt Cleaners',
    domain: 'orbytcleaner.bookingkoala.com',
  },
  template: 'modern',
};

export const useWebsiteConfig = () => {
  const [config, setConfig] = useState<WebsiteConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const { currentBusiness } = useBusiness();

  const updateConfig = async (newConfig: Partial<WebsiteConfig>) => {
    const updatedConfig = { ...defaultConfig, ...config, ...newConfig };
    setConfig(updatedConfig);
    
    // Save to localStorage for real-time updates
    const storageKey = currentBusiness ? `websiteConfig_${currentBusiness.id}` : 'websiteConfig';
    localStorage.setItem(storageKey, JSON.stringify(updatedConfig));
    
    // Dispatch event for real-time updates
    window.dispatchEvent(new CustomEvent('website-config-updated'));
    
    // Save to database if we have a current business
    if (currentBusiness) {
      try {
        const response = await fetch('/api/admin/website-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ config: updatedConfig }),
        });
        
        if (!response.ok) {
          console.error('Failed to save config to database:', await response.text());
        } else {
          console.log('Config saved to database successfully');
        }
      } catch (error) {
        console.error('Error saving config to database:', error);
      }
    }
  };

  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      
      try {
        // First try to load from database if we have a current business
        if (currentBusiness) {
          const { data: businessConfig, error } = await supabase
            .from('business_website_configs')
            .select('config')
            .eq('business_id', currentBusiness.id)
            .single();

          if (!error && businessConfig) {
            setConfig(businessConfig.config);
            setIsLoading(false);
            return;
          } else if (error && error.code === 'PGRST116') {
            // Table doesn't exist (404), fall back to localStorage
            console.warn('business_website_configs table not found, falling back to localStorage');
          } else if (error) {
            console.warn('Database config fetch failed:', error);
          }
        }
      } catch (error) {
        console.error('Failed to load config from database:', error);
      }

      // Fallback to localStorage with business isolation
      const storageKey = currentBusiness ? `websiteConfig_${currentBusiness.id}` : 'websiteConfig';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConfig(parsed);
        } catch (e) {
          console.error('Failed to load website config', e);
        }
      }
      
      setIsLoading(false);
    };

    loadConfig();
  }, [currentBusiness]);

  useEffect(() => {
    // Listen for storage changes (when builder saves)
    const handleStorageChange = (e: StorageEvent) => {
      const storageKey = currentBusiness ? `websiteConfig_${currentBusiness.id}` : 'websiteConfig';
      if (e.key === storageKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setConfig(parsed);
        } catch (e) {
          console.error('Failed to load website config', e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event (same-tab updates)
    const handleCustomEvent = () => {
      const storageKey = currentBusiness ? `websiteConfig_${currentBusiness.id}` : 'websiteConfig';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConfig(parsed);
        } catch (e) {
          console.error('Failed to load website config', e);
        }
      }
    };

    window.addEventListener('website-config-updated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('website-config-updated', handleCustomEvent);
    };
  }, [currentBusiness]);

  return { 
    config, 
    isLoading, 
    updateConfig 
  };
};

