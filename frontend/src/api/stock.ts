import api from './axios';
export const getStock = (empresaId: string) => api.get('/stock', { params: { empresaId } }).then(r => r.data);
export const registrarAjuste = (data: { productoId: string; tipo: string; cantidad: number; motivo: string }) =>
  api.post('/stock/ajuste', data).then(r => r.data);