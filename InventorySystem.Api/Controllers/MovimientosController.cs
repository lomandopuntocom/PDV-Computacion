using InventorySystem.Api.Data;
using InventorySystem.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventorySystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MovimientosController : ControllerBase
{
    private readonly AppDbContext _db;
    public MovimientosController(AppDbContext db) => _db = db;

    // US-08: Kardex por producto
    [HttpGet]
    public async Task<IActionResult> GetKardex([FromQuery] Guid productoId)
    {
        var movimientos = await _db.Movimientos
            .Include(m => m.Almacen)
            .Where(m => m.ProductoId == productoId)
            .OrderByDescending(m => m.Fecha)
            .Select(m => new
            {
                m.Tipo,
                m.Cantidad,
                m.SaldoAnterior,
                m.SaldoPosterior,
                m.Motivo,
                Almacen = m.Almacen!.Nombre,
                m.Fecha
            })
            .ToListAsync();
        return Ok(movimientos);
    }

    // US-07: Ajuste de stock
    [HttpPost("ajuste")]
    public async Task<IActionResult> Ajuste([FromBody] AjusteRequest req)
    {
        using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            // Buscar o crear registro de stock
            var stock = await _db.Stocks
                .FirstOrDefaultAsync(s => s.ProductoId == req.ProductoId && s.AlmacenId == req.AlmacenId);

            decimal saldoAnterior = stock?.Cantidad ?? 0;

            if (stock == null)
            {
                stock = new Stock { ProductoId = req.ProductoId, AlmacenId = req.AlmacenId, Cantidad = 0 };
                _db.Stocks.Add(stock);
            }

            stock.Cantidad = req.CantidadNueva;

            // Registrar en kardex
            _db.Movimientos.Add(new Movimiento
            {
                ProductoId = req.ProductoId,
                AlmacenId = req.AlmacenId,
                Tipo = "AJUSTE",
                Cantidad = Math.Abs(req.CantidadNueva - saldoAnterior),
                SaldoAnterior = saldoAnterior,
                SaldoPosterior = req.CantidadNueva,
                Motivo = req.Motivo
            });

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return Ok(new { mensaje = "Ajuste registrado correctamente" });
        }
        catch
        {
            await transaction.RollbackAsync();
            return StatusCode(500, "Error al registrar el ajuste");
        }
    }
}

public record AjusteRequest(Guid ProductoId, Guid AlmacenId, decimal CantidadNueva, string Motivo);