namespace Backend.Api.Modules.Shared.Models;

public class CenCounter
{
    public Guid Id { get; set; }
    public Guid EmpresaId { get; set; }
    public string Prefix { get; set; } = string.Empty; // EMP, CAT, UNI, EST, PRO, TIC, COM
    public int CurrentNumber { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
