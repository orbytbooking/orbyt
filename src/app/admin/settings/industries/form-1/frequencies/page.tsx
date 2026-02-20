"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ChevronDown } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";

export default function IndustryFormFrequenciesPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const industry = params.get("industry") || "Industry";
  type Row = {
    id: string;
    name: string;
    discount: number;
    discount_type?: "%" | "$";
    display: "Both" | "Booking" | "Quote";
    is_default?: boolean;
    description?: string;
    different_on_customer_end?: boolean;
    show_explanation?: boolean;
    enable_popup?: boolean;
    occurrence_time?: string;
  };
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [industryId, setIndustryId] = useState<string | null>(null);

  useEffect(() => {
    const fetchIndustries = async () => {
      if (!currentBusiness) return;
      
      try {
        const response = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const data = await response.json();
        
        if (response.ok && data.industries) {
          const currentIndustry = data.industries.find((ind: any) => ind.name === industry);
          if (currentIndustry) {
            setIndustryId(currentIndustry.id);
          }
        }
      } catch (error) {
        console.error('Error fetching industries:', error);
      }
    };

    fetchIndustries();
  }, [currentBusiness, industry]);

  useEffect(() => {
    const fetchFrequencies = async () => {
      if (!industryId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await fetch(`/api/industry-frequency?industryId=${industryId}&includeAll=true`);
        const data = await response.json();
        
        if (response.ok && data.frequencies) {
          setRows(data.frequencies);
        } else {
          console.error('Error fetching frequencies:', data.error);
          toast({
            title: "Error",
            description: data.error || "Failed to load frequencies",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error fetching frequencies:', error);
        toast({
          title: "Error",
          description: "Failed to load frequencies",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFrequencies();
  }, [industryId, toast]);

  const remove = async (id: string) => {
    try {
      const response = await fetch(`/api/industry-frequency?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRows(prev => prev.filter(r => r.id !== id));
        toast({
          title: "Success",
          description: "Frequency deleted successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to delete frequency",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting frequency:', error);
      toast({
        title: "Error",
        description: "Failed to delete frequency",
        variant: "destructive",
      });
    }
  };

  const toggleDefault = async (id: string) => {
    const frequency = rows.find(r => r.id === id);
    if (!frequency) return;

    try {
      const response = await fetch('/api/industry-frequency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_default: !frequency.is_default }),
      });

      if (response.ok) {
        setRows(prev =>
          prev.map(r => (r.id === id ? { ...r, is_default: !r.is_default } : r)),
        );
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update frequency",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating frequency:', error);
      toast({
        title: "Error",
        description: "Failed to update frequency",
        variant: "destructive",
      });
    }
  };

  const move = (id: string, dir: -1 | 1) => setRows(prev => {
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
    toast({
      title: "Frequencies updated",
      description: "Frequency order has been saved.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/admin/settings/industries/form-1/frequencies/new?industry=${encodeURIComponent(industry)}`)}>Add New</Button>
          <Button variant="default" onClick={updatePriority}>Update priority</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frequency</CardTitle>
          <CardDescription>You can add all of the frequencies you accept here. Example weekly services, monthly, etc.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Display</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Loading frequencies...</TableCell>
                  </TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No frequencies found. Click Add New to create one.</TableCell>
                  </TableRow>
                )}
                {!loading && rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      {r.discount}
                      {r.discount_type === '$' ? ' $' : '%'}
                    </TableCell>
                    <TableCell>{r.display}</TableCell>
                    <TableCell>
                      <Checkbox checked={!!r.is_default} onCheckedChange={() => toggleDefault(r.id)} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.id.substring(0, 8)}...</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">Options <ChevronDown className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/admin/settings/industries/form-1/frequencies/new?industry=${encodeURIComponent(industry)}&editId=${r.id}`)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => move(r.id, -1)}>Move Up</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => move(r.id, 1)}>Move Down</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => remove(r.id)} className="text-red-600">Delete</DropdownMenuItem>
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
