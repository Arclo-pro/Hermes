# Step 4: Run Orchestration

## Overview

Step 4 implements multi-service workflow orchestration for ARQLO. This is the "one button = full run" layer that coordinates multiple workers, tracks their execution, handles failures gracefully, and produces a final synthesis.

**What it does:**
- Creates a `run_id` umbrella for a complete diagnostic workflow
- Enqueues multiple worker jobs in parallel (fan-out)
- Respects service dependencies (e.g., competitive intelligence waits for SERP data)
- Tolerates partial failures (missing services reduce confidence but don't block)
- Synthesizes all results into one final diagnosis
- Writes run lifecycle events to KBase for observability

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Hermes Orchestrator                       │
│                                                              │
│  1. startRun()        → Create run_id, write start event    │
│  2. enqueueRunJobs()  → Fan out to all workers in waves     │
│  3. waitForRun()      → Monitor completion with timeout     │
│  4. finalizeRun()     → Read results, synthesize, write     │
└─────────────────────────────────────────────────────────────┘
                              ↓
              ┌───────────────┴───────────────┐
              │                               │
         Wave 1 (parallel)              Wave 2 (depends on Wave 1)
              │                               │
    ┌─────────┴─────────┐          ┌─────────┴─────────┐
    │                   │          │                   │
┌───▼───┐  ┌────▼────┐  │    ┌────▼────┐              │
│ SERP  │  │Technical│  │    │Competitive│            │
│Intel  │  │  SEO    │  │    │  Intel    │            │
└───┬───┘  └────┬────┘  │    └────┬────┘              │
    │           │        │         │                   │
┌───▼───┐  ┌───▼────┐   │         │                   │
│Vitals │  │Domain  │   │         │                   │
│Monitor│  │Authority   │         │                   │
└───┬───┘  └────┬────┘  │         │                   │
    │           │        │         │                   │
    └───────────┴────────┴─────────┘
                 │
                 ↓
          All write to KBase
                 ↓
          ┌──────────────┐
          │   Synthesis  │
          │   (Hermes)   │
          └──────────────┘
                 ↓
         Final Diagnosis Event
```

## Files Created

### 1. [runPlan.ts](server/runPlan.ts)
Defines which services run in each plan type and their dependencies.

**Key Exports:**
- `STANDARD_RUN_PLAN` - Complete diagnostic (5 services, 5 min timeout)
- `QUICK_RUN_PLAN` - Fast diagnostic (3 services, 2 min timeout)
- `getRunPlan(planId)` - Retrieve plan by ID
- `getReadyServices(plan, completed)` - Get services ready to run
- `validateRunPlan(plan)` - Check for circular dependencies

**Run Plans:**

| Plan ID | Name | Services | Max Duration |
|---------|------|----------|--------------|
| `standard-v1` | Standard Diagnostic Run | SERP Intel, Technical SEO, Domain Authority, Competitive Intel, Vitals Monitor | 5 minutes |
| `quick-v1` | Quick Diagnostic Run | SERP Intel, Technical SEO, Vitals Monitor | 2 minutes |

### 2. [runOrchestrator.ts](server/runOrchestrator.ts)
Core orchestration logic that executes runs.

**Key Functions:**

- **`startRun(website_id, domain, plan_id)`**
  - Creates run_id
  - Writes `run_status=start` to KBase
  - Initializes service tracking
  - Returns `RunContext`

- **`enqueueRunJobs(context)`**
  - Fans out to all workers in dependency-aware waves
  - Wave 1: Services with no dependencies (parallel)
  - Wave 2+: Services whose dependencies completed
  - Handles failures gracefully (marks as failed, continues)
  - Respects timeouts

- **`waitForRun(context)`**
  - Monitors execution (currently synchronous)
  - Enforces timeout
  - Marks timed-out services

- **`finalizeRun(context)`**
  - Calculates final statistics
  - Calls `synthesizeAndWriteDiagnosis()` (Step 3)
  - Writes `run_status=completed/failed/timeout` to KBase
  - Returns `RunSummary`

- **`executeRun(website_id, domain, plan_id)`**
  - **Main entry point** - orchestrates full lifecycle
  - Calls start → enqueue → wait → finalize
  - Returns final summary

**Types:**
- `RunContext` - In-progress run state
- `RunSummary` - Final run results
- `ServiceResult` - Individual service execution result
- `RunStatus` - `started | running | completed | failed | timeout`
- `ServiceStatus` - `pending | running | completed | failed | timeout | skipped`

### 3. [routes/orchestration.ts](server/routes/orchestration.ts)
REST API endpoints for triggering and monitoring runs.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/orchestration/run` | Trigger a new orchestrated run |
| GET | `/api/orchestration/plans` | List all available run plans |
| GET | `/api/orchestration/plans/:planId` | Get specific plan details |
| GET | `/api/orchestration/health` | Health check |

## Usage

### Trigger a Run via API

```bash
curl -X POST http://localhost:5000/api/orchestration/run \
  -H "Content-Type: application/json" \
  -d '{
    "website_id": "site_123",
    "domain": "example.com",
    "plan_id": "standard-v1"
  }'
```

**Response:**
```json
{
  "success": true,
  "run_id": "abc123xyz",
  "status": "completed",
  "summary": {
    "runId": "abc123xyz",
    "websiteId": "site_123",
    "domain": "example.com",
    "planId": "standard-v1",
    "status": "completed",
    "startedAt": "2025-01-27T10:00:00.000Z",
    "completedAt": "2025-01-27T10:02:30.000Z",
    "durationMs": 150000,
    "servicesCompleted": 4,
    "servicesFailed": 1,
    "servicesTimeout": 0,
    "servicesSkipped": 0,
    "servicesTotal": 5,
    "diagnosisEventId": "evt_789",
    "error": null
  }
}
```

### Trigger a Run Programmatically

```typescript
import { executeRun } from './server/runOrchestrator';

const summary = await executeRun(
  'site_123',      // website_id
  'example.com',   // domain
  'standard-v1'    // plan_id (optional, defaults to standard-v1)
);

console.log(`Run ${summary.runId} completed with status: ${summary.status}`);
console.log(`${summary.servicesCompleted}/${summary.servicesTotal} services succeeded`);

if (summary.diagnosisEventId) {
  console.log(`Diagnosis written: ${summary.diagnosisEventId}`);
}
```

### List Available Plans

```bash
curl http://localhost:5000/api/orchestration/plans
```

**Response:**
```json
{
  "success": true,
  "plans": [
    {
      "plan_id": "standard-v1",
      "name": "Standard Diagnostic Run",
      "description": "Complete SEO diagnostic across all services",
      "max_duration_ms": 300000,
      "services": [...]
    },
    {
      "plan_id": "quick-v1",
      "name": "Quick Diagnostic Run",
      "description": "Fast diagnostic with critical services only",
      "max_duration_ms": 120000,
      "services": [...]
    }
  ]
}
```

## Run Lifecycle Events in KBase

The orchestrator writes two types of events to KBase:

### 1. Run Start Event
```json
{
  "website_id": "site_123",
  "run_id": "abc123xyz",
  "service": "hermes",
  "type": "run_status",
  "payload": {
    "status": "started",
    "plan_id": "standard-v1",
    "plan_name": "Standard Diagnostic Run",
    "domain": "example.com",
    "started_at": "2025-01-27T10:00:00.000Z",
    "timeout_at": "2025-01-27T10:05:00.000Z",
    "services_planned": [
      "serp-intelligence",
      "technical-seo",
      "domain-authority",
      "competitive-intelligence",
      "vitals-monitor"
    ]
  }
}
```

### 2. Run Completion Event
```json
{
  "website_id": "site_123",
  "run_id": "abc123xyz",
  "service": "hermes",
  "type": "run_status",
  "payload": {
    "status": "completed",
    "plan_id": "standard-v1",
    "domain": "example.com",
    "started_at": "2025-01-27T10:00:00.000Z",
    "completed_at": "2025-01-27T10:02:30.000Z",
    "duration_ms": 150000,
    "services_completed": 4,
    "services_failed": 1,
    "services_timeout": 0,
    "services_skipped": 0,
    "services_total": 5,
    "diagnosis_event_id": "evt_789",
    "synthesis_error": null,
    "service_results": [
      {
        "service": "serp-intelligence",
        "status": "completed",
        "duration_ms": 45000,
        "error": null
      },
      {
        "service": "technical-seo",
        "status": "completed",
        "duration_ms": 72000,
        "error": null
      },
      {
        "service": "domain-authority",
        "status": "failed",
        "duration_ms": 5000,
        "error": "Worker config invalid: No API key found"
      },
      {
        "service": "competitive-intelligence",
        "status": "completed",
        "duration_ms": 38000,
        "error": null
      },
      {
        "service": "vitals-monitor",
        "status": "completed",
        "duration_ms": 51000,
        "error": null
      }
    ]
  }
}
```

## Failure Handling

### Partial Failures
If one or more services fail, the run continues:
- Failed services are marked with status `failed` and error message
- Other services continue executing
- Final diagnosis notes missing services in `missing_services` field
- Confidence score is reduced based on missing data

### Timeout Handling
If the run exceeds `maxRunDurationMs`:
- Run status becomes `timeout`
- Any still-running services are marked as `timeout`
- Synthesis still runs with available data
- Diagnosis notes which services timed out

### Complete Failure
Run only fails completely if:
- No services complete successfully, OR
- KBase/database connection fails

## Service Dependencies

Dependencies are defined in the run plan:

```typescript
{
  service: 'competitive-intelligence',
  dependsOn: ['serp-intelligence'],  // ← Must wait for SERP to complete
  // ...
}
```

**Execution Flow:**
1. **Wave 1**: Services with no dependencies run in parallel
   - `serp-intelligence`
   - `technical-seo`
   - `domain-authority`
   - `vitals-monitor`

2. **Wave 2**: Services whose dependencies completed
   - `competitive-intelligence` (waits for `serp-intelligence`)

If a dependency fails:
- Dependent services are marked as `skipped`
- Error message: "Dependencies failed or timed out"

## Adding a New Service to a Run Plan

1. **Add worker mapping** in `serviceSecretMap.ts`:
   ```typescript
   {
     serviceSlug: 'new-service',
     workerKey: 'new_worker',
     displayName: 'New Service',
     // ...
   }
   ```

2. **Add service to run plan** in `runPlan.ts`:
   ```typescript
   {
     service: 'new-service',
     displayName: 'New Service',
     workerKey: 'new_worker',
     dependsOn: [],  // or ['serp-intelligence'] if dependent
     required: true,
     timeoutMs: 60 * 1000,
   }
   ```

3. **Configure worker** in Bitwarden or environment variables

4. **Deploy** - orchestrator will automatically include it

## Creating a New Run Plan

```typescript
export const CUSTOM_RUN_PLAN: RunPlan = {
  planId: 'custom-v1',
  name: 'Custom Run',
  description: 'Custom service combination',
  maxRunDurationMs: 3 * 60 * 1000,  // 3 minutes
  services: [
    // Add only the services you want
  ],
};

export function getRunPlan(planId: string): RunPlan | null {
  switch (planId) {
    case 'standard-v1':
      return STANDARD_RUN_PLAN;
    case 'quick-v1':
      return QUICK_RUN_PLAN;
    case 'custom-v1':  // ← Add your plan here
      return CUSTOM_RUN_PLAN;
    default:
      return null;
  }
}
```

## Monitoring

### Console Logs
The orchestrator provides detailed console logging:

```
=== Starting Orchestrated Run for example.com ===

[Run abc123xyz] Started for example.com using plan standard-v1
[Run abc123xyz] Wave 1: Submitting 4 services: serp-intelligence, technical-seo, domain-authority, vitals-monitor
[Run abc123xyz] Starting service: serp-intelligence
[Run abc123xyz] Starting service: technical-seo
[Run abc123xyz] Starting service: domain-authority
[Run abc123xyz] Starting service: vitals-monitor
[Run abc123xyz] ✓ serp-intelligence completed in 45000ms
[Run abc123xyz] ✓ vitals-monitor completed in 51000ms
[Run abc123xyz] ✗ domain-authority failed: Worker config invalid
[Run abc123xyz] ✓ technical-seo completed in 72000ms
[Run abc123xyz] Wave 2: Submitting 1 services: competitive-intelligence
[Run abc123xyz] Starting service: competitive-intelligence
[Run abc123xyz] ✓ competitive-intelligence completed in 38000ms
[Run abc123xyz] Finalizing: 4 completed, 1 failed, 0 timeout, 0 skipped
[Run abc123xyz] ✓ Diagnosis written: event_id=evt_789
[Run abc123xyz] ✓ Run finalized with status: completed

=== Run Complete: completed ===
Duration: 150000ms
Services: 4/5 completed, 1 failed, 0 timeout
Diagnosis: evt_789
```

### KBase Queries
Query all runs for a website:
```sql
SELECT * FROM kbase_events
WHERE website_id = 'site_123'
  AND service = 'hermes'
  AND type = 'run_status'
ORDER BY created_at DESC;
```

Query specific run:
```sql
SELECT * FROM kbase_events
WHERE run_id = 'abc123xyz'
ORDER BY created_at ASC;
```

## Integration with Step 3

After all workers complete, the orchestrator calls:

```typescript
const diagnosis = await synthesizeAndWriteDiagnosis(website_id, run_id);
```

This triggers the Step 3 pipeline:
1. Read all worker events for the run
2. Extract normalized signals
3. Apply reasoning rules
4. Generate diagnosis
5. Write summary event to KBase

The `diagnosis_event_id` in the run completion event links back to this summary.

## Next Steps

### Step 5: Notifications (Optional)
After finalization, enqueue a notification job:

```typescript
await kbase.writeEvent({
  website_id,
  run_id,
  service: 'notifications',
  type: 'email_request',
  payload: {
    diagnosis_event_id,
    recipient: 'user@example.com',
  },
});
```

A notification worker (Popular) can pick this up and send the email.

### Step 6: Scheduled Runs
Add to `scheduler.ts`:

```typescript
cron.schedule('0 7 * * *', async () => {
  const sites = await db.select().from(sites);
  for (const site of sites) {
    await executeRun(site.id, site.baseUrl, 'standard-v1');
  }
});
```

## Testing

### Manual Test
```bash
# Start Hermes
npm run dev

# In another terminal, trigger a run
curl -X POST http://localhost:5000/api/orchestration/run \
  -H "Content-Type: application/json" \
  -d '{
    "website_id": "test_site",
    "domain": "example.com",
    "plan_id": "quick-v1"
  }'

# Watch console logs for execution flow
```

### Expected Behavior
1. Run starts, writes start event to KBase
2. Workers are called in waves (based on dependencies)
3. Each worker writes its results to KBase
4. After all complete/timeout, synthesis runs
5. Final run_status event is written
6. API returns summary

### Success Criteria
- ✅ Multiple workers execute (2+)
- ✅ Workers write results to KBase under same run_id
- ✅ Synthesis produces final diagnosis
- ✅ API returns complete summary
- ✅ Partial failures are tolerated
- ✅ Run completes within timeout

## Troubleshooting

### Issue: Workers Not Executing
**Check:**
1. Worker configurations in Bitwarden/env vars
2. Worker health endpoints
3. Network connectivity
4. Console logs for specific errors

### Issue: Synthesis Fails
**Check:**
1. KBase connection (Step 3)
2. Worker events were written correctly
3. Synthesis logic handles missing services
4. Console logs for synthesis errors

### Issue: Timeout Too Short
**Solution:**
Increase `maxRunDurationMs` in run plan:
```typescript
maxRunDurationMs: 10 * 60 * 1000,  // 10 minutes
```

### Issue: Dependency Blocked
**Check:**
1. Prerequisite service completed successfully
2. No circular dependencies (validation should catch this)
3. Service name matches exactly in `dependsOn` array

## Summary

Step 4 orchestration provides:
- ✅ One-button full diagnostic runs
- ✅ Multi-service coordination with dependencies
- ✅ Graceful partial failure handling
- ✅ Complete observability in KBase
- ✅ Flexible run plans (standard, quick, custom)
- ✅ Automatic synthesis after completion

**ARQLO now operates like a real system**: trigger one API call, get a complete multi-service diagnostic with final summary.
