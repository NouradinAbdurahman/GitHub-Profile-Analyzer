"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function ProfileLoading() {
  // This ensures the loading spinner is removed when the page component mounts
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This will run only on the client side
    setIsClient(true);

    // Set a maximum timeout for the loading spinner (5 seconds)
    const timeout = setTimeout(() => {
      setIsClient(true);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  // Don't show loading spinner if we're on the client and the page has loaded
  if (isClient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <LoadingSpinner size="lg" text="Loading profile data" />
    </div>
  );
}
