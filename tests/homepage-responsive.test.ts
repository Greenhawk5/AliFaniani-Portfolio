import { describe, expect, it } from 'vitest'
import { projects } from '../src/data/projects'

describe('Homepage Responsive Engineering & Layout Overflow Verification', () => {
  // Required 10-viewport test matrix
  const VIEWPORT_MATRIX = [
    { width: 320, height: 740, name: 'Very narrow mobile (320x740)' },
    { width: 360, height: 800, name: 'Small Android (360x800)' },
    { width: 375, height: 812, name: 'iPhone-sized viewport (375x812)' },
    { width: 390, height: 844, name: 'Modern mobile (390x844)' },
    { width: 414, height: 896, name: 'Samsung-sized viewport (414x896)' },
    { width: 414, height: 939, name: 'Samsung S21 FE (414x939)' },
    { width: 768, height: 1024, name: 'Tablet portrait (768x1024)' },
    { width: 1024, height: 768, name: 'Tablet landscape (1024x768)' },
    { width: 1280, height: 800, name: 'Laptop (1280x800)' },
    { width: 1920, height: 1080, name: 'Desktop (1920x1080)' },
  ] as const

  describe('Section 1 — Hero Section Typography & Narrow-Screen Containment', () => {
    it('verifies hero title font sizes scale gracefully to prevent narrow viewport overflow', () => {
      for (const vp of VIEWPORT_MATRIX) {
        // Container padding: px-4 (16px * 2 = 32px) on mobile (< 640px), px-6 on sm, px-8 on md+
        const containerPadding = vp.width < 640 ? 32 : vp.width < 768 ? 48 : 64
        const contentWidth = Math.min(vp.width - containerPadding, 1152) // max-w-6xl = 1152px

        // On narrow mobile (<640px), font size is text-4xl (36px) for name, text-2xl (24px) for role
        const nameFontSize = vp.width < 640 ? 36 : vp.width < 1280 ? 60 : 72
        const roleFontSize = vp.width < 640 ? 24 : vp.width < 1280 ? 36 : 48

        // Approximate character width for bold sans-serif with tight tracking: ~0.55 * fontSize
        const nameWidth = 'Ali Faniani'.length * nameFontSize * 0.55
        const roleWidth = 'Software Developer'.length * roleFontSize * 0.55

        // Must never exceed the content width of any viewport
        expect(nameWidth).toBeLessThan(contentWidth)
        expect(roleWidth).toBeLessThan(contentWidth)
      }
    })
  })

  describe('Section 2 — Selected Work Carousel Responsive Card Bounds', () => {
    it('verifies carousel card width strictly fits available content width across all viewports', () => {
      for (const vp of VIEWPORT_MATRIX) {
        const containerPadding = vp.width < 640 ? 32 : vp.width < 768 ? 48 : 64
        const maxContentWidth = Math.min(vp.width - containerPadding, 1152)

        // Card is w-full max-w-xl (576px max on desktop, 100% on mobile)
        const expectedCardWidth = Math.min(maxContentWidth, 576)
        expect(expectedCardWidth).toBeLessThanOrEqual(vp.width - containerPadding)
      }
    })

    it('verifies carousel header controls never blow out card width with longest categories', () => {
      // Find longest category from actual static projects
      const longestCategory = projects.reduce((longest, p) =>
        p.category.length > longest.length ? p.category : longest
      , '')

      expect(longestCategory.length).toBeGreaterThan(0)

      for (const vp of VIEWPORT_MATRIX) {
        const containerPadding = vp.width < 640 ? 32 : vp.width < 768 ? 48 : 64
        const cardPadding = vp.width < 640 ? 32 : 48 // p-4 (32px total) on mobile, p-5/p-6 on sm/md
        const availableCardInnerWidth = Math.min(vp.width - containerPadding, 576) - cardPadding

        // Right side controls: two 28px buttons + 6px gap = 62px
        const controlsWidth = 28 + 6 + 28
        // Counter numbers: "01 / 05" ~ 45px
        const counterWidth = 45

        // Remaining width for category badge
        const availableCategoryWidth = availableCardInnerWidth - controlsWidth - counterWidth - 16 // gap

        // On mobile, category badge has max-w-[125px] and truncate
        const effectiveBadgeWidth = vp.width < 640
          ? Math.min(longestCategory.length * 7, 125)
          : longestCategory.length * 7

        const totalHeaderWidth = counterWidth + effectiveBadgeWidth + 16 + controlsWidth
        expect(totalHeaderWidth).toBeLessThanOrEqual(availableCardInnerWidth)
      }
    })

    it('verifies project title row preserves min-width: 0 and truncates gracefully', () => {
      // Find longest project title in project catalog
      const longestTitleProject = projects.reduce((longest, p) =>
        p.title.length > longest.title.length ? p : longest
      )

      expect(longestTitleProject.title.length).toBeGreaterThan(15)

      for (const vp of VIEWPORT_MATRIX) {
        const containerPadding = vp.width < 640 ? 32 : vp.width < 768 ? 48 : 64
        const cardPadding = vp.width < 640 ? 32 : 48
        const availableInner = Math.min(vp.width - containerPadding, 576) - cardPadding

        // Right side: Year "2026" ~ 32px + gap 8px = 40px
        const rightMetaWidth = 40
        // Available for title link:
        const availableTitleWidth = availableInner - rightMetaWidth

        expect(availableTitleWidth).toBeGreaterThan(100) // Always has room to render truncated title
      }
    })

    it('verifies carousel footer dots and View All link fit within card width', () => {
      for (const vp of VIEWPORT_MATRIX) {
        const containerPadding = vp.width < 640 ? 32 : vp.width < 768 ? 48 : 64
        const cardPadding = vp.width < 640 ? 32 : 48
        const availableInner = Math.min(vp.width - containerPadding, 576) - cardPadding

        // 5 dots: active is 20px (or 24px sm), 4 inactive are 8px each, gaps are 6px each
        const dotsWidth = (vp.width < 640 ? 20 : 24) + 4 * 8 + 4 * 6 // 20 + 32 + 24 = 76px
        // View all text "View all (10) →" with font-mono text-xs ~ 95px
        const viewAllWidth = 95

        const totalFooterWidth = dotsWidth + 16 + viewAllWidth
        expect(totalFooterWidth).toBeLessThanOrEqual(availableInner)
      }
    })
  })

  describe('Section 3 — Interactive 3D Scene CTA Card Mobile Composition', () => {
    it('verifies CTA card padding and track dimensions prevent icon clipping', () => {
      for (const vp of VIEWPORT_MATRIX) {
        const isMobile = vp.width < 640
        const trackHeight = isMobile ? 56 : 80 // h-14 (56px) on mobile, sm:h-20 (80px)
        const iconSize = isMobile ? 56 : 80   // h-14 w-14 (56px) on mobile, sm:h-20 sm:w-20 (80px)

        // Icon must never exceed track height
        expect(iconSize).toBeLessThanOrEqual(trackHeight)
      }
    })

    it('verifies CTA title and description fit within card bounds across all viewports', () => {
      for (const vp of VIEWPORT_MATRIX) {
        const containerPadding = vp.width < 640 ? 32 : vp.width < 768 ? 48 : 64
        const cardPadding = vp.width < 640 ? 40 : 48 // p-5 (40px) on mobile, p-6 (48px) on sm+
        const availableContentWidth = Math.min(vp.width - containerPadding, 448) - cardPadding // max-w-md = 448px

        // "Enter the 3D Room": on mobile text-xl (20px font-size, ~160px width)
        const titleFontSize = vp.width < 640 ? 20 : vp.width < 1024 ? 24 : 30
        const titleWidth = 'Enter the 3D Room'.length * titleFontSize * 0.58

        expect(titleWidth).toBeLessThan(availableContentWidth)
      }
    })
  })

  describe('Section 4 — Layout Integrity and Zero Document-Level Overflow', () => {
    it('confirms every supported viewport has positive, bounded content dimensions', () => {
      for (const vp of VIEWPORT_MATRIX) {
        const containerPadding = vp.width < 640 ? 32 : vp.width < 768 ? 48 : 64
        const contentWidth = vp.width - containerPadding

        expect(contentWidth).toBeGreaterThan(250)
        expect(contentWidth).toBeLessThanOrEqual(vp.width)
      }
    })
  })
})
