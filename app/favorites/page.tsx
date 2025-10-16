"use client"

import { useFavorites } from "@/components/favorites-provider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarDays, Trash2, ExternalLink, Star } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function FavoritesPage() {
  const { favorites, removeFavorite } = useFavorites()
  const router = useRouter()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Favorite Profiles</h1>

      {favorites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <motion.div
              className="mb-4 text-yellow-400"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [-5, 5, -5, 0],
                filter: [
                  'drop-shadow(0 0 8px rgba(250, 204, 21, 0.5))',
                  'drop-shadow(0 0 16px rgba(250, 204, 21, 0.7))',
                  'drop-shadow(0 0 8px rgba(250, 204, 21, 0.5))',
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "loop",
                ease: "easeInOut",
              }}
            >
              <Star className="h-20 w-20 fill-yellow-400" strokeWidth={1} />
            </motion.div>
            <h2 className="mb-2 text-xl font-semibold">No favorites yet</h2>
            <p className="mb-4 text-center text-muted-foreground">
              Add GitHub profiles to your favorites to quickly access them later.
            </p>
            <Button onClick={() => router.push("/")}>Search Profiles</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((profile) => (
            <Card key={profile.username} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={profile.avatar_url || "/placeholder.svg"}
                      alt={profile.name || profile.username}
                    />
                    <AvatarFallback>{profile.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-xl">{profile.name || profile.username}</CardTitle>
                    <CardDescription>@{profile.username}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {profile.bio && <p className="line-clamp-2 text-sm">{profile.bio}</p>}
                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                  <CalendarDays className="mr-1 h-3 w-3" />
                  <span>Added on {new Date(profile.addedAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => removeFavorite(profile.username)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
                <Button asChild>
                  <Link href={`/profile/${profile.username}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Profile
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
