import { NextResponse } from "next/server";
import { requireAdministrator } from "@/lib/server/requireAdministrator";
import { scopeTenantQuery, tenantWriteFields } from "@/lib/server/tenantContext";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const authorizationResult = await requireAdministrator(request);
    if (authorizationResult.error) {
      return NextResponse.json(
        { error: authorizationResult.error.message },
        { status: authorizationResult.error.status }
      );
    }
    const supabaseAdmin = authorizationResult.admin;
    const tenant = authorizationResult.tenant;
    const body = await request.json();

    const {
      email,
      firstName,
      lastName,
      phone,
      jobTitle,
      department,
      roleId,
      locationIds = [],
    } = body;

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!email?.trim()) {
      return NextResponse.json(
        {
          error: "Email address is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!roleId) {
      return NextResponse.json(
        {
          error: "A role must be selected.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       VERIFY ROLE
    ===================================================== */

    const {
      data: role,
      error: roleError,
    } = await supabaseAdmin
      .from("roles")
      .select(`
        id,
        name,
        slug
      `)
      .eq("id", roleId)
      .maybeSingle();

    if (roleError) {
      throw roleError;
    }

    if (!role) {
      return NextResponse.json(
        {
          error: "Selected role was not found.",
        },
        {
          status: 400,
        }
      );
    }

    const uniqueLocationIds = [...new Set(locationIds)].filter(Boolean);
    if (uniqueLocationIds.length > 0) {
      const locationQuery = supabaseAdmin
        .from("wine_locations")
        .select("id")
        .in("id", uniqueLocationIds);
      const { data: allowedLocations, error: locationError } =
        await scopeTenantQuery(locationQuery, tenant);
      if (locationError) throw locationError;
      if ((allowedLocations ?? []).length !== uniqueLocationIds.length) {
        return NextResponse.json(
          { error: "One or more selected venues do not belong to this workspace." },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       INVITE USER
    ===================================================== */

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const { data: inviterProfile, error: inviterProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("first_name,last_name,email")
        .eq("id", authorizationResult.user.id)
        .maybeSingle();
    if (inviterProfileError) throw inviterProfileError;

    const inviterName = [
      inviterProfile?.first_name,
      inviterProfile?.last_name,
    ]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(" ") || authorizationResult.user.email || "Your administrator";

    const organizationName =
      tenant.organization?.name?.trim() || "Your hospitality company";
    const propertyName =
      tenant.property?.name?.trim() || organizationName;

    const {
      data: invitationData,
      error: invitationError,
    } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          data: {
            first_name: firstName?.trim() || "",
            last_name: lastName?.trim() || "",
            job_title: jobTitle?.trim() || "",
            department:
              department?.trim() || "",
            organization_name: organizationName,
            property_name: propertyName,
            invited_by_name: inviterName,
            invited_by_email:
              inviterProfile?.email || authorizationResult.user.email || "",
            role_name: role.name,
            venue_count: uniqueLocationIds.length,
            invitation_context_version: 1,
          },
          redirectTo: `${
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://vaxeron.com"
}/invite`,
        }
      );

    if (invitationError) {
      return NextResponse.json(
        {
          error:
            invitationError.message ||
            "Unable to invite team member.",
        },
        {
          status: 400,
        }
      );
    }

    const invitedUser =
      invitationData?.user;

    if (!invitedUser?.id) {
      throw new Error(
        "Invitation created without a user ID."
      );
    }

    /* =====================================================
       PROFILE
    ===================================================== */

    const {
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: invitedUser.id,
          email: normalizedEmail,
          first_name:
            firstName?.trim() || "",
          last_name:
            lastName?.trim() || "",
          phone: phone?.trim() || "",
          job_title:
            jobTitle?.trim() || "",
          department:
            department?.trim() || "",
          status: "pending",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

    if (profileError) {
      throw profileError;
    }

    /* =====================================================
       ROLE
    ===================================================== */

    const {
      error: userRoleError,
    } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        {
          user_id: invitedUser.id,
          role_id: role.id,
        },
        {
          onConflict: "user_id,role_id",
        }
      );

    if (userRoleError) {
      throw userRoleError;
    }

    if (tenant?.source === "membership") {
      const tenantRole = ["administrator", "manager", "operator", "viewer"].includes(
        role.slug
      )
        ? role.slug
        : "operator";
      const organizationMembership = await supabaseAdmin
        .from("organization_memberships")
        .upsert(
          {
            organization_id: tenant.organization.id,
            user_id: invitedUser.id,
            role: tenantRole,
            status: "invited",
          },
          { onConflict: "organization_id,user_id" }
        );
      if (organizationMembership.error) throw organizationMembership.error;

      if (tenant.property?.id) {
        const propertyMembership = await supabaseAdmin
          .from("property_memberships")
          .upsert(
            {
              property_id: tenant.property.id,
              user_id: invitedUser.id,
              role: tenantRole,
            },
            { onConflict: "property_id,user_id" }
          );
        if (propertyMembership.error) throw propertyMembership.error;
      }
    }

    /* =====================================================
       VENUE ACCESS
    ===================================================== */

    if (
      Array.isArray(locationIds) &&
      locationIds.length > 0
    ) {
      const venueRows = uniqueLocationIds.map((locationId) => ({
        user_id: invitedUser.id,
        location_id: locationId,
        ...tenantWriteFields(tenant),
      }));

      const {
        error: venueAccessError,
      } = await supabaseAdmin
        .from("user_venue_access")
        .upsert(venueRows, {
          onConflict:
            "user_id,location_id",
        });

      if (venueAccessError) {
        throw venueAccessError;
      }
    }

    /* =====================================================
       SUCCESS
    ===================================================== */

    return NextResponse.json({
      success: true,
      user: {
        id: invitedUser.id,
        email: normalizedEmail,
        role: role.name,
      },
    });
  } catch (error) {
    console.error(
      "TEAM INVITE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to invite team member.",
      },
      {
        status: 500,
      }
    );
  }
}
