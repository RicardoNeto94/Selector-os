import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server/requireAdministrator";

export const dynamic = "force-dynamic";

async function authenticateInvitation(request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;
  if (!token) return { error: "Invitation session required.", status: 401 };

  const admin = createAdminClient();
  const { data: userResult, error: userError } = await admin.auth.getUser(token);
  if (userError || !userResult?.user) {
    return { error: "This invitation session is no longer valid.", status: 401 };
  }

  return { admin, user: userResult.user, token };
}

export async function GET(request) {
  try {
    const invitation = await authenticateInvitation(request);
    if (invitation.error) {
      return NextResponse.json(
        { error: invitation.error },
        { status: invitation.status }
      );
    }

    const { data: profile, error: profileError } = await invitation.admin
      .from("profiles")
      .select("status")
      .eq("id", invitation.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.status !== "pending") {
      return NextResponse.json(
        { error: "This invitation has already been completed or is no longer active." },
        { status: 409 }
      );
    }

    const { data: memberships, error: membershipError } = await invitation.admin
      .from("organization_memberships")
      .select("status")
      .eq("user_id", invitation.user.id)
      .eq("status", "invited");
    if (
      membershipError &&
      !["42P01", "PGRST200", "PGRST205"].includes(membershipError.code)
    ) {
      throw membershipError;
    }
    if (!membershipError && (memberships || []).length === 0) {
      return NextResponse.json(
        { error: "This invitation is no longer connected to a Vaxeron workspace." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      email: invitation.user.email || "",
      metadata: invitation.user.user_metadata || {},
    });
  } catch (error) {
    console.error("TEAM INVITATION VALIDATION ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to validate this invitation." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const invitation = await authenticateInvitation(request);
    if (invitation.error) {
      return NextResponse.json(
        { error: invitation.error },
        { status: invitation.status }
      );
    }

    const admin = invitation.admin;
    const userResult = { user: invitation.user };

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
