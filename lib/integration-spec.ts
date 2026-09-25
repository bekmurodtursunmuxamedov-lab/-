export const PRINTSHOP_TARGET={repository:"bekmurodtursunmuxamedov-lab/print-style-uz",supabaseProject:"hedcbhmyohofmoqworgy",productionUrl:"https://print-style-uz.vercel.app",protectedAreas:["production database","auth","payments","orders"]} as const;
export type AgentMode="Inspect"|"Fix"|"Improve"|"Deploy";
export const INSPECTION_STEPS=["GitHub: branch, latest commits, PRs, workflow status","Vercel: latest deployment, status and build logs","Supabase: tables, RLS and read-only health checks","Production: HTTP availability and obvious runtime failures"] as const;
