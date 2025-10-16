import * as React from "react";

import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      className={cn("animate-spin rounded-full border-b-2 border-current", className)}
      {...props}
    />
  );
} 