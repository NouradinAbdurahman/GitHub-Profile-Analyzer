"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const LANGUAGES = [
  { name: "TypeScript", pct: 62 },
  { name: "Go", pct: 24 },
  { name: "Rust", pct: 14 },
]

const STATS = [
  { label: "Repos", value: "142" },
  { label: "Followers", value: "9,204" },
  { label: "Stars", value: "3,381" },
]

// Static, non-fetching mock of an analyzed profile — the hero's "proof" visual.
// Uses GitHub's own public demo account so it reads as an example, not live data.
export function ProfilePreviewCard() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? undefined : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={shouldReduceMotion ? undefined : "float-slow"}
    >
      <Card className="w-full max-w-sm border-border/80 bg-card/60 p-5 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://github.com/octocat.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full border border-border"
            />
            <div>
              <p className="text-sm font-semibold leading-tight">The Octocat</p>
              <p className="font-mono text-xs text-muted-foreground">@octocat</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] font-normal text-muted-foreground">
            Example
          </Badge>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 border-y border-border/80 py-3">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="font-mono text-base font-semibold tabular-nums">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {LANGUAGES.map((lang, i) => (
            <div key={lang.name} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 text-muted-foreground">{lang.name}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                  style={{ width: `${lang.pct}%`, opacity: 1 - i * 0.22 }}
                />
              </div>
              <span className="font-mono w-9 shrink-0 text-right text-muted-foreground">{lang.pct}%</span>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  )
}
