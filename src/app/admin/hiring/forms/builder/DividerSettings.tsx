import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DividerFieldConfig, DividerStyle, FormField } from './page';

interface DividerSettingsProps {
  field: FormField;
  onChange: (updates: Partial<FormField>) => void;
}

export function DividerSettings({ field, onChange }: DividerSettingsProps) {
  const config: DividerFieldConfig = {
    color: '#DEE2E6',
    style: 'solid',
    height: 1,
    marginTop: 10,
    marginBottom: 10,
    ...field.dividerConfig,
  };

  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Color</Label>
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded border border-input"
            style={{ backgroundColor: config.color }}
          />
          <Input
            className="flex-1"
            placeholder="#DEE2E6"
            value={config.color ?? ''}
            onChange={(e) =>
              onChange({ dividerConfig: { color: e.target.value || undefined } })
            }
          />
        </div>
      </div>

      <div className="space-y-1.5 pt-2 border-t">
        <Label className="text-sm font-medium text-slate-700">Style</Label>
        <Select
          value={config.style ?? 'solid'}
          onValueChange={(value) =>
            onChange({ dividerConfig: { style: value as DividerStyle } })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Restrict the users to enter the same type of characters set which you have selected from
          the list.
        </p>
      </div>

      <div className="space-y-1.5 pt-2 border-t">
        <Label className="text-sm font-medium text-slate-700">Height</Label>
        <Input
          type="number"
          min={1}
          value={config.height ?? 1}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange({ dividerConfig: { height: Number.isNaN(n) ? undefined : n } });
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Margin top</Label>
        <Input
          type="number"
          value={config.marginTop ?? 10}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange({ dividerConfig: { marginTop: Number.isNaN(n) ? undefined : n } });
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Margin bottom</Label>
        <Input
          type="number"
          value={config.marginBottom ?? 10}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange({ dividerConfig: { marginBottom: Number.isNaN(n) ? undefined : n } });
          }}
        />
      </div>

      <div className="space-y-2 pt-2 border-t">
        <Label className="text-sm font-medium text-slate-700">Hidden</Label>
        <div className="flex items-center gap-2">
          <Switch
            checked={field.hidden ?? false}
            onCheckedChange={(checked) => onChange({ hidden: checked })}
          />
          <span className="text-sm text-muted-foreground">
            {field.hidden ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          User can not see this field when enable.
        </p>
      </div>
    </>
  );
}

