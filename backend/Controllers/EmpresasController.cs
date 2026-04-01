using Backend.Api.Modules.Shared.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmpresasController : ControllerBase
{
    private readonly SharedDbContext _db;
    public EmpresasController(SharedDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var empresas = await _db.Empresas
            .Where(e => e.Activo)
            .Select(e => new { e.Id, e.Nombre })
            .ToListAsync();
        return Ok(empresas);
    }
}