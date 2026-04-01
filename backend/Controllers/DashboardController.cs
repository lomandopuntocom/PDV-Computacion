using Backend.Api.Modules.Inventory.Data;
using Backend.Api.Modules.Sales.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly SalesDbContext _sales;
    private readonly InventoryDbContext _inventory;

    public DashboardController(SalesDbContext sales, InventoryDbContext inventory)
    {
        _sales = sales;
        _inventory = inventory;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] Guid empresaId)
    {
        var hoy = DateTime.UtcNow.Date;

        // Tickets pagados hoy
        var ticketsHoy = await _sales.Tickets
            .Include(t => t.Items)
            .Include(t => t.Pago)
            .Where(t => t.EmpresaId == empresaId
                && t.Estado == "PAGADO"
                && t.Pago!.Fecha.Date == hoy)
            .ToListAsync();

        var totalVendido = ticketsHoy.Sum(t => t.Pago!.Total);
        var cantidadTickets = ticketsHoy.Count;
        var ticketPromedio = cantidadTickets > 0 ? totalVendido / cantidadTickets : 0;

        // Productos más vendidos
        var topProductos = ticketsHoy
            .SelectMany(t => t.Items)
            .GroupBy(i => i.ProductoId)
            .Select(g => new { ProductoId = g.Key, TotalVendido = g.Sum(i => i.Cantidad) })
            .OrderByDescending(x => x.TotalVendido)
            .Take(5)
            .ToList();

        var productoIds = topProductos.Select(x => x.ProductoId).ToList();
        var productos = await _inventory.Productos
            .Where(p => productoIds.Contains(p.Id))
            .ToListAsync();

        var topConNombre = topProductos.Select(x => new
        {
            Producto = productos.FirstOrDefault(p => p.Id == x.ProductoId)?.Nombre ?? "",
            x.TotalVendido
        });

        // Productos agotados y stock bajo
        var todosProductos = await _inventory.Productos
            .Where(p => p.EmpresaId == empresaId && p.Activo)
            .ToListAsync();

        var todosIds = todosProductos.Select(p => p.Id).ToList();
        var stocks = await _sales.Stocks
            .Where(s => todosIds.Contains(s.ProductoId))
            .ToListAsync();

        var agotados = todosProductos
            .Where(p => p.Agotado)
            .Select(p => new { p.Id, p.Nombre });

        var stockBajo = todosProductos
            .Where(p => !p.Agotado)
            .Select(p => new
            {
                p.Id, p.Nombre,
                Cantidad = stocks.FirstOrDefault(s => s.ProductoId == p.Id)?.Cantidad ?? 0,
                p.StockMinimo
            })
            .Where(p => p.Cantidad <= p.StockMinimo && p.StockMinimo > 0);

        // Estado de comandas
        var comandaItems = await _sales.ComandaItems
            .Where(ci => _sales.Comandas
                .Where(c => _sales.Tickets
                    .Where(t => t.EmpresaId == empresaId)
                    .Select(t => t.Id)
                    .Contains(c.TicketId))
                .Select(c => c.Id)
                .Contains(ci.ComandaId))
            .ToListAsync();

        return Ok(new
        {
            TotalVendido = totalVendido,
            CantidadTickets = cantidadTickets,
            TicketPromedio = ticketPromedio,
            TopProductos = topConNombre,
            Agotados = agotados,
            StockBajo = stockBajo,
            Comandas = new
            {
                Pendiente = comandaItems.Count(i => i.Estado == "PENDIENTE"),
                EnPreparacion = comandaItems.Count(i => i.Estado == "EN_PREPARACION"),
                Listo = comandaItems.Count(i => i.Estado == "LISTO")
            }
        });
    }
}