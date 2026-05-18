-- ============================================================
-- BOOTSTRAP POR CEN DE EMPRESA (idempotente)
-- Ejecutar en pgAdmin cuando ya existe inventory.companies
-- pero faltan almacén, proveedores, stock, espejo en sales, etc.
--
-- 1. Cambia el valor de company_cen abajo por el CEN de tu empresa.
-- 2. Verifica con: SELECT id, cen, name FROM inventory.companies;
-- ============================================================

BEGIN;

-- >>> EDITAR AQUÍ el CEN de la empresa <<<
-- Ejemplo del front: 9f2a4e4e-ac9d-46a4-98ea-412d1c168d12
CREATE TEMP TABLE _seed_vars (company_cen uuid);
INSERT INTO _seed_vars (company_cen) VALUES ('9f2a4e4e-ac9d-46a4-98ea-412d1c168d12'::uuid);

CREATE TEMP TABLE _company AS
SELECT c.id, c.cen, c.name
FROM inventory.companies c
JOIN _seed_vars v ON c.cen = v.company_cen;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _company) THEN
    RAISE EXCEPTION 'No existe inventory.companies con ese CEN. Revisa _seed_vars.company_cen.';
  END IF;
END $$;

-- ------------------------------------------------------------
-- INVENTORY: ubicación + almacén (requeridos para stock/compras)
-- Mapeo: InventoryDbContext -> locations, warehouses
-- ------------------------------------------------------------
INSERT INTO inventory.locations (cen, company_id, company_cen, code, name, active, created_at, updated_at)
SELECT gen_random_uuid(), c.id, c.cen, 'LOC-00001', 'Local Principal', true, NOW(), NOW()
FROM _company c
WHERE NOT EXISTS (
  SELECT 1 FROM inventory.locations l WHERE l.company_id = c.id
);

INSERT INTO inventory.warehouses (cen, company_id, company_cen, location_id, location_cen, code, name, description, active, created_at, updated_at)
SELECT gen_random_uuid(), c.id, c.cen, l.id, l.cen, 'ALM-00001', 'Almacén Principal', 'Almacén por defecto', true, NOW(), NOW()
FROM _company c
JOIN inventory.locations l ON l.company_id = c.id
WHERE NOT EXISTS (
  SELECT 1 FROM inventory.warehouses w WHERE w.company_id = c.id
)
LIMIT 1;

-- ------------------------------------------------------------
-- INVENTORY: stock en 0 para productos con track_stock sin fila
-- Mapeo: InventoryDbContext -> stock
-- ------------------------------------------------------------
INSERT INTO inventory.stock (
  cen, company_id, company_cen, location_id, location_cen,
  warehouse_id, warehouse_cen, product_id, product_cen,
  quantity, min_quantity, max_quantity, created_at, updated_at
)
SELECT
  gen_random_uuid(), p.company_id, p.company_cen, l.id, l.cen,
  w.id, w.cen, p.id, p.cen,
  0, 0, 100, NOW(), NOW()
FROM _company c
JOIN inventory.products p ON p.company_id = c.id AND p.track_stock = true
JOIN inventory.warehouses w ON w.company_id = c.id AND w.active = true
JOIN inventory.locations l ON l.id = w.location_id
WHERE NOT EXISTS (
  SELECT 1 FROM inventory.stock s
  WHERE s.product_cen = p.cen AND s.warehouse_cen = w.cen
);

-- ------------------------------------------------------------
-- PURCHASES: proveedores
-- Mapeo: PurchasesDbContext -> suppliers (company_id, code, name, active)
-- API usa code como supplierCen (ej. SUP-00001)
-- ------------------------------------------------------------
INSERT INTO purchases.suppliers (company_id, code, name, active, created_at, updated_at)
SELECT c.id, v.code, v.name, true, NOW(), NOW()
FROM _company c
CROSS JOIN (VALUES
  ('SUP-00001', 'Distribuidora Miraflores'),
  ('SUP-00002', 'Importaciones del Sur'),
  ('SUP-00003', 'Bebidas del Norte')
) AS v(code, name)
ON CONFLICT ON CONSTRAINT uq_suppliers_company_code DO NOTHING;

-- ------------------------------------------------------------
-- SALES: espejo de empresa y local (PascalCase)
-- Mapeo: SalesDbContext -> Company, Location
-- ------------------------------------------------------------
INSERT INTO sales."Company" ("Id", "Cen", "Name")
SELECT c.id, c.cen, c.name
FROM _company c
WHERE NOT EXISTS (
  SELECT 1 FROM sales."Company" sc WHERE sc."Cen" = c.cen
);

INSERT INTO sales."Location" ("Id", "Cen", "CompanyId", "CompanyCen", "Name")
SELECT l.id, l.cen, c.id, c.cen, l.name
FROM _company c
JOIN inventory.locations l ON l.company_id = c.id
WHERE NOT EXISTS (
  SELECT 1 FROM sales."Location" sl WHERE sl."Cen" = l.cen
)
LIMIT 1;

-- IGV 18%
INSERT INTO sales.tax_configuration (cen, company_cen, tax_rate)
SELECT gen_random_uuid(), c.cen, 0.18
FROM _company c
WHERE NOT EXISTS (
  SELECT 1 FROM sales.tax_configuration t WHERE t.company_cen = c.cen
);

-- Estaciones KDS (snake_case) — el catálogo usa station_code en productos
INSERT INTO sales.command_stations (cen, company_id, company_cen, code, name, station_type, description, active, created_at, updated_at)
SELECT gen_random_uuid(), c.id, c.cen, v.code, v.name, v.station_type, v.description, true, NOW(), NOW()
FROM _company c
CROSS JOIN (VALUES
  ('EST-00001', 'Cocina Principal', 'KITCHEN', 'Estación cocina'),
  ('EST-00002', 'Bar',              'BAR',     'Estación bar')
) AS v(code, name, station_type, description)
WHERE NOT EXISTS (
  SELECT 1 FROM sales.command_stations cs
  WHERE cs.company_cen = c.cen AND cs.code = v.code
);

-- Mesero de prueba
INSERT INTO sales."Vendor" ("Cen", "CompanyId", "CompanyCen", "Name", "Email", "Phone", "IsWaiter", "Active", "CreatedAt", "UpdatedAt")
SELECT
  gen_random_uuid(),
  c.id, c.cen,
  'Mesero Demo', 'mesero@demo.local', '999000111',
  true, true, NOW(), NOW()
FROM _company c
WHERE NOT EXISTS (
  SELECT 1 FROM sales."Vendor" v WHERE v."CompanyCen" = c.cen AND v."IsWaiter" = true
);

-- Verificación (antes del COMMIT)
SELECT 'company' AS entidad, c.id::text AS id, c.cen::text AS cen, c.name
FROM _company c
UNION ALL
SELECT 'warehouse', w.id::text, w.cen::text, w.name
FROM inventory.warehouses w
JOIN _company c ON w.company_id = c.id
UNION ALL
SELECT 'supplier', s.id::text, s.code, s.name
FROM purchases.suppliers s
JOIN _company c ON s.company_id = c.id
ORDER BY entidad, name;

COMMIT;
