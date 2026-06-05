const BASE = import.meta.env.VITE_API_URL ?? ''

export function apiUrl(path) {
  return `${BASE}${path}`
}

export async function apiGet(path) {
  const res = await fetch(apiUrl(path))
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function apiPost(path, body = null) {
  const options = { method: 'POST' }
  if (body instanceof FormData) {
    options.body = body
  } else if (body != null) {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(body)
  }

  const res = await fetch(apiUrl(path), options)
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(payload.error ?? payload.message ?? `${res.status} ${res.statusText}`)
  }
  return res.json()
}
