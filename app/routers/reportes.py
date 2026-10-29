
from fastapi import APIRouter, HTTPException
from app.database import obtener_conexion

router = APIRouter(
    prefix="/reportes",
    tags=["Reportes"]
)


@router.get("/ventas-por-cliente")
def ventas_por_cliente():
    conexion = obtener_conexion()

    try:
        with conexion.cursor() as cursor:
            cursor.execute("""
                SELECT
                    c.id AS cliente_id,
                    c.nombre AS cliente,
                    COUNT(p.id) AS cantidad_pedidos,
                    COALESCE(SUM(p.total), 0) AS total_ventas
                FROM clientes c
                LEFT JOIN pedidos p
                    ON c.id = p.cliente_id
                GROUP BY c.id, c.nombre
                ORDER BY total_ventas DESC
            """)

            return cursor.fetchall()

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Error al generar el reporte de ventas"
        )

    finally:
        conexion.close()
