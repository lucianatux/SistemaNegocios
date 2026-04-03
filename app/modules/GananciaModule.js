// =============================================================
// GananciaModule.js — Gestión de márgenes de ganancia
// =============================================================
// Responsabilidades:
//   - Abrir/cerrar el panel de configuración de márgenes
//   - Leer inputs y delegar a Store.setGanancia()
//   - Mostrar banner de confirmación
// =============================================================

var App = App || {};

App.GananciaModule = (function (EventBus, Store) {
  var _panel = null;
  var _inputGlobal = null;
  var _inputsCategorias = null;
  var _banner = null;
  var _bannerTimeout = null;

  // ---------------------------------------------------------
  // abrir / cerrar panel
  // ---------------------------------------------------------
  function abrir() {
    _panel.classList.remove("oculto");
    _inputGlobal.value = Store.get("gananciaGlobal");

    var porCategoria = Store.get("gananciasPorCategoria");
    _inputsCategorias.forEach(function (input) {
      var cat = input.dataset.categoria;
      input.value = porCategoria[cat] !== undefined ? porCategoria[cat] : "";
    });
  }

  function cerrar() {
    _panel.classList.add("oculto");
  }

  // ---------------------------------------------------------
  // aplicar — lee inputs y actualiza el Store
  // ---------------------------------------------------------
  function aplicar() {
    var global = parseFloat(_inputGlobal.value) || 0;
    var porCategoria = {};

    _inputsCategorias.forEach(function (input) {
      if (input.value !== "") {
        porCategoria[input.dataset.categoria] = parseFloat(input.value);
      }
    });

    // Verificar si hay promo o ticket en curso
    var tienePromo = Store.get("promoActual").items.length > 0;
    var tieneTicket = Store.get("ticketActual").items.length > 0;

    if (tienePromo || tieneTicket) {
      var aviso =
        "⚠️ Si continuás, se limpiarán los registros de promo y ticket en curso.\n\n¿Continuar?";
      if (!confirm(aviso)) return;

      // Limpiar promo y ticket
      Store.setPromo({ nombre: "", descuento: 0, items: [] });
      Store.setTicket({ items: [] });
      EventBus.emit("promo:limpiar");
      EventBus.emit("ticket:limpiar");
    }

    Store.setGanancia(global, porCategoria);
    EventBus.emit("busqueda:limpiar");
    cerrar();
    _mostrarBanner();
  }

  // ---------------------------------------------------------
  // _mostrarBanner — feedback visual tras aplicar
  // ---------------------------------------------------------
  function _mostrarBanner() {
    _banner.classList.remove("oculto");
    clearTimeout(_bannerTimeout);
    _bannerTimeout = setTimeout(function () {
      _banner.classList.add("oculto");
    }, 3000);
  }

  // ---------------------------------------------------------
  // init
  // ---------------------------------------------------------
  function init() {
    _panel = document.getElementById("gestion");
    _inputGlobal = document.getElementById("gananciaGlobalInput");
    _inputsCategorias = document.querySelectorAll(".ganancia-categoria");
    _banner = document.getElementById("bannerGanancia");

    document.getElementById("btnGestion").addEventListener("click", abrir);
    document.getElementById("cerrarGlobal").addEventListener("click", cerrar);
    document.getElementById("aplicarGlobal").addEventListener("click", aplicar);
    document
      .getElementById("cerrarBanner")
      .addEventListener("click", function () {
        _banner.classList.add("oculto");
      });

    console.info("[GananciaModule] iniciado");
  }

  return {
    init: init,
    abrir: abrir,
    cerrar: cerrar,
  };
})(App.EventBus, App.Store);
