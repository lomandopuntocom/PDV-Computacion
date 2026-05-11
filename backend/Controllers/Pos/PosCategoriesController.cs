using Backend.Api.Modules.Inventory.Data;
using Backend.Api.Modules.Inventory.Models;
using Backend.Api.Modules.Shared.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers.Pos;

/// <summary>
/// POS Categories Management
/// Contract: /pos/categories
/// </summary>
[ApiController]
[Route("api/pos/categories")]
public class PosCategoriesController : ControllerBase
{
    private readonly InventoryDbContext _inventoryDb;
    private readonly ICenCodeGenerator _cenGenerator;

    public PosCategoriesController(InventoryDbContext inventoryDb, ICenCodeGenerator cenGenerator)
    {
        _inventoryDb = inventoryDb;
        _cenGenerator = cenGenerator;
    }

    /// <summary>
    /// GET /pos/categories
    /// List or retrieve product categories (HU-01).
    /// Response: 200 OK
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
                c.Nombre
            })
            .ToListAsync();

        return Ok(categorias);
    }

    /// <summary>
    /// POST /pos/categories
    /// Create a new product category (HU-01).
    /// Request: { "nombre": "..." }
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
    /// PUT /pos/categories/{categoryId}
    /// Update an existing category (HU-01).
    /// Response: 200 OK
    /// </summary>
    [HttpPut("{categoryId}")]
    public async Task<IActionResult> Update(Guid categoryId, [FromBody] UpdateCategoriaRequest req)
    {
        var categoria = await _inventoryDb.Categorias.FindAsync(categoryId);
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
