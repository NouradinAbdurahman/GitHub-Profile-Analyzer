"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { callAI, ChatMessage } from "@/lib/ai-request";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loader2, Pause, Play } from "lucide-react";
import { SaveAnalysisButton } from "@/components/save-analysis-button";

import { processAIResponse } from "@/lib/text-formatter";

interface ProfileOptimizerProps {
  followers: number;
  following: number;
  publicRepos: number;
  stars: number;
  bio: string;
  username?: string;
}

export default function ProfileOptimizer({
  followers,
  following,
  publicRepos,
  stars,
  bio,
  username = "",
}: ProfileOptimizerProps) {
  const [tips, setTips] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const markdownRef = useRef(null);

  // Log and validate props when component mounts
  useEffect(() => {
    console.log("ProfileOptimizer received data:", { followers, following, publicRepos, stars, bio });
    
    const hasValidData = followers !== undefined && 
                         following !== undefined && 
                         publicRepos !== undefined;
    
    if (!hasValidData) {
      console.warn("ProfileOptimizer received potentially invalid data");
    }
  }, [followers, following, publicRepos, stars, bio]);

  const handleOptimize = async () => {
    setLoading(true);
    setTips(null);
    setError(null);
    setIsPaused(false);
    setIsGenerating(false);

    // Add data validation
    if (followers === undefined || following === undefined || publicRepos === undefined) {
      setError("Unable to access complete GitHub profile data. Please try refreshing the page.");
      setLoading(false);
      return;
    }

    const prompt: ChatMessage[] = [
      {
        role: "system",
        content: `You are a helpful AI assistant called Robotum. Provide concise, actionable advice for improving GitHub profiles.

FORMAT YOUR RESPONSE CAREFULLY:
1. Use proper markdown formatting with double line breaks between sections
2. Start each main section with a level 6 heading (###### Heading) - use the SMALLEST possible heading
3. Use bullet points (- ) for lists of suggestions with a space after the dash
4. Use bold (**text**) for important points (with spaces around the asterisks)
5. Create exactly 5 distinct sections with clear headings
6. Each section should have 3-5 bullet points of advice
7. Keep paragraphs short (2-3 sentences max)
8. Include a brief example at the end
9. DO NOT use hashtags (#) except for headings
10. Ensure proper spacing between sections (double line breaks)
11. Keep all headings extremely small - ONLY use level 6 headings (###### Heading)
12. Format your response to be compact and minimal

EXAMPLE FORMAT:
###### Section 1 Title

- First bullet point with **important term** highlighted
- Second bullet point with advice

###### Section 2 Title

- First bullet point in this section
- Second bullet point in this section`
      },
      {
        role: "user",
        content: `I have a GitHub profile with ${followers} followers, following ${following}, ${publicRepos} public repositories, and ${stars} stars. My current bio: '${bio || "Not provided"}'. ${bio ? "" : "I need to create a bio."}

Please provide a structured guide with 5 specific sections to improve my GitHub presence and make my profile more attractive to potential employers and collaborators. Include specific actionable tips for each section. Make sure to use proper markdown formatting with headings and bullet points.`,
      },
    ];

    try {
      console.log("Calling AI API for profile optimization", { followers, following, publicRepos, stars });
      const result = await callAI(prompt);

      // Process the text to ensure it's properly formatted
      let processed = processAIResponse(result);

      // Convert all headings to h6 (smallest possible heading) for consistent tiny size

      // First, fix any specific patterns we've seen
      if (processed.includes("# Profile Optimization ###")) {
        processed = processed.replace(/# Profile Optimization ###/g, "###### Profile Optimization");
      }

      // Fix any numbered sections with hashtags
      processed = processed.replace(/###\s*(\d+)\.\s*/g, "###### $1. ");

      // Convert all heading levels to h6 (smallest possible heading)
      processed = processed.replace(/^# ([^#\n]+)$/gm, "###### $1");
      processed = processed.replace(/^## ([^#\n]+)$/gm, "###### $1");
      processed = processed.replace(/^### ([^#\n]+)$/gm, "###### $1");
      processed = processed.replace(/^#### ([^#\n]+)$/gm, "###### $1");
      processed = processed.replace(/^##### ([^#\n]+)$/gm, "###### $1");

      // Fix hashtag sections that use single # with numbers
      processed = processed.replace(/^# (\d+\.\s*[^#\n]+)$/gm, "###### $1");

      // Handle special case for hashtag headings
      processed = processed.replace(/^# ([^#\n]+)$/gm, "###### $1");

      // Ensure proper line breaks between sections
      processed = processed.replace(/(######[^\n]+)(\s*)([^#\n])/g, "$1\n\n$3");

      // More aggressive cleanup for Profile Optimizer
      // Remove any trailing paragraphs that contain only a few characters
      processed = processed.replace(/\n\s*<p[^>]*>[^<]{1,3}<\/p>\s*$/g, "");

      // Remove any trailing HTML tags
      processed = processed.replace(/<[^>]+>\s*$/g, "");

      // Remove any trailing single characters that might appear as separate paragraphs
      processed = processed.replace(/\n\s*([a-zA-Z0-9]{1,3})\s*$/g, "");

      // Remove any trailing numbers or special characters
      processed = processed.replace(/\n\s*([#=0-9]{1,5})\s*$/g, "");

      // Remove any trailing "=> #" pattern
      processed = processed.replace(/\s*=>\s*#\d*\s*$/g, "");

      // Remove any trailing HTML-like tags or patterns
      processed = processed.replace(/<\/[a-z]+>\s*=>\s*#\d*\s*$/gi, "");

      // Remove the specific pattern from the screenshot "<p class="my-2 text-xs leading-relaxed">!</p> => #0"
      processed = processed.replace(/<p class="my-2 text-xs leading-relaxed">[^<]*<\/p>\s*=>\s*#\d*\s*$/g, "");

      // Remove any trailing whitespace
      processed = processed.trim();

      setTips(processed);
      setIsGenerating(true);
    } catch (e) {
      console.error("Error in ProfileOptimizer:", e);
      if (e instanceof Error) {
        if (e.message.includes("API key not configured")) {
          setError("API key not configured. Please check your environment variables.");
        } else if (e.message.includes("404")) {
          setError("Unable to access GitHub data. Please verify your account connection.");
        } else if (e.message.includes("busy") || e.message.includes("timeout") || e.message.includes("500")) {
          setError("The AI service is currently busy. Please try again in a moment.");
        } else {
          setError(e.message);
        }
      } else {
        setError("Error generating suggestions. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    handleOptimize();
  };

  const handlePauseToggle = () => {
    if (markdownRef.current) {
      // @ts-ignore - we know togglePause exists on our ref
      markdownRef.current.togglePause();
      setIsPaused(!isPaused);
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 mb-6">
      <h2 className="text-xl font-bold mb-2">Profile Optimizer</h2>
      <p className="text-gray-400 text-sm mb-4">
        Get AI-powered suggestions to improve your GitHub profile and increase your visibility.
      </p>

      <div className="flex flex-wrap gap-2">
        {isGenerating ? (
          <Button
            onClick={handlePauseToggle}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isPaused ? (
              <>
                <Play className="mr-2 h-4 w-4" /> Continue
              </>
            ) : (
              <>
                <Pause className="mr-2 h-4 w-4" /> Pause
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleOptimize}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Profile...
              </>
            ) : (
              "Get Suggestions"
            )}
          </Button>
        )}

        {tips && !isGenerating && (
          <SaveAnalysisButton 
            type="optimizer"
            data={{ tips, profileStats: { followers, following, publicRepos, stars, bio } }}
            username={username}
            title={`Profile Optimization for ${username}`}
          />
        )}
      </div>

      {error && (
        <ErrorMessage
          title="Error generating suggestions"
          message={error}
          onRetry={handleRetry}
        />
      )}

      {loading && !error && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {tips && !loading && (
        <div className="mt-4 bg-[#1c2128] border border-[#30363d] rounded p-4">
          <pre className="whitespace-pre-wrap text-xs">{tips}</pre>
        </div>
      )}
    </div>
  );
}