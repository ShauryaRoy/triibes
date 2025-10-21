export function PageSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#0b1220' }}>
      <div className="h-16 border-b border-white/5" /> {/* Header space */}
      
      <div className="container mx-auto p-6">
        {/* Title skeleton */}
        <div className="h-8 w-64 rounded-lg bg-white/10 mb-6 animate-pulse" />
        
        {/* Grid of card skeletons */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div 
              key={i} 
              className="h-48 rounded-xl border border-white/10 bg-white/5 animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MinimalSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b1220', color: '#f8fafc' }}>
      <div className="mx-auto h-8 w-8 rounded-full border-3 border-white/20 border-t-white animate-spin" aria-label="Loading" />
    </div>
  );
}
