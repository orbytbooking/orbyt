'use client';

import { useState, useCallback, Fragment } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/admin/hiring/RichTextEditor';
import {
  ArrowLeft,
  HelpCircle,
  Eye,
  Save,
  Upload,
  Palette,
  Type,
  Minus,
  FileInput,
  Hash,
  List,
  Circle,
  ListOrdered,
  X,
  Check,
  ImagePlus,
  User,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Clock,
  Star,
  PenLine,
  SlidersHorizontal,
  GripVertical,
  Pencil,
  Copy,
  Trash2,
} from 'lucide-react';

const DRAG_TYPE = 'application/x-form-builder-element';
const MOVE_TYPE = 'application/x-form-builder-move';

function getDefaultFormFields(): FormField[] {
  return [
    { id: makeId('name'), type: 'name' },
    { id: makeId('email'), type: 'email' },
    { id: makeId('phone'), type: 'phone' },
  ];
}

type FormFieldType =
  | 'header'
  | 'label'
  | 'paragraph'
  | 'divider'
  | 'text'
  | 'number'
  | 'multiline'
  | 'dropdown'
  | 'radio'
  | 'multiple'
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'file'
  | 'date'
  | 'time'
  | 'rating'
  | 'image'
  | 'signature'
  | 'range';

export interface NameSubFieldConfig {
  label?: string;
  placeholder?: string;
  subLabel?: string;
  tooltip?: string;
  error?: string;
  required?: boolean;
}

const DEFAULT_FIRST: NameSubFieldConfig = {
  label: 'First Name',
  placeholder: 'Ex: James',
  error: 'This field should not be empty',
  required: true,
};
const DEFAULT_LAST: NameSubFieldConfig = {
  label: 'Last Name',
  placeholder: 'Ex: Lee',
  error: 'This field should not be empty',
  required: true,
};
const DEFAULT_MIDDLE: NameSubFieldConfig = {
  label: 'Middle Name',
  placeholder: 'Ex: John',
  required: false,
};

export type NameSubFieldKey = 'first' | 'middle' | 'last';

export interface NameFieldConfig {
  horizontal: boolean;
  columns: number;
  middleName: boolean;
  subFields?: Partial<Record<NameSubFieldKey, Partial<NameSubFieldConfig>>>;
}

const DEFAULT_NAME_CONFIG: NameFieldConfig = {
  horizontal: true,
  columns: 2,
  middleName: false,
};

export interface HeaderFieldConfig {
  header?: string;
  subHeader?: string;
  hidden?: boolean;
}

const DEFAULT_HEADER_CONFIG: HeaderFieldConfig = {
  header: 'Heading',
  subHeader: '',
  hidden: false,
};

export interface EmailFieldConfig {
  subLabel?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

const DEFAULT_EMAIL_CONFIG: EmailFieldConfig = {
  placeholder: 'Ex: example@xyz.com',
  required: true,
  error: 'This field should not be empty',
};

export interface FieldCommonConfig {
  subLabel?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  readOnly?: boolean;
  charLimitEnabled?: boolean;
  charLimit?: number;
  defaultValue?: number;
}

export interface DropdownOption {
  id: string;
  label: string;
}

export interface DropdownFieldConfig extends FieldCommonConfig {
  options?: DropdownOption[];
  required?: boolean;
  error?: string;
  readOnly?: boolean;
  autoRejectEnabled?: boolean;
  autoRejectOptionIds?: string[];
  defaultOptionId?: string;
}

export interface RadioFieldConfig extends FieldCommonConfig {
  options?: DropdownOption[];
  horizontal?: boolean;
  defaultOptionId?: string;
  required?: boolean;
  error?: string;
  readOnly?: boolean;
  autoRejectEnabled?: boolean;
  autoRejectOptionIds?: string[];
}

export interface MultipleFieldConfig extends FieldCommonConfig {
  options?: DropdownOption[];
  horizontal?: boolean;
  defaultOptionIds?: string[];
  required?: boolean;
  error?: string;
  readOnly?: boolean;
  autoRejectEnabled?: boolean;
  autoRejectOptionIds?: string[];
}

export type DividerStyle = 'solid' | 'dashed' | 'dotted';

export interface DividerFieldConfig {
  color?: string;
  style?: DividerStyle;
  height?: number;
  marginTop?: number;
  marginBottom?: number;
}

export interface FileFieldConfig {
  fileTypes?: string;
  fileSizeLimitEnabled?: boolean;
  minFileSizeKB?: number;
  maxFileSizeKB?: number;
  multiple?: boolean;
  maxFiles?: number;
}

const DEFAULT_FILE_CONFIG: FileFieldConfig = {
  fileTypes: '',
  fileSizeLimitEnabled: false,
  minFileSizeKB: 0,
  maxFileSizeKB: 0,
  multiple: false,
  maxFiles: 1,
};

export type MultilineValidation =
  | 'none'
  | 'alphabetic'
  | 'numeric'
  | 'alphanumeric'
  | 'email';

export interface MultilineFieldConfig extends FieldCommonConfig {
  validation?: MultilineValidation;
  height?: number;
  editorType?: 'plain' | 'editor';
  required?: boolean;
  error?: string;
  charLimitEnabled?: boolean;
  charLimit?: number;
  readOnly?: boolean;
}

const DEFAULT_MULTILINE_CONFIG: MultilineFieldConfig = {
  validation: 'none',
  height: 150,
  editorType: 'plain',
  required: false,
  error: 'This field should not be empty',
  charLimitEnabled: false,
  charLimit: 0,
  placeholder: 'Enter text...',
};

function applyMultilineValidation(value: string, validation: MultilineValidation): string {
  switch (validation) {
    case 'alphabetic':
      // letters and spaces only
      return value.replace(/[^a-zA-Z\s]/g, '');
    case 'numeric':
      // digits only
      return value.replace(/[^0-9]/g, '');
    case 'alphanumeric':
      // letters, digits, and spaces
      return value.replace(/[^a-zA-Z0-9\s]/g, '');
    case 'email':
      // simple: disallow spaces
      return value.replace(/\s+/g, '');
    case 'none':
    default:
      return value;
  }
}

function getDefaultSubField(key: NameSubFieldKey): NameSubFieldConfig {
  if (key === 'first') return { ...DEFAULT_FIRST };
  if (key === 'last') return { ...DEFAULT_LAST };
  return { ...DEFAULT_MIDDLE };
}

interface FormField {
  id: string;
  type: FormFieldType;
  uniqueName?: string;
  label?: string;
  tooltip?: string;
  hidden?: boolean;
  nameConfig?: Partial<NameFieldConfig>;
  headerConfig?: Partial<HeaderFieldConfig>;
  emailConfig?: Partial<EmailFieldConfig>;
  fieldConfig?: Partial<FieldCommonConfig>;
  dropdownConfig?: Partial<DropdownFieldConfig>;
  dividerConfig?: Partial<DividerFieldConfig>;
  multilineConfig?: Partial<MultilineFieldConfig>;
  radioConfig?: Partial<RadioFieldConfig>;
  multipleConfig?: Partial<MultipleFieldConfig>;
  fileConfig?: Partial<FileFieldConfig>;
}

function getDefaultLabel(type: FormFieldType): string {
  const map: Record<FormFieldType, string> = {
    header: 'Header',
    label: 'Label',
    paragraph: 'Paragraph',
    divider: '',
    text: 'Text',
    number: 'Number',
    multiline: 'Multi-line',
    dropdown: 'Dropdown',
    radio: 'Radio',
    multiple: 'Multiple choice',
    name: 'Name',
    email: 'Email',
    phone: 'Phone Number',
    address: 'Address',
    file: 'File upload',
    date: 'Date',
    time: 'Time',
    rating: 'Rating',
    image: 'Image',
    signature: 'Signature',
    range: 'Range',
  };
  return map[type] ?? type;
}

function getFieldPanelTitle(type: FormFieldType): string {
  const map: Record<FormFieldType, string> = {
    name: 'Full Name',
    email: 'Email',
    phone: 'Phone Number',
    header: 'Header',
    label: 'Label',
    paragraph: 'Paragraph',
    text: 'Text Input',
    number: 'Number',
    multiline: 'Multi-line Input',
    dropdown: 'Dropdown',
    radio: 'Radio Button',
    multiple: 'Multiple Choice',
    divider: 'Divider',
    address: 'Address',
    file: 'File upload',
    date: 'Date Picker',
    time: 'Time',
    rating: 'Rating',
    image: 'Image',
    signature: 'Signature',
    range: 'Range',
  };
  return map[type] ?? type;
}

function makeId(type: string): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getDefaultUniqueName(field: FormField): string {
  const suffix = field.id.split('-').pop()?.slice(0, 6) ?? field.id.slice(-6);
  return `${field.type}_${suffix}`;
}

/** Renders label/sublabel content that may be HTML (from RichTextEditor) or plain text */
function LabelContent({
  html,
  className,
  asParagraph,
}: {
  html: string;
  className?: string;
  asParagraph?: boolean;
}) {
  const trimmed = html?.trim() ?? '';
  const isHtml = trimmed.startsWith('<');
  const safeHtml = isHtml ? trimmed : `<p>${trimmed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
  const Wrapper = asParagraph ? 'p' : 'span';
  return (
    <Wrapper
      className={cn('inline [&_p]:mb-0 [&_p]:inline', className)}
      dangerouslySetInnerHTML={{ __html: safeHtml || '<p></p>' }}
    />
  );
}

const BASIC_ELEMENTS = [
  { id: 'header' as const, label: 'Header', icon: Type },
  { id: 'label' as const, label: 'Label', icon: Type },
  { id: 'paragraph' as const, label: 'Paragraph', icon: Type },
  { id: 'divider' as const, label: 'Divider', icon: Minus },
  { id: 'text' as const, label: 'Text Input', icon: FileInput },
  { id: 'number' as const, label: 'Number', icon: Hash },
  { id: 'multiline' as const, label: 'Multi-line Input', icon: FileInput },
  { id: 'dropdown' as const, label: 'Dropdown', icon: List },
  { id: 'radio' as const, label: 'Radio Button', icon: Circle },
  { id: 'multiple' as const, label: 'Multiple Choice', icon: ListOrdered },
] as const;

const ADVANCED_ELEMENTS = [
  { id: 'name' as const, label: 'Name', icon: User },
  { id: 'email' as const, label: 'Email', icon: Mail },
  { id: 'phone' as const, label: 'Phone Number', icon: Phone },
  { id: 'address' as const, label: 'Address', icon: MapPin },
  { id: 'file' as const, label: 'File upload', icon: Upload },
  { id: 'date' as const, label: 'Date Picker', icon: Calendar },
  { id: 'time' as const, label: 'Time', icon: Clock },
  { id: 'rating' as const, label: 'Rating', icon: Star },
  { id: 'image' as const, label: 'Image', icon: ImagePlus },
  { id: 'signature' as const, label: 'Signature', icon: PenLine },
  { id: 'range' as const, label: 'Range', icon: SlidersHorizontal },
] as const;

const VALID_FIELD_TYPES: FormFieldType[] = [
  'header', 'label', 'paragraph', 'divider', 'text', 'number', 'multiline',
  'dropdown', 'radio', 'multiple', 'name', 'email', 'phone',
  'address', 'file', 'date', 'time', 'rating', 'image', 'signature', 'range',
];

function FormFieldBlock({
  field,
  isSelected,
  onSelect,
  onRemove,
  onDragStart,
  onDuplicate,
  errorMessage,
  disableFileInputs,
}: {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDuplicate: () => void;
  errorMessage?: string;
  /** When true (e.g. in builder), file/image areas do not open the system file picker on click */
  disableFileInputs?: boolean;
}) {
  const inputErrorClass = errorMessage ? 'border-destructive focus-visible:ring-destructive' : '';
  const showErrorBlock = !!errorMessage;
  const displayLabel = field.label ?? getDefaultLabel(field.type);
  const commonConfig = field.fieldConfig ?? {};
  const dropdownConfig = field.dropdownConfig;
  const multilineConfig: MultilineFieldConfig = {
    ...DEFAULT_MULTILINE_CONFIG,
    ...field.multilineConfig,
  };
  const radioConfig: RadioFieldConfig = {
    options: [
      { id: '1', label: 'Option 1' },
      { id: '2', label: 'Option 2' },
    ],
    horizontal: true,
    required: false,
    error: 'This field should not be empty',
    ...field.radioConfig,
  };
  const multipleConfig: MultipleFieldConfig = {
    options: [
      { id: '1', label: 'Option 1' },
      { id: '2', label: 'Option 2' },
    ],
    horizontal: true,
    required: false,
    error: 'This field should not be empty',
    autoRejectEnabled: false,
    autoRejectOptionIds: [],
    defaultOptionIds: [],
    ...field.multipleConfig,
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if ((e.target as HTMLElement)?.closest?.('[data-element-toolbar]')) return;
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={cn(
        'group relative cursor-grab active:cursor-grabbing rounded-md border transition-colors p-1 -m-1',
        isSelected
          ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
          : 'border-transparent hover:border-slate-200 hover:bg-slate-50/50'
      )}
      draggable
      onDragStart={(e) => {
        const inToolbar = (e.target as HTMLElement)?.closest?.('[data-element-toolbar]');
        const onHandle = (e.target as HTMLElement)?.closest?.('[data-drag-handle]');
        if (inToolbar && !onHandle) {
          e.preventDefault();
          return;
        }
        onDragStart(e);
      }}
    >
      <div
        data-element-toolbar
        className={cn(
          'absolute top-0 right-0 z-10 flex items-center gap-0.5 rounded-md overflow-hidden bg-primary text-primary-foreground shadow-sm transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        <span
          data-drag-handle
          role="button"
          tabIndex={0}
          className="p-1.5 hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-ring rounded-none cursor-grab active:cursor-grabbing inline-flex"
          title="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <button
          type="button"
          className="p-1.5 hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-ring rounded-none"
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="p-1.5 hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-ring rounded-none"
          title="Duplicate"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="p-1.5 hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-ring rounded-none"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {field.type === 'header' && (() => {
        const config = { ...DEFAULT_HEADER_CONFIG, ...field.headerConfig };
        if (config.hidden) return <div className="text-sm text-muted-foreground italic">Hidden header</div>;
        const headingHtml = config.header?.trim() || `<p>${field.label ?? getDefaultLabel('header')}</p>`;
        const subHtml = config.subHeader?.trim();
        return (
          <div className="space-y-1">
            <div
              className="text-lg font-semibold [&_p]:mb-0 [&_p]:inline"
              dangerouslySetInnerHTML={{ __html: headingHtml }}
            />
            {subHtml ? (
              <div
                className="text-sm text-muted-foreground [&_p]:mb-0"
                dangerouslySetInnerHTML={{ __html: subHtml }}
              />
            ) : null}
          </div>
        );
      })()}
      {field.type === 'label' && (
        field.hidden ? (
          <div className="text-sm text-muted-foreground italic">Hidden label</div>
        ) : (
          <Label className="text-sm">
            <LabelContent html={displayLabel || ''} />
          </Label>
        )
      )}
      {field.type === 'paragraph' && (
        field.hidden ? (
          <p className="text-sm text-muted-foreground italic">Hidden paragraph</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            <LabelContent html={displayLabel || 'Paragraph text'} />
          </p>
        )
      )}
      {field.type === 'divider' && (() => {
        const config: DividerFieldConfig = {
          color: '#DEE2E6',
          style: 'solid',
          height: 1,
          marginTop: 10,
          marginBottom: 10,
          ...field.dividerConfig,
        };
        if (field.hidden) {
          return <p className="text-sm text-muted-foreground italic">Hidden divider</p>;
        }
        return (
          <hr
            className="border-0"
            style={{
              borderTopColor: config.color,
              borderTopStyle: config.style,
              borderTopWidth: `${config.height ?? 1}px`,
              marginTop: config.marginTop ?? 10,
              marginBottom: config.marginBottom ?? 10,
            }}
          />
        );
      })()}
      {field.type === 'text' && (
        <div className="space-y-1.5">
          <Label className="text-sm">
            <LabelContent html={displayLabel || ''} />
            {commonConfig.required ? ' *' : ''}
          </Label>
          <Input
            name={field.id}
            placeholder={commonConfig.placeholder || 'Enter text'}
            className={inputErrorClass}
          />
          {commonConfig.subLabel && (
            <div className="text-xs text-muted-foreground">
              <LabelContent html={commonConfig.subLabel} />
            </div>
          )}
          {showErrorBlock && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
              {errorMessage}
            </p>
          )}
        </div>
      )}
      {field.type === 'number' && (
        field.hidden ? (
          <p className="text-sm text-muted-foreground italic">Hidden number input</p>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-sm">
              <LabelContent html={displayLabel || ''} />
              {commonConfig.required ? ' *' : ''}
            </Label>
            <Input
              name={field.id}
              type="number"
              min={0}
              placeholder={commonConfig.placeholder || '0'}
              readOnly={commonConfig.readOnly ?? false}
              defaultValue={commonConfig.defaultValue}
              className={inputErrorClass}
            />
            {commonConfig.subLabel && (
              <div className="text-xs text-muted-foreground">
                <LabelContent html={commonConfig.subLabel} />
              </div>
            )}
            {showErrorBlock && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
                {errorMessage}
              </p>
            )}
          </div>
        )
      )}
      {field.type === 'multiline' && (
        field.hidden ? (
          <p className="text-sm text-muted-foreground italic">Hidden multi-line input</p>
        ) : multilineConfig.editorType === 'editor' ? (
          <div className="space-y-1.5">
            <Label className="text-sm">
              <LabelContent html={displayLabel || ''} />
              {multilineConfig.required ? ' *' : ''}
            </Label>
            <div style={{ minHeight: multilineConfig.height ?? 150 }}>
              <RichTextEditor
                placeholder={commonConfig.placeholder || multilineConfig.placeholder || 'Enter text...'}
                className="w-full"
                defaultFontSize="14px"
              />
            </div>
            {commonConfig.subLabel && (
              <div className="text-xs text-muted-foreground">
                <LabelContent html={commonConfig.subLabel} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-sm">
              <LabelContent html={displayLabel || ''} />
              {multilineConfig.required ? ' *' : ''}
            </Label>
            <Textarea
              name={field.id}
              className={cn('resize-y', inputErrorClass)}
              style={{ minHeight: multilineConfig.height ?? 150 }}
              placeholder={commonConfig.placeholder || multilineConfig.placeholder || 'Enter text...'}
              readOnly={multilineConfig.readOnly ?? false}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                const validated = applyMultilineValidation(
                  target.value,
                  multilineConfig.validation ?? 'none'
                );
                if (validated !== target.value) {
                  target.value = validated;
                }
                if (multilineConfig.charLimitEnabled && typeof multilineConfig.charLimit === 'number') {
                  if (validated.length > multilineConfig.charLimit) {
                    target.value = validated.slice(0, multilineConfig.charLimit);
                  }
                }
              }}
            />
            {commonConfig.subLabel && (
              <div className="text-xs text-muted-foreground">
                <LabelContent html={commonConfig.subLabel} />
              </div>
            )}
            {showErrorBlock && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
                {errorMessage}
              </p>
            )}
          </div>
        )
      )}
      {field.type === 'dropdown' && (() => {
        const opts = dropdownConfig?.options ?? [
          { id: '1', label: 'Option 1' },
          { id: '2', label: 'Option 2' },
        ];
        const defaultOpt = opts.find((o) => o.id === dropdownConfig?.defaultOptionId);
        const placeholderText = commonConfig.placeholder ?? 'Select...';
        if (field.hidden) {
          return <p className="text-sm text-muted-foreground italic">Hidden dropdown</p>;
        }
        return (
          <div className="space-y-1.5">
            <Label className="text-sm">
              <LabelContent html={displayLabel || ''} />
              {dropdownConfig?.required ? ' *' : ''}
            </Label>
            <select
              name={field.id}
              disabled={dropdownConfig?.readOnly ?? false}
              defaultValue={defaultOpt?.id ?? ''}
              className={cn(
                'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                inputErrorClass
              )}
            >
              <option value="">{placeholderText}</option>
              {opts.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            {commonConfig.subLabel && (
              <div className="text-xs text-muted-foreground">
                <LabelContent html={commonConfig.subLabel} />
              </div>
            )}
            {showErrorBlock && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
                {errorMessage}
              </p>
            )}
          </div>
        );
      })()}
      {field.type === 'radio' && (() => {
        if (field.hidden) {
          return <p className="text-sm text-muted-foreground italic">Hidden radio group</p>;
        }
        const opts = radioConfig.options ?? [
          { id: '1', label: 'Option 1' },
          { id: '2', label: 'Option 2' },
        ];
        const defaultId = radioConfig.defaultOptionId ?? opts[0]?.id;
        const layoutClass = radioConfig.horizontal ? 'flex flex-wrap gap-4' : 'space-y-1.5';
        return (
          <div className="space-y-2">
            <Label className="text-sm">
              <LabelContent html={displayLabel || ''} />
              {radioConfig.required ? ' *' : ''}
            </Label>
            <div className={layoutClass}>
              {opts.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={field.id}
                    defaultChecked={opt.id === defaultId}
                    disabled={radioConfig.readOnly ?? false}
                  />{' '}
                  {opt.label}
                </label>
              ))}
            </div>
            {commonConfig.subLabel && (
              <div className="text-xs text-muted-foreground">
                <LabelContent html={commonConfig.subLabel} />
              </div>
            )}
            {showErrorBlock && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
                {errorMessage}
              </p>
            )}
          </div>
        );
      })()}
      {field.type === 'multiple' && (() => {
        if (field.hidden) {
          return <p className="text-sm text-muted-foreground italic">Hidden multiple choice</p>;
        }
        const opts = multipleConfig.options ?? [
          { id: '1', label: 'Option 1' },
          { id: '2', label: 'Option 2' },
        ];
        const defaultIds = multipleConfig.defaultOptionIds ?? [];
        const layoutClass = multipleConfig.horizontal ? 'flex flex-wrap gap-4' : 'space-y-1.5';
        return (
          <div className="space-y-2">
            <Label className="text-sm">
              <LabelContent html={displayLabel || ''} />
              {multipleConfig.required ? ' *' : ''}
            </Label>
            <div className={layoutClass}>
              {opts.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={field.id}
                    defaultChecked={defaultIds.includes(opt.id)}
                    disabled={multipleConfig.readOnly ?? false}
                    value={opt.id}
                  />{' '}
                  {opt.label}
                </label>
              ))}
            </div>
            {commonConfig.subLabel && (
              <div className="text-xs text-muted-foreground">
                <LabelContent html={commonConfig.subLabel} />
              </div>
            )}
            {showErrorBlock && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
                {errorMessage}
              </p>
            )}
          </div>
        );
      })()}
      {field.type === 'name' && (() => {
        const config = { ...DEFAULT_NAME_CONFIG, ...field.nameConfig };
        const cols = Math.min(3, Math.max(1, config.columns));
        const first = { ...getDefaultSubField('first'), ...config.subFields?.first };
        const middle = { ...getDefaultSubField('middle'), ...config.subFields?.middle };
        const last = { ...getDefaultSubField('last'), ...config.subFields?.last };
        const showNameError = showErrorBlock;
        return (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900">
              <LabelContent html={displayLabel || ''} />
            </h3>
            <div
              className={cn(
                'gap-3',
                config.horizontal
                  ? cn('grid', cols === 1 && 'grid-cols-1', cols === 2 && 'grid-cols-2', cols === 3 && 'grid-cols-3')
                  : 'flex flex-col'
              )}
            >
              <div className={cn(config.horizontal ? '' : 'space-y-1.5')}>
                <Label className="text-sm">
                  <LabelContent html={first.label ?? ''} />{first.required ? ' *' : ''}
                </Label>
                <Input name={`${field.id}_first`} placeholder={first.placeholder} className={showNameError && first.required ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {first.subLabel && (
                  <div className="text-xs text-muted-foreground">
                    <LabelContent html={first.subLabel} />
                  </div>
                )}
                {showNameError && first.required && !errorMessage && first.error && (
                  <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
                    {first.error}
                  </p>
                )}
              </div>
              {config.middleName && (
                <div className={cn(config.horizontal ? '' : 'space-y-1.5')}>
                  <Label className="text-sm">
                    <LabelContent html={middle.label ?? ''} />{middle.required ? ' *' : ''}
                  </Label>
                  <Input name={`${field.id}_middle`} placeholder={middle.placeholder} className={showNameError && middle.required ? 'border-destructive focus-visible:ring-destructive' : ''} />
                  {middle.subLabel && (
                    <div className="text-xs text-muted-foreground">
                      <LabelContent html={middle.subLabel} />
                    </div>
                  )}
                  {showNameError && middle.required && middle.error && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
                      {middle.error}
                    </p>
                  )}
                </div>
              )}
              <div className={cn(config.horizontal ? '' : 'space-y-1.5')}>
                <Label className="text-sm">
                  <LabelContent html={last.label ?? ''} />{last.required ? ' *' : ''}
                </Label>
                <Input name={`${field.id}_last`} placeholder={last.placeholder} className={showNameError && last.required ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {last.subLabel && (
                  <div className="text-xs text-muted-foreground">
                    <LabelContent html={last.subLabel} />
                  </div>
                )}
                {showNameError && last.required && !errorMessage && last.error && (
                  <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
                    {last.error}
                  </p>
                )}
              </div>
            </div>
            {showErrorBlock && errorMessage && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
                {errorMessage}
              </p>
            )}
          </div>
        );
      })()}
      {field.type === 'email' && (() => {
        const emailConfig = { ...DEFAULT_EMAIL_CONFIG, ...field.emailConfig };
        return (
          <div className="space-y-1.5">
            <Label className="text-sm">
              <LabelContent html={displayLabel || ''} />{emailConfig.required ? ' *' : ''}
            </Label>
            <Input
              name={field.id}
              type="email"
              placeholder={emailConfig.placeholder}
              className={inputErrorClass}
            />
            {emailConfig.subLabel && (
              <div className="text-xs text-muted-foreground">
                <LabelContent html={emailConfig.subLabel} />
              </div>
            )}
            {showErrorBlock && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
                {errorMessage}
              </p>
            )}
          </div>
        );
      })()}
      {field.type === 'phone' && (
        <div className="space-y-1.5">
          <Label className="text-sm">
            <LabelContent html={displayLabel || ''} />
            {commonConfig.required ? ' *' : ''}
          </Label>
          <Input
            name={field.id}
            placeholder={commonConfig.placeholder || 'Phone No.'}
            className={inputErrorClass}
          />
          {commonConfig.subLabel && (
            <div className="text-xs text-muted-foreground">
              <LabelContent html={commonConfig.subLabel} />
            </div>
          )}
          {showErrorBlock && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
              {errorMessage}
            </p>
          )}
        </div>
      )}
      {field.type === 'address' && (
        field.hidden ? (
          <p className="text-sm text-muted-foreground italic">Hidden address</p>
        ) : (
        <div className="space-y-1.5">
          <Label className="text-sm">
            <LabelContent html={displayLabel || ''} />
            {commonConfig.required ? ' *' : ''}
          </Label>
          <Input
            name={field.id}
            placeholder={commonConfig.placeholder || 'Street, City, ZIP'}
            className={inputErrorClass}
          />
          {commonConfig.subLabel && (
            <div className="text-xs text-muted-foreground">
              <LabelContent html={commonConfig.subLabel} />
            </div>
          )}
          {showErrorBlock && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
              {errorMessage}
            </p>
          )}
        </div>
        )
      )}
      {field.type === 'file' && (
        field.hidden ? (
          <p className="text-sm text-muted-foreground italic">Hidden file upload</p>
        ) : (
        <div className="space-y-1.5">
          <Label className="text-sm">
            <LabelContent html={displayLabel || ''} />
            {commonConfig.required ? ' *' : ''}
          </Label>
          {disableFileInputs ? (
            <div
              className={cn(
                'flex items-center justify-center rounded-md border border-dashed border-input px-4 py-6 text-sm text-muted-foreground',
                showErrorBlock && 'border-destructive'
              )}
            >
              Drop file here or click to upload
            </div>
          ) : (
            <label htmlFor={`${field.id}-file`} className="block cursor-pointer">
              <input
                id={`${field.id}-file`}
                type="file"
                name={field.id}
                className="sr-only"
              />
              <div className={cn(
                'flex items-center justify-center rounded-md border border-dashed border-input px-4 py-6 text-sm text-muted-foreground',
                showErrorBlock && 'border-destructive'
              )}>
                Drop file here or click to upload
              </div>
            </label>
          )}
          {commonConfig.subLabel && (
            <div className="text-xs text-muted-foreground">
              <LabelContent html={commonConfig.subLabel} />
            </div>
          )}
          {showErrorBlock && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
              {errorMessage}
            </p>
          )}
        </div>
        )
      )}
      {field.type === 'date' && (
        <div className="space-y-1.5">
          <Label className="text-sm">
            <LabelContent html={displayLabel || ''} />
            {commonConfig.required ? ' *' : ''}
          </Label>
          <Input
            name={field.id}
            type="date"
            placeholder={commonConfig.placeholder}
            className={inputErrorClass}
          />
          {commonConfig.subLabel && (
            <div className="text-xs text-muted-foreground">
              <LabelContent html={commonConfig.subLabel} />
            </div>
          )}
          {showErrorBlock && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
              {errorMessage}
            </p>
          )}
        </div>
      )}
      {field.type === 'time' && (
        field.hidden ? (
          <p className="text-sm text-muted-foreground italic">Hidden time</p>
        ) : (
        <div className="space-y-1.5">
          <Label className="text-sm">
            <LabelContent html={displayLabel || ''} />
            {commonConfig.required ? ' *' : ''}
          </Label>
          <Input
            name={field.id}
            type="time"
            placeholder={commonConfig.placeholder}
            className={inputErrorClass}
          />
          {commonConfig.subLabel && (
            <div className="text-xs text-muted-foreground">
              <LabelContent html={commonConfig.subLabel} />
            </div>
          )}
          {showErrorBlock && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
              {errorMessage}
            </p>
          )}
        </div>
        )
      )}
      {field.type === 'rating' && (
        <div className="space-y-1.5">
          <Label className="text-sm">
            <LabelContent html={displayLabel || ''} />
            {commonConfig.required ? ' *' : ''}
          </Label>
          <input type="hidden" name={field.id} value="0" id={`${field.id}-rating`} />
          <div className="flex gap-1 text-amber-500">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-6 w-6 fill-current" />
            ))}
          </div>
          {commonConfig.subLabel && (
            <div className="text-xs text-muted-foreground">
              <LabelContent html={commonConfig.subLabel} />
            </div>
          )}
          {showErrorBlock && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
              {errorMessage}
            </p>
          )}
        </div>
      )}
      {field.type === 'image' && (
        field.hidden ? (
          <p className="text-sm text-muted-foreground italic">Hidden image</p>
        ) : (
        <div className="space-y-1.5">
          <Label className="text-sm">
            <LabelContent html={displayLabel || ''} />
            {commonConfig.required ? ' *' : ''}
          </Label>
          {disableFileInputs ? (
            <div
              className={cn(
                'flex items-center justify-center rounded-md border border-dashed border-input px-4 py-8 text-sm text-muted-foreground',
                showErrorBlock && 'border-destructive'
              )}
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              Add image
            </div>
          ) : (
            <label htmlFor={`${field.id}-image`} className="block cursor-pointer">
              <input
                id={`${field.id}-image`}
                type="file"
                name={field.id}
                accept="image/*"
                className="sr-only"
              />
              <div className={cn(
                'flex items-center justify-center rounded-md border border-dashed border-input px-4 py-8 text-sm text-muted-foreground',
                showErrorBlock && 'border-destructive'
              )}>
                <ImagePlus className="mr-2 h-4 w-4" />
                Add image
              </div>
            </label>
          )}
          {commonConfig.subLabel && (
            <div className="text-xs text-muted-foreground">
              <LabelContent html={commonConfig.subLabel} />
            </div>
          )}
          {showErrorBlock && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
              {errorMessage}
            </p>
          )}
        </div>
        )
      )}
      {field.type === 'signature' && (
        <div className="space-y-1.5">
          <Label className="text-sm">
            <LabelContent html={displayLabel || ''} />
            {commonConfig.required ? ' *' : ''}
          </Label>
          <input type="hidden" name={field.id} value="" />
          <div className={cn(
            'rounded-md border border-input bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground',
            showErrorBlock && 'border-destructive'
          )}>
            Signature pad
          </div>
          {commonConfig.subLabel && (
            <div className="text-xs text-muted-foreground">
              <LabelContent html={commonConfig.subLabel} />
            </div>
          )}
          {showErrorBlock && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
              {errorMessage}
            </p>
          )}
        </div>
      )}
      {field.type === 'range' && (
        field.hidden ? (
          <p className="text-sm text-muted-foreground italic">Hidden range</p>
        ) : (
        <div className="space-y-1.5">
          <Label className="text-sm">
            <LabelContent html={displayLabel || ''} />
            {commonConfig.required ? ' *' : ''}
          </Label>
          <input
            name={field.id}
            type="range"
            min={0}
            max={100}
            defaultValue={50}
            className={cn('w-full accent-primary', inputErrorClass)}
          />
          {commonConfig.subLabel && (
            <div className="text-xs text-muted-foreground">
              <LabelContent html={commonConfig.subLabel} />
            </div>
          )}
          {showErrorBlock && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
              {errorMessage}
            </p>
          )}
        </div>
        )
      )}
    </div>
  );
}

function DropSlot({
  index,
  isActive,
  onDragOver,
  onDragLeave,
  onDrop,
  isEmpty,
}: {
  index: number;
  isActive: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  isEmpty: boolean;
}) {
  return (
    <div
      className={cn(
        'min-h-[16px] rounded transition-colors -mx-1 flex-shrink-0',
        isActive && 'min-h-[48px] bg-primary/10 ring-1 ring-primary/30 ring-dashed'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const isMove = e.dataTransfer.types.includes(MOVE_TYPE);
        e.dataTransfer.dropEffect = isMove ? 'move' : 'copy';
        onDragOver(e);
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e)}
    >
      {isEmpty && (
        <div className="py-12 text-center text-muted-foreground text-sm border-2 border-dashed border-muted rounded-lg">
          Drag form elements here or reorder by dragging fields
        </div>
      )}
    </div>
  );
}

const COLOR_SCHEMES = [
  { id: '1', bg: 'bg-slate-800', text: 'text-white', label: 'Abc' },
  { id: '2', bg: 'bg-blue-900', text: 'text-white', label: 'Abc' },
  { id: '3', bg: 'bg-emerald-800', text: 'text-white', label: 'Abc' },
  { id: '4', bg: 'bg-amber-600', text: 'text-white', label: 'Abc' },
  { id: '5', bg: 'bg-white', text: 'text-slate-800', label: 'Abc', border: 'border border-slate-200' },
  { id: '6', bg: 'bg-slate-100', text: 'text-slate-800', label: 'Abc' },
  { id: '7', bg: 'bg-blue-100', text: 'text-blue-900', label: 'Abc' },
  { id: '8', bg: 'bg-rose-100', text: 'text-rose-900', label: 'Abc' },
];

export default function FormBuilderPage() {
  const searchParams = useSearchParams();
  const formName = searchParams.get('name')?.trim() || 'Untitled form';

  const [builderTab, setBuilderTab] = useState<'builder' | 'settings'>('builder');
  const [elementsSidebarOpen, setElementsSidebarOpen] = useState(true);
  const [customizerSidebarOpen, setCustomizerSidebarOpen] = useState(true);
  const [basicExpanded, setBasicExpanded] = useState(true);
  const [advancedExpanded, setAdvancedExpanded] = useState(true);
  const [styleTab, setStyleTab] = useState<'page' | 'form'>('page');
  const [selectedSchemeId, setSelectedSchemeId] = useState('1');
  const [backgroundColor, setBackgroundColor] = useState('#F4F5F9');
  const [backgroundPosition, setBackgroundPosition] = useState('Center');
  const [backgroundRepeat, setBackgroundRepeat] = useState('None');
  const [formFields, setFormFields] = useState<FormField[]>(getDefaultFormFields);
  const [dragOver, setDragOver] = useState(false);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedNameSubField, setSelectedNameSubField] = useState<NameSubFieldKey | null>(null);

  const selectedField = selectedFieldId
    ? formFields.find((f) => f.id === selectedFieldId) ?? null
    : null;

  const selectedFieldTitle = selectedField
    ? getFieldPanelTitle(selectedField.type)
    : 'Form customizer';

  const updateField = useCallback(
    (
      id: string,
      updates: Partial<
        Pick<
          FormField,
          | 'uniqueName'
          | 'label'
          | 'tooltip'
          | 'hidden'
          | 'nameConfig'
          | 'headerConfig'
          | 'emailConfig'
          | 'fieldConfig'
          | 'dropdownConfig'
          | 'dividerConfig'
          | 'multilineConfig'
          | 'radioConfig'
          | 'multipleConfig'
          | 'fileConfig'
        >
      >
    ) => {
      setFormFields((prev) =>
        prev.map((f) => {
          if (f.id !== id) return f;
          let next = { ...updates };
          if (next.nameConfig) {
            const base = f.type === 'name' ? { ...DEFAULT_NAME_CONFIG, ...f.nameConfig } : {};
            next = { ...next, nameConfig: { ...base, ...next.nameConfig } };
          }
          if (next.headerConfig) {
            const base = f.type === 'header' ? { ...DEFAULT_HEADER_CONFIG, ...f.headerConfig } : {};
            next = { ...next, headerConfig: { ...base, ...next.headerConfig } };
          }
          if (next.emailConfig) {
            const base = f.type === 'email' ? { ...DEFAULT_EMAIL_CONFIG, ...f.emailConfig } : {};
            next = { ...next, emailConfig: { ...base, ...next.emailConfig } };
          }
          if (next.fieldConfig) {
            const base = { ...f.fieldConfig };
            next = { ...next, fieldConfig: { ...base, ...next.fieldConfig } };
          }
          if (next.dropdownConfig) {
            const base =
              f.type === 'dropdown'
                ? {
                    options: [
                      { id: '1', label: 'Option 1' },
                      { id: '2', label: 'Option 2' },
                    ],
                    required: false,
                    error: 'This field should not be empty',
                    ...f.dropdownConfig,
                  }
                : {};
            next = { ...next, dropdownConfig: { ...base, ...next.dropdownConfig } };
          }
          if (next.dividerConfig) {
            const base =
              f.type === 'divider'
                ? {
                    color: '#DEE2E6',
                    style: 'solid' as DividerStyle,
                    height: 1,
                    marginTop: 10,
                    marginBottom: 10,
                    ...f.dividerConfig,
                  }
                : {};
            next = { ...next, dividerConfig: { ...base, ...next.dividerConfig } };
          }
          if (next.multilineConfig) {
            const base =
              f.type === 'multiline'
                ? {
                    ...DEFAULT_MULTILINE_CONFIG,
                    ...f.multilineConfig,
                  }
                : {};
            next = { ...next, multilineConfig: { ...base, ...next.multilineConfig } };
          }
          if (next.radioConfig) {
            const base =
              f.type === 'radio'
                ? {
                    options: [
                      { id: '1', label: 'Option 1' },
                      { id: '2', label: 'Option 2' },
                    ],
                    horizontal: true,
                    required: false,
                    error: 'This field should not be empty',
                    ...f.radioConfig,
                  }
                : {};
            next = { ...next, radioConfig: { ...base, ...next.radioConfig } };
          }
          if (next.multipleConfig) {
            const base =
              f.type === 'multiple'
                ? {
                    options: [
                      { id: '1', label: 'Option 1' },
                      { id: '2', label: 'Option 2' },
                    ],
                    horizontal: true,
                    required: false,
                    error: 'This field should not be empty',
                    autoRejectEnabled: false,
                    autoRejectOptionIds: [],
                    defaultOptionIds: [],
                    ...f.multipleConfig,
                  }
                : {};
            next = { ...next, multipleConfig: { ...base, ...next.multipleConfig } };
          }
          if (next.fileConfig) {
            const base =
              f.type === 'file'
                ? { ...DEFAULT_FILE_CONFIG, ...f.fileConfig }
                : {};
            next = { ...next, fileConfig: { ...base, ...next.fileConfig } };
          }
          return { ...f, ...next };
        })
      );
    },
    []
  );

  const handleSidebarDragStart = useCallback((e: React.DragEvent, type: FormFieldType) => {
    e.dataTransfer.setData(DRAG_TYPE, type);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleCanvasDragStart = useCallback((e: React.DragEvent, fieldId: string) => {
    e.dataTransfer.setData(MOVE_TYPE, fieldId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDropAt = useCallback(
    (e: React.DragEvent, atIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      setDropTargetIndex(null);

      const moveId = e.dataTransfer.getData(MOVE_TYPE);
      if (moveId) {
        setFormFields((prev) => {
          const fromIndex = prev.findIndex((f) => f.id === moveId);
          if (fromIndex === -1) return prev;
          const field = prev[fromIndex];
          const without = prev.filter((_, i) => i !== fromIndex);
          const insertIndex = atIndex > fromIndex ? atIndex - 1 : atIndex;
          return [...without.slice(0, insertIndex), field, ...without.slice(insertIndex)];
        });
        return;
      }

      const type = e.dataTransfer.getData(DRAG_TYPE) as FormFieldType | '';
      if (!type || !VALID_FIELD_TYPES.includes(type)) return;
      setFormFields((prev) => [
        ...prev.slice(0, atIndex),
        { id: makeId(type), type },
        ...prev.slice(atIndex),
      ]);
    },
    []
  );

  const updateNameSubField = useCallback(
    (fieldId: string, key: NameSubFieldKey, updates: Partial<NameSubFieldConfig>) => {
      setFormFields((prev) =>
        prev.map((f) => {
          if (f.id !== fieldId || f.type !== 'name') return f;
          const current = { ...DEFAULT_NAME_CONFIG, ...f.nameConfig };
          const subFields = { ...current.subFields, [key]: { ...getDefaultSubField(key), ...current.subFields?.[key], ...updates } };
          return { ...f, nameConfig: { ...current, subFields } };
        })
      );
    },
    []
  );

  const removeField = useCallback((id: string) => {
    setFormFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
      setSelectedNameSubField(null);
    }
  }, [selectedFieldId]);

  const duplicateField = useCallback((field: FormField, atIndex: number) => {
    const newId = makeId(field.type);
    const copyOption = (o: { id: string; label: string }) => ({ id: makeId('opt'), label: o.label });
    const dup: FormField = {
      ...field,
      id: newId,
      label: field.label,
      uniqueName: undefined,
      fieldConfig: field.fieldConfig ? { ...field.fieldConfig } : undefined,
      nameConfig: field.nameConfig ? { ...field.nameConfig } : undefined,
      headerConfig: field.headerConfig ? { ...field.headerConfig } : undefined,
      emailConfig: field.emailConfig ? { ...field.emailConfig } : undefined,
      dropdownConfig: field.dropdownConfig
        ? { ...field.dropdownConfig, options: field.dropdownConfig.options?.map(copyOption) }
        : undefined,
      radioConfig: field.radioConfig
        ? { ...field.radioConfig, options: field.radioConfig.options?.map(copyOption) }
        : undefined,
      multipleConfig: field.multipleConfig
        ? { ...field.multipleConfig, options: field.multipleConfig.options?.map(copyOption) }
        : undefined,
      dividerConfig: field.dividerConfig ? { ...field.dividerConfig } : undefined,
      multilineConfig: field.multilineConfig ? { ...field.multilineConfig } : undefined,
      fileConfig: field.fileConfig ? { ...field.fileConfig } : undefined,
    };
    setFormFields((prev) => [
      ...prev.slice(0, atIndex + 1),
      dup,
      ...prev.slice(atIndex + 1),
    ]);
    setSelectedFieldId(newId);
    setSelectedNameSubField(null);
    setCustomizerSidebarOpen(true);
  }, []);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function isFieldRequired(field: FormField): boolean {
    if (field.type === 'email') return field.emailConfig?.required ?? true;
    if (field.type === 'name') {
      const cfg = { ...DEFAULT_NAME_CONFIG, ...field.nameConfig };
      const sub = cfg.subFields ?? {};
      const first = { ...DEFAULT_FIRST, ...sub.first };
      const last = { ...DEFAULT_LAST, ...sub.last };
      return first.required === true || last.required === true;
    }
    if (field.type === 'header' || field.type === 'label' || field.type === 'paragraph' || field.type === 'divider') return false;
    return !!(field.fieldConfig?.required ?? field.dropdownConfig?.required ?? field.radioConfig?.required ?? field.multipleConfig?.required ?? field.multilineConfig?.required);
  }

  function getFieldErrorMessage(field: FormField): string {
    if (field.type === 'email') return field.emailConfig?.error ?? 'This field should not be empty';
    if (field.type === 'name') return DEFAULT_FIRST.error ?? 'This field should not be empty';
    return field.fieldConfig?.error ?? field.dropdownConfig?.error ?? field.radioConfig?.error ?? field.multipleConfig?.error ?? field.multilineConfig?.error ?? 'This field should not be empty';
  }

  // When Required is enabled, show error message below empty fields on submit (red text + icon).
  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = new FormData(form);
      const errors: Record<string, string> = {};
      formFields.forEach((field) => {
        if (field.hidden || !isFieldRequired(field)) return;
        if (field.type === 'name') {
          const cfg = { ...DEFAULT_NAME_CONFIG, ...field.nameConfig };
          const sub = cfg.subFields ?? {};
          const first = { ...DEFAULT_FIRST, ...sub.first };
          const last = { ...DEFAULT_LAST, ...sub.last };
          const firstVal = (data.get(`${field.id}_first`) as string)?.trim() ?? '';
          const lastVal = (data.get(`${field.id}_last`) as string)?.trim() ?? '';
          if (first.required && !firstVal) errors[field.id] = first.error ?? 'This field should not be empty';
          else if (last.required && !lastVal) errors[field.id] = last.error ?? 'This field should not be empty';
          return;
        }
        if (field.type === 'multiple') {
          const values = data.getAll(field.id) as string[];
          if (values.length === 0) errors[field.id] = getFieldErrorMessage(field);
          return;
        }
        if (field.type === 'rating') {
          const val = String(data.get(field.id) ?? '').trim();
          if (val === '' || val === '0') errors[field.id] = getFieldErrorMessage(field);
          return;
        }
        const value = data.get(field.id);
        const isFile = value instanceof File;
        const isEmpty = value == null
          || (isFile ? value.size === 0 : (String(value ?? '').trim() === ''));
        if (isEmpty) errors[field.id] = getFieldErrorMessage(field);
      });
      setFieldErrors(errors);
    },
    [formFields]
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 flex-wrap border-b bg-background px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
            <Link href="/admin/hiring?tab=settings-forms" title="Back to Forms">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Link
            href="/admin/hiring?tab=settings-forms"
            className="text-sm text-primary hover:underline"
          >
            + Add new form
          </Link>
          <span className="text-sm text-muted-foreground">Form : {formName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={builderTab} onValueChange={(v) => setBuilderTab(v as 'builder' | 'settings')}>
            <TabsList className="h-9">
              <TabsTrigger value="builder" className="text-sm">Builder</TabsTrigger>
              <TabsTrigger value="settings" className="text-sm">Settings</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <HelpCircle className="h-4 w-4" /> Help
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Save className="h-4 w-4" /> Save
          </Button>
          <Button size="sm" className="gap-1.5">
            <Upload className="h-4 w-4" /> Save & Publish
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar - Form elements */}
        {elementsSidebarOpen ? (
          <aside className="w-56 border-r bg-muted/30 flex flex-col shrink-0 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
              <span className="text-sm font-medium">Form elements</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setElementsSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-2 overflow-y-auto flex-1">
              <button
                type="button"
                onClick={() => setBasicExpanded(!basicExpanded)}
                className={cn(
                  'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                  basicExpanded ? 'bg-background shadow-sm' : 'hover:bg-background/80'
                )}
              >
                Basic Elements
              </button>
              {basicExpanded && (
                <ul className="mt-1 space-y-0.5 pl-1">
                  {BASIC_ELEMENTS.map((el) => {
                    const Icon = el.icon;
                    return (
                      <li key={el.id}>
                        <div
                          draggable
                          onDragStart={(e) => handleSidebarDragStart(e, el.id)}
                          className="w-full flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-background hover:text-foreground cursor-grab active:cursor-grabbing"
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {el.label}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setAdvancedExpanded(!advancedExpanded)}
                className={cn(
                  'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium mt-2',
                  advancedExpanded ? 'bg-background shadow-sm' : 'hover:bg-background/80'
                )}
              >
                Advanced Elements
              </button>
              {advancedExpanded && (
                <ul className="mt-1 space-y-0.5 pl-1">
                  {ADVANCED_ELEMENTS.map((el) => {
                    const Icon = el.icon;
                    return (
                      <li key={el.id}>
                        <div
                          draggable
                          onDragStart={(e) => handleSidebarDragStart(e, el.id)}
                          className="w-full flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-background hover:text-foreground cursor-grab active:cursor-grabbing"
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {el.label}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        ) : (
          <div className="shrink-0 border-r p-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setElementsSidebarOpen(true)}
            >
              Form elements
            </Button>
          </div>
        )}

        {/* Center - Form canvas */}
        <main
          className="flex-1 overflow-auto p-6"
          style={{ backgroundColor: styleTab === 'page' ? backgroundColor : undefined }}
        >
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-end gap-2 mb-4">
              <Button variant="outline" size="sm">Manage Translation</Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                title="Form customizer"
                onClick={() => setCustomizerSidebarOpen((prev) => !prev)}
              >
                <Palette className="h-4 w-4" />
              </Button>
            </div>
            <Card className="p-6 bg-background shadow-sm">
              {builderTab === 'builder' ? (
                <form
                  id="builder-form"
                  onSubmit={handleFormSubmit}
                  className={cn(
                    'min-h-[280px] rounded-lg transition-colors space-y-1 block',
                    dragOver && 'bg-primary/5'
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    setDragOver(true);
                  }}
                  onDragLeave={() => {
                    setDragOver(false);
                    setDropTargetIndex(null);
                  }}
                >
                  {formFields.map((field, i) => (
                    <Fragment key={field.id}>
                      <DropSlot
                        index={i}
                        isActive={dropTargetIndex === i}
                        onDragOver={() => {
                          setDropTargetIndex(i);
                          setDragOver(true);
                        }}
                        onDragLeave={() => setDropTargetIndex(null)}
                        onDrop={(e) => handleDropAt(e, i)}
                        isEmpty={false}
                      />
                      <FormFieldBlock
                        field={field}
                        isSelected={selectedFieldId === field.id}
                        onSelect={() => {
                          setSelectedFieldId(field.id);
                          setSelectedNameSubField(null);
                          setCustomizerSidebarOpen(true);
                        }}
                        onRemove={() => removeField(field.id)}
                        onDragStart={(e) => handleCanvasDragStart(e, field.id)}
                        onDuplicate={() => duplicateField(field, i)}
                        errorMessage={
                          Object.keys(fieldErrors).length > 0
                            ? fieldErrors[field.id]
                            : isFieldRequired(field)
                              ? getFieldErrorMessage(field)
                              : undefined
                        }
                        disableFileInputs
                      />
                    </Fragment>
                  ))}
                  <DropSlot
                    index={formFields.length}
                    isActive={dropTargetIndex === formFields.length}
                    onDragOver={() => {
                      setDropTargetIndex(formFields.length);
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDropTargetIndex(null)}
                    onDrop={(e) => handleDropAt(e, formFields.length)}
                    isEmpty={formFields.length === 0}
                  />
                  {formFields.length > 0 && (
                    <div className="pt-4">
                      <Button type="submit" className="w-full">Submit</Button>
                    </div>
                  )}
                </form>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Form settings will appear here.
                </div>
              )}
            </Card>
          </div>
        </main>

        {/* Right sidebar - Field editor or Form customizer */}
        {customizerSidebarOpen ? (
          <aside className="w-72 border-l bg-muted/30 flex flex-col shrink-0 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
              <span className="text-sm font-medium">
                {selectedFieldTitle}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  selectedField ? setSelectedFieldId(null) : setCustomizerSidebarOpen(false)
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div
              className="p-3 flex-1 min-h-0 space-y-4 overflow-y-scroll
                [&::-webkit-scrollbar]:w-2.5
                [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded-full
                [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-slate-500
                [scrollbar-color:rgb(148_163_184)_rgb(241_245_249)]"
              onWheel={(e) => {
                const el = e.currentTarget;
                e.preventDefault();
                e.stopPropagation();
                const maxScroll = el.scrollHeight - el.clientHeight;
                if (maxScroll <= 0) return;
                const next = el.scrollTop + e.deltaY;
                el.scrollTop = Math.max(0, Math.min(maxScroll, next));
              }}
            >
              {selectedField && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Unique name</Label>
                    <Input
                      placeholder={getDefaultUniqueName(selectedField)}
                      value={selectedField.uniqueName ?? getDefaultUniqueName(selectedField)}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          uniqueName: e.target.value.trim() || undefined,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      The field can be used to pre-populate fields from URL and to identify this
                      element in integrations.
                    </p>
                  </div>
                  <div className="border-t pt-4" />
                </>
              )}
              {selectedField && selectedField.type === 'divider' && (() => {
                const config: DividerFieldConfig = {
                  color: '#DEE2E6',
                  style: 'solid',
                  height: 1,
                  marginTop: 10,
                  marginBottom: 10,
                  ...selectedField.dividerConfig,
                };
                return (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          className="h-8 w-8 rounded border border-input cursor-pointer"
                          value={config.color ?? '#DEE2E6'}
                          onChange={(e) =>
                            updateField(selectedField.id, {
                              dividerConfig: { color: e.target.value || undefined },
                            })
                          }
                        />
                        <Input
                          className="flex-1"
                          placeholder="#DEE2E6"
                          value={config.color ?? ''}
                          onChange={(e) =>
                            updateField(selectedField.id, {
                              dividerConfig: { color: e.target.value || undefined },
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t">
                      <Label className="text-sm font-medium text-slate-700">Style</Label>
                      <Select
                        value={config.style ?? 'solid'}
                        onValueChange={(value) =>
                          updateField(selectedField.id, {
                            dividerConfig: { style: value as DividerStyle },
                          })
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
                        Restrict the users to enter the same type of characters set which you have
                        selected from the list.
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
                          updateField(selectedField.id, {
                            dividerConfig: { height: Number.isNaN(n) ? undefined : n },
                          });
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
                          updateField(selectedField.id, {
                            dividerConfig: { marginTop: Number.isNaN(n) ? undefined : n },
                          });
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
                          updateField(selectedField.id, {
                            dividerConfig: { marginBottom: Number.isNaN(n) ? undefined : n },
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-sm font-medium text-slate-700">Hidden</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={selectedField.hidden ?? false}
                          onCheckedChange={(checked) =>
                            updateField(selectedField.id, { hidden: checked })
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {selectedField.hidden ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        User can not see this field when enable.
                      </p>
                    </div>
                  </>
                );
              })()}
              {selectedField && selectedField.type === 'file' && (() => {
                const fileConfig: FileFieldConfig = {
                  ...DEFAULT_FILE_CONFIG,
                  ...selectedField.fileConfig,
                };
                return (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">Label</Label>
                      <RichTextEditor
                        placeholder={getDefaultLabel('file')}
                        value={selectedField.label ?? ''}
                        onChange={(html) =>
                          updateField(selectedField.id, { label: html || undefined })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Please select text before applying styling on it.
                      </p>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t">
                      <Label className="text-sm font-medium text-slate-700">Sub label</Label>
                      <RichTextEditor
                        placeholder="Optional helper text below the field"
                        value={selectedField.fieldConfig?.subLabel ?? ''}
                        onChange={(html) =>
                          updateField(selectedField.id, {
                            fieldConfig: { subLabel: html || undefined },
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Please select text before applying styling on it.
                      </p>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t">
                      <Label className="text-sm font-medium text-slate-700">Tooltip</Label>
                      <Input
                        placeholder="Add message for info icon"
                        value={selectedField.tooltip ?? ''}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            tooltip: e.target.value || undefined,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Add message which will appear when a cursor is positioned over an info icon
                        along with label.
                      </p>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t">
                      <Label className="text-sm font-medium text-slate-700">File types</Label>
                      <Textarea
                        placeholder="pdf, doc, docx, jpg, png, ..."
                        value={fileConfig.fileTypes ?? ''}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            fileConfig: { fileTypes: e.target.value || undefined },
                          })
                        }
                        className="min-h-[80px] resize-y"
                      />
                      <p className="text-xs text-muted-foreground">
                        Type your options to select from. Separate each with comma(,).
                      </p>
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-sm font-medium text-slate-700">Required</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={selectedField.fieldConfig?.required ?? false}
                          onCheckedChange={(checked) =>
                            updateField(selectedField.id, {
                              fieldConfig: { required: checked },
                            })
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {selectedField.fieldConfig?.required ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This indicates that the user must specify a value for the input before the form
                        submission.
                      </p>
                    </div>
                    {selectedField.fieldConfig?.required && (
                      <div className="space-y-2 pt-2 border-t">
                        <Label className="text-sm font-medium text-slate-700">Error</Label>
                        <Input
                          placeholder="This field should not be empty"
                          value={selectedField.fieldConfig?.error ?? ''}
                          onChange={(e) =>
                            updateField(selectedField.id, {
                              fieldConfig: { error: e.target.value || undefined },
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          This message will show up when users do not respond to mandatory questions.
                        </p>
                      </div>
                    )}
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-sm font-medium text-slate-700">File size limit</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={fileConfig.fileSizeLimitEnabled ?? false}
                          onCheckedChange={(checked) =>
                            updateField(selectedField.id, {
                              fileConfig: { fileSizeLimitEnabled: checked },
                            })
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {fileConfig.fileSizeLimitEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      {fileConfig.fileSizeLimitEnabled && (
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-slate-700 shrink-0">Minimum</Label>
                            <Input
                              type="number"
                              min={0}
                              className="flex-1"
                              value={fileConfig.minFileSizeKB ?? 0}
                              onChange={(e) => {
                                const n = parseInt(e.target.value, 10);
                                updateField(selectedField.id, {
                                  fileConfig: {
                                    minFileSizeKB: Number.isNaN(n) ? 0 : n,
                                  },
                                });
                              }}
                            />
                            <span className="text-sm text-muted-foreground shrink-0 w-8">KB</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-slate-700 shrink-0">Maximum</Label>
                            <Input
                              type="number"
                              min={0}
                              className="flex-1"
                              value={fileConfig.maxFileSizeKB ?? 0}
                              onChange={(e) => {
                                const n = parseInt(e.target.value, 10);
                                updateField(selectedField.id, {
                                  fileConfig: {
                                    maxFileSizeKB: Number.isNaN(n) ? 0 : n,
                                  },
                                });
                              }}
                            />
                            <span className="text-sm text-muted-foreground shrink-0 w-8">KB</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-sm font-medium text-slate-700">Multiple</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={fileConfig.multiple ?? false}
                          onCheckedChange={(checked) =>
                            updateField(selectedField.id, {
                              fileConfig: { multiple: checked },
                            })
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {fileConfig.multiple ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      {fileConfig.multiple && (
                        <div className="flex items-center gap-2 pt-2">
                          <Label className="text-sm font-medium text-slate-700">No of files</Label>
                          <Input
                            type="number"
                            min={1}
                            value={fileConfig.maxFiles ?? 1}
                            onChange={(e) => {
                              const n = parseInt(e.target.value, 10);
                              updateField(selectedField.id, {
                                fileConfig: {
                                  maxFiles: Number.isNaN(n) ? 1 : Math.max(1, n),
                                },
                              });
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-sm font-medium text-slate-700">Hidden</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={selectedField.hidden ?? false}
                          onCheckedChange={(checked) =>
                            updateField(selectedField.id, { hidden: checked })
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {selectedField.hidden ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        User can not see this field when enable.
                      </p>
                    </div>
                  </>
                );
              })()}
              {selectedField && selectedField.type !== 'divider' && selectedField.type !== 'file' && (
                <>
                  {selectedField.type !== 'header' && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700">Label</Label>
                        <RichTextEditor
                          placeholder={getDefaultLabel(selectedField.type)}
                          value={selectedField.label ?? ''}
                          onChange={(html) =>
                            updateField(selectedField.id, { label: html || undefined })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Please select text before applying styling on it.
                        </p>
                      </div>
                      {selectedField.type !== 'email' &&
                        selectedField.type !== 'label' &&
                        selectedField.type !== 'paragraph' && (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-slate-700">Sub label</Label>
                            <RichTextEditor
                              placeholder="Optional helper text below the field"
                              value={selectedField.fieldConfig?.subLabel ?? ''}
                              onChange={(html) =>
                                updateField(selectedField.id, {
                                  fieldConfig: { subLabel: html || undefined },
                                })
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              Please select text before applying styling on it.
                            </p>
                          </div>
                          {selectedField.type !== 'dropdown' && selectedField.type !== 'multiple' && (
                            <div className="space-y-1.5">
                              <Label className="text-sm font-medium text-slate-700">Placeholder</Label>
                              <Input
                                placeholder="Enter placeholder"
                                value={selectedField.fieldConfig?.placeholder ?? ''}
                                onChange={(e) =>
                                  updateField(selectedField.id, {
                                    fieldConfig: { placeholder: e.target.value || undefined },
                                  })
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Add a short hint that describes the expected value of the field.
                              </p>
                            </div>
                          )}
                          {selectedField.type === 'number' && (() => {
                            const config = selectedField.fieldConfig ?? {};
                            return (
                              <>
                                <div className="space-y-1.5">
                                  <Label className="text-sm font-medium text-slate-700">Default</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={config.defaultValue ?? ''}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      if (raw === '') {
                                        updateField(selectedField.id, {
                                          fieldConfig: { defaultValue: undefined },
                                        });
                                        return;
                                      }
                                      const n = parseInt(raw, 10);
                                      if (Number.isNaN(n) || n < 0) {
                                        return;
                                      }
                                      updateField(selectedField.id, {
                                        fieldConfig: {
                                          defaultValue: n,
                                        },
                                      });
                                    }}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm font-medium text-slate-700">Tooltip</Label>
                                  <Input
                                    placeholder="Add message for info icon"
                                    value={selectedField.tooltip ?? ''}
                                    onChange={(e) =>
                                      updateField(selectedField.id, {
                                        tooltip: e.target.value || undefined,
                                      })
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Add message which will appear when a cursor is positioned over an info icon
                                    along with label.
                                  </p>
                                </div>
                                <div className="space-y-2 pt-2 border-t">
                                  <Label className="text-sm font-medium text-slate-700">Required</Label>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={config.required ?? false}
                                      onCheckedChange={(checked) =>
                                        updateField(selectedField.id, {
                                          fieldConfig: { required: checked },
                                        })
                                      }
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      {config.required ? 'Enabled' : 'Disabled'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    This indicates that the user must specify a value for the input
                                    before the form submission.
                                  </p>
                                  {config.required && (
                                    <div className="space-y-1.5 pt-2">
                                      <Label className="text-sm font-medium text-slate-700">Error</Label>
                                      <Input
                                        placeholder={config.error}
                                        value={config.error ?? ''}
                                        onChange={(e) =>
                                          updateField(selectedField.id, {
                                            fieldConfig: { error: e.target.value || undefined },
                                          })
                                        }
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        This message will show up when users do not respond to mandatory
                                        questions.
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2 pt-2 border-t">
                                  <Label className="text-sm font-medium text-slate-700">Enable charlimit</Label>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={config.charLimitEnabled ?? false}
                                      onCheckedChange={(checked) =>
                                        updateField(selectedField.id, {
                                          fieldConfig: { charLimitEnabled: checked },
                                        })
                                      }
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      {config.charLimitEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Enter the character limit for user. User can not be enter more than
                                    this count.
                                  </p>
                                </div>
                                {config.charLimitEnabled && (
                                  <div className="space-y-1.5">
                                    <Label className="text-sm font-medium text-slate-700">Char limit</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={config.charLimit ?? 0}
                                      onChange={(e) => {
                                        const n = parseInt(e.target.value, 10);
                                        updateField(selectedField.id, {
                                          fieldConfig: { charLimit: Number.isNaN(n) ? undefined : n },
                                        });
                                      }}
                                    />
                                  </div>
                                )}
                                <div className="space-y-2 pt-2 border-t">
                                  <Label className="text-sm font-medium text-slate-700">Read only</Label>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={config.readOnly ?? false}
                                      onCheckedChange={(checked) =>
                                        updateField(selectedField.id, {
                                          fieldConfig: { readOnly: checked },
                                        })
                                      }
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      {config.readOnly ? 'Enabled' : 'Disabled'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    User can view this field but cannot modify it.
                                  </p>
                                </div>
                              </>
                            );
                          })()}
                          {selectedField.type === 'dropdown' && (() => {
                            const config: DropdownFieldConfig = {
                              options: [
                                { id: '1', label: 'Option 1' },
                                { id: '2', label: 'Option 2' },
                                { id: '3', label: 'Option 3' },
                              ],
                              required: false,
                              error: 'This field should not be empty',
                              ...selectedField.dropdownConfig,
                            };
                            return (
                              <>
                                <div className="space-y-1.5">
                                  <Label className="text-sm font-medium text-slate-700">Default</Label>
                                  <Select
                                    value={config.defaultOptionId ?? ''}
                                    onValueChange={(value) =>
                                      updateField(selectedField.id, {
                                        dropdownConfig: { defaultOptionId: value || undefined },
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(config.options ?? []).map((opt) => (
                                        <SelectItem key={opt.id} value={opt.id}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm font-medium text-slate-700">Tooltip</Label>
                                  <Input
                                    placeholder="Add message for info icon"
                                    value={selectedField.tooltip ?? ''}
                                    onChange={(e) =>
                                      updateField(selectedField.id, {
                                        tooltip: e.target.value || undefined,
                                      })
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Add message which will appear when a cursor is positioned over an
                                    info icon along with label.
                                  </p>
                                </div>
                              </>
                            );
                          })()}
                          {selectedField.type === 'dropdown' && (() => {
                            const config: DropdownFieldConfig = {
                              options: [
                                { id: '1', label: 'Option 1' },
                                { id: '2', label: 'Option 2' },
                                { id: '3', label: 'Option 3' },
                              ],
                              required: false,
                              error: 'This field should not be empty',
                              ...selectedField.dropdownConfig,
                            };
                            return (
                              <>
                                <div className="space-y-1.5">
                                  <Label className="text-sm font-medium text-slate-700">Options</Label>
                                  <div className="space-y-2">
                                    {(config.options ?? []).map((opt, idx) => (
                                      <div key={opt.id} className="flex items-center gap-2">
                                        <Input
                                          className="flex-1"
                                          placeholder={`Type option ${idx + 1}`}
                                          value={opt.label}
                                          onChange={(e) => {
                                            const next = [...(config.options ?? [])];
                                            next[idx] = { ...next[idx], label: e.target.value };
                                            updateField(selectedField.id, {
                                              dropdownConfig: { options: next },
                                            });
                                          }}
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-destructive"
                                          onClick={() => {
                                            const next = (config.options ?? []).filter(
                                              (_, i) => i !== idx
                                            );
                                            updateField(selectedField.id, {
                                              dropdownConfig: { options: next },
                                            });
                                          }}
                                          disabled={(config.options ?? []).length <= 1}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full justify-start"
                                      onClick={() => {
                                        const next = [...(config.options ?? [])];
                                        const index = next.length + 1;
                                        next.push({
                                          id: makeId('opt'),
                                          label: `Option ${index}`,
                                        });
                                        updateField(selectedField.id, {
                                          dropdownConfig: { options: next },
                                        });
                                      }}
                                    >
                                      + Add option
                                    </Button>
                                  </div>
                                </div>
                                <div className="pt-2 border-t space-y-2">
                                  <Label className="text-sm font-medium text-slate-700">Required</Label>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={config.required ?? false}
                                      onCheckedChange={(checked) =>
                                        updateField(selectedField.id, {
                                          dropdownConfig: { required: checked },
                                        })
                                      }
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      {config.required ? 'Enabled' : 'Disabled'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    This indicates that the user must specify a value for the input
                                    before the form submission.
                                  </p>
                                  {config.required && (
                                    <div className="space-y-1.5 pt-2">
                                      <Label className="text-sm font-medium text-slate-700">Error</Label>
                                      <Input
                                        placeholder={config.error}
                                        value={config.error}
                                        onChange={(e) =>
                                          updateField(selectedField.id, {
                                            dropdownConfig: { error: e.target.value || undefined },
                                          })
                                        }
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        This message will show up when users do not respond to mandatory
                                        questions.
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2 pt-2 border-t">
                                  <Label className="text-sm font-medium text-slate-700">Read only</Label>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={config.readOnly ?? false}
                                      onCheckedChange={(checked) =>
                                        updateField(selectedField.id, {
                                          dropdownConfig: { readOnly: checked },
                                        })
                                      }
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      {config.readOnly ? 'Enabled' : 'Disabled'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    User can view this field but cannot modify it.
                                  </p>
                                </div>
                              </>
                            );
                          })()}
                        </>
                      )}
                      {selectedField.type === 'radio' && (() => {
                        const config: RadioFieldConfig = {
                          options: [
                            { id: '1', label: 'Option 1' },
                            { id: '2', label: 'Option 2' },
                          ],
                          horizontal: true,
                          required: false,
                          error: 'This field should not be empty',
                          ...selectedField.radioConfig,
                        };
                        return (
                          <>
                            <div className="space-y-1.5">
                              <Label className="text-sm font-medium text-slate-700">Default</Label>
                              <Select
                                value={config.defaultOptionId ?? ''}
                                onValueChange={(value) =>
                                  updateField(selectedField.id, {
                                    radioConfig: { defaultOptionId: value || undefined },
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(config.options ?? []).map((opt) => (
                                    <SelectItem key={opt.id} value={opt.id}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-sm font-medium text-slate-700">Tooltip</Label>
                              <Input
                                placeholder="Add message for info icon"
                                value={selectedField.tooltip ?? ''}
                                onChange={(e) =>
                                  updateField(selectedField.id, {
                                    tooltip: e.target.value || undefined,
                                  })
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Add message which will appear when a cursor is positioned over an
                                info icon along with label.
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-sm font-medium text-slate-700">Options</Label>
                              <div className="space-y-2">
                                {(config.options ?? []).map((opt, idx) => (
                                  <div key={opt.id} className="flex items-center gap-2">
                                    <Input
                                      className="flex-1"
                                      placeholder={`Type option ${idx + 1}`}
                                      value={opt.label}
                                      onChange={(e) => {
                                        const next = [...(config.options ?? [])];
                                        next[idx] = { ...next[idx], label: e.target.value };
                                        updateField(selectedField.id, {
                                          radioConfig: { options: next },
                                        });
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive"
                                      onClick={() => {
                                        const next = (config.options ?? []).filter((_, i) => i !== idx);
                                        updateField(selectedField.id, {
                                          radioConfig: { options: next },
                                        });
                                      }}
                                      disabled={(config.options ?? []).length <= 1}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => {
                                    const next = [...(config.options ?? [])];
                                    const index = next.length + 1;
                                    next.push({
                                      id: makeId('radio-opt'),
                                      label: `Option ${index}`,
                                    });
                                    updateField(selectedField.id, {
                                      radioConfig: { options: next },
                                    });
                                  }}
                                >
                                  + Add option
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2 pt-2 border-t">
                              <Label className="text-sm font-medium text-slate-700">Horizontal</Label>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={config.horizontal ?? true}
                                  onCheckedChange={(checked) =>
                                    updateField(selectedField.id, {
                                      radioConfig: { horizontal: checked },
                                    })
                                  }
                                />
                                <span className="text-sm text-muted-foreground">
                                  {config.horizontal ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2 pt-2 border-t">
                              <Label className="text-sm font-medium text-slate-700">Required</Label>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={config.required ?? false}
                                  onCheckedChange={(checked) =>
                                    updateField(selectedField.id, {
                                      radioConfig: { required: checked },
                                    })
                                  }
                                />
                                <span className="text-sm text-muted-foreground">
                                  {config.required ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                This indicates that the user must specify a value for the input
                                before the form submission.
                              </p>
                              {config.required && (
                                <div className="space-y-1.5 pt-2">
                                  <Label className="text-sm font-medium text-slate-700">Error</Label>
                                  <Input
                                    placeholder={config.error}
                                    value={config.error ?? ''}
                                    onChange={(e) =>
                                      updateField(selectedField.id, {
                                        radioConfig: { error: e.target.value || undefined },
                                      })
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    This message will show up when users do not respond to mandatory
                                    questions.
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="space-y-2 pt-2 border-t">
                              <Label className="text-sm font-medium text-slate-700">Read only</Label>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={config.readOnly ?? false}
                                  onCheckedChange={(checked) =>
                                    updateField(selectedField.id, {
                                      radioConfig: { readOnly: checked },
                                    })
                                  }
                                />
                                <span className="text-sm text-muted-foreground">
                                  {config.readOnly ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                User can view this field but cannot modify it.
                              </p>
                            </div>
                          </>
                        );
                      })()}
                      {selectedField.type !== 'email' &&
                        selectedField.type !== 'paragraph' &&
                        selectedField.type !== 'multiline' &&
                        selectedField.type !== 'dropdown' &&
                        selectedField.type !== 'radio' &&
                        selectedField.type !== 'number' && (
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-slate-700">Tooltip</Label>
                          <Input
                            placeholder="Add message for info icon"
                            value={selectedField.tooltip ?? ''}
                            onChange={(e) =>
                              updateField(selectedField.id, { tooltip: e.target.value || undefined })
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Add message which will appear when a cursor is positioned over an info icon
                            along with label.
                          </p>
                        </div>
                      )}
                      {(selectedField.type === 'label' ||
                        selectedField.type === 'paragraph' ||
                        selectedField.type === 'dropdown' ||
                        selectedField.type === 'radio' ||
                        selectedField.type === 'multiple' ||
                        selectedField.type === 'number' ||
                        selectedField.type === 'address' ||
                        selectedField.type === 'date' ||
                        selectedField.type === 'time' ||
                        selectedField.type === 'rating' ||
                        selectedField.type === 'image' ||
                        selectedField.type === 'signature' ||
                        selectedField.type === 'range') && (
                        <>
                          <div className="space-y-2 pt-2 border-t">
                            <Label className="text-sm font-medium text-slate-700">Hidden</Label>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={selectedField.hidden ?? false}
                                onCheckedChange={(checked) =>
                                  updateField(selectedField.id, { hidden: checked })
                                }
                              />
                              <span className="text-sm text-muted-foreground">
                                {selectedField.hidden ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              User can not see this field when enable.
                            </p>
                          </div>
                          {selectedField.type === 'dropdown' && (() => {
                            const config: DropdownFieldConfig = {
                              options: [
                                { id: '1', label: 'Option 1' },
                                { id: '2', label: 'Option 2' },
                                { id: '3', label: 'Option 3' },
                              ],
                              required: false,
                              error: 'This field should not be empty',
                              ...selectedField.dropdownConfig,
                            };
                            return (
                              <div className="space-y-2 pt-2 border-t">
                                <Label className="text-sm font-medium text-slate-700">Auto reject</Label>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={config.autoRejectEnabled ?? false}
                                    onCheckedChange={(checked) =>
                                      updateField(selectedField.id, {
                                        dropdownConfig: { autoRejectEnabled: checked },
                                      })
                                    }
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {config.autoRejectEnabled ? 'Enabled' : 'Disabled'}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Select the options which will be auto rejected.
                                </p>
                                {config.autoRejectEnabled && (
                                  <div className="space-y-1.5">
                                    <Label className="text-sm font-medium text-slate-700">
                                      Auto reject options
                                    </Label>
                                    <div className="space-y-1.5">
                                      {(config.options ?? []).map((opt) => {
                                        const list = config.autoRejectOptionIds ?? [];
                                        const checked = list.includes(opt.id);
                                        return (
                                          <label
                                            key={opt.id}
                                            className="flex items-center gap-2 text-sm text-slate-700"
                                          >
                                            <input
                                              type="checkbox"
                                              className="h-4 w-4 rounded border-slate-300"
                                              checked={checked}
                                              onChange={(e) => {
                                                const current = config.autoRejectOptionIds ?? [];
                                                const next = e.target.checked
                                                  ? [...current, opt.id]
                                                  : current.filter((id) => id !== opt.id);
                                                updateField(selectedField.id, {
                                                  dropdownConfig: { autoRejectOptionIds: next },
                                                });
                                              }}
                                            />
                                            <span>{opt.label}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                      {selectedField.type === 'multiple' && (() => {
                        const config: MultipleFieldConfig = {
                          options: [
                            { id: '1', label: 'Option 1' },
                            { id: '2', label: 'Option 2' },
                          ],
                          horizontal: true,
                          required: false,
                          error: 'This field should not be empty',
                          autoRejectEnabled: false,
                          autoRejectOptionIds: [],
                          defaultOptionIds: [],
                          ...selectedField.multipleConfig,
                        };
                        return (
                          <>
                                <div className="space-y-1.5">
                                  <Label className="text-sm font-medium text-slate-700">Default</Label>
                                  <div className="space-y-1.5">
                                    {(config.options ?? []).map((opt) => {
                                      const defaults = config.defaultOptionIds ?? [];
                                      const checked = defaults.includes(opt.id);
                                      return (
                                        <label
                                          key={opt.id}
                                          className="flex items-center gap-2 text-sm text-slate-700"
                                        >
                                          <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-300"
                                            checked={checked}
                                            onChange={(e) => {
                                              const current = config.defaultOptionIds ?? [];
                                              const next = e.target.checked
                                                ? [...current, opt.id]
                                                : current.filter((id) => id !== opt.id);
                                              updateField(selectedField.id, {
                                                multipleConfig: { defaultOptionIds: next },
                                              });
                                            }}
                                          />
                                          <span>{opt.label}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm font-medium text-slate-700">Options</Label>
                                  <div className="space-y-2">
                                    {(config.options ?? []).map((opt, idx) => (
                                      <div key={opt.id} className="flex items-center gap-2">
                                        <Input
                                          className="flex-1"
                                          value={opt.label}
                                          onChange={(e) => {
                                            const next = [...(config.options ?? [])];
                                            next[idx] = { ...next[idx], label: e.target.value };
                                            updateField(selectedField.id, {
                                              multipleConfig: { options: next },
                                            });
                                          }}
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-destructive"
                                          onClick={() => {
                                            const next = (config.options ?? []).filter((_, i) => i !== idx);
                                            updateField(selectedField.id, {
                                              multipleConfig: { options: next },
                                            });
                                          }}
                                          disabled={(config.options ?? []).length <= 1}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full justify-start"
                                      onClick={() => {
                                        const next = [...(config.options ?? [])];
                                        const index = next.length + 1;
                                        next.push({
                                          id: makeId('multi-opt'),
                                          label: `Option ${index}`,
                                        });
                                        updateField(selectedField.id, {
                                          multipleConfig: { options: next },
                                        });
                                      }}
                                    >
                                      + Add option
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-2 pt-2 border-t">
                                  <Label className="text-sm font-medium text-slate-700">Horizontal</Label>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={config.horizontal ?? true}
                                      onCheckedChange={(checked) =>
                                        updateField(selectedField.id, {
                                          multipleConfig: { horizontal: checked },
                                        })
                                      }
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      {config.horizontal ? 'Enabled' : 'Disabled'}
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-2 pt-2 border-t">
                                  <Label className="text-sm font-medium text-slate-700">Required</Label>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={config.required ?? false}
                                      onCheckedChange={(checked) =>
                                        updateField(selectedField.id, {
                                          multipleConfig: { required: checked },
                                        })
                                      }
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      {config.required ? 'Enabled' : 'Disabled'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    This indicates that the user must specify a value for the input
                                    before the form submission.
                                  </p>
                                  {config.required && (
                                    <div className="space-y-1.5 pt-2">
                                      <Label className="text-sm font-medium text-slate-700">Error</Label>
                                      <Input
                                        placeholder={config.error}
                                        value={config.error ?? ''}
                                        onChange={(e) =>
                                          updateField(selectedField.id, {
                                            multipleConfig: { error: e.target.value || undefined },
                                          })
                                        }
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        This message will show up when users do not respond to mandatory
                                        questions.
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2 pt-2 border-t">
                                  <Label className="text-sm font-medium text-slate-700">Read only</Label>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={config.readOnly ?? false}
                                      onCheckedChange={(checked) =>
                                        updateField(selectedField.id, {
                                          multipleConfig: { readOnly: checked },
                                        })
                                      }
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      {config.readOnly ? 'Enabled' : 'Disabled'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    User can view this field but cannot modify it.
                                  </p>
                                </div>
                                <div className="space-y-2 pt-2 border-t">
                                  <Label className="text-sm font-medium text-slate-700">Auto reject</Label>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={config.autoRejectEnabled ?? false}
                                      onCheckedChange={(checked) =>
                                        updateField(selectedField.id, {
                                          multipleConfig: { autoRejectEnabled: checked },
                                        })
                                      }
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      {config.autoRejectEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Select the options which will be auto rejected.
                                  </p>
                                  {config.autoRejectEnabled && (
                                    <div className="space-y-1.5">
                                      <Label className="text-sm font-medium text-slate-700">
                                        Auto reject options
                                      </Label>
                                      <div className="space-y-1.5">
                                        {(config.options ?? []).map((opt) => {
                                          const list = config.autoRejectOptionIds ?? [];
                                          const checked = list.includes(opt.id);
                                          return (
                                            <label
                                              key={opt.id}
                                              className="flex items-center gap-2 text-sm text-slate-700"
                                            >
                                              <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-slate-300"
                                                checked={checked}
                                                onChange={(e) => {
                                                  const current = config.autoRejectOptionIds ?? [];
                                                  const next = e.target.checked
                                                    ? [...current, opt.id]
                                                    : current.filter((id) => id !== opt.id);
                                                  updateField(selectedField.id, {
                                                    multipleConfig: { autoRejectOptionIds: next },
                                                  });
                                                }}
                                              />
                                              <span>{opt.label}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </>
                      )}
                      {selectedField.type === 'multiline' && (() => {
                        const config: MultilineFieldConfig = {
                          ...DEFAULT_MULTILINE_CONFIG,
                          ...selectedField.multilineConfig,
                        };
                        return (
                          <>
                            <div className="space-y-1.5 pt-2 border-t">
                              <Label className="text-sm font-medium text-slate-700">Validation</Label>
                              <Select
                                value={config.validation ?? 'none'}
                                onValueChange={(value) =>
                                  updateField(selectedField.id, {
                                    multilineConfig: { validation: value as MultilineValidation },
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="alphabetic">Alphabetic</SelectItem>
                                  <SelectItem value="numeric">Numeric</SelectItem>
                                  <SelectItem value="alphanumeric">AlphaNumeric</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-sm font-medium text-slate-700">Height</Label>
                              <Input
                                type="number"
                                min={50}
                                value={config.height ?? 150}
                                onChange={(e) => {
                                  const n = parseInt(e.target.value, 10);
                                  updateField(selectedField.id, {
                                    multilineConfig: { height: Number.isNaN(n) ? undefined : n },
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-sm font-medium text-slate-700">Editor type</Label>
                              <div className="flex items-center gap-4">
                                <button
                                  type="button"
                                  className={cn(
                                    'px-3 py-1.5 rounded-full text-xs border',
                                    (config.editorType ?? 'plain') === 'plain'
                                      ? 'bg-primary text-white border-primary'
                                      : 'bg-background text-slate-700 border-slate-200'
                                  )}
                                  onClick={() =>
                                    updateField(selectedField.id, {
                                      multilineConfig: { editorType: 'plain' },
                                    })
                                  }
                                >
                                  Plain text
                                </button>
                                <button
                                  type="button"
                                  className={cn(
                                    'px-3 py-1.5 rounded-full text-xs border',
                                    config.editorType === 'editor'
                                      ? 'bg-primary text-white border-primary'
                                      : 'bg-background text-slate-700 border-slate-200'
                                  )}
                                  onClick={() =>
                                    updateField(selectedField.id, {
                                      multilineConfig: { editorType: 'editor' },
                                    })
                                  }
                                >
                                  Editor
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2 pt-2 border-t">
                              <Label className="text-sm font-medium text-slate-700">Required</Label>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={config.required ?? false}
                                  onCheckedChange={(checked) =>
                                    updateField(selectedField.id, {
                                      multilineConfig: { required: checked },
                                    })
                                  }
                                />
                                <span className="text-sm text-muted-foreground">
                                  {config.required ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                This indicates that the user must specify a value for the input
                                before the form submission.
                              </p>
                            </div>
                            {config.required && (
                              <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700">Error</Label>
                                <Input
                                  placeholder={config.error}
                                  value={config.error ?? ''}
                                  onChange={(e) =>
                                    updateField(selectedField.id, {
                                      multilineConfig: { error: e.target.value || undefined },
                                    })
                                  }
                                />
                                <p className="text-xs text-muted-foreground">
                                  This message will show up when users do not respond to mandatory
                                  questions.
                                </p>
                              </div>
                            )}
                            <div className="space-y-2 pt-2 border-t">
                              <Label className="text-sm font-medium text-slate-700">Enable charlimit</Label>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={config.charLimitEnabled ?? false}
                                  onCheckedChange={(checked) =>
                                    updateField(selectedField.id, {
                                      multilineConfig: { charLimitEnabled: checked },
                                    })
                                  }
                                />
                                <span className="text-sm text-muted-foreground">
                                  {config.charLimitEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Enter the character limit for user. User can not be enter more than
                                this count.
                              </p>
                            </div>
                            {config.charLimitEnabled && (
                              <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700">Char limit</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={config.charLimit ?? 0}
                                  onChange={(e) => {
                                    const n = parseInt(e.target.value, 10);
                                    updateField(selectedField.id, {
                                      multilineConfig: { charLimit: Number.isNaN(n) ? undefined : n },
                                    });
                                  }}
                                />
                              </div>
                            )}
                            <div className="space-y-2 pt-2 border-t">
                              <Label className="text-sm font-medium text-slate-700">Read only</Label>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={config.readOnly ?? false}
                                  onCheckedChange={(checked) =>
                                    updateField(selectedField.id, {
                                      multilineConfig: { readOnly: checked },
                                    })
                                  }
                                />
                                <span className="text-sm text-muted-foreground">
                                  {config.readOnly ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                User can view this field but cannot modify it.
                              </p>
                            </div>
                            <div className="space-y-2 pt-2 border-t">
                              <Label className="text-sm font-medium text-slate-700">Hidden</Label>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={selectedField.hidden ?? false}
                                  onCheckedChange={(checked) =>
                                    updateField(selectedField.id, {
                                      hidden: checked,
                                    })
                                  }
                                />
                                <span className="text-sm text-muted-foreground">
                                  {selectedField.hidden ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                User can not see this field when enable.
                              </p>
                            </div>
                          </>
                        );
                      })()}
                      {selectedField.type === 'email' && (() => {
                        const emailConfig = { ...DEFAULT_EMAIL_CONFIG, ...selectedField.emailConfig };
                        return (
                          <>
                            <div className="space-y-1.5">
                              <Label className="text-sm font-medium text-slate-700">Sub label</Label>
                              <RichTextEditor
                                placeholder="Optional helper text below the field"
                                value={emailConfig.subLabel ?? ''}
                                onChange={(html) =>
                                  updateField(selectedField.id, {
                                    emailConfig: { subLabel: html || undefined },
                                  })
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Please select text before applying styling on it.
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-sm font-medium text-slate-700">Placeholder</Label>
                              <Input
                                placeholder={DEFAULT_EMAIL_CONFIG.placeholder}
                                value={emailConfig.placeholder ?? ''}
                                onChange={(e) =>
                                  updateField(selectedField.id, {
                                    emailConfig: { placeholder: e.target.value || undefined },
                                  })
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Add a short hint that describes the expected email value.
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-sm font-medium text-slate-700">Tooltip</Label>
                              <Input
                                placeholder="Add message for info icon"
                                value={selectedField.tooltip ?? ''}
                                onChange={(e) =>
                                  updateField(selectedField.id, {
                                    tooltip: e.target.value || undefined,
                                  })
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Add message which will appear when a cursor is positioned over an info icon
                                along with label.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-slate-700">Required</Label>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={emailConfig.required ?? true}
                                  onCheckedChange={(checked) =>
                                    updateField(selectedField.id, {
                                      emailConfig: { required: checked },
                                    })
                                  }
                                />
                                <span className="text-sm text-muted-foreground">
                                  {emailConfig.required ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                This indicates that the user must specify a value for the input
                                before the form submission.
                              </p>
                            </div>
                            {(emailConfig.required ?? true) && (
                              <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700">Error</Label>
                                <Input
                                  placeholder={DEFAULT_EMAIL_CONFIG.error}
                                  value={emailConfig.error ?? ''}
                                  onChange={(e) =>
                                    updateField(selectedField.id, {
                                      emailConfig: { error: e.target.value || undefined },
                                    })
                                  }
                                />
                                <p className="text-xs text-muted-foreground">
                                  This message will show up when users do not respond to mandatory
                                  questions.
                                </p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                  {selectedField.type === 'header' && (() => {
                    const headerConfig = { ...DEFAULT_HEADER_CONFIG, ...selectedField.headerConfig };
                    return (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-slate-700">Header</Label>
                          <RichTextEditor
                            placeholder="Heading"
                            value={headerConfig.header ?? ''}
                            onChange={(html) =>
                              updateField(selectedField.id, {
                                headerConfig: { header: html || undefined },
                              })
                            }
                            defaultFontSize="28px"
                          />
                          <p className="text-xs text-muted-foreground">
                            Please select text before applying styling on it.
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-slate-700">Sub header</Label>
                          <RichTextEditor
                            placeholder="Type a subheader"
                            value={headerConfig.subHeader ?? ''}
                            onChange={(html) =>
                              updateField(selectedField.id, {
                                headerConfig: { subHeader: html || undefined },
                              })
                            }
                            defaultFontSize="15px"
                          />
                          <p className="text-xs text-muted-foreground">
                            Please select text before applying styling on it.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">Hidden</Label>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={headerConfig.hidden ?? false}
                              onCheckedChange={(checked) =>
                                updateField(selectedField.id, {
                                  headerConfig: { hidden: checked },
                                })
                              }
                            />
                            <span className="text-sm text-muted-foreground">
                              {headerConfig.hidden ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            User can not see this field when enable.
                          </p>
                        </div>
                      </>
                    );
                  })()}
                  {selectedField.type === 'name' && (() => {
                    const nameConfig = { ...DEFAULT_NAME_CONFIG, ...selectedField.nameConfig };
                    return (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">Horizontal</Label>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={nameConfig.horizontal}
                              onCheckedChange={(checked) =>
                                updateField(selectedField.id, {
                                  nameConfig: { horizontal: checked },
                                })
                              }
                            />
                            <span className="text-sm text-muted-foreground">
                              {nameConfig.horizontal ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-slate-700">Column</Label>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={1}
                              max={3}
                              className="w-16"
                              value={nameConfig.columns}
                              onChange={(e) => {
                                const n = parseInt(e.target.value, 10);
                                if (!Number.isNaN(n) && n >= 1 && n <= 3)
                                  updateField(selectedField.id, { nameConfig: { columns: n } });
                              }}
                            />
                            <div className="flex flex-col">
                              <button
                                type="button"
                                className="p-0.5 hover:bg-muted rounded"
                                onClick={() =>
                                  updateField(selectedField.id, {
                                    nameConfig: {
                                      columns: Math.min(3, nameConfig.columns + 1),
                                    },
                                  })
                                }
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="p-0.5 hover:bg-muted rounded"
                                onClick={() =>
                                  updateField(selectedField.id, {
                                    nameConfig: {
                                      columns: Math.max(1, nameConfig.columns - 1),
                                    },
                                  })
                                }
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">
                            Middle name
                          </Label>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={nameConfig.middleName}
                              onCheckedChange={(checked) =>
                                updateField(selectedField.id, {
                                  nameConfig: { middleName: checked },
                                })
                              }
                            />
                            <span className="text-sm text-muted-foreground">
                              {nameConfig.middleName ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-slate-700">
                            Sub-fields
                          </Label>
                          <div className="space-y-1">
                            <button
                              type="button"
                              className={cn(
                                'w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors text-left',
                                selectedNameSubField === 'first'
                                  ? 'bg-primary/10 border-primary/30'
                                  : 'bg-muted/50 hover:bg-muted'
                              )}
                              onClick={() =>
                                setSelectedNameSubField((k) => (k === 'first' ? null : 'first'))
                              }
                            >
                              {(nameConfig.subFields?.first?.label ?? DEFAULT_FIRST.label) || 'First Name'}
                              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </button>
                            {nameConfig.middleName && (
                              <button
                                type="button"
                                className={cn(
                                  'w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors text-left',
                                  selectedNameSubField === 'middle'
                                    ? 'bg-primary/10 border-primary/30'
                                    : 'bg-muted/50 hover:bg-muted'
                                )}
                                onClick={() =>
                                  setSelectedNameSubField((k) => (k === 'middle' ? null : 'middle'))
                                }
                              >
                                {(nameConfig.subFields?.middle?.label ?? DEFAULT_MIDDLE.label) || 'Middle Name'}
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                              </button>
                            )}
                            <button
                              type="button"
                              className={cn(
                                'w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors text-left',
                                selectedNameSubField === 'last'
                                  ? 'bg-primary/10 border-primary/30'
                                  : 'bg-muted/50 hover:bg-muted'
                              )}
                              onClick={() =>
                                setSelectedNameSubField((k) => (k === 'last' ? null : 'last'))
                              }
                            >
                              {(nameConfig.subFields?.last?.label ?? DEFAULT_LAST.label) || 'Last Name'}
                              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                        {selectedNameSubField && (() => {
                          const key = selectedNameSubField;
                          const sub = { ...getDefaultSubField(key), ...nameConfig.subFields?.[key] };
                          const subLabel = key === 'first' ? 'First Name' : key === 'last' ? 'Last Name' : 'Middle Name';
                          return (
                            <div className="border-t pt-4 space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">
                                  Edit: {subLabel}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => setSelectedNameSubField(null)}
                                >
                                  Back
                                </Button>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700">Error</Label>
                                <Input
                                  placeholder="This field should not be empty"
                                  value={sub.error ?? ''}
                                  onChange={(e) =>
                                    updateNameSubField(selectedField.id, key, {
                                      error: e.target.value || undefined,
                                    })
                                  }
                                />
                                <p className="text-xs text-muted-foreground">
                                  This message will show up when users do not respond to mandatory
                                  questions.
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">Required</Label>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={sub.required ?? (key === 'middle' ? false : true)}
                                    onCheckedChange={(checked) =>
                                      updateNameSubField(selectedField.id, key, {
                                        required: checked,
                                      })
                                    }
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {(sub.required ?? (key !== 'middle')) ? 'Enabled' : 'Disabled'}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  This indicates that the user must specify a value for the input
                                  before the form submission.
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700">Label</Label>
                                <RichTextEditor
                                  placeholder={getDefaultSubField(key).label}
                                  value={sub.label ?? ''}
                                  onChange={(html) =>
                                    updateNameSubField(selectedField.id, key, {
                                      label: html || undefined,
                                    })
                                  }
                                />
                                <p className="text-xs text-muted-foreground">
                                  Please select text before applying styling on it.
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700">
                                  Placeholder
                                </Label>
                                <Input
                                  placeholder={key === 'first' ? 'Ex: James' : key === 'last' ? 'Ex: Lee' : 'Ex: John'}
                                  value={sub.placeholder ?? ''}
                                  onChange={(e) =>
                                    updateNameSubField(selectedField.id, key, {
                                      placeholder: e.target.value || undefined,
                                    })
                                  }
                                />
                                <p className="text-xs text-muted-foreground">
                                  Add a short hint that describes the expected value of the field.
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700">
                                  Sub label
                                </Label>
                                <RichTextEditor
                                  placeholder="Optional helper text below the field"
                                  value={sub.subLabel ?? ''}
                                  onChange={(html) =>
                                    updateNameSubField(selectedField.id, key, {
                                      subLabel: html || undefined,
                                    })
                                  }
                                />
                                <p className="text-xs text-muted-foreground">
                                  Please select text before applying styling on it.
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700">Tooltip</Label>
                                <Input
                                  placeholder="Add message for info icon"
                                  value={sub.tooltip ?? ''}
                                  onChange={(e) =>
                                    updateNameSubField(selectedField.id, key, {
                                      tooltip: e.target.value || undefined,
                                    })
                                  }
                                />
                                <p className="text-xs text-muted-foreground">
                                  Add message which will appear when a cursor is positioned over an
                                  info icon along with label.
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    );
                  })()}
                </>
              )}
              {!selectedField && (
                <>
                  <Button variant="default" size="sm" className="w-full">
                    Manage Translation
                  </Button>
              <Tabs value={styleTab} onValueChange={(v) => setStyleTab(v as 'page' | 'form')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="page" className="text-xs">Page Style</TabsTrigger>
                  <TabsTrigger value="form" className="text-xs">Form Style</TabsTrigger>
                </TabsList>
                {styleTab === 'page' && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Color schemes</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {COLOR_SCHEMES.map((scheme) => (
                          <button
                            key={scheme.id}
                            type="button"
                            onClick={() => setSelectedSchemeId(scheme.id)}
                            className={cn(
                              'h-9 rounded-md flex items-center justify-center text-xs font-medium transition-all',
                              scheme.bg,
                              scheme.text,
                              scheme.border,
                              selectedSchemeId === scheme.id && 'ring-2 ring-primary ring-offset-2'
                            )}
                          >
                            {selectedSchemeId === scheme.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              scheme.label
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">Background color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="font-mono text-sm flex-1"
                        />
                        <div
                          className="h-10 w-10 rounded-md border border-input shrink-0"
                          style={{ backgroundColor }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">Background image</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg h-24 flex items-center justify-center bg-muted/30">
                        <div className="text-center text-muted-foreground">
                          <ImagePlus className="h-8 w-8 mx-auto mb-1 opacity-60" />
                          <span className="text-xs">Upload image</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">Background position</Label>
                      <Select value={backgroundPosition} onValueChange={setBackgroundPosition}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Center">Center</SelectItem>
                          <SelectItem value="Top">Top</SelectItem>
                          <SelectItem value="Bottom">Bottom</SelectItem>
                          <SelectItem value="Left">Left</SelectItem>
                          <SelectItem value="Right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">Background repeat</Label>
                      <Select value={backgroundRepeat} onValueChange={setBackgroundRepeat}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Repeat">Repeat</SelectItem>
                          <SelectItem value="Repeat-x">Repeat-x</SelectItem>
                          <SelectItem value="Repeat-y">Repeat-y</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {styleTab === 'form' && (
                  <div className="mt-4 py-4 text-center text-sm text-muted-foreground">
                    Form style options will appear here.
                  </div>
                )}
              </Tabs>
                </>
              )}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
