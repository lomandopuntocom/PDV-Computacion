using Backend.Api.Modules.Inventory.Data;
using Backend.Api.Modules.Inventory.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductosController : ControllerBase
{
    private readonly InventoryDbContext _db;
    public ProductosController(InventoryDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid empresaId, [FromQuery] Guid? categoriaId, [FromQuery] string? buscar)
    {
        var query = _db.Productos
            .Include(p => p.Categoria)
            .Include(p => p.Unidad)
            .Where(p => p.EmpresaId == empresaId);

        if (categoriaId.HasValue)
            query = query.Where(p => p.CategoriaId == categoriaId.Value);

        if (!string.IsNullOrWhiteSpace(buscar))
            query = query.Where(p => p.Nombre.ToLower().Contains(buscar.ToLower()));

        var productos = await query
            .Select(p => new
            {
                p.Id, p.Nombre, p.Precio,
                p.Agotado, p.Activo, p.StockMinimo,
                Categoria = p.Categoria!.Nombre,
                p.CategoriaId,
                Unidad = p.Unidad!.Nombre,
                p.UnidadId,
                p.EstacionId
            })
            .OrderBy(p => p.Nombre)
            .ToListAsync();

        return Ok(productos);
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] ProductoRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Nombre))
            return BadRequest("El nombre es obligatorio");
        if (req.Precio <= 0)
            return BadRequest("El precio debe ser mayor a 0");
        if (req.CategoriaId == Guid.Empty)
            return BadRequest("La categoría es obligatoria");
        if (req.UnidadId == Guid.Empty)
            return BadRequest("La unidad es obligatoria");
        if (req.EstacionId == Guid.Empty)
            return BadRequest("La estación es obligatoria");

        var producto = new Producto
        {
            EmpresaId = req.EmpresaId,
            Nombre = req.Nombre,
            CategoriaId = req.CategoriaId,
            UnidadId = req.UnidadId,
            Precio = req.Precio,
            StockMinimo = req.StockMinimo,
            EstacionId = req.EstacionId
        };

        _db.Productos.Add(producto);
        await _db.SaveChangesAsync();
        return Ok(new { producto.Id, producto.Nombre });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Editar(Guid id, [FromBody] ProductoRequest req)
    {
        if (req.Precio <= 0)
            return BadRequest("El precio debe ser mayor a 0");

        var producto = await _db.Productos.FindAsync(id);
        if (producto == null) return NotFound();

        producto.Nombre = req.Nombre;
        producto.CategoriaId = req.CategoriaId;
        producto.UnidadId = req.UnidadId;
        producto.Precio = req.Precio;
        producto.StockMinimo = req.StockMinimo;
        producto.EstacionId = req.EstacionId;

        await _db.SaveChangesAsync();
        return Ok(new { producto.Id, producto.Nombre });
    }

    [HttpPatch("{id}/activo")]
    public async Task<IActionResult> ToggleActivo(Guid id)
    {
        var producto = await _db.Productos.FindAsync(id);
        if (producto == null) return NotFound();

        producto.Activo = !producto.Activo;
        await _db.SaveChangesAsync();
        return Ok(new { producto.Id, producto.Activo });
    }

    [HttpPatch("{id}/agotado")]
    public async Task<IActionResult> ToggleAgotado(Guid id)
    {
        var producto = await _db.Productos.FindAsync(id);
        if (producto == null) return NotFound();

        producto.Agotado = !producto.Agotado;
        await _db.SaveChangesAsync();
        return Ok(new { producto.Id, producto.Agotado });
    }
}

public record ProductoRequest(
    Guid EmpresaId,
    string Nombre,
    Guid CategoriaId,
    Guid UnidadId,
    decimal Precio,
    decimal StockMinimo,
    Guid EstacionId
);