"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function AuthReconnect({ 
  missingScope = "repo", 
  message = "Your GitHub token doesn't have permission to access private repositories." 
}: { 
  missingScope?: string;
  message?: string;
}) {
  const { login } = useAuth()

  return (
    <Alert className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Authentication scope required</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{message}</p>
        <p className="mt-2">To fix this, please reconnect your GitHub account with the necessary permissions.</p>
        <Button 
          className="mt-4" 
          onClick={login}
          variant="outline"
        >
          Reconnect GitHub Account
        </Button>
      </AlertDescription>
    </Alert>
  )
} 