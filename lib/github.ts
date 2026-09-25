import { PRINTSHOP_TARGET } from "./integration-spec";

const api = async (path: string) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured");
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
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