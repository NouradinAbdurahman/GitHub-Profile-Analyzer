"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { callAI, ChatMessage } from "@/lib/ai-request";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loader2, Search, Pause, Play } from "lucide-react";
import { SaveAnalysisButton } from "@/components/save-analysis-button";

import { processAIResponse } from "@/lib/text-formatter";

interface RecommendationsProps {
  username?: string;
  languages?: string[];
}

export default function Recommendations({ username = "", languages = [] }: RecommendationsProps) {
  const [skills, setSkills] = useState("");
  const [recs, setRecs] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const markdownRef = useRef(null);

  // Pre-populate skills field with user's languages if available
  useEffect(() => {
    if (languages && languages.length > 0) {
      setSkills(languages.join(", "));
    }
  }, [languages]);

  const handleRecommend = async () => {
    if (!skills.trim()) return;

    setLoading(true);
    setRecs(null);
    setError(null);
    setIsPaused(false);
    setIsGenerating(false);

    const prompt: ChatMessage[] = [
      {
        role: "system",
        content: `You are a helpful AI assistant called Robotum. You recommend GitHub repositories based on user skills.

FORMAT YOUR RESPONSE CAREFULLY:
1. Start with a brief introduction (1-2 sentences)
2. Use a clear heading (###### Recommended Repositories for [Skills]) - use level 6 heading (smallest)
3. For EACH repository, create a separate section with:
   - **Repository Name with link** - use bold instead of headings
   - A brief 1-2 sentence description
   - Why it's relevant to the user's skills (1-2 sentences)
   - Key features or benefits (as bullet points)
4. Add a conclusion section with next steps
5. Use proper spacing between sections
6. Use bold for important terms
7. DO NOT use excessive formatting or all-caps
8. DO NOT use level 1, 2, 3, 4, or 5 headings - ONLY use level 6 headings (###### Heading)
9. Keep all text extremely compact and minimal`
      },
      {
        role: "user",
        content: `Recommend 5 interesting GitHub repositories for ${username ? "GitHub user " + username + " who has" : "someone with"} these skills: ${skills}.

Please structure your response with clear headings and sections for each repository. Include popular and well-maintained repositories that would help me improve my skills or build interesting projects. For each repository, explain why it's relevant to my skills and what I could learn from it.`,
      },
    ];

    try {
      const result = await callAI(prompt);

      // Process the text to ensure it's properly formatted
      let processed = processAIResponse(result);

      // Convert all headings to h6 (smallest possible heading) for consistent tiny size

      // Convert all heading levels to h6 (smallest possible heading)
      processed = processed.replace(/^# ([^#\n]+)$/gm, "###### $1");
      processed = processed.replace(/^## ([^#\n]+)$/gm, "###### $1");
      processed = processed.replace(/^### ([^#\n]+)$/gm, "###### $1");
      processed = processed.replace(/^#### ([^#\n]+)$/gm, "###### $1");
      processed = processed.replace(/^##### ([^#\n]+)$/gm, "###### $1");

      // Fix repository headings for recommended repositories
      processed = processed.replace(/^# (Recommended Repositories for .+)$/gm, "###### $1");
      processed = processed.replace(/^## (Recommended Repositories for .+)$/gm, "###### $1");
      processed = processed.replace(/^### (Recommended Repositories for .+)$/gm, "###### $1");
      processed = processed.replace(/^#### (Recommended Repositories for .+)$/gm, "###### $1");
      processed = processed.replace(/^##### (Recommended Repositories for .+)$/gm, "###### $1");

      // Fix numbered headings with hashtags
      processed = processed.replace(/^# (\d+\.\s*[^#\n]+)$/gm, "###### $1");

      // Ensure proper line breaks between sections
      processed = processed.replace(/(######[^\n]+)(\s*)([^#\n])/g, "$1\n\n$3");

      // Remove any trailing single characters that might appear as separate paragraphs
      processed = processed.replace(/\n\s*([a-zA-Z])\s*$/g, "");

      // Remove any trailing whitespace
      processed = processed.trim();

      setRecs(processed);
      setIsGenerating(true);
    } catch (e) {
      console.error("Error in Recommendations:", e);
      if (e instanceof Error) {
        if (e.message.includes("API key not configured")) {
          setError("Service temporarily unavailable. Please try again later.");
        } else if (e.message.includes("busy") || e.message.includes("timeout") || e.message.includes("500")) {
          setError("The AI service is currently busy. Please try again in a moment.");
        } else {
          setError(e.message);
        }
      } else {
        setError("Error generating recommendations. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    handleRecommend();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skills.trim()) {
      handleRecommend();
    }
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
      <h2 className="text-xl font-bold mb-2">AI Repo Recommender</h2>
      <p className="text-gray-400 text-sm mb-4">
        Discover GitHub repositories tailored to your skills and interests.
      </p>

      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          className="w-full pl-10 p-2 rounded bg-[#21262d] border border-[#30363d] text-gray-200"
          placeholder="Enter your skills (e.g., JavaScript, React, Machine Learning)"
          value={skills}
          onChange={e => setSkills(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

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
            onClick={handleRecommend}
            disabled={loading || !skills.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finding Repositories...
              </>
            ) : (
              "Get Recommendations"
            )}
          </Button>
        )}

        {recs && !isGenerating && (
          <SaveAnalysisButton 
            type="recommendations"
            data={{ recommendations: recs, skills }}
            username={username}
            title={`Repository Recommendations for ${username || skills}`}
          />
        )}
      </div>

      {error && (
        <ErrorMessage
          title="Error generating recommendations"
          message={error}
          onRetry={handleRetry}
        />
      )}

      {loading && !error && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {recs && !loading && (
        <div className="mt-4 bg-[#1c2128] border border-[#30363d] rounded p-4">
          <pre className="whitespace-pre-wrap text-xs">{recs}</pre>
        </div>
      )}
    </div>
  );
}