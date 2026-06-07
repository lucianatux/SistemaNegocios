// =============================================================
// EtiquetasModule.js — Generación e impresión de etiquetas
// =============================================================

var App = App || {};

App.EtiquetasModule = (function (EventBus, Store) {
  var _panel = null;
  var _listaEl = null;
  var _buscador = null;
  var _categoriaSelect = null;
  var _contador = null;
  var _seleccionados = {}; // { codigo: cantidad }
  var _busqueda = "";
  var _categoria = "";

  // ---------------------------------------------------------
  // _productosFiltrados
  // ---------------------------------------------------------
  function _productosFiltrados() {
    var productos = Store.getProductos();
    var busq = _busqueda.toLowerCase();

    return productos.filter(function (p) {
      var coincideTexto =
        !busq ||
        p.nombre.toLowerCase().includes(busq) ||
        p.codigo.toLowerCase().includes(busq);
      var coincideCat =
        !_categoria || p.categoria.toLowerCase() === _categoria.toLowerCase();
      return coincideTexto && coincideCat;
    });
  }

  // ---------------------------------------------------------
  // _actualizarContador
  // ---------------------------------------------------------
  function _actualizarContador() {
    var total = Object.keys(_seleccionados).length;
    if (_contador) {
      _contador.textContent =
        total === 0
          ? "0 productos seleccionados"
          : total +
            " producto" +
            (total === 1 ? "" : "s") +
            " seleccionado" +
            (total === 1 ? "" : "s");
    }
  }

  // ---------------------------------------------------------
  // _renderLista
  // ---------------------------------------------------------
  function _renderLista() {
    if (!_listaEl) return;
    _listaEl.innerHTML = "";

    var lista = _productosFiltrados();

    if (lista.length === 0) {
      _listaEl.innerHTML = "<p class='ventas-vacio'>No hay productos</p>";
      return;
    }

    lista.forEach(function (producto) {
      var estaSeleccionado = !!_seleccionados[producto.codigo];

      var fila = document.createElement("div");
      fila.classList.add("etiqueta-item");
      if (estaSeleccionado) fila.classList.add("seleccionada");

      var check = document.createElement("input");
      check.type = "checkbox";
      check.checked = estaSeleccionado;

      var info = document.createElement("div");
      info.classList.add("etiqueta-item-info");
      info.innerHTML =
        '<div class="etiqueta-item-nombre">' +
        producto.nombre +
        "</div>" +
        '<div class="etiqueta-item-meta">Código: ' +
        producto.codigo +
        " · " +
        producto.categoria +
        "</div>";

      var cantWrap = document.createElement("div");
      cantWrap.classList.add("etiqueta-cantidad-wrap");
      cantWrap.innerHTML =
        "<label>Copias:</label>" +
        '<input type="number" class="etiqueta-cantidad" min="1" max="21" value="' +
        (_seleccionados[producto.codigo] || 1) +
        '" />';

      var cantInput = cantWrap.querySelector(".etiqueta-cantidad");

      // Toggle selección al hacer click en la fila o el checkbox
      function toggleSeleccion() {
        if (_seleccionados[producto.codigo]) {
          delete _seleccionados[producto.codigo];
          fila.classList.remove("seleccionada");
          check.checked = false;
        } else {
          _seleccionados[producto.codigo] = parseInt(cantInput.value) || 1;
          fila.classList.add("seleccionada");
          check.checked = true;
        }
        _actualizarContador();
      }

      fila.addEventListener("click", function (e) {
        if (e.target === cantInput) return; // no toggle si clickea el input de cantidad
        toggleSeleccion();
      });

      cantInput.addEventListener("click", function (e) {
        e.stopPropagation();
      });

      cantInput.addEventListener("change", function () {
        var val = parseInt(cantInput.value) || 1;
        if (val < 1) val = 1;
        cantInput.value = val;
        if (_seleccionados[producto.codigo] !== undefined) {
          _seleccionados[producto.codigo] = val;
        }
      });

      fila.appendChild(check);
      fila.appendChild(info);
      fila.appendChild(cantWrap);
      _listaEl.appendChild(fila);
    });
  }

  // ---------------------------------------------------------
  // _generarEImprimirEtiquetas
  // ---------------------------------------------------------
  function _generarEImprimirEtiquetas() {
    var codigos = Object.keys(_seleccionados);

    if (codigos.length === 0) {
      alert("Seleccioná al menos un producto");
      return;
    }

    if (typeof JsBarcode === "undefined") {
      alert(
        "Error: no se encontró la librería de códigos de barras. Verificá que JsBarcode.all.min.js está en app/libs/",
      );
      return;
    }

    var productos = Store.getProductos();
    var contenedor = document.getElementById("etiquetasImprimir");
    contenedor.innerHTML = "";

    var hoja = document.createElement("div");
    hoja.classList.add("hoja-etiquetas");

    codigos.forEach(function (codigo) {
      var cantidad = _seleccionados[codigo] || 1;
      var producto = productos.find(function (p) {
        return p.codigo === codigo;
      });
      if (!producto) return;

      for (var i = 0; i < cantidad; i++) {
        var etiqueta = document.createElement("div");
        etiqueta.classList.add("etiqueta-print");

        // SVG para el código de barras
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        etiqueta.appendChild(svg);

        try {
          JsBarcode(svg, producto.codigo, {
            format: "CODE128",
            width: 1.5,
            height: 40,
            displayValue: false,
            margin: 0,
          });
        } catch (err) {
          // Código inválido para CODE128 → mostrar solo texto
          svg.remove();
          var sinBarcode = document.createElement("div");
          sinBarcode.style.cssText =
            "font-size:8pt;color:#aaa;text-align:center;padding:4mm 0";
          sinBarcode.textContent = "(sin código de barras)";
          etiqueta.appendChild(sinBarcode);
        }

        // Nombre truncado
        var nombre = document.createElement("div");
        nombre.classList.add("etiqueta-print-nombre");
        nombre.textContent = producto.nombre;

        // Código legible
        var codTexto = document.createElement("div");
        codTexto.classList.add("etiqueta-print-codigo");
        codTexto.textContent = producto.codigo;

        etiqueta.appendChild(nombre);
        etiqueta.appendChild(codTexto);
        hoja.appendChild(etiqueta);
      }
    });

    contenedor.appendChild(hoja);

    // Ocultar todo el body excepto el contenedor de etiquetas
    var elementosOcultar = document.querySelectorAll(
      "header, footer, .sidebar, #buscador, #lista-articulos, " +
        ".ticket-panel, .promo-panel, .ventas-panel, nav",
    );

    // Guardar displays originales
    var displays = [];
    elementosOcultar.forEach(function (el) {
      displays.push(el.style.display);
      el.style.display = "none";
    });

    // Mostrar contenedor
    contenedor.style.display = "block";
    contenedor.style.position = "fixed";
    contenedor.style.top = "0";
    contenedor.style.left = "0";
    contenedor.style.width = "100%";
    contenedor.style.background = "white";
    contenedor.style.zIndex = "99999";

    setTimeout(function () {
      window.print();

      // Restaurar todo
      elementosOcultar.forEach(function (el, i) {
        el.style.display = displays[i];
      });
      contenedor.style.display = "none";
      contenedor.innerHTML = "";
      contenedor.style.position = "";
      contenedor.style.top = "";
      contenedor.style.left = "";
      contenedor.style.width = "";
      contenedor.style.zIndex = "";
      contenedor.style.background = "";
    }, 500);
  }

  // ---------------------------------------------------------
  // abrir / cerrar
  // ---------------------------------------------------------
  function abrir() {
    _panel.classList.remove("oculto");
    _renderLista();
    _actualizarContador();
  }

  function cerrar() {
    _panel.classList.add("oculto");
  }

  // ---------------------------------------------------------
  // init
  // ---------------------------------------------------------
  function init() {
    _panel = document.getElementById("etiquetasPanel");
    _listaEl = document.getElementById("etiquetasLista");
    _buscador = document.getElementById("etiquetaBuscador");
    _categoriaSelect = document.getElementById("etiquetaCategoria");
    _contador = document.getElementById("etiquetasSeleccionadas");

    document.getElementById("btnEtiquetas").addEventListener("click", abrir);
    document
      .getElementById("cerrarEtiquetas")
      .addEventListener("click", cerrar);

    _buscador.addEventListener("input", function () {
      _busqueda = this.value;
      _renderLista();
    });

    _categoriaSelect.addEventListener("change", function () {
      _categoria = this.value;
      _renderLista();
    });

    document
      .getElementById("btnSeleccionarTodos")
      .addEventListener("click", function () {
        var lista = _productosFiltrados();
        lista.forEach(function (p) {
          if (!_seleccionados[p.codigo]) {
            _seleccionados[p.codigo] = 1;
          }
        });
        _renderLista();
        _actualizarContador();
      });

    document
      .getElementById("btnDeseleccionarTodos")
      .addEventListener("click", function () {
        _seleccionados = {};
        _renderLista();
        _actualizarContador();
      });

    document
      .getElementById("btnImprimirEtiquetas")
      .addEventListener("click", _generarEImprimirEtiquetas);

    console.info("[EtiquetasModule] iniciado");
  }

  return { init: init, abrir: abrir, cerrar: cerrar };
})(App.EventBus, App.Store);
