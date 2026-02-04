/**
 * Import Historical Leads from Excel Spreadsheet
 *
 * Reads the patient acquisition worksheet and imports leads into the database.
 *
 * Usage: npx tsx scripts/import-leads.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { leads } from "../shared/schema";
import { randomUUID } from "crypto";
import XLSX from "xlsx";

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

// Path to the Excel file
const EXCEL_PATH = "/Users/kevinmease/Desktop/Arclo/New Patient Aquesition Worksheet - Use This One (1).xlsx";

// Site ID to use for imported leads
const SITE_ID = "site_1769814695100_f445b6d5"; // Empathy Health Clinic

// ============================================
// Mapping functions
// ============================================

function mapSourceType(source: string | undefined): string {
  if (!source) return "manual";
  const s = source.toLowerCase().trim();
  if (s === "phone") return "phone";
  if (s === "short form") return "short_form";
  if (s === "long form") return "long_form";
  if (s === "sms") return "sms";
  return "manual";
}

function mapServiceLine(signupService: string | undefined): string | null {
  if (!signupService || signupService === "No") return null;
  const s = signupService.toLowerCase().trim();
  if (s === "therapy") return "therapy";
  if (s === "psych evaluation") return "psych_evaluation";
  if (s === "medication management") return "medication_management";
  if (s === "adhd") return "adhd";
  if (s === "esa") return "esa";
  if (s === "suboxone") return "suboxone";
  if (s.includes("signed up")) return "general_inquiry";
  return "other";
}

function mapOutcome(signupService: string | undefined): string {
  if (!signupService) return "unknown";
  if (signupService === "No") return "not_signed_up";
  if (signupService.toLowerCase().includes("signed up")) return "signed_up";
  // If there's a specific service, they signed up
  if (["Therapy", "Psych Evaluation", "Medication Management", "ADHD", "ESA", "Suboxone"].some(
    svc => signupService.includes(svc)
  )) {
    return "signed_up";
  }
  return "unknown";
}

function mapNoSignupReason(reason: string | undefined): string | null {
  if (!reason) return null;
  const r = reason.toLowerCase().trim();

  // Spam/wrong number
  if (r.includes("spam") || r.includes("wrong number")) return "spam";

  // No response
  if (r.includes("did not respond")) return "did_not_respond";
  if (r.includes("no answer")) return "no_answer";

  // Availability
  if (r.includes("same day")) return "same_day_appointment";
  if (r.includes("no available")) return "no_availability";

  // Location
  if (r === "location") return "location";

  // Insurance reasons
  if (r.includes("medicaid")) return "medicaid";
  if (r.includes("medicare")) return "medicare";
  if (r.includes("humana")) return "humana";
  if (r.includes("ambetter")) return "ambetter";
  if (r.includes("hmo") || r.includes("lowpayer") || r.includes("low payer")) return "hmo_low_payer";
  if (r.includes("expensive") || r.includes("afford") || r.includes("oon")) return "private_pay_expensive";
  if (r.includes("sun shine") || r.includes("sunshine")) return "sunshine_health";

  // Service-related
  if (r.includes("benzo") || r.includes("xanax") || r.includes("xanex")) return "benzos_request";
  if (r.includes("adderal")) return "adderal";
  if (r.includes("requires md") || r.includes("psychologist") || r.includes("inpatient")) return "requires_md";
  if (r.includes("couples")) return "couples_therapy";
  if (r.includes("under age")) return "under_age";

  // General info
  if (r.includes("general info")) return "general_information";

  return "other";
}

function mapLeadStatus(outcome: string): string {
  if (outcome === "signed_up") return "signed_up";
  if (outcome === "not_signed_up") return "not_signed_up";
  return "closed"; // Historical leads are closed
}

function parseExcelDate(value: any): Date | null {
  if (!value) return null;

  // If it's already a Date object
  if (value instanceof Date) return value;

  // If it's an Excel serial number
  if (typeof value === "number") {
    // Excel dates are days since 1899-12-30
    const date = new Date((value - 25569) * 86400 * 1000);
    return date;
  }

  // If it's a string, try to parse it
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

// ============================================
// Main import function
// ============================================

async function importLeads() {
  console.log("Reading Excel file...");
  const workbook = XLSX.readFile(EXCEL_PATH);

  const monthSheets = workbook.SheetNames.filter(name =>
    name !== "Weekly KPI Sheet" && !name.includes("KPI")
  );

  console.log(`Found ${monthSheets.length} monthly sheets to import`);

  let totalImported = 0;
  let totalSkipped = 0;

  for (const sheetName of monthSheets) {
    console.log(`\nProcessing: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    let sheetImported = 0;
    let sheetSkipped = 0;

    for (const row of data) {
      // Skip empty rows
      if (!row.Date && !row["#Last4"]) {
        sheetSkipped++;
        continue;
      }

      const date = parseExcelDate(row.Date);
      if (!date) {
        sheetSkipped++;
        continue;
      }

      // Get name from #Last4 column
      const nameOrId = row["#Last4"]?.toString() || "Unknown";

      // Determine outcome
      const signupValue = row["Sign up/YES/which service"];
      const outcome = mapOutcome(signupValue);
      const serviceLine = mapServiceLine(signupValue);

      // Get no-signup reason
      const noSignupReason = outcome === "not_signed_up"
        ? mapNoSignupReason(row["Sign up/NO/Reason"])
        : null;

      // Source type
      const sourceType = mapSourceType(row["phone/chat/email"]);

      // Build notes from comments and "How did you hear about us?"
      const noteParts: string[] = [];
      if (row["How did you hear about us?"]) {
        noteParts.push(`Source: ${row["How did you hear about us?"]}`);
      }
      if (row.Comments) {
        noteParts.push(`Comments: ${row.Comments}`);
      }
      noteParts.push(`Imported from: ${sheetName}`);
      const notes = noteParts.join(" | ");

      try {
        await db.insert(leads).values({
          leadId: randomUUID(),
          siteId: SITE_ID,
          name: nameOrId,
          leadSourceType: sourceType,
          serviceLine: serviceLine || "general_inquiry",
          leadStatus: mapLeadStatus(outcome),
          outcome: outcome,
          noSignupReason: noSignupReason,
          notes: notes,
          createdAt: date,
        });
        sheetImported++;
      } catch (error: any) {
        console.error(`  Error importing row: ${error.message}`);
        sheetSkipped++;
      }
    }

    console.log(`  Imported: ${sheetImported}, Skipped: ${sheetSkipped}`);
    totalImported += sheetImported;
    totalSkipped += sheetSkipped;
  }

  console.log(`\n========================================`);
  console.log(`Total imported: ${totalImported}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log(`========================================`);

  await pool.end();
}

// Run the import
importLeads().catch(console.error);
