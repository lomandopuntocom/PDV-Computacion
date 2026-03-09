namespace InventorySystem.Api.Models;

public class Stock
{
    public Guid Id { get; set; }
    public Guid ProductoId { get; set; }
    public Guid AlmacenId { get; set; }
    public decimal Cantidad { get; set; } = 0;

    public Producto? Producto { get; set; }
    public Almacen? Almacen { get; set; }
}