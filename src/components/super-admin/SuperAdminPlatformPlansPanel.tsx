"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { PRICING_FEATURES, type FeatureValue } from "@/lib/pricing/pricingFeatures";

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  amount_cents: number;
  billing_interval: string;
  stripe_price_id: string | null;
  max_calendars: number | null;
  max_staff_users: number | null;
  max_bookings_per_month: number | null;
  pricing_features: Record<string, FeatureValue> | null;
  is_active: boolean;
  description: string | null;
  created_at?: string;
};

function formatLimit(n: number | null | undefined) {
  if (n === null || n === undefined) return "Unlimited";
  return n.toLocaleString();
}

export function SuperAdminPlatformPlansPanel() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [playbookOpen, setPlaybookOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    amountDollars: "",
    billing_interval: "monthly",
    stripe_price_id: "",
    max_calendars: "",
    max_staff_users: "",
    max_bookings_per_month: "",
    description: "",
    is_active: true,
    pricing_features: {} as Record<string, FeatureValue>,
  });

  const defaultPricingFeaturesForSlug = useCallback(
    (slug: string) => {
      const s = slug.trim().toLowerCase();
      if (s !== "starter" && s !== "growth" && s !== "premium") return {};
      const out: Record<string, FeatureValue> = {};
      for (const f of PRICING_FEATURES) {
        out[f.name] = (f as any)[s] as FeatureValue;
      }
      return out;
    },
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/platform-plans", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load plans");
      setPlans((json.plans ?? []) as PlanRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      slug: "",
      amountDollars: "",
      billing_interval: "monthly",
      stripe_price_id: "",
      max_calendars: "",
      max_staff_users: "",
      max_bookings_per_month: "",
      description: "",
      is_active: true,
      pricing_features: {},
    });
    setModalOpen(true);
  };

  const openEdit = (p: PlanRow) => {
    setEditing(p);
    setForm({
      name: p.name,
      slug: p.slug,
      amountDollars: (p.amount_cents / 100).toFixed(2),
      billing_interval: p.billing_interval || "monthly",
      stripe_price_id: p.stripe_price_id ?? "",
      max_calendars: p.max_calendars != null ? String(p.max_calendars) : "",
      max_staff_users: p.max_staff_users != null ? String(p.max_staff_users) : "",
      max_bookings_per_month: p.max_bookings_per_month != null ? String(p.max_bookings_per_month) : "",
      description: p.description ?? "",
      is_active: p.is_active !== false,
      pricing_features: p.pricing_features ?? defaultPricingFeaturesForSlug(p.slug),
    });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const dollars = parseFloat(form.amountDollars);
      if (Number.isNaN(dollars) || dollars < 0) {
        throw new Error("Enter a valid monthly price (0 or more).");
      }
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        amount_dollars: dollars,
        billing_interval: form.billing_interval,
        stripe_price_id: form.stripe_price_id.trim() || null,
        max_calendars: form.max_calendars.trim() === "" ? null : parseInt(form.max_calendars, 10),
        max_staff_users: form.max_staff_users.trim() === "" ? null : parseInt(form.max_staff_users, 10),
        max_bookings_per_month:
          form.max_bookings_per_month.trim() === "" ? null : parseInt(form.max_bookings_per_month, 10),
        description: form.description.trim() || null,
        is_active: form.is_active,
        pricing_features: form.pricing_features,
      };
      if (payload.max_calendars !== null && (Number.isNaN(payload.max_calendars) || payload.max_calendars < 0)) {
        throw new Error("Calendars must be empty (unlimited) or a non-negative integer.");
      }
      if (payload.max_staff_users !== null && (Number.isNaN(payload.max_staff_users) || payload.max_staff_users < 0)) {
        throw new Error("Staff/users must be empty (unlimited) or a non-negative integer.");
      }
      if (
        payload.max_bookings_per_month !== null &&
        (Number.isNaN(payload.max_bookings_per_month) || payload.max_bookings_per_month < 0)
      ) {
        throw new Error("Bookings / month must be empty (unlimited) or a non-negative integer.");
      }

      if (editing) {
        const res = await fetch(`/api/super-admin/platform-plans/${editing.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload.name,
            slug: payload.slug,
            amount_dollars: payload.amount_dollars,
            billing_interval: payload.billing_interval,
            stripe_price_id: payload.stripe_price_id,
            max_calendars: payload.max_calendars,
            max_staff_users: payload.max_staff_users,
            max_bookings_per_month: payload.max_bookings_per_month,
            description: payload.description,
            is_active: payload.is_active,
            pricing_features: payload.pricing_features,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Save failed");
      } else {
        const res = await fetch("/api/super-admin/platform-plans", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Create failed");
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/platform-plans/${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setDeleteId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Layers className="h-6 w-6 mr-2 text-indigo-600" />
            Plans &amp; feature control
          </h2>
          <p className="text-gray-600 mt-1">
            Define tiers, pricing, and usage caps. Empty limit fields mean <strong>unlimited</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New plan
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setPlaybookOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-indigo-50/60 transition-colors"
        >
          <div>
            <p className="font-semibold text-gray-900 text-sm sm:text-base">How pricing scales</p>
            <p className="text-xs text-gray-600">Create Basic / Pro / Premium style tiers and tune limits per plan</p>
          </div>
          {playbookOpen ? (
            <ChevronDown className="h-5 w-5 text-gray-500 shrink-0" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500 shrink-0" />
          )}
        </button>
        {playbookOpen && (
          <ul className="px-4 pb-4 space-y-2 text-sm text-gray-700 border-t border-indigo-100/80 pt-3">
            <li>
              <span className="font-medium text-gray-900">Plans</span> — name, slug (URL-safe id), monthly price, optional Stripe{" "}
              <code className="text-xs bg-gray-100 px-1 rounded">price_</code> id.
            </li>
            <li>
              <span className="font-medium text-gray-900">Calendars</span> — cap locations / scheduling calendars per tenant.
            </li>
            <li>
              <span className="font-medium text-gray-900">Staff / users</span> — cap team profiles linked to the business.
            </li>
            <li>
              <span className="font-medium text-gray-900">Bookings / month</span> — cap bookings per calendar month (enforcement in app can be wired next).
            </li>
            <li className="text-xs text-gray-500 pt-1">
              Deactivate a plan to hide it from new checkouts; existing subscriptions stay on their plan until changed.
            </li>
          </ul>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mr-2" />
            Loading plans…
          </div>
        ) : plans.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">No plans yet. Create your first tier.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calendars</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings / mo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{p.slug}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      ${(p.amount_cents / 100).toFixed(2)}
                      <span className="text-gray-400 text-xs">/{p.billing_interval === "yearly" ? "yr" : "mo"}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatLimit(p.max_calendars)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatLimit(p.max_staff_users)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatLimit(p.max_bookings_per_month)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          p.is_active !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p.is_active !== false ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(p.id)}
                        className="inline-flex items-center text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={() => !saving && setModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? "Edit plan" : "New plan"}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="e.g. Pro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                      onChange={(e) =>
                        setForm((f) => {
                          const nextSlug = e.target.value;
                          const defaults = defaultPricingFeaturesForSlug(nextSlug);
                          return {
                            ...f,
                            slug: nextSlug,
                            pricing_features: Object.keys(defaults).length ? defaults : f.pricing_features,
                          };
                        })
                      }
                  disabled={!!editing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                  placeholder="e.g. pro"
                />
                {editing && <p className="text-xs text-gray-500 mt-1">Slug is fixed after create to avoid breaking links.</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (USD)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.amountDollars}
                    onChange={(e) => setForm((f) => ({ ...f, amountDollars: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing</label>
                  <select
                    value={form.billing_interval}
                    onChange={(e) => setForm((f) => ({ ...f, billing_interval: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stripe price ID (optional)</label>
                <input
                  type="text"
                  value={form.stripe_price_id}
                  onChange={(e) => setForm((f) => ({ ...f, stripe_price_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  placeholder="price_..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max calendars</label>
                  <input
                    type="number"
                    min={0}
                    value={form.max_calendars}
                    onChange={(e) => setForm((f) => ({ ...f, max_calendars: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="∞ empty"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max staff / users</label>
                  <input
                    type="number"
                    min={0}
                    value={form.max_staff_users}
                    onChange={(e) => setForm((f) => ({ ...f, max_staff_users: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="∞ empty"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max bookings / mo</label>
                  <input
                    type="number"
                    min={0}
                    value={form.max_bookings_per_month}
                    onChange={(e) => setForm((f) => ({ ...f, max_bookings_per_month: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="∞ empty"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <p className="block text-sm font-semibold text-gray-900">Pricing page features</p>
                    <p className="text-xs text-gray-500">
                      Edit what shows on the marketing pricing table. Empty/unknown values fall back to defaults.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {PRICING_FEATURES.map((feat) => {
                    const activeSlug = (editing?.slug ?? form.slug).trim().toLowerCase();
                    const fallback = (activeSlug === "starter" || activeSlug === "growth" || activeSlug === "premium")
                      ? (feat as any)[activeSlug]
                      : feat.starter;
                    const currentValue = form.pricing_features[feat.name] ?? fallback;
                    const valueType = typeof currentValue;

                    return (
                      <div key={feat.name} className="flex items-center justify-between gap-3">
                        <div className="text-sm text-gray-700 pr-2">
                          {feat.name}
                        </div>
                        {valueType === "boolean" ? (
                          <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={Boolean(currentValue)}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  pricing_features: { ...(f.pricing_features ?? {}), [feat.name]: e.target.checked },
                                }))
                              }
                            />
                          </label>
                        ) : (
                          <input
                            type="text"
                            value={String(currentValue)}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                pricing_features: { ...(f.pricing_features ?? {}), [feat.name]: e.target.value },
                              }))
                            }
                            className="w-56 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                Plan active (available for new subscriptions)
              </label>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submit()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={() => !saving && setDeleteId(null)}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">Delete plan?</h3>
            <p className="text-sm text-gray-600 mt-2">
              Only plans with no businesses assigned can be removed. Otherwise deactivate the plan instead.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void confirmDelete()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium inline-flex items-center"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
