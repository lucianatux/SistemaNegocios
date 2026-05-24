// =============================================================
// PromoModule.js — Sistema de promociones
// =============================================================
// Responsabilidades:
//   - Gestionar el panel lateral de promo
//   - Calcular totales, descuentos y advertencias
//   - Generar y enviar mensaje de WhatsApp
//   - Persistir promo activa en Store
// =============================================================

var App = App || {};

App.PromoModule = (function (EventBus, Store, PriceService) {
  // Estado local del módulo
  var _promo = {
    nombre: "",
    descuento: 0,
    items: [],
  };

  var _infoVendedorVisible = false;

  // Elementos DOM
  var _panel = null;
  var _promoNombreInput = null;
  var _promoDescuentoInput = null;
  var _promoLista = null;
  var _totalSinDescuento = null;
  var _totalAhorro = null;
  var _totalConDescuento = null;
  var _promoWarning = null;
  var _infoVendedor = null;
  var _whatsappModal = null;
  var _mensajePreview = null;

  // Checkboxes del modal WhatsApp
  var _chkSubtotales = null;
  var _chkTotalSinDescuento = null;
  var _chkDescuento = null;
  var _chkAhorro = null;

  // ---------------------------------------------------------
  // abrir / cerrar panel
  // ---------------------------------------------------------
  function abrir() {
    Store.set("modoPromo", true);
    document.body.classList.add("modo-promo");
    document.getElementById("modoTopbarBadge").textContent = "🎁 Promo";

    var colDer = document.getElementById("modoColDer");
    colDer.appendChild(_panel);
    _panel.classList.remove("oculto");
    _panel.style.position = "static";
    _panel.style.width = "100%";
    _panel.style.height = "100%";
    _panel.style.boxShadow = "none";

    App.ModoColumnasModule.iniciarBuscador();
    _restaurarDesdeStore();
    _render();
  }

  function cerrar() {
    Store.set("modoPromo", false);
    document.body.classList.remove("modo-promo");

    var main = document.querySelector("main");
    main.appendChild(_panel);
    _panel.classList.add("oculto");
    _panel.style.position = "";
    _panel.style.width = "";
    _panel.style.height = "";
    _panel.style.boxShadow = "";
  }

  // ---------------------------------------------------------
  // _restaurarDesdeStore
  // ---------------------------------------------------------
  function _restaurarDesdeStore() {
    var guardado = Store.get("promoActual");
    if (guardado && guardado.items) {
      _promo = guardado;
      _promoNombreInput.value = _promo.nombre || "";
      _promoDescuentoInput.value = _promo.descuento || 0;
    }
  }

  // ---------------------------------------------------------
  // _guardarEnStore
  // ---------------------------------------------------------
  function _guardarEnStore() {
    Store.setPromo(_promo);
  }

  // ---------------------------------------------------------
  // agregarProducto
  // ---------------------------------------------------------
  function agregarProducto(producto) {
    var yaExiste = _promo.items.find(function (item) {
      return item.nombre === producto.nombre;
    });
    if (yaExiste) return;

    _promo.items.push({
      nombre: producto.nombre,
      precio: PriceService.calcularConEscalaDesdeStore(producto, 1),
      cantidad: 1,
      costo: producto.costo,
      ganancia:
        producto.ganancia !== null
          ? producto.ganancia
          : Store.get("gananciaGlobal"),
      _producto: producto,
    });

    _guardarEnStore();
    _render();
  }

  // ---------------------------------------------------------
  // _calcularTotales
  // ---------------------------------------------------------
  function _calcularTotalPrecio() {
    return _promo.items.reduce(function (acc, item) {
      return acc + item.precio * item.cantidad;
    }, 0);
  }

  function _calcularTotalCosto() {
    return _promo.items.reduce(function (acc, item) {
      return acc + item.costo * item.cantidad;
    }, 0);
  }

  // ---------------------------------------------------------
  // _actualizarTotales — recalcula y actualiza el DOM del footer
  // ---------------------------------------------------------
  function _actualizarTotales() {
    var totalSin = _calcularTotalPrecio();
    var totalCosto = _calcularTotalCosto();
    var descuento = parseFloat(_promoDescuentoInput.value) || 0;

    _promo.descuento = descuento;

    var maxSeguro = PriceService.calcularDescuentoMaxSeguro(
      totalSin,
      totalCosto,
    );

    _promoWarning.textContent =
      descuento > maxSeguro
        ? "⚠️ Descuento máximo seguro: " + maxSeguro + "%"
        : "";

    var ahorro = Math.round((totalSin * descuento) / 100);
    var totalFin = totalSin - ahorro;

    _totalSinDescuento.textContent = "Total sin descuento: $" + totalSin;
    _totalAhorro.textContent = "Ahorro: $" + ahorro;
    _totalConDescuento.textContent = "Total Precio Promo: $" + totalFin;

    _renderInfoVendedor(totalCosto, totalSin, descuento);
  }

  // ---------------------------------------------------------
  // _renderInfoVendedor
  // ---------------------------------------------------------
  function _renderInfoVendedor(totalCosto, totalSin, descuento) {
    if (!_promo.items.length || !_infoVendedorVisible) {
      _infoVendedor.classList.add("oculto");
      _infoVendedor.innerHTML = "";
      return;
    }

    var ahorro = Math.round((totalSin * descuento) / 100);
    var totalFin = totalSin - ahorro;
    var ganancia = totalFin - totalCosto;
    var margen =
      totalCosto > 0
        ? PriceService.calcularMargenReal(totalCosto, totalFin)
        : 0;

    _infoVendedor.classList.remove("oculto");
    _infoVendedor.innerHTML =
      "<strong>Info para el vendedor</strong>" +
      "<div>Total costo: $" +
      totalCosto +
      "</div>" +
      "<div>Ganancia estimada: $" +
      ganancia +
      "</div>" +
      "<div>Margen real: " +
      margen +
      "%</div>";
  }

  // ---------------------------------------------------------
  // _render — redibuja la lista de items de la promo
  // ---------------------------------------------------------
  function _render() {
    _promoLista.innerHTML = "";

    if (_promo.items.length === 0) {
      _promoLista.innerHTML = "<p>No hay productos en la promo</p>";
      _promoDescuentoInput.value = 0;
      _totalSinDescuento.textContent = "Total sin descuento: $0";
      _totalAhorro.textContent = "Ahorro: $0";
      _totalConDescuento.textContent = "Total Precio Promo: $0";
      _promoWarning.textContent = "";
      _infoVendedor.classList.add("oculto");
      return;
    }

    _promo.items.forEach(function (item, index) {
      var fila = document.createElement("div");
      fila.classList.add("promo-item");

      var nombre = document.createElement("div");
      nombre.classList.add("promo-nombre");
      nombre.textContent = item.nombre;

      var precioUnitario = document.createElement("div");
      precioUnitario.classList.add("promo-precio-unitario");
      precioUnitario.textContent = "Precio unitario: $" + item.precio;

      var cantidad = document.createElement("input");
      cantidad.type = "number";
      cantidad.min = 1;
      cantidad.value = item.cantidad;
      cantidad.classList.add("promo-cantidad");
      function actualizarCantidad() {
        var val = parseInt(cantidad.value) || 1;
        if (val < 1) {
          val = 1;
          cantidad.value = 1;
        }
        _promo.items[index].cantidad = val;
        var prod = _promo.items[index]._producto;
        if (prod && Array.isArray(prod.escalas) && prod.escalas.length > 0) {
          var nuevoPrecio = PriceService.calcularConEscalaDesdeStore(prod, val);
          _promo.items[index].precio = nuevoPrecio;
          precioUnitario.textContent = "Precio unitario: $" + nuevoPrecio;
        }
        subtotal.textContent =
          "Subtotal: $" +
          (_promo.items[index].precio * val).toLocaleString("es-AR");
        _actualizarTotales();
        _guardarEnStore();
      }

      cantidad.addEventListener("input", actualizarCantidad);
      cantidad.addEventListener("change", actualizarCantidad);
      var subtotal = document.createElement("div");
      subtotal.classList.add("promo-subtotal");
      subtotal.textContent = "Subtotal: $" + item.precio * item.cantidad;

      var quitar = document.createElement("button");
      quitar.textContent = "❌";
      quitar.classList.add("promo-quitar");
      quitar.addEventListener("click", function () {
        _promo.items.splice(index, 1);
        _guardarEnStore();
        _render();
      });

      fila.appendChild(nombre);
      fila.appendChild(precioUnitario);
      fila.appendChild(cantidad);
      fila.appendChild(subtotal);
      fila.appendChild(quitar);
      _promoLista.appendChild(fila);
    });

    _actualizarTotales();
  }

  // ---------------------------------------------------------
  // WhatsApp — generar mensaje y abrir modal
  // ---------------------------------------------------------
  function _generarTexto() {
    var texto = "";
    var opciones = {
      subtotales: _chkSubtotales.checked,
      totalSinDescuento: _chkTotalSinDescuento.checked,
      descuento: _chkDescuento.checked,
      ahorro: _chkAhorro.checked,
    };

    if (_promo.nombre) {
      texto +=  _promo.nombre + " \n\n";
    }

    _promo.items.forEach(function (prod) {
      texto += "• " + prod.nombre + " x" + prod.cantidad;
      if (opciones.subtotales) {
        texto += " — $" + prod.precio * prod.cantidad;
      }
      texto += "\n";
    });

    texto += "\n";

    if (opciones.totalSinDescuento) {
      texto += _totalSinDescuento.textContent + "\n";
    }
    if (opciones.descuento) {
      texto += "Descuento: " + (_promo.descuento || 0) + "%\n";
    }
    if (opciones.ahorro) {
      texto += _totalAhorro.textContent + "\n";
    }

    texto += "\n" + _totalConDescuento.textContent;
    return texto;
  }

  function _abrirModalWhatsapp() {
    _panel.classList.add("oculto");
    _whatsappModal.classList.remove("oculto");
    _mensajePreview.value = _generarTexto().normalize("NFC");
  }

  function _cerrarModalWhatsapp() {
    _whatsappModal.classList.add("oculto");
    cerrar();
  }

  function _enviarWhatsapp() {
    var texto = _generarTexto().trim();
    if (!texto) {
      alert("No hay mensaje para enviar");
      return;
    }

    var url = "whatsapp://send?text=" + encodeURIComponent(texto);
    window.open(url, "_blank");
    _cerrarModalWhatsapp();
  }

  // ---------------------------------------------------------
  // init
  // ---------------------------------------------------------
  function init() {
    _panel = document.getElementById("promoPanel");
    _promoNombreInput = document.getElementById("promoNombre");
    _promoDescuentoInput = document.getElementById("promoDescuento");
    _promoLista = document.getElementById("promoLista");
    _totalSinDescuento = document.getElementById("totalSinDescuento");
    _totalAhorro = document.getElementById("totalAhorro");
    _totalConDescuento = document.getElementById("totalConDescuento");
    _promoWarning = document.getElementById("promoWarning");
    _infoVendedor = document.getElementById("infoVendedor");
    _whatsappModal = document.getElementById("whatsappModal");
    _mensajePreview = document.getElementById("mensajePreview");
    _chkSubtotales = document.getElementById("chkSubtotales");
    _chkTotalSinDescuento = document.getElementById("chkTotalSinDescuento");
    _chkDescuento = document.getElementById("chkDescuento");
    _chkAhorro = document.getElementById("chkAhorro");

    // Botones panel
    document.getElementById("btnPromo").addEventListener("click", abrir);
    document.getElementById("cerrarPromo").addEventListener("click", cerrar);
    document
      .getElementById("enviarWhatsapp")
      .addEventListener("click", _abrirModalWhatsapp);

    // Nombre promo
    _promoNombreInput.addEventListener("input", function () {
      _promo.nombre = _promoNombreInput.value.trim();
      _guardarEnStore();
    });

    // Descuento
    _promoDescuentoInput.addEventListener("input", function () {
      _actualizarTotales();
      _guardarEnStore();
    });

    // Info vendedor
    document
      .getElementById("toggleInfoVendedor")
      .addEventListener("click", function () {
        _infoVendedorVisible = !_infoVendedorVisible;
        this.textContent = _infoVendedorVisible
          ? "Ocultar info vendedor"
          : "Mostrar info vendedor";
        _actualizarTotales();
      });

    // Modal WhatsApp
    [_chkSubtotales, _chkTotalSinDescuento, _chkDescuento, _chkAhorro].forEach(
      function (chk) {
        chk.addEventListener("change", function () {
          _mensajePreview.value = _generarTexto();
        });
      },
    );

    document
      .getElementById("copiarWhatsApp")
      .addEventListener("click", _enviarWhatsapp);
    document
      .getElementById("cerrarModal")
      .addEventListener("click", _cerrarModalWhatsapp);

    // Escuchar producto agregado desde la lista
    EventBus.on("promo:agregar-producto", function (datos) {
      agregarProducto(datos.producto);
    });
    // Escuchar limpieza externa (ej: cambio de ganancias)
    EventBus.on("promo:limpiar", function () {
      _promo = { nombre: "", descuento: 0, items: [] };
      _promoNombreInput.value = "";
      _promoDescuentoInput.value = 0;
      _render();
    });
    EventBus.on(
      "promo:agregar-producto-calculado",
      function (productoCalculado) {
        var yaExiste = _promo.items.find(function (item) {
          return item.nombre === productoCalculado.nombre;
        });
        if (yaExiste) return;
        _promo.items.push({
          nombre: productoCalculado.nombre,
          precio: productoCalculado.precio,
          cantidad: 1,
          costo: productoCalculado.costo,
          ganancia: 0,
        });
        _guardarEnStore();
        _render();
      },
    );

    console.info("[PromoModule] iniciado");
  }

  return {
    init: init,
    abrir: abrir,
    cerrar: cerrar,
    agregarProducto: agregarProducto,
  };
})(App.EventBus, App.Store, App.PriceService);
