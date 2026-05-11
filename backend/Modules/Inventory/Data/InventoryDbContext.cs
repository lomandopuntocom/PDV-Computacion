using Backend.Api.Modules.Inventory.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Modules.Inventory.Data;

public class InventoryDbContext : DbContext
{
    public InventoryDbContext(DbContextOptions<InventoryDbContext> options) : base(options) { }

    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Unidad> Unidades => Set<Unidad>();
    public DbSet<Producto> Productos => Set<Producto>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("inventory");

        modelBuilder.Entity<Categoria>().ToTable("categorias");
        modelBuilder.Entity<Unidad>().ToTable("unidades");
        modelBuilder.Entity<Producto>().ToTable("productos");

        // Unique constraints for CenCode
        modelBuilder.Entity<Categoria>()
            .HasIndex(c => new { c.EmpresaId, c.CenCode })
            .IsUnique();

        modelBuilder.Entity<Unidad>()
            .HasIndex(u => new { u.EmpresaId, u.CenCode })
            .IsUnique();

        modelBuilder.Entity<Producto>()
            .HasIndex(p => new { p.EmpresaId, p.Nombre })
            .IsUnique();

        modelBuilder.Entity<Producto>()
            .HasIndex(p => new { p.EmpresaId, p.CenCode })
            .IsUnique();

        modelBuilder.Entity<Producto>()
            .Property(p => p.Precio)
            .HasPrecision(12, 2);

        modelBuilder.Entity<Producto>()
            .Property(p => p.StockMinimo)
            .HasPrecision(12, 2);
    }
}