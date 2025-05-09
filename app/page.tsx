import { PublicProfileInput } from "@/components/public-profile-input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Search, LockKeyhole, BarChart3, LineChart, Star, Moon } from "lucide-react";
import FeatureCard from "@/components/FeatureCard";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <section className="mb-12 text-center">
        <h1 className="mb-4 text-2xl sm:text-4xl font-extrabold tracking-tight lg:text-5xl">GitHub Profile Analyzer</h1>
        <p className="mx-auto mb-8 max-w-2xl text-xs sm:text-lg text-muted-foreground">
          Visualize GitHub profiles, analyze repository statistics, and track language usage over time.
        </p>
        <PublicProfileInput />
      </section>

      <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard title="Real-time Profile Analytics" description="Detailed GitHub statistics with interactive visualizations, repository metrics, and contribution patterns." />
        <FeatureCard title="AI-Powered Insights" description="AI-generated analysis of your GitHub presence, activity patterns, and actionable recommendations." />
        <FeatureCard title="Advanced Comparison Tools" description="Side-by-side profile comparison with visual metrics and repository benchmarking." />
        <FeatureCard title="Personalized Dashboard" description="Customizable metrics display, language distribution, activity heatmap, and repository quality assessment." />
        <FeatureCard title="Smart Tracking System" description="Profile watching with automated change detection and a notification system for updates." />
        <FeatureCard title="Analysis Management" description="Save, categorize, and revisit AI analyses with a full history of profile evaluations." />
      </section>
    </div>
  )
}
