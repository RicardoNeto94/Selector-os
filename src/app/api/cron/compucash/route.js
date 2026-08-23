import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  recordFailedCompuCashRun,
  runAutomaticCompuCashSync,
} from "@/lib/compucash/automaticSync";
import { createAdminClient } from "@/lib/server/requireAdministrator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") || "";
  if (!secret || !secureEqual(supplied, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  try {
    const result = await runAutomaticCompuCashSync({ admin, triggerSource: "vercel_cron" });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("AUTOMATIC COMPUCASH SYNC ERROR:", error);
    await recordFailedCompuCashRun(admin, error, "vercel_cron");
    return NextResponse.json(
      { error: error?.message || "Automatic Compucash sync failed." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

function secureEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
