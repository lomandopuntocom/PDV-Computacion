using Backend.Api.Modules.Sales.Data;
using Backend.Api.Modules.Sales.Models;
using Backend.Api.Modules.Shared.Data;
using Backend.Api.Modules.Shared.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers.Pos;

/// <summary>
/// POS Accounts Management (Tickets)
/// Contract: /pos/accounts
/// Manages open accounts/tickets for Point of Sale operations
/// </summary>
[ApiController]
[Route("api/pos/accounts")]
public class PosAccountsController : ControllerBase
{
    private readonly SalesDbContext _salesDb;
    private readonly SharedDbContext _sharedDb;
    private readonly ICenCodeGenerator _cenGenerator;

    public PosAccountsController(SalesDbContext salesDb, SharedDbContext sharedDb, ICenCodeGenerator cenGenerator)
    {
        _salesDb = salesDb;
        _sharedDb = sharedDb;
        _cenGenerator = cenGenerator;
    }

    /// <summary>
    /// GET /pos/accounts
    /// List all currently open accounts (HU-10).
    /// Response: 200 OK
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid empresaId)
    {
        var accounts = await _salesDb.Tickets
            .Where(t => t.EmpresaId == empresaId && t.Estado == "ABIERTO")
            .Include(t => t.Items)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id,
                t.CenCode,
                t.Numero,
                t.Estado,
                itemCount = t.Items.Count,
                t.CreatedAt
            })
            .ToListAsync();

        return Ok(accounts);
    }

    /// <summary>
    /// POST /pos/accounts
    /// Create a new open account/ticket (HU-10).
    /// Response: 201 Created (Returns account ID and sequence number).
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAccountRequest req)
    {
        // Get next ticket number for this empresa
        var lastTicket = await _salesDb.Tickets
            .Where(t => t.EmpresaId == req.empresaId)
            .OrderByDescending(t => t.Numero)
            .FirstOrDefaultAsync();

        int nextNumber = (lastTicket?.Numero ?? 0) + 1;

        // Generate CEN code
        var cenCode = await _cenGenerator.GenerateCenCodeAsync(req.empresaId, "TIC");

        var ticket = new Ticket
        {
            Id = Guid.NewGuid(),
            EmpresaId = req.empresaId,
            Numero = nextNumber,
            CenCode = cenCode,
            Estado = "ABIERTO",
            CreatedAt = DateTime.UtcNow
        };

        _salesDb.Tickets.Add(ticket);
        await _salesDb.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { empresaId = req.empresaId }, new
        {
            ticket.Id,
            ticket.CenCode,
            ticket.Numero,
            ticket.Estado
        });
    }

    /// <summary>
    /// GET /pos/accounts/{accountId}
    /// Get account details with items.
    /// Response: 200 OK
    /// </summary>
    [HttpGet("{accountId}")]
    public async Task<IActionResult> GetDetail(Guid accountId)
    {
        var account = await _salesDb.Tickets
            .Include(t => t.Items)
            .Include(t => t.Pago)
            .FirstOrDefaultAsync(t => t.Id == accountId);

        if (account == null)
            return NotFound("Cuenta no encontrada");

        return Ok(new
        {
            account.Id,
            account.CenCode,
            account.Numero,
            account.Estado,
            account.CreatedAt,
            items = account.Items.Select(i => new
            {
                i.Id,
                i.ProductoId,
                i.Cantidad,
                i.PrecioUnitario,
                i.Nota,
                subtotal = i.Cantidad * i.PrecioUnitario
            }),
            pago = account.Pago == null ? null : new
            {
                account.Pago.Id,
                account.Pago.MetodoPago,
                account.Pago.Total
            }
        });
    }

    /// <summary>
    /// PATCH /pos/accounts/{accountId}/waiter
    /// Assign a waiter to the account (HU-11).
    /// Request: { "waiterId": "..." }
    /// Response: 204 No Content
    /// </summary>
    [HttpPatch("{accountId}/waiter")]
    public async Task<IActionResult> AssignWaiter(Guid accountId, [FromBody] AssignWaiterRequest req)
    {
        var account = await _salesDb.Tickets.FindAsync(accountId);
        if (account == null)
            return NotFound("Cuenta no encontrada");

        // TODO: Implement waiter assignment logic (might need new Camarero table)
        // For now, just acknowledge the request
        return NoContent();
    }

    /// <summary>
    /// POST /pos/accounts/{accountId}/items
    /// Add a product to the account (take order) (HU-12).
    /// Request: { "productId": "...", "quantity": 2, "notes": "No onions" }
    /// Response: 200 OK (Returns recalculated subtotal, tax, and total - HU-14).
    /// Errors: 409 Conflict (Product exhausted or inactive).
    /// </summary>
    [HttpPost("{accountId}/items")]
    public async Task<IActionResult> AddItem(Guid accountId, [FromBody] AddItemRequest req)
    {
        var account = await _salesDb.Tickets
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == accountId);

        if (account == null)
            return NotFound("Cuenta no encontrada");

        if (account.Estado != "ABIERTO")
            return BadRequest("Solo se pueden agregar items a cuentas abiertas");

        // TODO: Verify product exists and is active (needs cross-module access)
        // For now, create the item

        var item = new TicketItem
        {
            Id = Guid.NewGuid(),
            TicketId = accountId,
            ProductoId = req.productId,
            Cantidad = req.quantity,
            PrecioUnitario = 0, // TODO: Get from Producto
            Nota = req.notes
        };

        _salesDb.TicketItems.Add(item);
        await _salesDb.SaveChangesAsync();

        // Recalculate totals
        var updatedAccount = await _salesDb.Tickets
            .Include(t => t.Items)
            .FirstAsync(t => t.Id == accountId);

        var subtotal = updatedAccount.Items.Sum(i => i.Cantidad * i.PrecioUnitario);
        var taxRate = 0.18m; // TODO: Get from Configuracion
        var tax = subtotal * taxRate;
        var total = subtotal + tax;

        return Ok(new
        {
            accountId,
            subtotal,
            tax,
            total,
            itemCount = updatedAccount.Items.Count
        });
    }

    /// <summary>
    /// POST /pos/accounts/{accountId}/commands
    /// Send the current un-sent items to the Kitchen/Bar KDS (HU-15).
    /// Response: 201 Created
    /// </summary>
    [HttpPost("{accountId}/commands")]
    public async Task<IActionResult> CreateCommand(Guid accountId, [FromBody] CreateCommandRequest req)
    {
        var account = await _salesDb.Tickets
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == accountId);

        if (account == null)
            return NotFound("Cuenta no encontrada");

        // Generate CEN code for command
        var cenCode = await _cenGenerator.GenerateCenCodeAsync(account.EmpresaId, "COM");

        var command = new Comanda
        {
            Id = Guid.NewGuid(),
            TicketId = accountId,
            EstacionId = req.estacionId,
            CenCode = cenCode,
            FechaEnvio = DateTime.UtcNow
        };

        // TODO: Create ComandaItems from Ticket items

        _salesDb.Comandas.Add(command);
        await _salesDb.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDetail), new { accountId }, new
        {
            command.Id,
            command.CenCode,
            command.EstacionId,
            command.FechaEnvio
        });
    }

    /// <summary>
    /// POST /pos/accounts/{accountId}/pay
    /// Pay the account, validating and discounting stock (HU-19, HU-20, HU-21).
    /// Request: { "paymentMethodId": "..." }
    /// Response: 200 OK
    /// Errors: 400 Bad Request (Missing waiter), 409 Conflict (Insufficient stock).
    /// </summary>
    [HttpPost("{accountId}/pay")]
    public async Task<IActionResult> Pay(Guid accountId, [FromBody] PayAccountRequest req)
    {
        var account = await _salesDb.Tickets
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == accountId);

        if (account == null)
            return NotFound("Cuenta no encontrada");

        // TODO: Validate waiter assignment
        // TODO: Validate stock availability
        // TODO: Create Pago record
        // TODO: Update account status to PAGADO

        return Ok(new { message = "Pago procesado", accountId, status = "PAGADO" });
    }

    /// <summary>
    /// POST /pos/accounts/{accountId}/cancel
    /// Cancel an open account (HU-22).
    /// Response: 204 No Content
    /// Errors: 409 Conflict (Cannot cancel a paid account).
    /// </summary>
    [HttpPost("{accountId}/cancel")]
    public async Task<IActionResult> Cancel(Guid accountId)
    {
        var account = await _salesDb.Tickets.FindAsync(accountId);
        if (account == null)
            return NotFound("Cuenta no encontrada");

        if (account.Estado == "PAGADO")
            return Conflict("No se puede cancelar una cuenta ya pagada");

        account.Estado = "CANCELADO";
        await _salesDb.SaveChangesAsync();

        return NoContent();
    }
}

public record CreateAccountRequest(
    Guid empresaId
);

public record AssignWaiterRequest(
    Guid waiterId
);

public record AddItemRequest(
    Guid productId,
    decimal quantity,
    string? notes = null
);

public record CreateCommandRequest(
    Guid estacionId
);

public record PayAccountRequest(
    Guid paymentMethodId
);
