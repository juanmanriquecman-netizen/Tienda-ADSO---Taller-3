
from fastapi import APIRouter, HTTPException, status

from app.database import obtener_conexion
from app.schemas import ClienteCrear, ClienteRespuesta

router = APIRouter(
    prefix="/clientes",
    tags=["Clientes"]
)


@router.post("/", response_model=ClienteRespuesta, status_code=status.HTTP_201_CREATED)
def crear_cliente(cliente: ClienteCrear):
    conexion = obtener_conexion()

    try:
        with conexion.cursor() as cursor:
            cursor.execute(
                "INSERT INTO clientes (nombre, correo) VALUES (%s, %s)",
                (cliente.nombre, str(cliente.correo))
            )
            cliente_id = cursor.lastrowid

        conexion.commit()

        return {
            "id": cliente_id,
            "nombre": cliente.nombre,
            "correo": str(cliente.correo)
        }

    except Exception as error:
        conexion.rollback()

        if "Duplicate entry" in str(error):
            raise HTTPException(
                status_code=409,
                detail="El correo ya esta registrado"
            )

        raise HTTPException(
            status_code=500,
            detail="No se pudo crear el cliente"
        )

    finally:
        conexion.close()


@router.get("/", response_model=list[ClienteRespuesta])
def listar_clientes():
    conexion = obtener_conexion()

    try:
        with conexion.cursor() as cursor:
            cursor.execute(
                "SELECT id, nombre, correo FROM clientes ORDER BY id"
            )
            clientes = cursor.fetchall()

        return clientes

    finally:
        conexion.close()


@router.get("/{cliente_id}", response_model=ClienteRespuesta)
def consultar_cliente(cliente_id: int):
    conexion = obtener_conexion()

    try:
        with conexion.cursor() as cursor:
            cursor.execute(
                "SELECT id, nombre, correo FROM clientes WHERE id = %s",
                (cliente_id,)
            )
            cliente = cursor.fetchone()

        if not cliente:
            raise HTTPException(
                status_code=404,
                detail="Cliente no encontrado"
            )

        return cliente

    finally:
        conexion.close()


@router.put("/{cliente_id}", response_model=ClienteRespuesta)
def actualizar_cliente(cliente_id: int, datos: ClienteCrear):
    conexion = obtener_conexion()

    try:
        with conexion.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM clientes WHERE id = %s",
                (cliente_id,)
            )

            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="Cliente no encontrado"
                )

            cursor.execute(
                """
                UPDATE clientes
                SET nombre = %s, correo = %s
                WHERE id = %s
                """,
                (datos.nombre, str(datos.correo), cliente_id)
            )

        conexion.commit()

        return {
            "id": cliente_id,
            "nombre": datos.nombre,
            "correo": str(datos.correo)
        }

    except Exception as error:
        conexion.rollback()

        if isinstance(error, HTTPException):
            raise

        if "Duplicate entry" in str(error):
            raise HTTPException(
                status_code=409,
                detail="El correo ya esta registrado"
            )

        raise HTTPException(
            status_code=500,
            detail="No se pudo actualizar el cliente"
        )

    finally:
        conexion.close()


@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_cliente(cliente_id: int):
    conexion = obtener_conexion()

    try:
        with conexion.cursor() as cursor:
            cursor.execute(
                "DELETE FROM clientes WHERE id = %s",
                (cliente_id,)
            )

            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Cliente no encontrado"
                )

        conexion.commit()

    except Exception as error:
        conexion.rollback()

        if isinstance(error, HTTPException):
            raise

        if "foreign key constraint fails" in str(error).lower():
            raise HTTPException(
                status_code=409,
                detail="No se puede eliminar el cliente porque tiene pedidos asociados"
            )

        raise HTTPException(
            status_code=500,
            detail="No se pudo eliminar el cliente"
        )


@router.get("/{cliente_id}/pedidos")
def listar_pedidos_cliente(cliente_id: int):
    conexion = obtener_conexion()

    try:
        with conexion.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM clientes WHERE id = %s",
                (cliente_id,)
            )

            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="Cliente no encontrado"
                )

            cursor.execute(
                """
                SELECT id, cliente_id, fecha, estado, total
                FROM pedidos
                WHERE cliente_id = %s
                ORDER BY fecha DESC
                """,
                (cliente_id,)
            )

            return cursor.fetchall()

    finally:
        conexion.close()

