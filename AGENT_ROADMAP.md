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
- [ ] durable agent/task persistence (requires dedicated store credentials + schema activation)
- [x] cross-agent event bus
- [ ] durable activity/audit storage

## Known integration blockers
- Vercel deployment API integration is not configured in Agent Hub.
- Supabase read-only integration is not configured in Agent Hub.
- AI Gateway may require billing verification; Offline mode remains available.
- Runtime registry/queue and event bus remain non-durable in the fallback mode. When the dedicated Agent Hub store is configured and its schema is active, task snapshots and lifecycle events are written through the server-side persistence gateway.
- Vercel Hobby scheduled monitoring is configured for once-daily execution; higher-frequency monitoring requires a plan/service that supports the needed cadence.

No production database mutation is part of the automatic workflow.
The PRINTSHOP constructor remains protected and requires explicit user request.
