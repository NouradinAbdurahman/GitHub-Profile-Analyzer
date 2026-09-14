import { NextResponse } from 'next/server';
import { chatStreamWithFallback } from '@/lib/openrouter';

// Minimal shape the client already has for every repo on the /compare page
// (see components/repo-comparison-provider.tsx) — only the fields the prompt
// actually uses are required here.
interface ComparedRepoInput {
  name: string;
  description?: string | null;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  size?: number;
  created_at?: string;
  pushed_at?: string;
  topics?: string[];
}

const MIN_REPOS = 2;
const MAX_REPOS = 4;

function buildPrompt(repos: ComparedRepoInput[]): string {
  const rows = repos
    .map((repo) => {
      const sizeMb = repo.size ? (repo.size / 1024).toFixed(1) : '0';
      const topics = repo.topics && repo.topics.length > 0 ? repo.topics.join(', ') : 'none';
      return `- ${repo.name}: ${repo.description || 'no description'} | Language: ${repo.language || 'N/A'} | Stars: ${repo.stargazers_count ?? 0} | Forks: ${repo.forks_count ?? 0} | Open issues: ${repo.open_issues_count ?? 0} | Size: ${sizeMb}MB | Topics: ${topics} | Last pushed: ${repo.pushed_at ? new Date(repo.pushed_at).toLocaleDateString() : 'unknown'}`;
    })
    .join('\n');

  return `
You are comparing GitHub repositories a developer is benchmarking against each other.

Repositories:
${rows}

Write a short verdict (5-7 sentences total):
1. Name the strongest repository overall and explain why in one sentence.
2. Name the one with the biggest gap relative to the others (e.g. low engagement for its size or age) and why.
3. Give one concrete, one-sentence improvement tip for each repository.

Base every claim ONLY on the stats given above; do not invent details.

Verdict:`.trim();
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured on the server.' }, { status: 500 });
  }

  let body: { repos?: ComparedRepoInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const repos = Array.isArray(body.repos) ? body.repos : [];
  if (repos.length < MIN_REPOS) {
    return NextResponse.json({ error: `At least ${MIN_REPOS} repositories are required to generate a verdict.` }, { status: 400 });
  }
  if (repos.length > MAX_REPOS) {
    return NextResponse.json({ error: `At most ${MAX_REPOS} repositories can be compared at once.` }, { status: 400 });
  }
  if (repos.some((repo) => !repo || typeof repo.name !== 'string')) {
    return NextResponse.json({ error: 'Each repository must include at least a name.' }, { status: 400 });
  }

  try {
    const prompt = buildPrompt(repos);
    const { stream } = await chatStreamWithFallback(
      apiKey,
      [{ role: 'user', content: prompt }],
      { maxTokens: 700 }
    );

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[compare-verdict] AI request failed:', error);
    return NextResponse.json({ error: error.message || 'AI service is currently unavailable' }, { status: 500 });
  }
}

export const revalidate = 0;
