/**
 * GET /api/auth/callback → Google OAuth callback handler
 *
 * This is the redirect URI registered with Google Cloud Console.
 * It receives the authorization code and exchanges it for tokens.
 *
 * The state parameter contains { siteId } to identify which site
 * initiated the OAuth flow.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { exchangeCodeForSiteTokens, isOAuthConfigured } from "../_lib/googleOAuth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).send("Method not allowed");
  }

  // Check for OAuth errors from Google
  const error = req.query.error as string;
  if (error) {
    console.error("[OAuthCallback] Google returned error:", error);
    return res.send(renderCallbackPage({
      success: false,
      message: `Google OAuth error: ${error}`,
    }));
  }

  const code = req.query.code as string;
  const state = req.query.state as string;

  if (!code) {
    return res.send(renderCallbackPage({
      success: false,
      message: "No authorization code received from Google.",
    }));
  }

  if (!isOAuthConfigured()) {
    return res.send(renderCallbackPage({
      success: false,
      message: "OAuth not configured on server. Contact support.",
    }));
  }

  // Parse site ID from state
  let siteId: number | null = null;
  if (state) {
    try {
      const parsed = JSON.parse(state);
      siteId = parsed.siteId;
    } catch {
      console.warn("[OAuthCallback] Could not parse state:", state);
    }
  }

  if (!siteId) {
    return res.send(renderCallbackPage({
      success: false,
      message: "Invalid OAuth state. Please try connecting again.",
    }));
  }

  try {
    // Exchange code for tokens and store credentials
    const creds = await exchangeCodeForSiteTokens(code, siteId);

    console.log(`[OAuthCallback] Successfully stored credentials for site ${siteId}, email: ${creds.googleEmail}`);

    return res.send(renderCallbackPage({
      success: true,
      message: "Successfully connected to Google!",
      email: creds.googleEmail || undefined,
    }));
  } catch (error: any) {
    console.error("[OAuthCallback] Token exchange failed:", error.message);

    let userMessage = "Failed to complete Google authentication.";
    if (error.message?.includes("refresh_token")) {
      userMessage = "No refresh token received. Please revoke access at myaccount.google.com/permissions and try again.";
    }

    return res.send(renderCallbackPage({
      success: false,
      message: userMessage,
    }));
  }
}

/**
 * Renders an HTML page that shows the OAuth result and closes the popup.
 * The parent window polls /api/sites/:siteId/google/status to detect completion.
 */
function renderCallbackPage(opts: {
  success: boolean;
  message: string;
  email?: string;
}): string {
  const { success, message, email } = opts;

  const icon = success
    ? '<svg class="icon success" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
    : '<svg class="icon error" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';

  const emailLine = email ? `<p class="email">${email}</p>` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${success ? "Connected" : "Connection Failed"} - Arclo</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    .icon {
      width: 64px;
      height: 64px;
      margin-bottom: 20px;
    }
    .icon.success { color: #22c55e; }
    .icon.error { color: #ef4444; }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 12px;
    }
    .message {
      color: #666;
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 8px;
    }
    .email {
      color: #7c3aed;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 24px;
    }
    .hint {
      color: #999;
      font-size: 13px;
      margin-top: 24px;
    }
    .close-btn {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #7c3aed, #ec4899);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
    }
    .close-btn:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="card">
    ${icon}
    <h1>${success ? "Connected!" : "Connection Failed"}</h1>
    <p class="message">${message}</p>
    ${emailLine}
    <button class="close-btn" onclick="closeWindow()">
      ${success ? "Continue Setup" : "Close Window"}
    </button>
    <p class="hint">This window will close automatically...</p>
  </div>
  <script>
    // Auto-close after 3 seconds if successful
    ${success ? "setTimeout(closeWindow, 3000);" : ""}

    function closeWindow() {
      window.close();
      // If popup blocker prevents close, redirect to app
      setTimeout(() => {
        window.location.href = '/app';
      }, 500);
    }
  </script>
</body>
</html>`;
}
