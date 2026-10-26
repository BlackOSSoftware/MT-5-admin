import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🔐 Read auth from cookie
  const token = req.cookies.get("accessToken")?.value;

  // ❌ Block dashboard without login
  if (pathname.startsWith("/admin") && !token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Old /superadmin URL → same admin panel
  if (pathname.startsWith("/superadmin")) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // 🔁 Logged-in user should not see login
  if (pathname === "/" && token) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/superadmin/:path*", "/"],
};
