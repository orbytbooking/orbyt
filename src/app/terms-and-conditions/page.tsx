"use client";

import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, Shield, AlertCircle, Scale, UserCheck, Ban } from "lucide-react";

const TermsAndConditions = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-16 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              Terms & Conditions
            </h1>
            <p className="text-muted-foreground text-lg">
              Last Updated: November 6, 2024
            </p>
          </div>

          {/* Content */}
          <div className="bg-card rounded-lg shadow-lg border p-8 md:p-12">
            <div className="prose prose-slate dark:prose-invert max-w-none">
              
              {/* Introduction */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Scale className="w-6 h-6 text-primary" />
                  1. Agreement to Terms
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Welcome to Orbyt Cleaners. By accessing our website and using our services, 
                  you agree to be bound by these Terms and Conditions. Please read them carefully. 
                  If you do not agree with any part of these terms, you may not use our services.
                </p>
              </section>

              <Separator className="my-8" />

              {/* Services */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-primary" />
                  2. Services Provided
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Orbyt Cleaners provides professional cleaning services including but not limited to:
                </p>
                <ul className="space-y-2 text-muted-foreground ml-6">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Standard residential and commercial cleaning</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Deep cleaning services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Move-in/move-out cleaning</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Carpet cleaning and specialized services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Custom cleaning packages</span>
                  </li>
                </ul>
              </section>

              <Separator className="my-8" />

              {/* Booking and Payment */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-primary" />
                  3. Booking and Payment Terms
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">3.1 Booking Process</h3>
                    <p className="leading-relaxed">
                      All bookings must be made through our website or by contacting our customer service. 
                      A booking is confirmed only after you receive a confirmation email from us.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">3.2 Payment Methods</h3>
                    <p className="leading-relaxed">
                      We accept payment via credit/debit cards and cash upon service completion. 
                      Online payments are processed securely through our payment gateway.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">3.3 Pricing</h3>
                    <p className="leading-relaxed">
                      All prices are quoted in USD and include applicable taxes. Prices may vary based 
                      on the size of the property, specific requirements, and additional services requested.
                    </p>
                  </div>
                </div>
              </section>

              <Separator className="my-8" />

              {/* Cancellation Policy */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Ban className="w-6 h-6 text-primary" />
                  4. Cancellation and Rescheduling
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">4.1 Customer Cancellation</h3>
                    <p className="leading-relaxed">
                      You may cancel or reschedule your booking up to 24 hours before the scheduled 
                      service time without any penalty. Cancellations made less than 24 hours before 
                      the scheduled time may incur a cancellation fee of 50% of the service cost.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">4.2 Company Cancellation</h3>
                    <p className="leading-relaxed">
                      We reserve the right to cancel or reschedule services due to unforeseen circumstances, 
                      including but not limited to severe weather, staff illness, or emergencies. In such cases, 
                      we will notify you as soon as possible and offer alternative arrangements.
                    </p>
                  </div>
                </div>
              </section>

              <Separator className="my-8" />

              {/* Customer Responsibilities */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-primary" />
                  5. Customer Responsibilities
                </h2>
                <div className="space-y-3 text-muted-foreground">
                  <p className="leading-relaxed">As a customer, you agree to:</p>
                  <ul className="space-y-2 ml-6">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Provide accurate information during booking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Ensure safe access to the property at the scheduled time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Secure or remove valuable and fragile items before service</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Inform us of any pets, hazards, or special requirements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Provide necessary cleaning supplies if requested</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Notify us immediately of any issues or concerns during service</span>
                    </li>
                  </ul>
                </div>
              </section>

              <Separator className="my-8" />

              {/* Liability */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">6. Liability and Insurance</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p className="leading-relaxed">
                    Orbyt Cleaners is fully insured and bonded. We take utmost care in providing 
                    our services, but we are not liable for:
                  </p>
                  <ul className="space-y-2 ml-6">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Pre-existing damage to property or items</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Damage to items not properly secured or disclosed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Loss or damage to cash, jewelry, or valuables</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Damage resulting from hidden defects or faulty installations</span>
                    </li>
                  </ul>
                  <p className="leading-relaxed mt-4">
                    Any claims for damage must be reported within 24 hours of service completion.
                  </p>
                </div>
              </section>

              <Separator className="my-8" />

              {/* Satisfaction Guarantee */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">7. Satisfaction Guarantee</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We stand behind the quality of our work. If you are not satisfied with our service, 
                  please contact us within 24 hours, and we will arrange to re-clean the areas of concern 
                  at no additional charge. This guarantee applies only to the initial cleaning and does not 
                  cover subsequent visits or maintenance cleanings.
                </p>
              </section>

              <Separator className="my-8" />

              {/* Intellectual Property */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">8. Intellectual Property</h2>
                <p className="text-muted-foreground leading-relaxed">
                  All content on this website, including text, graphics, logos, images, and software, 
                  is the property of Orbyt Cleaners and is protected by copyright and trademark laws. 
                  You may not reproduce, distribute, or use any content without our express written permission.
                </p>
              </section>

              <Separator className="my-8" />

              {/* Privacy */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">9. Privacy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Your privacy is important to us. Please review our{" "}
                  <a href="/privacy-policy" className="text-primary hover:underline font-medium">
                    Privacy Policy
                  </a>{" "}
                  to understand how we collect, use, and protect your personal information.
                </p>
              </section>

              <Separator className="my-8" />

              {/* Modifications */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">10. Modifications to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these Terms and Conditions at any time. Changes will be 
                  effective immediately upon posting on our website. Your continued use of our services 
                  after any modifications constitutes acceptance of the updated terms.
                </p>
              </section>

              <Separator className="my-8" />

              {/* Governing Law */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">11. Governing Law</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms and Conditions are governed by and construed in accordance with the laws 
                  of the State of Illinois, United States. Any disputes arising from these terms shall be 
                  subject to the exclusive jurisdiction of the courts in Chicago, Illinois.
                </p>
              </section>

              <Separator className="my-8" />

              {/* Contact */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">12. Contact Information</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If you have any questions about these Terms and Conditions, please contact us:
                </p>
                <div className="bg-muted/50 rounded-lg p-6 space-y-2">
                  <p className="font-medium text-foreground">Orbyt Cleaners</p>
                  <p className="text-muted-foreground">Phone: +1 234 567 890</p>
                  <p className="text-muted-foreground">Email: info@orbytcleaners.com</p>
                  <p className="text-muted-foreground">Address: Chicago, Illinois, USA</p>
                </div>
              </section>

              {/* Acceptance */}
              <div className="mt-12 p-6 bg-primary/5 border-l-4 border-primary rounded-r-lg">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">By using our services, you acknowledge that you have read, 
                  understood, and agree to be bound by these Terms and Conditions.</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsAndConditions;
