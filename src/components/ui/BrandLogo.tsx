/**
 * The approved geometric Ali Faniani logo.
 *
 * public/favicon.svg is the source-of-truth asset (a transparent-background
 * logo — no background rect, no panel). It is used as-is: never redrawn,
 * recolored or re-generated in code, and no CSS adds any background, border
 * or shadow around it. The parent span only sizes/centers the <img>, so
 * navbar/footer/loading-screen layout and responsive behavior are unchanged.
 */
export function BrandLogo({ className = 'h-full w-full -translate-y-0.5 object-cover' }: { className?: string }) {
  return <img src="/favicon.svg" alt="Ali Faniani logo" draggable={false} className={className} />
}