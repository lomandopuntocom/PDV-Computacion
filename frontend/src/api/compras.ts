import { purchasesApi } from './axios';

const mapEstado = (status: string) => {
  if (status === 'DRAFT') return 'PENDIENTE';
  if (status === 'CONFIRMED') return 'CONFIRMADA';
  if (status === 'CANCELLED') return 'CANCELADA';
  return status;
};

const mapOrdenLista = (o: any) => ({
  id: o.cen,
  cen: o.cen,
  proveedor: o.supplier,
  estado: mapEstado(o.status),
  estadoApi: o.status,
  fecha: o.date,
  totalItems: o.itemCount ?? 0,
});

const mapOrdenDetalle = (o: any) => ({
  id: o.cen,
  cen: o.cen,
  proveedor: o.supplier,
  estado: mapEstado(o.status),
  estadoApi: o.status,
  fecha: o.date,
  items: (o.items ?? []).map((item: any) => ({
    id: item.cen,
    productoId: item.productCen,
    productoCen: item.productCen,
    cantidad: item.quantity,
  })),
});

export const getOrdenes = (empresaId: string, status?: string) =>
  purchasesApi
    .get(`/companies/${empresaId}/orders`, { params: { status, pageSize: 100, sortDescending: true } })
    .then(r => (r.data.items ?? r.data.Items ?? []).map(mapOrdenLista));

export const getOrden = (empresaId: string, ordenId: string) =>
  purchasesApi.get(`/companies/${empresaId}/orders/${ordenId}`).then(r => mapOrdenDetalle(r.data));

export const getProveedores = (empresaId: string) =>
  purchasesApi
    .get(`/companies/${empresaId}/suppliers`)
    .then(r => r.data.map((s: any) => ({
      id: s.supplierCen ?? s.code,
      codigo: s.code ?? s.supplierCen,
      nombre: s.name,
      activo: s.active ?? true,
    })))
    .catch(() => [] as { id: string; codigo: string; nombre: string; activo: boolean }[]);

export const crearProveedor = (empresaId: string, data: { nombre: string; codigo?: string }) =>
  purchasesApi
    .post(`/companies/${empresaId}/suppliers`, { name: data.nombre, code: data.codigo ?? '' })
    .then((r: any) => ({
      id: r.data.supplierCen ?? r.data.code,
      codigo: r.data.code ?? r.data.supplierCen,
      nombre: r.data.name,
      activo: r.data.active ?? true,
    }));

export const crearOrden = (
  empresaId: string,
  data: { proveedorCen: string; items: { productoId: string; cantidad: number }[] }
) =>
  purchasesApi
    .post(`/companies/${empresaId}/orders`, {
      supplierCen: data.proveedorCen,
      items: data.items.map(i => ({ productCen: i.productoId, quantity: i.cantidad })),
    })
    .then(r => mapOrdenDetalle(r.data));

export const confirmarOrden = (empresaId: string, ordenId: string) =>
  purchasesApi.post(`/companies/${empresaId}/orders/${ordenId}/confirm`).then(r => mapOrdenDetalle(r.data));

export const cancelarOrden = (empresaId: string, ordenId: string) =>
  purchasesApi.post(`/companies/${empresaId}/orders/${ordenId}/cancel`).then(r => mapOrdenDetalle(r.data));
