import cron from 'node-cron';
import { ga4Connector } from './connectors/ga4';
import { gscConnector } from './connectors/gsc';
import { adsConnector } from './connectors/ads';
import { websiteChecker } from './website_checks';
import { analysisEngine } from './analysis';
import { googleAuth } from './auth/google-oauth';
import { logger } from './utils/logger';

async function runDailyDiagnostics() {
  try {
    logger.info('Scheduler', 'Starting scheduled diagnostic run');

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const isAuthenticated = await googleAuth.isAuthenticated();
    
    if (!isAuthenticated) {
      logger.warn('Scheduler', 'Not authenticated, skipping API data fetch');
    } else {
      await Promise.all([
        ga4Connector.fetchDailyData(startDate, endDate).catch(e => 
          logger.error('Scheduler', 'GA4 fetch failed', { error: e.message })
        ),
        gscConnector.fetchDailyData(startDate, endDate).catch(e => 
          logger.error('Scheduler', 'GSC fetch failed', { error: e.message })
        ),
        adsConnector.fetchDailyData(startDate, endDate).catch(e => 
          logger.error('Scheduler', 'Ads fetch failed', { error: e.message })
        ),
      ]);

      await Promise.all([
        ga4Connector.checkRealtimeHealth().catch(e =>
          logger.error('Scheduler', 'GA4 realtime check failed', { error: e.message })
        ),
        gscConnector.fetchSitemaps().catch(e =>
          logger.error('Scheduler', 'GSC sitemaps fetch failed', { error: e.message })
        ),
        adsConnector.getCampaignStatuses().catch(e =>
          logger.error('Scheduler', 'Ads campaign status check failed', { error: e.message })
        ),
        adsConnector.getPolicyIssues().catch(e =>
          logger.error('Scheduler', 'Ads policy issues check failed', { error: e.message })
        ),
      ]);
    }

    const topPages = await ga4Connector.getLandingPagePerformance(startDate, endDate, 20)
      .then(pages => pages.map(p => `https://${process.env.DOMAIN || 'empathyhealthclinic.com'}${p.landingPage}`))
      .catch(() => []);
    
    await websiteChecker.runDailyChecks(topPages);

    const report = await analysisEngine.generateReport(startDate, endDate);

    const rootCauses = typeof report.rootCauses === 'string' 
      ? JSON.parse(report.rootCauses) 
      : report.rootCauses;
    
    await analysisEngine.generateTickets(report.id, rootCauses);

    logger.info('Scheduler', 'Scheduled diagnostic run completed', { reportId: report.id });
  } catch (error: any) {
    logger.error('Scheduler', 'Scheduled diagnostic run failed', { error: error.message });
  }
}

export function startScheduler() {
  cron.schedule('0 7 * * *', runDailyDiagnostics, {
    scheduled: true,
    timezone: 'America/Chicago',
  });

  logger.info('Scheduler', 'Daily scheduler started (7am America/Chicago)');
}
