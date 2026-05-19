"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form1RichTextEditor } from "@/components/admin/Form1RichTextEditor";
import type { FrequencyPopupDisplay } from "@/lib/frequencyPopupDisplay";
import { INDUSTRY_FORM_ICON_PRESETS } from "@/lib/industryExtraIcons";
import { Info, Upload, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i));

type ExtraDisplay = "frontend-backend-admin" | "backend-admin" | "admin-only";

export type Form3ExtraManualPriceRow = {
  price: string;
  timeHours: string;
  timeMinutes: string;
  priceMerchant: string;
  hoursMerchant: string;
  minutesMerchant: string;
};

export type Form3ExtraDetailsState = {
  name: string;
  description: string;
  differentOnCustomerEnd: boolean;
  customerEndName: string;
  showExplanationIconOnForm: boolean;
  explanationTooltipText: string;
  enablePopupOnSelection: boolean;
  popupContent: string;
  popupDisplay: FrequencyPopupDisplay;
  display: ExtraDisplay;
  overrideTimePricing: boolean;
  exemptExtraTime: boolean;
  exemptFromDiscount: boolean;
  qtyBased: boolean;
  maximum: string;
  pricingStructure: "manual" | "multiply";
  manualPrices: Form3ExtraManualPriceRow[];
  price: string;
  priceMerchant: string;
  timeHours: string;
  timeMinutes: string;
  hoursMerchant: string;
  minutesMerchant: string;
  applyToAllBookings: boolean;
  icon: string;
};

type Props = {
  form: Form3ExtraDetailsState;
  onChange: (patch: Partial<Form3ExtraDetailsState>) => void;
  uploadedIcon: string | null;
  onUploadedIconChange: (icon: string | null) => void;
  showIconPicker: boolean;
  onShowIconPickerChange: (open: boolean) => void;
  onBrowseUpload: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelected: (file: File) => void;
};

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

function defaultManualRow(): Form3ExtraManualPriceRow {
  return {
    price: "0",
    timeHours: "0",
    timeMinutes: "0",
    priceMerchant: "",
    hoursMerchant: "",
    minutesMerchant: "",
  };
}

function syncManualRows(
  maximum: string,
  current: Form3ExtraManualPriceRow[],
): Form3ExtraManualPriceRow[] {
  const maxNum = Number(maximum) || 0;
  if (maxNum <= 0) return [];
  if (maxNum > current.length) {
    return [
      ...current,
      ...Array.from({ length: maxNum - current.length }, () => defaultManualRow()),
    ];
  }
  return current.slice(0, maxNum);
}

function SaMlTimeSelects({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  idPrefix,
}: {
  hours: string;
  minutes: string;
  onHoursChange: (v: string) => void;
  onMinutesChange: (v: string) => void;
  idPrefix: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={hours === "" ? "0" : hours} onValueChange={onHoursChange}>
        <SelectTrigger className="w-[100px]" id={`${idPrefix}-hours`}>
          <SelectValue placeholder="Hours" />
        </SelectTrigger>
        <SelectContent>
          {HOUR_OPTIONS.map((h) => (
            <SelectItem key={`${idPrefix}-h-${h}`} value={h}>
              {h} hr
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={minutes === "" ? "0" : minutes} onValueChange={onMinutesChange}>
        <SelectTrigger className="w-[100px]" id={`${idPrefix}-minutes`}>
          <SelectValue placeholder="Minutes" />
        </SelectTrigger>
        <SelectContent>
          {MINUTE_OPTIONS.map((m) => (
            <SelectItem key={`${idPrefix}-m-${m}`} value={m}>
              {m} min
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SingleSaMlBlock({
  price,
  priceMerchant,
  timeHours,
  timeMinutes,
  hoursMerchant,
  minutesMerchant,
  onChange,
}: {
  price: string;
  priceMerchant: string;
  timeHours: string;
  timeMinutes: string;
  hoursMerchant: string;
  minutesMerchant: string;
  onChange: (patch: Partial<Form3ExtraDetailsState>) => void;
}) {
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
            <Label htmlFor="form3-extra-sa-price">Pricing</Label>
            <div className="relative w-28">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="form3-extra-sa-price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => onChange({ price: e.target.value })}
                placeholder="0"
                className="pl-7"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Time</Label>
            <SaMlTimeSelects
              idPrefix="form3-extra-sa"
              hours={timeHours}
              minutes={timeMinutes}
              onHoursChange={(v) => onChange({ timeHours: v })}
              onMinutesChange={(v) => onChange({ timeMinutes: v })}
            />
          </div>
        </div>
        <div className="space-y-3 rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            M.L.
            <OrangeInfoTip text="Merchant location — work performed at your business location." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="form3-extra-ml-price">Pricing</Label>
            <div className="relative w-28">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="form3-extra-ml-price"
                type="number"
                step="0.01"
                min="0"
                value={priceMerchant}
                onChange={(e) => onChange({ priceMerchant: e.target.value })}
                placeholder="0"
                className="pl-7"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Time</Label>
            <SaMlTimeSelects
              idPrefix="form3-extra-ml"
              hours={hoursMerchant}
              minutes={minutesMerchant}
              onHoursChange={(v) => onChange({ hoursMerchant: v })}
              onMinutesChange={(v) => onChange({ minutesMerchant: v })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ManualTierSaMlBlock({
  rows,
  onRowsChange,
}: {
  rows: Form3ExtraManualPriceRow[];
  onRowsChange: (rows: Form3ExtraManualPriceRow[]) => void;
}) {
  const updateTier = (index: number, patch: Partial<Form3ExtraManualPriceRow>) => {
    onRowsChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">Price &amp; Time</h4>
        <OrangeInfoTip text="Each row is a quantity tier. S.A. is service area; M.L. is merchant location." />
      </div>
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            S.A.
            <OrangeInfoTip text="Service area — at the customer's location." />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 text-sm text-muted-foreground">
            <span>Pricing</span>
            <span>Time</span>
          </div>
          {rows.map((row, index) => (
            <div key={`sa-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
              <div className="relative max-w-[120px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.price}
                  onChange={(e) => updateTier(index, { price: e.target.value })}
                  className="pl-7"
                  aria-label={`S.A. price tier ${index + 1}`}
                />
              </div>
              <SaMlTimeSelects
                idPrefix={`manual-sa-${index}`}
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
            <OrangeInfoTip text="Merchant location — at your business location." />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 text-sm text-muted-foreground">
            <span>Pricing</span>
            <span>Time</span>
          </div>
          {rows.map((row, index) => (
            <div key={`ml-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
              <div className="relative max-w-[120px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.priceMerchant}
                  onChange={(e) => updateTier(index, { priceMerchant: e.target.value })}
                  className="pl-7"
                  aria-label={`M.L. price tier ${index + 1}`}
                />
              </div>
              <SaMlTimeSelects
                idPrefix={`manual-ml-${index}`}
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

/** Form 3 extras Details tab (BookingKoala-style — not add-ons). */
export function Form3ExtraDetailsFields({
  form,
  onChange,
  uploadedIcon,
  onUploadedIconChange,
  showIconPicker,
  onShowIconPickerChange,
  onBrowseUpload,
  fileInputRef,
  onFileSelected,
}: Props) {
  const predefinedIcons = INDUSTRY_FORM_ICON_PRESETS.map(({ name, value, Icon }) => ({
    name,
    value,
    icon: Icon,
  }));

  const manualMode = form.qtyBased && form.pricingStructure === "manual";
  const manualRows =
    manualMode && Number(form.maximum) > 0
      ? syncManualRows(form.maximum, form.manualPrices)
      : form.manualPrices;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="form3-extra-name">Name</Label>
            <OrangeInfoTip text="Internal name for this extra. Customers see the customer end name when enabled below." />
          </div>
          <Input
            id="form3-extra-name"
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ex: Deep Cleaning"
          />
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-start gap-2">
            <Checkbox
              id="form3-extra-diff-customer"
              checked={form.differentOnCustomerEnd}
              onCheckedChange={(checked) =>
                onChange({
                  differentOnCustomerEnd: !!checked,
                  ...(!checked ? { customerEndName: "" } : {}),
                })
              }
            />
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="form3-extra-diff-customer" className="cursor-pointer text-sm font-medium">
                Different on customer end
              </Label>
              {form.differentOnCustomerEnd ? (
                <Input
                  placeholder="Enter Customer End Name"
                  value={form.customerEndName}
                  onChange={(e) => onChange({ customerEndName: e.target.value })}
                  className="bg-background"
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="form3-extra-desc">Description</Label>
          <Textarea
            id="form3-extra-desc"
            rows={3}
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Add Description"
          />
        </div>

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-start gap-2">
            <Checkbox
              id="form3-extra-show-explanation"
              checked={form.showExplanationIconOnForm}
              onCheckedChange={(checked) =>
                onChange({
                  showExplanationIconOnForm: !!checked,
                  ...(!checked ? { explanationTooltipText: "" } : {}),
                })
              }
            />
            <Label htmlFor="form3-extra-show-explanation" className="cursor-pointer text-sm font-medium">
              Show explanation icon on form
            </Label>
          </div>
          {form.showExplanationIconOnForm ? (
            <Textarea
              placeholder="Add Tooltip Text"
              value={form.explanationTooltipText}
              onChange={(e) => onChange({ explanationTooltipText: e.target.value })}
              className="mt-3 min-h-[80px] resize-y bg-background"
            />
          ) : null}
        </div>

        <div className="rounded-lg border border-sky-200/90 bg-sky-50/90 p-4 dark:border-sky-900/55 dark:bg-sky-950/30">
          <div className="flex items-start gap-2">
            <Checkbox
              id="form3-extra-enable-popup"
              className="mt-0.5"
              checked={form.enablePopupOnSelection}
              onCheckedChange={(checked) =>
                onChange({
                  enablePopupOnSelection: !!checked,
                  ...(!checked ? { popupContent: "" } : {}),
                })
              }
            />
            <div className="min-w-0 flex-1 space-y-4">
              <Label htmlFor="form3-extra-enable-popup" className="cursor-pointer text-sm font-medium">
                Enable popup on selection
              </Label>
              {form.enablePopupOnSelection ? (
                <>
                  <Form1RichTextEditor
                    value={form.popupContent}
                    onChange={(html) => onChange({ popupContent: html })}
                  />
                  <div className="space-y-3 border-t border-sky-200/80 pt-4 dark:border-sky-800/60">
                    <Label className="text-sm font-medium">Display popup on</Label>
                    <RadioGroup
                      value={form.popupDisplay}
                      onValueChange={(val) =>
                        onChange({ popupDisplay: val as FrequencyPopupDisplay })
                      }
                      className="grid gap-2"
                    >
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <RadioGroupItem value="customer_frontend_backend_admin" />
                        Customer frontend, backend &amp; admin
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <RadioGroupItem value="customer_backend_admin" />
                        Customer backend &amp; admin
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <RadioGroupItem value="admin_only" />
                        Admin only
                      </label>
                    </RadioGroup>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Display</h4>
          <RadioGroup
            value={form.display}
            onValueChange={(v: ExtraDisplay) => onChange({ display: v })}
            className="grid gap-2"
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="frontend-backend-admin" /> Customer frontend, backend &amp; admin
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="backend-admin" /> Customer backend &amp; admin
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="admin-only" /> Admin only
            </label>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="form3-extra-override-time"
              checked={form.overrideTimePricing}
              onCheckedChange={(v) => onChange({ overrideTimePricing: !!v })}
            />
            <Label htmlFor="form3-extra-override-time" className="text-sm">
              Override time-based pricing parameters and add extra as separate charge?
            </Label>
            <OrangeInfoTip text="Only applies when the service uses hourly pricing with time-based parameters." />
          </div>
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
            Note: This option will work only in case of hourly service (Pricing parameters time based).
          </p>
          {form.overrideTimePricing ? (
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="form3-extra-exempt-time"
                checked={form.exemptExtraTime}
                onCheckedChange={(v) => onChange({ exemptExtraTime: !!v })}
              />
              <Label htmlFor="form3-extra-exempt-time" className="text-sm">
                Exempt extra&apos;s time from hourly service price calculation
              </Label>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="form3-extra-exempt-discount"
            checked={form.exemptFromDiscount}
            onCheckedChange={(v) => onChange({ exemptFromDiscount: !!v })}
          />
          <Label htmlFor="form3-extra-exempt-discount" className="text-sm">
            Exempt extra from frequency discount?
          </Label>
          <OrangeInfoTip text="When enabled, frequency-based discounts do not reduce the price of this extra." />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Quantity based</Label>
          <RadioGroup
            value={form.qtyBased ? "yes" : "no"}
            onValueChange={(v) => onChange({ qtyBased: v === "yes" })}
            className="flex gap-6"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="yes" /> Yes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="no" /> No
            </label>
          </RadioGroup>
        </div>

        {form.qtyBased ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="form3-extra-maximum">Maximum</Label>
              <Input
                id="form3-extra-maximum"
                type="number"
                min="0"
                value={form.maximum}
                onChange={(e) => {
                  const maximum = e.target.value;
                  onChange({
                    maximum,
                    manualPrices: manualMode
                      ? syncManualRows(maximum, form.manualPrices)
                      : form.manualPrices,
                  });
                }}
                placeholder="Number"
                className="max-w-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Manual Or Multiply structure?</Label>
              <RadioGroup
                value={form.pricingStructure}
                onValueChange={(value: "manual" | "multiply") => {
                  onChange({
                    pricingStructure: value,
                    manualPrices:
                      value === "manual"
                        ? syncManualRows(form.maximum, form.manualPrices)
                        : form.manualPrices,
                  });
                }}
                className="flex gap-6"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="multiply" /> Multiply
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="manual" /> Manual
                </label>
              </RadioGroup>
            </div>
          </>
        ) : null}

        {manualMode && Number(form.maximum) > 0 ? (
          <ManualTierSaMlBlock
            rows={manualRows}
            onRowsChange={(manualPrices) => onChange({ manualPrices })}
          />
        ) : (
          <SingleSaMlBlock
            price={form.price}
            priceMerchant={form.priceMerchant}
            timeHours={form.timeHours}
            timeMinutes={form.timeMinutes}
            hoursMerchant={form.hoursMerchant}
            minutesMerchant={form.minutesMerchant}
            onChange={onChange}
          />
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Select icon</Label>
            <OrangeInfoTip text="Pick a preset icon or upload a square image (recommended max 300×300 px)." />
          </div>
          {(form.icon || uploadedIcon) && (
            <div className="flex items-center gap-3 rounded-md border bg-muted/50 p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-background">
                {uploadedIcon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={uploadedIcon} alt="Custom icon" className="h-8 w-8 object-contain" />
                ) : (
                  (() => {
                    const IconComponent = predefinedIcons.find((i) => i.value === form.icon)?.icon;
                    return IconComponent ? <IconComponent className="h-6 w-6" /> : null;
                  })()
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange({ icon: "" });
                  onUploadedIconChange(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => onShowIconPickerChange(!showIconPicker)}>
              Select Icon
            </Button>
            <span className="text-sm text-muted-foreground">Or</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileSelected(file);
              }}
            />
            <Button type="button" variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={onBrowseUpload}>
              <Upload className="mr-2 h-4 w-4" />
              Browse
            </Button>
          </div>
          {showIconPicker ? (
            <div className="rounded-md border bg-background p-4">
              <div className="mb-3 grid grid-cols-5 gap-2">
                {predefinedIcons.map((iconItem) => {
                  const IconComponent = iconItem.icon;
                  return (
                    <button
                      key={iconItem.value}
                      type="button"
                      onClick={() => {
                        onChange({ icon: iconItem.value });
                        onUploadedIconChange(null);
                        onShowIconPickerChange(false);
                      }}
                      className={`flex flex-col items-center justify-center rounded-md border p-3 hover:bg-muted ${
                        form.icon === iconItem.value ? "border-primary bg-primary/10" : ""
                      }`}
                    >
                      <IconComponent className="mb-1 h-6 w-6" />
                      <span className="text-center text-xs">{iconItem.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">Image size should not be more than 300px by 300px.</p>
        </div>

        <div className="space-y-2">
          <Label>Apply to</Label>
          <RadioGroup
            value={form.applyToAllBookings ? "all" : "first"}
            onValueChange={(value) => onChange({ applyToAllBookings: value === "all" })}
            className="flex flex-wrap gap-4"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="all" /> Apply to all bookings
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="first" /> Apply only to the first appointment
            </label>
          </RadioGroup>
        </div>
      </div>
    </TooltipProvider>
  );
}
