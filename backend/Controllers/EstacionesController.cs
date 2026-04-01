using Backend.Api.Modules.Sales.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EstacionesController : ControllerBase
{
    private readonly SalesDbContext _db;
    public EstacionesController(SalesDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid empresaId)
    {
        var estaciones = await _db.Estaciones
            .Where(e => e.EmpresaId == empresaId)
            .Select(e => new { e.Id, e.Nombre })
            .ToListAsync();
        return Ok(estaciones);
    }
}