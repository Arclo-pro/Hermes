# Step 6.1 — Trust Levels & Controlled Automation

This module implements the foundation for safe, graduated automation in Arclo.

## Overview

Trust levels determine **when ARQLO is allowed to act automatically** based on:
- Historical performance (success/failure rates)
- Action risk classification
- Confidence thresholds
- Recent outcomes

This prevents "blind automation" and ensures changes are earned through proven reliability.

---

## Trust Levels

| Level | Name | Behavior | Requirements |
|-------|------|----------|--------------|
| **0** | Observe Only | No changes, reports only | Default for new websites |
| **1** | Recommend | Written recommendations, no execution | Manual upgrade |
| **2** | Assisted | Execute low-risk actions with confirmation | Manual upgrade or earned |
| **3** | Autonomous | Auto-execute approved actions with monitoring | Must be earned |

---

## Action Categories

Trust is tracked separately for each category:

- `tech-seo` — Technical SEO fixes (canonicals, redirects, structured data)
- `content` — Content updates and generation
- `links` — Link building and backlink management
- `ads` — Google Ads optimization
- `indexing` — Indexing and crawling fixes
- `performance` — Core Web Vitals and performance optimization
- `compliance` — E-E-A-T and medical/legal compliance

**Why separate?** A website might be trusted for technical fixes but not content generation.

---

## Risk Classification

Every action declares:

```typescript
{
  actionCode: "FIX_CANONICAL",
  actionCategory: "tech-seo",
  riskLevel: "low",              // low | medium | high
  blastRadius: "page",            // page | section | site
  rollbackPossible: true,
  minTrustLevel: 2,               // Minimum trust to auto-execute
  requiresApproval: false         // Force manual approval
}
```

**Hermes never auto-runs high-risk actions**, regardless of trust level.

---

## Usage Examples

### 1. Initialize Trust for a New Website

```typescript
import { seedTrustLevels } from "./trust/seedTrustLevels";

// All categories start at Level 0 (Observe Only)
await seedTrustLevels({
  websiteId: "website-uuid-here",
  websiteName: "example.com"
});
```

### 2. Check if Action Can Auto-Execute

```typescript
import { canAutoExecute } from "./trust/eligibilityChecker";

const result = await canAutoExecute({
  websiteId: "website-uuid",
  actionCode: "FIX_CANONICAL",
  actionCategory: "tech-seo"
});

if (result.allowed) {
  // Execute action automatically
  await executeAction();
  await storage.recordTrustSuccess(websiteId, "tech-seo");
} else {
  // Ask for manual approval or skip
  console.log(`Blocked: ${result.reason}`);
}
```

### 3. Record Action Outcome

```typescript
import { storage } from "../storage";
import { v4 as uuidv4 } from "uuid";

// On success
await storage.recordTrustSuccess(websiteId, "tech-seo");

// On failure
await storage.recordTrustFailure(websiteId, "tech-seo");

// Log to audit trail
await storage.logActionExecution({
  id: uuidv4(),
  websiteId,
  actionCode: "FIX_CANONICAL",
  actionCategory: "tech-seo",
  trustLevel: 2,
  confidence: 85,
  executionMode: "autonomous",
  evidence: ["GSC showed canonical errors", "Detected duplicate content"],
  rule: "auto-fix-canonical-v1",
  outcome: "success",
  impactMetrics: {
    before: { canonical_errors: 15 },
    after: { canonical_errors: 0 }
  },
  executedAt: new Date(),
  executedBy: "hermes"
});
```

### 4. Manually Upgrade Trust

```typescript
import { storage } from "../storage";

// Upgrade tech-seo to Level 2 (Assisted)
await storage.setTrustLevel(websiteId, "tech-seo", 2);
```

### 5. Check if Trust Can Be Upgraded

```typescript
import { canUpgradeTrust } from "./trust/eligibilityChecker";

const eligible = await canUpgradeTrust(websiteId, "tech-seo");

if (eligible) {
  // User has earned an upgrade through successful actions
  await storage.setTrustLevel(websiteId, "tech-seo", 3);
}
```

### 6. Register a New Action Type

```typescript
import { storage } from "../storage";

await storage.registerActionRisk({
  actionCode: "UPDATE_H1_TAG",
  actionCategory: "content",
  riskLevel: "medium",
  blastRadius: "page",
  rollbackPossible: true,
  minTrustLevel: 2,
  requiresApproval: false,
  description: "Update H1 heading tags for SEO"
});
```

---

## Database Schema

### `website_trust_levels`

Tracks trust for each website + action category combination.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `website_id` | UUID | References websites.id |
| `action_category` | TEXT | Action category (tech-seo, content, etc.) |
| `trust_level` | INTEGER | 0-3 (observe, recommend, assisted, autonomous) |
| `confidence` | INTEGER | 0-100 confidence score |
| `success_count` | INTEGER | Number of successful actions |
| `failure_count` | INTEGER | Number of failed actions |
| `last_success_at` | TIMESTAMP | When last action succeeded |
| `last_failure_at` | TIMESTAMP | When last action failed |
| `last_reviewed_at` | TIMESTAMP | When trust was manually reviewed |

### `action_risk_registry`

Catalog of all action types with risk metadata.

| Column | Type | Description |
|--------|------|-------------|
| `action_code` | TEXT | Unique action identifier |
| `action_category` | TEXT | Action category |
| `risk_level` | TEXT | low \| medium \| high |
| `blast_radius` | TEXT | page \| section \| site |
| `rollback_possible` | BOOLEAN | Can this be undone automatically? |
| `min_trust_level` | INTEGER | Minimum trust to auto-execute (0-3) |
| `requires_approval` | BOOLEAN | Force manual approval? |

### `action_execution_audit`

Complete audit trail of automated actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `website_id` | UUID | References websites.id |
| `action_code` | TEXT | Which action was executed |
| `trust_level` | INTEGER | Trust level at execution time |
| `confidence` | INTEGER | Confidence score at execution time |
| `execution_mode` | TEXT | manual \| assisted \| autonomous |
| `evidence` | JSONB | Data/signals that supported the decision |
| `rule` | TEXT | Which rule permitted execution |
| `outcome` | TEXT | success \| failure \| rollback |
| `impact_metrics` | JSONB | Before/after metrics |
| `executed_by` | TEXT | hermes \| user \| system |

---

## Migration

Run the migration to create tables:

```bash
psql $DATABASE_URL -f migrations/003_add_trust_levels.sql
```

---

## Eligibility Rules

An action can auto-execute if **all** of these are true:

1. ✅ Trust level configured for website/category
2. ✅ Action exists in risk registry
3. ✅ Current trust level ≥ required trust level
4. ✅ Confidence ≥ 70% (for autonomous actions)
5. ✅ No recent failures (last action wasn't a failure)
6. ✅ Action doesn't require manual approval
7. ✅ Required services are healthy (future enhancement)

If **any** check fails → downgrade to recommend-only.

---

## Auto-Downgrade Logic

Trust automatically downgrades when:
- Success rate drops below 60% (after 5+ actions)
- Last action was a failure (temporary block)

This prevents compounding errors.

---

## Auto-Upgrade Logic

Trust can be upgraded when:
- Success rate ≥ 90%
- At least 10 successful actions recorded
- No recent failures

Users must manually confirm upgrades to Level 3 (Autonomous).

---

## What's Next

**Step 6.1 is now complete.** This provides the foundation for safe automation.

Future enhancements (Step 6.2–6.6):
- **6.2** — Execution safeguards (rate limits, scope limits, cooldowns)
- **6.3** — Monitoring & auto-rollback on regression
- **6.4** — Health checks before execution
- **6.5** — Advanced confidence scoring
- **6.6** — Trust decay over time (if unused)

---

## Files Created

```
Hermes/
├── server/
│   └── trust/
│       ├── README.md                    # This file
│       ├── eligibilityChecker.ts        # Trust eligibility logic
│       └── seedTrustLevels.ts           # Seed script for new websites
├── shared/
│   └── schema.ts                        # Database tables (appended)
├── migrations/
│   └── 003_add_trust_levels.sql         # Database migration
└── server/
    └── storage.ts                       # CRUD functions (appended)

arclo-contracts/
└── src/schemas/
    ├── trust.ts                         # Trust types and Zod schemas
    └── index.ts                         # Exports (updated)
```

---

## Definition of Done

Step 6.1 is complete when:
- ✅ Trust levels exist and are enforced
- ✅ Actions declare risk
- ✅ Eligibility checker gates execution correctly
- ✅ Trust can be seeded for a website
- ✅ Trust can be upgraded/downgraded based on performance
- ✅ Audit trail captures all automated actions

**Status: ✅ COMPLETE**
