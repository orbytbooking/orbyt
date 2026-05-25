"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

type TabItem = {
  value: string;
  label: string;
  href: string;
  isActive: (pathname: string, searchParams: URLSearchParams) => boolean;
};

function buildTabs(industry: string, industryId: string | null): TabItem[] {
  const enc = encodeURIComponent(industry);
  const idQs = industryId ? `&industryId=${encodeURIComponent(industryId)}` : "";
  const scopeQs = "&bookingFormScope=form5";
  const base = "form-5";

  return [
    {
      value: "locations",
      label: "Locations",
      href: `/admin/settings/industries/${base}/locations?industry=${enc}${idQs}${scopeQs}`,
      isActive: (p) => p.includes(`/${base}/locations`),
    },
    {
      value: "frequencies",
      label: "Frequencies",
      href: `/admin/settings/industries/${base}/frequencies?industry=${enc}${idQs}${scopeQs}`,
      isActive: (p) => p.includes(`/${base}/frequencies`),
    },
    {
      value: "service-category",
      label: "Service Category",
      href: `/admin/settings/industries/${base}/service-category?industry=${enc}${idQs}${scopeQs}`,
      isActive: (p) => p.includes(`/${base}/service-category`),
    },
    {
      value: "extras",
      label: "Extras",
      href: `/admin/settings/industries/${base}/extras?industry=${enc}${idQs}${scopeQs}&listingKind=extra`,
      isActive: (p) => p.includes(`/${base}/extras`),
    },
    {
      value: "custom-sections",
      label: "Custom Sections",
      href: `/admin/settings/design?industry=${enc}${idQs}${scopeQs}`,
      isActive: () => false,
    },
  ];
}

export default function Form5Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const industry = params.get("industry") || "Industry";
  const industryId = params.get("industryId");

  const tabs = useMemo(() => buildTabs(industry, industryId), [industry, industryId]);

  const activeTab = useMemo(() => {
    const hit = tabs.find((t) => t.isActive(pathname, params));
    return hit?.value ?? tabs[0]?.value ?? "locations";
  }, [tabs, pathname, params]);

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
          {industry} - Form 5
        </h2>
      </div>

      <div className="border-b">
        <Tabs value={activeTab} className="w-full">
          <TabsList className="h-auto p-0 bg-transparent w-full justify-start rounded-none border-b-0 flex-wrap gap-y-1">
            {tabs.map((tab) => {
              const isActive = tab.isActive(pathname, params);
              return (
                <Link href={tab.href} key={tab.value} className="flex-shrink-0">
                  <TabsTrigger
                    value={tab.value}
                    className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {tab.label}
                  </TabsTrigger>
                </Link>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      <div className="pt-6">{children}</div>
    </div>
  );
}
