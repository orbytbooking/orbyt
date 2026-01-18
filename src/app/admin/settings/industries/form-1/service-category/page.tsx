"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ChevronDown } from "lucide-react";

export default function IndustryFormServiceCategoryPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const industry = params.get("industry") || "Industry";
  
  type ServiceCategory = {
    id: number;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  };
  
  const storageKey = useMemo(() => `service_categories_${industry}`, [industry]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(stored)) setCategories(stored);
      else setCategories([]);
    } catch {
      setCategories([]);
    }
    setIsInitialLoad(false);
  }, [storageKey]);

  useEffect(() => {
    if (!isInitialLoad) {
      localStorage.setItem(storageKey, JSON.stringify(categories));
    }
  }, [categories, storageKey, isInitialLoad]);

  // Keep table in sync if localStorage changes
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey) {
        try {
          const arr = JSON.parse(e.newValue || '[]');
          if (Array.isArray(arr)) setCategories(arr);
        } catch {}
      }
    };
    
    // Listen for custom events from the new/edit page
    const customHandler = (e: CustomEvent) => {
      if (e.type === 'serviceCategoriesUpdated' && e.detail?.storageKey === storageKey) {
        try {
          const arr = e.detail.categories;
          if (Array.isArray(arr)) setCategories(arr);
        } catch {}
      }
    };
    
    window.addEventListener('storage', handler);
    window.addEventListener('serviceCategoriesUpdated', customHandler as EventListener);
    
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('serviceCategoriesUpdated', customHandler as EventListener);
    };
  }, [storageKey]);

  const remove = (id: number) => {
    setCategories(prev => prev.filter(r => r.id !== id));
    toast({
      title: "Category deleted",
      description: "The service category has been removed successfully.",
    });
  };

  const move = (id: number, dir: -1 | 1) => setCategories(prev => {
    const idx = prev.findIndex(r => r.id === id);
    if (idx < 0) return prev;
    const j = idx + dir;
    if (j < 0 || j >= prev.length) return prev;
    const copy = [...prev];
    const [item] = copy.splice(idx, 1);
    copy.splice(j, 0, item);
    return copy;
  });

  const updatePriority = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(categories));
      toast({
        title: "Categories updated",
        description: "Service categories order has been saved.",
      });
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/admin/settings/industries/form-1/service-category/new?industry=${encodeURIComponent(industry)}`)}>Add New</Button>
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
                  <TableHead>Description</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No data. Click Add New to create a category.</TableCell>
                  </TableRow>
                )}
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{category.description || "-"}</TableCell>
                    <TableCell>{category.id}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">Options <ChevronDown className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/admin/settings/industries/form-1/service-category/new?industry=${encodeURIComponent(industry)}&editId=${category.id}`)}>Edit</DropdownMenuItem>
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
