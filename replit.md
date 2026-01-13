# Hermes - SEO Orchestrator

## Overview
Hermes is a production-ready, multi-site SEO monitoring and diagnosis platform. It automates data collection from various sources (GA4, Search Console, Google Ads, SERP tracking), performs statistical analysis to detect anomalies, generates root cause hypotheses, and creates actionable tickets for SEO, Dev, and Ads teams. Its core purpose is to provide comprehensive, automated SEO diagnostics and actionable insights across multiple websites, streamlining SEO management, improving site health, and boosting organic performance through proactive identification and resolution of issues.

## User Preferences
Preferred communication style: Simple, everyday language.

### UI Component Preferences
- **BenchmarkPositionBar**: Horizontal gradient bars showing percentile ranges (p25/p50/p75/p90) with white marker dots - use for metric comparisons across the platform
- **Performance Score blocks**: Left-anchored 96px panels with gold ring styling for score displays
- **InlinePrompt**: Embedded mission prompts in header containers with border-top separators
- **CrewDashboardShell**: Standard shell for all crew dashboards with consistent header actions and mission/KPI structures
- **MissionOverviewWidget**: Consolidated mission widget with top-aligned gold score ring (aligned to header, not vertically centered)
- **Missing data states**: Explicit messages showing which API fields are unavailable, with "Run Scan" CTAs

### Liquid Glass Analytics Components (NEW)
Reusable analytics visualization package in `client/src/components/analytics/`:
- **GlassChartContainer**: Shared glass-styled container for all charts (subtle translucency, no heavy shadows)
- **GlassBarChart**: Flat rectangular bars with rounded corners, hover brightness (no 3D effects)
- **GlassLineChart**: Thin smooth lines with circular dots, primary=blue, secondary=purple
- **GlassAreaChart**: Flat filled areas with low opacity (10-20%), crisp top lines
- **GlassDonutChart**: Completely flat top-down 2D only (no bevel, no thickness, no shadows)
- **GlassSparkline**: Minimal sparklines for metric cards (thin line, optional soft fill)
- **GlassMetricCard**: KPI cards with label, value, delta indicator, optional sparkline

Color system: Uses ARCLO semantic colors only (success=green, warning=yellow, danger=red, info=blue, purple=secondary)

### Overlay Surface Design (CRITICAL)
All overlay/pullout UI must use opaque surfaces for readability:
- **CSS Variable**: `--color-overlay-surface: rgba(17, 24, 39, 0.95)` (95% opacity dark surface)
- **Affected Components**: Sheet, Dialog, AlertDialog, DropdownMenu, Select, Popover, ContextMenu, Command, HoverCard, Menubar, NavigationMenu
- **Rule**: Background content must NOT be legible through any pullout/overlay panel
- **Usage**: `bg-[var(--color-overlay-surface)] backdrop-blur-md`

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS v4 with custom clinical theme
- **UI Components**: shadcn/ui built on Radix UI
- **State Management**: TanStack React Query
- **Routing**: Wouter
- **Charts**: Recharts

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **API Pattern**: RESTful endpoints (`/api/*`)
- **Scheduler**: node-cron for daily automated runs

### Authentication System
Email/password authentication with PostgreSQL session store, using PBKDF2 for password hashing. Cookies are HttpOnly, SameSite=lax, secure in production, with a 30-day expiry.

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation
- **Migrations**: Drizzle Kit

### Data Connectors
Modular connectors integrate with various data sources: GA4, Google Search Console, Google Ads, and custom Website Checker for HTTP-based health checks.

### Analysis Engine
Detects data drops using 7-day rolling averages and z-scores, generating ranked root cause hypotheses (e.g., Tracking, Server Errors, Indexing) with multi-source diagnostic context. Creates actionable tickets for SEO/Dev/Ads teams.

### Mission Execution System (Tasks)
A unified pipeline across 12 "crews" with defined impact, effort, autoFixable flags, and cooldowns. User-facing terminology uses "tasks" (internal APIs still reference "missions").

### Unified Crew Lineage System
All crew identity, theming, integrations, and scores are derived from a single canonical source, ensuring consistent scoring and status across the platform. Scores (0-100 health rating) and Tasks (open task count) are distinct concepts, clearly separated in data and UI presentation.

### Mission Control Dashboard (Updated Jan 2026)
The primary dashboard answering three user intents:
- **Understand**: Website Report (default view) - current site health, key metrics, task counts
- **Share**: Developer Report - neutral, technical report for sharing with devs/agencies
- **Fix**: Fix Everything - managed execution action

Key features:
- **Unified Metrics Grid**: Shows all metrics (owned + locked) together, not separated
- **Enticing Locked Cards**: Sample values, "why it matters" copy, task count badges, value-first CTAs
- **Tasks Overview Section**: "What Needs Fixing" showing top 3 priority tasks + total count
- **Crew Cards**: One big metric + task count with clear "Review Tasks →" CTAs
- **Terminology**: All user-facing text uses "tasks" instead of "missions"

### Gold Standard Worker Blueprint
All microservice workers adhere to a blueprint defining required endpoints (`/health`, `/smoke-test`, `/capabilities`, `/run`), a standard JSON response shape, API key authentication, and `X-Request-Id` correlation.

### Worker Validation Harness
Automated validation infrastructure uses Zod schemas to test worker responses against health, smoke-test, and capabilities endpoints, generating detailed reports.

### Free Report v1 System
A shareable, read-only SEO diagnosis report generated from website scans, stored in a `free_reports` table. It uses a deterministic penalty-based scoring algorithm and transformers to compose 6 sections of the report.

### Change Governance System
A platform-wide governance layer that logs, validates, and batches all SEO changes. It uses a Change Log SDK, KB Validator, Cadence Checker, and Deploy Windows to manage the lifecycle of changes, from proposal to execution, with pre/post metrics capture.

## External Dependencies

### Google APIs
- **Google Analytics Data API v1beta**
- **Google Search Console API v1**
- **Google Ads API**

### Database
- **PostgreSQL**: Primary data store.

### Bitwarden Secrets Manager
Used for secure credential storage via `@bitwarden/sdk-napi`.

### Required Environment Variables
- `DOMAIN`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `GA4_PROPERTY_ID`, `GSC_SITE`, `ADS_CUSTOMER_ID`
- `DATABASE_URL`
- `BWS_ACCESS_TOKEN`, `BWS_PROJECT_ID`, `BWS_ORGANIZATION_ID`

### Stale-While-Revalidate (SWR) Caching
Implements client-side caching with persistence using `@tanstack/react-query` and `@tanstack/query-sync-storage-persister` to prevent blank states during navigation and improve perceived performance.

### Key NPM Packages
- `googleapis`
- `drizzle-orm`, `pg`
- `node-cron`
- `express`
- `@tanstack/react-query`
- `recharts`