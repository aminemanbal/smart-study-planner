import api from './api'

export const list   = ()      => api.get('/api/exams').then(r => r.data)
export const create = (data)  => api.post('/api/exams', data).then(r => r.data)
export const update = (id, d) => api.put(`/api/exams/${id}`, d).then(r => r.data)
export const remove = (id)    => api.delete(`/api/exams/${id}`).then(r => r.data)
