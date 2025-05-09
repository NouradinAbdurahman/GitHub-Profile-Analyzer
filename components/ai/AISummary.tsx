"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { callAI, ChatMessage } from "@/lib/ai-request";
import { Loader2, Pause, Play } from "lucide-react";
import ApiKeyStatus from "@/components/ai/ApiKeyStatus";
import { SaveAnalysisButton } from "@/components/save-analysis-button";
import { ErrorMessage } from "@/components/ui/error-message";
import { processAIResponse } from "@/lib/text-formatter";

interface AISummaryProps {
  stats: Record<string, any>;
}

export default function AISummary({ stats }: AISummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const markdownRef = useRef(null);

  // Validate input stats on component mount
  useEffect(() => {
    console.log("AISummary received stats:", stats);
    
    // Check if we have valid stats data
    const hasValidData = stats && 
      (stats.stars > 0 || 
       stats.forks > 0 || 
       stats.public_repos > 0 || 
       (stats.languages && stats.languages.length > 0));
    
    if (!hasValidData) {
      console.warn("AISummary received potentially invalid stats:", stats);
    }
  }, [stats]);

  const handleGenerate = async () => {
    setLoading(true);
    setSummary(null);
    setError(null);
    setIsPaused(false);
    setIsGenerating(false);

    // Data validation check
    if (!stats || Object.keys(stats).length === 0) {
      setError("No GitHub data available to summarize. Try refreshing the page.");
      setLoading(false);
      return;
    }

    const prompt: ChatMessage[] = [
      {
        role: "system",
        content: `You are a helpful AI assistant called Robotum. Format your response with markdown for better readability.

FORMAT YOUR RESPONSE CAREFULLY:
1. Create a concise, well-structured summary in a single paragraph
2. Highlight key stats with **bold text** (but don't overuse bold)
3. Use proper spacing and punctuation
4. Mention the most important skills and achievements
5. Keep your summary focused and professional
6. DO NOT use excessive formatting or all-caps`
      },
      {
        role: "user",
        content: `Generate a one-paragraph summary of a GitHub user with the following stats: ${JSON.stringify(
          stats
        )}. Format the summary to highlight key achievements and skills in a clean, professional way. If there's minimal activity or missing data, focus on potential and provide encouragement.`,
      },
    ];

    try {
      console.log("Calling AI API with stats:", stats);
      const result = await callAI(prompt);

      // Process the text to ensure it's properly formatted
      let processed = processAIResponse(result);

      // Remove any trailing single characters that might appear as separate paragraphs
      processed = processed.replace(/\n\s*([a-zA-Z])\s*$/g, "");

      // Remove any trailing whitespace
      processed = processed.trim();

      setSummary(processed);
      setIsGenerating(true);
    } catch (e) {
      console.error("Error in AISummary:", e);
      if (e instanceof Error) {
        if (e.message.includes("API key not configured")) {
          setError("API key not configured. Please check your environment variables.");
        } else if (e.message.includes("404")) {
          setError("Unable to access GitHub data. Please verify your account connection.");
        } else {
          setError(e.message);
        }
      } else {
        setError("Error generating summary. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    handleGenerate();
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">AI Summary Generator</h2>
        <ApiKeyStatus />
      </div>

      <p className="text-gray-400 text-sm mb-4">
        Generate an AI-powered summary of your GitHub profile based on your stats.
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
            onClick={handleGenerate}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              "Generate Summary"
            )}
          </Button>
        )}

        {summary && !isGenerating && (
          <SaveAnalysisButton 
            type="summary"
            data={{ summary, stats }}
            username={stats.username}
            title={`Summary for ${stats.username}`}
          />
        )}
      </div>

      {error && (
        <ErrorMessage
          title="Error generating summary"
          message={error}
          onRetry={handleRetry}
        />
      )}

      {loading && !error && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {summary && !loading && (
        <div className="mt-4 bg-[#1c2128] border border-[#30363d] rounded p-4">
          <pre className="whitespace-pre-wrap text-xs">{summary}</pre>
        </div>
      )}
    </div>
  );
}