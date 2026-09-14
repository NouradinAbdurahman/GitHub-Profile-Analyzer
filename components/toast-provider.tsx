"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, XCircle, X } from "lucide-react"

const TOAST_LIMIT = 4
const TOAST_DURATION_MS = 5000

type ToastVariant = "default" | "destructive"

interface ToastInput {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: ToastVariant
}

interface ToasterToast extends ToastInput {
  id: string
}

interface ToastContextValue {
  toast: (input: ToastInput) => { id: string; dismiss: () => void }
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([])
  const countRef = React.useRef(0)

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback(
    ({ title, description, variant = "default" }: ToastInput) => {
      const id = (++countRef.current).toString()
      setToasts((current) => [{ id, title, description, variant }, ...current].slice(0, TOAST_LIMIT))
      setTimeout(() => dismiss(id), TOAST_DURATION_MS)
      return { id, dismiss: () => dismiss(id) }
    },
    [dismiss]
  )

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-stretch gap-2 p-4 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-full sm:max-w-sm sm:items-end">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const isError = t.variant === "destructive"
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="pointer-events-auto relative w-full overflow-hidden rounded-xl border bg-card/95 p-4 shadow-lg backdrop-blur"
                style={{ borderColor: isError ? "rgb(239 68 68 / 0.35)" : "rgb(99 102 241 / 0.35)" }}
              >
                <div className="flex items-start gap-3">
                  {isError ? (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    {t.title && <p className="text-sm font-semibold leading-tight">{t.title}</p>}
                    {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                  </div>
                  <button
                    onClick={() => dismiss(t.id)}
                    aria-label="Dismiss notification"
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <motion.div
                  className={isError ? "absolute bottom-0 left-0 h-0.5 bg-red-500" : "absolute bottom-0 left-0 h-0.5 bg-indigo-500"}
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 5, ease: "linear" }}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>")
  }
  return ctx
}
