namespace InventorySystem.Api.Models;

public class DocumentoItem
{
    public Guid Id { get; set; }
    public Guid DocumentoId { get; set; }
    public Guid ProductoId { get; set; }
    public Guid AlmacenId { get; set; }
    public decimal Cantidad { get; set; }

    public Producto? Producto { get; set; }
    public Almacen? Almacen { get; set; }
    public Documento? Documento { get; set; }
}