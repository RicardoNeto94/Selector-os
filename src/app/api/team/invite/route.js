import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function POST(request) {
  const supabaseAdmin = createAdminClient();

  try {
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
       VERIFY REQUESTING USER
    ===================================================== */

    const authorization =
      request.headers.get("authorization");

    const accessToken = authorization?.startsWith(
      "Bearer "
    )
      ? authorization.slice(7)
      : null;

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: requesterData,
      error: requesterError,
    } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    const requester = requesterData?.user;

    if (requesterError || !requester) {
      return NextResponse.json(
        {
          error: "Invalid authentication session.",
        },
        {
          status: 401,
        }
      );
    }

    /* =====================================================
       VERIFY TEAM.MANAGE PERMISSION
    ===================================================== */

    const {
      data: requesterRoles = [],
      error: requesterRolesError,
    } = await supabaseAdmin
      .from("user_roles")
      .select(`
        role_id,
        roles (
          id,
          slug,
          role_permissions (
            permissions (
              slug
            )
          )
        )
      `)
      .eq("user_id", requester.id);

    if (requesterRolesError) {
      throw requesterRolesError;
    }

    const canManageTeam = requesterRoles.some(
      (userRole) => {
        if (
          userRole.roles?.slug ===
          "administrator"
        ) {
          return true;
        }

        return (
          userRole.roles?.role_permissions || []
        ).some(
          (rolePermission) =>
            rolePermission.permissions?.slug ===
            "team.manage"
        );
      }
    );

    if (!canManageTeam) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to manage team access.",
        },
        {
          status: 403,
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

    /* =====================================================
       INVITE USER
    ===================================================== */

    const normalizedEmail = email
      .trim()
      .toLowerCase();

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

    /* =====================================================
       VENUE ACCESS
    ===================================================== */

    if (
      Array.isArray(locationIds) &&
      locationIds.length > 0
    ) {
      const venueRows = [
        ...new Set(locationIds),
      ].map((locationId) => ({
        user_id: invitedUser.id,
        location_id: locationId,
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