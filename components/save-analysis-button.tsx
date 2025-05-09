"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { saveAnalysisResult } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { BookmarkIcon, BookmarkCheckIcon, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SaveAnalysisButtonProps {
  type: string
  data: any
  username: string
  title?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
}

export function SaveAnalysisButton({
  type,
  data,
  username,
  title: initialTitle,
  variant = "outline"
}: SaveAnalysisButtonProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(initialTitle || `${type} for ${username}`)

  const handleSave = async () => {
    if (!user?.login) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save analysis results.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      await saveAnalysisResult(user.login, type, {
        title,
        data,
        username,
        savedAt: new Date().toISOString(),
      })
      
      toast({
        title: "Analysis saved",
        description: "Your analysis results have been saved successfully.",
      })
      setOpen(false)
    } catch (error) {
      console.error("Failed to save analysis:", error)
      toast({
        title: "Failed to save analysis",
        description: "An error occurred while saving your analysis. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm" className="gap-2">
          <BookmarkIcon className="h-4 w-4" />
          <span>Save Analysis</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Analysis</DialogTitle>
          <DialogDescription>
            Save this analysis to your account for future reference.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Type</Label>
            <div className="col-span-3 text-sm text-muted-foreground capitalize">
              {type.replace(/([A-Z])/g, ' $1').trim()}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Profile</Label>
            <div className="col-span-3 text-sm text-muted-foreground">
              {username}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Analysis</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 