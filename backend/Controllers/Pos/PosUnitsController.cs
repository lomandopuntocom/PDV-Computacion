using Backend.Api.Modules.Inventory.Data;
using Backend.Api.Modules.Inventory.Models;
using Backend.Api.Modules.Shared.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers.Pos;

/// <summary>
/// POS Units Management
/// Contract: /pos/units
/// </summary>
[ApiController]
[Route("api/pos/units")]
public class PosUnitsController : ControllerBase
{
    private readonly InventoryDbContext _inventoryDb;
    private readonly ICenCodeGenerator _cenGenerator;

    public PosUnitsController(InventoryDbContext inventoryDb, ICenCodeGenerator cenGenerator)
    {
        _inventoryDb = inventoryDb;
        _cenGenerator = cenGenerator;
    }

    /// <summary>
    /// GET /pos/units
    /// List all units of measure (HU-02).
    /// Response: 200 OK
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
                u.Nombre
            })
            .ToListAsync();

        return Ok(unidades);
    }

    /// <summary>
    /// POST /pos/units
    /// Create a new unit of measure (HU-02).
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
}

public record CreateUnidadRequest(
    Guid empresaId,
    string nombre
);
