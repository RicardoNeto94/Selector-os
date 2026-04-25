import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // 🔐 Keep your auth session logic
  await supabase.auth.getSession();

  const host = req.headers.get("host");

  // 🔥 DOMAIN ROUTING

  // Burman
  if (host === "burman.vaxeron.com") {
    return NextResponse.rewrite(
      new URL("/menu/burman-hotel", req.url)
    );
  }

  // Fox Den
  if (host === "foxden.vaxeron.com") {
    return NextResponse.rewrite(
      new URL("/menu/foxden", req.url)
    );
  }

  return res;
}

export const config = {
  matcher: ['/:path*'], // 🔥 IMPORTANT — applies to all routes
};