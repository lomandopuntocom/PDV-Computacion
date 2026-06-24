# Guía Completa de Estudio para la Defensa Oral: Arquitectura, Decisiones y Pilares Cloud

Este documento sirve como material de estudio exhaustivo y detallado para la defensa individual del proyecto de la materia. Está diseñado con explicaciones teóricas y justificaciones prácticas claras para facilitar su lectura y asimilación en plataformas de estudio inteligente como NotebookLM (generación de audios, podcasts y resúmenes).

---

## 1. Visión General del Sistema y Principio de Desacoplamiento

### ¿Qué es el proyecto?
El proyecto es un **sistema distribuido empresarial** compuesto por tres microservicios en el backend y una interfaz de usuario interactiva:
1.  **Ventas (Sales.Api):** Gestiona los pedidos, tickets, KDS (sistemas de cocina) y facturación.
2.  **Inventario (Inventory.Api):** Controla el catálogo de productos, categorías, almacenes y existencias físicas.
3.  **Compras (Purchases.Api):** Administra las órdenes de adquisición y reabastecimiento con proveedores.
4.  **Frontend (React + Vite):** El panel visual de control para el usuario final (punto de venta).

```
┌────────────────────────────────────────────────────────┐
│                   FRONTEND (React)                     │
└──────────────────────────┬─────────────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    ▼                      ▼                      ▼
┌───────────┐          ┌───────────┐          ┌───────────┐
│ Sales.Api │ ◄──────► │ Inventory │ ◄──────── │ Purchases │
└───────────┘  REST/   └───────────┘  REST    └───────────┘
               Polly
```

### Principio Fundamental: Desacoplamiento mediante Contratos API
El acoplamiento fuerte es uno de los mayores problemas en sistemas distribuidos. Si el Frontend sabe cómo está implementado el backend (nombres de tablas, lógica interna de base de datos) o si los microservicios dependen directamente de los esquemas de otros, el sistema se vuelve frágil y costoso de mantener.

*   **¿Cómo se soluciona aquí?** Se diseñan **Contratos API** claros (`contrato-api.yaml`). El Frontend y los otros microservicios interactúan a través de formatos de datos estrictos (DTOs) y endpoints estandarizados.
*   **Código Estándar de Negocio (CEN):** En lugar de enlazar entidades usando identificadores únicos de base de datos (`GUID` o `IDs` autoincrementales numéricos), que pueden cambiar en migraciones de datos, se usa un identificador lógico de negocio único llamado **CEN** (por ejemplo, `EMP-00001` para empresas, `PRO-00023` para productos, `TIC-00104` para tickets). Esto permite que el módulo de Ventas pueda hacer referencia a un producto de Inventario sin necesidad de estar acoplado a la llave primaria interna de su base de datos.

---

## 2. Capa Funcional Obligatoria (Parte I)

### 2.1 Notificaciones de Restock en Tiempo Real mediante Server-Sent Events (SSE)

#### El problema
Cuando el módulo de **Compras** recibe un pedido de mercadería, este notifica a **Inventario** para incrementar el stock. Inmediatamente, la interfaz del cajero en **Ventas** debe enterarse de que hay nuevo stock disponible para la venta.
*   *¿Cómo se hacía antes?* Mediante **Short Polling** (el frontend le pregunta al servidor cada 5 segundos si hay novedades). Esto destruye el rendimiento del servidor y satura la base de datos de consultas vacías.

#### La solución arquitectónica: Server-Sent Events (SSE)
SSE es una tecnología que permite al servidor enviar flujos de datos unidireccionales (*server-to-client push*) en tiempo real al navegador a través de una conexión HTTP persistente estándar bajo el formato `text/event-stream`.

```
[Compras] ───REST (Incrementa Stock)───► [Inventario]
                                              │
                                       Broadcaster (InMemory Channel)
                                              │
                                        SSE connection
                                              ▼
[Browser (Ventas)] ◄──────────────────────────┘
```

#### ¿Por qué SSE y no WebSockets?
Esta es una pregunta clave de defensa:
1.  **Unidireccionalidad:** El flujo del evento de restock es puramente del servidor al cliente. WebSockets proporciona comunicación bidireccional, lo cual es innecesario y añade complejidad.
2.  **Infraestructura Ligera:** WebSockets requiere un protocolo de enlace diferente (`ws://`) y a menudo falla detrás de firewalls y proxies corporativos. SSE corre sobre HTTP tradicional (puerto 80/443), por lo que atraviesa proxies sin configuración adicional.
3.  **Resiliencia nativa:** La API nativa del navegador `EventSource` tiene reconexión automática incorporada de fábrica si la red se corta temporalmente.

#### Funcionamiento en el código:
*   En `Inventory.Api`, se implementa un servicio llamado `RestockEventBroadcaster` registrado como **Singleton** en el motor de Inyección de Dependencias.
*   Este servicio utiliza canales en memoria de alto rendimiento (`System.Threading.Channels.Channel<RestockEvent>`) para recibir y multiplexar de forma concurrente los eventos de restock hacia todos los clientes HTTP conectados.
*   En el Frontend (`Layout.tsx`), se abre un listener `EventSource` que reacciona mostrando un toast visual alertando al cajero que la mercadería ha ingresado.

---

### 2.2 Resiliencia y Tolerancia a Fallos con Polly

#### El problema
En una arquitectura de microservicios, la red es intrínsecamente inestable. Si el servicio de Inventario sufre una caída por mantenimiento o saturación y el servicio de Ventas intenta llamarlo para validar stock al momento de pagar una cuenta, Ventas colapsará en cascada, arrojando errores 500 y bloqueando la caja.

#### La solución: Retry + Circuit Breaker (Polly)
Se implementa una estrategia combinada de resiliencia en el cliente HTTP de integración utilizando la biblioteca **Polly**:

```
                  ┌──────────────────────┐
                  │   Petición HTTP      │
                  └──────────┬───────────┘
                             │
                             ▼
               ┌───────────────────────────┐
               │    Circuit Breaker        │
               │ (¿Circuito Abierto? 503)  │
               └─────────────┬─────────────┘
                             │ Cerrado
                             ▼
               ┌───────────────────────────┐
               │       Retry Policy        │
               │  (3 Reintentos Exponenc.) │
               └─────────────┬─────────────┘
                             │
                             ▼
                    [Inventory.Api]
```

1.  **Retry Policy (Reintentos):** Cuando una llamada falla por un error transitorio (red inestable, timeout, código 5xx), Polly realiza hasta **3 reintentos automáticos** espaciados con un retraso exponencial:
    $$\text{Espera} = 2^{\text{intento}} \text{ segundos} \quad (2\text{s}, 4\text{s}, 8\text{s})$$
    Esto da tiempo a que el servicio destino se recupere si fue una micro-caída, sin alertar al usuario.
2.  **Circuit Breaker Policy (Disyuntor):** Si las fallas persisten y se registran **5 fallos consecutivos**, el disyuntor se "abre" por **30 segundos**. 
    *   **Circuito Abierto:** Durante este tiempo, cualquier intento de llamada desde Ventas al Inventario se corta **instantáneamente** de forma local en el cliente (falla rápido) sin llegar a mandar datos por la red.
    *   **Comportamiento en Ventas:** El manejador global de excepciones detecta la falla rápida (`BrokenCircuitException`) y devuelve un código **HTTP 503 Service Unavailable** estandarizado en formato RFC 7807 (`ProblemDetails`).
    *   **Beneficio:** Evita saturar al servidor de Inventario, permitiéndole recuperarse y protegiendo los hilos de ejecución de la API de Ventas de quedar colgados esperando timeouts de red.

---

### 2.3 Inmutabilidad del Historial y Dashboard

#### El problema
Los precios de los productos en el catálogo son dinámicos: cambian por inflación, ofertas o estrategias comerciales. Si un café cuesta hoy $\$2.50$, pero mañana sube a $\$3.00$, las ventas históricas registradas el día anterior no pueden cambiar de valor, ya que distorsionaría los reportes contables y el cálculo del Dashboard mensual.

#### La solución arquitectónica
Se congela el precio unitario del producto al momento exacto de realizar la transacción.
*   En la base de datos, la tabla de detalle `TicketItem` cuenta con una columna física dedicada `UnitPrice` con tipo numérico preciso (en PostgreSQL se define como `numeric(12,2)` para evitar errores de redondeo de punto flotante de tipos como float o double).
*   En el código (`TicketsController.cs`), cuando se añade un producto al ticket, el backend captura el precio snapshot del catálogo y lo almacena estáticamente en la propiedad `UnitPrice` del item, persistiendo este valor de forma definitiva al hacer `SaveChangesAsync()`.
*   El dashboard mensual de ventas compara la suma acumulada de los pagos correspondientes al mes actual con la del mes anterior, consultando la fecha y monto inmutables del pago, garantizando así reportes confiables e históricos inalterables.

---

## 3. Pilar 1: Contenedores y Orquestación (Docker & Kubernetes)

### 3.1 Dockerización Optimizada (Multi-stage Builds)
La dockerización del proyecto no es un simple script de copiado. Utiliza la técnica de **compilación multi-etapa (multi-stage build)**.

*   **¿En qué consiste?** Separa el entorno de construcción del entorno de ejecución.
    *   *Etapa 1 (Build):* Se utiliza una imagen pesada que contiene el SDK completo (por ejemplo, `dotnet/sdk:9.0` o `node:22-alpine`). Aquí se restauran los paquetes, se compila el código y se publica la versión de producción optimizada.
    *   *Etapa 2 (Runtime):* Se inicia una imagen limpia y extremadamente ligera (como `dotnet/aspnet:9.0` para las APIs, o `nginx:stable-alpine` para el frontend). Únicamente se copian los archivos binarios compilados de la etapa 1.
*   **Ventaja:** Las imágenes finales en producción son hasta un **80% más pequeñas**, lo que reduce el tiempo de descarga/despliegue en la nube, optimiza el consumo de disco y minimiza la superficie de ataque para vulnerabilidades de seguridad al no incluir compiladores ni herramientas de depuración en la imagen final de ejecución.

---

### 3.2 Conceptos de Kubernetes (K8s) implementados

Kubernetes es la plataforma elegida para la orquestación y administración de los contenedores de los microservicios en AWS.

```
┌────────────────────────────────────────────────────────┐
│                   Kubernetes Cluster                   │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │                 Service (NodePort)             │   │
│   └───────────────────────┬────────────────────────┘   │
│                           │                            │
│           ┌───────────────┴───────────────┐            │
│           ▼                               ▼            │
│   ┌───────────────┐               ┌───────────────┐    │
│   │  Pod (Replica)│               │  Pod (Replica)│    │
│   │  [Container]  │               │  [Container]  │    │
│   └───────────────┘               └───────────────┘    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

1.  **Pods y ReplicaSets:** La unidad mínima en K8s es el Pod. Configuramos los Deployments para mantener réplicas redundantes de los contenedores (por ejemplo, 3 réplicas para Ventas y 2 para Inventario) garantizando alta disponibilidad en caso de que un pod falle.
2.  **Services:** Los pods son efímeros; si mueren y K8s los recrea, su IP cambia. El recurso `Service` provee una IP interna estática y balanceo de carga para que los pods se comuniquen de forma estable (por ejemplo, `sales-api-srv` enruta el tráfico entre los pods activos de Ventas).
    *   `ClusterIP`: Para comunicación interna dentro del clúster (APIs).
    *   `NodePort`: Para exponer al exterior el frontend React mediante un puerto asignado en la máquina física (puerto `30080`).
3.  **ConfigMaps y Secrets (Desacoplamiento de Variables):**
    *   `ConfigMap`: Guarda datos de configuración no sensibles (URLs como `INVENTORY_API_URL`).
    *   `Secret`: Almacena información sensible cifrada/codificada en Base64 (la cadena de conexión de la base de datos Postgres). Esto evita subir contraseñas al control de código de Git.
4.  **HPA (Horizontal Pod Autoscaler):** Configura el autoescalado dinámico. Si el consumo de CPU o memoria supera un umbral objetivo (ej. 70% CPU en Ventas), K8s automáticamente crea y arranca nuevos pods (hasta un máximo de 10) para absorber la demanda de tráfico, reduciendo el número de réplicas automáticamente cuando el tráfico disminuye.

---

## 4. Pilar 3: Automatización de Pipelines y Pruebas Unitarias (CI/CD)

### 4.1 Pruebas Unitarias Aisladas (xUnit & InMemory DB)
Las pruebas unitarias sirven para validar que las reglas de negocio críticas del sistema no se rompan tras cambios en el código.

*   **¿Cómo se prueba la base de datos sin levantar PostgreSQL?** Se utiliza el proveedor en memoria de Entity Framework Core (`Microsoft.EntityFrameworkCore.InMemory`). Esto simula el comportamiento de la base de datos en RAM en milisegundos, aislando las pruebas del entorno de producción y evitando escrituras accidentales en bases de datos reales.
*   **¿Cómo se prueban servicios externos?** Se simula el comportamiento del catálogo de Inventario (`IInventoryCatalogClient`) inyectando un doble de pruebas/stub (`FakeInventoryCatalogClient`). Esto nos permite programar las respuestas esperadas (por ejemplo, si hay o no stock) para validar cómo responde el controlador de Ventas ante diferentes escenarios.
*   **Pruebas implementadas en `Sales.Api.Tests`:**
    *   *Prueba 1 (Creación de Ticket):* Valida que un nuevo ticket se inserte en la base de datos con estado "OPEN" y código de mesa correcto.
    *   *Prueba 2 (Inmutabilidad de precios al añadir ítem):* Valida que cuando agregamos un producto a un ticket, el controlador aplique y guarde permanentemente en `UnitPrice` el precio unitario del DTO recibido en lugar de dejar el precio libre, congelando la transacción.
    *   *Prueba 3 (Procesar Pago):* Valida que al realizar el pago, el ticket cambie su estado a "PAID", se inserte el registro de cobro con el método correcto (efectivo/tarjeta) y se llame al descuento físico de existencias.

---

### 4.2 Integración y Despliegue Continuo (CI/CD con GitHub Actions)
Se implementó un pipeline automatizado de extremo a extremo que realiza las siguientes fases en cada integración de código (`git push` a `master`):

1.  **Integración Continua (CI):**
    *   Descarga el código del repositorio.
    *   Configura el SDK de .NET 9.
    *   Restaura dependencias de NuGet y compila la solución completa.
    *   Ejecuta todas las pruebas unitarias (`dotnet test`). Si alguna prueba falla, el pipeline se detiene de inmediato, protegiendo la rama principal.
2.  **Construcción y Escaneo de Seguridad:**
    *   Construye las imágenes Docker para cada microservicio.
    *   Simula un escaneo de seguridad de imágenes (Trivy) para asegurar que no se suban contenedores con vulnerabilidades críticas en el sistema operativo o dependencias.
3.  **Despliegue Continuo (CD - AWS Academy Constraints):**
    *   Debido a que AWS Academy proporciona credenciales temporales de 4 horas, un despliegue 100% automático fallaría al caducar el token.
    *   *Solución:* Se adopta un flujo de **despliegue semi-automático** permitido en la rúbrica. El pipeline de GitHub Actions compila, testea y empaqueta de forma 100% automatizada, pero la fase final de despliegue a los servidores de nube requiere que el estudiante active manualmente el disparador (*manual trigger*), inyectando el `AWS_SESSION_TOKEN` actualizado para autenticarse contra el clúster de AWS.
