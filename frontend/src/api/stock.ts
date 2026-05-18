import { inventoryApi } from './axios';

export const getStock = (empresaId: string) =>
  inventoryApi.get(`/companies/${empresaId}/stock`).then(r => r.data.map((x: any) => ({
    id: x.productCen,
    cen: x.productCen,
    codigo: x.productCode ?? x.productCen,
    nombre: x.productCode ?? x.productCen,
    cantidad: x.quantity,
    stockMinimo: x.minQuantity,
    agotado: x.quantity <= 0,
    stockBajo: x.lowStock,
  })));

export const registrarAjuste = (empresaId: string, data: { productoId: string; tipo: string; cantidad: number; motivo: string }) =>
  inventoryApi.post(`/companies/${empresaId}/stock/adjustments`, {
    productCen: data.productoId,
    quantity: data.tipo === 'SALIDA' ? -Math.abs(data.cantidad) : Math.abs(data.cantidad),
    reason: data.motivo,
  }).then(r => r.data);
