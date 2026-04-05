// =============================================================
// StockModule.js — Gestión de stock e inventario
// =============================================================

var App = App || {};

App.StockModule = (function (EventBus, Store) {

  var _panelActivo    = false;
  var _filtroActivo   = "todos";
  var _busqueda       = "";
  var _codigoEditando = null;

  var _panel    = null;
  var _listaEl  = null;

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------
  function _getStock(codigo) {
    return Store.getStock(codigo);
  }

  function _unidad(producto) {
    return producto.porPeso ? "g" : "u.";
  }

  function _esBajo(stockInfo) {
    if (!stockInfo || stockInfo.stock === null) return false;
    if (stockInfo.stockMinimo === null || stockInfo.stockMinimo === undefined) return false;
    return stockInfo.stock <= stockInfo.stockMinimo;
  }

  // ---------------------------------------------------------
  // _renderStats
  // ---------------------------------------------------------
  function _renderStats() {
    var productos  = Store.getProductos();
    var definidos  = 0;
    var bajos      = 0;
    var sinDefinir = 0;

    productos.forEach(function (p) {
      var s = _getStock(p.codigo);
      if (!s || s.stock === null || s.stock === undefined) {
        sinDefinir++;
      } else {
        definidos++;
        if (_esBajo(s)) bajos++;
      }
    });

    document.getElementById("stockStatDefinido").textContent  = definidos;
    document.getElementById("stockStatBajo").textContent      = bajos;
    document.getElementById("stockStatSinDefinir").textContent = sinDefinir;
  }

  // ---------------------------------------------------------
  // _productosFiltrados
  // ---------------------------------------------------------
  function _productosFiltrados() {
    var productos = Store.getProductos();
    var busq      = _busqueda.toLowerCase();

    return productos.filter(function (p) {
      var s = _getStock(p.codigo);
      var tieneStock = s && (s.stock !== null && s.stock !== undefined);

      if (busq && !p.nombre.toLowerCase().includes(busq) &&
          !p.codigo.toLowerCase().includes(busq)) return false;

      if (_filtroActivo === "bajo")  return tieneStock && _esBajo(s);
      if (_filtroActivo === "sin")   return !tieneStock;
      return true;
    });
  }

  // ---------------------------------------------------------
  // _renderLista
  // ---------------------------------------------------------
  function _renderLista() {
    if (!_listaEl) return;
    _listaEl.innerHTML = "";

    var lista = _productosFiltrados();

    if (lista.length === 0) {
      _listaEl.innerHTML = "<p class='ventas-vacio'>No hay productos en esta vista</p>";
      return;
    }

    // Agrupar por estado
    var bajos      = lista.filter(function (p) { return _esBajo(_getStock(p.codigo)); });
    var ok         = lista.filter(function (p) {
      var s = _getStock(p.codigo);
      return s && s.stock !== null && !_esBajo(s);
    });
    var sinDefinir = lista.filter(function (p) {
      var s = _getStock(p.codigo);
      return !s || s.stock === null || s.stock === undefined;
    });

    function _renderGrupo(titulo, items) {
      if (items.length === 0) return;
      var sep = document.createElement("div");
      sep.classList.add("stock-separador");
      sep.textContent = titulo;
      _listaEl.appendChild(sep);
      items.forEach(_renderItem);
    }

    _renderGrupo("⚠️ Stock bajo", bajos);
    _renderGrupo("✅ Stock OK", ok);
    _renderGrupo("— Sin stock definido", sinDefinir);
  }

  function _renderItem(producto) {
    var s        = _getStock(producto.codigo);
    var tieneStock = s && s.stock !== null && s.stock !== undefined;
    var unidad   = _unidad(producto);

    var fila = document.createElement("div");
    fila.classList.add("stock-item");

    // Info
    var info = document.createElement("div");
    info.classList.add("stock-item-info");
    info.innerHTML =
      '<div class="stock-item-nombre">' + producto.nombre + '</div>' +
      '<div class="stock-item-meta">Cód: ' + producto.codigo +
        ' · ' + producto.categoria +
        (producto.porPeso ? ' · ⚖️ granel' : '') +
      '</div>';

    // Badge stock
    var badge = document.createElement("span");
    badge.classList.add("stock-badge");
    if (!tieneStock) {
      badge.classList.add("sin");
      badge.textContent = "sin stock";
    } else if (_esBajo(s)) {
      badge.classList.add("bajo");
      badge.textContent = "⚠️ " + s.stock + " " + unidad;
    } else {
      badge.classList.add("ok");
      badge.textContent = "✅ " + s.stock + " " + unidad;
    }

    // Mínimo
    var minimo = document.createElement("span");
    minimo.classList.add("stock-minimo");
    minimo.textContent = (tieneStock && s.stockMinimo != null)
      ? "mín: " + s.stockMinimo + " " + unidad
      : "";

    // Acciones
    var acciones = document.createElement("div");
    acciones.classList.add("stock-acciones");

    if (tieneStock) {
      var btnReponer = document.createElement("button");
      btnReponer.classList.add("btn-stock", "verde");
      btnReponer.textContent = "+ Reponer";
      btnReponer.addEventListener("click", function () {
        _abrirModalReposicion(producto);
      });
      acciones.appendChild(btnReponer);
    }

    var btnEditar = document.createElement("button");
    btnEditar.classList.add("btn-stock", "neutro");
    btnEditar.textContent = tieneStock ? "✏️" : "+ Definir";
    btnEditar.addEventListener("click", function () {
      _abrirModalEditar(producto);
    });
    acciones.appendChild(btnEditar);

    fila.appendChild(info);
    fila.appendChild(badge);
    fila.appendChild(minimo);
    fila.appendChild(acciones);
    _listaEl.appendChild(fila);
  }

  // ---------------------------------------------------------
  // Modales
  // ---------------------------------------------------------
  function _abrirModalReposicion(producto) {
    _codigoEditando = producto.codigo;
    var s = _getStock(producto.codigo);
    var unidad = _unidad(producto);

    document.getElementById("reposicionNombre").textContent =
      "Reponer: " + producto.nombre;
    document.getElementById("reposicionActual").textContent =
      "Stock actual: " + (s ? s.stock : 0) + " " + unidad;
    document.getElementById("reposicionUnidad").textContent =
      "Ingresá la cantidad a sumar (" + unidad + ")";
    document.getElementById("reposicionCantidad").value = "";
    document.getElementById("modalReposicion").classList.remove("oculto");
    document.getElementById("reposicionCantidad").focus();
  }

  function _confirmarReposicion() {
    var cantidad = parseFloat(document.getElementById("reposicionCantidad").value) || 0;
    if (cantidad <= 0) { alert("Ingresá una cantidad válida"); return; }

    var s = _getStock(_codigoEditando) || { stock: 0, stockMinimo: null };
    Store.setStock(_codigoEditando, {
      stock      : (s.stock || 0) + cantidad,
      stockMinimo: s.stockMinimo,
    });

    document.getElementById("modalReposicion").classList.add("oculto");
    _renderTodo();
  }

  function _abrirModalEditar(producto) {
    _codigoEditando = producto.codigo;
    var s = _getStock(producto.codigo);

    document.getElementById("editarStockNombre").textContent =
      producto.nombre;
    document.getElementById("editarStockActual").value =
      (s && s.stock != null) ? s.stock : "";
    document.getElementById("editarStockMinimo").value =
      (s && s.stockMinimo != null) ? s.stockMinimo : "";
    document.getElementById("modalEditarStock").classList.remove("oculto");
    document.getElementById("editarStockActual").focus();
  }

  function _confirmarEditarStock() {
    var stockVal  = document.getElementById("editarStockActual").value;
    var minimoVal = document.getElementById("editarStockMinimo").value;

    Store.setStock(_codigoEditando, {
      stock      : stockVal  !== "" ? parseFloat(stockVal)  : null,
      stockMinimo: minimoVal !== "" ? parseFloat(minimoVal) : null,
    });

    document.getElementById("modalEditarStock").classList.add("oculto");
    _renderTodo();
  }

  // ---------------------------------------------------------
  // Descuento automático al registrar venta
  // ---------------------------------------------------------
  function _descontarStockDeVenta(items) {
    items.forEach(function (item) {
      var producto = Store.getProductos().find(function (p) {
        return p.nombre === item.nombre ||
               p.nombre + " " === item.nombre.substring(0, p.nombre.length + 1);
      });

      if (!producto) {
        // Intentar matching para productos pesados (ej: "Cacao 250g")
        Store.getProductos().forEach(function (p) {
          if (item.nombre.startsWith(p.nombre + " ")) {
            producto = p;
          }
        });
      }

      if (!producto) return;

      var s = _getStock(producto.codigo);
      if (!s || s.stock === null || s.stock === undefined) return;

      var cantidad = item.cantidad;

      // Para productos por peso, la cantidad ya viene en gramos
      var nuevoStock = Math.max(0, (s.stock || 0) - cantidad);
      Store.setStock(producto.codigo, {
        stock      : nuevoStock,
        stockMinimo: s.stockMinimo,
      });
    });
  }

  // ---------------------------------------------------------
  // abrir / cerrar / render
  // ---------------------------------------------------------
  function _renderTodo() {
    _renderStats();
    _renderLista();
    EventBus.emit("stock:actualizado");
  }

  function abrir() {
    _panelActivo = true;
    _panel.classList.remove("oculto");
    _renderTodo();
  }

  function cerrar() {
    _panelActivo = false;
    _panel.classList.add("oculto");
  }

  // ---------------------------------------------------------
  // init
  // ---------------------------------------------------------
  function init() {
    _panel   = document.getElementById("stockPanel");
    _listaEl = document.getElementById("stockLista");

    document.getElementById("btnStock")
      .addEventListener("click", abrir);
    document.getElementById("cerrarStock")
      .addEventListener("click", cerrar);

    // Buscador
    document.getElementById("stockBuscador").addEventListener("input", function () {
      _busqueda = this.value;
      _renderLista();
    });

    // Filtros
    document.querySelectorAll(".stock-filtro-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".stock-filtro-btn")
          .forEach(function (b) { b.classList.remove("activo"); });
        this.classList.add("activo");
        _filtroActivo = this.dataset.filtro;
        _renderLista();
      });
    });

    // Modal reposición
    document.getElementById("confirmarReposicion")
      .addEventListener("click", _confirmarReposicion);
    document.getElementById("cerrarModalReposicion")
      .addEventListener("click", function () {
        document.getElementById("modalReposicion").classList.add("oculto");
      });

    // Modal editar stock
    document.getElementById("confirmarEditarStock")
      .addEventListener("click", _confirmarEditarStock);
    document.getElementById("cerrarModalEditarStock")
      .addEventListener("click", function () {
        document.getElementById("modalEditarStock").classList.add("oculto");
      });

    // Descontar stock al registrar venta
    EventBus.on("ventas:registrada", function (datos) {
      _descontarStockDeVenta(datos.venta.items);
      if (_panelActivo) _renderTodo();
    });

    // Actualizar lista si cambia el stock (desde editor)
    EventBus.on("store:stock:cambiado", function () {
      if (_panelActivo) _renderTodo();
    });

    console.info("[StockModule] iniciado");
  }

  return {
    init          : init,
    abrir         : abrir,
    cerrar        : cerrar,
    getStock      : _getStock,
    esBajo        : _esBajo,
  };

})(App.EventBus, App.Store);