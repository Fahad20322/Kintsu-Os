import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { checkRateLimit } from "@/lib/rate-limit";

const PUBLIC_PATHS = ["/login", "/signup"];

// Brute-force / abuse protection for auth and the public integrations API.
// Everything else (dashboard pages, server actions) relies on session
// checks / requirePermission() instead.
const RATE_LIMITS: { matcher: RegExp; limit: number; windowSeconds: number }[] = [
  // Login/signup/OTP endpoints: tight limit to slow down credential stuffing.
  { matcher: /^\/api\/auth\/(sign-in|sign-up|email-otp)/, limit: 10, windowSeconds: 60 },
  // Everything else under Better Auth's handler.
  { matcher: /^\/api\/auth\//, limit: 60, windowSeconds: 60 },
  // Server-to-server integration API (website sync).
  { matcher: /^\/api\/integrations\//, limit: 120, windowSeconds: 60 },
];

function clientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

async function applyRateLimit(request: NextRequest, pathname: string) {
  const rule = RATE_LIMITS.find((r) => r.matcher.test(pathname));
  if (!rule) return null;

  const ip = clientIp(request);
  const result = await checkRateLimit(`${pathname}:${ip}`, rule.limit, rule.windowSeconds);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests, please try again later." },
      { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return (await applyRateLimit(request, pathname)) ?? NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!sessionCookie && !isPublicPath && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (sessionCookie && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
