"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ChevronDown } from "lucide-react";
import { serviceCategoriesService, ServiceCategory } from "@/lib/serviceCategories";
import { useBusiness } from "@/contexts/BusinessContext";

export default function IndustryFormServiceCategoryPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const industry = params.get("industry") || "Industry";
  const industryIdFromUrl = params.get("industryId");
  
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [industryId, setIndustryId] = useState<string | null>(industryIdFromUrl);
  
  // Fetch industryId if not in URL
  useEffect(() => {
    const fetchIndustryId = async () => {
      if (!currentBusiness?.id) {
        console.log('No business ID available yet');
        return;
      }

      try {
        console.log('Fetching industry ID for:', industry);
        const response = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const data = await response.json();
        console.log('Industries API response:', data);
        const currentIndustry = data.industries?.find((ind: any) => ind.name === industry);
        
        if (currentIndustry) {
          console.log('Found industry:', currentIndustry);
          setIndustryId(currentIndustry.id);
        } else {
          console.error('Industry not found:', industry);
          setLoading(false);
          toast({
            title: "Error",
            description: `Industry "${industry}" not found.`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error fetching industry ID:', error);
        setLoading(false);
        toast({
          title: "Error",
          description: "Failed to fetch industry information.",
          variant: "destructive",
        });
      }
    };
    
    if (!industryIdFromUrl && industry && currentBusiness?.id) {
      fetchIndustryId();
    } else if (industryIdFromUrl) {
      console.log('Using industryId from URL:', industryIdFromUrl);
    }
  }, [industry, industryIdFromUrl, currentBusiness?.id]);

  useEffect(() => {
    if (industryId) {
      console.log('Loading categories for industryId:', industryId);
      loadCategories();
    }
  }, [industryId]);

  const loadCategories = async () => {
    if (!industryId) {
      console.log('No industryId available');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching service categories for industryId:', industryId);
      const data = await serviceCategoriesService.getServiceCategoriesByIndustry(industryId);
      console.log('Service categories loaded:', data);
      setCategories(data);
    } catch (error) {
      console.error('Error loading service categories:', error);
      toast({
        title: "Error",
        description: "Failed to load service categories.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await serviceCategoriesService.deleteServiceCategory(id);
      setCategories(prev => prev.filter(r => r.id !== id));
      toast({
        title: "Category deleted",
        description: "The service category has been removed successfully.",
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete service category.",
        variant: "destructive",
      });
    }
  };

  const move = (id: string, dir: -1 | 1) => setCategories(prev => {
    const idx = prev.findIndex(r => r.id === id);
    if (idx < 0) return prev;
    const j = idx + dir;
    if (j < 0 || j >= prev.length) return prev;
    const copy = [...prev];
    const [item] = copy.splice(idx, 1);
    copy.splice(j, 0, item);
    return copy;
  });

  const updatePriority = async () => {
    try {
      const updates = categories.map((cat, index) => ({
        id: cat.id,
        sort_order: index
      }));
      await serviceCategoriesService.updateServiceCategoryOrder(updates);
      toast({
        title: "Categories updated",
        description: "Service categories order has been saved.",
      });
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: "Error",
        description: "Failed to update categories order.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/admin/settings/industries/form-1/service-category/new?industry=${encodeURIComponent(industry)}&industryId=${industryId || ''}`)}>Add New</Button>
          <Button variant="default" onClick={updatePriority}>Update priority</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{industry} - Form 1 / Service Category</CardTitle>
          <CardDescription>Organize categories used in the booking form.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Display</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Extras</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                )}
                {!loading && categories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No data. Click Add New to create a category.</TableCell>
                  </TableRow>
                )}
                {!loading && categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-sm">
                      {category.display === "customer_frontend_backend_admin" && "Customer frontend, backend & admin"}
                      {category.display === "customer_backend_admin" && "Customer backend & admin"}
                      {category.display === "admin_only" && "Admin only"}
                      {!category.display && "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {category.service_category_frequency && category.selected_frequencies && category.selected_frequencies.length > 0
                        ? category.selected_frequencies.join(", ")
                        : "-"
                      }
                    </TableCell>
                    <TableCell className="text-sm">
                      {(() => {
                        const enabledExtras = [];
                        if (category.extras_config?.tip?.enabled) enabledExtras.push("Tip");
                        if (category.extras_config?.parking?.enabled) enabledExtras.push("Parking");
                        return enabledExtras.length > 0 ? enabledExtras.join(", ") : "-";
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">Options <ChevronDown className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/admin/settings/industries/form-1/service-category/new?industry=${encodeURIComponent(industry)}&industryId=${industryId || ''}&editId=${category.id}`)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => move(category.id, -1)}>Move Up</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => move(category.id, 1)}>Move Down</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => remove(category.id)} className="text-red-600">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
