"use client"

import { useState } from "react"
import type { Repository } from "@/components/repo-comparison-provider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { streamAIToolResult } from "@/lib/ai-tool-stream"
import { sanitizeAIHtml } from "@/lib/sanitize-ai-html"
import { SimpleLoadingSpinner } from "@/components/loading-spinner"

const MIN_REPOS = 2

// AI-generated narrative on top of the /compare page's existing stats:
// strongest repo, biggest gap, one tip per repo. Reuses the repo data
// already loaded client-side — no extra GitHub calls needed.
export function CompareVerdict({ repos }: { repos: Repository[] }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [error, setError] = useState("")

  if (repos.length < MIN_REPOS) {
    return null
  }

  const generateVerdict = async () => {
    setLoading(true)
    setError("")
    setResult("")
    try {
      await streamAIToolResult(
        "/api/ai-tools/compare-verdict",
        (cleanText) => setResult(cleanText),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repos: repos.map((repo) => ({
              name: repo.name,
              description: repo.description,
              language: repo.language,
              stargazers_count: repo.stargazers_count,
              forks_count: repo.forks_count,
              open_issues_count: repo.open_issues_count,
              size: repo.size,
              created_at: repo.created_at,
              pushed_at: repo.pushed_at,
              topics: repo.topics,
            })),
          }),
        }
      )
    } catch (err: any) {
      setError(err.message || "Failed to generate a verdict.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal/10">
            <Sparkles className="h-4 w-4 text-signal" />
          </span>
          <div>
            <CardTitle className="font-display text-base sm:text-lg font-semibold">AI Verdict</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Who's strongest, the biggest gap, and one tip per repo</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
            <pre
              className="ai-response whitespace-pre-wrap text-sm sm:text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeAIHtml(result) }}
            />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <SimpleLoadingSpinner text="Comparing..." />
          </div>
        ) : null}

        <Button onClick={generateVerdict} disabled={loading} size="sm" className="mt-4">
          {loading ? "Comparing..." : result ? "Regenerate Verdict" : "Generate AI Verdict"}
        </Button>
      </CardContent>
    </Card>
  )
}
