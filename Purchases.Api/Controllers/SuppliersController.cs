using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Purchases.Api.Application.Dtos;
using Purchases.Api.Infrastructure.Persistence;

namespace Purchases.Api.Controllers;

[ApiController]
[Route("api/purchases/companies/{companyCen}/suppliers")]
public sealed class SuppliersController(PurchasesDbContext db) : PurchasesControllerBase(db)
{
    [HttpGet]
    public async Task<IActionResult> GetSuppliers(string companyCen)
    {
        if (!TryParseCen(companyCen, out var company)) return NotFound();

        var suppliers = await Db.Orders
            .Where(x => x.CompanyCen == company)
            .GroupBy(x => new { x.Supplier, x.SupplierCen })
            .Select(g => new SupplierDto((g.Key.SupplierCen ?? Guid.Empty).ToString(), g.Key.Supplier))
            .OrderBy(x => x.Name)
            .ToListAsync();

        return Ok(suppliers);
    }
}
