# Hermes Knowledge Base Integration (3.9)

This directory contains Hermes' integration with the Knowledge Base system.

## What It Does

Hermes reads worker results from `kbase_events`, synthesizes them into a single coherent diagnosis, and writes the summary back to KBase for future reference and learning.

## Files

- **[readRunEvents.ts](readRunEvents.ts)** - Fetches all worker results for a run
- **[writeRunSummary.ts](writeRunSummary.ts)** - Writes Hermes diagnosis back to KBase
- **[index.ts](index.ts)** - Main orchestration (read → synthesize → write)

## Reasoning Logic

- **[../reasoning/synthesizeRun.ts](../reasoning/synthesizeRun.ts)** - Core diagnosis logic
- **[../reasoning/types.ts](../reasoning/types.ts)** - Type definitions for signals and diagnoses

## API Endpoint

**POST /api/synthesis/run**

Trigger Hermes to analyze a completed run:

```bash
curl -X POST http://localhost:5000/api/synthesis/run \
  -H "Content-Type: application/json" \
  -d '{
    "website_id": "550e8400-e29b-41d4-a716-446655440000",
    "run_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  }'
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "diagnosis": {
      "primary_cause": "Technical SEO issue: Missing meta descriptions",
      "supporting_causes": ["rankings issues detected (2)"],
      "what_changed": [
        "Critical technical issues found",
        "Meta descriptions missing on 15 pages"
      ],
      "what_to_do_next": [
        "Fix critical technical SEO issues immediately",
        "Continue routine monitoring"
      ],
      "confidence": "high",
      "run_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "website_id": "550e8400-e29b-41d4-a716-446655440000",
      "services_analyzed": ["technical-seo", "serp-intelligence"],
      "synthesized_at": "2026-01-27T20:30:00.000Z"
    },
    "summary_event_id": "abc123..."
  }
}
```

## How It Works

### 1. Read Phase

```typescript
const { events, services_present, services_missing } = await readRunEvents(kbase, {
  website_id,
  run_id
});
```

Fetches all `kbase_events` where:
- `website_id` matches
- `run_id` matches
- Identifies which services reported vs. which are missing

### 2. Synthesis Phase

```typescript
const diagnosis = await synthesizeRun(
  website_id,
  run_id,
  events,
  services_present,
  services_missing
);
```

Applies rule-based reasoning:
1. Extract normalized signals from raw worker payloads
2. Determine primary cause (technical > vitals > rankings > authority)
3. Identify supporting causes
4. Generate "what changed" summary
5. Generate prioritized recommendations
6. Calculate confidence based on data completeness

### 3. Write Phase

```typescript
const summaryEvent = await writeRunSummary(kbase, diagnosis);
```

Writes a new `kbase_events` row:
- `service` = `"hermes"`
- `type` = `"result"` (with payload.type = "summary")
- `summary` = plain-English diagnosis
- `payload` = full diagnosis object

## Querying Results

After synthesis, you can query the database:

```sql
-- See all events for a run (worker results + Hermes summary)
SELECT service, summary, created_at
FROM kbase_events
WHERE website_id = '...' AND run_id = '...'
ORDER BY created_at ASC;

-- Get just the Hermes summary
SELECT summary, payload
FROM kbase_events
WHERE website_id = '...'
  AND run_id = '...'
  AND service = 'hermes'
LIMIT 1;
```

## Future Enhancements

This is **v1 rule-based reasoning**. Future versions will include:

- **Ralph Wiggum learning** - Pattern recognition from historical runs
- **Socrates correlation** - Cross-service cause-effect modeling
- **Confidence scoring** - ML-based confidence estimation
- **Auto-remediation** - Automatically trigger fixes for known patterns

## Health Check

```bash
curl http://localhost:5000/api/synthesis/health
```

Returns KBase connection status.
