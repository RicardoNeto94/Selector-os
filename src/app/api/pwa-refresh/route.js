import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CHANNEL = "burman_room_pwa";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { data, error } = await supabase.rpc(
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