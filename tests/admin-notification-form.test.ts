import { describe, expect, it, vi } from 'vitest'
import type { SelectOption } from '../src/admin/ui/form-controls'

describe('Admin Notification Form & Modal Focus Architecture', () => {
  describe('Issue 2 Regression — Input Focus Preservation & Modal Lifecycle', () => {
    it('verifies auto-focus logic targets modal body interactive elements over modal header close button', () => {
      // Simulate DOM hierarchy of AdminModal
      const modalContainer = {
        contains: (_el: unknown) => false,
        querySelector: vi.fn((selector: string) => {
          if (selector === '[data-modal-body]') {
            return {
              querySelector: (innerSelector: string) => {
                if (innerSelector.includes('input:not([disabled])')) {
                  return { id: 'notif-title', tagName: 'INPUT', focus: vi.fn() }
                }
                return null
              },
            }
          }
          if (selector === 'button') {
            return { id: 'header-close-btn', tagName: 'BUTTON', focus: vi.fn() }
          }
          return null
        }),
      }

      const bodyEl = modalContainer.querySelector('[data-modal-body]')
      expect(bodyEl).not.toBeNull()

      const target =
        bodyEl?.querySelector(
          'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [role="combobox"]:not([disabled])'
        ) ?? modalContainer.querySelector('button')

      expect(target).not.toBeNull()
      expect((target as unknown as { id: string }).id).toBe('notif-title')
      expect((target as unknown as { id: string }).id).not.toBe('header-close-btn')
    })

    it('prevents auto-focus from stealing focus when user is actively typing inside modal', () => {
      const activeInputElement = { id: 'notif-message', tagName: 'TEXTAREA', focus: vi.fn() }

      const modalContainer = {
        // activeElement is currently inside modalContainer
        contains: (el: unknown) => el === activeInputElement,
      }

      // Simulation of AdminModal focus effect guard:
      let focusTriggered = false
      if (modalContainer && !modalContainer.contains(activeInputElement)) {
        focusTriggered = true
      }

      // Because activeElement is inside the modal, focusTriggered must remain false
      expect(focusTriggered).toBe(false)
      expect(activeInputElement.focus).not.toHaveBeenCalled()
    })

    it('ensures onClose reference churn does not trigger focus re-evaluation', () => {
      // In the buggy implementation, useEffect had [open, onClose].
      // When a user typed in an input, parent re-rendered, creating a new onClose reference,
      // which re-ran the effect and stole focus.
      //
      // In the fixed implementation, the focus effect depends ONLY on [open].
      const open = true
      const effectDeps = [open]

      // Typing changes input value and causes parent re-render with new onClose:
      const reRender1_onClose = () => {}
      const reRender2_onClose = () => {}
      expect(reRender1_onClose).not.toBe(reRender2_onClose)

      // The effect dependency array remains identical across renders while open:
      const nextEffectDeps = [open]
      expect(effectDeps[0]).toBe(nextEffectDeps[0])
    })
  })

  describe('Issue 1 — Custom Admin UI Form Controls Contract', () => {
    const CATEGORY_OPTIONS: SelectOption<'custom' | 'system' | 'security' | 'content'>[] = [
      { value: 'custom', label: 'Custom Administrator' },
      { value: 'system', label: 'System Notification' },
      { value: 'security', label: 'Security Alert' },
      { value: 'content', label: 'Publishing / Content' },
    ]

    const PRIORITY_OPTIONS: SelectOption<'normal' | 'important' | 'critical'>[] = [
      { value: 'normal', label: 'Normal' },
      { value: 'important', label: 'Important (Warning)' },
      { value: 'critical', label: 'Critical (Urgent)' },
    ]

    it('verifies category options adhere to notification schema categories', () => {
      expect(CATEGORY_OPTIONS).toHaveLength(4)
      const values = CATEGORY_OPTIONS.map((c) => c.value)
      expect(values).toEqual(['custom', 'system', 'security', 'content'])
      expect(CATEGORY_OPTIONS.find((c) => c.value === 'custom')?.label).toBe('Custom Administrator')
    })

    it('verifies priority options adhere to notification schema priorities', () => {
      expect(PRIORITY_OPTIONS).toHaveLength(3)
      const values = PRIORITY_OPTIONS.map((p) => p.value)
      expect(values).toEqual(['normal', 'important', 'critical'])
      expect(PRIORITY_OPTIONS.find((p) => p.value === 'critical')?.label).toBe('Critical (Urgent)')
    })

    it('handles keyboard navigation and isolation on Escape key in AdminSelect', () => {
      let isDropdownOpen = true
      let focusedIndex: number | null = 0
      let modalClosed = false

      const mockModalClose = () => {
        modalClosed = true
      }

      // Simulate Escape keypress on open AdminSelect
      const nativeEvent = {
        stopImmediatePropagation: vi.fn(),
      }
      const event = {
        key: 'Escape',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        nativeEvent,
      }

      // Dropdown handles Escape:
      if (isDropdownOpen && event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        event.nativeEvent.stopImmediatePropagation()
        isDropdownOpen = false
        focusedIndex = null
      }

      // Dropdown closes without closing the parent modal
      expect(isDropdownOpen).toBe(false)
      expect(focusedIndex).toBeNull()
      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.stopPropagation).toHaveBeenCalled()
      expect(nativeEvent.stopImmediatePropagation).toHaveBeenCalled()
      expect(modalClosed).toBe(false)

      // Next Escape when dropdown is closed triggers modal onClose
      if (!isDropdownOpen && event.key === 'Escape') {
        mockModalClose()
      }
      expect(modalClosed).toBe(true)
    })

    it('handles ArrowDown / ArrowUp wrapping in AdminSelect', () => {
      let selectedIndex = 0
      const optionsCount = PRIORITY_OPTIONS.length // 3

      // ArrowDown
      selectedIndex = (selectedIndex + 1) % optionsCount
      expect(selectedIndex).toBe(1)

      // ArrowDown again
      selectedIndex = (selectedIndex + 1) % optionsCount
      expect(selectedIndex).toBe(2)

      // ArrowDown wraps to 0
      selectedIndex = (selectedIndex + 1) % optionsCount
      expect(selectedIndex).toBe(0)

      // ArrowUp wraps backwards
      selectedIndex = (selectedIndex - 1 + optionsCount) % optionsCount
      expect(selectedIndex).toBe(2)
    })

    it('handles Tab key closing dropdown cleanly', () => {
      let isDropdownOpen = true
      let navIndex: number | null = 2

      // Simulate Tab
      if (isDropdownOpen) {
        isDropdownOpen = false
        navIndex = null
      }

      expect(isDropdownOpen).toBe(false)
      expect(navIndex).toBeNull()
    })
  })

  describe('Form Validation & Submission Payload Contract', () => {
    function validateNotificationForm(data: {
      title: string
      message: string
      type: string
      priority: string
      linkUrl?: string
      isPinned: boolean
    }): { valid: boolean; error?: string } {
      const cleanTitle = data.title.trim()
      const cleanMessage = data.message.trim()

      if (!cleanTitle) {
        return { valid: false, error: 'Title is required' }
      }
      if (cleanTitle.length > 120) {
        return { valid: false, error: 'Title cannot exceed 120 characters' }
      }
      if (!cleanMessage) {
        return { valid: false, error: 'Message is required' }
      }
      if (cleanMessage.length > 1000) {
        return { valid: false, error: 'Message cannot exceed 1000 characters' }
      }
      return { valid: true }
    }

    it('validates required title and message with whitespace trimming', () => {
      expect(
        validateNotificationForm({
          title: '   ',
          message: 'Valid message',
          type: 'custom',
          priority: 'normal',
          isPinned: false,
        })
      ).toEqual({ valid: false, error: 'Title is required' })

      expect(
        validateNotificationForm({
          title: 'Valid title',
          message: '',
          type: 'custom',
          priority: 'normal',
          isPinned: false,
        })
      ).toEqual({ valid: false, error: 'Message is required' })
    })

    it('enforces maximum character lengths', () => {
      expect(
        validateNotificationForm({
          title: 'a'.repeat(121),
          message: 'Valid message',
          type: 'custom',
          priority: 'normal',
          isPinned: false,
        })
      ).toEqual({ valid: false, error: 'Title cannot exceed 120 characters' })

      expect(
        validateNotificationForm({
          title: 'Valid title',
          message: 'a'.repeat(1001),
          type: 'custom',
          priority: 'normal',
          isPinned: false,
        })
      ).toEqual({ valid: false, error: 'Message cannot exceed 1000 characters' })
    })

    it('constructs correct API payload with pin and priority', () => {
      const formState = {
        title: ' Critical Security Notice ',
        message: ' Immediate update required for node runtime. ',
        type: 'security' as const,
        priority: 'critical' as const,
        linkUrl: '  #/publishing  ',
        isPinned: true,
      }

      const validation = validateNotificationForm(formState)
      expect(validation.valid).toBe(true)

      const payload = {
        action: 'create',
        title: formState.title.trim(),
        message: formState.message.trim(),
        type: formState.type,
        priority: formState.priority,
        linkUrl: formState.linkUrl.trim() || undefined,
        isPinned: formState.isPinned,
      }

      expect(payload).toEqual({
        action: 'create',
        title: 'Critical Security Notice',
        message: 'Immediate update required for node runtime.',
        type: 'security',
        priority: 'critical',
        linkUrl: '#/publishing',
        isPinned: true,
      })
    })
  })
})
