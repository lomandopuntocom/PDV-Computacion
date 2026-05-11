import api from './axios';

/**
 * POS Module API - Products
 * Contract: GET/POST/PUT/PATCH /pos/products
 */

export const posProducts = {
  // GET /pos/products
  getAll: (empresaId: string, params?: { categoriaId?: string; buscar?: string }) =>
    api.get('/pos/products', { params: { empresaId, ...params } }).then(r => r.data),

  // POST /pos/products
  create: (data: { empresaId: string; name: string; categoryId: string; unitId: string; price: number }) =>
    api.post('/pos/products', data).then(r => r.data),

  // PUT /pos/products/{productId}
  update: (productId: string, data: { name?: string; categoryId?: string; unitId?: string; price?: number }) =>
    api.put(`/pos/products/${productId}`, data).then(r => r.data),

  // PATCH /pos/products/{productId}/status
  updateStatus: (productId: string, status: 'ACTIVE' | 'INACTIVE' | 'EXHAUSTED') =>
    api.patch(`/pos/products/${productId}/status`, { status }).then(r => r.data),
};

/**
 * POS Module API - Categories
 * Contract: GET/POST/PUT /pos/categories
 */

export const posCategories = {
  // GET /pos/categories
  getAll: (empresaId: string) =>
    api.get('/pos/categories', { params: { empresaId } }).then(r => r.data),

  // POST /pos/categories
  create: (data: { empresaId: string; nombre: string }) =>
    api.post('/pos/categories', data).then(r => r.data),

  // PUT /pos/categories/{categoryId}
  update: (categoryId: string, data: { nombre?: string }) =>
    api.put(`/pos/categories/${categoryId}`, data).then(r => r.data),
};

/**
 * POS Module API - Units
 * Contract: GET/POST /pos/units
 */

export const posUnits = {
  // GET /pos/units
  getAll: (empresaId: string) =>
    api.get('/pos/units', { params: { empresaId } }).then(r => r.data),

  // POST /pos/units
  create: (data: { empresaId: string; nombre: string }) =>
    api.post('/pos/units', data).then(r => r.data),
};

/**
 * POS Module API - Accounts (Tickets)
 * Contract: GET/POST /pos/accounts and related endpoints
 */

export interface Account {
  id: string;
  cenCode: string;
  numero: number;
  estado: 'ABIERTO' | 'PAGADO' | 'CANCELADO';
  itemCount: number;
  createdAt: string;
}

export interface AccountDetail extends Account {
  items: Array<{
    id: string;
    productoId: string;
    cantidad: number;
    precioUnitario: number;
    nota?: string;
    subtotal: number;
  }>;
  pago?: {
    id: string;
    metodoPago: string;
    total: number;
  };
}

export const posAccounts = {
  // GET /pos/accounts
  getAll: (empresaId: string) =>
    api.get('/pos/accounts', { params: { empresaId } }).then(r => r.data as Account[]),

  // POST /pos/accounts
  create: (empresaId: string) =>
    api.post('/pos/accounts', { empresaId }).then(r => r.data as Account),

  // GET /pos/accounts/{accountId}
  getDetail: (accountId: string) =>
    api.get(`/pos/accounts/${accountId}`).then(r => r.data as AccountDetail),

  // PATCH /pos/accounts/{accountId}/waiter
  assignWaiter: (accountId: string, waiterId: string) =>
    api.patch(`/pos/accounts/${accountId}/waiter`, { waiterId }).then(r => r.data),

  // POST /pos/accounts/{accountId}/items
  addItem: (accountId: string, data: { productId: string; quantity: number; notes?: string }) =>
    api.post(`/pos/accounts/${accountId}/items`, data).then(r => r.data),

  // POST /pos/accounts/{accountId}/commands
  createCommand: (accountId: string, estacionId: string) =>
    api.post(`/pos/accounts/${accountId}/commands`, { estacionId }).then(r => r.data),

  // POST /pos/accounts/{accountId}/commands/{commandId}/reprint
  reprintCommand: (accountId: string, commandId: string) =>
    api.post(`/pos/accounts/${accountId}/commands/${commandId}/reprint`, {}).then(r => r.data),

  // POST /pos/accounts/{accountId}/pay
  pay: (accountId: string, paymentMethodId: string) =>
    api.post(`/pos/accounts/${accountId}/pay`, { paymentMethodId }).then(r => r.data),

  // POST /pos/accounts/{accountId}/cancel
  cancel: (accountId: string) =>
    api.post(`/pos/accounts/${accountId}/cancel`, {}).then(r => r.data),
};

/**
 * POS Module API - KDS (Kitchen Display System)
 * Contract: GET/PATCH /pos/kds
 */

export const posKds = {
  // GET /pos/kds/stations/{stationType}/items
  getStationItems: (stationType: 'COCINA' | 'BAR') =>
    api.get(`/pos/kds/stations/${stationType}/items`).then(r => r.data),

  // PATCH /pos/kds/items/{itemId}/status
  updateItemStatus: (itemId: string, status: 'PREPARING' | 'READY') =>
    api.patch(`/pos/kds/items/${itemId}/status`, { status }).then(r => r.data),
};

/**
 * POS Module API - Settings
 * Contract: PUT /pos/settings
 */

export const posSettings = {
  // PUT /pos/settings/tax
  setTaxRate: (taxRate: number) =>
    api.put('/pos/settings/tax', { taxRate }).then(r => r.data),
};

/**
 * POS Module API - Dashboard
 * Contract: GET /pos/dashboard/*
 */

export const posDashboard = {
  // GET /pos/dashboard/sales/daily
  getDailySales: () =>
    api.get('/pos/dashboard/sales/daily').then(r => r.data),

  // GET /pos/dashboard/products/top-sellers
  getTopSellers: () =>
    api.get('/pos/dashboard/products/top-sellers').then(r => r.data),

  // GET /pos/dashboard/products/low-stock
  getLowStock: () =>
    api.get('/pos/dashboard/products/low-stock').then(r => r.data),

  // GET /pos/dashboard/kds-status
  getKdsStatus: () =>
    api.get('/pos/dashboard/kds-status').then(r => r.data),
};
