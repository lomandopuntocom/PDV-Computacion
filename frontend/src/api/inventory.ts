import api from './axios';

/**
 * Inventory Module API - Products
 * Contract: GET/POST /inventory/products
 */

export interface Product {
  id: string;
  cenCode: string;
  nombre: string;
  precio: number;
  agotado: boolean;
  activo: boolean;
  stockMinimo: number;
  categoria: { categoriaId: string; nombre: string; cenCode: string };
  unidad: { unidadId: string; nombre: string; cenCode: string };
  estacionId: string;
}

export const inventoryProducts = {
  // GET /inventory/products
  getAll: (empresaId: string, params?: { categoriaId?: string; buscar?: string; skip?: number; take?: number }) =>
    api.get('/inventory/products', { params: { empresaId, ...params } }).then(r => r.data),

  // POST /inventory/products
  create: (data: { empresaId: string; nombre: string; categoriaId: string; unidadId: string; precio: number; stockMinimo?: number; estacionId?: string }) =>
    api.post('/inventory/products', data).then(r => r.data),

  // PUT /inventory/products/{productId}
  update: (productId: string, data: { nombre?: string; categoriaId?: string; unidadId?: string; precio?: number; stockMinimo?: number; estacionId?: string }) =>
    api.put(`/inventory/products/${productId}`, data).then(r => r.data),

  // PATCH /inventory/products/{productId}/status
  updateStatus: (productId: string, status: 'ACTIVE' | 'INACTIVE' | 'EXHAUSTED') =>
    api.patch(`/inventory/products/${productId}/status`, { status }).then(r => r.data),

  // GET /inventory/products/{productId}/stock
  getStock: (productId: string) =>
    api.get(`/inventory/products/${productId}/stock`).then(r => r.data),

  // GET /inventory/products/{productId}/movements
  getMovements: (productId: string) =>
    api.get(`/inventory/products/${productId}/movements`).then(r => r.data),

  // POST /inventory/products/{productId}/stock-adjustments
  registerAdjustment: (productId: string, data: { type: 'IN' | 'OUT'; quantity: number; reason: string }) =>
    api.post(`/inventory/products/${productId}/stock-adjustments`, data).then(r => r.data),
};

/**
 * Inventory Module API - Categories
 * Contract: GET/POST/PUT /inventory/categories
 */

export const inventoryCategories = {
  // GET /inventory/categories
  getAll: (empresaId: string) =>
    api.get('/inventory/categories', { params: { empresaId } }).then(r => r.data),

  // POST /inventory/categories
  create: (data: { empresaId: string; nombre: string }) =>
    api.post('/inventory/categories', data).then(r => r.data),

  // PUT /inventory/categories/{categoryId}
  update: (categoryId: string, data: { nombre?: string }) =>
    api.put(`/inventory/categories/${categoryId}`, data).then(r => r.data),
};

/**
 * Inventory Module API - Units
 * Contract: GET/POST/PUT /inventory/units
 */

export const inventoryUnits = {
  // GET /inventory/units
  getAll: (empresaId: string) =>
    api.get('/inventory/units', { params: { empresaId } }).then(r => r.data),

  // POST /inventory/units
  create: (data: { empresaId: string; nombre: string }) =>
    api.post('/inventory/units', data).then(r => r.data),

  // PUT /inventory/units/{unitId}
  update: (unitId: string, data: { nombre?: string }) =>
    api.put(`/inventory/units/${unitId}`, data).then(r => r.data),
};

/**
 * Inventory Module API - Dashboard
 * Contract: GET /inventory/dashboard
 */

export const inventoryDashboard = {
  // GET /inventory/dashboard
  get: (empresaId: string) =>
    api.get('/inventory/dashboard', { params: { empresaId } }).then(r => r.data),
};
