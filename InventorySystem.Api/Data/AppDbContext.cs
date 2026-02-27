using InventorySystem.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace InventorySystem.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Empresa> Empresas => Set<Empresa>();
    public DbSet<Producto> Productos => Set<Producto>();
    public DbSet<Almacen> Almacenes => Set<Almacen>();
    public DbSet<Stock> Stocks => Set<Stock>();
    public DbSet<Movimiento> Movimientos => Set<Movimiento>();
    public DbSet<Documento> Documentos => Set<Documento>();
    public DbSet<DocumentoItem> DocumentoItems => Set<DocumentoItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Índices únicos
        modelBuilder.Entity<Producto>()
            .HasIndex(p => new { p.EmpresaId, p.Codigo })
            .IsUnique();

        modelBuilder.Entity<Stock>()
            .HasIndex(s => new { s.ProductoId, s.AlmacenId })
            .IsUnique();

        // Tablas en snake_case (convención PostgreSQL)
        modelBuilder.Entity<Empresa>().ToTable("empresas");
        modelBuilder.Entity<Producto>().ToTable("productos");
        modelBuilder.Entity<Almacen>().ToTable("almacenes");
        modelBuilder.Entity<Stock>().ToTable("stock");
        modelBuilder.Entity<Movimiento>().ToTable("movimientos");
        modelBuilder.Entity<Documento>().ToTable("documentos");
        modelBuilder.Entity<DocumentoItem>().ToTable("documento_items");
    }
}