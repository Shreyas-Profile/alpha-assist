// Start LinkedIn OAuth. User clicks "Connect LinkedIn" in Settings → this
// route generates a state token, stores it in a cookie, redirects to LinkedIn.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildAuthorizeUrl } from "@/lib/linkedin";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/signin", process.env.AUTH_URL ?? "http://localhost:3000"));
  }
  const state = crypto.randomUUID();
  const authUrl = buildAuthorizeUrl(state);
  const res = NextResponse.redirect(authUrl);
  res.cookies.set("linkedin_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 300, // 5 min to complete the flow
    path: "/",
  });
  return res;
}
