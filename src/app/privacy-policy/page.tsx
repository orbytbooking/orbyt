"use client";

import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Separator } from "@/components/ui/separator";
import { Shield, Lock, Eye, Database, UserCheck, Mail, Cookie, Globe } from "lucide-react";

const PrivacyPolicy = () => {
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
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              Privacy Policy
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
                  <Lock className="w-6 h-6 text-primary" />
                  1. Introduction
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  At Premier Pro Cleaners, we are committed to protecting your privacy and ensuring 
                  the security of your personal information. This Privacy Policy explains how we collect, 
                  use, disclose, and safeguard your information when you visit our website and use our services. 
                  Please read this policy carefully to understand our practices regarding your personal data.
                </p>
              </section>

              <Separator className="my-8" />

              {/* Information We Collect */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Database className="w-6 h-6 text-primary" />
                  2. Information We Collect
                </h2>
                
                <div className="space-y-6 text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">2.1 Personal Information</h3>
                    <p className="leading-relaxed mb-3">
                      We collect personal information that you voluntarily provide to us when you:
                    </p>
                    <ul className="space-y-2 ml-6">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Book a cleaning service through our website</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Create an account or register for our services</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Contact us via email, phone, or contact forms</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Subscribe to our newsletter or marketing communications</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Participate in surveys, promotions, or feedback requests</span>
                      </li>
                    </ul>
                    <p className="leading-relaxed mt-3">
                      This information may include:
                    </p>
                    <ul className="space-y-2 ml-6 mt-2">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Full name</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Email address</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Phone number</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Service address and location details</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Payment information (processed securely through third-party payment processors)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Service preferences and special instructions</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground mb-3">2.2 Automatically Collected Information</h3>
                    <p className="leading-relaxed mb-3">
                      When you visit our website, we automatically collect certain information about your device and usage:
                    </p>
                    <ul className="space-y-2 ml-6">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>IP address and browser type</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Operating system and device information</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Pages visited and time spent on our website</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Referring website and search terms used</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Cookies and similar tracking technologies</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              <Separator className="my-8" />

              {/* How We Use Your Information */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-primary" />
                  3. How We Use Your Information
                </h2>
                <div className="space-y-3 text-muted-foreground">
                  <p className="leading-relaxed">
                    We use the information we collect for the following purposes:
                  </p>
                  <ul className="space-y-2 ml-6">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Service Delivery:</strong> To process bookings, schedule appointments, and provide cleaning services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Communication:</strong> To send confirmations, updates, and respond to inquiries</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Payment Processing:</strong> To process transactions and prevent fraud</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Customer Support:</strong> To address questions, concerns, and provide assistance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Marketing:</strong> To send promotional offers, newsletters, and service updates (with your consent)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Analytics:</strong> To analyze website usage and improve our services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Legal Compliance:</strong> To comply with legal obligations and protect our rights</span>
                    </li>
                  </ul>
                </div>
              </section>

              <Separator className="my-8" />

              {/* Information Sharing */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Globe className="w-6 h-6 text-primary" />
                  4. Information Sharing and Disclosure
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p className="leading-relaxed">
                    We do not sell, rent, or trade your personal information to third parties. We may share 
                    your information only in the following circumstances:
                  </p>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">4.1 Service Providers</h3>
                    <p className="leading-relaxed">
                      We may share information with trusted third-party service providers who assist us in 
                      operating our website, conducting business, or providing services (e.g., payment processors, 
                      email service providers, scheduling tools). These providers are contractually obligated to 
                      protect your information and use it only for the purposes we specify.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">4.2 Legal Requirements</h3>
                    <p className="leading-relaxed">
                      We may disclose your information if required by law, court order, or government regulation, 
                      or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">4.3 Business Transfers</h3>
                    <p className="leading-relaxed">
                      In the event of a merger, acquisition, or sale of assets, your information may be transferred 
                      to the acquiring entity. We will notify you of any such change in ownership or control.
                    </p>
                  </div>
                </div>
              </section>

              <Separator className="my-8" />

              {/* Cookies */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Cookie className="w-6 h-6 text-primary" />
                  5. Cookies and Tracking Technologies
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p className="leading-relaxed">
                    We use cookies and similar tracking technologies to enhance your experience on our website. 
                    Cookies are small data files stored on your device that help us:
                  </p>
                  <ul className="space-y-2 ml-6">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Remember your preferences and settings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Understand how you use our website</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Improve website functionality and performance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Deliver personalized content and advertisements</span>
                    </li>
                  </ul>
                  <p className="leading-relaxed mt-4">
                    You can control cookie settings through your browser preferences. However, disabling cookies 
                    may affect the functionality of our website.
                  </p>
                </div>
              </section>

              <Separator className="my-8" />

              {/* Data Security */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Lock className="w-6 h-6 text-primary" />
                  6. Data Security
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement industry-standard security measures to protect your personal information from 
                  unauthorized access, disclosure, alteration, or destruction. These measures include:
                </p>
                <ul className="space-y-2 ml-6 mt-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Encryption of sensitive data (e.g., payment information)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Secure socket layer (SSL) technology for data transmission</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Regular security audits and vulnerability assessments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Restricted access to personal information on a need-to-know basis</span>
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  However, no method of transmission over the internet or electronic storage is 100% secure. 
                  While we strive to protect your information, we cannot guarantee absolute security.
                </p>
              </section>

              <Separator className="my-8" />

              {/* Your Rights */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Eye className="w-6 h-6 text-primary" />
                  7. Your Privacy Rights
                </h2>
                <div className="space-y-3 text-muted-foreground">
                  <p className="leading-relaxed">
                    You have the following rights regarding your personal information:
                  </p>
                  <ul className="space-y-2 ml-6">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Access:</strong> Request a copy of the personal information we hold about you</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Correction:</strong> Request correction of inaccurate or incomplete information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Deletion:</strong> Request deletion of your personal information (subject to legal obligations)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Opt-Out:</strong> Unsubscribe from marketing communications at any time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Data Portability:</strong> Request transfer of your data to another service provider</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Object:</strong> Object to processing of your personal information for certain purposes</span>
                    </li>
                  </ul>
                  <p className="leading-relaxed mt-4">
                    To exercise any of these rights, please contact us using the information provided below.
                  </p>
                </div>
              </section>

              <Separator className="my-8" />

              {/* Data Retention */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">8. Data Retention</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We retain your personal information only for as long as necessary to fulfill the purposes 
                  outlined in this Privacy Policy, unless a longer retention period is required or permitted 
                  by law. When we no longer need your information, we will securely delete or anonymize it.
                </p>
              </section>

              <Separator className="my-8" />

              {/* Third-Party Links */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">9. Third-Party Links</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our website may contain links to third-party websites or services. We are not responsible 
                  for the privacy practices or content of these external sites. We encourage you to review 
                  the privacy policies of any third-party sites you visit.
                </p>
              </section>

              <Separator className="my-8" />

              {/* Children's Privacy */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">10. Children's Privacy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our services are not intended for individuals under the age of 18. We do not knowingly 
                  collect personal information from children. If we become aware that we have collected 
                  information from a child without parental consent, we will take steps to delete that information.
                </p>
              </section>

              <Separator className="my-8" />

              {/* Changes to Policy */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">11. Changes to This Privacy Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time to reflect changes in our practices 
                  or legal requirements. We will notify you of any material changes by posting the updated 
                  policy on our website with a new "Last Updated" date. We encourage you to review this 
                  policy periodically.
                </p>
              </section>

              <Separator className="my-8" />

              {/* Contact */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Mail className="w-6 h-6 text-primary" />
                  12. Contact Us
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If you have any questions, concerns, or requests regarding this Privacy Policy or our 
                  data practices, please contact us:
                </p>
                <div className="bg-muted/50 rounded-lg p-6 space-y-2">
                  <p className="font-medium text-foreground">Premier Pro Cleaners</p>
                  <p className="text-muted-foreground">Phone: +1 234 567 890</p>
                  <p className="text-muted-foreground">Email: privacy@premierprocleaners.com</p>
                  <p className="text-muted-foreground">Address: Chicago, Illinois, USA</p>
                </div>
              </section>

              {/* Consent */}
              <div className="mt-12 p-6 bg-primary/5 border-l-4 border-primary rounded-r-lg">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">By using our website and services, you consent to the 
                  collection and use of your information as described in this Privacy Policy.</strong>
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

export default PrivacyPolicy;
