// Small shared helpers used across components.

// A friendly message for a failed JSON file read.
export const jsonErrorText = (err) =>
  err instanceof SyntaxError ? "That file isn't valid JSON." : err.message

// Turn a name into a safe-ish download filename slug (falls back to `fallback`).
export const slug = (name, fallback = 'file') =>
  (name || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback

// Trigger a browser download of `data` as a pretty-printed JSON file.
export function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
