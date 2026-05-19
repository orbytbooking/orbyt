"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  defaultForm3AddonItemPriceRow,
  form3ItemManualTierCount,
  type Form3AddonItemPriceRow,
  type Form3AddonItemPricesByItem,
  type Form3ItemCatalogMeta,
} from "@/lib/form3AddonItemPrices";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i));

function OrangeInfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex rounded-sm text-orange-500 hover:text-orange-600 focus:outline-none"
          aria-label="More info"
        >
          <Info className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-sm text-sm leading-snug">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function SaMlTimeSelects({
  idPrefix,
  tierIndex,
  side,
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
}: {
  idPrefix: string;
  tierIndex: number;
  side: "sa" | "ml";
  hours: string;
  minutes: string;
  onHoursChange: (v: string) => void;
  onMinutesChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={hours === "" ? "0" : hours} onValueChange={onHoursChange}>
        <SelectTrigger className="w-[100px]" id={`${idPrefix}-${side}-h-${tierIndex}`}>
          <SelectValue placeholder="Hours" />
        </SelectTrigger>
        <SelectContent>
          {HOUR_OPTIONS.map((h) => (
            <SelectItem key={`${idPrefix}-${side}-h-${tierIndex}-${h}`} value={h}>
              {h} hr
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={minutes === "" ? "0" : minutes} onValueChange={onMinutesChange}>
        <SelectTrigger className="w-[100px]" id={`${idPrefix}-${side}-m-${tierIndex}`}>
          <SelectValue placeholder="Minutes" />
        </SelectTrigger>
        <SelectContent>
          {MINUTE_OPTIONS.map((m) => (
            <SelectItem key={`${idPrefix}-${side}-m-${tierIndex}-${m}`} value={m}>
              {m} min
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ManualTierSaMlGrid({
  itemName,
  rows,
  onRowsChange,
}: {
  itemName: string;
  rows: Form3AddonItemPriceRow[];
  onRowsChange: (rows: Form3AddonItemPriceRow[]) => void;
}) {
  const idPrefix = itemName.replace(/\s+/g, "-").toLowerCase();

  const updateTier = (index: number, patch: Partial<Form3AddonItemPriceRow>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onRowsChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">Price &amp; Time</h4>
        <OrangeInfoTip text="Each row is a quantity tier for this item. S.A. is service area (customer location). M.L. is merchant location (your store)." />
      </div>
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            S.A.
            <OrangeInfoTip text="Service area — work performed at the customer's location." />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>Pricing</span>
            <span>Time</span>
          </div>
          {rows.map((row, index) => (
            <div
              key={`${idPrefix}-sa-tier-${index}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2"
            >
              <div className="relative w-full max-w-[120px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.price}
                  onChange={(e) => updateTier(index, { price: e.target.value })}
                  placeholder="0"
                  className="pl-7"
                  aria-label={`S.A. price tier ${index + 1}`}
                />
              </div>
              <SaMlTimeSelects
                idPrefix={idPrefix}
                tierIndex={index}
                side="sa"
                hours={row.timeHours}
                minutes={row.timeMinutes}
                onHoursChange={(v) => updateTier(index, { timeHours: v })}
                onMinutesChange={(v) => updateTier(index, { timeMinutes: v })}
              />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            M.L.
            <OrangeInfoTip text="Merchant location — work performed at your business location." />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>Pricing</span>
            <span>Time</span>
          </div>
          {rows.map((row, index) => (
            <div
              key={`${idPrefix}-ml-tier-${index}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2"
            >
              <div className="relative w-full max-w-[120px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.priceMerchant}
                  onChange={(e) => updateTier(index, { priceMerchant: e.target.value })}
                  placeholder="0"
                  className="pl-7"
                  aria-label={`M.L. price tier ${index + 1}`}
                />
              </div>
              <SaMlTimeSelects
                idPrefix={idPrefix}
                tierIndex={index}
                side="ml"
                hours={row.hoursMerchant}
                minutes={row.minutesMerchant}
                onHoursChange={(v) => updateTier(index, { hoursMerchant: v })}
                onMinutesChange={(v) => updateTier(index, { minutesMerchant: v })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MultiplySingleSaMl({
  itemName,
  row,
  onRowChange,
}: {
  itemName: string;
  row: Form3AddonItemPriceRow;
  onRowChange: (patch: Partial<Form3AddonItemPriceRow>) => void;
}) {
  const idPrefix = itemName.replace(/\s+/g, "-").toLowerCase();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">Price &amp; Time</h4>
        <OrangeInfoTip text="S.A. is service area (at the customer's location). M.L. is merchant location (at your store). Leave M.L. empty to use the same price and duration as S.A." />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3 rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            S.A.
            <OrangeInfoTip text="Service area — work performed at the customer's location." />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-sa-price`}>Pricing</Label>
            <div className="relative w-28">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id={`${idPrefix}-sa-price`}
                type="number"
                step="0.01"
                min="0"
                value={row.price}
                onChange={(e) => onRowChange({ price: e.target.value })}
                placeholder="0"
                className="pl-7"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Time</Label>
            <SaMlTimeSelects
              idPrefix={idPrefix}
              tierIndex={0}
              side="sa"
              hours={row.timeHours}
              minutes={row.timeMinutes}
              onHoursChange={(v) => onRowChange({ timeHours: v })}
              onMinutesChange={(v) => onRowChange({ timeMinutes: v })}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            M.L.
            <OrangeInfoTip text="Merchant location — work performed at your business location." />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-ml-price`}>Pricing</Label>
            <div className="relative w-28">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id={`${idPrefix}-ml-price`}
                type="number"
                step="0.01"
                min="0"
                value={row.priceMerchant}
                onChange={(e) => onRowChange({ priceMerchant: e.target.value })}
                placeholder="0"
                className="pl-7"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Time</Label>
            <SaMlTimeSelects
              idPrefix={idPrefix}
              tierIndex={0}
              side="ml"
              hours={row.hoursMerchant}
              minutes={row.minutesMerchant}
              onHoursChange={(v) => onRowChange({ hoursMerchant: v })}
              onMinutesChange={(v) => onRowChange({ minutesMerchant: v })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** One tab per selected item; multiply = one S.A./M.L. row, manual = tier rows per item quantity. */
export function Form3AddonItemPriceTabs({
  selectedItems,
  itemPrices,
  onItemPricesChange,
  manualMode,
  itemCatalog,
}: {
  selectedItems: string[];
  itemPrices: Form3AddonItemPricesByItem;
  onItemPricesChange: (next: Form3AddonItemPricesByItem) => void;
  manualMode: boolean;
  itemCatalog: Record<string, Form3ItemCatalogMeta>;
}) {
  const [activeTab, setActiveTab] = useState(selectedItems[0] ?? "");

  useEffect(() => {
    if (selectedItems.length === 0) {
      setActiveTab("");
      return;
    }
    if (!selectedItems.includes(activeTab)) {
      setActiveTab(selectedItems[0]);
    }
  }, [selectedItems, activeTab]);

  if (selectedItems.length === 0) return null;

  const tabValue = selectedItems.includes(activeTab) ? activeTab : selectedItems[0];

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <Tabs value={tabValue} onValueChange={setActiveTab} className="w-full">
        <TabsList
          className={cn(
            "mb-4 flex h-auto w-full flex-wrap justify-start gap-0 rounded-none border-b border-border bg-transparent p-0",
          )}
        >
          {selectedItems.map((name) => (
            <TabsTrigger
              key={name}
              value={name}
              className="rounded-none border-b-2 border-transparent px-4 pb-2 data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {name}
            </TabsTrigger>
          ))}
        </TabsList>
        {selectedItems.map((name) => {
          const rows = itemPrices[name]?.length
            ? itemPrices[name]
            : [defaultForm3AddonItemPriceRow()];
          const tierHint = manualMode
            ? form3ItemManualTierCount(itemCatalog[name])
            : 1;

          return (
            <TabsContent key={name} value={name} className="mt-0 space-y-3">
              {manualMode && tierHint > 1 ? (
                <p className="text-xs text-muted-foreground">
                  {tierHint} pricing tiers (based on this item&apos;s maximum quantity).
                </p>
              ) : null}
              {manualMode ? (
                <ManualTierSaMlGrid
                  itemName={name}
                  rows={rows}
                  onRowsChange={(nextRows) =>
                    onItemPricesChange({
                      ...itemPrices,
                      [name]: nextRows,
                    })
                  }
                />
              ) : (
                <MultiplySingleSaMl
                  itemName={name}
                  row={rows[0] ?? defaultForm3AddonItemPriceRow()}
                  onRowChange={(patch) => {
                    const cur = rows[0] ?? defaultForm3AddonItemPriceRow();
                    onItemPricesChange({
                      ...itemPrices,
                      [name]: [{ ...cur, ...patch }],
                    });
                  }}
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
