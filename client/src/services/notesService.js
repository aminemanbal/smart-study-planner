import api from './api'

export const list   = ()        => api.get('/api/notes').then(r => r.data)
export const get    = (id)      => api.get(`/api/notes/${id}`).then(r => r.data)
export const create = (body)    => api.post('/api/notes', body).then(r => r.data)
export const update = (id, b)   => api.patch(`/api/notes/${id}`, b).then(r => r.data)
export const remove = (id)      => api.delete(`/api/notes/${id}`).then(r => r.data)
