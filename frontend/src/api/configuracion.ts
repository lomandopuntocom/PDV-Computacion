import { salesApi } from './axios';

export const getConfiguracion = (empresaId: string) =>
  salesApi.get(`/companies/${empresaId}/tax-configuration`).then(r => ({ tasaImpuesto: r.data.taxRate }));

export const actualizarConfiguracion = (data: { empresaId: string; tasaImpuesto: number }) =>
  salesApi.put(`/companies/${data.empresaId}/tax-configuration`, { taxRate: data.tasaImpuesto }).then(r => r.data);
