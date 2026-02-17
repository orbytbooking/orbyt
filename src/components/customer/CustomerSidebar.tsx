"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  CalendarCheck,
  History,
  CircleOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
};

export const customerNavItems: NavItem[] = [
  { 
    label: "Dashboard", 
    href: "/customer/dashboard", 
    icon: LayoutDashboard,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600"
  },
  { 
    label: "Appointments", 
    href: "/customer/appointments", 
    icon: CalendarCheck,
    iconBg: "bg-green-100",
    iconColor: "text-green-600"
  },
  { 
    label: "Previous appointments", 
    href: "/customer/appointments/history", 
    icon: History,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600"
  },
  { 
    label: "Canceled appointments", 
    href: "/customer/appointments/canceled", 
    icon: CircleOff,
    iconBg: "bg-red-100",
    iconColor: "text-red-600"
  },
];

type CustomerSidebarProps = {
  customerName: string;
  customerEmail: string;
  initials: string;
  businessName: string;
  onLogout: () => void;
};

export const CustomerSidebar = ({ customerName, customerEmail, initials, businessName, onLogout }: CustomerSidebarProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const businessId = searchParams?.get("business") ?? "";

  const hrefWithBusiness = (path: string) =>
    businessId ? `${path}${path.includes("?") ? "&" : "?"}business=${businessId}` : path;

  return (
    <aside className="order-2 bg-background/90 border-t border-border px-6 py-6 lg:order-1 lg:border-t-0 lg:border-r lg:min-h-screen flex flex-col">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.4em] text-foreground">{businessName}</p>
        <p className="text-sm text-muted-foreground">Customer Portal</p>
      </div>
      <nav className="flex flex-row gap-2 overflow-x-auto pb-4 lg:flex-col lg:gap-3 lg:pb-6 flex-1">
        {customerNavItems.map((item) => {
          const Icon = item.icon;
          const href = hrefWithBusiness(item.href);
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-primary/5",
                isActive ? "bg-primary/5 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", item.iconBg, item.iconColor)}>
                <Icon className="h-4 w-4" />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <DropdownMenu>
        <DropdownMenuTrigger className="border-t border-border pt-4 text-left focus:outline-none">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{customerName}</p>
              <p className="text-xs text-muted-foreground">{customerEmail}</p>
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={hrefWithBusiness("/customer/profile")}>Profile Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(event) => {
              event.preventDefault();
              onLogout();
            }}
          >
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </aside>
  );
};
