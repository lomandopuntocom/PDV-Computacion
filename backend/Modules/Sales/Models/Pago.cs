namespace Backend.Api.Modules.Sales.Models;

public class Pago
{
    public Guid Id { get; set; }
    public Guid TicketId { get; set; }
    public string MetodoPago { get; set; } = string.Empty; // EFECTIVO, QR, TARJETA
    public decimal Total { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow;

    public Ticket? Ticket { get; set; }
}