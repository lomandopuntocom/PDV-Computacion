import api from './axios';
export const getCategorias = (empresaId: string) => api.get('/categorias', { params: { empresaId } }).then(r => r.data);
export const crearCategoria = (data: { empresaId: string; nombre: string }) => api.post('/categorias', data).then(r => r.data);
export const editarCategoria = (id: string, data: { empresaId: string; nombre: string }) => api.put(`/categorias/${id}`, data).then(r => r.data);