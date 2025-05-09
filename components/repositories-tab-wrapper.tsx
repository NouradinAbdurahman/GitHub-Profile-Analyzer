"use client"

import { RepositoriesTab } from "@/components/repositories-tab"

export function RepositoriesTabWrapper({ username }: { username: string }) {
  return <RepositoriesTab username={username} />
}
