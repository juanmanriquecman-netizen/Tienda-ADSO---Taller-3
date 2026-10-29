
const API = "http://127.0.0.1:8000";

async function consultarAPI(ruta) {
    const respuesta = await fetch(`${API}${ruta}`);

    if (!respuesta.ok) {
        throw new Error(`Error HTTP: ${respuesta.status}`);
    }

    return await respuesta.json();
}

function mostrarTabla(contenedor, columnas, datos) {
    const elemento = document.getElementById(contenedor);

    if (!Array.isArray(datos) || datos.length === 0) {
        elemento.innerHTML = '<p class="mensaje">No hay registros para mostrar.</p>';
        return;
    }

    const encabezados = columnas
        .map(columna => `<th>${columna.titulo}</th>`)
        .join("");

    const filas = datos.map(registro => `
        <tr>
            ${columnas.map(columna =>
                `<td>${registro[columna.campo] ?? "-"}</td>`
            ).join("")}
        </tr>
    `).join("");

    elemento.innerHTML = `
        <div class="tabla-contenedor">
            <table>
                <thead><tr>${encabezados}</tr></thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `;
}

async function cargarClientes() {
    try {
        const datos = await consultarAPI("/clientes/");
        mostrarTabla("listaClientes", [
            { campo: "id", titulo: "ID" },
            { campo: "nombre", titulo: "Nombre" },
            { campo: "correo", titulo: "Correo" },
            { campo: "telefono", titulo: "Teléfono" }
        ], datos);

        document.getElementById("totalClientes").textContent = datos.length;
    } catch (error) {
        mostrarError("listaClientes", error);
    }
}

async function cargarProductos() {
    try {
        const datos = await consultarAPI("/productos/");
        mostrarTabla("listaProductos", [
            { campo: "id", titulo: "ID" },
            { campo: "nombre", titulo: "Producto" },
            { campo: "precio", titulo: "Precio" },
            { campo: "stock", titulo: "Stock" }
        ], datos);

        document.getElementById("totalProductos").textContent = datos.length;
    } catch (error) {
        mostrarError("listaProductos", error);
    }
}

async function cargarPedidos() {
    try {
        const datos = await consultarAPI("/pedidos/");
        mostrarTabla("listaPedidos", [
            { campo: "id", titulo: "Pedido" },
            { campo: "cliente_id", titulo: "ID cliente" },
            { campo: "fecha", titulo: "Fecha" },
            { campo: "estado", titulo: "Estado" },
            { campo: "total", titulo: "Total" }
        ], datos);

        document.getElementById("totalPedidos").textContent = datos.length;
    } catch (error) {
        mostrarError("listaPedidos", error);
    }
}

async function cargarReporte() {
    try {
        const datos = await consultarAPI("/reportes/ventas-por-cliente/");
        mostrarTabla("listaReporte", [
            { campo: "cliente_id", titulo: "ID cliente" },
            { campo: "cliente", titulo: "Cliente" },
            { campo: "total_pedidos", titulo: "Pedidos" },
            { campo: "total_ventas", titulo: "Total ventas" }
        ], datos);
    } catch (error) {
        mostrarError("listaReporte", error);
    }
}

function mostrarError(contenedor, error) {
    document.getElementById(contenedor).innerHTML =
        `<p class="mensaje error">No se pudieron cargar los datos. Verifica que la API esté funcionando. (${error.message})</p>`;
}

async function iniciarPanel() {
    try {
        await consultarAPI("/salud");
        document.getElementById("estadoApi").textContent = "API conectada";
        document.getElementById("estadoApi").style.color = "#34d399";

        await Promise.all([
            cargarClientes(),
            cargarProductos(),
            cargarPedidos(),
            cargarReporte()
        ]);
    } catch (error) {
        document.getElementById("estadoApi").textContent = "API desconectada";
        document.getElementById("estadoApi").style.color = "#fca5a5";
    }
}

iniciarPanel();


document.getElementById("formCliente").addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const mensaje = document.getElementById("mensajeCliente");

    const cliente = {
        nombre: document.getElementById("nombreCliente").value.trim(),
        correo: document.getElementById("correoCliente").value.trim(),
        telefono: document.getElementById("telefonoCliente").value.trim()
    };

    try {
        const respuesta = await fetch(`${API}/clientes/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(cliente)
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(resultado.detail || "No se pudo registrar el cliente.");
        }

        mensaje.textContent = "Cliente registrado correctamente.";
        mensaje.className = "mensaje";

        this.reset();
        await cargarClientes();

    } catch (error) {
        mensaje.textContent = `Error: ${error.message}`;
        mensaje.className = "mensaje error";
    }
});


document.getElementById("formProducto").addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const mensaje = document.getElementById("mensajeProducto");

    const producto = {
        nombre: document.getElementById("nombreProducto").value.trim(),
        descripcion: document.getElementById("descripcionProducto").value.trim(),
        precio: Number(document.getElementById("precioProducto").value),
        stock: Number(document.getElementById("stockProducto").value)
    };

    try {
        const respuesta = await fetch(`${API}/productos/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(producto)
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(resultado.detail || "No se pudo registrar el producto.");
        }

        mensaje.textContent = "Producto registrado correctamente.";
        mensaje.className = "mensaje";

        this.reset();
        await cargarProductos();

    } catch (error) {
        mensaje.textContent = `Error: ${error.message}`;
        mensaje.className = "mensaje error";
    }
});


async function cargarSelectoresPedido() {
    try {
        const [clientes, productos] = await Promise.all([
            consultarAPI("/clientes/"),
            consultarAPI("/productos/")
        ]);

        const selectorCliente = document.getElementById("clientePedido");

        selectorCliente.innerHTML =
            '<option value="">Selecciona un cliente</option>';

        clientes.forEach(cliente => {
            const opcion = document.createElement("option");
            opcion.value = cliente.id;
            opcion.textContent = `${cliente.id} - ${cliente.nombre}`;
            selectorCliente.appendChild(opcion);
        });

        document.querySelectorAll(".productoSeleccionado").forEach(selector => {
            llenarSelectorProductos(selector, productos);
        });

    } catch (error) {
        document.getElementById("mensajePedido").textContent =
            `No se pudieron cargar los selectores: ${error.message}`;
    }
}

function llenarSelectorProductos(selector, productos) {
    selector.innerHTML =
        '<option value="">Selecciona un producto</option>';

    productos.forEach(producto => {
        const opcion = document.createElement("option");
        opcion.value = producto.id;
        opcion.textContent =
            `${producto.nombre} - Stock: ${producto.stock}`;
        selector.appendChild(opcion);
    });
}

document.getElementById("agregarProductoPedido").addEventListener("click", async () => {
    const contenedor = document.getElementById("productosPedido");

    const bloque = document.createElement("div");
    bloque.className = "producto-pedido";

    bloque.innerHTML = `
        <label>Producto</label>
        <select class="productoSeleccionado" required>
            <option value="">Selecciona un producto</option>
        </select>

        <label>Cantidad</label>
        <input
            type="number"
            class="cantidadProducto"
            min="1"
            step="1"
            value="1"
            required
        >

        <button type="button" class="quitarProducto">Quitar producto</button>
    `;

    contenedor.appendChild(bloque);

    bloque.querySelector(".quitarProducto").addEventListener("click", () => {
        bloque.remove();
    });

    try {
        const productos = await consultarAPI("/productos/");
        llenarSelectorProductos(
            bloque.querySelector(".productoSeleccionado"),
            productos
        );
    } catch (error) {
        document.getElementById("mensajePedido").textContent =
            `No se pudieron cargar los productos: ${error.message}`;
    }
});

cargarSelectoresPedido();


async function cargarSelectoresPedido() {
    try {
        const [clientes, productos] = await Promise.all([
            consultarAPI("/clientes/"),
            consultarAPI("/productos/")
        ]);

        const selectorCliente = document.getElementById("clientePedido");

        selectorCliente.innerHTML =
            '<option value="">Selecciona un cliente</option>';

        clientes.forEach(cliente => {
            const opcion = document.createElement("option");
            opcion.value = cliente.id;
            opcion.textContent = `${cliente.id} - ${cliente.nombre}`;
            selectorCliente.appendChild(opcion);
        });

        document.querySelectorAll(".productoSeleccionado").forEach(selector => {
            llenarSelectorProductos(selector, productos);
        });

    } catch (error) {
        document.getElementById("mensajePedido").textContent =
            `No se pudieron cargar los selectores: ${error.message}`;
    }
}

function llenarSelectorProductos(selector, productos) {
    selector.innerHTML =
        '<option value="">Selecciona un producto</option>';

    productos.forEach(producto => {
        const opcion = document.createElement("option");
        opcion.value = producto.id;
        opcion.textContent =
            `${producto.nombre} - Stock: ${producto.stock}`;
        selector.appendChild(opcion);
    });
}

document.getElementById("agregarProductoPedido").addEventListener("click", async () => {
    const contenedor = document.getElementById("productosPedido");

    const bloque = document.createElement("div");
    bloque.className = "producto-pedido";

    bloque.innerHTML = `
        <label>Producto</label>
        <select class="productoSeleccionado" required>
            <option value="">Selecciona un producto</option>
        </select>

        <label>Cantidad</label>
        <input
            type="number"
            class="cantidadProducto"
            min="1"
            step="1"
            value="1"
            required
        >

        <button type="button" class="quitarProducto">Quitar producto</button>
    `;

    contenedor.appendChild(bloque);

    bloque.querySelector(".quitarProducto").addEventListener("click", () => {
        bloque.remove();
    });

    try {
        const productos = await consultarAPI("/productos/");
        llenarSelectorProductos(
            bloque.querySelector(".productoSeleccionado"),
            productos
        );
    } catch (error) {
        document.getElementById("mensajePedido").textContent =
            `No se pudieron cargar los productos: ${error.message}`;
    }
});

cargarSelectoresPedido();


document.getElementById("formPedido").addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const mensaje = document.getElementById("mensajePedido");
    const clienteId = Number(document.getElementById("clientePedido").value);

    const bloques = document.querySelectorAll(".producto-pedido");

    const items = Array.from(bloques).map(bloque => ({
        producto_id: Number(bloque.querySelector(".productoSeleccionado").value),
        cantidad: Number(bloque.querySelector(".cantidadProducto").value)
    }));

    if (!clienteId || items.some(item =>
        !item.producto_id ||
        !Number.isInteger(item.cantidad) ||
        item.cantidad < 1
    )) {
        mensaje.textContent = "Selecciona un cliente, productos y cantidades válidas.";
        mensaje.className = "mensaje error";
        return;
    }

    const productosRepetidos = new Set(items.map(item => item.producto_id));

    if (productosRepetidos.size !== items.length) {
        mensaje.textContent = "No repitas el mismo producto. Modifica su cantidad en una sola fila.";
        mensaje.className = "mensaje error";
        return;
    }

    const pedido = {
        cliente_id: clienteId,
        items: items
    };

    try {
        const respuesta = await fetch(`${API}/pedidos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(pedido)
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            const detalle = resultado.detail;
            throw new Error(
                typeof detalle === "string"
                    ? detalle
                    : JSON.stringify(detalle || "No se pudo crear el pedido.")
            );
        }

        mensaje.textContent =
            `Pedido #${resultado.id} creado correctamente. Total: $${resultado.total}`;
        mensaje.className = "mensaje";

        this.reset();

        document.getElementById("productosPedido").innerHTML = `
            <div class="producto-pedido">
                <label>Producto</label>
                <select class="productoSeleccionado" required>
                    <option value="">Selecciona un producto</option>
                </select>

                <label>Cantidad</label>
                <input
                    type="number"
                    class="cantidadProducto"
                    min="1"
                    step="1"
                    value="1"
                    required
                >
            </div>
        `;

        await Promise.all([
            cargarPedidos(),
            cargarProductos(),
            cargarSelectoresPedido()
        ]);

    } catch (error) {
        mensaje.textContent = `Error: ${error.message}`;
        mensaje.className = "mensaje error";
    }
});


async function cargarClientes() {
    try {
        const datos = await consultarAPI("/clientes/");

        document.getElementById("totalClientes").textContent = datos.length;

        const elemento = document.getElementById("listaClientes");

        if (!datos.length) {
            elemento.innerHTML = '<p class="mensaje">No hay clientes registrados.</p>';
            return;
        }

        elemento.innerHTML = `
            <div class="tabla-contenedor">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Correo</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${datos.map(cliente => `
                            <tr>
                                <td>${cliente.id}</td>
                                <td>${cliente.nombre}</td>
                                <td>${cliente.correo}</td>
                                <td>
                                    <button onclick="editarCliente(${cliente.id})">Editar</button>
                                    <button onclick="eliminarCliente(${cliente.id})">Eliminar</button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        mostrarError("listaClientes", error);
    }
}


async function editarCliente(id) {
    try {
        const respuesta = await fetch(`${API}/clientes/${id}`);

        if (!respuesta.ok) {
            throw new Error("No se pudo consultar el cliente.");
        }

        const cliente = await respuesta.json();

        document.getElementById("nombreCliente").value = cliente.nombre;
        document.getElementById("correoCliente").value = cliente.correo;
        document.getElementById("telefonoCliente").value = cliente.telefono || "";

        const formulario = document.getElementById("formCliente");
        formulario.dataset.idEditar = id;

        formulario.scrollIntoView({ behavior: "smooth" });
        document.getElementById("mensajeCliente").textContent =
            `Editando cliente #${id}. Modifica los datos y guarda los cambios.`;
    } catch (error) {
        alert(error.message);
    }
}

async function eliminarCliente(id) {
    if (!confirm(`¿Deseas eliminar el cliente #${id}?`)) {
        return;
    }

    try {
        const respuesta = await fetch(`${API}/clientes/${id}`, {
            method: "DELETE"
        });

        if (!respuesta.ok) {
            const resultado = await respuesta.json();
            throw new Error(resultado.detail || "No se pudo eliminar el cliente.");
        }

        alert("Cliente eliminado correctamente.");
        await cargarClientes();
    } catch (error) {
        alert(error.message);
    }
}
