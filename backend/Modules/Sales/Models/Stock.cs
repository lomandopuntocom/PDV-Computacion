namespace Backend.Api.Modules.Sales.Models;

public class Stock
{
    public Guid Id { get; set; }
    public Guid ProductoId { get; set; }
    public decimal Cantidad { get; set; } = 0;
}