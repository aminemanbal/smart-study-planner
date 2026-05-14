import api from './api'

export const list   = ()       => api.get('/api/documents').then(r => r.data)
export const get    = (id)     => api.get(`/api/documents/${id}`).then(r => r.data)
export const remove = (id)     => api.delete(`/api/documents/${id}`).then(r => r.data)

/**
 * Upload a PDF.
 * @param {File}   file
 * @param {string} subjectId  optional
 * @param {Function} onProgress (0..1)
 */
export const upload = async (file, { subjectId, onProgress } = {}) => {
  const form = new FormData()
  form.append('file', file)
  if (subjectId) form.append('subjectId', subjectId)

  const res = await api.post('/api/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total && onProgress) onProgress(e.loaded / e.total)
    },
  })
  return res.data
}
