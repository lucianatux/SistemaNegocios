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
    contenedor.innerHTML =
      "<p class='ticket-vacio'>No hay productos en el ticket</p>";

    // Reset totales
    document.getElementById("ticketTotal").textContent = "$0";
    document.getElementById("ticketTotalFinal").textContent = "$0";

    document.getElementById("ticketDescuento").value = 0;
    document.getElementById("ticketRecargo").value = 0;

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
          <input 
            type="number" 
            min="1" 
            value="${item.cantidad}" 
            class="ticket-cantidad"
            data-index="${index}"
          />

          x $${item.precio.toLocaleString("es-AR")}
          = $${subtotal.toLocaleString("es-AR")}
        </div>
      </div>

      <button class="ticket-eliminar" data-index="${index}">✕</button>
    `;

    contenedor.appendChild(fila);
  });

  // Eventos eliminar
  document.querySelectorAll(".ticket-eliminar").forEach((btn) => {
    btn.addEventListener("click", () => {
      eliminarItemTicket(btn.dataset.index);
    });
  });

  // Eventos cantidad
  document.querySelectorAll(".ticket-cantidad").forEach((input) => {
    input.addEventListener("input", () => {
      const index = input.dataset.index;
      const nuevaCantidad = parseInt(input.value) || 1;

      ticketActual.items[index].cantidad = nuevaCantidad;

      renderTicket(); // re-render
      calcularTotalTicket();
    });
  });

  calcularTotalTicket();
}
//ELIMINAR ITEM TICKET
function eliminarItemTicket(index) {
  ticketActual.items.splice(index, 1);
  renderTicket();
}

//CALCULAR TOTAL TICKET
function calcularTotalTicket() {
  let subtotal = 0;

  ticketActual.items.forEach((item) => {
    subtotal += item.precio * item.cantidad;
  });

  const descuentoInput = document.getElementById("ticketDescuento");
  const recargoInput = document.getElementById("ticketRecargo");

  const descuento = parseFloat(descuentoInput.value) || 0;
  const recargo = parseFloat(recargoInput.value) || 0;

  const montoDescuento = subtotal * (descuento / 100);
  const subtotalConDescuento = subtotal - montoDescuento;

  const montoRecargo = subtotalConDescuento * (recargo / 100);
  const totalFinal = subtotalConDescuento + montoRecargo;

  // Mostrar subtotal
  document.getElementById("ticketTotal").textContent =
    "$" + subtotal.toLocaleString("es-AR");

  // Mostrar total final
  document.getElementById("ticketTotalFinal").textContent =
    "$" + totalFinal.toLocaleString("es-AR");
}

// Activar eventos
document
  .getElementById("ticketDescuento")
  .addEventListener("input", calcularTotalTicket);

document
  .getElementById("ticketRecargo")
  .addEventListener("input", calcularTotalTicket);

document.getElementById("btnImprimir").addEventListener("click", () => {
  mostrarFechaActual();
  window.print();
});


//NUEVA VENTA
const btnNuevaVenta = document.getElementById("btnNuevaVenta");
btnNuevaVenta.addEventListener("click", () => {
  ticketActual.items = [];
  renderTicket();
  mostrarFechaActual(); // opcional, pero queda lindo
});
