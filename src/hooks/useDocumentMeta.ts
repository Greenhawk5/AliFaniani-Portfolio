import { useEffect } from 'react'
import { SITE } from '@/app/config'

interface DocumentMeta {
  title: string
  description: string
}

function setMeta(selector: string, attr: string, value: string) {
  const el = document.head.querySelector(selector)
  if (el) el.setAttribute(attr, value)
}

export function useDocumentMeta({ title, description }: DocumentMeta) {
  useEffect(() => {
    document.title = `${title} — ${SITE.name}`
    setMeta('meta[name="description"]', 'content', description)
    setMeta('meta[property="og:title"]', 'content', `${title} — ${SITE.name}`)
    setMeta('meta[property="og:description"]', 'content', description)
  }, [title, description])
}
