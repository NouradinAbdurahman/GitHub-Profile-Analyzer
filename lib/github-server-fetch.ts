// Small shared helper for server-side (unauthenticated-by-user) calls to the
// GitHub REST API — used by the AI tool routes, which need repo/user data to
// build prompts but run with the app's own GITHUB_TOKEN, not the viewer's.
const GITHUB_API_BASE = "https://api.github.com"

export function githubFetchOptions(accept = "application/vnd.github.v3+json"): RequestInit {
  const headers: HeadersInit = { Accept: accept }
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  return { headers, cache: "no-store" }
}

// `path` is either an absolute URL or a path relative to api.github.com.
export async function githubFetch(path: string, accept?: string): Promise<Response> {
  const url = path.startsWith("http") ? path : `${GITHUB_API_BASE}${path}`
  return fetch(url, githubFetchOptions(accept))
}
