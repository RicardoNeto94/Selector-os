import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  await supabase.auth.getSession();

  const host = req.headers.get("host") || "";

  // 🔥 FIX: use includes instead of strict match

  if (host.includes("burman.vaxeron.com")) {
    return NextResponse.rewrite(
      new URL("/menu/burman-hotel", req.url)
    );
  }

  if (host.includes("foxden.vaxeron.com")) {
    return NextResponse.rewrite(
      new URL("/menu/foxden", req.url)
    );
  }

  return res;
}

export const config = {
  matcher: ['/:path*'],
};