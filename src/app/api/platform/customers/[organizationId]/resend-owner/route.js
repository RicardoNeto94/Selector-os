import { NextResponse } from "next/server";
import { requirePlatformAdministrator } from "@/lib/server/requirePlatformAdministrator";

export const dynamic = "force-dynamic";

function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
export async function POST(request, context) {
  try {
    const access = await requirePlatformAdministrator(request);
    if (access.error) return fail(access.error.message, access.error.status);
    if (!["root_owner", "platform_administrator"].includes(access.platformAdmin.role)) {
      return fail("This platform role is read-only.", 403);
    }
    const { organizationId } = await context.params;
    const { admin } = access;
    const { data: organization, error: organizationError } = await admin
      .from("organizations")
      .select("id,name,properties(id,name),organization_memberships(user_id,role,status)")
      .eq("id", organizationId)
      .maybeSingle();
    if (organizationError) throw organizationError;
    if (!organization) return fail("Customer organization was not found.", 404);

    const ownerMembership = (organization.organization_memberships || [])
      .find((membership) => membership.role === "owner");
    if (!ownerMembership || ownerMembership.status !== "invited") {
      return fail("Only a pending workspace owner can be re-invited.", 409);
    }
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("email,first_name,last_name,status")
      .eq("id", ownerMembership.user_id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.email || profile.status !== "pending") {
      return fail("The customer owner account is already active or incomplete.", 409);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vaxeron.com";
    const { error: invitationError } = await admin.auth.admin.inviteUserByEmail(profile.email, {
      data: {
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        organization_name: organization.name,
        property_name: organization.properties?.[0]?.name || organization.name,
        invited_by_name: "Vaxeron Platform Administration",
        role_name: "Workspace Owner",
        invitation_context_version: 2,
      },
      redirectTo: `${siteUrl}/invite`,
    });
    if (invitationError) throw invitationError;

    const audit = await admin.from("platform_audit_log").insert({
      actor_user_id: access.user.id,
      action: "customer.owner_invitation_resent",
      target_type: "organization",
      target_id: organizationId,
      metadata: { owner_user_id: ownerMembership.user_id, email: profile.email },
    });
    if (audit.error) throw audit.error;
    return NextResponse.json({ success: true, email: profile.email });
  } catch (error) {
    console.error("PLATFORM OWNER REINVITE ERROR:", error);
    return fail(error?.message || "Unable to resend the owner invitation.", 500);
  }
}
