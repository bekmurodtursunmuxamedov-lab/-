const REPO="bekmurodtursunmuxamedov-lab/print-style-uz";
const API="https://api.github.com";
function headers(){const token=process.env.GITHUB_TOKEN;if(!token)throw new Error("GITHUB_TOKEN is not configured");return {Authorization:`token ${token}`,"X-GitHub-Api-Version":"2022-11-28",Accept:"application/vnd.github+json"};}
async function gh(path:string){const r=await fetch(API+path,{headers:headers(),cache:"no-store"});if(!r.ok)throw new Error(`GitHub API ${r.status}`);return r.json();}
export async function inspectPrintshop(){const repo=await gh(`/repos/${REPO}`);const branch=await gh(`/repos/${REPO}/git/ref/heads/main`);const commit=await gh(`/repos/${REPO}/commits/${branch.object.sha}`);const contents=await gh(`/repos/${REPO}/contents?ref=main`);return {repository:repo.full_name,defaultBranch:repo.default_branch,branchSha:branch.object.sha,latestCommit:{sha:commit.sha,message:commit.commit.message},root:contents.map((x:any)=>({name:x.name,type:x.type,path:x.path}))};}
export function githubConfigured(){return Boolean(process.env.GITHUB_TOKEN);}
