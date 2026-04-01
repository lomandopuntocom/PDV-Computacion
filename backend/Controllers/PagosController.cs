using Backend.Api.Modules.Inventory.Data;
using Backend.Api.Modules.Sales.Data;
using Backend.Api.Modules.Sales.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PagosController : ControllerBase
{
    private readonly SalesDbContext _sales;
    private readonly InventoryDbContext _inventory;

    public PagosController(SalesDbContext sales, InventoryDbContext inventory)
    {
        _sales = sales;
        _inventory = inventory;
    }

    // HU-19, HU-20, HU-21: Cobrar ticket
    [HttpPost]
    public async Task<IActionResult> Cobrar([FromBody] CobrarRequest req)
    {
        using var transaction = await _sales.Database.BeginTransactionAsync();
        try
        {
            var ticket = await _sales.Tickets
                .Include(t => t.Items)
                .FirstOrDefaultAsync(t => t.Id == req.TicketId);

            if (ticket == null) return NotFound();
            if (ticket.Estado != "ABIERTO")
                return BadRequest("Solo se pueden cobrar tickets abiertos");
            if (!ticket.Items.Any())
                return BadRequest("El ticket no tiene ítems");

            var metodosValidos = new[] { "EFECTIVO", "QR", "TARJETA" };
            if (!metodosValidos.Contains(req.MetodoPago))
                return BadRequest("Método de pago inválido");

            // HU-20: Validar stock
            var productoIds = ticket.Items.Select(i => i.ProductoId).ToList();
            var stocks = await _sales.Stocks
                .Where(s => productoIds.Contains(s.ProductoId))
                .ToListAsync();

            var productos = await _inventory.Productos
                .Where(p => productoIds.Contains(p.Id))
                .ToListAsync();

            var faltantes = new List<object>();
            foreach (var item in ticket.Items)
            {
                var stock = stocks.FirstOrDefault(s => s.ProductoId == item.ProductoId);
                var cantidad = stock?.Cantidad ?? 0;
                if (cantidad < item.Cantidad)
                {
                    var prod = productos.FirstOrDefault(p => p.Id == item.ProductoId);
                    faltantes.Add(new
                    {
                        Producto = prod?.Nombre ?? "",
                        Requerido = item.Cantidad,
                        Disponible = cantidad
                    });
                }
            }

            if (faltantes.Any())
                return BadRequest(new { mensaje = "Stock insuficiente", faltantes });

            // HU-21: Descontar stock
            foreach (var item in ticket.Items)
            {
                var stock = stocks.First(s => s.ProductoId == item.ProductoId);
                stock.Cantidad -= item.Cantidad;

                _sales.AjustesStock.Add(new AjusteStock
                {
                    ProductoId = item.ProductoId,
                    Tipo = "SALIDA",
                    Cantidad = item.Cantidad,
                    Motivo = $"Venta Ticket #{ticket.Numero}"
                });
            }

            // Calcular total
            var config = await _sales.Configuraciones
                .FirstOrDefaultAsync(c => c.EmpresaId == ticket.EmpresaId);
            var tasa = config?.TasaImpuesto ?? 0.18m;
            var subtotal = ticket.Items.Sum(i => i.Cantidad * i.PrecioUnitario);
            var total = subtotal + (subtotal * tasa);

            // Registrar pago
            _sales.Pagos.Add(new Pago
            {
                TicketId = ticket.Id,
                MetodoPago = req.MetodoPago,
                Total = total,
            });

            ticket.Estado = "PAGADO";
            await _sales.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { mensaje = "Pago registrado correctamente", total });
        }
        catch
        {
            await transaction.RollbackAsync();
            return StatusCode(500, "Error al procesar el pago");
        }
    }
}

public record CobrarRequest(Guid TicketId, string MetodoPago);