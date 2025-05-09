"use client"

import { useState, useEffect, Key } from "react"
import { useAuth } from "@/components/auth-provider"
import { getSavedAnalyses, deleteAnalysis } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BookmarkIcon, 
  BrainCircuit, 
  ChevronRight, 
  Database, 
  Loader2, 
  RefreshCcw, 
  SortAsc, 
  Trash2,
  ArrowDownIcon,
  ArrowUpIcon,
  Filter
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { format } from "date-fns"
import { motion, HTMLMotionProps } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"

interface OldAnalysisDataFormat {
  data?: any; // The actual AI content in the old nested structure
  username?: string; // Old profile username storage
  title?: string; // Old title storage
  savedAt?: string; // Old savedAt storage (less reliable than top-level createdAt)
}

interface SavedAnalysisDoc { 
  id: string;
  type: string; 
  data: string | OldAnalysisDataFormat; // AI content (string) or old data object
  profileUsername: string; // Username of the profile analyzed (for new structure)
  createdAt: any; // Firestore timestamp (primary sort key)
}

interface MotionDivProps extends HTMLMotionProps<'div'> {}

export default function SavedAnalysesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [analyses, setAnalyses] = useState<SavedAnalysisDoc[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (authLoading) return
    
    if (!user || !user.login) { 
      if (!authLoading) router.push('/login?redirect=/saved-analyses');
      return
    }

    console.log(`[SavedAnalysesPage] useEffect triggered. User: ${user.login}, AuthLoading: ${authLoading}`);

    const unsubscribe = getSavedAnalyses(user.login, (data) => {
      console.log("[SavedAnalysesPage] Data received from getSavedAnalyses callback:", data);
      setAnalyses(data as SavedAnalysisDoc[]);
      setIsLoading(false);
      console.log("[SavedAnalysesPage] State 'analyses' updated. Length:", (data as SavedAnalysisDoc[]).length);
    });

    return () => {
      console.log("[SavedAnalysesPage] useEffect cleanup. Unsubscribing from getSavedAnalyses.");
      if (unsubscribe) unsubscribe();
    }
  }, [user, authLoading, router]); // Keep router in deps if its identity can change and affect logic

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date'
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return format(date, 'MMM d, yyyy h:mm a')
    } catch (e) {
      return 'Invalid date'
    }
  }

  const getAnalysisTypeIcon = (type: string) => {
    switch (type) {
      case 'summary':
        return <BrainCircuit className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500/70" />
      case 'optimizer':
        return <RefreshCcw className="h-8 w-8 sm:h-10 sm:w-10 text-green-500/70" />
      case 'recommendations':
        return <Database className="h-8 w-8 sm:h-10 sm:w-10 text-purple-500/70" />
      default:
        return <BookmarkIcon className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/70" />
    }
  }

  const getAnalysisTypeColor = (type: string) => {
    switch (type) {
      case 'summary':
        return "bg-blue-500/15 text-blue-500 border-blue-200/30"
      case 'optimizer':
        return "bg-green-500/15 text-green-500 border-green-200/30"
      case 'recommendations':
        return "bg-purple-500/15 text-purple-500 border-purple-200/30"
      default:
        return "bg-gray-500/15 text-gray-500 border-gray-200/30"
    }
  }

  const getAnalysisTypeLabel = (type: string) => {
    switch (type) {
      case 'summary': return 'Summary'
      case 'optimizer': return 'Optimizer'
      case 'recommendations': return 'Recommendations'
      default: return 'Analysis'
    }
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const filteredAnalyses = analyses.filter(analysis => {
    if (activeFilter === "all") return true
    return analysis.type === activeFilter
  })

  const sortedAnalyses = [...filteredAnalyses].sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0)
    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0)
    
    return sortOrder === 'asc' 
      ? dateA.getTime() - dateB.getTime()
      : dateB.getTime() - dateA.getTime()
  })

  const handleDeleteAnalysis = async (id: string) => {
    if (!user || !user.login) {
        toast({ title: "Error", description: "You must be logged in to delete analyses.", variant: "destructive" });
        return;
    }
    // Optional: Add a confirmation dialog here
    // if (!confirm("Are you sure you want to delete this analysis?")) {
    //    return;
    // }
    
    console.log(`[handleDeleteAnalysis] Calling deleteAnalysis for ID: ${id} by user: ${user.login}`);
    try {
        await deleteAnalysis(user.login, id);
        toast({ title: "Success", description: "Analysis deleted successfully.", variant: "default" });
        // No need to manually remove from state, onSnapshot should update the list
    } catch (error: any) {
        console.error("Error in handleDeleteAnalysis:", error);
        toast({ 
            title: "Deletion Failed", 
            description: error.message || "Could not delete the analysis. Please try again.", 
            variant: "destructive" 
        });
    }
  };

  const loadingMotionProps: MotionDivProps = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.5, ease: "easeOut" },
  }
  
  const textMotionProps = (delay = 0.2): MotionDivProps => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.5 },
  })

  if (isLoading || authLoading) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50">
        <motion.div {...loadingMotionProps} className="flex flex-col items-center gap-6 text-center p-8">
          <div className="relative">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-70 blur-lg animate-pulse"></div>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, ease: "linear", repeat: Infinity }}
              className="relative rounded-full p-3 bg-black/90"
            >
              <motion.div
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
              >
                <Loader2 className="h-12 w-12 text-primary" />
              </motion.div>
            </motion.div>
          </div>
          <div className="space-y-3 max-w-md">
            <motion.h3 {...textMotionProps(0.2)} className="text-2xl font-semibold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              Loading your saved analyses
            </motion.h3>
            <motion.p {...textMotionProps(0.3)} className="text-muted-foreground text-lg">
              We're retrieving your saved analyses. This should only take a moment...
            </motion.p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl mx-auto py-10 px-6 sm:px-8 lg:py-14">
      {/* Remove Temporary count display for debugging */}
      {/* <div className="my-4 p-2 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded">
        Debug: Number of analyses in state: {analyses.length}
        <br />
        User: {user?.login || 'Not logged in'}
        <br />
        Auth Loading: {authLoading.toString()}, Page Loading: {isLoading.toString()}
      </div> */}

      <motion.div {...textMotionProps(0)} className="mb-12 flex flex-col items-center text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
          Saved Analyses
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Access all your previously saved GitHub profile analyses and insights in one place
        </p>
        <Separator className="mt-6 w-full" />
      </motion.div>

      <Tabs 
        defaultValue="all" 
        className="space-y-8 max-w-[1200px] mx-auto"
        onValueChange={(value) => setActiveFilter(value)}
      >
        <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center px-2">
          <TabsList className="overflow-x-auto py-1 px-0 bg-transparent flex-wrap">
            <TabsTrigger value="all" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              All
            </TabsTrigger>
            <TabsTrigger value="summary" className="rounded-full data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              Summary
            </TabsTrigger>
            <TabsTrigger value="optimizer" className="rounded-full data-[state=active]:bg-green-500 data-[state=active]:text-white">
              Optimizer
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="rounded-full data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              Recommendations
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 rounded-full"
              onClick={toggleSortOrder}
            >
              {sortOrder === 'desc' ? <ArrowDownIcon className="h-4 w-4" /> : <ArrowUpIcon className="h-4 w-4" />}
              <span className="hidden sm:inline">Sort by Date</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-full">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filter (Legacy)</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Most recent</DropdownMenuItem>
                <DropdownMenuItem>By GitHub user</DropdownMenuItem>
                <DropdownMenuItem>By analysis type</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sortedAnalyses.length === 0 && !isLoading ? (
            <motion.div {...textMotionProps(0)} className="col-span-full text-center py-10">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="inline-block p-6 bg-muted rounded-full shadow-md mb-6"
              >
                <BookmarkIcon className="h-16 w-16 text-muted-foreground/60" />
              </motion.div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No saved analyses yet.</h3>
              <p className="text-muted-foreground">
                Analyses you save will appear here. Try generating one from a profile!
              </p>
            </motion.div>
          ) : (
            sortedAnalyses.map((analysis: SavedAnalysisDoc, index: Key | null | undefined) => (
              <motion.div
                key={analysis.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: typeof index === 'number' ? index * 0.05 : 0 }}
              >
                <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out overflow-hidden dark:bg-gray-800/70 dark:border-gray-700/60">
                  <CardHeader className="p-5 flex-shrink-0">
                    <div className="flex items-start justify-between mb-2">
                      {getAnalysisTypeIcon(analysis.type)}
                      <Badge variant="outline" className={`capitalize ${getAnalysisTypeColor(analysis.type)}`}>
                        {getAnalysisTypeLabel(analysis.type)}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-semibold leading-tight">
                      {getAnalysisTypeLabel(analysis.type)} for {analysis.profileUsername || (typeof analysis.data === 'object' && analysis.data.username) || 'Unknown User'}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                      Saved on {formatDate(analysis.createdAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 flex-grow overflow-hidden">
                    <p className="text-sm text-muted-foreground line-clamp-3 break-words">
                      {typeof analysis.data === 'string' 
                        ? analysis.data 
                        : (typeof analysis.data === 'object' && analysis.data.data)
                          ? String(analysis.data.data)
                          : 'Content not available'}
                    </p>
                  </CardContent>
                  <CardFooter className="p-5 border-t dark:border-gray-700/50 flex justify-between items-center bg-muted/30 dark:bg-gray-900/40">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1.5 px-2"
                      onClick={() => handleDeleteAnalysis(analysis.id)}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                    <Link href={`/saved-analyses/${analysis.id}`} passHref legacyBehavior>
                      <Button asChild size="sm" className="gap-1.5">
                        <a>View Analysis <ChevronRight className="h-4 w-4" /></a>
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </Tabs>
    </div>
  )
}