'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Save,
  Eye,
  Monitor,
  Smartphone,
  Palette,
  Type,
  Image as ImageIcon,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Settings,
  Undo,
  Redo,
  HelpCircle,
  Upload,
  X,
  Check,
  RotateCcw
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Navigation from '@/components/Navigation';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import ServicesSection from '@/components/ServicesSection';
import Reviews from '@/components/Reviews';
import FAQs from '@/components/FAQs';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import { useWebsiteConfig } from '@/hooks/useWebsiteConfig';
import { useBusiness } from '@/contexts/BusinessContext';
import { ImageUpload } from '@/components/admin/ImageUpload';

// Types
interface WebsiteSection {
  id: string;
  type: 'header' | 'hero' | 'services' | 'how-it-works' | 'reviews' | 'faqs' | 'contact' | 'footer';
  visible: boolean;
  data: any;
}

interface WebsiteConfig {
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

// Default sections - these will be updated with business name when used
const defaultSections: WebsiteSection[] = [
  {
    id: 'header',
    type: 'header',
    visible: true,
    data: {
      companyName: 'Your Business', // Will be replaced with actual business name
      logo: '/images/logo.png',
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
      serviceTag: "ORBYT #1 CLEANING SERVICE",
    }
  },
  {
    id: 'how-it-works',
    type: 'how-it-works',
    visible: true,
    data: {
      title: 'How It Works',
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
      subtitle: 'Find answers to common questions about our services and booking process.'
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
      companyName: 'Your Business', // Will be replaced with actual business name
      description: 'Professional services you can trust. Experience the difference with our expert team.',
      email: 'info@orbyt.com',
      phone: '+1 234 567 8900',
      copyright: '© 2024 Your Business. All rights reserved.', // Will be replaced with actual business name
      socialLinks: {
        facebook: '#',
        twitter: '#',
        instagram: '#',
        linkedin: '#'
      },
      quickLinks: [
        { text: 'About Us', url: '#about' },
        { text: 'Services', url: '#services' },
        { text: 'Contact', url: '#contact' },
        { text: 'Privacy Policy', url: '/privacy-policy' }
      ]
    }
  },
];

// Templates
const templates = [
  {
    id: 'modern',
    name: 'Modern',
    preview: '/images/hero-background-chicago.png',
    description: 'Clean and contemporary design'
  },
  {
    id: 'classic',
    name: 'Classic',
    preview: '/images/hero-background-chicago.png',
    description: 'Traditional and professional'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    preview: '/images/hero-background-chicago.png',
    description: 'Simple and elegant'
  },
];

export default function WebsiteBuilderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { config, updateConfig, isLoading } = useWebsiteConfig(); // Get config from hook
  const { currentBusiness } = useBusiness(); // Get current business
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [websiteConfig, setWebsiteConfig] = useState<WebsiteConfig | null>(null);
  const [history, setHistory] = useState<WebsiteConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Sync local state with hook config
  useEffect(() => {
    if (!isLoading && config) {
      setWebsiteConfig(config);
      setHistory([config]);
      setHistoryIndex(0);
    }
  }, [config, isLoading]);

  // Save config
  const saveConfig = async () => {
    try {
      // Update config using the hook (which now saves to database)
      updateConfig(websiteConfig);
      
      toast({
        title: 'Website saved successfully',
        description: 'Your website configuration has been saved to the database.',
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save failed',
        description: 'There was an error saving your website. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Publish config
  const publishConfig = () => {
    // Save to database using the hook
    updateConfig(websiteConfig);
    // Dispatch custom event to update landing page immediately
    window.dispatchEvent(new CustomEvent('website-config-updated'));
    toast({
      title: 'Published!',
      description: 'Your website has been published and is now live.',
    });
  };

  // Update section
  const updateSection = (sectionId: string, updates: any) => {
    const newConfig = {
      ...websiteConfig,
      sections: websiteConfig.sections.map(s =>
        s.id === sectionId ? { ...s, data: { ...s.data, ...updates } } : s
      ),
    };

    // If updating header logo, also update global branding for real-time sync
    if (sectionId === 'header' && updates.logo !== undefined) {
      newConfig.branding = {
        ...newConfig.branding,
        logo: updates.logo
      };
    }

    setWebsiteConfig(newConfig);
    addToHistory(newConfig);
    
    // Save to database for real-time updates
    updateConfig(newConfig);
  };

  // Toggle section visibility
  const toggleSectionVisibility = (sectionId: string) => {
    const newConfig = {
      ...websiteConfig,
      sections: websiteConfig.sections.map(s =>
        s.id === sectionId ? { ...s, visible: !s.visible } : s
      ),
    };
    setWebsiteConfig(newConfig);
    addToHistory(newConfig);
  };

  // Move section
  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const index = websiteConfig.sections.findIndex(s => s.id === sectionId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= websiteConfig.sections.length) return;

    const newSections = [...websiteConfig.sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    
    const newConfig = { ...websiteConfig, sections: newSections };
    setWebsiteConfig(newConfig);
    addToHistory(newConfig);
  };

  // Delete section
  const deleteSection = (sectionId: string) => {
    const newConfig = {
      ...websiteConfig,
      sections: websiteConfig.sections.filter(s => s.id !== sectionId),
    };
    setWebsiteConfig(newConfig);
    addToHistory(newConfig);
    if (selectedSection === sectionId) {
      setSelectedSection(null);
    }
  };

  // Reset to default
  const resetToDefault = () => {
    const businessName = currentBusiness?.name || 'Your Business';
    const defaultConfig = {
      sections: defaultSections.map(section => ({
        ...section,
        data: {
          ...section.data,
          companyName: section.data.companyName ? businessName : section.data.companyName,
          ...(section.type === 'footer' && {
            copyright: `© 2024 ${businessName}. All rights reserved.`
          })
        }
      })),
      branding: {
        primaryColor: '#00D4E8',
        secondaryColor: '#00BCD4',
        logo: '/images/orbit.png',
        companyName: businessName,
        domain: `${businessName.toLowerCase().replace(/\s+/g, '')}.orbyt.com`,
      },
      template: 'modern',
    };
    setWebsiteConfig(defaultConfig);
    addToHistory(defaultConfig);
    toast({
      title: 'Reset to Default',
      description: 'Website has been reset to default configuration.',
    });
  };

  // Add new section
  const addSection = (type: WebsiteSection['type']) => {
    const newSection: WebsiteSection = {
      id: `${type}-${Date.now()}`,
      type,
      visible: true,
      data: getDefaultSectionData(type),
    };
    const newConfig = {
      ...websiteConfig,
      sections: [...websiteConfig.sections, newSection],
    };
    setWebsiteConfig(newConfig);
    addToHistory(newConfig);
    setSelectedSection(newSection.id);
  };

  // Get default data for section type
  const getDefaultSectionData = (type: WebsiteSection['type']): any => {
    const businessName = currentBusiness?.name || 'Your Business';
    
    switch (type) {
      case 'header':
        return {
          companyName: businessName,
          logo: '/images/logo.png',
          showNavigation: true,
          navigationLinks: [
            { text: 'How It Works', url: '#how-it-works' },
            { text: 'Services', url: '#services' },
            { text: 'Reviews', url: '#reviews' },
            { text: 'Contact', url: '#contact' }
          ]
        };
      case 'hero':
        return {
          title: 'Welcome to Our Service',
          subtitle: 'Your Trusted Partner',
          description: 'Experience the best service with our professional team.',
          backgroundImage: '/images/hero-background-chicago.png',
          button1Text: 'Get Started',
          button1Link: '/book-now',
          button2Text: 'Learn More',
          button2Link: '#about',
        };
      case 'services':
        return {
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
          ],
        };
      case 'how-it-works':
        return {
          title: 'How It Works',
          steps: [
            { title: 'Step 1', description: 'Description', image: '/images/book-appointment.jpg' },
            { title: 'Step 2', description: 'Description', image: '/images/get-confirmation.jpg' },
            { title: 'Step 3', description: 'Description', image: '/images/relax-sit-done.jpg' },
          ],
        };
      case 'reviews':
        return {
          title: 'What Our Customers Say',
          reviews: [],
        };
      case 'faqs':
        return {
          title: 'Frequently Asked Questions',
          subtitle: 'Find answers to common questions about our services and booking process.',
        };
      case 'contact':
        return {
          title: 'Contact Us',
          email: 'info@example.com',
          phone: '+1 234 567 8900',
          address: '123 Main St, City, State 12345',
        };
      case 'footer':
        return {
          companyName: businessName,
          description: 'Professional services you can trust. Experience the difference with our expert team.',
          email: 'info@example.com',
          phone: '+1 234 567 8900',
          copyright: `© 2024 ${businessName}. All rights reserved.`,
          socialLinks: {
            facebook: '#',
            twitter: '#',
            instagram: '#',
            linkedin: '#'
          },
          quickLinks: [
            { text: 'About Us', url: '#about' },
            { text: 'Services', url: '#services' },
            { text: 'Contact', url: '#contact' },
            { text: 'Privacy Policy', url: '/privacy-policy' }
          ]
        };
      default:
        return {};
    }
  };

  // History management
  const addToHistory = (config: WebsiteConfig) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(config);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setWebsiteConfig(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setWebsiteConfig(history[historyIndex + 1]);
    }
  };

  const selectedSectionData = websiteConfig?.sections.find(s => s.id === selectedSection);

  if (isLoading || !websiteConfig) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading website builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="flex-shrink-0 bg-white border-b shadow-sm z-50">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">OB</span>
              </div>
              <span className="font-semibold">Website Builder</span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex === 0}>
                <Undo className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={redo} disabled={historyIndex === history.length - 1}>
                <Redo className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')}
            >
              {viewMode === 'desktop' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = currentBusiness
                  ? `/my-website?business=${currentBusiness.id}`
                  : '/my-website';
                window.open(url, '_blank');
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button variant="ghost" size="sm" onClick={saveConfig}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button size="sm" onClick={publishConfig}>
              <Save className="h-4 w-4 mr-2" />
              Save & Publish
            </Button>
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Domain Bar */}
      <div className="flex-shrink-0 bg-gray-100 border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">https://</span>
          <span className="text-sm font-medium">{websiteConfig.branding.domain}</span>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs">
            Change Your Domain
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs">
            Duplicate Page
          </Button>
          <Button variant="ghost" size="sm" className="text-xs">
            Settings
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Sections */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Sections</h3>
            <div className="space-y-2">
              {websiteConfig.sections.map((section, index) => (
                <div
                  key={section.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedSection === section.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => {
                  setSelectedSection(section.id);
                  // Jump directly to section without smooth scrolling
                  const sectionElement = document.getElementById(section.type === 'how-it-works' ? 'how-it-works' : section.type);
                  if (sectionElement) {
                    sectionElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                  }
                }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">{section.type.replace('-', ' ')}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSection(section.id, 'up');
                        }}
                        disabled={index === 0}
                      >
                        <MoveUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSection(section.id, 'down');
                        }}
                        disabled={index === websiteConfig.sections.length - 1}
                      >
                        <MoveDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={section.visible}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSectionVisibility(section.id);
                        }}
                        className="h-3 w-3"
                      />
                      Visible
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this section?')) {
                          deleteSection(section.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Select
              onValueChange={(value) => {
                addSection(value as WebsiteSection['type']);
              }}
            >
              <SelectTrigger className="w-full mt-4">
                <SelectValue placeholder="Add Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="header">Header</SelectItem>
                <SelectItem value="hero">Hero Section</SelectItem>
                <SelectItem value="how-it-works">How It Works</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="reviews">Reviews</SelectItem>
                <SelectItem value="faqs">FAQs</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
                <SelectItem value="footer">Footer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 overflow-y-auto bg-gray-100" style={{ height: '100%' }}>
          <div className={`${viewMode === 'desktop' ? 'w-full' : 'max-w-md mx-auto'}`}>
            {/* Preview of website - Using actual components */}
            <div className="bg-white min-h-screen">
              {/* Render sections using actual components */}
              {websiteConfig.sections.filter(s => s.visible).map((section) => {
                const isSelected = selectedSection === section.id;
                return (
                  <div
                    key={section.id}
                    className={`relative group ${
                      isSelected ? 'ring-4 ring-primary ring-offset-2' : 'hover:ring-2 hover:ring-primary/50'
                    } transition-all cursor-pointer`}
                    onClick={(e) => {
                      // Prevent navigation when clicking to select
                      const target = e.target as HTMLElement;
                      if (target.tagName === 'A' || target.closest('a') || target.tagName === 'BUTTON' || target.closest('button')) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                      setSelectedSection(section.id);
                    }}
                  >
                    {section.type === 'header' && (
                      <div id="header">
                        <Navigation branding={websiteConfig.branding} headerData={section.data} inline={true} />
                      </div>
                    )}
                    {section.type === 'hero' && (
                      <div id="hero"><Hero data={section.data} branding={websiteConfig.branding} /></div>
                    )}
                    {section.type === 'how-it-works' && (
                      <div id="how-it-works"><HowItWorks data={section.data} /></div>
                    )}
                    {section.type === 'services' && (
                      <div id="services"><ServicesSection data={section.data} /></div>
                    )}
                    {section.type === 'reviews' && (
                      <div id="reviews"><Reviews data={section.data} /></div>
                    )}
                    {section.type === 'faqs' && (
                      <div id="faqs"><FAQs data={section.data} /></div>
                    )}
                    {section.type === 'contact' && (
                      <div id="contact"><Contact data={section.data} /></div>
                    )}
                    {section.type === 'footer' && (
                      <div id="footer">
                        <Footer data={section.data} branding={websiteConfig.branding} headerData={websiteConfig.sections.find(s => s.type === 'header')?.data} />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 left-2 bg-primary text-white px-3 py-1.5 rounded-md text-xs font-semibold z-50 shadow-lg pointer-events-none">
                        Editing: {section.type.replace('-', ' ')}
                      </div>
                    )}
                    {!isSelected && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/50 text-white px-2 py-1 rounded text-xs transition-opacity pointer-events-none">
                        Click to edit
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties Panel */}
        <div className="w-80 bg-white border-l overflow-y-auto">
          <div className="p-4">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">
                  <Type className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="design">
                  <Palette className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 mt-4">
                {selectedSectionData && (
                  <>
                    {selectedSectionData.type === 'header' && (
                      <>
                        <div>
                          <Label>Company Name</Label>
                          <Input
                            value={selectedSectionData.data.companyName || ''}
                            onChange={(e) => updateSection(selectedSection, { companyName: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Header Logo</Label>
                          <ImageUpload
                            onImageUpload={(url) => updateSection(selectedSection, { logo: url })}
                            onImageDelete={() => updateSection(selectedSection, { logo: '' })}
                            currentImage={selectedSectionData.data.logo}
                            type="logo"
                            maxSize={2}
                          />
                        </div>
                        <div>
                          <Label>Show Navigation</Label>
                          <select
                            value={selectedSectionData.data.showNavigation ? 'true' : 'false'}
                            onChange={(e) => updateSection(selectedSection, { showNavigation: e.target.value === 'true' })}
                            className="w-full p-2 border rounded"
                          >
                            <option value="true">Show</option>
                            <option value="false">Hide</option>
                          </select>
                        </div>
                        <div>
                          <Label>Navigation Links</Label>
                          <div className="space-y-2">
                            {selectedSectionData.data.navigationLinks?.map((link: any, index: number) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  value={link.text || ''}
                                  onChange={(e) => {
                                    const newLinks = [...selectedSectionData.data.navigationLinks];
                                    newLinks[index] = { ...link, text: e.target.value };
                                    updateSection(selectedSection, { navigationLinks: newLinks });
                                  }}
                                  placeholder="Link text"
                                  className="flex-1"
                                />
                                <Input
                                  value={link.url || ''}
                                  onChange={(e) => {
                                    const newLinks = [...selectedSectionData.data.navigationLinks];
                                    newLinks[index] = { ...link, url: e.target.value };
                                    updateSection(selectedSection, { navigationLinks: newLinks });
                                  }}
                                  placeholder="URL"
                                  className="flex-1"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {selectedSectionData.type === 'hero' && (
                      <>
                        <div>
                          <Label>Title</Label>
                          <Input
                            value={selectedSectionData.data.title}
                            onChange={(e) => updateSection(selectedSection, { title: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Subtitle</Label>
                          <Input
                            value={selectedSectionData.data.subtitle}
                            onChange={(e) => updateSection(selectedSection, { subtitle: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={selectedSectionData.data.description}
                            onChange={(e) => updateSection(selectedSection, { description: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Service Tag</Label>
                          <Input
                            value={selectedSectionData.data.serviceTag}
                            onChange={(e) => updateSection(selectedSection, { serviceTag: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Background Image</Label>
                          <ImageUpload
                            onImageUpload={(url) => updateSection(selectedSection, { backgroundImage: url })}
                            onImageDelete={() => updateSection(selectedSection, { backgroundImage: '' })}
                            currentImage={selectedSectionData.data.backgroundImage}
                            type="hero"
                            maxSize={5}
                          />
                        </div>
                        <div>
                          <Label>Button 1 Text</Label>
                          <Input
                            value={selectedSectionData.data.button1Text}
                            onChange={(e) => updateSection(selectedSection, { button1Text: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Button 1 Link</Label>
                          <Input
                            value={selectedSectionData.data.button1Link}
                            onChange={(e) => updateSection(selectedSection, { button1Link: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Button 2 Text</Label>
                          <Input
                            value={selectedSectionData.data.button2Text}
                            onChange={(e) => updateSection(selectedSection, { button2Text: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Button 2 Link</Label>
                          <Input
                            value={selectedSectionData.data.button2Link}
                            onChange={(e) => updateSection(selectedSection, { button2Link: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                    {selectedSectionData.type === 'services' && (
                      <>
                        <div>
                          <Label>Title</Label>
                          <Input
                            value={selectedSectionData.data.title}
                            onChange={(e) => updateSection(selectedSection, { title: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Subtitle</Label>
                          <Input
                            value={selectedSectionData.data.subtitle}
                            onChange={(e) => updateSection(selectedSection, { subtitle: e.target.value })}
                          />
                        </div>
                        <div className="space-y-4 mt-4">
                          <div className="flex items-center justify-between">
                            <Label>Services</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newServices = [...(selectedSectionData.data.services || [])];
                                newServices.push({
                                  title: 'New Service',
                                  description: 'Service description',
                                  image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop',
                                  features: []
                                });
                                updateSection(selectedSection, { services: newServices });
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </div>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {selectedSectionData.data.services?.map((service: any, index: number) => (
                              <div key={index} className="border rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-semibold">Service {index + 1}</Label>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-500"
                                    onClick={() => {
                                      const newServices = selectedSectionData.data.services.filter((_: any, i: number) => i !== index);
                                      updateSection(selectedSection, { services: newServices });
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div>
                                  <Label className="text-xs">Title</Label>
                                  <Input
                                    value={service.title}
                                    onChange={(e) => {
                                      const newServices = [...selectedSectionData.data.services];
                                      newServices[index] = { ...service, title: e.target.value };
                                      updateSection(selectedSection, { services: newServices });
                                    }}
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Description</Label>
                                  <Textarea
                                    value={service.description}
                                    onChange={(e) => {
                                      const newServices = [...selectedSectionData.data.services];
                                      newServices[index] = { ...service, description: e.target.value };
                                      updateSection(selectedSection, { services: newServices });
                                    }}
                                    className="text-sm"
                                    rows={2}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Service Image</Label>
                                  <ImageUpload
                                    onImageUpload={(url) => {
                                      const newServices = [...selectedSectionData.data.services];
                                      newServices[index] = { ...service, image: url };
                                      updateSection(selectedSection, { services: newServices });
                                    }}
                                    onImageDelete={() => {
                                      const newServices = [...selectedSectionData.data.services];
                                      newServices[index] = { ...service, image: '' };
                                      updateSection(selectedSection, { services: newServices });
                                    }}
                                    currentImage={service.image}
                                    type="section"
                                    maxSize={3}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Features (comma-separated)</Label>
                                  <Input
                                    value={service.features?.join(', ') || ''}
                                    onChange={(e) => {
                                      const features = e.target.value.split(',').map(f => f.trim()).filter(f => f);
                                      const newServices = [...selectedSectionData.data.services];
                                      newServices[index] = { ...service, features };
                                      updateSection(selectedSection, { services: newServices });
                                    }}
                                    className="text-sm"
                                    placeholder="Feature 1, Feature 2, Feature 3"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {selectedSectionData.type === 'how-it-works' && (
                      <>
                        <div>
                          <Label>Title</Label>
                          <Input
                            value={selectedSectionData.data.title}
                            onChange={(e) => updateSection(selectedSection, { title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-4 mt-4">
                          <Label>Steps</Label>
                          {selectedSectionData.data.steps?.map((step: any, index: number) => (
                            <div key={index} className="border rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">Step {index + 1}</Label>
                              </div>
                              <div>
                                <Label className="text-xs">Title</Label>
                                <Input
                                  value={step.title}
                                  onChange={(e) => {
                                    const newSteps = [...selectedSectionData.data.steps];
                                    newSteps[index] = { ...step, title: e.target.value };
                                    updateSection(selectedSection, { steps: newSteps });
                                  }}
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Description</Label>
                                <Textarea
                                  value={step.description}
                                  onChange={(e) => {
                                    const newSteps = [...selectedSectionData.data.steps];
                                    newSteps[index] = { ...step, description: e.target.value };
                                    updateSection(selectedSection, { steps: newSteps });
                                  }}
                                  className="text-sm"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Step Image</Label>
                                <ImageUpload
                                  onImageUpload={(url) => {
                                    const newSteps = [...selectedSectionData.data.steps];
                                    newSteps[index] = { ...step, image: url };
                                    updateSection(selectedSection, { steps: newSteps });
                                  }}
                                  onImageDelete={() => {
                                    const newSteps = [...selectedSectionData.data.steps];
                                    newSteps[index] = { ...step, image: '' };
                                    updateSection(selectedSection, { steps: newSteps });
                                  }}
                                  currentImage={step.image}
                                  type="section"
                                  maxSize={3}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {selectedSectionData.type === 'faqs' && (
                      <>
                        <div>
                          <Label>Title</Label>
                          <Input
                            value={selectedSectionData.data.title || 'Frequently Asked Questions'}
                            onChange={(e) => updateSection(selectedSection, { title: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Subtitle</Label>
                          <Textarea
                            value={selectedSectionData.data.subtitle || 'Find answers to common questions about our services and booking process.'}
                            onChange={(e) => updateSection(selectedSection, { subtitle: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            FAQs are managed in the <strong>Settings → Design → FAQs</strong> tab. 
                            The FAQs you add there will automatically appear in this section.
                          </p>
                        </div>
                      </>
                    )}
                    {selectedSectionData.type === 'contact' && (
                      <>
                        <div>
                          <Label>Title</Label>
                          <Input
                            value={selectedSectionData.data.title}
                            onChange={(e) => updateSection(selectedSection, { title: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            value={selectedSectionData.data.email}
                            onChange={(e) => updateSection(selectedSection, { email: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input
                            value={selectedSectionData.data.phone}
                            onChange={(e) => updateSection(selectedSection, { phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Address</Label>
                          <Textarea
                            value={selectedSectionData.data.address}
                            onChange={(e) => updateSection(selectedSection, { address: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                    {selectedSectionData.type === 'footer' && (
                      <>
                        <div>
                          <Label>Company Name</Label>
                          <Input
                            value={selectedSectionData.data.companyName || ''}
                            onChange={(e) => updateSection(selectedSection, { companyName: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={selectedSectionData.data.description || ''}
                            onChange={(e) => updateSection(selectedSection, { description: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            value={selectedSectionData.data.email || ''}
                            onChange={(e) => updateSection(selectedSection, { email: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input
                            value={selectedSectionData.data.phone || ''}
                            onChange={(e) => updateSection(selectedSection, { phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Copyright</Label>
                          <Input
                            value={selectedSectionData.data.copyright || ''}
                            onChange={(e) => updateSection(selectedSection, { copyright: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Social Links</Label>
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Label className="w-20">Facebook</Label>
                              <Input
                                value={selectedSectionData.data.socialLinks?.facebook || ''}
                                onChange={(e) => updateSection(selectedSection, { 
                                  socialLinks: { 
                                    ...selectedSectionData.data.socialLinks, 
                                    facebook: e.target.value 
                                  } 
                                })}
                                placeholder="https://facebook.com/..."
                              />
                            </div>
                            <div className="flex gap-2">
                              <Label className="w-20">Twitter</Label>
                              <Input
                                value={selectedSectionData.data.socialLinks?.twitter || ''}
                                onChange={(e) => updateSection(selectedSection, { 
                                  socialLinks: { 
                                    ...selectedSectionData.data.socialLinks, 
                                    twitter: e.target.value 
                                  } 
                                })}
                                placeholder="https://twitter.com/..."
                              />
                            </div>
                            <div className="flex gap-2">
                              <Label className="w-20">Instagram</Label>
                              <Input
                                value={selectedSectionData.data.socialLinks?.instagram || ''}
                                onChange={(e) => updateSection(selectedSection, { 
                                  socialLinks: { 
                                    ...selectedSectionData.data.socialLinks, 
                                    instagram: e.target.value 
                                  } 
                                })}
                                placeholder="https://instagram.com/..."
                              />
                            </div>
                            <div className="flex gap-2">
                              <Label className="w-20">LinkedIn</Label>
                              <Input
                                value={selectedSectionData.data.socialLinks?.linkedin || ''}
                                onChange={(e) => updateSection(selectedSection, { 
                                  socialLinks: { 
                                    ...selectedSectionData.data.socialLinks, 
                                    linkedin: e.target.value 
                                  } 
                                })}
                                placeholder="https://linkedin.com/..."
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label>Quick Links</Label>
                          <div className="space-y-2">
                            {selectedSectionData.data.quickLinks?.map((link: any, index: number) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  value={link.text || ''}
                                  onChange={(e) => {
                                    const newLinks = [...selectedSectionData.data.quickLinks];
                                    newLinks[index] = { ...link, text: e.target.value };
                                    updateSection(selectedSection, { quickLinks: newLinks });
                                  }}
                                  placeholder="Link text"
                                  className="flex-1"
                                />
                                <Input
                                  value={link.url || ''}
                                  onChange={(e) => {
                                    const newLinks = [...selectedSectionData.data.quickLinks];
                                    newLinks[index] = { ...link, url: e.target.value };
                                    updateSection(selectedSection, { quickLinks: newLinks });
                                  }}
                                  placeholder="URL"
                                  className="flex-1"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
                {!selectedSection && (
                  <div className="text-center text-gray-500 py-8">
                    <p>Select a section to edit</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="design" className="space-y-4 mt-4">
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={websiteConfig.branding.primaryColor}
                      onChange={(e) => {
                        const newConfig = {
                          ...websiteConfig,
                          branding: { ...websiteConfig.branding, primaryColor: e.target.value },
                        };
                        setWebsiteConfig(newConfig);
                        addToHistory(newConfig);
                      }}
                      className="w-16 h-10"
                    />
                    <Input
                      value={websiteConfig.branding.primaryColor}
                      onChange={(e) => {
                        const newConfig = {
                          ...websiteConfig,
                          branding: { ...websiteConfig.branding, primaryColor: e.target.value },
                        };
                        setWebsiteConfig(newConfig);
                        addToHistory(newConfig);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={websiteConfig.branding.secondaryColor}
                      onChange={(e) => {
                        const newConfig = {
                          ...websiteConfig,
                          branding: { ...websiteConfig.branding, secondaryColor: e.target.value },
                        };
                        setWebsiteConfig(newConfig);
                        addToHistory(newConfig);
                      }}
                      className="w-16 h-10"
                    />
                    <Input
                      value={websiteConfig.branding.secondaryColor}
                      onChange={(e) => {
                        const newConfig = {
                          ...websiteConfig,
                          branding: { ...websiteConfig.branding, secondaryColor: e.target.value },
                        };
                        setWebsiteConfig(newConfig);
                        addToHistory(newConfig);
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div>
                  <Label>Template</Label>
                  <Select
                    value={websiteConfig.template}
                    onValueChange={(value) => {
                      const newConfig = { ...websiteConfig, template: value };
                      setWebsiteConfig(newConfig);
                      addToHistory(newConfig);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
