"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Unhandle exception boundary caught:", error);
  }, [error]);

  return (
    <div className="flex flex-col flex-grow w-full">

      <main className="flex-1 bg-background flex items-center justify-center py-20">
        <div className="mx-auto max-w-md px-4 text-center space-y-6">
          <div className="mx-auto h-20 w-20 bg-error/10 text-error rounded-full flex items-center justify-center">
            <AlertCircle className="h-10 w-10 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold text-primary tracking-tight">System Error</h1>
            <p className="text-body-md text-slate-600 leading-relaxed">
              An unexpected error occurred in our system. The operations log has recorded this event, and our team is monitoring it.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-button bg-secondary text-white font-bold text-body-sm hover:bg-secondary/90 transition-colors shadow-level2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-button border border-border bg-white text-primary font-bold text-body-sm hover:bg-slate-100 transition-colors"
            >
              <Home className="h-4 w-4" />
              Return Home
            </Link>
          </div>
        </div>
      </main>

    </div>
  );
}
