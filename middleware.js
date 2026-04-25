import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {

  const host = req.headers.get("host") || "";

  // 🔥 DOMAIN ROUTING FIRST (VERY IMPORTANT)

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

  // 🔐 THEN run Supabase middleware

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  await supabase.auth.getSession();

  return res;
}

export const config = {
  matcher: ['/:path*'],
};