"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

type LocationRow = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  active: boolean;
  business_id?: string;
  created_at?: string;
};

/** Only localStorage left for locations: "Make Default" preference (no DB column). All list/create/update/delete use Supabase. */
const DEFAULT_LOCATION_STORAGE_KEY = "default_location_id";

export default function IndustryFormLocationsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const { toast } = useToast();

  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBusinessId, setCurrentBusinessId] = useState<string>("");
  const [industryId, setIndustryId] = useState("");
  const [defaultLocationId, setDefaultLocationId] = useState<string | null>(null);

  useEffect(() => {
    const id = params.get("industryId");
    if (id) setIndustryId(id);
  }, [params]);

  const storageKey = useMemo(
    () => (currentBusinessId ? `${DEFAULT_LOCATION_STORAGE_KEY}_${currentBusinessId}` : null),
    [currentBusinessId]
  );

  useEffect(() => {
    if (storageKey) {
      setDefaultLocationId(localStorage.getItem(storageKey));
    }
  }, [storageKey]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: businessData, error: businessError } = await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", user.id)
          .eq("is_active", true)
          .single();

        if (businessError || !businessData) {
          setLocations([]);
          setCurrentBusinessId("");
          setIsLoading(false);
          return;
        }

        const businessId = businessData.id;
        setCurrentBusinessId(businessId);
        if (!params.get("industryId")) {
          const { data: indData } = await supabase.from("industries").select("id").eq("business_id", businessId).ilike("name", industry).limit(1).single();
          if (indData?.id) setIndustryId(indData.id);
        }

        const { data: locationsData, error } = await supabase
          .from("locations")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching locations:", error);
          toast({ title: "Could not load locations", description: error.message, variant: "destructive" });
          setLocations([]);
        } else {
          setLocations(locationsData || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [industry]);

  const setDefaultLocation = (id: string) => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, id);
    setDefaultLocationId(id);
    toast({ title: "Default location updated." });
  };

  const remove = async (id: string) => {
    try {
      if (currentBusinessId) {
        const { error } = await supabase.from("locations").delete().eq("id", id);
        if (error) {
          toast({ title: "Error deleting location", description: error.message, variant: "destructive" });
          return;
        }
      }
      setLocations((prev) => prev.filter((loc) => loc.id !== id));
      if (defaultLocationId === id && storageKey) {
        localStorage.removeItem(storageKey);
        setDefaultLocationId(null);
      }
      toast({ title: "Location deleted." });
    } catch (error) {
      console.error("Error removing location:", error);
      toast({ title: "Failed to delete location", variant: "destructive" });
    }
  };

  const listHref = `/admin/settings/industries/form-1/locations?industry=${encodeURIComponent(industry)}${industryId ? `&industryId=${industryId}` : ""}`;
  const newHref = `/admin/settings/industries/form-1/locations/new?industry=${encodeURIComponent(industry)}${industryId ? `&industryId=${industryId}` : ""}`;
  const editHref = (id: string) => `${newHref}&editId=${id}`;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => router.push(newHref)}>Add New</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{industry} – Form 1 / Locations</CardTitle>
          <CardDescription>
            Service areas for {industry}. Add locations and configure details, dependencies, and providers per location.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-16" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : locations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      No locations found. Click Add New to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  locations.map((loc) => (
                    <TableRow key={loc.id}>
                      <TableCell className="font-medium">{loc.name}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {loc.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                              Options <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <div className="px-2 py-1.5">
                              <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <Checkbox
                                  checked={defaultLocationId === loc.id}
                                  onCheckedChange={() => setDefaultLocation(loc.id)}
                                />
                                Make Default
                              </label>
                            </div>
                            <DropdownMenuItem onClick={() => router.push(editHref(loc.id))}>
                              <Pencil className="h-3 w-3 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => remove(loc.id)} className="text-red-600">
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
