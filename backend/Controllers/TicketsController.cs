using Backend.Api.Modules.Inventory.Data;
using Backend.Api.Modules.Sales.Data;
using Backend.Api.Modules.Sales.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TicketsController : ControllerBase
{
    private readonly SalesDbContext _sales;
    private readonly InventoryDbContext _inventory;

    public TicketsController(SalesDbContext sales, InventoryDbContext inventory)
    {
        _sales = sales;
        _inventory = inventory;
    }

    // HU-10: Listar tickets abiertos
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid empresaId)
    {
        var tickets = await _sales.Tickets
            .Where(t => t.EmpresaId == empresaId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id, t.Numero, t.Estado, t.CreatedAt,
                TotalItems = t.Items.Count
            })
            .ToListAsync();
        return Ok(tickets);
    }

    // HU-10: Crear ticket
    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearTicketRequest req)
    {
        var ultimoNumero = await _sales.Tickets
            .Where(t => t.EmpresaId == req.EmpresaId)
            .MaxAsync(t => (int?)t.Numero) ?? 0;

        var ticket = new Ticket
        {
            EmpresaId = req.EmpresaId,
            Numero = ultimoNumero + 1
        };

        _sales.Tickets.Add(ticket);
        await _sales.SaveChangesAsync();
        return Ok(new { ticket.Id, ticket.Numero, ticket.Estado });
    }

    // HU-12: Ver detalle del ticket con totales
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var ticket = await _sales.Tickets
            .Include(t => t.Items)
            .Include(t => t.Pago)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null) return NotFound();

        var config = await _sales.Configuraciones
            .FirstOrDefaultAsync(c => c.EmpresaId == ticket.EmpresaId);

        var tasa = config?.TasaImpuesto ?? 0.18m;

        var productoIds = ticket.Items.Select(i => i.ProductoId).ToList();
        var productos = await _inventory.Productos
            .Where(p => productoIds.Contains(p.Id))
            .ToListAsync();

        var items = ticket.Items.Select(i =>
        {
            var prod = productos.FirstOrDefault(p => p.Id == i.ProductoId);
            return new
            {
                i.Id,
                i.ProductoId,
                Producto = prod?.Nombre ?? "",
                i.Cantidad,
                i.PrecioUnitario,
                i.Nota,
                Subtotal = i.Cantidad * i.PrecioUnitario
            };
        }).ToList();

        var subtotal = items.Sum(i => i.Subtotal);
        var impuesto = subtotal * tasa;
        var total = subtotal + impuesto;

        return Ok(new
        {
            ticket.Id, ticket.Numero, ticket.Estado, ticket.CreatedAt,
            Items = items,
            Subtotal = subtotal,
            Impuesto = impuesto,
            Total = total,
            TasaImpuesto = tasa,
            Pago = ticket.Pago == null ? null : new
            {
                ticket.Pago.MetodoPago,
                ticket.Pago.Total,
                ticket.Pago.Fecha
            }
        });
    }

    // HU-12: Agregar ítem al ticket
    [HttpPost("{id}/items")]
    public async Task<IActionResult> AgregarItem(Guid id, [FromBody] AgregarItemRequest req)
    {
        var ticket = await _sales.Tickets.FindAsync(id);
        if (ticket == null) return NotFound();
        if (ticket.Estado != "ABIERTO")
            return BadRequest("Solo se pueden agregar ítems a tickets abiertos");

        var producto = await _inventory.Productos.FindAsync(req.ProductoId);
        if (producto == null) return NotFound("Producto no encontrado");
        if (!producto.Activo)
            return BadRequest("El producto está inactivo");
        if (producto.Agotado)
            return BadRequest("El producto está agotado");

        var item = new TicketItem
        {
            TicketId = id,
            ProductoId = req.ProductoId,
            Cantidad = req.Cantidad,
            PrecioUnitario = producto.Precio,
            Nota = req.Nota
        };

        _sales.TicketItems.Add(item);
        await _sales.SaveChangesAsync();
        return Ok(new { item.Id, item.ProductoId, item.Cantidad, item.PrecioUnitario, item.Nota });
    }

    // HU-12: Actualizar cantidad de ítem
    [HttpPut("{id}/items/{itemId}")]
    public async Task<IActionResult> ActualizarItem(Guid id, Guid itemId, [FromBody] ActualizarItemRequest req)
    {
        var ticket = await _sales.Tickets.FindAsync(id);
        if (ticket == null) return NotFound();
        if (ticket.Estado != "ABIERTO")
            return BadRequest("No se puede editar un ticket que no está abierto");

        var item = await _sales.TicketItems.FindAsync(itemId);
        if (item == null) return NotFound();

        if (req.Cantidad <= 0)
        {
            _sales.TicketItems.Remove(item);
        }
        else
        {
            item.Cantidad = req.Cantidad;
            item.Nota = req.Nota;
        }

        await _sales.SaveChangesAsync();
        return Ok(new { mensaje = "Ítem actualizado" });
    }

    // HU-22: Cancelar ticket
    [HttpPost("{id}/cancelar")]
    public async Task<IActionResult> Cancelar(Guid id)
    {
        var ticket = await _sales.Tickets.FindAsync(id);
        if (ticket == null) return NotFound();
        if (ticket.Estado != "ABIERTO")
            return BadRequest("Solo se pueden cancelar tickets abiertos");

        ticket.Estado = "CANCELADO";
        await _sales.SaveChangesAsync();
        return Ok(new { mensaje = "Ticket cancelado" });
    }
}

public record CrearTicketRequest(Guid EmpresaId);
public record AgregarItemRequest(Guid ProductoId, decimal Cantidad, string? Nota);
public record ActualizarItemRequest(decimal Cantidad, string? Nota);