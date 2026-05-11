namespace Backend.Api.Modules.Inventory.Models;

public class Categoria
{
    public Guid Id { get; set; }
    public Guid EmpresaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string CenCode { get; set; } = string.Empty; // Format: CAT-00001
}