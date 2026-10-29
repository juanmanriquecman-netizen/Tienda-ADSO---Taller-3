
from fastapi import APIRouter, HTTPException, status

from app.database import obtener_conexion
from app.schemas import PedidoCrear

router = APIRouter(
    prefix="/pedidos",
    tags=["Pedidos"]
)


@router.post("/", status_code=status.HTTP_201_CREATED)
def crear_pedido(pedido: PedidoCrear):
    conexion = obtener_conexion()

    try:
        with conexion.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM clientes WHERE id = %s",
                (pedido.cliente_id,)
            )

            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="Cliente no encontrado"
                )

            cantidades = {}

            for item in pedido.productos:
                cantidades[item.producto_id] = (
                    cantidades.get(item.producto_id, 0) + item.cantidad
                )

            productos_pedido = []
            total = 0

            for producto_id, cantidad in cantidades.items():
                cursor.execute(
                    """
                    SELECT id, nombre, precio, stock
                    FROM productos
                    WHERE id = %s
                    FOR UPDATE
                    """,
                    (producto_id,)
                )

                producto = cursor.fetchone()

                if not producto:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Producto {producto_id} no encontrado"
                    )

                if producto["stock"] < cantidad:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            f"Stock insuficiente para {producto['nombre']}. "
                            f"Disponible: {producto['stock']}"
                        )
                    )

                subtotal = producto["precio"] * cantidad
                total += subtotal

                productos_pedido.append({
                    "producto_id": producto["id"],
                    "cantidad": cantidad,
                    "precio_unitario": producto["precio"],
                    "subtotal": subtotal
                })

            cursor.execute(
                """
                INSERT INTO pedidos (cliente_id, estado, total)
                VALUES (%s, %s, %s)
                """,
                (pedido.cliente_id, "confirmado", total)
            )

            pedido_id = cursor.lastrowid

            for detalle in productos_pedido:
                cursor.execute(
                    """
                    INSERT INTO detalle_pedidos
                    (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        pedido_id,
                        detalle["producto_id"],
                        detalle["cantidad"],
                        detalle["precio_unitario"],
                        detalle["subtotal"]
                    )
                )

                cursor.execute(
                    """
                    UPDATE productos
                    SET stock = stock - %s
                    WHERE id = %s
                    """,
                    (detalle["cantidad"], detalle["producto_id"])
                )

        conexion.commit()

        return {
            "mensaje": "Pedido creado correctamente",
            "pedido_id": pedido_id,
            "cliente_id": pedido.cliente_id,
            "estado": "confirmado",
            "total": round(float(total), 2),
            "detalles": productos_pedido
        }

    except HTTPException:
        conexion.rollback()
        raise

    except Exception:
        conexion.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo crear el pedido"
        )

    finally:
        conexion.close()


@router.get("/")
def listar_pedidos():
    conexion = obtener_conexion()

    try:
        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    p.id,
                    p.cliente_id,
                    c.nombre AS cliente,
                    p.fecha,
                    p.estado,
                    p.total
                FROM pedidos p
                INNER JOIN clientes c ON c.id = p.cliente_id
                ORDER BY p.id DESC
                """
            )

            return cursor.fetchall()

    finally:
        conexion.close()


@router.get("/{pedido_id}")
def consultar_pedido(pedido_id: int):
    conexion = obtener_conexion()

    try:
        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    p.id,
                    p.cliente_id,
                    c.nombre AS cliente,
                    p.fecha,
                    p.estado,
                    p.total
                FROM pedidos p
                INNER JOIN clientes c ON c.id = p.cliente_id
                WHERE p.id = %s
                """,
                (pedido_id,)
            )

            pedido = cursor.fetchone()

            if not pedido:
                raise HTTPException(
                    status_code=404,
                    detail="Pedido no encontrado"
                )

            cursor.execute(
                """
                SELECT
                    dp.producto_id,
                    pr.nombre AS producto,
                    dp.cantidad,
                    dp.precio_unitario,
                    dp.subtotal
                FROM detalle_pedidos dp
                INNER JOIN productos pr ON pr.id = dp.producto_id
                WHERE dp.pedido_id = %s
                ORDER BY dp.id
                """,
                (pedido_id,)
            )

            pedido["detalles"] = cursor.fetchall()

            return pedido

    finally:
        conexion.close()


@router.post("/{pedido_id}/cancelar")
def cancelar_pedido(pedido_id: int):
    conexion = obtener_conexion()

    try:
        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, estado
                FROM pedidos
                WHERE id = %s
                FOR UPDATE
                """,
                (pedido_id,)
            )

            pedido = cursor.fetchone()

            if not pedido:
                raise HTTPException(
                    status_code=404,
                    detail="Pedido no encontrado"
                )

            if pedido["estado"] != "confirmado":
                raise HTTPException(
                    status_code=409,
                    detail="El pedido ya fue cancelado o no se puede cancelar"
                )

            cursor.execute(
                """
                SELECT producto_id, cantidad
                FROM detalle_pedidos
                WHERE pedido_id = %s
                """,
                (pedido_id,)
            )

            detalles = cursor.fetchall()

            for detalle in detalles:
                cursor.execute(
                    """
                    UPDATE productos
                    SET stock = stock + %s
                    WHERE id = %s
                    """,
                    (
                        detalle["cantidad"],
                        detalle["producto_id"]
                    )
                )

            cursor.execute(
                """
                UPDATE pedidos
                SET estado = 'cancelado'
                WHERE id = %s
                """,
                (pedido_id,)
            )

        conexion.commit()

        return {
            "mensaje": "Pedido cancelado correctamente",
            "pedido_id": pedido_id,
            "estado": "cancelado",
            "productos_devueltos": len(detalles)
        }

    except HTTPException:
        conexion.rollback()
        raise

    except Exception:
        conexion.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo cancelar el pedido"
        )

    finally:
        conexion.close()
