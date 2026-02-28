import api from './axios';

export const getProductos = (empresaId: string) =>
  api.get('/productos', { params: { empresaId } }).then(r => r.data);

export const importarProductos = (empresaId: string, archivo: File) => {
  const form = new FormData();
  form.append('archivo', archivo);
  return api.post(`/import/productos/${empresaId}`, form).then(r => r.data);
};