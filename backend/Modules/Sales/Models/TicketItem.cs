namespace Backend.Api.Modules.Sales.Models;

public class TicketItem
{
    public Guid Id { get; set; }
    public Guid TicketId { get; set; }
    public Guid ProductoId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public string? Nota { get; set; }

    public Ticket? Ticket { get; set; }
}