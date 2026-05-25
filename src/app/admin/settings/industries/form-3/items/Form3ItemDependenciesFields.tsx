"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type Form3ItemDependenciesState = {
  showBasedOnFrequency: boolean;
  frequencyOptions: string[];
  showBasedOnLocation: boolean;
  locationOptions: string[];
  showBasedOnServiceCategory: boolean;
  serviceCategoryOptions: string[];
};

type Props = {
  form: Form3ItemDependenciesState;
  onChange: (patch: Partial<Form3ItemDependenciesState>) => void;
  frequencyNames: string[];
  locationNames: string[];
  serviceCategoryNames: string[];
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
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {options.map((opt, index) => (
              <div key={`${idPrefix}-${opt}-${index}`} className="flex min-w-0 items-center gap-2">
                <Checkbox
                  id={`${idPrefix}-${index}`}
                  checked={selected.includes(opt)}
                  onCheckedChange={(checked) => {
                    const set = new Set(selected);
                    if (checked === true) set.add(opt);
                    else set.delete(opt);
                    onChangeSelected(Array.from(set));
                  }}
                />
                <Label htmlFor={`${idPrefix}-${index}`} className="cursor-pointer truncate text-sm font-normal">
                  {opt}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Form 3 item dependencies tab (frequency, location, service category). */
export function Form3ItemDependenciesFields({
  form,
  onChange,
  frequencyNames,
  locationNames,
  serviceCategoryNames,
}: Props) {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Label className="text-sm font-semibold">Should the item show based on the frequency?</Label>
        <YesNoRadio
          name="form3-item-dep-frequency"
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
            idPrefix="form3-item-freq"
            title="Frequencies"
            helper="Do you want this item to be shown with a specific frequency or all frequencies?"
            emptyMessage="No frequencies found. Add frequencies for this industry first."
            options={frequencyNames}
            selected={form.frequencyOptions}
            onChangeSelected={(frequencyOptions) => onChange({ frequencyOptions })}
          />
        ) : null}
      </section>

      <section className="space-y-3">
        <Label className="text-sm font-semibold">Should the item show based on the location?</Label>
        <YesNoRadio
          name="form3-item-dep-location"
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
            idPrefix="form3-item-loc"
            title="Locations"
            helper="If you want to restrict the visibility of this item to a specific location, you can do that here."
            emptyMessage="No locations found. Add locations for this business first."
            options={locationNames}
            selected={form.locationOptions}
            onChangeSelected={(locationOptions) => onChange({ locationOptions })}
          />
        ) : null}
      </section>

      <section className="space-y-3">
        <Label className="text-sm font-semibold">Should the item show based on the service category?</Label>
        <YesNoRadio
          name="form3-item-dep-category"
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
            idPrefix="form3-item-cat"
            title="Service category"
            helper="Which service categories does this option belong to? In other words will they see this option if they select a specific service category?"
            emptyMessage="No service categories found. Add service categories for this industry first."
            options={serviceCategoryNames}
            selected={form.serviceCategoryOptions}
            onChangeSelected={(serviceCategoryOptions) => onChange({ serviceCategoryOptions })}
          />
        ) : null}
      </section>
    </div>
  );
}
