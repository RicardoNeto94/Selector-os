import { NextResponse } from "next/server";
import { requirePlatformAdministrator } from "@/lib/server/requirePlatformAdministrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_DURATIONS = new Set([15, 30, 60]);

function responseError(message, status = 500, code = null) {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
}

function getClientContext(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  return {
    ip: forwardedFor.split(",")[0]?.trim().slice(0, 80) || null,
    userAgent: request.headers.get("user-agent")?.slice(0, 300) || null,
  };
}

export async function GET(request) {
  try {
    const access = await requirePlatformAdministrator(request);
    if (access.error) return responseError(access.error.message, access.error.status);
    const organizationId = new URL(request.url).searchParams.get("organizationId");

    let query = access.admin
      .from("platform_support_sessions")
      .select("id,actor_user_id,organization_id,property_id,access_level,reason,started_at,expires_at,ended_at,ended_by_user_id")
      .order("started_at", { ascending: false })
      .limit(30);

    query = organizationId
      ? query.eq("organization_id", organizationId)
      : query.eq("actor_user_id", access.user.id);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ sessions: data || [] });
  } catch (error) {
    console.error("SUPPORT SESSION LIST ERROR:", error);
    return responseError(error?.message || "Unable to load support sessions.");
  }
}

export async function POST(request) {
  try {
    const access = await requirePlatformAdministrator(request);
    if (access.error) return responseError(access.error.message, access.error.status);
    if (access.assuranceLevel !== "aal2") {
      return responseError(
        "Multi-factor authentication is required before customer support access can begin.",
        403,
        "mfa_required",
      );
    }

    const body = await request.json();
    const organizationId = String(body?.organizationId || "").trim();
    const propertyId = String(body?.propertyId || "").trim();
    const reason = String(body?.reason || "").trim();
    const durationMinutes = Number(body?.durationMinutes || 30);

    if (!organizationId || !propertyId) {
      return responseError("Customer and property are required.", 400);
    }
    if (reason.length < 8 || reason.length > 500) {
      return responseError("Enter a support reason between 8 and 500 characters.", 400);
    }
    if (!ALLOWED_DURATIONS.has(durationMinutes)) {
      return responseError("Support duration must be 15, 30 or 60 minutes.", 400);
    }

    const { data, error } = await access.admin.rpc("platform_start_support_session", {
      p_actor_user_id: access.user.id,
      p_organization_id: organizationId,
      p_property_id: propertyId,
      p_reason: reason,
      p_duration_minutes: durationMinutes,
      p_client_context: getClientContext(request),
    });
    if (error) throw error;

    return NextResponse.json({ session: data }, { status: 201 });
  } catch (error) {
    console.error("SUPPORT SESSION START ERROR:", error);
    return responseError(error?.message || "Unable to start support access.");
  }
}

export async function DELETE(request) {
  try {
    const access = await requirePlatformAdministrator(request);
    if (access.error) return responseError(access.error.message, access.error.status);
    let sessionId = null;
    try {
      const body = await request.json();
      sessionId = body?.sessionId ? String(body.sessionId) : null;
    } catch {
      sessionId = null;
    }

    const { data, error } = await access.admin.rpc("platform_end_support_session", {
      p_actor_user_id: access.user.id,
      p_session_id: sessionId,
    });
    if (error) throw error;
    return NextResponse.json({ result: data });
  } catch (error) {
    console.error("SUPPORT SESSION END ERROR:", error);
    return responseError(error?.message || "Unable to end support access.");
  }
}
