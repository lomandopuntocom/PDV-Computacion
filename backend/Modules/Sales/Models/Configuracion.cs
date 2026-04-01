namespace Backend.Api.Modules.Sales.Models;

public class Configuracion
{
    public Guid Id { get; set; }
    public Guid EmpresaId { get; set; }
    public decimal TasaImpuesto { get; set; } = 0.18m; // 18% por defecto
}