import type { SupabaseClient } from "@supabase/supabase-js";

export type UnifiedActorType = "admin" | "provider" | "customer" | "system";

export type UnifiedLogEntry = {
  id: string;
  kind: string;
  created_at: string;
  booking_id: string | null;
  summary: string;
  actor_type: UnifiedActorType;
  actor_name: string | null;
  source_module: string;
  event_key: string | null;
  email_to: string | null;
  email_subject: string | null;
  email_status: string | null;
  email_error: string | null;
  ip_address: string | null;
  link: string | null;
};

function oneRelation<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

function providerDisplayName(p: { first_name?: string | null; last_name?: string | null } | null): string | null {
  if (!p) return null;
  const a = (p.first_name || "").trim();
  const b = (p.last_name || "").trim();
  const full = `${a} ${b}`.trim();
  return full || null;
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function parseBookingUuidFromText(text: string): string | null {
  const m = text.match(UUID_RE);
  return m ? m[0] : null;
}

/** Resolves booking id from admin relative links like /admin/bookings?booking=… */
function bookingIdFromAdminLink(link: string | null): string | null {
  if (!link || typeof link !== "string") return null;
  const trimmed = link.trim();
  const qIdx = trimmed.indexOf("?");
  const query = qIdx >= 0 ? trimmed.slice(qIdx + 1) : "";
  if (query) {
    const params = new URLSearchParams(query);
    const a = params.get("booking") || params.get("id");
    if (a && UUID_RE.test(a)) return a;
  }
  const m = trimmed.match(UUID_RE);
  return m ? m[0] : null;
}

function entryMatchesBookingFilter(e: UnifiedLogEntry, bookingId: string): boolean {
  if (e.booking_id && e.booking_id === bookingId) return true;
  if (e.link && bookingIdFromAdminLink(e.link) === bookingId) return true;
  if (parseBookingUuidFromText(e.summary) === bookingId) return true;
  return false;
}

function inferNotificationActor(title: string, description: string): { actor_type: UnifiedActorType; actor_name: string | null } {
  const text = `${title} ${description}`;
  const prov = text.match(/Provider\s+([A-Za-z.\x27-]+)\s+([A-Za-z.\x27-]+)/);
  if (prov) {
    return { actor_type: "provider", actor_name: `${prov[1]} ${prov[2]}`.trim() };
  }
  if (/cancellation request|customer requested|customer cancelled/i.test(text)) {
    return { actor_type: "customer", actor_name: null };
  }
  return { actor_type: "system", actor_name: null };
}

function inferNotificationModule(title: string, description: string): string {
  const t = `${title} ${description}`.toLowerCase();
  if (/payout|payment to provider|earnings/i.test(t)) return "Provider payments";
  if (/quote|draft/i.test(t)) return "Quotes";
  if (/prospect|hiring|interview/i.test(t)) return "Hiring";
  if (/lead/i.test(t)) return "Leads";
  if (/support|ticket/i.test(t)) return "Support";
  if (/customer(?!.*booking)/i.test(t) && /profile|account/i.test(t)) return "Customers";
  if (/booking|assigned|invitation|grab|recurring|occurrence/i.test(t)) return "Bookings";
  return "Alerts";
}

function emailSummary(row: {
  to_email: string;
  subject: string;
  status: string;
}): string {
  if (row.status === "failed") {
    return `Failed to send quote email to ${row.to_email} — ${row.subject}`;
  }
  return `Quote email sent to ${row.to_email} — ${row.subject}`;
}

function timeLogMilestones(
  row: {
    id: string;
    booking_id: string;
    provider_id: string;
    on_the_way_at: string | null;
    at_location_at: string | null;
    clocked_in_at: string | null;
    lunch_start_at: string | null;
    lunch_end_at: string | null;
    clocked_out_at: string | null;
    service_providers: { first_name?: string | null; last_name?: string | null } | null;
  },
  fetchCap: number
): UnifiedLogEntry[] {
  const pname = providerDisplayName(row.service_providers);
  const who = pname || "Provider";
  const pairs: Array<[string | null, string]> = [
    [row.on_the_way_at, `${who} en route to job`],
    [row.at_location_at, `${who} arrived at location`],
    [row.clocked_in_at, `${who} clocked in`],
    [row.lunch_start_at, `${who} started lunch break`],
    [row.lunch_end_at, `${who} ended lunch break`],
    [row.clocked_out_at, `${who} clocked out`],
  ];
  const out: UnifiedLogEntry[] = [];
  const keys = ["way", "loc", "in", "lunch_s", "lunch_e", "out"] as const;
  for (let i = 0; i < pairs.length; i++) {
    const [ts, summary] = pairs[i];
    if (!ts) continue;
    const key = keys[i] ?? "x";
    out.push({
      id: `tl:${row.id}:${key}`,
      kind: "time_log",
      created_at: ts,
      booking_id: row.booking_id,
      summary,
      actor_type: "provider",
      actor_name: pname,
      source_module: "Field / time clock",
      event_key: null,
      email_to: null,
      email_subject: null,
      email_status: null,
      email_error: null,
      ip_address: null,
      link: "/admin/bookings",
    });
    if (out.length >= fetchCap) break;
  }
  return out;
}

export async function buildUnifiedBusinessLogs(
  supabase: SupabaseClient,
  businessId: string,
  options: { bookingId: string | null; fetchCap: number }
): Promise<{ entries: UnifiedLogEntry[]; warnings: string[] }> {
  const warnings: string[] = [];
  const { bookingId, fetchCap } = options;
  const cap = Math.max(1, Math.min(fetchCap, 500));
  const scoped = !!bookingId;

  const pushWarn = (label: string, err: { message?: string } | null) => {
    if (err?.message) warnings.push(`${label}: ${err.message}`);
  };

  const results = await Promise.all([
    (async () => {
      let q = supabase
        .from("booking_quote_activity_logs")
        .select("id, booking_id, created_at, activity_text, ip_address, actor_name, event_key")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(cap);
      if (bookingId) q = q.eq("booking_id", bookingId);
      const { data, error } = await q;
      pushWarn("Quote activity logs", error);
      return (data ?? []) as Array<{
        id: string;
        booking_id: string;
        created_at: string;
        activity_text: string;
        ip_address: string | null;
        actor_name: string | null;
        event_key: string | null;
      }>;
    })(),
    (async () => {
      let q = supabase
        .from("booking_quote_email_logs")
        .select("id, booking_id, created_at, to_email, subject, status, error_message, ip_address")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(cap);
      if (bookingId) q = q.eq("booking_id", bookingId);
      const { data, error } = await q;
      pushWarn("Quote email logs", error);
      return (data ?? []) as Array<{
        id: string;
        booking_id: string;
        created_at: string;
        to_email: string;
        subject: string;
        status: string;
        error_message: string | null;
        ip_address: string | null;
      }>;
    })(),
    (async () => {
      let q = supabase
        .from("provider_payment_logs")
        .select(
          "id, created_at, provider_id, total_amount, earnings_count, payout_method, notes, service_providers(first_name,last_name)"
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(cap);
      const { data, error } = await q;
      pushWarn("Provider payment logs", error);
      return (data ?? []) as Array<{
        id: string;
        created_at: string;
        provider_id: string;
        total_amount: number;
        earnings_count: number;
        payout_method: string;
        notes: string | null;
        service_providers: { first_name?: string | null; last_name?: string | null } | null;
      }>;
    })(),
    (async () => {
      let q = supabase
        .from("admin_notifications")
        .select("id, created_at, title, description, link")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(cap);
      const { data, error } = await q;
      pushWarn("Admin notifications", error);
      return (data ?? []) as Array<{
        id: string;
        created_at: string;
        title: string;
        description: string;
        link: string | null;
      }>;
    })(),
    (async () => {
      let q = supabase
        .from("booking_assignments")
        .select(
          "id, booking_id, provider_id, status, assignment_type, assigned_at, updated_at, business_id, service_providers(first_name,last_name)"
        )
        .eq("business_id", businessId)
        .order("updated_at", { ascending: false })
        .limit(cap);
      if (bookingId) q = q.eq("booking_id", bookingId);
      const { data, error } = await q;
      pushWarn("Booking assignments", error);
      return (data ?? []) as Array<{
        id: string;
        booking_id: string;
        provider_id: string;
        status: string;
        assignment_type: string;
        assigned_at: string;
        updated_at: string;
        business_id: string | null;
        service_providers: { first_name?: string | null; last_name?: string | null } | null;
      }>;
    })(),
    (async () => {
      let q = supabase
        .from("booking_time_logs")
        .select(
          "id, booking_id, provider_id, on_the_way_at, at_location_at, clocked_in_at, lunch_start_at, lunch_end_at, clocked_out_at, service_providers(first_name,last_name)"
        )
        .eq("business_id", businessId)
        .order("updated_at", { ascending: false })
        .limit(Math.min(cap, 80));
      if (bookingId) q = q.eq("booking_id", bookingId);
      const { data, error } = await q;
      pushWarn("Booking time logs", error);
      return (data ?? []) as Array<{
        id: string;
        booking_id: string;
        provider_id: string;
        on_the_way_at: string | null;
        at_location_at: string | null;
        clocked_in_at: string | null;
        lunch_start_at: string | null;
        lunch_end_at: string | null;
        clocked_out_at: string | null;
        service_providers: { first_name?: string | null; last_name?: string | null } | null;
      }>;
    })(),
    (async () => {
      if (scoped) return [];
      let q = supabase
        .from("hiring_prospects")
        .select("id, created_at, name, email, stage, role, source")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(cap);
      const { data, error } = await q;
      pushWarn("Hiring prospects", error);
      return (data ?? []) as Array<{
        id: string;
        created_at: string;
        name: string;
        email: string;
        stage: string;
        role: string;
        source: string;
      }>;
    })(),
    (async () => {
      if (scoped) return [];
      let q = supabase
        .from("leads")
        .select("id, created_at, name, email, phone, status")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(cap);
      const { data, error } = await q;
      pushWarn("Leads", error);
      return (data ?? []) as Array<{
        id: string;
        created_at: string;
        name: string;
        email: string | null;
        phone: string | null;
        status: string;
      }>;
    })(),
    (async () => {
      if (scoped) return [];
      let q = supabase
        .from("support_tickets")
        .select("id, created_at, subject, status, priority")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(cap);
      const { data, error } = await q;
      pushWarn("Support tickets", error);
      return (data ?? []) as Array<{
        id: string;
        created_at: string;
        subject: string;
        status: string;
        priority: string;
      }>;
    })(),
    (async () => {
      if (scoped) return [];
      let q = supabase
        .from("customers")
        .select("id, created_at, name, email")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(cap);
      const { data, error } = await q;
      pushWarn("Customers", error);
      return (data ?? []) as Array<{
        id: string;
        created_at: string;
        name: string;
        email: string;
      }>;
    })(),
  ]);

  const [
    quoteActivities,
    quoteEmails,
    payLogs,
    notifications,
    assignments,
    timeLogs,
    hiringRows,
    leadRows,
    ticketRows,
    customerRows,
  ] = results;

  const merged: UnifiedLogEntry[] = [];

  for (const row of quoteActivities) {
    merged.push({
      id: `qa:${row.id}`,
      kind: "quote_activity",
      created_at: row.created_at,
      booking_id: row.booking_id,
      summary: row.activity_text,
      actor_type: "admin",
      actor_name: row.actor_name,
      source_module: "Quotes",
      event_key: row.event_key,
      email_to: null,
      email_subject: null,
      email_status: null,
      email_error: null,
      ip_address: row.ip_address,
      link: row.booking_id ? `/admin/bookings?booking=${row.booking_id}` : "/admin/bookings",
    });
  }

  for (const row of quoteEmails) {
    merged.push({
      id: `qe:${row.id}`,
      kind: "quote_email",
      created_at: row.created_at,
      booking_id: row.booking_id,
      summary: emailSummary(row),
      actor_type: "admin",
      actor_name: null,
      source_module: "Quotes",
      event_key: null,
      email_to: row.to_email,
      email_subject: row.subject,
      email_status: row.status,
      email_error: row.error_message,
      ip_address: row.ip_address,
      link: `/admin/bookings?booking=${row.booking_id}`,
    });
  }

  for (const row of payLogs) {
    const pname = providerDisplayName(oneRelation(row.service_providers));
    const amt = Number(row.total_amount);
    const money = Number.isFinite(amt) ? amt.toFixed(2) : String(row.total_amount);
    merged.push({
      id: `pp:${row.id}`,
      kind: "provider_payment",
      created_at: row.created_at,
      booking_id: null,
      summary: `Provider payout: $${money} (${row.earnings_count} earning${row.earnings_count === 1 ? "" : "s"}, ${row.payout_method})${pname ? ` — ${pname}` : ""}${row.notes ? ` — ${row.notes}` : ""}`,
      actor_type: "admin",
      actor_name: null,
      source_module: "Provider payments",
      event_key: null,
      email_to: null,
      email_subject: null,
      email_status: null,
      email_error: null,
      ip_address: null,
      link: "/admin/provider-payments",
    });
  }

  for (const row of notifications) {
    const { actor_type, actor_name } = inferNotificationActor(row.title, row.description);
    const source_module = inferNotificationModule(row.title, row.description);
    const summary = [row.title, row.description].filter(Boolean).join(" — ");
    const resolvedBookingId =
      bookingIdFromAdminLink(row.link) || parseBookingUuidFromText(`${row.title} ${row.description}`);
    merged.push({
      id: `n:${row.id}`,
      kind: "admin_notification",
      created_at: row.created_at,
      booking_id: resolvedBookingId,
      summary,
      actor_type,
      actor_name,
      source_module,
      event_key: null,
      email_to: null,
      email_subject: null,
      email_status: null,
      email_error: null,
      ip_address: null,
      link: row.link,
    });
  }

  for (const row of assignments) {
    const pname = providerDisplayName(oneRelation(row.service_providers));
    const when = row.updated_at || row.assigned_at;
    merged.push({
      id: `ba:${row.id}`,
      kind: "assignment",
      created_at: when,
      booking_id: row.booking_id,
      summary: `Assignment ${row.status} (${row.assignment_type})${pname ? ` — ${pname}` : ""}`,
      actor_type: "system",
      actor_name: pname,
      source_module: "Bookings",
      event_key: row.status,
      email_to: null,
      email_subject: null,
      email_status: null,
      email_error: null,
      ip_address: null,
      link: `/admin/bookings?booking=${row.booking_id}`,
    });
  }

  for (const row of timeLogs) {
    merged.push(
      ...timeLogMilestones(
        {
          ...row,
          service_providers: oneRelation(row.service_providers),
        },
        cap
      )
    );
  }

  for (const row of hiringRows) {
    merged.push({
      id: `hp:${row.id}`,
      kind: "hiring",
      created_at: row.created_at,
      booking_id: null,
      summary: `Hiring prospect added: ${row.name} (${row.email}) — ${row.role}, stage ${row.stage}, source ${row.source}`,
      actor_type: "admin",
      actor_name: null,
      source_module: "Hiring",
      event_key: row.stage,
      email_to: null,
      email_subject: null,
      email_status: null,
      email_error: null,
      ip_address: null,
      link: "/admin/hiring",
    });
  }

  for (const row of leadRows) {
    const contact = [row.email, row.phone].filter(Boolean).join(" · ") || "no contact";
    merged.push({
      id: `ld:${row.id}`,
      kind: "lead",
      created_at: row.created_at,
      booking_id: null,
      summary: `New lead: ${row.name} — ${contact} (${row.status})`,
      actor_type: "system",
      actor_name: null,
      source_module: "Leads",
      event_key: row.status,
      email_to: null,
      email_subject: null,
      email_status: null,
      email_error: null,
      ip_address: null,
      link: "/admin/leads",
    });
  }

  for (const row of ticketRows) {
    merged.push({
      id: `st:${row.id}`,
      kind: "support_ticket",
      created_at: row.created_at,
      booking_id: null,
      summary: `Support ticket (${row.priority}): ${row.subject} — ${row.status}`,
      actor_type: "admin",
      actor_name: null,
      source_module: "Support",
      event_key: row.status,
      email_to: null,
      email_subject: null,
      email_status: null,
      email_error: null,
      ip_address: null,
      link: "/admin/settings",
    });
  }

  for (const row of customerRows) {
    merged.push({
      id: `cu:${row.id}`,
      kind: "customer",
      created_at: row.created_at,
      booking_id: null,
      summary: `Customer added: ${row.name} (${row.email})`,
      actor_type: "system",
      actor_name: null,
      source_module: "Customers",
      event_key: null,
      email_to: null,
      email_subject: null,
      email_status: null,
      email_error: null,
      ip_address: null,
      link: `/admin/customers/${row.id}`,
    });
  }

  let out = merged;
  if (bookingId) {
    out = merged.filter((e) => entryMatchesBookingFilter(e, bookingId));
  }

  out.sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return tb - ta;
  });

  return { entries: out, warnings };
}
