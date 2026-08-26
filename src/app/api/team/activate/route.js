import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server/requireAdministrator";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;
    if (!token) {
      return NextResponse.json(
        { error: "Invitation session required." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const { data: userResult, error: userError } = await admin.auth.getUser(token);
    if (userError || !userResult?.user) {
      return NextResponse.json(
        { error: "This invitation session is no longer valid." },
        { status: 401 }
      );
    }

    const userId = userResult.user.id;
    const { data: profile, error: profileReadError } = await admin
      .from("profiles")
      .select("status")
      .eq("id", userId)
      .maybeSingle();
    if (profileReadError) throw profileReadError;
    if (!profile) {
      return NextResponse.json(
        { error: "The invited Vaxeron profile was not found." },
        { status: 404 }
      );
    }

    if (profile.status !== "active") {
      const { error: profileError } = await admin
        .from("profiles")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (profileError) throw profileError;
    }

    const { error: membershipError } = await admin
      .from("organization_memberships")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "invited");
    if (
      membershipError &&
      !["42P01", "PGRST200", "PGRST205"].includes(membershipError.code)
    ) {
      throw membershipError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("TEAM ACTIVATION ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to activate this invitation." },
      { status: 500 }
    );
  }
}
