"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, MapPin, Users, Star } from "lucide-react"
import { FavoriteButton } from "@/components/favorite-button"

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
  return (
    <Card className="overflow-hidden">
      <CardHeader className="relative p-0">
        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500" />
        <div className="absolute -bottom-12 left-4">
          <Image
            src={user.avatar_url || "/placeholder.svg"}
            alt={user.name || user.login}
            width={96}
            height={96}
            className="rounded-full border-4 border-background"
          />
        </div>
      </CardHeader>

      <CardContent className="mt-14 space-y-4 pt-2">
        <div>
          <h2 className="text-base sm:text-2xl font-bold break-words">{user.name || user.login}</h2>
          <p className="text-[10px] sm:text-sm text-muted-foreground break-words">@{user.login}</p>
        </div>

        {user.bio && <p className="text-[10px] sm:text-sm break-words">{user.bio}</p>}

        <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {user.followers} followers
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {user.following} following
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            {user.public_repos} repos
          </Badge>
        </div>

        <div className="space-y-2 text-[10px] sm:text-xs">
          {user.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="break-words">{user.location}</span>
            </div>
          )}

          {user.created_at && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 text-xs sm:text-base">
        <Button asChild className="flex-1 text-xs sm:text-base">
          <a href={user.html_url} target="_blank" rel="noopener noreferrer">
            View on GitHub
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
  )
}
