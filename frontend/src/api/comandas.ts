import { salesApi } from './axios';

export const enviarComanda = (ticketId: string) =>
  salesApi.post(`/companies/${localStorage.getItem('companyCen') ?? ''}/tickets/${ticketId}/send`).then(r => r.data);

export const getKds = (estacionId: string) =>
  salesApi.get(`/companies/${localStorage.getItem('companyCen') ?? ''}/kds/teams/${estacionId}/items`).then(r => r.data);

export const cambiarEstado = (itemId: string, estado: string) =>
  salesApi.patch(`/companies/${localStorage.getItem('companyCen') ?? ''}/kds/items/${itemId}/status`, { status: estado }).then(r => r.data);
