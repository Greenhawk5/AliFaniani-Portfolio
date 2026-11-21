import { Field, inputClasses } from './Field'
import { MediaPicker } from './MediaPicker'
import { Button } from '@/components/ui/Button'
import { AdminSelect } from './ui/form-controls'

interface ProfileFormProps {
  sectionKey: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (next: Record<string, any>) => void
}

const SKILL_LEVELS = [
  { value: 'Advanced', label: 'Advanced (90%)' },
  { value: 'Strong', label: 'Strong (72%)' },
  { value: 'Familiar', label: 'Familiar (50%)' },
] as const

export function ProfileForm({ sectionKey, value, onChange }: ProfileFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (key: string, val: any) => {
    onChange({ ...value, [key]: val })
  }

  switch (sectionKey) {
    case 'hero':
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name">
              <input
                value={value.name ?? ''}
                onChange={(e) => set('name', e.target.value)}
                className={inputClasses}
                required
              />
            </Field>
            <Field label="Role Title">
              <input
                value={value.role ?? ''}
                onChange={(e) => set('role', e.target.value)}
                className={inputClasses}
                required
              />
            </Field>
          </div>
          <Field label="Intro Bio" hint="Shown on landing & about hero">
            <textarea
              value={value.intro ?? ''}
              onChange={(e) => set('intro', e.target.value)}
              rows={3}
              className={inputClasses}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Avatar Initials" hint="1–4 uppercase characters fallback">
              <input
                value={value.avatarInitials ?? ''}
                onChange={(e) => set('avatarInitials', e.target.value.toUpperCase())}
                maxLength={4}
                className={`${inputClasses} font-mono`}
                required
              />
            </Field>
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-mist">Profile Avatar</span>
              <MediaPicker
                value={value.avatarSrc ?? ''}
                onChange={(src) => set('avatarSrc', src)}
                category="profile"
                label="Avatar Image"
              />
            </div>
          </div>
        </div>
      )

    case 'about': {
      const paragraphs: string[] = Array.isArray(value.paragraphs) ? value.paragraphs : []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-mist">
              About Paragraphs ({paragraphs.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set('paragraphs', [...paragraphs, ''])}
            >
              + Add Paragraph
            </Button>
          </div>
          {paragraphs.map((para, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-edge bg-panel-2/40 p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-accent">Paragraph {index + 1}</span>
                <div className="flex items-center gap-1">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...paragraphs]
                        const temp = copy[index - 1]
                        copy[index - 1] = copy[index]
                        copy[index] = temp
                        set('paragraphs', copy)
                      }}
                      className="px-1.5 text-xs text-mist hover:text-frost"
                      title="Move up"
                    >
                      ↑
                    </button>
                  )}
                  {index < paragraphs.length - 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...paragraphs]
                        const temp = copy[index + 1]
                        copy[index + 1] = copy[index]
                        copy[index] = temp
                        set('paragraphs', copy)
                      }}
                      className="px-1.5 text-xs text-mist hover:text-frost"
                      title="Move down"
                    >
                      ↓
                    </button>
                  )}
                  {paragraphs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => set('paragraphs', paragraphs.filter((_, i) => i !== index))}
                      className="px-1 text-xs text-danger hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={para}
                onChange={(e) => {
                  const copy = [...paragraphs]
                  copy[index] = e.target.value
                  set('paragraphs', copy)
                }}
                rows={3}
                className={inputClasses}
                required
              />
            </div>
          ))}
        </div>
      )
    }

    case 'focus': {
      const items: string[] = Array.isArray(value.items) ? value.items : []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-mist">
              Focus Areas ({items.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set('items', [...items, ''])}
            >
              + Add Focus Area
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={item}
                  onChange={(e) => {
                    const copy = [...items]
                    copy[index] = e.target.value
                    set('items', copy)
                  }}
                  className={inputClasses}
                  placeholder="e.g. Distributed backend systems and real-time APIs"
                  required
                />
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => set('items', items.filter((_, i) => i !== index))}
                    className="text-danger hover:bg-danger/10"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }

    case 'education':
      return (
        <div className="space-y-4">
          <Field label="Degree / Program">
            <input
              value={value.degree ?? ''}
              onChange={(e) => set('degree', e.target.value)}
              className={inputClasses}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="School / Institution">
              <input
                value={value.school ?? ''}
                onChange={(e) => set('school', e.target.value)}
                className={inputClasses}
                required
              />
            </Field>
            <Field label="Period" hint="e.g. 2019 – 2023">
              <input
                value={value.period ?? ''}
                onChange={(e) => set('period', e.target.value)}
                className={inputClasses}
                required
              />
            </Field>
          </div>
          <Field label="Notes / Achievements" hint="Optional details">
            <textarea
              value={value.notes ?? ''}
              onChange={(e) => set('notes', e.target.value || undefined)}
              rows={2}
              className={inputClasses}
            />
          </Field>
        </div>
      )

    case 'skills': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const groups: any[] = Array.isArray(value.groups) ? value.groups : []
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-mist">
              Skill Groups ({groups.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set('groups', [
                  ...groups,
                  { label: 'New Group', skills: [{ name: 'Skill', level: 'Strong' }] },
                ])
              }
            >
              + Add Skill Group
            </Button>
          </div>
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3 rounded-xl border border-edge bg-panel-2/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <Field label={`Group ${gIdx + 1} Name`}>
                    <input
                      value={group.label ?? ''}
                      onChange={(e) => {
                        const copy = [...groups]
                        copy[gIdx] = { ...copy[gIdx], label: e.target.value }
                        set('groups', copy)
                      }}
                      className={inputClasses}
                      required
                    />
                  </Field>
                </div>
                {groups.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => set('groups', groups.filter((_, i) => i !== gIdx))}
                    className="mt-5 text-danger hover:bg-danger/10"
                  >
                    Delete Group
                  </Button>
                )}
              </div>

              {/* Skills list inside group */}
              <div className="mt-3 space-y-2 border-t border-edge/60 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-mist">Skills in this group</span>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = [...groups]
                      const skills = Array.isArray(copy[gIdx].skills) ? copy[gIdx].skills : []
                      copy[gIdx] = {
                        ...copy[gIdx],
                        skills: [...skills, { name: '', level: 'Strong' }],
                      }
                      set('groups', copy)
                    }}
                    className="font-mono text-[11px] text-accent hover:underline"
                  >
                    + Add Skill
                  </button>
                </div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(group.skills || []).map((skill: any, sIdx: number) => (
                  <div key={sIdx} className="flex items-center gap-2">
                    <input
                      value={skill.name ?? ''}
                      onChange={(e) => {
                        const copy = [...groups]
                        const skills = [...copy[gIdx].skills]
                        skills[sIdx] = { ...skills[sIdx], name: e.target.value }
                        copy[gIdx] = { ...copy[gIdx], skills }
                        set('groups', copy)
                      }}
                      className={inputClasses}
                      placeholder="Skill name"
                      required
                    />
                    <div className="w-48 shrink-0">
                      <AdminSelect
                        value={skill.level ?? 'Strong'}
                        onChange={(val) => {
                          const copy = [...groups]
                          const skills = [...copy[gIdx].skills]
                          skills[sIdx] = { ...skills[sIdx], level: val }
                          copy[gIdx] = { ...copy[gIdx], skills }
                          set('groups', copy)
                        }}
                        options={SKILL_LEVELS.map((sl) => ({ value: sl.value, label: sl.label }))}
                        ariaLabel="Skill proficiency level"
                      />
                    </div>
                    {group.skills.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...groups]
                          const skills = copy[gIdx].skills.filter((_: unknown, i: number) => i !== sIdx)
                          copy[gIdx] = { ...copy[gIdx], skills }
                          set('groups', copy)
                        }}
                        className="px-2 text-mist hover:text-danger"
                        title="Remove skill"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    }

    case 'technologies': {
      const items: string[] = Array.isArray(value.items) ? value.items : []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-mist">
              Core Technologies ({items.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set('items', [...items, ''])}
            >
              + Add Technology
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={item}
                  onChange={(e) => {
                    const copy = [...items]
                    copy[index] = e.target.value
                    set('items', copy)
                  }}
                  className={inputClasses}
                  placeholder="e.g. TypeScript"
                  required
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => set('items', items.filter((_, i) => i !== index))}
                    className="px-2 text-mist hover:text-danger"
                    title="Remove technology"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }

    case 'certificates': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = Array.isArray(value.items) ? value.items : []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-mist">
              Certificates ({items.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set('items', [
                  ...items,
                  {
                    title: '',
                    provider: '',
                    date: new Date().getFullYear().toString(),
                    href: 'https://',
                    image: '/media/profile/projects.webp',
                  },
                ])
              }
            >
              + Add Certificate
            </Button>
          </div>
          {items.map((cert, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-edge bg-panel-2/40 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-accent">Certificate #{index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => set('items', items.filter((_, i) => i !== index))}
                  className="text-danger hover:bg-danger/10"
                >
                  Remove
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Certificate Title">
                  <input
                    value={cert.title ?? ''}
                    onChange={(e) => {
                      const copy = [...items]
                      copy[index] = { ...copy[index], title: e.target.value }
                      set('items', copy)
                    }}
                    className={inputClasses}
                    required
                  />
                </Field>
                <Field label="Issuing Provider">
                  <input
                    value={cert.provider ?? ''}
                    onChange={(e) => {
                      const copy = [...items]
                      copy[index] = { ...copy[index], provider: e.target.value }
                      set('items', copy)
                    }}
                    className={inputClasses}
                    required
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Issue Date / Year">
                  <input
                    value={cert.date ?? ''}
                    onChange={(e) => {
                      const copy = [...items]
                      copy[index] = { ...copy[index], date: e.target.value }
                      set('items', copy)
                    }}
                    className={inputClasses}
                    required
                  />
                </Field>
                <Field label="Verification URL (href)">
                  <input
                    type="url"
                    value={cert.href ?? ''}
                    onChange={(e) => {
                      const copy = [...items]
                      copy[index] = { ...copy[index], href: e.target.value }
                      set('items', copy)
                    }}
                    className={inputClasses}
                    required
                  />
                </Field>
              </div>
              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-mist">Certificate Badge / Image</span>
                <MediaPicker
                  value={cert.image ?? ''}
                  onChange={(img) => {
                    const copy = [...items]
                    copy[index] = { ...copy[index], image: img }
                    set('items', copy)
                  }}
                  category="profile"
                  label="Certificate Image"
                />
              </div>
            </div>
          ))}
        </div>
      )
    }

    case 'experience': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = Array.isArray(value.items) ? value.items : []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-mist">
              Experience Entries ({items.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set('items', [
                  ...items,
                  {
                    role: '',
                    org: '',
                    period: '',
                    summary: '',
                  },
                ])
              }
            >
              + Add Experience
            </Button>
          </div>
          {items.map((exp, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-edge bg-panel-2/40 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-accent">Role #{index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => set('items', items.filter((_, i) => i !== index))}
                  className="text-danger hover:bg-danger/10"
                >
                  Remove
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Role Title">
                  <input
                    value={exp.role ?? ''}
                    onChange={(e) => {
                      const copy = [...items]
                      copy[index] = { ...copy[index], role: e.target.value }
                      set('items', copy)
                    }}
                    className={inputClasses}
                    required
                  />
                </Field>
                <Field label="Organization / Company">
                  <input
                    value={exp.org ?? ''}
                    onChange={(e) => {
                      const copy = [...items]
                      copy[index] = { ...copy[index], org: e.target.value }
                      set('items', copy)
                    }}
                    className={inputClasses}
                    required
                  />
                </Field>
              </div>
              <Field label="Period" hint="e.g. 2023 – Present">
                <input
                  value={exp.period ?? ''}
                  onChange={(e) => {
                    const copy = [...items]
                    copy[index] = { ...copy[index], period: e.target.value }
                    set('items', copy)
                  }}
                  className={inputClasses}
                  required
                />
              </Field>
              <Field label="Summary / Responsibilities">
                <textarea
                  value={exp.summary ?? ''}
                  onChange={(e) => {
                    const copy = [...items]
                    copy[index] = { ...copy[index], summary: e.target.value }
                    set('items', copy)
                  }}
                  rows={3}
                  className={inputClasses}
                  required
                />
              </Field>
            </div>
          ))}
        </div>
      )
    }

    default:
      return null
  }
}
