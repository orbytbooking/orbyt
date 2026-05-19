"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type Form3AddonDependenciesState = {
  showBasedOnFrequency: boolean;
  frequencyOptions: string[];
  showBasedOnServiceCategory: boolean;
  serviceCategoryOptions: string[];
  showBasedOnVariables: boolean;
  variableOptions: string[];
};

type Props = {
  form: Form3AddonDependenciesState;
  onChange: (patch: Partial<Form3AddonDependenciesState>) => void;
  frequencyNames: string[];
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {options.map((option) => (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  id={`${idPrefix}-${option}`}
                  checked={selected.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) onChangeSelected([...selected, option]);
                    else onChangeSelected(selected.filter((x) => x !== option));
                  }}
                />
                <Label htmlFor={`${idPrefix}-${option}`} className="cursor-pointer text-sm font-normal">
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

/** Form 3 add-on dependencies tab. */
export function Form3AddonDependenciesFields({
  form,
  onChange,
  frequencyNames,
  serviceCategoryNames,
  itemNames,
}: Props) {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Label className="text-sm font-semibold">Should the add-ons show based on the frequency?</Label>
        <YesNoRadio
          name="form3-addon-dep-frequency"
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
            idPrefix="form3-addon-freq"
            title="Frequencies"
            helper="Do you want this add-on to be shown with a specific frequency or all frequencies?"
            emptyMessage="No frequencies found. Add frequencies for this industry first."
            options={frequencyNames}
            selected={form.frequencyOptions}
            onChangeSelected={(frequencyOptions) => onChange({ frequencyOptions })}
          />
        ) : null}
      </section>

      <section className="space-y-3">
        <Label className="text-sm font-semibold">Should the add-ons show based on the service category?</Label>
        <YesNoRadio
          name="form3-addon-dep-category"
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
            idPrefix="form3-addon-cat"
            title="Service category"
            helper="Which service categories does this add-on belong to?"
            emptyMessage="No service categories found. Add service categories for this industry first."
            options={serviceCategoryNames}
            selected={form.serviceCategoryOptions}
            onChangeSelected={(serviceCategoryOptions) => onChange({ serviceCategoryOptions })}
          />
        ) : null}
      </section>

      <section className="space-y-3">
        <Label className="text-sm font-semibold">Should the add-ons show based on the items?</Label>
        <YesNoRadio
          name="form3-addon-dep-items"
          value={form.showBasedOnVariables}
          onChange={(yes) =>
            onChange({
              showBasedOnVariables: yes,
              ...(yes ? {} : { variableOptions: [] }),
            })
          }
        />
        {form.showBasedOnVariables ? (
          <OptionChecklist
            idPrefix="form3-addon-item"
            title="Items"
            helper="Select which items this add-on should appear with."
            emptyMessage="No items found. Add items for this industry first."
            options={itemNames}
            selected={form.variableOptions}
            onChangeSelected={(variableOptions) => onChange({ variableOptions })}
          />
        ) : null}
      </section>
    </div>
  );
}
