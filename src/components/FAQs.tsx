'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { FAQ } from '@/components/admin/FAQsManager';

const FAQS_STORAGE_KEY = 'orbyt_faqs';

const DEFAULT_FAQS: FAQ[] = [
  {
    id: '1',
    question: 'How do I book an appointment?',
    answer: 'You can book an appointment by clicking the \'Book Now\' button on our homepage and following the simple booking process.',
    order: 1,
  },
  {
    id: '2',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, PayPal, and in some cases, cash on delivery. All online payments are processed securely.',
    order: 2,
  },
  {
    id: '3',
    question: 'Can I reschedule or cancel my appointment?',
    answer: 'Yes, you can reschedule or cancel your appointment up to 24 hours before your scheduled time through your account dashboard.',
    order: 3,
  },
  {
    id: '4',
    question: 'What are your working hours?',
    answer: 'Our customer support is available 24/7. Service hours vary by location and service type, which you can see during the booking process.',
    order: 4,
  },
  {
    id: '5',
    question: 'Do you offer recurring cleaning services?',
    answer: 'Yes, we offer weekly, bi-weekly, and monthly cleaning services. You can set up a recurring schedule during booking.',
    order: 5,
  },
];

interface FAQsProps {
  data?: {
    title?: string;
    subtitle?: string;
    faqs?: Array<{
      id: string;
      question: string;
      answer: string;
      order: number;
    }>;
  };
}

export default function FAQs({ data }: FAQsProps) {
  // Use FAQs from website builder data, fallback to defaults
  const faqs = data?.faqs || DEFAULT_FAQS;

  const title = data?.title || 'Frequently Asked Questions';
  const subtitle = data?.subtitle || 'Find answers to common questions about our services and booking process.';

  return (
    <section id="faqs" className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 border-2 border-primary/20">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <div className="inline-block px-6 py-2 bg-primary/10 rounded-full mb-4 border border-primary/20">
            <span className="text-primary font-semibold text-sm">HELP CENTER</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">{title}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="space-y-4 animate-scale-in">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={faq.id} 
                value={`item-${faq.id}`}
                className="border border-primary/20 rounded-xl mb-4 bg-card hover:bg-primary/5 transition-colors overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-4 flex-1 text-left">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <span className="text-primary font-semibold text-sm">{index + 1}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground pr-4">
                      {faq.question}
                    </h3>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-0">
                  <div className="pl-12 text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

