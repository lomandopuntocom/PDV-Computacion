namespace Backend.Api.Modules.Sales.Models;

public class Comanda
{
    public Guid Id { get; set; }
    public Guid TicketId { get; set; }
    public Guid EstacionId { get; set; }
    public DateTime FechaEnvio { get; set; } = DateTime.UtcNow;

    public List<ComandaItem> Items { get; set; } = [];
}