# Agent setup

Configure these as server-side environment variables in the hosting platform:

- GITHUB_TOKEN — token with only the GitHub repository permissions the agent needs.
- VERCEL_TOKEN — token for deployment inspection/actions.
- VERCEL_TEAM_ID — team identifier if applicable.
- VERCEL_PROJECT_ID — Agent Hub Vercel project identifier.
- SUPABASE_URL — existing PRINTSHOP Supabase URL.
- SUPABASE_PUBLISHABLE_KEY — preferred read-only server/client API key for PRINTSHOP inspection.
- SUPABASE_ANON_KEY — legacy read-only API key if publishable key is unavailable.
- SUPABASE_SERVICE_ROLE_KEY — server-side only; never expose it to the browser; do not use it for Agent Hub persistence.
- AI_API_KEY — key for an OpenAI-compatible AI provider.
- AI_BASE_URL — provider base URL.
- AI_MODEL — model name.

The agent UI must never display these values. Do not put real values in GitHub.


## Durable Agent Hub persistence

Agent Hub runtime registry, task queue, and event bus are intentionally non-durable by default.

When a dedicated Agent Hub database is available, configure:
- AGENT_HUB_SUPABASE_URL — URL of the dedicated Agent Hub database project.
- AGENT_HUB_SUPABASE_SERVER_KEY — server-side key for that dedicated project.

Do not point AGENT_HUB_SUPABASE_URL at the production PRINTSHOP database. The automatic workflow never creates Agent Hub persistence tables in the PRINTSHOP production project.
