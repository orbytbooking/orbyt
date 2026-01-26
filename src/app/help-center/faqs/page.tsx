'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, HelpCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import type { FAQ } from "@/components/admin/FAQsManager";

const FAQS_STORAGE_KEY = 'orbyt_faqs';

const DEFAULT_FAQS: FAQ[] = [
  {
    id: '1',
    question: "How do I book an appointment?",
    answer: "You can book an appointment by clicking the 'Book Now' button on our homepage and following the simple booking process.",
    order: 1,
  },
  {
    id: '2',
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, PayPal, and in some cases, cash on delivery. All online payments are processed securely.",
    order: 2,
  },
  {
    id: '3',
    question: "Can I reschedule or cancel my appointment?",
    answer: "Yes, you can reschedule or cancel your appointment up to 24 hours before your scheduled time through your account dashboard.",
    order: 3,
  },
  {
    id: '4',
    question: "What are your working hours?",
    answer: "Our customer support is available 24/7. Service hours vary by location and service type, which you can see during the booking process.",
    order: 4,
  },
  {
    id: '5',
    question: "Do you offer recurring cleaning services?",
    answer: "Yes, we offer weekly, bi-weekly, and monthly cleaning services. You can set up a recurring schedule during booking.",
    order: 5,
  },
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>(DEFAULT_FAQS);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(FAQS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sort by order
          const sorted = [...parsed].sort((a, b) => a.order - b.order);
          setFaqs(sorted);
          return;
        }
      }
    } catch (e) {
      console.error('Error loading FAQs:', e);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-gray-600">Find answers to common questions about our services and booking process.</p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-6 cursor-pointer">
                  <h3 className="text-lg font-medium text-gray-900">{faq.question}</h3>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-6 pb-6 -mt-2 text-gray-600">
                  {faq.answer}
                </div>
              </details>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Still have questions?</h3>
          <p className="mt-2 text-gray-600">Can't find the answer you're looking for? Our support team is here to help.</p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/contact-support" className="inline-flex items-center">
                Contact Support
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
