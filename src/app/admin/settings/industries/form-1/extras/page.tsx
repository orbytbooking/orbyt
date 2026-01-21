"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ChevronDown } from "lucide-react";

type Extra = {
  id: number;
  name: string;
  time: number; // in minutes
  serviceCategory: string;
  price: number;
  display: "frontend-backend-admin" | "backend-admin" | "admin-only" | "Both" | "Booking" | "Quote"; // Support legacy values
  qtyBased: boolean;
  exemptFromDiscount?: boolean;
  description?: string;
  showBasedOnFrequency?: boolean;
  frequencyOptions?: string[];
  showBasedOnServiceCategory?: boolean;
  serviceCategoryOptions?: string[];
  showBasedOnVariables?: boolean;
  variableOptions?: string[];
};

export default function IndustryFormExtrasPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const industry = params.get("industry") || "Industry";
  
  const storageKey = useMemo(() => `extras_${industry}`, [industry]);
  const [extras, setExtras] = useState<Extra[]>([]);
  
  const sampleExtras: Extra[] = [
    { id: 1, name: "Inside Fridge", time: 30, serviceCategory: "Kitchen", price: 25, display: "frontend-backend-admin", qtyBased: false, exemptFromDiscount: false },
    { id: 2, name: "Inside Oven", time: 45, serviceCategory: "Kitchen", price: 35, display: "frontend-backend-admin", qtyBased: false, exemptFromDiscount: false },
    { id: 3, name: "Inside Cabinets", time: 60, serviceCategory: "Kitchen", price: 50, display: "backend-admin", qtyBased: true, exemptFromDiscount: true },
    { id: 4, name: "Laundry Wash & Fold", time: 90, serviceCategory: "Laundry", price: 40, display: "admin-only", qtyBased: true, exemptFromDiscount: false }
  ];

  // Load extras from localStorage on mount and when storageKey changes
  useEffect(() => {
    const loadExtras = () => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored && stored !== "null") {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setExtras(parsed);
            return;
          }
        }
        setExtras([]);
      } catch {
        setExtras([]);
      }
    };
    
    loadExtras();
  }, [storageKey]);

  // Keep table in sync if localStorage changes
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey) {
        try {
          const arr = JSON.parse(e.newValue || '[]');
          if (Array.isArray(arr)) setExtras(arr);
        } catch {}
      }
    };
    window.addEventListener('storage', handler);
    const interval = setInterval(() => {
      try {
        const arr = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (Array.isArray(arr)) setExtras(arr);
      } catch {}
    }, 800);
    return () => { window.removeEventListener('storage', handler); clearInterval(interval); };
  }, [storageKey]);

  const remove = (id: number) => {
    const updated = extras.filter(r => r.id !== id);
    setExtras(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    toast({
      title: "Extra deleted",
      description: "The extra has been removed successfully.",
    });
  };

  const move = (id: number, dir: -1 | 1) => {
    const idx = extras.findIndex(r => r.id === id);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= extras.length) return;
    const copy = [...extras];
    const [item] = copy.splice(idx, 1);
    copy.splice(j, 0, item);
    setExtras(copy);
    localStorage.setItem(storageKey, JSON.stringify(copy));
  };

  const updatePriority = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(extras));
      toast({
        title: "Extras updated",
        description: "Extras order has been saved.",
      });
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          {extras.length === 0 && (
            <Button variant="secondary" onClick={() => { setExtras(sampleExtras); localStorage.setItem(storageKey, JSON.stringify(sampleExtras)); }}>Load Sample Data</Button>
          )}
          <Button variant="outline" onClick={() => router.push(`/admin/settings/industries/form-1/extras/new?industry=${encodeURIComponent(industry)}`)}>Add New</Button>
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
                {extras.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No data. Click Load Sample Data or Add New.</TableCell>
                  </TableRow>
                )}
                {extras.map((extra) => {
                  const hours = Math.floor(extra.time / 60);
                  const minutes = extra.time % 60;
                  const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                  
                  // Map display values to readable labels
                  const displayLabel = extra.display === "frontend-backend-admin" || extra.display === "Both" 
                    ? "Frontend, Backend & Admin" 
                    : extra.display === "backend-admin" || extra.display === "Booking"
                    ? "Backend & Admin"
                    : "Admin Only";
                  
                  return (
                  <TableRow key={extra.id}>
                    <TableCell className="font-medium">{extra.name}</TableCell>
                    <TableCell>{timeDisplay}</TableCell>
                    <TableCell>${extra.price.toFixed(2)}</TableCell>
                    <TableCell className="text-xs">
                      {extra.showBasedOnServiceCategory && extra.serviceCategoryOptions && extra.serviceCategoryOptions.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {extra.serviceCategoryOptions.map((category, idx) => (
                            <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {category}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">{extra.serviceCategory || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{displayLabel}</TableCell>
                    <TableCell className="text-center">
                      <span className={extra.qtyBased ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {extra.qtyBased ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">Options <ChevronDown className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/admin/settings/industries/form-1/extras/new?industry=${encodeURIComponent(industry)}&editId=${extra.id}`)}>Edit</DropdownMenuItem>
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
