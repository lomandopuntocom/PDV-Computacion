import api from './axios';

export const getKardex = (productoId: string) =>
  api.get('/movimientos', { params: { productoId } }).then(r => r.data);