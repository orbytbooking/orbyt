'use client';

import Link from 'next/link';

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <img 
                src="/images/orbit.png" 
                alt="Orbit Booking logo"
                className="h-10 w-10"
              />
              <span className="text-xl font-bold text-gray-900">Orbyt Booking</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/#features" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">Features</Link>
              <Link href="/#pricing" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">Pricing</Link>
              <Link href="/#faq" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">FAQ's</Link>
              <Link href="/#contact" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">Contact Us</Link>
            </nav>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login" className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/90 transition-colors">
                Log In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Features overview */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Features That Work
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Turn your cleaning or service business into a smooth, online operation with tools for booking, marketing,
              hiring, reporting, and more.
            </p>
          </div>

          {/* Top feature shortcuts with icons */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 text-sm mb-10">
            <a href="#customer-account" className="flex flex-col items-center gap-2 rounded-xl border bg-white p-3 hover:shadow-sm transition-shadow">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary text-lg">
                👤
              </span>
              <span className="text-center font-medium text-gray-800">Customer</span>
            </a>
            <a href="#provider-account" className="flex flex-col items-center gap-2 rounded-xl border bg-white p-3 hover:shadow-sm transition-shadow">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-lg">
                🧑‍💼
              </span>
              <span className="text-center font-medium text-gray-800">Provider</span>
            </a>
            <a href="#business-account" className="flex flex-col items-center gap-2 rounded-xl border bg-white p-3 hover:shadow-sm transition-shadow">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 text-lg">
                🏢
              </span>
              <span className="text-center font-medium text-gray-800">Business</span>
            </a>
            <a href="#website-builder" className="flex flex-col items-center gap-2 rounded-xl border bg-white p-3 hover:shadow-sm transition-shadow">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50 text-pink-600 text-lg">
                🌐
              </span>
              <span className="text-center font-medium text-gray-800">Website</span>
            </a>
            <a href="#smart-notifications" className="flex flex-col items-center gap-2 rounded-xl border bg-white p-3 hover:shadow-sm transition-shadow">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 text-lg">
                🔔
              </span>
              <span className="text-center font-medium text-gray-800">Notifications</span>
            </a>
            <a href="#advanced-reports" className="flex flex-col items-center gap-2 rounded-xl border bg-white p-3 hover:shadow-sm transition-shadow">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 text-lg">
                📊
              </span>
              <span className="text-center font-medium text-gray-800">Reports</span>
            </a>
            <a href="/admin/dashboard" className="flex flex-col items-center gap-2 rounded-xl border bg-white p-3 hover:shadow-sm transition-shadow">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600 text-lg">
                📆
              </span>
              <span className="text-center font-medium text-gray-800">Dashboard</span>
            </a>
            <a href="/auth/login" className="flex flex-col items-center gap-2 rounded-xl border bg-primary text-primary-foreground p-3 hover:bg-primary/90 transition-shadow">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground text-lg">
                🚀
              </span>
              <span className="text-center font-medium">Start Free Trial</span>
            </a>
          </div>

          {/* High-level list of everything included in Orbit Booking */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 text-sm text-gray-700">
            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold mb-2">Booking &amp; Calendar</h3>
              <ul className="space-y-1">
                <li>Online booking forms and service menus.</li>
                <li>Admin bookings dashboard and calendar view.</li>
                <li>Customer and provider portals for appointments.</li>
              </ul>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold mb-2">Customers &amp; Providers</h3>
              <ul className="space-y-1">
                <li>Customer accounts, history, and saved details.</li>
                <li>Provider accounts with schedules and availability.</li>
                <li>Multi‑location and team management tools.</li>
              </ul>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold mb-2">Hiring Workspace</h3>
              <ul className="space-y-1">
                <li>Onboarding, prospects, and interview tracking.</li>
                <li>Interview quizzes and scorecards.</li>
                <li>Contacts and hiring reports.</li>
              </ul>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold mb-2">Marketing Suite</h3>
              <ul className="space-y-1">
                <li>Coupons, daily discounts, and gift cards.</li>
                <li>Marketing campaigns and promotions.</li>
                <li>Dedicated scripts area for cold‑calling and follow‑ups.</li>
              </ul>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold mb-2">Notifications &amp; Communication</h3>
              <ul className="space-y-1">
                <li>Email and SMS reminders and confirmations.</li>
                <li>Customizable templates per service or workflow.</li>
                <li>Activity logs so you see what was sent and when.</li>
              </ul>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold mb-2">Settings &amp; Reports</h3>
              <ul className="space-y-1">
                <li>Design and branding controls for your booking site.</li>
                <li>Service, staff, and reserve‑slot configuration.</li>
                <li>Revenue, booking, and performance reports.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Account Section */}
      <section id="customer-account" className="py-12 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center mb-16">
            <div className="md:w-1/2 mb-8 md:mb-0 md:pr-12">
              <h2 className="text-3xl font-bold mb-6">Customer Account</h2>
              <p className="text-lg text-gray-600 mb-6">
                Accessible from any device and browser, our customer portal provides a seamless experience whether you're on desktop, tablet, or mobile. Manage your appointments, track service history, and make payments with ease.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-primary">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Easy Appointment Booking:</span> Schedule services in just a few clicks with our intuitive interface.
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-primary">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Service History:</span> Keep track of all your past and upcoming appointments in one place.
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-primary">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Secure Payments:</span> Pay for services securely with multiple payment options.
                  </span>
                </li>
              </ul>
            </div>
            <div className="md:w-1/2 bg-gray-50 p-8 rounded-xl">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                  Customer Account Preview
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Provider Account Section */}
      <section id="provider-account" className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0 md:order-2 md:pl-12">
              <h2 className="text-3xl font-bold mb-6">Provider Account</h2>
              <p className="text-lg text-gray-600 mb-6">
                Our provider dashboard gives service professionals complete control over their schedule, clients, and business operations. Access real-time updates and manage everything from one centralized platform.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-blue-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Appointment Management:</span> View and manage your schedule with an intuitive calendar interface.
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-blue-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Team Scheduling:</span> Coordinate with your team and assign appointments efficiently.
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-blue-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Service Customization:</span> Tailor your services with custom durations, pricing, and requirements.
                  </span>
                </li>
              </ul>
            </div>
            <div className="md:w-1/2 md:pr-12 md:order-1">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                  Provider Account Preview
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Business Account Section */}
      <section id="business-account" className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0 md:pr-12">
              <h2 className="text-3xl font-bold mb-6">Business Account</h2>
              <p className="text-lg text-gray-600 mb-6">
                Scale your business operations with our comprehensive business management tools. Whether you have one location or multiple, our platform provides the tools you need to succeed.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-indigo-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Multi-location Management:</span> Manage multiple business locations from a single dashboard.
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-indigo-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Advanced Analytics:</span> Gain insights into your business performance with detailed reports.
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-indigo-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Enterprise Support:</span> Get priority support with our dedicated business account team.
                  </span>
                </li>
              </ul>
            </div>
            <div className="md:w-1/2">
              <div className="bg-gray-50 p-8 rounded-xl">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                    Business Account Preview
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Website Builder Section */}
      <section id="website-builder" className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center mb-16">
            <div className="md:w-1/2 mb-8 md:mb-0 md:pr-12">
              <h2 className="text-3xl font-bold mb-6">Website Builder</h2>
              <p className="text-lg text-gray-600 mb-6">
                Create a stunning, professional website in minutes with our intuitive drag-and-drop builder. No coding skills required. Choose from our collection of beautifully designed templates, customize them to match your brand, and publish your site with just a few clicks.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-green-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Mobile-Responsive Templates:</span> Beautiful designs that look great on any device, from desktops to smartphones.
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-green-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Custom Domain Support:</span> Connect your own domain name for a professional online presence.
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-green-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Built-in SEO Tools:</span> Optimize your site for search engines with our easy-to-use SEO tools.
                  </span>
                </li>
              </ul>
            </div>
            <div className="md:w-1/2 bg-gray-50 p-8 rounded-xl">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                  Website Builder Preview
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Notifications Section */}
      <section id="smart-notifications" className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0 md:order-2 md:pl-12">
              <h2 className="text-3xl font-bold mb-6">Smart Notifications</h2>
              <p className="text-lg text-gray-600 mb-6">
                Keep your team and customers informed with our comprehensive notification system. Automate reminders, confirmations, and updates through multiple channels to ensure everyone stays in the loop and no important details are missed.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-yellow-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Multi-channel Alerts:</span> Send notifications via email, SMS, and in-app messages to ensure important updates are never missed.
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-yellow-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Customizable Templates:</span> Tailor your messages with our easy-to-use template editor to match your brand voice.
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-yellow-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Automated Reminders:</span> Reduce no-shows with automated appointment reminders sent at optimal times.
                  </span>
                </li>
              </ul>
            </div>
            <div className="md:w-1/2 md:pr-12 md:order-1">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                  Smart Notifications Preview
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Reports Section */}
      <section id="advanced-reports" className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0 md:pr-12">
              <h2 className="text-3xl font-bold mb-6">Advanced Reports</h2>
              <p className="text-lg text-gray-600 mb-6">
                Gain valuable insights into your business performance with our comprehensive reporting tools. Track key metrics, identify trends, and make data-driven decisions to grow your business. Export reports in multiple formats for further analysis or presentations.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-purple-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Revenue Tracking:</span> Monitor your income, track payment methods, and analyze revenue streams.
                  </span>
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Customer insights
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Exportable data
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-purple-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    <span className="font-medium">Export Options:</span> Download reports in PDF, Excel, or CSV formats for further analysis.
                  </span>
                </li>
              </ul>
            </div>
            <div className="md:w-1/2">
              <div className="bg-gray-50 p-8 rounded-xl">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                    Advanced Reports Preview
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl mb-8 text-primary-foreground/90">
            Join thousands of businesses that trust Orbit Booking to manage their appointments.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/#pricing" 
              className="px-8 py-3 bg-white text-primary font-medium rounded-md hover:bg-gray-100 transition-colors"
            >
              View Pricing
            </Link>
            <Link 
              href="/#contact" 
              className="px-8 py-3 border-2 border-white text-white font-medium rounded-md hover:bg-white/10 transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/#testimonials" className="hover:text-white transition-colors">Testimonials</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Connect With Us</h3>
              <div className="flex space-x-4">
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">Facebook</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">Instagram</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-center text-sm text-gray-400">
              &copy; {new Date().getFullYear()} Orbit Booking. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
