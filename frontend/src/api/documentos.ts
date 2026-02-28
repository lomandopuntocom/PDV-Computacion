import api from './axios';

export const getDocumentos = (empresaId: string) =>
  api.get('/documentos', { params: { empresaId } }).then(r => r.data);

export const getDocumento = (id: string) =>
  api.get(`/documentos/${id}`).then(r => r.data);

export const crearDocumento = (data: {
  empresaId: string;
  tipo: string;
  referencia?: string;
  observaciones?: string;
  items: { productoId: string; almacenId: string; cantidad: number }[];
}) => api.post('/documentos', data).then(r => r.data);

export const confirmarDocumento = (id: string) =>
  api.post(`/documentos/${id}/confirmar`).then(r => r.data);