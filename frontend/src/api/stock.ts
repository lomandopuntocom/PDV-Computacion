import { inventoryApi } from './axios';

export const getStock = (empresaId: string) =>
  inventoryApi.get(`/companies/${empresaId}/stock`).then(r => r.data.map((x: any) => ({
    id: x.productCen,
    nombre: x.productCen,
    cantidad: x.quantity,
    stockMinimo: x.minQuantity,
    agotado: x.quantity <= 0,
    stockBajo: x.lowStock,
  })));

export const registrarAjuste = (data: { productoId: string; tipo: string; cantidad: number; motivo: string }) =>
  inventoryApi.post(`/companies/${localStorage.getItem('companyCen') ?? ''}/stock/adjustments`, {
    productCen: data.productoId,
    quantity: data.tipo === 'SALIDA' ? -Math.abs(data.cantidad) : Math.abs(data.cantidad),
    reason: data.motivo,
  }).then(r => r.data);
