"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function GlobalLoading() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Set a maximum timeout for the loading spinner (8 seconds)
    const timeout = setTimeout(() => {
      setVisible(false);
    }, 8000);

    return () => clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <LoadingSpinner size="xl" text="Loading" />
    </div>
  );
}
