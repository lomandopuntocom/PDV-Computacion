import api from './axios';

export const getProductos = (empresaId: string, categoriaId?: string, buscar?: string) =>
  api.get('/productos', { params: { empresaId, categoriaId, buscar } }).then(r => r.data);

export const crearProducto = (data: object) => api.post('/productos', data).then(r => r.data);
export const editarProducto = (id: string, data: object) => api.put(`/productos/${id}`, data).then(r => r.data);
export const toggleActivo = (id: string) => api.patch(`/productos/${id}/activo`).then(r => r.data);
export const toggleAgotado = (id: string) => api.patch(`/productos/${id}/agotado`).then(r => r.data);