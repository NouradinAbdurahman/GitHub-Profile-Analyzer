'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { XCircle, AlertTriangle, RefreshCcw, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Profile error:', error);
  }, [error]);

  let title = 'Error Loading Profile';
  let message = 'Something went wrong while loading this GitHub profile. Please try again.';
  let icon = <AlertTriangle className="h-12 w-12 text-amber-600" />;

  // Customize based on error message
  if (error.message.includes('rate limit')) {
    title = 'GitHub API Rate Limit Exceeded';
    message = 'We\'ve hit GitHub\'s API rate limits. Please try again in a few minutes.';
    icon = <AlertTriangle className="h-12 w-12 text-amber-600" />;
  } else if (error.message.includes('not found')) {
    title = 'GitHub Profile Not Found';
    message = 'The GitHub username you entered could not be found. Please check the spelling and try again.';
    icon = <XCircle className="h-12 w-12 text-red-600" />;
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-md dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex justify-center">{icon}</div>
        <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
        <p className="mb-6 text-gray-500 dark:text-gray-400">{message}</p>
        
        <div className="flex flex-col space-y-3">
          <Button onClick={reset} variant="outline" className="w-full">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          
          <Button 
            onClick={() => router.back()} 
            variant="ghost" 
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          
          <Link href="/" className="w-full">
            <Button variant="secondary" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 