using Backend.Api.Modules.Inventory.Data;
using Backend.Api.Modules.Sales.Data;
using Backend.Api.Modules.Sales.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ComandasController : ControllerBase
{
    private readonly SalesDbContext _sales;
    private readonly InventoryDbContext _inventory;

    public ComandasController(SalesDbContext sales, InventoryDbContext inventory)
    {
        _sales = sales;
        _inventory = inventory;
    }

    // HU-15: Enviar comanda
    [HttpPost]
    public async Task<IActionResult> Enviar([FromBody] EnviarComandaRequest req)
    {
        var ticket = await _sales.Tickets
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == req.TicketId);

        if (ticket == null) return NotFound();
        if (ticket.Estado != "ABIERTO")
            return BadRequest("El ticket no está abierto");
        if (!ticket.Items.Any())
            return BadRequest("El ticket no tiene ítems");

        // Obtener ítems ya enviados en comandas anteriores
        var itemsYaEnviados = await _sales.ComandaItems
            .Where(ci => _sales.Comandas
                .Where(c => c.TicketId == req.TicketId)
                .Select(c => c.Id)
                .Contains(ci.ComandaId))
            .Select(ci => ci.ProductoId)
            .ToListAsync();

        // Obtener productos para saber su estación
        var productoIds = ticket.Items.Select(i => i.ProductoId).ToList();
        var productos = await _inventory.Productos
            .Where(p => productoIds.Contains(p.Id))
            .ToListAsync();

        // Agrupar ítems nuevos por estación
        var itemsNuevos = ticket.Items
            .Where(i => !itemsYaEnviados.Contains(i.ProductoId))
            .ToList();

        if (!itemsNuevos.Any())
            return BadRequest("No hay ítems nuevos para enviar");

        var grupos = itemsNuevos
            .GroupBy(i => productos.First(p => p.Id == i.ProductoId).EstacionId);

        foreach (var grupo in grupos)
        {
            var comanda = new Comanda
            {
                TicketId = req.TicketId,
                EstacionId = grupo.Key
            };
            _sales.Comandas.Add(comanda);
            await _sales.SaveChangesAsync();

            foreach (var item in grupo)
            {
                _sales.ComandaItems.Add(new ComandaItem
                {
                    ComandaId = comanda.Id,
                    ProductoId = item.ProductoId,
                    Cantidad = item.Cantidad,
                    Nota = item.Nota
                });
            }
        }

        await _sales.SaveChangesAsync();
        return Ok(new { mensaje = "Comanda enviada correctamente" });
    }

    // HU-16: Ver KDS por estación
    [HttpGet("kds/{estacionId}")]
    public async Task<IActionResult> GetKds(Guid estacionId)
    {
        var comandas = await _sales.Comandas
            .Include(c => c.Items)
            .Where(c => c.EstacionId == estacionId)
            .OrderBy(c => c.FechaEnvio)
            .ToListAsync();

        var productoIds = comandas
            .SelectMany(c => c.Items)
            .Select(i => i.ProductoId)
            .Distinct()
            .ToList();

        var productos = await _inventory.Productos
            .Where(p => productoIds.Contains(p.Id))
            .ToListAsync();

        var resultado = comandas.Select(c => new
        {
            c.Id,
            c.TicketId,
            c.FechaEnvio,
            Items = c.Items
                .Where(i => i.Estado != "LISTO")
                .Select(i => new
                {
                    i.Id,
                    Producto = productos.FirstOrDefault(p => p.Id == i.ProductoId)?.Nombre ?? "",
                    i.Cantidad,
                    i.Nota,
                    i.Estado
                })
        }).Where(c => c.Items.Any());

        return Ok(resultado);
    }

    // HU-17: Cambiar estado de ítem en KDS
    [HttpPatch("items/{itemId}/estado")]
    public async Task<IActionResult> CambiarEstado(Guid itemId, [FromBody] CambiarEstadoRequest req)
    {
        var item = await _sales.ComandaItems.FindAsync(itemId);
        if (item == null) return NotFound();

        var estadosValidos = new[] { "PENDIENTE", "EN_PREPARACION", "LISTO" };
        if (!estadosValidos.Contains(req.Estado))
            return BadRequest("Estado inválido");

        item.Estado = req.Estado;
        await _sales.SaveChangesAsync();
        return Ok(new { item.Id, item.Estado });
    }
}

public record EnviarComandaRequest(Guid TicketId);
public record CambiarEstadoRequest(string Estado);