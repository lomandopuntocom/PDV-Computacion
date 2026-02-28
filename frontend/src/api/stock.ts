import api from './axios';

export const getStock = (empresaId: string) =>
  api.get('/stock', { params: { empresaId } }).then(r => r.data);

export const getResumen = (empresaId: string) =>
  api.get('/stock/resumen', { params: { empresaId } }).then(r => r.data);

export const registrarAjuste = (data: {
  productoId: string;
  almacenId: string;
  cantidadNueva: number;
  motivo: string;
}) => api.post('/movimientos/ajuste', data).then(r => r.data);