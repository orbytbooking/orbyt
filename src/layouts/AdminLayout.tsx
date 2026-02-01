'use client';

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Briefcase, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  UserCog,
  UserPlus,
  Megaphone,
  BarChart3,
  FileText,
  User,
  ChevronDown,
  Layout,
  Bell,
  List,
  Clock,
  Sun,
  Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLogo } from "@/contexts/LogoContext";
import defaultLogo from "@/assets/orbit.png";
import { useWebsiteConfig } from "@/hooks/useWebsiteConfig";
import { supabase } from "@/lib/supabaseClient";
import { useBusiness } from "@/contexts/BusinessContext";
import { addIndustryChangeListener, removeIndustryChangeListener } from "@/lib/industryEvents";

interface Industry {
  id: string;
  name: string;
  description: string | null;
  business_id: string;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminEmail, setAdminEmail] = useState("Admin");
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const pathname = usePathname();
  const { config } = useWebsiteConfig();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isSettingsPath = pathname?.startsWith("/admin/settings") ?? false;
  const [settingsOpen, setSettingsOpen] = useState(isSettingsPath);
  const isAccountPath = pathname?.startsWith("/admin/settings/account") ?? false;
  const [accountOpen, setAccountOpen] = useState(isAccountPath);
  const isIndustriesPath = pathname?.startsWith("/admin/settings/industries") ?? false;
  const [industriesOpen, setIndustriesOpen] = useState(isIndustriesPath);
  const isMarketingPath = pathname?.startsWith("/admin/marketing") ?? false;
  const isStaffPath = pathname?.startsWith("/admin/settings/staff") ?? false;
  const [marketingOpen, setMarketingOpen] = useState(isMarketingPath);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [notifications, setNotifications] = useState<
    { id: string; title: string; description: string; read?: boolean }[]
  >([
    { id: '1', title: 'New booking confirmed', description: 'Booking BK005 has been confirmed.' },
    { id: '2', title: 'Provider completed job', description: 'Provider marked BK003 as completed.', read: true },
    { id: '3', title: 'Cancellation request', description: 'Customer requested to cancel BK004.' },
  ]);
  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const deleteNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));
  const clearAllNotifications = () => setNotifications([]);
  const [openIndustryMenus, setOpenIndustryMenus] = useState<Record<string, boolean>>({});
  const { currentBusiness } = useBusiness();

  // Get admin email and theme from localStorage on client-side only
  useEffect(() => {
    const email = localStorage.getItem("adminEmail") || "Admin";
    setAdminEmail(email);
    const savedTheme = localStorage.getItem("adminTheme") as 'light' | 'dark' || 'dark';
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (currentBusiness) {
      fetchIndustries();
    }
  }, [currentBusiness]);

  // Listen for industry changes
  useEffect(() => {
    const handleIndustryChange = () => {
      fetchIndustries();
    };

    addIndustryChangeListener(handleIndustryChange);

    return () => {
      removeIndustryChangeListener(handleIndustryChange);
    };
  }, [currentBusiness]);

 const fetchIndustries = async () => {
  if (!currentBusiness) return;

  try {
    const response = await fetch(
      `/api/industries?business_id=${currentBusiness.id}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch industries");
    }

    setIndustries(data.industries || []);
  } catch (error) {
    console.error("Error fetching industries:", error);
    setIndustries([]);
  }
};


  useEffect(() => {
    setSettingsOpen(isSettingsPath);
  }, [isSettingsPath]);

  useEffect(() => {
    setMarketingOpen(isMarketingPath);
  }, [isMarketingPath]);

  useEffect(() => {
    setAccountOpen(isAccountPath);
  }, [isAccountPath]);

  useEffect(() => {
    setIndustriesOpen(isIndustriesPath);
  }, [isIndustriesPath]);

  const menuItems = [
    { 
      icon: LayoutDashboard, 
      label: "Dashboard", 
      path: "/admin/dashboard",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    { 
      icon: Calendar, 
      label: "Bookings", 
      path: "/admin/bookings",
      iconBg: "bg-green-100",
      iconColor: "text-green-600"
    },
    { 
      icon: Users, 
      label: "Customers", 
      path: "/admin/customers",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    { 
      icon: FileText, 
      label: "Leads", 
      path: "/admin/leads",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    { 
      icon: UserPlus, 
      label: "Hiring", 
      path: "/admin/hiring",
      iconBg: "bg-cyan-100",
      iconColor: "text-cyan-600"
    },
    { 
      icon: UserCog, 
      label: "Providers", 
      path: "/admin/providers",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600"
    },
    { 
      icon: Megaphone, 
      label: "Marketing", 
      path: "/admin/marketing",
      iconBg: "bg-pink-100",
      iconColor: "text-pink-600"
    },
    { 
      icon: BarChart3, 
      label: "Reports", 
      path: "/admin/reports",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600"
    },
    { 
      icon: List, 
      label: "Logs", 
      path: "/admin/logs",
      iconBg: "bg-gray-100",
      iconColor: "text-gray-600"
    },
    {
      icon: Settings,
      label: "Settings",
      path: "/admin/settings",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      children: [
        { 
          icon: Settings,
          label: 'General', 
          path: '/admin/settings/general',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600'
        },
        { label: "Account", path: "/admin/settings/account" },
        { label: "Website & Form Design", path: "/admin/settings/design" },
        {
          label: "Industries",
          path: "/admin/settings/industries",
          children: [
            { label: 'Add Industries', path: '/admin/settings/industries' },
            ...(industries || []).map((industry) => ({
              label: industry.name,
              path: `/admin/settings/industries/form-1?industry=${encodeURIComponent(industry.name)}`,
              children: [
                { 
                  label: 'Form 1', 
                  path: `/admin/settings/industries/form-1?industry=${encodeURIComponent(industry.name)}`
                },
                { 
                  label: 'Settings', 
                  path: `/admin/settings/industries/settings?industry=${encodeURIComponent(industry.name)}`
                }
              ],
            })),
          ],
        },
        { 
          icon: Clock,
          label: 'Reserve Slot', 
          path: '/admin/settings/reserve-slot',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600'
        },
        { 
          icon: Bell,
          label: 'Notifications', 
          path: '/admin/settings/notifications',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600'
        },
        { 
          icon: Users,
          label: 'Staff', 
          path: '/admin/settings/staff',
          iconBg: 'purple-100',
          iconColor: 'text-purple-600'
        },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error('Logout error:', error);
      router.push("/auth/login");
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem("adminTheme", newTheme);
  };

  const { logo } = useLogo();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'void-bg admin-theme' : 'bg-white light-theme'}`}>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        } glass-sidebar shadow-2xl`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-start justify-between p-4 border-b border-cyan-500/20">
            {sidebarOpen ? (
              <>
                <div className="flex items-center gap-3">
                  {logo && !logo.startsWith('blob:') ? (
                    <Image 
                      src={logo} 
                      alt="Logo" 
                      width={44} 
                      height={44} 
                      className="rounded object-cover" 
                    />
                  ) : (
                    <Image 
                      src={defaultLogo} 
                      alt="Logo" 
                      width={44} 
                      height={44} 
                      className="rounded object-cover" 
                    />
                  )}
                  <div>
                    <h2 className={`text-sm font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-cyan-400' : 'text-black'}`} style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                      {currentBusiness?.name || config?.branding?.companyName || 'ORBYT'}
                    </h2>
                    <p className={`text-xs ${theme === 'dark' ? 'text-cyan-300/60' : 'text-black/60'}`} style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Admin Panel</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="h-8 w-8 mx-auto"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const hasChildren = Array.isArray((item as any).children);
              const childActive = hasChildren
                ? (item as any).children.some((child: { path: string }) => pathname === child.path)
                : false;
              const isExpanded = hasChildren
                ? item.label === "Settings"
                  ? settingsOpen
                  : item.label === "Marketing"
                  ? marketingOpen
                  : false
                : false;
              const isActive = hasChildren 
                ? pathname === item.path && !childActive 
                : pathname === item.path || 
                  (item.path === '/admin/settings/staff' && isStaffPath);
              const shouldHighlight = hasChildren && item.label === "Settings"
                ? isActive
                : isActive;

              return (
                <div key={item.path}>
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!sidebarOpen) return;
                        if (item.label === "Settings") {
                          setSettingsOpen((prev) => !prev);
                        }
                        if (item.label === "Marketing") {
                          setMarketingOpen((prev) => !prev);
                        }
                      }}
                      className={`relative flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        shouldHighlight
                          ? "text-white shadow-lg neon-cyan"
                          : theme === 'dark' 
                            ? "text-gray-300 hover:bg-white/5 hover:text-cyan-300"
                            : "text-black hover:bg-black/5"
                      }`}
                      style={shouldHighlight ? { background: 'linear-gradient(135deg, #00D4E8 0%, #00BCD4 100%)' } : {}}
                    >
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", item.iconBg, item.iconColor)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-sm font-medium text-left" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{item.label}</span>
                          <ChevronDown
                            className={`absolute right-3 h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </>
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.path}
                      onClick={() => { setSettingsOpen(false); setMarketingOpen(false); }}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        isActive
                          ? "text-white shadow-lg neon-cyan"
                          : theme === 'dark'
                            ? "text-gray-300 hover:bg-white/5 hover:text-cyan-300"
                            : "text-black hover:bg-black/5"
                      }`}
                      style={isActive ? { background: 'linear-gradient(135deg, #00D4E8 0%, #00BCD4 100%)' } : {}}
                    >
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", item.iconBg, item.iconColor)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-sm font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{item.label}</span>
                          {shouldHighlight && <ChevronRight className="h-4 w-4" />}
                        </>
                      )}
                    </Link>
                  )}

                  {hasChildren && sidebarOpen && isExpanded && (
                    <div className="mt-1 space-y-1">
                      {(item as any).children.map((child: any) => {
                        const childHasChildren = Array.isArray(child.children);
                        const childActive = pathname === child.path;
                        const grandchildActive = childHasChildren
                          ? child.children.some((gc: { path: string }) => pathname === gc.path)
                          : false;
                        if (childHasChildren) {
                          return (
                            <div key={child.path}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.label === "Settings" && child.label === "Account") {
                                    setAccountOpen((prev) => !prev);
                                  }
                                  if (item.label === "Settings" && child.label === "Industries") {
                                    setIndustriesOpen((prev) => !prev);
                                  }
                                }}
                                className={`relative flex w-full items-center gap-2 rounded-lg py-2 pl-8 pr-3 text-sm transition-all ${
                                  (item.label === 'Settings' && child.label === 'Industries')
                                    ? "text-gray-300 hover:bg-white/5 hover:text-cyan-300"
                                    : (childActive || grandchildActive
                                      ? "text-white shadow neon-cyan"
                                      : "text-gray-300 hover:bg-white/5 hover:text-cyan-300")
                                }`}
                                style={(item.label === 'Settings' && child.label === 'Industries')
                                  ? {}
                                  : (childActive || grandchildActive ? { background: 'linear-gradient(135deg, #00D4E8 0%, #00BCD4 100%)' } : {})}
                              >
                                <span className="flex-1 text-left" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{child.label}</span>
                                <ChevronDown className={`h-4 w-4 transition-transform ${
                                  (child.label === 'Account' && accountOpen) || (child.label === 'Industries' && industriesOpen)
                                    ? 'rotate-180'
                                    : ''
                                }`} />
                              </button>
                              {(child.label === 'Account' ? accountOpen : child.label === 'Industries' ? industriesOpen : false) && (
                                <div className="mt-1 space-y-1">
                                  {child.children.map((gc: any) => {
                                    const gcHasChildren = Array.isArray(gc.children);
                                    const gcActive = pathname === gc.path;
                                    const isAddIndustries = gc.label === 'Add Industries';
                                    const addIndustriesActive = isAddIndustries && pathname === '/admin/settings/industries' && !searchParams.get('industry');
                                    if (gcHasChildren) {
                                      const key = gc.path as string;
                                      const open = !!openIndustryMenus[key];
                                      return (
                                        <div key={gc.path}>
                                          <button
                                            type="button"
                                            onClick={() => setOpenIndustryMenus((m) => ({ ...m, [key]: !open }))}
                                            className={`relative flex w-full items-center gap-2 rounded-lg py-2 pl-12 pr-3 text-sm transition-all text-gray-300 hover:bg-white/5 hover:text-cyan-300`}
                                            style={{}}
                                          >
                                            <span className="flex-1 text-left" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{gc.label}</span>
                                            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                                          </button>
                                          {open && (
                                            <div className="mt-1 space-y-1">
                                              {gc.children.map((ggc: any) => {
                                                const ggcHasChildren = Array.isArray(ggc.children);
                                                const ggcActive = pathname === ggc.path;
                                                if (ggcHasChildren) {
                                                  const subKey = ggc.path as string;
                                                  const subOpen = !!openIndustryMenus[subKey];
                                                  return (
                                                    <div key={ggc.path}>
                                                      <button
                                                        type="button"
                                                        onClick={() => setOpenIndustryMenus((m) => ({ ...m, [subKey]: !subOpen }))}
                                                        className={`relative flex w-full items-center gap-2 rounded-lg py-2 pl-16 pr-3 text-sm transition-all text-gray-300 hover:bg-white/5 hover:text-cyan-300`}
                                                        style={{}}
                                                      >
                                                        <span className="flex-1 text-left" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{ggc.label}</span>
                                                        <ChevronDown className={`h-4 w-4 transition-transform ${subOpen ? 'rotate-180' : ''}`} />
                                                      </button>
                                                      {subOpen && (
                                                        <div className="mt-1 space-y-1">
                                                          {ggc.children.map((gggc: { label: string; path: string }) => {
                                                            const gggcBase = (gggc.path || '').split('?')[0];
                                                            const gggcActive = pathname === gggcBase;
                                                            return (
                                                              <Link
                                                                key={gggc.path}
                                                                href={gggc.path}
                                                                className={`relative flex items-center rounded-lg py-2 pl-20 pr-3 text-sm transition-all ${
                                                                  gggcActive ? 'text-white shadow neon-cyan' : 'text-gray-300 hover:bg-white/5 hover:text-cyan-300'
                                                                }`}
                                                                style={gggcActive ? { background: 'linear-gradient(135deg, #00D4E8 0%, #00BCD4 100%)' } : {}}
                                                              >
                                                                <span style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{gggc.label}</span>
                                                              </Link>
                                                            );
                                                          })}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                }
                                                return (
                                                  <Link
                                                    key={ggc.path}
                                                    href={ggc.path}
                                                    className={`relative flex items-center rounded-lg py-2 pl-16 pr-3 text-sm transition-all text-gray-300 hover:bg-white/5 hover:text-cyan-300`}
                                                    style={{}}
                                                  >
                                                    <span style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{ggc.label}</span>
                                                  </Link>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                    return (
                                      <Link
                                        key={gc.path}
                                        href={gc.path}
                                        className={`relative flex items-center rounded-lg py-2 pl-12 pr-3 text-sm transition-all ${
                                          addIndustriesActive
                                            ? 'text-white shadow neon-cyan'
                                            : 'text-gray-300 hover:bg-white/5 hover:text-cyan-300'
                                        }`}
                                        style={addIndustriesActive ? { background: 'linear-gradient(135deg, #00D4E8 0%, #00BCD4 100%)' } : {}}
                                      >
                                        <span>{gc.label}</span>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return (
                          <Link
                            key={child.path}
                            href={child.path}
                            className={`relative flex items-center rounded-lg py-2 pl-8 pr-3 text-sm transition-all ${
                              childActive
                                ? "text-white shadow neon-cyan"
                                : "text-gray-300 hover:bg-white/5 hover:text-cyan-300"
                            }`}
                            style={childActive ? { background: 'linear-gradient(135deg, #00D4E8 0%, #00BCD4 100%)' } : {}}
                          >
                            <span style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Profile Dropdown */}
          <div className="p-4 border-t border-cyan-500/20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 text-gray-300 hover:text-cyan-300 hover:bg-white/5 ${
                    !sidebarOpen && "justify-center px-2"
                  }`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage 
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(adminEmail)}`} 
                      alt={adminEmail} 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <AvatarFallback>{adminEmail.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {sidebarOpen && (
                    <>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-cyan-300" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{adminEmail.split('@')[0]}</p>
                        <p className="text-xs text-cyan-300/60 truncate" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{adminEmail}</p>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/admin/profile")} style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-30 shadow-lg glass-header">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-cyan-300' : 'text-black'}`} style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>
                {(() => {
                  const special = pathname === "/admin/add-booking" ? "New Booking" : null;
                  if (special) return special;
                  if (pathname?.startsWith("/admin/customers/") && pathname !== "/admin/customers") {
                    return "Customer Profile";
                  }
                  if (pathname?.startsWith("/admin/providers/") && pathname !== "/admin/providers") {
                    return "Provider Profile";
                  }
                  // Find the active menu item by checking paths
                  const findActiveLabel = (items: any[], currentPath: string): string | undefined => {
                    for (const item of items) {
                      if (item.path === currentPath) return item.label;
                      if (item.children) {
                        const childMatch = findActiveLabel(item.children, currentPath);
                        if (childMatch) return childMatch;
                      }
                    }
                    return undefined;
                  };
                  
                  return findActiveLabel(menuItems, pathname || '') || 'Dashboard';
                })()}
              </h1>
              {pathname === "/admin/dashboard" && (
                <p className={`text-sm ${theme === 'dark' ? 'text-cyan-300/70' : 'text-black/70'}`} style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                  Welcome back, {adminEmail.split('@')[0]}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleTheme}
                className={`${theme === 'dark' ? 'hover:bg-white/5 text-cyan-300' : 'hover:bg-black/5 text-black'}`}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              {/* Notifications Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="relative hover:bg-white/5 text-cyan-300"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] rounded-full flex items-center justify-center neon-purple">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex items-center justify-between gap-2">
                    <span>Notifications</span>
                    <div className="ml-auto flex items-center gap-3">
                      <button onClick={markAllAsRead} className="text-xs text-cyan-400 hover:underline">Mark all as read</button>
                      <span className="text-gray-400">·</span>
                      <button onClick={clearAllNotifications} className="text-xs text-pink-400 hover:underline">Clear all</button>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 && (
                    <div className="p-3 text-sm text-gray-400">No notifications</div>
                  )}
                  {notifications.map((n) => (
                    <DropdownMenuItem key={n.id} className="flex items-start gap-2 py-3">
                      <div className={`mt-1 h-2 w-2 rounded-full ${n.read ? 'bg-gray-500/30' : 'bg-cyan-400 neon-cyan'}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{n.title}</div>
                        <div className="text-xs text-muted-foreground">{n.description}</div>
                      </div>
                      <button
                        className="ml-2 text-xs text-gray-400 hover:text-pink-400"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteNotification(n.id); }}
                        aria-label="Delete notification"
                      >
                        Delete
                      </button>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant="outline"
                onClick={() => router.push("/admin/website-builder")}
                className={`border border-cyan-500/30 bg-white/5 h-9 px-3 neon-cyan ${
                  theme === 'light' ? 'text-black hover:text-black' : 'text-cyan-300 hover:text-white'
                }`}
                onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #00D4E8 0%, #00BCD4 100%)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                <Layout className="h-4 w-4 mr-2" />
                Edit Website
              </Button>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-all border border-cyan-500/30 bg-white/5 h-9 px-3 neon-cyan ${
                  theme === 'light' ? 'text-black hover:text-black' : 'text-cyan-300 hover:text-white'
                }`}
                onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #00D4E8 0%, #00BCD4 100%)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                View Website
              </a>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
