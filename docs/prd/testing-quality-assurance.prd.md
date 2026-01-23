# PRD — Testing & Quality Assurance Strategy
(Golden Flows · Contracts · Confidence)

---

## 1. Purpose & Scope

This PRD defines **how Arclo is tested** to ensure that all critical user flows, system contracts, and safety guarantees continue to work as the system evolves.

It exists to answer:

> “How do we know the app still works the way the PRDs say it should?”

This PRD governs:
- What must be tested
- How tests are layered
- Which flows are non-negotiable
- How CI enforces quality

This PRD does **not** define:
- Coding standards (Coding Standards PRD)
- UI design (UI/UX PRD)
- System behavior itself (those live in the PRDs)

---

## 2. Core Testing Philosophy

- Test **behavior**, not implementation details
- Test **contracts**, not just happy paths
- Prefer deterministic tests over brittle UI automation
- A small number of high-value tests beat many low-value ones
- PRDs define truth; tests enforce it

---

## 3. Golden Use Cases (Non-Negotiable)

These flows must never break. They form the **regression backbone**.

1. Signup → Generate free SEO report → View report  
2. Free report consumed → Paywall appears → Navigation/settings still accessible  
3. Subscribe → Dashboard unlocks → Weekly report scheduled  
4. Configure geo scope (local vs national) → Rankings interpreted correctly  
5. Connect GA4/GSC → Analytics widgets appear → Weekly email includes analytics  
6. Agent run → Hermes produces Week 1 / 2 / 3 plan  
7. “Fix Everything” → Only Week 1 actions executed  
8. Agent failure → Degraded state shown → Run continues  
9. Export report → Snapshot generated → Content matches plan  
10. Unsubscribe → Read-only mode → Reports stop after period end  
11. Delete account → Billing canceled → Data removed

If any of these fail, the release is blocked.

---

## 4. Test Layers

### 4.1 Unit Tests (Fast, Isolated)

Used for:
- Priority scoring logic
- Phasing logic
- Conflict resolution
- Schema validation
- Config versioning
- Entitlement checks

Rules:
- No network calls
- No randomness
- Must be deterministic

---

### 4.2 Integration Tests (Most Important)

Used for:
- Hermes plan generation from mocked agent outputs
- Agent contract enforcement
- Change velocity rules
- “Fix Everything” semantics
- Execution scope validation
- Socrates log ingestion format

These tests validate **system behavior**, not UI.

---

### 4.3 End-to-End Tests (Few, High Value)

Used for:
- Free report flow
- Paywall gating
- Subscription unlock
- Analytics wizard happy path
- Export functionality

Rules:
- Keep E2E tests minimal
- Only golden flows
- Avoid testing visual details

---

## 5. Test Mode (Required)

The app must support a **test mode** via environment flag.

In test mode:
- External APIs are stubbed
- SERP, GA4, GSC calls return fixtures
- Payments are simulated
- Emails are suppressed
- Execution side effects are disabled

This ensures reliable CI.

---

## 6. Fixtures & Test Data

### 6.1 Site Fixtures

Create reusable fixtures for:
- Local business (city-based)
- National business
- Missing analytics site
- Paid vs unpaid site

---

### 6.2 Agent Output Fixtures

Create fixtures for:
- Valid agent outputs
- Invalid outputs (contract violations)
- Partial failures
- Conflicting recommendations

Fixtures must be versioned and explicit.

---

## 7. Contract Tests (Critical)

Explicitly test PRD contracts:

### 7.1 Agent Contracts
- Forbidden fields rejected
- Required fields enforced
- geo_scope always required
- Version fields present

---

### 7.2 Hermes Contracts
- Always outputs Week 1 / 2 / 3
- Resolves conflicts deterministically
- Explains decisions
- Enforces velocity limits

---

### 7.3 Deployer Contracts
- Only allowed change types executed
- Idempotent re-runs
- Rollback works
- Scope violations abort execution

---

## 8. CI Enforcement

Every PR must pass:
1. Linting
2. Unit tests
3. Integration tests
4. Contract tests
5. Limited E2E tests (golden flows)

Failures block merge.

---

## 9. Production Smoke Tests

After deploy, run:
- Generate report on test domain
- Confirm paywall
- Confirm subscription unlock
- Run agents
- Confirm Hermes plan phasing
- Confirm email scheduling triggered

This validates production wiring.

---

## 10. Failure Handling

When tests fail:
- Block release
- Fix behavior, not tests
- Update PRDs only if behavior is intentionally changed

Tests enforce PRDs, not opinions.

---

## 11. Success Criteria

- Core flows never regress
- Autonomous behavior is safe
- PRD violations are caught early
- CI provides confidence to move fast

---

## 12. Summary

Testing in Arclo is:
- Contract-driven
- Focused on trust
- Designed for autonomy

If the tests pass, the system behaves as designed.
