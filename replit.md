# Traffic & Spend Doctor

## Overview

Traffic & Spend Doctor is a production-ready web service that diagnoses organic traffic drops and Google Ads spend anomalies for empathyhealthclinic.com. The system collects data from multiple sources (GA4, Search Console, Google Ads), performs automated analysis using rolling averages and z-score detection, generates root cause hypotheses, and creates actionable tickets for SEO, Dev, and Ads teams.

Key capabilities:
- Daily automated diagnostics at 7am America/Chicago timezone
- On-demand analysis via API or dashboard
- Multi-source data collection from Google APIs and website health checks
- Smart drop detection with statistical analysis
- Automated ticket generation with prioritization

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom plugins for meta images and Replit integration
- **Styling**: TailwindCSS v4 with custom clinical theme (slate/sky colors)
- **UI Components**: shadcn/ui components built on Radix UI primitives
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter (lightweight React router)
- **Charts**: Recharts for data visualization

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **API Pattern**: RESTful endpoints under `/api/*`
- **Scheduler**: node-cron for daily automated runs
- **Logging**: Custom structured logger with module-based categorization

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with `db:push` command

### Data Connectors
The system has modular connectors for each data source:
- **GA4 Connector**: Google Analytics Data API for sessions, users, events, conversions
- **GSC Connector**: Search Console API for clicks, impressions, CTR, positions
- **Ads Connector**: Google Ads API for spend, campaigns, policy issues
- **Website Checker**: HTTP-based health checks for robots.txt, sitemap, page status

### Analysis Engine
- Detects drops using 7-day rolling averages
- Calculates z-scores for statistical significance
- Generates ranked root cause hypotheses with confidence levels
- Creates actionable tickets assigned to SEO/Dev/Ads teams

### Authentication
- Google OAuth 2.0 for API access
- Tokens stored in database with refresh capability
- Scopes: Analytics readonly, Webmasters readonly, AdWords

## External Dependencies

### Google APIs
- **Google Analytics Data API v1beta**: GA4 metrics and dimensions
- **Google Search Console API v1**: Search analytics and indexing data
- **Google Ads API**: Campaign performance and policy status

### Database
- **PostgreSQL**: Primary data store (provisioned via Replit)
- Connection via `DATABASE_URL` environment variable

### Required Environment Variables
```
DOMAIN=empathyhealthclinic.com
GOOGLE_CLIENT_ID=<oauth_client_id>
GOOGLE_CLIENT_SECRET=<oauth_client_secret>
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback
GA4_PROPERTY_ID=<property_id>
GSC_SITE=sc-domain:empathyhealthclinic.com
ADS_CUSTOMER_ID=123-456-7890
DATABASE_URL=postgresql://...
```

### NPM Packages (Key Dependencies)
- `googleapis`: Google API client library
- `drizzle-orm` + `pg`: Database access
- `node-cron`: Scheduled task execution
- `express`: HTTP server
- `@tanstack/react-query`: Frontend data fetching
- `recharts`: Dashboard charts