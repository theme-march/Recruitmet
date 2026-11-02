import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { authSecret } from "@/lib/auth-policy";

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

  let token = request.cookies.get("orbit_session")?.value;
  if (!token) {
    const auth = request.headers.get("authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) {
      token = auth.slice(7).trim();
    }
  }
  try {
    if (!token) throw new Error("No session");
    const { payload } = await jwtVerify(
      token,
      authSecret(),
      { algorithms: ["HS256"] }
    );
    if (!payload.userId || !payload.exp || Date.now() >= payload.exp * 1000) {
      throw new Error("Expired or invalid session payload");
    }
    const requestHeaders = new Headers(request.headers);
    if (token && !request.cookies.has("orbit_session")) {
      const existingCookie = request.headers.get("cookie") || "";
      const cookieAddition = `orbit_session=${token}`;
      requestHeaders.set("cookie", existingCookie ? `${existingCookie}; ${cookieAddition}` : cookieAddition);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
      if (token) response.cookies.delete("orbit_session");
      return response;
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    if (token) response.cookies.delete("orbit_session");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
