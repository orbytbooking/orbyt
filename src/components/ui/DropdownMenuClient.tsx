'use client';

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { ChevronDown, HelpCircle, MessageSquare, LifeBuoy, BookOpen, User, Zap } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DropdownMenuItemProps {
  href: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}

const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ href, children, icon }) => (
  <Link href={href}>
    <DropdownMenuPrimitive.Item className="group text-sm rounded-sm flex items-center px-2 py-2 outline-none cursor-pointer hover:bg-gray-50 hover:text-primary">
      {icon}
      <span className="ml-2">{children}</span>
    </DropdownMenuPrimitive.Item>
  </Link>
);

export function SupportDropdown() {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button className="flex items-center text-sm font-medium text-black hover:text-primary transition-colors">
          Support
          <ChevronDown className="ml-1 h-4 w-4" />
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content 
          className="min-w-[220px] bg-white rounded-md p-2 shadow-lg border border-gray-200 z-50" 
          sideOffset={10} 
          align="end"
        >
          <DropdownMenuItem 
            href="/help-center" 
            icon={<HelpCircle className="mr-2 h-4 w-4" />}
          >
            Help Center
          </DropdownMenuItem>
          <DropdownMenuItem 
            href="/help-center/faqs" 
            icon={<MessageSquare className="mr-2 h-4 w-4" />}
          >
            FAQs
          </DropdownMenuItem>
          <DropdownMenuItem 
            href="/contact-support" 
            icon={<LifeBuoy className="mr-2 h-4 w-4" />}
          >
            Contact Support
          </DropdownMenuItem>
          <DropdownMenuItem 
            href="/help-center/tutorials" 
            icon={<BookOpen className="mr-2 h-4 w-4" />}
          >
            Tutorials
          </DropdownMenuItem>
          <DropdownMenuItem 
            href="/help-center/account" 
            icon={<User className="mr-2 h-4 w-4" />}
          >
            Account Support
          </DropdownMenuItem>
          <DropdownMenuItem 
            href="/help-center/feature-requests" 
            icon={<Zap className="mr-2 h-4 w-4" />}
          >
            Request a Feature
          </DropdownMenuItem>
          <DropdownMenuPrimitive.Arrow className="fill-white" />
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
