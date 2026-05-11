namespace Backend.Api.Modules.Inventory.Models;

public class Unidad
{
    public Guid Id { get; set; }
    public Guid EmpresaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string CenCode { get; set; } = string.Empty; // Format: UNI-00001
}