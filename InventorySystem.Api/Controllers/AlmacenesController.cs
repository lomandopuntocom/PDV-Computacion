using InventorySystem.Api.Data;
using InventorySystem.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventorySystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AlmacenesController : ControllerBase
{
    private readonly AppDbContext _db;
    public AlmacenesController(AppDbContext db) => _db = db;

    // Listar almacenes por empresa
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid empresaId)
    {
        var almacenes = await _db.Almacenes
            .Where(a => a.EmpresaId == empresaId && a.Activo)
            .Select(a => new { a.Id, a.Nombre })
            .ToListAsync();
        return Ok(almacenes);
    }

    // Crear almacén
    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearAlmacenRequest req)
    {
        var almacen = new Almacen
        {
            EmpresaId = req.EmpresaId,
            Nombre = req.Nombre
        };
        _db.Almacenes.Add(almacen);
        await _db.SaveChangesAsync();
        return Ok(new { almacen.Id, mensaje = "Almacén creado correctamente" });
    }
}

public record CrearAlmacenRequest(Guid EmpresaId, string Nombre);