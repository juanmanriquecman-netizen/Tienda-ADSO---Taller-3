
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ClienteBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    correo: EmailStr


class ClienteCrear(ClienteBase):
    pass


class ClienteRespuesta(ClienteBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ProductoBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    precio: float = Field(gt=0)
    stock: int = Field(ge=0)


class ProductoCrear(ProductoBase):
    pass


class ProductoRespuesta(ProductoBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ItemPedido(BaseModel):
    producto_id: int = Field(gt=0)
    cantidad: int = Field(gt=0)


class PedidoCrear(BaseModel):
    cliente_id: int = Field(gt=0)
    productos: list[ItemPedido] = Field(min_length=1)


class DetallePedidoRespuesta(BaseModel):
    producto_id: int
    cantidad: int
    precio_unitario: float
    subtotal: float


class PedidoRespuesta(BaseModel):
    id: int
    cliente_id: int
    estado: str
    total: float
    detalles: list[DetallePedidoRespuesta] = []
