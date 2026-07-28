import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/auth/update-password";
  }

  return value;
}

export async function GET(request) {
  const requestUrl = new URL(request.url);

  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));

  if (!tokenHash || type !== "recovery") {
    return NextResponse.redirect(
      new URL("/forgot-password?error=invalid_recovery_link", requestUrl.origin)
    );
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });

    if (error) {
      console.error("Password recovery verification failed:", {
        message: error.message,
        code: error.code,
        status: error.status,
      });

      return NextResponse.redirect(
        new URL("/forgot-password?error=invalid_recovery_link", requestUrl.origin)
      );
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } catch (error) {
    console.error("Unexpected recovery verification error:", error);

    return NextResponse.redirect(
      new URL("/forgot-password?error=recovery_failed", requestUrl.origin)
    );
  }
}