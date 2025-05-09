"use client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Search, LockKeyhole, BarChart3, LineChart, Star, Moon, Brain, GitCompareArrows, LayoutDashboard, BellRing, History } from "lucide-react";
import AnimatedIcon from "@/components/AnimatedIcon";
import { useState } from 'react'; // Import useState

const iconMap = {
  "Real-time Profile Analytics": { icon: BarChart3, color: "text-[#58a6ff]", rotate: 8 },
  "AI-Powered Insights": { icon: Brain, color: "text-[#f0b72f]", rotate: -8 },
  "Advanced Comparison Tools": { icon: GitCompareArrows, color: "text-[#238636]", rotate: 8 },
  "Personalized Dashboard": { icon: LayoutDashboard, color: "text-[#a371f7]", rotate: -8 },
  "Smart Tracking System": { icon: BellRing, color: "text-[#f0b72f]", rotate: 8 },
  "Analysis Management": { icon: History, color: "text-[#58a6ff]", rotate: -8 },
};

export default function FeatureCard({ title, description }: { title: string; description: string }) {
  const { icon, color, rotate } = iconMap[title as keyof typeof iconMap];
  const [isHovered, setIsHovered] = useState(false); // Add isHovered state

  return (
    <Card
      className="group relative overflow-hidden p-0 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-[#58a6ff] max-[530px]:w-5/6 max-[530px]:mx-auto"
      onMouseEnter={() => setIsHovered(true)} // Set isHovered to true on mouse enter
      onMouseLeave={() => setIsHovered(false)} // Set isHovered to false on mouse leave
    >
      <CardHeader className="relative z-10 flex flex-col items-center justify-center pb-2 pt-6 max-[530px]:pb-1 max-[530px]:pt-3 max-[530px]:px-2">
        <div className="mb-4 flex items-center justify-center max-[530px]:mb-2">
          <span className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/30 to-indigo-400/10 p-4 shadow-lg max-[530px]:p-2">
            <AnimatedIcon Icon={icon} colorClass={color + ' drop-shadow-[0_0_16px_rgba(99,102,241,0.7)]'} rotate={rotate} small={true} isHovered={isHovered} /> {/* Pass isHovered to AnimatedIcon */}
          </span>
        </div>
        <CardTitle className="text-3xl text-center font-extrabold tracking-tight text-foreground drop-shadow-xl max-[530px]:text-lg max-[530px]:font-bold max-[530px]:leading-tight">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 px-6 pb-6 pt-2 max-[530px]:px-2 max-[530px]:pb-2 max-[530px]:pt-1">
        <CardDescription className="text-center text-xl text-muted-foreground font-medium max-[530px]:text-base max-[530px]:font-normal">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}