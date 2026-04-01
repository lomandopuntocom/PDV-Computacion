import api from './axios';
export const enviarComanda = (ticketId: string) => api.post('/comandas', { ticketId }).then(r => r.data);
export const getKds = (estacionId: string) => api.get(`/comandas/kds/${estacionId}`).then(r => r.data);
export const cambiarEstado = (itemId: string, estado: string) =>
  api.patch(`/comandas/items/${itemId}/estado`, { estado }).then(r => r.data);