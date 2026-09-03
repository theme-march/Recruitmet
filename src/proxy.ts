import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const publicPaths = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/health",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPaths.some((path) => pathname === path) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("orbit_session")?.value;
  try {
    if (!token) throw new Error("No session");
    await jwtVerify(
      token,
      new TextEncoder().encode(process.env.AUTH_SECRET || "unsafe-development-secret"),
      { algorithms: ["HS256"] }
    );
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
