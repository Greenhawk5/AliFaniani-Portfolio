export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className ?? ''}`}
    />
  )
}

export function EmptyState({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-edge-2 bg-panel/50 py-16 text-center">
      <p className="font-mono text-sm text-accent">{title}</p>
      {description && <p className="mt-2 max-w-sm text-sm text-mist">{description}</p>}
    </div>
  )
}
