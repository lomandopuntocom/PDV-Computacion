namespace InventorySystem.Api.Models;

public class Movimiento
{
    public Guid Id { get; set; }
    public Guid ProductoId { get; set; }
    public Guid AlmacenId { get; set; }
    public string Tipo { get; set; } = string.Empty; // ENTRADA, SALIDA, AJUSTE
    public decimal Cantidad { get; set; }
    public decimal SaldoAnterior { get; set; }
    public decimal SaldoPosterior { get; set; }
    public string? Motivo { get; set; }
    public Guid? DocumentoId { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }

    public Producto? Producto { get; set; }
    public Almacen? Almacen { get; set; }
}