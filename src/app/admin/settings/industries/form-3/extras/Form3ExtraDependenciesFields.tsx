"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type Form3ExtraDependenciesState = {
  showBasedOnFrequency: boolean;
  frequencyOptions: string[];
  showBasedOnLocation: boolean;
  locationOptions: string[];
  showBasedOnServiceCategory: boolean;
  serviceCategoryOptions: string[];
  showBasedOnItems: boolean;
  itemOptions: string[];
};

type Props = {
  form: Form3ExtraDependenciesState;
  onChange: (patch: Partial<Form3ExtraDependenciesState>) => void;
  frequencyNames: string[];
  locationNames: string[];
  serviceCategoryNames: string[];
  itemNames: string[];
};

function YesNoRadio({
  value,
  onChange,
  name,
}: {
  value: boolean;
  onChange: (yes: boolean) => void;
  name: string;
}) {
  return (
    <RadioGroup
      value={value ? "yes" : "no"}
      onValueChange={(v) => onChange(v === "yes")}
      className="flex gap-6"
      name={name}
    >
      <label className="flex items-center gap-2 text-sm">
        <RadioGroupItem value="yes" /> Yes
      </label>
      <label className="flex items-center gap-2 text-sm">
        <RadioGroupItem value="no" /> No
      </label>
    </RadioGroup>
  );
}

function OptionChecklist({
  title,
  helper,
  emptyMessage,
  options,
  selected,
  onChangeSelected,
  idPrefix,
}: {
  title: string;
  helper?: string;
  emptyMessage: string;
  options: string[];
  selected: string[];
  onChangeSelected: (next: string[]) => void;
  idPrefix: string;
}) {
  return (
    <div className="mt-3 rounded-lg border bg-white p-4 shadow-sm dark:bg-background">
      <Label className="mb-1 block text-sm font-semibold">{title}</Label>
      {helper ? <p className="mb-3 text-xs text-muted-foreground">{helper}</p> : null}
      {options.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${idPrefix}-all`}
              checked={options.length > 0 && selected.length === options.length}
              onCheckedChange={(checked) => onChangeSelected(checked === true ? [...options] : [])}
            />
            <Label htmlFor={`${idPrefix}-all`} className="cursor-pointer text-sm font-medium">
              Select All
            </Label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {options.map((option, index) => (
              <div key={`${idPrefix}-${option}-${index}`} className="flex min-w-0 items-center gap-2">
                <Checkbox
                  id={`${idPrefix}-${index}`}
                  checked={selected.includes(option)}
                  onCheckedChange={(checked) => {
                    const set = new Set(selected);
                    if (checked === true) set.add(option);
                    else set.delete(option);
                    onChangeSelected(Array.from(set));
                  }}
                />
                <Label htmlFor={`${idPrefix}-${index}`} className="cursor-pointer truncate text-sm font-normal">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Form 3 extras dependencies: frequency, location, service category, and items. */
export function Form3ExtraDependenciesFields({
  form,
  onChange,
  frequencyNames,
  locationNames,
  serviceCategoryNames,
  itemNames,
}: Props) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-background">
      <p className="mb-6 text-sm font-semibold text-muted-foreground">Form 3</p>
      <div className="space-y-8">
        <section className="space-y-3 border-b pb-8">
          <Label className="text-sm font-semibold">Should the extras show based on the frequency?</Label>
          <YesNoRadio
            name="form3-extra-dep-frequency"
            value={form.showBasedOnFrequency}
            onChange={(yes) =>
              onChange({
                showBasedOnFrequency: yes,
                ...(yes ? {} : { frequencyOptions: [] }),
              })
            }
          />
          {form.showBasedOnFrequency ? (
            <OptionChecklist
              idPrefix="form3-extra-freq"
              title="Frequencies"
              helper="Do you want this parameter to be shown with a specific frequency or all frequencies?"
              emptyMessage="No frequencies found. Add frequencies for this industry first."
              options={frequencyNames}
              selected={form.frequencyOptions}
              onChangeSelected={(frequencyOptions) => onChange({ frequencyOptions })}
            />
          ) : null}
        </section>

        <section className="space-y-3 border-b pb-8">
          <Label className="text-sm font-semibold">Should the extras show based on the location?</Label>
          <YesNoRadio
            name="form3-extra-dep-location"
            value={form.showBasedOnLocation}
            onChange={(yes) =>
              onChange({
                showBasedOnLocation: yes,
                ...(yes ? {} : { locationOptions: [] }),
              })
            }
          />
          {form.showBasedOnLocation ? (
            <OptionChecklist
              idPrefix="form3-extra-loc"
              title="Locations"
              helper="Which locations will this option belong to? You can allow only 1 location to see it or all. If Chicago for example is enabled and New York is not, whenever someone is booking from New York, they will not see this extra option."
              emptyMessage="No locations found. Add locations for this business first."
              options={locationNames}
              selected={form.locationOptions}
              onChangeSelected={(locationOptions) => onChange({ locationOptions })}
            />
          ) : null}
        </section>

        <section className="space-y-3 border-b pb-8">
          <Label className="text-sm font-semibold">Should the extras show based on the service category?</Label>
          <YesNoRadio
            name="form3-extra-dep-category"
            value={form.showBasedOnServiceCategory}
            onChange={(yes) =>
              onChange({
                showBasedOnServiceCategory: yes,
                ...(yes ? {} : { serviceCategoryOptions: [] }),
              })
            }
          />
          {form.showBasedOnServiceCategory ? (
            <OptionChecklist
              idPrefix="form3-extra-cat"
              title="Service category"
              helper="Which service categories does this option belong to? In other words will they see this option if they select a specific service category?"
              emptyMessage="No service categories found. Add service categories for this industry first."
              options={serviceCategoryNames}
              selected={form.serviceCategoryOptions}
              onChangeSelected={(serviceCategoryOptions) => onChange({ serviceCategoryOptions })}
            />
          ) : null}
        </section>

        <section className="space-y-3">
          <Label className="text-sm font-semibold">Should the extras show based on the item?</Label>
          <YesNoRadio
            name="form3-extra-dep-items"
            value={form.showBasedOnItems}
            onChange={(yes) =>
              onChange({
                showBasedOnItems: yes,
                ...(yes ? {} : { itemOptions: [] }),
              })
            }
          />
          {form.showBasedOnItems ? (
            <OptionChecklist
              idPrefix="form3-extra-item"
              title="Items"
              helper="At least one item must be selected so this extra will display on the form."
              emptyMessage="No items found. Add items for this industry first."
              options={itemNames}
              selected={form.itemOptions}
              onChangeSelected={(itemOptions) => onChange({ itemOptions })}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
