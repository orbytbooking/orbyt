"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Layout, Palette, Save, Globe, ShoppingCart, HelpCircle, FileText, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { FAQsManager } from "@/components/admin/FAQsManager";
import { JobOpeningsManager } from "@/components/admin/JobOpeningsManager";

const WebsiteBuilderTab = () => {
  const [selectedTheme, setSelectedTheme] = useState('modern');
  const router = useRouter();
  
  const themes = [
    { 
      id: 'modern', 
      name: 'Modern', 
      isFree: true,
      colors: {
        primary: 'bg-blue-500',
        text: 'text-gray-800',
        bg: 'bg-white',
        button: 'bg-blue-500 hover:bg-blue-600 text-white',
        nav: 'bg-gray-50',
        navText: 'text-gray-600'
      }
    },
    { 
      id: 'classic', 
      name: 'Classic', 
      isFree: false,
      colors: {
        primary: 'bg-emerald-600',
        text: 'text-gray-700',
        bg: 'bg-gray-50',
        button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        nav: 'bg-emerald-50',
        navText: 'text-emerald-800'
      }
    },
    { 
      id: 'minimal', 
      name: 'Minimal', 
      isFree: true,
      colors: {
        primary: 'bg-white',
        text: 'text-gray-900',
        bg: 'bg-gray-100',
        button: 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300',
        nav: 'bg-white',
        navText: 'text-gray-700'
      }
    },
    { 
      id: 'professional', 
      name: 'Professional', 
      isFree: false,
      colors: {
        primary: 'bg-indigo-600',
        text: 'text-gray-900',
        bg: 'bg-white',
        button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        nav: 'bg-white border-b',
        navText: 'text-gray-700'
      }
    },
  ];

  const currentTheme = themes.find(theme => theme.id === selectedTheme) || themes[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Preview Section - Left Side */}
      <div className="lg:col-span-3">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Website Preview - {currentTheme.name} Theme</CardTitle>
                <CardDescription>Preview of your website with the selected theme</CardDescription>
              </div>
              <Button
                onClick={() => router.push("/admin/website-builder")}
                className="border border-cyan-500/30 bg-white/5 neon-cyan text-cyan-300 hover:text-white hover:bg-gradient-to-r hover:from-cyan-500 hover:to-cyan-600"
              >
                <Layout className="h-4 w-4 mr-2" />
                Edit Website
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`relative aspect-video border rounded-lg overflow-hidden ${currentTheme.colors.bg} p-6`}>
              <div className="h-full flex flex-col">
                <div className={`flex-1 flex flex-col items-center justify-center text-center ${currentTheme.colors.text}`}>
                  <h2 className="text-2xl sm:text-3xl font-bold">Orbyt Cleaners</h2>
                </div>
                <div className={`${currentTheme.colors.nav} p-3 rounded-lg flex justify-center`}>
                  <a 
                    href="/builder" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs px-3 py-1.5 rounded ${currentTheme.colors.button} hover:opacity-90 transition-opacity`}
                  >
                    Preview Website
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Theme Selection - Right Side */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Select a Theme</CardTitle>
            <CardDescription>Click to preview each theme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {themes.map((theme) => (
                <div 
                  key={theme.id}
                  className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                    selectedTheme === theme.id 
                      ? 'ring-2 ring-primary' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedTheme(theme.id)}
                >
                  <div className={`h-28 ${theme.colors.bg} flex items-center justify-center`}>
                    <div className={`text-center p-2 ${theme.colors.text}`}>
                      <div className="font-medium text-sm mb-1">{theme.name} Theme</div>
                      <div className="text-xs">
                        {theme.isFree ? 'Free' : 'Premium'}
                      </div>
                    </div>
                  </div>
                  <div className="p-2 bg-muted/30">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {theme.name}
                      </span>
                      {!theme.isFree && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                          $19.99
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <div className="space-y-3">
                <div>
                  <div className="font-medium">Selected Theme</div>
                  <div className="text-sm text-muted-foreground">
                    {themes.find(t => t.id === selectedTheme)?.name}
                    {!themes.find(t => t.id === selectedTheme)?.isFree && ' (Premium)'}
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  disabled={themes.find(t => t.id === selectedTheme)?.isFree}
                >
                  {themes.find(t => t.id === selectedTheme)?.isFree 
                    ? 'Theme Active' 
                    : 'Buy Theme - $19.99'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ChangeDomainTab = () => {
  const currentDomain = 'localhost:3000/builder';
  const domainStatus = 'Connected';
  const dateAdded = '2025-11-28';
  
  const handleViewDomain = (domain: string) => {
    window.open(`http://${domain}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Domain Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline">
          <Globe className="mr-2 h-4 w-4" />
          Connect Existing Domain
        </Button>
        <Button variant="outline">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Buy New Domain
        </Button>
      </div>

      {/* Current Domain Table */}
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4 font-medium">Domain</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Date Added</th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-muted/50">
              <td className="p-4">{currentDomain}</td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    domainStatus === 'Connected' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  {domainStatus}
                </div>
              </td>
              <td className="p-4">{new Date(dateAdded).toLocaleDateString()}</td>
              <td className="p-4 text-right">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleViewDomain(currentDomain)}
                >
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">View</span>
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FAQTab = () => <FAQsManager />;

const JobFormTab = () => <JobOpeningsManager />;

export default function DesignFormsWebsitePage() {
  const [activeTab, setActiveTab] = useState("website-builder");

  return (
    <div className="space-y-6">
      <Card>
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger 
              value="website-builder" 
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-4 px-6"
            >
              <Palette className="h-4 w-4 mr-2" />
              Website Builder & Theme
            </TabsTrigger>
            <TabsTrigger 
              value="change-domain" 
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-4 px-6"
            >
              <Globe className="h-4 w-4 mr-2" />
              Change Domain
            </TabsTrigger>
            <TabsTrigger 
              value="faqs" 
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-4 px-6"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              FAQs
            </TabsTrigger>
            <TabsTrigger 
              value="job-form" 
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-4 px-6"
            >
              <FileText className="h-4 w-4 mr-2" />
              Job Form
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="website-builder">
              <WebsiteBuilderTab />
            </TabsContent>
            <TabsContent value="change-domain">
              <ChangeDomainTab />
            </TabsContent>
            <TabsContent value="faqs">
              <FAQTab />
            </TabsContent>
            <TabsContent value="job-form">
              <JobFormTab />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
