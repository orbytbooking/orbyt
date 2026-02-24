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
  RotateCcw,
  GripVertical
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

// Sortable block for Wix-style drag and drop
function SortableSectionBlock({
  section,
  isSelected,
  sectionIndex,
  totalSections,
  websiteConfig,
  onSelect,
  onMoveUp,
  onMoveDown,
  onSectionFieldChange,
  onSectionFieldHide,
  onSectionFieldShow,
}: {
  section: WebsiteSection;
  isSelected: boolean;
  sectionIndex: number;
  totalSections: number;
  websiteConfig: WebsiteConfig;
  onSelect: () => void;
  onMoveUp: (e: React.MouseEvent) => void;
  onMoveDown: (e: React.MouseEvent) => void;
  onSectionFieldChange?: (field: string, value: string) => void;
  onSectionFieldHide?: (field: string) => void;
  onSectionFieldShow?: (field: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group/block transition-all rounded-lg my-0.5 ${
        isDragging ? 'opacity-70 shadow-xl z-50 bg-white ring-2 ring-[#1a73e8]' : ''
      } ${isSelected ? 'ring-2 ring-[#1a73e8] ring-inset bg-[#e8f0fe]/40' : 'hover:ring-2 hover:ring-[#dadce0] hover:ring-inset'}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-drag-handle]')) return;
        if (target.closest('[contenteditable="true"]')) return;
        if (target.tagName === 'A' || target.closest('a') || target.tagName === 'BUTTON' || target.closest('button')) {
          e.preventDefault();
          e.stopPropagation();
        }
        onSelect();
      }}
    >
      {/* Block toolbar - visual builder style */}
      <div className="sticky top-0 z-40 flex items-center gap-2 px-3 py-2 bg-[#1a73e8] text-white text-xs font-medium rounded-t-lg shadow-sm">
        <div
          data-drag-handle
          className="p-1.5 rounded-md hover:bg-white/20 cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <span className="capitalize font-medium">{section.type.replace(/-/g, ' ')}</span>
        {!section.visible && <span className="opacity-90">(hidden)</span>}
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20 rounded-md" onClick={onMoveUp} disabled={sectionIndex === 0}>
          <MoveUp className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20 rounded-md" onClick={onMoveDown} disabled={sectionIndex === totalSections - 1}>
          <MoveDown className="h-3.5 w-3.5" />
        </Button>
      </div>
      {!section.visible && (
        <div className="py-4 px-4 bg-[#f8f9fa] border-b border-[#dadce0] text-xs text-[#5f6368]">
          Hidden — {section.type.replace(/-/g, ' ')}
        </div>
      )}
      {!isSelected && section.visible && (
        <div className="absolute left-2 top-12 z-30 opacity-0 group-hover/block:opacity-100 transition-opacity pointer-events-none">
          <span className="px-2 py-1 bg-[#202124] text-white text-xs rounded-md shadow">Drag handle to reorder · Click to edit</span>
        </div>
      )}
      {section.visible && (
        <div className="[&_a]:pointer-events-none [&_button]:pointer-events-none [&_a]:cursor-default [&_button]:cursor-default [&_a]:no-underline" onClickCapture={(e) => {
          const t = e.target as HTMLElement;
          if (t.closest('a') || t.closest('button')) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}>
          {section.type === 'header' && <div id="header"><Navigation branding={websiteConfig.branding} headerData={section.data} inline={true} /></div>}
          {section.type === 'hero' && <div id="hero"><Hero data={section.data} branding={websiteConfig.branding} builderMode onFieldChange={onSectionFieldChange} onFieldHide={onSectionFieldHide} onFieldShow={onSectionFieldShow} /></div>}
          {section.type === 'how-it-works' && <div id="how-it-works"><HowItWorks data={section.data} /></div>}
          {section.type === 'services' && <div id="services"><ServicesSection data={section.data} /></div>}
          {section.type === 'reviews' && <div id="reviews"><Reviews data={section.data} /></div>}
          {section.type === 'faqs' && <div id="faqs"><FAQs data={section.data} /></div>}
          {section.type === 'contact' && <div id="contact"><Contact data={section.data} /></div>}
          {section.type === 'footer' && <div id="footer"><Footer data={section.data} branding={websiteConfig.branding} headerData={websiteConfig.sections.find(s => s.type === 'header')?.data} /></div>}
        </div>
      )}
    </div>
  );
}

// Add-section zone between blocks (visual page builder style)
function AddSectionZone({ index, onAdd }: { index: number; onAdd: (index: number, type: WebsiteSection['type']) => void }) {
  const sectionTypes: { value: WebsiteSection['type']; label: string }[] = [
    { value: 'header', label: 'Header' },
    { value: 'hero', label: 'Hero' },
    { value: 'how-it-works', label: 'How it works' },
    { value: 'services', label: 'Services' },
    { value: 'reviews', label: 'Reviews' },
    { value: 'faqs', label: 'FAQs' },
    { value: 'contact', label: 'Contact' },
    { value: 'footer', label: 'Footer' },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className="flex items-center justify-center py-3 px-4 border-2 border-dashed border-[#dadce0] rounded-lg mx-2 my-1 bg-[#f8f9fa] hover:border-[#1a73e8] hover:bg-[#e8f0fe] transition-colors cursor-pointer group"
          onClick={(e) => e.stopPropagation()}
        >
          <Plus className="h-4 w-4 text-[#5f6368] group-hover:text-[#1a73e8] mr-2" />
          <span className="text-sm text-[#5f6368] group-hover:text-[#1a73e8]">Add section</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        {sectionTypes.map(({ value, label }) => (
          <DropdownMenuItem key={value} onClick={() => onAdd(index, value)}>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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

    const newSections = arrayMove(websiteConfig.sections, index, newIndex);
    const newConfig = { ...websiteConfig, sections: newSections };
    setWebsiteConfig(newConfig);
    addToHistory(newConfig);
  };

  // Drag-and-drop reorder (Wix-style)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = websiteConfig.sections.findIndex(s => s.id === active.id);
    const newIndex = websiteConfig.sections.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newSections = arrayMove(websiteConfig.sections, oldIndex, newIndex);
    const newConfig = { ...websiteConfig, sections: newSections };
    setWebsiteConfig(newConfig);
    addToHistory(newConfig);
  };

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

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
    addSectionAtIndex(websiteConfig.sections.length, type);
  };

  const addSectionAtIndex = (index: number, type: WebsiteSection['type']) => {
    const newSection: WebsiteSection = {
      id: `${type}-${Date.now()}`,
      type,
      visible: true,
      data: getDefaultSectionData(type),
    };
    const newSections = [...websiteConfig.sections];
    newSections.splice(index, 0, newSection);
    const newConfig = { ...websiteConfig, sections: newSections };
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
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#e8eaed]">
      {/* Visual Page Builder top bar */}
      <header className="flex-shrink-0 h-14 bg-white border-b border-[#dadce0] flex items-center justify-between px-4 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-[#f1f3f4]" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 text-[#5f6368]" />
          </Button>
          <div className="h-6 w-px bg-[#dadce0]" />
          <div>
            <h1 className="text-base font-medium text-[#202124]">Visual Page Builder</h1>
            <p className="text-xs text-[#5f6368]">{websiteConfig.branding.domain || 'Your page'}</p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-[#50575e]" onClick={undo} disabled={historyIndex === 0} title="Undo">
              <Undo className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-[#50575e]" onClick={redo} disabled={historyIndex === history.length - 1} title="Redo">
              <Redo className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-[#50575e] hover:bg-[#f0f0f1]" onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')} title={viewMode === 'desktop' ? 'Mobile view' : 'Desktop view'}>
            {viewMode === 'desktop' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-[#50575e] hover:bg-[#f0f0f1]" onClick={() => { const url = currentBusiness ? `/my-website?business=${currentBusiness.id}` : '/my-website'; window.open(url, '_blank'); }}>
            <Eye className="h-4 w-4 mr-1.5" />
            <span className="text-sm">Preview</span>
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2 border-[#c3c4c7] text-[#50575e] hover:bg-[#f6f7f7]" onClick={resetToDefault}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-sm">Reset</span>
          </Button>
          <Button size="sm" className="h-9 px-5 bg-[#1a73e8] hover:bg-[#1765cc] text-white text-sm font-medium rounded-lg shadow-sm" onClick={publishConfig}>
            Update
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Page sections */}
        <aside className="w-[260px] flex-shrink-0 bg-white border-r border-[#dadce0] overflow-y-auto shadow-sm">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-[#202124] mb-1">Page sections</h2>
            <p className="text-xs text-[#5f6368] mb-4">Click to select · Drag to reorder</p>
            <div className="space-y-1.5">
              {websiteConfig.sections.map((section, index) => (
                <div
                  key={section.id}
                  className={`rounded-lg border cursor-pointer transition-colors ${
                    selectedSection === section.id
                      ? 'border-[#1a73e8] bg-[#e8f0fe] shadow-sm'
                      : 'border-[#dadce0] bg-[#f8f9fa] hover:bg-white hover:border-[#1a73e8]/50'
                  }`}
                  onClick={() => {
                    setSelectedSection(section.id);
                    const sectionElement = document.getElementById(section.type === 'how-it-works' ? 'how-it-works' : section.type);
                    if (sectionElement) sectionElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                  }}
                >
                  <div className="flex items-center gap-2 p-2.5">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[#1d2327] capitalize block truncate">{section.type.replace(/-/g, ' ')}</span>
                      <span className="text-xs text-[#787c82]">{section.visible ? 'Visible' : 'Hidden'}</span>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-[#50575e]" onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'up'); }} disabled={index === 0}>
                        <MoveUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-[#50575e]" onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'down'); }} disabled={index === websiteConfig.sections.length - 1}>
                        <MoveDown className="h-3 w-3" />
                      </Button>
                      <label className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={section.visible} onChange={(e) => { e.stopPropagation(); toggleSectionVisibility(section.id); }} className="h-3.5 w-3.5 rounded border-[#8c8f94]" />
                      </label>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-[#b32d2e] hover:text-[#b32d2e] hover:bg-[#fcf0f0]" onClick={(e) => { e.stopPropagation(); if (confirm('Delete this section?')) deleteSection(section.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[#dadce0]">
              <Select onValueChange={(value) => addSection(value as WebsiteSection['type'])}>
                <SelectTrigger className="w-full h-9 bg-[#f8f9fa] border-[#dadce0] text-[#5f6368] rounded-lg hover:bg-[#e8eaed]">
                  <Plus className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Add section at end" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="header">Header</SelectItem>
                  <SelectItem value="hero">Hero</SelectItem>
                  <SelectItem value="how-it-works">How it works</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="reviews">Reviews</SelectItem>
                  <SelectItem value="faqs">FAQs</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="footer">Footer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </aside>

        {/* Main canvas - Visual page builder (full width) */}
        <main className="flex-1 overflow-y-auto bg-white flex flex-col" style={{ height: '100%' }}>
          <div className={`w-full flex-1 min-h-full ${viewMode === 'desktop' ? '' : 'max-w-[390px] mx-auto'}`}>
            <div className="min-h-full overflow-hidden">
              <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={websiteConfig.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {websiteConfig.sections.flatMap((section, i) => [
                    <AddSectionZone key={`add-${i}`} index={i} onAdd={addSectionAtIndex} />,
                    <SortableSectionBlock
                      key={section.id}
                      section={section}
                      isSelected={selectedSection === section.id}
                      sectionIndex={i}
                      totalSections={websiteConfig.sections.length}
                      websiteConfig={websiteConfig}
                      onSelect={() => setSelectedSection(section.id)}
                      onMoveUp={(e) => { e.stopPropagation(); moveSection(section.id, 'up'); }}
                      onMoveDown={(e) => { e.stopPropagation(); moveSection(section.id, 'down'); }}
                      onSectionFieldChange={(field, value) => updateSection(section.id, { [field]: value })}
                      onSectionFieldHide={(field) => updateSection(section.id, { hiddenFields: (section.data.hiddenFields || []).includes(field) ? section.data.hiddenFields : [...(section.data.hiddenFields || []), field] })}
                      onSectionFieldShow={(field) => updateSection(section.id, { hiddenFields: (section.data.hiddenFields || []).filter((f) => f !== field) })}
                    />,
                  ])}
                  <AddSectionZone key="add-end" index={websiteConfig.sections.length} onAdd={addSectionAtIndex} />
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </main>

        {/* Right sidebar - Block settings */}
        <aside className="w-[320px] flex-shrink-0 bg-white border-l border-[#dadce0] overflow-y-auto flex flex-col shadow-sm">
          <div className="sticky top-0 z-10 bg-white border-b border-[#dadce0] px-4 py-4">
            <h2 className="text-sm font-semibold text-[#202124]">
              {selectedSectionData ? selectedSectionData.type.replace(/-/g, ' ') : 'Block'}
            </h2>
            <p className="text-xs text-[#5f6368] mt-1">
              {selectedSectionData ? 'Edit content and settings' : 'Select a section to edit'}
            </p>
          </div>
          <div className="p-4">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-9 bg-[#f0f0f1] border border-[#c3c4c7] p-0.5 rounded">
                <TabsTrigger value="content" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded">
                  <Type className="h-3.5 w-3.5 mr-1" />
                  Block
                </TabsTrigger>
                <TabsTrigger value="design" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded">
                  <Palette className="h-3.5 w-3.5 mr-1" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded">
                  <Settings className="h-3.5 w-3.5 mr-1" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 mt-4 [&_label]:text-[#1d2327] [&_label]:text-sm [&_input]:border-[#8c8f94] [&_input]:rounded [&_.border]:border-[#c3c4c7]">
                {selectedSectionData && (
                  <>
                    {selectedSectionData.type === 'header' && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="block">Company Name</Label>
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
                {!selectedSectionData && (
                  <div className="text-center text-[#787c82] py-8 px-4">
                    <p className="text-sm">Select a section from the page or the list to edit its content.</p>
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
        </aside>
      </div>
    </div>
  );
}
