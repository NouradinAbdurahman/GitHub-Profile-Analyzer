import Link from "next/link"
import { Github, Linkedin, Instagram, Mail } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/" },
  { label: "GitHub", href: "https://github.com/NouradinAbdurahman/github-profile-analyzer", external: true },
]

const SOCIAL_LINKS = [
  { label: "GitHub", href: "https://github.com/NouradinAbdurahman", icon: Github },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/nouraddin/", icon: Linkedin },
  { label: "Instagram", href: "https://www.instagram.com/nouradiin_/", icon: Instagram },
  { label: "Email", href: "mailto:n.aden1208@gmil.com", icon: Mail },
]

export default function Footer() {
  return (
    <footer className="border-t border-border/80 bg-background">
      <div className="container py-12 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
          <div className="max-w-sm space-y-3">
            <BrandLogo />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Explore AI-driven GitHub profile analysis, compare users with visual metrics, and gain real-time insights with personalized recommendations.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Navigate</h3>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              {NAV_LINKS.map((link) =>
                link.external ? (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="w-fit transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.label} href={link.href} className="w-fit transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                )
              )}
            </nav>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Connect</h3>
            <div className="flex items-center gap-4">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="text-muted-foreground transition-colors hover:text-indigo-500 dark:hover:text-indigo-400"
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col-reverse items-center gap-4 border-t border-border/80 pt-6 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground">Created by Nouraddin. All rights reserved. © 2025</p>
        </div>
      </div>
    </footer>
  )
}
