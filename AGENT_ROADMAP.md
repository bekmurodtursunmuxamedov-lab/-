# Agent roadmap

## Phase 1 — dashboard
- [x] Next.js manager UI
- [x] protected-project policy
- [x] AI chat API with Offline fallback
- [x] health endpoint

## Phase 2 — real inspection
- [x] identify PRINTSHOP GitHub repository
- [x] identify PRINTSHOP Supabase project
- [x] define production URL
- [x] server-side GitHub read-only inspection adapter
- [x] server-side Vercel deployment adapter
- [x] server-side Supabase read-only adapter
- [x] production HTTP health check
- [x] secured scheduled monitoring trigger

## Phase 3 — safe engineering actions
- [x] generate change plan
- [x] create protected feature branch
- [x] edit files with protected-path checks
- [x] create verified Draft PR
- [x] inspect preview/deployment status where available
- [x] bounded repair loop with verification gate
- [x] monitoring → incident → task queue → runner

## Phase 4 — controlled deployment
- [x] preview deployment verification endpoint
- [x] post-deploy HTTP verification
- [x] explicit production confirmation gate
- [x] rollback preview guard
- [x] real production deployment adapter

## Phase 5 — multi-agent control plane
- [x] shared agent registry model
- [x] runtime agent registry
- [x] agent pause/resume controls
- [x] per-agent task queue
- [x] safe task runner
- [x] scheduler dispatch
- [x] dedicated persistence configuration contract
- [x] dedicated persistence REST adapter
- [x] runtime lifecycle writes use dedicated persistence when configured
- [x] durable agent/task persistence (dedicated store active; production connectivity and durable task/event reads verified)
- [x] cross-agent event bus
- [x] durable activity/audit storage (agent events persisted and read through dedicated store)

## Known integration blockers
- Vercel deployment API integration is not configured in Agent Hub; `VERCEL_TOKEN` is still required.
- Supabase read-only integration is not configured in Agent Hub; production `SUPABASE_URL` + read-only key are still required.
- AI Gateway may require billing verification; Offline mode remains available.
- Runtime registry/queue and event bus remain fallback-safe; when the dedicated Agent Hub store is configured, task snapshots and lifecycle events use the server-side persistence gateway.
- Vercel Hobby scheduled monitoring is configured for once-daily execution; higher-frequency monitoring requires a plan/service that supports the needed cadence.

No production database mutation is part of the automatic workflow.
The PRINTSHOP constructor remains protected and requires explicit user request.

## Verified 2026-09-27
- Dedicated Agent Hub Supabase store is active and healthy.
- Production persistence status reports the dedicated Supabase Data API as reachable.
- Production task/event list endpoints return `persisted: true`.
- GitHub read-only inspection is configured and successfully reads PRINTSHOP.
- AI Gateway is configured but its live request is currently blocked by Vercel billing verification; Offline mode remains available.
