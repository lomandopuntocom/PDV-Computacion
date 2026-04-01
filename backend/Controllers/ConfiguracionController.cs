using Backend.Api.Modules.Sales.Data;
using Backend.Api.Modules.Sales.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConfiguracionController : ControllerBase
{
    private readonly SalesDbContext _db;
    public ConfiguracionController(SalesDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] Guid empresaId)
    {
        var config = await _db.Configuraciones
            .FirstOrDefaultAsync(c => c.EmpresaId == empresaId);

        if (config == null) return NotFound();
        return Ok(new { config.Id, config.TasaImpuesto });
    }

    [HttpPut]
    public async Task<IActionResult> Actualizar([FromBody] ConfiguracionRequest req)
    {
        if (req.TasaImpuesto < 0)
            return BadRequest("La tasa de impuesto no puede ser negativa");

        var config = await _db.Configuraciones
            .FirstOrDefaultAsync(c => c.EmpresaId == req.EmpresaId);

        if (config == null)
        {
            config = new Configuracion { EmpresaId = req.EmpresaId, TasaImpuesto = req.TasaImpuesto };
            _db.Configuraciones.Add(config);
        }
        else
        {
            config.TasaImpuesto = req.TasaImpuesto;
        }

        await _db.SaveChangesAsync();
        return Ok(new { config.Id, config.TasaImpuesto });
    }
}

public record ConfiguracionRequest(Guid EmpresaId, decimal TasaImpuesto);