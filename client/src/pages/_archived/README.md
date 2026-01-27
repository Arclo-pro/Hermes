# Archived Page Components

This directory contains page components that were removed from active use during codebase refactoring.

## Files

### MyCrew.tsx.2026-01-27 (830 lines)
- **Archived:** January 27, 2026
- **Reason:** Not imported in App.tsx or referenced anywhere in the codebase
- **Description:** Legacy crew member management page with ship canvas UI
- **Superseded by:** Crew.tsx and AgentDetail.tsx
- **Can be restored:** Yes - rename to remove timestamp suffix and add route in App.tsx

### Analysis.tsx.2026-01-27 (727 lines)
- **Archived:** January 27, 2026
- **Reason:** Not imported in App.tsx or referenced anywhere in the codebase
- **Description:** Analysis dashboard UI with insights
- **Overlap with:** Dashboard.tsx, MissionControl.tsx
- **Can be restored:** Yes - rename to remove timestamp suffix and add route in App.tsx

## How to Restore

If you need to restore any of these files:

1. Remove the timestamp suffix from the filename:
   ```bash
   mv MyCrew.tsx.2026-01-27 ../MyCrew.tsx
   ```

2. Add the route back in `client/src/App.tsx`:
   ```tsx
   import MyCrew from "./pages/MyCrew";
   // Add route in router configuration
   ```

3. Test thoroughly as dependencies may have changed since archival

## Refactoring Context

These files were archived during Phase 1 of the systematic codebase refactoring (see plan at `.claude/plans/wise-cooking-avalanche.md`). The goal was to remove unused code to improve maintainability and reduce codebase size.
