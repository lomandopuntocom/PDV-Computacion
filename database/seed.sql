-- ============================================================
-- SEED DATA - ISW-312-PROJ1 (base de datos vacía)
-- Ejecutar en pgAdmin contra la base de datos del proyecto.
--
-- Cuándo usar cada script:
--   seed.sql                 -> BD nueva o quieres datos demo completos
--   seed-bootstrap-by-cen.sql -> Ya tienes empresa(s) en inventory.companies
--                               y solo necesitas almacén, proveedores, stock, sales
--
-- Los CEN (columnas uuid/cen) solo usan caracteres hexadecimales: 0-9 y a-f.
-- Si un INSERT falla a mitad de script, haz ROLLBACK y vuelve a ejecutar todo el archivo.
-- No re-ejecutes solo un bloque: los SERIAL pueden quedar desfasados (id=1 sin fila).
--
-- Contextos alineados:
--   Inventory.Api  -> schema inventory (snake_case)
--   Sales.Api      -> schema sales (PascalCase: Company, Ticket... + snake: command_stations)
--   Purchases.Api  -> schema purchases (snake_case, suppliers sin columna cen)
-- ============================================================

BEGIN;

-- ============================================================
-- SCHEMA: inventory
-- ============================================================

-- inventory.companies
INSERT INTO inventory.companies (cen, name, nit, phone, email, address, city, country, active, created_at, updated_at)
VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Restaurante El Sabor', '20123456789', '01-4445566', 'info@elsabor.pe', 'Av. Larco 123', 'Lima', 'Peru', true, NOW(), NOW());

-- inventory.units_measure
INSERT INTO inventory.units_measure (cen, code, name, abbreviation, active, created_at)
VALUES
  ('b1000001-0000-0000-0000-000000000001', 'UNI-00001', 'Unidad',      'und',  true, NOW()),
  ('b1000001-0000-0000-0000-000000000002', 'UNI-00002', 'Kilogramo',   'kg',   true, NOW()),
  ('b1000001-0000-0000-0000-000000000003', 'UNI-00003', 'Litro',       'lt',   true, NOW()),
  ('b1000001-0000-0000-0000-000000000004', 'UNI-00004', 'Porcion',     'por',  true, NOW());

-- inventory.categories (company_id = 1)
INSERT INTO inventory.categories (cen, company_id, company_cen, code, name, description, active, created_at, updated_at)
VALUES
  ('c1000001-0000-0000-0000-000000000001', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'CAT-00001', 'Entradas',   'Platos de entrada', true, NOW(), NOW()),
  ('c1000001-0000-0000-0000-000000000002', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'CAT-00002', 'Fondos',     'Platos principales', true, NOW(), NOW()),
  ('c1000001-0000-0000-0000-000000000003', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'CAT-00003', 'Bebidas',    'Bebidas y jugos',    true, NOW(), NOW()),
  ('c1000001-0000-0000-0000-000000000004', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'CAT-00004', 'Postres',    'Postres y dulces',   true, NOW(), NOW());

-- inventory.products
INSERT INTO inventory.products (cen, company_id, company_cen, code, sku, name, description, category_id, category_cen, unit_measure_id, unit_measure_cen, price, cost, track_stock, is_out_of_stock, active, station_code, created_at, updated_at)
VALUES
  ('d1000001-0000-0000-0000-000000000001', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'PRO-00001', 'SKU-001', 'Ceviche Clasico',    'Ceviche de pescado blanco',   2, 'c1000001-0000-0000-0000-000000000002', 1, 'b1000001-0000-0000-0000-000000000001', 35.00, 12.00, false, false, true, 'COCINA', NOW(), NOW()),
  ('d1000001-0000-0000-0000-000000000002', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'PRO-00002', 'SKU-002', 'Lomo Saltado',       'Lomo saltado con papas',      2, 'c1000001-0000-0000-0000-000000000002', 1, 'b1000001-0000-0000-0000-000000000001', 42.00, 15.00, false, false, true, 'COCINA', NOW(), NOW()),
  ('d1000001-0000-0000-0000-000000000003', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'PRO-00003', 'SKU-003', 'Causa Limena',       'Causa de pollo',              1, 'c1000001-0000-0000-0000-000000000001', 1, 'b1000001-0000-0000-0000-000000000001', 22.00,  7.00, false, false, true, 'COCINA', NOW(), NOW()),
  ('d1000001-0000-0000-0000-000000000004', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'PRO-00004', 'SKU-004', 'Inca Kola 500ml',    'Gaseosa Inca Kola personal',  3, 'c1000001-0000-0000-0000-000000000003', 1, 'b1000001-0000-0000-0000-000000000001',  8.00,  3.00, true,  false, true, 'BAR',    NOW(), NOW()),
  ('d1000001-0000-0000-0000-000000000005', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'PRO-00005', 'SKU-005', 'Agua Mineral 600ml', 'Agua mineral San Luis',       3, 'c1000001-0000-0000-0000-000000000003', 1, 'b1000001-0000-0000-0000-000000000001',  5.00,  1.50, true,  false, true, 'BAR',    NOW(), NOW()),
  ('d1000001-0000-0000-0000-000000000006', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'PRO-00006', 'SKU-006', 'Picarones',          'Picarones con miel de caña',  4, 'c1000001-0000-0000-0000-000000000004', 1, 'b1000001-0000-0000-0000-000000000001', 15.00,  5.00, false, false, true, 'COCINA', NOW(), NOW()),
  ('d1000001-0000-0000-0000-000000000007', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'PRO-00007', 'SKU-007', 'Chicharron de Pollo','Chicharron crocante',         1, 'c1000001-0000-0000-0000-000000000001', 1, 'b1000001-0000-0000-0000-000000000001', 28.00, 10.00, false, false, true, 'COCINA', NOW(), NOW()),
  ('d1000001-0000-0000-0000-000000000008', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'PRO-00008', 'SKU-008', 'Jugo de Maracuya',   'Jugo fresco de maracuya',     3, 'c1000001-0000-0000-0000-000000000003', 1, 'b1000001-0000-0000-0000-000000000001', 12.00,  3.00, false, false, true, 'BAR',    NOW(), NOW());

-- inventory.locations
INSERT INTO inventory.locations (cen, company_id, company_cen, code, name, address, phone, active, created_at, updated_at)
VALUES
  ('e1000001-0000-0000-0000-000000000001', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'LOC-00001', 'Local Principal', 'Av. Larco 123', '01-4445566', true, NOW(), NOW());

-- inventory.warehouses
INSERT INTO inventory.warehouses (cen, company_id, company_cen, location_id, location_cen, code, name, description, active, created_at, updated_at)
VALUES
  ('f1000001-0000-0000-0000-000000000001', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 1, 'e1000001-0000-0000-0000-000000000001', 'ALM-00001', 'Almacen Principal', 'Almacen central', true, NOW(), NOW());

-- inventory.stock (solo productos con track_stock=true)
INSERT INTO inventory.stock (cen, company_id, company_cen, location_id, location_cen, warehouse_id, warehouse_cen, product_id, product_cen, quantity, min_quantity, max_quantity, created_at, updated_at)
VALUES
  ('07100001-0000-0000-0000-000000000001', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 1, 'e1000001-0000-0000-0000-000000000001', 1, 'f1000001-0000-0000-0000-000000000001', 4, 'd1000001-0000-0000-0000-000000000004', 48.00, 12.00, 100.00, NOW(), NOW()),
  ('07100001-0000-0000-0000-000000000002', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 1, 'e1000001-0000-0000-0000-000000000001', 1, 'f1000001-0000-0000-0000-000000000001', 5, 'd1000001-0000-0000-0000-000000000005', 24.00,  6.00,  60.00, NOW(), NOW());

-- inventory.movement_types
INSERT INTO inventory.movement_types (cen, code, name, "Description", movement_direction, active, created_at)
VALUES
  ('08100001-0000-0000-0000-000000000001', 'ENT', 'Entrada por compra',   'Ingreso de mercaderia por compra',        'IN',  true, NOW()),
  ('08100001-0000-0000-0000-000000000002', 'SAL', 'Salida por venta',     'Salida por consumo en punto de venta',    'OUT', true, NOW()),
  ('08100001-0000-0000-0000-000000000003', 'AJU', 'Ajuste de inventario', 'Correccion manual de stock',              'IN',  true, NOW());

-- inventory.operation_documents
INSERT INTO inventory.operation_documents (cen, company_id, company_cen, location_id, location_cen, warehouse_id, warehouse_cen, document_number, operation_type, status, reference, notes, created_at, confirmed_at, updated_at)
SELECT
  '09100001-0000-0000-0000-000000000001'::uuid,
  c.id, c.cen, l.id, l.cen, w.id, w.cen,
  'DOC-00001', 'ENTRY', 'CONFIRMED', 'Compra inicial', 'Stock inicial de bebidas', NOW(), NOW(), NOW()
FROM inventory.companies c
JOIN inventory.locations l ON l.company_id = c.id AND l.cen = 'e1000001-0000-0000-0000-000000000001'::uuid
JOIN inventory.warehouses w ON w.company_id = c.id AND w.cen = 'f1000001-0000-0000-0000-000000000001'::uuid
WHERE c.cen = 'a1b2c3d4-0001-0001-0001-000000000001'::uuid
ON CONFLICT (cen) DO NOTHING;

-- inventory.operation_document_items (document_id/product_id por cen, no por id fijo)
INSERT INTO inventory.operation_document_items (cen, document_id, document_cen, product_id, product_cen, quantity, notes, created_at, updated_at)
SELECT
  v.item_cen::uuid,
  d.id,
  d.cen,
  p.id,
  p.cen,
  v.quantity,
  v.notes,
  NOW(),
  NOW()
FROM (VALUES
  ('0a100001-0000-0000-0000-000000000001', '09100001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000004', 48.00, 'Stock inicial Inca Kola'),
  ('0a100001-0000-0000-0000-000000000002', '09100001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000005', 24.00, 'Stock inicial Agua Mineral')
) AS v(item_cen, doc_cen, prod_cen, quantity, notes)
JOIN inventory.operation_documents d ON d.cen = v.doc_cen::uuid
JOIN inventory.products p ON p.cen = v.prod_cen::uuid
ON CONFLICT (cen) DO NOTHING;

-- ============================================================
-- SCHEMA: sales
-- Nota: Company, Location, Vendor, Ticket, TicketItem, Payment
--       usan columnas PascalCase.
--       command_stations, commands, command_items, tax_configuration
--       usan columnas snake_case.
-- ============================================================

-- sales."Company" (espejo de inventory.companies)
INSERT INTO sales."Company" ("Id", "Cen", "Name")
VALUES (1, 'a1b2c3d4-0001-0001-0001-000000000001', 'Restaurante El Sabor');

-- sales."Location"
INSERT INTO sales."Location" ("Id", "Cen", "CompanyId", "CompanyCen", "Name")
VALUES (1, 'e1000001-0000-0000-0000-000000000001', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'Local Principal');

-- sales.tax_configuration
INSERT INTO sales.tax_configuration (cen, company_cen, tax_rate)
VALUES ('0b100001-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 0.18);

-- sales."Vendor" (meseros)
INSERT INTO sales."Vendor" ("Id", "Cen", "CompanyId", "CompanyCen", "Name", "Email", "Phone", "IsWaiter", "Active", "CreatedAt", "UpdatedAt")
VALUES
  (1, '0c100001-0000-0000-0000-000000000001', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'Carlos Ramirez', 'carlos@elsabor.pe', '987654321', true,  true, NOW(), NOW()),
  (2, '0c100001-0000-0000-0000-000000000002', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'Maria Lopez',    'maria@elsabor.pe',  '987654322', true,  true, NOW(), NOW()),
  (3, '0c100001-0000-0000-0000-000000000003', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'Admin',          'admin@elsabor.pe',  '987654323', false, true, NOW(), NOW());

-- sales.command_stations (KDS)
INSERT INTO sales.command_stations (cen, company_id, company_cen, code, name, station_type, description, active, created_at, updated_at)
VALUES
  ('0d100001-0000-0000-0000-000000000001', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'EST-00001', 'Cocina Principal', 'KITCHEN', 'Estacion de cocina caliente', true, NOW(), NOW()),
  ('0d100001-0000-0000-0000-000000000002', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'EST-00002', 'Bar',              'BAR',     'Estacion de bebidas',        true, NOW(), NOW());

-- sales."Ticket" (una cuenta cerrada pagada, una abierta)
INSERT INTO sales."Ticket" ("Id", "Cen", "CompanyId", "CompanyCen", "LocationId", "LocationCen", "TicketNumber", "VendorId", "VendorCen", "TableCode", "Status")
VALUES
  (1, '0e000001-0000-0000-0000-000000000001', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 1, 'e1000001-0000-0000-0000-000000000001', 'TIC-00001', 1, '0c100001-0000-0000-0000-000000000001', 'MESA-01', 'PAID'),
  (2, '0e000001-0000-0000-0000-000000000002', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 1, 'e1000001-0000-0000-0000-000000000001', 'TIC-00002', 2, '0c100001-0000-0000-0000-000000000002', 'MESA-02', 'OPEN'),
  (3, '0e000001-0000-0000-0000-000000000003', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 1, 'e1000001-0000-0000-0000-000000000001', 'TIC-00003', 1, '0c100001-0000-0000-0000-000000000001', 'MESA-03', 'OPEN');

-- sales."TicketItem"
INSERT INTO sales."TicketItem" ("Id", "Cen", "TicketId", "TicketCen", "ProductId", "ProductCen", "Quantity", "UnitPrice", "Status", "Notes")
VALUES
  -- Ticket 1 (PAID)
  (1, '0f000001-0000-0000-0000-000000000001', 1, '0e000001-0000-0000-0000-000000000001', 1, 'd1000001-0000-0000-0000-000000000001', 1.00, 35.00, 'DELIVERED', NULL),
  (2, '0f000001-0000-0000-0000-000000000002', 1, '0e000001-0000-0000-0000-000000000001', 4, 'd1000001-0000-0000-0000-000000000004', 2.00,  8.00, 'DELIVERED', NULL),
  -- Ticket 2 (OPEN - MESA-02)
  (3, '0f000001-0000-0000-0000-000000000003', 2, '0e000001-0000-0000-0000-000000000002', 2, 'd1000001-0000-0000-0000-000000000002', 2.00, 42.00, 'PENDING',   NULL),
  (4, '0f000001-0000-0000-0000-000000000004', 2, '0e000001-0000-0000-0000-000000000002', 8, 'd1000001-0000-0000-0000-000000000008', 2.00, 12.00, 'PENDING',   NULL),
  -- Ticket 3 (OPEN - MESA-03)
  (5, '0f000001-0000-0000-0000-000000000005', 3, '0e000001-0000-0000-0000-000000000003', 3, 'd1000001-0000-0000-0000-000000000003', 1.00, 22.00, 'DELIVERED', NULL),
  (6, '0f000001-0000-0000-0000-000000000006', 3, '0e000001-0000-0000-0000-000000000003', 6, 'd1000001-0000-0000-0000-000000000006', 1.00, 15.00, 'PENDING',   'Sin canela');

-- sales."Payment" (pago del ticket 1)
INSERT INTO sales."Payment" ("Id", "Cen", "TicketId", "TicketCen", "PaymentMethod", "Amount", "Reference", "PaidBy", "CreatedAt", "UpdatedAt")
VALUES
  (1, 'a0000001-0000-0000-0000-000000000001', 1, '0e000001-0000-0000-0000-000000000001', 'CASH', 51.00, NULL, 'Carlos Ramirez', NOW(), NOW());

-- sales.commands
INSERT INTO sales.commands (cen, company_id, company_cen, location_id, location_cen, ticket_id, ticket_cen, station_id, station_cen, command_number, status, is_reorder, created_at, sent_at, ready_at, updated_at)
VALUES
  -- Comanda del ticket 1 (lista)
  ('a2000001-0000-0000-0000-000000000001', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 1, 'e1000001-0000-0000-0000-000000000001', 1, '0e000001-0000-0000-0000-000000000001', 1, '0d100001-0000-0000-0000-000000000001', 'COM-00001', 'READY', false, NOW(), NOW(), NOW(), NOW()),
  -- Comanda del ticket 2 (en proceso)
  ('a2000001-0000-0000-0000-000000000002', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 1, 'e1000001-0000-0000-0000-000000000001', 2, '0e000001-0000-0000-0000-000000000002', 1, '0d100001-0000-0000-0000-000000000001', 'COM-00002', 'SENT', false, NOW(), NOW(), NULL,  NOW());

-- sales.command_items
INSERT INTO sales.command_items (cen, command_id, command_cen, ticket_item_id, ticket_item_cen, product_id, product_cen, quantity, status, notes, created_at, updated_at)
VALUES
  -- Items de comanda 1
  ('a3000001-0000-0000-0000-000000000001', 1, 'a2000001-0000-0000-0000-000000000001', 1, '0f000001-0000-0000-0000-000000000001', 1, 'd1000001-0000-0000-0000-000000000001', 1.00, 'READY', NULL,        NOW(), NOW()),
  -- Items de comanda 2
  ('a3000001-0000-0000-0000-000000000002', 2, 'a2000001-0000-0000-0000-000000000002', 3, '0f000001-0000-0000-0000-000000000003', 2, 'd1000001-0000-0000-0000-000000000002', 2.00, 'PENDING', NULL,      NOW(), NOW());

-- ============================================================
-- SCHEMA: purchases
-- ============================================================

-- purchases.suppliers
INSERT INTO purchases.suppliers (company_id, code, name, active, created_at, updated_at)
VALUES
  (1, 'SUP-00001', 'Distribuidora Miraflores', true, NOW(), NOW()),
  (1, 'SUP-00002', 'Importaciones del Sur',    true, NOW(), NOW());

-- purchases.orders (supplier = nombre; el front/API usa supplierCen = purchases.suppliers.code)
INSERT INTO purchases.orders (cen, company_id, company_cen, supplier, supplier_cen, date, status, created_at, updated_at)
VALUES
  ('a4000001-0000-0000-0000-000000000001', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'Distribuidora Miraflores', NULL, NOW(), 'CONFIRMED', NOW(), NOW()),
  ('a4000001-0000-0000-0000-000000000002', 1, 'a1b2c3d4-0001-0001-0001-000000000001', 'Importaciones del Sur',    NULL, NOW(), 'DRAFT',     NOW(), NOW());

-- purchases.order_items (order_id/product_id por cen)
INSERT INTO purchases.order_items (cen, order_id, order_cen, product_id, product_cen, quantity, created_at)
SELECT
  v.item_cen::uuid,
  o.id,
  o.cen,
  p.id,
  p.cen,
  v.quantity,
  NOW()
FROM (VALUES
  ('a5000001-0000-0000-0000-000000000001', 'a4000001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000004', 48.00),
  ('a5000001-0000-0000-0000-000000000002', 'a4000001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000005', 24.00),
  ('a5000001-0000-0000-0000-000000000003', 'a4000001-0000-0000-0000-000000000002', 'd1000001-0000-0000-0000-000000000002', 10.00)
) AS v(item_cen, order_cen, prod_cen, quantity)
JOIN purchases.orders o ON o.cen = v.order_cen::uuid
JOIN inventory.products p ON p.cen = v.prod_cen::uuid
ON CONFLICT (cen) DO NOTHING;

COMMIT;
