import { inventoryApi, salesApi } from './axios';

export const getDashboard = async (empresaId: string) => {
  const [, dailySales, topProducts, kdsStatus, stockItems, monthlySales] = await Promise.all([
    inventoryApi.get(`/companies/${empresaId}/dashboard`).then(r => r.data),
    salesApi.get(`/companies/${empresaId}/dashboard/daily-sales`).then(r => r.data),
    salesApi.get(`/companies/${empresaId}/dashboard/top-products`).then(r => r.data),
    salesApi.get(`/companies/${empresaId}/dashboard/kds-status`).then(r => r.data),
    inventoryApi.get(`/companies/${empresaId}/stock`).then(r => r.data),
    salesApi.get(`/companies/${empresaId}/dashboard/monthly`).then(r => r.data),
  ]);

  const agotados = stockItems.filter((x: any) => x.quantity <= 0).map((x: any) => ({
    id: x.productCen, nombre: x.productCen
  }));

  const stockBajo = stockItems.filter((x: any) => x.lowStock && x.quantity > 0).map((x: any) => ({
    id: x.productCen, nombre: x.productCen, cantidad: x.quantity, stockMinimo: x.minQuantity
  }));

  return {
    totalVendido: dailySales.total ?? 0,
    cantidadTickets: 0,
    ticketPromedio: 0,
    topProductos: topProducts.map((x: any) => ({ producto: x.productCen, totalVendido: x.quantity })),
    agotados,
    stockBajo,
    comandas: {
      pendiente: kdsStatus.find((x: any) => x.status === 'PENDING')?.count ?? 0,
      enPreparacion: kdsStatus.find((x: any) => x.status === 'IN_PROGRESS')?.count ?? 0,
      listo: kdsStatus.find((x: any) => x.status === 'READY')?.count ?? 0,
    },
    ventasMensuales: {
      mesActual: monthlySales.currentMonthSales ?? 0,
      mesAnterior: monthlySales.previousMonthSales ?? 0,
    }
  };
};
