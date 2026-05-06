import api from './api'

export const generatePlan = () =>
  api.post('/api/ai/plan/generate').then(r => r.data)

export const getInsights = () =>
  api.get('/api/ai/insights').then(r => r.data)

/**
 * Stream a chat turn from the backend SSE endpoint.
 *
 * @param {Array}    messages    [{role, content}, ...]
 * @param {object}   handlers
 * @param {Function} handlers.onText      ({delta}) => void
 * @param {Function} handlers.onToolUse   ({name, input}) => void
 * @param {Function} handlers.onToolResult ({name, isError}) => void
 * @param {Function} handlers.onDone      ({usage}) => void
 * @param {Function} handlers.onError     ({message}) => void
 * @param {AbortSignal} signal            optional abort signal
 */
export const chat = async (messages, handlers, { signal } = {}) => {
  const baseURL = api.defaults.baseURL || ''
  const token = localStorage.getItem('token')

  const response = await fetch(`${baseURL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!response.ok || !response.body) {
    let msg = `Chat failed: HTTP ${response.status}`
    try {
      const data = await response.json()
      if (data?.message) msg = data.message
    } catch { /* ignore */ }
    handlers.onError?.({ message: msg })
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE events are separated by blank lines
    const events = buffer.split('\n\n')
    buffer = events.pop() // last (possibly incomplete) event stays in the buffer

    for (const ev of events) {
      const line = ev.split('\n').find(l => l.startsWith('data: '))
      if (!line) continue
      const payload = line.slice(6)
      if (!payload) continue
      let data
      try { data = JSON.parse(payload) } catch { continue }

      switch (data.type) {
        case 'text':        handlers.onText?.(data); break
        case 'tool_use':    handlers.onToolUse?.(data); break
        case 'tool_result': handlers.onToolResult?.(data); break
        case 'done':        handlers.onDone?.(data); break
        case 'error':       handlers.onError?.(data); break
      }
    }
  }
}
