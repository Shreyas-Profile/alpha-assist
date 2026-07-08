// Route guard. Runs at the Edge before every matched request.
// If the user isn't signed in and tries to reach a protected page, kick them to /signin.

import { auth } from "@/lib/auth";

export default auth((req) => {
  const isAuthed = !!req.auth;
  const path = req.nextUrl.pathname;

  const isProtected = path.startsWith("/chat");
  if (isProtected && !isAuthed) {
    const url = new URL("/signin", req.url);
    url.searchParams.set("callbackUrl", path);
    return Response.redirect(url);
  }
});

// Skip Next.js internals and static assets — cheaper and avoids matching the API routes.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
