import api from './axios';
export const getEstaciones = (empresaId: string) => api.get('/estaciones', { params: { empresaId } }).then(r => r.data);