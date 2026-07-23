// =============================================================
// PesajeModule.js — Modal de pesaje para productos a granel
// =============================================================
// Dos modos:
//   - Gramos: el usuario ingresa gramos → se calcula el precio
//   - Monto:  el usuario ingresa $ → se calculan los gramos (inversa)
//             Con escalas: se elige la opción más favorable (más gramos)
//
// Escalas en productos por peso:
//   El umbral (cantidadMinima) se interpreta en GRAMOS. Ej: una escala
//   "desde 500" significa "a partir de 500 gramos". Tanto el modo gramos
//   como el modo monto aplican la escala que corresponde al peso resultante.
// =============================================================

var App = App || {};

App.PesajeModule = (function (EventBus, PriceService, Store) {
  var _modal          = null;
  var _inputGr        = null;
  var _inputMonto     = null;
  var _resultado      = null;
  var _productoActual = null;
  var _destinoActual  = null;
  var _modoActual     = "gramos"; // "gramos" | "monto"

  // ---------------------------------------------------------
  // _tieneEscalas — el producto actual define escalas de precio
  // ---------------------------------------------------------
  function _tieneEscalas() {
    return (
      _productoActual &&
      Array.isArray(_productoActual.escalas) &&
      _productoActual.escalas.length > 0
    );
  }

  // ---------------------------------------------------------
  // _precioPor100g — precio por 100g según el Store, APLICANDO la
  // escala que corresponde a los gramos pesados.
  // Si el producto no tiene escalas, calcularConEscalaDesdeStore cae
  // automáticamente en el cálculo base, así que es seguro usarla siempre.
  // ---------------------------------------------------------
  function _precioPor100g(gramos) {
    return PriceService.calcularConEscalaDesdeStore(_productoActual, gramos || 1);
  }

  // ---------------------------------------------------------
  // _calcularGramosDesMonto — lógica inversa con escalas
  // Devuelve los gramos (redondeados hacia arriba) que
  // corresponden a un monto dado, eligiendo la opción más
  // favorable al cliente cuando hay varias soluciones válidas.
  // ---------------------------------------------------------
  function _calcularGramosDesMonto(monto) {
    if (!_productoActual || monto <= 0) return null;

    var producto              = _productoActual;
    var gananciaGlobal        = Store.get("gananciaGlobal");
    var gananciasPorCategoria = Store.get("gananciasPorCategoria");

    // Sin escalas → cálculo directo
    if (!Array.isArray(producto.escalas) || producto.escalas.length === 0) {
      var precio100g = PriceService.calcular(producto, gananciaGlobal, gananciasPorCategoria);
      if (precio100g <= 0) return null;
      return Math.ceil((monto * 100) / precio100g);
    }

    // Con escalas: probar cada escala por separado.
    var escalasOrdenadas = producto.escalas
      .slice()
      .sort(function (a, b) { return a.cantidadMinima - b.cantidadMinima; });

    var soluciones = [];

    escalasOrdenadas.forEach(function (escala) {
      var margen     = escala.margen !== undefined ? escala.margen : 0;
      // Mismo redondeo que cobra el resto de la app (el paso depende de
      // la categoría), para que los gramos calculados reconcilien con el
      // precio real.
      var precio100g = PriceService.redondearPrecio(
        producto.costo + (producto.costo * margen) / 100,
        producto.categoria
      );
      if (precio100g <= 0) return;

      var gramos = Math.ceil((monto * 100) / precio100g);

      var escalaQueAplica = escalasOrdenadas
        .slice()
        .reverse()
        .find(function (e) { return gramos >= e.cantidadMinima; });

      if (!escalaQueAplica) escalaQueAplica = escalasOrdenadas[0];

      if (escalaQueAplica.cantidadMinima === escala.cantidadMinima) {
        soluciones.push({ gramos: gramos, precio100g: precio100g });
      }
    });

    if (soluciones.length === 0) {
      var precioBase = PriceService.calcular(producto, gananciaGlobal, gananciasPorCategoria);
      return precioBase > 0 ? Math.ceil((monto * 100) / precioBase) : null;
    }

    soluciones.sort(function (a, b) { return b.gramos - a.gramos; });
    return soluciones[0].gramos;
  }

  // ---------------------------------------------------------
  // _calcular — reacciona al input activo
  // ---------------------------------------------------------
  function _calcular() {
    if (_modoActual === "gramos") {
      var gramos = parseFloat(_inputGr.value) || 0;
      if (gramos <= 0) { _resultado.textContent = ""; return; }
      // El precio por 100g depende del peso cuando hay escalas.
      var precio100g = _precioPor100g(gramos);
      var total = Math.round((precio100g * gramos) / 100);
      _resultado.textContent = gramos + "g → $" + total.toLocaleString("es-AR");

    } else {
      var monto = parseFloat(_inputMonto.value) || 0;
      if (monto <= 0) { _resultado.textContent = ""; return; }
      var gr = _calcularGramosDesMonto(monto);
      if (!gr) { _resultado.textContent = ""; return; }
      // Muestra gramos redondeados arriba, precio = monto exacto ingresado
      _resultado.textContent = "$" + monto.toLocaleString("es-AR") + " → " + gr + "g";
    }
  }

  // ---------------------------------------------------------
  // _cambiarModo
  // ---------------------------------------------------------
  function _cambiarModo(modo) {
    _modoActual = modo;
    _resultado.textContent = "";

    if (modo === "gramos") {
      document.getElementById("pesajeCampoGramos").classList.remove("oculto");
      document.getElementById("pesajeCampoMonto").classList.add("oculto");
      _inputMonto.value = "";
      _inputGr.value    = "";
      _inputGr.focus();
    } else {
      document.getElementById("pesajeCampoGramos").classList.add("oculto");
      document.getElementById("pesajeCampoMonto").classList.remove("oculto");
      _inputGr.value    = "";
      _inputMonto.value = "";
      _inputMonto.focus();
    }
  }

  // ---------------------------------------------------------
  // abrir
  // ---------------------------------------------------------
  function abrir(producto, destino) {
    _productoActual = producto;
    _destinoActual  = destino;

    // Con escalas el precio por 100g varía según el peso, así que
    // mostramos el de la escala mínima como precio "desde".
    var hayEscalas = _tieneEscalas();
    var precio100g = _precioPor100g(1);
    document.getElementById("pesajeNombre").textContent    = "⚖️ " + producto.nombre;
    document.getElementById("pesajePrecioRef").textContent =
      (hayEscalas ? "Precio: desde $" : "Precio: $") + precio100g + " por 100g";

    var radioGramos = _modal.querySelector('input[name="pesajeModo"][value="gramos"]');
    if (radioGramos) radioGramos.checked = true;
    _cambiarModo("gramos");

    _modal.classList.remove("oculto");
  }

  // ---------------------------------------------------------
  // _confirmar
  // ---------------------------------------------------------
  function _confirmar() {
    var gramos, total;

    if (_modoActual === "gramos") {
      gramos = parseFloat(_inputGr.value) || 0;
      if (gramos <= 0) { alert("Ingresá un peso válido"); return; }
      // El precio por 100g depende del peso cuando hay escalas.
      var precio100g = _precioPor100g(gramos);
      total = Math.round((precio100g * gramos) / 100);

    } else {
      // El precio en el ticket es el monto exacto que ingresó el cliente.
      // Los gramos se redondean arriba para no cobrar de más.
      total  = parseFloat(_inputMonto.value) || 0;
      if (total <= 0) { alert("Ingresá un monto válido"); return; }
      gramos = _calcularGramosDesMonto(total);
      if (!gramos) { alert("No se pudo calcular el peso"); return; }
    }

    var productoCalculado = {
      nombre  : _productoActual.nombre + " " + gramos + "g",
      precio  : total,
      cantidad: 1,
      costo   : ((_productoActual.costo || 0) * gramos) / 100,
      // El nombre lleva los gramos pegados y ya no coincide con el del
      // catálogo, así que la categoría tiene que viajar con el ítem.
      categoria: _productoActual.categoria || null,
      codigo   : _productoActual.codigo || null,
    };

    if (_destinoActual === "ticket") {
      EventBus.emit("ticket:agregar-producto-calculado", productoCalculado);
    } else {
      EventBus.emit("promo:agregar-producto-calculado", productoCalculado);
    }

    _modal.classList.add("oculto");
  }

  // ---------------------------------------------------------
  // init
  // ---------------------------------------------------------
  function init() {
    _modal      = document.getElementById("modalPesaje");
    _inputGr    = document.getElementById("pesajeGramos");
    _inputMonto = document.getElementById("pesajeMonto");
    _resultado  = document.getElementById("pesajeResultado");

    _inputGr.addEventListener("input", _calcular);
    _inputMonto.addEventListener("input", _calcular);

    _modal.querySelectorAll('input[name="pesajeModo"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        _cambiarModo(this.value);
      });
    });

    document.getElementById("confirmarPesaje")
      .addEventListener("click", _confirmar);
    document.getElementById("cerrarModalPesaje")
      .addEventListener("click", function () {
        _modal.classList.add("oculto");
      });

    EventBus.on("pesaje:abrir", function (datos) {
      abrir(datos.producto, datos.destino);
    });

    console.info("[PesajeModule] iniciado");
  }

  return { init: init, abrir: abrir };
})(App.EventBus, App.PriceService, App.Store);