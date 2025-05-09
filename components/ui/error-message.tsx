"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./button";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

/**
 * A user-friendly error message component with optional retry button
 */
export function ErrorMessage({ 
  title = "An error occurred", 
  message, 
  onRetry 
}: ErrorMessageProps) {
  return (
    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 my-4 text-red-100">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-5 w-5 text-red-400" />
        <h3 className="font-semibold text-red-200">{title}</h3>
      </div>
      
      <p className="text-sm mb-3">{message}</p>
      
      {onRetry && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          className="bg-red-950/50 border-red-800 hover:bg-red-950 text-red-200"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}
