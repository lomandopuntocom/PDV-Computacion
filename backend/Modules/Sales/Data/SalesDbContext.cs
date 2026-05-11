using Backend.Api.Modules.Sales.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Modules.Sales.Data;

public class SalesDbContext : DbContext
{
    public SalesDbContext(DbContextOptions<SalesDbContext> options) : base(options) { }

    public DbSet<Estacion> Estaciones => Set<Estacion>();
    public DbSet<Configuracion> Configuraciones => Set<Configuracion>();
    public DbSet<Stock> Stocks => Set<Stock>();
    public DbSet<AjusteStock> AjustesStock => Set<AjusteStock>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<TicketItem> TicketItems => Set<TicketItem>();
    public DbSet<Comanda> Comandas => Set<Comanda>();
    public DbSet<ComandaItem> ComandaItems => Set<ComandaItem>();
    public DbSet<Pago> Pagos => Set<Pago>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("sales");

        modelBuilder.Entity<Estacion>().ToTable("estaciones");
        modelBuilder.Entity<Configuracion>().ToTable("configuracion");
        modelBuilder.Entity<Stock>().ToTable("stock");
        modelBuilder.Entity<AjusteStock>().ToTable("ajustes_stock");
        modelBuilder.Entity<Ticket>().ToTable("tickets");
        modelBuilder.Entity<TicketItem>().ToTable("ticket_items");
        modelBuilder.Entity<Comanda>().ToTable("comandas");
        modelBuilder.Entity<ComandaItem>().ToTable("comanda_items");
        modelBuilder.Entity<Pago>().ToTable("pagos");

        modelBuilder.Entity<Stock>()
            .HasIndex(s => s.ProductoId)
            .IsUnique();

        modelBuilder.Entity<Configuracion>()
            .HasIndex(c => c.EmpresaId)
            .IsUnique();

        modelBuilder.Entity<Estacion>()
            .HasIndex(e => new { e.EmpresaId, e.CenCode })
            .IsUnique();

        modelBuilder.Entity<Ticket>()
            .HasIndex(t => new { t.EmpresaId, t.Numero })
            .IsUnique();

        modelBuilder.Entity<Ticket>()
            .HasIndex(t => new { t.EmpresaId, t.CenCode })
            .IsUnique();

        modelBuilder.Entity<Comanda>()
            .HasIndex(c => new { c.EstacionId, c.CenCode })
            .IsUnique();

        modelBuilder.Entity<Pago>()
            .HasIndex(p => p.TicketId)
            .IsUnique();

        modelBuilder.Entity<Configuracion>()
            .Property(c => c.TasaImpuesto)
            .HasPrecision(5, 2);

        modelBuilder.Entity<Stock>()
            .Property(s => s.Cantidad)
            .HasPrecision(12, 2);

        modelBuilder.Entity<TicketItem>()
            .Property(t => t.PrecioUnitario)
            .HasPrecision(12, 2);

        modelBuilder.Entity<TicketItem>()
            .Property(t => t.Cantidad)
            .HasPrecision(12, 2);

        modelBuilder.Entity<Pago>()
            .Property(p => p.Total)
            .HasPrecision(12, 2);
    }
}