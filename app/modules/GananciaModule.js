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

  var _panel                   = null;
  var _inputGlobal             = null;
  var _inputsCategorias        = null;
  var _banner                  = null;
  var _bannerTimeout           = null;

  // ---------------------------------------------------------
  // abrir / cerrar panel
  // ---------------------------------------------------------
  function abrir() {
    _panel.classList.remove("oculto");
    _inputGlobal.value = Store.get("gananciaGlobal");

    var porCategoria = Store.get("gananciasPorCategoria");
    _inputsCategorias.forEach(function (input) {
      var cat   = input.dataset.categoria;
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
    var global       = parseFloat(_inputGlobal.value) || 0;
    var porCategoria = {};

    _inputsCategorias.forEach(function (input) {
      if (input.value !== "") {
        porCategoria[input.dataset.categoria] = parseFloat(input.value);
      }
    });

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
    _panel            = document.getElementById("gestion");
    _inputGlobal      = document.getElementById("gananciaGlobalInput");
    _inputsCategorias = document.querySelectorAll(".ganancia-categoria");
    _banner           = document.getElementById("bannerGanancia");

    document.getElementById("btnGestion")
      .addEventListener("click", abrir);
    document.getElementById("cerrarGlobal")
      .addEventListener("click", cerrar);
    document.getElementById("aplicarGlobal")
      .addEventListener("click", aplicar);
    document.getElementById("cerrarBanner")
      .addEventListener("click", function () {
        _banner.classList.add("oculto");
      });

    console.info("[GananciaModule] iniciado");
  }

  return {
    init  : init,
    abrir : abrir,
    cerrar: cerrar,
  };

})(App.EventBus, App.Store);