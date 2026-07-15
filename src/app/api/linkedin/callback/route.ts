// LinkedIn OAuth callback. LinkedIn redirects the user here with ?code=… &state=…
// after they approve on LinkedIn's consent screen. We validate state, exchange
// the code for a token, save it, redirect back to Settings.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectLinkedIn } from "@/lib/linkedin";

export async function GET(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err) {
    return NextResponse.redirect(new URL(`/settings?linkedin_error=${encodeURIComponent(err)}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?linkedin_error=missing_params", req.url));
  }

  const cookieState = req.cookies.get("linkedin_oauth_state")?.value;
  if (cookieState !== state) {
    return NextResponse.redirect(new URL("/settings?linkedin_error=bad_state", req.url));
  }

  try {
    await connectLinkedIn(email, code);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.redirect(
      new URL(`/settings?linkedin_error=${encodeURIComponent(msg)}`, req.url),
    );
  }

  const res = NextResponse.redirect(new URL("/settings?linkedin_connected=1", req.url));
  res.cookies.delete("linkedin_oauth_state");
  return res;
}
