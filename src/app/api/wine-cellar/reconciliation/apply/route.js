import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Vaxeron server inventory configuration is missing.",
        },
        {
          status: 500,
        }
      );
    }

    const body = await request.json();

    const rows = Array.isArray(body?.rows)
      ? body.rows
      : null;

    if (!rows) {
      return NextResponse.json(
        {
          error:
            "Reconciliation rows are required.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data,
      error,
    } = await supabase.rpc(
      "apply_wine_inventory_reconciliation",
      {
        p_rows: rows,
      }
    );

    if (error) {
      console.error(
        "SERVER INVENTORY RECONCILIATION TRANSACTION FAILED:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
          code: error.code || null,
          details: error.details || null,
          hint: error.hint || null,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      result: data || {},
    });
  } catch (error) {
    console.error(
      "SERVER INVENTORY RECONCILIATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to apply inventory reconciliation.",
      },
      {
        status: 500,
      }
    );
  }
}
