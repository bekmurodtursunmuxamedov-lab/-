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
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text().catch(()=> "")}`);
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
  if (!path || path.startsWith("/") || path.includes("..") || path.includes("\\") || path.startsWith(".git/") || path.includes("node_modules/")) {
    throw new Error("Unsafe project file path");
  }
  const result = await api(`/repos/${PRINTSHOP_TARGET.repository}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(ref)}`);
  if (!result.content) throw new Error(`GitHub file has no text content: ${path}`);
  const content = Buffer.from(result.content.replace(/\n/g, ""), "base64").toString("utf8");
  return { path, content, sha: result.sha };
}

export async function createProjectBranch(branchName: string, baseBranch: string) {
  if (!/^agent\/[a-z0-9._-]{1,80}$/.test(branchName)) throw new Error("Unsafe agent branch name");
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

export async function inspectPrintshop() {
  const repo = await api(`/repos/${PRINTSHOP_TARGET.repository}`);
  const branch = await api(`/repos/${PRINTSHOP_TARGET.repository}/git/ref/heads/main`);
  const commit = await api(`/repos/${PRINTSHOP_TARGET.repository}/commits/${branch.object.sha}`);
  const contents = await api(`/repos/${PRINTSHOP_TARGET.repository}/contents?ref=main`);
  return {
    repository: repo.full_name,
    defaultBranch: repo.default_branch,
    branchSha: branch.object.sha,
    latestCommit: { sha: commit.sha, message: commit.commit.message },
    root: contents.map((x: any) => ({ name: x.name, type: x.type, path: x.path })),
  };
}

export function githubConfigured() {
  return Boolean(process.env.GITHUB_TOKEN);
}


export async function applyProjectChanges(branch: string, changes: Array<{path: string; content: string}>, message: string) {
  if (!changes.length || changes.length > 8) throw new Error("Agent change set must contain 1-8 files");
  for (const change of changes) {
    if (!change.path || change.path.startsWith("/") || change.path.includes("..") || change.path.includes("\\") || change.path.startsWith(".git/") || change.path.includes("node_modules/")) throw new Error("Unsafe project file path");
  }
  const ref = await api(`/repos/${PRINTSHOP_TARGET.repository}/git/ref/heads/${encodeURIComponent(branch)}`);
  const baseSha = ref.object.sha;
  const baseCommit = await api(`/repos/${PRINTSHOP_TARGET.repository}/git/commits/${baseSha}`);
  const elements = [];
  for (const change of changes) {
    const blob = await api(`/repos/${PRINTSHOP_TARGET.repository}/git/blobs`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:change.content,encoding:"utf-8"})});
    elements.push({path:change.path,mode:"100644",type:"blob",sha:blob.sha});
  }
  const tree = await api(`/repos/${PRINTSHOP_TARGET.repository}/git/trees`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({base_tree:baseCommit.tree.sha,tree:elements})});
  const commit = await api(`/repos/${PRINTSHOP_TARGET.repository}/git/commits`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,tree:tree.sha,parents:[baseSha]})});
  await api(`/repos/${PRINTSHOP_TARGET.repository}/git/refs/heads/${encodeURIComponent(branch)}`, {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({sha:commit.sha,force:false})});
  return {branch,commitSha:commit.sha,files:changes.map(x=>x.path)};
}
