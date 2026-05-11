using Backend.Api.Modules.Inventory.Data;
using Backend.Api.Modules.Inventory.Models;
using Backend.Api.Modules.Shared.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers.Inventory;

/// <summary>
/// Inventory Products Management
/// Contract: /inventory/products
/// </summary>
[ApiController]
[Route("api/inventory/products")]
public class InventoryProductsController : ControllerBase
{
    private readonly InventoryDbContext _inventoryDb;
    private readonly ICenCodeGenerator _cenGenerator;

    public InventoryProductsController(InventoryDbContext inventoryDb, ICenCodeGenerator cenGenerator)
    {
        _inventoryDb = inventoryDb;
        _cenGenerator = cenGenerator;
    }

    /// <summary>
    /// GET /inventory/products
    /// Lists products in the active company's catalog (US-04). Supports pagination and filtering.
    /// Response: 200 OK (Array of products: code, name, category, unit, status).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid empresaId,
        [FromQuery] Guid? categoriaId,
        [FromQuery] string? buscar,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50)
    {
        var query = _inventoryDb.Productos
            .Include(p => p.Categoria)
            .Include(p => p.Unidad)
            .Where(p => p.EmpresaId == empresaId);

        if (categoriaId.HasValue)
            query = query.Where(p => p.CategoriaId == categoriaId.Value);

        if (!string.IsNullOrWhiteSpace(buscar))
            query = query.Where(p => p.Nombre.ToLower().Contains(buscar.ToLower()));

        var total = await query.CountAsync();

        var productos = await query
            .OrderBy(p => p.Nombre)
            .Skip(skip)
            .Take(take)
            .Select(p => new
            {
                p.Id,
                p.CenCode,
                p.Nombre,
                p.Precio,
                p.Agotado,
                p.Activo,
                p.StockMinimo,
                categoria = new { p.CategoriaId, nombre = p.Categoria!.Nombre, cenCode = p.Categoria.CenCode },
                unidad = new { p.UnidadId, nombre = p.Unidad!.Nombre, cenCode = p.Unidad.CenCode },
                p.EstacionId
            })
            .ToListAsync();

        return Ok(new { total, items = productos });
    }

    /// <summary>
    /// POST /inventory/products
    /// Create a new product (HU-03 from POS contracts adapted for Inventory).
    /// Request: { "name": "...", "categoryId": "...", "unitId": "...", "price": 10.50 }
    /// Response: 201 Created
    /// Errors: 400 Bad Request (Price <= 0)
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.nombre))
            return BadRequest("El nombre es obligatorio");
        if (req.precio <= 0)
            return BadRequest("El precio debe ser mayor a 0");
        if (req.categoriaId == Guid.Empty)
            return BadRequest("La categoría es obligatoria");
        if (req.unidadId == Guid.Empty)
            return BadRequest("La unidad es obligatoria");

        // Generate CEN code for product
        var cenCode = await _cenGenerator.GenerateCenCodeAsync(req.empresaId, "PRO");

        var producto = new Producto
        {
            Id = Guid.NewGuid(),
            EmpresaId = req.empresaId,
            Nombre = req.nombre,
            CenCode = cenCode,
            CategoriaId = req.categoriaId,
            UnidadId = req.unidadId,
            Precio = req.precio,
            StockMinimo = req.stockMinimo ?? 0,
            EstacionId = req.estacionId ?? Guid.Empty,
            Activo = true,
            Agotado = false
        };

        _inventoryDb.Productos.Add(producto);
        await _inventoryDb.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { id = producto.Id }, new
        {
            producto.Id,
            producto.CenCode,
            producto.Nombre,
            producto.Precio
        });
    }

    /// <summary>
    /// PUT /inventory/products/{productId}
    /// Edit product details (HU-04 adapted).
    /// Response: 200 OK
    /// </summary>
    [HttpPut("{productId}")]
    public async Task<IActionResult> Update(Guid productId, [FromBody] UpdateProductRequest req)
    {
        if (req.precio <= 0)
            return BadRequest("El precio debe ser mayor a 0");

        var producto = await _inventoryDb.Productos.FindAsync(productId);
        if (producto == null)
            return NotFound("Producto no encontrado");

        producto.Nombre = req.nombre ?? producto.Nombre;
        producto.CategoriaId = req.categoriaId ?? producto.CategoriaId;
        producto.UnidadId = req.unidadId ?? producto.UnidadId;
        producto.Precio = req.precio > 0 ? req.precio : producto.Precio;
        producto.StockMinimo = req.stockMinimo ?? producto.StockMinimo;
        if (req.estacionId.HasValue)
            producto.EstacionId = req.estacionId.Value;

        await _inventoryDb.SaveChangesAsync();

        return Ok(new { producto.Id, producto.CenCode, producto.Nombre, producto.Precio });
    }

    /// <summary>
    /// PATCH /inventory/products/{productId}/status
    /// Activate, deactivate, or mark a product as exhausted (HU-04, HU-08).
    /// Request: { "status": "ACTIVE|INACTIVE|EXHAUSTED" }
    /// Response: 204 No Content
    /// </summary>
    [HttpPatch("{productId}/status")]
    public async Task<IActionResult> UpdateStatus(Guid productId, [FromBody] StatusUpdateRequest req)
    {
        var producto = await _inventoryDb.Productos.FindAsync(productId);
        if (producto == null)
            return NotFound("Producto no encontrado");

        switch (req.status?.ToUpper())
        {
            case "ACTIVE":
                producto.Activo = true;
                producto.Agotado = false;
                break;
            case "INACTIVE":
                producto.Activo = false;
                break;
            case "EXHAUSTED":
                producto.Agotado = true;
                break;
            default:
                return BadRequest("Estado inválido. Use: ACTIVE, INACTIVE, o EXHAUSTED");
        }

        await _inventoryDb.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// GET /inventory/products/{productId}/stock
    /// Retrieves the current consolidated stock for a specific product (US-05).
    /// Response: 200 OK (Current available quantity).
    /// Errors: 404 Not Found.
    /// </summary>
    [HttpGet("{productId}/stock")]
    public async Task<IActionResult> GetStock(Guid productId)
    {
        var producto = await _inventoryDb.Productos.FindAsync(productId);
        if (producto == null)
            return NotFound("Producto no encontrado");

        // TODO: Implement stock query from Sales.Stock table
        // For now, return placeholder
        return Ok(new { productId, cantidad = 0, mensaje = "Stock retrieval from Sales context not yet implemented" });
    }

    /// <summary>
    /// GET /inventory/products/{productId}/movements
    /// Retrieves the movement history (kardex) for a product (US-08).
    /// Response: 200 OK (Array of movements: type, date, quantity, reason).
    /// </summary>
    [HttpGet("{productId}/movements")]
    public async Task<IActionResult> GetMovements(Guid productId)
    {
        var producto = await _inventoryDb.Productos.FindAsync(productId);
        if (producto == null)
            return NotFound("Producto no encontrado");

        // TODO: Implement kardex query from Sales.AjusteStock table
        // For now, return placeholder
        return Ok(new { productId, movements = new List<object>(), mensaje = "Kardex retrieval from Sales context not yet implemented" });
    }

    /// <summary>
    /// POST /inventory/products/{productId}/stock-adjustments
    /// Registers a manual stock adjustment with a required reason (US-07).
    /// Request: { "type": "IN|OUT", "quantity": 10, "reason": "Damaged goods" }
    /// Response: 201 Created
    /// Errors: 400 Bad Request (If negative stock results), 422 Unprocessable Entity (Missing reason).
    /// </summary>
    [HttpPost("{productId}/stock-adjustments")]
    public async Task<IActionResult> RegisterStockAdjustment(Guid productId, [FromBody] StockAdjustmentRequest req)
    {
        var producto = await _inventoryDb.Productos.FindAsync(productId);
        if (producto == null)
            return NotFound("Producto no encontrado");

        if (string.IsNullOrWhiteSpace(req.reason))
            return UnprocessableEntity("La razón del ajuste es requerida");

        if (req.quantity <= 0)
            return BadRequest("La cantidad debe ser mayor a 0");

        // TODO: Implement stock adjustment logic using Sales context
        // For now, return placeholder
        return Created(string.Empty, new
        {
            productId,
            tipo = req.type?.ToUpper(),
            cantidad = req.quantity,
            motivo = req.reason,
            mensaje = "Stock adjustment not yet fully implemented"
        });
    }
}

public record CreateProductRequest(
    Guid empresaId,
    string nombre,
    Guid categoriaId,
    Guid unidadId,
    decimal precio,
    decimal? stockMinimo = null,
    Guid? estacionId = null
);

public record UpdateProductRequest(
    string? nombre,
    Guid? categoriaId,
    Guid? unidadId,
    decimal precio,
    decimal? stockMinimo,
    Guid? estacionId
);

public record StatusUpdateRequest(
    string? status
);

public record StockAdjustmentRequest(
    string? type,
    decimal quantity,
    string? reason
);
