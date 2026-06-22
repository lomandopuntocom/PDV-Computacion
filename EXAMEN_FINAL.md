# Reporte Previo — Estructura del EXAMEN_FINAL.md

Este documento contiene la documentación técnica de integración de los tres módulos (**Ventas**, **Inventario** y **Compras**) del proyecto. Se detallan la configuración de despliegue, el mecanismo de notificaciones en tiempo real por Server-Sent Events (SSE), la resiliencia en llamadas HTTP con Polly y la inmutabilidad de precios en el historial y dashboard.

---

## Sección 1 — Despliegue en AWS

### 1.1 URLs en producción
*   **Módulo Ventas (Sales.Api):** `http://3.144.161.11:5074/`
*   **Módulo Ventas (Swagger):** `http://3.144.161.11:5074/swagger/index.html`
*   **Módulo Inventario (Inventory.Api):** `http://98.89.24.229:5143`
*   **Módulo Inventario (Swagger):** `http://98.89.24.229:5143/swagger/index.html`
*   **Módulo Compras (Purchases.Api):** `http://54.167.127.197:5085/`
*   **Módulo Compras (Swagger):** `http://54.167.127.197:5085/swagger#/`

### 1.2 Variables de entorno (.env.example)

A continuación se muestran los archivos de configuración base para cada uno de los microservicios sin valores sensibles:

#### Ventas (`Sales.Api/.env.example`)
```ini
DB_CONNECTION_STRING=Host=postgres-db;Database=sistemagestion;Username=admin;Password=secret_password

# INTEGRACIÓN DINÁMICA
# URL del servicio de Inventario al que se consultará el stock y catálogo
INVENTORY_API_URL=http://inventory-api:8080
```

#### Inventario (`Inventory.Api/.env.example`)
```ini
DB_CONNECTION_STRING=Host=postgres-db;Database=sistemagestion;Username=admin;Password=secret_password

# Modo y CORS
CORS_ORIGINS=http://localhost:5173;http://localhost:5174
```

#### Compras (`Purchases.Api/.env.example`)
```ini
DB_CONNECTION_STRING=Host=postgres-db;Database=sistemagestion;Username=admin;Password=secret_password

# INTEGRACIÓN DINÁMICA
# URL del servicio de Inventario al que se reportará el aumento de stock al recibir mercadería
INVENTORY_API_URL=http://inventory-api:8080
```

### 1.3 Cómo simular caída de Inventario

Para simular de manera controlada la caída del módulo de **Inventario** y poner a prueba las políticas de resiliencia (Polly) del módulo de **Ventas**, siga estas instrucciones exactas:

1.  Abra el archivo `.env` configurado en el directorio de ejecución de **Ventas** (`Sales.Api`).
2.  Busque la variable de entorno `INVENTORY_API_URL` y cambie su valor por una dirección URL inválida o a un puerto donde no haya servicios escuchando. Por ejemplo:
    ```ini
    INVENTORY_API_URL=http://url-invalida-simulada:9999
    ```
3.  Reinicie el servicio de **Ventas** (si usa Docker, ejecute `docker compose restart sales-api` o el comando correspondiente del proceso de dotnet).
4.  Realice una venta o consulte el catálogo en Ventas. Las llamadas fallarán, activando la política de reintentos y disyuntor (Polly).
5.  *Para restaurar el servicio:* Revierta el valor de `INVENTORY_API_URL` a su dirección original (ej. `http://inventory-api:8080`) y vuelva a reiniciar el servicio de Ventas.

---

## Sección 2 — Notificación de restock (SSE)

Mecanismo implementado para que, cuando se reciba mercadería en **Compras**, se actualice el stock en **Inventario** y este último notifique inmediatamente a **Ventas** mediante Server-Sent Events.

### 2.1 Endpoint SSE en Inventario
Ubicación del archivo: [RestockEventsController.cs](file:///c:/Users/Zerom/OneDrive/Documentos/GitHub/ISW-312-PROJ1/Inventory.Api/Controllers/RestockEventsController.cs)
Este endpoint establece una conexión HTTP persistente (`text/event-stream`) con el cliente y hace streaming de los eventos distribuidos por el multiplexor (`RestockEventBroadcaster`).

```csharp
using System;
using System.Text.Json;
using System.Threading.Channels;
using Inventory.Api.Domain.Entities;
using Inventory.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Api.Controllers;

[ApiController]
[Route("api/inventory/companies/{companyCen}/restock-events")]
public sealed class RestockEventsController(RestockEventBroadcaster broadcaster) : ControllerBase
{
    [HttpGet]
    public async Task Stream(string companyCen, CancellationToken ct)
    {
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        var clientChannel = Channel.CreateUnbounded<RestockEvent>();
        var subscriptionId = broadcaster.Subscribe(companyCen, clientChannel);

        try
        {
            while (!ct.IsCancellationRequested)
            {
                using var delayTokenSource = CancellationTokenSource.CreateLinkedTokenSource(ct);
                var delayTask = Task.Delay(15000, delayTokenSource.Token);
                var readTask = clientChannel.Reader.WaitToReadAsync(ct).AsTask();

                var completedTask = await Task.WhenAny(readTask, delayTask);
                if (completedTask == readTask)
                {
                    delayTokenSource.Cancel();
                    if (await readTask)
                    {
                        while (clientChannel.Reader.TryRead(out var evento))
                        {
                            var json = JsonSerializer.Serialize(evento, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                            await Response.WriteAsync($"data: {json}\n\n", ct);
                            await Response.Body.FlushAsync(ct);
                        }
                    }
                }
                else
                {
                    await Response.WriteAsync($": keep-alive\n\n", ct);
                    await Response.Body.FlushAsync(ct);
                }
            }
        }
        finally
        {
            broadcaster.Unsubscribe(subscriptionId);
        }
    }
}
```

### 2.2 Canal en memoria (registro en DI)
Ubicación del registro: [Program.cs](file:///c:/Users/Zerom/OneDrive/Documentos/GitHub/ISW-312-PROJ1/Inventory.Api/Program.cs#L35)
Ubicación de la clase: [RestockEventBroadcaster.cs](file:///c:/Users/Zerom/OneDrive/Documentos/GitHub/ISW-312-PROJ1/Inventory.Api/Infrastructure/RestockEventBroadcaster.cs)

El canal de comunicación en memoria para transmitir los eventos se implementa a través de un Broadcaster registrado como **Singleton** en el motor de DI. Este multiplexa y distribuye eventos dinámicamente entre todos los canales activos creados por cada cliente HTTP SSE conectado.

```csharp
// Registro como Singleton en Inventory.Api/Program.cs
builder.Services.AddSingleton<Inventory.Api.Infrastructure.RestockEventBroadcaster>();
```

#### Implementación del Broadcaster
```csharp
using System;
using System.Collections.Concurrent;
using System.Threading.Channels;
using Inventory.Api.Domain.Entities;

namespace Inventory.Api.Infrastructure;

public sealed class RestockEventBroadcaster
{
    private readonly ConcurrentDictionary<Guid, (string CompanyCen, Channel<RestockEvent> Channel)> _subscribers = new();

    public void Broadcast(RestockEvent @event)
    {
        foreach (var sub in _subscribers.Values)
        {
            if (string.Equals(sub.CompanyCen, @event.CompanyCen, StringComparison.OrdinalIgnoreCase))
            {
                sub.Channel.Writer.TryWrite(@event);
            }
        }
    }

    public Guid Subscribe(string companyCen, Channel<RestockEvent> channel)
    {
        var id = Guid.NewGuid();
        _subscribers.TryAdd(id, (companyCen, channel));
        return id;
    }

    public void Unsubscribe(Guid id)
    {
        _subscribers.TryRemove(id, out _);
    }
}
```

### 2.3 Consumidor en Ventas (frontend)
Ubicación del archivo: [Layout.tsx](file:///c:/Users/Zerom/OneDrive/Documentos/GitHub/ISW-312-PROJ1/frontend/src/components/Layout.tsx#L16-L52)
El frontend se conecta al endpoint SSE de Inventario usando la API nativa de JavaScript `EventSource`, y muestra notificaciones en pantalla en tiempo real cuando ingresa stock.

```javascript
  useEffect(() => {
    const companyCen = localStorage.getItem('companyCen') || empresa?.id;
    if (!companyCen) return;

    let inventoryUrl = import.meta.env.VITE_INVENTORY_API_URL || 'http://localhost:5143';
    if (inventoryUrl.endsWith('/')) {
      inventoryUrl = inventoryUrl.slice(0, -1);
    }
    const sseUrl = inventoryUrl.endsWith('/api/inventory')
      ? `${inventoryUrl}/companies/${companyCen}/restock-events`
      : `${inventoryUrl}/api/inventory/companies/${companyCen}/restock-events`;
      
    const source = new EventSource(sseUrl);
    
    source.onmessage = (event) => {
      try {
        const restock = JSON.parse(event.data);
        const id = Math.random().toString(36).substring(2, 9);
        const msg = `📦 Restock: Se agregaron ${restock.quantity} unidades de "${restock.productName}" (Código: ${restock.productCode}) en la bodega. Nuevo Stock: ${restock.newStock}.`;
        
        setAlerts(prev => [...prev, { id, message: msg }]);
        
        // Auto-remove after 6 seconds
        setTimeout(() => {
          setAlerts(prev => prev.filter(a => a.id !== id));
        }, 6000);
      } catch (err) {
        console.error("Error parsing restock event", err);
      }
    };

    source.onerror = (err) => {
      console.error("SSE connection error, retrying...", err);
    };

    return () => source.close();
  }, []);
```

### 2.4 Captura: notificación visible en Ventas
![Notificación de restock](https://placehold.co/600x400/0f172a/ffffff?text=Toast+Restock+Notificacion)

*(Tomar una captura de pantalla del frontend mostrando el toast flotante de color verde/azul en la esquina inferior o superior cuando se recibe un pedido de Compras e insertarla aquí)*

---

## Sección 3 — Resiliencia con Polly

Se configuran políticas de resiliencia en la comunicación de Ventas hacia Inventario, evitando caídas en cascada si el módulo de Inventario no se encuentra disponible.

### 3.1 Política implementada
Ubicación del archivo: [Program.cs](file:///c:/Users/Zerom/OneDrive/Documentos/GitHub/ISW-312-PROJ1/Sales.Api/Program.cs#L45-L58)
Se configuran dos políticas combinadas para resguardar el canal HTTP:
1.  **Retry Policy:** 3 reintentos automáticos con retraso exponencial progresivo (2, 4 y 8 segundos).
2.  **Circuit Breaker Policy:** Abre el circuito (detiene las llamadas inmediatas sin consumir red) durante 30 segundos si se detectan 5 fallos consecutivos en peticiones transient.

```csharp
var retryPolicy = HttpPolicyExtensions
    .HandleTransientHttpError()
    .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));

var circuitBreakerPolicy = HttpPolicyExtensions
    .HandleTransientHttpError()
    .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30));

builder.Services.AddHttpClient<IInventoryCatalogClient, InventoryCatalogClient>(client =>
{
    client.BaseAddress = new Uri(inventoryBaseUrl);
})
.AddPolicyHandler(retryPolicy)
.AddPolicyHandler(circuitBreakerPolicy);
```

### 3.2 Dónde se aplica
Ubicación del archivo: [TicketsController.cs](file:///c:/Users/Zerom/OneDrive/Documentos/GitHub/ISW-312-PROJ1/Sales.Api/Controllers/TicketsController.cs#L281-L307)
Las políticas se aplican transparentemente en todas las llamadas del cliente HTTP `IInventoryCatalogClient`. Por ejemplo, en el endpoint de pago de un ticket, se invoca a Inventario para confirmar la deducción física del stock consumido:

```csharp
[HttpPost("{ticketCen}/payment")]
public async Task<IActionResult> Pay(string companyCen, string ticketCen, PaymentRequest request, CancellationToken cancellationToken)
{
    var ticket = await FindTicketAsync(companyCen, ticketCen);
    if (ticket is null) return NotFound();
    if (ticket.Status != "OPEN") return Conflict("Ticket is not open.");

    foreach (var item in ticket.Items)
    {
        // Esta llamada hace uso del cliente HTTP protegido por las políticas de Polly
        var consumed = await inventoryClient.ConsumeStockAsync(companyCen, item.ProductCen.ToString(), item.Quantity, cancellationToken);
        if (!consumed) return Conflict($"Insufficient stock or inventory error for product {item.ProductCen}.");
    }

    Db.Payments.Add(new Payment
    {
        TicketId = ticket.Id,
        TicketCen = ticket.Cen,
        PaymentMethod = request.PaymentMethod,
        Amount = request.Amount,
        Reference = request.Reference,
        PaidBy = request.PaidBy
    });

    ticket.Status = "PAID";
    await Db.SaveChangesAsync();
    return Ok(new { ticketCen = ticket.Cen, ticket.Status });
}
```

### 3.3 Respuesta cuando Inventario no responde
Ubicación de captura de excepciones: [GlobalExceptionHandler.cs](file:///c:/Users/Zerom/OneDrive/Documentos/GitHub/ISW-312-PROJ1/Sales.Api/Infrastructure/GlobalExceptionHandler.cs#L51-L56)
Si el disyuntor está abierto (`BrokenCircuitException`) o la petición falla permanentemente después de los reintentos (`HttpRequestException`), el manejador global intercepta el error y devuelve una respuesta estructurada bajo el estándar RFC 7807 (`ProblemDetails` con código HTTP **503 Service Unavailable**):

```json
{
  "status": 503,
  "title": "Servicio no disponible",
  "detail": "El servicio de inventario no esta disponible temporalmente. Intente nuevamente en unos momentos.",
  "instance": "/api/sales/companies/EMP-00001/tickets/TIC-00001/payment",
  "traceId": "0HN0L5M8ABR1N:00000003"
}
```

### 3.4 Captura: comportamiento con Inventario caído
![Comportamiento con Inventario caído](https://placehold.co/600x400/0f172a/ffffff?text=Error+503+Polly+Circuit+Breaker)

*(Tomar una captura del inspector de red o consola mostrando el error HTTP 503 Service Unavailable retornado por el endpoint de Ventas cuando Inventario está apagado o simulando caída)*

---

## Sección 4 — Historial y dashboard

Demuestra la inmutabilidad de los precios en las ventas concretadas para evitar distorsiones históricas cuando los productos modifican su costo en el catálogo.

### 4.1 Modelo de la tabla de ventas
Ubicación del archivo de entidad: [TicketItem.cs](file:///c:/Users/Zerom/OneDrive/Documentos/GitHub/ISW-312-PROJ1/Sales.Api/Domain/Entities/TicketItem.cs#L12)
Ubicación del script de migración SQL: [20260518023627_InitialCreate.cs](file:///c:/Users/Zerom/OneDrive/Documentos/GitHub/ISW-312-PROJ1/Sales.Api/Infrastructure/Persistence/Migrations/20260518023627_InitialCreate.cs#L231)

La clase `TicketItem` congela el precio mediante la propiedad `UnitPrice` y la guarda físicamente como una columna de tipo numérico con precisión en la base de datos SQL.

#### Entidad C#
```csharp
namespace Sales.Api.Domain.Entities;

public sealed class TicketItem
{
    public int Id { get; set; }
    public Guid Cen { get; set; } = Guid.NewGuid();
    public int TicketId { get; set; }
    public Guid TicketCen { get; set; }
    public int ProductId { get; set; }
    public Guid ProductCen { get; set; }
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; } // <--- PRECIO CONGELADO AL MOMENTO DE LA TRANSACCIÓN
    public string Status { get; set; } = "PENDING";
    public string? Notes { get; set; }
}
```

#### Migración SQL (Entity Framework Core)
```csharp
migrationBuilder.CreateTable(
    name: "TicketItem",
    schema: "sales",
    columns: table => new
    {
        Id = table.Column<int>(type: "integer", nullable: false)
            .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
        Cen = table.Column<Guid>(type: "uuid", nullable: false),
        TicketId = table.Column<int>(type: "integer", nullable: false),
        TicketCen = table.Column<Guid>(type: "uuid", nullable: false),
        ProductId = table.Column<int>(type: "integer", nullable: false),
        ProductCen = table.Column<Guid>(type: "uuid", nullable: false),
        Quantity = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
        UnitPrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false), // <--- Columna en SQL
        Status = table.Column<string>(type: "text", nullable: false),
        Notes = table.Column<string>(type: "text", nullable: true)
    },
    constraints: table =>
    {
        table.PrimaryKey("PK_TicketItem", x => x.Id);
        // ... FKs
    });
```

### 4.2 Cómo se guarda el precio en la transacción
Ubicación del archivo: [TicketsController.cs](file:///c:/Users/Zerom/OneDrive/Documentos/GitHub/ISW-312-PROJ1/Sales.Api/Controllers/TicketsController.cs#L106-L115)
Al agregar un producto al ticket, el backend captura el precio actual provisto por el catálogo (frontend) y lo asigna estáticamente a la propiedad `UnitPrice` del item, persistiendo este valor snapshot al guardar los cambios:

```csharp
var item = new TicketItem
{
    TicketId = ticket.Id,
    TicketCen = ticket.Cen,
    ProductCen = productCen,
    Quantity = quantity,
    UnitPrice = request.UnitPrice, // <--- Se asigna el valor snapshot recibido del momento
    Notes = request.Notes,
    Status = "PENDING"
};

Db.TicketItems.Add(item);
await Db.SaveChangesAsync(); // Se guarda de forma definitiva e inmutable
```

### 4.3 Query del dashboard mensual
Ubicación del archivo: [DashboardController.cs](file:///c:/Users/Zerom/OneDrive/Documentos/GitHub/ISW-312-PROJ1/Sales.Api/Controllers/DashboardController.cs#L24-L50)
El cálculo de ventas mensuales compara la suma acumulada de los pagos correspondientes al mes actual con la del mes anterior, consultando la fecha y monto inmutables.

```csharp
[HttpGet("monthly")]
public async Task<IActionResult> MonthlySales(string companyCen)
{
    var company = await FindOrCreateCompanyAsync(companyCen);
    if (company is null) return NotFound();

    var now = DateTime.UtcNow;
    var startOfCurrentMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
    var endOfCurrentMonth = startOfCurrentMonth.AddMonths(1).AddTicks(-1);

    var startOfPreviousMonth = startOfCurrentMonth.AddMonths(-1);
    var endOfPreviousMonth = startOfCurrentMonth.AddTicks(-1);

    // Suma de transacciones del mes actual
    var currentMonthTotal = await Db.Payments
        .Where(x => Db.Tickets.Any(t => t.Id == x.TicketId && t.CompanyCen == company.Cen) && x.CreatedAt >= startOfCurrentMonth && x.CreatedAt <= endOfCurrentMonth)
        .SumAsync(x => (decimal?)x.Amount) ?? 0;

    // Suma de transacciones del mes anterior
    var previousMonthTotal = await Db.Payments
        .Where(x => Db.Tickets.Any(t => t.Id == x.TicketId && t.CompanyCen == company.Cen) && x.CreatedAt >= startOfPreviousMonth && x.CreatedAt <= endOfPreviousMonth)
        .SumAsync(x => (decimal?)x.Amount) ?? 0;

    return Ok(new
    {
        currentMonthSales = currentMonthTotal,
        previousMonthSales = previousMonthTotal
    });
}
```

### 4.4 Captura: dashboard mes actual vs. mes anterior
![Dashboard comparativo mensual](https://placehold.co/600x400/0f172a/ffffff?text=Dashboard+Comparativo+Mensual)

*(Tomar una captura de pantalla de la interfaz de usuario que renderiza la comparación de ventas acumuladas del mes en curso versus el anterior)*

---

## Sección 5 — Swagger y Contrato API

El contrato API global de integración unifica todos los endpoints consumidos cruzadamente y los exprime a través del Swagger UI de cada módulo.

URLs públicas de Swagger de cada módulo:

| Módulo | URL Swagger |
|---|---|
| **Ventas (Mi módulo)** | `https://sales.tuservidor.com/swagger` |
| **Inventario (Compañero 1)** | `https://inventory.tuservidor.com/swagger` |
| **Compras (Compañero 2)** | `https://purchases.tuservidor.com/swagger` |
