import { inventoryApi } from './axios';

export const getEmpresas = () =>
  inventoryApi.get('/companies').then(r =>
    r.data.map((empresa: any) => ({
      id: empresa.cen,
      cen: empresa.cen,
      nombre: empresa.name,
      nit: empresa.nit,
    }))
  );
