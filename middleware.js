import { NextResponse } from "next/server";
import {
  getGuestHostConfig,
  isGuestSafeMethod,
  isPrivatePath,
} from "./src/lib/tenancy/guestHosts";

export async function middleware(req) {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;
  const guestHost = getGuestHostConfig(host);

  if (guestHost) {
    // Guest PWAs are intentionally login-free, but their hostnames must never
    // expose the Vaxeron back office or any operational write endpoint.
    if (!isGuestSafeMethod(req.method) || isPrivatePath(pathname)) {
      return new NextResponse("Not found", {
        status: 404,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      });
    }

    if (pathname === "/") {
      const response = NextResponse.rewrite(
        new URL(guestHost.destination, req.url)
      );
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      response.headers.append("Vary", "Host");
      return response;
    }

    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.append("Vary", "Host");
    return response;
  }

  if (pathname === "/sign-up") {
    return NextResponse.redirect(new URL("/#request-access", req.url));
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const hasAuthCookie = req.cookies
      .getAll()
      .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
    if (!hasAuthCookie) {
      return NextResponse.redirect(new URL("/sign-in?reason=session-required", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
