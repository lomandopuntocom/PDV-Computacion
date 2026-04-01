import api from './axios';
export const getTickets = (empresaId: string) => api.get('/tickets', { params: { empresaId } }).then(r => r.data);
export const crearTicket = (empresaId: string) => api.post('/tickets', { empresaId }).then(r => r.data);
export const getTicket = (id: string) => api.get(`/tickets/${id}`).then(r => r.data);
export const agregarItem = (ticketId: string, data: { productoId: string; cantidad: number; nota?: string }) =>
  api.post(`/tickets/${ticketId}/items`, data).then(r => r.data);
export const actualizarItem = (ticketId: string, itemId: string, data: { cantidad: number; nota?: string }) =>
  api.put(`/tickets/${ticketId}/items/${itemId}`, data).then(r => r.data);
export const cancelarTicket = (id: string) => api.post(`/tickets/${id}/cancelar`).then(r => r.data);