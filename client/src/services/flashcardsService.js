import api from './api'

export const list      = (params) => api.get('/api/flashcards', { params }).then(r => r.data)
export const due       = (params) => api.get('/api/flashcards/due', { params }).then(r => r.data)
export const stats     = ()       => api.get('/api/flashcards/stats').then(r => r.data)
export const create    = (body)   => api.post('/api/flashcards', body).then(r => r.data)
export const bulk      = (body)   => api.post('/api/flashcards/bulk', body).then(r => r.data)
export const generate  = (body)   => api.post('/api/flashcards/generate', body).then(r => r.data)
export const update    = (id, b)  => api.patch(`/api/flashcards/${id}`, b).then(r => r.data)
export const review    = (id, q)  => api.post(`/api/flashcards/${id}/review`, { quality: q }).then(r => r.data)
export const remove    = (id)     => api.delete(`/api/flashcards/${id}`).then(r => r.data)
