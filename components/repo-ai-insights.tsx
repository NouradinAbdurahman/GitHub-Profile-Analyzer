"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, FileText, HeartPulse, GitCommitHorizontal, type LucideIcon } from "lucide-react"
import { streamAIToolResult } from "@/lib/ai-tool-stream"
import { sanitizeAIHtml } from "@/lib/sanitize-ai-html"
import { SimpleLoadingSpinner } from "@/components/loading-spinner"

const toolConfigs: Array<{
  type: "explain" | "health" | "commits"
  label: string
  icon: LucideIcon
  description: string
  actionVerb: string
}> = [
  { type: "explain", label: "Explain", icon: FileText, description: "Plain-English summary of what this repo does.", actionVerb: "Explain Repo" },
  { type: "health", label: "Health", icon: HeartPulse, description: "Documentation, onboarding and activity score.", actionVerb: "Check Health" },
  { type: "commits", label: "Commits", icon: GitCommitHorizontal, description: "Critique of recent commit message quality.", actionVerb: "Review Commits" },
]

interface RepoAIInsightsProps {
  owner: string
  repoName: string
}

// Per-repo AI tools: explain / health / commit-message quality. Triggered
// from a repo card, shares the streaming SSE parser with the profile AI
// Tools tab (lib/ai-tool-stream.ts) and the same visual language.
export function RepoAIInsights({ owner, repoName }: RepoAIInsightsProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const runTool = async (type: string) => {
    setLoading(type)
    setErrors((prev) => ({ ...prev, [type]: "" }))
    setResults((prev) => ({ ...prev, [type]: "" }))
    try {
      const endpoint = `/api/ai-tools/repo?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}&type=${type}`
      await streamAIToolResult(endpoint, (cleanText) => {
        setResults((prev) => ({ ...prev, [type]: cleanText }))
      })
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [type]: err.message || "Failed to generate insight." }))
    } finally {
      setLoading(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="mr-2 h-4 w-4" />
          AI Insights
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">AI Insights</DialogTitle>
          <DialogDescription className="font-mono text-xs">{owner}/{repoName}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="explain">
          <TabsList className="grid w-full grid-cols-3">
            {toolConfigs.map((tool) => (
              <TabsTrigger key={tool.type} value={tool.type} className="text-xs sm:text-sm">
                <tool.icon className="h-3.5 w-3.5" />
                {tool.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {toolConfigs.map((tool) => (
            <TabsContent key={tool.type} value={tool.type} className="pt-4">
              <p className="mb-3 text-xs text-muted-foreground">{tool.description}</p>

              {results[tool.type] ? (
                <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-border/60 bg-muted/40 p-4">
                  <pre
                    className="ai-response whitespace-pre-wrap text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeAIHtml(results[tool.type]) }}
                  />
                </div>
              ) : errors[tool.type] ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  {errors[tool.type]}
                </div>
              ) : loading === tool.type ? (
                <div className="flex items-center justify-center py-10">
                  <SimpleLoadingSpinner text="Generating..." />
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-border/60 py-10 text-sm text-muted-foreground">
                  Not generated yet
                </div>
              )}

              <Button
                onClick={() => runTool(tool.type)}
                disabled={!!loading}
                size="sm"
                className="mt-3"
              >
                {loading === tool.type ? "Generating..." : results[tool.type] ? "Regenerate" : tool.actionVerb}
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
