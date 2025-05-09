"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function ApiKeyStatus() {
  const [status, setStatus] = useState<"loading" | "configured" | "not_configured" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    async function checkApiKeyStatus() {
      try {
        const response = await fetch("/api/ai/status");
        if (!response.ok) {
          setStatus("error");
          setMessage("Failed to check API key status");
          return;
        }

        const data = await response.json();
        setStatus(data.status);
        setMessage(data.message);
      } catch (error) {
        setStatus("error");
        setMessage("Error checking API key status");
      }
    }

    checkApiKeyStatus();
  }, []);

  if (status === "loading") {
    return <div className="text-sm text-gray-400">Checking API key status...</div>;
  }

  if (status === "configured") {
    return (
      <div className="flex items-center text-sm text-green-400">
        <CheckCircle className="h-4 w-4 mr-1" />
        <span>API key configured</span>
      </div>
    );
  }

  return (
    <div className="flex items-center text-sm text-red-400">
      <AlertCircle className="h-4 w-4 mr-1" />
      <span>{message || "API key not configured"}</span>
    </div>
  );
}
