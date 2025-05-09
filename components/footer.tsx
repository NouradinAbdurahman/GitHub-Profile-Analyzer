import Link from "next/link"
import { Github, Linkedin, Instagram, Mail } from "lucide-react"

export default function Footer() {
  return (
    <footer className="border-t bg-background text-[10px] sm:text-sm">
      <div className="max-w-7xl mx-auto px-2 py-4 md:py-6 w-full flex flex-col gap-6 xl:px-12 2xl:px-20">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-8 md:h-20 w-full xl:gap-16 2xl:gap-24">
          {/* Left: Logo/Title/About */}
          <div className="flex flex-col items-center md:items-start gap-2 text-[10px] sm:text-sm text-muted-foreground min-w-0">
            <div className="flex items-center gap-2">
              <Github className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-bold text-base sm:text-lg">GitHub Profile Analyzer</span>
            </div>
            <span className="text-center md:text-left">Analyze GitHub profiles and visualize repository statistics.</span>
          </div>
          {/* Center: Nav Links */}
          <nav className="flex flex-row gap-8 text-[10px] sm:text-sm text-muted-foreground justify-center items-center min-w-0">
            <Link href="/" className="hover:underline whitespace-nowrap">Home</Link>
            <Link href="/about" className="hover:underline whitespace-nowrap">About</Link>
            <Link href="/privacy" className="hover:underline whitespace-nowrap">Privacy</Link>
            <a href="https://github.com/NouradinAbdurahman/github-profile-analyzer" target="_blank" rel="noopener noreferrer" className="hover:underline whitespace-nowrap">GitHub</a>
          </nav>
          {/* Right: Connect Info */}
          <div className="flex flex-col items-center md:items-end space-y-2 min-w-0">
            <h3 className="text-base sm:text-lg font-medium">Connect With Us</h3>
            <div className="flex items-center gap-3 xl:gap-4 2xl:gap-6">
              <a
                href="https://github.com/NouradinAbdurahman"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="hover:opacity-80 transition-opacity"
              >
                <Github className="h-4 w-4 sm:h-6 sm:w-6 text-[#fff]" />
              </a>
              <a
                href="https://www.linkedin.com/in/nouraddin/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="hover:opacity-80 transition-opacity"
              >
                <Linkedin className="h-4 w-4 sm:h-6 sm:w-6 text-[#0077B5]" />
              </a>
              <a
                href="https://www.instagram.com/nouradiin_/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="hover:opacity-80 transition-opacity"
              >
                <Instagram className="h-4 w-4 sm:h-6 sm:w-6 text-[#E4405F]" />
              </a>
              <a
                href="mailto:n.aden1208@gmil.com"
                aria-label="Email"
                className="hover:opacity-80 transition-opacity"
              >
                <Mail className="h-4 w-4 sm:h-6 sm:w-6 text-[#EA4335]" />
              </a>
            </div>
          </div>
        </div>
        {/* Bottom: Creator */}
        <div className="w-full flex flex-col items-center">
          <div className="w-full border-t border-gray-700 dark:border-gray-800 my-4" />
          <div className="text-center text-[10px] sm:text-xs text-muted-foreground pt-2 pb-2">
            Created by Nouraddin. All rights reserved. © 2025
          </div>
        </div>
      </div>
    </footer>
  )
}
