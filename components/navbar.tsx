"use client"

import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Github, LogOut, User, Star, BrainCircuit, BookmarkIcon } from "lucide-react"
import { Sheet, SheetTrigger, SheetContent, SheetClose } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { NotificationsPopover } from "@/components/notifications"

export default function Navbar() {
  const { user, login, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3 w-full xl:px-12 2xl:px-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 font-extrabold text-sm sm:text-lg tracking-tight text-primary whitespace-nowrap">
            <Github className="h-6 w-6 sm:h-7 sm:w-7" />
            <span className="truncate">GitHub Profile Analyzer</span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-4 flex-1 justify-end min-w-0">
          <ThemeToggle />
          {user && <NotificationsPopover />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.name || user.login} />
                    <AvatarFallback>{user.login.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${user.login}`} className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    <span>My Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/favorites" className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    <span>Favorites</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/saved-analyses" className="flex items-center gap-2">
                    <BookmarkIcon className="h-4 w-4" />
                    <span>Saved Analyses</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={login} className="flex items-center gap-2">
              <Github className="h-4 w-4" />
              <span>Sign in with GitHub</span>
            </Button>
          )}
        </nav>

        {/* Mobile nav */}
        <div className="md:hidden flex items-center gap-2">
          {user && <NotificationsPopover />}
          {user && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.name || user.login} />
              <AvatarFallback>{user.login.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 p-0">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 px-6 py-4 border-b">
                  <Github className="h-5 w-5" />
                  <span className="font-bold text-sm">GitHub Profile Analyzer</span>
                </div>
                <div className="flex flex-col gap-2 p-6 flex-1">
                  <ThemeToggle />
                  {user ? (
                    <>
                      <SheetClose asChild>
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2 py-2"
                        >
                          <User className="h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href={`/profile/${user.login}`}
                          className="flex items-center gap-2 py-2"
                        >
                          <Github className="h-4 w-4" />
                          <span>My Profile</span>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/favorites"
                          className="flex items-center gap-2 py-2"
                        >
                          <Star className="h-4 w-4" />
                          <span>Favorites</span>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/saved-analyses"
                          className="flex items-center gap-2 py-2"
                        >
                          <BookmarkIcon className="h-4 w-4" />
                          <span>Saved Analyses</span>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button
                          onClick={logout}
                          variant="ghost"
                          className="flex items-center gap-2 py-2 w-full justify-start"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Log out</span>
                        </Button>
                      </SheetClose>
                    </>
                  ) : (
                    <SheetClose asChild>
                      <Button
                        onClick={login}
                        className="flex items-center gap-2 w-full justify-start"
                      >
                        <Github className="h-4 w-4" />
                        <span>Sign in with GitHub</span>
                      </Button>
                    </SheetClose>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
