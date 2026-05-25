export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-24">
      <div className="animate-pulse space-y-8">
        <div className="h-8 w-48 bg-zinc-800 rounded" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border border-border rounded-xl p-4 bg-surface h-48" />
          ))}
        </div>
      </div>
    </div>
  );
}