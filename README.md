# Traffic & Spend Doctor

Production-ready web service for diagnosing organic traffic drops and Google Ads spend anomalies for **empathyhealthclinic.com**.

## Features

- **Daily Automated Diagnostics**: Runs at 7am America/Chicago timezone
- **On-Demand Analysis**: Trigger diagnostics anytime via API or dashboard
- **Multi-Source Data Collection**:
  - Google Analytics 4 (GA4) - Sessions, users, events, conversions
  - Google Search Console (GSC) - Clicks, impressions, CTR, positions  
  - Google Ads - Spend, campaigns, disapprovals, policy issues
  - Website Health Checks - Status codes, redirects, canonical tags, meta robots
- **Smart Drop Detection**: Rolling averages + z-score analysis
- **Root Cause Classification**: Ranked hypotheses with evidence
- **Automated Ticketing**: Ready-to-file tickets with prioritization (SEO/Dev/Ads)
- **Dashboard UI**: Minimal interface at `/dashboard`

## Stack

- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL (with Drizzle ORM)
- **Scheduler**: node-cron
- **APIs**: Google Analytics Data API, Search Console API, Ads API
- **Frontend**: React + Vite + TailwindCSS

## Setup Instructions

### 1. Environment Variables

Create or update your environment variables with the following:

```bash
# Domain to monitor
DOMAIN=empathyhealthclinic.com

# Google OAuth Credentials (required for API access)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback

# Google API Configuration
GA4_PROPERTY_ID=your_ga4_property_id
GSC_SITE=sc-domain:empathyhealthclinic.com  # or https://empathyhealthclinic.com/ for URL-prefix
ADS_CUSTOMER_ID=123-456-7890

# Microsoft Clarity (optional, for session recordings)
CLARITY_PROJECT_ID=your_clarity_project_id

# Database (automatically set by Replit)
DATABASE_URL=postgresql://...
```

### Configuration Values Checklist

After setup, verify these values are correct:
- **GA4_PROPERTY_ID**: Numeric property ID (e.g., `345678901`)
- **GSC_SITE**: Exact format matters:
  - Domain property: `sc-domain:empathyhealthclinic.com`
  - URL-prefix: `https://empathyhealthclinic.com/`
- **ADS_CUSTOMER_ID**: Format `123-456-7890` (with or without dashes)
- **GOOGLE_REDIRECT_URI**: Must match exactly in Google Cloud Console

### Google Ads API (Additional Requirements)

For full Google Ads integration, you also need:

```bash
# Apply for a Developer Token at:
# https://developers.google.com/google-ads/api/docs/get-started/dev-token
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token

# Required if using MCC (Manager) account
GOOGLE_ADS_LOGIN_CUSTOMER_ID=123-456-7890
```

**Note:** The Google Ads API has additional approval requirements. Without a Developer Token, the Ads connector will show placeholder data with instructions to check the Google Ads dashboard directly.

### 2. Google Cloud Platform Setup

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing

2. **Enable Required APIs**:
   - Google Analytics Data API (GA4)
   - Google Search Console API
   - Google Ads API

3. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Application type: Web application
   - Authorized redirect URIs: Add your `GOOGLE_REDIRECT_URI`
   - Copy Client ID and Client Secret to environment variables

4. **Grant Access**:
   - GA4: Ensure OAuth account has Viewer access to GA4 property
   - GSC: Ensure OAuth account is verified owner/user in Search Console
   - Ads: Link Google Ads account with OAuth email

### 3. Database Setup

The database is automatically provisioned. To push the schema:

```bash
npm run db:push
```

### 4. Running the Application

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

The app serves on port 5000 at `http://localhost:5000`

### 5. Authentication Flow

1. Navigate to `/dashboard`
2. If not authenticated, click "Authenticate with Google"
3. Complete OAuth flow
4. Service will store refresh tokens and auto-refresh as needed

## API Endpoints

### Authentication
- `GET /api/auth/status` - Check authentication status
- `GET /api/auth/url` - Get OAuth authorization URL
- `POST /api/auth/callback` - OAuth callback handler
  ```json
  { "code": "authorization_code" }
  ```

### Diagnostics
- `POST /api/run` - Run diagnostics now
  ```json
  {
    "success": true,
    "reportId": 123,
    "summary": "Detected 2 significant traffic drop(s)..."
  }
  ```

### Reports & Tickets
- `GET /api/report/latest` - Get latest diagnostic report
- `GET /api/tickets/latest?limit=10` - Get recent tickets
- `PATCH /api/tickets/:ticketId/status` - Update ticket status
  ```json
  { "status": "In Progress" }
  ```

### Dashboard
- `GET /api/dashboard/stats` - Get summary stats for dashboard

## Scheduler

The service automatically runs daily diagnostics at **7:00 AM America/Chicago** timezone.

To modify the schedule, edit `server/scheduler.ts`:

```typescript
cron.schedule('0 7 * * *', runDailyDiagnostics, {
  timezone: 'America/Chicago',
});
```

## Data Storage

All data is persisted in PostgreSQL:

- **oauth_tokens**: OAuth refresh tokens
- **ga4_daily**: Daily GA4 snapshots
- **gsc_daily**: Daily Search Console snapshots
- **ads_daily**: Daily Google Ads snapshots
- **web_checks_daily**: Daily website health checks
- **reports**: Analysis reports with drop detection
- **tickets**: Diagnostic tickets with prioritization

## Architecture

```
server/
├── auth/              # Google OAuth 2.0 manager
├── connectors/        # GA4, GSC, Ads API clients
├── website_checks/    # robots.txt, sitemap, page validation
├── analysis/          # Drop detection & root-cause engine
├── utils/             # Logger, retry logic, rate limiting
├── routes.ts          # API endpoints
├── scheduler.ts       # Daily cron job
└── storage.ts         # Database interface (Drizzle ORM)

client/
├── src/
│   ├── components/
│   │   ├── dashboard/   # Stats, tickets, connectors
│   │   └── layout/      # Dashboard shell
│   └── pages/           # Dashboard page
```

## Example Outputs

See `/examples` directory for:
- `daily_report.md` - Sample markdown report
- `tickets.json` - Sample ticket export

## Troubleshooting

**Service won't start:**
- Ensure `DATABASE_URL` is set (auto-configured in Replit)
- Check Google OAuth credentials are valid

**No data in dashboard:**
- Run authentication flow first
- Trigger manual run via `POST /api/run`
- Check logs for API errors

**Authentication errors:**
- Verify OAuth redirect URI matches exactly
- Ensure APIs are enabled in Google Cloud Console
- Check scopes are granted during OAuth flow

## Production Deployment

When deploying to production:

1. Update `GOOGLE_REDIRECT_URI` to production URL
2. Add production URI to Google Cloud Console redirect list
3. Set all environment variables in production environment
4. Run `npm run db:push` to sync database schema
5. Ensure port 5000 is accessible

## Website Registry + Job Publishing

Hermes can manage target websites (sites that Hermes is allowed to modify and optimize). This system allows Hermes to orchestrate workers that perform tasks like health checks, SEO audits, and content analysis.

### Adding a Website

**Via UI:**
1. Navigate to `/app/websites`
2. Click "Add Website"
3. Enter the website name (e.g., "Empathy Health Clinic")
4. Enter the domain (e.g., "empathyhealthclinic.com")
5. Click "Add Website"

**Via API:**
```bash
curl -X POST http://localhost:5000/api/websites \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Empathy Health Clinic",
    "domain": "empathyhealthclinic.com"
  }'
```

### Running Your First Job

**Via UI:**
1. Go to `/app/websites`
2. Find your website in the list
3. Click "Run Health Check" button

**Via API:**
```bash
# Get the website ID first
curl http://localhost:5000/api/websites

# Run a health check job
curl -X POST http://localhost:5000/api/websites/{website_id}/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "job_type": "health_check"
  }'
```

### Job Types

| Job Type | Description |
|----------|-------------|
| `health_check` | Basic site health and availability check |
| `crawl_technical_seo` | Full technical SEO audit |
| `content_audit` | Analyze content quality and opportunities |
| `performance_check` | Core Web Vitals and speed metrics |

### Job Payload Format

Jobs are published to the `job_queue` table with this standardized payload:

```json
{
  "job_type": "health_check",
  "website_id": "uuid",
  "domain": "empathyhealthclinic.com",
  "requested_by": "hermes",
  "requested_at": "2026-01-27T10:00:00.000Z",
  "trace_id": "uuid"
}
```

### Website Settings

Each website can be configured with:
- **Competitors**: List of competitor domains for comparison
- **Target Services Enabled**: Which job types are allowed to run
- **Notes**: Free-form notes about the website

### Secrets Rule (Important!)

**Do NOT store raw secrets in the database.** Website integrations only store secret key NAME references that map to environment variables or Bitwarden at runtime.

Example config in `website_integrations`:
```json
{
  "github_token_key": "EMPATHY_GITHUB_TOKEN",
  "cms_api_key": "EMPATHY_CMS_KEY"
}
```

The actual secrets must be stored in environment variables or a secrets manager.

### API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/websites` | GET | List all managed websites |
| `/api/websites` | POST | Create a new website |
| `/api/websites/:id` | GET | Get website details + settings |
| `/api/websites/:id` | PATCH | Update website/settings |
| `/api/websites/:id/jobs` | POST | Publish a job to the queue |
| `/api/websites/:id/jobs` | GET | Get job history |

## License

MIT
