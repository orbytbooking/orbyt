"use client";

import { useRouter, useSearchParams } from "next/navigation";
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

type Extra = {
  id: string;
  business_id: string;
  industry_id: string;
  name: string;
  time_minutes: number;
  service_category?: string;
  price: number;
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
};

export default function IndustryFormExtrasPage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const industryIdFromUrl = params.get("industryId");
  const { currentBusiness } = useBusiness();
  
  const [extras, setExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);
  const [industryId, setIndustryId] = useState<string | null>(industryIdFromUrl);
  

  useEffect(() => {
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
  }, [industryIdFromUrl, currentBusiness, industry]);

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
    if (!targetId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/extras?industryId=${targetId}`);
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
      const response = await fetch(`/api/extras?id=${id}`, {
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
        body: JSON.stringify({ updates })
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
        body: JSON.stringify({ updates })
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
          <Button variant="outline" onClick={() => router.push(`/admin/settings/industries/form-1/extras/new?industry=${encodeURIComponent(industry)}&industryId=${industryId}`)}>Add New</Button>
          <Button variant="default" onClick={updatePriority}>Update priority</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{industry} - Form 1 / Extras</CardTitle>
          <CardDescription>Manage upsell extras and add-ons for {industry}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="w-[150px]">Service Category</TableHead>
                    <TableHead>Display</TableHead>
                    <TableHead>Qty Based</TableHead>
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
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : extras.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No extras found. Click Add New to create one.</TableCell>
                  </TableRow>
                ) : null}
                {!loading && extras.map((extra) => {
                  const hours = Math.floor(extra.time_minutes / 60);
                  const minutes = extra.time_minutes % 60;
                  const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                  
                  // Map display values to readable labels
                  const displayLabel = extra.display === "frontend-backend-admin"
                    ? "Frontend, Backend & Admin" 
                    : extra.display === "backend-admin"
                    ? "Backend & Admin"
                    : "Admin Only";
                  
                  return (
                  <TableRow key={extra.id}>
                    <TableCell className="font-medium">{extra.name}</TableCell>
                    <TableCell>{timeDisplay}</TableCell>
                    <TableCell>${extra.price.toFixed(2)}</TableCell>
                    <TableCell className="text-xs">
                      {extra.show_based_on_service_category && extra.service_category_options && extra.service_category_options.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {extra.service_category_options.map((category, idx) => (
                            <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {category}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">{extra.service_category || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{displayLabel}</TableCell>
                    <TableCell className="text-center">
                      <span className={extra.qty_based ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {extra.qty_based ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">Options <ChevronDown className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/admin/settings/industries/form-1/extras/new?industry=${encodeURIComponent(industry)}&industryId=${industryId}&editId=${extra.id}`)}>Edit</DropdownMenuItem>
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
    </div>
  );
}
