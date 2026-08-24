import { NextResponse } from "next/server";
import { requireAdministrator } from "@/lib/server/requireAdministrator";

const CHANNEL = "burman_room_pwa";

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
