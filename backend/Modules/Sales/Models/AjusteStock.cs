namespace Backend.Api.Modules.Sales.Models;

public class AjusteStock
{
    public Guid Id { get; set; }
    public Guid ProductoId { get; set; }
    public string Tipo { get; set; } = string.Empty; // ENTRADA, SALIDA
    public decimal Cantidad { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
}