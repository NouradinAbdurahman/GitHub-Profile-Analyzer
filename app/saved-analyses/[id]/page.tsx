"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { useRouter, useParams } from "next/navigation"
import { doc, getDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  ArrowLeft, 
  Calendar,
  Loader2,
  User,
  BookmarkIcon,
  BrainCircuit,
  RefreshCcw,
  Database,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { SimpleLoadingSpinner } from "@/components/loading-spinner"

interface SavedAnalysisDoc {
  id: string;
  type: string;
  data: string | { data?: any; username?: string };
  profileUsername: string;
  createdAt: Timestamp;
}

export default function ViewSavedAnalysisPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [analysis, setAnalysis] = useState<SavedAnalysisDoc | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : null

  useEffect(() => {
    if (authLoading) return
    
    if (!user || !user.login) {
      if (!authLoading) router.push('/login?redirect=/saved-analyses')
      return
    }

    if (!id) {
      setError('Invalid analysis ID.')
      setIsLoading(false)
      return
    }

    const fetchAnalysis = async () => {
      setIsLoading(true)
      setError(null)
      try {
        if (!db) {
          throw new Error("Firestore not initialized")
        }
        const docRef = doc(db, 'users', user.login, 'savedAnalyses', id)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const docData = docSnap.data()
          if (docData && docData.type && docData.data && docData.createdAt) {
            setAnalysis({ 
              id: docSnap.id, 
              type: docData.type,
              data: docData.data, 
              profileUsername: docData.profileUsername || (typeof docData.data === 'object' ? docData.data.username : 'Unknown'),
              createdAt: docData.createdAt as Timestamp
            })
          } else {
            throw new Error("Fetched document is missing required fields.")
          }
        } else {
          setError('Analysis not found.')
        }
      } catch (err: any) {
        console.error("Error fetching analysis:", err)
        setError(err.message || 'Failed to load analysis.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalysis()
  }, [id, user, authLoading, router])

  const getAnalysisTypeIcon = (type: string) => {
    switch (type) {
      case 'summary':
        return <BrainCircuit className="h-5 w-5 mr-2 text-blue-500" />
      case 'optimizer':
        return <RefreshCcw className="h-5 w-5 mr-2 text-green-500" />
      case 'recommendations':
        return <Database className="h-5 w-5 mr-2 text-purple-500" />
      default:
        return <BookmarkIcon className="h-5 w-5 mr-2 text-muted-foreground" />
    }
  }

  const getAnalysisTypeLabel = (type: string) => {
    switch (type) {
      case 'summary':
        return 'Summary'
      case 'optimizer':
        return 'Optimizer'
      case 'recommendations':
        return 'Recommendations'
      default:
        return 'Analysis'
    }
  }

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'Unknown date'
    
    try {
      return format(timestamp.toDate(), 'PPPp')
    } catch (e) {
      console.error("Error formatting date:", e)
      return 'Invalid date'
    }
  }

  const analysisContent = typeof analysis?.data === 'string' 
    ? analysis.data 
    : (typeof analysis?.data === 'object' && analysis?.data?.data)
      ? String(analysis.data.data)
      : 'No content available.'

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <SimpleLoadingSpinner text="Loading analysis..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-4xl py-12">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/70" />
          </div>
          <h2 className="text-2xl font-bold">Analysis not found</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            {error}
          </p>
          <Button asChild>
            <Link href="/saved-analyses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Saved Analyses
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-6 gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Saved Analyses
      </Button>

      {analysis && !error && (
        <Card className="overflow-hidden shadow-lg dark:bg-gray-800/70 dark:border-gray-700/60">
          <CardHeader className="bg-muted/30 dark:bg-gray-900/40 p-6 border-b dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center font-semibold text-lg">
                {getAnalysisTypeIcon(analysis.type)}
                {getAnalysisTypeLabel(analysis.type)} Analysis
              </span>
              <Link href={`/profile/${analysis.profileUsername}`} className="text-sm text-primary hover:underline">
                Profile: {analysis.profileUsername}
              </Link>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Saved on: {formatDate(analysis.createdAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words">
              {analysisContent}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 