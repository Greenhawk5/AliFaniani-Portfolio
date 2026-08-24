export interface ContactFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  message: string
  company: string
}

interface ContactSuccess {
  ok: true
}

interface ContactFailure {
  ok: false
  error: string
}

export async function sendContactMessage(
  data: ContactFormData,
  turnstileToken?: string
): Promise<void> {
  let response: Response
  try {
    response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(turnstileToken ? { 'X-Turnstile-Token': turnstileToken } : {}),
      },
      body: JSON.stringify(data),
    })
  } catch {
    throw new Error('Network error — please check your connection and try again.')
  }

  let payload: ContactSuccess | ContactFailure
  try {
    payload = (await response.json()) as ContactSuccess | ContactFailure
  } catch {
    throw new Error(
      `Unable to send your message (error ${response.status}). Please try again later.`
    )
  }
  if (!response.ok || payload.ok === false) {
    const message =
      payload.ok === false && payload.error
        ? payload.error
        : `Unable to send your message (error ${response.status}). Please try again later.`
    throw new Error(message)
  }
}
