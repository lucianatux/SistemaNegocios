// =============================================================
// Store.js — Estado centralizado de la aplicación
// =============================================================
// Regla: nadie modifica el estado directamente.
// Todo cambio pasa por Store.set() y Store.setProductos().
//
// Uso:
//   App.Store.get("modoTicket")           → leer un valor
//   App.Store.set("modoTicket", true)     → escribir y notificar
//   App.Store.getProductos()              → leer lista completa
//   App.Store.setProductos([...])         → reemplazar lista completa
//   App.Store.getAll()                    → snapshot completo (solo lectura)
//
// Eventos emitidos automáticamente al cambiar:
//   "store:productos:cambiado"     → { productos }
//   "store:modoTicket:cambiado"    → { valor }
//   "store:modoPromo:cambiado"     → { valor }
//   "store:ganancia:cambiado"      → { gananciaGlobal, gananciasPorCategoria }
//   "store:<clave>:cambiado"       → { valor }  (para cualquier otra clave)
// =============================================================

var App = App || {};

App.Store = (function (EventBus, Storage) {
  // ---------------------------------------------------------
  // Estado interno — solo se accede vía get() y set()
  // ---------------------------------------------------------
  var _state = {
    // ---- Catálogo ----
    productos: [],

    // ---- Precios ----
    gananciaGlobal: 0,
    gananciasPorCategoria: {},

    // ---- Modos de UI ----
    // Determina qué botones aparecen en cada producto de la lista
    modoTicket: false,
    modoPromo: false,

    // ---- Editor de producto ----
    // "crear" | "editar" | null
    modoEditor: null,
    productoEditando: null,

    // ---- Confirmaciones ----
    // { tipo, producto } | null
    accionPendiente: null,

    // ---- Promo ----
    promoActual: {
      nombre: "",
      descuento: 0,
      items: [],
    },

    // ---- Ticket ----
    ticketActual: {
      items: [],
    },

    stockData: {}, // { "codigo-producto": { stock: 10, stockMinimo: 5 } }

    // ---- UI varios ----
    infoVendedorVisible: false,
  };

  // ---------------------------------------------------------
  // Inicializar desde Storage
  // Carga datos persistidos. El resto del estado arranca en default.
  // ---------------------------------------------------------
  function inicializar() {
    var datos = Storage.cargarDatos();

    if (datos) {
      _state.productos = datos.productos || [];
      _state.gananciaGlobal = datos.gananciaGlobal || 0;
      _state.gananciasPorCategoria = datos.gananciasPorCategoria || {};
      _state.stockData = datos.stockData || {};
    } else {
      // Primera vez: cargar datos iniciales desde data.js
      if (typeof DATA !== "undefined") {
        _state.productos = DATA.productos || [];
        _state.gananciaGlobal = DATA.configuracion.gananciaGlobal || 0;
      }
    }

    var promo = Storage.cargarPromo();
    if (promo) {
      _state.promoActual = promo;
    }

    var ticket = Storage.cargarTicket();
    if (ticket) {
      _state.ticketActual = ticket;
    }

    // Ordenar alfabéticamente al arrancar
    _ordenarProductos();
  }

  // ---------------------------------------------------------
  // Helpers internos
  // ---------------------------------------------------------
  function _ordenarProductos() {
    _state.productos.sort(function (a, b) {
      return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
    });
  }

  function _persistirDatos() {
    Storage.guardarDatos({
      productos: _state.productos,
      gananciaGlobal: _state.gananciaGlobal,
      gananciasPorCategoria: _state.gananciasPorCategoria,
      stockData: _state.stockData,
    });
  }

  // ---------------------------------------------------------
  // get — Leer cualquier valor del estado
  // ---------------------------------------------------------
  function get(clave) {
    if (!(clave in _state)) {
      console.warn("[Store] Clave desconocida: '" + clave + "'");
      return undefined;
    }
    return _state[clave];
  }

  // ---------------------------------------------------------
  // set — Escribir un valor y notificar el cambio
  // ---------------------------------------------------------
  function set(clave, valor) {
    if (!(clave in _state)) {
      console.warn("[Store] Clave desconocida: '" + clave + "'");
      return;
    }

    _state[clave] = valor;
    EventBus.emit("store:" + clave + ":cambiado", { valor: valor });
  }

  // ---------------------------------------------------------
  // getProductos / setProductos — API dedicada para el catálogo
  // setProductos ordena, persiste y notifica en un solo paso.
  // ---------------------------------------------------------
  function getProductos() {
    return _state.productos;
  }

  function setProductos(lista) {
    _state.productos = lista;
    _ordenarProductos();
    _persistirDatos();
    EventBus.emit("store:productos:cambiado", { productos: _state.productos });
  }

  // ---------------------------------------------------------
  // agregarProducto / actualizarProducto / eliminarProducto
  // Operaciones atómicas sobre el catálogo.
  // ---------------------------------------------------------
  function agregarProducto(producto) {
    _state.productos.push(producto);
    _ordenarProductos();
    _persistirDatos();
    EventBus.emit("store:productos:cambiado", { productos: _state.productos });
  }

  function actualizarProducto(productoOriginal, cambios) {
    var index = _state.productos.indexOf(productoOriginal);
    if (index === -1) {
      console.warn("[Store] actualizarProducto: producto no encontrado");
      return;
    }
    Object.assign(_state.productos[index], cambios);
    _ordenarProductos();
    _persistirDatos();
    EventBus.emit("store:productos:cambiado", { productos: _state.productos });
  }

  function eliminarProducto(producto) {
    _state.productos = _state.productos.filter(function (p) {
      return p !== producto;
    });
    _persistirDatos();
    EventBus.emit("store:productos:cambiado", { productos: _state.productos });
  }

  // ---------------------------------------------------------
  // setGanancia — Actualiza márgenes y persiste
  // ---------------------------------------------------------
  function setGanancia(global, porCategoria) {
    _state.gananciaGlobal = global;
    _state.gananciasPorCategoria = porCategoria || {};
    _persistirDatos();
    EventBus.emit("store:ganancia:cambiado", {
      gananciaGlobal: _state.gananciaGlobal,
      gananciasPorCategoria: _state.gananciasPorCategoria,
    });
  }

  // ---------------------------------------------------------
  // setPromo — Actualiza promo y persiste
  // ---------------------------------------------------------
  function setPromo(promoActual) {
    _state.promoActual = promoActual;
    Storage.guardarPromo(promoActual);
    EventBus.emit("store:promoActual:cambiado", { valor: promoActual });
  }

  // ---------------------------------------------------------
  // setTicket — Actualiza ticket y persiste
  // ---------------------------------------------------------
  function setTicket(ticketActual) {
    _state.ticketActual = ticketActual;
    Storage.guardarTicket(ticketActual);
    EventBus.emit("store:ticketActual:cambiado", { valor: ticketActual });
  }

  // ---------------------------------------------------------
  // getAll — Snapshot de solo lectura (para debug o módulos futuros)
  // Devuelve una copia para no exponer el estado interno.
  // ---------------------------------------------------------
  function getAll() {
    return JSON.parse(JSON.stringify(_state));
  }

  // API pública
  // inicializar() se llama desde main.js, después de que data.js cargó.
  return {
    inicializar: inicializar,
    get: get,
    set: set,
    getAll: getAll,
    getProductos: getProductos,
    setProductos: setProductos,
    agregarProducto: agregarProducto,
    actualizarProducto: actualizarProducto,
    eliminarProducto: eliminarProducto,
    setGanancia: setGanancia,
    setPromo: setPromo,
    setTicket: setTicket,
    getStock: function (codigo) {
      return _state.stockData[codigo] || null;
    },
    setStock: function (codigo, datos) {
      _state.stockData[codigo] = datos;
      _persistirDatos();
      EventBus.emit("store:stock:cambiado", { codigo: codigo, datos: datos });
    },
    getStockData: function () {
      return _state.stockData;
    },
  };
})(App.EventBus, App.Storage);
