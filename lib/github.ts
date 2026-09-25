import { PRINTSHOP_TARGET } from "./integration-spec";

const api = async (path: string, init?: RequestInit) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured");
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text().catch(()=>"")}`);
  return response.json();
};

export async function getGitHubStatus() {
  const repo = await api(`/repos/${PRINTSHOP_TARGET.repository}`);
  const commits = await api(`/repos/${PRINTSHOP_TARGET.repository}/commits?per_page=5`);
  const prs = await api(`/repos/${PRINTSHOP_TARGET.repository}/pulls?state=open&per_page=10`);
  return {
    connected: true,
    repository: PRINTSHOP_TARGET.repository,
    defaultBranch: repo.default_branch,
    latestCommit: commits[0] ? { sha: commits[0].sha, message: commits[0].commit.message, date: commits[0].commit.author?.date } : null,
    openPullRequests: prs.map((p: any) => ({ number: p.number, title: p.title, branch: p.head?.ref, draft: p.draft })),
  };
}

export async function listProjectFiles(branch?: string) {
  const ref = branch || "main";
  const tree = await api(`/repos/${PRINTSHOP_TARGET.repository}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
  return (tree.tree || [])
    .filter((item: any) => item.type === "blob")
    .map((item: any) => item.path)
    .filter((path: string) => !path.startsWith(".git/") && !path.includes("node_modules/"));
}

export async function getProjectFile(path: string, branch?: string) {
  const ref = branch || "main";
  const result = await api(`/repos/${PRINTSHOP_TARGET.repository}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(ref)}`);
  if (!result.content) throw new Error(`GitHub file has no text content: ${path}`);
  const content = Buffer.from(result.content.replace(/\n/g, ""), "base64").toString("utf8");
  return { path, content, sha: result.sha };
}

export async function createProjectBranch(branchName: string, baseBranch: string) {
  const base = await api(`/repos/${PRINTSHOP_TARGET.repository}/git/ref/heads/${encodeURIComponent(baseBranch)}`);
  await api(`/repos/${PRINTSHOP_TARGET.repository}/git/refs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: base.object.sha }),
  });
  return { branch: branchName, baseSha: base.object.sha };
}

export async function updateProjectFile(path: string, content: string, message: string, branch: string) {
  const current = await getProjectFile(path, branch);
  const result = await api(`/repos/${PRINTSHOP_TARGET.repository}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: Buffer.from(content, "utf8").toString("base64"), branch, sha: current.sha }),
  });
  return { path, commitSha: result.commit?.sha, contentSha: result.content?.sha };
}

export async function createProjectPullRequest(title: string, body: string, branch: string, baseBranch: string) {
  return api(`/repos/${PRINTSHOP_TARGET.repository}/pulls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, head: branch, base: baseBranch, draft: true }),
  });
}
