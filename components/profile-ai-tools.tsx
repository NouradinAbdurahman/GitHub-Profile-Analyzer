import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleLoadingSpinner } from "@/components/loading-spinner"; // Assuming this exists
import { Bookmark, CheckCircle2, XCircle, Sparkles, Play, Pause } from "lucide-react"; // Added Play and Pause
import { saveAnalysisResult } from "@/lib/firebase"; // Import the save function
import { stripMarkdownSymbols } from "@/lib/text-normalizer"; // Import the stripMarkdownSymbols function
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

const toolConfigs = [
  {
    type: "summary",
    label: "Profile Summary",
    description: "Auto-generates a concise summary of the profile based on stats.",
    emoji: "✨",
    actionVerb: "Generate Summary",
  },
  {
    type: "optimizer",
    label: "Profile Optimizer",
    description: "Analyzes and suggests improvements for the profile.",
    emoji: "⚙️",
    actionVerb: "Analyze Profile",
  },
  {
    type: "recommendations",
    label: "Repo Recommendations", // Changed label based on image
    description: "Gives personalized recommendations for growth and collaboration.",
    emoji: "🌟",
    actionVerb: "Get Recommendations",
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

// 1. Add a helper function to wait while paused:
function waitWhilePaused(type: string, paused: Record<string, boolean>) {
  return new Promise<void>((resolve) => {
    if (!paused[type]) return resolve();
    const interval = setInterval(() => {
      if (!paused[type]) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
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
  const [paused, setPaused] = useState<Record<string, boolean>>({}); // Add a paused state for each tool

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

  // Helper function to generate instant preliminary results based on GitHub data
  const generatePreliminaryResult = (type: string, userData: any) => {
    const { login, name, bio, public_repos, followers, following, created_at } = userData || {};
    const joinDate = created_at ? new Date(created_at).toLocaleDateString() : 'unknown date';
    const userName = name || login || 'this user';
    
    switch(type) {
      case 'summary':
        return `${userName} is a GitHub user with ${public_repos || 0} repositories, active since ${joinDate}. With ${followers || 0} followers and following ${following || 0} users, their profile suggests a focus on ${following > followers ? 'learning and collaboration' : 'independent development or private projects'}.`;
      
      case 'optimizer':
        return `## Profile Observations
* ${bio ? 'Bio exists but could potentially be enhanced' : 'Adding a bio would improve profile visibility'}
* Repository count: ${public_repos || 0} ${public_repos > 5 ? '(good variety)' : '(consider adding more public projects)'}
* Profile engagement: ${followers || 0} followers, ${following || 0} following`;
      
      case 'recommendations':
        return `## Potential Opportunities

Based on your profile stats and activity patterns:

1. Consider exploring projects aligned with your repository themes
2. Look for collaboration opportunities in related communities
3. Enhance visibility through consistent contributions`;
        
      default:
        return "Processing...";
    }
  };
  
  // --- Updated handleRunTool for Seamless Transitions ---
  const handleRunTool = async (type: string) => {
    if (apiKeyStatus !== 'configured') {
      setToast("AI Tools API Key not configured correctly.");
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
      // STEP 1: Fetch GitHub data 
      const userDataResponse = await fetch(`/api/github/user/${encodeURIComponent(user?.login || user?.username || "")}`);
      
      if (!userDataResponse.ok) {
        throw new Error(`Failed to fetch GitHub data: ${userDataResponse.status}`);
      }
      
      const userData = await userDataResponse.json();
      
      // STEP 3: After a brief moment, call AI service
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endpoint = `/api/ai-tools/${type}?username=${encodeURIComponent(user?.login || user?.username || "")}`;
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to run ${type}. Status: ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error("Response body is missing.");
      }
      
      // Stream handling 
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedResponse = ""; 
      let unprocessedText = "";
      
      // Process the stream
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: !done });
        unprocessedText += chunk;
        
        // Process buffer line by line for SSE messages
        let eolIndex;
        while ((eolIndex = unprocessedText.indexOf('\n')) >= 0) {
          const line = unprocessedText.substring(0, eolIndex).trim();
          unprocessedText = unprocessedText.substring(eolIndex + 1);
          
          if (line.startsWith("data:")) {
            const jsonData = line.substring(5).trim();
            if (jsonData === "[DONE]") {
              done = true;
              break;
            }
            
            try {
              const parsed = JSON.parse(jsonData);
              const deltaContent = parsed.choices?.[0]?.delta?.content;
              if (deltaContent) {
                accumulatedResponse += deltaContent;
                
                // Once we have a substantial AI response, switch to AI phase
                if (accumulatedResponse.length > 50) {
                  // Strip markdown symbols from the response
                  const cleanResponse = stripMarkdownSymbols(accumulatedResponse);
                  setResults(prev => ({ ...prev, [type]: cleanResponse }));
                }
              }
              
              if (parsed.choices?.[0]?.finish_reason === 'stop') {
                done = true;
              }
            } catch (e) {
              // Handle parsing errors
            }
          }
        }
        
        // 2. In handleRunTool, after processing each chunk in the streaming loop, add:
        await waitWhilePaused(type, paused);
      }
      
      // Ensure final content is set with stripped markdown
      if (accumulatedResponse.length > 0) {
        const cleanResponse = stripMarkdownSymbols(accumulatedResponse);
        setResults(prev => ({ ...prev, [type]: cleanResponse }));
      }
      
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
          <TabsList className="grid w-full grid-cols-3 mb-4">
            {toolConfigs.map((tool) => (
              <TabsTrigger key={tool.type} value={tool.type} className="text-[8px] sm:text-xs md:text-sm">{tool.label}</TabsTrigger>
            ))}
          </TabsList>

          {toolConfigs.map((tool) => (
            <TabsContent key={tool.type} value={tool.type}>
              <Card className="bg-card border-border shadow-lg dark:bg-gray-800/60 dark:border-gray-700/50">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-[12px] sm:text-lg font-semibold">{tool.label} Generator</CardTitle>
                    {apiKeyStatus === 'checking' ? (
                      <span className="text-[10px] sm:text-xs text-muted-foreground">Checking config...</span>
                    ) : isConfigured ? (
                      <span className="text-[10px] sm:text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> API key configured
                      </span>
                    ) : (
                      <span className="text-[10px] sm:text-xs text-red-500 flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> API key needed
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-[10px] sm:text-xs text-muted-foreground">{tool.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-[10px] sm:text-xs">
                  {/* Initial loading state */}
                  {loading === tool.type && !results[tool.type] ? (
                    <div className="flex flex-col items-center justify-center py-10"> 
                       <SimpleLoadingSpinner text="Processing..." />
                    </div>
                  // Render content area
                  ) : results[tool.type] ? (
                    <div className="p-4 rounded-md bg-muted/50 dark:bg-gray-700/40 min-h-[5rem] prose dark:prose-invert max-w-none relative text-[10px] sm:text-xs"> 
                      {/* AI enhancement indicator - small, subtle, in the top-right corner */}
                      {isStreaming === tool.type && (
                        <div className="absolute top-2 right-2 text-xs flex items-center gap-1 text-blue-500 dark:text-blue-400 animate-pulse">
                          <Sparkles className="h-3 w-3" />
                          <span className="sr-only">Enhancing...</span>
                        </div>
                      )}
                      
                      {/* Content with phase-based rendering */}
                      <div className={isStreaming === tool.type ? 'opacity-50' : 'fade-in'}>
                        {isStreaming === tool.type ? (
                          // AI phase with typewriter effect
                          <pre className="whitespace-pre-wrap text-xs ai-response" dangerouslySetInnerHTML={{ __html: results[tool.type] }}></pre>
                        ) : (
                          // Preliminary phase or final result
                          <pre className="whitespace-pre-wrap text-xs ai-response" dangerouslySetInnerHTML={{ __html: results[tool.type] }}></pre>
                        )}
                      </div>
                    </div>
                  ) : savedResults[tool.type] ? (
                    <div className="p-4 rounded-md bg-muted/50 dark:bg-gray-700/40 min-h-[5rem] prose dark:prose-invert max-w-none text-[10px] sm:text-xs">
                       <p className="font-medium text-muted-foreground mb-2">Saved Analysis:</p>
                       <pre className="whitespace-pre-wrap text-xs">{savedResults[tool.type]}</pre>
                    </div>
                  ) : (
                     <div className="flex items-center justify-center h-24 text-[10px] sm:text-xs"> 
                       {/* Placeholder when no result and not loading */}
                     </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-start gap-2 text-[10px] sm:text-xs">
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