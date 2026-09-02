import { NextResponse } from "next/server";
import { createAdminClient, requireAdministrator } from "@/lib/server/requireAdministrator";

function channelForProperty(propertyId) {
  return `room_pwa:${propertyId}`;
}

async function findRoomMenu(admin, menuSlug, tenant = null) {
  if (!menuSlug) return { data: null, error: null };

  let query = admin
    .from("menus")
    .select("id,name,public_slug,organization_id,property_id")
    .eq("public_slug", menuSlug)
    .eq("design_type", "burman")
    .eq("is_active", true);

  if (tenant?.organization?.id) {
    query = query.eq("organization_id", tenant.organization.id);
  }
  if (tenant?.property?.id) {
    query = query.eq("property_id", tenant.property.id);
  }

  return query.maybeSingle();
}

async function findSignal(admin, organizationId, propertyId) {
  return admin
    .from("pwa_refresh_signals")
    .select("channel,version,updated_at")
    .eq("organization_id", organizationId)
    .eq("property_id", propertyId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function GET(request) {
  try {
    const admin = createAdminClient();
    const menuSlug = new URL(request.url).searchParams.get("menu")?.trim();
    if (!menuSlug) {
      return NextResponse.json(
        { error: "A public room menu is required." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const menuResult = await findRoomMenu(admin, menuSlug);
    if (menuResult.error) throw menuResult.error;
    if (!menuResult.data) {
      return NextResponse.json(
        { error: "Room PWA not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { organization_id: organizationId, property_id: propertyId } = menuResult.data;
    const { data, error } = await findSignal(admin, organizationId, propertyId);

    if (error) throw error;

    return NextResponse.json(
      { version: data?.version ?? 0, updated_at: data?.updated_at ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("PWA REFRESH STATUS ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load PWA refresh status." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request) {
  try {
    const authorization = await requireAdministrator(request);
    if (authorization.error) {
      return NextResponse.json(
        { error: authorization.error.message },
        { status: authorization.error.status },
      );
    }

    const tenant = authorization.tenant;
    if (!tenant?.property?.id) {
      return NextResponse.json(
        { error: "A property workspace is required." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const menuSlug = String(body?.menuSlug || "").trim();
    const menuResult = await findRoomMenu(authorization.admin, menuSlug, tenant);
    if (menuResult.error) throw menuResult.error;
    if (!menuResult.data) {
      return NextResponse.json(
        { error: "This room PWA does not belong to your workspace." },
        { status: 404 },
      );
    }

    const organizationId = tenant.organization.id;
    const propertyId = tenant.property.id;
    const existingResult = await findSignal(
      authorization.admin,
      organizationId,
      propertyId,
    );
    if (existingResult.error) throw existingResult.error;

    const now = new Date().toISOString();
    const nextVersion = Number(existingResult.data?.version || 0) + 1;
    let publishQuery;

    if (existingResult.data) {
      publishQuery = authorization.admin
        .from("pwa_refresh_signals")
        .update({
          version: nextVersion,
          updated_at: now,
          updated_by: authorization.user.id,
        })
        .eq("channel", existingResult.data.channel)
        .eq("organization_id", organizationId)
        .eq("property_id", propertyId)
        .select("version,updated_at")
        .single();
    } else {
      publishQuery = authorization.admin
        .from("pwa_refresh_signals")
        .insert({
          channel: channelForProperty(propertyId),
          version: nextVersion,
          updated_at: now,
          updated_by: authorization.user.id,
          organization_id: organizationId,
          property_id: propertyId,
        })
        .select("version,updated_at")
        .single();
    }

    const { data, error } = await publishQuery;

    if (error) {
      console.error("PWA REFRESH PUBLISH ERROR:", error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "Unable to publish PWA refresh.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      version: data?.version ?? nextVersion,
      updated_at: data?.updated_at ?? now,
    });
  } catch (error) {
    console.error("PWA REFRESH ROUTE ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to publish PWA refresh.",
      },
      { status: 500 },
    );
  }
}
