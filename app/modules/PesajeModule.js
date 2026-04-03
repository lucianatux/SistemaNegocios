// =============================================================
// PesajeModule.js — Modal de pesaje para productos a granel
// =============================================================

var App = App || {};

App.PesajeModule = (function (EventBus, PriceService, Store) {
  var _modal = null;
  var _inputGr = null;
  var _resultado = null;
  var _productoActual = null;
  var _destinoActual = null;
  var _precioUnitario = 0;

  function _calcular() {
    var gramos = parseFloat(_inputGr.value) || 0;
    if (gramos <= 0) {
      _resultado.textContent = "";
      return;
    }

    var total = Math.round((_precioUnitario * gramos) / 100);
    _resultado.textContent = gramos + "g → $" + total.toLocaleString("es-AR");
  }

  function abrir(producto, destino) {
    _productoActual = producto;
    _destinoActual = destino;
    _precioUnitario = PriceService.calcularDesdeStore(producto);

    document.getElementById("pesajeNombre").textContent =
      "⚖️ " + producto.nombre;
    document.getElementById("pesajePrecioRef").textContent =
      "Precio: $" + _precioUnitario + " por 100g";

    _inputGr.value = "";
    _resultado.textContent = "";
    _modal.classList.remove("oculto");
    _inputGr.focus();
  }

  function _confirmar() {
    var gramos = parseFloat(_inputGr.value) || 0;
    if (gramos <= 0) {
      alert("Ingresá un peso válido");
      return;
    }

    var total = Math.round((_precioUnitario * gramos) / 100);

    var productoCalculado = {
      nombre: _productoActual.nombre + " " + gramos + "g",
      precio: total,
      cantidad: 1,
      costo: ((_productoActual.costo || 0) * gramos) / 100,
    };

    if (_destinoActual === "ticket") {
      EventBus.emit("ticket:agregar-producto-calculado", productoCalculado);
    } else {
      EventBus.emit("promo:agregar-producto-calculado", productoCalculado);
    }

    _modal.classList.add("oculto");
  }

  function init() {
    _modal = document.getElementById("modalPesaje");
    _inputGr = document.getElementById("pesajeGramos");
    _resultado = document.getElementById("pesajeResultado");

    _inputGr.addEventListener("input", _calcular);

    document
      .getElementById("confirmarPesaje")
      .addEventListener("click", _confirmar);
    document
      .getElementById("cerrarModalPesaje")
      .addEventListener("click", function () {
        _modal.classList.add("oculto");
      });

    EventBus.on("pesaje:abrir", function (datos) {
      abrir(datos.producto, datos.destino);
    });

    console.info("[PesajeModule] iniciado");
  }

  return { init: init, abrir: abrir };
})(App.EventBus, App.PriceService, App.Store);
