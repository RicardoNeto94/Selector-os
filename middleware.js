import { NextResponse } from 'next/server';

export function middleware(req) {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  // ✅ ONLY rewrite root "/"
  if (pathname === "/") {

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

  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};