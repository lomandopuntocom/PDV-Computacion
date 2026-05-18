import { inventoryApi, salesApi } from './axios';

export const getDashboard = async (empresaId: string) => {
  const [inventory, dailySales, topProducts, kdsStatus] = await Promise.all([
    inventoryApi.get(`/companies/${empresaId}/dashboard`).then(r => r.data),
    salesApi.get(`/companies/${empresaId}/dashboard/daily-sales`).then(r => r.data),
    salesApi.get(`/companies/${empresaId}/dashboard/top-products`).then(r => r.data),
    salesApi.get(`/companies/${empresaId}/dashboard/kds-status`).then(r => r.data),
  ]);

  return {
    totalVendido: dailySales.total ?? 0,
    cantidadTickets: 0,
    ticketPromedio: 0,
    topProductos: topProducts.map((x: any) => ({ producto: x.productCen, totalVendido: x.quantity })),
    agotados: [],
    stockBajo: Array.from({ length: inventory.lowStockCount ?? 0 }, (_, index) => ({ id: String(index), nombre: 'Producto con stock bajo', cantidad: 0, stockMinimo: 0 })),
    comandas: {
      pendiente: kdsStatus.find((x: any) => x.status === 'PENDING')?.count ?? 0,
      enPreparacion: kdsStatus.find((x: any) => x.status === 'IN_PROGRESS')?.count ?? 0,
      listo: kdsStatus.find((x: any) => x.status === 'READY')?.count ?? 0,
    },
  };
};
