export default function ReplayPage({ status, error, children }) {
  return (
    <>
      {status === 'loading' && (
        <div className="flex items-center justify-center min-h-screen text-white/30 text-sm">
          Loading…
        </div>
      )}

      {status === 'empty' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <p className="text-white/25 text-sm">No replay data available.</p>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>
      )}

      {status === 'ready' && children}
    </>
  )
}
