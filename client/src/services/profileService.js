import api from './api'

export const get    = ()        => api.get('/api/profile').then(r => r.data)
export const update = (patch)   => api.patch('/api/profile', patch).then(r => r.data)
