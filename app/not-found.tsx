import Link from "next/link";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";

export const metadata = {
  title: "404 Page Not Found — New Balaji Transports",
  description: "The page you are looking for does not exist. Return to the New Balaji Transports homepage.",
};

export default function NotFound() {
  return (
    <div className="flex flex-col flex-grow w-full">

      <main className="flex-1 bg-background flex items-center justify-center py-20">
        <div className="mx-auto max-w-md px-4 text-center space-y-6">
          <div className="mx-auto h-20 w-20 bg-tertiary/10 text-tertiary rounded-full flex items-center justify-center">
            <AlertCircle className="h-10 w-10 animate-bounce" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold text-primary tracking-tight">404 — Page Not Found</h1>
            <p className="text-body-md text-slate-600 leading-relaxed">
              We couldn't find the page you were looking for. It might have been moved, deleted, or the URL might be incorrect.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-button bg-secondary text-white font-bold text-body-sm hover:bg-secondary/90 transition-colors shadow-level2"
            >
              <Home className="h-4 w-4" />
              Return Home
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-button border border-border bg-white text-primary font-bold text-body-sm hover:bg-slate-100 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </main>

    </div>
  );
}
