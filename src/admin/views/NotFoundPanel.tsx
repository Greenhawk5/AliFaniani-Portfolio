/**
 * NotFound — the shell's fallback for unknown routes. Renders what the user
 * can do from here (navigate + help pointers), nothing else.
 */

export function NotFoundPanel() {
  return (
    <div className="mx-auto max-w-lg space-y-5 py-10 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber">System</p>
      <h1 className="text-2xl font-semibold text-frost">Page not found</h1>
      <p className="text-sm leading-relaxed text-mist">
        This console route does not exist. Nothing here is broken — use the navigation to reach a working
        section, or check the pointers below.
      </p>
      <dl className="mx-auto max-w-sm space-y-2 rounded-xl border border-edge bg-panel/60 p-4 text-left">
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wider text-mist">Content</dt>
          <dd className="text-sm text-mist">Edit projects, profile, links — Content section.</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wider text-mist">Publish</dt>
          <dd className="text-sm text-mist">D1 promotion, sync status — Publishing.</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wider text-mist">History</dt>
          <dd className="text-sm text-mist">Audit trail — Activity.</dd>
        </div>
      </dl>
    </div>
  )
}
