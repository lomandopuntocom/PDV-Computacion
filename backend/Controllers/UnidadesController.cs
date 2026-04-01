using Backend.Api.Modules.Inventory.Data;
using Backend.Api.Modules.Inventory.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UnidadesController : ControllerBase
{
    private readonly InventoryDbContext _db;
    public UnidadesController(InventoryDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid empresaId)
    {
        var unidades = await _db.Unidades
            .Where(u => u.EmpresaId == empresaId)
            .Select(u => new { u.Id, u.Nombre })
            .OrderBy(u => u.Nombre)
            .ToListAsync();
        return Ok(unidades);
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] UnidadRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Nombre))
            return BadRequest("El nombre es obligatorio");

        var existe = await _db.Unidades
            .AnyAsync(u => u.EmpresaId == req.EmpresaId && u.Nombre == req.Nombre);
        if (existe)
            return BadRequest("Ya existe una unidad con ese nombre");

        var unidad = new Unidad { EmpresaId = req.EmpresaId, Nombre = req.Nombre };
        _db.Unidades.Add(unidad);
        await _db.SaveChangesAsync();
        return Ok(new { unidad.Id, unidad.Nombre });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Editar(Guid id, [FromBody] UnidadRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Nombre))
            return BadRequest("El nombre es obligatorio");

        var unidad = await _db.Unidades.FindAsync(id);
        if (unidad == null) return NotFound();

        unidad.Nombre = req.Nombre;
        await _db.SaveChangesAsync();
        return Ok(new { unidad.Id, unidad.Nombre });
    }
}

public record UnidadRequest(Guid EmpresaId, string Nombre);