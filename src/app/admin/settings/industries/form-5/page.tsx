"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/contexts/BusinessContext";

type FormStats = {
  serviceCategories: number;
  extras: number;
  frequencies: number;
  locations: number;
};

type IndustryRow = {
  id: string;
  name: string;
};

export default function IndustryForm5Page() {
  const params = useSearchParams();
  const industryName = params.get("industry") || "Industry";
  const industryIdFromUrl = params.get("industryId");
  const { currentBusiness } = useBusiness();
  const [industryId, setIndustryId] = useState<string | null>(industryIdFromUrl);
  const [stats, setStats] = useState<FormStats>({
    serviceCategories: 0,
    extras: 0,
    frequencies: 0,
    locations: 0,
  });

  useEffect(() => {
    if (industryIdFromUrl) setIndustryId(industryIdFromUrl);
  }, [industryIdFromUrl]);

  useEffect(() => {
    if (!currentBusiness || !industryName) return;

    const fetchIndustryData = async () => {
      try {
        const industriesResponse = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const industriesData = await industriesResponse.json();
        const currentIndustry = industriesData.industries?.find(
          (ind: IndustryRow) => ind.name === industryName,
        ) as IndustryRow | undefined;

        if (!currentIndustry) return;

        const id = currentIndustry.id;
        setIndustryId(id);
        const scopeQs = "bookingFormScope=form5";
        const bid = encodeURIComponent(currentBusiness.id);
        const iid = encodeURIComponent(id);

        const [serviceCategoriesResponse, frequenciesResponse, extrasResponse, locationsResponse] =
          await Promise.all([
            fetch(`/api/service-categories?industryId=${iid}&${scopeQs}`),
            fetch(`/api/industry-frequency?industryId=${iid}&includeAll=true&${scopeQs}`),
            fetch(`/api/extras?industryId=${iid}&businessId=${bid}&${scopeQs}&listingKind=extra`),
            fetch(`/api/locations?business_id=${bid}`),
          ]);

        const serviceCategoriesData = await serviceCategoriesResponse.json();
        const frequenciesData = await frequenciesResponse.json();
        const extrasData = await extrasResponse.json();
        const locationsData = await locationsResponse.json();

        setStats({
          serviceCategories: serviceCategoriesData.serviceCategories?.length || 0,
          extras: extrasData.extras?.length || 0,
          frequencies: frequenciesData.frequencies?.length || 0,
          locations: locationsData.locations?.length || 0,
        });
      } catch (error) {
        console.error("Error fetching industry data:", error);
      }
    };

    void fetchIndustryData();
  }, [industryName, currentBusiness?.id, industryIdFromUrl]);

  const scopeQs = "&bookingFormScope=form5";
  const idQs = industryId ? `&industryId=${encodeURIComponent(industryId)}` : "";
  const formBasePath = "form-5";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {industryName} – Booking form (Form 5)
          </CardTitle>
          <CardDescription>
            Form 5 uses service categories with hourly rates. The booking quote is hourly rate multiplied by selected duration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Setup order: Locations, Frequencies, Service Category, Extras, then Custom Sections.
          </p>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Service Categories</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-semibold">{stats.serviceCategories}</p>
                  <p className="text-xs text-muted-foreground">configured</p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/admin/settings/industries/${formBasePath}/service-category?industry=${encodeURIComponent(industryName)}${idQs}${scopeQs}`}>Manage</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Frequencies</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-semibold">{stats.frequencies}</p>
                  <p className="text-xs text-muted-foreground">configured</p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/admin/settings/industries/${formBasePath}/frequencies?industry=${encodeURIComponent(industryName)}${idQs}${scopeQs}`}>Manage</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Locations</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-semibold">{stats.locations}</p>
                  <p className="text-xs text-muted-foreground">configured</p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/admin/settings/industries/${formBasePath}/locations?industry=${encodeURIComponent(industryName)}${idQs}${scopeQs}`}>Manage</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Extras</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-semibold">{stats.extras}</p>
                  <p className="text-xs text-muted-foreground">configured</p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/admin/settings/industries/${formBasePath}/extras?industry=${encodeURIComponent(industryName)}${idQs}${scopeQs}&listingKind=extra`}>Manage</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
