// Auth.js catch-all API route. All OAuth flows (sign-in, callback, sign-out)
// hit /api/auth/* and get dispatched by the handlers exported here.

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
