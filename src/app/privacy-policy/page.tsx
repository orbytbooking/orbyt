"use client";

import { useEffect } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import Footer from "@/components/Footer";
import { Shield, Lock, Eye, Database, UserCheck, Mail, Cookie, Globe } from "lucide-react";

const PrivacyPolicy = () => {
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
              Privacy Policy
            </h1>
            <p className="text-slate-600">
              Orbyt Service Platform. Last updated: March 2025
            </p>
            <p className="text-slate-600 text-sm mt-2 max-w-2xl">
              This policy applies only to the Orbyt Service platform (orbyt.com, the Orbyt product, and our apps). It does not apply to business websites built with Orbyt. Each business that uses Orbyt has its own separate privacy policy for their own website and their customers; those policies are different and are the responsibility of each business.
            </p>
            <div className="mt-4 p-4 rounded-lg border border-amber-200 bg-amber-50 text-slate-700 text-sm max-w-2xl">
              <strong className="text-slate-900">Platform only.</strong> This is the privacy policy for Orbyt Service (the platform). If you are on a business's booking site or their website (e.g. a site built with Orbyt), that business's privacy policy applies to you there, not this one.
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 md:p-10">
            <div className="max-w-none">
              {/* Introduction */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary shrink-0" />
                  1. Introduction
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  Orbyt Service (“Orbyt,” “we,” “us,” or “our”) operates the Orbyt Service platform, a software-as-a-service (SaaS) platform that helps service businesses manage bookings, payments, customers, and operations. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use our platform, website, and related services (the “Platform”). It applies to business users who subscribe to Orbyt, visitors to our marketing website, and others who interact with Orbyt. If you are a customer of a business that uses Orbyt (e.g., you booked a service through a business’s Orbyt-powered site), that business has its own privacy practices for your data; we process such data on the business’s behalf as a service provider. Please read this policy carefully.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Information We Collect */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary shrink-0" />
                  2. Information We Collect
                </h2>
                <div className="space-y-6 text-slate-600">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-2">2.1 Information You Give Us (Platform and Website)</h3>
                    <p className="leading-relaxed mb-3">
                      We collect information you provide when you:
                    </p>
                    <ul className="space-y-2 ml-6">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Create or manage an Orbyt business account (e.g., business name, email, phone, address, billing details)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Add team members, providers, or staff to your account</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Contact us for support, sales, or general inquiries</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Subscribe to newsletters or marketing from Orbyt</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Fill out forms on our website (e.g., contact, demo requests)</span>
                      </li>
                    </ul>
                    <p className="leading-relaxed mt-3">
                      This may include: name, email address, phone number, business address, payment and billing information (processed by our payment providers), and any other information you choose to provide.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-2">2.2 Information Collected Automatically</h3>
                    <p className="leading-relaxed mb-3">
                      When you use our Platform or visit our website, we and our service providers may automatically collect:
                    </p>
                    <ul className="space-y-2 ml-6">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Device and browser information (e.g., IP address, browser type, operating system)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Usage data (e.g., pages visited, features used, time spent)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Referring URLs and search terms</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Cookies and similar technologies (see Section 5)</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-2">2.3 Data Processed on Behalf of Business Users</h3>
                    <p className="leading-relaxed">
                      When your business uses Orbyt, you may input data about your customers (e.g., names, emails, phone numbers, booking details). We process this data on your behalf to provide the Platform (e.g., to send booking confirmations, process payments you authorize). In that context, we act as a data processor; your business is the data controller responsible for your own privacy notices and compliance with applicable law.
                    </p>
                  </div>
                </div>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* How We Use Your Information */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary shrink-0" />
                  3. How We Use Your Information
                </h2>
                <div className="space-y-3 text-slate-600">
                  <p className="leading-relaxed">We use the information we collect to:</p>
                  <ul className="space-y-2 ml-6">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-slate-900">Provide the Platform:</strong> Operate, maintain, and improve our services, including bookings, payments, and business tools</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-slate-900">Account and Billing:</strong> Create and manage accounts, authenticate users, and process subscription and other payments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-slate-900">Communication:</strong> Send service-related messages, security alerts, and support responses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-slate-900">Marketing:</strong> Send product updates, offers, and newsletters (where permitted and with opt-out available)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-slate-900">Analytics and Improvement:</strong> Analyze usage to improve the Platform, fix issues, and develop new features</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-slate-900">Safety and Legal:</strong> Enforce our Terms of Service, protect the Platform, and comply with legal obligations</span>
                    </li>
                  </ul>
                </div>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Information Sharing */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary shrink-0" />
                  4. Information Sharing and Disclosure
                </h2>
                <div className="space-y-4 text-slate-600">
                  <p className="leading-relaxed">
                    We do not sell your personal information. We may share information in these circumstances:
                  </p>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-2">4.1 Service Providers</h3>
                    <p className="leading-relaxed">
                      We work with third parties who help us operate the Platform (e.g., hosting, payment processing, email delivery, analytics). They have access to information only as needed to perform their functions and are contractually required to protect it and use it only for our purposes.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-2">4.2 Business Users and Their Customers</h3>
                    <p className="leading-relaxed">
                      Data that you or your end customers provide through the Platform (e.g., bookings, customer details) is shared as necessary to provide the services you use (e.g., with payment processors when you charge customers).
                    </p>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-2">4.3 Legal and Safety</h3>
                    <p className="leading-relaxed">
                      We may disclose information if required by law, court order, or government request, or when we believe disclosure is necessary to protect the rights, safety, or property of Orbyt, our users, or others.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-2">4.4 Business Transfers</h3>
                    <p className="leading-relaxed">
                      If Orbyt is involved in a merger, acquisition, or sale of assets, your information may be transferred. We will notify you of any material change in ownership or use of your information.
                    </p>
                  </div>
                </div>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Cookies */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Cookie className="w-5 h-5 text-primary shrink-0" />
                  5. Cookies and Tracking Technologies
                </h2>
                <div className="space-y-4 text-slate-600">
                  <p className="leading-relaxed">
                    We use cookies and similar technologies to:
                  </p>
                  <ul className="space-y-2 ml-6">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Keep you logged in and remember your preferences</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Understand how the Platform and website are used</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Improve performance and security</span>
                    </li>
                  </ul>
                  <p className="leading-relaxed mt-4">
                    You can control cookies through your browser settings. Disabling certain cookies may affect the functionality of the Platform or website.
                  </p>
                </div>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Data Security */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary shrink-0" />
                  6. Data Security
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  We implement technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction, including encryption, access controls, and secure infrastructure. No method of transmission or storage is completely secure; we cannot guarantee absolute security.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Your Rights */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary shrink-0" />
                  7. Your Privacy Rights
                </h2>
                <div className="space-y-3 text-slate-600">
                  <p className="leading-relaxed">
                    Depending on where you live, you may have the right to:
                  </p>
                  <ul className="space-y-2 ml-6">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-slate-900">Access:</strong> Request a copy of the personal information we hold about you</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-slate-900">Correction:</strong> Request correction of inaccurate or incomplete information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-slate-900">Deletion:</strong> Request deletion of your personal information (subject to legal and contractual obligations)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-slate-900">Opt-Out of Marketing:</strong> Unsubscribe from marketing emails via the link in our messages or by contacting us</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-slate-900">Data Portability:</strong> Request a copy of your data in a portable format where applicable</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-slate-900">Object or Restrict:</strong> Object to or request restriction of certain processing where provided by law</span>
                    </li>
                  </ul>
                  <p className="leading-relaxed mt-4">
                    To exercise these rights, contact us at the details below. You may also have the right to lodge a complaint with a supervisory authority in your country.
                  </p>
                </div>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Data Retention */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3">8. Data Retention</h2>
                <p className="text-slate-600 leading-relaxed">
                  We retain your information for as long as your account is active or as needed to provide the Platform and fulfill the purposes described in this policy. We may retain certain information as required by law, for dispute resolution, or to enforce our agreements. When data is no longer needed, we will delete or anonymize it in accordance with our practices and legal obligations.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Third-Party Links */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3">9. Third-Party Links and Services</h2>
                <p className="text-slate-600 leading-relaxed">
                  Our website or Platform may contain links to third-party sites or services (e.g., payment providers, social media). We are not responsible for their privacy practices. We encourage you to read their privacy policies before providing any personal information.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Children's Privacy */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3">10. Children's Privacy</h2>
                <p className="text-slate-600 leading-relaxed">
                  The Platform is not intended for individuals under 18. We do not knowingly collect personal information from children. If we learn that we have collected such information, we will take steps to delete it.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* International */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3">11. International Transfers</h2>
                <p className="text-slate-600 leading-relaxed">
                  We may store and process information in the United States and other countries where our service providers operate. If you are located outside these jurisdictions, your information may be transferred to and processed in those countries. We take steps to ensure appropriate safeguards where required by applicable law.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Changes */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3">12. Changes to This Privacy Policy</h2>
                <p className="text-slate-600 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will post the updated policy on the Platform and update the “Last Updated” date. Material changes may be communicated by email or a notice in the Platform. Your continued use of the Platform after the effective date constitutes acceptance of the updated policy.
                </p>
              </section>

              <hr className="my-8 border-slate-200" />

              {/* Contact */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary shrink-0" />
                  13. Contact Orbyt Service
                </h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  For questions about this Privacy Policy or our data practices, contact us:
                </p>
                <div className="bg-slate-100 rounded-lg border border-slate-200 p-5 space-y-1 text-slate-600">
                  <p className="font-semibold text-slate-900">Orbyt Service</p>
                  <p>Email: privacy@orbyt.com (or support@orbyt.com)</p>
                  <p>Website: orbyt.com</p>
                </div>
              </section>

              {/* Consent */}
              <div className="mt-10 p-5 bg-slate-100 border-l-4 border-primary rounded-r-lg">
                <p className="text-sm text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">
                    By using the Orbyt Service platform or our website, you consent to the collection and use of your information as described in this Privacy Policy.
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

export default PrivacyPolicy;
