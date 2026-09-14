"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { CalendarDays, MapPin, Users, FolderGit2, ExternalLink } from "lucide-react"
import { FavoriteButton } from "@/components/favorite-button"
import { FadeInCard } from "@/components/fade-in-card"

type User = {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
  bio: string | null
  company: string | null
  location: string | null
  blog: string | null
  email: string | null
  twitter_username: string | null
  public_repos: number
  followers: number
  following: number
  created_at: string
}

export function ProfileCard({ user }: { user: User }) {
  const stats: Array<{ icon: typeof Users; value: number; label: string }> = [
    { icon: Users, value: user.followers, label: "followers" },
    { icon: Users, value: user.following, label: "following" },
    { icon: FolderGit2, value: user.public_repos, label: "repos" },
  ]

  return (
    <FadeInCard>
    <Card className="overflow-hidden">
      <CardHeader className="relative p-0">
        <div className="mesh-glow bg-grid-dark h-28" />
        <div className="absolute -bottom-11 left-5">
          <Image
            src={user.avatar_url || "/placeholder.svg"}
            alt={user.name || user.login}
            width={88}
            height={88}
            className="rounded-full border-4 border-card shadow-lg shadow-black/20"
          />
        </div>
      </CardHeader>

      <CardContent className="mt-14 space-y-4 pt-2">
        <div>
          <h2 className="font-display text-lg sm:text-2xl font-semibold tracking-tight break-words">{user.name || user.login}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground break-words">@{user.login}</p>
        </div>

        {user.bio && <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 break-words">{user.bio}</p>}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <Icon className="h-3.5 w-3.5 self-center text-signal" />
              <span className="font-display text-sm sm:text-base font-semibold tabular-nums">{value}</span>
              <span className="text-[11px] sm:text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
          {user.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="break-words">{user.location}</span>
            </div>
          )}

          {user.created_at && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 text-xs sm:text-base">
        <Button asChild className="flex-1 text-xs sm:text-base">
          <a href={user.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5">
            View on GitHub
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
        <FavoriteButton
          profile={{
            username: user.login,
            name: user.name,
            avatar_url: user.avatar_url,
            bio: user.bio,
          }}
          size="icon"
        />
      </CardFooter>
    </Card>
    </FadeInCard>
  )
}
