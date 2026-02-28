import api from './axios';

export const getAlmacenes = (empresaId: string) =>
  api.get('/almacenes', { params: { empresaId } }).then(r => r.data);