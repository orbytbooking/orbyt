"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { adminImpersonateProvider } from "@/lib/adminProviderImpersonation";
import { useBusiness } from "@/contexts/BusinessContext";
import {
  UserCog,
  Search,
  MoreVertical,
  Plus,
  Mail,
  Phone,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  LogIn,
  Loader2,
} from "lucide-react";

const PROVIDERS_STORAGE_KEY = "adminProviders";

type ProviderStatus = "active" | "inactive" | "suspended";

type Provider = {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  rating: number;
  completedJobs: number;
  status: ProviderStatus;
  joinedDate: string;
  /** Linked Supabase auth user — required for “Log in as provider” */
  userId: string | null;
};

const getStatusBadge = (status: string) => {
  const styles = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    inactive: "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400",
    suspended: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  };

  const icons = {
    active: CheckCircle2,
    inactive: Clock,
    suspended: XCircle,
  };

  const Icon = icons[status as keyof typeof icons] || Clock;

  return (
    <Badge
      variant="outline"
      className={`${styles[status as keyof typeof styles]}`}
    >
      <Icon className="h-3 w-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const ProvidersPage = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonateProviderId, setImpersonateProviderId] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentBusiness, loading: businessLoading } = useBusiness();

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        // Wait for business context to load
        if (businessLoading || !currentBusiness) {
          return;
        }

        const currentBusinessId = currentBusiness.id;

        console.log('Fetching providers from database for business:', currentBusinessId, 'showInactive:', showInactive);

        // Fetch providers from database; by default only active (deactivated do not display)
        let query = supabase
          .from('service_providers')
          .select(`
            id,
            user_id,
            first_name,
            last_name,
            email,
            phone,
            specialization,
            rating,
            completed_jobs,
            status,
            provider_type,
            created_at
          `)
          .eq('business_id', currentBusinessId)
          .order('created_at', { ascending: false });
        if (!showInactive) {
          query = query.eq('status', 'active');
        }
        const { data: providersData, error } = await query;

        if (error) {
          console.error('Error fetching providers:', error);
          toast({
            title: "Error",
            description: "Failed to load providers from database.",
            variant: "destructive",
          });
          setProviders([]); // Empty array on error
        } else {
          // Transform database data to match Provider interface
          const transformedProviders: Provider[] = providersData.map((p: {
            id: string;
            user_id?: string | null;
            first_name: string;
            last_name: string;
            email: string;
            phone?: string | null;
            specialization?: string | null;
            rating?: string | number | null;
            completed_jobs?: number | null;
            status: string;
            created_at?: string | null;
          }) => ({
            id: p.id,
            userId: p.user_id ?? null,
            name: `${p.first_name} ${p.last_name}`,
            email: p.email,
            phone: p.phone || '+1 (555) 000-0000',
            specialization: p.specialization || 'General Services',
            rating: parseFloat(String(p.rating ?? 0)) || 0,
            completedJobs: p.completed_jobs || 0,
            status: p.status as ProviderStatus,
            joinedDate: p.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          }));
          
          setProviders(transformedProviders);
          console.log('Successfully loaded providers from database:', transformedProviders.length);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setProviders([]); // Empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [toast, businessLoading, currentBusiness, showInactive]);

  const filteredProviders = providers.filter(
    (provider) =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImpersonateProvider = useCallback(
    async (provider: Provider) => {
      if (!provider.userId) {
        toast({
          title: "No portal login",
          description: `Create a login account for ${provider.name} on their profile page first.`,
          variant: "destructive",
        });
        return;
      }
      setImpersonateProviderId(provider.id);
      try {
        const result = await adminImpersonateProvider(provider.id);
        if (!result.ok) {
          toast({
            title: "Could not log in as provider",
            description: result.error,
            variant: "destructive",
          });
        }
      } finally {
        setImpersonateProviderId(null);
      }
    },
    [toast]
  );

  const activeCount = providers.filter((p) => p.status === "active").length;
  const stats = [
    {
      title: "Total Providers",
      value: providers.length,
      icon: UserCog,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "Active Providers",
      value: activeCount,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      title: "Avg Rating",
      value: providers.length
        ? (providers.reduce((acc, p) => acc + p.rating, 0) / providers.length).toFixed(1)
        : "0",
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    },
    {
      title: "Total Jobs",
      value: providers.reduce((acc, p) => acc + p.completedJobs, 0),
      icon: CheckCircle2,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Providers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Service Providers</CardTitle>
              <div className="text-sm text-muted-foreground max-w-xl">
                Manage providers and use{" "}
                <span className="text-purple-200 font-medium">Log in as provider</span>{" "}
                to open their portal without a password (like platform super-admin → tenant). Your admin session stays as-is.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-500/20"
                onClick={() => window.open('/provider/login', '_blank')}
                title="Open Provider Portal Login"
              >
                <UserCog className="h-4 w-4 mr-2" />
                Provider Portal
              </Button>
              <Button
                className="relative overflow-hidden group text-white border-cyan-400/50 hover:border-cyan-400 transition-all duration-300"
                variant="outline"
                onClick={() => router.push("/admin/add-provider")}
              >
                <span className="absolute inset-0 w-0 bg-gradient-to-r from-cyan-400/20 to-cyan-300/20 group-hover:w-full transition-all duration-300 ease-in-out"></span>
                <span className="relative z-10 flex items-center">
                  <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  <span className="group-hover:translate-x-1 transition-transform">Add Provider</span>
                </span>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
              <Input
                placeholder="Search providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-white placeholder:text-white/50 bg-white/5 border-0 focus-visible:ring-2 focus-visible:ring-white/30"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-white/30 bg-white/5 text-cyan-500 focus:ring-cyan-500"
              />
              Show inactive providers
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {loading || businessLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="ml-2 text-white/70">Loading providers...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Completed Jobs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProviders.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                        {provider.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <Link href={`/admin/providers/${provider.id}`} className="font-medium text-white hover:text-cyan-300 transition-colors">
                        {provider.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <Link href={`/admin/providers/${provider.id}`} className="text-white/80 hover:text-cyan-300 transition-colors">
                          {provider.email}
                        </Link>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {provider.phone}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{provider.specialization}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{provider.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell>{provider.completedJobs}</TableCell>
                  <TableCell>{getStatusBadge(provider.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleImpersonateProvider(provider)}
                        disabled={!!impersonateProviderId || !provider.userId}
                        title={
                          provider.userId
                            ? "Open provider portal as this user (no password)"
                            : "Create a portal login on the provider profile first"
                        }
                        className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded hover:bg-purple-100 disabled:opacity-50 dark:text-purple-200 dark:bg-purple-950/50 dark:hover:bg-purple-900/40"
                      >
                        {impersonateProviderId === provider.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <LogIn className="h-3.5 w-3.5 mr-1" />
                        )}
                        Log in as provider
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="More actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push(`/admin/providers/${provider.id}`)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/providers/${provider.id}?tab=profile`)}>
                          Edit Provider
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/providers/${provider.id}?tab=dashboard`)}>
                          View Provider Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/providers/${provider.id}?tab=schedule`)}>
                          Manage Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          toast({
                            title: "View Jobs",
                            description: `Viewing jobs for ${provider.name}`,
                          });
                        }}>
                          View Jobs
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => {
                            const newStatus: ProviderStatus = provider.status === 'suspended' ? 'active' : 'suspended';
                            setProviders(providers.map(p => 
                              p.id === provider.id 
                                ? { ...p, status: newStatus }
                                : p
                            ));
                            toast({
                              title: newStatus === 'suspended' ? "Provider Suspended" : "Provider Activated",
                              description: `${provider.name} has been ${newStatus === 'suspended' ? 'suspended' : 'activated'}.`,
                            });
                          }}
                        >
                          {provider.status === 'suspended' ? 'Activate Provider' : 'Suspend Provider'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default ProvidersPage;
