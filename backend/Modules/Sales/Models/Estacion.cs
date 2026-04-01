namespace Backend.Api.Modules.Sales.Models;

public class Estacion
{
    public Guid Id { get; set; }
    public Guid EmpresaId { get; set; }
    public string Nombre { get; set; } = string.Empty; // COCINA, BAR
}