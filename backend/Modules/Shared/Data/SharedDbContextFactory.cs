using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Backend.Api.Modules.Shared.Data;

public class SharedDbContextFactory : IDesignTimeDbContextFactory<SharedDbContext>
{
    public SharedDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<SharedDbContext>()
            .UseNpgsql("Host=localhost;Port=5432;Database=ISW-312-PROJ1;Username=postgres;Password=Teto123..")
            .Options;
        return new SharedDbContext(options);
    }
}