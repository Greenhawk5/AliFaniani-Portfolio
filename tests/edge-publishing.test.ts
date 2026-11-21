import { describe, it, expect, beforeEach } from 'vitest'
import { FakeD1Database, FakeKV, makeEnv, makeContext } from './helpers'
import { onRequest as middlewareHandler } from '../functions/_middleware'
import { onRequestGet as sitemapHandler } from '../functions/sitemap.xml'

describe('Decoupled Edge Publishing & SEO (v2.2.0 Phase 4)', () => {
  let db: FakeD1Database
  let kv: FakeKV
  let env: any

  const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Ali Faniani | Software Developer</title>
  <meta name="description" content="Default portfolio description." />
  <link rel="canonical" href="https://alifaniani.ir/" />
  <meta property="og:url" content="https://alifaniani.ir/" />
  <meta property="og:title" content="Ali Faniani | Software Developer" />
  <meta property="og:description" content="Default portfolio description." />
  <meta property="og:image" content="https://alifaniani.ir/og-image.webp" />
  <meta name="twitter:title" content="Ali Faniani | Software Developer" />
  <meta name="twitter:description" content="Default portfolio description." />
  <meta name="twitter:image" content="https://alifaniani.ir/og-image.webp" />
</head>
<body><div id="root"></div></body>
</html>`

  const CONTENT_META_JSON = JSON.stringify({
    schemaVersion: 1,
    staticRoutes: ['/', '/about', '/projects', '/contact', '/room'],
    projectSlugs: ['greenhawk-ai', 'morsemate'],
  })

  const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://alifaniani.ir/</loc>
    <lastmod>2026-09-23</lastmod>
  </url>
  <url>
    <loc>https://alifaniani.ir/projects/greenhawk-ai</loc>
    <lastmod>2026-09-23</lastmod>
  </url>
</urlset>`

  beforeEach(() => {
    db = new FakeD1Database()
    kv = new FakeKV()

    const assetsFetcher = {
      fetch: async (input: string | URL) => {
        const urlStr = String(input)
        if (urlStr.endsWith('/_content_meta.json')) {
          return new Response(CONTENT_META_JSON, { status: 200 })
        }
        if (urlStr.endsWith('/index.html')) {
          return new Response(INDEX_HTML, { status: 200, headers: { 'Content-Type': 'text/html' } })
        }
        if (urlStr.endsWith('/sitemap.xml')) {
          return new Response(SITEMAP_XML, { status: 200, headers: { 'Content-Type': 'application/xml' } })
        }
        if (urlStr.endsWith('/projects/greenhawk-ai.html')) {
          return new Response('<html><head><title>GreenHawk AI Shell</title></head></html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          })
        }
        return new Response('Not found', { status: 404 })
      },
    }

    env = makeEnv(db, kv, { ASSETS: assetsFetcher as any })
  })

  it('serves pre-rendered static shell for build-time projects', async () => {
    const req = new Request('https://alifaniani.ir/projects/greenhawk-ai')
    const ctx = {
      request: req,
      env,
      next: () => new Response('next', { status: 200 }),
    }

    const res = await (middlewareHandler as any)(ctx)
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('GreenHawk AI Shell')
  })

  it('dynamically generates SEO edge shell for newly published D1 project not in build meta', async () => {
    const newProjectData = JSON.stringify({
      slug: 'hawklyx',
      title: 'Hawklyx Platform',
      shortDescription: 'Advanced edge intelligence and automated workflows.',
      banner: 'https://media.alifaniani.ir/media/project/banner.webp',
    })

    db.tables.content = [
      {
        id: 'project:hawklyx',
        kind: 'project',
        key: 'hawklyx',
        data: newProjectData,
        sort_order: 10,
        state: 'published',
        version: 1,
        created_at: '2026-11-21',
        updated_at: '2026-11-21',
        published_at: '2026-11-21',
        draft_data: null,
      },
    ]

    const req = new Request('https://alifaniani.ir/projects/hawklyx')
    const ctx = {
      request: req,
      env,
      next: () => new Response('next', { status: 200 }),
    }

    const res = await (middlewareHandler as any)(ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Content-Source')).toBe('d1-edge-shell')
    const html = await res.text()

    expect(html).toContain('<title>Hawklyx Platform | Ali Faniani</title>')
    expect(html).toContain('content="Advanced edge intelligence and automated workflows."')
    expect(html).toContain('href="https://alifaniani.ir/projects/hawklyx"')
    expect(html).toContain('content="https://media.alifaniani.ir/media/project/banner.webp"')
  })

  it('returns 404 with X-Robots-Tag: noindex for draft-only projects', async () => {
    db.tables.content = [
      {
        id: 'project:secret-draft',
        kind: 'project',
        key: 'secret-draft',
        data: JSON.stringify({ title: 'Draft' }),
        sort_order: 10,
        state: 'draft',
        version: 1,
        created_at: '2026-11-21',
        updated_at: '2026-11-21',
        draft_data: null,
      },
    ]

    const req = new Request('https://alifaniani.ir/projects/secret-draft')
    const ctx = {
      request: req,
      env,
      next: () => new Response('next', { status: 200 }),
    }

    const res = await (middlewareHandler as any)(ctx)
    expect(res.status).toBe(404)
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex')
  })

  it('returns 404 with X-Robots-Tag: noindex for archived projects', async () => {
    db.tables.content = [
      {
        id: 'project:archived-app',
        kind: 'project',
        key: 'archived-app',
        data: JSON.stringify({ title: 'Archived' }),
        sort_order: 10,
        state: 'archived',
        version: 1,
        created_at: '2026-11-21',
        updated_at: '2026-11-21',
        draft_data: null,
      },
    ]

    const req = new Request('https://alifaniani.ir/projects/archived-app')
    const ctx = {
      request: req,
      env,
      next: () => new Response('next', { status: 200 }),
    }

    const res = await (middlewareHandler as any)(ctx)
    expect(res.status).toBe(404)
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex')
  })

  it('returns 404 with X-Robots-Tag: noindex for unknown slug', async () => {
    const req = new Request('https://alifaniani.ir/projects/nonexistent')
    const ctx = {
      request: req,
      env,
      next: () => new Response('next', { status: 200 }),
    }

    const res = await (middlewareHandler as any)(ctx)
    expect(res.status).toBe(404)
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex')
  })

  it('dynamic sitemap merges newly published D1 project', async () => {
    db.tables.content = [
      {
        id: 'project:hawklyx',
        kind: 'project',
        key: 'hawklyx',
        data: JSON.stringify({ title: 'Hawklyx' }),
        state: 'published',
        updated_at: '2026-11-21T12:00:00.000Z',
      },
    ]

    const req = new Request('https://alifaniani.ir/sitemap.xml')
    const res = await (sitemapHandler as any)(makeContext(req, env))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('xml')

    const xml = await res.text()
    expect(xml).toContain('<loc>https://alifaniani.ir/projects/greenhawk-ai</loc>')
    expect(xml).toContain('<loc>https://alifaniani.ir/projects/hawklyx</loc>')
    expect(xml).toContain('<lastmod>2026-11-21</lastmod>')
  })
})

