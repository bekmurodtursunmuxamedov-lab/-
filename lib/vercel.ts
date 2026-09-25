const TEAM_ID = process.env.VERCEL_TEAM_ID;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || "prj_lk9WHB5oxslhAarXkZ3cgTw6VXPp";

const query = TEAM_ID ? `?teamId=${encodeURIComponent(TEAM_ID)}` : "";

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
  const data = await api(`/v6/deployments?projectId=${encodeURIComponent(PROJECT_ID)}&limit=5${query}`);
  const latest = data.deployments?.[0];
  return {
    connected: true,
    projectId: PROJECT_ID,
    latestDeployment: latest ? {
      id: latest.uid,
      state: latest.state,
      target: latest.target,
      url: latest.url,
      createdAt: latest.createdAt,
      commitSha: latest.meta?.githubCommitSha,
      commitMessage: latest.meta?.githubCommitMessage,
    } : null,
  };
}