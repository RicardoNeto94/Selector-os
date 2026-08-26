import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function validTokenHash(value) {
  return typeof value === "string" && value.length >= 20 && value.length <= 512 && !/\s/.test(value);
}

function firstForwardedValue(value) {
  return value?.split(",")[0]?.trim() || "";
}

function trustedRequestOrigins(request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  const forwardedProtocol =
    firstForwardedValue(request.headers.get("x-forwarded-proto")) || requestUrl.protocol.replace(":", "");
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const origins = new Set([requestUrl.origin]);

  if (forwardedHost) origins.add(`${forwardedProtocol}://${forwardedHost}`);

  if (configuredSiteUrl) {
    try {
      origins.add(new URL(configuredSiteUrl).origin);
    } catch {
      // A malformed optional site URL must not break invitation verification.
    }
  }

  return origins;
}

function redirectToError(request, reason) {
  console.error(`INVITE_ACCEPT_REJECTED reason=${reason}`);
  return NextResponse.redirect(
    new URL("/invite/accept?error=invalid_invitation", request.url),
    { status: 303 }
  );
}

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (origin && !trustedRequestOrigins(request).has(origin)) {
    return redirectToError(request, "untrusted_origin");
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/x-www-form-urlencoded") && !contentType.includes("multipart/form-data")) {
    return redirectToError(request, "unsupported_content_type");
  }

  const formData = await request.formData();
  const tokenHash = formData.get("token_hash");
  const verificationType = formData.get("verification_type") === "recovery"
    ? "recovery"
    : "invite";
  if (!validTokenHash(tokenHash)) return redirectToError(request, "invalid_token_shape");

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: verificationType,
    });

    if (error) {
      // A recipient may already have consumed the one-time token in this
      // browser (for example before a deployment or after going back to the
      // email). Preserve that legitimate session instead of presenting the
      // used token as a failed invitation. The /invite page performs the
      // authoritative pending-profile and membership validation server-side.
      const { data: existingSession } = await supabase.auth.getUser();
      if (existingSession?.user) {
        return NextResponse.redirect(new URL("/invite", request.url), { status: 303 });
      }

      console.error(
        `INVITE_OTP_FAILED code=${error.code || "unknown"} status=${error.status || "unknown"} message=${error.message || "unknown"}`
      );
      return redirectToError(request, "otp_verification_failed");
    }

    return NextResponse.redirect(new URL("/invite", request.url), { status: 303 });
  } catch (error) {
    console.error(
      `INVITE_ACCEPT_UNEXPECTED message=${error?.message || "unknown"}`
    );
    return redirectToError(request, "unexpected_error");
  }
}
