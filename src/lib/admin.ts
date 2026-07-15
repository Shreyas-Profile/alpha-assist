// Admin gate. Right now the only admin is Shreyas (the app owner). Whenever
// we add pricing gates for skills or usage limits, they'll check this first
// and bypass for admins.

const ADMIN_EMAILS = new Set(["shreyas.pavuluri@gmail.com"]);

export function isAdmin(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.has(email.toLowerCase());
}
