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

  // Return an empty fragment instead of displaying any status messages
  return null;
}
