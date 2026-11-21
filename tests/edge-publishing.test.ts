import { describe, it, expect, beforeEach } from 'vitest'
import { FakeD1Database, FakeKV, makeEnv, makeContext } from './helpers'
import { onRequest as middlewareHandler } from '../functions/_middleware'
import { onRequestGet as sitemapHandler } from '../functions/sitemap.xml'
import { onRequestGet as projectsApiHandler } from '../functions/api/projects/index'
import { onRequestGet as projectDetailApiHandler } from '../functions/api/projects/[slug]'

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
    expect(html).toContain('<script id="__DYNAMIC_PROJECT__" type="application/json">')
    expect(html).toContain('"slug":"hawklyx"')
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

  it('GET /api/projects returns all published projects from D1', async () => {
    db.tables.content = [
      {
        id: 'project:p1',
        kind: 'project',
        key: 'p1',
        data: JSON.stringify({ slug: 'p1', title: 'Project 1' }),
        sort_order: 1,
        state: 'published',
      },
      {
        id: 'project:p2',
        kind: 'project',
        key: 'p2',
        data: JSON.stringify({ slug: 'p2', title: 'Project 2' }),
        sort_order: 2,
        state: 'published',
      },
      {
        id: 'project:draft1',
        kind: 'project',
        key: 'draft1',
        data: JSON.stringify({ slug: 'draft1', title: 'Draft Project' }),
        sort_order: 3,
        state: 'draft',
      },
    ]

    const req = new Request('https://alifaniani.ir/api/projects')
    const res = await (projectsApiHandler as any)(makeContext(req, env))
    expect(res.status).toBe(200)
    const list = await res.json()
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBe(2)
    expect(list.map((p: any) => p.slug)).toEqual(['p1', 'p2'])
  })

  it('GET /api/projects/:slug returns published project and rejects unpublished', async () => {
    db.tables.content = [
      {
        id: 'project:published-app',
        kind: 'project',
        key: 'published-app',
        data: JSON.stringify({ slug: 'published-app', title: 'Published App' }),
        sort_order: 1,
        state: 'published',
      },
      {
        id: 'project:draft-app',
        kind: 'project',
        key: 'draft-app',
        data: JSON.stringify({ slug: 'draft-app', title: 'Draft App' }),
        sort_order: 2,
        state: 'draft',
      },
    ]

    // 1. Published project returns 200
    const req1 = new Request('https://alifaniani.ir/api/projects/published-app')
    const ctx1 = { ...makeContext(req1, env), params: { slug: 'published-app' } }
    const res1 = await (projectDetailApiHandler as any)(ctx1)
    expect(res1.status).toBe(200)
    const data1 = await res1.json()
    expect(data1.slug).toBe('published-app')

    // 2. Draft project returns 404
    const req2 = new Request('https://alifaniani.ir/api/projects/draft-app')
    const ctx2 = { ...makeContext(req2, env), params: { slug: 'draft-app' } }
    const res2 = await (projectDetailApiHandler as any)(ctx2)
    expect(res2.status).toBe(404)
    expect(res2.headers.get('X-Robots-Tag')).toBe('noindex')

    // 3. Nonexistent project returns 404
    const req3 = new Request('https://alifaniani.ir/api/projects/nonexistent')
    const ctx3 = { ...makeContext(req3, env), params: { slug: 'nonexistent' } }
    const res3 = await (projectDetailApiHandler as any)(ctx3)
    expect(res3.status).toBe(404)
  })
})

