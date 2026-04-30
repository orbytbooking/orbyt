"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ChevronDown, Loader2 } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import {
  bookingFormScopeFromSearchParams,
  parseListingKindParam,
} from "@/lib/bookingFormScope";

type Extra = {
  id: string;
  business_id: string;
  industry_id: string;
  name: string;
  time_minutes: number;
  service_category?: string;
  price: number;
  price_merchant_location?: number | null;
  display: "frontend-backend-admin" | "backend-admin" | "admin-only";
  qty_based: boolean;
  exempt_from_discount?: boolean;
  description?: string;
  show_based_on_frequency?: boolean;
  frequency_options?: string[];
  show_based_on_service_category?: boolean;
  service_category_options?: string[];
  show_based_on_variables?: boolean;
  variable_options?: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  time_minutes_merchant_location?: number | null;
};

export default function IndustryFormExtrasPage() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const industryIdFromUrl = params.get("industryId");
  const bookingFormScope = bookingFormScopeFromSearchParams(params.get("bookingFormScope"), pathname);
  const listingKindFilter = parseListingKindParam(params.get("listingKind"));
  const scopeQs =
    `&bookingFormScope=${bookingFormScope}` +
    (listingKindFilter ? `&listingKind=${listingKindFilter}` : "");
  const extrasSectionLabel = listingKindFilter === "addon" ? "Add-ons" : "Extras";
  const formSegment = "form-4";
  const isSinglePageCatalog = bookingFormScope === "form2" || bookingFormScope === "form3";
  const sectionBasePath =
    isSinglePageCatalog && listingKindFilter === "addon"
      ? `/admin/settings/industries/${formSegment}/add-ons`
      : isSinglePageCatalog
        ? `/admin/settings/industries/${formSegment}/extras`
      : `/admin/settings/industries/${formSegment}/extras`;
  const { currentBusiness } = useBusiness();
  
  const [extras, setExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);
  const [industryId, setIndustryId] = useState<string | null>(industryIdFromUrl);

  const formatDuration = (minutesTotal: number) => {
    const safeMinutes = Number.isFinite(minutesTotal) ? Math.max(0, minutesTotal) : 0;
    const hours = Math.floor(safeMinutes / 60);
    const minutes = safeMinutes % 60;
    return hours > 0 ? `${hours}Hr` : `${minutes}Min`;
  };
  

  useEffect(() => {
    if (!currentBusiness?.id) return;
    if (industryIdFromUrl) {
      setIndustryId(industryIdFromUrl);
      fetchExtras(industryIdFromUrl);
    } else if (currentBusiness && industry) {
      // Fetch industryId from API if not in URL
      fetchIndustryId();
    } else if (!currentBusiness) {
      // Still waiting for business context to load
      const timeout = setTimeout(() => {
        if (!industryId) {
          setLoading(false);
          toast.error('Unable to load industry information. Please try again.');
        }
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [industryIdFromUrl, currentBusiness, industry, bookingFormScope, listingKindFilter]);

  const fetchIndustryId = async () => {
    if (!currentBusiness) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
      const data = await response.json();
      const currentIndustry = data.industries?.find((ind: any) => ind.name === industry);
      
      if (currentIndustry) {
        setIndustryId(currentIndustry.id);
        fetchExtras(currentIndustry.id);
      } else {
        toast.error('Industry not found');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching industry:', error);
      toast.error('Failed to load industry');
      setLoading(false);
    }
  };

  const fetchExtras = async (id?: string) => {
    const targetId = id || industryId;
    if (!targetId || !currentBusiness?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `/api/extras?industryId=${targetId}&businessId=${currentBusiness.id}${scopeQs}`,
      );
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch extras');
      }
      
      setExtras(data.extras || []);
    } catch (error) {
      console.error('Error fetching extras:', error);
      toast.error('Failed to load extras');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    try {
      const response = await fetch(
        `/api/extras?id=${id}&industryId=${industryId}&businessId=${currentBusiness?.id ?? ""}`,
        {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete extra');
      }
      
      setExtras(prev => prev.filter(r => r.id !== id));
      toast.success('Extra deleted successfully');
    } catch (error) {
      console.error('Error deleting extra:', error);
      toast.error('Failed to delete extra');
    }
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = extras.findIndex(r => r.id === id);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= extras.length) return;
    const copy = [...extras];
    const [item] = copy.splice(idx, 1);
    copy.splice(j, 0, item);
    
    const updates = copy.map((extra, index) => ({
      id: extra.id,
      sort_order: index
    }));
    
    try {
      const response = await fetch('/api/extras/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, industryId, businessId: currentBusiness?.id })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update order');
      }
      
      setExtras(copy);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  const updatePriority = async () => {
    const updates = extras.map((extra, index) => ({
      id: extra.id,
      sort_order: index
    }));
    
    try {
      const response = await fetch('/api/extras/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, industryId, businessId: currentBusiness?.id })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update priority');
      }
      
      toast.success('Extras order updated successfully');
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`${sectionBasePath}/new?industry=${encodeURIComponent(industry)}&industryId=${industryId}${scopeQs}`)}>Add New</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{extrasSectionLabel}</CardTitle>
          <CardDescription>
            {listingKindFilter === "addon"
              ? `Package add-ons for ${industry} (Form 2 configuration).`
              : `Manage upsell extras for ${industry}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Display</TableHead>
                    <TableHead>Qty Based</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : extras.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      {listingKindFilter === "addon"
                        ? "Package add-ons not found."
                        : "No extras found. Click Add New to create one."}
                    </TableCell>
                  </TableRow>
                ) : null}
                {!loading && extras.map((extra) => {
                  const saPrice = Number(extra.price || 0);
                  const mlPrice =
                    extra.price_merchant_location != null
                      ? Number(extra.price_merchant_location)
                      : saPrice;
                  const saTime = Number(extra.time_minutes || 0);
                  const mlTime =
                    extra.time_minutes_merchant_location != null
                      ? Number(extra.time_minutes_merchant_location)
                      : saTime;
                  
                  // Map display values to readable labels
                  const displayLabel = extra.display === "frontend-backend-admin"
                    ? "Both"
                    : extra.display === "backend-admin"
                    ? "Customer backend & admin"
                    : "Admin only";
                  
                  return (
                  <TableRow key={extra.id}>
                    <TableCell className="font-medium">{extra.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <span className="rounded bg-cyan-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">SA</span>
                          ${saPrice.toFixed(2)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="rounded bg-orange-400 px-1.5 py-0.5 text-[10px] font-semibold text-white">ML</span>
                          ${mlPrice.toFixed(2)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <span className="rounded bg-cyan-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">SA</span>
                          {formatDuration(saTime)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="rounded bg-orange-400 px-1.5 py-0.5 text-[10px] font-semibold text-white">ML</span>
                          {formatDuration(mlTime)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{displayLabel}</TableCell>
                    <TableCell className="text-center">
                      <span className={extra.qty_based ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {extra.qty_based ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{extra.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">Options <ChevronDown className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`${sectionBasePath}/new?industry=${encodeURIComponent(industry)}&industryId=${industryId}&editId=${extra.id}${scopeQs}`)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => move(extra.id, -1)}>Move Up</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => move(extra.id, 1)}>Move Down</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => remove(extra.id)} className="text-red-600">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-start">
        <Button variant="default" onClick={updatePriority}>Update Priority</Button>
      </div>
    </div>
  );
}
