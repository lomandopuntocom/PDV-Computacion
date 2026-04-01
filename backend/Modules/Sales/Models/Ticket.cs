namespace Backend.Api.Modules.Sales.Models;

public class Ticket
{
    public Guid Id { get; set; }
    public Guid EmpresaId { get; set; }
    public int Numero { get; set; }
    public string Estado { get; set; } = "ABIERTO"; // ABIERTO, PAGADO, CANCELADO
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<TicketItem> Items { get; set; } = [];
    public Pago? Pago { get; set; }
}