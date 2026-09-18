import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, checkAdminPassword } from "../../../../lib/admin/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");

  if (!checkAdminPassword(password)) {
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(ADMIN_COOKIE_NAME, password, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
