using Inventory.Api.Domain.Entities;
using Inventory.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Api.Controllers;

public abstract class InventoryControllerBase(InventoryDbContext db) : ControllerBase
{
    protected InventoryDbContext Db { get; } = db;

    protected static bool TryParseCen(string value, out Guid cen) => Guid.TryParse(value, out cen);

    protected async Task<Company?> FindCompanyAsync(string companyCen)
    {
        return TryParseCen(companyCen, out var cen)
            ? await Db.Companies.FirstOrDefaultAsync(x => x.Cen == cen && x.Active)
            : null;
    }
}
