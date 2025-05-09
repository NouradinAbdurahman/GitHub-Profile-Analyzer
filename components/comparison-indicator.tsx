"use client"

import { useEffect, useState } from "react"
import { useRepoComparison } from "@/components/repo-comparison-provider"
import { Button } from "@/components/ui/button"
import { GitCompare, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

export function ComparisonIndicator() {
  const { comparedRepos, clearRepos } = useRepoComparison()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) {
    return null
  }

  if (comparedRepos.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 rounded-lg bg-primary p-3 text-primary-foreground shadow-lg max-[530px]:p-2 max-[530px]:gap-1">
        <GitCompare className="h-5 w-5 max-[530px]:h-4 max-[530px]:w-4" />
        <span className="font-medium text-base max-[530px]:text-[10px]">
          Comparing <Badge variant="secondary" className="text-base max-[530px]:text-[10px]">{comparedRepos.length}</Badge> repositories
        </span>
        <div className="flex gap-2 max-[530px]:gap-1">
          <Button size="sm" variant="secondary" className="h-8 max-[530px]:h-6 max-[530px]:text-[10px] px-2" onClick={() => router.push("/compare")}>View</Button>
          <Button size="sm" variant="secondary" className="h-8 w-8 max-[530px]:h-6 max-[530px]:w-6 p-0" onClick={clearRepos}>
            <X className="h-4 w-4 max-[530px]:h-3 max-[530px]:w-3" />
            <span className="sr-only">Clear comparison</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
