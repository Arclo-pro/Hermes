# Dashboard Engineering Tickets

## Overview
Engineering tickets for the Arclo dashboard, organized by section. Each ticket specifies the component, data source, and current implementation status.

---

## Section 0: Setup Cards (Top Priority)

### DASH-001: Setup Cards Section
**Component:** `SetupCardsSection.tsx`
**Data Source:** `api/ops-dashboard.ts` → metrics + system-state sections
**Status:** Implemented

| Card | Condition | Data Source | Status |
|------|-----------|-------------|--------|
| Connect Google Analytics | `!ga4Connected` | metrics.ga4Connected | Shows when GA4 not connected |
| Connect Search Console | `!gscConnected` | metrics.gscConnected | Shows when GSC not connected |
| Full Technical Crawl | `!fullCrawlComplete` | system-state | Shows for free plan |
| Optimize for AI Search | `!aiOptimized` | system-state | Shows for free plan |

**Acceptance Criteria:**
- [x] Cards appear at top of dashboard
- [x] Cards hide when integration is complete
- [ ] "Connect GA4" opens OAuth flow
- [ ] "Connect GSC" opens OAuth flow

---

## Section 1: Metric Cards

### DASH-002: Conversion Rate Card
**Component:** `MetricCardsSection.tsx` → `ConfigAwareMetricCard`
**Data Source:** GA4 API → `ga4Daily` table → `api/ops-dashboard.ts` metrics section
**Status:** Shows placeholder (GA4 not connected)

| Field | Source | Calculation |
|-------|--------|-------------|
| value | GA4 | conversions / sessions * 100 |
| change7d | GA4 | (current_week - prev_week) / prev_week * 100 |

**Acceptance Criteria:**
- [x] Shows "—" with reason when GA4 not connected
- [ ] Shows real value when GA4 connected
- [ ] Shows 7d change with arrow indicator

---

### DASH-003: Bounce Rate Card
**Component:** `MetricCardsSection.tsx`
**Data Source:** GA4 API → `ga4Daily` table
**Status:** Shows placeholder

| Field | Source |
|-------|--------|
| value | GA4 bounceRate |
| change7d | 7-day delta |

---

### DASH-004: Avg Session Duration Card
**Component:** `MetricCardsSection.tsx`
**Data Source:** GA4 API → `ga4Daily` table
**Status:** Shows placeholder

| Field | Source | Format |
|-------|--------|--------|
| value | GA4 avgSessionDuration | `Xm Ys` |
| change7d | 7-day delta | percentage |

---

### DASH-005: Pages / Session Card
**Component:** `MetricCardsSection.tsx`
**Data Source:** GA4 API → `ga4Daily` table
**Status:** Shows placeholder

---

### DASH-006: Organic CTR Card
**Component:** `MetricCardsSection.tsx`
**Data Source:** GSC API → `gscDaily` table
**Status:** Shows placeholder (GSC not connected)

| Field | Source |
|-------|--------|
| value | GSC ctr * 100 |
| change7d | 7-day delta |

---

### DASH-007: Page Load Time Card
**Component:** `MetricCardsSection.tsx`
**Data Source:** Speedster agent → `scan_requests.full_report.performance`
**Status:** **Implemented**

| Field | Source |
|-------|--------|
| value | `full_report.performance.lab.lcp_ms / 1000` |
| change7d | null (no historical tracking yet) |

**Acceptance Criteria:**
- [x] Shows LCP from scan
- [ ] Track historical values for 7d change

---

## Section 2: Insights

### DASH-008: Insights Section
**Component:** `InsightsSection.tsx`
**Data Source:** `api/ops-dashboard.ts` → insights section → `buildInsights()`
**Status:** **Implemented**

| Insight Type | Trigger Condition | Data Source |
|--------------|-------------------|-------------|
| Performance low | perfScore < 50 | scan scoreSummary |
| Performance good | perfScore >= 80 | scan scoreSummary |
| Technical issues | findings.length > 5 | scan preview_findings |
| Technical clean | no critical findings | scan preview_findings |
| Not ranking | all positions null | scan serp_results |
| Top 10 keywords | positions <= 10 | scan serp_results |
| Quick wins | positions 11-20 | scan serp_results |
| Competitive gaps | competitive.findings_count > 0 | scan full_report.competitive |
| Connect GA4 | always | static |

**Acceptance Criteria:**
- [x] Tips generated from scan data
- [x] Positive/neutral/action sentiment badges
- [ ] Action buttons route to correct pages

---

## Section 3: SERP Snapshot

### DASH-009: SERP Snapshot Section
**Component:** `SerpSnapshotSection.tsx`
**Data Source:** `api/ops-dashboard.ts` → serp-snapshot → Lookout agent results
**Status:** **Implemented**

| Metric | Source | Calculation |
|--------|--------|-------------|
| totalTracked | scan serp_results.length | Count of keywords checked |
| position1 | serp_results | Count where position === 1 |
| top3 | serp_results | Count where position <= 3 |
| top10 | serp_results | Count where position <= 10 |
| top100 | serp_results | Count where position <= 100 |
| hasBaseline | always true on first scan | No historical data yet |

**Acceptance Criteria:**
- [x] Shows ranking distribution from scan
- [ ] Week-over-week comparison (requires storing historical rankings)

---

## Section 4: SERP Keywords Table/Chart

### DASH-010: SERP Keywords Section
**Component:** `SerpKeywordsSection.tsx`
**Data Source:** `api/ops-dashboard.ts` → serp-keywords → Lookout agent results
**Status:** **Implemented**

| Column | Source | Notes |
|--------|--------|-------|
| keyword | serp_results[].keyword | Up to 25 keywords |
| intent | serp_results[].intent | informational/transactional/etc |
| currentPosition | serp_results[].position | null if not ranking |
| change7d | null | No historical data yet |
| direction | "new" or "stable" | Based on first scan |
| history | single point | Just current position |

**Acceptance Criteria:**
- [x] Shows keyword list with positions
- [x] Shows intent badges
- [ ] Recharts sparkline for history (needs historical data)
- [ ] Position change indicators (needs historical data)

---

## Section 5: Content Status

### DASH-011: Content Status Section
**Component:** `ContentStatusSection.tsx`
**Data Source:** `api/ops-dashboard.ts` → content-status → `contentDrafts` table
**Status:** Shows empty state (no content system active)

| Category | Source |
|----------|--------|
| upcoming | contentDrafts where state in (drafted, qa_passed, approved) |
| recentlyPublished | contentDrafts where state = published, last 7 days |
| contentUpdates | contentDrafts non-blog, last 30 days |

**Acceptance Criteria:**
- [x] Shows empty state when no content
- [ ] Shows content pipeline when active

---

## Section 6: Changes Log

### DASH-012: Changes Log Section
**Component:** `ChangesLogSection.tsx`
**Data Source:** `api/ops-dashboard.ts` → changes-log → scan completion + audit log
**Status:** **Implemented** (shows scan completion)

| Entry Type | Source |
|------------|--------|
| Scan completed | scan_requests.completed_at |
| Automated actions | actionExecutionAudit table |
| Change proposals | changeProposals table |

**Acceptance Criteria:**
- [x] Shows scan completion as first entry
- [ ] Shows automated actions when trust level > 0
- [ ] Shows change proposals when created

---

## Section 7: System State

### DASH-013: System State Section
**Component:** `SystemStateSection.tsx`
**Data Source:** `api/ops-dashboard.ts` → system-state
**Status:** **Implemented** (shows free plan defaults)

| Item | Source | Notes |
|------|--------|-------|
| plan | users.plan | "free" / "pro" / "enterprise" |
| capabilities.enabled | websiteTrustLevels | Categories with trustLevel > 0 |
| capabilities.locked | websiteTrustLevels | Categories with trustLevel = 0 |
| pendingApprovals | changeProposals where blocking = true | Requires user action |
| policies | websitePolicies | Auto-fix permissions |

**Acceptance Criteria:**
- [x] Shows free plan with default capabilities
- [ ] Updates when user upgrades plan
- [ ] Shows pending approvals count

---

## Data Pipeline Tickets

### DASH-100: GA4 OAuth Integration
**Priority:** High
**Dependencies:** None

**Scope:**
1. Add GA4 OAuth flow to `/api/auth/ga4`
2. Store tokens in `integrations` table
3. Create worker to fetch daily GA4 data
4. Populate `ga4Daily` table

**Files to create/modify:**
- `api/auth/ga4.ts` - OAuth callback
- `api/_lib/ga4Client.ts` - GA4 API wrapper
- Worker: Daily GA4 data fetch

---

### DASH-101: GSC OAuth Integration
**Priority:** High
**Dependencies:** None

**Scope:**
1. Add GSC OAuth flow to `/api/auth/gsc`
2. Store tokens in `integrations` table
3. Create worker to fetch daily GSC data
4. Populate `gscDaily` table

---

### DASH-102: Historical SERP Tracking
**Priority:** Medium
**Dependencies:** DASH-009, DASH-010

**Scope:**
1. Create `serp_history` table
2. Store each scan's SERP results with date
3. Update ops-dashboard to calculate week-over-week changes
4. Add sparkline data to keywords

**Schema:**
```sql
CREATE TABLE serp_history (
  id SERIAL PRIMARY KEY,
  site_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  position INTEGER,
  url TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_serp_history_site_keyword ON serp_history(site_id, keyword, date);
```

---

### DASH-103: Weekly Automated Scans
**Priority:** Medium
**Dependencies:** DASH-102

**Scope:**
1. Cron job to trigger scans for all active sites
2. Store results in serp_history
3. Update site health scores

---

## Frontend Polish Tickets

### DASH-200: Loading States
**Status:** Implemented
- [x] Skeleton loaders for all sections
- [x] Spinner animations

### DASH-201: Error States
**Status:** Implemented
- [x] Error messages for failed fetches
- [x] Retry capability via React Query

### DASH-202: Empty States
**Status:** Implemented
- [x] "No data" messages for each section
- [x] Guidance text for next steps

### DASH-203: Responsive Layout
**Status:** Implemented
- [x] 6-column metric cards on xl
- [x] 2-column content/changes on lg
- [x] Stack on mobile

---

## Summary

| Section | Component | Data Ready | UI Ready | Notes |
|---------|-----------|------------|----------|-------|
| Setup Cards | SetupCardsSection | Yes | Yes | OAuth flows pending |
| Metrics | MetricCardsSection | Partial | Yes | GA4/GSC not connected |
| Insights | InsightsSection | Yes | Yes | From scan data |
| SERP Snapshot | SerpSnapshotSection | Yes | Yes | From Lookout agent |
| SERP Keywords | SerpKeywordsSection | Yes | Yes | From Lookout agent |
| Content Status | ContentStatusSection | No | Yes | Content system not active |
| Changes Log | ChangesLogSection | Partial | Yes | Shows scan completion |
| System State | SystemStateSection | Yes | Yes | Free plan defaults |

**Next Priority:**
1. DASH-100: GA4 OAuth → unlocks 4 metric cards
2. DASH-101: GSC OAuth → unlocks Organic CTR card
3. DASH-102: Historical SERP → unlocks week-over-week changes
