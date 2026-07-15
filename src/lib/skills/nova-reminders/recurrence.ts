import type { Recurrence } from "./types";

/** Compute the next scheduled time given a current one and a recurrence rule. */
export function nextOccurrence(from: Date, rule: Recurrence): Date | null {
  if (rule === "none") return null;
  const d = new Date(from);
  switch (rule) {
    case "hourly":
      d.setHours(d.getHours() + 1);
      return d;
    case "daily":
      d.setDate(d.getDate() + 1);
      return d;
    case "weekdays": {
      d.setDate(d.getDate() + 1);
      // Skip Sat (6) and Sun (0)
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      return d;
    }
    case "weekly":
      d.setDate(d.getDate() + 7);
      return d;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      return d;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      return d;
  }
  // cron object — v1 not supported; return null so host can log and skip
  if (typeof rule === "object" && "cron" in rule) return null;
  return null;
}

/** Parse a recurrence value from the DB (string) into the union type. */
export function parseRecurrence(s: string | null | undefined): Recurrence {
  if (!s || s === "none") return "none";
  if (s.startsWith("cron:")) return { cron: s.slice(5) };
  if (["hourly", "daily", "weekdays", "weekly", "monthly", "yearly"].includes(s)) {
    return s as Recurrence;
  }
  return "none";
}

/** Serialize a recurrence for DB storage. */
export function serializeRecurrence(r: Recurrence): string {
  if (typeof r === "object" && "cron" in r) return `cron:${r.cron}`;
  return r;
}
