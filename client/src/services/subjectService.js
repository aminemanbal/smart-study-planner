import api from './api'

export const list   = ()       => api.get('/api/subjects').then(r => r.data)
export const create = (data)   => api.post('/api/subjects', data).then(r => r.data)
export const update = (id, d)  => api.put(`/api/subjects/${id}`, d).then(r => r.data)
export const remove = (id)     => api.delete(`/api/subjects/${id}`).then(r => r.data)
