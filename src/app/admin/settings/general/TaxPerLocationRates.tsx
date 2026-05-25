'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type TaxLocationRow = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
};

type Props = {
  locations: TaxLocationRow[];
  loading: boolean;
  rates: Record<string, string>;
  onRateChange: (locationId: string, value: string) => void;
};

export function TaxPerLocationRates({ locations, loading, rates, onRateChange }: Props) {
  return (
    <div className="space-y-3 pt-2 border-t">
      <p className="text-sm text-muted-foreground max-w-2xl">
        If you are not using Taxify, enter the tax rate per each location here. Later you can run reports to see how
        much sales tax you owe per location.
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading locations…
        </div>
      ) : locations.length === 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          No locations yet. Add service areas under{' '}
          <Link href="/admin/settings/industries" className="underline underline-offset-2">
            Settings → Industries → Locations
          </Link>
          .
        </p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Location</TableHead>
                <TableHead className="w-[10rem]">Tax rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell>
                    <span className="font-medium">{loc.name}</span>
                    {(loc.city || loc.state) && (
                      <span className="block text-xs text-muted-foreground">
                        {[loc.city, loc.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-[9rem]">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        placeholder="0"
                        value={rates[loc.id] ?? ''}
                        onChange={(e) => onRateChange(loc.id, e.target.value)}
                        className="rounded-r-none h-9"
                      />
                      <div className="inline-flex items-center justify-center px-2.5 rounded-r-md border border-l-0 bg-muted text-xs text-muted-foreground">
                        %
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

