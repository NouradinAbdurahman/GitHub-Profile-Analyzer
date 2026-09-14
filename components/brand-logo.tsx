import { cn } from "@/lib/utils"

interface BrandLogoProps {
  size?: "default" | "sm"
  className?: string
}

// Shared icon + wordmark lockup used in the navbar and footer.
export function BrandLogo({ size = "default", className }: BrandLogoProps) {
  const iconSize = size === "sm" ? "h-5 w-5" : "h-7 w-7 sm:h-8 sm:w-8"
  const textSize = size === "sm" ? "text-sm" : "text-base sm:text-lg"

  return (
    <span className={cn("flex items-center gap-2 sm:gap-2.5", className)}>
      <img src="/logo-256.png" alt="" className={cn(iconSize, "shrink-0 rounded-md ring-1 ring-border")} />
      <span className={cn(textSize, "truncate font-bold tracking-tight text-foreground")}>
        GitHub <span className="font-normal text-muted-foreground">Profile Analyzer</span>
      </span>
    </span>
  )
}
