# Agent roadmap

## Phase 1 — dashboard
- [x] Next.js manager UI
- [x] protected-project policy
- [x] AI chat API
- [x] health endpoint

## Phase 2 — real inspection
- [x] identify PRINTSHOP GitHub repository
- [x] identify PRINTSHOP Supabase project
- [x] define production URL
- [ ] server-side GitHub inspection adapter
- [ ] server-side Vercel deployment adapter
- [ ] server-side Supabase read-only adapter
- [ ] production HTTP health check

## Phase 3 — safe engineering actions
- [ ] generate change plan
- [ ] create feature branch
- [ ] edit files with protected-path checks
- [ ] create PR
- [ ] inspect CI/deployment
- [ ] stop automatically on regression

## Phase 4 — controlled deployment
- [ ] preview deployment
- [ ] post-deploy verification
- [ ] explicit production confirmation
- [ ] rollback workflow

No production database mutation is part of the automatic workflow.