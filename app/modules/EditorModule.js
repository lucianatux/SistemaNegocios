// =============================================================
// EditorModule.js — Alta y edición de productos
// =============================================================
// Responsabilidades:
//   - Abrir/cerrar el overlay del editor
//   - Mostrar/ocultar overlay de confirmación
//   - Delegar guardar/eliminar a ProductService
//   - Actualizar precio público en tiempo real
//   - Gestionar tabla de escalas de precio por cantidad
// =============================================================

var App = App || {};

App.EditorModule = (function (EventBus, Store, ProductService, PriceService) {
  // Estado interno del módulo
  var _modoEditor = null; // "crear" | "editar"
  var _productoEditando = null;
  var _accionPendiente = null; // { tipo, producto }

  // Escalas en edición — array de { cantidadMinima, margen }
  var _escalas = [];

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
  var _escalasTabla = null;

  // ---------------------------------------------------------
  // _unidadEscala — devuelve "g" o "u." según el producto
  // ---------------------------------------------------------
  function _unidadEscala() {
    var chk = document.getElementById("editPorPeso");
    return chk && chk.checked ? "g" : "u.";
  }

  // ---------------------------------------------------------
  // _precioParaEscala — calcula precio unitario para una fila
  // ---------------------------------------------------------
  function _precioParaEscala(margen) {
    var costo = parseFloat(_inputCosto.value);
    if (isNaN(costo) || isNaN(margen)) return "-";
    return "$ " + Math.ceil(costo + (costo * margen) / 100);
  }

  // ---------------------------------------------------------
  // _renderEscalas — redibuja la tabla de escalas
  // ---------------------------------------------------------
  function _renderEscalas() {
    if (!_escalasTabla) return;
    _escalasTabla.innerHTML = "";

    var unidad = _unidadEscala();

    if (_escalas.length === 0) {
      _escalasTabla.innerHTML =
        "<p class='escalas-vacio'>Sin escalas definidas. El producto usa el margen de arriba.</p>";
      return;
    }

    // Cabecera
    var cab = document.createElement("div");
    cab.classList.add("escala-fila", "escala-cabecera");
    cab.innerHTML =
      "<span>Cant. mín. (" +
      unidad +
      ")</span>" +
      "<span>Margen %</span>" +
      "<span>Precio unitario</span>" +
      "<span></span>";
    _escalasTabla.appendChild(cab);

    _escalas.forEach(function (escala, idx) {
      var fila = document.createElement("div");
      fila.classList.add("escala-fila");

      // Input cantidad mínima
      var inputCant = document.createElement("input");
      inputCant.type = "number";
      inputCant.min = "1";
      inputCant.classList.add("escala-input");
      inputCant.value =
        escala.cantidadMinima !== undefined ? escala.cantidadMinima : "";
      inputCant.placeholder = "ej: 10";
      inputCant.addEventListener("input", function () {
        _escalas[idx].cantidadMinima = parseFloat(this.value) || 0;
        _actualizarPrecioPublico();
      });

      // Input margen
      var inputMargen = document.createElement("input");
      inputMargen.type = "number";
      inputMargen.min = "0";
      inputMargen.classList.add("escala-input");
      inputMargen.value = escala.margen !== undefined ? escala.margen : "";
      inputMargen.placeholder = "ej: 50";

      // Precio calculado en tiempo real
      var spanPrecio = document.createElement("span");
      spanPrecio.classList.add("escala-precio");
      spanPrecio.textContent = _precioParaEscala(escala.margen);

      inputMargen.addEventListener("input", function () {
        var val = parseFloat(this.value);
        _escalas[idx].margen = isNaN(val) ? 0 : val;
        spanPrecio.textContent = _precioParaEscala(_escalas[idx].margen);
        _actualizarPrecioPublico();
      });

      // Botón eliminar
      var btnElim = document.createElement("button");
      btnElim.type = "button";
      btnElim.classList.add("escala-btn-eliminar");
      btnElim.textContent = "✕";
      btnElim.title = "Eliminar escala";
      btnElim.addEventListener("click", function () {
        _escalas.splice(idx, 1);
        _renderEscalas();
      });

      fila.appendChild(inputCant);
      fila.appendChild(inputMargen);
      fila.appendChild(spanPrecio);
      fila.appendChild(btnElim);
      _escalasTabla.appendChild(fila);
    });
  }

  // ---------------------------------------------------------
  // _actualizarPreciosEscalas — refresca precios al cambiar costo
  // ---------------------------------------------------------
  function _actualizarPreciosEscalas() {
    if (!_escalasTabla) return;
    var spans = _escalasTabla.querySelectorAll(".escala-precio");
    spans.forEach(function (span, idx) {
      if (_escalas[idx] !== undefined) {
        span.textContent = _precioParaEscala(_escalas[idx].margen);
      }
    });
    // También actualizar cabecera de unidad si cambió por/peso
    _renderEscalas();
  }

  // ---------------------------------------------------------
  // _actualizarPrecioPublico — recalcula en tiempo real
  // ---------------------------------------------------------
  function _actualizarPrecioPublico() {
    var costo = parseFloat(_inputCosto.value);
    var ganancia =
      _inputGanancia.value === "" ? null : parseFloat(_inputGanancia.value);

    if (isNaN(costo)) {
      _precioPublico.textContent = "-";
      _actualizarPreciosEscalas();
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

    // Si hay escalas, mostrar el precio de la escala mínima
    if (_escalas.length > 0) {
      var escalaMin = _escalas.reduce(function (min, e) {
        return e.cantidadMinima < min.cantidadMinima ? e : min;
      });
      var precioEscala = _precioParaEscala(escalaMin.margen);
      _precioPublico.textContent =
        precioEscala !== "-" ? precioEscala : "$ " + precio;
    } else {
      _precioPublico.textContent = "$ " + precio;
    }
    _actualizarPreciosEscalas();
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
      _escalas = [];
      _renderEscalas();
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
      var stockInfo = App.StockModule
        ? App.StockModule.getStock(producto.codigo)
        : null;
      document.getElementById("editStock").value =
        stockInfo && stockInfo.stock != null ? stockInfo.stock : "";
      document.getElementById("editStockMinimo").value =
        stockInfo && stockInfo.stockMinimo != null ? stockInfo.stockMinimo : "";

      // Cargar escalas — retrocompatible: si no existe el campo, array vacío
      _escalas =
        producto.escalas && Array.isArray(producto.escalas)
          ? producto.escalas.map(function (e) {
              return { cantidadMinima: e.cantidadMinima, margen: e.margen };
            })
          : [];
      _renderEscalas();
      _actualizarPrecioPublico();
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
    _escalas = [];
  }

  // ---------------------------------------------------------
  // _guardar — valida y delega a ProductService
  // ---------------------------------------------------------
  function _guardar() {
    // Normalizar escalas: filtrar filas incompletas y ordenar
    var escalasValidas = _escalas
      .filter(function (e) {
        return e.cantidadMinima > 0 && e.margen >= 0;
      })
      .sort(function (a, b) {
        return a.cantidadMinima - b.cantidadMinima;
      });

    var datos = {
      nombre: _inputNombre.value,
      codigo: _inputCodigo.value,
      categoria: _inputCategoria.value,
      costo: _inputCosto.value,
      ganancia: _inputGanancia.value,
      porPeso: document.getElementById("editPorPeso").checked,
      // Solo guardar el campo si hay escalas definidas; si no, undefined
      // (retrocompatibilidad: productos sin escalas no tienen el campo)
      escalas: escalasValidas.length > 0 ? escalasValidas : undefined,
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
    _escalasTabla = document.getElementById("escalasTabla");

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

    // Botón agregar escala
    document
      .getElementById("btnAgregarEscala")
      .addEventListener("click", function () {
        _escalas.push({ cantidadMinima: "", margen: "" });
        _renderEscalas();
        // Hacer foco en el último input de cantidad
        var inputs = _escalasTabla.querySelectorAll(".escala-input");
        if (inputs.length) inputs[inputs.length - 2].focus();
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
        // Actualizar la cabecera de unidad en escalas
        _renderEscalas();
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
