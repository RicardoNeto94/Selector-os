import { NextResponse } from "next/server";
import { requireAdministrator } from "@/lib/server/requireAdministrator";
import { scopeTenantQuery } from "@/lib/server/tenantContext";
import { isProtectedWorkspaceOwner } from "@/lib/access/ownership";

export const dynamic = "force-dynamic";

const emptyResult = (data = []) => Promise.resolve({ data, error: null });

export async function GET(request) {
  try {
    const authorization = await requireAdministrator(request);
    if (authorization.error) {
      return NextResponse.json(
        { error: authorization.error.message },
        { status: authorization.error.status }
      );
    }

    const admin = authorization.admin;
    const tenant = authorization.tenant;
    let memberships = [];
    let memberIds = [];

    if (tenant.source === "membership") {
      const { data, error } = await admin
        .from("organization_memberships")
        .select("user_id,role,status,created_at")
        .eq("organization_id", tenant.organization.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      memberships = data || [];
      memberIds = memberships.map((membership) => membership.user_id);

      if (tenant.property?.id && memberIds.length > 0) {
        const { data: propertyMembers, error: propertyError } = await admin
          .from("property_memberships")
          .select("user_id")
          .eq("property_id", tenant.property.id)
          .in("user_id", memberIds);
        if (propertyError) throw propertyError;
        const propertyMemberIds = new Set(
          (propertyMembers || []).map((membership) => membership.user_id)
        );
        memberIds = memberIds.filter((id) => propertyMemberIds.has(id));
        memberships = memberships.filter((membership) =>
          propertyMemberIds.has(membership.user_id)
        );
      }
    }

    const profilesQuery = tenant.source === "membership"
      ? memberIds.length
        ? admin
            .from("profiles")
            .select("id,email,first_name,last_name,phone,job_title,department,status,created_at")
            .in("id", memberIds)
        : emptyResult()
      : admin
          .from("profiles")
          .select("id,email,first_name,last_name,phone,job_title,department,status,created_at")
          .order("created_at", { ascending: false });

    const rolesQuery = admin
      .from("roles")
      .select("id,name,slug,description")
      .order("name");

    const locationsQuery = scopeTenantQuery(
      admin.from("wine_locations").select("id,name").order("name"),
      tenant
    );

    const userRolesQuery = memberIds.length
      ? admin
          .from("user_roles")
          .select("user_id,role_id,roles(id,name,slug)")
          .in("user_id", memberIds)
      : tenant.source === "membership"
        ? emptyResult()
        : admin.from("user_roles").select("user_id,role_id,roles(id,name,slug)");

    const venueAccessBase = memberIds.length
      ? admin
          .from("user_venue_access")
          .select("user_id,location_id,wine_locations(id,name)")
          .in("user_id", memberIds)
      : tenant.source === "membership"
        ? null
        : admin
            .from("user_venue_access")
            .select("user_id,location_id,wine_locations(id,name)");
    const venueAccessQuery = venueAccessBase
      ? scopeTenantQuery(venueAccessBase, tenant)
      : emptyResult();

    const [profilesResult, rolesResult, locationsResult, userRolesResult, venueAccessResult] =
      await Promise.all([
        profilesQuery,
        rolesQuery,
        locationsQuery,
        userRolesQuery,
        venueAccessQuery,
      ]);

    for (const result of [
      profilesResult,
      rolesResult,
      locationsResult,
      userRolesResult,
      venueAccessResult,
    ]) {
      if (result.error) throw result.error;
    }

    const membershipByUser = new Map(
      memberships.map((membership) => [membership.user_id, membership])
    );
    const userRoles = userRolesResult.data || [];
    const venueAccess = venueAccessResult.data || [];
    const team = (profilesResult.data || []).map((profile) => {
      const membership = membershipByUser.get(profile.id);
      return {
        ...profile,
        status:
          membership?.status === "invited"
            ? "pending"
            : membership?.status === "suspended"
              ? "inactive"
              : profile.status || "active",
        membership_role: membership?.role || null,
        is_protected_owner: isProtectedWorkspaceOwner({
          email: profile.email,
          membershipRole: membership?.role,
        }),
        roles: userRoles
          .filter((row) => row.user_id === profile.id)
          .map((row) => row.roles)
          .filter(Boolean),
        locations: venueAccess
          .filter((row) => row.user_id === profile.id)
          .map((row) => row.wine_locations)
          .filter(Boolean),
      };
    });

    return NextResponse.json({
      team,
      roles: rolesResult.data || [],
      locations: locationsResult.data || [],
      currentUserId: authorization.user.id,
      workspace: {
        organizationName: tenant.organization?.name || "Vaxeron",
        propertyName: tenant.property?.name || tenant.organization?.name || "Workspace",
      },
    });
  } catch (error) {
    console.error("TEAM DIRECTORY ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to load team access." },
      { status: 500 }
    );
  }
}
