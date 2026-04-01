import api from './axios';
export const getUnidades = (empresaId: string) => api.get('/unidades', { params: { empresaId } }).then(r => r.data);
export const crearUnidad = (data: { empresaId: string; nombre: string }) => api.post('/unidades', data).then(r => r.data);
export const editarUnidad = (id: string, data: { empresaId: string; nombre: string }) => api.put(`/unidades/${id}`, data).then(r => r.data);