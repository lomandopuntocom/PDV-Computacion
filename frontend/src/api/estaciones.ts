import { salesApi } from './axios';

export const getEstaciones = (empresaId: string) =>
  salesApi.get(`/companies/${empresaId}/kds/teams`).then(r => r.data.map((x: any) => ({
    id: x.cen,
    nombre: x.name,
    tipo: x.stationType,
  })));
