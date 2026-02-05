/**
 * Google OAuth helper for Vercel serverless functions.
 * Handles OAuth flow, token refresh, and provides authenticated clients.
 */

import { google } from "googleapis";
import { getPool } from "./db.js";

// ============================================================
// Site ID Resolution
// ============================================================

/**
 * Resolves a site identifier to a numeric ID.
 * Handles both:
 * - Numeric IDs directly (e.g., "123")
 * - Text-based site_id values (e.g., "site_abc123")
 */
export async function resolveNumericSiteId(siteIdParam: string): Promise<number | null> {
  // Try parsing as numeric first
  const numericId = parseInt(siteIdParam, 10);
  if (!isNaN(numericId)) {
    return numericId;
  }

  // Look up by text site_id in the sites table
  const pool = getPool();
  const result = await pool.query(
    `SELECT id FROM sites WHERE site_id = $1 LIMIT 1`,
    [siteIdParam]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].id;
}

const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/adwords",
];

// ============================================================
// Types
// ============================================================

export interface SiteGoogleCredentials {
  id: number;
  siteId: number;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
  scopes: string[];
  ga4PropertyId: string | null;
  ga4StreamId: string | null;
  gscSiteUrl: string | null;
  adsCustomerId: string | null;
  adsLoginCustomerId: string | null;
  googleEmail: string | null;
  integrationStatus: string | null;
  lastVerifiedAt: Date | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  connectedAt: Date | null;
  updatedAt: Date | null;
}

// ============================================================
// OAuth Configuration Cache
// ============================================================

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Platform-level cache (env vars or platform_oauth_config)
let cachedPlatformConfig: OAuthConfig | null = null;
let platformCacheTimestamp: number = 0;

// Per-site cache: Map<siteId, { config, timestamp }>
const siteConfigCache = new Map<number, { config: OAuthConfig; timestamp: number }>();

const CACHE_TTL = 60_000; // 1 minute cache

/**
 * Get OAuth config for a specific site.
 * Priority:
 * 1. Site-specific config (site_oauth_config table)
 * 2. Platform-wide env vars (fallback for development)
 * 3. Platform-wide database config (fallback)
 */
async function getOAuthConfigForSite(siteId: number): Promise<OAuthConfig | null> {
  // Check site-specific cache first
  const cached = siteConfigCache.get(siteId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.config;
  }

  // Try site-specific config from database
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT client_id, client_secret, redirect_uri
       FROM site_oauth_config
       WHERE site_id = $1
       LIMIT 1`,
      [siteId]
    );

    if (result.rows.length > 0) {
      const config: OAuthConfig = {
        clientId: result.rows[0].client_id,
        clientSecret: result.rows[0].client_secret,
        redirectUri: result.rows[0].redirect_uri,
      };
      siteConfigCache.set(siteId, { config, timestamp: Date.now() });
      console.log(`[OAuth] Using site-specific config for site ${siteId}`);
      return config;
    }
  } catch (err) {
    // Table might not exist yet
    console.log("[OAuth] Could not read site config from database:", err);
  }

  // Fall back to platform-wide config
  return getOAuthConfig();
}

/**
 * Get platform-wide OAuth config (env vars or platform_oauth_config table).
 * Used as fallback when no site-specific config exists.
 */
async function getOAuthConfig(): Promise<OAuthConfig | null> {
  // Check cache first
  if (cachedPlatformConfig && Date.now() - platformCacheTimestamp < CACHE_TTL) {
    return cachedPlatformConfig;
  }

  // Try environment variables first
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    cachedPlatformConfig = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/auth/callback",
    };
    platformCacheTimestamp = Date.now();
    return cachedPlatformConfig;
  }

  // Try database
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT client_id, client_secret, redirect_uri
       FROM platform_oauth_config
       WHERE provider = 'google'
       LIMIT 1`
    );

    if (result.rows.length > 0) {
      cachedPlatformConfig = {
        clientId: result.rows[0].client_id,
        clientSecret: result.rows[0].client_secret,
        redirectUri: result.rows[0].redirect_uri,
      };
      platformCacheTimestamp = Date.now();
      return cachedPlatformConfig;
    }
  } catch (err) {
    // Table might not exist yet, that's okay
    console.log("[OAuth] Could not read platform config from database:", err);
  }

  return null;
}

/**
 * Check if OAuth is configured for a specific site.
 */
export async function isOAuthConfiguredForSite(siteId: number): Promise<boolean> {
  const config = await getOAuthConfigForSite(siteId);
  return config !== null;
}

/**
 * Clear OAuth config cache for a site (call after saving new config).
 */
export function clearOAuthConfigCache(siteId?: number): void {
  if (siteId !== undefined) {
    siteConfigCache.delete(siteId);
  } else {
    siteConfigCache.clear();
    cachedPlatformConfig = null;
    platformCacheTimestamp = 0;
  }
}

// ============================================================
// OAuth Client Factory
// ============================================================

/**
 * Create OAuth2 client for a specific site.
 * Uses site-specific credentials if available, falls back to platform config.
 */
export async function createOAuth2ClientForSite(siteId: number): Promise<InstanceType<typeof google.auth.OAuth2>> {
  const config = await getOAuthConfigForSite(siteId);

  if (!config) {
    throw new Error("OAUTH_NOT_CONFIGURED");
  }

  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

export async function createOAuth2ClientAsync(): Promise<InstanceType<typeof google.auth.OAuth2>> {
  const config = await getOAuthConfig();

  if (!config) {
    throw new Error("OAUTH_NOT_CONFIGURED");
  }

  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

// Synchronous version for backwards compatibility (uses cache)
export function createOAuth2Client(): InstanceType<typeof google.auth.OAuth2> {
  // Check env vars first (synchronous)
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/auth/callback";

  if (clientId && clientSecret) {
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  // Check cache (populated by async calls)
  if (cachedPlatformConfig) {
    return new google.auth.OAuth2(
      cachedPlatformConfig.clientId,
      cachedPlatformConfig.clientSecret,
      cachedPlatformConfig.redirectUri
    );
  }

  throw new Error("OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
}

export async function isOAuthConfiguredAsync(): Promise<boolean> {
  const config = await getOAuthConfig();
  return config !== null;
}

export function isOAuthConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) || !!cachedPlatformConfig;
}

// ============================================================
// OAuth URL Generation
// ============================================================

export async function getAuthUrlForSiteAsync(siteId: number): Promise<string> {
  // Use site-specific OAuth credentials
  const oauth2Client = await createOAuth2ClientForSite(siteId);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: JSON.stringify({ siteId }),
  });
}

export function getAuthUrlForSite(siteId: number): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: JSON.stringify({ siteId }),
  });
}

// ============================================================
// Token Exchange
// ============================================================

export async function exchangeCodeForSiteTokensAsync(
  code: string,
  siteId: number
): Promise<SiteGoogleCredentials> {
  // Use site-specific OAuth credentials
  const oauth2Client = await createOAuth2ClientForSite(siteId);
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.expiry_date) {
    throw new Error("Failed to obtain access token");
  }

  if (!tokens.refresh_token) {
    throw new Error("No refresh token received. User may need to revoke access and re-authorize.");
  }

  // Fetch the Google email associated with this token
  const config = await getOAuthConfigForSite(siteId);
  const tempClient = new google.auth.OAuth2(config?.clientId, config?.clientSecret);
  tempClient.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: tempClient });

  let googleEmail: string | null = null;
  try {
    const userInfo = await oauth2.userinfo.get();
    googleEmail = userInfo.data.email || null;
  } catch {
    // Non-fatal: email is informational
  }

  // Upsert credentials in database
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO site_google_credentials (
      site_id, access_token, refresh_token, token_expiry, scopes, google_email, connected_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    ON CONFLICT (site_id) DO UPDATE SET
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      token_expiry = EXCLUDED.token_expiry,
      scopes = EXCLUDED.scopes,
      google_email = EXCLUDED.google_email,
      updated_at = NOW()
    RETURNING *`,
    [
      siteId,
      tokens.access_token,
      tokens.refresh_token,
      new Date(tokens.expiry_date),
      SCOPES,
      googleEmail,
    ]
  );

  return mapCredentialsRow(result.rows[0]);
}

export async function exchangeCodeForSiteTokens(
  code: string,
  siteId: number
): Promise<SiteGoogleCredentials> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.expiry_date) {
    throw new Error("Failed to obtain access token");
  }

  if (!tokens.refresh_token) {
    throw new Error("No refresh token received. User may need to revoke access and re-authorize.");
  }

  // Fetch the Google email associated with this token
  const tempClient = createOAuth2Client();
  tempClient.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: tempClient });

  let googleEmail: string | null = null;
  try {
    const userInfo = await oauth2.userinfo.get();
    googleEmail = userInfo.data.email || null;
  } catch {
    // Non-fatal: email is informational
  }

  // Upsert credentials in database
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO site_google_credentials (
      site_id, access_token, refresh_token, token_expiry, scopes, google_email, connected_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    ON CONFLICT (site_id) DO UPDATE SET
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      token_expiry = EXCLUDED.token_expiry,
      scopes = EXCLUDED.scopes,
      google_email = EXCLUDED.google_email,
      updated_at = NOW()
    RETURNING *`,
    [
      siteId,
      tokens.access_token,
      tokens.refresh_token,
      new Date(tokens.expiry_date),
      SCOPES,
      googleEmail,
    ]
  );

  return mapCredentialsRow(result.rows[0]);
}

// ============================================================
// Credentials Management
// ============================================================

export async function getSiteGoogleCredentials(
  siteId: number
): Promise<SiteGoogleCredentials | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM site_google_credentials WHERE site_id = $1 LIMIT 1`,
    [siteId]
  );

  if (result.rows.length === 0) return null;
  return mapCredentialsRow(result.rows[0]);
}

export async function updateSiteGoogleCredentials(
  siteId: number,
  updates: Partial<{
    accessToken: string;
    tokenExpiry: Date;
    ga4PropertyId: string;
    ga4StreamId: string;
    gscSiteUrl: string;
    adsCustomerId: string;
    adsLoginCustomerId: string;
    integrationStatus: string;
    lastVerifiedAt: Date;
    lastErrorCode: string | null;
    lastErrorMessage: string | null;
  }>
): Promise<void> {
  const pool = getPool();
  const setClauses: string[] = ["updated_at = NOW()"];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.accessToken !== undefined) {
    setClauses.push(`access_token = $${paramIndex++}`);
    values.push(updates.accessToken);
  }
  if (updates.tokenExpiry !== undefined) {
    setClauses.push(`token_expiry = $${paramIndex++}`);
    values.push(updates.tokenExpiry);
  }
  if (updates.ga4PropertyId !== undefined) {
    setClauses.push(`ga4_property_id = $${paramIndex++}`);
    values.push(updates.ga4PropertyId);
  }
  if (updates.ga4StreamId !== undefined) {
    setClauses.push(`ga4_stream_id = $${paramIndex++}`);
    values.push(updates.ga4StreamId);
  }
  if (updates.gscSiteUrl !== undefined) {
    setClauses.push(`gsc_site_url = $${paramIndex++}`);
    values.push(updates.gscSiteUrl);
  }
  if (updates.adsCustomerId !== undefined) {
    setClauses.push(`ads_customer_id = $${paramIndex++}`);
    values.push(updates.adsCustomerId);
  }
  if (updates.adsLoginCustomerId !== undefined) {
    setClauses.push(`ads_login_customer_id = $${paramIndex++}`);
    values.push(updates.adsLoginCustomerId);
  }
  if (updates.integrationStatus !== undefined) {
    setClauses.push(`integration_status = $${paramIndex++}`);
    values.push(updates.integrationStatus);
  }
  if (updates.lastVerifiedAt !== undefined) {
    setClauses.push(`last_verified_at = $${paramIndex++}`);
    values.push(updates.lastVerifiedAt);
  }
  if (updates.lastErrorCode !== undefined) {
    setClauses.push(`last_error_code = $${paramIndex++}`);
    values.push(updates.lastErrorCode);
  }
  if (updates.lastErrorMessage !== undefined) {
    setClauses.push(`last_error_message = $${paramIndex++}`);
    values.push(updates.lastErrorMessage);
  }

  values.push(siteId);

  await pool.query(
    `UPDATE site_google_credentials SET ${setClauses.join(", ")} WHERE site_id = $${paramIndex}`,
    values
  );
}

export async function deleteSiteGoogleCredentials(siteId: number): Promise<void> {
  const pool = getPool();
  await pool.query(`DELETE FROM site_google_credentials WHERE site_id = $1`, [siteId]);
}

// ============================================================
// Authenticated Client
// ============================================================

export async function getAuthenticatedClientForSite(
  siteId: number
): Promise<InstanceType<typeof google.auth.OAuth2>> {
  const creds = await getSiteGoogleCredentials(siteId);

  if (!creds) {
    throw new Error(`No Google credentials found for site ${siteId}. Connect Google first.`);
  }

  // Check if token is expired
  if (new Date() >= creds.tokenExpiry) {
    console.log(`[OAuth] Site ${siteId} token expired, refreshing...`);
    await refreshSiteToken(siteId, creds);
    return getAuthenticatedClientForSite(siteId);
  }

  // Use site-specific OAuth config
  const client = await createOAuth2ClientForSite(siteId);
  client.setCredentials({
    access_token: creds.accessToken,
    refresh_token: creds.refreshToken,
  });

  return client;
}

async function refreshSiteToken(siteId: number, creds: SiteGoogleCredentials): Promise<void> {
  // Use site-specific OAuth config
  const client = await createOAuth2ClientForSite(siteId);
  client.setCredentials({
    refresh_token: creds.refreshToken,
  });

  const { credentials } = await client.refreshAccessToken();

  if (!credentials.access_token || !credentials.expiry_date) {
    throw new Error(`Failed to refresh access token for site ${siteId}`);
  }

  await updateSiteGoogleCredentials(siteId, {
    accessToken: credentials.access_token,
    tokenExpiry: new Date(credentials.expiry_date),
  });

  console.log(`[OAuth] Site ${siteId} token refreshed successfully`);
}

// ============================================================
// Helper
// ============================================================

function mapCredentialsRow(row: any): SiteGoogleCredentials {
  return {
    id: row.id,
    siteId: row.site_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiry: new Date(row.token_expiry),
    scopes: row.scopes || [],
    ga4PropertyId: row.ga4_property_id,
    ga4StreamId: row.ga4_stream_id,
    gscSiteUrl: row.gsc_site_url,
    adsCustomerId: row.ads_customer_id,
    adsLoginCustomerId: row.ads_login_customer_id,
    googleEmail: row.google_email,
    integrationStatus: row.integration_status,
    lastVerifiedAt: row.last_verified_at ? new Date(row.last_verified_at) : null,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    connectedAt: row.connected_at ? new Date(row.connected_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };
}
