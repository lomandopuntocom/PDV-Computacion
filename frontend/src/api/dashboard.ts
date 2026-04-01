import api from './axios';
export const getDashboard = (empresaId: string) => api.get('/dashboard', { params: { empresaId } }).then(r => r.data);