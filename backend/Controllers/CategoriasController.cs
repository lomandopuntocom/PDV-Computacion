using Backend.Api.Modules.Inventory.Data;
using Backend.Api.Modules.Inventory.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriasController : ControllerBase
{
    private readonly InventoryDbContext _db;
    public CategoriasController(InventoryDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid empresaId)
    {
        var categorias = await _db.Categorias
            .Where(c => c.EmpresaId == empresaId)
            .Select(c => new { c.Id, c.Nombre })
            .OrderBy(c => c.Nombre)
            .ToListAsync();
        return Ok(categorias);
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CategoriaRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Nombre))
            return BadRequest("El nombre es obligatorio");

        var existe = await _db.Categorias
            .AnyAsync(c => c.EmpresaId == req.EmpresaId && c.Nombre == req.Nombre);
        if (existe)
            return BadRequest("Ya existe una categoría con ese nombre");

        var categoria = new Categoria { EmpresaId = req.EmpresaId, Nombre = req.Nombre };
        _db.Categorias.Add(categoria);
        await _db.SaveChangesAsync();
        return Ok(new { categoria.Id, categoria.Nombre });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Editar(Guid id, [FromBody] CategoriaRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Nombre))
            return BadRequest("El nombre es obligatorio");

        var categoria = await _db.Categorias.FindAsync(id);
        if (categoria == null) return NotFound();

        categoria.Nombre = req.Nombre;
        await _db.SaveChangesAsync();
        return Ok(new { categoria.Id, categoria.Nombre });
    }
}

public record CategoriaRequest(Guid EmpresaId, string Nombre);