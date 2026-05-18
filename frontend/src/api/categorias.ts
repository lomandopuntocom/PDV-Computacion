import { inventoryApi } from './axios';

const toCategoria = (x: any) => ({ id: x.cen, cen: x.cen, codigo: x.code, nombre: x.name, activo: x.active });

export const getCategorias = (empresaId: string) =>
  inventoryApi.get(`/companies/${empresaId}/categories`).then(r => r.data.map(toCategoria));

export const crearCategoria = (data: { empresaId: string; nombre: string }) =>
  inventoryApi.post(`/companies/${data.empresaId}/categories`, {
    code: '',
    name: data.nombre,
    active: true,
  }).then(r => toCategoria(r.data));

export const editarCategoria = (id: string, data: { empresaId: string; nombre: string }) =>
  inventoryApi.put(`/companies/${data.empresaId}/categories/${id}`, {
    code: data.nombre.trim().toUpperCase().replace(/\s+/g, '_'),
    name: data.nombre,
    active: true,
  }).then(r => toCategoria(r.data));
