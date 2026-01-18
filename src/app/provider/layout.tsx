"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Calendar, 
  DollarSign, 
  User, 
  LogOut,
  Menu,
  X,
  Clock,
  Settings,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Providers } from "@/app/providers";

const navigation = [
  { name: "Dashboard", href: "/provider/dashboard", icon: LayoutDashboard },
  { name: "My Bookings", href: "/provider/bookings", icon: Calendar },
  { name: "Earnings", href: "/provider/earnings", icon: DollarSign },
  { name: "Profile", href: "/provider/profile", icon: User },
  { name: "Manage Availability", href: "/provider/availability", icon: Clock },
  { name: "Settings", href: "/provider/settings", icon: Settings },
  { name: "My Drive", href: "/provider/drive", icon: FolderOpen },
];

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [providerName, setProviderName] = useState("Provider");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push("/auth/login");
          return;
        }

        // Get provider name from user metadata and validate role
        const userRole = session.user.user_metadata?.role || 'owner';
        if (session.user.user_metadata?.full_name) {
          setProviderName(session.user.user_metadata.full_name);
        }

        // Check if user is a provider
        if (userRole !== 'provider') {
          console.log('User is not a provider, redirecting to appropriate dashboard');
          const redirectPath = userRole === 'owner' ? '/admin/dashboard' : '/auth/onboarding';
          router.push(redirectPath);
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push("/auth/login");
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/auth/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      
      router.push("/auth/login");
    } catch (error) {
      console.error('Logout error:', error);
      router.push("/auth/login");
    }
  };

  return (
    <Providers>
      <div className="min-h-screen bg-background">
        {/* Mobile menu button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Sidebar */}
        <aside
          className={`
            fixed top-0 left-0 z-40 h-screen w-64 bg-card border-r border-border
            transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            lg:translate-x-0
          `}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <img src="/images/orbit.png" alt="Orbit Booking" className="h-10 w-10" />
                <div>
                  <h1 className="text-lg font-bold" style={{ color: '#0C2B4E' }}>Orbyt Booking</h1>
                  <p className="text-xs text-muted-foreground">Provider Portal</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-colors
                      ${
                        isActive
                          ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-border">
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-3" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="lg:pl-64">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </Providers>
  );
}
