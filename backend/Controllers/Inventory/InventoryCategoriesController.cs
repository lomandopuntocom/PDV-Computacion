using Backend.Api.Modules.Inventory.Data;
using Backend.Api.Modules.Inventory.Models;
using Backend.Api.Modules.Shared.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers.Inventory;

/// <summary>
/// Inventory Categories Management
/// Contract: /inventory/categories (not explicitly in contract, but parallel to /pos/categories)
/// </summary>
[ApiController]
[Route("api/inventory/categories")]
public class InventoryCategoriesController : ControllerBase
{
    private readonly InventoryDbContext _inventoryDb;
    private readonly ICenCodeGenerator _cenGenerator;

    public InventoryCategoriesController(InventoryDbContext inventoryDb, ICenCodeGenerator cenGenerator)
    {
        _inventoryDb = inventoryDb;
        _cenGenerator = cenGenerator;
    }

    /// <summary>
    /// GET /inventory/categories
    /// List all categories for a company.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid empresaId)
    {
        var categorias = await _inventoryDb.Categorias
            .Where(c => c.EmpresaId == empresaId)
            .OrderBy(c => c.Nombre)
            .Select(c => new
            {
                c.Id,
                c.CenCode,
                c.Nombre,
                c.EmpresaId
            })
            .ToListAsync();

        return Ok(categorias);
    }

    /// <summary>
    /// POST /inventory/categories
    /// Create a new category.
    /// Request: { "nombre": "...", "empresaId": "..." }
    /// Response: 201 Created
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoriaRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.nombre))
            return BadRequest("El nombre es obligatorio");

        // Generate CEN code
        var cenCode = await _cenGenerator.GenerateCenCodeAsync(req.empresaId, "CAT");

        var categoria = new Categoria
        {
            Id = Guid.NewGuid(),
            EmpresaId = req.empresaId,
            Nombre = req.nombre,
            CenCode = cenCode
        };

        _inventoryDb.Categorias.Add(categoria);
        await _inventoryDb.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { empresaId = req.empresaId }, new
        {
            categoria.Id,
            categoria.CenCode,
            categoria.Nombre
        });
    }

    /// <summary>
    /// PUT /inventory/categories/{categoriaId}
    /// Update an existing category.
    /// Response: 200 OK
    /// </summary>
    [HttpPut("{categoriaId}")]
    public async Task<IActionResult> Update(Guid categoriaId, [FromBody] UpdateCategoriaRequest req)
    {
        var categoria = await _inventoryDb.Categorias.FindAsync(categoriaId);
        if (categoria == null)
            return NotFound("Categoría no encontrada");

        if (!string.IsNullOrWhiteSpace(req.nombre))
            categoria.Nombre = req.nombre;

        await _inventoryDb.SaveChangesAsync();

        return Ok(new { categoria.Id, categoria.CenCode, categoria.Nombre });
    }
}

public record CreateCategoriaRequest(
    Guid empresaId,
    string nombre
);

public record UpdateCategoriaRequest(
    string? nombre
);
