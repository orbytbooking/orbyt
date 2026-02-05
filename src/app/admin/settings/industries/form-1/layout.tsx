"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export default function Form1Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const industry = params.get("industry") || "Industry";

  // Get the current tab based on the pathname
  const currentTab = pathname.split("/").pop() || "";

  // Define the tabs
  const tabs = [
    { id: "locations", label: "Locations" },
    { id: "frequencies", label: "Frequencies" },
    { id: "service-category", label: "Service Category" },
    { id: "pricing-parameter", label: "Pricing Parameter" },
    { id: "extras", label: "Extras" },
  ];

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{industry} - Form 1</h2>
      </div>

      <div className="border-b">
        <Tabs 
          value={pathname.split('/').pop() || 'locations'}
          className="w-full"
        >
          <TabsList className="h-auto p-0 bg-transparent w-full justify-start rounded-none border-b-0">
            {tabs.map((tab) => {
              const href = `/admin/settings/industries/form-1/${tab.id}?industry=${encodeURIComponent(industry)}`;
              const isActive = pathname.endsWith(tab.id);
              
              return (
                <Link href={href} key={tab.id} className="flex-shrink-0">
                  <TabsTrigger 
                    value={tab.id}
                    className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {tab.label}
                  </TabsTrigger>
                </Link>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      <div className="pt-6">
        {children}
      </div>
    </div>
  );
}
