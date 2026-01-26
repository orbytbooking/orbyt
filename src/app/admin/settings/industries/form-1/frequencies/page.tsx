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

export default function IndustryFormFrequenciesPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const industry = params.get("industry") || "Industry";
  type Row = {
    id: number;
    name: string;
    discount: number;
    discountType?: "%" | "$";
    display: "Both" | "Booking" | "Quote";
    isDefault?: boolean;
    description?: string;
    differentOnCustomerEnd?: boolean;
    showExplanation?: boolean;
    enablePopup?: boolean;
    occurrenceTime?: string;
  };
  const storageKey = useMemo(() => `frequencies_${industry}`, [industry]);
  const [rows, setRows] = useState<Row[]>([]);
  const sampleRows: Row[] = [
    { id: 9, name: "2x per week", discount: 5, display: "Both" },
    { id: 1, name: "One-Time", discount: 3, display: "Both", isDefault: true },
    { id: 10, name: "Weekly", discount: 15, display: "Both" },
    { id: 11, name: "Every Other Week", discount: 10, display: "Both" },
    { id: 12, name: "Monthly", discount: 5, display: "Both" },
  ];

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(stored) && stored.length > 0) setRows(stored);
      else setRows(sampleRows);
    } catch {
      // ignore
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(rows));
  }, [rows, storageKey]);

  // Keep table in sync if localStorage changes (e.g., after creating from the new page)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey) {
        try {
          const arr = JSON.parse(e.newValue || '[]');
          if (Array.isArray(arr)) setRows(arr);
        } catch {}
      }
    };
    window.addEventListener('storage', handler);
    const interval = setInterval(() => {
      try {
        const arr = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (Array.isArray(arr)) setRows(arr);
      } catch {}
    }, 800);
    return () => { window.removeEventListener('storage', handler); clearInterval(interval); };
  }, [storageKey]);

  const remove = (id: number) => setRows(prev => prev.filter(r => r.id !== id));
  const toggleDefault = (id: number) =>
    setRows(prev =>
      prev.map(r => (r.id === id ? { ...r, isDefault: !r.isDefault } : r)),
    );
  const move = (id: number, dir: -1 | 1) => setRows(prev => {
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
      localStorage.setItem(storageKey, JSON.stringify(rows));
      const genericKey = "frequencies_Industry";
      localStorage.setItem(genericKey, JSON.stringify(rows));
      const homeCleaningKey = "frequencies_Home Cleaning";
      localStorage.setItem(homeCleaningKey, JSON.stringify(rows));
      toast({
        title: "Frequencies updated",
        description: "Default frequencies and order have been saved.",
      });
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          {rows.length === 0 && (
            <Button variant="secondary" onClick={() => { setRows(sampleRows); localStorage.setItem(storageKey, JSON.stringify(sampleRows)); }}>Load Sample Data</Button>
          )}
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
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No data. Click Load Sample Data or Add New.</TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      {r.discount}
                      {r.discountType === '$' ? ' $' : '%'}
                    </TableCell>
                    <TableCell>{r.display}</TableCell>
                    <TableCell>
                      <Checkbox checked={!!r.isDefault} onCheckedChange={() => toggleDefault(r.id)} />
                    </TableCell>
                    <TableCell>{r.id}</TableCell>
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
