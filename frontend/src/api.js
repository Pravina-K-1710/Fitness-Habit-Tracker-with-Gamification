// Simple API helper. Stores token in localStorage for brevity.
// Use Vite env var (VITE_API_BASE) in the browser; fall back to backend.
// Use 127.0.0.1 instead of 'localhost' to avoid IPv6/hostname resolution
// issues that can cause "Failed to fetch" in some dev setups.
const API_BASE = import.meta.env.VITE_API_BASE || ''

export async function request(path, method = 'GET', body) {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  // If no API base is provided, assume Vite will proxy /api to the backend.
  const url = API_BASE ? API_BASE + path : '/api' + path
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(txt || res.statusText)
  }
  return res.json()
}

export function saveToken(token) {
  localStorage.setItem('token', token)
}

export function clearToken() {
  localStorage.removeItem('token')
}
