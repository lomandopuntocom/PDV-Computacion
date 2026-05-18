import { salesApi } from './axios';

export const cobrar = (data: { ticketId: string; metodoPago: string }) =>
  salesApi.get(`/companies/${localStorage.getItem('companyCen') ?? ''}/tickets/${data.ticketId}/totals`)
    .then(totals => salesApi.post(`/companies/${localStorage.getItem('companyCen') ?? ''}/tickets/${data.ticketId}/payment`, {
    paymentMethod: data.metodoPago,
    amount: totals.data.total ?? 0,
  }))
    .then(r => r.data);
