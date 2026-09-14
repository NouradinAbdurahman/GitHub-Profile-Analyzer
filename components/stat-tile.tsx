import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Accent = "signal" | "ember" | "teal" | "violet" | "rose"

const ACCENT_STYLES: Record<Accent, { chip: string; icon: string }> = {
  signal: { chip: "bg-signal/10", icon: "text-signal" },
  ember: { chip: "bg-ember/10", icon: "text-ember" },
  teal: { chip: "bg-teal/10", icon: "text-teal" },
  violet: { chip: "bg-violet/10", icon: "text-violet" },
  rose: { chip: "bg-rose/10", icon: "text-rose" },
}

interface StatTileProps {
  icon: LucideIcon
  label: string
  value: string | number
  description?: string
  accent?: Accent
  loading?: boolean
  className?: string
}

// Premium metric tile: icon chip + large tabular-numeral figure.
// Shared by the dashboard overview and the profile Stats tab so every
// numeric callout in the app reads the same way.
export function StatTile({
  icon: Icon,
  label,
  value,
  description,
  accent = "signal",
  loading = false,
  className,
}: StatTileProps) {
  const styles = ACCENT_STYLES[accent]

  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card p-4 sm:p-5 transition-colors hover:border-border",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", styles.chip)}>
          <Icon className={cn("h-4 w-4", styles.icon)} />
        </span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="mt-3 font-display text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight text-foreground">
        {loading ? <span className="inline-block h-7 w-16 animate-pulse rounded bg-muted align-middle" /> : value}
      </div>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}
