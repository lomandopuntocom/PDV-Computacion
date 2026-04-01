using Backend.Api.Modules.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Modules.Shared.Data;

public class SharedDbContext : DbContext
{
    public SharedDbContext(DbContextOptions<SharedDbContext> options) : base(options) { }

    public DbSet<Empresa> Empresas => Set<Empresa>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("shared");
        modelBuilder.Entity<Empresa>().ToTable("empresas");
    }
}