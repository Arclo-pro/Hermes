# Step 10 Implementation Guide: Scale, Resilience, and Long-Term Leverage

**Status:** ✅ Implemented
**Date:** 2026-01-27
**Goal:** Make ARQLO boring to operate, cheap to run, and hard to break.

---

## Overview

This guide covers the three critical features implemented for Step 10:

1. **Distributed Job Locking** (Step 10.2) - Prevents duplicate job execution
2. **Kill Switches & Emergency Controls** (Step 10.6) - Safety switches for system control
3. **Migration Framework** (Step 10.5) - Version management with safe migrations

---

## 1. Distributed Job Locking

### What It Does

Ensures that only one worker can claim and execute a job at a time, preventing:
- Duplicate job execution
- Race conditions
- Wasted compute resources
- Data corruption from concurrent writes

### Key Features

- **Optimistic Locking**: Uses `lock_version` to prevent race conditions
- **Lock Expiry**: Automatic recovery from stuck jobs
- **Heartbeat Tracking**: Workers send heartbeats to keep locks alive
- **Automatic Retry**: Failed jobs are retried up to `max_attempts`

### Database Schema

The `job_queue` table has been enhanced with:

```sql
lock_expires_at   timestamp    -- When the lock expires
lock_version      integer      -- Optimistic lock version number
last_heartbeat_at timestamp    -- Last worker heartbeat
```

### Usage

#### Claiming a Job (Worker Side)

```typescript
import { claimNextJob, markJobRunning, sendHeartbeat, releaseJobLock } from './services/jobLockingService';

// Worker claims a job
const result = await claimNextJob({
  workerId: 'worker-123',
  lockDurationMs: 5 * 60 * 1000, // 5 minutes
});

if (result.success) {
  const job = result.job;

  // Mark as running
  await markJobRunning(job.jobId, 'worker-123');

  try {
    // Do work...
    // Send periodic heartbeats
    setInterval(async () => {
      await sendHeartbeat(job.jobId, 'worker-123', 5 * 60 * 1000);
    }, 60 * 1000); // Every minute

    // Complete successfully
    await releaseJobLock(job.jobId, 'worker-123', 'completed', { result: 'success' });
  } catch (error) {
    // Complete with failure
    await releaseJobLock(job.jobId, 'worker-123', 'failed', undefined, error.message);
  }
}
```

#### Recovering Expired Locks (Maintenance)

```bash
# Manual recovery via API
curl -X POST http://localhost:5000/api/system/jobs/recover-expired-locks

# Or run as a scheduled job (recommended)
```

Add to your scheduler:

```typescript
import cron from 'node-cron';
import { recoverExpiredLocks } from './services/jobLockingService';

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const result = await recoverExpiredLocks();
  if (result.recovered > 0) {
    logger.info('LockRecovery', `Recovered ${result.recovered} expired locks`);
  }
});
```

---

## 2. Kill Switches & Emergency Controls

### What It Does

Provides multiple layers of safety controls to stop, pause, or limit system operations:

- **Global Kill Switch**: Emergency stop for ALL processing
- **System Modes**: `normal`, `observe_only`, `safe_mode`
- **Service-Level Controls**: Disable specific services (e.g., 'rank-tracker')
- **Website-Level Controls**: Pause processing for specific websites
- **Audit Logging**: All changes are logged with reason and triggeredBy

### Database Schema

New tables:
- `system_config` - Configuration and kill switch states
- `system_audit_log` - Audit trail for all changes

### API Endpoints

#### Global Kill Switch

```bash
# Check status
curl http://localhost:5000/api/system/kill-switch

# Activate (EMERGENCY STOP)
curl -X POST http://localhost:5000/api/system/kill-switch/activate \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Production incident - stopping all jobs",
    "triggeredBy": "admin@company.com"
  }'

# Deactivate (RESUME)
curl -X POST http://localhost:5000/api/system/kill-switch/deactivate \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Incident resolved",
    "triggeredBy": "admin@company.com"
  }'
```

#### System Modes

```bash
# Get current mode
curl http://localhost:5000/api/system/mode

# Set to observe-only (no changes executed)
curl -X POST http://localhost:5000/api/system/mode \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "observe_only",
    "reason": "Testing new feature",
    "triggeredBy": "admin@company.com"
  }'

# Modes: normal | observe_only | safe_mode
```

#### Service Controls

```bash
# Check service status
curl http://localhost:5000/api/system/services/rank-tracker/status

# Disable service
curl -X POST http://localhost:5000/api/system/services/rank-tracker/disable \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "SERP API quota exceeded",
    "triggeredBy": "admin@company.com"
  }'

# Enable service
curl -X POST http://localhost:5000/api/system/services/rank-tracker/enable \
  -H "Content-Type: application/json" \
  -d '{
    "triggeredBy": "admin@company.com"
  }'
```

#### Website Controls

```bash
# Pause website
curl -X POST http://localhost:5000/api/system/websites/WEBSITE-ID/pause \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Client requested emergency pause",
    "triggeredBy": "admin@company.com"
  }'

# Resume website
curl -X POST http://localhost:5000/api/system/websites/WEBSITE-ID/resume \
  -H "Content-Type: application/json" \
  -d '{
    "triggeredBy": "admin@company.com"
  }'
```

#### Safety Check (Before Executing Work)

```bash
curl -X POST http://localhost:5000/api/system/safety-check \
  -H "Content-Type: application/json" \
  -d '{
    "serviceName": "rank-tracker",
    "websiteId": "abc-123",
    "requiresChanges": true
  }'

# Response:
{
  "allowed": true,
  "checks": {
    "globalKillSwitch": false,
    "serviceDisabled": false,
    "websitePaused": false,
    "observeOnlyMode": false,
    "safeMode": false
  }
}
```

### Usage in Code

```typescript
import { performSafetyCheck } from './services/killSwitchService';

async function executeJob(job) {
  // Check safety before executing
  const safety = await performSafetyCheck({
    serviceName: job.service,
    websiteId: job.websiteId,
    requiresChanges: true,
  });

  if (!safety.allowed) {
    logger.warn('JobExecution', `Job blocked: ${safety.reason}`);
    return { status: 'blocked', reason: safety.reason };
  }

  // Safe to proceed
  return await doWork(job);
}
```

---

## 3. Migration Framework

### What It Does

Provides safe, versioned database migrations with:
- Automatic version tracking
- Checksum verification (detects modified migrations)
- Idempotent execution (safe to run multiple times)
- Execution time tracking
- Dry-run mode

### Database Schema

New table:
- `schema_migrations` - Tracks applied migrations

### Migration File Format

Migrations live in `/migrations` and follow the naming convention:

```
001_add_feature_name.sql
002_enforce_siteid_in_analytics.sql
003_add_job_locking_and_system_config.sql
```

Format: `{version}_{descriptive_name}.sql`

### Running Migrations

```bash
# Check status
npm run migrate:status

# Output:
# 📊 Migration Status:
# Total migrations:    3
# Applied:             3 ✅
# Pending:             0 ⏳

# Run all pending migrations
npm run migrate

# Dry run (test without applying)
npm run migrate:dry-run
```

### Creating a New Migration

1. Create a new file in `/migrations`:

```bash
touch migrations/004_add_quota_tracking.sql
```

2. Write your SQL:

```sql
-- Migration: Add quota tracking for cost control
-- Step 10.1: Performance & Cost Controls
-- Date: 2026-01-27

CREATE TABLE IF NOT EXISTS quota_usage (
  id serial PRIMARY KEY,
  website_id text NOT NULL,
  quota_type text NOT NULL,
  usage_count integer DEFAULT 0,
  period_start timestamp NOT NULL,
  period_end timestamp NOT NULL
);

CREATE INDEX idx_quota_usage_website ON quota_usage(website_id);
```

3. Run the migration:

```bash
npm run migrate
```

### Migration Best Practices

1. **Always test locally first**: Use `migrate:dry-run` before production
2. **Keep migrations small**: One logical change per migration
3. **Never modify applied migrations**: Create a new migration to fix issues
4. **Include rollback comments**: Document how to undo (for manual rollback)
5. **Use transactions**: Wrap in `BEGIN; ... COMMIT;` when possible
6. **Add verification queries**: Include commented queries to verify success

---

## System Status Dashboard

Get overall system health:

```bash
curl http://localhost:5000/api/system/status

# Response:
{
  "healthy": true,
  "killSwitch": {
    "active": false,
    "enabled": false
  },
  "mode": "normal",
  "timestamp": "2026-01-27T12:00:00.000Z"
}
```

---

## Emergency Procedures

### 🚨 Emergency Stop (All Processing)

```bash
# 1. Activate global kill switch
curl -X POST http://localhost:5000/api/system/kill-switch/activate \
  -d '{"reason":"Production incident","triggeredBy":"oncall@company.com"}'

# 2. Verify no jobs are running
curl http://localhost:5000/api/system/status

# 3. Investigate issue...

# 4. Resume when ready
curl -X POST http://localhost:5000/api/system/kill-switch/deactivate \
  -d '{"triggeredBy":"oncall@company.com"}'
```

### 🔍 Observe-Only Mode (No Changes)

```bash
# Use when testing new features or debugging
curl -X POST http://localhost:5000/api/system/mode \
  -d '{"mode":"observe_only","reason":"Testing","triggeredBy":"dev@company.com"}'

# Restore to normal
curl -X POST http://localhost:5000/api/system/mode \
  -d '{"mode":"normal","triggeredBy":"dev@company.com"}'
```

### ⚠️ Disable Specific Service

```bash
# If one service is misbehaving
curl -X POST http://localhost:5000/api/system/services/rank-tracker/disable \
  -d '{"reason":"API quota exceeded","triggeredBy":"admin@company.com"}'
```

### 🏥 Recover Stuck Jobs

```bash
# Manual recovery
curl -X POST http://localhost:5000/api/system/jobs/recover-expired-locks

# Or add to cron (recommended)
```

---

## Monitoring & Alerting

### Key Metrics to Track

1. **Job Lock Expiry Rate**: How often locks expire without completion
2. **Kill Switch Activations**: Frequency and duration
3. **Mode Changes**: Track when system enters observe/safe mode
4. **Service Disable Events**: Which services fail most often
5. **Migration Failures**: Any failed migrations

### Recommended Queries

```sql
-- Check for expired locks (stuck jobs)
SELECT job_id, service, claimed_by, lock_expires_at, last_heartbeat_at
FROM job_queue
WHERE lock_expires_at < NOW() AND status IN ('claimed', 'running');

-- Check kill switch audit log
SELECT * FROM system_audit_log
WHERE action_type LIKE '%kill_switch%'
ORDER BY created_at DESC
LIMIT 10;

-- Check migration history
SELECT version, name, applied_at, execution_time_ms
FROM schema_migrations
ORDER BY version DESC;
```

---

## Testing

### Test Job Locking

```typescript
// Test race condition handling
const results = await Promise.all([
  claimNextJob({ workerId: 'worker-1' }),
  claimNextJob({ workerId: 'worker-2' }),
  claimNextJob({ workerId: 'worker-3' }),
]);

// Only one should succeed
const successful = results.filter(r => r.success);
expect(successful).toHaveLength(1);
```

### Test Kill Switch

```typescript
// Activate kill switch
await activateGlobalKillSwitch({
  reason: 'Test',
  triggeredBy: 'test@example.com',
});

// Verify blocked
const safety = await performSafetyCheck({});
expect(safety.allowed).toBe(false);
expect(safety.reason).toContain('kill switch');
```

---

## Troubleshooting

### Jobs stuck in "claimed" state

**Cause**: Worker crashed without releasing lock

**Solution**: Run lock recovery
```bash
curl -X POST http://localhost:5000/api/system/jobs/recover-expired-locks
```

### Kill switch won't deactivate

**Check**: Database connection and `system_config` table

```sql
SELECT * FROM system_config WHERE config_key = 'global_kill_switch';
```

### Migration checksum mismatch

**Cause**: Migration file was modified after being applied

**Solution**: Never modify applied migrations. Create a new migration to fix issues.

---

## Next Steps

With Step 10 complete, you now have:

✅ **Distributed job locking** - Safe for horizontal scaling
✅ **Kill switches** - Emergency controls at every level
✅ **Migration framework** - Safe schema evolution

### Recommended Next Implementations

1. **Performance & Cost Controls** (Step 10.1):
   - Website quotas (jobs/day, API calls)
   - Service budgets
   - Auto-pause on quota exceeded

2. **Queue Health & Backpressure** (Step 10.3):
   - Queue depth monitoring
   - Priority escalation
   - Slow job detection

3. **Observability** (Step 10.4):
   - Distributed tracing (OpenTelemetry)
   - Metrics export (Prometheus)
   - Real-time dashboards

---

## Summary

Step 10 ensures ARQLO can:
- **Scale horizontally** without job duplication
- **Stop immediately** when things go wrong
- **Evolve safely** with versioned migrations
- **Operate reliably** at hundreds of sites

The system is now **boring to operate, cheap to run, and hard to break**.

---

**Questions or issues?** Check the audit logs first:

```sql
SELECT * FROM system_audit_log ORDER BY created_at DESC LIMIT 20;
```
