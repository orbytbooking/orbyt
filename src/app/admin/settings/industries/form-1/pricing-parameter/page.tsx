"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";

type PricingRow = {
  id: string;
  name: string;
  price: number;
  time_minutes: number;
  display: "Customer Frontend, Backend & Admin" | "Customer Backend & Admin" | "Admin Only";
  service_category: string;
  frequency: string;
  variable_category: string;
  description: string;
  is_default: boolean;
  show_based_on_frequency: boolean;
  show_based_on_service_category: boolean;
  excluded_extras: string[];
  excluded_services: string[];
  sort_order: number;
};

type PricingVariable = {
  id: string;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
};

export default function IndustryFormPricingParameterPage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();

  const [allRows, setAllRows] = useState<Record<string, PricingRow[]>>({});
  const [variables, setVariables] = useState<PricingVariable[]>([]);
  const [excludeParameters, setExcludeParameters] = useState<any[]>([]);
  const [industryId, setIndustryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch industry ID and data from database
  useEffect(() => {
    if (!currentBusiness?.id || !industry) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch industry ID
        const industriesResponse = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const industriesData = await industriesResponse.json();
        const currentIndustry = industriesData.industries?.find((ind: any) => ind.name === industry);
        
        if (!currentIndustry) {
          console.error('Industry not found');
          setLoading(false);
          return;
        }

        setIndustryId(currentIndustry.id);

        // Fetch pricing parameters from database
        const pricingResponse = await fetch(`/api/pricing-parameters?industryId=${currentIndustry.id}`);
        const pricingData = await pricingResponse.json();
        
        if (pricingData.pricingParameters) {
          // Group by variable_category
          const grouped: Record<string, PricingRow[]> = {};
          pricingData.pricingParameters.forEach((param: any) => {
            if (!grouped[param.variable_category]) {
              grouped[param.variable_category] = [];
            }
            grouped[param.variable_category].push(param);
          });
          setAllRows(grouped);
        }

        // Fetch exclude parameters from database
        const excludeResponse = await fetch(`/api/exclude-parameters?industryId=${currentIndustry.id}`);
        const excludeData = await excludeResponse.json();
        
        if (excludeData.excludeParameters) {
          setExcludeParameters(excludeData.excludeParameters);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load pricing parameters",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    fetchData();
  }, [currentBusiness, industry]);

  const getAllRows = (): PricingRow[] => {
    const allRowsArray: PricingRow[] = [];
    variables.forEach((variable) => {
      const rows = allRows[variable.category] || [];
      allRowsArray.push(...rows);
    });
    return allRowsArray;
  };

  const remove = async (variableCategory: string, id: string) => {
    try {
      const response = await fetch(`/api/pricing-parameters?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete pricing parameter');
      }

      setAllRows((prev) => ({
        ...prev,
        [variableCategory]: (prev[variableCategory] || []).filter((r) => r.id !== id),
      }));

      toast({
        title: "Success",
        description: "Pricing parameter deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting pricing parameter:', error);
      toast({
        title: "Error",
        description: "Failed to delete pricing parameter",
        variant: "destructive",
      });
    }
  };

  const move = async (variableCategory: string, id: string, dir: -1 | 1) => {
    setAllRows((prev) => {
      const rows = prev[variableCategory] || [];
      const idx = rows.findIndex((r) => r.id === id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= rows.length) return prev;
      const copy = [...rows];
      const [item] = copy.splice(idx, 1);
      copy.splice(j, 0, item);
      return {
        ...prev,
        [variableCategory]: copy,
      };
    });
  };

  const updatePriority = async () => {
    try {
      // Update sort order for all pricing parameters
      const updates: Array<{ id: string; sort_order: number }> = [];
      Object.values(allRows).forEach((rows) => {
        rows.forEach((row, index) => {
          updates.push({ id: row.id, sort_order: index });
        });
      });

      const response = await fetch('/api/pricing-parameters/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        throw new Error('Failed to update priority');
      }

      toast({
        title: "Success",
        description: "Priority updated successfully",
      });
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: "Error",
        description: "Failed to update priority",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/admin/settings/industries/form-1/pricing-parameter/new?industry=${encodeURIComponent(industry)}&industryId=${industryId}`)}
          >
            Add New
          </Button>
          <Button variant="default" onClick={updatePriority}>
            Update priority
          </Button>
          <Button
            variant="default"
            onClick={() =>
              router.push(
                `/admin/settings/industries/form-1/pricing-parameter/manage-variables?industry=${encodeURIComponent(
                  industry
                )}`
              )
            }
          >
            Manage variable
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{industry} - Form 1 / Pricing Parameter</CardTitle>
          <CardDescription>Manage pricing parameters for {industry}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Get all unique categories that have parameters */}
            {Object.keys(allRows)
              .filter(category => allRows[category] && allRows[category].length > 0)
              .map(category => {
                const rows = allRows[category] || [];
                return (
                  <div key={category}>
                    <h3 className="text-lg font-semibold mb-4">{category}</h3>
                    
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Display</TableHead>
                            <TableHead>Service Category</TableHead>
                            <TableHead>Frequency</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((r) => (
                            <TableRow key={`${category}-${r.id}`}>
                              <TableCell className="font-medium">{r.name}</TableCell>
                              <TableCell>${r.price.toFixed(2)}</TableCell>
                              <TableCell>{r.time_minutes > 0 ? `${Math.floor(r.time_minutes / 60)}Hr ${r.time_minutes % 60}Min` : '0'}</TableCell>
                              <TableCell className="text-xs">
                                {r.display ? (
                                  <div className="whitespace-pre-line">
                                    {r.display.split(', ').join('\n')}
                                  </div>
                                ) : "-"}
                              </TableCell>
                              <TableCell>
                                {r.service_category ? (
                                  <div className="whitespace-pre-line">
                                    {r.service_category.split(', ').join('\n')}
                                  </div>
                                ) : "-"}
                              </TableCell>
                              <TableCell>
                                {r.frequency ? (
                                  <div className="whitespace-pre-line">
                                    {r.frequency.split(', ').join('\n')}
                                  </div>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                                      Options <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => router.push(`/admin/settings/industries/form-1/pricing-parameter/new?industry=${encodeURIComponent(industry)}&industryId=${industryId}&editId=${r.id}&category=${encodeURIComponent(category)}`)}
                                    >
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => move(category, r.id, -1)}>
                                      Move Up
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => move(category, r.id, 1)}>
                                      Move Down
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => remove(category, r.id)}
                                      className="text-red-600"
                                    >
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            
            {Object.keys(allRows).length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No pricing parameters added yet. Click "Add New" to add parameters.
                </p>
              </div>
            )}
            
            {Object.keys(allRows).length > 0 && Object.keys(allRows).every(category => !allRows[category] || allRows[category].length === 0) && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No pricing parameters added yet. Click "Add New" to add parameters.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exclude Parameters Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Exclude Parameters</CardTitle>
              <CardDescription>Manage exclude parameters for {industry}.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => router.push(`/admin/settings/industries/form-1/pricing-parameter/exclude-parameters/new?industry=${encodeURIComponent(industry)}&industryId=${industryId}`)}
              >
                Add New
              </Button>
              <Button variant="default" onClick={updatePriority}>
                Update priority
              </Button>
            </div>
          </div>
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
                  <TableHead>Service Category</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {excludeParameters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      No exclude parameters configured. Click "Add New" to add parameters.
                    </TableCell>
                  </TableRow>
                ) : (
                  excludeParameters.map((param) => (
                    <TableRow key={param.id}>
                      <TableCell className="font-medium">{param.name}</TableCell>
                      <TableCell>${param.price ? param.price.toFixed(2) : "-"}</TableCell>
                      <TableCell>{param.time_minutes > 0 ? `${Math.floor(param.time_minutes / 60)}Hr ${param.time_minutes % 60}Min` : '0'}</TableCell>
                      <TableCell className="text-xs">
                                {param.display ? (
                                  <div className="whitespace-pre-line">
                                    {param.display.split(', ').join('\n')}
                                  </div>
                                ) : "-"}
                              </TableCell>
                      <TableCell>
                                {param.service_category ? (
                                  <div className="whitespace-pre-line">
                                    {param.service_category.split(', ').join('\n')}
                                  </div>
                                ) : "-"}
                              </TableCell>
                      <TableCell>
                                {param.frequency ? (
                                  <div className="whitespace-pre-line">
                                    {param.frequency.split(', ').join('\n')}
                                  </div>
                                ) : "-"}
                              </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                              Options <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/settings/industries/form-1/pricing-parameter/exclude-parameters/new?industry=${encodeURIComponent(industry)}&industryId=${industryId}&editId=${param.id}`)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/exclude-parameters?id=${param.id}`, {
                                    method: 'DELETE',
                                  });
                                  if (!response.ok) throw new Error('Failed to delete');
                                  setExcludeParameters(excludeParameters.filter(p => p.id !== param.id));
                                  toast({
                                    title: "Success",
                                    description: "Exclude parameter deleted successfully",
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to delete exclude parameter",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="text-red-600"
                            >
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
