using InventorySystem.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventorySystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StockController : ControllerBase
{
    private readonly AppDbContext _db;
    public StockController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetStock([FromQuery] Guid empresaId)
    {
        var stock = await _db.Stocks
            .Include(s => s.Producto)
            .Include(s => s.Almacen)
            .Where(s => s.Producto!.EmpresaId == empresaId)
            .Select(s => new
            {
                s.Producto!.Codigo,
                s.Producto.Nombre,
                s.Producto.Categoria,
                s.Producto.Unidad,
                Almacen = s.Almacen!.Nombre,
                s.Cantidad,
                StockBajo = s.Cantidad <= s.Producto.StockMinimo
            })
            .ToListAsync();
        return Ok(stock);
    }
    `
    [HttpGet("resumen")]
    public async Task<IActionResult> GetResumen([FromQuery] Guid empresaId)
    {
        var totalProductos = await _db.Productos
            .CountAsync(p => p.EmpresaId == empresaId && p.Activo);

        var stockData = await _db.Stocks
            .Include(s => s.Producto)
            .Where(s => s.Producto!.EmpresaId == empresaId)
            .ToListAsync();

        return Ok(new
        {
            TotalProductos = totalProductos,
            TotalStock = stockData.Sum(s => s.Cantidad),
            AlertasStockBajo = stockData.Count(s => s.Cantidad <= s.Producto!.StockMinimo)
        });
    }
}