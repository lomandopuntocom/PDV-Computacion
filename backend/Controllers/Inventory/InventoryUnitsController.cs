using Backend.Api.Modules.Inventory.Data;
using Backend.Api.Modules.Inventory.Models;
using Backend.Api.Modules.Shared.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers.Inventory;

/// <summary>
/// Inventory Units Management
/// Contract: /inventory/units (not explicitly in contract, but parallel to /pos/units)
/// </summary>
[ApiController]
[Route("api/inventory/units")]
public class InventoryUnitsController : ControllerBase
{
    private readonly InventoryDbContext _inventoryDb;
    private readonly ICenCodeGenerator _cenGenerator;

    public InventoryUnitsController(InventoryDbContext inventoryDb, ICenCodeGenerator cenGenerator)
    {
        _inventoryDb = inventoryDb;
        _cenGenerator = cenGenerator;
    }

    /// <summary>
    /// GET /inventory/units
    /// List all units of measure for a company.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid empresaId)
    {
        var unidades = await _inventoryDb.Unidades
            .Where(u => u.EmpresaId == empresaId)
            .OrderBy(u => u.Nombre)
            .Select(u => new
            {
                u.Id,
                u.CenCode,
                u.Nombre,
                u.EmpresaId
            })
            .ToListAsync();

        return Ok(unidades);
    }

    /// <summary>
    /// POST /inventory/units
    /// Create a new unit of measure.
    /// Request: { "nombre": "..." }
    /// Response: 201 Created
    /// Errors: 409 Conflict (Duplicate name).
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUnidadRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.nombre))
            return BadRequest("El nombre es obligatorio");

        // Check for duplicate
        var exists = await _inventoryDb.Unidades
            .AnyAsync(u => u.EmpresaId == req.empresaId && u.Nombre.ToLower() == req.nombre.ToLower());

        if (exists)
            return Conflict("Ya existe una unidad con ese nombre");

        // Generate CEN code
        var cenCode = await _cenGenerator.GenerateCenCodeAsync(req.empresaId, "UNI");

        var unidad = new Unidad
        {
            Id = Guid.NewGuid(),
            EmpresaId = req.empresaId,
            Nombre = req.nombre,
            CenCode = cenCode
        };

        _inventoryDb.Unidades.Add(unidad);
        await _inventoryDb.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { empresaId = req.empresaId }, new
        {
            unidad.Id,
            unidad.CenCode,
            unidad.Nombre
        });
    }

    /// <summary>
    /// PUT /inventory/units/{unidadId}
    /// Update an existing unit.
    /// Response: 200 OK
    /// </summary>
    [HttpPut("{unidadId}")]
    public async Task<IActionResult> Update(Guid unidadId, [FromBody] UpdateUnidadRequest req)
    {
        var unidad = await _inventoryDb.Unidades.FindAsync(unidadId);
        if (unidad == null)
            return NotFound("Unidad no encontrada");

        if (!string.IsNullOrWhiteSpace(req.nombre))
        {
            // Check for duplicate
            var exists = await _inventoryDb.Unidades
                .AnyAsync(u => u.Id != unidadId && u.EmpresaId == unidad.EmpresaId && u.Nombre.ToLower() == req.nombre.ToLower());

            if (exists)
                return Conflict("Ya existe una unidad con ese nombre");

            unidad.Nombre = req.nombre;
        }

        await _inventoryDb.SaveChangesAsync();

        return Ok(new { unidad.Id, unidad.CenCode, unidad.Nombre });
    }
}

public record CreateUnidadRequest(
    Guid empresaId,
    string nombre
);

public record UpdateUnidadRequest(
    string? nombre
);
