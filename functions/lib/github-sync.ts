/**
 * GitHub repository synchronization dispatch (v2.0.1).
 *
 * After a successful publish + deploy-hook trigger, the publish endpoint
 * dispatches a `repository_dispatch` event so a GitHub Actions workflow can
 * mirror the generated repository files (content.json, sitemap.xml) from the
 * just-published D1 state. Dispatch failure is non-fatal and never blocks or
 * rolls back the D1 publish — production does not depend on synchronization.
 *
 * The workflow reads production D1 itself at execution time (never a payload
 * copy), so concurrent publishes cannot write stale state: D1 is read fresh
 * on every run.
 *
 * Security:
 *   - GITHUB_SYNC_TOKEN is read from the environment only (a fine-grained
 *     PAT limited to this repository with Contents: Read/Write).
 *   - Never printed, never logged, never returned in responses.
 *   - Diagnostics use failure categories only.
 */

export type DispatchStatus =
  | 'ok'
  | 'not_configured'
  | 'network_error'
  | 'http_error'
  | 'invalid_response'

export interface DispatchResult {
  ok: boolean
  category: DispatchStatus
  status?: number
}

/** Safe, loggable diagnostic for a dispatch result. Folds the HTTP status
 * into the failure category (`github_http_401`, `github_http_403`, …) so the
 * admin response and audit log pinpoint the GitHub failure. Never exposes
 * the token, request headers, or the response body — only the status code,
 * which carries no secret material. */
export function dispatchSyncReason(result: DispatchResult): string {
  if (result.category === 'http_error' && typeof result.status === 'number') {
    return `github_http_${result.status}`
  }
  return result.category
}

const REPO_OWNER = 'Greenhawk5'
const REPO_NAME = 'AliFaniani-Portfolio'
const EVENT_TYPE = 'cms-snapshot-sync'

export async function dispatchSnapshotSync(
  token: string | undefined
): Promise<DispatchResult> {
  if (!token) return { ok: false, category: 'not_configured' }
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event_type: EVENT_TYPE }),
      }
    )
    if (response.status === 204) return { ok: true, category: 'ok', status: 204 }
    return { ok: false, category: 'http_error', status: response.status }
  } catch {
    return { ok: false, category: 'network_error' }
  }
}
