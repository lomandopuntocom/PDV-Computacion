namespace Backend.Api.Modules.Inventory.Models;

public class Unidad
{
    public Guid Id { get; set; }
    public Guid EmpresaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
}