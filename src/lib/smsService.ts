/**
 * Optional Twilio SMS — no SDK; uses REST API when env vars are set.
 */

export type SendSmsResult = { sent: boolean; reason?: string };

export async function sendSmsViaTwilio(to: string, body: string): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();

  if (!accountSid || !authToken || !from) {
    return { sent: false, reason: "SMS is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER)" };
  }

  const normalizedTo = to.replace(/\s/g, "");
  if (!normalizedTo) {
    return { sent: false, reason: "Invalid phone number" };
  }

  const params = new URLSearchParams();
  params.set("To", normalizedTo);
  params.set("From", from);
  params.set("Body", body.slice(0, 1600));

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[sms] Twilio error:", res.status, errText);
    return { sent: false, reason: "Failed to send SMS" };
  }

  return { sent: true };
}
