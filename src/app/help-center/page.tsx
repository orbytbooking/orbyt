'use client';

import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, HelpCircle, MessageSquare, LifeBuoy, BookOpen, User, Zap } from "lucide-react";
import Link from "next/link";

export default function HelpCenter() {
  const helpTopics = [
    {
      icon: <HelpCircle className="h-6 w-6 text-primary" />,
      title: "Getting Started",
      description: "Learn the basics of using our platform",
      link: "/help-center/getting-started"
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-primary" />,
      title: "FAQs",
      description: "Find answers to common questions",
      link: "/help-center/faqs"
    },
    {
      icon: <LifeBuoy className="h-6 w-6 text-primary" />,
      title: "Contact Support",
      description: "Get in touch with our support team",
      link: "/contact-support"
    },
    {
      icon: <BookOpen className="h-6 w-6 text-primary" />,
      title: "Tutorials",
      description: "Step-by-step guides and tutorials",
      link: "/help-center/tutorials"
    },
    {
      icon: <User className="h-6 w-6 text-primary" />,
      title: "Account Help",
      description: "Account settings and management",
      link: "/help-center/account"
    },
    {
      icon: <Zap className="h-6 w-6 text-primary" />,
      title: "Feature Requests",
      description: "Suggest new features or improvements",
      link: "/help-center/feature-requests"
    },
  ];

  const [searchQuery, setSearchQuery] = useState('');

  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return helpTopics;
    
    const query = searchQuery.toLowerCase().trim();
    return helpTopics.filter(topic => 
      topic.title.toLowerCase().includes(query) || 
      topic.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">How can we help you?</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find answers to common questions or get in touch with our support team
          </p>
          <div className="mt-8 max-w-2xl mx-auto relative">
            <Input
              type="text"
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-12 pr-4 py-6 text-lg border-2 border-gray-200 focus:border-primary rounded-xl shadow-sm"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredTopics.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <h3 className="text-xl font-medium text-gray-700 mb-2">No results found</h3>
              <p className="text-gray-500">Try a different search term or browse our help topics below</p>
            </div>
          ) : (
            filteredTopics.map((topic, index) => (
            <Link href={topic.link} key={index} className="group">
              <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary">
                <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {topic.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg group-hover:text-primary">{topic.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{topic.description}</p>
                </CardContent>
              </Card>
            </Link>
          )))}
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">Still need help?</CardTitle>
            <CardDescription>
              Can't find what you're looking for? Our support team is here to help.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                <Link href="/contact-support" className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Contact Support
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="mailto:support@premierpro.com" className="flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5" />
                  Email Us
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
