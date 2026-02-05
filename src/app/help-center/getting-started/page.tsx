import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowRight, BookOpen, Settings, Calendar, Users, FileText } from "lucide-react";
import Link from "next/link";

export default function GettingStartedPage() {
  const steps = [
    {
      title: "1. Create Your Account",
      description: "Sign up and complete your profile to get started with Orbit Booking.",
      icon: <CheckCircle className="h-6 w-6 text-primary" />
    },
    {
      title: "2. Set Up Your Business Profile",
      description: "Add your business details, services, and working hours.",
      icon: <Settings className="h-6 w-6 text-primary" />
    },
    {
      title: "3. Add Your Team Members",
      description: "Invite your team and set their roles and permissions.",
      icon: <Users className="h-6 w-6 text-primary" />
    },
    {
      title: "4. Configure Your Services",
      description: "Set up the services you offer, including duration and pricing.",
      icon: <FileText className="h-6 w-6 text-primary" />
    },
    {
      title: "5. Set Your Availability",
      description: "Configure your working hours and time off in the calendar.",
      icon: <Calendar className="h-6 w-6 text-primary" />
    },
    {
      title: "6. Start Accepting Appointments",
      description: "Share your booking link with clients and start managing appointments.",
      icon: <CheckCircle className="h-6 w-6 text-primary" />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Getting Started with Orbyt Booking</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Follow these simple steps to set up your account and start managing your business efficiently
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {steps.map((step, index) => (
            <Card key={index} className="h-full hover:shadow-md transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {step.icon}
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </div>
                <CardDescription className="text-base">
                  {step.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                Next Steps
              </CardTitle>
              <CardDescription>
                Now that you're all set up, here are some additional resources to help you get the most out of Orbit Booking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/help-center/tutorials">
                  <Card className="h-full hover:shadow-md transition-shadow duration-200 group">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg group-hover:text-primary flex items-center gap-2">
                        Watch Tutorials <ArrowRight className="h-4 w-4 mt-1 transition-transform group-hover:translate-x-1" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">Learn how to use all the features of Orbit Booking with our video tutorials.</p>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/help-center/faqs">
                  <Card className="h-full hover:shadow-md transition-shadow duration-200 group">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg group-hover:text-primary flex items-center gap-2">
                        Read FAQs <ArrowRight className="h-4 w-4 mt-1 transition-transform group-hover:translate-x-1" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">Find answers to common questions about using Orbit Booking.</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Need more help?</CardTitle>
              <CardDescription>
                Our support team is here to assist you with any questions or issues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/contact-support" className="flex items-center gap-2">
                  Contact Support
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
