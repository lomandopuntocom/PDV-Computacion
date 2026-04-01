import api from './axios';
export const cobrar = (data: { ticketId: string; metodoPago: string }) => api.post('/pagos', data).then(r => r.data);