import axios from 'axios';

const getBaseURL = (envVal: string | undefined, defaultVal: string, suffix: string): string => {
  if (envVal) {
    const normalizedEnv = envVal.trim().replace(/\/+$/, '');
    const normalizedSuffix = suffix.replace(/^\/+/, '');
    if (!normalizedEnv.endsWith(normalizedSuffix)) {
      return `${normalizedEnv}/${normalizedSuffix}`;
    }
    return normalizedEnv;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const protocol = window.location.protocol;

    // Detect if we are running in the Kubernetes nodeport setup
    if (port === '30080') {
      if (suffix.includes('inventory')) {
        return `${protocol}//${hostname}:30143/api/inventory`;
      }
      if (suffix.includes('sales')) {
        return `${protocol}//${hostname}:30074/api/sales`;
      }
      if (suffix.includes('purchases')) {
        return `${protocol}//${hostname}:30085/api/purchases`;
      }
    }
  }

  return defaultVal;
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
