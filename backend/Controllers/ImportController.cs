using ClosedXML.Excel;
using InventorySystem.Api.Data;
using InventorySystem.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventorySystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ImportController : ControllerBase
{
    private readonly AppDbContext _db;
    public ImportController(AppDbContext db) => _db = db;

    [HttpPost("productos/{empresaId}")]
    public async Task<IActionResult> ImportarProductos(Guid empresaId, IFormFile archivo)
    {
        if (archivo == null || archivo.Length == 0)
            return BadRequest("No se envió ningún archivo");

        if (!archivo.FileName.EndsWith(".xlsx"))
            return BadRequest("El archivo debe ser .xlsx");

        var resultados = new List<object>();
        var errores = new List<string>();

        using var stream = archivo.OpenReadStream();
        using var workbook = new XLWorkbook(stream);
        var hoja = workbook.Worksheet(1);
        var filas = hoja.RowsUsed().Skip(1); // Saltar encabezado

        foreach (var fila in filas)
        {
            var codigo = fila.Cell(1).GetString().Trim();
            var nombre = fila.Cell(2).GetString().Trim();
            var categoria = fila.Cell(3).GetString().Trim();
            var unidad = fila.Cell(4).GetString().Trim();
            var stockMinimoStr = fila.Cell(5).GetString().Trim();

            if (string.IsNullOrEmpty(codigo) || string.IsNullOrEmpty(nombre))
            {
                errores.Add($"Fila {fila.RowNumber()}: código y nombre son obligatorios");
                continue;
            }

            decimal stockMinimo = 0;
            if (!string.IsNullOrEmpty(stockMinimoStr))
                decimal.TryParse(stockMinimoStr, out stockMinimo);

            // Verificar si ya existe
            var existe = await _db.Productos
                .AnyAsync(p => p.EmpresaId == empresaId && p.Codigo == codigo);

            if (existe)
            {
                errores.Add($"Fila {fila.RowNumber()}: el código '{codigo}' ya existe, se omitió");
                continue;
            }

            var producto = new Producto
            {
                EmpresaId = empresaId,
                Codigo = codigo,
                Nombre = nombre,
                Categoria = string.IsNullOrEmpty(categoria) ? null : categoria,
                Unidad = string.IsNullOrEmpty(unidad) ? null : unidad,
                StockMinimo = stockMinimo
            };

            _db.Productos.Add(producto);
            resultados.Add(new { codigo, nombre });
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            importados = resultados.Count,
            omitidos = errores.Count,
            errores
        });
    }
}