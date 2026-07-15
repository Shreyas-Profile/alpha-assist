/**
 * Prescription extraction — turns a file (image/PDF) OR free text into a
 * structured `Prescription` payload. Uses the host-provided LLM callbacks.
 * The LLM returns a JSON string; we parse + validate here.
 */

import type { SkillContext } from "../context";
import type { Prescription, Medication } from "../types";

const EXTRACT_INSTRUCTIONS = `You are extracting a medical prescription into structured JSON. Read carefully — do NOT fabricate. If a field is not visible or ambiguous, set it to null.

Return ONLY valid JSON matching this schema (no markdown fences, no prose):

{
  "patient_name": string | null,
  "doctor_name": string | null,
  "doctor_registration_no": string | null,
  "hospital_or_clinic": string | null,
  "prescription_date": "YYYY-MM-DD" | null,
  "follow_up_date": "YYYY-MM-DD" | null,
  "diagnoses": string[],
  "advice": string | null,
  "medications": [
    {
      "name": string,
      "dose": string | null,          // e.g. "500 mg", "1 tab"
      "frequency": string,             // human-readable: "twice daily", "every 8 hours", "as needed"
      "times": string[],               // parsed times of day HH:MM 24h if determinable
      "duration_days": number | null,  // total days of course, or null if ongoing
      "notes": string | null           // "with food", "before bed", etc.
    }
  ],
  "extracted_text": string             // raw OCR/reading of the doc
}

Rules:
- Preserve dose exactly as written (units matter).
- If "twice daily" is written but no times, use ["08:00","20:00"] as a sensible default.
- If "every 8 hours" and no start time, use ["08:00","16:00","00:00"].
- If frequency is unclear, set frequency to the exact phrase and leave times: [].
- Never invent a doctor name or medication that isn't clearly visible.
`;

export type ExtractedPrescription = Omit<
  Prescription,
  "id" | "userId" | "createdAt" | "fileRef" | "starred"
>;

function normalize(raw: unknown): ExtractedPrescription {
  const r = (raw ?? {}) as Record<string, unknown>;
  const meds: Medication[] = Array.isArray(r.medications)
    ? (r.medications as Array<Record<string, unknown>>).map((m) => ({
        name: String(m.name ?? "").slice(0, 200),
        dose: (m.dose as string | null) ?? null,
        frequency: String(m.frequency ?? ""),
        times: Array.isArray(m.times) ? (m.times as string[]) : [],
        durationDays: (m.duration_days as number | null) ?? null,
        notes: (m.notes as string | null) ?? null,
      }))
    : [];
  return {
    patientName: (r.patient_name as string | null) ?? null,
    doctorName: (r.doctor_name as string | null) ?? null,
    doctorRegistrationNo: (r.doctor_registration_no as string | null) ?? null,
    hospitalOrClinic: (r.hospital_or_clinic as string | null) ?? null,
    prescriptionDate: r.prescription_date
      ? new Date(String(r.prescription_date))
      : null,
    followUpDate: r.follow_up_date ? new Date(String(r.follow_up_date)) : null,
    diagnoses: Array.isArray(r.diagnoses) ? (r.diagnoses as string[]) : [],
    advice: (r.advice as string | null) ?? null,
    medications: meds,
    extractedText: (r.extracted_text as string | null) ?? null,
  };
}

function safeParse(jsonText: string): ExtractedPrescription {
  // The LLM sometimes wraps JSON in markdown fences — strip them.
  const stripped = jsonText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    return normalize(JSON.parse(stripped));
  } catch {
    // Try to salvage: find the first { … last }
    const first = stripped.indexOf("{");
    const last = stripped.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return normalize(JSON.parse(stripped.slice(first, last + 1)));
      } catch {
        /* fall through */
      }
    }
    throw new Error("Extractor returned unparseable JSON");
  }
}

/** Extract from a file (image or PDF path). */
export async function extractFromFile(
  ctx: SkillContext,
  file: { path: string; kind: "image" | "pdf" },
): Promise<ExtractedPrescription> {
  if (!ctx.llm?.visionExtract) {
    throw new Error(
      "Host did not supply `llm.visionExtract`. Cannot process image/PDF prescriptions.",
    );
  }
  const raw = await ctx.llm.visionExtract({
    ...(file.kind === "image" ? { imagePath: file.path } : { pdfPath: file.path }),
  });
  return safeParse(raw);
}

/** Extract from freetext ("doctor said to take amox 500mg twice daily for 7 days"). */
export async function extractFromText(
  ctx: SkillContext,
  text: string,
): Promise<ExtractedPrescription> {
  if (!ctx.llm?.textExtract) {
    throw new Error(
      "Host did not supply `llm.textExtract`. Cannot process free-text prescriptions.",
    );
  }
  const raw = await ctx.llm.textExtract({ text });
  return safeParse(raw);
}

/** Static system-prompt fragment for hosts building their own extractor. */
export const EXTRACTOR_SYSTEM_PROMPT = EXTRACT_INSTRUCTIONS;
