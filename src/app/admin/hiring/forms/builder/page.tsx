'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';

const BASIC_ELEMENTS = [
  { id: 'header', label: 'Header', icon: Type },
  { id: 'label', label: 'Label', icon: Type },
  { id: 'paragraph', label: 'Paragraph', icon: Type },
  { id: 'divider', label: 'Divider', icon: Minus },
  { id: 'text', label: 'Text Input', icon: FileInput },
  { id: 'number', label: 'Number', icon: Hash },
  { id: 'multiline', label: 'Multi-line Input', icon: FileInput },
  { id: 'dropdown', label: 'Dropdown', icon: List },
  { id: 'radio', label: 'Radio Button', icon: Circle },
  { id: 'multiple', label: 'Multiple Choice', icon: ListOrdered },
] as const;

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
  const [styleTab, setStyleTab] = useState<'page' | 'form'>('page');
  const [selectedSchemeId, setSelectedSchemeId] = useState('1');
  const [backgroundColor, setBackgroundColor] = useState('#F4F5F9');
  const [backgroundPosition, setBackgroundPosition] = useState('Center');
  const [backgroundRepeat, setBackgroundRepeat] = useState('None');

  return (
    <div className="flex flex-col min-h-screen bg-background">
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

      <div className="flex flex-1 min-h-0">
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
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-background hover:text-foreground text-left"
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {el.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <button
                type="button"
                className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium mt-2 hover:bg-background/80"
              >
                Advanced Elements
              </button>
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
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-slate-900">Name</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm">First Name *</Label>
                        <Input placeholder="Ex: James" className="border-red-200" />
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <span className="inline-block w-3 h-3 rounded-full bg-destructive/80" /> This
                          field should not be empty
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Last Name *</Label>
                        <Input placeholder="Ex: Lee" className="border-red-200" />
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <span className="inline-block w-3 h-3 rounded-full bg-destructive/80" /> This
                          field should not be empty
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Email *</Label>
                    <Input placeholder="Ex: example@xyz.com" className="border-red-200" />
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-full bg-destructive/80" /> This
                      field should not be empty
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Phone Number *</Label>
                    <Input placeholder="Phone No." className="border-red-200" />
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-full bg-destructive/80" /> This
                      field should not be empty
                    </p>
                  </div>
                  <Button className="w-full">Submit</Button>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Form settings will appear here.
                </div>
              )}
            </Card>
          </div>
        </main>

        {/* Right sidebar - Form customizer */}
        {customizerSidebarOpen ? (
          <aside className="w-72 border-l bg-muted/30 flex flex-col shrink-0 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
              <span className="text-sm font-medium">Form customizer</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCustomizerSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3 overflow-y-auto flex-1 space-y-4">
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
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
