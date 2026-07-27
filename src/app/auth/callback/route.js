import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeRedirectPath(next) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/auth/update-password";
  }

  if (next === "/update-password") {
    return "/auth/update-password";
  }

  return next;
}

export async function GET(request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const next = getSafeRedirectPath(requestUrl.searchParams.get("next"));

  if (!code) {
    console.error("Supabase auth callback received no authorization code.");

    return NextResponse.redirect(
      new URL("/sign-in?error=missing_auth_code", requestUrl.origin)
    );
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Supabase code exchange failed:", error.message);

      return NextResponse.redirect(
        new URL("/sign-in?error=auth_callback_failed", requestUrl.origin)
      );
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } catch (error) {
    console.error("Unexpected Supabase auth callback error:", error);

    return NextResponse.redirect(
      new URL("/sign-in?error=auth_callback_failed", requestUrl.origin)
    );
  }
}