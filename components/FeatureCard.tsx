import { Card } from "@/components/ui/card"
import {
  BarChart3,
  Brain,
  GitCompareArrows,
  LayoutDashboard,
  BellRing,
  History,
  type LucideIcon,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  "Real-time Profile Analytics": BarChart3,
  "AI-Powered Insights": Brain,
  "Advanced Comparison Tools": GitCompareArrows,
  "Personalized Dashboard": LayoutDashboard,
  "Smart Tracking System": BellRing,
  "Analysis Management": History,
}

// Abstract bar-cluster glyph standing in for "your data, visualized" —
// intentionally generic so it fits either flagship feature.
function MiniBars() {
  const heights = [40, 70, 55, 90, 30]
  return (
    <div className="flex h-16 items-end gap-1.5">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-2.5 rounded-sm bg-indigo-500 dark:bg-indigo-400"
          style={{ height: `${h}%`, opacity: 0.35 + (i % 3) * 0.2 }}
        />
      ))}
    </div>
  )
}

interface FeatureCardProps {
  title: string
  description: string
  variant?: "flagship" | "compact"
}

export default function FeatureCard({ title, description, variant = "compact" }: FeatureCardProps) {
  const Icon = ICONS[title]

  if (variant === "flagship") {
    return (
      <Card className="flex flex-col justify-between gap-6 border-border/80 p-6 shadow-none transition-colors hover:border-indigo-500/50 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Icon className="mb-4 h-6 w-6 text-indigo-500 dark:text-indigo-400" />
            <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground sm:text-base">{description}</p>
          </div>
          <div className="hidden shrink-0 sm:block">
            <MiniBars />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="flex items-start gap-4 border-border/80 p-5 shadow-none transition-colors hover:border-indigo-500/50">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500 dark:text-indigo-400" />
      <div>
        <h3 className="font-semibold leading-tight">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  )
}
