import api from './axios';
export const getEmpresas = () => api.get('/empresas').then(r => r.data);