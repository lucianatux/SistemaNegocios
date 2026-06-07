// =============================================================
// SearchModule.js — Búsqueda, filtros e integración lector
// =============================================================

var App = App || {};

App.SearchModule = (function (EventBus, ProductService) {
  var _searchInput = null;
  var _categoryFilter = null;
  var _timerBanner = null;
  var _filtroEspecial = false; // true = mostrar solo precio especial/escalas
  var _ordenPorCodigo = true; // true = orden por código (default); false = alfabético

  // ---------------------------------------------------------
  // _procesarCodigoLector
  // ---------------------------------------------------------
  function _procesarCodigoLector(codigo) {
    if (!codigo || codigo.trim() === "") return;

    var productos = ProductService.filtrar(codigo.trim(), "");
    var modoTicket = App.Store ? App.Store.get("modoTicket") : false;
    var modoPromo = App.Store ? App.Store.get("modoPromo") : false;

    if (productos.length === 0) {
      _mostrarBannerTemporal("⚠️ No encontrado: " + codigo, true);
      return;
    }

    if (productos.length === 1) {
      var producto = productos[0];

      if (modoTicket) {
        if (producto.porPeso) {
          EventBus.emit("pesaje:abrir", {
            producto: producto,
            destino: "ticket",
          });
        } else {
          EventBus.emit("ticket:agregar-producto", { producto: producto });
          _mostrarBannerTemporal(
            "✅ Agregado al ticket: " + producto.nombre,
            false,
          );
        }
        _searchInput.value = "";
        filtrar();
        return;
      }

      if (modoPromo) {
        if (producto.porPeso) {
          EventBus.emit("pesaje:abrir", {
            producto: producto,
            destino: "promo",
          });
        } else {
          EventBus.emit("promo:agregar-producto", { producto: producto });
          _mostrarBannerTemporal(
            "✅ Agregado a la promo: " + producto.nombre,
            false,
          );
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

    banner.style.background = esError ? "#b00020" : "var(--color-primario)";
    banner.classList.remove("oculto");

    clearTimeout(_timerBanner);
    _timerBanner = setTimeout(function () {
      banner.classList.add("oculto");
      if (span) span.textContent = "Margen de ganancia aplicado";
      banner.style.background = "";
    }, 2000);
  }

  // ---------------------------------------------------------
  // _tienePrecioEspecial — detecta si un producto tiene ganancia
  // especial cargada O escalas de precio definidas
  // ---------------------------------------------------------
  function _tienePrecioEspecial(producto) {
    var tieneGananciaEspecial =
      producto.ganancia !== null &&
      producto.ganancia !== undefined &&
      producto.ganancia !== "";
    var tieneEscalas =
      Array.isArray(producto.escalas) && producto.escalas.length > 0;
    return tieneGananciaEspecial || tieneEscalas;
  }

  // ---------------------------------------------------------
  // filtrar
  // ---------------------------------------------------------
  function filtrar() {
    var texto = _searchInput ? _searchInput.value : "";
    var categoria = _categoryFilter ? _categoryFilter.value : "";

    var resultado = ProductService.filtrar(texto, categoria);

    // Aplicar filtro de precio especial si está activo
    if (_filtroEspecial) {
      resultado = resultado.filter(_tienePrecioEspecial);
    }
    // Orden por código (sobrescribe el alfabético del ProductService)
    if (_ordenPorCodigo) {
      resultado = resultado.slice().sort(function (a, b) {
        return (a.codigo || "").localeCompare(b.codigo || "", "es", {
          numeric: true,
          sensitivity: "base",
        });
      });
    }
    EventBus.emit("productos:filtrados", { lista: resultado });

    var lista = document.getElementById("productList");
    if (lista) lista.scrollTop = 0;
    var contenedor =
      document.getElementById("lista-articulos") ||
      document.querySelector(".product-list-container");
    if (contenedor) contenedor.scrollTop = 0;

    // Pista visual: marcar la lista cuando hay categoría filtrada
    if (lista) {
      lista.classList.toggle("filtrando-categoria", categoria !== "");
    }
  }

  // ---------------------------------------------------------
  // limpiar
  // ---------------------------------------------------------
  function limpiar() {
    if (_searchInput) _searchInput.value = "";
    if (_categoryFilter) _categoryFilter.value = "";
    filtrar();
  }

  // ---------------------------------------------------------
  // init
  // ---------------------------------------------------------
  function init() {
    _searchInput = document.getElementById("searchInput");
    _categoryFilter = document.getElementById("categoryFilter");

    if (!_searchInput || !_categoryFilter) {
      console.warn(
        "[SearchModule] No se encontraron los elementos del buscador",
      );
      return;
    }

    _searchInput.addEventListener("input", filtrar);
    _categoryFilter.addEventListener("change", filtrar);

    _searchInput.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();

      var codigo = _searchInput.value.trim();
      if (codigo === "") return;

      _procesarCodigoLector(codigo);
    });

    // Botón filtro precio especial — toggle
    var btnFiltroEspecial = document.getElementById("btnFiltroEspecial");
    if (btnFiltroEspecial) {
      btnFiltroEspecial.addEventListener("click", function () {
        _filtroEspecial = !_filtroEspecial;
        btnFiltroEspecial.classList.toggle("activo", _filtroEspecial);
        filtrar();
      });
    }
    // Botón orden por código / nombre — toggle global (afecta lista general y modo columnas)
    var btnOrdenCodigo = document.getElementById("btnOrdenCodigo");
    if (btnOrdenCodigo) {
      btnOrdenCodigo.addEventListener("click", toggleOrden);
    }
    _actualizarBtnOrden();
    EventBus.on("store:productos:cambiado", filtrar);

    console.info("[SearchModule] iniciado");
  }
  // ---------------------------------------------------------
  // Orden por código / nombre — estado global compartido
  // ---------------------------------------------------------
  function _actualizarBtnOrden() {
    var label = _ordenPorCodigo ? "🔤 Nombre" : "🔢 Código";
    var b1 = document.getElementById("btnOrdenCodigo");
    var b2 = document.getElementById("btnOrdenCodigoModo");
    if (b1) b1.textContent = label;
    if (b2) b2.textContent = label;
  }

  function toggleOrden() {
    _ordenPorCodigo = !_ordenPorCodigo;
    _actualizarBtnOrden();
    EventBus.emit("orden:cambiado", { porCodigo: _ordenPorCodigo });
    filtrar();
  }

  function getOrdenPorCodigo() {
    return _ordenPorCodigo;
  }

  return {
    init: init,
    filtrar: filtrar,
    limpiar: limpiar,
    toggleOrden: toggleOrden,
    getOrdenPorCodigo: getOrdenPorCodigo,
  };
})(App.EventBus, App.ProductService);
