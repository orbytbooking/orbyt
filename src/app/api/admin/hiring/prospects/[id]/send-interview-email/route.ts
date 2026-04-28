import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getAuthenticatedUser, createForbiddenResponse, createUnauthorizedResponse } from "@/lib/auth-helpers";

const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase config");
  }
  return createClient(url, key, { auth: { persistSession: false } });
};

const getBusinessId = (request: NextRequest) =>
  request.headers.get("x-business-id") || request.nextUrl.searchParams.get("businessId");

type BusinessAccess =
  | { ok: false; response: NextResponse }
  | { ok: true; business: { name: string | null; business_email: string | null } };

async function ensureBusinessAccess(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  businessId: string,
  userId: string
): Promise<BusinessAccess> {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, owner_id, name, business_email")
    .eq("id", businessId)
    .single();

  if (error || !data) {
    return { ok: false, response: NextResponse.json({ error: "Business not found" }, { status: 404 }) };
  }

  if ((data as { owner_id?: string }).owner_id !== userId) {
    return { ok: false, response: createForbiddenResponse("You do not own this business") };
  }

  return {
    ok: true,
    business: data as { name: string | null; business_email: string | null },
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * POST body:
 * {
 *   interviewStartsAt: string (ISO),
 *   interviewEndsAt: string (ISO),
 *   timezone?: string,
 *   sharedNote?: string
 * }
 */
export async function POST(request: NextRequest, ctx: RouteCtx) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = getBusinessId(request);
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const { id: prospectId } = await ctx.params;
    if (!prospectId?.trim()) {
      return NextResponse.json({ error: "Prospect id required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const startIso = typeof body.interviewStartsAt === "string" ? body.interviewStartsAt.trim() : "";
    const endIso = typeof body.interviewEndsAt === "string" ? body.interviewEndsAt.trim() : "";
    const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";
    const sharedNote = typeof body.sharedNote === "string" ? body.sharedNote.trim() : "";

    if (!startIso || !endIso) {
      return NextResponse.json({ error: "interviewStartsAt and interviewEndsAt are required" }, { status: 400 });
    }

    const start = new Date(startIso);
    const end = new Date(endIso);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid interview time values" }, { status: 400 });
    }
    if (end.getTime() <= start.getTime()) {
      return NextResponse.json({ error: "Interview end must be after start" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const access = await ensureBusinessAccess(supabase, businessId, user.id);
    if (!access.ok) return access.response;

    const { data: prospect, error: pErr } = await supabase
      .from("hiring_prospects")
      .select("id, first_name, last_name, email")
      .eq("id", prospectId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    const toEmail = String((prospect as { email?: string }).email ?? "").trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail);
    if (!emailOk) {
      return NextResponse.json({ error: "Prospect does not have a valid email address" }, { status: 400 });
    }

    const firstName = String((prospect as { first_name?: string }).first_name ?? "").trim() || "there";
    const businessName = (access.business.name ?? "Our team").trim() || "Our team";
    const replyTo = (access.business.business_email ?? "").trim();

    const startText = start.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      ...(timezone ? { timeZone: timezone } : {}),
    });
    const endText = end.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      ...(timezone ? { timeZone: timezone } : {}),
    });

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!resendKey || !fromEmail) {
      return NextResponse.json(
        { error: "Email is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)" },
        { status: 503 }
      );
    }

    const safeFirst = escapeHtml(firstName);
    const safeBusiness = escapeHtml(businessName);
    const safeStart = escapeHtml(startText);
    const safeEnd = escapeHtml(endText);
    const safeTz = escapeHtml(timezone || "your local time");
    const safeSharedNote = sharedNote ? escapeHtml(sharedNote) : "";

    const html = `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#1e293b;">
  <p>Hi ${safeFirst},</p>
  <p>Your interview has been scheduled.</p>
  <p><strong>Start:</strong> ${safeStart}<br/>
  <strong>End:</strong> ${safeEnd}<br/>
  <strong>Timezone:</strong> ${safeTz}</p>
  ${
    safeSharedNote
      ? `<p><strong>Note from our team:</strong><br/>${safeSharedNote.replace(/\n/g, "<br/>")}</p>`
      : ""
  }
  <p style="font-size:14px;color:#64748b;margin-top:32px;">— ${safeBusiness}</p>
</body>
</html>`;

    const resend = new Resend(resendKey);
    const { error: sendErr } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: `Interview scheduled with ${businessName}`,
      html,
      replyTo: replyTo.includes("@") ? replyTo : undefined,
    });

    if (sendErr) {
      console.error("send-interview-email Resend error:", sendErr);
      return NextResponse.json({ error: sendErr.message || "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("send-interview-email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
