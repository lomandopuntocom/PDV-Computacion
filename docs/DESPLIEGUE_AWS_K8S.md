# Guía Paso a Paso: Despliegue de FastInventory en AWS con Kubernetes (K3s)

Esta guía detalla el proceso completo para desplegar la aplicación en AWS utilizando **Kubernetes (Pilar 1)** y cumpliendo rigurosamente con los criterios de la **Rúbrica Final** (desacoplamiento de base de datos, inyección segura de secretos y autoescalado HPA).

---

## Paso 1: Crear la Instancia EC2 en AWS

1.  **Ingresar a la Consola de AWS** y navegar a **EC2**.
2.  **Lanzar Instancia (Launch Instance):**
    *   **Nombre:** `FastInventory-Cluster-TuNombre`.
    *   **AMI:** Seleccionar **Ubuntu Server 22.04 LTS**.
    *   **Tipo de Instancia:** `t3.medium` (2 vCPUs, 4GB RAM) es el mínimo recomendado para alojar los pods del Frontend, las 3 APIs y el HPA de forma fluida.
    *   **IAM Instance Profile:** Asigna el rol `LabRole` (típico en AWS Academy).
    *   **Par de Claves (Key Pair):** Crear o seleccionar uno para acceder vía SSH.
3.  **Configuración de Red (Security Group):**
    *   Crea un nuevo grupo de seguridad con las siguientes reglas de entrada:
        *   **SSH (Puerto 22):** Permitir únicamente desde "Mi IP".
        *   **Frontend Web (Puerto 30080):** Permitir desde "Cualquier lugar (0.0.0.0/0)" (NodePort expuesto para cargar la interfaz de usuario en el navegador).
        *   **NodePorts de APIs (Opcional - Puertos 30074, 30143, 30085):** Solo si necesitas probar las URLs de Swagger individuales desde tu navegador local.

---

## Paso 2: Configurar la Base de Datos Desacoplada (AWS RDS)

Para obtener la calificación excelente en persistencia y seguridad, no utilizaremos una base de datos local dentro del clúster:

1.  **Crear Base de Datos PostgreSQL en AWS RDS:**
    *   Motor: **PostgreSQL** (versión 15 o superior).
    *   Plantilla: **Capa gratuita (Free Tier)**.
    *   Identificador: `fastinventory-db`.
    *   Credenciales: Define un usuario administrador (ej: `postgres`) y una contraseña fuerte.
2.  **Configurar Conectividad:**
    *   Asegúrate de que la base de datos RDS esté asociada al mismo Security Group que tu instancia EC2 para que puedan comunicarse internamente en el puerto `5432`.
3.  **Generar la Cadena de Conexión:**
    *   Endpoint de RDS: `fastinventory-db.xxxxxx.us-east-1.rds.amazonaws.com`
    *   Cadena de conexión:
        ```ini
        Host=fastinventory-db.xxxxxx.us-east-1.rds.amazonaws.com;Database=postgres;Username=postgres;Password=tu_clave_rds
        ```
4.  **Codificar a Base64 (Requerido por Kubernetes Secrets):**
    *   En tu terminal local de Windows (PowerShell), ejecuta:
        ```powershell
        [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("Host=fastinventory-db.xxxxxx.us-east-1.rds.amazonaws.com;Database=postgres;Username=postgres;Password=tu_clave_rds"))
        ```
    *   Copia la cadena codificada resultante (ej. `SG9zdD1mYXN0aW52ZW50b3J5L...`).

---

## Paso 3: Instalar y Configurar Kubernetes (K3s)

1.  **Conectarse a la instancia EC2 por SSH:**
    ```bash
    ssh -i "tu-llave.pem" ubuntu@tu-ip-publica-aws
    ```
2.  **Instalar K3s (Orquestador ligero de Kubernetes):**
    ```bash
    curl -sfL https://get.k3s.io | sh -
    ```
3.  **Configurar permisos del archivo kubeconfig:**
    ```bash
    mkdir -p ~/.kube
    sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
    sudo chown $USER ~/.kube/config
    chmod 600 ~/.kube/config
    ```
4.  **Verificar que el clúster local esté activo:**
    ```bash
    kubectl get nodes
    ```

---

## Paso 4: Configurar los Manifiestos con tus Credenciales y Endpoints

Antes de aplicar el despliegue, debes actualizar los archivos de manifiesto en la carpeta `k8s/` con tus datos:

1.  **Configurar el Secret de Base de Datos:**
    *   Abre los archivos de manifiesto del backend (`k8s/sales-api-k8s.yaml`, `k8s/inventory-api-k8s.yaml`, `k8s/purchases-api-k8s.yaml`).
    *   Busca la sección `kind: Secret` y reemplaza el valor de `DB_CONNECTION_STRING` con la cadena Base64 generada en el **Paso 2**:
        ```yaml
        data:
          DB_CONNECTION_STRING: <TU_CADENA_BASE64_AQUI>
        ```
2.  **Configurar los Endpoints de API en el Frontend:**
    *   Abre el archivo `k8s/frontend-k8s.yaml`.
    *   Busca el `ConfigMap` de configuración de ambiente y reemplaza las variables por la IP pública real de tu instancia EC2, apuntando a los NodePorts correspondientes de tus servicios:
        ```yaml
        data:
          VITE_INVENTORY_API_URL: "http://TU_IP_PUBLICA_EC2:30143"
          VITE_SALES_API_URL: "http://TU_IP_PUBLICA_EC2:30074"
          VITE_PURCHASES_API_URL: "http://TU_IP_PUBLICA_EC2:30085"
        ```

---

## Paso 5: Desplegar en el Clúster Kubernetes

1.  **Clonar el repositorio dentro del servidor EC2:**
    ```bash
    git clone https://github.com/tu-usuario/PDV-Computacion.git
    cd PDV-Computacion
    ```
2.  **Aplicar todos los manifiestos:**
    ```bash
    kubectl apply -f k8s/
    ```
3.  **Verificar que todos los pods y servicios estén levantados:**
    ```bash
    kubectl get all
    ```

---

## Paso 6: Verificación de Criterios de Rúbrica en AWS

1.  **Frontend Web:** Ingresa en tu navegador a:
    *   `http://tu-ip-publica-ec2:30080`
2.  **Verificación de Escalado HPA:**
    *   Para demostrar el autoescalado dinámico (Pilar 1), ejecuta:
        ```bash
        kubectl get hpa
        ```
    *   El HPA debe mostrar que está monitoreando el deployment `sales-api-deploy` con una meta de utilización de CPU superior al 70%.
3.  **Verificación de Tolerancia a Fallos (Polly):**
    *   Simula la caída del servicio de inventario deteniendo sus réplicas en Kubernetes:
        ```bash
        kubectl scale deployment inventory-api-deploy --replicas=0
        ```
    *   Intenta realizar una venta en la web o consumir Swagger en `http://tu-ip-publica-ec2:30074/swagger/index.html`. Observa los reintentos automáticos y comprueba que tras 5 fallas consecutivas el frontend muestre el error **503 Service Unavailable** devuelto por Polly de forma instantánea.
    *   Restaura el servicio:
        ```bash
        kubectl scale deployment inventory-api-deploy --replicas=2
        ```
