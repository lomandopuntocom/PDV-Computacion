import axios from 'axios';

const getBaseURL = (envVal: string | undefined, defaultVal: string, suffix: string): string => {
  if (!envVal) return defaultVal;
  const normalizedEnv = envVal.trim().replace(/\/+$/, '');
  const normalizedSuffix = suffix.replace(/^\/+/, '');
  if (!normalizedEnv.endsWith(normalizedSuffix)) {
    return `${normalizedEnv}/${normalizedSuffix}`;
  }
  return normalizedEnv;
};

export const inventoryApi = axios.create({
  baseURL: getBaseURL(import.meta.env.VITE_INVENTORY_API_URL, 'http://localhost:5143/api/inventory', '/api/inventory'),
});

export const salesApi = axios.create({
  baseURL: getBaseURL(import.meta.env.VITE_SALES_API_URL, 'http://localhost:5074/api/sales', '/api/sales'),
});

export const purchasesApi = axios.create({
  baseURL: getBaseURL(import.meta.env.VITE_PURCHASES_API_URL, 'http://localhost:5229/api/purchases', '/api/purchases'),
});

export default inventoryApi;
