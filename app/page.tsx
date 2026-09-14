import { PublicProfileInput } from "@/components/public-profile-input"
import { ProfilePreviewCard } from "@/components/profile-preview-card"
import FeatureCard from "@/components/FeatureCard"

const FLAGSHIP_FEATURES = [
  {
    title: "Real-time Profile Analytics",
    description: "Detailed GitHub statistics with interactive visualizations, repository metrics, and contribution patterns.",
  },
  {
    title: "AI-Powered Insights",
    description: "AI-generated analysis of your GitHub presence, activity patterns, and actionable recommendations.",
  },
]

const SUPPORTING_FEATURES = [
  {
    title: "Advanced Comparison Tools",
    description: "Side-by-side profile comparison with visual metrics and repository benchmarking.",
  },
  {
    title: "Personalized Dashboard",
    description: "Customizable metrics display, language distribution, and repository quality assessment.",
  },
  {
    title: "Smart Tracking System",
    description: "Profile watching with automated change detection and a notification system for updates.",
  },
  {
    title: "Analysis Management",
    description: "Save, categorize, and revisit AI analyses with a full history of profile evaluations.",
  },
]

export default function Home() {
  return (
    <div className="container py-12 sm:py-20">
      <section className="relative mb-20 overflow-hidden sm:mb-28">
        <div className="bg-contrib-grid pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="text-left">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Your GitHub profile,
              <br />
              decoded.
            </h1>
            <p className="mt-5 max-w-lg text-sm text-muted-foreground sm:text-lg">
              Real commit history, language breakdowns, and side-by-side comparisons — turned into insights you can act on.
            </p>
            <div className="mt-8">
              <PublicProfileInput />
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <ProfilePreviewCard />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {FLAGSHIP_FEATURES.map((feature) => (
            <FeatureCard key={feature.title} variant="flagship" {...feature} />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SUPPORTING_FEATURES.map((feature) => (
            <FeatureCard key={feature.title} variant="compact" {...feature} />
          ))}
        </div>
      </section>
    </div>
  )
}
