# Tienda ADSO

API REST para administrar una tienda de tecnología. El proyecto permite registrar clientes y productos, crear pedidos con varios artículos, controlar existencias y consultar ventas por cliente. Está desarrollado como ejercicio formativo con FastAPI y MySQL.

## Tecnologías

- Python y FastAPI
- MySQL o MariaDB
- PyMySQL y variables de entorno con `python-dotenv`
- HTML, CSS y JavaScript para el panel administrativo

## Requisitos

- Python 3.10 o superior
- MySQL Server o MariaDB iniciado
- MySQL Workbench (o una herramienta para ejecutar scripts SQL)
- Windows PowerShell para los comandos de esta guía

## Preparar la base de datos

1. Abre una conexión administrativa en MySQL Workbench.
2. Abre y ejecuta `sql/01_esquema.sql`. El script crea `tienda_adso` y las tablas `clientes`, `productos`, `pedidos` y `detalle_pedidos`.
3. Abre y ejecuta `sql/02_datos_prueba.sql` **una sola vez** para insertar los clientes y productos de ejemplo.
4. En Workbench, actualiza la lista de esquemas y confirma que aparece `tienda_adso`.

La API se conecta con el usuario indicado en `.env`. Si aún no existe, puedes crearlo desde una conexión administrativa. Reemplaza `TU_CLAVE` por la contraseña que quieras usar:

```sql
CREATE USER IF NOT EXISTS 'api_adso'@'localhost' IDENTIFIED BY 'TU_CLAVE';
GRANT SELECT, INSERT, UPDATE, DELETE ON tienda_adso.* TO 'api_adso'@'localhost';
FLUSH PRIVILEGES;
```

Si el usuario ya existe y necesitas cambiar su contraseña, ejecuta:

```sql
ALTER USER 'api_adso'@'localhost' IDENTIFIED BY 'TU_CLAVE';
```

## Configurar y ejecutar la API

Desde PowerShell, abre la carpeta raíz del proyecto y ejecuta:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edita `.env` y configura la conexión a tu servidor MySQL:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=api_adso
DB_PASSWORD=TU_CLAVE
DB_NAME=tienda_adso
```

La contraseña debe coincidir con la del usuario de MySQL. Inicia la API desde la raíz del proyecto:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

La API queda disponible en `http://127.0.0.1:8000`. La documentación interactiva de Swagger está en `http://127.0.0.1:8000/docs` y la ruta de salud en `http://127.0.0.1:8000/salud`.

## Ejecutar el panel web

Deja la API activa y abre una segunda terminal PowerShell en la raíz del proyecto:

```powershell
py -m http.server 5500 --directory frontend
```

Abre `http://127.0.0.1:5500` en el navegador. Sirve el frontend mediante este servidor local para que su origen coincida con los orígenes permitidos por CORS en la API. Abrir `frontend/index.html` directamente desde el Explorador puede impedir las solicitudes al backend.

## Funcionalidades y rutas

| Recurso | Rutas principales |
| --- | --- |
| Clientes | `GET /clientes/`, `GET /clientes/{id}`, `POST /clientes/`, `PUT /clientes/{id}`, `DELETE /clientes/{id}`, `GET /clientes/{id}/pedidos` |
| Productos | `GET /productos/`, `GET /productos/{id}`, `POST /productos/`, `PUT /productos/{id}`, `DELETE /productos/{id}`, `PATCH /productos/{id}/stock?stock=10` |
| Pedidos | `GET /pedidos/`, `GET /pedidos/{id}`, `POST /pedidos/`, `POST /pedidos/{id}/cancelar` |
| Reportes | `GET /reportes/ventas-por-cliente` |
| Estado | `GET /` y `GET /salud` |

`GET /productos/?buscar=mouse` filtra productos por nombre. Los cuerpos de solicitud y las respuestas se pueden consultar en Swagger.

### Crear un pedido

El cuerpo de `POST /pedidos/` debe incluir `cliente_id` y una lista llamada `productos`:

```json
{
  "cliente_id": 1,
  "productos": [
    {"producto_id": 1, "cantidad": 2},
    {"producto_id": 2, "cantidad": 1}
  ]
}
```

La API comprueba el cliente, los productos y las existencias. Calcula subtotales y total, registra el encabezado y el detalle del pedido y descuenta el inventario dentro de una transacción. Si el pedido no se puede completar, revierte los cambios. La respuesta incluye `pedido_id`, `total` y `detalles`.

## Probar desde Swagger

Abre `http://127.0.0.1:8000/docs` y ejecuta las operaciones. Escenarios sugeridos:

1. Consulta clientes con `GET /clientes/` y productos con `GET /productos/?buscar=mouse`.
2. Crea un cliente y un producto válidos; espera `201`.
3. Repite el correo de un cliente; espera `409`. Prueba un precio negativo; espera `422`.
4. Crea un pedido válido y confirma `201`, el total y el descuento de stock.
5. Consulta `GET /pedidos/{id}` para revisar el cliente y el detalle relacionado.
6. Intenta crear un pedido con cliente inexistente (`404`) y otro que exceda el inventario (`409`). Confirma que el segundo no descuente existencias.
7. Prueba `PATCH /productos/{id}/stock?stock=10` y consulta `GET /reportes/ventas-por-cliente`.

## Consultas SQL de verificación

```sql
SELECT * FROM tienda_adso.clientes;
SELECT * FROM tienda_adso.productos;

SELECT p.id, c.nombre AS cliente, p.fecha, p.total
FROM tienda_adso.pedidos AS p
JOIN tienda_adso.clientes AS c ON c.id = p.cliente_id;

SELECT d.pedido_id, pr.nombre AS producto, d.cantidad, d.subtotal
FROM tienda_adso.detalle_pedidos AS d
JOIN tienda_adso.productos AS pr ON pr.id = d.producto_id;
```

## Estructura del proyecto

```text
app/
  main.py                 Aplicación FastAPI y registro de routers
  database.py             Conexión a MySQL
  schemas.py              Validación de solicitudes y respuestas
  routers/
    clientes.py           Operaciones de clientes
    productos.py          Catálogo e inventario
    pedidos.py            Pedidos, detalles y transacciones
    reportes.py           Reporte de ventas por cliente
sql/
  01_esquema.sql          Base de datos, tablas y relaciones
  02_datos_prueba.sql     Datos de ejemplo
frontend/
  index.html              Panel administrativo
  style.css               Estilos del panel
  script.js               Formularios y comunicación con la API
.env.example              Plantilla de variables de conexión
requirements.txt          Dependencias de Python
```

## Notas

- Crea `.env` localmente a partir de `.env.example`; no publiques contraseñas ni incluyas `.env` en entregas.
- Ejecuta `sql/02_datos_prueba.sql` una sola vez para evitar insertar duplicados.
- El panel y la API están configurados para desarrollo local. El proyecto no incluye autenticación.
