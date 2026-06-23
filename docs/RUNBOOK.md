# Runbook de Operaciones y Guía de Despliegue

Este documento detalla la arquitectura de infraestructura del sistema distribuido y provee instrucciones paso a paso para compilar, migrar, ejecutar y mantener los servicios del sistema de gestión de inventario y punto de venta.

---

## 1. Arquitectura de Despliegue (AWS)

El sistema está diseñado para desplegarse en instancias de AWS EC2 (o clúster K8s ligero sobre EC2) comunicándose mediante APIs REST seguras, eventos de streaming en tiempo real (SSE) y políticas de tolerancia a fallos.

### Diagrama Arquitectónico (AWS)

```mermaid
graph TD
    subgraph Cliente ["Capa de Cliente"]
        Browser["Navegador Web (React + Vite)"]
    end

    subgraph AWS ["Infraestructura AWS (EC2 / Docker)"]
        subgraph Red_Publica ["Subred Pública (Puerto 80/443)"]
            Proxy["Proxy Inverso (Nginx)"]
        end

        subgraph Red_Privada ["Subred Privada (Puertos 8080/5432)"]
            Sales_API["Sales.Api (Docker Container)"]
            Inventory_API["Inventory.Api (Docker Container)"]
            Purchases_API["Purchases.Api (Docker Container)"]
            
            DB[("PostgreSQL DB (RDS / Container)")]
        end
    end

    %% Flujos de interacción
    Browser -->|HTTP / HTTPS| Proxy
    Proxy -->|Enruta a Puerto 80| Browser
    Proxy -->|api/sales/*| Sales_API
    Proxy -->|api/inventory/*| Inventory_API
    Proxy -->|api/purchases/*| Purchases_API

    %% Integraciones internas y resiliencia
    Sales_API -->|1. Consume Stock (REST con Polly)| Inventory_API
    Purchases_API -->|2. Incrementa Stock (REST)| Inventory_API
    Inventory_API -->|3. Streaming de Eventos (SSE)| Browser
    
    %% Persistencia
    Sales_API -->|SQL| DB
    Inventory_API -->|SQL| DB
    Purchases_API -->|SQL| DB
```

---

## 2. Requisitos Previos

Para ejecutar la aplicación localmente o en el servidor, asegúrese de tener instalados los siguientes componentes:

*   **SDK de .NET:** Versión 9.0 o superior.
*   **Docker & Docker Compose:** Para la contenerización local.
*   **Node.js:** Versión 20 o superior (con `npm`).
*   **PostgreSQL:** Versión 15 o superior (si se ejecuta sin Docker).

---

## 3. Guía de Ejecución Local con Docker Compose

El proyecto incluye un entorno unificado con Docker Compose. Para iniciar todos los servicios:

1.  Abra una terminal en la raíz del proyecto.
2.  Copie el archivo de ejemplo de variables de entorno:
    ```bash
    cp .env.example .env
    ```
3.  Edite el archivo `.env` configurando los valores de conexión de base de datos deseados.
4.  Levante los contenedores en segundo plano:
    ```bash
    docker compose up -d --build
    ```
5.  Los puertos expuestos por defecto son:
    *   **Frontend:** `http://localhost:3000`
    *   **Sales.Api:** `http://localhost:5074`
    *   **Inventory.Api:** `http://localhost:5143`
    *   **Purchases.Api:** `http://localhost:5085`

---

## 4. Ejecución de Migraciones de Base de Datos

Cada microservicio gestiona su propio contexto de Entity Framework Core. Para aplicar las migraciones a la base de datos PostgreSQL:

```bash
# Aplicar migraciones del módulo Shared
dotnet ef database update -p Sales.Api/Sales.Api.csproj -c SharedDbContext

# Aplicar migraciones del módulo Inventory
dotnet ef database update -p Inventory.Api/Inventory.Api.csproj -c InventoryDbContext

# Aplicar migraciones del módulo Sales
dotnet ef database update -p Sales.Api/Sales.Api.csproj -c SalesDbContext
```

---

## 5. Simulación de Fallos y Validación (Polly)

Para validar que el disyuntor y las políticas de reintento de Polly están operando correctamente:

1.  **Simular Caída:** Detenga el contenedor o proceso de `Inventory.Api`:
    ```bash
    docker compose stop inventory-api
    ```
2.  **Probar Transacción:** Intente realizar una venta o consultar el catálogo desde el Frontend o mediante una llamada REST a `Sales.Api` (endpoint de pago).
3.  **Observación:** 
    *   Las primeras 5 llamadas experimentarán reintentos progresivos (2s, 4s, 8s).
    *   Al completarse los 5 fallos consecutivos, el circuito se abrirá y las llamadas subsecuentes recibirán un error **503 Service Unavailable** de forma instantánea sin intentar conectarse a la red.
4.  **Restaurar Servicio:** Inicie el contenedor nuevamente:
    ```bash
    docker compose start inventory-api
    ```
    Tras el período de espera del disyuntor (30 segundos), el circuito volverá a cerrarse al recibir llamadas exitosas.
