import { NextResponse } from "next/server";
import { getPlatformBillingProvider } from "@/lib/platform-billing/platformBillingProvider";

export const dynamic = "force-dynamic";

/** Public: which provider handles workspace (Orbyt) checkout — for UI hints only. */
export async function GET() {
  return NextResponse.json({ provider: getPlatformBillingProvider() });
}
