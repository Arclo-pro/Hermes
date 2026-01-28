import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    sendGridKeyExists: !!process.env.SendGrid,
    sendGridKeyPrefix: process.env.SendGrid?.substring(0, 5) || "missing",
    fromEmail: process.env.SENDGRID_FROM_EMAIL || "noreply@arclo.pro (default)",
  };

  // Try importing and initializing SendGrid
  try {
    const sgMail = (await import("@sendgrid/mail")).default;
    const apiKey = process.env.SendGrid;
    if (!apiKey) {
      results.error = "SendGrid env var not set";
      return res.json(results);
    }
    sgMail.setApiKey(apiKey);

    const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@arclo.pro";

    // Try sending a test email
    await sgMail.send({
      to: "kevin@thetechcompound.com",
      from: fromEmail,
      subject: "Arclo Test Email",
      text: "This is a test email from the Arclo auth system.",
    });

    results.emailSent = "ok";
  } catch (e: any) {
    results.emailError = e.message;
    if (e.response?.body) {
      results.sendGridResponse = e.response.body;
    }
  }

  return res.json(results);
}
