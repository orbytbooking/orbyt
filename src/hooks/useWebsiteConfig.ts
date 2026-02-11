'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useBusiness } from '@/contexts/BusinessContext';

export interface WebsiteSection {
  id: string;
  type: 'header' | 'hero' | 'services' | 'how-it-works' | 'reviews' | 'faqs' | 'contact' | 'footer';
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

const getDefaultConfig = (businessName?: string): WebsiteConfig => ({
  sections: [
    {
      id: 'header',
      type: 'header',
      visible: true,
      data: {
        companyName: businessName || 'Your Business',
        logo: '/images/orbit.png',
        showNavigation: true,
        navigationLinks: [
          { text: 'How It Works', url: '#how-it-works' },
          { text: 'Services', url: '#services' },
          { text: 'Reviews', url: '#reviews' },
          { text: 'Contact', url: '#contact' }
        ]
      }
    },
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
      id: 'faqs',
      type: 'faqs',
      visible: true,
      data: {
        title: 'Frequently Asked Questions',
        subtitle: 'Find answers to common questions about our services and booking process.',
        faqs: [
          {
            id: 'faq-1',
            question: 'How do I book an appointment?',
            answer: 'You can book an appointment by clicking the \'Book Now\' button on our homepage and following the simple booking process.',
            order: 1
          },
          {
            id: 'faq-2',
            question: 'What payment methods do you accept?',
            answer: 'We accept all major credit cards, PayPal, and in some cases, cash on delivery. All online payments are processed securely.',
            order: 2
          },
          {
            id: 'faq-3',
            question: 'Can I reschedule or cancel my appointment?',
            answer: 'Yes, you can reschedule or cancel your appointment up to 24 hours before your scheduled time through your account dashboard.',
            order: 3
          }
        ]
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
    {
      id: 'footer',
      type: 'footer',
      visible: true,
      data: {
        companyName: businessName || 'Your Business',
        description: 'Professional services you can trust. Experience the difference with our expert team.',
        email: 'info@yourbusiness.com',
        phone: '+1 234 567 8900',
        address: '123 Main St, Your City, State 12345',
        socialLinks: {
          facebook: '#',
          twitter: '#',
          instagram: '#',
          linkedin: '#'
        },
        quickLinks: [
          { text: 'Home', url: '/builder' },
          { text: 'Services', url: '#services' },
          { text: 'About', url: '#about' },
          { text: 'Contact', url: '#contact' }
        ],
        copyright: `© 2024 ${businessName || 'Your Business'}. All rights reserved.`
      }
    },
  ],
  branding: {
    primaryColor: '#00D4E8',
    secondaryColor: '#00BCD4',
    logo: '/images/orbit.png',
    companyName: businessName || 'Your Business',
    domain: 'yourbusiness.bookingkoala.com',
  },
  template: 'modern',
});

export const useWebsiteConfig = () => {
  const [config, setConfig] = useState<WebsiteConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [blockUpdates, setBlockUpdates] = useState(false);
  const { currentBusiness } = useBusiness();

  const updateConfig = async (newConfig: Partial<WebsiteConfig>) => {
    // If config is null, use newConfig as base
    if (!config) {
      const updatedConfig = newConfig as WebsiteConfig;
      setConfig(updatedConfig);
      return { success: true };
    }

    // If newConfig already has sections, use it directly (from updateSection)
    // Otherwise, do a deep merge
    let updatedConfig: WebsiteConfig;
    
    if (newConfig.sections) {
      // This is a full section update from updateSection
      updatedConfig = {
        ...config,
        ...newConfig,
        branding: { ...config.branding, ...newConfig.branding }
      };
    } else {
      // This is a partial update (like branding changes)
      updatedConfig = {
        ...config,
        ...newConfig,
        branding: { ...config.branding, ...newConfig.branding }
      };
    }
    
    // First save to database, then update state
    console.log('updateConfig: saving to database first', updatedConfig);
    
    setIsSaving(true);
    setSaveError(null);
    
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
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || `Failed to save: ${response.statusText}`);
        }
        
        // Only update state after successful database save
        console.log('Config saved to database successfully, updating state');
        setConfig(updatedConfig);
        
        // Dispatch event for real-time updates
        window.dispatchEvent(new CustomEvent('website-config-updated'));
        
        return { success: true };
      } catch (error) {
        console.error('Error saving config to database:', error);
        // Don't update state if save failed
        setSaveError(error instanceof Error ? error.message : 'Failed to save configuration');
        throw error;
      } finally {
        setIsSaving(false);
      }
    } else {
      // If no business, update state locally
      setConfig(updatedConfig);
      window.dispatchEvent(new CustomEvent('website-config-updated'));
      setIsSaving(false);
      return { success: true };
    }
  };

  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      
      try {
        let businessId = null;
        let businessName = null;
        
        // Try to get business from context first
        if (currentBusiness) {
          businessId = currentBusiness.id;
          businessName = currentBusiness.name;
        } else {
          // Fallback to localStorage
          if (typeof window !== 'undefined') {
            businessId = localStorage.getItem('currentBusinessId');
          }
        }

        // Load from database if we have a business ID
        if (businessId) {
          const { data: businessConfig, error } = await supabase
            .from('business_website_configs')
            .select('config')
            .eq('business_id', businessId)
            .single();

          if (!error && businessConfig) {
            // Ensure header section exists for existing configurations
            const configWithHeader = ensureHeaderSection(businessConfig.config);
            setConfig(configWithHeader);
            setIsLoading(false);
            return;
          } else if (error && error.code === 'PGRST116') {
            // Table doesn't exist (404), stay in loading state
            console.warn('business_website_configs table not found, no config to load');
          } else if (error) {
            console.warn('Database config fetch failed:', error);
          } else {
            // No error but no config found, stay in loading state
            console.log('No business config found for this business');
          }
        }

        // If no config found and we have a business, create default config with business name
        if (businessId) {
          // Try to get business name if we don't have it
          if (!businessName && typeof window !== 'undefined') {
            try {
              // For your specific business ID, use hardcoded name
              if (businessId === '879ec172-e1dd-475d-b57d-0033fae0b30e') {
                businessName = 'YOUR_BUSINESS_NAME_HERE'; // Replace with your actual business name
              } else {
                // Try to get actual business name
                const businessResponse = await fetch('/api/businesses');
                if (businessResponse.ok) {
                  const businessData = await businessResponse.json();
                  if (businessData.success && businessData.data && businessData.data.length > 0) {
                    // Find the current business
                    const currentBusiness = businessData.data.find((biz: any) => biz.id === businessId);
                    if (currentBusiness && currentBusiness.name) {
                      businessName = currentBusiness.name;
                    }
                  }
                }
                
                // If we still don't have business name, fall back to industry name
                if (!businessName) {
                  const response = await fetch(`/api/industries?business_id=${businessId}`);
                  if (response.ok) {
                    const data = await response.json();
                    if (data.industries && data.industries.length > 0) {
                      businessName = data.industries[0].name;
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error fetching business name:', error);
            }
          }
          
          const defaultConfigWithBusiness = getDefaultConfig(businessName || 'Cleaning Service');
          const configWithHeader = ensureHeaderSection(defaultConfigWithBusiness);
          setConfig(configWithHeader);
        }

        // Only set loading to false - config will be null if no business config found
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load config from database:', error);
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [currentBusiness]);

  useEffect(() => {
    // Listen for custom event (same-tab updates)
    const handleCustomEvent = () => {
      console.log('Custom event received, checking if updates are blocked');
      // Only reload if updates are not blocked
      if (!blockUpdates && currentBusiness) {
        console.log('Updates not blocked, reloading config from database');
        loadConfig();
      } else {
        console.log('Updates are blocked, ignoring reload');
      }
    };

    window.addEventListener('website-config-updated', handleCustomEvent);

    return () => {
      window.removeEventListener('website-config-updated', handleCustomEvent);
    };
  }, [currentBusiness, blockUpdates]);

  // Helper function to ensure header section exists
  const ensureHeaderSection = (config: WebsiteConfig): WebsiteConfig => {
    const hasHeader = config.sections.some(section => section.type === 'header');
    console.log('ensureHeaderSection - hasHeader:', hasHeader, 'sections count:', config.sections.length);
    
    if (!hasHeader) {
      console.log('Adding header section to existing config');
      return {
        ...config,
        sections: [
          {
            id: 'header',
            type: 'header',
            visible: true,
            data: {
              companyName: config.branding?.companyName || currentBusiness?.name || 'Your Business',
              logo: config.branding?.logo || '/images/orbit.png',
              showNavigation: true,
              navigationLinks: [
                { text: 'How It Works', url: '#how-it-works' },
                { text: 'Services', url: '#services' },
                { text: 'Reviews', url: '#reviews' },
                { text: 'Contact', url: '#contact' }
              ]
            }
          },
          ...config.sections
        ]
      };
    }
    return config;
  };

  // Helper function to reload config
  const loadConfig = async () => {
    if (currentBusiness) {
      console.log('Reloading config from database...');
      const { data: businessConfig, error } = await supabase
        .from('business_website_configs')
        .select('config')
        .eq('business_id', currentBusiness.id)
        .single();

      if (!error && businessConfig) {
        console.log('Config reloaded from database:', businessConfig.config);
        // Ensure header section exists for existing configurations
        const configWithHeader = ensureHeaderSection(businessConfig.config);
        setConfig(configWithHeader);
      } else if (error) {
        console.log('Error reloading config:', error);
      }
    }
  };

  return { 
    config, 
    isLoading, 
    isSaving,
    saveError,
    blockUpdates,
    setBlockUpdates,
    updateConfig 
  };
};

