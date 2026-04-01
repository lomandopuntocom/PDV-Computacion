import api from './axios';
export const getConfiguracion = (empresaId: string) => api.get('/configuracion', { params: { empresaId } }).then(r => r.data);
export const actualizarConfiguracion = (data: { empresaId: string; tasaImpuesto: number }) => api.put('/configuracion', data).then(r => r.data);