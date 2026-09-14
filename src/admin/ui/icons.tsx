/**
 * Admin-chunk-only icons — never imported by public code (verified by
 * verify-build bundle isolation). Stroke style matches the public icon set
 * (1.8 stroke, round caps) so the two systems feel like one product.
 */

interface IconProps {
  className?: string
}

function base(className?: string) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true as const,
  }
}

export function LayoutIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M3.5 9.5h17M9.5 9.5v11" />
    </svg>
  )
}

export function FolderIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3.5 6.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11Z" />
    </svg>
  )
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c.8-3.4 3.6-5.2 7-5.2s6.2 1.8 7 5.2" />
    </svg>
  )
}

export function LinkIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M10 14a4.5 4.5 0 0 0 6.4.4l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.5" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4-.4l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5" />
    </svg>
  )
}

export function ImageIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="9.5" r="1.6" />
      <path d="m3.5 16.5 4.6-4.2a1.5 1.5 0 0 1 2 0l6.9 6.2M14.5 15l2-1.8a1.5 1.5 0 0 1 2 0l2 1.8" />
    </svg>
  )
}

export function RocketIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M13.5 4.5c3-1.6 6-1.5 6-1.5s.1 3-1.5 6c-1.2 2.3-3.3 4.6-6.5 6.5L8 12s1.9-5.4 5.5-7.5Z" />
      <path d="M8 12c-1.8-.3-3.6.4-4.8 1.9-.9 1.1-1.2 2.6-1.2 3.6 1 0 2.5-.3 3.6-1.2" />
      <path d="M12 16c.3 1.8-.4 3.6-1.9 4.8-1.1.9-2.6 1.2-3.6 1.2 0-1 .3-2.5 1.2-3.6" />
      <circle cx="15" cy="9" r="1.3" />
    </svg>
  )
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

export function ActivityIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3.5 12h3.4l2.3-6 3.6 12 2.3-6h5.4" />
    </svg>
  )
}

export function PlugIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M9 3.5v5M15 3.5v5" />
      <path d="M6.5 8.5h11v2.5a5.5 5.5 0 0 1-11 0V8.5Z" />
      <path d="M12 16.5v4" />
    </svg>
  )
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M4.5 6.5h15M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
      <path d="M6.5 6.5 7.4 19a1.8 1.8 0 0 0 1.8 1.6h5.6A1.8 1.8 0 0 0 16.6 19l.9-12.5" />
      <path d="M10 10.5v6M14 10.5v6" />
    </svg>
  )
}

export function ArchiveIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="3.5" y="4.5" width="17" height="4.5" rx="1" />
      <path d="M5.5 9v8.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V9M9.8 13h4.4" />
    </svg>
  )
}

export function UndoIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3.5 7v5h5" />
      <path d="M4.2 12A8.3 8.3 0 1 1 6 17.5" />
    </svg>
  )
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function MenuDotsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  )
}

export function FileIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M6 3.5h8L19.5 9v11.5h-13.5V3.5Z" />
      <path d="M13.5 3.5V9h6" />
    </svg>
  )
}

export function PanelLeftIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M9.5 4v16" />
    </svg>
  )
}
