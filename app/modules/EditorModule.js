// =============================================================
// EditorModule.js — Alta y edición de productos
// =============================================================
// Responsabilidades:
//   - Abrir/cerrar el overlay del editor
//   - Mostrar/ocultar overlay de confirmación
//   - Delegar guardar/eliminar a ProductService
//   - Actualizar precio público en tiempo real
// =============================================================

var App = App || {};

App.EditorModule = (function (EventBus, Store, ProductService, PriceService) {
  // Estado interno del módulo
  var _modoEditor = null; // "crear" | "editar"
  var _productoEditando = null;
  var _accionPendiente = null; // { tipo, producto }

  // Elementos DOM
  var _overlay = null;
  var _overlayConfirmacion = null;
  var _inputNombre = null;
  var _inputCodigo = null;
  var _inputCategoria = null;
  var _inputCosto = null;
  var _inputGanancia = null;
  var _precioPublico = null;
  var _tituloEditor = null;
  var _tituloConfirmacion = null;
  var _textoConfirmacion = null;
  var _inputPorPeso = null;
  var _labelCosto = null;

  // ---------------------------------------------------------
  // _actualizarPrecioPublico — recalcula en tiempo real
  // ---------------------------------------------------------
  function _actualizarPrecioPublico() {
    var costo = parseFloat(_inputCosto.value);
    var ganancia =
      _inputGanancia.value === "" ? null : parseFloat(_inputGanancia.value);

    if (isNaN(costo)) {
      _precioPublico.textContent = "-";
      return;
    }

    var productoTemp = {
      costo: costo,
      ganancia: ganancia,
      categoria: _inputCategoria.value,
    };

    var precio = PriceService.calcular(
      productoTemp,
      Store.get("gananciaGlobal"),
      Store.get("gananciasPorCategoria"),
    );

    _precioPublico.textContent = "$ " + precio;
  }

  // ---------------------------------------------------------
  // abrirEditor
  // ---------------------------------------------------------
  function abrirEditor(modo, producto) {
    _modoEditor = modo;
    _productoEditando = producto || null;

    if (modo === "crear") {
      _tituloEditor.textContent = "Nuevo producto";
      _inputNombre.value = "";
      _inputCodigo.value = "";
      _inputCategoria.value = "";
      _inputCosto.value = "";
      _inputGanancia.value = "";
      _precioPublico.textContent = "-";
      document.getElementById("editPorPeso").checked = false;
      document.getElementById("labelCosto").textContent = "Costo";
      document.getElementById("editStock").value = "";
      document.getElementById("editStockMinimo").value = "";
    }

    if (modo === "editar" && producto) {
      _tituloEditor.textContent = "Editando: " + producto.nombre;
      _inputNombre.value = producto.nombre;
      _inputCodigo.value = producto.codigo;
      _inputCategoria.value = producto.categoria;
      _inputCosto.value = producto.costo;
      _inputGanancia.value =
        producto.ganancia !== null ? producto.ganancia : "";
      var esPorPeso = producto.porPeso === true;
      document.getElementById("editPorPeso").checked = esPorPeso;
      document.getElementById("labelCosto").textContent = esPorPeso
        ? "Costo por gramo"
        : "Costo";
      _actualizarPrecioPublico();
      var stockInfo = App.StockModule
        ? App.StockModule.getStock(producto.codigo)
        : null;
      document.getElementById("editStock").value =
        stockInfo && stockInfo.stock != null ? stockInfo.stock : "";
      document.getElementById("editStockMinimo").value =
        stockInfo && stockInfo.stockMinimo != null ? stockInfo.stockMinimo : "";
    }

    _overlay.classList.remove("oculto");
  }

  // ---------------------------------------------------------
  // cerrarEditor
  // ---------------------------------------------------------
  function cerrarEditor() {
    _overlay.classList.add("oculto");
    _modoEditor = null;
    _productoEditando = null;
  }

  // ---------------------------------------------------------
  // _guardar — valida y delega a ProductService
  // ---------------------------------------------------------
  function _guardar() {
    var datos = {
      nombre: _inputNombre.value,
      codigo: _inputCodigo.value,
      categoria: _inputCategoria.value,
      costo: _inputCosto.value,
      ganancia: _inputGanancia.value,
      porPeso: document.getElementById("editPorPeso").checked,
    };

    var resultado;

    if (_modoEditor === "crear") {
      resultado = ProductService.agregar(datos);
    }

    if (_modoEditor === "editar") {
      resultado = ProductService.actualizar(_productoEditando, datos);
    }

    var stockVal = document.getElementById("editStock").value;
    var minimoVal = document.getElementById("editStockMinimo").value;
    var codigo = document.getElementById("editCodigo").value.trim();

    if (App.StockModule && codigo) {
      App.Store.setStock(codigo, {
        stock: stockVal !== "" ? parseFloat(stockVal) : null,
        stockMinimo: minimoVal !== "" ? parseFloat(minimoVal) : null,
      });
    }

    if (!resultado.ok) {
      alert(resultado.error);
      return;
    }

    cerrarEditor();
  }

  // ---------------------------------------------------------
  // Confirmación — abrir / cerrar / confirmar
  // ---------------------------------------------------------
  function abrirConfirmacion(tipo, producto) {
    _accionPendiente = { tipo: tipo, producto: producto };

    _tituloConfirmacion.classList.remove("titulo-peligro");

    if (tipo === "editar") {
      _tituloConfirmacion.textContent = "Editar producto";
      _textoConfirmacion.textContent =
        '¿Querés editar el producto "' + producto.nombre + '"?';
    }

    if (tipo === "eliminar") {
      _tituloConfirmacion.textContent = "Eliminar producto";
      _textoConfirmacion.textContent =
        '¿Seguro que querés eliminar "' +
        producto.nombre +
        '"? Esta acción no se puede deshacer.';
      _tituloConfirmacion.classList.add("titulo-peligro");
    }

    if (tipo === "importar") {
      _tituloConfirmacion.textContent = "Importar datos";
      _textoConfirmacion.textContent =
        "⚠️ Esto reemplazará todos los productos actuales. ¿Querés continuar?";
    }

    _overlayConfirmacion.classList.remove("oculto");
  }

  function _cerrarConfirmacion() {
    _overlayConfirmacion.classList.add("oculto");
    _accionPendiente = null;
  }

  function _confirmar() {
    if (!_accionPendiente) return;
    var tipo = _accionPendiente.tipo;
    var producto = _accionPendiente.producto;

    if (tipo === "editar") {
      abrirEditor("editar", producto);
    }

    if (tipo === "eliminar") {
      ProductService.eliminar(producto);
      EventBus.emit("busqueda:limpiar");
    }

    if (tipo === "importar") {
      EventBus.emit("producto:importar:confirmar");
    }

    _cerrarConfirmacion();
  }

  // ---------------------------------------------------------
  // init
  // ---------------------------------------------------------
  function init() {
    _overlay = document.getElementById("editorProducto");
    _overlayConfirmacion = document.getElementById("overlayConfirmacion");
    _inputNombre = document.getElementById("editNombre");
    _inputCodigo = document.getElementById("editCodigo");
    _inputCategoria = document.getElementById("editCategoria");
    _inputCosto = document.getElementById("editCosto");
    _inputGanancia = document.getElementById("editGanancia");
    _precioPublico = document.getElementById("editPrecioPublico");
    _tituloEditor = document.getElementById("productoEditando");
    _tituloConfirmacion = document.getElementById("confirmacionTitulo");
    _textoConfirmacion = document.getElementById("confirmacionTexto");

    // Precio público en tiempo real
    _inputCosto.addEventListener("input", _actualizarPrecioPublico);
    _inputGanancia.addEventListener("input", _actualizarPrecioPublico);
    _inputCategoria.addEventListener("change", _actualizarPrecioPublico);

    // Botones del editor
    document
      .getElementById("cerrarEditor")
      .addEventListener("click", cerrarEditor);
    document
      .getElementById("cancelarEdicion")
      .addEventListener("click", cerrarEditor);
    document
      .getElementById("guardarProducto")
      .addEventListener("click", _guardar);
    document
      .getElementById("btnAgregarProducto")
      .addEventListener("click", function () {
        abrirEditor("crear");
      });

    // Botones de confirmación
    document
      .getElementById("confirmarAccion")
      .addEventListener("click", _confirmar);
    document
      .getElementById("cancelarConfirmacion")
      .addEventListener("click", _cerrarConfirmacion);

    // Escuchar pedidos de confirmación desde la lista de productos
    EventBus.on("editor:confirmar", function (datos) {
      abrirConfirmacion(datos.tipo, datos.producto);
    });

    // Escuchar pedido de confirmación de importación
    EventBus.on("producto:importar:pedir-confirmacion", function () {
      abrirConfirmacion("importar", null);
    });

    document
      .getElementById("editPorPeso")
      .addEventListener("change", function () {
        document.getElementById("labelCosto").textContent = this.checked
          ? "Costo por gramo"
          : "Costo";
        _actualizarPrecioPublico();
      });

    console.info("[EditorModule] iniciado");
  }

  return {
    init: init,
    abrirEditor: abrirEditor,
    cerrarEditor: cerrarEditor,
    abrirConfirmacion: abrirConfirmacion,
  };
})(App.EventBus, App.Store, App.ProductService, App.PriceService);
