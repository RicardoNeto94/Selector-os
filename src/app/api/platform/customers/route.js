import { NextResponse } from "next/server";
import { requirePlatformAdministrator } from "@/lib/server/requirePlatformAdministrator";

export const dynamic = "force-dynamic";

const ALLOWED_PLANS = new Set(["pilot", "starter", "professional", "enterprise"]);
const ALLOWED_INVENTORY_MODES = new Set(["manual", "csv", "api", "hybrid"]);
const MODULE_KEYS = ["wine", "dining", "spa", "guest_experience"];

function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
function cleanText(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

function normalizeEmail(value) {
  return cleanText(value, 254).toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeModules(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(MODULE_KEYS.map((key) => [key, Boolean(source[key])]));
}

export async function GET(request) {
  try {
    const access = await requirePlatformAdministrator(request);
    if (access.error) return fail(access.error.message, access.error.status);

    const { admin } = access;
    const { data: organizations, error } = await admin
      .from("organizations")
      .select(`
        id,name,slug,status,created_at,updated_at,
        properties(id,name,slug,status,timezone,currency_code,restaurant_id),
        organization_memberships(user_id,role,status,created_at),
        organization_platform_settings(plan,inventory_mode,enabled_modules,onboarding_status,internal_notes),
        integration_connections(id,provider,display_name,status,last_successful_sync_at)
      `)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const organizationIds = (organizations || []).map((organization) => organization.id);
    const syncRunsResult = organizationIds.length
      ? await admin
          .from("compucash_sync_runs")
          .select("organization_id,status,started_at,completed_at,products_received,products_matched,unmatched_products")
          .in("organization_id", organizationIds)
          .order("started_at", { ascending: false })
      : { data: [], error: null };
    if (syncRunsResult.error) throw syncRunsResult.error;
    const latestCompucashSyncByOrganization = new Map();
    for (const run of syncRunsResult.data || []) {
      if (!latestCompucashSyncByOrganization.has(run.organization_id)) {
        latestCompucashSyncByOrganization.set(run.organization_id, run);
      }
    }

    const ownerIds = [...new Set(
      (organizations || []).flatMap((organization) =>
        (organization.organization_memberships || [])
          .filter((membership) => membership.role === "owner")
          .map((membership) => membership.user_id)
      )
    )];
    const profilesResult = ownerIds.length
      ? await admin
          .from("profiles")
          .select("id,email,first_name,last_name,status")
          .in("id", ownerIds)
      : { data: [], error: null };
    if (profilesResult.error) throw profilesResult.error;
    const profileById = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]));

    const customers = (organizations || []).map((organization) => {
      const ownerMembership = (organization.organization_memberships || [])
        .find((membership) => membership.role === "owner");
      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        status: organization.status,
        createdAt: organization.created_at,
        updatedAt: organization.updated_at,
        owner: ownerMembership
          ? { ...profileById.get(ownerMembership.user_id), membershipStatus: ownerMembership.status }
          : null,
        properties: organization.properties || [],
        settings: organization.organization_platform_settings || null,
        integrations: organization.integration_connections || [],
        latestCompucashSync: latestCompucashSyncByOrganization.get(organization.id) || null,
        memberCount: (organization.organization_memberships || []).length,
      };
    });

    return NextResponse.json({ customers, currentRole: access.platformAdmin.role });
  } catch (error) {
    console.error("PLATFORM CUSTOMERS LOAD ERROR:", error);
    return fail(error?.message || "Unable to load Vaxeron customers.", 500);
  }
}

export async function POST(request) {
  let invitedUserId = null;
  let admin = null;
  try {
    const access = await requirePlatformAdministrator(request);
    if (access.error) return fail(access.error.message, access.error.status);
    if (!["root_owner", "platform_administrator"].includes(access.platformAdmin.role)) {
      return fail("This platform role is read-only.", 403);
    }
    admin = access.admin;

    const body = await request.json();
    const organizationName = cleanText(body.organizationName);
    const propertyName = cleanText(body.propertyName) || organizationName;
    const slug = cleanText(body.slug, 64);
    const ownerEmail = normalizeEmail(body.ownerEmail);
    const ownerFirstName = cleanText(body.ownerFirstName, 80);
    const ownerLastName = cleanText(body.ownerLastName, 80);
    const timezone = cleanText(body.timezone, 80) || "Europe/Tallinn";
    const currencyCode = cleanText(body.currencyCode, 3).toUpperCase() || "EUR";
    const plan = ALLOWED_PLANS.has(body.plan) ? body.plan : "pilot";
    const inventoryMode = ALLOWED_INVENTORY_MODES.has(body.inventoryMode)
      ? body.inventoryMode
      : "manual";
    const enabledModules = normalizeModules(body.enabledModules);

    if (!organizationName) return fail("Customer organization name is required.");
    if (!propertyName) return fail("The first property name is required.");
    if (!validEmail(ownerEmail)) return fail("A valid owner email address is required.");
    if (!ownerFirstName || !ownerLastName) return fail("The owner’s first and last name are required.");

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vaxeron.com";
    const { data: invitation, error: invitationError } =
      await admin.auth.admin.inviteUserByEmail(ownerEmail, {
        data: {
          first_name: ownerFirstName,
          last_name: ownerLastName,
          organization_name: organizationName,
          property_name: propertyName,
          invited_by_name: "Vaxeron Platform Administration",
          role_name: "Workspace Owner",
          invitation_context_version: 2,
        },
        redirectTo: `${siteUrl}/invite`,
      });
    if (invitationError) return fail(invitationError.message || "Unable to invite the customer owner.", 409);
    invitedUserId = invitation?.user?.id || null;
    if (!invitedUserId) throw new Error("The owner invitation did not return an identity.");

    const profileResult = await admin.from("profiles").upsert({
      id: invitedUserId,
      email: ownerEmail,
      first_name: ownerFirstName,
      last_name: ownerLastName,
      job_title: "Workspace Owner",
      department: "Leadership",
      status: "pending",
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (profileResult.error) throw profileResult.error;

    const { data: provisioned, error: provisionError } = await admin.rpc(
      "platform_provision_customer",
      {
        p_actor_user_id: access.user.id,
        p_owner_user_id: invitedUserId,
        p_organization_name: organizationName,
        p_property_name: propertyName,
        p_slug: slug,
        p_timezone: timezone,
        p_currency_code: currencyCode,
        p_plan: plan,
        p_inventory_mode: inventoryMode,
        p_enabled_modules: enabledModules,
      }
    );
    if (provisionError) throw provisionError;

    return NextResponse.json({ success: true, customer: provisioned }, { status: 201 });
  } catch (error) {
    console.error("PLATFORM CUSTOMER CREATE ERROR:", error);
    if (admin && invitedUserId) {
      await admin.auth.admin.deleteUser(invitedUserId).catch(() => {});
    }
    return fail(error?.message || "Unable to create this customer workspace.", 500);
  }
}
