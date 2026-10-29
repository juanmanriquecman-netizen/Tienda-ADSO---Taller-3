
from fastapi import FastAPI

from app.routers import clientes, productos, pedidos, reportes

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Tienda ADSO API",
    description="API REST para gestionar clientes, productos y pedidos",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(clientes.router)
app.include_router(productos.router)
app.include_router(pedidos.router)
app.include_router(reportes.router)


@app.get("/")
def inicio():
    return {
        "mensaje": "Bienvenido a Tienda ADSO API",
        "estado": "funcionando"
    }


@app.get("/salud")
def verificar_salud():
    return {
        "estado": "correcto",
        "mensaje": "La API esta funcionando"
    }
