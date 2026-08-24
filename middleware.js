import { NextResponse } from "next/server";

export async function middleware(req) {

  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

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

  if (pathname === "/") {

    if (host.includes("burman.vaxeron.com")) {
      return NextResponse.rewrite(
        new URL("/menu/burman-hotel", req.url)
      );
    }

    if (host.includes("spa.vaxeron.com")) {
      return NextResponse.rewrite(
        new URL("/spa/burman", req.url)
      );
    }

    if (host.includes("koyo.vaxeron.com")) {
      return NextResponse.rewrite(
        new URL("/wine/koyo-wine", req.url)
      );
    }

    if (host.includes("shangshi.vaxeron.com")) {
      return NextResponse.rewrite(
        new URL("/wine/shang-shi-wine", req.url)
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
  matcher: ["/", "/sign-up", "/dashboard/:path*"],
};
