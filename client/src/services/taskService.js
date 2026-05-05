import api from './api'

export const list         = ()              => api.get('/api/tasks').then(r => r.data)
export const generate     = ()              => api.post('/api/tasks/generate').then(r => r.data)
export const updateStatus = (id, status)    => api.patch(`/api/tasks/${id}/status`, { status }).then(r => r.data)
export const remove       = (id)            => api.delete(`/api/tasks/${id}`).then(r => r.data)
