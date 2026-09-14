/**
 * GitHub repository synchronization dispatch (v2.0.0).
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
 *   - Diagnostics expose only non-sensitive GitHub error fields: the HTTP
 *     status, GitHub's own `message` and `documentation_url` (from the JSON
 *     error body), and the `X-Accepted-GitHub-Permissions` header. The raw
 *     response body, request headers, and the token are never returned.
 */

export type DispatchStatus =
  | 'ok'
  | 'not_configured'
  | 'network_error'
  | 'http_error'
  | 'invalid_response'

export interface DispatchDiagnostics {
  /** GitHub's own error message from the JSON body (e.g. "Resource not
   * accessible by personal access token"). */
  message?: string
  /** GitHub docs URL from the JSON body, when present. */
  documentationUrl?: string
  /** X-Accepted-GitHub-Permissions header — the permissions the endpoint
   * requires, e.g. "contents=write". */
  acceptedPermissions?: string
  /** HTTP statusText, when the JSON body is absent. */
  statusText?: string
}

export interface DispatchResult {
  ok: boolean
  category: DispatchStatus
  status?: number
  /** Sanitized diagnostics — populated only for non-204 HTTP responses. */
  diagnostics?: DispatchDiagnostics
}

/** Upper bound on how much of the error body we ever read. */
const MAX_BODY_BYTES = 2048

/** Extracts ONLY whitelisted, non-sensitive fields from a GitHub error
 * response. JSON bodies are parsed for `message`/`documentation_url`;
 * non-JSON bodies fall back to statusText. Nothing else is read, and the
 * body is never returned verbatim. */
async function extractDiagnostics(response: Response): Promise<DispatchDiagnostics> {
  const diagnostics: DispatchDiagnostics = {}
  try {
    const text = (await response.text()).slice(0, MAX_BODY_BYTES)
    try {
      const json = JSON.parse(text) as { message?: unknown; documentation_url?: unknown }
      if (typeof json.message === 'string') diagnostics.message = json.message.slice(0, 200)
      if (typeof json.documentation_url === 'string') {
        diagnostics.documentationUrl = json.documentation_url.slice(0, 200)
      }
    } catch {
      diagnostics.statusText = response.statusText.slice(0, 120) || undefined
    }
  } catch {
    // body unreadable — leave diagnostics empty
  }
  const accepted = response.headers.get('X-Accepted-GitHub-Permissions')
  if (accepted) diagnostics.acceptedPermissions = accepted.slice(0, 120)
  return diagnostics
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
          // GitHub rejects API requests without a User-Agent with 403 —
          // and Workers' fetch does not attach a default one.
          'User-Agent': 'alifaniani-portfolio-cms-sync',
        },
        body: JSON.stringify({ event_type: EVENT_TYPE }),
      }
    )
    if (response.status === 204) return { ok: true, category: 'ok', status: 204 }
    return {
      ok: false,
      category: 'http_error',
      status: response.status,
      diagnostics: await extractDiagnostics(response),
    }
  } catch {
    return { ok: false, category: 'network_error' }
  }
}
