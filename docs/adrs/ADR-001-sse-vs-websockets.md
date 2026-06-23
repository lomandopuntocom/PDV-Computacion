# ADR 001: Uso de Server-Sent Events (SSE) vs WebSockets para Notificaciones de Restock

## Estado
Aceptado

## Contexto y Problema
El sistema de gestión de inventario requiere notificar en tiempo real al frontend y al módulo de Ventas cuando se realiza un ingreso de mercadería (restock) desde el módulo de Compras. Se necesita una tecnología de comunicación push que minimice la latencia y evite el uso de consultas repetitivas (polling), las cuales sobrecargan la base de datos y la red.

## Opciones Evaluadas

### Opción 1: WebSockets
*   **Descripción:** Protocolo de comunicación bidireccional y de baja latencia sobre una única conexión TCP.
*   **Pros:** Comunicación dúplex completa, muy rápido, estándar en la industria para aplicaciones interactivas.
*   **Contras:** Requiere actualización de protocolo (protocol upgrade), configuración compleja de proxy inverso y balanceadores de carga, mayor consumo de recursos en el servidor al mantener conexiones persistentes bidireccionales complejas, y sobrediseño dado que el flujo de datos es estrictamente del servidor al cliente (unidireccional).

### Opción 2: Server-Sent Events (SSE)
*   **Descripción:** Estándar HTML5 de comunicación unidireccional (del servidor al cliente) sobre HTTP tradicional.
*   **Pros:** 
    *   Funciona sobre HTTP estándar (no requiere sockets dedicados ni puertos adicionales).
    *   Soporte nativo en navegadores mediante la API `EventSource` (reconexión automática incorporada y manejo de IDs de eventos).
    *   Implementación sencilla y ligera en .NET utilizando canales de memoria y el formato de respuesta `text/event-stream`.
    *   Excelente compatibilidad con firewalls y proxies empresariales.
*   **Contras:** Unidireccional (el cliente no puede enviar mensajes al servidor por la misma conexión).

## Decisión
Se decidió utilizar **Server-Sent Events (SSE)** para transmitir los eventos de restock.

## Razón de la Decisión
El flujo de datos para la notificación de restock es estrictamente unidireccional:
$$\text{Compras} \rightarrow \text{Inventario} \rightarrow \text{Ventas (SSE)} \rightarrow \text{Frontend (Toast Alert)}$$

SSE ofrece todas las características necesarias de tiempo real con una sobrecarga operativa mínima, reconexión automática de fábrica y aprovechamiento del protocolo HTTP/1.1 o HTTP/2 existente, evitando las complejidades de infraestructura que introduce un servidor WebSocket.

## Consecuencias
*   **Positivas:** Implementación muy simple y de bajo consumo en el frontend (`Layout.tsx`) y en el controlador de Inventario (`RestockEventsController.cs`). Se reduce la carga de red en comparación con polling continuo.
*   **Negativas:** Si en el futuro se requiriese que el frontend responda o envíe comandos en tiempo real por el mismo canal, se tendrá que abrir un endpoint REST tradicional o migrar a WebSockets.
