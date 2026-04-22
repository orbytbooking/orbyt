'use client';

import {
  useState,
  useCallback,
  useEffect,
  Fragment,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/contexts/BusinessContext';
import { validateHiringFormFields } from '@/lib/hiring-form-validation';
import { RichTextEditor } from '@/components/admin/hiring/RichTextEditor';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  HelpCircle,
  Info,
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
  Monitor,
  Smartphone,
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
  /** Quiz forms only (UI); scored against `gradedCorrectOptionId`. */
  graded?: boolean;
  gradedCorrectOptionId?: string;
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
  /** Quiz-style: compare submission to `gradedCorrectOptionId` (option id). */
  graded?: boolean;
  gradedCorrectOptionId?: string;
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
  /** Quiz forms only; set of correct option ids (order-independent). */
  graded?: boolean;
  gradedCorrectOptionIds?: string[];
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

function FieldInfoTooltip({
  message,
  tooltipContentStyle,
  tooltipIconStyle,
}: {
  message: string;
  tooltipContentStyle: CSSProperties;
  tooltipIconStyle: CSSProperties;
}) {
  const iconStroke =
    typeof tooltipIconStyle.color === 'string' && tooltipIconStyle.color.trim() !== ''
      ? tooltipIconStyle.color
      : '#ff8c00';
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-full transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          style={tooltipIconStyle}
          aria-label="Field information"
        >
          <Info className="h-4 w-4" color={iconStroke} aria-hidden strokeWidth={2.25} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs border-0 text-left shadow-md"
        style={tooltipContentStyle}
      >
        {message}
      </TooltipContent>
    </Tooltip>
  );
}

/** Label text + optional asterisk + info icon when `tooltip` is non-empty */
function FormFieldLabelWithInfo({
  html,
  required,
  tooltip,
  labelClassName,
  style,
  tooltipContentStyle,
  tooltipIconStyle,
}: {
  html: string;
  required?: boolean;
  tooltip?: string;
  labelClassName?: string;
  style?: CSSProperties;
  tooltipContentStyle: CSSProperties;
  tooltipIconStyle: CSSProperties;
}) {
  const tip = tooltip?.trim();
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Label className={cn('text-sm', labelClassName)} style={style}>
        <LabelContent html={html || ''} />
        {required ? ' *' : ''}
      </Label>
      {tip ? (
        <FieldInfoTooltip
          message={tip}
          tooltipContentStyle={tooltipContentStyle}
          tooltipIconStyle={tooltipIconStyle}
        />
      ) : null}
    </div>
  );
}

function FormFieldNameHeadingWithInfo({
  html,
  tooltip,
  tooltipContentStyle,
  tooltipIconStyle,
}: {
  html: string;
  tooltip?: string;
  tooltipContentStyle: CSSProperties;
  tooltipIconStyle: CSSProperties;
}) {
  const tip = tooltip?.trim();
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <h3 className="text-sm font-medium text-slate-900">
        <LabelContent html={html || ''} />
      </h3>
      {tip ? (
        <FieldInfoTooltip
          message={tip}
          tooltipContentStyle={tooltipContentStyle}
          tooltipIconStyle={tooltipIconStyle}
        />
      ) : null}
    </div>
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

/** Canvas text fields get this class so Form Style → Input rules apply under `#builder-form`. */
const HIRING_FORM_STYLED_INPUT_CLASS = 'hiring-form-styled-input';

/** Standalone Label blocks only; Form Style → Label injects `color` under `#builder-form` for this class. */
const HIRING_FORM_LABEL_CHROME_CLASS = 'hiring-form-label-chrome';

/** Paragraph blocks only; Form Style → Paragraph injects `color` under `#builder-form` for this class. */
const HIRING_FORM_PARAGRAPH_CHROME_CLASS = 'hiring-form-paragraph-chrome';

/** Header sub line only; Form Style → Sub Header injects `color` under `#builder-form` for this class. */
const HIRING_FORM_SUB_HEADER_CHROME_CLASS = 'hiring-form-sub-header-chrome';

/** Field sub-label helper lines; Form Style → Sub Label injects `color` under `#builder-form` for this class. */
const HIRING_FORM_SUB_LABEL_CHROME_CLASS = 'hiring-form-sub-label-chrome';

/** Field-level error copy under inputs (Form Style → Input “Error color” targets these). */
const HIRING_FORM_FIELD_ERROR_CLASS = 'hiring-form-field-error';
const HIRING_FORM_FIELD_ERROR_DOT_CLASS = 'hiring-form-field-error-dot';

function FormFieldBlock({
  field,
  isSelected,
  onSelect,
  onRemove,
  onDragStart,
  onDuplicate,
  errorMessage,
  disableFileInputs,
  headerHeadingStyle,
  formLabelChromeStyle,
  formParagraphChromeStyle,
  formSubHeaderChromeStyle,
  formSubLabelChromeStyle,
  formTooltipContentStyle,
  formTooltipIconStyle,
  variant = 'builder',
  stackForPreview = false,
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
  /** Form Style → Header: applied to the main heading HTML (not sub header). */
  headerHeadingStyle?: CSSProperties;
  /** Form Style → Label: applied to standalone Label field blocks. */
  formLabelChromeStyle?: CSSProperties;
  /** Form Style → Paragraph: applied to Paragraph field blocks. */
  formParagraphChromeStyle?: CSSProperties;
  /** Form Style → Sub Header: applied under Header blocks when sub-header HTML is present. */
  formSubHeaderChromeStyle?: CSSProperties;
  /** Form Style → Sub Label: applied to field helper / sub-label lines under inputs. */
  formSubLabelChromeStyle?: CSSProperties;
  /** Form Style → Tooltip: bubble background and text color. */
  formTooltipContentStyle: CSSProperties;
  /** Form Style → Tooltip: info icon color on the trigger. */
  formTooltipIconStyle: CSSProperties;
  /** `preview` hides builder chrome (drag, select, toolbar). */
  variant?: 'builder' | 'preview';
  /** When true (mobile preview), stack multi-column layouts regardless of viewport width. */
  stackForPreview?: boolean;
}) {
  const isPreview = variant === 'preview';
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
  const renderSubLabel = (html: string) => (
    <div
      style={formSubLabelChromeStyle}
      className={cn(
        HIRING_FORM_SUB_LABEL_CHROME_CLASS,
        'font-normal [&_p]:mb-0 [&_p]:inline'
      )}
    >
      <LabelContent html={html} />
    </div>
  );
  return (
    <div
      role={isPreview ? undefined : 'button'}
      tabIndex={isPreview ? undefined : 0}
      onClick={
        isPreview
          ? undefined
          : (e) => {
              if ((e.target as HTMLElement)?.closest?.('[data-element-toolbar]')) return;
              e.stopPropagation();
              onSelect();
            }
      }
      onKeyDown={isPreview ? undefined : (e) => e.key === 'Enter' && onSelect()}
      className={cn(
        isPreview
          ? 'relative py-0.5'
          : 'group relative cursor-grab active:cursor-grabbing rounded-md border transition-colors p-1 -m-1',
        !isPreview &&
          (isSelected
            ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
            : 'border-transparent hover:border-slate-200 hover:bg-slate-50/50')
      )}
      draggable={!isPreview}
      onDragStart={
        isPreview
          ? undefined
          : (e) => {
              const inToolbar = (e.target as HTMLElement)?.closest?.('[data-element-toolbar]');
              const onHandle = (e.target as HTMLElement)?.closest?.('[data-drag-handle]');
              if (inToolbar && !onHandle) {
                e.preventDefault();
                return;
              }
              onDragStart(e);
            }
      }
    >
      {!isPreview && (
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
      )}
      {field.type === 'header' && (() => {
        const config = { ...DEFAULT_HEADER_CONFIG, ...field.headerConfig };
        if (config.hidden) return <div className="text-sm text-muted-foreground italic">Hidden header</div>;
        const headingHtml = config.header?.trim() || `<p>${field.label ?? getDefaultLabel('header')}</p>`;
        const subHtml = config.subHeader?.trim();
        return (
          <div className="space-y-1">
            <div
              style={headerHeadingStyle}
              className="[&_p]:mb-0 [&_p]:inline [&_*]:text-inherit"
              dangerouslySetInnerHTML={{ __html: headingHtml }}
            />
            {subHtml ? (
              <div
                style={formSubHeaderChromeStyle}
                className={cn(
                  HIRING_FORM_SUB_HEADER_CHROME_CLASS,
                  'font-normal [&_p]:mb-0 [&_p]:inline'
                )}
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <Label
              style={formLabelChromeStyle}
              className={cn(HIRING_FORM_LABEL_CHROME_CLASS, 'font-normal leading-normal')}
            >
              <LabelContent html={displayLabel || ''} />
            </Label>
            {field.tooltip?.trim() ? (
              <FieldInfoTooltip
                message={field.tooltip.trim()}
                tooltipContentStyle={formTooltipContentStyle}
                tooltipIconStyle={formTooltipIconStyle}
              />
            ) : null}
          </div>
        )
      )}
      {field.type === 'paragraph' && (
        field.hidden ? (
          <p className="text-sm text-muted-foreground italic">Hidden paragraph</p>
        ) : (
          <p
            style={formParagraphChromeStyle}
            className={cn(HIRING_FORM_PARAGRAPH_CHROME_CLASS, 'font-normal [&_p]:mb-0 [&_p]:inline')}
          >
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
          <FormFieldLabelWithInfo
            html={displayLabel || ''}
            required={!!commonConfig.required}
            tooltip={field.tooltip}
            tooltipContentStyle={formTooltipContentStyle}
            tooltipIconStyle={formTooltipIconStyle}
          />
          <Input
            name={field.id}
            placeholder={commonConfig.placeholder || 'Enter text'}
            className={cn(HIRING_FORM_STYLED_INPUT_CLASS, inputErrorClass)}
          />
          {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
          {showErrorBlock && (
            <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
              <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
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
            <FormFieldLabelWithInfo
              html={displayLabel || ''}
              required={!!commonConfig.required}
              tooltip={field.tooltip}
              tooltipContentStyle={formTooltipContentStyle}
              tooltipIconStyle={formTooltipIconStyle}
            />
            <Input
              name={field.id}
              type="number"
              min={0}
              placeholder={commonConfig.placeholder || '0'}
              readOnly={commonConfig.readOnly ?? false}
              defaultValue={commonConfig.defaultValue}
              className={cn(HIRING_FORM_STYLED_INPUT_CLASS, inputErrorClass)}
            />
            {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
            {showErrorBlock && (
              <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
                <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
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
            <FormFieldLabelWithInfo
              html={displayLabel || ''}
              required={!!multilineConfig.required}
              tooltip={field.tooltip}
              tooltipContentStyle={formTooltipContentStyle}
              tooltipIconStyle={formTooltipIconStyle}
            />
            <div style={{ minHeight: multilineConfig.height ?? 150 }}>
              <RichTextEditor
                placeholder={commonConfig.placeholder || multilineConfig.placeholder || 'Enter text...'}
                className="w-full"
                defaultFontSize="14px"
              />
            </div>
            {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
          </div>
        ) : (
          <div className="space-y-1.5">
            <FormFieldLabelWithInfo
              html={displayLabel || ''}
              required={!!multilineConfig.required}
              tooltip={field.tooltip}
              tooltipContentStyle={formTooltipContentStyle}
              tooltipIconStyle={formTooltipIconStyle}
            />
            <Textarea
              name={field.id}
              className={cn(HIRING_FORM_STYLED_INPUT_CLASS, 'resize-y', inputErrorClass)}
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
            {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
            {showErrorBlock && (
              <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
                <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
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
            <FormFieldLabelWithInfo
              html={displayLabel || ''}
              required={!!dropdownConfig?.required}
              tooltip={field.tooltip}
              tooltipContentStyle={formTooltipContentStyle}
              tooltipIconStyle={formTooltipIconStyle}
            />
            <select
              name={field.id}
              disabled={dropdownConfig?.readOnly ?? false}
              defaultValue={defaultOpt?.id ?? ''}
              className={cn(
                HIRING_FORM_STYLED_INPUT_CLASS,
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
            {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
            {showErrorBlock && (
              <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
                <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
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
        const layoutClass = radioConfig.horizontal
          ? stackForPreview
            ? 'flex flex-col gap-3'
            : 'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4'
          : 'space-y-1.5';
        return (
          <div className="space-y-2">
            <FormFieldLabelWithInfo
              html={displayLabel || ''}
              required={!!radioConfig.required}
              tooltip={field.tooltip}
              tooltipContentStyle={formTooltipContentStyle}
              tooltipIconStyle={formTooltipIconStyle}
            />
            <div className={layoutClass}>
              {opts.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={field.id}
                    value={opt.id}
                    defaultChecked={opt.id === defaultId}
                    disabled={radioConfig.readOnly ?? false}
                  />{' '}
                  {opt.label}
                </label>
              ))}
            </div>
            {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
            {showErrorBlock && (
              <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
                <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
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
        const layoutClass = multipleConfig.horizontal
          ? stackForPreview
            ? 'flex flex-col gap-3'
            : 'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4'
          : 'space-y-1.5';
        return (
          <div className="space-y-2">
            <FormFieldLabelWithInfo
              html={displayLabel || ''}
              required={!!multipleConfig.required}
              tooltip={field.tooltip}
              tooltipContentStyle={formTooltipContentStyle}
              tooltipIconStyle={formTooltipIconStyle}
            />
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
            {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
            {showErrorBlock && (
              <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
                <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
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
            <FormFieldNameHeadingWithInfo
              html={displayLabel || ''}
              tooltip={field.tooltip}
              tooltipContentStyle={formTooltipContentStyle}
              tooltipIconStyle={formTooltipIconStyle}
            />
            <div
              className={cn(
                'gap-3',
                config.horizontal
                  ? stackForPreview
                    ? 'grid grid-cols-1 gap-3'
                    : cn(
                        'grid gap-3',
                        cols === 1 && 'grid-cols-1',
                        cols === 2 && 'grid-cols-1 sm:grid-cols-2',
                        cols === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                      )
                  : 'flex flex-col'
              )}
            >
              <div className={cn(config.horizontal ? '' : 'space-y-1.5')}>
                <FormFieldLabelWithInfo
                  html={first.label ?? ''}
                  required={!!first.required}
                  tooltip={first.tooltip}
                  tooltipContentStyle={formTooltipContentStyle}
                  tooltipIconStyle={formTooltipIconStyle}
                />
                <Input
                  name={`${field.id}_first`}
                  placeholder={first.placeholder}
                  className={cn(
                    HIRING_FORM_STYLED_INPUT_CLASS,
                    showNameError && first.required ? 'border-destructive focus-visible:ring-destructive' : ''
                  )}
                />
                {first.subLabel && renderSubLabel(first.subLabel)}
                {showNameError && first.required && !errorMessage && first.error && (
                  <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
                    <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
                    {first.error}
                  </p>
                )}
              </div>
              {config.middleName && (
                <div className={cn(config.horizontal ? '' : 'space-y-1.5')}>
                  <FormFieldLabelWithInfo
                    html={middle.label ?? ''}
                    required={!!middle.required}
                    tooltip={middle.tooltip}
                    tooltipContentStyle={formTooltipContentStyle}
                    tooltipIconStyle={formTooltipIconStyle}
                  />
                  <Input
                    name={`${field.id}_middle`}
                    placeholder={middle.placeholder}
                    className={cn(
                      HIRING_FORM_STYLED_INPUT_CLASS,
                      showNameError && middle.required ? 'border-destructive focus-visible:ring-destructive' : ''
                    )}
                  />
                  {middle.subLabel && renderSubLabel(middle.subLabel)}
                  {showNameError && middle.required && middle.error && (
                    <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
                      <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
                      {middle.error}
                    </p>
                  )}
                </div>
              )}
              <div className={cn(config.horizontal ? '' : 'space-y-1.5')}>
                <FormFieldLabelWithInfo
                  html={last.label ?? ''}
                  required={!!last.required}
                  tooltip={last.tooltip}
                  tooltipContentStyle={formTooltipContentStyle}
                  tooltipIconStyle={formTooltipIconStyle}
                />
                <Input
                  name={`${field.id}_last`}
                  placeholder={last.placeholder}
                  className={cn(
                    HIRING_FORM_STYLED_INPUT_CLASS,
                    showNameError && last.required ? 'border-destructive focus-visible:ring-destructive' : ''
                  )}
                />
                {last.subLabel && renderSubLabel(last.subLabel)}
                {showNameError && last.required && !errorMessage && last.error && (
                  <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
                    <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
                    {last.error}
                  </p>
                )}
              </div>
            </div>
            {showErrorBlock && errorMessage && (
              <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
                <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
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
            <FormFieldLabelWithInfo
              html={displayLabel || ''}
              required={!!emailConfig.required}
              tooltip={field.tooltip}
              tooltipContentStyle={formTooltipContentStyle}
              tooltipIconStyle={formTooltipIconStyle}
            />
            <Input
              name={field.id}
              type="email"
              placeholder={emailConfig.placeholder}
              className={cn(HIRING_FORM_STYLED_INPUT_CLASS, inputErrorClass)}
            />
            {emailConfig.subLabel && renderSubLabel(emailConfig.subLabel)}
            {showErrorBlock && (
              <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
                <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
                {errorMessage}
              </p>
            )}
          </div>
        );
      })()}
      {field.type === 'phone' && (
        <div className="space-y-1.5">
          <FormFieldLabelWithInfo
            html={displayLabel || ''}
            required={!!commonConfig.required}
            tooltip={field.tooltip}
            tooltipContentStyle={formTooltipContentStyle}
            tooltipIconStyle={formTooltipIconStyle}
          />
          <Input
            name={field.id}
            placeholder={commonConfig.placeholder || 'Phone No.'}
            className={cn(HIRING_FORM_STYLED_INPUT_CLASS, inputErrorClass)}
          />
          {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
          {showErrorBlock && (
            <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
              <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
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
          <FormFieldLabelWithInfo
            html={displayLabel || ''}
            required={!!commonConfig.required}
            tooltip={field.tooltip}
            tooltipContentStyle={formTooltipContentStyle}
            tooltipIconStyle={formTooltipIconStyle}
          />
          <Input
            name={field.id}
            placeholder={commonConfig.placeholder || 'Street, City, ZIP'}
            className={cn(HIRING_FORM_STYLED_INPUT_CLASS, inputErrorClass)}
          />
          {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
          {showErrorBlock && (
            <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
              <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
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
          <FormFieldLabelWithInfo
            html={displayLabel || ''}
            required={!!commonConfig.required}
            tooltip={field.tooltip}
            tooltipContentStyle={formTooltipContentStyle}
            tooltipIconStyle={formTooltipIconStyle}
          />
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
          {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
          {showErrorBlock && (
            <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
              <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
              {errorMessage}
            </p>
          )}
        </div>
        )
      )}
      {field.type === 'date' && (
        <div className="space-y-1.5">
          <FormFieldLabelWithInfo
            html={displayLabel || ''}
            required={!!commonConfig.required}
            tooltip={field.tooltip}
            tooltipContentStyle={formTooltipContentStyle}
            tooltipIconStyle={formTooltipIconStyle}
          />
          <Input
            name={field.id}
            type="date"
            placeholder={commonConfig.placeholder}
            className={cn(HIRING_FORM_STYLED_INPUT_CLASS, inputErrorClass)}
          />
          {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
          {showErrorBlock && (
            <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
              <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
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
          <FormFieldLabelWithInfo
            html={displayLabel || ''}
            required={!!commonConfig.required}
            tooltip={field.tooltip}
            tooltipContentStyle={formTooltipContentStyle}
            tooltipIconStyle={formTooltipIconStyle}
          />
          <Input
            name={field.id}
            type="time"
            placeholder={commonConfig.placeholder}
            className={cn(HIRING_FORM_STYLED_INPUT_CLASS, inputErrorClass)}
          />
          {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
          {showErrorBlock && (
            <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
              <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
              {errorMessage}
            </p>
          )}
        </div>
        )
      )}
      {field.type === 'rating' && (
        <div className="space-y-1.5">
          <FormFieldLabelWithInfo
            html={displayLabel || ''}
            required={!!commonConfig.required}
            tooltip={field.tooltip}
            tooltipContentStyle={formTooltipContentStyle}
            tooltipIconStyle={formTooltipIconStyle}
          />
          <input type="hidden" name={field.id} value="0" id={`${field.id}-rating`} />
          <div className="flex gap-1 text-amber-500">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-6 w-6 fill-current" />
            ))}
          </div>
          {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
          {showErrorBlock && (
            <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
              <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
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
          <FormFieldLabelWithInfo
            html={displayLabel || ''}
            required={!!commonConfig.required}
            tooltip={field.tooltip}
            tooltipContentStyle={formTooltipContentStyle}
            tooltipIconStyle={formTooltipIconStyle}
          />
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
          {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
          {showErrorBlock && (
            <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
              <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
              {errorMessage}
            </p>
          )}
        </div>
        )
      )}
      {field.type === 'signature' && (
        <div className="space-y-1.5">
          <FormFieldLabelWithInfo
            html={displayLabel || ''}
            required={!!commonConfig.required}
            tooltip={field.tooltip}
            tooltipContentStyle={formTooltipContentStyle}
            tooltipIconStyle={formTooltipIconStyle}
          />
          <input type="hidden" name={field.id} value="" />
          <div className={cn(
            'rounded-md border border-input bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground',
            showErrorBlock && 'border-destructive'
          )}>
            Signature pad
          </div>
          {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
          {showErrorBlock && (
            <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
              <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
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
          <FormFieldLabelWithInfo
            html={displayLabel || ''}
            required={!!commonConfig.required}
            tooltip={field.tooltip}
            tooltipContentStyle={formTooltipContentStyle}
            tooltipIconStyle={formTooltipIconStyle}
          />
          <input
            name={field.id}
            type="range"
            min={0}
            max={100}
            defaultValue={50}
            className={cn(HIRING_FORM_STYLED_INPUT_CLASS, 'w-full accent-primary', inputErrorClass)}
          />
          {commonConfig.subLabel && renderSubLabel(commonConfig.subLabel)}
          {showErrorBlock && (
            <p className={cn('text-xs flex items-center gap-1 mt-1', HIRING_FORM_FIELD_ERROR_CLASS)}>
              <span className={cn('inline-block w-3 h-3 rounded-full', HIRING_FORM_FIELD_ERROR_DOT_CLASS)} />
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

const FORM_STYLE_SECTIONS = [
  'Button',
  'Container',
  'Header',
  'Input',
  'Label',
  'Paragraph',
  'Sub Header',
  'Sub Label',
  'Tooltip',
] as const;

type SubmitButtonStyle = {
  backgroundColor: string;
  borderColor: string;
  color: string;
  borderRadius: number;
  borderStyle: 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
  borderWidth: number;
  fontSize: number;
  fontStyle: 'normal' | 'italic' | 'oblique';
  fontWeight: string;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  widthMode: 'default' | 'medium' | 'full';
};

/** Used when width is "Medium": ~half the form row, centered (see form customizer reference). */
const SUBMIT_BUTTON_MEDIUM_WIDTH = '54%';

const DEFAULT_SUBMIT_BUTTON_STYLE: SubmitButtonStyle = {
  backgroundColor: '#2B65F0',
  borderColor: '#2B65F0',
  color: '#FFFFFF',
  borderRadius: 5,
  borderStyle: 'solid',
  borderWidth: 1,
  fontSize: 16,
  fontStyle: 'normal',
  fontWeight: '700',
  paddingTop: 13,
  paddingBottom: 13,
  paddingLeft: 30,
  paddingRight: 30,
  widthMode: 'full',
};

type ContainerBackgroundPosition = 'Center' | 'Top' | 'Bottom' | 'Left' | 'Right';
type ContainerBackgroundRepeat = 'None' | 'Repeat' | 'Repeat-x' | 'Repeat-y';
type ContainerBackgroundSize = 'cover' | 'contain' | 'auto' | '100% 100%';

type FormContainerStyle = {
  backgroundColor: string;
  backgroundImage: string;
  backgroundPosition: ContainerBackgroundPosition;
  backgroundRepeat: ContainerBackgroundRepeat;
  backgroundSize: ContainerBackgroundSize;
  borderColor: string;
  borderRadius: number;
  borderStyle: SubmitButtonStyle['borderStyle'];
  borderWidth: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
};

const DEFAULT_FORM_CONTAINER_STYLE: FormContainerStyle = {
  backgroundColor: '#FFFFFF',
  backgroundImage: '',
  backgroundPosition: 'Center',
  backgroundRepeat: 'None',
  backgroundSize: 'cover',
  borderColor: '#D5D5D5',
  borderRadius: 5,
  borderStyle: 'solid',
  borderWidth: 0,
  paddingTop: 20,
  paddingBottom: 20,
  paddingLeft: 20,
  paddingRight: 20,
};

/** Border / padding for the builder page backdrop (not the form card). */
type PageCanvasChrome = {
  borderStyle: FormContainerStyle['borderStyle'];
  borderWidth: number;
  borderColor: string;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
};

const DEFAULT_PAGE_CANVAS_CHROME: PageCanvasChrome = {
  borderStyle: 'solid',
  borderWidth: 0,
  borderColor: '#94a3b8',
  /** Matches previous `p-6` on the canvas. */
  paddingTop: 24,
  paddingBottom: 24,
  paddingLeft: 24,
  paddingRight: 24,
};

function containerBackgroundPositionToCss(v: ContainerBackgroundPosition): string {
  return v.toLowerCase();
}

function containerBackgroundRepeatToCss(
  v: ContainerBackgroundRepeat
): NonNullable<CSSProperties['backgroundRepeat']> {
  switch (v) {
    case 'None':
      return 'no-repeat';
    case 'Repeat':
      return 'repeat';
    case 'Repeat-x':
      return 'repeat-x';
    case 'Repeat-y':
      return 'repeat-y';
    default:
      return 'no-repeat';
  }
}

type FormHeaderTextAlign = 'left' | 'center' | 'right' | 'justify';

type FormHeaderStyle = {
  color: string;
  fontSize: number;
  fontStyle: 'normal' | 'italic' | 'oblique';
  fontWeight: string;
  lineHeight: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  textAlign: FormHeaderTextAlign;
};

const DEFAULT_FORM_HEADER_STYLE: FormHeaderStyle = {
  color: '#11263C',
  fontSize: 28,
  fontStyle: 'normal',
  fontWeight: '700',
  lineHeight: 1.5,
  paddingTop: 0,
  paddingBottom: 10,
  paddingLeft: 0,
  paddingRight: 0,
  textAlign: 'left',
};

function parseStyleNumber(raw: string, fallback: number): number {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** 6-digit hex for `<input type="color" />` when the text field holds a partial value */
function toColorInputValue(hex: string, fallback: string): string {
  const t = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) return t;
  if (/^#[0-9A-Fa-f]{3}$/i.test(t)) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback;
}

/** Expands `#rgb` to `#rrggbb` for CSS; leaves `rgb()`, `rgba()`, etc. unchanged. */
function normalizeCssColorInput(raw: string): string {
  const t = raw.trim();
  if (/^#[0-9A-Fa-f]{3}$/i.test(t)) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return t;
}

type FormInputStyle = {
  borderColor: string;
  borderRadius: number;
  borderStyle: SubmitButtonStyle['borderStyle'];
  borderWidth: number;
  errorColor: string;
  fontSize: number;
  fontStyle: 'normal' | 'italic' | 'oblique';
  fontWeight: string;
  lineHeight: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  placeholderColor: string;
  textAlign: FormHeaderTextAlign;
};

const DEFAULT_FORM_INPUT_STYLE: FormInputStyle = {
  borderColor: 'rgb(207, 212, 218)',
  borderRadius: 5,
  borderStyle: 'solid',
  borderWidth: 1,
  errorColor: 'rgb(243, 88, 88)',
  fontSize: 16,
  fontStyle: 'normal',
  fontWeight: '400',
  lineHeight: 1.8,
  paddingTop: 10,
  paddingBottom: 10,
  paddingLeft: 10,
  paddingRight: 10,
  placeholderColor: '#A8B0B5',
  textAlign: 'left',
};

function buildHiringFormInputChromeCss(s: FormInputStyle): string {
  const borderColor = normalizeCssColorInput(s.borderColor);
  const errorColor = normalizeCssColorInput(s.errorColor);
  const placeholderColor = normalizeCssColorInput(s.placeholderColor);
  /** Each pseudo must be appended per root; `a, b::ph` would wrongly style `a` without `::ph`. */
  const roots = [
    '#builder-form input.hiring-form-styled-input',
    '#builder-form textarea.hiring-form-styled-input',
    '#builder-form select.hiring-form-styled-input',
  ];
  const S = (suffix: string) => roots.map((r) => `${r}${suffix}`).join(',\n');

  return `${S('')} {
  border-color: ${borderColor} !important;
  border-radius: ${s.borderRadius}px;
  border-style: ${s.borderStyle};
  border-width: ${s.borderWidth}px;
  font-size: ${s.fontSize}px;
  font-style: ${s.fontStyle};
  font-weight: ${s.fontWeight};
  line-height: ${s.lineHeight};
  padding: ${s.paddingTop}px ${s.paddingRight}px ${s.paddingBottom}px ${s.paddingLeft}px;
  text-align: ${s.textAlign};
  box-sizing: border-box;
  background-color: #ffffff;
}
${S('::placeholder')} {
  color: ${placeholderColor} !important;
  -webkit-text-fill-color: ${placeholderColor} !important;
  opacity: 1 !important;
}
${S('::-webkit-input-placeholder')} {
  color: ${placeholderColor} !important;
  -webkit-text-fill-color: ${placeholderColor} !important;
  opacity: 1 !important;
}
${S('::-moz-placeholder')} {
  color: ${placeholderColor} !important;
  opacity: 1 !important;
}
${S(':focus')},
${S(':focus-visible')} {
  border-color: ${borderColor} !important;
  outline: none !important;
}
${S(':active')} {
  border-color: ${borderColor} !important;
}
#builder-form p.${HIRING_FORM_FIELD_ERROR_CLASS},
#builder-form .${HIRING_FORM_FIELD_ERROR_CLASS} {
  color: ${errorColor} !important;
}
#builder-form span.${HIRING_FORM_FIELD_ERROR_DOT_CLASS},
#builder-form .${HIRING_FORM_FIELD_ERROR_DOT_CLASS} {
  background-color: ${errorColor} !important;
}
`;
}

type FormLabelStyle = {
  color: string;
  fontSize: number;
  fontStyle: 'normal' | 'italic' | 'oblique';
  fontWeight: string;
  lineHeight: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  textAlign: FormHeaderTextAlign;
};

const DEFAULT_FORM_LABEL_STYLE: FormLabelStyle = {
  color: '#11263C',
  fontSize: 16,
  fontStyle: 'normal',
  fontWeight: '700',
  lineHeight: 1.8,
  paddingTop: 0,
  paddingBottom: 15,
  paddingLeft: 0,
  paddingRight: 0,
  textAlign: 'left',
};

function buildHiringFormLabelChromeCss(s: FormLabelStyle): string {
  const fg = normalizeCssColorInput(s.color?.trim() || DEFAULT_FORM_LABEL_STYLE.color);
  const root = `#builder-form label.${HIRING_FORM_LABEL_CHROME_CLASS}`;
  return `${root},
${root} * {
  color: ${fg} !important;
}
`;
}

type FormParagraphStyle = FormLabelStyle;

const DEFAULT_FORM_PARAGRAPH_STYLE: FormParagraphStyle = {
  /** Same as rgb(51, 53, 58); hex so `<input type="color" />` stays valid. */
  color: '#33353a',
  fontSize: 16,
  fontStyle: 'normal',
  fontWeight: '400',
  lineHeight: 1.4,
  paddingTop: 0,
  paddingBottom: 10,
  paddingLeft: 0,
  paddingRight: 0,
  textAlign: 'left',
};

function buildHiringFormParagraphChromeCss(s: FormParagraphStyle): string {
  const fg = normalizeCssColorInput(s.color?.trim() || DEFAULT_FORM_PARAGRAPH_STYLE.color);
  const root = `#builder-form p.${HIRING_FORM_PARAGRAPH_CHROME_CLASS}`;
  return `${root},
${root} * {
  color: ${fg} !important;
}
`;
}

type FormSubHeaderStyle = FormLabelStyle;

const DEFAULT_FORM_SUB_HEADER_STYLE: FormSubHeaderStyle = {
  color: '#52616b',
  fontSize: 15,
  fontStyle: 'normal',
  fontWeight: '400',
  lineHeight: 1.5,
  paddingTop: 0,
  paddingBottom: 10,
  paddingLeft: 0,
  paddingRight: 0,
  textAlign: 'left',
};

function buildHiringFormSubHeaderChromeCss(s: FormSubHeaderStyle): string {
  const fg = normalizeCssColorInput(s.color?.trim() || DEFAULT_FORM_SUB_HEADER_STYLE.color);
  const root = `#builder-form div.${HIRING_FORM_SUB_HEADER_CHROME_CLASS}`;
  return `${root},
${root} * {
  color: ${fg} !important;
}
`;
}

type FormSubLabelStyle = FormLabelStyle;

const DEFAULT_FORM_SUB_LABEL_STYLE: FormSubLabelStyle = {
  color: '#52616b',
  fontSize: 14,
  fontStyle: 'normal',
  fontWeight: '400',
  lineHeight: 1.4,
  paddingTop: 5,
  paddingBottom: 10,
  paddingLeft: 0,
  paddingRight: 0,
  textAlign: 'left',
};

function buildHiringFormSubLabelChromeCss(s: FormSubLabelStyle): string {
  const fg = normalizeCssColorInput(s.color?.trim() || DEFAULT_FORM_SUB_LABEL_STYLE.color);
  const root = `#builder-form div.${HIRING_FORM_SUB_LABEL_CHROME_CLASS}`;
  return `${root},
${root} * {
  color: ${fg} !important;
}
`;
}

type FormTooltipStyle = {
  backgroundColor: string;
  color: string;
  iconColor: string;
};

const DEFAULT_FORM_TOOLTIP_STYLE: FormTooltipStyle = {
  backgroundColor: '#ffffff',
  /** ~rgb(62, 79, 96); hex keeps `<input type="color" />` valid. */
  color: '#3e4f60',
  /** ~rgb(255, 140, 0); vivid orange for the info icon. */
  iconColor: '#ff8c00',
};

/** Prefix for localStorage keys: `prefix:businessId:sessionId` (cross-tab; business-scoped). */
export const HIRING_FORM_PREVIEW_STORAGE_PREFIX = 'orbyt-hiring-form-preview-v1';

export function hiringFormPreviewStorageKey(businessId: string, sessionId: string): string {
  return `${HIRING_FORM_PREVIEW_STORAGE_PREFIX}:${businessId}:${sessionId}`;
}

export type HiringFormPreviewPayload = {
  v: 1;
  /** Workspace that created this preview (must match URL `bid`). */
  businessId: string;
  formName: string;
  formFields: FormField[];
  backgroundColor: string;
  pageBackgroundImage: string;
  backgroundPosition: ContainerBackgroundPosition;
  backgroundRepeat: ContainerBackgroundRepeat;
  pageCanvasChrome: PageCanvasChrome;
  tintFormWithPage: boolean;
  submitButtonStyle: SubmitButtonStyle;
  formContainerStyle: FormContainerStyle;
  formHeaderStyle: FormHeaderStyle;
  formInputStyle: FormInputStyle;
  formLabelStyle: FormLabelStyle;
  formParagraphStyle: FormParagraphStyle;
  formSubHeaderStyle: FormSubHeaderStyle;
  formSubLabelStyle: FormSubLabelStyle;
  formTooltipStyle: FormTooltipStyle;
};

const COLOR_SCHEMES = [
  {
    id: '1',
    canvasHex: '#1e293b',
    bg: 'bg-slate-800',
    text: 'text-white',
    label: 'Abc',
    border: 'border border-white/15',
  },
  {
    id: '2',
    canvasHex: '#1e3a8a',
    bg: 'bg-blue-900',
    text: 'text-white',
    label: 'Abc',
    border: 'border border-white/15',
  },
  {
    id: '3',
    canvasHex: '#065f46',
    bg: 'bg-emerald-800',
    text: 'text-white',
    label: 'Abc',
    border: 'border border-white/15',
  },
  {
    id: '4',
    canvasHex: '#d97706',
    bg: 'bg-amber-600',
    text: 'text-white',
    label: 'Abc',
    border: 'border border-white/15',
  },
  {
    id: '5',
    canvasHex: '#ffffff',
    bg: 'bg-white',
    text: 'text-slate-800',
    label: 'Abc',
    border: 'border border-slate-200',
  },
  {
    id: '6',
    canvasHex: '#f1f5f9',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    label: 'Abc',
    border: 'border border-slate-200',
  },
  {
    id: '7',
    canvasHex: '#dbeafe',
    bg: 'bg-blue-100',
    text: 'text-blue-900',
    label: 'Abc',
    border: 'border border-slate-200',
  },
  {
    id: '8',
    canvasHex: '#ffe4e6',
    bg: 'bg-rose-100',
    text: 'text-rose-900',
    label: 'Abc',
    border: 'border border-slate-200',
  },
] as const;

function deriveHiringFormPreviewStyles(payload: HiringFormPreviewPayload) {
  const { submitButtonStyle, formContainerStyle, backgroundColor, pageBackgroundImage } = payload;
  const { backgroundPosition, backgroundRepeat, pageCanvasChrome, tintFormWithPage } = payload;
  const {
    formHeaderStyle,
    formInputStyle,
    formLabelStyle,
    formParagraphStyle,
    formSubHeaderStyle,
    formSubLabelStyle,
    formTooltipStyle,
  } = payload;

  const submitButtonInlineStyle: CSSProperties = {
    backgroundColor: submitButtonStyle.backgroundColor,
    color: submitButtonStyle.color,
    borderColor: submitButtonStyle.borderColor,
    borderStyle: submitButtonStyle.borderStyle,
    borderWidth: `${submitButtonStyle.borderWidth}px`,
    borderRadius: `${submitButtonStyle.borderRadius}px`,
    fontSize: `${submitButtonStyle.fontSize}px`,
    fontStyle: submitButtonStyle.fontStyle,
    fontWeight: submitButtonStyle.fontWeight,
    paddingTop: `${submitButtonStyle.paddingTop}px`,
    paddingBottom: `${submitButtonStyle.paddingBottom}px`,
    paddingLeft: `${submitButtonStyle.paddingLeft}px`,
    paddingRight: `${submitButtonStyle.paddingRight}px`,
    width:
      submitButtonStyle.widthMode === 'full'
        ? '100%'
        : submitButtonStyle.widthMode === 'medium'
          ? SUBMIT_BUTTON_MEDIUM_WIDTH
          : 'auto',
    boxSizing: 'border-box',
    cursor: 'pointer',
  };

  const formContainerInlineStyle: CSSProperties = {
    backgroundColor: formContainerStyle.backgroundColor,
    backgroundImage: formContainerStyle.backgroundImage ? `url(${formContainerStyle.backgroundImage})` : 'none',
    backgroundRepeat: containerBackgroundRepeatToCss(formContainerStyle.backgroundRepeat),
    backgroundPosition: containerBackgroundPositionToCss(formContainerStyle.backgroundPosition),
    backgroundSize: formContainerStyle.backgroundSize,
    borderColor: formContainerStyle.borderColor,
    borderStyle: formContainerStyle.borderStyle,
    borderWidth: `${formContainerStyle.borderWidth}px`,
    borderRadius: `${formContainerStyle.borderRadius}px`,
    paddingTop: `${formContainerStyle.paddingTop}px`,
    paddingBottom: `${formContainerStyle.paddingBottom}px`,
    paddingLeft: `${formContainerStyle.paddingLeft}px`,
    paddingRight: `${formContainerStyle.paddingRight}px`,
    boxSizing: 'border-box',
  };

  const hasContainerImage = !!formContainerStyle.backgroundImage?.trim();
  const formPanelDisplayStyle: CSSProperties =
    !tintFormWithPage || hasContainerImage
      ? formContainerInlineStyle
      : {
          ...formContainerInlineStyle,
          backgroundColor: `color-mix(in srgb, ${normalizeCssColorInput(backgroundColor)} 28%, rgb(255 255 255 / 0.58))`,
          backgroundImage: 'none',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'auto',
          backdropFilter: 'blur(10px) saturate(145%)',
          WebkitBackdropFilter: 'blur(10px) saturate(145%)',
        };

  const hasImg = !!pageBackgroundImage.trim();
  const pageCanvasStyle: CSSProperties = {
    backgroundColor: normalizeCssColorInput(backgroundColor),
    ...(hasImg
      ? {
          backgroundImage: `url(${pageBackgroundImage})`,
          backgroundRepeat: containerBackgroundRepeatToCss(backgroundRepeat),
          backgroundPosition: containerBackgroundPositionToCss(backgroundPosition),
          backgroundSize: 'cover',
          backgroundAttachment: 'local',
        }
      : {}),
  };

  const c = pageCanvasChrome;
  const pageMainStyle: CSSProperties = {
    ...pageCanvasStyle,
    borderStyle: c.borderStyle,
    borderWidth: `${c.borderWidth}px`,
    borderColor: c.borderWidth > 0 ? normalizeCssColorInput(c.borderColor) : 'transparent',
    paddingTop: `${c.paddingTop}px`,
    paddingBottom: `${c.paddingBottom}px`,
    paddingLeft: `${c.paddingLeft}px`,
    paddingRight: `${c.paddingRight}px`,
    boxSizing: 'border-box',
  };

  const formHeaderHeadingStyle: CSSProperties = {
    color: formHeaderStyle.color,
    fontSize: `${formHeaderStyle.fontSize}px`,
    fontStyle: formHeaderStyle.fontStyle,
    fontWeight: formHeaderStyle.fontWeight,
    lineHeight: formHeaderStyle.lineHeight,
    paddingTop: `${formHeaderStyle.paddingTop}px`,
    paddingBottom: `${formHeaderStyle.paddingBottom}px`,
    paddingLeft: `${formHeaderStyle.paddingLeft}px`,
    paddingRight: `${formHeaderStyle.paddingRight}px`,
    textAlign: formHeaderStyle.textAlign,
  };

  const formBuilderChromeCss = `${buildHiringFormInputChromeCss(formInputStyle)}${buildHiringFormLabelChromeCss(formLabelStyle)}${buildHiringFormParagraphChromeCss(formParagraphStyle)}${buildHiringFormSubHeaderChromeCss(formSubHeaderStyle)}${buildHiringFormSubLabelChromeCss(formSubLabelStyle)}`;
  const previewFormChromeCss = formBuilderChromeCss.split('#builder-form').join('#preview-form');

  const formLabelChromeStyle: CSSProperties = {
    color: normalizeCssColorInput(formLabelStyle.color?.trim() || DEFAULT_FORM_LABEL_STYLE.color),
    fontSize: `${formLabelStyle.fontSize}px`,
    fontStyle: formLabelStyle.fontStyle,
    fontWeight: formLabelStyle.fontWeight,
    lineHeight: formLabelStyle.lineHeight,
    paddingTop: `${formLabelStyle.paddingTop}px`,
    paddingBottom: `${formLabelStyle.paddingBottom}px`,
    paddingLeft: `${formLabelStyle.paddingLeft}px`,
    paddingRight: `${formLabelStyle.paddingRight}px`,
    textAlign: formLabelStyle.textAlign,
    display: 'block',
  };

  const formParagraphChromeStyle: CSSProperties = {
    color: normalizeCssColorInput(formParagraphStyle.color?.trim() || DEFAULT_FORM_PARAGRAPH_STYLE.color),
    fontSize: `${formParagraphStyle.fontSize}px`,
    fontStyle: formParagraphStyle.fontStyle,
    fontWeight: formParagraphStyle.fontWeight,
    lineHeight: formParagraphStyle.lineHeight,
    paddingTop: `${formParagraphStyle.paddingTop}px`,
    paddingBottom: `${formParagraphStyle.paddingBottom}px`,
    paddingLeft: `${formParagraphStyle.paddingLeft}px`,
    paddingRight: `${formParagraphStyle.paddingRight}px`,
    textAlign: formParagraphStyle.textAlign,
    display: 'block',
  };

  const formSubHeaderChromeStyle: CSSProperties = {
    color: normalizeCssColorInput(formSubHeaderStyle.color?.trim() || DEFAULT_FORM_SUB_HEADER_STYLE.color),
    fontSize: `${formSubHeaderStyle.fontSize}px`,
    fontStyle: formSubHeaderStyle.fontStyle,
    fontWeight: formSubHeaderStyle.fontWeight,
    lineHeight: formSubHeaderStyle.lineHeight,
    paddingTop: `${formSubHeaderStyle.paddingTop}px`,
    paddingBottom: `${formSubHeaderStyle.paddingBottom}px`,
    paddingLeft: `${formSubHeaderStyle.paddingLeft}px`,
    paddingRight: `${formSubHeaderStyle.paddingRight}px`,
    textAlign: formSubHeaderStyle.textAlign,
    display: 'block',
  };

  const formSubLabelChromeStyle: CSSProperties = {
    color: normalizeCssColorInput(formSubLabelStyle.color?.trim() || DEFAULT_FORM_SUB_LABEL_STYLE.color),
    fontSize: `${formSubLabelStyle.fontSize}px`,
    fontStyle: formSubLabelStyle.fontStyle,
    fontWeight: formSubLabelStyle.fontWeight,
    lineHeight: formSubLabelStyle.lineHeight,
    paddingTop: `${formSubLabelStyle.paddingTop}px`,
    paddingBottom: `${formSubLabelStyle.paddingBottom}px`,
    paddingLeft: `${formSubLabelStyle.paddingLeft}px`,
    paddingRight: `${formSubLabelStyle.paddingRight}px`,
    textAlign: formSubLabelStyle.textAlign,
    display: 'block',
  };

  const formTooltipContentStyle: CSSProperties = {
    backgroundColor: normalizeCssColorInput(
      formTooltipStyle.backgroundColor?.trim() || DEFAULT_FORM_TOOLTIP_STYLE.backgroundColor
    ),
    color: normalizeCssColorInput(formTooltipStyle.color?.trim() || DEFAULT_FORM_TOOLTIP_STYLE.color),
  };

  const formTooltipIconStyle: CSSProperties = {
    color: normalizeCssColorInput(formTooltipStyle.iconColor?.trim() || DEFAULT_FORM_TOOLTIP_STYLE.iconColor),
  };

  return {
    submitButtonInlineStyle,
    formPanelDisplayStyle,
    pageMainStyle,
    formHeaderHeadingStyle,
    previewFormChromeCss,
    formLabelChromeStyle,
    formParagraphChromeStyle,
    formSubHeaderChromeStyle,
    formSubLabelChromeStyle,
    formTooltipContentStyle,
    formTooltipIconStyle,
  };
}

export function HiringFormPreviewView({
  payload,
  publicSubmitSlug,
  /** When the quiz was opened from an emailed link, associates the submission with this prospect. */
  linkedProspectId,
  /** `preview` = builder preview chrome (back link, device toggle). `live` = public apply page, design only. */
  appearance = 'preview',
}: {
  payload: HiringFormPreviewPayload;
  /** When set, Submit validates and POSTs multipart to the public hiring form API. */
  publicSubmitSlug?: string;
  linkedProspectId?: string;
  appearance?: 'preview' | 'live';
}) {
  const isLive = appearance === 'live';
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const styles = useMemo(() => deriveHiringFormPreviewStyles(payload), [payload]);
  const builderHref = `/admin/hiring/forms/builder?name=${encodeURIComponent(payload.formName)}`;

  const layoutMobile = !isLive && viewport === 'mobile';

  return (
    <div className={cn('flex min-h-screen flex-col', isLive && 'min-h-dvh')}>
      {!isLive ? (
        <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 shadow-sm sm:h-14 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 h-9 gap-1.5 px-2 text-sm font-medium text-slate-800 hover:text-slate-900"
            asChild
          >
            <Link href={builderHref}>
              <ArrowLeft className="h-4 w-4 shrink-0" />
              Back To Form Builder
            </Link>
          </Button>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50/90 p-0.5 shadow-inner">
            <Button
              type="button"
              size="sm"
              variant={viewport === 'desktop' ? 'default' : 'ghost'}
              className={cn(
                'h-8 gap-1.5 rounded-md px-3 text-xs sm:text-sm',
                viewport === 'desktop' ? 'shadow-sm' : 'text-slate-600'
              )}
              onClick={() => setViewport('desktop')}
            >
              <Monitor className="h-4 w-4" />
              Desktop
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewport === 'mobile' ? 'default' : 'ghost'}
              className={cn(
                'h-8 gap-1.5 rounded-md px-3 text-xs sm:text-sm',
                viewport === 'mobile' ? 'shadow-sm' : 'text-slate-600'
              )}
              onClick={() => setViewport('mobile')}
            >
              <Smartphone className="h-4 w-4" />
              Mobile
            </Button>
          </div>
        </header>
      ) : null}

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-y-auto',
          isLive && 'min-h-dvh flex-1'
        )}
        style={styles.pageMainStyle}
      >
        <div
          className={cn(
            'flex min-h-full flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8 sm:py-10',
            isLive && 'min-h-dvh py-10 sm:py-14'
          )}
        >
          <div
            className={cn(
              'w-full transition-[max-width] duration-200',
              layoutMobile ? 'max-w-[420px]' : 'max-w-2xl'
            )}
          >
            <div
              style={styles.formPanelDisplayStyle}
              className={cn(
                'shadow-md ring-1 ring-black/[0.04]',
                layoutMobile
                  ? 'rounded-[2rem] border border-white/40'
                  : 'rounded-2xl border border-white/35'
              )}
            >
              <style dangerouslySetInnerHTML={{ __html: styles.previewFormChromeCss }} />
              <form
                id="preview-form"
                className="block min-h-[200px] space-y-1 px-4 py-5 sm:px-6 sm:py-6"
                encType="multipart/form-data"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!publicSubmitSlug) return;
                  const form = e.currentTarget;
                  const data = new FormData(form);
                  const errors = validateHiringFormFields(payload.formFields, data);
                  setFieldErrors(errors);
                  if (Object.keys(errors).length > 0) return;
                  setSubmitStatus('sending');
                  setSubmitMessage(null);
                  void fetch(`/api/public/hiring-forms/${encodeURIComponent(publicSubmitSlug)}/submit`, {
                    method: 'POST',
                    body: data,
                  })
                    .then(async (res) => {
                      if (!res.ok) {
                        const body = (await res.json().catch(() => ({}))) as {
                          fieldErrors?: Record<string, string>;
                          error?: string;
                        };
                        if (body.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
                          setFieldErrors(body.fieldErrors);
                        }
                        throw new Error(body.error || 'Submission failed');
                      }
                      setSubmitStatus('done');
                      setSubmitMessage('Thank you — your application was received.');
                      form.reset();
                      setFieldErrors({});
                    })
                    .catch((err: unknown) => {
                      setSubmitStatus('error');
                      setSubmitMessage(err instanceof Error ? err.message : 'Something went wrong.');
                    });
                }}
              >
                {publicSubmitSlug && linkedProspectId ? (
                  <input type="hidden" name="hiring_prospect_id" value={linkedProspectId} />
                ) : null}
                {payload.formFields.map((field) => (
                  <FormFieldBlock
                    key={field.id}
                    variant="preview"
                    stackForPreview={layoutMobile}
                    field={field}
                    isSelected={false}
                    onSelect={() => {}}
                    onRemove={() => {}}
                    onDragStart={(_e: React.DragEvent) => {}}
                    onDuplicate={() => {}}
                    errorMessage={fieldErrors[field.id]}
                    disableFileInputs={!publicSubmitSlug}
                    headerHeadingStyle={styles.formHeaderHeadingStyle}
                    formLabelChromeStyle={styles.formLabelChromeStyle}
                    formParagraphChromeStyle={styles.formParagraphChromeStyle}
                    formSubHeaderChromeStyle={styles.formSubHeaderChromeStyle}
                    formSubLabelChromeStyle={styles.formSubLabelChromeStyle}
                    formTooltipContentStyle={styles.formTooltipContentStyle}
                    formTooltipIconStyle={styles.formTooltipIconStyle}
                  />
                ))}
                {payload.formFields.length > 0 && (
                  <>
                    <div
                      className={cn(
                        'pt-4',
                        payload.submitButtonStyle.widthMode === 'full'
                          ? 'w-full'
                          : 'flex w-full justify-center'
                      )}
                    >
                      <button
                        type="submit"
                        disabled={!!publicSubmitSlug && submitStatus === 'sending'}
                        style={styles.submitButtonInlineStyle}
                        className={cn(
                          'font-sans transition-opacity hover:opacity-95 active:opacity-90',
                          payload.submitButtonStyle.widthMode === 'default' ? 'inline-block' : 'block',
                          publicSubmitSlug && submitStatus === 'sending' ? 'opacity-60 pointer-events-none' : ''
                        )}
                      >
                        {publicSubmitSlug && submitStatus === 'sending' ? 'Sending…' : 'Submit'}
                      </button>
                    </div>
                    {publicSubmitSlug && submitMessage ? (
                      <p
                        className={cn(
                          'text-center text-sm mt-2',
                          submitStatus === 'done' ? 'text-emerald-700' : 'text-destructive'
                        )}
                      >
                        {submitMessage}
                      </p>
                    ) : null}
                    <div className="flex flex-col items-center border-t border-slate-200/60 pt-6 pb-2">
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element -- static public brand asset */}
                        <img
                          src="/images/orbit.png"
                          alt=""
                          className="h-10 w-10 shrink-0 object-contain sm:h-11 sm:w-11"
                          width={44}
                          height={44}
                        />
                        <div className="min-w-0 text-left leading-none">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px]">
                            Powered by
                          </p>
                          <p className="mt-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
                            Orbyt
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FormBuilderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const serverFormId = searchParams.get('id')?.trim() ?? '';
  const urlKindQuiz = searchParams.get('kind') === 'quiz';
  const [formName, setFormName] = useState(() => searchParams.get('name')?.trim() || 'Untitled form');
  const [formLoadError, setFormLoadError] = useState<string | null>(null);
  /** Loaded from DB (`hiring_forms.form_kind`); null when no `id` or still loading. */
  const [serverFormKind, setServerFormKind] = useState<'prospect' | 'quiz' | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);

  const [builderTab, setBuilderTab] = useState<'builder' | 'settings'>('builder');
  const [elementsSidebarOpen, setElementsSidebarOpen] = useState(true);
  const [customizerSidebarOpen, setCustomizerSidebarOpen] = useState(true);
  const [basicExpanded, setBasicExpanded] = useState(true);
  const [advancedExpanded, setAdvancedExpanded] = useState(true);
  const [styleTab, setStyleTab] = useState<'page' | 'form'>('page');
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#F4F5F9');
  const [backgroundPosition, setBackgroundPosition] =
    useState<ContainerBackgroundPosition>('Center');
  const [backgroundRepeat, setBackgroundRepeat] =
    useState<ContainerBackgroundRepeat>('None');
  const [pageBackgroundImage, setPageBackgroundImage] = useState('');
  /** When true, form card background blends with page color (light tint); when false, Form Style → Container colors apply. */
  const [tintFormWithPage, setTintFormWithPage] = useState(true);
  const [pageCanvasChrome, setPageCanvasChrome] = useState<PageCanvasChrome>(
    () => ({ ...DEFAULT_PAGE_CANVAS_CHROME })
  );
  const [submitButtonStyle, setSubmitButtonStyle] = useState<SubmitButtonStyle>(
    () => ({ ...DEFAULT_SUBMIT_BUTTON_STYLE })
  );
  const [formContainerStyle, setFormContainerStyle] = useState<FormContainerStyle>(
    () => ({ ...DEFAULT_FORM_CONTAINER_STYLE })
  );
  const [formHeaderStyle, setFormHeaderStyle] = useState<FormHeaderStyle>(
    () => ({ ...DEFAULT_FORM_HEADER_STYLE })
  );
  const [formInputStyle, setFormInputStyle] = useState<FormInputStyle>(
    () => ({ ...DEFAULT_FORM_INPUT_STYLE })
  );
  const [formLabelStyle, setFormLabelStyle] = useState<FormLabelStyle>(
    () => ({ ...DEFAULT_FORM_LABEL_STYLE })
  );
  const [formParagraphStyle, setFormParagraphStyle] = useState<FormParagraphStyle>(
    () => ({ ...DEFAULT_FORM_PARAGRAPH_STYLE })
  );
  const [formSubHeaderStyle, setFormSubHeaderStyle] = useState<FormSubHeaderStyle>(
    () => ({ ...DEFAULT_FORM_SUB_HEADER_STYLE })
  );
  const [formSubLabelStyle, setFormSubLabelStyle] = useState<FormSubLabelStyle>(
    () => ({ ...DEFAULT_FORM_SUB_LABEL_STYLE })
  );
  const [formTooltipStyle, setFormTooltipStyle] = useState<FormTooltipStyle>(
    () => ({ ...DEFAULT_FORM_TOOLTIP_STYLE })
  );
  const containerBgFileInputRef = useRef<HTMLInputElement>(null);
  const pageBgFileInputRef = useRef<HTMLInputElement>(null);
  const [formFields, setFormFields] = useState<FormField[]>(getDefaultFormFields);
  const [dragOver, setDragOver] = useState(false);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedNameSubField, setSelectedNameSubField] = useState<NameSubFieldKey | null>(null);
  const selectedField = selectedFieldId
    ? formFields.find((f) => f.id === selectedFieldId) ?? null
    : null;

  const isQuizForm = useMemo(() => {
    if (serverFormId) return serverFormKind === 'quiz';
    return urlKindQuiz;
  }, [serverFormId, serverFormKind, urlKindQuiz]);

  useEffect(() => {
    if (!serverFormId || !currentBusiness?.id) {
      setFormLoadError(null);
      setServerFormKind(null);
      return;
    }
    const ac = new AbortController();
    setFormLoadError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/admin/hiring/forms/${serverFormId}`, {
          credentials: 'include',
          headers: {
            'x-business-id': currentBusiness.id!,
            'Content-Type': 'application/json',
          },
          signal: ac.signal,
        });
        const json = (await res.json()) as { error?: string; form?: Record<string, unknown> };
        if (!res.ok) throw new Error(json.error || 'Failed to load form');
        const row = json.form;
        if (!row || ac.signal.aborted) return;
        const fk = (row as { form_kind?: string }).form_kind;
        setServerFormKind(fk === 'quiz' ? 'quiz' : 'prospect');
        if (typeof row.name === 'string' && row.name.trim()) {
          setFormName(row.name.trim());
        }
        const p = row.definition as HiringFormPreviewPayload | null | undefined;
        if (p && p.v === 1) {
          if (Array.isArray(p.formFields) && p.formFields.length > 0) {
            setFormFields(p.formFields as FormField[]);
          }
          if (typeof p.backgroundColor === 'string') setBackgroundColor(p.backgroundColor);
          if (typeof p.pageBackgroundImage === 'string') setPageBackgroundImage(p.pageBackgroundImage);
          if (p.backgroundPosition) setBackgroundPosition(p.backgroundPosition);
          if (p.backgroundRepeat) setBackgroundRepeat(p.backgroundRepeat);
          if (typeof p.tintFormWithPage === 'boolean') setTintFormWithPage(p.tintFormWithPage);
          if (p.pageCanvasChrome) {
            setPageCanvasChrome({ ...DEFAULT_PAGE_CANVAS_CHROME, ...p.pageCanvasChrome });
          }
          if (p.submitButtonStyle) {
            setSubmitButtonStyle({ ...DEFAULT_SUBMIT_BUTTON_STYLE, ...p.submitButtonStyle });
          }
          if (p.formContainerStyle) {
            setFormContainerStyle({ ...DEFAULT_FORM_CONTAINER_STYLE, ...p.formContainerStyle });
          }
          if (p.formHeaderStyle) {
            setFormHeaderStyle({ ...DEFAULT_FORM_HEADER_STYLE, ...p.formHeaderStyle });
          }
          if (p.formInputStyle) {
            setFormInputStyle({ ...DEFAULT_FORM_INPUT_STYLE, ...p.formInputStyle });
          }
          if (p.formLabelStyle) {
            setFormLabelStyle({ ...DEFAULT_FORM_LABEL_STYLE, ...p.formLabelStyle });
          }
          if (p.formParagraphStyle) {
            setFormParagraphStyle({ ...DEFAULT_FORM_PARAGRAPH_STYLE, ...p.formParagraphStyle });
          }
          if (p.formSubHeaderStyle) {
            setFormSubHeaderStyle({ ...DEFAULT_FORM_SUB_HEADER_STYLE, ...p.formSubHeaderStyle });
          }
          if (p.formSubLabelStyle) {
            setFormSubLabelStyle({ ...DEFAULT_FORM_SUB_LABEL_STYLE, ...p.formSubLabelStyle });
          }
          if (p.formTooltipStyle) {
            setFormTooltipStyle({ ...DEFAULT_FORM_TOOLTIP_STYLE, ...p.formTooltipStyle });
          }
        }
      } catch (e) {
        if (ac.signal.aborted) return;
        setFormLoadError(e instanceof Error ? e.message : 'Failed to load form');
      }
    })();
    return () => ac.abort();
  }, [serverFormId, currentBusiness?.id]);

  const buildPreviewPayload = useCallback((): HiringFormPreviewPayload | null => {
    const businessId = currentBusiness?.id?.trim();
    if (!businessId) return null;
    return {
      v: 1,
      businessId,
      formName,
      formFields,
      backgroundColor,
      pageBackgroundImage,
      backgroundPosition,
      backgroundRepeat,
      pageCanvasChrome,
      tintFormWithPage,
      submitButtonStyle,
      formContainerStyle,
      formHeaderStyle,
      formInputStyle,
      formLabelStyle,
      formParagraphStyle,
      formSubHeaderStyle,
      formSubLabelStyle,
      formTooltipStyle,
    };
  }, [
    currentBusiness?.id,
    formName,
    formFields,
    backgroundColor,
    pageBackgroundImage,
    backgroundPosition,
    backgroundRepeat,
    pageCanvasChrome,
    tintFormWithPage,
    submitButtonStyle,
    formContainerStyle,
    formHeaderStyle,
    formInputStyle,
    formLabelStyle,
    formParagraphStyle,
    formSubHeaderStyle,
    formSubLabelStyle,
    formTooltipStyle,
  ]);

  const persistForm = useCallback(
    async (alsoPublish: boolean) => {
      const bid = currentBusiness?.id?.trim();
      if (!bid) {
        window.alert('Select a business workspace before saving.');
        return;
      }
      const payload = buildPreviewPayload();
      if (!payload) return;
      const wasNew = !serverFormId;
      setSaveBusy(true);
      try {
        const definition = { ...payload, formName };
        let activeId = serverFormId;
        if (!activeId) {
          const res = await fetch('/api/admin/hiring/forms', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'x-business-id': bid },
            body: JSON.stringify({
              name: formName,
              definition,
              formKind: isQuizForm ? 'quiz' : 'prospect',
            }),
          });
          const json = (await res.json()) as { error?: string; form?: { id: string; published_slug?: string | null } };
          if (!res.ok) throw new Error(json.error || 'Save failed');
          activeId = json.form?.id ?? '';
          if (!activeId) throw new Error('Save failed');
        } else {
          const res = await fetch(`/api/admin/hiring/forms/${activeId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'x-business-id': bid },
            body: JSON.stringify({
              name: formName,
              definition,
              ...(alsoPublish ? { isPublished: true } : {}),
            }),
          });
          const json = (await res.json()) as { error?: string; form?: { published_slug?: string | null } };
          if (!res.ok) throw new Error(json.error || 'Save failed');
          if (alsoPublish) {
            const slug = json.form?.published_slug;
            if (slug) {
              window.alert(
                `Form published.\nApplicants can use:\n${window.location.origin}/apply/hiring/${slug}`
              );
            }
          }
        }
        if (alsoPublish && activeId && wasNew) {
          const res2 = await fetch(`/api/admin/hiring/forms/${activeId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'x-business-id': bid },
            body: JSON.stringify({ isPublished: true }),
          });
          const j2 = (await res2.json()) as { error?: string; form?: { published_slug?: string | null } };
          if (!res2.ok) throw new Error(j2.error || 'Publish failed');
          const slug = j2.form?.published_slug;
          if (slug) {
            window.alert(
              `Form published.\nApplicants can use:\n${window.location.origin}/apply/hiring/${slug}`
            );
          }
        }
        router.push(isQuizForm ? '/admin/hiring?tab=quizzes' : '/admin/hiring?tab=settings-forms');
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setSaveBusy(false);
      }
    },
    [buildPreviewPayload, currentBusiness?.id, formName, router, serverFormId, isQuizForm]
  );

  const submitButtonInlineStyle = useMemo((): CSSProperties => {
    const s = submitButtonStyle;
    return {
      backgroundColor: s.backgroundColor,
      color: s.color,
      borderColor: s.borderColor,
      borderStyle: s.borderStyle,
      borderWidth: `${s.borderWidth}px`,
      borderRadius: `${s.borderRadius}px`,
      fontSize: `${s.fontSize}px`,
      fontStyle: s.fontStyle,
      fontWeight: s.fontWeight,
      paddingTop: `${s.paddingTop}px`,
      paddingBottom: `${s.paddingBottom}px`,
      paddingLeft: `${s.paddingLeft}px`,
      paddingRight: `${s.paddingRight}px`,
      width:
        s.widthMode === 'full'
          ? '100%'
          : s.widthMode === 'medium'
            ? SUBMIT_BUTTON_MEDIUM_WIDTH
            : 'auto',
      boxSizing: 'border-box',
      cursor: 'pointer',
    };
  }, [submitButtonStyle]);

  const formContainerInlineStyle = useMemo((): CSSProperties => {
    const s = formContainerStyle;
    return {
      backgroundColor: s.backgroundColor,
      backgroundImage: s.backgroundImage ? `url(${s.backgroundImage})` : 'none',
      backgroundRepeat: containerBackgroundRepeatToCss(s.backgroundRepeat),
      backgroundPosition: containerBackgroundPositionToCss(s.backgroundPosition),
      backgroundSize: s.backgroundSize,
      borderColor: s.borderColor,
      borderStyle: s.borderStyle,
      borderWidth: `${s.borderWidth}px`,
      borderRadius: `${s.borderRadius}px`,
      paddingTop: `${s.paddingTop}px`,
      paddingBottom: `${s.paddingBottom}px`,
      paddingLeft: `${s.paddingLeft}px`,
      paddingRight: `${s.paddingRight}px`,
      boxSizing: 'border-box',
    };
  }, [formContainerStyle]);

  /** Form card: optional light blend of page background (see Page Style toggle). */
  const formPanelDisplayStyle = useMemo((): CSSProperties => {
    const base = formContainerInlineStyle;
    const hasContainerImage = !!formContainerStyle.backgroundImage?.trim();
    if (!tintFormWithPage || hasContainerImage) {
      return base;
    }
    const page = normalizeCssColorInput(backgroundColor);
    // Light wash of the page hue + slight transparency so the canvas shows through (glass-like).
    return {
      ...base,
      backgroundColor: `color-mix(in srgb, ${page} 28%, rgb(255 255 255 / 0.58))`,
      backgroundImage: 'none',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundSize: 'auto',
      backdropFilter: 'blur(10px) saturate(145%)',
      WebkitBackdropFilter: 'blur(10px) saturate(145%)',
    };
  }, [
    formContainerInlineStyle,
    formContainerStyle.backgroundImage,
    tintFormWithPage,
    backgroundColor,
  ]);

  /** Builder canvas + preview backdrop: page tab controls (color, image, position, repeat). */
  const pageCanvasStyle = useMemo((): CSSProperties => {
    const hasImg = !!pageBackgroundImage.trim();
    return {
      backgroundColor: normalizeCssColorInput(backgroundColor),
      ...(hasImg
        ? {
            backgroundImage: `url(${pageBackgroundImage})`,
            backgroundRepeat: containerBackgroundRepeatToCss(backgroundRepeat),
            backgroundPosition: containerBackgroundPositionToCss(backgroundPosition),
            backgroundSize: 'cover',
            backgroundAttachment: 'local',
          }
        : {}),
    };
  }, [backgroundColor, pageBackgroundImage, backgroundPosition, backgroundRepeat]);

  /** Page backdrop: background + canvas border/padding (not the form card). */
  const pageMainStyle = useMemo((): CSSProperties => {
    const c = pageCanvasChrome;
    return {
      ...pageCanvasStyle,
      borderStyle: c.borderStyle,
      borderWidth: `${c.borderWidth}px`,
      borderColor:
        c.borderWidth > 0 ? normalizeCssColorInput(c.borderColor) : 'transparent',
      paddingTop: `${c.paddingTop}px`,
      paddingBottom: `${c.paddingBottom}px`,
      paddingLeft: `${c.paddingLeft}px`,
      paddingRight: `${c.paddingRight}px`,
      boxSizing: 'border-box',
    };
  }, [pageCanvasStyle, pageCanvasChrome]);

  const formHeaderHeadingStyle = useMemo((): CSSProperties => {
    const s = formHeaderStyle;
    return {
      color: s.color,
      fontSize: `${s.fontSize}px`,
      fontStyle: s.fontStyle,
      fontWeight: s.fontWeight,
      lineHeight: s.lineHeight,
      paddingTop: `${s.paddingTop}px`,
      paddingBottom: `${s.paddingBottom}px`,
      paddingLeft: `${s.paddingLeft}px`,
      paddingRight: `${s.paddingRight}px`,
      textAlign: s.textAlign,
    };
  }, [formHeaderStyle]);

  const formBuilderChromeCss = useMemo(
    () =>
      `${buildHiringFormInputChromeCss(formInputStyle)}${buildHiringFormLabelChromeCss(formLabelStyle)}${buildHiringFormParagraphChromeCss(formParagraphStyle)}${buildHiringFormSubHeaderChromeCss(formSubHeaderStyle)}${buildHiringFormSubLabelChromeCss(formSubLabelStyle)}`,
    [formInputStyle, formLabelStyle, formParagraphStyle, formSubHeaderStyle, formSubLabelStyle]
  );

  const formLabelChromeStyle = useMemo((): CSSProperties => {
    const s = formLabelStyle;
    const fg = normalizeCssColorInput(s.color?.trim() || DEFAULT_FORM_LABEL_STYLE.color);
    return {
      color: fg,
      fontSize: `${s.fontSize}px`,
      fontStyle: s.fontStyle,
      fontWeight: s.fontWeight,
      lineHeight: s.lineHeight,
      paddingTop: `${s.paddingTop}px`,
      paddingBottom: `${s.paddingBottom}px`,
      paddingLeft: `${s.paddingLeft}px`,
      paddingRight: `${s.paddingRight}px`,
      textAlign: s.textAlign,
      display: 'block',
    };
  }, [formLabelStyle]);

  const formParagraphChromeStyle = useMemo((): CSSProperties => {
    const s = formParagraphStyle;
    const fg = normalizeCssColorInput(s.color?.trim() || DEFAULT_FORM_PARAGRAPH_STYLE.color);
    return {
      color: fg,
      fontSize: `${s.fontSize}px`,
      fontStyle: s.fontStyle,
      fontWeight: s.fontWeight,
      lineHeight: s.lineHeight,
      paddingTop: `${s.paddingTop}px`,
      paddingBottom: `${s.paddingBottom}px`,
      paddingLeft: `${s.paddingLeft}px`,
      paddingRight: `${s.paddingRight}px`,
      textAlign: s.textAlign,
      display: 'block',
    };
  }, [formParagraphStyle]);

  const formSubHeaderChromeStyle = useMemo((): CSSProperties => {
    const s = formSubHeaderStyle;
    const fg = normalizeCssColorInput(s.color?.trim() || DEFAULT_FORM_SUB_HEADER_STYLE.color);
    return {
      color: fg,
      fontSize: `${s.fontSize}px`,
      fontStyle: s.fontStyle,
      fontWeight: s.fontWeight,
      lineHeight: s.lineHeight,
      paddingTop: `${s.paddingTop}px`,
      paddingBottom: `${s.paddingBottom}px`,
      paddingLeft: `${s.paddingLeft}px`,
      paddingRight: `${s.paddingRight}px`,
      textAlign: s.textAlign,
      display: 'block',
    };
  }, [formSubHeaderStyle]);

  const formSubLabelChromeStyle = useMemo((): CSSProperties => {
    const s = formSubLabelStyle;
    const fg = normalizeCssColorInput(s.color?.trim() || DEFAULT_FORM_SUB_LABEL_STYLE.color);
    return {
      color: fg,
      fontSize: `${s.fontSize}px`,
      fontStyle: s.fontStyle,
      fontWeight: s.fontWeight,
      lineHeight: s.lineHeight,
      paddingTop: `${s.paddingTop}px`,
      paddingBottom: `${s.paddingBottom}px`,
      paddingLeft: `${s.paddingLeft}px`,
      paddingRight: `${s.paddingRight}px`,
      textAlign: s.textAlign,
      display: 'block',
    };
  }, [formSubLabelStyle]);

  const formTooltipContentStyle = useMemo((): CSSProperties => {
    const s = formTooltipStyle;
    return {
      backgroundColor: normalizeCssColorInput(
        s.backgroundColor?.trim() || DEFAULT_FORM_TOOLTIP_STYLE.backgroundColor
      ),
      color: normalizeCssColorInput(s.color?.trim() || DEFAULT_FORM_TOOLTIP_STYLE.color),
    };
  }, [formTooltipStyle]);

  const formTooltipIconStyle = useMemo((): CSSProperties => {
    const s = formTooltipStyle;
    return {
      color: normalizeCssColorInput(s.iconColor?.trim() || DEFAULT_FORM_TOOLTIP_STYLE.iconColor),
    };
  }, [formTooltipStyle]);

  const onContainerBackgroundFile = useCallback(
    (file: File | undefined) => {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result;
        if (typeof res === 'string') {
          setFormContainerStyle((p) => ({ ...p, backgroundImage: res }));
        }
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const onPageBackgroundFile = useCallback((file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result;
      if (typeof res === 'string') {
        setPageBackgroundImage(res);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const openStandalonePreview = useCallback(() => {
    const payload = buildPreviewPayload();
    if (!payload) {
      window.alert('Select a business workspace before opening preview.');
      return;
    }
    const sessionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    const businessId = payload.businessId;
    const storageKey = hiringFormPreviewStorageKey(businessId, sessionId);
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      window.alert('Could not save preview data (storage full or blocked). Try again or free browser space.');
      return;
    }
    const previewUrl = `/admin/hiring/forms/builder/preview?sid=${encodeURIComponent(sessionId)}&bid=${encodeURIComponent(businessId)}`;
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  }, [buildPreviewPayload]);

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
      const data = new FormData(e.currentTarget);
      setFieldErrors(validateHiringFormFields(formFields, data));
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
          {formLoadError ? (
            <span className="text-xs text-destructive max-w-[220px] truncate" title={formLoadError}>
              {formLoadError}
            </span>
          ) : null}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={openStandalonePreview}
          >
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={saveBusy}
            onClick={() => void persistForm(false)}
          >
            <Save className="h-4 w-4" /> {saveBusy ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={saveBusy}
            onClick={() => void persistForm(true)}
          >
            <Upload className="h-4 w-4" /> {saveBusy ? 'Working…' : 'Save & Publish'}
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
        <main className="flex-1 overflow-auto" style={pageMainStyle}>
          <div className="mx-auto w-full max-w-2xl px-3 sm:px-4">
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
            {builderTab === 'builder' ? (
              <div style={formPanelDisplayStyle} className="shadow-sm">
                <style dangerouslySetInnerHTML={{ __html: formBuilderChromeCss }} />
                <form
                  id="builder-form"
                  onSubmit={handleFormSubmit}
                  className={cn(
                    'min-h-[280px] transition-colors space-y-1 block',
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
                        headerHeadingStyle={formHeaderHeadingStyle}
                        formLabelChromeStyle={formLabelChromeStyle}
                        formParagraphChromeStyle={formParagraphChromeStyle}
                        formSubHeaderChromeStyle={formSubHeaderChromeStyle}
                        formSubLabelChromeStyle={formSubLabelChromeStyle}
                        formTooltipContentStyle={formTooltipContentStyle}
                        formTooltipIconStyle={formTooltipIconStyle}
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
                    <div
                      className={cn(
                        'pt-4',
                        submitButtonStyle.widthMode === 'full'
                          ? 'w-full'
                          : 'flex w-full justify-center'
                      )}
                    >
                      <button
                        type="submit"
                        style={submitButtonInlineStyle}
                        className={cn(
                          'font-sans transition-opacity hover:opacity-95 active:opacity-90',
                          submitButtonStyle.widthMode === 'default'
                            ? 'inline-block'
                            : 'block'
                        )}
                      >
                        Submit
                      </button>
                    </div>
                  )}
                </form>
              </div>
            ) : (
              <Card className="p-6 bg-background shadow-sm">
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Form settings will appear here.
                </div>
              </Card>
            )}
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
                                            const removed = (config.options ?? [])[idx];
                                            const next = (config.options ?? []).filter(
                                              (_, i) => i !== idx
                                            );
                                            updateField(selectedField.id, {
                                              dropdownConfig: {
                                                options: next,
                                                ...(removed?.id &&
                                                config.gradedCorrectOptionId === removed.id
                                                  ? { gradedCorrectOptionId: undefined }
                                                  : {}),
                                              },
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
                                {isQuizForm && (
                                  <div className="space-y-2 pt-2 border-t">
                                    <Label className="text-sm font-medium text-slate-700">Graded</Label>
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={config.graded ?? false}
                                        onCheckedChange={(checked) =>
                                          updateField(selectedField.id, {
                                            dropdownConfig: checked
                                              ? { graded: true }
                                              : {
                                                  graded: false,
                                                  gradedCorrectOptionId: undefined,
                                                },
                                          })
                                        }
                                      />
                                      <span className="text-sm text-muted-foreground">
                                        {config.graded ? 'Enabled' : 'Disabled'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Pick the correct option; quiz submissions are scored automatically.
                                    </p>
                                    {config.graded && (
                                      <div className="space-y-1.5 pt-2">
                                        <Label className="text-sm font-medium text-slate-700">
                                          Graded value
                                        </Label>
                                        <Select
                                          value={config.gradedCorrectOptionId ?? ''}
                                          onValueChange={(value) =>
                                            updateField(selectedField.id, {
                                              dropdownConfig: {
                                                gradedCorrectOptionId: value || undefined,
                                              },
                                            })
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select correct answer" />
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
                                    )}
                                  </div>
                                )}
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
                                        const removed = (config.options ?? [])[idx];
                                        const next = (config.options ?? []).filter((_, i) => i !== idx);
                                        updateField(selectedField.id, {
                                          radioConfig: {
                                            options: next,
                                            ...(removed?.id &&
                                            config.gradedCorrectOptionId === removed.id
                                              ? { gradedCorrectOptionId: undefined }
                                              : {}),
                                          },
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
                            {isQuizForm && (
                              <div className="space-y-2 pt-2 border-t">
                                <Label className="text-sm font-medium text-slate-700">Graded</Label>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={config.graded ?? false}
                                    onCheckedChange={(checked) =>
                                      updateField(selectedField.id, {
                                        radioConfig: checked
                                          ? { graded: true }
                                          : { graded: false, gradedCorrectOptionId: undefined },
                                      })
                                    }
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {config.graded ? 'Enabled' : 'Disabled'}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  When enabled, pick the correct option. Submissions are scored automatically
                                  against the applicant&apos;s answer.
                                </p>
                                {config.graded && (
                                  <div className="space-y-1.5 pt-2">
                                    <Label className="text-sm font-medium text-slate-700">Graded value</Label>
                                    <Select
                                      value={config.gradedCorrectOptionId ?? ''}
                                      onValueChange={(value) =>
                                        updateField(selectedField.id, {
                                          radioConfig: { gradedCorrectOptionId: value || undefined },
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select correct answer" />
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
                                )}
                              </div>
                            )}
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
                                            const removed = (config.options ?? [])[idx];
                                            const next = (config.options ?? []).filter((_, i) => i !== idx);
                                            const gradedIds = config.gradedCorrectOptionIds ?? [];
                                            const nextGraded = removed?.id
                                              ? gradedIds.filter((id) => id !== removed.id)
                                              : gradedIds;
                                            updateField(selectedField.id, {
                                              multipleConfig: {
                                                options: next,
                                                gradedCorrectOptionIds: nextGraded,
                                              },
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
                                {isQuizForm && (
                                  <div className="space-y-2 pt-2 border-t">
                                    <Label className="text-sm font-medium text-slate-700">Graded</Label>
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={config.graded ?? false}
                                        onCheckedChange={(checked) =>
                                          updateField(selectedField.id, {
                                            multipleConfig: checked
                                              ? { graded: true, gradedCorrectOptionIds: [] }
                                              : { graded: false, gradedCorrectOptionIds: [] },
                                          })
                                        }
                                      />
                                      <span className="text-sm text-muted-foreground">
                                        {config.graded ? 'Enabled' : 'Disabled'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Mark which options count as correct. The applicant must select exactly
                                      that set (same choices, any order).
                                    </p>
                                    {config.graded && (
                                      <div className="space-y-1.5 pt-2">
                                        <Label className="text-sm font-medium text-slate-700">
                                          Correct answers
                                        </Label>
                                        <div className="space-y-1.5">
                                          {(config.options ?? []).map((opt) => {
                                            const list = config.gradedCorrectOptionIds ?? [];
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
                                                    const current = config.gradedCorrectOptionIds ?? [];
                                                    const next = e.target.checked
                                                      ? [...current, opt.id]
                                                      : current.filter((id) => id !== opt.id);
                                                    updateField(selectedField.id, {
                                                      multipleConfig: { gradedCorrectOptionIds: next },
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
                                )}
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
                            onClick={() => {
                              setSelectedSchemeId(scheme.id);
                              setBackgroundColor(scheme.canvasHex);
                            }}
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
                          onChange={(e) => {
                            setSelectedSchemeId(null);
                            setBackgroundColor(e.target.value);
                          }}
                          className="font-mono text-sm flex-1"
                        />
                        <div
                          className="h-10 w-10 rounded-md border border-input shrink-0"
                          style={{ backgroundColor }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2.5">
                      <div className="min-w-0 space-y-0.5 pr-2">
                        <Label
                          htmlFor="tint-form-with-page"
                          className="text-sm font-medium text-slate-800"
                        >
                          Tint form with page color
                        </Label>
                        <p className="text-xs text-muted-foreground leading-snug">
                          Form card uses a light blend of the page background (turn off to use Form
                          Style → Container).
                        </p>
                      </div>
                      <Switch
                        id="tint-form-with-page"
                        checked={tintFormWithPage}
                        onCheckedChange={setTintFormWithPage}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">Background image</Label>
                      <input
                        ref={pageBgFileInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          onPageBackgroundFile(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                      <div
                        role="button"
                        tabIndex={0}
                        className="relative flex min-h-[96px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 outline-none hover:border-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        onClick={() => pageBgFileInputRef.current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            pageBgFileInputRef.current?.click();
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onPageBackgroundFile(e.dataTransfer.files[0]);
                        }}
                      >
                        {pageBackgroundImage ? (
                          <div className="w-full space-y-2 p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={pageBackgroundImage}
                              alt=""
                              className="mx-auto max-h-28 rounded object-contain"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-8 w-full text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPageBackgroundImage('');
                              }}
                            >
                              Remove image
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <ImagePlus className="h-8 w-8 mx-auto mb-1 opacity-60" />
                            <span className="text-xs">Upload or drop image</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">Background position</Label>
                      <Select
                        value={backgroundPosition}
                        onValueChange={(v) =>
                          setBackgroundPosition(v as ContainerBackgroundPosition)
                        }
                      >
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
                      <Select
                        value={backgroundRepeat}
                        onValueChange={(v) =>
                          setBackgroundRepeat(v as ContainerBackgroundRepeat)
                        }
                      >
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
                    <div className="space-y-2 border-t border-slate-200/80 pt-4">
                      <p className="text-sm font-medium text-slate-700">Page canvas</p>
                      <p className="text-xs text-muted-foreground -mt-1">
                        Border and padding for the page background area around the form (not the form
                        card — use Form Style → Container for that).
                      </p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-slate-700">Border style</Label>
                          <Select
                            value={pageCanvasChrome.borderStyle}
                            onValueChange={(v) =>
                              setPageCanvasChrome((p) => ({
                                ...p,
                                borderStyle: v as PageCanvasChrome['borderStyle'],
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="solid">Solid</SelectItem>
                              <SelectItem value="dashed">Dashed</SelectItem>
                              <SelectItem value="dotted">Dotted</SelectItem>
                              <SelectItem value="double">Double</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-slate-700">Border width</Label>
                          <Input
                            type="number"
                            min={0}
                            className="font-mono text-sm"
                            value={pageCanvasChrome.borderWidth}
                            onChange={(e) =>
                              setPageCanvasChrome((p) => ({
                                ...p,
                                borderWidth: parseStyleNumber(e.target.value, p.borderWidth),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-slate-700">Padding bottom</Label>
                          <Input
                            type="number"
                            min={0}
                            className="font-mono text-sm"
                            value={pageCanvasChrome.paddingBottom}
                            onChange={(e) =>
                              setPageCanvasChrome((p) => ({
                                ...p,
                                paddingBottom: parseStyleNumber(e.target.value, p.paddingBottom),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-slate-700">Padding left</Label>
                          <Input
                            type="number"
                            min={0}
                            className="font-mono text-sm"
                            value={pageCanvasChrome.paddingLeft}
                            onChange={(e) =>
                              setPageCanvasChrome((p) => ({
                                ...p,
                                paddingLeft: parseStyleNumber(e.target.value, p.paddingLeft),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-slate-700">Padding right</Label>
                          <Input
                            type="number"
                            min={0}
                            className="font-mono text-sm"
                            value={pageCanvasChrome.paddingRight}
                            onChange={(e) =>
                              setPageCanvasChrome((p) => ({
                                ...p,
                                paddingRight: parseStyleNumber(e.target.value, p.paddingRight),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-slate-700">Padding top</Label>
                          <Input
                            type="number"
                            min={0}
                            className="font-mono text-sm"
                            value={pageCanvasChrome.paddingTop}
                            onChange={(e) =>
                              setPageCanvasChrome((p) => ({
                                ...p,
                                paddingTop: parseStyleNumber(e.target.value, p.paddingTop),
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {styleTab === 'form' && (
                  <div className="mt-4 space-y-2">
                    {FORM_STYLE_SECTIONS.map((section) => (
                      <Collapsible key={section} defaultOpen={section === 'Button'}>
                        <CollapsibleTrigger
                          type="button"
                          className={cn(
                            'group flex w-full items-center justify-between rounded-lg bg-slate-100 px-3 py-2.5 text-left',
                            'text-sm font-medium text-slate-800 outline-none transition-colors',
                            'hover:bg-slate-200/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                          )}
                        >
                          <span>{section}</span>
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-600 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          {section === 'Button' ? (
                            <div className="mt-2 rounded-md border border-sky-100 bg-sky-50/80 p-3">
                              <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 text-xs">
                                <Label className="font-medium text-slate-800 self-center leading-tight">
                                  Background color
                                </Label>
                                <div className="flex min-w-0 gap-1.5">
                                  <Input
                                    type="color"
                                    aria-label="Background color swatch"
                                    className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                    value={toColorInputValue(
                                      submitButtonStyle.backgroundColor,
                                      DEFAULT_SUBMIT_BUTTON_STYLE.backgroundColor
                                    )}
                                    onChange={(e) =>
                                      setSubmitButtonStyle((p) => ({
                                        ...p,
                                        backgroundColor: e.target.value,
                                      }))
                                    }
                                  />
                                  <Input
                                    type="text"
                                    className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                    value={submitButtonStyle.backgroundColor}
                                    onChange={(e) =>
                                      setSubmitButtonStyle((p) => ({
                                        ...p,
                                        backgroundColor: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <Label className="font-medium text-slate-800 self-center leading-tight">
                                  Border color
                                </Label>
                                <div className="flex min-w-0 gap-1.5">
                                  <Input
                                    type="color"
                                    aria-label="Border color swatch"
                                    className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                    value={toColorInputValue(
                                      submitButtonStyle.borderColor,
                                      DEFAULT_SUBMIT_BUTTON_STYLE.borderColor
                                    )}
                                    onChange={(e) =>
                                      setSubmitButtonStyle((p) => ({
                                        ...p,
                                        borderColor: e.target.value,
                                      }))
                                    }
                                  />
                                  <Input
                                    type="text"
                                    className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                    value={submitButtonStyle.borderColor}
                                    onChange={(e) =>
                                      setSubmitButtonStyle((p) => ({
                                        ...p,
                                        borderColor: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <Label className="font-medium text-slate-800 self-center leading-tight">
                                  Color
                                </Label>
                                <div className="flex min-w-0 gap-1.5">
                                  <Input
                                    type="color"
                                    aria-label="Text color swatch"
                                    className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                    value={toColorInputValue(
                                      submitButtonStyle.color,
                                      DEFAULT_SUBMIT_BUTTON_STYLE.color
                                    )}
                                    onChange={(e) =>
                                      setSubmitButtonStyle((p) => ({
                                        ...p,
                                        color: e.target.value,
                                      }))
                                    }
                                  />
                                  <Input
                                    type="text"
                                    className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                    value={submitButtonStyle.color}
                                    onChange={(e) =>
                                      setSubmitButtonStyle((p) => ({
                                        ...p,
                                        color: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <Label className="font-medium text-slate-800 self-center leading-tight">
                                  Border radius
                                </Label>
                                <Input
                                  type="number"
                                  className="h-9 font-mono text-[11px]"
                                  value={submitButtonStyle.borderRadius}
                                  onChange={(e) =>
                                    setSubmitButtonStyle((p) => ({
                                      ...p,
                                      borderRadius: parseStyleNumber(
                                        e.target.value,
                                        p.borderRadius
                                      ),
                                    }))
                                  }
                                />
                                <Label className="font-medium text-slate-800 self-center leading-tight">
                                  Border style
                                </Label>
                                <Select
                                  value={submitButtonStyle.borderStyle}
                                  onValueChange={(v) =>
                                    setSubmitButtonStyle((p) => ({
                                      ...p,
                                      borderStyle: v as SubmitButtonStyle['borderStyle'],
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="solid">Solid</SelectItem>
                                    <SelectItem value="dashed">Dashed</SelectItem>
                                    <SelectItem value="dotted">Dotted</SelectItem>
                                    <SelectItem value="double">Double</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Label className="font-medium text-slate-800 self-center leading-tight">
                                  Border width
                                </Label>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-9 font-mono text-[11px]"
                                  value={submitButtonStyle.borderWidth}
                                  onChange={(e) =>
                                    setSubmitButtonStyle((p) => ({
                                      ...p,
                                      borderWidth: parseStyleNumber(e.target.value, p.borderWidth),
                                    }))
                                  }
                                />
                                <Label className="font-medium text-slate-800 self-center leading-tight">
                                  Font size
                                </Label>
                                <Input
                                  type="number"
                                  min={1}
                                  className="h-9 font-mono text-[11px]"
                                  value={submitButtonStyle.fontSize}
                                  onChange={(e) =>
                                    setSubmitButtonStyle((p) => ({
                                      ...p,
                                      fontSize: parseStyleNumber(e.target.value, p.fontSize),
                                    }))
                                  }
                                />
                                <Label className="font-medium text-slate-800 self-center leading-tight">
                                  Font style
                                </Label>
                                <Select
                                  value={submitButtonStyle.fontStyle}
                                  onValueChange={(v) =>
                                    setSubmitButtonStyle((p) => ({
                                      ...p,
                                      fontStyle: v as SubmitButtonStyle['fontStyle'],
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="italic">Italic</SelectItem>
                                    <SelectItem value="oblique">Oblique</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Label className="font-medium text-slate-800 self-center leading-tight">
                                  Font weight
                                </Label>
                                <Select
                                  value={submitButtonStyle.fontWeight}
                                  onValueChange={(v) =>
                                    setSubmitButtonStyle((p) => ({ ...p, fontWeight: v }))
                                  }
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="400">Normal</SelectItem>
                                    <SelectItem value="500">Medium</SelectItem>
                                    <SelectItem value="600">Semibold</SelectItem>
                                    <SelectItem value="700">Bold</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Label className="font-medium text-slate-800 self-center leading-tight">
                                  Padding top
                                </Label>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-9 font-mono text-[11px]"
                                  value={submitButtonStyle.paddingTop}
                                  onChange={(e) =>
                                    setSubmitButtonStyle((p) => ({
                                      ...p,
                                      paddingTop: parseStyleNumber(e.target.value, p.paddingTop),
                                    }))
                                  }
                                />
                                <Label className="font-medium text-slate-800 self-center leading-tight">
                                  Padding bottom
                                </Label>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-9 font-mono text-[11px]"
                                  value={submitButtonStyle.paddingBottom}
                                  onChange={(e) =>
                                    setSubmitButtonStyle((p) => ({
                                      ...p,
                                      paddingBottom: parseStyleNumber(
                                        e.target.value,
                                        p.paddingBottom
                                      ),
                                    }))
                                  }
                                />
                                <Label className="font-medium text-slate-800 self-center leading-tight">
                                  Padding left
                                </Label>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-9 font-mono text-[11px]"
                                  value={submitButtonStyle.paddingLeft}
                                  onChange={(e) =>
                                    setSubmitButtonStyle((p) => ({
                                      ...p,
                                      paddingLeft: parseStyleNumber(e.target.value, p.paddingLeft),
                                    }))
                                  }
                                />
                                <Label className="font-medium text-slate-800 self-center leading-tight">
                                  Padding right
                                </Label>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-9 font-mono text-[11px]"
                                  value={submitButtonStyle.paddingRight}
                                  onChange={(e) =>
                                    setSubmitButtonStyle((p) => ({
                                      ...p,
                                      paddingRight: parseStyleNumber(
                                        e.target.value,
                                        p.paddingRight
                                      ),
                                    }))
                                  }
                                />
                                <Label className="font-medium text-slate-800 self-center leading-tight">
                                  Width
                                </Label>
                                <Select
                                  value={submitButtonStyle.widthMode}
                                  onValueChange={(v) =>
                                    setSubmitButtonStyle((p) => ({
                                      ...p,
                                      widthMode: v as SubmitButtonStyle['widthMode'],
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="default">Default</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="full">Full</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : section === 'Container' ? (
                            <div className="mt-2 rounded-md border border-sky-100 bg-sky-50/80 p-3 text-xs">
                              <input
                                ref={containerBgFileInputRef}
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(e) => {
                                  onContainerBackgroundFile(e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                              />
                              <div className="space-y-3">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Background color
                                  </Label>
                                  <div className="flex min-w-0 gap-1.5">
                                    <Input
                                      type="color"
                                      aria-label="Container background color swatch"
                                      className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                      value={toColorInputValue(
                                        formContainerStyle.backgroundColor,
                                        DEFAULT_FORM_CONTAINER_STYLE.backgroundColor
                                      )}
                                      onChange={(e) =>
                                        setFormContainerStyle((p) => ({
                                          ...p,
                                          backgroundColor: e.target.value,
                                        }))
                                      }
                                    />
                                    <Input
                                      type="text"
                                      className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                      value={formContainerStyle.backgroundColor}
                                      onChange={(e) =>
                                        setFormContainerStyle((p) => ({
                                          ...p,
                                          backgroundColor: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Background image
                                  </Label>
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    className="relative flex min-h-[88px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-background/90 outline-none hover:border-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                    onClick={() => containerBgFileInputRef.current?.click()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        containerBgFileInputRef.current?.click();
                                      }
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onContainerBackgroundFile(e.dataTransfer.files[0]);
                                    }}
                                  >
                                    {formContainerStyle.backgroundImage ? (
                                      <div className="w-full space-y-2 p-2">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={formContainerStyle.backgroundImage}
                                          alt=""
                                          className="mx-auto max-h-24 rounded object-contain"
                                        />
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          className="h-8 w-full text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setFormContainerStyle((p) => ({
                                              ...p,
                                              backgroundImage: '',
                                            }));
                                          }}
                                        >
                                          Remove image
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="py-4 text-center text-muted-foreground">
                                        <ImagePlus className="mx-auto mb-1 h-8 w-8 opacity-60" />
                                        <span className="text-[11px]">Upload image</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
                                  <div className="space-y-1">
                                    <Label className="text-xs font-medium text-slate-800">
                                      Background position
                                    </Label>
                                    <Select
                                      value={formContainerStyle.backgroundPosition}
                                      onValueChange={(v) =>
                                        setFormContainerStyle((p) => ({
                                          ...p,
                                          backgroundPosition: v as ContainerBackgroundPosition,
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-9 text-xs">
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
                                  <div className="space-y-1">
                                    <Label className="text-xs font-medium text-slate-800">
                                      Background repeat
                                    </Label>
                                    <Select
                                      value={formContainerStyle.backgroundRepeat}
                                      onValueChange={(v) =>
                                        setFormContainerStyle((p) => ({
                                          ...p,
                                          backgroundRepeat: v as ContainerBackgroundRepeat,
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-9 text-xs">
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
                                  <div className="space-y-1">
                                    <Label className="text-xs font-medium text-slate-800">
                                      Background size
                                    </Label>
                                    <Select
                                      value={formContainerStyle.backgroundSize}
                                      onValueChange={(v) =>
                                        setFormContainerStyle((p) => ({
                                          ...p,
                                          backgroundSize: v as ContainerBackgroundSize,
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="cover">Cover</SelectItem>
                                        <SelectItem value="contain">Contain</SelectItem>
                                        <SelectItem value="auto">Auto</SelectItem>
                                        <SelectItem value="100% 100%">Stretch</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs font-medium text-slate-800">
                                      Border color
                                    </Label>
                                    <div className="flex min-w-0 gap-1.5">
                                      <Input
                                        type="color"
                                        aria-label="Container border color swatch"
                                        className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                        value={toColorInputValue(
                                          formContainerStyle.borderColor,
                                          DEFAULT_FORM_CONTAINER_STYLE.borderColor
                                        )}
                                        onChange={(e) =>
                                          setFormContainerStyle((p) => ({
                                            ...p,
                                            borderColor: e.target.value,
                                          }))
                                        }
                                      />
                                      <Input
                                        type="text"
                                        className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                        value={formContainerStyle.borderColor}
                                        onChange={(e) =>
                                          setFormContainerStyle((p) => ({
                                            ...p,
                                            borderColor: e.target.value,
                                          }))
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs font-medium text-slate-800">
                                      Border radius
                                    </Label>
                                    <Input
                                      type="number"
                                      className="h-9 font-mono text-[11px]"
                                      value={formContainerStyle.borderRadius}
                                      onChange={(e) =>
                                        setFormContainerStyle((p) => ({
                                          ...p,
                                          borderRadius: parseStyleNumber(
                                            e.target.value,
                                            p.borderRadius
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs font-medium text-slate-800">
                                      Border style
                                    </Label>
                                    <Select
                                      value={formContainerStyle.borderStyle}
                                      onValueChange={(v) =>
                                        setFormContainerStyle((p) => ({
                                          ...p,
                                          borderStyle: v as FormContainerStyle['borderStyle'],
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="solid">Solid</SelectItem>
                                        <SelectItem value="dashed">Dashed</SelectItem>
                                        <SelectItem value="dotted">Dotted</SelectItem>
                                        <SelectItem value="double">Double</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs font-medium text-slate-800">
                                      Border width
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      className="h-9 font-mono text-[11px]"
                                      value={formContainerStyle.borderWidth}
                                      onChange={(e) =>
                                        setFormContainerStyle((p) => ({
                                          ...p,
                                          borderWidth: parseStyleNumber(
                                            e.target.value,
                                            p.borderWidth
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs font-medium text-slate-800">
                                      Padding bottom
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      className="h-9 font-mono text-[11px]"
                                      value={formContainerStyle.paddingBottom}
                                      onChange={(e) =>
                                        setFormContainerStyle((p) => ({
                                          ...p,
                                          paddingBottom: parseStyleNumber(
                                            e.target.value,
                                            p.paddingBottom
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs font-medium text-slate-800">
                                      Padding left
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      className="h-9 font-mono text-[11px]"
                                      value={formContainerStyle.paddingLeft}
                                      onChange={(e) =>
                                        setFormContainerStyle((p) => ({
                                          ...p,
                                          paddingLeft: parseStyleNumber(
                                            e.target.value,
                                            p.paddingLeft
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs font-medium text-slate-800">
                                      Padding right
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      className="h-9 font-mono text-[11px]"
                                      value={formContainerStyle.paddingRight}
                                      onChange={(e) =>
                                        setFormContainerStyle((p) => ({
                                          ...p,
                                          paddingRight: parseStyleNumber(
                                            e.target.value,
                                            p.paddingRight
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="col-span-2 space-y-1">
                                    <Label className="text-xs font-medium text-slate-800">
                                      Padding top
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      className="h-9 font-mono text-[11px]"
                                      value={formContainerStyle.paddingTop}
                                      onChange={(e) =>
                                        setFormContainerStyle((p) => ({
                                          ...p,
                                          paddingTop: parseStyleNumber(
                                            e.target.value,
                                            p.paddingTop
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : section === 'Header' ? (
                            <div className="mt-2 rounded-md border border-sky-100 bg-sky-50/80 p-3 text-xs">
                              <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">Color</Label>
                                  <div className="flex min-w-0 gap-1.5">
                                    <Input
                                      type="color"
                                      aria-label="Header text color swatch"
                                      className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                      value={toColorInputValue(
                                        formHeaderStyle.color,
                                        DEFAULT_FORM_HEADER_STYLE.color
                                      )}
                                      onChange={(e) =>
                                        setFormHeaderStyle((p) => ({ ...p, color: e.target.value }))
                                      }
                                    />
                                    <Input
                                      type="text"
                                      className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                      value={formHeaderStyle.color}
                                      onChange={(e) =>
                                        setFormHeaderStyle((p) => ({ ...p, color: e.target.value }))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font size
                                  </Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    className="h-9 font-mono text-[11px]"
                                    value={formHeaderStyle.fontSize}
                                    onChange={(e) =>
                                      setFormHeaderStyle((p) => ({
                                        ...p,
                                        fontSize: parseStyleNumber(e.target.value, p.fontSize),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font style
                                  </Label>
                                  <Select
                                    value={formHeaderStyle.fontStyle}
                                    onValueChange={(v) =>
                                      setFormHeaderStyle((p) => ({
                                        ...p,
                                        fontStyle: v as FormHeaderStyle['fontStyle'],
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="normal">Normal</SelectItem>
                                      <SelectItem value="italic">Italic</SelectItem>
                                      <SelectItem value="oblique">Oblique</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font weight
                                  </Label>
                                  <Select
                                    value={formHeaderStyle.fontWeight}
                                    onValueChange={(v) =>
                                      setFormHeaderStyle((p) => ({ ...p, fontWeight: v }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="400">Normal</SelectItem>
                                      <SelectItem value="500">Medium</SelectItem>
                                      <SelectItem value="600">Semibold</SelectItem>
                                      <SelectItem value="700">Bold</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Line height
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0.5}
                                    step={0.1}
                                    className="h-9 font-mono text-[11px]"
                                    value={formHeaderStyle.lineHeight}
                                    onChange={(e) =>
                                      setFormHeaderStyle((p) => ({
                                        ...p,
                                        lineHeight: parseStyleNumber(
                                          e.target.value,
                                          p.lineHeight
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding bottom
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formHeaderStyle.paddingBottom}
                                    onChange={(e) =>
                                      setFormHeaderStyle((p) => ({
                                        ...p,
                                        paddingBottom: parseStyleNumber(
                                          e.target.value,
                                          p.paddingBottom
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding left
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formHeaderStyle.paddingLeft}
                                    onChange={(e) =>
                                      setFormHeaderStyle((p) => ({
                                        ...p,
                                        paddingLeft: parseStyleNumber(
                                          e.target.value,
                                          p.paddingLeft
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding right
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formHeaderStyle.paddingRight}
                                    onChange={(e) =>
                                      setFormHeaderStyle((p) => ({
                                        ...p,
                                        paddingRight: parseStyleNumber(
                                          e.target.value,
                                          p.paddingRight
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding top
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formHeaderStyle.paddingTop}
                                    onChange={(e) =>
                                      setFormHeaderStyle((p) => ({
                                        ...p,
                                        paddingTop: parseStyleNumber(
                                          e.target.value,
                                          p.paddingTop
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Text align
                                  </Label>
                                  <Select
                                    value={formHeaderStyle.textAlign}
                                    onValueChange={(v) =>
                                      setFormHeaderStyle((p) => ({
                                        ...p,
                                        textAlign: v as FormHeaderTextAlign,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="left">Left</SelectItem>
                                      <SelectItem value="center">Center</SelectItem>
                                      <SelectItem value="right">Right</SelectItem>
                                      <SelectItem value="justify">Justify</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          ) : section === 'Input' ? (
                            <div className="mt-2 rounded-md border border-sky-100 bg-sky-50/80 p-3 text-xs">
                              <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Border color
                                  </Label>
                                  <div className="flex min-w-0 gap-1.5">
                                    <Input
                                      type="color"
                                      aria-label="Input border color swatch"
                                      className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                      value={toColorInputValue(
                                        formInputStyle.borderColor,
                                        DEFAULT_FORM_INPUT_STYLE.borderColor
                                      )}
                                      onChange={(e) =>
                                        setFormInputStyle((p) => ({
                                          ...p,
                                          borderColor: e.target.value,
                                        }))
                                      }
                                    />
                                    <Input
                                      type="text"
                                      className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                      value={formInputStyle.borderColor}
                                      onChange={(e) =>
                                        setFormInputStyle((p) => ({
                                          ...p,
                                          borderColor: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Border radius
                                  </Label>
                                  <Input
                                    type="number"
                                    className="h-9 font-mono text-[11px]"
                                    value={formInputStyle.borderRadius}
                                    onChange={(e) =>
                                      setFormInputStyle((p) => ({
                                        ...p,
                                        borderRadius: parseStyleNumber(
                                          e.target.value,
                                          p.borderRadius
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Border style
                                  </Label>
                                  <Select
                                    value={formInputStyle.borderStyle}
                                    onValueChange={(v) =>
                                      setFormInputStyle((p) => ({
                                        ...p,
                                        borderStyle: v as FormInputStyle['borderStyle'],
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      <SelectItem value="solid">Solid</SelectItem>
                                      <SelectItem value="dashed">Dashed</SelectItem>
                                      <SelectItem value="dotted">Dotted</SelectItem>
                                      <SelectItem value="double">Double</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Border width
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formInputStyle.borderWidth}
                                    onChange={(e) =>
                                      setFormInputStyle((p) => ({
                                        ...p,
                                        borderWidth: parseStyleNumber(
                                          e.target.value,
                                          p.borderWidth
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Error color
                                  </Label>
                                  <div className="flex min-w-0 gap-1.5">
                                    <Input
                                      type="color"
                                      aria-label="Input error color swatch"
                                      className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                      value={toColorInputValue(
                                        formInputStyle.errorColor,
                                        DEFAULT_FORM_INPUT_STYLE.errorColor
                                      )}
                                      onChange={(e) =>
                                        setFormInputStyle((p) => ({
                                          ...p,
                                          errorColor: e.target.value,
                                        }))
                                      }
                                    />
                                    <Input
                                      type="text"
                                      className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                      value={formInputStyle.errorColor}
                                      onChange={(e) =>
                                        setFormInputStyle((p) => ({
                                          ...p,
                                          errorColor: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font size
                                  </Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    className="h-9 font-mono text-[11px]"
                                    value={formInputStyle.fontSize}
                                    onChange={(e) =>
                                      setFormInputStyle((p) => ({
                                        ...p,
                                        fontSize: parseStyleNumber(e.target.value, p.fontSize),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font style
                                  </Label>
                                  <Select
                                    value={formInputStyle.fontStyle}
                                    onValueChange={(v) =>
                                      setFormInputStyle((p) => ({
                                        ...p,
                                        fontStyle: v as FormInputStyle['fontStyle'],
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="normal">Normal</SelectItem>
                                      <SelectItem value="italic">Italic</SelectItem>
                                      <SelectItem value="oblique">Oblique</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font weight
                                  </Label>
                                  <Select
                                    value={formInputStyle.fontWeight}
                                    onValueChange={(v) =>
                                      setFormInputStyle((p) => ({ ...p, fontWeight: v }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="400">Normal</SelectItem>
                                      <SelectItem value="500">Medium</SelectItem>
                                      <SelectItem value="600">Semibold</SelectItem>
                                      <SelectItem value="700">Bold</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Line height
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0.5}
                                    step={0.1}
                                    className="h-9 font-mono text-[11px]"
                                    value={formInputStyle.lineHeight}
                                    onChange={(e) =>
                                      setFormInputStyle((p) => ({
                                        ...p,
                                        lineHeight: parseStyleNumber(
                                          e.target.value,
                                          p.lineHeight
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding bottom
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formInputStyle.paddingBottom}
                                    onChange={(e) =>
                                      setFormInputStyle((p) => ({
                                        ...p,
                                        paddingBottom: parseStyleNumber(
                                          e.target.value,
                                          p.paddingBottom
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding left
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formInputStyle.paddingLeft}
                                    onChange={(e) =>
                                      setFormInputStyle((p) => ({
                                        ...p,
                                        paddingLeft: parseStyleNumber(
                                          e.target.value,
                                          p.paddingLeft
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding right
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formInputStyle.paddingRight}
                                    onChange={(e) =>
                                      setFormInputStyle((p) => ({
                                        ...p,
                                        paddingRight: parseStyleNumber(
                                          e.target.value,
                                          p.paddingRight
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding top
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formInputStyle.paddingTop}
                                    onChange={(e) =>
                                      setFormInputStyle((p) => ({
                                        ...p,
                                        paddingTop: parseStyleNumber(
                                          e.target.value,
                                          p.paddingTop
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Placeholder color
                                  </Label>
                                  <div className="flex min-w-0 gap-1.5">
                                    <Input
                                      type="color"
                                      aria-label="Placeholder color swatch"
                                      className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                      value={toColorInputValue(
                                        formInputStyle.placeholderColor,
                                        DEFAULT_FORM_INPUT_STYLE.placeholderColor
                                      )}
                                      onChange={(e) =>
                                        setFormInputStyle((p) => ({
                                          ...p,
                                          placeholderColor: e.target.value,
                                        }))
                                      }
                                    />
                                    <Input
                                      type="text"
                                      className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                      value={formInputStyle.placeholderColor}
                                      onChange={(e) =>
                                        setFormInputStyle((p) => ({
                                          ...p,
                                          placeholderColor: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="col-span-2 space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Text align
                                  </Label>
                                  <Select
                                    value={formInputStyle.textAlign}
                                    onValueChange={(v) =>
                                      setFormInputStyle((p) => ({
                                        ...p,
                                        textAlign: v as FormHeaderTextAlign,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="left">Left</SelectItem>
                                      <SelectItem value="center">Center</SelectItem>
                                      <SelectItem value="right">Right</SelectItem>
                                      <SelectItem value="justify">Justify</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          ) : section === 'Label' ? (
                            <div className="mt-2 rounded-md border border-sky-100 bg-sky-50/80 p-3 text-xs">
                              <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">Color</Label>
                                  <div className="flex min-w-0 gap-1.5">
                                    <Input
                                      type="color"
                                      aria-label="Label text color swatch"
                                      className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                      value={toColorInputValue(
                                        formLabelStyle.color,
                                        DEFAULT_FORM_LABEL_STYLE.color
                                      )}
                                      onChange={(e) =>
                                        setFormLabelStyle((p) => ({ ...p, color: e.target.value }))
                                      }
                                    />
                                    <Input
                                      type="text"
                                      className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                      value={formLabelStyle.color}
                                      onChange={(e) =>
                                        setFormLabelStyle((p) => ({ ...p, color: e.target.value }))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font size
                                  </Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    className="h-9 font-mono text-[11px]"
                                    value={formLabelStyle.fontSize}
                                    onChange={(e) =>
                                      setFormLabelStyle((p) => ({
                                        ...p,
                                        fontSize: parseStyleNumber(e.target.value, p.fontSize),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font style
                                  </Label>
                                  <Select
                                    value={formLabelStyle.fontStyle}
                                    onValueChange={(v) =>
                                      setFormLabelStyle((p) => ({
                                        ...p,
                                        fontStyle: v as FormLabelStyle['fontStyle'],
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="normal">Normal</SelectItem>
                                      <SelectItem value="italic">Italic</SelectItem>
                                      <SelectItem value="oblique">Oblique</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font weight
                                  </Label>
                                  <Select
                                    value={formLabelStyle.fontWeight}
                                    onValueChange={(v) =>
                                      setFormLabelStyle((p) => ({ ...p, fontWeight: v }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="400">Normal</SelectItem>
                                      <SelectItem value="500">Medium</SelectItem>
                                      <SelectItem value="600">Semibold</SelectItem>
                                      <SelectItem value="700">Bold</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Line height
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0.5}
                                    step={0.1}
                                    className="h-9 font-mono text-[11px]"
                                    value={formLabelStyle.lineHeight}
                                    onChange={(e) =>
                                      setFormLabelStyle((p) => ({
                                        ...p,
                                        lineHeight: parseStyleNumber(
                                          e.target.value,
                                          p.lineHeight
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding bottom
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formLabelStyle.paddingBottom}
                                    onChange={(e) =>
                                      setFormLabelStyle((p) => ({
                                        ...p,
                                        paddingBottom: parseStyleNumber(
                                          e.target.value,
                                          p.paddingBottom
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding left
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formLabelStyle.paddingLeft}
                                    onChange={(e) =>
                                      setFormLabelStyle((p) => ({
                                        ...p,
                                        paddingLeft: parseStyleNumber(
                                          e.target.value,
                                          p.paddingLeft
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding right
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formLabelStyle.paddingRight}
                                    onChange={(e) =>
                                      setFormLabelStyle((p) => ({
                                        ...p,
                                        paddingRight: parseStyleNumber(
                                          e.target.value,
                                          p.paddingRight
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding top
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formLabelStyle.paddingTop}
                                    onChange={(e) =>
                                      setFormLabelStyle((p) => ({
                                        ...p,
                                        paddingTop: parseStyleNumber(
                                          e.target.value,
                                          p.paddingTop
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Text align
                                  </Label>
                                  <Select
                                    value={formLabelStyle.textAlign}
                                    onValueChange={(v) =>
                                      setFormLabelStyle((p) => ({
                                        ...p,
                                        textAlign: v as FormHeaderTextAlign,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="left">Left</SelectItem>
                                      <SelectItem value="center">Center</SelectItem>
                                      <SelectItem value="right">Right</SelectItem>
                                      <SelectItem value="justify">Justify</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          ) : section === 'Paragraph' ? (
                            <div className="mt-2 rounded-md border border-sky-100 bg-sky-50/80 p-3 text-xs">
                              <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">Color</Label>
                                  <div className="flex min-w-0 gap-1.5">
                                    <Input
                                      type="color"
                                      aria-label="Paragraph text color swatch"
                                      className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                      value={toColorInputValue(
                                        formParagraphStyle.color,
                                        DEFAULT_FORM_PARAGRAPH_STYLE.color
                                      )}
                                      onChange={(e) =>
                                        setFormParagraphStyle((p) => ({ ...p, color: e.target.value }))
                                      }
                                    />
                                    <Input
                                      type="text"
                                      className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                      value={formParagraphStyle.color}
                                      onChange={(e) =>
                                        setFormParagraphStyle((p) => ({ ...p, color: e.target.value }))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font size
                                  </Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    className="h-9 font-mono text-[11px]"
                                    value={formParagraphStyle.fontSize}
                                    onChange={(e) =>
                                      setFormParagraphStyle((p) => ({
                                        ...p,
                                        fontSize: parseStyleNumber(e.target.value, p.fontSize),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font style
                                  </Label>
                                  <Select
                                    value={formParagraphStyle.fontStyle}
                                    onValueChange={(v) =>
                                      setFormParagraphStyle((p) => ({
                                        ...p,
                                        fontStyle: v as FormParagraphStyle['fontStyle'],
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="normal">Normal</SelectItem>
                                      <SelectItem value="italic">Italic</SelectItem>
                                      <SelectItem value="oblique">Oblique</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font weight
                                  </Label>
                                  <Select
                                    value={formParagraphStyle.fontWeight}
                                    onValueChange={(v) =>
                                      setFormParagraphStyle((p) => ({ ...p, fontWeight: v }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="400">Normal</SelectItem>
                                      <SelectItem value="500">Medium</SelectItem>
                                      <SelectItem value="600">Semibold</SelectItem>
                                      <SelectItem value="700">Bold</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Line height
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0.5}
                                    step={0.1}
                                    className="h-9 font-mono text-[11px]"
                                    value={formParagraphStyle.lineHeight}
                                    onChange={(e) =>
                                      setFormParagraphStyle((p) => ({
                                        ...p,
                                        lineHeight: parseStyleNumber(
                                          e.target.value,
                                          p.lineHeight
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding bottom
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formParagraphStyle.paddingBottom}
                                    onChange={(e) =>
                                      setFormParagraphStyle((p) => ({
                                        ...p,
                                        paddingBottom: parseStyleNumber(
                                          e.target.value,
                                          p.paddingBottom
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding left
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formParagraphStyle.paddingLeft}
                                    onChange={(e) =>
                                      setFormParagraphStyle((p) => ({
                                        ...p,
                                        paddingLeft: parseStyleNumber(
                                          e.target.value,
                                          p.paddingLeft
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding right
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formParagraphStyle.paddingRight}
                                    onChange={(e) =>
                                      setFormParagraphStyle((p) => ({
                                        ...p,
                                        paddingRight: parseStyleNumber(
                                          e.target.value,
                                          p.paddingRight
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding top
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formParagraphStyle.paddingTop}
                                    onChange={(e) =>
                                      setFormParagraphStyle((p) => ({
                                        ...p,
                                        paddingTop: parseStyleNumber(
                                          e.target.value,
                                          p.paddingTop
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Text align
                                  </Label>
                                  <Select
                                    value={formParagraphStyle.textAlign}
                                    onValueChange={(v) =>
                                      setFormParagraphStyle((p) => ({
                                        ...p,
                                        textAlign: v as FormHeaderTextAlign,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="left">Left</SelectItem>
                                      <SelectItem value="center">Center</SelectItem>
                                      <SelectItem value="right">Right</SelectItem>
                                      <SelectItem value="justify">Justify</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          ) : section === 'Sub Header' ? (
                            <div className="mt-2 rounded-md border border-sky-100 bg-sky-50/80 p-3 text-xs">
                              <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">Color</Label>
                                  <div className="flex min-w-0 gap-1.5">
                                    <Input
                                      type="color"
                                      aria-label="Sub header text color swatch"
                                      className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                      value={toColorInputValue(
                                        formSubHeaderStyle.color,
                                        DEFAULT_FORM_SUB_HEADER_STYLE.color
                                      )}
                                      onChange={(e) =>
                                        setFormSubHeaderStyle((p) => ({ ...p, color: e.target.value }))
                                      }
                                    />
                                    <Input
                                      type="text"
                                      className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                      value={formSubHeaderStyle.color}
                                      onChange={(e) =>
                                        setFormSubHeaderStyle((p) => ({ ...p, color: e.target.value }))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font size
                                  </Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    className="h-9 font-mono text-[11px]"
                                    value={formSubHeaderStyle.fontSize}
                                    onChange={(e) =>
                                      setFormSubHeaderStyle((p) => ({
                                        ...p,
                                        fontSize: parseStyleNumber(e.target.value, p.fontSize),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font style
                                  </Label>
                                  <Select
                                    value={formSubHeaderStyle.fontStyle}
                                    onValueChange={(v) =>
                                      setFormSubHeaderStyle((p) => ({
                                        ...p,
                                        fontStyle: v as FormSubHeaderStyle['fontStyle'],
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="normal">Normal</SelectItem>
                                      <SelectItem value="italic">Italic</SelectItem>
                                      <SelectItem value="oblique">Oblique</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font weight
                                  </Label>
                                  <Select
                                    value={formSubHeaderStyle.fontWeight}
                                    onValueChange={(v) =>
                                      setFormSubHeaderStyle((p) => ({ ...p, fontWeight: v }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="400">Normal</SelectItem>
                                      <SelectItem value="500">Medium</SelectItem>
                                      <SelectItem value="600">Semibold</SelectItem>
                                      <SelectItem value="700">Bold</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Line height
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0.5}
                                    step={0.1}
                                    className="h-9 font-mono text-[11px]"
                                    value={formSubHeaderStyle.lineHeight}
                                    onChange={(e) =>
                                      setFormSubHeaderStyle((p) => ({
                                        ...p,
                                        lineHeight: parseStyleNumber(
                                          e.target.value,
                                          p.lineHeight
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding bottom
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formSubHeaderStyle.paddingBottom}
                                    onChange={(e) =>
                                      setFormSubHeaderStyle((p) => ({
                                        ...p,
                                        paddingBottom: parseStyleNumber(
                                          e.target.value,
                                          p.paddingBottom
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding left
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formSubHeaderStyle.paddingLeft}
                                    onChange={(e) =>
                                      setFormSubHeaderStyle((p) => ({
                                        ...p,
                                        paddingLeft: parseStyleNumber(
                                          e.target.value,
                                          p.paddingLeft
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding right
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formSubHeaderStyle.paddingRight}
                                    onChange={(e) =>
                                      setFormSubHeaderStyle((p) => ({
                                        ...p,
                                        paddingRight: parseStyleNumber(
                                          e.target.value,
                                          p.paddingRight
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding top
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formSubHeaderStyle.paddingTop}
                                    onChange={(e) =>
                                      setFormSubHeaderStyle((p) => ({
                                        ...p,
                                        paddingTop: parseStyleNumber(
                                          e.target.value,
                                          p.paddingTop
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Text align
                                  </Label>
                                  <Select
                                    value={formSubHeaderStyle.textAlign}
                                    onValueChange={(v) =>
                                      setFormSubHeaderStyle((p) => ({
                                        ...p,
                                        textAlign: v as FormHeaderTextAlign,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="left">Left</SelectItem>
                                      <SelectItem value="center">Center</SelectItem>
                                      <SelectItem value="right">Right</SelectItem>
                                      <SelectItem value="justify">Justify</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          ) : section === 'Sub Label' ? (
                            <div className="mt-2 rounded-md border border-sky-100 bg-sky-50/80 p-3 text-xs">
                              <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">Color</Label>
                                  <div className="flex min-w-0 gap-1.5">
                                    <Input
                                      type="color"
                                      aria-label="Sub label text color swatch"
                                      className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                      value={toColorInputValue(
                                        formSubLabelStyle.color,
                                        DEFAULT_FORM_SUB_LABEL_STYLE.color
                                      )}
                                      onChange={(e) =>
                                        setFormSubLabelStyle((p) => ({ ...p, color: e.target.value }))
                                      }
                                    />
                                    <Input
                                      type="text"
                                      className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                      value={formSubLabelStyle.color}
                                      onChange={(e) =>
                                        setFormSubLabelStyle((p) => ({ ...p, color: e.target.value }))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font size
                                  </Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    className="h-9 font-mono text-[11px]"
                                    value={formSubLabelStyle.fontSize}
                                    onChange={(e) =>
                                      setFormSubLabelStyle((p) => ({
                                        ...p,
                                        fontSize: parseStyleNumber(e.target.value, p.fontSize),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font style
                                  </Label>
                                  <Select
                                    value={formSubLabelStyle.fontStyle}
                                    onValueChange={(v) =>
                                      setFormSubLabelStyle((p) => ({
                                        ...p,
                                        fontStyle: v as FormSubLabelStyle['fontStyle'],
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="normal">Normal</SelectItem>
                                      <SelectItem value="italic">Italic</SelectItem>
                                      <SelectItem value="oblique">Oblique</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Font weight
                                  </Label>
                                  <Select
                                    value={formSubLabelStyle.fontWeight}
                                    onValueChange={(v) =>
                                      setFormSubLabelStyle((p) => ({ ...p, fontWeight: v }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="400">Normal</SelectItem>
                                      <SelectItem value="500">Medium</SelectItem>
                                      <SelectItem value="600">Semibold</SelectItem>
                                      <SelectItem value="700">Bold</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Line height
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0.5}
                                    step={0.1}
                                    className="h-9 font-mono text-[11px]"
                                    value={formSubLabelStyle.lineHeight}
                                    onChange={(e) =>
                                      setFormSubLabelStyle((p) => ({
                                        ...p,
                                        lineHeight: parseStyleNumber(
                                          e.target.value,
                                          p.lineHeight
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding bottom
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formSubLabelStyle.paddingBottom}
                                    onChange={(e) =>
                                      setFormSubLabelStyle((p) => ({
                                        ...p,
                                        paddingBottom: parseStyleNumber(
                                          e.target.value,
                                          p.paddingBottom
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding left
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formSubLabelStyle.paddingLeft}
                                    onChange={(e) =>
                                      setFormSubLabelStyle((p) => ({
                                        ...p,
                                        paddingLeft: parseStyleNumber(
                                          e.target.value,
                                          p.paddingLeft
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding right
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formSubLabelStyle.paddingRight}
                                    onChange={(e) =>
                                      setFormSubLabelStyle((p) => ({
                                        ...p,
                                        paddingRight: parseStyleNumber(
                                          e.target.value,
                                          p.paddingRight
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Padding top
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-9 font-mono text-[11px]"
                                    value={formSubLabelStyle.paddingTop}
                                    onChange={(e) =>
                                      setFormSubLabelStyle((p) => ({
                                        ...p,
                                        paddingTop: parseStyleNumber(
                                          e.target.value,
                                          p.paddingTop
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-slate-800">
                                    Text align
                                  </Label>
                                  <Select
                                    value={formSubLabelStyle.textAlign}
                                    onValueChange={(v) =>
                                      setFormSubLabelStyle((p) => ({
                                        ...p,
                                        textAlign: v as FormHeaderTextAlign,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="left">Left</SelectItem>
                                      <SelectItem value="center">Center</SelectItem>
                                      <SelectItem value="right">Right</SelectItem>
                                      <SelectItem value="justify">Justify</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          ) : section === 'Tooltip' ? (
                            <div className="mt-2 rounded-md border border-sky-100 bg-sky-50/80 p-3 text-xs">
                              <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
                                <Label className="col-span-2 text-xs font-medium text-slate-800">
                                  Background color
                                </Label>
                                <div className="col-span-2 flex min-w-0 gap-1.5">
                                  <Input
                                    type="color"
                                    aria-label="Tooltip background swatch"
                                    className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                    value={toColorInputValue(
                                      formTooltipStyle.backgroundColor,
                                      DEFAULT_FORM_TOOLTIP_STYLE.backgroundColor
                                    )}
                                    onChange={(e) =>
                                      setFormTooltipStyle((p) => ({
                                        ...p,
                                        backgroundColor: e.target.value,
                                      }))
                                    }
                                  />
                                  <Input
                                    type="text"
                                    className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                    value={formTooltipStyle.backgroundColor}
                                    onChange={(e) =>
                                      setFormTooltipStyle((p) => ({
                                        ...p,
                                        backgroundColor: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <Label className="col-span-2 text-xs font-medium text-slate-800">Color</Label>
                                <div className="col-span-2 flex min-w-0 gap-1.5">
                                  <Input
                                    type="color"
                                    aria-label="Tooltip text color swatch"
                                    className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                    value={toColorInputValue(
                                      formTooltipStyle.color,
                                      DEFAULT_FORM_TOOLTIP_STYLE.color
                                    )}
                                    onChange={(e) =>
                                      setFormTooltipStyle((p) => ({ ...p, color: e.target.value }))
                                    }
                                  />
                                  <Input
                                    type="text"
                                    className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                    value={formTooltipStyle.color}
                                    onChange={(e) =>
                                      setFormTooltipStyle((p) => ({ ...p, color: e.target.value }))
                                    }
                                  />
                                </div>
                                <Label className="col-span-2 text-xs font-medium text-slate-800">
                                  Icon color
                                </Label>
                                <div className="col-span-2 flex min-w-0 gap-1.5">
                                  <Input
                                    type="color"
                                    aria-label="Tooltip icon color swatch"
                                    className="h-9 w-11 shrink-0 cursor-pointer rounded border border-input p-1"
                                    value={toColorInputValue(
                                      formTooltipStyle.iconColor,
                                      DEFAULT_FORM_TOOLTIP_STYLE.iconColor
                                    )}
                                    onChange={(e) =>
                                      setFormTooltipStyle((p) => ({
                                        ...p,
                                        iconColor: e.target.value,
                                      }))
                                    }
                                  />
                                  <Input
                                    type="text"
                                    className="h-9 min-w-0 flex-1 font-mono text-[11px]"
                                    value={formTooltipStyle.iconColor}
                                    onChange={(e) =>
                                      setFormTooltipStyle((p) => ({
                                        ...p,
                                        iconColor: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="px-1 py-3 text-xs text-muted-foreground">
                              Styling for this element can be configured here.
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
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
