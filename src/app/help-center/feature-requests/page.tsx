"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronRight, Zap } from "lucide-react";
import Link from "next/link";
import PlatformHeader from "@/components/PlatformHeader";
import Footer from "@/components/Footer";

export default function FeatureRequestsPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const popularFeatures = [
    "Mobile app for service providers",
    "Recurring payment options",
    "Gift card purchases",
    "More service customization options",
    "Service package deals",
    "Enhanced reporting dashboard"
  ];

  const recentlyAdded = [
    "Multi-service booking",
    "Digital contracts and e-signatures",
    "In-app chat with service providers"
  ];

  return (
    <>
      <PlatformHeader />
      <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Request a Feature</h1>
          <p className="text-xl text-gray-600">We'd love to hear your ideas for improving our service.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Submit Your Idea</h2>

          {status === "success" ? (
            <div className="rounded-lg bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm">
              Thanks! Your feature request was submitted. We review all ideas and will reach out if we need more details.
            </div>
          ) : (
          <form
            className="space-y-6"
            onSubmit={async (e) => {
              e.preventDefault();
              setStatus("sending");
              setErrorMessage("");
              try {
                const res = await fetch("/api/feature-request", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    email: email.trim() || undefined,
                  }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  setStatus("error");
                  setErrorMessage(data.error || "Failed to submit. Please try again.");
                  return;
                }
                setStatus("success");
                setTitle("");
                setDescription("");
                setEmail("");
              } catch {
                setStatus("error");
                setErrorMessage("Something went wrong. Please try again.");
              }
            }}
          >
            <div>
              <Label htmlFor="feature-title" className="block text-sm font-medium text-gray-700 mb-1">
                Feature Title
              </Label>
              <p className="text-sm text-gray-500 mb-2">A clear, concise title for your feature request</p>
              <Input
                id="feature-title"
                placeholder="e.g., Add support for recurring payments"
                className="w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="feature-description" className="block text-sm font-medium text-gray-700 mb-1">
                Detailed Description
              </Label>
              <p className="text-sm text-gray-500 mb-2">
                Explain how this feature would work and why it would be valuable
              </p>
              <Textarea
                id="feature-description"
                placeholder="Please describe your feature request in detail..."
                rows={6}
                className="w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Your Email (optional)
              </Label>
              <p className="text-sm text-gray-500 mb-2">
                We'll let you know if we implement your feature
              </p>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                className="w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {status === "error" && errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:from-sky-400 hover:via-indigo-500 hover:to-purple-500 text-white shadow-md"
                disabled={status === "sending"}
              >
                {status === "sending" ? "Submitting..." : "Submit Feature Request"}
              </Button>
            </div>
          </form>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Popular Feature Requests</h3>
            <ul className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {popularFeatures.map((feature, index) => (
                <li key={index} className="px-4 py-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                  <div className="flex items-center">
                    <button className="mr-2 text-gray-400 hover:text-primary">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                    </button>
                    <span className="text-gray-700">{feature}</span>
                    <span className="ml-auto text-sm text-gray-500">1.2k</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recently Added</h3>
            <ul className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {recentlyAdded.map((feature, index) => (
                <li key={index} className="px-4 py-3 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-gray-700">{feature}</span>
                    <span className="ml-auto text-xs text-green-600 font-medium">Added</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Have another question?</h3>
          <p className="mt-2 text-gray-600">Check out our help center or contact our support team.</p>
          <div className="mt-6">
            <Button asChild variant="outline" className="mr-4">
              <Link href="/help-center" className="inline-flex items-center">
                Visit Help Center
              </Link>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:from-sky-400 hover:via-indigo-500 hover:to-purple-500 text-white shadow-md"
            >
              <Link href="/contact-support" className="inline-flex items-center">
                Contact Support
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
      <Footer />
    </>
  );
}
