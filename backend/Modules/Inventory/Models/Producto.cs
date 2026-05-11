namespace Backend.Api.Modules.Inventory.Models;

public class Producto
{
    public Guid Id { get; set; }
    public Guid EmpresaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string CenCode { get; set; } = string.Empty; // Format: PRO-00001
    public Guid CategoriaId { get; set; }
    public Guid UnidadId { get; set; }
    public decimal Precio { get; set; }
    public decimal StockMinimo { get; set; } = 0;
    public bool Agotado { get; set; } = false;
    public bool Activo { get; set; } = true;
    public Guid EstacionId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Categoria? Categoria { get; set; }
    public Unidad? Unidad { get; set; }
}