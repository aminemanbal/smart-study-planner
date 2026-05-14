import api from './api'

export const start    = (body)  => api.post('/api/sessions/start', body).then(r => r.data)
export const complete = (id, b) => api.patch(`/api/sessions/${id}/complete`, b || {}).then(r => r.data)
export const abandon  = (id, b) => api.patch(`/api/sessions/${id}/abandon`, b || {}).then(r => r.data)
export const active   = ()      => api.get('/api/sessions/active').then(r => r.data)
export const today    = ()      => api.get('/api/sessions/today').then(r => r.data)
export const stats    = ()      => api.get('/api/sessions/stats').then(r => r.data)
