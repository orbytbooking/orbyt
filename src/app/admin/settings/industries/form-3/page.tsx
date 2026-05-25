"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/contexts/BusinessContext";
import {
  parseBookingFormScopeParam,
  type BookingFormScope,
} from "@/lib/bookingFormScope";

type FormStats = {
  serviceCategories: number;
  extras: number;
  addons: number;
  frequencies: number;
  locations: number;
  pricingParams: number;
  items: number;
};

type IndustryRow = {
  id: string;
  name: string;
  customer_booking_form_layout?: string | null;
};

export default function IndustryForm1Page() {
  const params = useSearchParams();
  const industryName = params.get("industry") || "Industry";
  const industryIdFromUrl = params.get("industryId");
  const { currentBusiness } = useBusiness();
  const [industryId, setIndustryId] = useState<string | null>(industryIdFromUrl);
  const [bookingFormScope, setBookingFormScope] = useState<BookingFormScope>("form3");
  const [stats, setStats] = useState<FormStats>({
    serviceCategories: 0,
    extras: 0,
    addons: 0,
    frequencies: 0,
    locations: 0,
    pricingParams: 0,
    items: 0,
  });

  useEffect(() => {
    if (industryIdFromUrl) setIndustryId(industryIdFromUrl);
  }, [industryIdFromUrl]);

  const bookingFormScopeKey = params.get("bookingFormScope") ?? "";

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

        const fromUrl = parseBookingFormScopeParam(bookingFormScopeKey || null);
        const layout = currentIndustry.customer_booking_form_layout;
        const layoutDefault: BookingFormScope =
          layout === "form4"
            ? "form4"
            : layout === "form3"
              ? "form3"
              : layout === "form2"
                ? "form2"
                : "form3";
        const effectiveScope: BookingFormScope = fromUrl ?? layoutDefault;
        setBookingFormScope(effectiveScope);

        const scopeQs = `bookingFormScope=${effectiveScope}`;
        const bid = encodeURIComponent(currentBusiness.id);
        const iid = encodeURIComponent(id);

        const serviceCategoriesResponse = await fetch(
          `/api/service-categories?industryId=${iid}&${scopeQs}`,
        );
        const serviceCategoriesData = await serviceCategoriesResponse.json();
        const serviceCategories = serviceCategoriesData.serviceCategories?.length || 0;

        const frequenciesResponse = await fetch(
          `/api/industry-frequency?industryId=${iid}&includeAll=true&${scopeQs}`,
        );
        const frequenciesData = await frequenciesResponse.json();
        const frequencies = frequenciesData.frequencies?.length || 0;

        const locationsResponse = await fetch(`/api/locations?business_id=${currentBusiness.id}`);
        const locationsData = await locationsResponse.json();
        const locations = locationsData.locations?.length || 0;

        const pricingResponse = await fetch(
          `/api/pricing-parameters?industryId=${iid}&businessId=${bid}&${scopeQs}`,
        );
        const pricingData = await pricingResponse.json();
        const pricingParams = pricingData.pricingParameters?.length || 0;

        let extrasCount = 0;
        let addonsCount = 0;
        let itemsCount = 0;

        if (effectiveScope === "form2" || effectiveScope === "form3") {
          const [addonsRes, extrasRes, variablesRes] = await Promise.all([
            fetch(`/api/extras?industryId=${iid}&businessId=${bid}&${scopeQs}&listingKind=addon`),
            fetch(`/api/extras?industryId=${iid}&businessId=${bid}&${scopeQs}&listingKind=extra`),
            fetch(`/api/pricing-variables?industryId=${iid}&businessId=${bid}&${scopeQs}`),
          ]);
          const addonsData = await addonsRes.json();
          const extrasData = await extrasRes.json();
          const variablesData = await variablesRes.json();
          addonsCount = addonsData.extras?.length || 0;
          extrasCount = extrasData.extras?.length || 0;
          itemsCount = variablesData.variables?.length || 0;
        } else {
          const extrasResponse = await fetch(
            `/api/extras?industryId=${iid}&businessId=${bid}&${scopeQs}&listingKind=extra`,
          );
          const extrasData = await extrasResponse.json();
          extrasCount = extrasData.extras?.length || 0;
        }

        setStats({
          serviceCategories,
          extras: extrasCount,
          addons: addonsCount,
          frequencies,
          locations,
          pricingParams,
          items: itemsCount,
        });
      } catch (error) {
        console.error("Error fetching industry data:", error);
      }
    };

    void fetchIndustryData();
  }, [industryName, currentBusiness?.id, bookingFormScopeKey, industryIdFromUrl]);

  const isForm2 = bookingFormScope === "form2";
  const isForm3 = bookingFormScope === "form3";
  const isForm4 = bookingFormScope === "form4";
  const isExtendedCatalog = isForm2 || isForm3;
  const formBasePath =
    bookingFormScope === "form4"
      ? "form-3"
      : bookingFormScope === "form3"
        ? "form-3"
        : bookingFormScope === "form2"
          ? "form-2"
          : "form-3";
  const formLabel = isForm4 ? "Form 3" : isForm3 ? "Form 3" : isForm2 ? "Form 2" : "Form 3";
  const scopeQs = `&bookingFormScope=${bookingFormScope}`;
  const idQs = industryId ? `&industryId=${encodeURIComponent(industryId)}` : "";

  return (
    <div className="space-y-6">
      {industryName === "Barber" && (
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
          <CardTitle>
            {industryName} – Booking form ({formLabel})
          </CardTitle>
          <CardDescription>
            {isForm4
              ? "Form 3 uses unit-based pricing parameters: set a price and time per unit; the customer’s total is rate × quantity (e.g. $/sq ft × square feet)."
              : isForm3
                ? "Configure the Form 3 booking catalog: locations through items, add-ons, and extras (no packages)."
                : isForm2
                  ? "Configure the single-page booking catalog: locations through packages, add-ons, and extras — same data model as Form 3, scoped for Form 2."
                  : "Configure the main booking form for this industry."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {isForm4
              ? `Set up locations, frequencies, service categories, then unit pricing in Pricing parameters, then extras. Recommended order matches the tabs above.`
              : isForm3
                ? `Work through the same dependency sections as the tabs above so customers see the right frequencies, categories, items, and upsells for ${industryName.toLowerCase()}.`
                : isForm2
                  ? `Work through the same dependency sections as the tabs above so customers see the right frequencies, categories, items, packages, and upsells for ${industryName.toLowerCase()}.`
                  : `Work through the sections below to define how customers book ${industryName.toLowerCase()} services: categories, extras, visit frequency, locations, and pricing parameters.`}
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
                  <Link
                    href={`/admin/settings/industries/${formBasePath}/service-category?industry=${encodeURIComponent(industryName)}${idQs}${scopeQs}`}
                  >
                    Manage
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {isExtendedCatalog ? (
              <>
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Add-ons</CardTitle>
                    <CardDescription>
                      {isForm3
                        ? "Optional upsells tied to items on the Form 3 layout."
                        : "Optional upsells tied to packages on the Form 2 layout."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-semibold">{stats.addons}</p>
                      <p className="text-xs text-muted-foreground">add-ons configured</p>
                    </div>
                    <Button asChild size="sm">
                      <Link
                        href={`/admin/settings/industries/${formBasePath}/add-ons?industry=${encodeURIComponent(industryName)}${idQs}${scopeQs}&listingKind=addon`}
                      >
                        Manage
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Extras</CardTitle>
                    <CardDescription>
                      {isForm3
                        ? "Standard extras list for this industry (Form 3)."
                        : "Standard extras list for this industry (Form 2)."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-semibold">{stats.extras}</p>
                      <p className="text-xs text-muted-foreground">extras configured</p>
                    </div>
                    <Button asChild size="sm">
                      <Link
                        href={`/admin/settings/industries/${formBasePath}/extras?industry=${encodeURIComponent(industryName)}${idQs}${scopeQs}&listingKind=extra`}
                      >
                        Manage
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
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
                    <Link
                      href={`/admin/settings/industries/${formBasePath}/extras?industry=${encodeURIComponent(industryName)}${idQs}${scopeQs}&listingKind=extra`}
                    >
                      Manage
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

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
                  <Link
                    href={`/admin/settings/industries/${formBasePath}/frequencies?industry=${encodeURIComponent(industryName)}${idQs}${scopeQs}`}
                  >
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
                  <Link
                    href={`/admin/settings/industries/${formBasePath}/locations?industry=${encodeURIComponent(industryName)}${idQs}${scopeQs}`}
                  >
                    Manage
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {isForm2 ? (
              <>
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Items</CardTitle>
                    <CardDescription>Service types or line items customers pick before packages.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-semibold">{stats.items}</p>
                      <p className="text-xs text-muted-foreground">items configured</p>
                    </div>
                    <Button asChild size="sm">
                      <Link
                        href={`/admin/settings/industries/form-2/items?industry=${encodeURIComponent(industryName)}${idQs}${scopeQs}`}
                      >
                        Manage
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Packages</CardTitle>
                    <CardDescription>Bundled pricing rows for Form 2 (optional add-on attachment).</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-semibold">{stats.pricingParams}</p>
                      <p className="text-xs text-muted-foreground">packages configured</p>
                    </div>
                    <Button asChild size="sm">
                      <Link
                        href={`/admin/settings/industries/form-2/packages?industry=${encodeURIComponent(industryName)}${idQs}${scopeQs}`}
                      >
                        Manage
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : isForm3 ? (
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Items</CardTitle>
                  <CardDescription>Service types or line items customers pick on the Form 3 layout.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-semibold">{stats.items}</p>
                    <p className="text-xs text-muted-foreground">items configured</p>
                  </div>
                  <Button asChild size="sm">
                    <Link
                      href={`/admin/settings/industries/form-3/items?industry=${encodeURIComponent(industryName)}${idQs}${scopeQs}`}
                    >
                      Manage
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : isForm4 ? (
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pricing Parameters</CardTitle>
                  <CardDescription>
                    Unit structure: price and duration per unit (customer total = rate × quantity).
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-semibold">{stats.pricingParams}</p>
                    <p className="text-xs text-muted-foreground">unit-priced rows configured</p>
                  </div>
                  <Button asChild size="sm">
                    <Link
                      href={`/admin/settings/industries/form-3/pricing-parameter?industry=${encodeURIComponent(industryName)}${idQs}${scopeQs}`}
                    >
                      Manage
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
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
                    <Link
                      href={`/admin/settings/industries/form-3/pricing-parameter?industry=${encodeURIComponent(industryName)}${idQs}${scopeQs}`}
                    >
                      Manage
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="bg-muted/40 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">How this connects to bookings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Once these sections are configured, your public booking form and admin “Add booking” flow use the same{" "}
                {isForm4
                  ? "Form 3 catalog"
                  : isForm3
                    ? "Form 3 catalog"
                    : isForm2
                      ? "Form 2 catalog"
                      : "Form 3 catalog"}{" "}
                for{" "}
                {industryName.toLowerCase()}, scoped by your business.
              </p>
              <p>
                Use the tabs at the top of this section to move between dependencies; counts here stay in sync with that
                navigation.
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
