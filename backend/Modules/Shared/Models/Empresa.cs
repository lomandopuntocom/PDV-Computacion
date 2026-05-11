namespace Backend.Api.Modules.Shared.Models;

public class Empresa
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string CenCode { get; set; } = string.Empty; // Format: EMP-00001
    public bool Activo { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}