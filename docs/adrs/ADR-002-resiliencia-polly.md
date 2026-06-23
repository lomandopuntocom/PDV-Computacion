# ADR 002: Implementación de Resiliencia con Polly para la Comunicación Inter-módulos

## Estado
Aceptado

## Contexto y Problema
El módulo de Ventas (`Sales.Api`) depende directamente de la disponibilidad del módulo de Inventario (`Inventory.Api`) para listar el catálogo de productos y validar/descontar stock al momento del pago de un ticket. Si el servicio de Inventario falla, se produce una caída en cascada, haciendo que el proceso de pago falle con errores genéricos de red (HTTP 500) y afectando negativamente la experiencia del usuario.

## Opciones Evaluadas

### Opción 1: Llamadas directas sin resiliencia
*   **Descripción:** Peticiones HTTP directas utilizando `HttpClient`.
*   **Pros:** Ninguna complejidad de desarrollo.
*   **Contras:** Ante fallas de red o caídas del servidor de Inventario, la petición fallará inmediatamente. No se aprovechan errores transitorios que se resolverían en milisegundos.

### Opción 2: Políticas de Resiliencia Combinadas (Polly)
*   **Descripción:** Configuración en la inyección de dependencias de `HttpClient` de políticas encadenadas de reintento (*Retry*) y disyuntor (*Circuit Breaker*).
*   **Políticas propuestas:**
    1.  **Retry Policy (Reintentos):** 3 reintentos automáticos ante errores transitorios (ej. códigos HTTP 5xx o timeout) con retardo exponencial progresivo de $2^{\text{intento}}$ segundos (2s, 4s, 8s).
    2.  **Circuit Breaker Policy (Disyuntor):** Abre el circuito durante 30 segundos si se registran 5 fallos consecutivos en peticiones HTTP.
*   **Pros:**
    *   Manejo transparente de fallas transitorias sin intervención del usuario.
    *   Protección del sistema ante fallas persistentes, evitando saturar de llamadas red a un servicio caído.
    *   Fácil integración a través del middleware de ASP.NET Core (`Microsoft.Extensions.Http.Polly`).
*   **Contras:** Introduce complejidad adicional en las pruebas y el manejo de excepciones específicas (`BrokenCircuitException`).

## Decisión
Se decidió implementar la **Opción 2** utilizando la biblioteca Polly para proteger la conexión de `IInventoryCatalogClient` hacia `Inventory.Api`.

## Razón de la Decisión
La integración de las políticas de Polly proporciona un mecanismo robusto de tolerancia a fallos. La combinación de *Retry* y *Circuit Breaker* asegura que:
1.  Si el error de Inventario es corto (ej. reinicio rápido de contenedor), el sistema se recupera de inmediato.
2.  Si el servicio de Inventario está caído definitivamente, el circuito se abre rápido (al quinto intento fallido), retornando instantáneamente una respuesta estructurada **HTTP 503 Service Unavailable** (siguiendo el estándar RFC 7807 de `ProblemDetails`), liberando recursos de red y evitando tiempos de espera indefinidos en el cliente.

## Consecuencias
*   **Positivas:** Mayor robustez y tolerancia a fallos del sistema distribuido.
*   **Negativas:** El frontend debe manejar explícitamente el código HTTP 503 para advertir al cajero que el sistema de inventario está en mantenimiento temporalmente.
