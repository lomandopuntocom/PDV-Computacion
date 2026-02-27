namespace InventorySystem.Api.Models;

public class Almacen
{
    public Guid Id { get; set; }
    public Guid EmpresaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;

    public Empresa? Empresa { get; set; }
}