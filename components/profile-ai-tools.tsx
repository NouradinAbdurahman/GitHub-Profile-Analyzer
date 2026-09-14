import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleLoadingSpinner } from "@/components/loading-spinner"; // Assuming this exists
import { Bookmark, Sparkles, SlidersHorizontal, Compass, IdCard, ListChecks, Mail, type LucideIcon } from "lucide-react";
import { saveAnalysisResult } from "@/lib/firebase"; // Import the save function
import { streamAIToolResult } from "@/lib/ai-tool-stream";
import { sanitizeAIHtml } from "@/lib/sanitize-ai-html";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { LoginDialog } from "@/components/ui/login-dialog"; // Import the new dialog
import { useAuth } from "@/components/auth-provider";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const toolConfigs: Array<{
  type: string
  label: string
  description: string
  icon: LucideIcon
  actionVerb: string
  needsRole?: boolean
}> = [
  {
    type: "summary",
    label: "Profile Summary",
    description: "Auto-generates a concise summary of the profile based on stats.",
    icon: Sparkles,
    actionVerb: "Generate Summary",
  },
  {
    type: "optimizer",
    label: "Profile Optimizer",
    description: "Analyzes and suggests improvements for the profile.",
    icon: SlidersHorizontal,
    actionVerb: "Analyze Profile",
  },
  {
    type: "recommendations",
    label: "Repo Recommendations", // Changed label based on image
    description: "Gives personalized recommendations for growth and collaboration.",
    icon: Compass,
    actionVerb: "Get Recommendations",
  },
  {
    type: "bio-picks",
    label: "Bio & Pins",
    description: "Rewrites the bio and suggests which repos to pin.",
    icon: IdCard,
    actionVerb: "Draft Bio & Picks",
    needsRole: true,
  },
  {
    type: "resume-bullets",
    label: "Resume Bullets",
    description: "Turns top repos and stats into resume-ready bullet points.",
    icon: ListChecks,
    actionVerb: "Generate Bullets",
  },
  {
    type: "cover-letter",
    label: "Why Hire Me",
    description: "Drafts a short first-person blurb grounded in this profile's work.",
    icon: Mail,
    actionVerb: "Draft Blurb",
    needsRole: true,
  },
];

// Add CSS for smooth transitions
const fadeInAnimation = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .fade-in {
    animation: fadeIn 0.5s ease-in-out;
  }

  @import url('https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap');
  
  .ai-response {
    font-family: 'Open Sans', sans-serif;
    font-optical-sizing: auto;
    font-weight: 400;
    font-style: normal;
    font-variation-settings: "wdth" 100;
  }
`;

// TypewriterEffect component for the typing animation
const TypewriterEffect = ({ text, speed = 10, className = "" }: { text: string, speed?: number, className?: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setCurrentIndex(0);
    setIsTyping(true);
  }, [text]);

  useEffect(() => {
    if (!isTyping) return;
    if (currentIndex >= text.length) {
      setIsTyping(false);
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedText(prev => prev + text[currentIndex]);
      setCurrentIndex(prev => prev + 1);
    }, speed); // Speed of typing in milliseconds

    return () => clearTimeout(timer);
  }, [currentIndex, isTyping, speed, text]);

  return (
    <div className={`typewriter-text whitespace-pre-wrap ${className}`}>
      {displayedText}
      {isTyping && <span className="cursor">|</span>}
    </div>
  );
};

// Simple Toast (reuse or adapt existing one)
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto-close after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div className="fixed top-6 right-6 z-[100] bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
      <span>❌</span>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-white hover:text-gray-200">✕</button>
    </div>
  );
}

// Re-defining component props interface to ensure it's picked up
interface ProfileAIToolsProps {
  user: any; // The profile user being viewed (can be more specific if its type is defined and exported)
  onLoginClick: () => void; // Function to trigger login flow
}

export default function ProfileAITools({ user, onLoginClick }: ProfileAIToolsProps) {
  const { user: loggedInUser } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [savedResults, setSavedResults] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string>("");
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'configured' | 'missing'>('checking');
  const [showLoginDialog, setShowLoginDialog] = useState(false); // State for dialog visibility
  const [isStreaming, setIsStreaming] = useState<string | null>(null); // Track which tool is streaming
  const [saveSuccessAnimation, setSaveSuccessAnimation] = useState<boolean>(false); // State for save success animation
  const [roleInputs, setRoleInputs] = useState<Record<string, string>>({}); // Optional target role for tools that use it

  // Add a style element for our custom animations
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = fadeInAnimation;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Fetch API key status from the backend
  useEffect(() => {
    async function checkApiKeyStatus() {
      try {
        // Replace with your actual status endpoint
        const response = await fetch('/api/ai-tools/status');
        if (!response.ok) {
          throw new Error('Failed to fetch API key status');
        }
        const data = await response.json();
        // Assuming the endpoint returns { configured: true/false }
        setApiKeyStatus(data.configured ? 'configured' : 'missing');
      } catch (error) {
        console.error("Error checking API key status:", error);
        setApiKeyStatus('missing'); // Default to missing on error
      }
    }
    checkApiKeyStatus();
  }, []); // Run only once on mount

  // --- Updated handleRunTool for Seamless Transitions ---
  const handleRunTool = async (type: string) => {
    if (apiKeyStatus !== 'configured') {
      setToast("Service temporarily unavailable. Please try again later.");
      return;
    }

    console.log(`Running tool: ${type} (Enhanced Response Strategy)`);
    setLoading(type);
    setToast("");

    // Reset states
    setResults((prev) => ({ ...prev, [type]: "" }));
    setSavedResults((prev) => ({ ...prev, [type]: "" }));
    setIsStreaming(null);

    try {
      let endpoint = `/api/ai-tools/${type}?username=${encodeURIComponent(user?.login || user?.username || "")}`;
      const role = roleInputs[type]?.trim();
      if (role) {
        endpoint += `&role=${encodeURIComponent(role)}`;
      }
      await streamAIToolResult(endpoint, (cleanText) => {
        setResults((prev) => ({ ...prev, [type]: cleanText }));
      });
    } catch (err: any) {
      console.error(`Error running ${type}:`, err);
      setToast(err.message || "Unknown error running tool");
    } finally {
      setLoading(null);
      // Keep isStreaming active for a moment to ensure animation completes
      setTimeout(() => {
        setIsStreaming(null);
      }, 500);
    }
  };
  // --- End Updated handleRunTool ---

  // Function to handle saving the analysis
  const handleSaveAnalysis = async (type: string) => {
    // Check for logged in user
    if (!loggedInUser || !loggedInUser.login) {
      setShowLoginDialog(true);
      return;
    }

    if (results[type] && user?.login) {
      setLoading(`save-${type}`);
      try {
        await saveAnalysisResult(
          loggedInUser.login,
          type,
          results[type],
          user.login
        );
        setSavedResults((prev) => ({ ...prev, [type]: results[type] }));
        setToast(`${toolConfigs.find(t => t.type === type)?.label} saved successfully!`);
        setSaveSuccessAnimation(true);
        setTimeout(() => {
          setSaveSuccessAnimation(false);
        }, 1000);
      } catch (error) {
        console.error("Error saving analysis:", error);
        setToast("Failed to save analysis. Please try again.");
      } finally {
        setLoading(null);
      }
    } else if (!results[type]) {
      setToast("No analysis result to save.");
    } else if (!user?.login) {
      setToast("Cannot save analysis: Profile user information is missing.");
      console.error("User login/username is missing from the user prop.");
    }
  };

  const isConfigured = apiKeyStatus === 'configured';
  const isLoggedIn = !!loggedInUser;

  return (
    <TooltipProvider>
      <div className="w-full">
        {/* Render the Login Dialog */}
        <LoginDialog 
           isOpen={showLoginDialog} 
           onClose={() => setShowLoginDialog(false)} 
           onLogin={onLoginClick} 
        />
        
        <Tabs defaultValue={toolConfigs[0].type} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 mb-6">
            {toolConfigs.map((tool) => (
              <TabsTrigger key={tool.type} value={tool.type} className="text-xs sm:text-sm">
                <tool.icon className="h-3.5 w-3.5" />
                <span className="truncate">{tool.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {toolConfigs.map((tool) => (
            <TabsContent key={tool.type} value={tool.type}>
              <Card className="border-border/70 bg-card shadow-sm shadow-black/5">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal/10">
                      <tool.icon className="h-4 w-4 text-signal" />
                    </span>
                    <div>
                      <CardTitle className="font-display text-base sm:text-lg font-semibold leading-tight">{tool.label} Generator</CardTitle>
                      <CardDescription className="text-xs sm:text-sm text-muted-foreground">{tool.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm sm:text-base">
                  {/* Initial loading state */}
                  {loading === tool.type && !results[tool.type] ? (
                    <div className="flex flex-col items-center justify-center py-10">
                       <SimpleLoadingSpinner text="Processing..." />
                    </div>
                  // Render content area
                  ) : results[tool.type] ? (
                    <div className="relative min-h-[5rem] max-w-none rounded-lg border border-border/60 bg-muted/40 p-4 sm:p-5">
                      {/* AI enhancement indicator - small, subtle, in the top-right corner */}
                      {isStreaming === tool.type && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 text-xs text-signal animate-pulse">
                          <Sparkles className="h-3 w-3" />
                          <span className="sr-only">Enhancing...</span>
                        </div>
                      )}

                      {/* Content with phase-based rendering */}
                      <div className={isStreaming === tool.type ? 'opacity-50' : 'fade-in'}>
                        {isStreaming === tool.type ? (
                          // AI phase with typewriter effect
                          <pre className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed ai-response" dangerouslySetInnerHTML={{ __html: sanitizeAIHtml(results[tool.type]) }}></pre>
                        ) : (
                          // Preliminary phase or final result
                          <pre className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed ai-response" dangerouslySetInnerHTML={{ __html: sanitizeAIHtml(results[tool.type]) }}></pre>
                        )}
                      </div>
                    </div>
                  ) : savedResults[tool.type] ? (
                    <div className="min-h-[5rem] max-w-none rounded-lg border border-border/60 bg-muted/40 p-4 sm:p-5">
                       <p className="font-medium text-muted-foreground mb-2 text-xs sm:text-sm">Saved Analysis:</p>
                       <pre className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{savedResults[tool.type]}</pre>
                    </div>
                  ) : (
                     <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                       {/* Placeholder when no result and not loading */}
                     </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-wrap items-center gap-2 text-sm">
                  {tool.needsRole && (
                    <Input
                      value={roleInputs[tool.type] || ""}
                      onChange={(e) => setRoleInputs((prev) => ({ ...prev, [tool.type]: e.target.value }))}
                      placeholder="Target role (optional), e.g. Frontend Engineer"
                      className="h-9 w-full sm:w-64 text-xs sm:text-sm"
                    />
                  )}
                  <Button
                    onClick={() => handleRunTool(tool.type)}
                    disabled={!!loading || apiKeyStatus !== 'configured'}
                    variant="default"
                    size="sm"
                  >
                    {loading === tool.type ? "Generating..." : tool.actionVerb}
                  </Button>

                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <Button
                          onClick={() => handleSaveAnalysis(tool.type)} 
                          disabled={ 
                            !!loading || 
                            !results[tool.type] || 
                            savedResults[tool.type] === results[tool.type]
                          }
                          variant={saveSuccessAnimation ? undefined : "outline"}
                          size="sm"
                          className={saveSuccessAnimation ? "animate-pulse bg-green-600 text-white border-green-700" : ""}
                        >
                          <Bookmark className="mr-2 h-4 w-4" />
                          {saveSuccessAnimation
                            ? "Saved!"
                            : loading === `save-${tool.type}` ? "Saving..." :
                              (savedResults[tool.type] === results[tool.type] && results[tool.type] !== "") ? "Saved" :
                              "Save Analysis"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                  </Tooltip>
                </CardFooter>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

// Ensure necessary CSS/Tailwind setup exists for dark mode, shadcn components,
// and animations like animate-fade-in.
// Example utility classes potentially needed:
// .bg-card { background-color: hsl(var(--card)); }
// .text-muted-foreground { color: hsl(var(--muted-foreground)); }
// .bg-muted { background-color: hsl(var(--muted)); }
// etc. (shadcn/ui handles most of this if set up correctly)