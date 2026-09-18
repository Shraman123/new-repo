import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, isValidAdminToken } from "./lib/admin/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/login")) {
    return NextResponse.next();
  }
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidAdminToken(token)) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
