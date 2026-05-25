import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import styles from '../styles/ServicesSection.module.css';

const defaultServices = [
  {
    title: 'Residential Cleaning',
    description: 'Professional home cleaning services to keep your living space spotless and fresh.',
    features: ['Regular cleaning', 'Deep cleaning', 'Move-in/out cleaning', 'Custom services'],
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop'
  },
  {
    title: 'Commercial Cleaning',
    description: 'Maintain a clean and professional workspace with our commercial cleaning solutions.',
    features: ['Office cleaning', 'Retail spaces', 'Medical facilities', 'Industrial cleaning'],
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop'
  },
  {
    title: 'Specialty Services',
    description: 'Specialized cleaning services for your unique needs.',
    features: ['Carpet cleaning', 'Window washing', 'Upholstery cleaning', 'Disinfection'],
    image: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=600&h=400&fit=crop'
  },
  {
    title: 'Post-Construction Cleaning',
    description: 'Thorough cleaning after renovation or construction projects.',
    features: ['Dust removal', 'Debris cleanup', 'Surface polishing', 'Final touch-ups'],
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop'
  },
  {
    title: 'Green Eco-Friendly Cleaning',
    description: 'Environmentally safe cleaning using eco-friendly products and methods.',
    features: ['Non-toxic products', 'Sustainable practices', 'Safe for pets & kids', 'Allergen-free'],
    image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&h=400&fit=crop'
  },
  {
    title: 'Event Cleaning Services',
    description: 'Pre and post-event cleaning for parties, weddings, and corporate events.',
    features: ['Setup cleaning', 'During event support', 'Post-event cleanup', 'Waste management'],
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=400&fit=crop'
  },
  {
    title: 'Deep Cleaning Services',
    description: 'Comprehensive deep cleaning to restore your space to pristine condition.',
    features: ['Baseboard cleaning', 'Inside appliances', 'Behind furniture', 'Detailed sanitization'],
    image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=600&h=400&fit=crop'
  },
  {
    title: 'Window Cleaning',
    description: 'Crystal clear windows inside and out for a brighter, more inviting space.',
    features: ['Interior windows', 'Exterior windows', 'Window frames', 'Screen cleaning'],
    image: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=600&h=400&fit=crop'
  },
  {
    title: 'Carpet & Rug Cleaning',
    description: 'Professional carpet and rug cleaning to remove stains, odors, and allergens.',
    features: ['Steam cleaning', 'Stain removal', 'Odor elimination', 'Protective treatment'],
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop'
  },
  {
    title: 'Kitchen Deep Cleaning',
    description: 'Thorough kitchen cleaning including appliances, cabinets, and hard-to-reach areas.',
    features: ['Oven cleaning', 'Refrigerator cleaning', 'Cabinet cleaning', 'Exhaust fan cleaning'],
    image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=600&h=400&fit=crop'
  },
  {
    title: 'Bathroom Sanitization',
    description: 'Complete bathroom cleaning and sanitization for a hygienic environment.',
    features: ['Tile & grout cleaning', 'Shower deep clean', 'Toilet sanitization', 'Mirror polishing'],
    image: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=600&h=400&fit=crop'
  }
];

interface ServicesSectionProps {
  data?: {
    title?: string;
    subtitle?: string;
    services?: Array<{
      title: string;
      description: string;
      image: string;
      features?: string[];
    }>;
  };
}

const ServicesSection = ({ data }: ServicesSectionProps) => {
  const services = data?.services || defaultServices;
  const title = data?.title || 'Our Services';
  const subtitle = data?.subtitle || 'Professional cleaning services tailored to your needs';

  return (
    <section id="services" className={`py-16 bg-gray-50 relative ${styles.servicesSection}`}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        
        <div className={styles.servicesGrid}>
          {services.map((service, index) => (
            <div key={index} className={styles.serviceCard}>
              <div className={styles.serviceImageWrapper}>
                <img 
                  src={service.image} 
                  alt={service.title}
                  className={styles.serviceCardImage}
                  loading="lazy"
                />
              </div>
              <div className={styles.serviceCardContent}>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                {service.features && service.features.length > 0 && (
                  <ul className={styles.featuresList}>
                    {service.features.map((feature, i) => (
                      <li key={i}>
                        <CheckCircle2 className={styles.checkIcon} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
