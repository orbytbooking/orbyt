"use client";

import { useEffect } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import Footer from "@/components/Footer";
import { Shield, AlertCircle, Scale, UserCheck, Ban, Building2 } from "lucide-react";

const TermsAndConditions = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <PlatformHeader />

      <main className="flex-1 bg-slate-50 pt-16">
        <div className="container mx-auto px-4 py-12 sm:py-16 max-w-4xl">
          {/* Header */}
          <div className="mb-10">
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Legal</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-2">
              Terms of Service
            </h1>
            <p className="text-slate-600">
              Orbyt Service Platform. Last updated: March 2025
            </p>
            <p className="text-slate-600 text-sm mt-2 max-w-2xl">
              These terms apply only to the Orbyt Service platform (orbyt.com, the Orbyt product, and our apps). They do not apply to business websites built with Orbyt. Each business that uses Orbyt has its own separate terms and policies for their own website and their customers; those are different and are the responsibility of each business.
            </p>
            <div className="mt-4 p-4 rounded-lg border border-amber-200 bg-amber-50 text-slate-700 text-sm max-w-2xl">
              <strong className="text-slate-900">Platform only.</strong> This is the Terms of Service for Orbyt Service (the platform). If you are on a business's booking site or their website (e.g. a site built with Orbyt), that business's terms apply to you there, not these.
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 md:p-10">
            <div className="max-w-none">
              {/* Introduction */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary shrink-0" />
                  1. Agreement to Terms
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  Welcome to Orbyt Service (“Orbyt,” “we,” “us,” or “our”). These Terms of Service (“Terms”) govern your access to and use of the Orbyt Service platform, including our website, applications, and related services (collectively, the “Platform”). The Platform provides tools for service businesses to manage bookings, payments, customers, and operations. By creating an account, visiting our website, or using the Platform, you agree to be bound by these Terms. If you are using the Platform on behalf of a business, you represent that you have authority to bind that business. If you do not agree to these Terms, you may not use the Platform.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Platform Services */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary shrink-0" />
                  2. The Orbyt Service Platform
                </h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Orbyt Service is a software-as-a-service (SaaS) platform that enables service businesses (“Business Users”) to:
                </p>
                <ul className="space-y-2 text-slate-600 ml-6">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Accept and manage bookings and appointments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Process payments and manage billing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Manage customers, providers, and staff</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Build and host booking websites</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Use other features we make available from time to time</span>
                  </li>
                </ul>
                <p className="text-slate-600 leading-relaxed mt-4">
                  We may add, change, or discontinue features or parts of the Platform. Your use of new or modified features may be subject to additional terms or policies we provide.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Accounts and Registration */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary shrink-0" />
                  3. Accounts and Registration
                </h2>
                <div className="space-y-4 text-slate-600">
                  <p className="leading-relaxed">
                    To use the Platform as a Business User, you must register for an account and provide accurate, current information. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must notify us immediately of any unauthorized use. You must be at least 18 years old (or the age of majority in your jurisdiction) to use the Platform.
                  </p>
                </div>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Acceptable Use */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary shrink-0" />
                  4. Acceptable Use
                </h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  You agree to use the Platform only for lawful purposes and in accordance with these Terms. You must not:
                </p>
                <ul className="space-y-2 text-slate-600 ml-6">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Violate any applicable law or regulation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Infringe the intellectual property or other rights of Orbyt or any third party</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Use the Platform to transmit malware, spam, or harmful or fraudulent content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Attempt to gain unauthorized access to the Platform, other accounts, or our systems</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Reverse engineer, decompile, or attempt to extract source code from the Platform (except as permitted by law)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Resell or sublicense the Platform except as we explicitly allow</span>
                  </li>
                </ul>
                <p className="text-slate-600 leading-relaxed mt-4">
                  We may suspend or terminate your access if we believe you have violated these Terms or applicable law.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Subscription, Fees, Payment */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary shrink-0" />
                  5. Subscription, Fees, and Payment
                </h2>
                <div className="space-y-4 text-slate-600">
                  <p className="leading-relaxed">
                    Use of the Platform may require a paid subscription. Fees, billing cycles, and payment terms are described on our pricing pages or in your plan and may change with notice. You are responsible for all applicable taxes. By providing a payment method, you authorize us to charge it for subscription and other agreed fees. Failure to pay may result in suspension or termination of your account.
                  </p>
                </div>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Your Relationship With Your Customers */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary shrink-0" />
                  6. Your Relationship With Your Customers
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  You are solely responsible for your relationship with your own customers and end users (e.g., people who book your services through the Platform). Any terms, policies, refunds, cancellations, or disputes between you and your customers are between you and them. Orbyt is not a party to those agreements and is not responsible for your conduct, your services, or your customers’ use of your booking pages or services. You must comply with all laws that apply to your business and the collection and use of your customers’ data.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Intellectual Property */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3">7. Intellectual Property</h2>
                <p className="text-slate-600 leading-relaxed">
                  The Platform (including software, design, text, graphics, logos, and other content we provide) is owned by Orbyt or our licensors and is protected by copyright, trademark, and other laws. We grant you a limited, non-exclusive, non-transferable license to access and use the Platform for your internal business purposes in accordance with these Terms. You do not acquire any ownership rights in the Platform. Your content (e.g., business name, logo, service descriptions) remains yours; you grant us the rights we need to operate the Platform (e.g., to display and host your content).
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Disclaimers */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3">8. Disclaimers</h2>
                <p className="text-slate-600 leading-relaxed">
                  THE PLATFORM IS PROVIDED “AS IS” AND “AS AVAILABLE.” WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE ARE NOT RESPONSIBLE FOR THE CONDUCT OF BUSINESS USERS OR END USERS, OR FOR ANY SERVICES BOOKED OR PAYMENTS MADE THROUGH THE PLATFORM BETWEEN YOU AND YOUR CUSTOMERS.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Limitation of Liability */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Ban className="w-5 h-5 text-primary shrink-0" />
                  9. Limitation of Liability
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, ORBYT AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF THE PLATFORM. OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE PLATFORM SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO THE CLAIM (OR ONE HUNDRED U.S. DOLLARS IF GREATER). SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN SUCH CASES, OUR LIABILITY WILL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Privacy */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3">10. Privacy</h2>
                <p className="text-slate-600 leading-relaxed">
                  Your use of the Platform is also governed by our{" "}
                  <a href="/privacy-policy" className="text-primary hover:underline font-medium">
                    Privacy Policy
                  </a>
                  , which describes how Orbyt Service collects, uses, and protects information when you use our Platform.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Modifications */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3">11. Modifications to Terms</h2>
                <p className="text-slate-600 leading-relaxed">
                  We may modify these Terms at any time. We will post the updated Terms on the Platform and update the “Last Updated” date. Material changes may be communicated by email or a notice in the Platform. Your continued use of the Platform after the effective date of changes constitutes acceptance of the updated Terms. If you do not agree, you must stop using the Platform and may close your account.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Termination */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3">12. Termination</h2>
                <p className="text-slate-600 leading-relaxed">
                  You may stop using the Platform and close your account at any time. We may suspend or terminate your access to the Platform, with or without notice, for breach of these Terms, non-payment, or for any other reason we deem appropriate. Upon termination, your right to use the Platform ceases. Sections that by their nature should survive (including disclaimers, limitation of liability, and governing law) will survive termination.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Governing Law */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3">13. Governing Law and Disputes</h2>
                <p className="text-slate-600 leading-relaxed">
                  These Terms are governed by the laws of the United States and the State of Illinois, without regard to conflict of law principles. Any dispute arising out of or relating to these Terms or the Platform shall be resolved exclusively in the state or federal courts located in Illinois, and you consent to personal jurisdiction there.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Contact */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3">14. Contact Orbyt Service</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  For questions about these Terms of Service or the Orbyt Service platform, contact us:
                </p>
                <div className="bg-slate-100 rounded-lg border border-slate-200 p-5 space-y-1 text-slate-600">
                  <p className="font-semibold text-slate-900">Orbyt Service</p>
                  <p>Email: legal@orbyt.com (or support@orbyt.com)</p>
                  <p>Website: orbyt.com</p>
                </div>
              </section>

              {/* Acceptance */}
              <div className="mt-10 p-5 bg-slate-100 border-l-4 border-primary rounded-r-lg">
                <p className="text-sm text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">
                    By using the Orbyt Service platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                  </strong>
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
