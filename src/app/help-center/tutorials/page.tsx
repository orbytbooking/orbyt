import { Button } from "@/components/ui/button";
import { BookOpen, ChevronRight, Play } from "lucide-react";
import Link from "next/link";

export default function TutorialsPage() {
  const tutorials = [
    {
      title: "How to Book Your First Appointment",
      description: "Step-by-step guide to booking your first cleaning service with us.",
      duration: "3 min",
      type: "video"
    },
    {
      title: "Managing Your Account Settings",
      description: "Learn how to update your profile, change password, and manage notifications.",
      duration: "5 min",
      type: "guide"
    },
    {
      title: "Using the Mobile App",
      description: "A complete walkthrough of our mobile app features and functionality.",
      duration: "7 min",
      type: "video"
    },
    {
      title: "Rescheduling or Canceling Appointments",
      description: "How to modify or cancel your upcoming appointments.",
      duration: "4 min",
      type: "guide"
    },
    {
      title: "Setting Up Recurring Services",
      description: "How to schedule regular cleanings that fit your needs.",
      duration: "6 min",
      type: "video"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Tutorials & Guides</h1>
          <p className="text-xl text-gray-600">Learn how to make the most of our services with our helpful tutorials.</p>
        </div>

        <div className="grid gap-6">
          {tutorials.map((tutorial, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary">
                    {tutorial.type === 'video' ? (
                      <Play className="h-6 w-6" />
                    ) : (
                      <BookOpen className="h-6 w-6" />
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{tutorial.title}</h3>
                    <p className="mt-1 text-gray-600">{tutorial.description}</p>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <span>{tutorial.duration} read</span>
                      <span className="mx-2">•</span>
                      <span className="capitalize">{tutorial.type}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Need more help?</h3>
          <p className="mt-2 text-gray-600">Can't find what you're looking for? Our support team is here to help.</p>
          <div className="mt-6">
            <Button asChild variant="outline" className="mr-4">
              <Link href="/help-center/faqs" className="inline-flex items-center">
                Browse FAQs
              </Link>
            </Button>
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
