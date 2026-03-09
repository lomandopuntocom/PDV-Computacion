using InventorySystem.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventorySystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductosController : ControllerBase
{
    private readonly AppDbContext _db;
    public ProductosController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetByEmpresa([FromQuery] Guid empresaId)
    {
        var productos = await _db.Productos
            .Where(p => p.EmpresaId == empresaId && p.Activo)
            .Select(p => new
            {
                p.Id,
                p.Codigo,
                p.Nombre,
                p.Categoria,
                p.Unidad,
                p.StockMinimo,
                p.Activo
            })
            .ToListAsync();
        return Ok(productos);
    }
}