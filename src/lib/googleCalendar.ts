/**
 * Google Calendar sync: create/update/delete events when bookings are created, rescheduled, or cancelled.
 * Uses refresh token stored in business_integrations (provider_slug: google_calendar, api_secret = refresh_token).
 */
import { createClient } from '@supabase/supabase-js';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const DEFAULT_EVENT_DURATION_MINUTES = 60;
const DEFAULT_TIMEZONE = 'UTC';

export type BookingForCalendar = {
  id?: string;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  date?: string | null;
  time?: string | null;
  service?: string | null;
  address?: string | null;
  notes?: string | null;
  customer_name?: string | null;
  duration_minutes?: number | null;
  google_calendar_event_id?: string | null;
  recurring_series_id?: string | null;
};

export type RecurringSeriesForCalendar = {
  start_date: string;
  end_date?: string | null;
  frequency?: string | null;
  frequency_repeats?: string | null;
  occurrences_ahead?: number;
};

async function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Get refresh token for the business's Google Calendar integration. */
export async function getGoogleCalendarRefreshToken(
  businessId: string
): Promise<string | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from('business_integrations')
    .select('api_secret')
    .eq('business_id', businessId)
    .eq('provider_slug', 'google_calendar')
    .eq('api_key', 'oauth')
    .eq('enabled', true)
    .maybeSingle();
  const secret = (data as { api_secret?: string } | null)?.api_secret;
  return typeof secret === 'string' && secret.trim() ? secret.trim() : null;
}

/** Exchange refresh token for access token. */
async function getAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || '';
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'refresh_token',
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    console.warn('[googleCalendar] Token refresh failed:', res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { access_token?: string };
  return data.access_token && typeof data.access_token === 'string' ? data.access_token : null;
}

/** Build start/end in RFC3339 for the given date and time. Uses UTC if no timezone provided. */
function toCalendarDateTime(
  dateStr: string | null | undefined,
  timeStr: string | null | undefined,
  durationMinutes: number,
  timeZone: string = DEFAULT_TIMEZONE
): { start: string; end: string } | null {
  const date = (dateStr || '').toString().trim();
  if (date.length < 10) return null;
  const time = (timeStr || '09:00').toString().trim();
  // Support HH:mm, HH:mm:ss, and "h:mm AM/PM" (e.g. "2:30 PM")
  let h = 9, m = 0, s = 0;
  const match24 = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const match12 = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (match24) {
    h = parseInt(match24[1], 10);
    m = parseInt(match24[2], 10);
    s = match24[3] != null ? parseInt(match24[3], 10) : 0;
  } else if (match12) {
    h = parseInt(match12[1], 10);
    m = parseInt(match12[2], 10);
    s = match12[3] != null ? parseInt(match12[3], 10) : 0;
    if (match12[4].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (match12[4].toUpperCase() === 'AM' && h === 12) h = 0;
  }
  // Build ISO-like string in the given timezone; Google API accepts dateTime with timeZone
  const startStr = `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const startDate = new Date(`${startStr}Z`); // treat as UTC for duration math
  if (Number.isNaN(startDate.getTime())) return null;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  const toRFC = (d: Date) => d.toISOString().replace(/\.000Z$/, 'Z');
  return {
    start: toRFC(startDate),
    end: toRFC(endDate),
  };
}

/** Build event body for Google Calendar API. */
function buildEventBody(booking: BookingForCalendar): { start: string; end: string } | null {
  const date = booking.scheduled_date ?? booking.date ?? null;
  const time = booking.scheduled_time ?? booking.time ?? '09:00';
  const duration =
    booking.duration_minutes != null && booking.duration_minutes > 0
      ? booking.duration_minutes
      : DEFAULT_EVENT_DURATION_MINUTES;
  return toCalendarDateTime(date, time, duration);
}

/** Create a calendar event. Returns event id or null. */
export async function createCalendarEvent(
  businessId: string,
  booking: BookingForCalendar
): Promise<string | null> {
  const refreshToken = await getGoogleCalendarRefreshToken(businessId);
  if (!refreshToken) {
    console.warn('[googleCalendar] No connected Google Calendar for this business:', businessId);
    return null;
  }
  const accessToken = await getAccessToken(refreshToken);
  if (!accessToken) return null;
  const dateTime = buildEventBody(booking);
  if (!dateTime) {
    console.warn('[googleCalendar] Could not build event time from booking:', { scheduled_date: booking.scheduled_date ?? booking.date, scheduled_time: booking.scheduled_time ?? booking.time });
    return null;
  }
  const summary = (booking.service || 'Booking').toString().trim() || 'Booking';
  const descParts: string[] = [];
  if (booking.address) descParts.push(`Address: ${booking.address}`);
  if (booking.notes) descParts.push(`Notes: ${booking.notes}`);
  if (booking.customer_name) descParts.push(`Customer: ${booking.customer_name}`);
  const description = descParts.join('\n') || undefined;
  const body = {
    summary,
    description,
    start: { dateTime: dateTime.start, timeZone: DEFAULT_TIMEZONE },
    end: { dateTime: dateTime.end, timeZone: DEFAULT_TIMEZONE },
  };
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    console.warn('[googleCalendar] Create event failed:', res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { id?: string };
  const eventId = data.id && typeof data.id === 'string' ? data.id : null;
  if (eventId) console.log('[googleCalendar] Event created:', eventId);
  return eventId;
}

/** Build RRULE for Google Calendar from series (e.g. FREQ=WEEKLY;COUNT=8). */
function buildRRULE(series: RecurringSeriesForCalendar): string {
  const count = Math.max(1, series.occurrences_ahead ?? 8);
  const name = (series.frequency ?? '').toLowerCase().replace(/\s+/g, ' ');
  const repeats = (series.frequency_repeats ?? '').toLowerCase().replace(/\s+/g, ' ');
  let freq = 'WEEKLY';
  let interval = 1;
  if (repeats.includes('daily') || name.includes('daily')) {
    freq = 'DAILY';
  } else if (repeats.includes('monthly') || name.includes('monthly')) {
    freq = 'MONTHLY';
  } else if (repeats.includes('yearly') || name.includes('yearly')) {
    freq = 'YEARLY';
  } else if (repeats.includes('bi') || repeats.includes('every-2') || name.includes('bi-weekly') || name.includes('biweekly')) {
    freq = 'WEEKLY';
    interval = 2;
  } else {
    freq = 'WEEKLY';
  }
  const parts = [`FREQ=${freq}`, interval > 1 ? `INTERVAL=${interval}` : null].filter(Boolean);
  if (series.end_date && series.end_date.length >= 10) {
    const until = series.end_date.replace(/-/g, '') + 'T235959Z';
    parts.push(`UNTIL=${until}`);
  } else {
    parts.push(`COUNT=${count}`);
  }
  return 'RRULE:' + parts.join(';');
}

/** Create a recurring calendar event (one event with RRULE). Returns event id or null. */
export async function createRecurringCalendarEvent(
  businessId: string,
  booking: BookingForCalendar,
  series: RecurringSeriesForCalendar
): Promise<string | null> {
  const refreshToken = await getGoogleCalendarRefreshToken(businessId);
  if (!refreshToken) {
    console.warn('[googleCalendar] No connected Google Calendar for this business:', businessId);
    return null;
  }
  const accessToken = await getAccessToken(refreshToken);
  if (!accessToken) return null;
  const dateTime = buildEventBody(booking);
  if (!dateTime) {
    console.warn('[googleCalendar] Could not build event time for recurring:', { scheduled_date: booking.scheduled_date ?? booking.date, scheduled_time: booking.scheduled_time ?? booking.time });
    return null;
  }
  const summary = (booking.service || 'Booking').toString().trim() || 'Booking';
  const descParts: string[] = [];
  if (booking.address) descParts.push(`Address: ${booking.address}`);
  if (booking.notes) descParts.push(`Notes: ${booking.notes}`);
  if (booking.customer_name) descParts.push(`Customer: ${booking.customer_name}`);
  const description = descParts.join('\n') || undefined;
  const rrule = buildRRULE(series);
  const body = {
    summary,
    description,
    start: { dateTime: dateTime.start, timeZone: DEFAULT_TIMEZONE },
    end: { dateTime: dateTime.end, timeZone: DEFAULT_TIMEZONE },
    recurrence: [rrule],
  };
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    console.warn('[googleCalendar] Create recurring event failed:', res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { id?: string };
  const eventId = data.id && typeof data.id === 'string' ? data.id : null;
  if (eventId) console.log('[googleCalendar] Recurring event created:', eventId);
  return eventId;
}

/** Update an existing recurring calendar event (same body as create, with recurrence). */
export async function updateRecurringCalendarEvent(
  businessId: string,
  eventId: string,
  booking: BookingForCalendar,
  series: RecurringSeriesForCalendar
): Promise<boolean> {
  const refreshToken = await getGoogleCalendarRefreshToken(businessId);
  if (!refreshToken) return false;
  const accessToken = await getAccessToken(refreshToken);
  if (!accessToken) return false;
  const dateTime = buildEventBody(booking);
  if (!dateTime) return false;
  const summary = (booking.service || 'Booking').toString().trim() || 'Booking';
  const descParts: string[] = [];
  if (booking.address) descParts.push(`Address: ${booking.address}`);
  if (booking.notes) descParts.push(`Notes: ${booking.notes}`);
  if (booking.customer_name) descParts.push(`Customer: ${booking.customer_name}`);
  const description = descParts.join('\n') || undefined;
  const rrule = buildRRULE(series);
  const body = {
    summary,
    description,
    start: { dateTime: dateTime.start, timeZone: DEFAULT_TIMEZONE },
    end: { dateTime: dateTime.end, timeZone: DEFAULT_TIMEZONE },
    recurrence: [rrule],
  };
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    console.warn('[googleCalendar] Update recurring event failed:', res.status, await res.text());
    return false;
  }
  return true;
}

/** Update an existing calendar event (e.g. reschedule). */
export async function updateCalendarEvent(
  businessId: string,
  eventId: string,
  booking: BookingForCalendar
): Promise<boolean> {
  const refreshToken = await getGoogleCalendarRefreshToken(businessId);
  if (!refreshToken) return false;
  const accessToken = await getAccessToken(refreshToken);
  if (!accessToken) return false;
  const dateTime = buildEventBody(booking);
  if (!dateTime) return false;
  const summary = (booking.service || 'Booking').toString().trim() || 'Booking';
  const descParts: string[] = [];
  if (booking.address) descParts.push(`Address: ${booking.address}`);
  if (booking.notes) descParts.push(`Notes: ${booking.notes}`);
  if (booking.customer_name) descParts.push(`Customer: ${booking.customer_name}`);
  const description = descParts.join('\n') || undefined;
  const body = {
    summary,
    description,
    start: { dateTime: dateTime.start, timeZone: DEFAULT_TIMEZONE },
    end: { dateTime: dateTime.end, timeZone: DEFAULT_TIMEZONE },
  };
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    console.warn('[googleCalendar] Update event failed:', res.status, await res.text());
    return false;
  }
  return true;
}

/** Delete a calendar event (e.g. booking cancelled). */
export async function deleteCalendarEvent(
  businessId: string,
  eventId: string
): Promise<boolean> {
  const refreshToken = await getGoogleCalendarRefreshToken(businessId);
  if (!refreshToken) return false;
  const accessToken = await getAccessToken(refreshToken);
  if (!accessToken) return false;
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok && res.status !== 404) {
    console.warn('[googleCalendar] Delete event failed:', res.status, await res.text());
    return false;
  }
  return true;
}

/**
 * Sync: booking created → create calendar event. Returns event id to store on booking (or null).
 * Caller should update the booking with google_calendar_event_id when non-null.
 */
export async function syncBookingCreated(
  businessId: string,
  booking: BookingForCalendar
): Promise<string | null> {
  try {
    return await createCalendarEvent(businessId, booking);
  } catch (e) {
    console.warn('[googleCalendar] syncBookingCreated failed:', e);
    return null;
  }
}

/**
 * Sync: booking updated (e.g. reschedule) → update or create calendar event.
 * If booking has google_calendar_event_id, updates that event; otherwise creates one.
 * Returns new event id if one was created (caller should save to booking); otherwise undefined.
 */
export async function syncBookingUpdated(
  businessId: string,
  booking: BookingForCalendar
): Promise<string | null> {
  try {
    const eventId = booking.google_calendar_event_id && String(booking.google_calendar_event_id).trim();
    if (eventId) {
      await updateCalendarEvent(businessId, eventId, booking);
      return null;
    }
    return await createCalendarEvent(businessId, booking);
  } catch (e) {
    console.warn('[googleCalendar] syncBookingUpdated failed:', e);
    return null;
  }
}

/**
 * Sync: booking cancelled → delete calendar event if one exists.
 */
export async function syncBookingCancelled(
  businessId: string,
  booking: BookingForCalendar
): Promise<void> {
  try {
    const eventId = booking.google_calendar_event_id && String(booking.google_calendar_event_id).trim();
    if (eventId) await deleteCalendarEvent(businessId, eventId);
  } catch (e) {
    console.warn('[googleCalendar] syncBookingCancelled failed:', e);
  }
}
