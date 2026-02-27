namespace InventorySystem.Api.Models;

public class Producto
{
    public Guid Id { get; set; }
    public Guid EmpresaId { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Categoria { get; set; }
    public string? Unidad { get; set; }
    public decimal StockMinimo { get; set; } = 0;
    public bool Activo { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Empresa? Empresa { get; set; }
}