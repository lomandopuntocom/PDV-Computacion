using InventorySystem.Api.Data;
using InventorySystem.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventorySystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentosController : ControllerBase
{
    private readonly AppDbContext _db;
    public DocumentosController(AppDbContext db) => _db = db;

    // US-13: Listar documentos
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid empresaId)
    {
        var docs = await _db.Documentos
            .Where(d => d.EmpresaId == empresaId)
            .Select(d => new
            {
                d.Id,
                d.Tipo,
                d.Estado,
                d.Fecha,
                d.Referencia,
                TotalItems = d.Items.Count
            })
            .OrderByDescending(d => d.Fecha)
            .ToListAsync();
        return Ok(docs);
    }

    // US-14: Detalle de un documento
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var doc = await _db.Documentos
            .Include(d => d.Items)
                .ThenInclude(i => i.Producto)
            .Include(d => d.Items)
                .ThenInclude(i => i.Almacen)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (doc == null) return NotFound();

        return Ok(new
        {
            doc.Id,
            doc.Tipo,
            doc.Estado,
            doc.Fecha,
            doc.Referencia,
            doc.Observaciones,
            Items = doc.Items.Select(i => new
            {
                i.Id,
                Producto = i.Producto!.Nombre,
                i.Producto.Codigo,
                Almacen = i.Almacen!.Nombre,
                i.Cantidad
            })
        });
    }

    // US-09 y US-11: Crear documento (entrada o salida) en borrador
    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearDocumentoRequest req)
    {
        var doc = new Documento
        {
            EmpresaId = req.EmpresaId,
            Tipo = req.Tipo,
            Referencia = req.Referencia,
            Observaciones = req.Observaciones,
            Items = req.Items.Select(i => new DocumentoItem
            {
                ProductoId = i.ProductoId,
                AlmacenId = i.AlmacenId,
                Cantidad = i.Cantidad
            }).ToList()
        };

        _db.Documentos.Add(doc);
        await _db.SaveChangesAsync();
        return Ok(new { doc.Id, mensaje = "Documento creado en borrador" });
    }

    // US-10 y US-12: Confirmar documento ? impacta stock y genera kardex
    [HttpPost("{id}/confirmar")]
    public async Task<IActionResult> Confirmar(Guid id)
    {
        using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var doc = await _db.Documentos
                .Include(d => d.Items)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (doc == null) return NotFound();
            if (doc.Estado != "BORRADOR")
                return BadRequest("Solo se pueden confirmar documentos en estado BORRADOR");

            foreach (var item in doc.Items)
            {
                // Buscar o crear registro de stock
                var stock = await _db.Stocks
                    .FirstOrDefaultAsync(s => s.ProductoId == item.ProductoId && s.AlmacenId == item.AlmacenId);

                decimal saldoAnterior = stock?.Cantidad ?? 0;
                decimal saldoPosterior;

                if (doc.Tipo == "ENTRADA")
                {
                    saldoPosterior = saldoAnterior + item.Cantidad;
                }
                else // SALIDA
                {
                    if (saldoAnterior < item.Cantidad)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest($"Stock insuficiente para el producto {item.ProductoId}");
                    }
                    saldoPosterior = saldoAnterior - item.Cantidad;
                }

                // Actualizar stock
                if (stock == null)
                {
                    stock = new Stock
                    {
                        ProductoId = item.ProductoId,
                        AlmacenId = item.AlmacenId,
                        Cantidad = saldoPosterior
                    };
                    _db.Stocks.Add(stock);
                }
                else
                {
                    stock.Cantidad = saldoPosterior;
                }

                // Registrar en kardex
                _db.Movimientos.Add(new Movimiento
                {
                    ProductoId = item.ProductoId,
                    AlmacenId = item.AlmacenId,
                    Tipo = doc.Tipo,
                    Cantidad = item.Cantidad,
                    SaldoAnterior = saldoAnterior,
                    SaldoPosterior = saldoPosterior,
                    Motivo = $"Documento {doc.Tipo} #{doc.Id}",
                    DocumentoId = doc.Id
                });
            }

            doc.Estado = "CONFIRMADO";
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { mensaje = "Documento confirmado correctamente" });
        }
        catch
        {
            await transaction.RollbackAsync();
            return StatusCode(500, "Error al confirmar el documento");
        }
    }
}

// DTOs
public record CrearDocumentoRequest(
    Guid EmpresaId,
    string Tipo,
    string? Referencia,
    string? Observaciones,
    List<DocumentoItemRequest> Items
);

public record DocumentoItemRequest(
    Guid ProductoId,
    Guid AlmacenId,
    decimal Cantidad
);