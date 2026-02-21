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
  pricingParams: number;
};

export default function IndustryForm1Page() {
  const params = useSearchParams();
  const industry = params.get("industry") || "Industry";
  const { currentBusiness } = useBusiness();
  const [industryId, setIndustryId] = useState<string | null>(null);
  const [stats, setStats] = useState<FormStats>({
    serviceCategories: 0,
    extras: 0,
    frequencies: 0,
    locations: 0,
    pricingParams: 0,
  });

  useEffect(() => {
    if (!currentBusiness || !industry) return;

    const fetchIndustryData = async () => {
      try {
        // Fetch the industry ID
        const industriesResponse = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const industriesData = await industriesResponse.json();
        const currentIndustry = industriesData.industries?.find((ind: any) => ind.name === industry);
        
        if (currentIndustry) {
          setIndustryId(currentIndustry.id);
          
          // Fetch all stats from database
          const extrasResponse = await fetch(`/api/extras?industryId=${currentIndustry.id}`);
          const extrasData = await extrasResponse.json();
          const extrasCount = extrasData.extras?.length || 0;

          const serviceCategoriesResponse = await fetch(`/api/service-categories?industryId=${currentIndustry.id}`);
          const serviceCategoriesData = await serviceCategoriesResponse.json();
          const serviceCategories = serviceCategoriesData.serviceCategories?.length || 0;

          const frequenciesResponse = await fetch(`/api/industry-frequency?industryId=${currentIndustry.id}&includeAll=true`);
          const frequenciesData = await frequenciesResponse.json();
          const frequencies = frequenciesData.frequencies?.length || 0;

          const locationsResponse = await fetch(`/api/locations?business_id=${currentBusiness.id}`);
          const locationsData = await locationsResponse.json();
          const locations = locationsData.locations?.length || 0;

          const pricingResponse = await fetch(`/api/pricing-parameters?industryId=${currentIndustry.id}`);
          const pricingData = await pricingResponse.json();
          const pricingParams = pricingData.pricingParameters?.length || 0;

          setStats({
            serviceCategories,
            extras: extrasCount,
            frequencies,
            locations,
            pricingParams,
          });
        }
      } catch (error) {
        console.error('Error fetching industry data:', error);
      }
    };

    fetchIndustryData();
  }, [industry, currentBusiness]);

  return (
    <div className="space-y-6">
      {industry === "Barber" && (
        <Card className="border-cyan-500 border-2 bg-cyan-50">
          <CardHeader>
            <CardTitle>Barber-Specific Features (Booksy Style)</CardTitle>
            <CardDescription>Configure barber booking essentials and advanced options.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold">Staff Selection Logic</label>
                <select className="w-full border rounded px-2 py-1 mt-1">
                  <option>Customer picks barber</option>
                  <option>Auto-assign (any barber)</option>
                  <option>Both options</option>
                </select>
              </div>
              <div>
                <label className="font-semibold">Service-to-Staff Assignment</label>
                <input type="checkbox" className="mr-2" /> Enable specific barbers for each service
              </div>
              <div>
                <label className="font-semibold">Duration-Based Scheduling</label>
                <input type="checkbox" className="mr-2" /> Add-ons increase appointment time automatically
              </div>
              <div>
                <label className="font-semibold">Deposits & No-Show Rules</label>
                <input type="checkbox" className="mr-2" /> Require deposit for some services<br />
                <input type="checkbox" className="mr-2" /> Enable cancellation window & fee
              </div>
              <div>
                <label className="font-semibold">Tips & Card on File</label>
                <input type="checkbox" className="mr-2" /> Allow storing card for tips/fast checkout
              </div>
              <div>
                <label className="font-semibold">Client Rebooking & Reminders</label>
                <input type="checkbox" className="mr-2" /> Enable "Book again" + reminders
              </div>
              <div>
                <label className="font-semibold">Portfolio & Service Menu</label>
                <input type="checkbox" className="mr-2" /> Show public booking page with portfolios
              </div>
              <div>
                <label className="font-semibold">Packages/Memberships</label>
                <input type="checkbox" className="mr-2" /> Enable recurring memberships/packages
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{industry} – Booking Form (Form 1)</CardTitle>
          <CardDescription>
            Configure the main booking form for this industry.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Work through the sections below to define how customers book {industry.toLowerCase()} services:
            categories, extras, visit frequency, locations, and pricing parameters.
          </p>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Service Categories</CardTitle>
                <CardDescription>
                  Group services (e.g. Standard Clean, Deep Clean, Move‑Out) for this industry.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-semibold">{stats.serviceCategories}</p>
                  <p className="text-xs text-muted-foreground">categories configured</p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/admin/settings/industries/form-1/service-category?industry=${encodeURIComponent(industry)}`}>
                    Manage
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Extras &amp; Add‑ons</CardTitle>
                <CardDescription>
                  Upsells such as inside fridge, inside oven, windows, etc. shown on the form.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-semibold">{stats.extras}</p>
                  <p className="text-xs text-muted-foreground">extras configured</p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/admin/settings/industries/form-1/extras?industry=${encodeURIComponent(industry)}&industryId=${industryId || ''}`}>
                    Manage
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Frequencies</CardTitle>
                <CardDescription>
                  Visit frequency options like weekly, bi‑weekly, monthly, one‑time.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-semibold">{stats.frequencies}</p>
                  <p className="text-xs text-muted-foreground">frequencies configured</p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/admin/settings/industries/form-1/frequencies?industry=${encodeURIComponent(industry)}`}>
                    Manage
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Locations</CardTitle>
                <CardDescription>
                  Service areas, cities or ZIP codes you accept bookings from.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-semibold">{stats.locations}</p>
                  <p className="text-xs text-muted-foreground">locations configured</p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/admin/settings/industries/form-1/locations?industry=${encodeURIComponent(industry)}`}>
                    Manage
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pricing Parameters</CardTitle>
                <CardDescription>
                  Size‑based pricing (sq ft, bedrooms, bathrooms) and time estimates.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-semibold">{stats.pricingParams}</p>
                  <p className="text-xs text-muted-foreground">pricing rows configured</p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/admin/settings/industries/form-1/pricing-parameter?industry=${encodeURIComponent(industry)}`}>
                    Manage
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-muted/40 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">How this connects to bookings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Once these sections are configured, your public booking form can use them to show the right categories,
                extras, visit frequencies, locations, and price estimates.
              </p>
              <p>
                You can revisit this screen any time to adjust how Form 1 behaves for {industry.toLowerCase()} as your
                business evolves.
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
