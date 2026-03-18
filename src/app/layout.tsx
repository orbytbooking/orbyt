import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});
const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"], 
  variable: "--font-space-grotesk" 
});

export const metadata: Metadata = {
  title: "Orbyt Service – Service Booking Software for Cleaning & Home Services",
  description: "Orbyt Service is an all-in-one booking and CRM platform for cleaning and home service businesses. Automate scheduling, reminders, and payments.",
  keywords: "service booking software, cleaning business booking system, home service scheduling app, online booking for cleaners, Orbyt Service",
};

// Next.js recommends exporting `viewport` directly (instead of inside `metadata`)
// so mobile browsers scale the page correctly.
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}>
        <AuthProvider>
          <BusinessProvider>
            {children}
          </BusinessProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
