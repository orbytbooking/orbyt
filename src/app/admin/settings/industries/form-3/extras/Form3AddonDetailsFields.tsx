"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  reconcileForm3AddonItemPrices,
  type Form3AddonItemPricesByItem,
  type Form3ItemCatalogMeta,
} from "@/lib/form3AddonItemPrices";
import { Form3AddonItemPriceTabs } from "@/app/admin/settings/industries/form-3/extras/Form3AddonItemPriceTabs";
import { Droplets, Home, Info, Layers, Package, Sparkles, Wrench } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ExtraDisplay = "frontend-backend-admin" | "backend-admin" | "admin-only";

const FORM3_ADDON_ICON_PRESETS = [
  { id: "layers", Icon: Layers },
  { id: "package", Icon: Package },
  { id: "sparkles", Icon: Sparkles },
  { id: "home", Icon: Home },
  { id: "droplets", Icon: Droplets },
  { id: "wrench", Icon: Wrench },
] as const;

export type Form3AddonDetailsState = {
  name: string;
  description: string;
  differentOnCustomerEnd: boolean;
  customerEndName: string;
  showExplanationIconOnForm: boolean;
  explanationTooltipText: string;
  enablePopupOnSelection: boolean;
  display: ExtraDisplay;
  qtyBased: boolean;
  pricingStructure: "manual" | "multiply";
  maximum: string;
  selectedItems: string[];
  itemPrices: Form3AddonItemPricesByItem;
  icon: string;
};

type Props = {
  form: Form3AddonDetailsState;
  onChange: (patch: Partial<Form3AddonDetailsState>) => void;
  availableItemNames: string[];
  itemCatalog: Record<string, Form3ItemCatalogMeta>;
  itemsNewHref: string;
  selectedIconId: string;
  onSelectIcon: (id: string) => void;
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

function ItemsChecklist({
  availableItemNames,
  itemsNewHref,
  selectedItems,
  onChangeSelected,
}: {
  availableItemNames: string[];
  itemsNewHref: string;
  selectedItems: string[];
  onChangeSelected: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Items</Label>
        <OrangeInfoTip text="Select which items this add-on applies to. Each selected item gets its own Price & Time tab below." />
      </div>
      {availableItemNames.length === 0 ? (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
          You do not have any items yet.{" "}
          <Link
            href={itemsNewHref}
            className="font-medium text-sky-700 underline hover:text-sky-900 dark:text-sky-300"
          >
            Click here to add a new item.
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-background">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="form3-addon-items-all"
                checked={
                  availableItemNames.length > 0 &&
                  selectedItems.length === availableItemNames.length
                }
                onCheckedChange={(checked) =>
                  onChangeSelected(checked === true ? [...availableItemNames] : [])
                }
              />
              <Label htmlFor="form3-addon-items-all" className="cursor-pointer text-sm font-medium">
                Select All
              </Label>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {availableItemNames.map((name) => (
                <div key={name} className="flex items-center gap-2">
                  <Checkbox
                    id={`form3-addon-item-${name}`}
                    checked={selectedItems.includes(name)}
                    onCheckedChange={(checked) => {
                      if (checked) onChangeSelected([...selectedItems, name]);
                      else onChangeSelected(selectedItems.filter((x) => x !== name));
                    }}
                  />
                  <Label
                    htmlFor={`form3-addon-item-${name}`}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/** Form 3 add-on Details tab (BookingKoala-style). */
export function Form3AddonDetailsFields({
  form,
  onChange,
  availableItemNames,
  itemCatalog,
  itemsNewHref,
  selectedIconId,
  onSelectIcon,
}: Props) {
  const manualMode = form.qtyBased && form.pricingStructure === "manual";

  const reconcilePrices = (
    selectedItems: string[],
    current: Form3AddonItemPricesByItem,
  ) =>
    reconcileForm3AddonItemPrices(selectedItems, current, {
      manualMode,
      itemCatalog,
    });

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="form3-addon-name">Name</Label>
            <OrangeInfoTip text="Internal name for this add-on. Customers see the customer end name when enabled below." />
          </div>
          <Input
            id="form3-addon-name"
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Enter name"
          />
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-start gap-2">
            <Checkbox
              id="form3-addon-diff-customer"
              checked={form.differentOnCustomerEnd}
              onCheckedChange={(checked) =>
                onChange({
                  differentOnCustomerEnd: !!checked,
                  ...(!checked ? { customerEndName: "" } : {}),
                })
              }
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="form3-addon-diff-customer" className="cursor-pointer text-sm font-medium">
                  Different on customer end
                </Label>
                <OrangeInfoTip text="Use a different label for customers on the booking form." />
              </div>
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
          <Label htmlFor="form3-addon-desc">Description</Label>
          <Textarea
            id="form3-addon-desc"
            rows={3}
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Add Description"
          />
        </div>

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-start gap-2">
            <Checkbox
              id="form3-addon-show-explanation"
              checked={form.showExplanationIconOnForm}
              onCheckedChange={(checked) =>
                onChange({
                  showExplanationIconOnForm: !!checked,
                  ...(!checked ? { explanationTooltipText: "" } : {}),
                })
              }
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="form3-addon-show-explanation" className="cursor-pointer text-sm font-medium">
                Show explanation icon on form
              </Label>
              <OrangeInfoTip text="Shows an info icon next to this add-on on the booking form with your tooltip text." />
            </div>
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
              id="form3-addon-enable-popup"
              className="mt-0.5"
              checked={form.enablePopupOnSelection}
              onCheckedChange={(checked) => onChange({ enablePopupOnSelection: !!checked })}
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="form3-addon-enable-popup" className="cursor-pointer text-sm font-medium">
                Enable popup on selection
              </Label>
              <OrangeInfoTip text="Show a popup when the customer selects this add-on." />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Display</h4>
          <p className="text-xs text-muted-foreground">
            Where do you want this add-on to show up? Do you want customers to be able to see it when they are booking
            when logged out or only when they have an account and are logged in, or do you want only admin/staff to see
            this add-on when booking?
          </p>
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
          <Label className="text-sm font-medium">Price and job length increase based on quantity?</Label>
          <RadioGroup
            value={form.qtyBased ? "yes" : "no"}
            onValueChange={(v) => {
              const qtyBased = v === "yes";
              const manualMode = qtyBased && form.pricingStructure === "manual";
              onChange({
                qtyBased,
                itemPrices: reconcileForm3AddonItemPrices(form.selectedItems, form.itemPrices, {
                  manualMode,
                  itemCatalog,
                }),
              });
            }}
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
          <div className="space-y-2">
            <Label className="text-sm font-medium">Manual Or Multiply structure?</Label>
            <RadioGroup
              value={form.pricingStructure}
              onValueChange={(value: "manual" | "multiply") => {
                onChange({
                  pricingStructure: value,
                  itemPrices: reconcilePrices(form.selectedItems, form.itemPrices),
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
        ) : null}

        <ItemsChecklist
          availableItemNames={availableItemNames}
          itemsNewHref={itemsNewHref}
          selectedItems={form.selectedItems}
          onChangeSelected={(selectedItems) =>
            onChange({
              selectedItems,
              itemPrices: reconcilePrices(selectedItems, form.itemPrices),
            })
          }
        />

        {form.selectedItems.length > 0 ? (
          <Form3AddonItemPriceTabs
            selectedItems={form.selectedItems}
            itemPrices={form.itemPrices}
            onItemPricesChange={(itemPrices) => onChange({ itemPrices })}
            manualMode={manualMode}
            itemCatalog={itemCatalog}
          />
        ) : manualMode ? (
          <p className="text-sm text-muted-foreground">
            Select at least one item above to set manual price and time tiers per item quantity.
          </p>
        ) : null}

        <div className="space-y-3">
          <Label className="text-sm font-medium">Select icon</Label>
          <div className="flex flex-wrap gap-2">
            {FORM3_ADDON_ICON_PRESETS.map(({ id, Icon }) => (
              <Button
                key={id}
                type="button"
                variant={selectedIconId === id ? "default" : "outline"}
                size="icon"
                className="h-11 w-11"
                onClick={() => onSelectIcon(id)}
                aria-label={`Icon ${id}`}
              >
                <Icon className="h-5 w-5" />
              </Button>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
