import type React from "react"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/components/auth-provider"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { ComparisonIndicator } from "@/components/comparison-indicator"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "GitHub Profile Analyzer",
  description: "Analyze GitHub profiles and visualize repository statistics",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <ComparisonIndicator />
            </div>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
