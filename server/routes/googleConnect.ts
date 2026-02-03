/**
 * Per-Site Google Connection Routes
 *
 * Manages per-site Google OAuth credentials for GA4, GSC, and Ads.
 * Each site connects its own Google account via OAuth, storing
 * tokens in the site_google_credentials table.
 *
 * NOTE: The OAuth callback is handled in routes.ts at /api/auth/callback
 * (the registered GOOGLE_REDIRECT_URI). It detects per-site flows via
 * the state parameter containing { siteId }.
 */

import { Router } from 'express';
import { z } from 'zod';
import { google } from 'googleapis';
import { googleAuth } from '../auth/google-oauth';
import { storage } from '../storage';
import { requireAuth } from '../auth/session';
import { logger } from '../utils/logger';

const router = Router();

// ════════════════════════════════════════════════════════════════════════════
// POST /api/sites/:siteId/google/connect — Start OAuth flow for a site
// ════════════════════════════════════════════════════════════════════════════

router.post('/sites/:siteId/google/connect', requireAuth, async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);
    if (isNaN(siteId)) {
      return res.status(400).json({ ok: false, error: 'Invalid site ID' });
    }

    // Audit: ga4_connect_started
    logger.info('GA4Audit', 'ga4_connect_started', { siteId, timestamp: new Date().toISOString() });

    const authUrl = googleAuth.getAuthUrlForSite(siteId);
    res.json({ ok: true, authUrl });
  } catch (error: any) {
    logger.error('GoogleConnect', 'Failed to generate auth URL', { error: error.message });
    res.status(500).json({ ok: false, error: error.message || 'Failed to start Google connection' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/sites/:siteId/google/disconnect — Remove Google credentials
// ════════════════════════════════════════════════════════════════════════════

router.delete('/sites/:siteId/google/disconnect', requireAuth, async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);
    if (isNaN(siteId)) {
      return res.status(400).json({ ok: false, error: 'Invalid site ID' });
    }

    await storage.deleteSiteGoogleCredentials(siteId);

    // Audit: ga4_disconnected
    logger.info('GA4Audit', 'ga4_disconnected', { siteId, timestamp: new Date().toISOString() });

    res.json({ ok: true });
  } catch (error: any) {
    logger.error('GoogleConnect', 'Failed to disconnect Google', { error: error.message });
    res.status(500).json({ ok: false, error: 'Failed to disconnect Google account' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/sites/:siteId/google/status — Connection status
// ════════════════════════════════════════════════════════════════════════════

router.get('/sites/:siteId/google/status', requireAuth, async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);
    if (isNaN(siteId)) {
      return res.status(400).json({ ok: false, error: 'Invalid site ID' });
    }

    const creds = await storage.getSiteGoogleCredentials(siteId);

    if (!creds) {
      return res.json({
        ok: true,
        connected: false,
        integrationStatus: 'disconnected',
        ga4: null,
        gsc: null,
        ads: null,
      });
    }

    res.json({
      ok: true,
      connected: true,
      googleEmail: creds.googleEmail,
      connectedAt: creds.connectedAt?.toISOString() || null,
      integrationStatus: creds.integrationStatus || 'disconnected',
      lastVerifiedAt: creds.lastVerifiedAt?.toISOString() || null,
      lastErrorCode: creds.lastErrorCode || null,
      lastErrorMessage: creds.lastErrorMessage || null,
      ga4: creds.ga4PropertyId ? {
        propertyId: creds.ga4PropertyId,
        streamId: creds.ga4StreamId || null,
      } : null,
      gsc: creds.gscSiteUrl ? { siteUrl: creds.gscSiteUrl } : null,
      ads: creds.adsCustomerId ? {
        customerId: creds.adsCustomerId,
        loginCustomerId: creds.adsLoginCustomerId,
      } : null,
    });
  } catch (error: any) {
    logger.error('GoogleConnect', 'Failed to fetch Google status', { error: error.message });
    res.status(500).json({ ok: false, error: 'Failed to fetch Google connection status' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/sites/:siteId/google/properties — Discover available properties
// ════════════════════════════════════════════════════════════════════════════

router.get('/sites/:siteId/google/properties', requireAuth, async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);
    if (isNaN(siteId)) {
      return res.status(400).json({ ok: false, error: 'Invalid site ID' });
    }

    const auth = await googleAuth.getAuthenticatedClientForSite(siteId);

    // Discover GA4 properties
    const ga4Properties: Array<{ propertyId: string; displayName: string }> = [];
    try {
      const adminApi = google.analyticsadmin('v1beta');
      const accountsRes = await adminApi.accounts.list({ auth });
      const accounts = accountsRes.data.accounts || [];

      for (const account of accounts) {
        const propsRes = await adminApi.properties.list({
          auth,
          filter: `parent:${account.name}`,
        });
        for (const prop of propsRes.data.properties || []) {
          const id = prop.name?.replace('properties/', '') || '';
          if (id) {
            ga4Properties.push({
              propertyId: id,
              displayName: prop.displayName || id,
            });
          }
        }
      }
    } catch (err: any) {
      logger.warn('GoogleConnect', 'Failed to list GA4 properties', { error: err.message });
    }

    // Discover GSC sites
    const gscSites: Array<{ siteUrl: string; permissionLevel: string }> = [];
    try {
      const searchConsole = google.searchconsole('v1');
      const sitesRes = await searchConsole.sites.list({ auth });
      for (const entry of sitesRes.data.siteEntry || []) {
        if (entry.siteUrl) {
          gscSites.push({
            siteUrl: entry.siteUrl,
            permissionLevel: entry.permissionLevel || 'unknown',
          });
        }
      }
    } catch (err: any) {
      logger.warn('GoogleConnect', 'Failed to list GSC sites', { error: err.message });
    }

    res.json({
      ok: true,
      ga4: ga4Properties,
      gsc: gscSites,
    });
  } catch (error: any) {
    logger.error('GoogleConnect', 'Failed to discover properties', { error: error.message });
    res.status(500).json({ ok: false, error: error.message || 'Failed to discover Google properties' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/sites/:siteId/google/streams — List web data streams for a GA4 property
// ════════════════════════════════════════════════════════════════════════════

router.get('/sites/:siteId/google/streams', requireAuth, async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);
    if (isNaN(siteId)) {
      return res.status(400).json({ ok: false, error: 'Invalid site ID' });
    }

    const propertyId = req.query.propertyId as string;
    if (!propertyId) {
      return res.status(400).json({ ok: false, error: 'propertyId query parameter is required' });
    }

    const auth = await googleAuth.getAuthenticatedClientForSite(siteId);
    const adminApi = google.analyticsadmin('v1beta');

    const streams: Array<{ streamId: string; streamName: string; measurementId: string | null }> = [];

    try {
      const streamsRes = await adminApi.properties.dataStreams.list({
        auth,
        parent: `properties/${propertyId}`,
      });

      for (const stream of streamsRes.data.dataStreams || []) {
        // Only include web data streams
        if (stream.type === 'WEB_DATA_STREAM' && stream.name) {
          const streamId = stream.name.split('/').pop() || '';
          streams.push({
            streamId,
            streamName: stream.displayName || streamId,
            measurementId: stream.webStreamData?.measurementId || null,
          });
        }
      }
    } catch (err: any) {
      logger.warn('GoogleConnect', 'Failed to list data streams', { error: err.message, propertyId });
      return res.status(500).json({ ok: false, error: 'Failed to list data streams' });
    }

    res.json({ ok: true, streams });
  } catch (error: any) {
    logger.error('GoogleConnect', 'Failed to fetch streams', { error: error.message });
    res.status(500).json({ ok: false, error: error.message || 'Failed to fetch data streams' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/sites/:siteId/google/properties — Save selected properties
// ════════════════════════════════════════════════════════════════════════════

const updatePropertiesSchema = z.object({
  ga4PropertyId: z.string().optional(),
  ga4StreamId: z.string().optional(),
  gscSiteUrl: z.string().optional(),
  adsCustomerId: z.string().optional(),
  adsLoginCustomerId: z.string().optional(),
});

router.put('/sites/:siteId/google/properties', requireAuth, async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);
    if (isNaN(siteId)) {
      return res.status(400).json({ ok: false, error: 'Invalid site ID' });
    }

    const body = updatePropertiesSchema.parse(req.body);

    const creds = await storage.getSiteGoogleCredentials(siteId);
    if (!creds) {
      return res.status(404).json({ ok: false, error: 'No Google credentials found. Connect Google first.' });
    }

    await storage.updateSiteGoogleCredentials(siteId, {
      ga4PropertyId: body.ga4PropertyId ?? creds.ga4PropertyId,
      ga4StreamId: body.ga4StreamId ?? creds.ga4StreamId,
      gscSiteUrl: body.gscSiteUrl ?? creds.gscSiteUrl,
      adsCustomerId: body.adsCustomerId ?? creds.adsCustomerId,
      adsLoginCustomerId: body.adsLoginCustomerId ?? creds.adsLoginCustomerId,
    });

    // Audit: ga4_property_selected
    if (body.ga4PropertyId || body.ga4StreamId) {
      logger.info('GA4Audit', 'ga4_property_selected', {
        siteId,
        propertyId: body.ga4PropertyId,
        streamId: body.ga4StreamId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ ok: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: error.errors[0]?.message || 'Validation failed' });
    }
    logger.error('GoogleConnect', 'Failed to update properties', { error: error.message });
    res.status(500).json({ ok: false, error: 'Failed to update Google properties' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/sites/:siteId/google/ga4/verify — Verify GA4 connection with test fetch
// ════════════════════════════════════════════════════════════════════════════

router.post('/sites/:siteId/google/ga4/verify', requireAuth, async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);
    if (isNaN(siteId)) {
      return res.status(400).json({ ok: false, error: 'Invalid site ID' });
    }

    const creds = await storage.getSiteGoogleCredentials(siteId);
    if (!creds) {
      return res.status(404).json({ ok: false, error: 'No Google credentials found. Connect Google first.' });
    }

    if (!creds.ga4PropertyId) {
      return res.status(400).json({ ok: false, error: 'No GA4 property selected. Select a property first.' });
    }

    const auth = await googleAuth.getAuthenticatedClientForSite(siteId);
    const analyticsData = google.analyticsdata('v1beta');

    // Calculate date range: last 28 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    try {
      // Run test fetch: sessions, users, and top 5 landing pages
      const response = await analyticsData.properties.runReport({
        auth,
        property: `properties/${creds.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
          dimensions: [{ name: 'landingPage' }],
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
          ],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: '5',
        },
      });

      const rows = response.data.rows || [];

      // Calculate totals
      let totalSessions = 0;
      let totalUsers = 0;
      const landingPages: Array<{ page: string; sessions: number; users: number }> = [];

      for (const row of rows) {
        const sessions = parseInt(row.metricValues?.[0]?.value || '0');
        const users = parseInt(row.metricValues?.[1]?.value || '0');
        const page = row.dimensionValues?.[0]?.value || '/';

        totalSessions += sessions;
        totalUsers += users;
        landingPages.push({ page, sessions, users });
      }

      // Also run a totals-only query for accurate aggregate numbers
      const totalsResponse = await analyticsData.properties.runReport({
        auth,
        property: `properties/${creds.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
          ],
        },
      });

      const totalsRow = totalsResponse.data.rows?.[0];
      if (totalsRow) {
        totalSessions = parseInt(totalsRow.metricValues?.[0]?.value || '0');
        totalUsers = parseInt(totalsRow.metricValues?.[1]?.value || '0');
      }

      // Update integration status to connected
      await storage.updateSiteGoogleCredentials(siteId, {
        integrationStatus: 'connected',
        lastVerifiedAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      });

      // Audit: ga4_verified_success
      logger.info('GA4Audit', 'ga4_verified_success', {
        siteId,
        propertyId: creds.ga4PropertyId,
        sessions: totalSessions,
        users: totalUsers,
        timestamp: new Date().toISOString(),
      });

      res.json({
        ok: true,
        sampleMetrics: {
          sessions: totalSessions,
          users: totalUsers,
          landingPages,
          dateRange: {
            start: formatDate(startDate),
            end: formatDate(endDate),
          },
        },
      });
    } catch (gaError: any) {
      // Update integration status to error
      const errorCode = gaError.code || 'UNKNOWN';
      const errorMessage = gaError.message || 'Failed to fetch GA4 data';

      await storage.updateSiteGoogleCredentials(siteId, {
        integrationStatus: 'error',
        lastErrorCode: String(errorCode),
        lastErrorMessage: errorMessage.substring(0, 500), // Truncate to avoid long messages
      });

      // Audit: ga4_verified_failed
      logger.info('GA4Audit', 'ga4_verified_failed', {
        siteId,
        propertyId: creds.ga4PropertyId,
        errorCode,
        timestamp: new Date().toISOString(),
      });

      res.json({
        ok: false,
        error: errorMessage,
        errorCode,
        troubleshooting: [
          'Verify you have "Viewer" or higher access to this GA4 property',
          'Ensure the correct property is selected',
          'Check if the property has data for the last 28 days',
          'Try reconnecting your Google account',
        ],
      });
    }
  } catch (error: any) {
    logger.error('GoogleConnect', 'Failed to verify GA4 connection', { error: error.message });
    res.status(500).json({ ok: false, error: error.message || 'Failed to verify GA4 connection' });
  }
});

export default router;
