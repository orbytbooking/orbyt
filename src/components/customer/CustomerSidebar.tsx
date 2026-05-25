"use client";

import { useEffect, useState } from "react";
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
  HardDrive,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlatformNotificationBell } from "@/components/notifications/PlatformNotificationBell";
import { getSupabaseCustomerClient } from "@/lib/supabaseCustomerClient";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
};

const baseCustomerNavItems: NavItem[] = [
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

const myDriveNavItem: NavItem = {
  label: "My Drive",
  href: "/customer/drive",
  icon: HardDrive,
  iconBg: "bg-amber-100",
  iconColor: "text-amber-700",
};

type CustomerSidebarProps = {
  customerName: string;
  customerEmail: string;
  initials: string;
  businessName: string;
  onLogout: () => void;
};

export const CustomerSidebar = ({
  customerName,
  customerEmail,
  initials,
  businessName,
  onLogout,
}: CustomerSidebarProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const businessId = searchParams?.get("business") ?? "";
  const [myDriveEnabled, setMyDriveEnabled] = useState(false);
  const [portalLogoUrl, setPortalLogoUrl] = useState<string | null>(null);
  const [builderCompanyName, setBuilderCompanyName] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setMyDriveEnabled(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/customer/my-drive-settings?business=${encodeURIComponent(businessId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setMyDriveEnabled(d?.customer_my_drive_enabled === true);
      })
      .catch(() => {
        if (!cancelled) setMyDriveEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  /** Logo and name from website builder JSON only (`business_website_configs`), not businesses.logo_url. */
  useEffect(() => {
    if (!businessId) {
      setPortalLogoUrl(null);
      setBuilderCompanyName(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/public/website-config?business_id=${encodeURIComponent(businessId)}`)
      .then((r) => r.json())
      .then((wc) => {
        if (cancelled) return;
        const config = wc?.config;
        const headerData = config?.sections?.find((s: { type?: string }) => s.type === "header")?.data as
          | { logo?: string; companyName?: string }
          | undefined;
        const headerLogo = headerData?.logo?.trim?.() ?? "";
        const brandingLogo = config?.branding?.logo?.trim?.() ?? "";
        // Header section is what the Website Builder edits for "Header Logo"; prefer it over stale branding.
        const raw = headerLogo || brandingLogo;
        const safe = raw && !raw.startsWith("blob:") ? raw : "";
        setPortalLogoUrl(safe || null);

        const headerName = headerData?.companyName?.trim?.() ?? "";
        const brandName = config?.branding?.companyName?.trim?.() ?? "";
        setBuilderCompanyName(headerName || brandName || null);
      })
      .catch(() => {
        if (!cancelled) {
          setPortalLogoUrl(null);
          setBuilderCompanyName(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const hrefWithBusiness = (path: string) =>
    businessId ? `${path}${path.includes("?") ? "&" : "?"}business=${businessId}` : path;

  const navItems: NavItem[] = myDriveEnabled
    ? [...baseCustomerNavItems.slice(0, 2), myDriveNavItem, ...baseCustomerNavItems.slice(2)]
    : baseCustomerNavItems;

  const sidebarBusinessTitle = builderCompanyName || businessName;

  return (
    <aside className="order-2 bg-background/90 border-t border-border px-6 py-6 lg:order-1 lg:border-t-0 lg:border-r lg:min-h-screen flex flex-col">
      <div className="mb-6 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {portalLogoUrl ? (
            <img
              src={portalLogoUrl}
              alt={sidebarBusinessTitle || "Business"}
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold" style={{ color: "#0C2B4E" }}>
              {sidebarBusinessTitle || "Business"}
            </h1>
            <p className="text-xs text-muted-foreground">Customer Portal</p>
          </div>
        </div>
        <PlatformNotificationBell
          apiBase="/api/customer/notifications"
          getAuthHeaders={async () => {
            const {
              data: { session },
            } = await getSupabaseCustomerClient().auth.getSession();
            if (!session?.access_token) return undefined;
            return { Authorization: `Bearer ${session.access_token}` };
          }}
          variant="muted"
        />
      </div>
      <nav className="flex flex-row gap-2 overflow-x-auto pb-4 lg:flex-col lg:gap-3 lg:pb-6 flex-1">
        {navItems.map((item) => {
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
        <DropdownMenuTrigger className="border-t border-border pt-4 text-left focus:outline-none w-full">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-left">
              <p className="text-sm font-semibold">{customerName}</p>
              <p className="text-xs text-muted-foreground truncate">{customerEmail}</p>
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
