using Microsoft.AspNetCore.Mvc;
using Purchases.Api.Infrastructure.Persistence;

namespace Purchases.Api.Controllers;

public abstract class PurchasesControllerBase(PurchasesDbContext db) : ControllerBase
{
    protected PurchasesDbContext Db { get; } = db;
    protected static bool TryParseCen(string value, out Guid cen) => Guid.TryParse(value, out cen);
}
