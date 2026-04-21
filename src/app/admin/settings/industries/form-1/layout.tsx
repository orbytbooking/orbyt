"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  bookingFormScopeFromSearchParams,
  type BookingFormScope,
} from "@/lib/bookingFormScope";

type TabItem = {
  value: string;
  label: string;
  href: string;
  isActive: (pathname: string, searchParams: URLSearchParams) => boolean;
};

function buildTabs(
  industry: string,
  scope: BookingFormScope,
  industryId: string | null,
): TabItem[] {
  const enc = encodeURIComponent(industry);
  const scopeQs = `&bookingFormScope=${scope}`;
  const idQs = industryId ? `&industryId=${encodeURIComponent(industryId)}` : "";

  if (scope === "form2") {
    return [
      {
        value: "locations",
        label: "Locations",
        href: `/admin/settings/industries/form-1/locations?industry=${enc}${idQs}${scopeQs}`,
        isActive: (p) => p.includes("/form-1/locations"),
      },
      {
        value: "frequencies",
        label: "Frequencies",
        href: `/admin/settings/industries/form-1/frequencies?industry=${enc}${idQs}${scopeQs}`,
        isActive: (p) => p.includes("/form-1/frequencies"),
      },
      {
        value: "service-category",
        label: "Service Category",
        href: `/admin/settings/industries/form-1/service-category?industry=${enc}${idQs}${scopeQs}`,
        isActive: (p) => p.includes("/form-1/service-category"),
      },
      {
        value: "items",
        label: "Items",
        href: `/admin/settings/industries/form-1/pricing-parameter/manage-variables?industry=${enc}${idQs}${scopeQs}`,
        isActive: (p) => p.includes("/pricing-parameter/manage-variables"),
      },
      {
        value: "packages",
        label: "Packages",
        href: `/admin/settings/industries/form-1/pricing-parameter?industry=${enc}${idQs}${scopeQs}`,
        isActive: (p) =>
          p.includes("/form-1/pricing-parameter") &&
          !p.includes("/pricing-parameter/manage-variables"),
      },
      {
        value: "addons",
        label: "Add-ons",
        href: `/admin/settings/industries/form-1/extras?industry=${enc}${idQs}${scopeQs}&listingKind=addon`,
        isActive: (p, sp) =>
          p.includes("/form-1/extras") && sp.get("listingKind") === "addon",
      },
      {
        value: "extras",
        label: "Extras",
        href: `/admin/settings/industries/form-1/extras?industry=${enc}${idQs}${scopeQs}&listingKind=extra`,
        isActive: (p, sp) =>
          p.includes("/form-1/extras") && sp.get("listingKind") !== "addon",
      },
      {
        value: "custom-sections",
        label: "Custom Sections",
        href: `/admin/settings/design?industry=${enc}${idQs}${scopeQs}`,
        /** Design is outside this layout; tab cannot show active while on that route. */
        isActive: () => false,
      },
    ];
  }

  return [
    {
      value: "locations",
      label: "Locations",
      href: `/admin/settings/industries/form-1/locations?industry=${enc}${idQs}${scopeQs}`,
      isActive: (p) => p.includes("/form-1/locations"),
    },
    {
      value: "frequencies",
      label: "Frequencies",
      href: `/admin/settings/industries/form-1/frequencies?industry=${enc}${idQs}${scopeQs}`,
      isActive: (p) => p.includes("/form-1/frequencies"),
    },
    {
      value: "service-category",
      label: "Service Category",
      href: `/admin/settings/industries/form-1/service-category?industry=${enc}${idQs}${scopeQs}`,
      isActive: (p) => p.includes("/form-1/service-category"),
    },
    {
      value: "pricing-parameter",
      label: "Pricing Parameter",
      href: `/admin/settings/industries/form-1/pricing-parameter?industry=${enc}${idQs}${scopeQs}`,
      isActive: (p) =>
        p.includes("/form-1/pricing-parameter") &&
        !p.includes("/pricing-parameter/manage-variables"),
    },
    {
      value: "extras",
      label: "Extras",
      href: `/admin/settings/industries/form-1/extras?industry=${enc}${idQs}${scopeQs}&listingKind=extra`,
      isActive: (p, sp) =>
        p.includes("/form-1/extras") && sp.get("listingKind") !== "addon",
    },
  ];
}

export default function Form1Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const industry = params.get("industry") || "Industry";
  const industryId = params.get("industryId");
  const bookingFormScope = bookingFormScopeFromSearchParams(params.get("bookingFormScope"));

  const tabs = useMemo(
    () => buildTabs(industry, bookingFormScope, industryId),
    [industry, bookingFormScope, industryId],
  );

  const activeTab = useMemo(() => {
    const hit = tabs.find((t) => t.isActive(pathname, params));
    return hit?.value ?? tabs[0]?.value ?? "locations";
  }, [tabs, pathname, params]);

  const formLabel = bookingFormScope === "form2" ? "Form 2" : "Form 1";

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {industry} - {formLabel}
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
