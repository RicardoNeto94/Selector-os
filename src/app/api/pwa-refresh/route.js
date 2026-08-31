import { NextResponse } from "next/server";
import {
  createAdminClient,
  requireAdministrator,
} from "@/lib/server/requireAdministrator";

const CHANNEL = "burman_room_pwa";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("pwa_refresh_signals")
      .select("version,updated_at")
      .eq("channel", CHANNEL)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json(
      { version: data?.version ?? 0, updated_at: data?.updated_at ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("PWA REFRESH STATUS ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load PWA refresh status." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request) {
  try {
    const authorization = await requireAdministrator(request);
    if (authorization.error) {
      return NextResponse.json(
        { error: authorization.error.message },
        { status: authorization.error.status },
      );
    }

    const { data, error } = await authorization.admin.rpc(
      "publish_pwa_refresh",
      {
        p_channel: CHANNEL,
      },
    );

    if (error) {
      console.error("PWA REFRESH RPC ERROR:", error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "Unable to publish PWA refresh.",
        },
        { status: 400 },
      );
    }

    const row = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      success: true,
      version: row?.version ?? null,
      updated_at:
        row?.updated_at ?? new Date().toISOString(),
    });
  } catch (error) {
    console.error("PWA REFRESH ROUTE ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to publish PWA refresh.",
      },
      { status: 500 },
    );
  }
}
