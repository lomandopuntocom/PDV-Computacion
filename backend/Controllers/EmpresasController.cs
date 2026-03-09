using InventorySystem.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventorySystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmpresasController : ControllerBase
{
    private readonly AppDbContext _db;
    public EmpresasController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var empresas = await _db.Empresas
            .Where(e => e.Activo)
            .Select(e => new { e.Id, e.Nombre, e.Ruc })
            .ToListAsync();
        return Ok(empresas);
    }
}