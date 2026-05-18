import { salesApi } from './axios';

const toUiStatus = (status: string) => {
  if (status === 'OPEN') return 'ABIERTO';
  if (status === 'PAID') return 'PAGADO';
  if (status === 'CANCELLED') return 'CANCELADO';
  return status;
};

const ticket = (t: any) => ({
  id: t.cen,
  numero: Number(String(t.ticketNumber ?? '').replace(/\D/g, '')) || 0,
  estado: toUiStatus(t.status),
  createdAt: new Date().toISOString(),
  totalItems: t.itemCount ?? 0,
});

export const getTickets = (empresaId: string) => salesApi.get(`/companies/${empresaId}/tickets`).then(r => r.data.map(ticket));
export const crearTicket = (empresaId: string) => salesApi.post(`/companies/${empresaId}/tickets`, {}).then(r => ticket(r.data));
export const getTicket = async (id: string) => {
  const companyCen = localStorage.getItem('companyCen') ?? '';
  const [tickets, items, totals] = await Promise.all([
    salesApi.get(`/companies/${companyCen}/tickets`).then(r => r.data),
    salesApi.get(`/companies/${companyCen}/tickets/${id}/items`).then(r => r.data),
    salesApi.get(`/companies/${companyCen}/tickets/${id}/totals`).then(r => r.data),
  ]);
  const found = tickets.find((t: any) => t.cen === id) ?? {};
  return {
    id,
    numero: Number(String(found.ticketNumber ?? '').replace(/\D/g, '')) || 0,
    estado: toUiStatus(found.status ?? 'OPEN'),
    items: items.map((item: any) => ({
      id: item.cen,
      productoId: item.productCen,
      producto: item.productCode ?? item.productCen,
      cantidad: item.quantity,
      precioUnitario: item.unitPrice,
      nota: item.notes,
      subtotal: item.quantity * item.unitPrice,
    })),
    subtotal: totals.subtotal ?? 0,
    impuesto: totals.tax ?? 0,
    total: totals.total ?? 0,
    tasaImpuesto: totals.subtotal ? (totals.tax ?? 0) / totals.subtotal : 0.18,
  };
};
export const agregarItem = (ticketId: string, data: { productoId: string; cantidad: number; precioUnitario?: number; nota?: string }) =>
  salesApi.post(`/companies/${localStorage.getItem('companyCen') ?? ''}/tickets/${ticketId}/items`, {
    productCen: data.productoId,
    quantity: data.cantidad,
    unitPrice: data.precioUnitario ?? 0,
    notes: data.nota,
  }).then(r => r.data);
export const actualizarItem = (ticketId: string, itemId: string, data: { cantidad: number; nota?: string }) =>
  salesApi.patch(`/companies/${localStorage.getItem('companyCen') ?? ''}/tickets/${ticketId}/items/${itemId}`, {
    quantity: data.cantidad,
    notes: data.nota,
  }).then(r => r.data);
export const cancelarTicket = (id: string) =>
  salesApi.post(`/companies/${localStorage.getItem('companyCen') ?? ''}/tickets/${id}/cancel`).then(r => r.data);
