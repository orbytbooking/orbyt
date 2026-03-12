'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  UserPlus,
  Users,
  Video,
  ClipboardList,
  Contact,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  FileText,
  Bell,
  ScrollText,
  LayoutGrid,
  Megaphone,
  FileSignature,
  Search,
  Plus,
} from 'lucide-react';
import OnboardingTab from '@/components/admin/hiring/OnboardingTab';
import ProspectsTab from '@/components/admin/hiring/ProspectsTab';
import InterviewsTab from '@/components/admin/hiring/InterviewsTab';
import QuizzesTab from '@/components/admin/hiring/QuizzesTab';
import ContactsTab from '@/components/admin/hiring/ContactsTab';
import ReportsTab from '@/components/admin/hiring/ReportsTab';

const FORMS_CATEGORIES = [
  { id: 'prospects', label: 'Prospects', icon: LayoutGrid },
  { id: 'quizzes', label: 'Quizzes', icon: Megaphone },
  { id: 'contracts', label: 'Contracts', icon: FileSignature },
] as const;

const FORM_FILTER_OPTIONS = ['Active Forms', 'Archived Forms', 'All Forms'] as const;

const EMPTY_MESSAGES: Record<string, string> = {
  prospects: 'There is no prospect form added yet.',
  quizzes: 'There is no quiz form added yet.',
  contracts: 'There is no contract form added yet.',
};

function SettingsFormsContent() {
  const router = useRouter();
  const [formCategory, setFormCategory] = useState<string>('prospects');
  const [formFilter, setFormFilter] = useState<string>('Active Forms');
  const [searchQuery, setSearchQuery] = useState('');
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [formName, setFormName] = useState('');

  const handleCloseCreateForm = () => {
    setCreateFormOpen(false);
    setFormName('');
  };

  const handleCreateFormNext = () => {
    const name = formName.trim() || 'Untitled form';
    handleCloseCreateForm();
    router.push(`/admin/hiring/forms/builder?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Forms</h2>
        <p className="text-sm text-muted-foreground mt-1">
          All forms are shown here. You can add these forms on any page and start to collect applications.
        </p>
      </div>
      <Card>
        <div className="flex min-h-[400px]">
          {/* Left sidebar */}
          <nav className="w-52 border-r bg-muted/30 p-2 flex flex-col gap-0.5">
            {FORMS_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = formCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormCategory(cat.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </button>
              );
            })}
          </nav>
          {/* Right content */}
          <div className="flex-1 flex flex-col p-4">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Select value={formFilter} onValueChange={setFormFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Active Forms" />
                </SelectTrigger>
                <SelectContent>
                  {FORM_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button className="shrink-0" onClick={() => setCreateFormOpen(true)}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 -ml-1 mr-1.5">
                  <Plus className="h-3.5 w-3.5" />
                </span>
                Create New
              </Button>
            </div>
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">{EMPTY_MESSAGES[formCategory] ?? EMPTY_MESSAGES.prospects}</p>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={createFormOpen} onOpenChange={setCreateFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">Create form</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="form-name" className="text-sm font-medium text-slate-900">
              Form name
            </Label>
            <Input
              id="form-name"
              placeholder="Enter form name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="border-slate-200"
            />
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button type="button" onClick={handleCreateFormNext}>
              Next
            </Button>
            <Button type="button" variant="destructive" onClick={handleCloseCreateForm}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsNotificationsContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle>
        <CardDescription>Manage hiring and interview notification preferences.</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/admin/settings/notifications" className="text-primary hover:underline">Open notification settings →</Link>
      </CardContent>
    </Card>
  );
}

function SettingsLogsContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5" /> Logs</CardTitle>
        <CardDescription>View activity and audit logs for your hiring pipeline.</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/admin/settings" className="text-primary hover:underline">Open logs &amp; settings →</Link>
      </CardContent>
    </Card>
  );
}

function SettingsGeneralContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Settings</CardTitle>
        <CardDescription>General hiring and workspace settings.</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/admin/settings/general" className="text-primary hover:underline">Open general settings →</Link>
      </CardContent>
    </Card>
  );
}

export default function HiringPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('onboarding');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'settings-forms') setActiveTab('settings-forms');
  }, [searchParams]);

  const tabs = [
    { value: 'onboarding', label: 'Onboarding', icon: UserPlus, component: OnboardingTab },
    { value: 'prospects', label: 'Prospects', icon: Users, component: ProspectsTab },
    { value: 'interviews', label: 'Interviews', icon: Video, component: InterviewsTab },
    { value: 'quizzes', label: 'Quizzes', icon: ClipboardList, component: QuizzesTab },
    { value: 'contacts', label: 'Contacts', icon: Contact, component: ContactsTab },
    { value: 'reports', label: 'Reports', icon: BarChart3, component: ReportsTab },
  ];

  const isSettingsActive = activeTab.startsWith('settings-');
  const settingsContent: Record<string, () => JSX.Element> = {
    'settings-forms': SettingsFormsContent,
    'settings-notifications': SettingsNotificationsContent,
    'settings-logs': SettingsLogsContent,
    'settings-general': SettingsGeneralContent,
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="flex w-full flex-wrap h-auto gap-0 p-1 lg:w-auto lg:inline-flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          );
        })}
        <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={() => isSettingsActive || setSettingsOpen(true)}
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0 border-0 bg-transparent ${isSettingsActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'} ${settingsOpen ? 'bg-background text-foreground shadow-sm' : ''}`}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
              <ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={4}
            className="min-w-[10rem] rounded-b-md rounded-t-sm border-0 bg-primary text-primary-foreground p-0 shadow-lg"
          >
            <DropdownMenuItem
              className="rounded-none focus:bg-primary-foreground/20 focus:text-primary-foreground border-b border-primary-foreground/20"
              onSelect={() => { setActiveTab('settings-forms'); setSettingsOpen(false); }}
            >
              Forms
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-none focus:bg-primary-foreground/20 focus:text-primary-foreground border-b border-primary-foreground/20"
              onSelect={() => { setActiveTab('settings-notifications'); setSettingsOpen(false); }}
            >
              Notifications
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="rounded-none focus:bg-primary-foreground/20 focus:text-primary-foreground border-b border-primary-foreground/20 data-[state=open]:bg-primary-foreground/20">
                Logs
                <ChevronRight className="ml-auto h-4 w-4" />
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="rounded-md border-0 bg-primary text-primary-foreground min-w-[10rem]"
              >
                <DropdownMenuItem
                  className="focus:bg-primary-foreground/20 focus:text-primary-foreground"
                  onSelect={() => { setActiveTab('settings-logs'); setSettingsOpen(false); }}
                >
                  View logs
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              className="rounded-none focus:bg-primary-foreground/20 focus:text-primary-foreground"
              onSelect={() => { setActiveTab('settings-general'); setSettingsOpen(false); }}
            >
              Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TabsList>

      {tabs.map((tab) => {
        const Component = tab.component;
        return (
          <TabsContent key={tab.value} value={tab.value} className="space-y-4">
            <Component />
          </TabsContent>
        );
      })}
      {Object.entries(settingsContent).map(([value, Content]) => (
        <TabsContent key={value} value={value} className="space-y-4">
          <Content />
        </TabsContent>
      ))}
    </Tabs>
  );
}
