import { NextResponse } from "next/server";
import { requireAdministrator } from "@/lib/server/requireAdministrator";
import { isProtectedWorkspaceOwner } from "@/lib/access/ownership";

export const dynamic = "force-dynamic";

const ADMINISTRATOR_ROLES = ["owner", "administrator"];

function failure(message, status) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(request, context) {
  try {
    const authorization = await requireAdministrator(request);
    if (authorization.error) {
      return failure(authorization.error.message, authorization.error.status);
    }

    const { userId } = await context.params;
    const admin = authorization.admin;
    const tenant = authorization.tenant;

    if (!userId) return failure("A team member is required.", 400);
    if (userId === authorization.user.id) {
      return failure("You cannot remove your own administrator access.", 400);
    }
    if (tenant?.source !== "membership" || !tenant.organization?.id) {
      return failure("Workspace membership removal is not available for this legacy workspace.", 409);
    }

    const { data: membership, error: membershipError } = await admin
      .from("organization_memberships")
      .select("user_id,role,status")
      .eq("organization_id", tenant.organization.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return failure("This person is not a member of the current workspace.", 404);

    const { data: targetProfile, error: targetProfileError } = await admin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    if (targetProfileError) throw targetProfileError;

    // The organization owner is the root authority for a customer workspace.
    // Administrators may manage every other member, but must never be able to
    // remove the owner (or indirectly delete the owner's auth identity).
    if (isProtectedWorkspaceOwner({
      email: targetProfile?.email,
      membershipRole: membership.role,
    })) {
      return failure(
        "The workspace owner is protected and cannot be removed by another user.",
        403
      );
    }

    if (
      membership.status === "active" &&
      ADMINISTRATOR_ROLES.includes(membership.role)
    ) {
      const { count, error: administratorCountError } = await admin
        .from("organization_memberships")
        .select("user_id", { count: "exact", head: true })
        .eq("organization_id", tenant.organization.id)
        .eq("status", "active")
        .in("role", ADMINISTRATOR_ROLES);
      if (administratorCountError) throw administratorCountError;
      if ((count || 0) <= 1) {
        return failure("Assign another active administrator before removing this person.", 409);
      }
    }

    // Revoke the organization membership first. Even if a later cleanup step
    // fails, the person can no longer resolve or enter this tenant.
    const organizationRemoval = await admin
      .from("organization_memberships")
      .delete()
      .eq("organization_id", tenant.organization.id)
      .eq("user_id", userId);
    if (organizationRemoval.error) throw organizationRemoval.error;

    if (tenant.property?.id) {
      const propertyRemoval = await admin
        .from("property_memberships")
        .delete()
        .eq("property_id", tenant.property.id)
        .eq("user_id", userId);
      if (propertyRemoval.error) throw propertyRemoval.error;
    }

    const venueRemoval = await admin
      .from("user_venue_access")
      .delete()
      .eq("organization_id", tenant.organization.id)
      .eq("user_id", userId);
    if (venueRemoval.error) throw venueRemoval.error;

    const { count: remainingMemberships, error: remainingMembershipsError } = await admin
      .from("organization_memberships")
      .select("organization_id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (remainingMembershipsError) throw remainingMembershipsError;

    let identityDeleted = false;
    let identityCleanupPending = false;
    if ((remainingMemberships || 0) === 0) {
      const { error: deleteIdentityError } = await admin.auth.admin.deleteUser(userId);
      if (deleteIdentityError) {
        console.error("TEAM IDENTITY CLEANUP ERROR:", deleteIdentityError);
        identityCleanupPending = true;
      } else {
        identityDeleted = true;
      }
    }

    return NextResponse.json({
      success: true,
      identityDeleted,
      identityCleanupPending,
      message: identityCleanupPending
        ? "Workspace access was removed. The unused identity still needs administrator cleanup."
        : identityDeleted
          ? "The user and their workspace access were deleted."
          : "The user was removed from this workspace. Their other Vaxeron access was preserved.",
    });
  } catch (error) {
    console.error("TEAM MEMBER REMOVAL ERROR:", error);
    return failure(error?.message || "Unable to remove this team member.", 500);
  }
}
