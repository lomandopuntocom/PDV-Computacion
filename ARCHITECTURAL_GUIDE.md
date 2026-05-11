# Architectural Implementation Guide - Desacoplamiento Backend-Frontend

**Documento:** Guía de Arquitectura para Desacoplamiento mediante Contratos API  
**Fecha:** 11 de Mayo 2026  
**Versión:** 1.0

---

## 1. PRINCIPIOS DE ARQUITECTURA

### 1.1 Desacoplamiento Backend-Frontend

**Principio:** El frontend nunca debe conocer detalles internos del backend.

```
ANTES (Acoplado):
┌─────────────────────┐
│     Frontend        │
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │ Queries     │
    │ Controllers │
    │ Models      │◄─── Frontend sabe qué controllers existen
    │ DbContexts  │
    └─────────────┘

DESPUÉS (Desacoplado):
┌─────────────────────┐
│     Frontend        │
│  (Contratos API)    │
└──────────┬──────────┘
           │
    ┌──────▼──────────────────┐
    │  Implementación Interna │
    │  (Controllers, Models,  │
    │   DbContexts, Services) │
    └─────────────────────────┘
         Frontend no necesita saber esto
```

### 1.2 Modularidad

**Cada módulo es independiente:**
- **Inventory:** Gestión de productos, categorías, stock
- **Sales:** Gestión de tickets, comandas, pagos
- **Shared:** Datos comunes (Empresa)

```
┌──────────────────────┬──────────────────────┬──────────────────────┐
│   Inventory Module   │    Sales Module      │    Shared Module     │
├──────────────────────┼──────────────────────┼──────────────────────┤
│ - Categoria          │ - Ticket             │ - Empresa            │
│ - Unidad             │ - Comanda            │ - CenCounter         │
│ - Producto           │ - ComandaItem        │                      │
│ - [Stock en Sales]   │ - Pago               │                      │
│ - [Ajustes en Sales] │ - Estacion           │                      │
│                      │ - Configuracion      │                      │
│ DbContext:           │ DbContext:           │ DbContext:           │
│ InventoryDbContext   │ SalesDbContext       │ SharedDbContext      │
└──────────────────────┴──────────────────────┴──────────────────────┘

Independencia: Los cambios en Inventory NO rompen Sales
```

---

## 2. CONTRATOS API

### 2.1 Qué es un Contrato?

Un contrato es un acuerdo entre frontend y backend:
- **Frontend:** "Si envío esto, espero esto"
- **Backend:** "Si recibo esto, devuelvo esto"

Ejemplo:
```
Contrato: GET /pos/products
├─ Input: Parámetros query (empresaId, categoriaId, buscar)
├─ Output: Array de productos
│  ├─ id: Guid
│  ├─ cenCode: string (PRO-00001)
│  ├─ nombre: string
│  ├─ precio: decimal
│  ├─ etc.
└─ Errores: 404, 400, etc.
```

### 2.2 Estructura de Rutas

**Inventory Module:**
```
/api/inventory/
├─ products/
│  ├─ GET - Listar
│  ├─ POST - Crear
│  ├─ /{id}
│  │  ├─ PUT - Editar
│  │  ├─ /status PATCH - Cambiar estado
│  │  ├─ /stock GET - Obtener stock
│  │  ├─ /movements GET - Historial
│  │  └─ /stock-adjustments POST - Ajustar
│  ├─ categories/
│  │  ├─ GET - Listar
│  │  ├─ POST - Crear
│  │  └─ /{id} PUT - Editar
│  └─ units/
│     ├─ GET - Listar
│     ├─ POST - Crear
│     └─ /{id} PUT - Editar
└─ dashboard/ GET
```

**Sales/POS Module:**
```
/api/pos/
├─ products/ (similar a inventory)
├─ categories/ (similar a inventory)
├─ units/ (similar a inventory)
├─ accounts/ (Tickets como cuentas)
│  ├─ GET - Listar
│  ├─ POST - Crear
│  ├─ /{id} GET - Detalle
│  ├─ /{id}/waiter PATCH - Asignar mesero
│  ├─ /{id}/items POST - Agregar item
│  ├─ /{id}/commands POST - Crear comanda
│  ├─ /{id}/pay POST - Pagar
│  └─ /{id}/cancel POST - Cancelar
├─ kds/ (Kitchen Display System)
│  ├─ /stations/{type}/items GET
│  └─ /items/{id}/status PATCH
├─ settings/
│  └─ /tax PUT
└─ dashboard/ (ventas, analytics)
```

---

## 3. FLUJO DE DATOS

### 3.1 Frontend → Backend (Request)

```
1. Frontend (React Component)
   ↓
2. API Layer (frontend/src/api/pos.ts)
   └─ Transforma datos a formato esperado
   ↓
3. HTTP Request (Axios)
   └─ Envía a /api/pos/products
   ↓
4. Backend Controller (PosProductsController)
   └─ Recibe y valida
   ↓
5. Business Logic/Service
   └─ Procesa
   ↓
6. Database (via DbContext)
   └─ Persiste
```

### 3.2 Backend → Frontend (Response)

```
1. Database
   ↓
2. Service/Business Logic
   ↓
3. Controller transforms to DTO
   ↓
4. HTTP Response (JSON)
   ├─ Status Code (200, 201, 400, 404, etc.)
   └─ Body (JSON object/array)
   ↓
5. API Layer (frontend)
   └─ Valida tipo (TypeScript interface)
   ↓
6. Component (React)
   └─ Usa datos
```

---

## 4. INDEPENDENCIA DE MÓDULOS

### 4.1 Cómo se mantiene la independencia?

**Regla 1: Cada módulo tiene su DbContext**
```csharp
// CORRECTO - Cada módulo usa su contexto
public class PosAccountsController {
    private readonly SalesDbContext _salesDb;
    // SalesDbContext solo tiene Inventory data en referencias
}

// INCORRECTO - Mezclar contextos
public class PosAccountsController {
    private readonly SalesDbContext _salesDb;
    private readonly InventoryDbContext _inventoryDb;
    // Esto crea acoplamiento fuerte
}
```

**Regla 2: Referencias entre módulos usan CEN, no GUID**
```csharp
// ANTES (Acoplado fuerte)
var ticket = new Ticket {
    ProductoId = Guid.Parse("123...") // ¿De dónde viene?
};

// DESPUÉS (Desacoplado)
var ticket = new Ticket {
    ProductoId = Guid.Parse("123..."), // Mismo GUID
    // PERO: Referenciamos por CEN al crear/buscar
    // "PRO-00001" es más descriptivo y agnóstico
};
```

### 4.2 Comunicación entre módulos

**Escenario:** Sales necesita info de Productos (Inventory)

**Opción 1: Via API (Recomendado)**
```typescript
// POS Component necesita info de producto
const product = await inventoryProducts.getAll({
    empresaId: companyId,
    buscar: "Café"
});
// El backend internamente puede usar InventoryDbContext
```

**Opción 2: Compartir solo IDs/CEN**
```csharp
// Ticket solo almacena ProductoId
public class Ticket {
    public Guid ProductoId { get; set; } // Referencia a Producto
    public string ProductoCenCode { get; set; } // Almacenar CEN también
}
// Cuando necesita info del producto, consulta Inventory via API
```

---

## 5. CAMPO CEN - IMPLEMENTACIÓN

### 5.1 ¿Qué es CEN y por qué?

**CEN = Código Estándar de Negocio**

- Identificador único y legible por humanos
- Auto-generado, nunca editable
- Trazabilidad completa
- Independiente de IDs de BD (que pueden cambiar en migraciones)

### 5.2 Generación de CEN

```csharp
// Cuando se crea una Categoria
var cenCode = await cenGenerator.GenerateCenCodeAsync(
    empresaId: Guid.Parse("empresa-id"),
    prefix: "CAT" // Categoria
);
// Devuelve: "CAT-00001"

// Siguiente categoria en misma empresa:
// "CAT-00002"

// En empresa diferente:
// "CAT-00001" (reinicia contador por empresa)
```

### 5.3 Tabla CenCounter

Rastreo de secuencias por empresa/type:
```
┌─────────────────────────────────────────────────────────┐
│                    CenCounter                           │
├───────────┬──────────────┬─────────────┬────────────────┤
│ EmpresaId │ Prefix (CAT) │ CurrentNum  │ UpdatedAt      │
├───────────┼──────────────┼─────────────┼────────────────┤
│ EMP-001   │ CAT          │ 5           │ 2026-05-11     │
│ EMP-001   │ PRO          │ 23          │ 2026-05-11     │
│ EMP-002   │ CAT          │ 3           │ 2026-05-11     │
└───────────┴──────────────┴─────────────┴────────────────┘
```

---

## 6. FLUJOS PRINCIPALES

### 6.1 Crear Producto (POS)

```
[Frontend]
  ↓
1. User completa form (nombre, precio, categoría)
  ↓
2. Frontend envía:
   POST /api/pos/products
   {
     empresaId: "...",
     name: "Café",
     categoryId: "...",
     unitId: "...",
     price: 2.50
   }
  ↓
[Backend: PosProductsController.Create()]
  ↓
3. Valida inputs
  ↓
4. Genera CEN:
   cenCode = await cenGenerator.GenerateCenCodeAsync(
       empresaId, "PRO"
   )
   // Obtiene CEN Counter, incrementa, devuelve "PRO-00023"
  ↓
5. Crea Producto:
   var producto = new Producto {
       Id = Guid.NewGuid(),
       CenCode = "PRO-00023",
       Nombre = "Café",
       ...
   };
  ↓
6. Persiste en BD (InventoryDbContext)
  ↓
7. Devuelve:
   201 Created
   {
     id: "...",
     cenCode: "PRO-00023",
     nombre: "Café",
     precio: 2.50
   }
  ↓
[Frontend]
  ↓
8. Muestra éxito con CEN
```

### 6.2 Crear Cuenta (POS)

```
[Frontend]
  ↓
1. User hace click en "Nueva Cuenta"
  ↓
2. Frontend envía:
   POST /api/pos/accounts
   { empresaId: "..." }
  ↓
[Backend: PosAccountsController.Create()]
  ↓
3. Obtiene siguiente número de ticket
  ↓
4. Genera CEN:
   cenCode = await cenGenerator.GenerateCenCodeAsync(
       empresaId, "TIC"
   )
   // Obtiene "TIC-00045"
  ↓
5. Crea Ticket:
   var ticket = new Ticket {
       Id = Guid.NewGuid(),
       CenCode = "TIC-00045",
       Numero = 45,
       Estado = "ABIERTO"
   };
  ↓
6. Persiste (SalesDbContext)
  ↓
7. Devuelve:
   201 Created
   {
     id: "...",
     cenCode: "TIC-00045",
     numero: 45,
     estado: "ABIERTO"
   }
  ↓
[Frontend]
  ↓
8. Muestra número de cuenta (TIC-00045 o solo #45)
```

---

## 7. TESTING & VALIDACIÓN

### 7.1 Pruebas de Contrato

```typescript
// Test: Crear producto devuelve CEN
async function testCreateProduct() {
    const response = await posProducts.create({
        empresaId: "...",
        name: "Test Product",
        categoryId: "...",
        unitId: "...",
        price: 10.00
    });
    
    assert(response.cenCode !== undefined);
    assert(response.cenCode.startsWith("PRO-"));
    assert(response.cenCode === "PRO-00001"); // Primera
}
```

### 7.2 Pruebas de Independencia

```typescript
// Test: Cambios en Inventory no rompen Sales
async function testModuleIndependence() {
    // 1. Modificar producto en Inventory
    await inventoryProducts.update(productId, {
        nombre: "New Name"
    });
    
    // 2. Verificar que POS aún funciona
    const accounts = await posAccounts.getAll(empresaId);
    assert(accounts.length > 0);
    
    // Si esto falla, hay acoplamiento fuerte
}
```

---

## 8. CHECKLIST DE IMPLEMENTACIÓN

- [x] Modelos tienen CenCode
- [x] CenCounter tabla creada
- [x] CenCodeGenerator service creado
- [x] Controllers usan rutas de contrato
- [x] Migraciones generadas
- [x] Frontend API layer creada
- [ ] Migraciones ejecutadas en BD
- [ ] Controllers completamente implementados
- [ ] Validación de inputs en todos los endpoints
- [ ] Manejo de errores (400, 404, 409, etc.)
- [ ] Tests de contrato
- [ ] Tests de independencia de módulos
- [ ] Documentación de API (Swagger)

---

## 9. VENTAJAS LOGRADAS

✅ **Desacoplamiento:**
- Frontend no conoce estructura interna
- Backend puede cambiar sin afectar frontend

✅ **Modularidad:**
- Cada módulo es independiente
- Fácil agregar/modificar módulos

✅ **Mantenibilidad:**
- Código organizado
- Cambios localizados

✅ **Trazabilidad:**
- CEN codes permiten rastreo completo
- Auditoría mejorada

✅ **Escalabilidad:**
- Preparado para crecimiento
- Fácil agregar nuevos endpoints

---

**Próximo documento:** API_CONTRACT_MAPPING.md para detalles de implementación específicos.

