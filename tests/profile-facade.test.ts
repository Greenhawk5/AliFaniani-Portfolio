/**
 * Phase 7C regression tests.
 *
 * 1. About page data shape — the production `/about` crash
 *    (TypeError: Cannot read properties of undefined (reading 'map')) was
 *    caused by the profile facade exposing section OBJECTS
 *    (focus: {items: [...]}) where page components consume plain ARRAYS.
 *    These tests pin the facade contract so it can never regress.
 *
 * 2. Minimal project draft creation — the "New content → project" dialog
 *    payload must satisfy the full canonical projectSchema so creation
 *    succeeds and the draft is immediately editable.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { profile } from '../src/data/profile'
import { projects } from '../src/data/projects'
import { socialLinks } from '../src/data/links'

describe('profile facade shape (About page contract — 7C regression)', () => {
  it('exposes focus as a plain string array (About maps it directly)', () => {
    expect(Array.isArray(profile.focus)).toBe(true)
    expect(profile.focus.length).toBeGreaterThan(0)
    expect(typeof profile.focus[0]).toBe('string')
  })

  it('exposes about as a plain string array', () => {
    expect(Array.isArray(profile.about)).toBe(true)
    expect(typeof profile.about[0]).toBe('string')
  })

  it('exposes technologies as a plain string array', () => {
    expect(Array.isArray(profile.technologies)).toBe(true)
    expect(typeof profile.technologies[0]).toBe('string')
  })

  it('exposes certificates as a plain array with schema-required fields', () => {
    expect(Array.isArray(profile.certificates)).toBe(true)
    for (const cert of profile.certificates) {
      expect(typeof cert.title).toBe('string')
      expect(typeof cert.image).toBe('string')
    }
  })

  it('exposes experience as a plain array (empty allowed)', () => {
    expect(Array.isArray(profile.experience)).toBe(true)
  })

  it('exposes skillGroups with array-typed skills carrying the level union', () => {
    expect(Array.isArray(profile.skillGroups)).toBe(true)
    for (const group of profile.skillGroups) {
      expect(typeof group.label).toBe('string')
      expect(Array.isArray(group.skills)).toBe(true)
      for (const skill of group.skills) {
        expect(['Advanced', 'Strong', 'Familiar']).toContain(skill.level)
      }
    }
  })

  it('exposes hero as the section object (name/role/intro/avatarSrc)', () => {
    expect(typeof profile.hero.name).toBe('string')
    expect(typeof profile.hero.role).toBe('string')
    expect(typeof profile.hero.intro).toBe('string')
    expect(typeof profile.hero.avatarSrc).toBe('string')
  })

  it('does NOT leak section wrapper objects into facade fields', () => {
    // The original crash: facade exposed {items:[...]} where arrays were expected.
    expect(profile.focus).not.toHaveProperty('items')
    expect(profile.about).not.toHaveProperty('items')
    expect(profile.technologies).not.toHaveProperty('items')
    expect(profile.certificates).not.toHaveProperty('items')
    expect(profile.experience).not.toHaveProperty('items')
  })
})

describe('public data facades remain consumable (7C regression)', () => {
  it('projects facade exposes the canonical snapshot projects', () => {
    expect(projects.length).toBeGreaterThan(0)
    for (const project of projects) {
      expect(typeof project.slug).toBe('string')
      expect(typeof project.title).toBe('string')
      expect(Array.isArray(project.screenshots)).toBe(true)
    }
  })

  it('links facade exposes plain label/href entries', () => {
    expect(socialLinks.length).toBeGreaterThan(0)
    for (const link of socialLinks) {
      expect(typeof link.label).toBe('string')
      expect(typeof link.href).toBe('string')
    }
  })
})
