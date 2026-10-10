const TEAM_ID = process.env.VERCEL_TEAM_ID || "team_kgP1qPEjt8tmUprTZsDdRW0c";
// Fixed to this Agent Hub project. Do not fall back to a different project.
const PROJECT_ID = "prj_rHne86ZngMz39BzCFqBvs9mIcdLh";

const api = async (path: string) => {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN is not configured");
  const response = await fetch(`https://api.vercel.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Vercel API ${response.status}`);
  return response.json();
};

export async function getVercelStatus() {
  const params = new URLSearchParams({
    projectId: PROJECT_ID,
    limit: "5",
  });
  if (TEAM_ID) params.set("teamId", TEAM_ID);

  const data = await api(`/v6/deployments?${params.toString()}`);
  const latest = data.deployments?.[0];
  return {
    connected: true,
    projectId: PROJECT_ID,
    latestDeployment: latest
      ? {
          id: latest.uid,
          state: latest.state,
          target: latest.target,
          url: latest.url,
          createdAt: latest.createdAt,
          commitSha: latest.meta?.githubCommitSha,
          commitMessage: latest.meta?.githubCommitMessage,
        }
      : null,
  };
}
