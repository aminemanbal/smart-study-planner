import api from './api'

export const perSubject = () => api.get('/api/progress').then(r => r.data)
export const summary    = () => api.get('/api/progress/summary').then(r => r.data)
