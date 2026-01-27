import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});
const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"], 
  variable: "--font-space-grotesk" 
});

export const metadata: Metadata = {
  title: "Orbit Booking – Service Booking Software for Cleaning & Home Services",
  description: "Orbit Booking is an all-in-one booking and CRM platform for cleaning and home service businesses. Automate scheduling, reminders, and payments.",
  keywords: "service booking software, cleaning business booking system, home service scheduling app, online booking for cleaners, Orbit Booking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
