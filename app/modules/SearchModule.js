// =============================================================
// SearchModule.js — Búsqueda y filtro de productos
// =============================================================
// Responsabilidades:
//   - Escuchar el input de búsqueda y el select de categoría
//   - Delegar el filtrado a ProductService
//   - Emitir "productos:filtrados" con el resultado
//
// No renderiza nada. Solo filtra y notifica.
// El render lo hace el módulo que muestra la lista.
// =============================================================

var App = App || {};

App.SearchModule = (function (EventBus, ProductService) {

  var _searchInput    = null;
  var _categoryFilter = null;

  // ---------------------------------------------------------
  // filtrar — Lee los inputs y emite el resultado
  // ---------------------------------------------------------
  function filtrar() {
    var texto     = _searchInput    ? _searchInput.value    : "";
    var categoria = _categoryFilter ? _categoryFilter.value : "";

    var resultado = ProductService.filtrar(texto, categoria);
    EventBus.emit("productos:filtrados", { lista: resultado });
  }

  // ---------------------------------------------------------
  // limpiar — Resetea los inputs y re-filtra
  // ---------------------------------------------------------
  function limpiar() {
    if (_searchInput)    _searchInput.value    = "";
    if (_categoryFilter) _categoryFilter.value = "";
    filtrar();
  }

  // ---------------------------------------------------------
  // init — Conecta los elementos del DOM
  // ---------------------------------------------------------
  function init() {
    _searchInput    = document.getElementById("searchInput");
    _categoryFilter = document.getElementById("categoryFilter");

    if (!_searchInput || !_categoryFilter) {
      console.warn("[SearchModule] No se encontraron los elementos del buscador");
      return;
    }

    _searchInput.addEventListener("input", filtrar);
    _categoryFilter.addEventListener("change", filtrar);

    // Cuando el catálogo cambia (edición, import, etc.)
    // re-filtrar con los valores actuales del buscador
    EventBus.on("store:productos:cambiado", filtrar);

    // No emitimos acá — main.js dispara el primer render
    // una vez que todos los módulos están listos.
    console.info("[SearchModule] iniciado");
  }

  return {
    init   : init,
    filtrar: filtrar,
    limpiar: limpiar,
  };

})(App.EventBus, App.ProductService);