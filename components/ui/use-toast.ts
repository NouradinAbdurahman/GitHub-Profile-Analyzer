"use client"

import { useToastContext } from "@/components/toast-provider"

function useToast() {
  const { toast } = useToastContext()
  return { toast }
}

export { useToast }
