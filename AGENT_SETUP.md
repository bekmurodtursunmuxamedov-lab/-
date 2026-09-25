# Agent setup

Configure these as server-side environment variables in the hosting platform:

- GITHUB_TOKEN — token with only the GitHub repository permissions the agent needs.
- VERCEL_TOKEN — token for deployment inspection/actions.
- VERCEL_TEAM_ID — team identifier if applicable.
- SUPABASE_URL — existing PRINTSHOP Supabase URL.
- SUPABASE_SERVICE_ROLE_KEY — server-side only; never expose it to the browser.
- AI_API_KEY — key for an OpenAI-compatible AI provider.
- AI_BASE_URL — provider base URL.
- AI_MODEL — model name.

The agent UI must never display these values. Do not put real values in GitHub.
