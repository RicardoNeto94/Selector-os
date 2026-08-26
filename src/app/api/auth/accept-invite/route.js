import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function validTokenHash(value) {
  return typeof value === "string" && value.length >= 20 && value.length <= 512 && !/\s/.test(value);
}

function redirectToError(request) {
  return NextResponse.redirect(
    new URL("/invite/accept?error=invalid_invitation", request.url),
    { status: 303 }
  );
}

export async function POST(request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) return redirectToError(request);

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/x-www-form-urlencoded") && !contentType.includes("multipart/form-data")) {
    return redirectToError(request);
  }

  const formData = await request.formData();
  const tokenHash = formData.get("token_hash");
  const verificationType = formData.get("verification_type") === "recovery"
    ? "recovery"
    : "invite";
  if (!validTokenHash(tokenHash)) return redirectToError(request);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: verificationType,
    });

    if (error) {
      console.error("Invitation verification failed:", {
        message: error.message,
        code: error.code,
        status: error.status,
      });
      return redirectToError(request);
    }

    return NextResponse.redirect(new URL("/invite", request.url), { status: 303 });
  } catch (error) {
    console.error("Unexpected invitation verification error:", error);
    return redirectToError(request);
  }
}
