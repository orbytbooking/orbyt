'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  UserPlus, 
  Users, 
  Video, 
  ClipboardList, 
  Contact, 
  BarChart3 
} from 'lucide-react';
import OnboardingTab from '@/components/admin/hiring/OnboardingTab';
import ProspectsTab from '@/components/admin/hiring/ProspectsTab';
import InterviewsTab from '@/components/admin/hiring/InterviewsTab';
import QuizzesTab from '@/components/admin/hiring/QuizzesTab';
import ContactsTab from '@/components/admin/hiring/ContactsTab';
import ReportsTab from '@/components/admin/hiring/ReportsTab';

export default function HiringPage() {
  const [activeTab, setActiveTab] = useState('onboarding');

  const tabs = [
    {
      value: 'onboarding',
      label: 'Onboarding',
      icon: UserPlus,
      component: OnboardingTab,
    },
    {
      value: 'prospects',
      label: 'Prospects',
      icon: Users,
      component: ProspectsTab,
    },
    {
      value: 'interviews',
      label: 'Interviews',
      icon: Video,
      component: InterviewsTab,
    },
    {
      value: 'quizzes',
      label: 'Quizzes',
      icon: ClipboardList,
      component: QuizzesTab,
    },
    {
      value: 'contacts',
      label: 'Contacts',
      icon: Contact,
      component: ContactsTab,
    },
    {
      value: 'reports',
      label: 'Reports',
      icon: BarChart3,
      component: ReportsTab,
    },
  ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
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
      </TabsList>

      {tabs.map((tab) => {
        const Component = tab.component;
        return (
          <TabsContent key={tab.value} value={tab.value} className="space-y-4">
            <Component />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
