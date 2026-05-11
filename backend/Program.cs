using Backend.Api.Modules.Shared.Data;
using Backend.Api.Modules.Shared.Services;
using Backend.Api.Modules.Inventory.Data;
using Backend.Api.Modules.Sales.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var conn = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddControllers();
builder.Services.AddDbContext<SharedDbContext>(o => o.UseNpgsql(conn));
builder.Services.AddDbContext<InventoryDbContext>(o => o.UseNpgsql(conn));
builder.Services.AddDbContext<SalesDbContext>(o => o.UseNpgsql(conn));

// Register CEN Code Generator service
builder.Services.AddScoped<ICenCodeGenerator, CenCodeGenerator>();

builder.Services.AddCors(options =>
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()));

var app = builder.Build();

// Apply migrations
using (var scope = app.Services.CreateScope())
{
    var sharedContext = scope.ServiceProvider.GetRequiredService<SharedDbContext>();
    var inventoryContext = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
    var salesContext = scope.ServiceProvider.GetRequiredService<SalesDbContext>();

    await sharedContext.Database.MigrateAsync();
    await inventoryContext.Database.MigrateAsync();
    await salesContext.Database.MigrateAsync();
}

app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();
app.Run();