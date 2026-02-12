let ticketActual = {
  items: [],
};

// ELEMENTOS
const btnTicket = document.getElementById("btnTicket");
const ticketPanel = document.getElementById("ticketPanel");
const btnCerrarTicket = document.getElementById("cerrarTicket");
const ticketFecha = document.getElementById("ticketFecha");

// ABRIR PANEL
btnTicket.addEventListener("click", () => {
  ticketPanel.classList.remove("oculto");
  modoTicketActivo = true;
  mostrarFechaActual();
  mostrarProductos(productos);
});

// CERRAR PANEL
btnCerrarTicket.addEventListener("click", () => {
  ticketPanel.classList.add("oculto");
  modoTicketActivo = false;
  mostrarProductos(productos);
});

// FECHA ACTUAL
function mostrarFechaActual() {
  const ahora = new Date();

  const fechaFormateada = ahora.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  ticketFecha.textContent = fechaFormateada;
}

//AGREGAR PRODUCTO A TICKET
function agregarProductoATicket(producto) {
  const precioPublico = calcularPrecio(producto);

  const existente = ticketActual.items.find(
    (item) => item.nombre === producto.nombre,
  );

  // 🔹 Si ya existe, no hacemos nada
  if (existente) {
    return;
  }

  // 🔹 Si no existe, lo agregamos con cantidad 1
  ticketActual.items.push({
    nombre: producto.nombre,
    precio: precioPublico,
    cantidad: 1,
  });

  renderTicket();
}
//RENDER TICKET
function renderTicket() {
  const contenedor = document.getElementById("ticketItems");
  contenedor.innerHTML = "";

  if (ticketActual.items.length === 0) {
    contenedor.innerHTML = "<p>No hay productos en el ticket</p>";
    return;
  }

  ticketActual.items.forEach((item, index) => {
    const subtotal = item.precio * item.cantidad;

    const fila = document.createElement("div");
    fila.classList.add("ticket-item");

    fila.innerHTML = `
      <div class="ticket-item-info">
        <div class="ticket-item-nombre">${item.nombre}</div>
        <div class="ticket-item-detalle">
          Cant: ${item.cantidad}
          | $${item.precio.toLocaleString("es-AR")}
          | $${subtotal.toLocaleString("es-AR")}
        </div>
      </div>

      <button class="ticket-eliminar" data-index="${index}">✕</button>
    `;

    contenedor.appendChild(fila);
  });

  const botonesEliminar = document.querySelectorAll(".ticket-eliminar");
  botonesEliminar.forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = btn.dataset.index;
      eliminarItemTicket(index);
    });
  });
}
//ELIMINAR ITEM TICKET
function eliminarItemTicket(index) {
  ticketActual.items.splice(index, 1);
  renderTicket();
}
