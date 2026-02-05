/**
 * GET /api/leads/enums — Enum values for UI dropdowns
 * Rewrite: /api/leads/enums → /api/leads-enums
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionUser, setCorsHeaders } from "./_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  return res.json({
    statuses: ["new", "in_progress", "contacted", "scheduled", "signed_up", "not_signed_up", "closed"],
    outcomes: ["unknown", "signed_up", "not_signed_up"],
    sourceTypes: ["form_submit", "phone_click", "manual"],
    serviceLines: ["psychiatric_services", "therapy", "general_inquiry", "other"],
    formTypes: ["short", "long", "phone_click", "other"],
    noSignupReasons: [
      "spam", "wrong_number", "no_answer", "voicemail_left", "not_interested",
      "general_information_only", "waitlist", "no_availability", "out_of_area",
      "insurance_issue", "medicaid", "medicare", "private_pay_too_expensive",
      "benzos_request", "wrong_service", "duplicate_lead", "other",
    ],
    signupTypes: ["scheduled_consult", "scheduled_intake", "became_patient", "referral_out", "follow_up_required"],
    contactMethods: ["phone", "email", "text", "unknown"],
  });
}
