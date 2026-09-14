/**
 * Structured link editor — links are tiny ({label, href}), so the form is
 * two fields. Presets make the common social destinations one click.
 */

import { Field, inputClasses } from './Field'

export interface LinkDraft {
  label: string
  href: string
}

interface Props {
  value: LinkDraft
  onChange: (next: LinkDraft) => void
}

/** Quick label presets shown as one-tap chips (purely client-side shortcuts). */
const PRESETS = ['GitHub', 'LinkedIn', 'Telegram', 'Email', 'Website', 'X (Twitter)']

export function LinkForm({ value, onChange }: Props) {
  return (
    <div className="space-y-4">
      <Field label="Label" hint="shown in the footer/contact UI">
        <input
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          className={inputClasses}
          required
        />
      </Field>
      <div className="flex flex-wrap gap-1.5" aria-label="Label presets">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange({ ...value, label: preset })}
            className="cursor-pointer rounded-full border border-edge-2 bg-panel-2 px-2.5 py-1 font-mono text-[10px] text-mist transition-colors hover:border-accent/50 hover:text-accent"
          >
            {preset}
          </button>
        ))}
      </div>
      <Field label="URL" hint="https://… or mailto:">
        <input
          value={value.href}
          onChange={(e) => onChange({ ...value, href: e.target.value })}
          className={`${inputClasses} font-mono text-xs`}
          spellCheck={false}
          required
        />
      </Field>
      {value.href && !/^(https?:\/\/|mailto:)/.test(value.href) && (
        <p className="text-xs text-amber">Must start with https://, http:// or mailto: — the server validates on save.</p>
      )}
    </div>
  )
}
