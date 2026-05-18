import { inventoryApi } from './axios';

const toUnidad = (x: any) => ({ id: x.cen, cen: x.cen, codigo: x.code, nombre: x.name, abreviatura: x.abbreviation, activo: x.active });

export const getUnidades = (empresaId: string) =>
  inventoryApi.get(`/companies/${empresaId}/units`).then(r => r.data.map(toUnidad));

export const crearUnidad = (data: { empresaId: string; nombre: string }) =>
  inventoryApi.post(`/companies/${data.empresaId}/units`, {
    code: '',
    name: data.nombre,
    abbreviation: data.nombre.slice(0, 3).toUpperCase(),
    active: true,
  }).then(r => toUnidad(r.data));

export const editarUnidad = (id: string, data: { empresaId: string; nombre: string }) =>
  inventoryApi.put(`/companies/${data.empresaId}/units/${id}`, {
    code: data.nombre.trim().toUpperCase().replace(/\s+/g, '_'),
    name: data.nombre,
    abbreviation: data.nombre.slice(0, 3).toUpperCase(),
    active: true,
  }).then(r => toUnidad(r.data));
