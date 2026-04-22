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

/**
 * POST body: { formId: string, prospectId: string }
 * Sends the published quiz apply link to the prospect's email (Resend).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = getBusinessId(request);
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const formId = typeof body.formId === "string" ? body.formId.trim() : "";
    const prospectId = typeof body.prospectId === "string" ? body.prospectId.trim() : "";

    if (!formId || !prospectId) {
      return NextResponse.json({ error: "formId and prospectId are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const access = await ensureBusinessAccess(supabase, businessId, user.id);
    if (!access.ok) return access.response;

    const { data: formRow, error: formErr } = await supabase
      .from("hiring_forms")
      .select("id, name, form_kind, is_published, published_slug")
      .eq("id", formId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (formErr) {
      return NextResponse.json({ error: formErr.message }, { status: 500 });
    }
    if (!formRow) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const fk = (formRow as { form_kind?: string }).form_kind;
    if (fk !== "quiz") {
      return NextResponse.json({ error: "Only quiz forms can be sent this way" }, { status: 400 });
    }

    const published = (formRow as { is_published?: boolean }).is_published === true;
    const slug = (formRow as { published_slug?: string | null }).published_slug?.trim() ?? "";
    if (!published || !slug) {
      return NextResponse.json({ error: "Quiz must be published before you can email a link" }, { status: 400 });
    }

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
    const formName = String((formRow as { name?: string }).name ?? "Quiz").trim() || "Quiz";

    const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "");
    const quizUrl = `${appOrigin}/apply/hiring/${encodeURIComponent(slug)}?prospectId=${encodeURIComponent(prospectId)}`;

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!resendKey || !fromEmail) {
      return NextResponse.json(
        { error: "Email is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)" },
        { status: 503 }
      );
    }

    const businessName = (access.business.name ?? "Our team").trim();
    const replyTo = (access.business.business_email ?? "").trim();
    const safeFirst = escapeHtml(firstName);
    const safeForm = escapeHtml(formName);
    const safeUrl = escapeHtml(quizUrl);

    const html = `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#1e293b;">
  <p>Hi ${safeFirst},</p>
  <p>You have been invited to complete a quiz: <strong>${safeForm}</strong>.</p>
  <p style="margin:24px 0;">
    <a href="${safeUrl}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Open the quiz</a>
  </p>
  <p style="font-size:14px;color:#64748b;">If the button does not work, copy and paste this link into your browser:<br/>
  <a href="${safeUrl}" style="color:#0d9488;word-break:break-all;">${safeUrl}</a></p>
  <p style="font-size:14px;color:#64748b;margin-top:32px;">— ${escapeHtml(businessName)}</p>
</body>
</html>`;

    const resend = new Resend(resendKey);
    const { error: sendErr } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: `Quiz: ${formName}`,
      html,
      replyTo: replyTo.includes("@") ? replyTo : undefined,
    });

    if (sendErr) {
      console.error("send-quiz-email Resend error:", sendErr);
      return NextResponse.json({ error: sendErr.message || "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("send-quiz-email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
