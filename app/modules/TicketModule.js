// =============================================================
// TicketModule.js — Sistema de ticket de venta
// =============================================================

var App = App || {};

App.TicketModule = (function (EventBus, Store, PriceService) {
  var _ticket = { items: [] };

  var _panel = null;
  var _ticketItems = null;
  var _ticketTotal = null;
  var _ticketFinal = null;
  var _descuentoInput = null;
  var _recargoInput = null;
  var _fechaEl = null;
  var _modalMedio = null;

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
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
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
      nombre: producto.nombre,
      precio: PriceService.calcularDesdeStore(producto),
      cantidad: 1,
      costo: producto.costo || 0,
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
  // _calcularTotalFinal — devuelve el número
  // ---------------------------------------------------------
  function _calcularTotalFinal() {
    var subtotal = _ticket.items.reduce(function (acc, item) {
      return acc + item.precio * item.cantidad;
    }, 0);
    var descuento = parseFloat(_descuentoInput.value) || 0;
    var recargo = parseFloat(_recargoInput.value) || 0;
    var conDesc = subtotal - subtotal * (descuento / 100);
    return Math.round(conDesc + conDesc * (recargo / 100));
  }

  // ---------------------------------------------------------
  // _actualizarTotalesDOM
  // ---------------------------------------------------------
  function _actualizarTotalesDOM() {
    var subtotal = _ticket.items.reduce(function (acc, item) {
      return acc + item.precio * item.cantidad;
    }, 0);
    _ticketTotal.textContent = "$" + subtotal.toLocaleString("es-AR");
    _ticketFinal.textContent =
      "$" + _calcularTotalFinal().toLocaleString("es-AR");
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
      _descuentoInput.value = 0;
      _recargoInput.value = 0;
      return;
    }

    _ticket.items.forEach(function (item, index) {
      var subtotal = item.precio * item.cantidad;
      var fila = document.createElement("div");
      fila.classList.add("ticket-item");

      fila.innerHTML =
        '<div class="ticket-item-info">' +
        '<div class="ticket-item-nombre">' +
        item.nombre +
        "</div>" +
        '<div class="ticket-item-detalle">' +
        '<input type="number" min="1" value="' +
        item.cantidad +
        '" ' +
        'class="ticket-cantidad" data-index="' +
        index +
        '" />' +
        " x $" +
        item.precio.toLocaleString("es-AR") +
        " = $" +
        subtotal.toLocaleString("es-AR") +
        "</div>" +
        "</div>" +
        '<button class="ticket-eliminar" data-index="' +
        index +
        '">✕</button>';

      _ticketItems.appendChild(fila);
    });

    _ticketItems.querySelectorAll(".ticket-eliminar").forEach(function (btn) {
      btn.addEventListener("click", function () {
        _eliminar(parseInt(btn.dataset.index));
      });
    });

    _ticketItems.querySelectorAll(".ticket-cantidad").forEach(function (input) {
      input.addEventListener("input", function () {
        var idx = parseInt(input.dataset.index);
        var cantidad = parseInt(input.value) || 1;
        _ticket.items[idx].cantidad = cantidad;
        _guardarEnStore();
        _actualizarTotalesDOM();
      });
    });

    _guardarEnStore();
    _actualizarTotalesDOM();
  }

  // ---------------------------------------------------------
  // _guardarEnStore / _restaurarDesdeStore
  // ---------------------------------------------------------
  function _guardarEnStore() {
    Store.setTicket(_ticket);
  }

  function _restaurarDesdeStore() {
    var guardado = Store.get("ticketActual");
    if (guardado && guardado.items) {
      _ticket = guardado;
      _render();
    }
  }

  // ---------------------------------------------------------
  // _abrirModalMedioPago — modal para elegir medio antes de registrar
  // ---------------------------------------------------------
  function _abrirModalMedioPago() {
    if (_ticket.items.length === 0) {
      alert("El ticket está vacío");
      return;
    }
    _modalMedio.classList.remove("oculto");
  }

  function _cerrarModalMedioPago() {
    _modalMedio.classList.add("oculto");
  }

  function _confirmarRegistro(medioPago) {
    var totalFinal = _calcularTotalFinal();

    var itemsParaVenta = _ticket.items.map(function (item) {
      return {
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precio,
        subtotal: item.precio * item.cantidad,
        costo: item.costo || 0,
      };
    });

    EventBus.emit("ventas:registrar", {
      items: itemsParaVenta,
      total: totalFinal,
      medioPago: medioPago,
    });

    _cerrarModalMedioPago();
    alert("Venta registrada correctamente");
  }

  // ---------------------------------------------------------
  // init
  // ---------------------------------------------------------
  function init() {
    _panel = document.getElementById("ticketPanel");
    _ticketItems = document.getElementById("ticketItems");
    _ticketTotal = document.getElementById("ticketTotal");
    _ticketFinal = document.getElementById("ticketTotalFinal");
    _descuentoInput = document.getElementById("ticketDescuento");
    _recargoInput = document.getElementById("ticketRecargo");
    _fechaEl = document.getElementById("ticketFecha");
    _modalMedio = document.getElementById("modalMedioPago");

    document.getElementById("btnTicket").addEventListener("click", abrir);
    document.getElementById("cerrarTicket").addEventListener("click", cerrar);

    _descuentoInput.addEventListener("input", _actualizarTotalesDOM);
    _recargoInput.addEventListener("input", _actualizarTotalesDOM);

    document
      .getElementById("btnImprimir")
      .addEventListener("click", function () {
        _mostrarFecha();
        window.print();
      });

    document
      .getElementById("btnNuevaVenta")
      .addEventListener("click", function () {
        _ticket = { items: [] };
        _guardarEnStore();
        _render();
        _mostrarFecha();
      });

    // Botón registrar venta → abre modal de medio de pago
    document
      .getElementById("btnRegistrarVenta")
      .addEventListener("click", _abrirModalMedioPago);

    // Botones del modal de medio de pago
    document
      .getElementById("btnPagoEfectivo")
      .addEventListener("click", function () {
        _confirmarRegistro("efectivo");
      });
    document
      .getElementById("btnPagoTransferencia")
      .addEventListener("click", function () {
        _confirmarRegistro("transferencia");
      });
    document
      .getElementById("cerrarModalMedio")
      .addEventListener("click", _cerrarModalMedioPago);

    EventBus.on("ticket:agregar-producto", function (datos) {
      agregarProducto(datos.producto);
    });

    _restaurarDesdeStore();

    // Escuchar limpieza externa (ej: cambio de ganancias)
    EventBus.on("ticket:limpiar", function () {
      _ticket = { items: [] };
      _render();
    });
    EventBus.on(
      "ticket:agregar-producto-calculado",
      function (productoCalculado) {
        var existe = _ticket.items.find(function (item) {
          return item.nombre === productoCalculado.nombre;
        });
        if (existe) return;
        _ticket.items.push(productoCalculado);
        _guardarEnStore();
        _render();
      },
    );

    console.info("[TicketModule] iniciado");
  }

  return {
    init: init,
    abrir: abrir,
    cerrar: cerrar,
    agregarProducto: agregarProducto,
  };
})(App.EventBus, App.Store, App.PriceService);
