import api from './api'

export const listConversations  = ()        => api.get('/api/tutor/conversations').then(r => r.data)
export const getConversation    = (id)      => api.get(`/api/tutor/conversations/${id}`).then(r => r.data)
export const renameConversation = (id, body) => api.patch(`/api/tutor/conversations/${id}`, body).then(r => r.data)
export const deleteConversation = (id)      => api.delete(`/api/tutor/conversations/${id}`).then(r => r.data)

/**
 * Stream a tutor reply.
 *
 * @param {object}   args
 * @param {string?}  args.conversationId  null/undefined to start a new conversation
 * @param {string}   args.message
 * @param {string?}  args.subjectId
 * @param {object}   handlers
 * @param {Function} handlers.onMeta   ({conversationId, title, isNew}) => void
 * @param {Function} handlers.onText   ({delta}) => void
 * @param {Function} handlers.onDone   () => void
 * @param {Function} handlers.onError  ({message}) => void
 * @param {object?}  opts
 * @param {AbortSignal?} opts.signal
 */
export const chat = async ({ conversationId, message, subjectId }, handlers, { signal } = {}) => {
  const baseURL = api.defaults.baseURL || ''
  const token = localStorage.getItem('token')

  const response = await fetch(`${baseURL}/api/tutor/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ conversationId: conversationId || null, message, subjectId: subjectId || null }),
    signal,
  })

  if (!response.ok || !response.body) {
    let msg = `Tutor failed: HTTP ${response.status}`
    try { const d = await response.json(); if (d?.message) msg = d.message } catch { /* ignore */ }
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
    const events = buffer.split('\n\n')
    buffer = events.pop()
    for (const ev of events) {
      const line = ev.split('\n').find(l => l.startsWith('data: '))
      if (!line) continue
      const payload = line.slice(6)
      if (!payload) continue
      let data
      try { data = JSON.parse(payload) } catch { continue }
      switch (data.type) {
        case 'meta':  handlers.onMeta?.(data); break
        case 'text':  handlers.onText?.(data); break
        case 'done':  handlers.onDone?.(data); break
        case 'error': handlers.onError?.(data); break
      }
    }
  }
}
