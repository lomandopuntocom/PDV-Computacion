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

        modelBuilder.Entity<Producto>()
            .HasIndex(p => new { p.EmpresaId, p.Nombre })
            .IsUnique();

        modelBuilder.Entity<Producto>()
            .Property(p => p.Precio)
            .HasPrecision(12, 2);

        modelBuilder.Entity<Producto>()
            .Property(p => p.StockMinimo)
            .HasPrecision(12, 2);
    }
}