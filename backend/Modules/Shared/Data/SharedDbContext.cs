using Backend.Api.Modules.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Modules.Shared.Data;

public class SharedDbContext : DbContext
{
    public SharedDbContext(DbContextOptions<SharedDbContext> options) : base(options) { }

    public DbSet<Empresa> Empresas => Set<Empresa>();
    public DbSet<CenCounter> CenCounters => Set<CenCounter>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("shared");
        modelBuilder.Entity<Empresa>().ToTable("empresas");
        modelBuilder.Entity<CenCounter>().ToTable("cen_counters");

        // Unique constraint on Empresa CenCode
        modelBuilder.Entity<Empresa>()
            .HasIndex(e => e.CenCode)
            .IsUnique();

        // Unique constraint on CenCounter for EmpresaId + Prefix combination
        modelBuilder.Entity<CenCounter>()
            .HasIndex(c => new { c.EmpresaId, c.Prefix })
            .IsUnique();
    }
}