import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="container flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">Page Not Found</h2>
        <p className="mb-6 text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <Button asChild>
          <Link href="/">Go back home</Link>
        </Button>
      </div>
    </div>
  )
}
