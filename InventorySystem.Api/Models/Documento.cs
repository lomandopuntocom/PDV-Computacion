namespace InventorySystem.Api.Models;

public class Documento
{
    public Guid Id { get; set; }
    public Guid EmpresaId { get; set; }
    public string Tipo { get; set; } = string.Empty; // ENTRADA, SALIDA
    public string Estado { get; set; } = "BORRADOR";  // BORRADOR, CONFIRMADO, ANULADO
    public DateOnly Fecha { get; set; } = DateOnly.FromDateTime(DateTime.Today);
    public string? Referencia { get; set; }
    public string? Observaciones { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Empresa? Empresa { get; set; }
    public List<DocumentoItem> Items { get; set; } = [];
}