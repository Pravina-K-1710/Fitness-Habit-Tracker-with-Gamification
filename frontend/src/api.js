// Simple API helper. Stores token in localStorage for brevity.
// Use Vite env var (VITE_API_BASE) in the browser; fall back to backend.
// Use 127.0.0.1 instead of 'localhost' to avoid IPv6/hostname resolution
// issues that can cause "Failed to fetch" in some dev setups.
const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export async function request(path, method = 'GET', body) {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(API_BASE + path, {
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
