namespace Backend.Api.Modules.Sales.Models;

public class ComandaItem
{
    public Guid Id { get; set; }
    public Guid ComandaId { get; set; }
    public Guid ProductoId { get; set; }
    public decimal Cantidad { get; set; }
    public string? Nota { get; set; }
    public string Estado { get; set; } = "PENDIENTE"; // PENDIENTE, EN_PREPARACION, LISTO

    public Comanda? Comanda { get; set; }
}