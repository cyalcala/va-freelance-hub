"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-24 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-400/30 bg-red-400/10 text-red-400 text-xs font-mono mb-6">
        Error
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h1>
      <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors text-sm"
      >
        Try again
      </button>
    </div>
  );
}