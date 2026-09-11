/**
 * Structured project editor (Phase 6A) — covers the full canonical Project
 * schema (src/lib/content-schema.ts): identity, banner + MediaPicker,
 * screenshots, technologies/techGroups, features, architecture, links.
 * bannerConfig stays a JSON block (rarely edited crop metadata).
 */

import { Button } from '@/components/ui/Button'
import { Field, inputClasses } from './Field'
import { MediaPicker } from './MediaPicker'

export interface ProjectDraft {
  slug: string
  title: string
  subtitle: string
  shortDescription: string
  overview: string
  category: string
  year: number
  banner: string
  bannerConfig?: Record<string, unknown>
  screenshots: { src: string; caption: string }[]
  technologies: string[]
  techGroups: { label: string; items: string[] }[]
  features: string[]
  architecture: string[]
  repository: string
  demo?: string
  demoStatus?: string
  documentation?: string
}

interface Props {
  value: ProjectDraft
  onChange: (next: ProjectDraft) => void
}

export function ProjectForm({ value, onChange }: Props) {
  const set = <K extends keyof ProjectDraft>(key: K, next: ProjectDraft[K]) =>
    onChange({ ...value, [key]: next })

  const listHelpers = {
    addItem: (key: 'technologies' | 'features' | 'architecture') => set(key, [...value[key], '']),
    removeItem: (key: 'technologies' | 'features' | 'architecture', index: number) =>
      set(key, value[key].filter((_, i) => i !== index)),
    setItem: (key: 'technologies' | 'features' | 'architecture', index: number, item: string) =>
      set(key, value[key].map((v, i) => (i === index ? item : v))),
  }

  return (
    <div className="space-y-5">
      <fieldset className="space-y-3 rounded-xl border border-edge p-4">
        <legend className="px-1 font-mono text-[10px] uppercase tracking-wider text-mist">Identity</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Slug" hint="URL id, lowercase-dashed">
            <input
              value={value.slug}
              onChange={(e) => set('slug', e.target.value)}
              className={`${inputClasses} font-mono text-xs`}
              spellCheck={false}
              required
            />
          </Field>
          <Field label="Title">
            <input value={value.title} onChange={(e) => set('title', e.target.value)} className={inputClasses} required />
          </Field>
          <Field label="Category">
            <input value={value.category} onChange={(e) => set('category', e.target.value)} className={inputClasses} required />
          </Field>
          <Field label="Year">
            <input
              type="number"
              min={2000}
              max={2100}
              value={value.year}
              onChange={(e) => set('year', Number(e.target.value))}
              className={inputClasses}
              required
            />
          </Field>
        </div>
        <Field label="Subtitle">
          <input value={value.subtitle} onChange={(e) => set('subtitle', e.target.value)} className={inputClasses} required />
        </Field>
        <Field label="Short description" hint="cards, meta description">
          <textarea value={value.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} rows={2} className={inputClasses} required />
        </Field>
        <Field label="Overview" hint="case-study intro">
          <textarea value={value.overview} onChange={(e) => set('overview', e.target.value)} rows={4} className={inputClasses} required />
        </Field>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-edge p-4">
        <legend className="px-1 font-mono text-[10px] uppercase tracking-wider text-mist">Media</legend>
        <MediaPicker label="Banner" value={value.banner} onChange={(banner) => set('banner', banner)} filter={(p) => p.includes('/project/')} />
        <div className="space-y-2">
          <span className="block text-xs font-medium uppercase tracking-wider text-mist">Screenshots</span>
          {value.screenshots.map((shot, index) => (
            <div key={index} className="space-y-2 rounded-lg border border-edge p-3">
              <MediaPicker
                label={`Screenshot ${index + 1}`}
                value={shot.src}
                onChange={(src) => set('screenshots', value.screenshots.map((s, i) => (i === index ? { ...s, src } : s)))}
                filter={(p) => p.includes('/project/')}
              />
              <Field label="Caption">
                <input
                  value={shot.caption}
                  onChange={(e) => set('screenshots', value.screenshots.map((s, i) => (i === index ? { ...s, caption: e.target.value } : s)))}
                  className={inputClasses}
                />
              </Field>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set('screenshots', value.screenshots.filter((_, i) => i !== index))}
              >
                Remove screenshot
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => set('screenshots', [...value.screenshots, { src: '', caption: '' }])}>
            + Add screenshot
          </Button>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-edge p-4">
        <legend className="px-1 font-mono text-[10px] uppercase tracking-wider text-mist">Technology & highlights</legend>
        <StringList
          label="Technologies"
          items={value.technologies}
          helpers={{
            addItem: () => listHelpers.addItem('technologies'),
            removeItem: (index) => listHelpers.removeItem('technologies', index),
            setItem: (index, item) => listHelpers.setItem('technologies', index, item),
          }}
        />
        {value.techGroups.map((group, gi) => (
          <div key={gi} className="space-y-2 rounded-lg border border-edge p-3">
            <Field label={`Group ${gi + 1} label`}>
              <input
                value={group.label}
                onChange={(e) => set('techGroups', value.techGroups.map((g, i) => (i === gi ? { ...g, label: e.target.value } : g)))}
                className={inputClasses}
              />
            </Field>
            <StringList
              label="Items"
              items={group.items}
              helpers={{
                addItem: () => set('techGroups', value.techGroups.map((g, i) => (i === gi ? { ...g, items: [...g.items, ''] } : g))),
                removeItem: (idx) => set('techGroups', value.techGroups.map((g, i) => (i === gi ? { ...g, items: g.items.filter((_, j) => j !== idx) } : g))),
                setItem: (idx, item) => set('techGroups', value.techGroups.map((g, i) => (i === gi ? { ...g, items: g.items.map((v, j) => (j === idx ? item : v)) } : g))),
              }}
              compact
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set('techGroups', value.techGroups.filter((_, i) => i !== gi))}
            >
              Remove group
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => set('techGroups', [...value.techGroups, { label: '', items: [''] }])}>
          + Add tech group
        </Button>
        <StringList
          label="Features"
          items={value.features}
          helpers={{
            addItem: () => listHelpers.addItem('features'),
            removeItem: (index) => listHelpers.removeItem('features', index),
            setItem: (index, item) => listHelpers.setItem('features', index, item),
          }}
        />
        <StringList
          label="Architecture"
          items={value.architecture}
          helpers={{
            addItem: () => listHelpers.addItem('architecture'),
            removeItem: (index) => listHelpers.removeItem('architecture', index),
            setItem: (index, item) => listHelpers.setItem('architecture', index, item),
          }}
        />
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-edge p-4">
        <legend className="px-1 font-mono text-[10px] uppercase tracking-wider text-mist">Links</legend>
        <Field label="Repository URL" hint="required">
          <input value={value.repository} onChange={(e) => set('repository', e.target.value)} className={inputClasses} required />
        </Field>
        <Field label="Demo URL" hint="optional">
          <input value={value.demo ?? ''} onChange={(e) => set('demo', e.target.value || undefined)} className={inputClasses} />
        </Field>
        <Field label="Demo status" hint="optional text, e.g. 'Currently unavailable'">
          <input value={value.demoStatus ?? ''} onChange={(e) => set('demoStatus', e.target.value || undefined)} className={inputClasses} />
        </Field>
        <Field label="Documentation URL" hint="optional">
          <input value={value.documentation ?? ''} onChange={(e) => set('documentation', e.target.value || undefined)} className={inputClasses} />
        </Field>
        <Field label="Banner crop config (JSON)" hint="optional; desktop/mobile objectPosition + scale">
          <textarea
            value={value.bannerConfig ? JSON.stringify(value.bannerConfig, null, 2) : ''}
            onChange={(e) => {
              try {
                set('bannerConfig', e.target.value.trim() ? JSON.parse(e.target.value) : undefined)
              } catch {
                // invalid JSON keeps prior value; server validation reports errors on save
              }
            }}
            rows={3}
            className={`${inputClasses} font-mono text-xs`}
            spellCheck={false}
          />
        </Field>
      </fieldset>
    </div>
  )
}

function StringList({
  label,
  items,
  helpers,
  compact,
}: {
  label: string
  items: string[]
  helpers: {
    addItem: () => void
    removeItem: (index: number) => void
    setItem: (index: number, item: string) => void
  }
  compact?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium uppercase tracking-wider text-mist">{label}</span>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={item}
            onChange={(e) => helpers.setItem(index, e.target.value)}
            aria-label={`${label} ${index + 1}`}
            className={`${inputClasses} ${compact ? 'text-xs' : ''}`}
          />
          <Button type="button" variant="outline" size="sm" aria-label={`Remove ${label} ${index + 1}`} onClick={() => helpers.removeItem(index)}>
            ×
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={helpers.addItem}>
        + Add
      </Button>
    </div>
  )
}
