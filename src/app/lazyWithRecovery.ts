import { lazy, type ComponentType } from 'react'

type PageModule = { default: ComponentType }

function isDynamicImportFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|importing a module script failed|mime type of ['"]text\/html/i.test(message)
}

function reloadFreshDocument() {
  const url = new URL(window.location.href)
  url.searchParams.set('_deploy_refresh', Date.now().toString())
  window.location.replace(url.href)
}

// A deployment can leave an open tab referring to an old hashed chunk graph.
// Retry once with a fresh HTML document, then surface real failures normally.
export function lazyWithChunkRecovery(load: () => Promise<PageModule>) {
  return lazy(async () => {
    try {
      return await load()
    } catch (error) {
      if (!isDynamicImportFailure(error)) throw error

      const recoveryKey = 'portfolio:chunk-recovery'
      if (!sessionStorage.getItem(recoveryKey)) {
        sessionStorage.setItem(recoveryKey, '1')
        reloadFreshDocument()
        return new Promise<PageModule>(() => {})
      }

      sessionStorage.removeItem(recoveryKey)
      throw error
    }
  })
}
