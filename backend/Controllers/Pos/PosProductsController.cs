using Backend.Api.Modules.Inventory.Data;
using Backend.Api.Modules.Inventory.Models;
using Backend.Api.Modules.Shared.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers.Pos;

/// <summary>
/// POS Products Management
/// Contract: /pos/products
/// Manages products for Point of Sale operations
/// </summary>
[ApiController]
[Route("api/pos/products")]
public class PosProductsController : ControllerBase
{
    private readonly InventoryDbContext _inventoryDb;
    private readonly ICenCodeGenerator _cenGenerator;

    public PosProductsController(InventoryDbContext inventoryDb, ICenCodeGenerator cenGenerator)
    {
        _inventoryDb = inventoryDb;
        _cenGenerator = cenGenerator;
    }

    /// <summary>
    /// GET /pos/products
    /// List products for POS catalog.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid empresaId,
        [FromQuery] Guid? categoriaId,
        [FromQuery] string? buscar)
    {
        var query = _inventoryDb.Productos
            .Include(p => p.Categoria)
            .Include(p => p.Unidad)
            .Where(p => p.EmpresaId == empresaId && p.Activo); // POS only shows active products

        if (categoriaId.HasValue)
            query = query.Where(p => p.CategoriaId == categoriaId.Value);

        if (!string.IsNullOrWhiteSpace(buscar))
            query = query.Where(p => p.Nombre.ToLower().Contains(buscar.ToLower()));

        var productos = await query
            .OrderBy(p => p.Nombre)
            .Select(p => new
            {
                p.Id,
                p.CenCode,
                p.Nombre,
                p.Precio,
                p.Agotado,
                categoria = new { p.CategoriaId, nombre = p.Categoria!.Nombre },
                unidad = new { p.UnidadId, nombre = p.Unidad!.Nombre },
                p.EstacionId
            })
            .ToListAsync();

        return Ok(productos);
    }

    /// <summary>
    /// POST /pos/products
    /// Create a new product for POS (HU-03).
    /// Request: { "name": "...", "categoryId": "...", "unitId": "...", "price": 10.50 }
    /// Response: 201 Created
    /// Errors: 400 Bad Request (Price <= 0)
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePosProductRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.name))
            return BadRequest("El nombre es obligatorio");
        if (req.price <= 0)
            return BadRequest("El precio debe ser mayor a 0");
        if (req.categoryId == Guid.Empty)
            return BadRequest("La categoría es obligatoria");
        if (req.unitId == Guid.Empty)
            return BadRequest("La unidad es obligatoria");

        // Generate CEN code
        var cenCode = await _cenGenerator.GenerateCenCodeAsync(req.empresaId, "PRO");

        var producto = new Producto
        {
            Id = Guid.NewGuid(),
            EmpresaId = req.empresaId,
            Nombre = req.name,
            CenCode = cenCode,
            CategoriaId = req.categoryId,
            UnidadId = req.unitId,
            Precio = req.price,
            StockMinimo = 0,
            EstacionId = Guid.Empty,
            Activo = true,
            Agotado = false
        };

        _inventoryDb.Productos.Add(producto);
        await _inventoryDb.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { empresaId = req.empresaId }, new
        {
            producto.Id,
            producto.CenCode,
            producto.Nombre,
            producto.Precio
        });
    }

    /// <summary>
    /// PUT /pos/products/{productId}
    /// Edit product details (HU-04).
    /// Response: 200 OK
    /// </summary>
    [HttpPut("{productId}")]
    public async Task<IActionResult> Update(Guid productId, [FromBody] UpdatePosProductRequest req)
    {
        if (req.price.HasValue && req.price <= 0)
            return BadRequest("El precio debe ser mayor a 0");

        var producto = await _inventoryDb.Productos.FindAsync(productId);
        if (producto == null)
            return NotFound("Producto no encontrado");

        if (!string.IsNullOrWhiteSpace(req.name))
            producto.Nombre = req.name;
        if (req.categoryId.HasValue)
            producto.CategoriaId = req.categoryId.Value;
        if (req.unitId.HasValue)
            producto.UnidadId = req.unitId.Value;
        if (req.price.HasValue)
            producto.Precio = req.price.Value;

        await _inventoryDb.SaveChangesAsync();

        return Ok(new { producto.Id, producto.CenCode, producto.Nombre, producto.Precio });
    }

    /// <summary>
    /// PATCH /pos/products/{productId}/status
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
}

public record CreatePosProductRequest(
    Guid empresaId,
    string name,
    Guid categoryId,
    Guid unitId,
    decimal price
);

public record UpdatePosProductRequest(
    string? name,
    Guid? categoryId,
    Guid? unitId,
    decimal? price
);

public record StatusUpdateRequest(
    string? status
);
