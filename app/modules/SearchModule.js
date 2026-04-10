// =============================================================
// SearchModule.js — Búsqueda, filtros e integración lector
// =============================================================

var App = App || {};

App.SearchModule = (function (EventBus, ProductService) {

  var _searchInput    = null;
  var _categoryFilter = null;
  var _timerBanner    = null;

  // ---------------------------------------------------------
  // _procesarCodigoLector
  // ---------------------------------------------------------
  function _procesarCodigoLector(codigo) {
    if (!codigo || codigo.trim() === "") return;

    var productos  = ProductService.filtrar(codigo.trim(), "");
    var modoTicket = App.Store ? App.Store.get("modoTicket") : false;
    var modoPromo  = App.Store ? App.Store.get("modoPromo")  : false;

    if (productos.length === 0) {
      _mostrarBannerTemporal("⚠️ No encontrado: " + codigo, true);
      return;
    }

    if (productos.length === 1) {
      var producto = productos[0];

      if (modoTicket) {
        if (producto.porPeso) {
          EventBus.emit("pesaje:abrir", { producto: producto, destino: "ticket" });
        } else {
          EventBus.emit("ticket:agregar-producto", { producto: producto });
          _mostrarBannerTemporal("✅ Agregado al ticket: " + producto.nombre, false);
        }
        _searchInput.value = "";
        filtrar();
        return;
      }

      if (modoPromo) {
        if (producto.porPeso) {
          EventBus.emit("pesaje:abrir", { producto: producto, destino: "promo" });
        } else {
          EventBus.emit("promo:agregar-producto", { producto: producto });
          _mostrarBannerTemporal("✅ Agregado a la promo: " + producto.nombre, false);
        }
        _searchInput.value = "";
        filtrar();
        return;
      }

      // Sin modo activo → resaltar en la lista
      _searchInput.value = codigo.trim();
      filtrar();
      return;
    }

    // Varios resultados → filtrar normal
    _searchInput.value = codigo.trim();
    filtrar();
  }

  // ---------------------------------------------------------
  // Banner temporal — reutiliza el banner de ganancia
  // ---------------------------------------------------------
  function _mostrarBannerTemporal(texto, esError) {
    var banner = document.getElementById("bannerGanancia");
    if (!banner) return;

    var span = banner.querySelector("span");
    if (span) span.textContent = texto;

    banner.style.background = esError
      ? "#b00020"
      : "var(--color-primario)";
    banner.classList.remove("oculto");

    clearTimeout(_timerBanner);
    _timerBanner = setTimeout(function () {
      banner.classList.add("oculto");
      // Restaurar texto original para cuando lo use GananciaModule
      if (span) span.textContent = "Margen de ganancia aplicado";
      banner.style.background = "";
    }, 2000);
  }

  // ---------------------------------------------------------
  // filtrar
  // ---------------------------------------------------------
  function filtrar() {
    var texto     = _searchInput    ? _searchInput.value    : "";
    var categoria = _categoryFilter ? _categoryFilter.value : "";

    var resultado = ProductService.filtrar(texto, categoria);
    EventBus.emit("productos:filtrados", { lista: resultado });
  }

  // ---------------------------------------------------------
  // limpiar
  // ---------------------------------------------------------
  function limpiar() {
    if (_searchInput)    _searchInput.value    = "";
    if (_categoryFilter) _categoryFilter.value = "";
    filtrar();
  }

  // ---------------------------------------------------------
  // init
  // ---------------------------------------------------------
  function init() {
    _searchInput    = document.getElementById("searchInput");
    _categoryFilter = document.getElementById("categoryFilter");

    if (!_searchInput || !_categoryFilter) {
      console.warn("[SearchModule] No se encontraron los elementos del buscador");
      return;
    }

    // Búsqueda normal mientras escribe
    _searchInput.addEventListener("input", filtrar);
    _categoryFilter.addEventListener("change", filtrar);

    // Enter → procesar como escaneo (funciona tanto con lector como a mano)
    _searchInput.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();

      var codigo = _searchInput.value.trim();
      if (codigo === "") return;

      _procesarCodigoLector(codigo);
    });

    // Re-filtrar cuando cambia el catálogo
    EventBus.on("store:productos:cambiado", filtrar);

    console.info("[SearchModule] iniciado");
  }

  return {
    init   : init,
    filtrar: filtrar,
    limpiar: limpiar,
  };

})(App.EventBus, App.ProductService);