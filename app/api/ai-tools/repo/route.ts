import { NextResponse } from 'next/server';
import { chatStreamWithFallback } from '@/lib/openrouter';
import { githubFetch } from '@/lib/github-server-fetch';

type RepoToolType = 'explain' | 'health' | 'commits';
const ALLOWED_TYPES: RepoToolType[] = ['explain', 'health', 'commits'];

const README_CHAR_LIMIT = 3000;

interface RepoMeta {
  description: string | null;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
}

async function fetchRepoMeta(owner: string, repo: string): Promise<RepoMeta> {
  const res = await githubFetch(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  if (res.status === 404) {
    throw new Error(`Repository '${owner}/${repo}' not found.`);
  }
  if (res.status === 403 || res.status === 429) {
    throw new Error('GitHub API rate limit exceeded or access forbidden.');
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch repository metadata: ${res.statusText}`);
  }
  return res.json();
}

// Returns null (rather than throwing) when there's simply no README — that's
// meaningful input for the health/explain prompts, not an error.
async function fetchReadme(owner: string, repo: string): Promise<string | null> {
  try {
    const res = await githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
      'application/vnd.github.raw'
    );
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, README_CHAR_LIMIT);
  } catch {
    return null;
  }
}

async function fetchTopLevelFiles(owner: string, repo: string): Promise<string[]> {
  try {
    const res = await githubFetch(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.slice(0, 40).map((entry: any) => entry.name).filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchRecentCommitMessages(owner: string, repo: string, count = 10): Promise<string[]> {
  const res = await githubFetch(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=${count}`);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((entry: any) => entry.commit?.message as string | undefined)
    .filter((message): message is string => Boolean(message))
    .map((message) => message.split('\n')[0].trim());
}

async function buildPrompt(type: RepoToolType, owner: string, repo: string): Promise<string> {
  const meta = await fetchRepoMeta(owner, repo);

  if (type === 'explain') {
    const readme = await fetchReadme(owner, repo);
    return `
You are summarizing a GitHub repository for someone unfamiliar with it.

Repository: ${owner}/${repo}
Description: ${meta.description || 'none provided'}
Primary language: ${meta.language || 'not specified'}
Topics: ${meta.topics?.length ? meta.topics.join(', ') : 'none'}
Stars: ${meta.stargazers_count}, Forks: ${meta.forks_count}

README (may be truncated, or absent):
"""
${readme || '(no README found)'}
"""

Write a single plain-English paragraph (3-4 sentences) explaining what this project does and who it's for. Add value beyond the description rather than repeating it verbatim. If the README is missing or unhelpful, say so and explain only from the metadata above. Do not invent details.

Explanation:`.trim();
  }

  if (type === 'health') {
    const [readme, files] = await Promise.all([fetchReadme(owner, repo), fetchTopLevelFiles(owner, repo)]);
    return `
You are scoring a GitHub repository's documentation and onboarding quality for a new contributor.

Repository: ${owner}/${repo}
Description: ${meta.description || 'none'}
Topics: ${meta.topics?.length ? meta.topics.join(', ') : 'none'}
Last pushed: ${meta.pushed_at ? new Date(meta.pushed_at).toLocaleDateString() : 'unknown'}
Open issues: ${meta.open_issues_count}
Has README: ${readme ? 'yes' : 'no'}
Top-level files: ${files.length ? files.join(', ') : 'none found'}

README excerpt (may be truncated):
"""
${readme || '(no README found)'}
"""

Give a short health assessment covering three areas — Documentation, Onboarding clarity, and Activity — each rated Strong / Adequate / Needs work with one sentence of reasoning. Finish with one concrete, actionable suggestion. Base every judgment ONLY on the information given; do not invent details.

Assessment:`.trim();
  }

  // commits
  const messages = await fetchRecentCommitMessages(owner, repo);
  const commitList = messages.length
    ? messages.map((msg, i) => `${i + 1}. ${msg}`).join('\n')
    : '(no recent commits found)';

  return `
You are reviewing recent commit message quality for a GitHub repository.

Repository: ${owner}/${repo}

Last ${messages.length} commit messages:
${commitList}

In 3-5 short bullet points, critique the clarity and consistency of these commit messages (e.g. vague messages like "fix" or "update", missing context, inconsistent style). Then rewrite the two weakest ones as examples of clearer messages. Base this ONLY on the messages provided.

Critique:`.trim();
}

export async function GET(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured on the server.' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');
  const type = searchParams.get('type') as RepoToolType | null;

  if (!owner || !repo) {
    return NextResponse.json({ error: 'owner and repo query parameters are required.' }, { status: 400 });
  }
  if (!type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: `Invalid tool type requested. Received: ${type}` }, { status: 400 });
  }

  try {
    const prompt = await buildPrompt(type, owner, repo);
    const maxTokens = type === 'explain' ? 350 : 650;

    const { stream } = await chatStreamWithFallback(
      apiKey,
      [{ role: 'user', content: prompt }],
      { maxTokens }
    );

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error(`[repo/${type}] Error:`, error);
    const status = /not found/i.test(error.message) ? 404 : 500;
    return NextResponse.json({ error: error.message || 'AI service is currently unavailable' }, { status });
  }
}

export const revalidate = 0;
