'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UserPlus,
  Users,
  Video,
  ClipboardList,
  FileSignature,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const MAIN_TABS = [
  { value: 'onboarding', label: 'Onboarding', icon: UserPlus },
  { value: 'interviews', label: 'Interviews', icon: Video },
  { value: 'quizzes', label: 'Quizzes', icon: ClipboardList },
  { value: 'prospects', label: 'Prospects', icon: Users },
  { value: 'contracts', label: 'Contracts', icon: FileSignature },
  { value: 'reports', label: 'Reports', icon: BarChart3 },
] as const;

type Props = {
  value: string;
  onValueChange: (next: string) => void;
  /**
   * When set, "Prospects" navigates with this id so the prospect sheet can reopen after leaving the quiz page.
   */
  prospectIdForProspectsTab?: string | null;
  /**
   * If true, tab changes navigate away (e.g. from quiz summary) instead of only updating local tab state.
   */
  navigateOnTabChange?: boolean;
};

export default function HiringHiringTabStrip({
  value,
  onValueChange,
  prospectIdForProspectsTab,
  navigateOnTabChange,
}: Props) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isSettingsActive = value.startsWith('settings-');

  const goHiringTab = (tab: string) => {
    if (navigateOnTabChange) {
      const q = new URLSearchParams();
      q.set('tab', tab);
      if (tab === 'prospects' && prospectIdForProspectsTab?.trim()) {
        q.set('prospectId', prospectIdForProspectsTab.trim());
      }
      router.push(`/admin/hiring?${q.toString()}`);
    } else {
      onValueChange(tab);
    }
  };

  return (
    <TabsList className="flex w-full flex-wrap h-auto gap-0 p-1 lg:w-auto lg:inline-flex">
      {MAIN_TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="flex items-center gap-2"
            {...(navigateOnTabChange
              ? {
                  onClick: (e) => {
                    e.preventDefault();
                    goHiringTab(tab.value);
                  },
                }
              : {})}
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
            onSelect={() => {
              goHiringTab('settings-forms');
              setSettingsOpen(false);
            }}
          >
            Forms
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-none focus:bg-primary-foreground/20 focus:text-primary-foreground border-b border-primary-foreground/20"
            onSelect={() => {
              goHiringTab('settings-notifications');
              setSettingsOpen(false);
            }}
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
                onSelect={() => {
                  goHiringTab('settings-logs');
                  setSettingsOpen(false);
                }}
              >
                View logs
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            className="rounded-none focus:bg-primary-foreground/20 focus:text-primary-foreground"
            onSelect={() => {
              goHiringTab('settings-general');
              setSettingsOpen(false);
            }}
          >
            Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TabsList>
  );
}
