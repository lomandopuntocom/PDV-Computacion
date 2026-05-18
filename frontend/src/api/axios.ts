import axios from 'axios';

export const inventoryApi = axios.create({
  baseURL: import.meta.env.VITE_INVENTORY_API_URL ?? 'http://localhost:5143/api/inventory',
});

export const salesApi = axios.create({
  baseURL: import.meta.env.VITE_SALES_API_URL ?? 'http://localhost:5074/api/sales',
});

export const purchasesApi = axios.create({
  baseURL: import.meta.env.VITE_PURCHASES_API_URL ?? 'http://localhost:5229/api/purchases',
});

export default inventoryApi;
