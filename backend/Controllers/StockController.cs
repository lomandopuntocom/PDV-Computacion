using Backend.Api.Modules.Inventory.Data;
using Backend.Api.Modules.Sales.Data;
using Backend.Api.Modules.Sales.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StockController : ControllerBase
{
    private readonly SalesDbContext _sales;
    private readonly InventoryDbContext _inventory;

    public StockController(SalesDbContext sales, InventoryDbContext inventory)
    {
        _sales = sales;
        _inventory = inventory;
    }

    [HttpGet]
    public async Task<IActionResult> GetStock([FromQuery] Guid empresaId)
    {
        var productos = await _inventory.Productos
            .Where(p => p.EmpresaId == empresaId)
            .ToListAsync();

        var productoIds = productos.Select(p => p.Id).ToList();

        var stocks = await _sales.Stocks
            .Where(s => productoIds.Contains(s.ProductoId))
            .ToListAsync();

        var resultado = productos.Select(p =>
        {
            var stock = stocks.FirstOrDefault(s => s.ProductoId == p.Id);
            return new
            {
                p.Id,
                p.Nombre,
                p.Agotado,
                p.StockMinimo,
                Cantidad = stock?.Cantidad ?? 0,
                StockBajo = (stock?.Cantidad ?? 0) <= p.StockMinimo
            };
        });

        return Ok(resultado);
    }

    [HttpPost("ajuste")]
    public async Task<IActionResult> Ajuste([FromBody] AjusteRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Motivo))
            return BadRequest("El motivo es obligatorio");
        if (req.Cantidad <= 0)
            return BadRequest("La cantidad debe ser mayor a 0");

        var stock = await _sales.Stocks
            .FirstOrDefaultAsync(s => s.ProductoId == req.ProductoId);

        if (stock == null)
        {
            stock = new Stock { ProductoId = req.ProductoId, Cantidad = 0 };
            _sales.Stocks.Add(stock);
        }

        if (req.Tipo == "SALIDA" && stock.Cantidad < req.Cantidad)
            return BadRequest($"Stock insuficiente. Disponible: {stock.Cantidad}");

        stock.Cantidad = req.Tipo == "ENTRADA"
            ? stock.Cantidad + req.Cantidad
            : stock.Cantidad - req.Cantidad;

        _sales.AjustesStock.Add(new AjusteStock
        {
            ProductoId = req.ProductoId,
            Tipo = req.Tipo,
            Cantidad = req.Cantidad,
            Motivo = req.Motivo
        });

        await _sales.SaveChangesAsync();
        return Ok(new { mensaje = "Ajuste registrado", cantidadActual = stock.Cantidad });
    }
}

public record AjusteRequest(Guid ProductoId, string Tipo, decimal Cantidad, string Motivo);