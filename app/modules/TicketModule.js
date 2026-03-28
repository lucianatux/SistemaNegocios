// =============================================================
// TicketModule.js — Sistema de ticket de venta
// =============================================================
// Responsabilidades:
//   - Gestionar el panel lateral del ticket
//   - Agregar, editar cantidad y eliminar items
//   - Calcular total con descuento y recargo
//   - Imprimir y resetear para nueva venta
// =============================================================

var App = App || {};

App.TicketModule = (function (EventBus, Store, PriceService) {

  // Estado local del módulo
  var _ticket = { items: [] };

  // Elementos DOM
  var _panel          = null;
  var _ticketItems    = null;
  var _ticketTotal    = null;
  var _ticketFinal    = null;
  var _descuentoInput = null;
  var _recargoInput   = null;
  var _fechaEl        = null;

  // ---------------------------------------------------------
  // abrir / cerrar
  // ---------------------------------------------------------
  function abrir() {
    Store.set("modoTicket", true);
    _panel.classList.remove("oculto");
    _mostrarFecha();
  }

  function cerrar() {
    Store.set("modoTicket", false);
    _panel.classList.add("oculto");
  }

  // ---------------------------------------------------------
  // _mostrarFecha
  // ---------------------------------------------------------
  function _mostrarFecha() {
    var ahora = new Date();
    _fechaEl.textContent = ahora.toLocaleString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  }

  // ---------------------------------------------------------
  // agregarProducto
  // ---------------------------------------------------------
  function agregarProducto(producto) {
    var existe = _ticket.items.find(function (item) {
      return item.nombre === producto.nombre;
    });
    if (existe) return;

    _ticket.items.push({
      nombre  : producto.nombre,
      precio  : PriceService.calcularDesdeStore(producto),
      cantidad: 1,
    });

    _guardarEnStore();
    _render();
  }

  // ---------------------------------------------------------
  // _eliminar
  // ---------------------------------------------------------
  function _eliminar(index) {
    _ticket.items.splice(index, 1);
    _guardarEnStore();
    _render();
  }

  // ---------------------------------------------------------
  // _calcularTotal
  // ---------------------------------------------------------
  function _calcularTotal() {
    var subtotal  = _ticket.items.reduce(function (acc, item) {
      return acc + item.precio * item.cantidad;
    }, 0);

    var descuento = parseFloat(_descuentoInput.value) || 0;
    var recargo   = parseFloat(_recargoInput.value)   || 0;

    var conDescuento = subtotal - subtotal * (descuento / 100);
    var totalFinal   = conDescuento + conDescuento * (recargo / 100);

    _ticketTotal.textContent = "$" + subtotal.toLocaleString("es-AR");
    _ticketFinal.textContent = "$" + totalFinal.toLocaleString("es-AR");
  }

  // ---------------------------------------------------------
  // _render
  // ---------------------------------------------------------
  function _render() {
    _ticketItems.innerHTML = "";

    if (_ticket.items.length === 0) {
      _ticketItems.innerHTML =
        "<p class='ticket-vacio'>No hay productos en el ticket</p>";
      _ticketTotal.textContent = "$0";
      _ticketFinal.textContent = "$0";
      _descuentoInput.value    = 0;
      _recargoInput.value      = 0;
      return;
    }

    _ticket.items.forEach(function (item, index) {
      var subtotal = item.precio * item.cantidad;
      var fila     = document.createElement("div");
      fila.classList.add("ticket-item");

      fila.innerHTML =
        '<div class="ticket-item-info">' +
          '<div class="ticket-item-nombre">' + item.nombre + '</div>' +
          '<div class="ticket-item-detalle">' +
            '<input type="number" min="1" value="' + item.cantidad + '" ' +
              'class="ticket-cantidad" data-index="' + index + '" />' +
            ' x $' + item.precio.toLocaleString("es-AR") +
            ' = $' + subtotal.toLocaleString("es-AR") +
          '</div>' +
        '</div>' +
        '<button class="ticket-eliminar" data-index="' + index + '">✕</button>';

      _ticketItems.appendChild(fila);
    });

    // Eventos eliminar
    _ticketItems.querySelectorAll(".ticket-eliminar").forEach(function (btn) {
      btn.addEventListener("click", function () {
        _eliminar(parseInt(btn.dataset.index));
      });
    });

    // Eventos cantidad
    _ticketItems.querySelectorAll(".ticket-cantidad").forEach(function (input) {
      input.addEventListener("input", function () {
        var idx      = parseInt(input.dataset.index);
        var cantidad = parseInt(input.value) || 1;
        _ticket.items[idx].cantidad = cantidad;
        _guardarEnStore();
        _calcularTotal();
      });
    });

    _guardarEnStore();
    _calcularTotal();
  }

  // ---------------------------------------------------------
  // _guardarEnStore
  // ---------------------------------------------------------
  function _guardarEnStore() {
    Store.setTicket(_ticket);
  }

  // ---------------------------------------------------------
  // _restaurarDesdeStore
  // ---------------------------------------------------------
  function _restaurarDesdeStore() {
    var guardado = Store.get("ticketActual");
    if (guardado && guardado.items) {
      _ticket = guardado;
      _render();
    }
  }

  // ---------------------------------------------------------
  // init
  // ---------------------------------------------------------
  function init() {
    _panel          = document.getElementById("ticketPanel");
    _ticketItems    = document.getElementById("ticketItems");
    _ticketTotal    = document.getElementById("ticketTotal");
    _ticketFinal    = document.getElementById("ticketTotalFinal");
    _descuentoInput = document.getElementById("ticketDescuento");
    _recargoInput   = document.getElementById("ticketRecargo");
    _fechaEl        = document.getElementById("ticketFecha");

    document.getElementById("btnTicket")
      .addEventListener("click", abrir);
    document.getElementById("cerrarTicket")
      .addEventListener("click", cerrar);

    _descuentoInput.addEventListener("input", _calcularTotal);
    _recargoInput.addEventListener("input",   _calcularTotal);

    document.getElementById("btnImprimir").addEventListener("click", function () {
      _mostrarFecha();
      window.print();
    });

    document.getElementById("btnNuevaVenta").addEventListener("click", function () {
      _ticket = { items: [] };
      _guardarEnStore();
      _render();
      _mostrarFecha();
    });

    // Escuchar producto agregado desde la lista
    EventBus.on("ticket:agregar-producto", function (datos) {
      agregarProducto(datos.producto);
    });

    // Restaurar ticket guardado
    _restaurarDesdeStore();

    console.info("[TicketModule] iniciado");
  }

  return {
    init           : init,
    abrir          : abrir,
    cerrar         : cerrar,
    agregarProducto: agregarProducto,
  };

})(App.EventBus, App.Store, App.PriceService);