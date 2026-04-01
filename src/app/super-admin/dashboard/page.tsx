'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Clock,
  LogOut,
  Bell,
  Search,
  Download,
  RefreshCw,
  Shield,
  CreditCard,
  UserPlus,
  Menu,
  X,
  ChevronDown,
  Home,
  HelpCircle,
  UserCheck,
  PieChart,
  Users2,
  MessageSquare,
  TrendingDown,
  Sparkles,
  Eye,
  Mail,
  Phone,
  MapPin,
  Globe,
  User,
  FileText,
  Calendar,
  Loader2,
  Tag,
  Folder,
  Pencil,
  Trash2,
  LogIn,
  UserX,
  Plus,
  Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { supabaseSuperAdmin } from '@/lib/supabase-super-admin';
import { openStripeHostedPopup } from '@/lib/stripe/openStripeHostedPopup';
import { SuperAdminSupportPlaybook } from '@/components/super-admin/SuperAdminSupportPlaybook';
import { SuperAdminBillingPlaybook } from '@/components/super-admin/SuperAdminBillingPlaybook';
import { SuperAdminPlatformPlansPanel } from '@/components/super-admin/SuperAdminPlatformPlansPanel';
import { SuperAdminNotificationInboxPanel } from '@/components/super-admin/SuperAdminNotificationInboxPanel';
import {
  NotificationDetailDialog,
  type NotificationDetailItem,
} from '@/components/notifications/NotificationDetailDialog';
import { PLATFORM_NOTIF_ID_PREFIX, parseSupportNotificationId } from '@/lib/platform-announcement-notifications';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

function formatRelativeTime(iso: string | undefined) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  let diff = Date.now() - t;
  if (diff < 0) diff = 0;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

const VALID_SUPER_ADMIN_DASHBOARD_TABS = new Set([
  'overview',
  'businesses',
  'billing',
  'plans',
  'users',
  'analytics',
  'notifications',
  'support',
  'settings',
]);

type SuperAdminHeaderNotification = {
  id: string;
  title: string;
  description: string;
  read: boolean;
  created_at?: string;
  source?: 'platform' | 'support' | 'admin';
  level?: string | null;
  audience?: string | null;
};

interface DashboardStats {
  totalBusinesses: number;
  activeBusinesses: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalUsers: number;
  activeUsers: number;
  newBusinessesThisMonth: number;
  churnRate: number;
  trialUsers: number;
  conversionRate: number;
  supportTickets: number;
  avgResponseTime: number;
  totalBookings?: number;
  bookingsThisMonth?: number;
  averageRevenuePerBusiness?: number;
  stripeConnectedCount?: number;
  activeSubscriptions?: number;
  canceledSubscriptions?: number;
  trialSubscriptions?: number;
}

interface SubscriptionsData {
  active: number;
  canceled: number;
  trial: number;
  total: number;
}

interface PlatformSubscriptionRow {
  id: string;
  business_id: string;
  business_name: string;
  plan_name: string;
  plan_slug: string;
  amount_cents: number;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  updated_at: string | null;
}

interface BillingData {
  averageRevenuePerBusiness: number;
  stripeConnectedCount: number;
  totalBusinessesForBilling: number;
  revenueByPlan: { plan: string; revenue: number; businessCount: number }[];
  recentPayments: { id?: string; business_id?: string; business_name: string; amount: number; date?: string; service: string; customer_name: string }[];
  upcomingPayments?: {
    totalAmount: number;
    count: number;
    items: { id?: string; business_id?: string; business_name: string; amount: number; scheduled_date?: string; scheduled_time?: string; service: string; customer_name: string }[];
  };
  platformSubscriptions?: PlatformSubscriptionRow[];
  paymentIssueCounts?: { failed: number; refunded: number; pending: number };
}

interface ChartData {
  revenueByMonth: { month: string; revenue: number; label: string }[];
  bookingsByStatus: { status: string; count: number }[];
  businessesByPlan: { plan: string; count: number }[];
}

interface Business {
  id: string;
  name: string;
  owner_name: string;
  owner_email: string;
  subscription_status: string;
  trial_ends_at: string | null;
  plan_name: string;
  created_at: string;
  is_featured: boolean;
  monthly_revenue: number;
  total_bookings: number;
  last_active: string;
  is_active?: boolean;
}

interface PlatformUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  business_count: number;
}

type PeopleKind = 'owner' | 'provider' | 'customer';

type PeopleRow = {
  kind: PeopleKind;
  id: string;
  full_name: string;
  email: string;
  business_name: string;
  business_id?: string;
  status: string;
  created_at?: string;
};

interface SupportTicket {
  id: string;
  subject: string;
  business_id?: string;
  business_name: string;
  priority: string;
  status: string;
  requester_email?: string;
  assigned_to: string;
  created_at: string;
  updated_at?: string;
  message?: string;
}

interface BusinessDetailData {
  business: {
    id: string;
    name: string;
    address?: string;
    plan?: string;
    created_at: string;
    updated_at?: string;
    is_active?: boolean;
    business_email?: string;
    business_phone?: string;
    city?: string;
    zip_code?: string;
    website?: string;
    description?: string;
    category?: string;
    subdomain?: string;
    domain?: string;
    logo_url?: string;
    owner_name?: string;
    owner_email?: string;
  };
  counts: { bookings: number; providers: number; customers: number; team_profiles?: number };
  totalRevenue: number;
  storageUsedBytes?: number;
  storageLimitBytes?: number;
  recentBookings: Array<{
    id: string;
    service?: string;
    scheduled_date?: string;
    scheduled_time?: string;
    status: string;
    total_price?: number;
    customer_name?: string;
  }>;
  subscription?: {
    planName: string;
    planSlug: string;
    status: string;
    amountCents: number;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
  };
  recentSubscriptionPayments?: Array<{ paid_at: string; amount_cents: number; description?: string }>;
  paymentIssueCounts?: { failed: number; refunded: number; pending: number };
  recentPlatformPayments?: Array<{
    id?: string;
    paid_at: string;
    amount_cents: number;
    description?: string;
    status: string;
    plan_slug?: string | null;
  }>;
}

interface PlatformSettingsData {
  platform_display_name: string;
  support_email: string;
  status_page_url: string;
  maintenance_mode_enabled: boolean;
  enforce_admin_mfa: boolean;
  send_incident_alerts: boolean;
  send_weekly_digest: boolean;
  session_timeout_hours: number;
}

const FALLBACK_PLAN_OPTIONS: { slug: string; name: string; is_active: boolean; amount_cents: number }[] = [
  { slug: 'starter', name: 'Starter', is_active: true, amount_cents: 0 },
  { slug: 'growth', name: 'Growth', is_active: true, amount_cents: 0 },
  { slug: 'premium', name: 'Premium', is_active: true, amount_cents: 0 },
];

function EditBusinessModalInline({
  businessId,
  onClose,
  onSaved,
  setSaveLoading,
}: {
  businessId: string;
  onClose: () => void;
  onSaved: () => void;
  setSaveLoading: (v: boolean) => void;
}) {
  const [form, setForm] = useState<{ name: string; plan: string; is_active: boolean; business_email: string; business_phone: string; address: string; city: string; zip_code: string; website: string; description: string }>({ name: '', plan: 'starter', is_active: true, business_email: '', business_phone: '', address: '', city: '', zip_code: '', website: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planOptions, setPlanOptions] = useState<typeof FALLBACK_PLAN_OPTIONS>([]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/super-admin/platform-plans', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        const rows = (j.plans ?? []) as typeof FALLBACK_PLAN_OPTIONS;
        setPlanOptions(rows.length ? rows : FALLBACK_PLAN_OPTIONS);
      })
      .catch(() => {
        if (mounted) setPlanOptions(FALLBACK_PLAN_OPTIONS);
      });
    return () => { mounted = false; };
  }, [businessId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetch(`/api/super-admin/businesses/${businessId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        const b = data.business || data;
        setForm({
          name: b.name ?? '',
          plan: (b.plan || 'starter').toString().toLowerCase(),
          is_active: b.is_active !== false,
          business_email: b.business_email ?? '',
          business_phone: b.business_phone ?? '',
          address: b.address ?? '',
          city: b.city ?? '',
          zip_code: b.zip_code ?? '',
          website: b.website ?? '',
          description: b.description ?? '',
        });
      })
      .catch(() => { if (mounted) setError('Failed to load'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [businessId]);

  const handleSave = () => {
    setSaveLoading(true);
    fetch(`/api/super-admin/businesses/${businessId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form),
    })
      .then((r) => r.ok ? onSaved() : r.json().then((d) => { setError(d.error || 'Failed to save'); }))
      .finally(() => setSaveLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Edit business</h3>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {loading && <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  {(planOptions.length ? planOptions : FALLBACK_PLAN_OPTIONS)
                    .filter((p) => p.is_active !== false || p.slug === form.plan)
                    .sort((a, b) => a.amount_cents - b.amount_cents)
                    .map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name} ({p.slug}){p.is_active === false ? ' — inactive' : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="edit-active" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                <label htmlFor="edit-active" className="text-sm text-gray-700">Account active</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business email</label>
                <input type="email" value={form.business_email} onChange={(e) => setForm((f) => ({ ...f, business_email: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business phone</label>
                <input type="text" value={form.business_phone} onChange={(e) => setForm((f) => ({ ...f, business_phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input type="text" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zip code</label>
                  <input type="text" value={form.zip_code} onChange={(e) => setForm((f) => ({ ...f, zip_code: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input type="text" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </>
          )}
        </div>
        {!loading && (
          <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateBusinessModalInline({
  onClose,
  onCreated,
  setLoading,
}: {
  onClose: () => void;
  onCreated: () => void;
  setLoading: (v: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('starter');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [planOptions, setPlanOptions] = useState<typeof FALLBACK_PLAN_OPTIONS>([]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/super-admin/platform-plans', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        const rows = (j.plans ?? []) as typeof FALLBACK_PLAN_OPTIONS;
        const list = rows.length ? rows : FALLBACK_PLAN_OPTIONS;
        setPlanOptions(list);
        const active = list.filter((p) => p.is_active !== false).sort((a, b) => a.amount_cents - b.amount_cents);
        setPlan((cur) => {
          if (active.length && !active.some((p) => p.slug === cur)) return active[0].slug;
          return cur;
        });
      })
      .catch(() => {
        if (mounted) setPlanOptions(FALLBACK_PLAN_OPTIONS);
      });
    return () => { mounted = false; };
  }, []);

  const handleCreate = () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setError(null);
    setLoading(true);
    fetch('/api/super-admin/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: name.trim(), plan, owner_email: ownerEmail.trim() || undefined }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        setLoading(false);
        onCreated();
      })
      .catch(() => { setError('Failed to create'); setLoading(false); });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Create business</h3>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Business name" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              {(() => {
                const base = planOptions.length ? planOptions : FALLBACK_PLAN_OPTIONS;
                const active = base.filter((p) => p.is_active !== false).sort((a, b) => a.amount_cents - b.amount_cents);
                const opts = active.length ? active : base;
                return opts.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name} ({p.slug})
                  </option>
                ));
              })()}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Owner email (optional)</label>
            <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="Link existing user by email" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={handleCreate} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Create</button>
        </div>
      </div>
    </div>
  );
}

function SuperAdminDashboardInner() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalBusinesses: 0,
    activeBusinesses: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalUsers: 0,
    activeUsers: 0,
    newBusinessesThisMonth: 0,
    churnRate: 0,
    trialUsers: 0,
    conversionRate: 0,
    supportTickets: 0,
    avgResponseTime: 0,
    totalBookings: 0,
    bookingsThisMonth: 0,
    averageRevenuePerBusiness: 0,
    stripeConnectedCount: 0,
    activeSubscriptions: 0,
    canceledSubscriptions: 0,
    trialSubscriptions: 0,
  });

  const [billingData, setBillingData] = useState<BillingData>({
    averageRevenuePerBusiness: 0,
    stripeConnectedCount: 0,
    totalBusinessesForBilling: 0,
    revenueByPlan: [],
    recentPayments: [],
    upcomingPayments: { totalAmount: 0, count: 0, items: [] },
    platformSubscriptions: [],
    paymentIssueCounts: { failed: 0, refunded: 0, pending: 0 },
  });
  const [billingTableFilter, setBillingTableFilter] = useState<'all' | 'attention' | 'active' | 'past_due' | 'canceled'>('all');

  const [subscriptionsData, setSubscriptionsData] = useState<SubscriptionsData>({
    active: 0,
    canceled: 0,
    trial: 0,
    total: 0,
  });

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [providers, setProviders] = useState<
    { id: string; business_id: string; business_name: string; full_name: string; email: string; status: string; created_at: string }[]
  >([]);
  const [customers, setCustomers] = useState<
    { id: string; business_id: string; business_name: string; full_name: string; email: string; status: string; created_at: string }[]
  >([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [peopleTypeFilter, setPeopleTypeFilter] = useState<PeopleKind | 'all'>('all');
  const [peopleStatusFilter, setPeopleStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [personDetailOpen, setPersonDetailOpen] = useState(false);
  const [personDetailLoading, setPersonDetailLoading] = useState(false);
  const [personDetailError, setPersonDetailError] = useState<string | null>(null);
  const [personDetail, setPersonDetail] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [notifTab, setNotifTab] = useState<'announcements' | 'templates' | 'inbox'>('announcements');
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    body: '',
    level: 'info',
    is_active: true,
    audience: 'all' as 'all' | 'owners' | 'providers' | 'customers',
  });
  const [newTemplate, setNewTemplate] = useState({ key: '', name: '', subject: '', body_text: '', body_html: '', is_active: true });
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [headerNotifications, setHeaderNotifications] = useState<SuperAdminHeaderNotification[]>([]);
  const [headerNotificationsLoading, setHeaderNotificationsLoading] = useState(false);
  const [headerNotifDetail, setHeaderNotifDetail] = useState<NotificationDetailItem | null>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [businessDetailModalId, setBusinessDetailModalId] = useState<string | null>(null);
  const [businessDetailData, setBusinessDetailData] = useState<BusinessDetailData | null>(null);
  const [businessDetailLoading, setBusinessDetailLoading] = useState(false);
  const [businessDetailError, setBusinessDetailError] = useState<string | null>(null);
  const [billingPortalLoadingId, setBillingPortalLoadingId] = useState<string | null>(null);
  const [editBusinessId, setEditBusinessId] = useState<string | null>(null);
  const [createBusinessOpen, setCreateBusinessOpen] = useState(false);
  const [deleteConfirmBusinessId, setDeleteConfirmBusinessId] = useState<string | null>(null);
  const [impersonateLoadingId, setImpersonateLoadingId] = useState<string | null>(null);
  const [saveBusinessLoading, setSaveBusinessLoading] = useState(false);
  const [createBusinessLoading, setCreateBusinessLoading] = useState(false);
  const [supportTicketDetailId, setSupportTicketDetailId] = useState<string | null>(null);
  const [supportNewTicketOpen, setSupportNewTicketOpen] = useState(false);
  const [supportFilterStatus, setSupportFilterStatus] = useState<string>('');
  const [supportFilterPriority, setSupportFilterPriority] = useState<string>('');
  const [newTicketBusinessId, setNewTicketBusinessId] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [newTicketPriority, setNewTicketPriority] = useState('medium');
  const [newTicketLoading, setNewTicketLoading] = useState(false);
  const [ticketEditStatus, setTicketEditStatus] = useState('');
  const [ticketEditAssignedTo, setTicketEditAssignedTo] = useState('');
  const [ticketSaveLoading, setTicketSaveLoading] = useState(false);
  const [supportTicketDetail, setSupportTicketDetail] = useState<SupportTicket | null>(null);
  const [supportTicketDetailLoading, setSupportTicketDetailLoading] = useState(false);
  const [platformDisplayName, setPlatformDisplayName] = useState('Orbyt Service Platform');
  const [platformSupportEmail, setPlatformSupportEmail] = useState('support@orbyt.com');
  const [platformStatusPageUrl, setPlatformStatusPageUrl] = useState('https://status.orbyt.com');
  const [maintenanceModeEnabled, setMaintenanceModeEnabled] = useState(false);
  const [enforceAdminMfa, setEnforceAdminMfa] = useState(true);
  const [sendIncidentAlerts, setSendIncidentAlerts] = useState(true);
  const [sendWeeklyDigest, setSendWeeklyDigest] = useState(false);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState('8');
  const [settingsSaveMessage, setSettingsSaveMessage] = useState('');
  const [settingsMessageType, setSettingsMessageType] = useState<'success' | 'error'>('success');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [chartData, setChartData] = useState<ChartData>({
    revenueByMonth: [],
    bookingsByStatus: [],
    businessesByPlan: [],
  });

  const fetchHeaderNotifications = useCallback(async () => {
    setHeaderNotificationsLoading(true);
    try {
      const res = await fetch('/api/super-admin/notifications', { credentials: 'include' });
      if (!res.ok) {
        setHeaderNotifications([]);
        return;
      }
      const data = await res.json();
      setHeaderNotifications(data.notifications ?? []);
    } catch {
      setHeaderNotifications([]);
    } finally {
      setHeaderNotificationsLoading(false);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, dashRes] = await Promise.all([
        fetch('/api/super-admin/me', { credentials: 'include' }),
        fetch('/api/super-admin/dashboard', { credentials: 'include' }),
      ]);
      if (!meRes.ok) {
        setLoading(false);
        router.replace('/super-admin/login');
        return;
      }
      const meData = await meRes.json();
      setCurrentUserEmail(meData.user?.email ?? '');
      if (!dashRes.ok) {
        setLoading(false);
        return;
      }
      const data = await dashRes.json();
      setStats(data.stats ?? {
        totalBusinesses: 0,
        activeBusinesses: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        totalUsers: 0,
        activeUsers: 0,
        newBusinessesThisMonth: 0,
        churnRate: 0,
        trialUsers: 0,
        conversionRate: 0,
        supportTickets: 0,
        avgResponseTime: 0,
        totalBookings: 0,
        bookingsThisMonth: 0,
        averageRevenuePerBusiness: 0,
        stripeConnectedCount: 0,
        activeSubscriptions: 0,
        canceledSubscriptions: 0,
        trialSubscriptions: 0,
      });
      setBusinesses(data.businesses ?? []);
      setPlatformUsers(data.platformUsers ?? []);
      setProviders(data.providers ?? []);
      setCustomers(data.customers ?? []);
      setSupportTickets(data.supportTickets ?? []);
      setChartData(data.charts ?? { revenueByMonth: [], bookingsByStatus: [], businessesByPlan: [] });
      setSubscriptionsData(data.subscriptions ?? { active: 0, canceled: 0, trial: 0, total: 0 });
      setBillingData(data.billing ?? {
        averageRevenuePerBusiness: 0,
        stripeConnectedCount: 0,
        totalBusinessesForBilling: 0,
        revenueByPlan: [],
        recentPayments: [],
        upcomingPayments: { totalAmount: 0, count: 0, items: [] },
        platformSubscriptions: [],
        paymentIssueCounts: { failed: 0, refunded: 0, pending: 0 },
      });
      void fetchHeaderNotifications();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [router, fetchHeaderNotifications]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [notificationsOpen]);

  const headerUnreadCount = headerNotifications.filter((n) => !n.read).length;

  useEffect(() => {
    const tab = searchParams.get('tab');
    const ticket = searchParams.get('ticket');
    if (tab && VALID_SUPER_ADMIN_DASHBOARD_TABS.has(tab)) setActiveTab(tab);
    if (searchParams.get('notif_inbox') === '1') {
      setActiveTab('notifications');
      setNotifTab('inbox');
    }
    if (ticket && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticket)) {
      setSupportTicketDetailId(ticket);
    }
  }, [searchParams]);

  /**
   * Auth listener: sign-out only + light email refresh on token rotation.
   * Do NOT call fetchDashboardData on SIGNED_IN / USER_UPDATED — Supabase fires those on tab focus and
   * cross-tab sync, which was forcing a full dashboard reload every time you switched tabs.
   * Initial data loads via the mount effect below; use the Refresh buttons to pull latest manually.
   */
  useEffect(() => {
    const { data: { subscription } } = supabaseSuperAdmin.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/super-admin/login');
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        if (session?.user?.email) setCurrentUserEmail(session.user.email);
        return;
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const peopleRows: PeopleRow[] = (() => {
    const owners: PeopleRow[] = platformUsers.map((u) => ({
      kind: 'owner',
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      business_name: u.business_count === 1 ? '1 business' : `${u.business_count} businesses`,
      status: u.is_active ? 'active' : 'inactive',
      created_at: u.created_at,
    }));
    const prov: PeopleRow[] = providers.map((p) => ({
      kind: 'provider',
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      business_name: p.business_name,
      business_id: p.business_id,
      status: (p.status || 'active').toLowerCase(),
      created_at: p.created_at,
    }));
    const cust: PeopleRow[] = customers.map((c) => ({
      kind: 'customer',
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      business_name: c.business_name,
      business_id: c.business_id,
      status: (c.status || 'active').toLowerCase(),
      created_at: c.created_at,
    }));
    return [...owners, ...prov, ...cust];
  })();

  const filteredPeople = (() => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = (p: PeopleRow) => {
      if (!q) return true;
      return (
        (p.full_name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.business_name || '').toLowerCase().includes(q)
      );
    };
    const matchesType = (p: PeopleRow) => (peopleTypeFilter === 'all' ? true : p.kind === peopleTypeFilter);
    const matchesStatus = (p: PeopleRow) => {
      if (peopleStatusFilter === 'all') return true;
      const st = (p.status || '').toLowerCase();
      if (peopleStatusFilter === 'active') return st === 'active';
      return st === 'inactive';
    };
    const kindOrder = (k: PeopleKind) => (k === 'owner' ? 0 : k === 'provider' ? 1 : 2);
    return peopleRows
      .filter(matchesSearch)
      .filter(matchesType)
      .filter(matchesStatus)
      .sort((a, b) => {
        const dk = kindOrder(a.kind) - kindOrder(b.kind);
        if (dk !== 0) return dk;
        return (a.full_name || '').localeCompare(b.full_name || '');
      });
  })();

  const openPersonDetail = async (p: PeopleRow) => {
    setPersonDetailOpen(true);
    setPersonDetailLoading(true);
    setPersonDetailError(null);
    setPersonDetail(null);
    try {
      const res = await fetch(`/api/super-admin/people/${encodeURIComponent(p.kind)}/${encodeURIComponent(p.id)}`, {
        credentials: 'include',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed to load details');
      setPersonDetail(j);
    } catch (e) {
      setPersonDetailError(e instanceof Error ? e.message : 'Failed to load details');
    } finally {
      setPersonDetailLoading(false);
    }
  };

  const loadNotifications = async () => {
    setNotifLoading(true);
    setNotifError(null);
    try {
      const [aRes, tRes] = await Promise.all([
        fetch('/api/super-admin/announcements', { credentials: 'include' }),
        fetch('/api/super-admin/email-templates', { credentials: 'include' }),
      ]);
      const aJson = await aRes.json().catch(() => ({}));
      const tJson = await tRes.json().catch(() => ({}));
      if (aRes.status === 401 || aRes.status === 403) {
        router.replace('/super-admin/login');
        return;
      }
      if (tRes.status === 401 || tRes.status === 403) {
        router.replace('/super-admin/login');
        return;
      }
      if (!aRes.ok) throw new Error(aJson.error || 'Failed to load announcements');
      if (!tRes.ok) throw new Error(tJson.error || 'Failed to load templates');
      setAnnouncements(aJson.announcements ?? []);
      setTemplates(tJson.templates ?? []);
    } catch (e) {
      setNotifError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setNotifLoading(false);
    }
  };

  const loadPlatformSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsSaveMessage('');
    try {
      const res = await fetch('/api/super-admin/settings', { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        router.replace('/super-admin/login');
        return;
      }
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load platform settings');
      }
      const settings = (json.settings ?? {}) as PlatformSettingsData;
      setPlatformDisplayName(settings.platform_display_name ?? 'Orbyt Service Platform');
      setPlatformSupportEmail(settings.support_email ?? 'support@orbyt.com');
      setPlatformStatusPageUrl(settings.status_page_url ?? '');
      setMaintenanceModeEnabled(settings.maintenance_mode_enabled === true);
      setEnforceAdminMfa(settings.enforce_admin_mfa !== false);
      setSendIncidentAlerts(settings.send_incident_alerts !== false);
      setSendWeeklyDigest(settings.send_weekly_digest === true);
      setSessionTimeoutHours(String(settings.session_timeout_hours ?? 8));
      setSettingsLoaded(true);
    } catch (e) {
      setSettingsMessageType('error');
      setSettingsSaveMessage(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setSettingsLoading(false);
    }
  }, [router]);

  const handleSavePlatformSettings = useCallback(async () => {
    const timeout = Number(sessionTimeoutHours);
    if (!Number.isFinite(timeout) || timeout <= 0) {
      setSettingsMessageType('error');
      setSettingsSaveMessage('Session timeout must be a valid number of hours.');
      return;
    }

    setSettingsSaving(true);
    setSettingsSaveMessage('');
    try {
      const payload: PlatformSettingsData = {
        platform_display_name: platformDisplayName.trim() || 'Orbyt Service Platform',
        support_email: platformSupportEmail.trim(),
        status_page_url: platformStatusPageUrl.trim(),
        maintenance_mode_enabled: maintenanceModeEnabled,
        enforce_admin_mfa: enforceAdminMfa,
        send_incident_alerts: sendIncidentAlerts,
        send_weekly_digest: sendWeeklyDigest,
        session_timeout_hours: timeout,
      };

      const res = await fetch('/api/super-admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        router.replace('/super-admin/login');
        return;
      }
      if (!res.ok) throw new Error(json.error || 'Failed to save settings');

      const settings = (json.settings ?? payload) as PlatformSettingsData;
      setPlatformDisplayName(settings.platform_display_name ?? payload.platform_display_name);
      setPlatformSupportEmail(settings.support_email ?? payload.support_email);
      setPlatformStatusPageUrl(settings.status_page_url ?? payload.status_page_url);
      setMaintenanceModeEnabled(settings.maintenance_mode_enabled === true);
      setEnforceAdminMfa(settings.enforce_admin_mfa !== false);
      setSendIncidentAlerts(settings.send_incident_alerts !== false);
      setSendWeeklyDigest(settings.send_weekly_digest === true);
      setSessionTimeoutHours(String(settings.session_timeout_hours ?? payload.session_timeout_hours));
      setSettingsMessageType('success');
      setSettingsSaveMessage('Settings saved successfully.');
      setSettingsLoaded(true);
    } catch (e) {
      setSettingsMessageType('error');
      setSettingsSaveMessage(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  }, [
    sessionTimeoutHours,
    platformDisplayName,
    platformSupportEmail,
    platformStatusPageUrl,
    maintenanceModeEnabled,
    enforceAdminMfa,
    sendIncidentAlerts,
    sendWeeklyDigest,
    router,
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (activeTab !== 'settings' || settingsLoaded || settingsLoading) return;
    void loadPlatformSettings();
  }, [activeTab, settingsLoaded, settingsLoading, loadPlatformSettings]);

  useEffect(() => {
    if (!businessDetailModalId) {
      setBusinessDetailData(null);
      setBusinessDetailError(null);
      return;
    }
    let mounted = true;
    setBusinessDetailLoading(true);
    setBusinessDetailError(null);
    fetch(`/api/super-admin/businesses/${businessDetailModalId}`, { credentials: 'include' })
      .then((res) => {
        if (!mounted) return;
        if (!res.ok) {
          if (res.status === 404) setBusinessDetailError('Business not found');
          else setBusinessDetailError('Failed to load business');
          return res.json().catch(() => ({}));
        }
        return res.json();
      })
      .then((json) => {
        if (!mounted) return;
        if (json.error) return;
        setBusinessDetailData(json);
      })
      .finally(() => {
        if (mounted) setBusinessDetailLoading(false);
      });
    return () => { mounted = false; };
  }, [businessDetailModalId]);

  useEffect(() => {
    if (!supportTicketDetailId) {
      setSupportTicketDetail(null);
      return;
    }
    let mounted = true;
    setSupportTicketDetailLoading(true);
    fetch(`/api/super-admin/support-tickets/${supportTicketDetailId}`, { credentials: 'include' })
      .then((res) => {
        if (!mounted) return;
        if (!res.ok) return res.json().then((j) => { throw new Error(j.error || 'Failed'); });
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        setSupportTicketDetail(data);
        setTicketEditStatus(data.status ?? '');
        setTicketEditAssignedTo(data.assigned_to ?? '');
      })
      .catch(() => {
        if (mounted) setSupportTicketDetail(null);
      })
      .finally(() => {
        if (mounted) setSupportTicketDetailLoading(false);
      });
    return () => { mounted = false; };
  }, [supportTicketDetailId]);

  const closeSupportTicketDetail = () => {
    setSupportTicketDetailId(null);
    setSupportTicketDetail(null);
  };

  const handleUpdateTicket = async () => {
    if (!supportTicketDetailId) return;
    setTicketSaveLoading(true);
    try {
      const res = await fetch(`/api/super-admin/support-tickets/${supportTicketDetailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: ticketEditStatus, assigned_to: ticketEditAssignedTo || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Update failed');
      }
      const updated = await res.json();
      setSupportTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated, business_name: t.business_name } : t)));
      setSupportTicketDetail((d) => (d && d.id === updated.id ? { ...d, ...updated } : d));
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed to update ticket');
    } finally {
      setTicketSaveLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicketBusinessId || !newTicketSubject.trim() || !newTicketMessage.trim()) {
      alert('Please select a business and enter subject and message.');
      return;
    }
    setNewTicketLoading(true);
    try {
      const res = await fetch('/api/super-admin/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          business_id: newTicketBusinessId,
          subject: newTicketSubject.trim(),
          message: newTicketMessage.trim(),
          priority: newTicketPriority,
          requester_email: currentUserEmail || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Create failed');
      }
      await fetchDashboardData();
      setSupportNewTicketOpen(false);
      setNewTicketSubject('');
      setNewTicketMessage('');
      setNewTicketBusinessId(businesses[0]?.id ?? '');
      setNewTicketPriority('medium');
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed to create ticket');
    } finally {
      setNewTicketLoading(false);
    }
  };

  const closeBusinessModal = () => {
    setBusinessDetailModalId(null);
    setBusinessDetailData(null);
    setBusinessDetailError(null);
  };

  const openBillingPortal = async (businessId: string) => {
    setBillingPortalLoadingId(businessId);
    try {
      const res = await fetch("/api/super-admin/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ businessId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json.error || "Failed to open billing portal");
        return;
      }
      if (json.url) {
        openStripeHostedPopup(json.url as string, "stripe_super_admin_portal");
      } else {
        alert("Stripe portal URL missing");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to open billing portal");
    } finally {
      setBillingPortalLoadingId(null);
    }
  };

  const handleLogout = async () => {
    await supabaseSuperAdmin.auth.signOut();
    router.replace('/super-admin/login');
  };

  const getSubscriptionStatusBadge = (status: string, trialEndsAt: string | null) => {
    if (trialEndsAt && new Date(trialEndsAt) > new Date()) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Trial</span>;
    }
    
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Active</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" /> Cancelled</span>;
      case 'suspended':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><AlertCircle className="w-3 h-3 mr-1" /> Suspended</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">High</span>;
      case 'medium':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Medium</span>;
      case 'low':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Low</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  const navigationItems = [
    { id: 'overview', name: 'Overview', icon: Home, description: 'Platform overview' },
    { id: 'businesses', name: 'Businesses', icon: Building2, description: 'Manage businesses' },
    { id: 'billing', name: 'Billing', icon: CreditCard, description: 'Subscriptions & revenue' },
    { id: 'plans', name: 'Plans', icon: Layers, description: 'Plans & feature limits' },
    { id: 'users', name: 'Users', icon: Users2, description: 'User management' },
    { id: 'analytics', name: 'Analytics', icon: PieChart, description: 'Analytics & reports' },
    { id: 'notifications', name: 'Notifications', icon: Bell, description: 'Announcements & templates' },
    { id: 'support', name: 'Support', icon: MessageSquare, description: 'Support tickets' },
    { id: 'settings', name: 'Settings', icon: Settings, description: 'Platform settings' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="flex items-center ml-4 lg:ml-0">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                    Super Admin
                  </h1>
                  <p className="text-xs text-gray-500">Orbyt Service Platform</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="hidden md:block relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search businesses, users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Notifications (live: platform announcements + support tickets) */}
              <div className="relative" ref={notifDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen((o) => {
                      if (!o) void fetchHeaderNotifications();
                      return !o;
                    });
                  }}
                  className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {headerUnreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-h-[8px] min-w-[8px] px-1 bg-red-500 rounded-full text-[10px] leading-none text-white flex items-center justify-center font-medium">
                      {headerUnreadCount > 99 ? '99+' : headerUnreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                      <button
                        type="button"
                        onClick={async () => {
                          setHeaderNotificationsLoading(true);
                          try {
                            const res = await fetch('/api/super-admin/notifications', {
                              method: 'PATCH',
                              credentials: 'include',
                            });
                            if (res.ok) await fetchHeaderNotifications();
                          } finally {
                            setHeaderNotificationsLoading(false);
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                        disabled={headerNotificationsLoading || headerUnreadCount === 0}
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {headerNotificationsLoading && headerNotifications.length === 0 && (
                        <div className="p-4 text-sm text-gray-500">Loading…</div>
                      )}
                      {!headerNotificationsLoading && headerNotifications.length === 0 && (
                        <div className="p-4 text-sm text-gray-500">No notifications</div>
                      )}
                      {headerNotifications.map((notification) => (
                        <button
                          type="button"
                          key={notification.id}
                          className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 ${!notification.read ? 'bg-blue-50' : ''}`}
                          onClick={async () => {
                            const ticketUuid = parseSupportNotificationId(notification.id);
                            if (ticketUuid) {
                              setNotificationsOpen(false);
                              setActiveTab('support');
                              setSupportTicketDetailId(ticketUuid);
                              return;
                            }
                            if (notification.id.startsWith(PLATFORM_NOTIF_ID_PREFIX)) {
                              if (!notification.read) {
                                await fetch(`/api/super-admin/notifications/${encodeURIComponent(notification.id)}`, {
                                  method: 'PATCH',
                                  credentials: 'include',
                                });
                                setHeaderNotifications((prev) =>
                                  prev.map((x) => (x.id === notification.id ? { ...x, read: true } : x))
                                );
                              }
                              setHeaderNotifDetail({
                                id: notification.id,
                                title: notification.title,
                                description: notification.description,
                                read: true,
                                source: 'platform',
                                created_at: notification.created_at,
                                level: notification.level,
                                audience: notification.audience,
                              });
                            }
                          }}
                        >
                          <div className="flex items-start">
                            <div
                              className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${!notification.read ? 'bg-blue-600' : 'bg-gray-300'}`}
                            />
                            <div className="ml-3 flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-3 whitespace-pre-wrap">{notification.description}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatRelativeTime(notification.created_at)}
                                {notification.source === 'support' ? ' · Support' : ''}
                                {notification.source === 'platform' ? ' · Announcement' : ''}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="p-3 border-t border-gray-200 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationsOpen(false);
                          setActiveTab('notifications');
                          setNotifTab('inbox');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Activity inbox
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationsOpen(false);
                          setActiveTab('support');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Support tab
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm font-bold">SA</span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">Super Admin</p>
                    <p className="text-xs text-gray-500">{currentUserEmail || '…'}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">Super Admin</p>
                      <p className="text-xs text-gray-500">{currentUserEmail || '…'}</p>
                    </div>
                    <div className="py-2">
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                        <UserCheck className="h-4 w-4 mr-3 text-gray-400" />
                        Profile Settings
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                        <HelpCircle className="h-4 w-4 mr-3 text-gray-400" />
                        Help & Support
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          router.push('/super-admin/session-diagnostics');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <Shield className="h-4 w-4 mr-3 text-gray-400" />
                        Session diagnostics
                      </button>
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-lg border-r border-gray-200 transition-transform duration-300 ease-in-out mt-16 lg:mt-0`}>
          <nav className="p-4 space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-l-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </button>
            ))}
          </nav>

          {/* Quick Stats Sidebar */}
          <div className="p-4 border-t border-gray-200">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-4 text-white">
              <h3 className="font-semibold mb-2">Platform Health</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">Uptime</span>
                  <span className="text-sm font-bold">99.9%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">Response Time</span>
                  <span className="text-sm font-bold">142ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">Error Rate</span>
                  <span className="text-sm font-bold">0.02%</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* Page Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Sparkles className="h-6 w-6 mr-2 text-yellow-500" />
                    Platform Overview
                  </h2>
                  <p className="text-gray-600 mt-1">Real-time insights into your SaaS platform performance</p>
                </div>
                <div className="mt-4 sm:mt-0 flex space-x-3">
                  <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchDashboardData()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 flex items-center shadow-lg"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </button>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      +7.2%
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.totalBusinesses.toLocaleString()}</h3>
                  <p className="text-sm text-gray-600 mt-1">Total Businesses</p>
                  <p className="text-xs text-gray-500 mt-2">+{stats.newBusinessesThisMonth} new this month</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      +12.5%
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">${stats.monthlyRevenue.toLocaleString()}</h3>
                  <p className="text-sm text-gray-600 mt-1">Monthly Revenue</p>
                  <p className="text-xs text-gray-500 mt-2">MRR growth strong</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Users2 className="h-6 w-6 text-purple-600" />
                    </div>
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      +4.1%
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.activeUsers.toLocaleString()}</h3>
                  <p className="text-sm text-gray-600 mt-1">Active Users</p>
                  <p className="text-xs text-gray-500 mt-2">{stats.totalUsers ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : 0}% engagement</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    </div>
                    <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
                      -0.8%
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.churnRate}%</h3>
                  <p className="text-sm text-gray-600 mt-1">Churn Rate</p>
                  <p className="text-xs text-gray-500 mt-2">Improving trend</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">${(stats.totalRevenue ?? 0).toLocaleString()}</h3>
                  <p className="text-sm text-gray-600 mt-1">Total Revenue</p>
                  <p className="text-xs text-gray-500 mt-2">All-time</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-cyan-100 rounded-lg">
                      <FileText className="h-6 w-6 text-cyan-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{(stats.totalBookings ?? 0).toLocaleString()}</h3>
                  <p className="text-sm text-gray-600 mt-1">Total Bookings</p>
                  <p className="text-xs text-gray-500 mt-2">+{stats.bookingsThisMonth ?? 0} this month</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-slate-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-slate-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">${(stats.averageRevenuePerBusiness ?? 0).toLocaleString()}</h3>
                  <p className="text-sm text-gray-600 mt-1">Avg revenue per business</p>
                  <p className="text-xs text-gray-500 mt-2">All-time</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-100 rounded-lg">
                      <CreditCard className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.stripeConnectedCount ?? 0} / {stats.totalBusinesses ?? 0}</h3>
                  <p className="text-sm text-gray-600 mt-1">Stripe Connected</p>
                  <p className="text-xs text-gray-500 mt-2">Businesses with payment gateway</p>
                </div>
              </div>

              {/* Subscriptions overview */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-gray-500" />
                  Subscriptions
                </h3>
                <p className="text-sm text-gray-500 mb-4">Account status breakdown (based on business active status until subscription billing is live)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Active</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">{subscriptionsData.active}</p>
                    <p className="text-xs text-green-700 mt-0.5">Paying / active accounts</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Canceled</span>
                    </div>
                    <p className="text-2xl font-bold text-red-900">{subscriptionsData.canceled}</p>
                    <p className="text-xs text-red-700 mt-0.5">Inactive / canceled</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">Trial</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-900">{subscriptionsData.trial}</p>
                    <p className="text-xs text-amber-700 mt-0.5">In trial period</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-5 w-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-800">Total</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{subscriptionsData.total}</p>
                    <p className="text-xs text-gray-600 mt-0.5">All businesses</p>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue by month</h3>
                  <div className="h-[240px]">
                    {chartData.revenueByMonth.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData.revenueByMonth} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `$${v}`} />
                          <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} labelFormatter={(_, payload) => payload?.[0]?.payload?.label} />
                          <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} name="Revenue" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Bookings by status</h3>
                  <div className="h-[240px]">
                    {chartData.bookingsByStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.bookingsByStatus} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <YAxis type="category" dataKey="status" width={70} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                          <Tooltip formatter={(v: number) => [v, 'Count']} />
                          <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Bookings" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">No bookings yet</div>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Businesses by plan</h3>
                  <div className="h-[240px]">
                    {chartData.businessesByPlan.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={chartData.businessesByPlan}
                            dataKey="count"
                            nameKey="plan"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ plan, count }) => `${plan}: ${count}`}
                            labelLine={false}
                          >
                            {chartData.businessesByPlan.map((_, i) => (
                              <Cell key={i} fill={['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e9d5ff'][i % 5]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => [v, 'Businesses']} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">No businesses yet</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Billing & payments */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <DollarSign className="h-5 w-5 mr-2 text-gray-500" />
                      Subscription revenue by plan
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Subscription revenue from businesses by plan tier</p>
                  </div>
                  <div className="overflow-x-auto">
                    {billingData.revenueByPlan.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-sm">No subscription revenue by plan yet.</div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Businesses</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {billingData.revenueByPlan.map((row) => (
                            <tr key={row.plan} className="hover:bg-gray-50">
                              <td className="px-6 py-3 font-medium text-gray-900 capitalize">{row.plan}</td>
                              <td className="px-6 py-3 text-right font-medium">${row.revenue.toLocaleString()}</td>
                              <td className="px-6 py-3 text-right text-gray-600">{row.businessCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <CreditCard className="h-5 w-5 mr-2 text-gray-500" />
                      Recent subscription payments
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Latest subscription payments from businesses</p>
                  </div>
                  <div className="overflow-x-auto">
                    {billingData.recentPayments.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-sm">No subscription payments yet.</div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan / Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {billingData.recentPayments.map((p, i) => (
                            <tr key={p.id ?? i} className="hover:bg-gray-50">
                              <td className="px-6 py-3 font-medium text-gray-900">{p.business_name}</td>
                              <td className="px-6 py-3 text-gray-900">{p.service}</td>
                              <td className="px-6 py-3 text-gray-600">{p.date ? new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                              <td className="px-6 py-3 text-right font-medium">${p.amount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-gray-500" />
                      Upcoming subscription renewals
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Next subscription renewal dates (next 10)</p>
                    {billingData.upcomingPayments && (billingData.upcomingPayments.count > 0 || billingData.upcomingPayments.items.length > 0) && (
                      <p className="text-sm font-medium text-amber-700 mt-1">
                        {billingData.upcomingPayments.count} renewal{billingData.upcomingPayments.count !== 1 ? 's' : ''} · ${(billingData.upcomingPayments.totalAmount ?? 0).toFixed(2)} expected
                      </p>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    {!billingData.upcomingPayments?.items?.length ? (
                      <div className="p-8 text-center text-gray-500 text-sm">No upcoming subscription renewals.</div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {billingData.upcomingPayments.items.map((p, i) => (
                            <tr key={p.id ?? i} className="hover:bg-gray-50">
                              <td className="px-6 py-3 font-medium text-gray-900">{p.business_name}</td>
                              <td className="px-6 py-3 text-gray-900">{p.service}</td>
                              <td className="px-6 py-3 text-gray-600">
                                {p.scheduled_date ? new Date(p.scheduled_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                              </td>
                              <td className="px-6 py-3 text-right font-medium">${p.amount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Charts and Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Businesses */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Businesses</h3>
                      <button type="button" onClick={() => setActiveTab('businesses')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">View All</button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {businesses.map((business, index) => (
                        <div key={business.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                              {business.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{business.name}</p>
                              <p className="text-sm text-gray-500">{business.owner_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {getSubscriptionStatusBadge(business.subscription_status, business.trial_ends_at)}
                            <p className="text-xs text-gray-500 mt-1">{business.plan_name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-3">
                      <button className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group">
                        <UserPlus className="h-6 w-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-gray-700">Add User</span>
                      </button>
                      <button className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group">
                        <Building2 className="h-6 w-6 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-gray-700">New Business</span>
                      </button>
                      <button className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group">
                        <CreditCard className="h-6 w-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-gray-700">Billing</span>
                      </button>
                      <button className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors group">
                        <Settings className="h-6 w-6 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-gray-700">Settings</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Businesses Tab */}
          {activeTab === 'businesses' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Building2 className="h-6 w-6 mr-2 text-blue-600" />
                    Businesses
                  </h2>
                  <p className="text-gray-600 mt-1">All businesses on the platform ({businesses.length} total)</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, owner..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateBusinessOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create business
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchDashboardData()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </button>
                </div>
              </div>

              <SuperAdminSupportPlaybook />

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last active</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        const q = searchTerm.trim().toLowerCase();
                        const filtered = q
                          ? businesses.filter(
                              (b) =>
                                b.name.toLowerCase().includes(q) ||
                                b.owner_name.toLowerCase().includes(q) ||
                                (b.owner_email && b.owner_email.toLowerCase().includes(q))
                            )
                          : businesses;
                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                {businesses.length === 0 ? 'No businesses yet.' : 'No businesses match your search.'}
                              </td>
                            </tr>
                          );
                        }
                        return filtered.map((business) => (
                          <tr key={business.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                                  {business.name.charAt(0)}
                                </div>
                                <div className="ml-4">
                                  <p className="font-medium text-gray-900">{business.name}</p>
                                  <p className="text-xs text-gray-500">Created {business.created_at ? new Date(business.created_at).toLocaleDateString() : '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <p className="text-sm text-gray-900">{business.owner_name}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {business.owner_email || '—'}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-700 capitalize">{business.plan_name}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getSubscriptionStatusBadge(business.subscription_status, business.trial_ends_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                              {business.total_bookings.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {business.last_active ? new Date(business.last_active).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setBusinessDetailModalId(business.id)}
                                  className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" /> View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditBusinessId(business.id)}
                                  className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    fetch(`/api/super-admin/businesses/${business.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ is_active: !(business.is_active !== false) }) })
                                      .then((r) => r.ok && fetchDashboardData());
                                  }}
                                  className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded hover:bg-amber-100"
                                >
                                  {business.is_active !== false ? <UserX className="h-3.5 w-3.5 mr-1" /> : <UserCheck className="h-3.5 w-3.5 mr-1" />}
                                  {business.is_active !== false ? 'Suspend' : 'Activate'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImpersonateLoadingId(business.id);
                                    fetch('/api/super-admin/impersonate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ businessId: business.id }) })
                                      .then((r) => r.json())
                                      .then(async (data) => {
                                        setImpersonateLoadingId(null);
                                        if (data.error) return;
                                        if (data.access_token && data.refresh_token) {
                                          await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
                                          window.location.href = '/admin';
                                        }
                                      })
                                      .catch(() => setImpersonateLoadingId(null));
                                  }}
                                  disabled={!!impersonateLoadingId}
                                  className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded hover:bg-purple-100 disabled:opacity-50"
                                >
                                  {impersonateLoadingId === business.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <LogIn className="h-3.5 w-3.5 mr-1" />}
                                  Log in as tenant
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmBusinessId(business.id)}
                                  className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Users2 className="h-6 w-6 mr-2 text-purple-600" />
                    Users
                  </h2>
                  <p className="text-gray-600 mt-1">
                    People across your platform ({filteredPeople.length} shown)
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 max-w-xl">
                    Includes <strong>owners</strong> (platform accounts), plus tenant <strong>providers</strong> and <strong>customers</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search name, email, business..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={peopleTypeFilter}
                    onChange={(e) => setPeopleTypeFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    title="Filter by type"
                  >
                    <option value="all">All</option>
                    <option value="owner">Owners</option>
                    <option value="provider">Providers</option>
                    <option value="customer">Customers</option>
                  </select>
                  <select
                    value={peopleStatusFilter}
                    onChange={(e) => setPeopleStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    title="Filter by status"
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => fetchDashboardData()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPeople.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            {peopleRows.length === 0 ? 'No people yet.' : 'No results match your filters.'}
                          </td>
                        </tr>
                      ) : (
                        filteredPeople.map((p) => (
                          <tr key={`${p.kind}-${p.id}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                                  {(p.full_name || p.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-4">
                                  <p className="font-medium text-gray-900">{p.full_name || '—'}</p>
                                  <p className="text-xs text-gray-500">ID: {p.id.slice(0, 8)}…</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {p.email ? (
                                <a href={`mailto:${p.email}`} className="text-blue-600 hover:underline flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {p.email}
                                </a>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-700 capitalize">{p.kind}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-700">{p.business_name || '—'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                                {p.status || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openPersonDetail(p)}
                                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View details
                                </button>
                                {p.kind === 'owner' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('businesses');
                                      setSearchTerm(p.email || p.full_name || '');
                                    }}
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                                  >
                                    <Building2 className="h-4 w-4 mr-1" />
                                    View businesses
                                  </button>
                                ) : p.business_id ? (
                                  <button
                                    type="button"
                                    onClick={() => setBusinessDetailModalId(p.business_id!)}
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                  >
                                    <Building2 className="h-4 w-4 mr-1" />
                                    View business
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {personDetailOpen && (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50"
              role="dialog"
              aria-modal="true"
              onClick={() => !personDetailLoading && setPersonDetailOpen(false)}
            >
              <div
                className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Account details</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Owners, providers, and customers</p>
                  </div>
                  <button
                    type="button"
                    disabled={personDetailLoading}
                    onClick={() => setPersonDetailOpen(false)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Close
                  </button>
                </div>
                <div className="p-6">
                  {personDetailLoading ? (
                    <div className="flex items-center justify-center py-12 text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Loading…
                    </div>
                  ) : personDetailError ? (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                      {personDetailError}
                    </div>
                  ) : personDetail ? (
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-500">Type</p>
                          <p className="text-sm font-medium text-gray-900 capitalize">{personDetail.kind ?? '—'}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-500">ID</p>
                          <p className="text-sm font-mono text-gray-900">{personDetail.person?.id ?? '—'}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-500">Name</p>
                          <p className="text-sm font-medium text-gray-900">{personDetail.person?.full_name ?? '—'}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="text-sm text-gray-900">{personDetail.person?.email ?? '—'}</p>
                        </div>
                      </div>

                      {/* Extra details for providers/customers */}
                      {personDetail.person ? (
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-500 mb-2">Details</p>
                          <div className="grid sm:grid-cols-2 gap-3 text-sm">
                            {personDetail.kind === 'provider' ? (
                              <>
                                <div><span className="text-gray-500">Phone:</span> <span className="text-gray-900">{personDetail.person?.phone ?? '—'}</span></div>
                                <div><span className="text-gray-500">Availability:</span> <span className="text-gray-900">{personDetail.person?.availability_status ?? '—'}</span></div>
                                <div><span className="text-gray-500">Status:</span> <span className="text-gray-900">{personDetail.person?.status ?? '—'}</span></div>
                                <div><span className="text-gray-500">Blocked:</span> <span className="text-gray-900">{personDetail.person?.access_blocked ? 'Yes' : 'No'}</span></div>
                                <div><span className="text-gray-500">Type:</span> <span className="text-gray-900">{personDetail.person?.provider_type ?? '—'}</span></div>
                                <div><span className="text-gray-500">Specialization:</span> <span className="text-gray-900">{personDetail.person?.specialization ?? '—'}</span></div>
                                <div><span className="text-gray-500">Rating:</span> <span className="text-gray-900">{personDetail.person?.rating ?? '—'}</span></div>
                                <div><span className="text-gray-500">Completed jobs:</span> <span className="text-gray-900">{personDetail.person?.completed_jobs ?? '—'}</span></div>
                                <div><span className="text-gray-500">Payout method:</span> <span className="text-gray-900">{personDetail.person?.payout_method ?? '—'}</span></div>
                                <div><span className="text-gray-500">Stripe connected:</span> <span className="text-gray-900">{personDetail.person?.stripe_is_connected ? 'Yes' : 'No'}</span></div>
                                <div><span className="text-gray-500">Total earned:</span> <span className="text-gray-900">{personDetail.person?.total_earned ?? '—'}</span></div>
                                <div><span className="text-gray-500">Current balance:</span> <span className="text-gray-900">{personDetail.person?.current_balance ?? '—'}</span></div>
                              </>
                            ) : personDetail.kind === 'customer' ? (
                              <>
                                <div><span className="text-gray-500">Phone:</span> <span className="text-gray-900">{personDetail.person?.phone ?? '—'}</span></div>
                                <div><span className="text-gray-500">Status:</span> <span className="text-gray-900">{personDetail.person?.status ?? '—'}</span></div>
                                <div><span className="text-gray-500">Blocked:</span> <span className="text-gray-900">{personDetail.person?.access_blocked ? 'Yes' : 'No'}</span></div>
                                <div><span className="text-gray-500">Booking blocked:</span> <span className="text-gray-900">{personDetail.person?.booking_blocked ? 'Yes' : 'No'}</span></div>
                                <div><span className="text-gray-500">Company:</span> <span className="text-gray-900">{personDetail.person?.company ?? '—'}</span></div>
                                <div><span className="text-gray-500">Gender:</span> <span className="text-gray-900">{personDetail.person?.gender ?? '—'}</span></div>
                                <div><span className="text-gray-500">Join date:</span> <span className="text-gray-900">{personDetail.person?.join_date ?? '—'}</span></div>
                                <div><span className="text-gray-500">Last booking:</span> <span className="text-gray-900">{personDetail.person?.last_booking ?? '—'}</span></div>
                                <div><span className="text-gray-500">Total bookings:</span> <span className="text-gray-900">{personDetail.person?.total_bookings ?? '—'}</span></div>
                                <div><span className="text-gray-500">Total spent:</span> <span className="text-gray-900">{personDetail.person?.total_spent ?? '—'}</span></div>
                                <div><span className="text-gray-500">Email notifications:</span> <span className="text-gray-900">{personDetail.person?.email_notifications ? 'On' : 'Off'}</span></div>
                                <div><span className="text-gray-500">SMS notifications:</span> <span className="text-gray-900">{personDetail.person?.sms_notifications ? 'On' : 'Off'}</span></div>
                              </>
                            ) : (
                              <div className="text-gray-600">—</div>
                            )}
                          </div>
                          {Array.isArray(personDetail.person?.tags) && personDetail.person.tags.length ? (
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 mb-1">Tags</p>
                              <div className="flex flex-wrap gap-1.5">
                                {personDetail.person.tags.slice(0, 30).map((t: string) => (
                                  <span key={t} className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {personDetail.kind === 'customer' && personDetail.person?.notes ? (
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 mb-1">Notes</p>
                              <div className="text-sm text-gray-800 whitespace-pre-wrap">{String(personDetail.person.notes)}</div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {personDetail.business ? (
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-500">Business</p>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{personDetail.business?.name ?? '—'}</p>
                              <p className="text-xs text-gray-500">
                                Plan: {personDetail.business?.plan ?? '—'} • {personDetail.business?.is_active ? 'Active' : 'Suspended'}
                              </p>
                            </div>
                            {personDetail.business?.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPersonDetailOpen(false);
                                  setBusinessDetailModalId(personDetail.business.id);
                                }}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Building2 className="h-4 w-4 mr-1" />
                                View business
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {Array.isArray(personDetail.businesses) ? (
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-500 mb-2">Businesses owned</p>
                          {personDetail.businesses.length === 0 ? (
                            <p className="text-sm text-gray-600">—</p>
                          ) : (
                            <div className="space-y-2">
                              {personDetail.businesses.slice(0, 25).map((b: any) => (
                                <div key={b.id} className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{b.name}</p>
                                    <p className="text-xs text-gray-500">Plan: {b.plan ?? '—'} • {b.is_active ? 'Active' : 'Suspended'}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPersonDetailOpen(false);
                                      setBusinessDetailModalId(b.id);
                                    }}
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                  >
                                    <Building2 className="h-4 w-4 mr-1" />
                                    View
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">—</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (() => {
            const revByMonth = chartData.revenueByMonth ?? [];
            const thisMonthRev = revByMonth.length > 0 ? revByMonth[revByMonth.length - 1]?.revenue ?? 0 : 0;
            const lastMonthRev = revByMonth.length > 1 ? revByMonth[revByMonth.length - 2]?.revenue ?? 0 : 0;
            const revChange = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : (thisMonthRev > 0 ? 100 : 0);
            const bestMonth = [...revByMonth].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))[0];
            const totalBookingsCount = stats.totalBookings ?? 0;
            const avgOrderValue = totalBookingsCount > 0 ? (stats.totalRevenue ?? 0) / totalBookingsCount : 0;
            const byStatus = chartData.bookingsByStatus ?? [];
            const totalFromStatus = byStatus.reduce((s, x) => s + (x.count ?? 0), 0);
            const completedCount = byStatus.find(x => (x.status || '').toLowerCase() === 'completed')?.count ?? 0;
            const cancelledCount = byStatus.find(x => (x.status || '').toLowerCase() === 'cancelled')?.count ?? 0;
            const completionRate = totalFromStatus > 0 ? (completedCount / totalFromStatus) * 100 : 0;
            const cancellationRate = totalFromStatus > 0 ? (cancelledCount / totalFromStatus) * 100 : 0;
            const topMonthsByRevenue = [...revByMonth].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0)).slice(0, 6);
            return (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <PieChart className="h-6 w-6 mr-2 text-indigo-600" />
                    Analytics & reports
                  </h2>
                  <p className="text-gray-600 mt-1">Trends, comparisons, and performance metrics</p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchDashboardData()}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 flex items-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>

              {/* Trends & comparisons */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-indigo-600" />
                  Trends & period comparison
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase">Revenue this month vs last</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-lg font-bold text-gray-900">${thisMonthRev.toFixed(2)}</span>
                      <span className="text-sm text-gray-500">vs ${lastMonthRev.toFixed(2)}</span>
                    </div>
                    {lastMonthRev > 0 && (
                      <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${revChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {revChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {revChange >= 0 ? '+' : ''}{revChange.toFixed(1)}% MoM
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase">Best month (last 6)</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{bestMonth?.label ?? '—'}</p>
                    <p className="text-sm text-gray-600">${(bestMonth?.revenue ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase">Avg order value</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">${avgOrderValue.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">per booking</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase">Completion rate</p>
                    <p className="text-lg font-bold text-green-700 mt-1">{completionRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">{completedCount} of {totalFromStatus} bookings</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase">Cancellation rate</p>
                    <p className="text-lg font-bold text-amber-700 mt-1">{cancellationRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">{cancelledCount} cancelled</p>
                  </div>
                </div>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">${(stats.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">${(stats.monthlyRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total bookings</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{(stats.totalBookings ?? 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">New businesses (MTD)</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{(stats.newBusinessesThisMonth ?? 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Charts row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue trend (last 6 months)</h3>
                  <div className="h-[260px]">
                    {chartData.revenueByMonth.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData.revenueByMonth} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `$${v}`} />
                          <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} labelFormatter={(_, payload) => payload?.[0]?.payload?.label} />
                          <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} name="Revenue" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Bookings by status</h3>
                  <div className="h-[260px]">
                    {chartData.bookingsByStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.bookingsByStatus} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <YAxis type="category" dataKey="status" width={70} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                          <Tooltip formatter={(v: number) => [v, 'Count']} />
                          <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Bookings" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">No bookings yet</div>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Businesses by plan</h3>
                  <div className="h-[260px]">
                    {chartData.businessesByPlan.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={chartData.businessesByPlan}
                            dataKey="count"
                            nameKey="plan"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ plan, count }) => `${plan}: ${count}`}
                            labelLine={false}
                          >
                            {chartData.businessesByPlan.map((_, i) => (
                              <Cell key={i} fill={['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e9d5ff'][i % 5]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => [v, 'Businesses']} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">No businesses yet</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Subscription revenue by plan (bar) + Top months table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Subscription revenue by plan</h3>
                  <div className="h-[240px]">
                    {(billingData.revenueByPlan?.length ?? 0) > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={billingData.revenueByPlan} margin={{ top: 5, right: 5, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="plan" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `$${v}`} />
                          <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                          <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">No subscription revenue by plan yet</div>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Top months by revenue</h3>
                  {topMonthsByRevenue.length > 0 ? (
                    <div className="space-y-2">
                      {topMonthsByRevenue.map((row, i) => (
                        <div key={row.month ?? i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <span className="font-medium text-gray-900">{row.label ?? row.month ?? '—'}</span>
                          <span className="text-indigo-600 font-semibold">${(row.revenue ?? 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 py-4">No monthly revenue data yet</p>
                  )}
                </div>
              </div>

              {/* Booking funnel breakdown */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Booking funnel (by status)</h3>
                {byStatus.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {byStatus.map((row) => {
                      const pct = totalFromStatus > 0 ? ((row.count ?? 0) / totalFromStatus) * 100 : 0;
                      return (
                        <div key={row.status} className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-xs font-medium text-gray-500 uppercase capitalize">{row.status}</p>
                          <p className="text-xl font-bold text-gray-900 mt-0.5">{row.count ?? 0}</p>
                          <p className="text-xs text-gray-600">{pct.toFixed(1)}%</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No booking status data yet</p>
                )}
              </div>

              {/* Subscription & billing summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Subscription & billing summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Avg revenue per business</p>
                    <p className="text-lg font-semibold text-gray-900">${(billingData.averageRevenuePerBusiness ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Stripe connected</p>
                    <p className="text-lg font-semibold text-gray-900">{billingData.stripeConnectedCount ?? 0} / {billingData.totalBusinessesForBilling ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Active subscriptions</p>
                    <p className="text-lg font-semibold text-gray-900">{subscriptionsData.active}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Total businesses</p>
                    <p className="text-lg font-semibold text-gray-900">{subscriptionsData.total}</p>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* Notifications & Announcements Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Bell className="h-6 w-6 mr-2 text-indigo-600" />
                    Notifications & announcements
                  </h2>
                  <p className="text-gray-600 mt-1">Broadcast platform announcements and manage system email templates</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadNotifications()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifTab('announcements');
                      if (announcements.length === 0 && templates.length === 0) void loadNotifications();
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${notifTab === 'announcements' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Announcements
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifTab('templates');
                      if (announcements.length === 0 && templates.length === 0) void loadNotifications();
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${notifTab === 'templates' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    System email templates
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifTab('inbox')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${notifTab === 'inbox' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Activity inbox
                  </button>
                </div>
              </div>

              {notifError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                  {notifError}
                </div>
              )}

              {notifTab === 'announcements' && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Send announcement</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                        <input
                          value={newAnnouncement.title}
                          onChange={(e) => setNewAnnouncement((s) => ({ ...s, title: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Maintenance window, product update…"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Body</label>
                        <textarea
                          value={newAnnouncement.body}
                          onChange={(e) => setNewAnnouncement((s) => ({ ...s, body: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          rows={5}
                          placeholder="Write the announcement…"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Send to</label>
                        <select
                          value={newAnnouncement.audience}
                          onChange={(e) =>
                            setNewAnnouncement((s) => ({
                              ...s,
                              audience: e.target.value as 'all' | 'owners' | 'providers' | 'customers',
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                        >
                          <option value="all">All users (owners, providers &amp; customers)</option>
                          <option value="owners">Business owners only</option>
                          <option value="providers">Service providers only</option>
                          <option value="customers">Customers only</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          In-app announcement visibility is matched to each signed-in user&apos;s role (from their account).
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Level</label>
                          <select
                            value={newAnnouncement.level}
                            onChange={(e) => setNewAnnouncement((s) => ({ ...s, level: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                          >
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="success">Success</option>
                          </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
                          <input
                            type="checkbox"
                            checked={newAnnouncement.is_active}
                            onChange={(e) => setNewAnnouncement((s) => ({ ...s, is_active: e.target.checked }))}
                          />
                          Active
                        </label>
                      </div>
                      <button
                        type="button"
                        disabled={notifLoading}
                        onClick={async () => {
                          setNotifLoading(true);
                          setNotifError(null);
                          try {
                            const res = await fetch('/api/super-admin/announcements', {
                              method: 'POST',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(newAnnouncement),
                            });
                            const j = await res.json().catch(() => ({}));
                            if (res.status === 401 || res.status === 403) {
                              setNotifError('Session no longer valid for Super Admin. Redirecting to login…');
                              router.replace('/super-admin/login');
                              return;
                            }
                            if (!res.ok) throw new Error(j.error || 'Failed');
                            setNewAnnouncement({
                              title: '',
                              body: '',
                              level: 'info',
                              is_active: true,
                              audience: 'all',
                            });
                            await loadNotifications();
                          } catch (e) {
                            setNotifError(e instanceof Error ? e.message : 'Failed');
                          } finally {
                            setNotifLoading(false);
                          }
                        }}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Send
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Recent announcements</h3>
                      <button
                        type="button"
                        onClick={() => loadNotifications()}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Reload
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Audience</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(announcements ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                                No announcements yet.
                              </td>
                            </tr>
                          ) : (
                            (announcements ?? []).slice(0, 50).map((a: any) => (
                              <tr key={a.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  <div className="font-medium">{a.title}</div>
                                  <div className="text-xs text-gray-500 line-clamp-2">{a.body}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700 capitalize">
                                  {a.audience === 'owners'
                                    ? 'Owners'
                                    : a.audience === 'providers'
                                      ? 'Providers'
                                      : a.audience === 'customers'
                                        ? 'Customers'
                                        : 'All'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">{a.level}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{a.is_active ? 'Yes' : 'No'}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="inline-flex flex-wrap items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        setNotifLoading(true);
                                        setNotifError(null);
                                        try {
                                          const res = await fetch(`/api/super-admin/announcements/${a.id}`, {
                                            method: 'PATCH',
                                            credentials: 'include',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ is_active: !a.is_active }),
                                          });
                                          const j = await res.json().catch(() => ({}));
                                          if (res.status === 401 || res.status === 403) {
                                            router.replace('/super-admin/login');
                                            return;
                                          }
                                          if (!res.ok) throw new Error(j.error || 'Failed');
                                          await loadNotifications();
                                        } catch (e) {
                                          setNotifError(e instanceof Error ? e.message : 'Failed');
                                        } finally {
                                          setNotifLoading(false);
                                        }
                                      }}
                                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                    >
                                      {a.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (!window.confirm('Delete this announcement permanently? It will be removed from all users’ notification history.')) return;
                                        setNotifLoading(true);
                                        setNotifError(null);
                                        try {
                                          const res = await fetch(`/api/super-admin/announcements/${a.id}`, {
                                            method: 'DELETE',
                                            credentials: 'include',
                                          });
                                          const j = await res.json().catch(() => ({}));
                                          if (res.status === 401 || res.status === 403) {
                                            router.replace('/super-admin/login');
                                            return;
                                          }
                                          if (!res.ok) throw new Error(j.error || 'Failed to delete');
                                          await loadNotifications();
                                        } catch (e) {
                                          setNotifError(e instanceof Error ? e.message : 'Failed');
                                        } finally {
                                          setNotifLoading(false);
                                        }
                                      }}
                                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {notifTab === 'templates' && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Create template</h3>
                    <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                      <span className="font-medium text-gray-800">Built-in keys</span> (when Active, these override the default email):{' '}
                      <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">booking_confirmation</code> for <span className="font-medium">confirmed</span> customer bookings (includes assigned provider:{' '}
                      <code className="font-mono text-[10px]">provider_name</code>, <code className="font-mono text-[10px]">provider_phone</code>, <code className="font-mono text-[10px]">has_assigned_provider</code>),{' '}
                      <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">booking_pending_request</code> for <span className="font-medium">pending</span> requests (and pay-before-book checkout start),{' '}
                      <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">invoice_email</code> for invoice emails. Use placeholders like{' '}
                      <code className="rounded bg-gray-100 px-1 font-mono text-[11px]">{'{{customer_name}}'}</code>,{' '}
                      <code className="rounded bg-gray-100 px-1 font-mono text-[11px]">{'{{business_name}}'}</code> in subject and body. Booking:{' '}
                      <code className="font-mono text-[10px]">date</code>, <code className="font-mono text-[10px]">time</code>, <code className="font-mono text-[10px]">service</code>,{' '}
                      <code className="font-mono text-[10px]">address</code>, <code className="font-mono text-[10px]">booking_ref</code>,{' '}
                      <code className="font-mono text-[10px]">total_price</code>, <code className="font-mono text-[10px]">total_price_formatted</code>. Pending template also:{' '}
                      <code className="font-mono text-[10px]">awaiting_online_payment</code>, <code className="font-mono text-[10px]">intro_paragraph</code>, <code className="font-mono text-[10px]">booking_status_label</code>. Confirmed also:{' '}
                      <code className="font-mono text-[10px]">intro_paragraph</code>, <code className="font-mono text-[10px]">booking_status_label</code>. Invoice:{' '}
                      <code className="font-mono text-[10px]">invoice_number</code>, <code className="font-mono text-[10px]">total_amount</code>,{' '}
                      <code className="font-mono text-[10px]">due_date</code>, <code className="font-mono text-[10px]">issue_date</code>,{' '}
                      <code className="font-mono text-[10px]">description</code>, <code className="font-mono text-[10px]">line_summary</code>,{' '}
                      <code className="font-mono text-[10px]">view_url</code>.
                    </p>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Key</label>
                          <input
                            value={newTemplate.key}
                            onChange={(e) => setNewTemplate((s) => ({ ...s, key: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                            placeholder="booking_confirmation"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                          <input
                            value={newTemplate.name}
                            onChange={(e) => setNewTemplate((s) => ({ ...s, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Welcome email"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                        <input
                          value={newTemplate.subject}
                          onChange={(e) => setNewTemplate((s) => ({ ...s, subject: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Subject line…"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Body (text)</label>
                        <textarea
                          value={newTemplate.body_text}
                          onChange={(e) => setNewTemplate((s) => ({ ...s, body_text: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                          rows={5}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Body (HTML, optional)</label>
                        <textarea
                          value={newTemplate.body_html}
                          onChange={(e) => setNewTemplate((s) => ({ ...s, body_html: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                          rows={4}
                          placeholder="If set, this is sent instead of plain text (same placeholders)."
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={newTemplate.is_active}
                          onChange={(e) => setNewTemplate((s) => ({ ...s, is_active: e.target.checked }))}
                        />
                        Active
                      </label>
                      <button
                        type="button"
                        disabled={notifLoading}
                        onClick={async () => {
                          setNotifLoading(true);
                          setNotifError(null);
                          try {
                            const res = await fetch('/api/super-admin/email-templates', {
                              method: 'POST',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(newTemplate),
                            });
                            const j = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error(j.error || 'Failed');
                            setNewTemplate({ key: '', name: '', subject: '', body_text: '', body_html: '', is_active: true });
                            await loadNotifications();
                          } catch (e) {
                            setNotifError(e instanceof Error ? e.message : 'Failed');
                          } finally {
                            setNotifLoading(false);
                          }
                        }}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Templates</h3>
                      <button type="button" onClick={() => loadNotifications()} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Reload
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(templates ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500">
                                No templates yet.
                              </td>
                            </tr>
                          ) : (
                            (templates ?? []).slice(0, 200).map((t: any) => (
                              <tr key={t.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-mono text-gray-900">{t.key}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{t.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{t.is_active ? 'Yes' : 'No'}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="inline-flex flex-wrap items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        setNotifLoading(true);
                                        setNotifError(null);
                                        try {
                                          const res = await fetch(`/api/super-admin/email-templates/${t.id}`, {
                                            method: 'PATCH',
                                            credentials: 'include',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ is_active: !t.is_active }),
                                          });
                                          const j = await res.json().catch(() => ({}));
                                          if (res.status === 401 || res.status === 403) {
                                            router.replace('/super-admin/login');
                                            return;
                                          }
                                          if (!res.ok) throw new Error(j.error || 'Failed');
                                          await loadNotifications();
                                        } catch (e) {
                                          setNotifError(e instanceof Error ? e.message : 'Failed');
                                        } finally {
                                          setNotifLoading(false);
                                        }
                                      }}
                                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                    >
                                      {t.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (!window.confirm('Delete this email template permanently?')) return;
                                        setNotifLoading(true);
                                        setNotifError(null);
                                        try {
                                          const res = await fetch(`/api/super-admin/email-templates/${t.id}`, {
                                            method: 'DELETE',
                                            credentials: 'include',
                                          });
                                          const j = await res.json().catch(() => ({}));
                                          if (res.status === 401 || res.status === 403) {
                                            router.replace('/super-admin/login');
                                            return;
                                          }
                                          if (!res.ok) throw new Error(j.error || 'Failed to delete');
                                          await loadNotifications();
                                        } catch (e) {
                                          setNotifError(e instanceof Error ? e.message : 'Failed');
                                        } finally {
                                          setNotifLoading(false);
                                        }
                                      }}
                                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {notifTab === 'inbox' && (
                <SuperAdminNotificationInboxPanel
                  onSelectSupportTicket={(ticketId) => {
                    setActiveTab('support');
                    setSupportTicketDetailId(ticketId);
                  }}
                  onAnnouncementsMarkedRead={() => void fetchHeaderNotifications()}
                />
              )}
            </div>
          )}

          {/* Billing & subscriptions tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <CreditCard className="h-6 w-6 mr-2 text-emerald-600" />
                    Billing &amp; subscriptions
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Platform plans, payment health, and revenue — pair with Stripe for refunds and failed charges
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchDashboardData()}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-emerald-700 hover:to-teal-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>

              <SuperAdminBillingPlaybook />

              {(() => {
                const subs = billingData.platformSubscriptions ?? [];
                const issue = billingData.paymentIssueCounts ?? { failed: 0, refunded: 0, pending: 0 };
                const mrrCents = subs
                  .filter((s) => s.status === 'active')
                  .reduce((acc, s) => acc + (s.amount_cents ?? 0), 0);
                const filteredSubs = subs.filter((s) => {
                  if (billingTableFilter === 'all') return true;
                  if (billingTableFilter === 'attention') return s.status === 'past_due';
                  return s.status === billingTableFilter;
                });
                const statusClass = (st: string) => {
                  if (st === 'active') return 'bg-green-100 text-green-800';
                  if (st === 'past_due') return 'bg-red-100 text-red-800';
                  if (st === 'trialing') return 'bg-amber-100 text-amber-800';
                  if (st === 'canceled') return 'bg-gray-100 text-gray-700';
                  return 'bg-gray-100 text-gray-800';
                };
                return (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Est. MRR (plan list)</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">${(mrrCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-xs text-gray-500 mt-1">Sum of active rows × plan price</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subscriptions</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{subs.length}</p>
                        <p className="text-xs text-gray-500 mt-1">Rows in platform_subscriptions</p>
                      </div>
                      <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm bg-amber-50/50">
                        <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">Failed / pending pays</p>
                        <p className="text-2xl font-bold text-amber-900 mt-1">
                          {issue.failed} <span className="text-base font-normal text-amber-700">/ {issue.pending} pending</span>
                        </p>
                        <p className="text-xs text-amber-800/80 mt-1">From platform_payments</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Refunds recorded</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{issue.refunded}</p>
                        <p className="text-xs text-gray-500 mt-1">status = refunded</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <h3 className="font-semibold text-gray-900">All platform subscriptions</h3>
                        <div className="flex flex-wrap gap-2">
                          {(['all', 'attention', 'active', 'past_due', 'canceled'] as const).map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setBillingTableFilter(f)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                billingTableFilter === f
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {f === 'all'
                                ? 'All'
                                : f === 'attention'
                                  ? 'Needs attention'
                                  : f.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period end</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stripe</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {filteredSubs.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-gray-500 text-sm">
                                  {subs.length === 0 ? 'No platform subscriptions yet.' : 'No rows match this filter.'}
                                </td>
                              </tr>
                            ) : (
                              filteredSubs.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.business_name}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700 capitalize">
                                    {row.plan_name}{' '}
                                    <span className="text-gray-400">(${((row.amount_cents ?? 0) / 100).toFixed(2)}/mo)</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${statusClass(row.status)}`}>
                                      {row.status.replace(/_/g, ' ')}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {row.current_period_end
                                      ? new Date(row.current_period_end).toLocaleDateString(undefined, { dateStyle: 'medium' })
                                      : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-gray-500 font-mono max-w-[140px] truncate" title={row.stripe_subscription_id ?? ''}>
                                    {row.stripe_subscription_id ? `${row.stripe_subscription_id.slice(0, 14)}…` : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setBusinessDetailModalId(row.business_id)}
                                      className="text-blue-600 hover:text-blue-800 text-xs font-medium mr-2"
                                    >
                                      Details
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!!billingPortalLoadingId}
                                      onClick={() => void openBillingPortal(row.business_id)}
                                      className="inline-flex items-center text-emerald-700 hover:text-emerald-900 text-xs font-medium disabled:opacity-50"
                                    >
                                      Stripe portal
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue by plan (cash in)</h3>
                        {billingData.revenueByPlan.length === 0 ? (
                          <p className="text-sm text-gray-500">No subscription payment history yet.</p>
                        ) : (
                          <ul className="space-y-2">
                            {billingData.revenueByPlan.map((r) => (
                              <li key={r.plan} className="flex justify-between text-sm">
                                <span className="text-gray-700 capitalize">{r.plan}</span>
                                <span className="font-medium text-gray-900">${r.revenue.toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent subscription payments</h3>
                        {billingData.recentPayments.length === 0 ? (
                          <p className="text-sm text-gray-500">No recent platform payments.</p>
                        ) : (
                          <ul className="space-y-2 max-h-48 overflow-y-auto">
                            {billingData.recentPayments.slice(0, 8).map((p, i) => (
                              <li key={p.id ?? i} className="flex justify-between text-sm border-b border-gray-100 pb-2">
                                <span className="text-gray-700 truncate mr-2">{p.business_name}</span>
                                <span className="font-medium text-gray-900 shrink-0">${p.amount.toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Support tab */}
          {activeTab === 'support' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Support tickets</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={supportFilterStatus}
                      onChange={(e) => setSupportFilterStatus(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All statuses</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <select
                      value={supportFilterPriority}
                      onChange={(e) => setSupportFilterPriority(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All priorities</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <button
                      onClick={() => {
                        setNewTicketBusinessId(businesses[0]?.id ?? '');
                        setNewTicketSubject('');
                        setNewTicketMessage('');
                        setNewTicketPriority('medium');
                        setSupportNewTicketOpen(true);
                      }}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New ticket
                    </button>
                    <button onClick={fetchDashboardData} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Refresh">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {(() => {
                  const filtered = supportTickets.filter((t) => {
                    if (supportFilterStatus && t.status !== supportFilterStatus) return false;
                    if (supportFilterPriority && t.priority !== supportFilterPriority) return false;
                    return true;
                  });
                  return (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {filtered.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                          {supportTickets.length === 0 ? 'No support tickets yet.' : 'No tickets match the selected filters.'}
                        </div>
                      ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned to</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {filtered.map((t) => (
                              <tr key={t.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate" title={t.subject}>{t.subject}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{t.business_name}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    t.priority === 'high' ? 'bg-red-100 text-red-800' :
                                    t.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                                  }`}>{t.priority}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    t.status === 'open' ? 'bg-blue-100 text-blue-800' :
                                    t.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                                    t.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>{t.status.replace('_', ' ')}</span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{t.assigned_to || '—'}</td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => {
                                      setSupportTicketDetailId(t.id);
                                      setTicketEditStatus(t.status);
                                      setTicketEditAssignedTo(t.assigned_to || '');
                                    }}
                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'plans' && <SuperAdminPlatformPlansPanel />}

          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Platform Settings</h2>
                    <p className="text-sm text-gray-500 mt-1">Configure global defaults for all businesses and admins.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSavePlatformSettings}
                    disabled={settingsSaving || settingsLoading}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {settingsSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
                {settingsSaveMessage && (
                  <div className={`mt-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${
                    settingsMessageType === 'error'
                      ? 'text-red-700 bg-red-50 border-red-200'
                      : 'text-green-700 bg-green-50 border-green-200'
                  }`}>
                    {settingsMessageType === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    <span>{settingsSaveMessage}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    General
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Platform display name</label>
                    <input
                      type="text"
                      value={platformDisplayName}
                      onChange={(e) => setPlatformDisplayName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Support email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={platformSupportEmail}
                        onChange={(e) => setPlatformSupportEmail(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status page URL</label>
                    <input
                      type="url"
                      value={platformStatusPageUrl}
                      onChange={(e) => setPlatformStatusPageUrl(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-600" />
                    Security
                  </h3>
                  <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Maintenance mode</p>
                      <p className="text-xs text-gray-500">Temporarily restrict access for platform updates.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={maintenanceModeEnabled}
                      onChange={(e) => setMaintenanceModeEnabled(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Require MFA for admins</p>
                      <p className="text-xs text-gray-500">Enforce multi-factor authentication on admin login.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enforceAdminMfa}
                      onChange={(e) => setEnforceAdminMfa(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </label>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-500" />
                      Session timeout
                    </label>
                    <select
                      value={sessionTimeoutHours}
                      onChange={(e) => setSessionTimeoutHours(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="4">4 hours</option>
                      <option value="8">8 hours</option>
                      <option value="12">12 hours</option>
                      <option value="24">24 hours</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Bell className="h-4 w-4 text-amber-600" />
                  Notification Defaults
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Incident alerts</p>
                      <p className="text-xs text-gray-500">Notify admins immediately for outages and critical issues.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={sendIncidentAlerts}
                      onChange={(e) => setSendIncidentAlerts(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Weekly operations digest</p>
                      <p className="text-xs text-gray-500">Send weekly metrics and billing highlights to admins.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={sendWeeklyDigest}
                      onChange={(e) => setSendWeeklyDigest(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Other tabs placeholder (e.g. Settings) */}

          {activeTab !== 'overview' && activeTab !== 'businesses' && activeTab !== 'billing' && activeTab !== 'plans' && activeTab !== 'users' && activeTab !== 'analytics' && activeTab !== 'support' && activeTab !== 'notifications' && activeTab !== 'settings' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center animate-fade-in">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                {(() => {
                  const currentItem = navigationItems.find(item => item.id === activeTab);
                  return currentItem ? <currentItem.icon className="h-8 w-8 text-gray-400" /> : null;
                })()}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {(() => {
                  const currentItem = navigationItems.find(item => item.id === activeTab);
                  return currentItem ? `${currentItem.name} Section` : 'Unknown Section';
                })()}
              </h3>
              <p className="text-gray-500 mb-6">This section is under development.</p>
              <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-colors">
                Coming Soon
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Business detail modal */}
      {businessDetailModalId != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeBusinessModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="business-modal-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 id="business-modal-title" className="text-lg font-semibold text-gray-900">Business details</h2>
              <button
                type="button"
                onClick={closeBusinessModal}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {businessDetailLoading && (
                <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                  <p>Loading...</p>
                </div>
              )}
              {businessDetailError && !businessDetailLoading && (
                <div className="py-8 text-center">
                  <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">{businessDetailError}</p>
                  <button
                    type="button"
                    onClick={closeBusinessModal}
                    className="mt-4 text-blue-600 hover:underline font-medium"
                  >
                    Close
                  </button>
                </div>
              )}
              {businessDetailData && !businessDetailLoading && (() => {
                const { business, counts, totalRevenue, storageUsedBytes = 0, storageLimitBytes = 1 * 1024 * 1024 * 1024, recentBookings, subscription, recentSubscriptionPayments } = businessDetailData;
                const teamProfiles = counts.team_profiles ?? 0;
                const formatStorage = (bytes: number) => {
                  if (bytes === 0) return '0 B';
                  if (bytes < 1024) return `${bytes} B`;
                  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
                };
                const statusBadge = business.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
                return (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                        {business.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{business.name}</h3>
                        <p className="text-sm text-gray-500">
                          Created {business.created_at ? new Date(business.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                        </p>
                        <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge}`}>
                          {business.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <span className="ml-auto text-sm text-gray-500 capitalize">Plan: {business.plan ?? '—'}</span>
                    </div>

                    {/* Tenant & profile */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                        <Tag className="h-3.5 w-3.5 mr-1.5" /> Tenant & profile
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        {business.category && (
                          <div>
                            <span className="text-gray-500">Category</span>
                            <p className="font-medium text-gray-900 capitalize">{business.category}</p>
                          </div>
                        )}
                        {(business.subdomain || business.domain) && (
                          <div>
                            <span className="text-gray-500">URLs</span>
                            <div className="space-y-1">
                              {business.subdomain && (
                                <p className="font-medium text-gray-900">
                                  Subdomain: <span className="font-mono text-xs">{business.subdomain}</span>
                                </p>
                              )}
                              {business.domain && (
                                <p className="font-medium text-gray-900">
                                  Custom domain: <span className="font-mono text-xs">{business.domain}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {business.updated_at && (
                          <div>
                            <span className="text-gray-500">Last updated</span>
                            <p className="font-medium text-gray-900">{new Date(business.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                          </div>
                        )}
                        {business.description && (
                          <div className="sm:col-span-2">
                            <span className="text-gray-500">Description</span>
                            <p className="text-gray-700 mt-0.5 whitespace-pre-wrap line-clamp-3">{business.description}</p>
                          </div>
                        )}
                        {business.logo_url && (
                          <div>
                            <span className="text-gray-500">Logo</span>
                            <img src={business.logo_url} alt="" className="mt-1 h-10 w-10 object-contain rounded border border-gray-200" />
                          </div>
                        )}
                        {!business.category && !business.subdomain && !business.domain && !business.updated_at && !business.description && !business.logo_url && (
                          <p className="text-gray-500 sm:col-span-2">No tenant profile details</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                          <Building2 className="h-3.5 w-3.5 mr-1.5" /> Contact (business)
                        </h4>
                        <div className="space-y-1.5 text-sm">
                          {business.business_email && (
                            <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-gray-400" /><span>{business.business_email}</span></div>
                          )}
                          {business.business_phone && (
                            <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-gray-400" /><span>{business.business_phone}</span></div>
                          )}
                          {(business.address || business.city) && (
                            <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-gray-400" /><span>{[business.address, business.city, business.zip_code].filter(Boolean).join(', ')}</span></div>
                          )}
                          {business.website && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-3.5 w-3.5 text-gray-400" />
                              <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{business.website}</a>
                            </div>
                          )}
                          {!business.business_email && !business.business_phone && !business.address && !business.city && !business.website && <p className="text-gray-500">No contact details</p>}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                          <User className="h-3.5 w-3.5 mr-1.5" /> Owner
                        </h4>
                        <div className="space-y-1.5 text-sm">
                          <p className="font-medium text-gray-900">{business.owner_name || '—'}</p>
                          {business.owner_email && (
                            <a href={`mailto:${business.owner_email}`} className="text-blue-600 hover:underline flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{business.owner_email}</a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Subscription & Billing */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Subscription & Billing
                      </h4>
                      {subscription ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                              <span className="text-gray-500">Plan</span>
                              <p className="font-medium text-gray-900 capitalize">{subscription.planName}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Monthly amount</span>
                              <p className="font-medium text-gray-900">
                                {subscription.amountCents === 0 ? 'Free' : `$${(subscription.amountCents / 100).toFixed(2)}/mo`}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Status</span>
                              <p>
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${subscription.status === 'active' ? 'bg-green-100 text-green-800' : subscription.status === 'canceled' || subscription.status === 'cancelled' ? 'bg-gray-100 text-gray-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {subscription.status}
                                </span>
                              </p>
                            </div>
                            {subscription.currentPeriodEnd && (
                              <div>
                                <span className="text-gray-500">Next billing date</span>
                                <p className="font-medium text-gray-900">{new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                              disabled={billingPortalLoadingId === business.id}
                              onClick={() => void openBillingPortal(business.id)}
                            >
                              {billingPortalLoadingId === business.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              Open Stripe portal
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200"
                              onClick={() => {
                                setEditBusinessId(business.id);
                                closeBusinessModal();
                              }}
                            >
                              Change plan
                            </button>
                            {(subscription.stripeCustomerId || subscription.stripeSubscriptionId) && (
                              <div className="text-xs text-gray-500 sm:text-right flex flex-col sm:items-end">
                                {subscription.stripeCustomerId ? (
                                  <div className="break-all">
                                    Stripe customer: <span className="font-mono">{subscription.stripeCustomerId}</span>
                                  </div>
                                ) : null}
                                {subscription.stripeSubscriptionId ? (
                                  <div className="break-all">
                                    Stripe subscription: <span className="font-mono">{subscription.stripeSubscriptionId}</span>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                          {(recentSubscriptionPayments?.length ?? 0) > 0 && (
                            <div className="pt-2 border-t border-gray-200">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Recent subscription payments</p>
                              <ul className="space-y-1.5 text-sm">
                                {recentSubscriptionPayments!.slice(0, 5).map((pay, i) => (
                                  <li key={i} className="flex items-center justify-between">
                                    <span className="text-gray-700">{pay.description ?? 'Subscription'}</span>
                                    <span className="font-medium">${(pay.amount_cents / 100).toFixed(2)}</span>
                                  </li>
                                ))}
                              </ul>
                              <p className="text-xs text-gray-500 mt-1">Last payment: {new Date(recentSubscriptionPayments![0].paid_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                            </div>
                          )}

                          {/* Payment health & billing events */}
                          <div className="pt-3 border-t border-gray-200 space-y-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Payment health</p>
                              <div className="flex flex-wrap gap-2">
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${((businessDetailData?.paymentIssueCounts?.failed ?? 0) > 0) ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                  Failed: {businessDetailData?.paymentIssueCounts?.failed ?? 0}
                                </span>
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${((businessDetailData?.paymentIssueCounts?.pending ?? 0) > 0) ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'}`}>
                                  Pending: {businessDetailData?.paymentIssueCounts?.pending ?? 0}
                                </span>
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${((businessDetailData?.paymentIssueCounts?.refunded ?? 0) > 0) ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                  Refunded: {businessDetailData?.paymentIssueCounts?.refunded ?? 0}
                                </span>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Recent billing events</p>
                              {((businessDetailData?.recentPlatformPayments?.length ?? 0) === 0) ? (
                                <p className="text-sm text-gray-500">No billing events recorded yet.</p>
                              ) : (
                                <ul className="space-y-1.5 text-sm">
                                  {businessDetailData!.recentPlatformPayments!.slice(0, 6).map((row, i) => (
                                    <li key={row.id ?? i} className="flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-gray-700 truncate">{row.description ?? 'Subscription'}</p>
                                        <p className="text-xs text-gray-500">{new Date(row.paid_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-medium">${(row.amount_cents / 100).toFixed(2)}</span>
                                        <span
                                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                            row.status === 'paid'
                                              ? 'bg-green-100 text-green-800'
                                              : row.status === 'failed'
                                                ? 'bg-red-100 text-red-800'
                                                : row.status === 'pending'
                                                  ? 'bg-amber-100 text-amber-800'
                                                  : row.status === 'refunded'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                          }`}
                                        >
                                          {row.status}
                                        </span>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Plan: {business.plan ?? '—'} (subscription details not available)</p>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                        <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Tenant usage
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <div><p className="text-lg font-bold text-gray-900">{counts.bookings}</p><p className="text-xs text-gray-500">Bookings</p></div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-purple-600" />
                          <div><p className="text-lg font-bold text-gray-900">{counts.providers}</p><p className="text-xs text-gray-500">Providers</p></div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                          <Users2 className="h-4 w-4 text-green-600" />
                          <div><p className="text-lg font-bold text-gray-900">{counts.customers}</p><p className="text-xs text-gray-500">Customers</p></div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                          <User className="h-4 w-4 text-cyan-600" />
                          <div><p className="text-lg font-bold text-gray-900">{teamProfiles}</p><p className="text-xs text-gray-500">Team (profiles)</p></div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-amber-600" />
                          <div><p className="text-lg font-bold text-gray-900">${totalRevenue.toLocaleString()}</p><p className="text-xs text-gray-500">Revenue</p></div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                          <Folder className="h-4 w-4 text-slate-600" />
                          <div className="min-w-0 flex-1">
                            <p className="text-lg font-bold text-gray-900">{formatStorage(storageUsedBytes)}</p>
                            <p className="text-xs text-gray-500">Storage</p>
                            {storageLimitBytes > 0 && (
                              <>
                                <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-slate-500 transition-all"
                                    style={{ width: `${Math.min(100, (storageUsedBytes / storageLimitBytes) * 100)}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatStorage(storageUsedBytes)} of {formatStorage(storageLimitBytes)} used
                                  ({Math.min(100, Math.round((storageUsedBytes / storageLimitBytes) * 100))}%)
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" /> Recent bookings
                      </h4>
                      {recentBookings.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4">No bookings yet.</p>
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service / Customer</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {recentBookings.map((b) => (
                                <tr key={b.id}>
                                  <td className="px-4 py-2"><p className="font-medium text-gray-900">{b.service ?? '—'}</p><p className="text-xs text-gray-500">{b.customer_name ?? '—'}</p></td>
                                  <td className="px-4 py-2 text-gray-700">{b.scheduled_date ? new Date(b.scheduled_date).toLocaleDateString() : '—'}{b.scheduled_time ? ` ${String(b.scheduled_time).slice(0, 5)}` : ''}</td>
                                  <td className="px-4 py-2">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${b.status === 'completed' ? 'bg-green-100 text-green-800' : b.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{b.status}</span>
                                  </td>
                                  <td className="px-4 py-2 text-right font-medium">${Number(b.total_price ?? 0).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Edit business modal */}
      {editBusinessId && (
        <EditBusinessModalInline
          businessId={editBusinessId}
          onClose={() => setEditBusinessId(null)}
          onSaved={() => { fetchDashboardData(); setEditBusinessId(null); }}
          setSaveLoading={setSaveBusinessLoading}
        />
      )}

      {/* Create business modal */}
      {createBusinessOpen && (
        <CreateBusinessModalInline
          onClose={() => setCreateBusinessOpen(false)}
          onCreated={() => { fetchDashboardData(); setCreateBusinessOpen(false); }}
          setLoading={setCreateBusinessLoading}
        />
      )}

      {/* New support ticket modal */}
      {supportNewTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">New support ticket</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business</label>
                <select
                  value={newTicketBusinessId}
                  onChange={(e) => setNewTicketBusinessId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select business</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  placeholder="Brief subject"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                  rows={4}
                  placeholder="Describe the issue or request..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newTicketPriority}
                  onChange={(e) => setNewTicketPriority(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button type="button" onClick={() => setSupportNewTicketOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleCreateTicket} disabled={newTicketLoading} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center gap-2">
                {newTicketLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support ticket detail modal */}
      {supportTicketDetailId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeSupportTicketDetail} role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Ticket details</h3>
              <button type="button" onClick={closeSupportTicketDetail} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              {supportTicketDetailLoading && (
                <div className="py-12 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>
              )}
              {!supportTicketDetailLoading && supportTicketDetail && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Subject</p>
                    <p className="text-lg font-medium text-gray-900 mt-0.5">{supportTicketDetail.subject}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Business</p>
                      <p className="text-gray-900 mt-0.5">{supportTicketDetail.business_name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Priority</p>
                      <p className="mt-0.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${supportTicketDetail.priority === 'high' ? 'bg-red-100 text-red-800' : supportTicketDetail.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'}`}>
                          {supportTicketDetail.priority}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Requester</p>
                      <p className="text-gray-900 mt-0.5">{supportTicketDetail.requester_email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Created</p>
                      <p className="text-gray-900 mt-0.5">{supportTicketDetail.created_at ? new Date(supportTicketDetail.created_at).toLocaleString() : '—'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Message</p>
                    <p className="text-gray-700 mt-1 whitespace-pre-wrap">{supportTicketDetail.message || '—'}</p>
                  </div>
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Update ticket</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select
                          value={ticketEditStatus}
                          onChange={(e) => setTicketEditStatus(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Assigned to</label>
                        <input
                          type="text"
                          value={ticketEditAssignedTo}
                          onChange={(e) => setTicketEditAssignedTo(e.target.value)}
                          placeholder="Email or name"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handleUpdateTicket}
                        disabled={ticketSaveLoading}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {ticketSaveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Save changes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete business confirmation */}
      {deleteConfirmBusinessId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900">Delete business?</h3>
            <p className="text-sm text-gray-600 mt-2">This will permanently delete the business and its data. This cannot be undone.</p>
            <div className="flex gap-3 mt-6 justify-end">
              <button type="button" onClick={() => setDeleteConfirmBusinessId(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  fetch(`/api/super-admin/businesses/${deleteConfirmBusinessId}`, { method: 'DELETE', credentials: 'include' })
                    .then((r) => { if (r.ok) { fetchDashboardData(); setDeleteConfirmBusinessId(null); } });
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <NotificationDetailDialog
        open={!!headerNotifDetail}
        onOpenChange={(open) => {
          if (!open) setHeaderNotifDetail(null);
        }}
        item={headerNotifDetail}
        theme="light"
      />

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
      `}</style>
    </div>
  );
}

export default function SuperAdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
          <p className="text-gray-600 font-medium">Loading…</p>
        </div>
      }
    >
      <SuperAdminDashboardInner />
    </Suspense>
  );
}
