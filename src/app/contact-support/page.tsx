"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Clock, MessageSquare, CheckCircle } from "lucide-react";
import Link from "next/link";
import PlatformHeader from "@/components/PlatformHeader";
import Footer from "@/components/Footer";

export default function ContactSupport() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const contactMethods = [
    {
      icon: <Mail className="h-6 w-6 text-primary" />,
      title: "Email Us",
      description: "We'll get back to you within 24 hours",
      value: "support@orbyt.com",
      link: "mailto:support@orbyt.com"
    },
    {
      icon: <Phone className="h-6 w-6 text-primary" />,
      title: "Call Us",
      description: "Mon-Fri from 8am to 5pm",
      value: "(123) 456-7890",
      link: "tel:+11234567890"
    },
    {
      icon: <MapPin className="h-6 w-6 text-primary" />,
      title: "Visit Us",
      description: "Our office location",
      value: "123 Cleaning St, Suite 100, San Francisco, CA 94107",
      link: "https://maps.google.com"
    },
    {
      icon: <Clock className="h-6 w-6 text-primary" />,
      title: "Business Hours",
      description: "We're here to help",
      value: "Monday - Friday: 8:00 AM - 5:00 PM\nSaturday: 9:00 AM - 2:00 PM\nSunday: Closed"
    }
  ];

  return (
    <>
      <PlatformHeader />
      <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Our Support Team</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're here to help and answer any questions you might have. We look forward to hearing from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <Card className="p-6">
            <CardHeader className="px-0 pt-0 pb-6">
              <CardTitle className="text-2xl">Send us a message</CardTitle>
              <CardDescription>
                Fill out the form and we'll get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {status === "success" ? (
                <div className="rounded-lg bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm">
                  Thanks! Your message was sent. We typically respond within 24 hours.
                </div>
              ) : (
                <form
                  className="space-y-6"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setStatus("sending");
                    setErrorMessage("");
                    try {
                      const body = {
                        name: name.trim(),
                        email: email.trim(),
                        message: subject.trim()
                          ? `Subject: ${subject.trim()}\n\n${message.trim()}`
                          : message.trim(),
                      };
                      const res = await fetch("/api/contact", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        setStatus("error");
                        setErrorMessage(data.error || "Failed to send message. Please try again.");
                        return;
                      }
                      setStatus("success");
                      setName("");
                      setEmail("");
                      setSubject("");
                      setMessage("");
                    } catch {
                      setStatus("error");
                      setErrorMessage("Something went wrong. Please try again.");
                    }
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium leading-none">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium leading-none">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="subject" className="text-sm font-medium leading-none">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="subject"
                      placeholder="How can we help you?"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium leading-none">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      id="message"
                      placeholder="Tell us about your inquiry..."
                      className="min-h-[150px]"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>
                  {status === "error" && errorMessage && (
                    <p className="text-sm text-red-600">{errorMessage}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full sm:w-auto bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:from-sky-400 hover:via-indigo-500 hover:to-purple-500 text-white shadow-md"
                    disabled={status === "sending"}
                  >
                    <MessageSquare className="mr-2 h-5 w-5" />
                    {status === "sending" ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <CardHeader className="px-0 pt-0 pb-6">
                <CardTitle className="text-2xl">Contact Information</CardTitle>
                <CardDescription>
                  Reach out to us through any of these methods
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 space-y-6">
                {contactMethods.map((method, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {method.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{method.title}</h3>
                      <p className="text-sm text-gray-500">{method.description}</p>
                      {method.link ? (
                        <a 
                          href={method.link} 
                          className="text-primary hover:underline mt-1 block"
                        >
                          {method.value}
                        </a>
                      ) : (
                        <p className="text-gray-700 mt-1 whitespace-pre-line">{method.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="p-6 bg-primary/5 border-primary/20">
              <CardHeader className="p-0 pb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <CardTitle className="text-xl">Frequently Asked</CardTitle>
                </div>
                <CardDescription>
                  Check out our help center for answers to common questions
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/help-center" className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Visit Help Center
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
      <Footer />
    </>
  );
}
