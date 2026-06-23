using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sales.Api.Application.Abstractions;
using Sales.Api.Application.Dtos;
using Sales.Api.Controllers;
using Sales.Api.Domain.Entities;
using Sales.Api.Infrastructure.Persistence;
using Xunit;

namespace Sales.Api.Tests;

public class TicketsControllerTests
{
    private readonly DbContextOptions<SalesDbContext> _dbContextOptions;

    public TicketsControllerTests()
    {
        // Configurar base de datos en memoria para pruebas aisladas de EF Core
        _dbContextOptions = new DbContextOptionsBuilder<SalesDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
    }

    private SalesDbContext CreateDbContext() => new(_dbContextOptions);

    [Fact]
    public async Task CreateTicket_ShouldCreateTicketInDb_WhenRequestIsValid()
    {
        // Arrange
        using var db = CreateDbContext();
        var companyCen = Guid.NewGuid().ToString();
        var client = new FakeInventoryCatalogClient();
        var controller = new TicketsController(db, client);
        var request = new CreateTicketRequest(LocationCen: null, TableCode: "Mesa 5");

        // Act
        var result = await controller.CreateTicket(companyCen, request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var ticketDto = Assert.IsType<TicketDto>(okResult.Value);
        Assert.Equal("OPEN", ticketDto.Status);
        Assert.Equal("Mesa 5", ticketDto.TableCode);

        // Validar persistencia en base de datos
        var ticketInDb = await db.Tickets.FirstOrDefaultAsync(t => t.Cen == Guid.Parse(ticketDto.Cen));
        Assert.NotNull(ticketInDb);
        Assert.Equal("OPEN", ticketInDb.Status);
        Assert.Equal("Mesa 5", ticketInDb.TableCode);
    }

    [Fact]
    public async Task AddItem_ShouldAddTicketItemToOpenTicket_AndFreezeUnitPrice()
    {
        // Arrange
        using var db = CreateDbContext();
        var companyCen = Guid.NewGuid().ToString();
        var productCen = Guid.NewGuid().ToString();
        
        // Configurar empresa, ubicación y un ticket abierto
        var company = new SalesCompany { Cen = Guid.Parse(companyCen), Name = "Empresa Test" };
        var location = new SalesLocation { Cen = Guid.NewGuid(), CompanyCen = Guid.Parse(companyCen), Name = "Principal" };
        var ticket = new Ticket
        {
            Cen = Guid.NewGuid(),
            CompanyId = company.Id,
            CompanyCen = Guid.Parse(companyCen),
            LocationId = location.Id,
            LocationCen = location.Cen,
            TicketNumber = "TIC-00001",
            Status = "OPEN"
        };
        db.Companies.Add(company);
        db.Locations.Add(location);
        db.Tickets.Add(ticket);
        await db.SaveChangesAsync();

        // Configurar cliente de inventario simulado
        var client = new FakeInventoryCatalogClient();
        client.ProductsLookup.Add(new CatalogProductDto(
            Cen: productCen,
            Code: "PRO-00001",
            Sku: "SKU-001",
            Name: "Café Latte",
            Price: 4.50m, // Precio sugerido actual del catálogo
            Active: true,
            IsOutOfStock: false,
            StationCode: null,
            TrackStock: false
        ));

        var controller = new TicketsController(db, client);
        var request = new AddTicketItemRequest(
            ProductCen: productCen,
            Quantity: 2,
            UnitPrice: 4.00m, // El usuario congela un precio específico en la transacción
            Notes: "Sin azúcar"
        );

        // Act
        var result = await controller.AddItem(companyCen, ticket.Cen.ToString(), request, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var itemDto = Assert.IsType<TicketItemDto>(okResult.Value);
        Assert.Equal(productCen, itemDto.ProductCen);
        Assert.Equal(2, itemDto.Quantity);
        Assert.Equal(4.00m, itemDto.UnitPrice); // El precio congelado es el que se guarda

        // Validar persistencia en base de datos
        var itemInDb = await db.TicketItems.FirstOrDefaultAsync(i => i.Cen == Guid.Parse(itemDto.Cen));
        Assert.NotNull(itemInDb);
        Assert.Equal(4.00m, itemInDb.UnitPrice);
        Assert.Equal(2, itemInDb.Quantity);
        Assert.Equal("PENDING", itemInDb.Status);
    }

    [Fact]
    public async Task Pay_ShouldUpdateStatusToPaid_AndAddPaymentRecord_WhenRequestIsValid()
    {
        // Arrange
        using var db = CreateDbContext();
        var companyCen = Guid.NewGuid().ToString();
        var productCen = Guid.NewGuid();

        // Configurar datos semilla
        var company = new SalesCompany { Cen = Guid.Parse(companyCen), Name = "Empresa Test" };
        var location = new SalesLocation { Cen = Guid.NewGuid(), CompanyCen = Guid.Parse(companyCen), Name = "Principal" };
        var ticket = new Ticket
        {
            Cen = Guid.NewGuid(),
            CompanyId = company.Id,
            CompanyCen = Guid.Parse(companyCen),
            LocationId = location.Id,
            LocationCen = location.Cen,
            TicketNumber = "TIC-00002",
            Status = "OPEN"
        };
        db.Companies.Add(company);
        db.Locations.Add(location);
        db.Tickets.Add(ticket);
        await db.SaveChangesAsync();

        // Agregar un item al ticket
        var item = new TicketItem
        {
            Cen = Guid.NewGuid(),
            TicketId = ticket.Id,
            TicketCen = ticket.Cen,
            ProductCen = productCen,
            Quantity = 1,
            UnitPrice = 5.00m,
            Status = "PENDING"
        };
        db.TicketItems.Add(item);
        await db.SaveChangesAsync();

        var client = new FakeInventoryCatalogClient();
        var controller = new TicketsController(db, client);
        var request = new PaymentRequest(PaymentMethod: "CASH", Amount: 5.00m, Reference: "Ref-123", PaidBy: "Cliente Juan");

        // Act
        var result = await controller.Pay(companyCen, ticket.Cen.ToString(), request, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        
        // Verificar que el ticket cambió de estado en la BD
        var ticketInDb = await db.Tickets.FirstOrDefaultAsync(t => t.Id == ticket.Id);
        Assert.NotNull(ticketInDb);
        Assert.Equal("PAID", ticketInDb.Status);

        // Verificar el registro del pago
        var paymentInDb = await db.Payments.FirstOrDefaultAsync(p => p.TicketId == ticket.Id);
        Assert.NotNull(paymentInDb);
        Assert.Equal("CASH", paymentInDb.PaymentMethod);
        Assert.Equal(5.00m, paymentInDb.Amount);
        Assert.Equal("Ref-123", paymentInDb.Reference);
        Assert.Equal("Cliente Juan", paymentInDb.PaidBy);
    }
}

// Cliente de catálogo simulado para inyección en controladores
public class FakeInventoryCatalogClient : IInventoryCatalogClient
{
    public List<CatalogProductDto> ProductsLookup { get; } = new();
    public bool ValidateStockResult { get; set; } = true;
    public bool ConsumeStockResult { get; set; } = true;

    public Task<PagedResultDto<CatalogProductDto>?> GetSellableProductsAsync(
        string companyCen, string? search, string? categoryCen, string? warehouseCen, 
        bool onlyAvailable, int page, int pageSize, CancellationToken cancellationToken)
    {
        var paged = new PagedResultDto<CatalogProductDto>(ProductsLookup, ProductsLookup.Count, page, pageSize);
        return Task.FromResult<PagedResultDto<CatalogProductDto>?>(paged);
    }

    public Task<IReadOnlyList<CatalogProductDto>> LookupProductsAsync(
        string companyCen, IReadOnlyList<string> productCens, CancellationToken cancellationToken)
    {
        IReadOnlyList<CatalogProductDto> result = ProductsLookup
            .Where(x => productCens.Contains(x.Cen))
            .ToList();
        return Task.FromResult(result);
    }

    public Task<bool> ConsumeStockAsync(string companyCen, string productCen, decimal quantity, CancellationToken cancellationToken)
    {
        return Task.FromResult(ConsumeStockResult);
    }

    public Task<bool> ValidateStockAsync(string companyCen, string productCen, decimal quantity, CancellationToken cancellationToken)
    {
        return Task.FromResult(ValidateStockResult);
    }
}
