const TEAM_ID = process.env.VERCEL_TEAM_ID;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || "prj_rHne86ZngMz39BzCFqBvs9mIcdLh";

const query = TEAM_ID ? `?teamId=${encodeURIComponent(TEAM_ID)}` : "";

const requestVercel = async (path: string, init: RequestInit = {}) => {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN is not configured");

  const response = await fetch(`https://api.vercel.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Vercel API ${response.status}`);
  return body as Record<string, any>;
};

const api = (path: string) => requestVercel(path);

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

export async function promoteVercelDeployment(deploymentId: string) {
  const safeId = deploymentId.trim();
  if (!safeId) throw new Error("deploymentId is required");

  const deployment = await api(`/v13/deployments/${encodeURIComponent(safeId)}${query}`);
  if (deployment.projectId !== PROJECT_ID) {
    throw new Error("deployment does not belong to the configured Agent Hub project");
  }

  const promoted = await requestVercel(
    `/v10/projects/${encodeURIComponent(PROJECT_ID)}/promote/${encodeURIComponent(safeId)}${query}`,
    { method: "POST", body: "{}" },
  );

  return {
    projectId: PROJECT_ID,
    deploymentId: safeId,
    deploymentUrl: deployment.url || null,
    state: promoted.state || "promoted",
    target: promoted.target || "production",
  };
}
