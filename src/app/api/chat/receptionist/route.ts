import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

function buildSystemPrompt(context: {
  companyName: string;
  faqs: { question: string; answer: string }[];
  servicesSummary: string;
  contact?: { email?: string; phone?: string; address?: string };
  bookNowUrl: string;
}): string {
  const { companyName, faqs, servicesSummary, contact, bookNowUrl } = context;
  const faqBlock =
    faqs.length > 0
      ? `\n\nFrequently asked questions (use these to answer accurately):\n${faqs
          .map((f) => `- Q: ${f.question}\n  A: ${f.answer}`)
          .join("\n")}`
      : "";
  const contactBlock = contact
    ? `\n\nContact: ${[contact.email, contact.phone, contact.address].filter(Boolean).join(" | ")}`
    : "";

  return `You are a friendly AI receptionist for ${companyName}. You help visitors with questions about services, booking, pricing, and general inquiries. Keep replies concise (2-4 sentences unless they ask for detail). Be warm and professional.

Services offered: ${servicesSummary || "Cleaning and home services. Customers can book via the website."}
${faqBlock}${contactBlock}

Important:
- To book a service, direct them to: ${bookNowUrl}
- If they ask about availability or specific dates/times, tell them to use the Book Now page where they can pick a date and time.
- Do not make up pricing or services not listed above. If unsure, suggest they check the Book Now page or contact the business.
- Do not pretend to take bookings or collect personal details; always point to the booking link.`;
}

export async function POST(request: NextRequest) {
  if (!openaiKey) {
    return NextResponse.json(
      { error: "AI receptionist is not configured. Set OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  let body: { messages?: unknown[]; businessId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body. Expected JSON with messages array." },
      { status: 400 }
    );
  }

  try {
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const businessId =
      body.businessId ||
      request.nextUrl.searchParams.get("business") ||
      request.headers.get("x-business-id");

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      request.nextUrl?.origin ||
      "";
    const bookNowBase = baseUrl ? `${baseUrl}/book-now` : "/book-now";
    const bookNowUrl = businessId
      ? `${bookNowBase}?business=${businessId}`
      : bookNowBase;

    let companyName = "our business";
    let faqs: { question: string; answer: string }[] = [];
    let servicesSummary = "";
    let contact: { email?: string; phone?: string; address?: string } | undefined;

    if (businessId && supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: row, error } = await supabase
        .from("business_website_configs")
        .select("config")
        .eq("business_id", businessId)
        .single();

      if (!error && row?.config && typeof row.config === "object") {
        const config = row.config as {
          branding?: { companyName?: string };
          sections?: Array<{
            type: string;
            data?: Record<string, unknown>;
          }>;
        };
        if (config.branding?.companyName) {
          companyName = config.branding.companyName;
        }
        const sections = config.sections || [];
        const { data: dbFaqRows, error: dbFaqErr } = await supabase
          .from("orbyt_faqs")
          .select("question, answer, sort_order")
          .eq("business_id", businessId)
          .order("sort_order", { ascending: true });

        if (!dbFaqErr && dbFaqRows && dbFaqRows.length > 0) {
          faqs = dbFaqRows
            .filter((r) => r.question && r.answer)
            .map((r) => ({ question: r.question as string, answer: r.answer as string }));
        } else {
          const faqSection = sections.find((s) => s.type === "faqs");
          if (faqSection?.data?.faqs && Array.isArray(faqSection.data.faqs)) {
            faqs = (faqSection.data.faqs as Array<{ question?: string; answer?: string }>)
              .filter((f) => f.question && f.answer)
              .map((f) => ({ question: f.question!, answer: f.answer! }));
          }
        }
        const servicesSection = sections.find((s) => s.type === "services");
        if (servicesSection?.data?.services && Array.isArray(servicesSection.data.services)) {
          const titles = (servicesSection.data.services as Array<{ title?: string; description?: string }>)
            .map((s) => s.title || s.description)
            .filter(Boolean);
          servicesSummary = titles.join("; ") || "";
        }
        const contactSection = sections.find((s) => s.type === "contact");
        if (contactSection?.data && typeof contactSection.data === "object") {
          const d = contactSection.data as Record<string, string>;
          contact = {
            email: d.email,
            phone: d.phone,
            address: d.address,
          };
        }
      }
    }

    const systemPrompt = buildSystemPrompt({
      companyName,
      faqs,
      servicesSummary,
      contact,
      bookNowUrl,
    });

    const openai = new OpenAI({ apiKey: openaiKey });
    const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => {
        const role = m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user";
        return { role, content: m.content || "" };
      }),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: apiMessages,
      max_tokens: 400,
    });

    const first = completion.choices?.[0];
    const content =
      (first?.message?.content?.trim()) ||
      (first?.finish_reason === "content_filter"
        ? "I can’t answer that. Please ask something else or use the Book Now page."
        : "Sorry, I couldn’t generate a response. Please try again or use the Book Now page.");
    return NextResponse.json({ message: content });
  } catch (err: unknown) {
    console.error("Receptionist chat error:", err);

    const status = (err as { status?: number })?.status;
    const message = (err instanceof Error ? err.message : String(err)).toLowerCase();

    if (status === 401 || message.includes("invalid") || message.includes("api key")) {
      return NextResponse.json(
        { error: "Invalid OpenAI API key. Please check OPENAI_API_KEY in your environment." },
        { status: 503 }
      );
    }
    if (status === 429 || message.includes("rate limit") || message.includes("quota")) {
      return NextResponse.json(
        { error: "Our AI assistant is temporarily unavailable. Please try again later or contact support." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get a response from the assistant. Please try again." },
      { status: 500 }
    );
  }
}
