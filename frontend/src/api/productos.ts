import { inventoryApi } from './axios';

export const getProductos = (empresaId: string, categoriaId?: string, buscar?: string) =>
  inventoryApi.get(`/companies/${empresaId}/products`, { params: { categoryCen: categoriaId, search: buscar, pageSize: 100 } })
    .then(r => r.data.items.map((p: any) => ({
      id: p.cen,
      cen: p.cen,
      codigo: p.code,
      nombre: p.name,
      precio: p.price,
      categoria: p.categoryCen ?? '',
      categoriaId: p.categoryCen ?? '',
      unidad: p.unitCen ?? '',
      unidadId: p.unitCen ?? '',
      estacionId: p.stationCode ?? '',
      stockMinimo: 0,
      agotado: p.isOutOfStock,
      activo: p.active,
    })));

export const crearProducto = (data: any) =>
  inventoryApi.post(`/companies/${data.empresaId}/products`, {
    code: '',
    sku: data.nombre.trim().toUpperCase().replace(/\s+/g, '-'),
    name: data.nombre,
    categoryCen: data.categoriaId,
    unitCen: data.unidadId,
    price: data.precio,
    cost: data.costo ?? 0,
    trackStock: true,
    stationCode: data.estacionId,
  }).then(r => r.data);

export const editarProducto = (id: string, data: any) =>
  inventoryApi.put(`/companies/${data.empresaId}/products/${id}`, {
    code: data.nombre.trim().toUpperCase().replace(/\s+/g, '_'),
    sku: data.nombre.trim().toUpperCase().replace(/\s+/g, '-'),
    name: data.nombre,
    categoryCen: data.categoriaId,
    unitCen: data.unidadId,
    price: data.precio,
    cost: data.costo ?? 0,
    trackStock: true,
    stationCode: data.estacionId,
  }).then(r => r.data);

export const toggleActivo = async (id: string) => {
  const companyCen = localStorage.getItem('companyCen') ?? '';
  const productos = await getProductos(companyCen);
  const producto = productos.find((p: any) => p.id === id);
  return inventoryApi.patch(`/companies/${companyCen}/products/${id}/status`, {
    active: !(producto?.activo ?? true),
    isOutOfStock: producto?.agotado ?? false,
  }).then(r => r.data);
};

export const toggleAgotado = async (id: string) => {
  const companyCen = localStorage.getItem('companyCen') ?? '';
  const productos = await getProductos(companyCen);
  const producto = productos.find((p: any) => p.id === id);
  return inventoryApi.patch(`/companies/${companyCen}/products/${id}/status`, {
    active: producto?.activo ?? true,
    isOutOfStock: !(producto?.agotado ?? false),
  }).then(r => r.data);
};
