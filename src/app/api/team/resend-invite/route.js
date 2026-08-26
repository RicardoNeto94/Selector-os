import { NextResponse } from "next/server";
import { requireAdministrator } from "@/lib/server/requireAdministrator";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const authorization = await requireAdministrator(request);
    if (authorization.error) {
      return NextResponse.json(
        { error: authorization.error.message },
        { status: authorization.error.status }
      );
    }

    const { admin, tenant } = authorization;
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "Team member is required." }, { status: 400 });
    }

    if (tenant.source === "membership") {
      const { data: membership, error: membershipError } = await admin
        .from("organization_memberships")
        .select("user_id,status")
        .eq("organization_id", tenant.organization.id)
        .eq("user_id", userId)
        .maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership || membership.status !== "invited") {
        return NextResponse.json(
          { error: "Only pending members of this workspace can be re-invited." },
          { status: 400 }
        );
      }
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id,email,status")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.email || profile.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending Vaxeron accounts can receive another access email." },
        { status: 400 }
      );
    }

    const { data: authUserData, error: authUserError } =
      await admin.auth.admin.getUserById(userId);
    if (authUserError) throw authUserError;

    const authUser = authUserData?.user;
    if (!authUser || authUser.email_confirmed_at) {
      return NextResponse.json(
        { error: "This account is already active and no longer needs an invitation." },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vaxeron.com";
    const invitationMetadata = {
      ...(authUser.user_metadata || {}),
      organization_name:
        tenant.organization?.name ||
        authUser.user_metadata?.organization_name ||
        "Your hospitality company",
      property_name:
        tenant.property?.name ||
        authUser.user_metadata?.property_name ||
        tenant.organization?.name ||
        "Your hospitality company",
      organization_id: tenant.organization.id,
      property_id:
        tenant.property?.id || authUser.user_metadata?.property_id || "",
      invitation_context_version: 1,
    };

    // Re-issue an actual invitation. Password recovery is deliberately not used
    // here because it sends the recovery template and creates the wrong token type.
    const { error: resendError } = await admin.auth.admin.inviteUserByEmail(
      profile.email,
      {
        data: invitationMetadata,
        redirectTo: `${siteUrl}/invite`,
      }
    );
    if (resendError) throw resendError;

    return NextResponse.json({ success: true, email: profile.email });
  } catch (error) {
    console.error("TEAM INVITATION RESEND ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to resend access email." },
      { status: 500 }
    );
  }
}
