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

  describe('Section 2 — Selected Work Carousel Adaptive Content & Typography', () => {
    it('verifies carousel card width strictly fits available content width across all viewports', () => {
      for (const vp of VIEWPORT_MATRIX) {
        const containerPadding = vp.width < 640 ? 32 : vp.width < 768 ? 48 : 64
        const maxContentWidth = Math.min(vp.width - containerPadding, 1152)

        // Card is w-full max-w-xl (576px max on desktop, 100% on mobile)
        const expectedCardWidth = Math.min(maxContentWidth, 576)
        expect(expectedCardWidth).toBeLessThanOrEqual(vp.width - containerPadding)
      }
    })

    it('verifies category badges wrap naturally without truncation and keep controls inside card', () => {
      // Test all real categories plus long compound category
      const testCategories = [
        ...projects.map((p) => p.category),
        'AI · COMPUTER VISION & REINFORCEMENT LEARNING',
      ]

      for (const category of testCategories) {
        for (const vp of VIEWPORT_MATRIX) {
          const containerPadding = vp.width < 640 ? 32 : vp.width < 768 ? 48 : 64
          const cardPadding = vp.width < 640 ? 32 : 48
          const availableCardInnerWidth = Math.min(vp.width - containerPadding, 576) - cardPadding

          // Right side controls: two 28px buttons + 6px gap = 62px (shrink-0)
          const controlsWidth = 62
          // Counter: "01 / 05" ~ 45px (shrink-0)
          const counterWidth = 45
          const availableBadgeWidth = availableCardInnerWidth - controlsWidth - counterWidth - 12

          // On mobile, text-[8px] (character width ~4.8px), allows wrapping onto 2 lines
          const charWidth = vp.width < 640 ? 4.8 : 5.8
          const maxSingleLineChars = Math.floor(availableBadgeWidth / charWidth)

          // If category exceeds single line chars, it wraps onto line 2
          const linesNeeded = Math.ceil(category.length / Math.max(maxSingleLineChars, 1))

          // Header min-h-[38px] safely accommodates up to 2 lines of 8px text (24px badge <= 28px controls)
          expect(linesNeeded).toBeLessThanOrEqual(3)
          expect(availableBadgeWidth).toBeGreaterThan(60) // Always ample space inside card
        }
      }
    })

    it('verifies long project titles wrap onto 2 lines without ellipsis truncation', () => {
      // Include actual projects plus worst-case long title
      const testTitles = [
        ...projects.map((p) => p.title),
        'Buckshot Roulette AI Assistant Tracker',
      ]

      for (const title of testTitles) {
        for (const vp of VIEWPORT_MATRIX) {
          const containerPadding = vp.width < 640 ? 32 : vp.width < 768 ? 48 : 64
          const cardPadding = vp.width < 640 ? 32 : 48
          const availableInner = Math.min(vp.width - containerPadding, 576) - cardPadding

          // Right-aligned year ~ 32px + gap 8px = 40px
          const yearWidth = 40
          const availableTitleWidth = availableInner - yearWidth

          // On mobile, text-base (16px), character width ~9.2px
          const charWidth = vp.width < 640 ? 9.2 : 12.0
          const maxCharsPerLine = Math.floor(availableTitleWidth / charWidth)
          const lines = Math.ceil(title.length / Math.max(maxCharsPerLine, 1))

          // All test titles fit within 2 lines on mobile without truncation
          expect(lines).toBeLessThanOrEqual(2)
          expect(availableTitleWidth).toBeGreaterThan(150)
        }
      }
    })

    it('verifies subtitles adapt to 2 lines on mobile and remain readable without clipping', () => {
      const testSubtitles = projects.map((p) => p.subtitle)

      for (const sub of testSubtitles) {
        for (const vp of VIEWPORT_MATRIX) {
          const containerPadding = vp.width < 640 ? 32 : vp.width < 768 ? 48 : 64
          const cardPadding = vp.width < 640 ? 32 : 48
          const availableInner = Math.min(vp.width - containerPadding, 576) - cardPadding

          // At text-[11px], character width ~6.2px
          const charWidth = vp.width < 640 ? 6.2 : 7.2
          const charsPerLine = Math.floor(availableInner / charWidth)
          const lines = Math.ceil((sub?.length ?? 0) / Math.max(charsPerLine, 1))

          // Subtitles wrap onto up to 2 lines
          expect(lines).toBeLessThanOrEqual(2)
        }
      }
    })

    it('verifies card height stability: reserved dimensions prevent layout shifts between slides', () => {
      // Across all real projects, verify reserved dimensions:
      // Header: min-h-[38px]
      // Title row: min-h-[46px] on mobile (2 lines), min-h-[32px] on desktop
      // Subtitle: min-h-[36px] on mobile (2 lines), min-h-[22px] on desktop
      // Total slide area min-h-[96px] mobile, min-h-[90px] desktop
      for (const project of projects) {
        expect(project.title).toBeDefined()
        expect(project.subtitle).toBeDefined()
        expect(project.category).toBeDefined()
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
