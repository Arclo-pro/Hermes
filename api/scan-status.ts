import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "./_lib/db.js";

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const AGENT_LABELS: Record<string, string> = {
  technical_crawl: "Scanning homepage...",
  cwv: "Running performance analysis...",
  serp: "Checking SERP rankings...",
  competitive: "Analyzing competitors...",
  atlas_ai: "Evaluating AI search readiness...",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "GET") return res.status(405).json({ ok: false, message: "Method not allowed" });

    const scanId = req.query.scanId;
    if (!scanId || typeof scanId !== "string") {
      return res.status(400).json({ ok: false, message: "Scan ID is required" });
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT scan_id, status, error_message, full_report, created_at, started_at, completed_at
       FROM scan_requests WHERE scan_id = $1`,
      [scanId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Scan not found" });
    }

    const scan = result.rows[0];
    let progress = 0;
    let message = "Starting scan...";
    let agents: { agent_step: string; status: string; duration_ms: number | null }[] = [];

    if (scan.status === "queued") {
      progress = 10; message = "Queued for scanning...";
    } else if (scan.status === "running") {
      // Query real agent_runs for progress
      const agentResult = await pool.query(
        `SELECT agent_step, status, duration_ms FROM agent_runs WHERE scan_id = $1 ORDER BY id`,
        [scanId]
      );
      agents = agentResult.rows;

      if (agents.length === 0) {
        // Agents haven't been created yet — scan just started
        progress = 10;
        message = "Initializing scan agents...";
      } else {
        const total = agents.length;
        const completed = agents.filter(a => a.status === "completed" || a.status === "failed" || a.status === "skipped").length;
        progress = Math.round((completed / total) * 90) + 10; // 10-100 range

        // Find currently running agent for message
        const running = agents.find(a => a.status === "running");
        if (running) {
          message = AGENT_LABELS[running.agent_step] || `Running ${running.agent_step}...`;
        } else if (completed === total) {
          progress = 95;
          message = "Finalizing report...";
        } else {
          const pending = agents.find(a => a.status === "pending");
          if (pending) {
            message = AGENT_LABELS[pending.agent_step] || `Preparing ${pending.agent_step}...`;
          }
        }
      }
    } else if (scan.status === "preview_ready" || scan.status === "completed") {
      progress = 100; message = "Scan complete!";
    } else if (scan.status === "failed") {
      progress = 0; message = scan.error_message || "Scan failed";
    }

    return res.json({
      scanId: scan.scan_id,
      status: scan.status,
      progress,
      message,
      ...(agents.length > 0 ? { agents } : {}),
    });
  } catch (error: any) {
    console.error("[ScanStatus] Error:", error?.message);
    if (!res.headersSent) {
      return res.status(500).json({ ok: false, message: "Failed to check scan status" });
    }
  }
}
