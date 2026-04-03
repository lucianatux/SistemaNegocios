// =============================================================
// VentasModule.js — Registro de ventas
// =============================================================
// Responsabilidades:
//   - Guardar ventas registradas desde el ticket
//   - Mostrar el panel de registro con estadísticas y listado
//   - Filtrar por período y medio de pago
//   - Permitir borrar ventas individuales
//
// Estructura de una venta:
// {
//   id        : "20260402-001",   string único
//   numero    : 1,                correlativo diario
//   fecha     : "2026-04-02",     string YYYY-MM-DD
//   hora      : "17:42",          string HH:MM
//   items     : [{ nombre, cantidad, precioUnitario, subtotal }],
//   total     : 6200,             número
//   medioPago : "efectivo" | "transferencia"
// }
// =============================================================

var App = App || {};

App.VentasModule = (function (EventBus, Storage) {

  var _ventas      = [];
  var _panelActivo = false;

  // Elementos DOM (se asignan en init)
  var _panel          = null;
  var _listEl         = null;
  var _filtroPeriodo  = null;
  var _filtroMedio    = null;
  var _statHoyCount   = null;
  var _statHoyTotal   = null;
  var _statSemTotal   = null;

  // ---------------------------------------------------------
  // Persistencia
  // ---------------------------------------------------------
  var CLAVE = "tero_ventas";

  function _guardar() {
    Storage.guardar(CLAVE, _ventas);
  }

  function _cargar() {
    var datos = Storage.cargar(CLAVE);
    _ventas = Array.isArray(datos) ? datos : [];
  }

  // ---------------------------------------------------------
  // Helpers de fecha
  // ---------------------------------------------------------
  function _hoy() {
    return new Date().toISOString().slice(0, 10);
  }

  function _inicioSemana() {
    var d = new Date();
    var dia = d.getDay() || 7;
    d.setDate(d.getDate() - dia + 1);
    return d.toISOString().slice(0, 10);
  }

  function _inicioMes() {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-01";
  }

  function _formatearFecha(fechaStr) {
    var p = fechaStr.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  // ---------------------------------------------------------
  // registrar — llamado desde TicketModule
  // ---------------------------------------------------------
  function registrar(items, total, medioPago) {
    var hoy    = _hoy();
    var ahora  = new Date();
    var hora   = String(ahora.getHours()).padStart(2, "0") + ":" +
                 String(ahora.getMinutes()).padStart(2, "0");

    // Correlativo diario
    var ventasHoy = _ventas.filter(function (v) { return v.fecha === hoy; });
    var numero    = ventasHoy.length + 1;

    var venta = {
      id       : hoy + "-" + String(numero).padStart(3, "0"),
      numero   : numero,
      fecha    : hoy,
      hora     : hora,
      items    : items,
      total    : total,
      medioPago: medioPago,
    };

    _ventas.unshift(venta); // más reciente primero
    _guardar();

    EventBus.emit("ventas:registrada", { venta: venta });
    return venta;
  }

  // ---------------------------------------------------------
  // eliminar venta individual
  // ---------------------------------------------------------
  function _eliminar(id) {
    _ventas = _ventas.filter(function (v) { return v.id !== id; });
    _guardar();
    _renderLista();
    _renderStats();
  }

  // ---------------------------------------------------------
  // _ventasFiltradas — aplica filtros de período y medio
  // ---------------------------------------------------------
  function _ventasFiltradas() {
    var periodo = _filtroPeriodo ? _filtroPeriodo.value : "hoy";
    var medio   = _filtroMedio   ? _filtroMedio.value   : "";

    var desde;
    if (periodo === "hoy")    desde = _hoy();
    if (periodo === "semana") desde = _inicioSemana();
    if (periodo === "mes")    desde = _inicioMes();

    return _ventas.filter(function (v) {
      var enPeriodo = !desde || v.fecha >= desde;
      var enMedio   = !medio || v.medioPago === medio;
      return enPeriodo && enMedio;
    });
  }

  // ---------------------------------------------------------
  // _renderStats
  // ---------------------------------------------------------
  function _renderStats() {
    var hoy      = _hoy();
    var semana   = _inicioSemana();

    var ventasHoy = _ventas.filter(function (v) { return v.fecha === hoy; });
    var totalHoy  = ventasHoy.reduce(function (a, v) { return a + v.total; }, 0);

    var ventasSem = _ventas.filter(function (v) { return v.fecha >= semana; });
    var totalSem  = ventasSem.reduce(function (a, v) { return a + v.total; }, 0);

    if (_statHoyCount) _statHoyCount.textContent = ventasHoy.length;
    if (_statHoyTotal) _statHoyTotal.textContent = "$" + totalHoy.toLocaleString("es-AR");
    if (_statSemTotal) _statSemTotal.textContent = "$" + totalSem.toLocaleString("es-AR");
  }

  // ---------------------------------------------------------
  // _renderLista
  // ---------------------------------------------------------
  function _renderLista() {
    if (!_listEl) return;
    _listEl.innerHTML = "";

    var lista = _ventasFiltradas();

    if (lista.length === 0) {
      _listEl.innerHTML = "<p class='ventas-vacio'>No hay ventas en este período</p>";
      return;
    }

    lista.forEach(function (venta) {
      var card = document.createElement("div");
      card.classList.add("venta-card");

      var badgeClass = venta.medioPago === "efectivo" ? "badge-efectivo" : "badge-transferencia";
      var badgeText  = venta.medioPago === "efectivo" ? "Efectivo" : "Transferencia";
      var fechaFmt   = _formatearFecha(venta.fecha);

      // Header de la tarjeta
      var header = document.createElement("div");
      header.classList.add("venta-card-header");
      header.innerHTML =
        '<div class="venta-card-izq">' +
          '<span class="venta-num">#' + String(venta.numero).padStart(3, "0") + '</span>' +
          '<span class="venta-meta"> · ' + fechaFmt + ' ' + venta.hora + '</span>' +
        '</div>' +
        '<div class="venta-card-der">' +
          '<span class="venta-badge ' + badgeClass + '">' + badgeText + '</span>' +
          '<span class="venta-total">$' + venta.total.toLocaleString("es-AR") + '</span>' +
          '<button class="venta-toggle" data-id="' + venta.id + '">▶</button>' +
        '</div>';

      // Detalle de la tarjeta (oculto por defecto)
      var detalle = document.createElement("div");
      detalle.classList.add("venta-card-detalle", "oculto");

      var itemsHTML = venta.items.map(function (item) {
        return '<div class="venta-item">' +
          '<span>' + item.nombre + ' x' + item.cantidad + '</span>' +
          '<span>$' + item.subtotal.toLocaleString("es-AR") + '</span>' +
        '</div>';
      }).join("");

      var btnEliminar =
        '<div class="venta-acciones">' +
          '<button class="btn-venta-eliminar" data-id="' + venta.id + '">🗑️ Eliminar venta</button>' +
        '</div>';

      detalle.innerHTML = itemsHTML + btnEliminar;

      // Toggle expandir/colapsar
      header.querySelector(".venta-toggle").addEventListener("click", function () {
        var abierto = !detalle.classList.contains("oculto");
        detalle.classList.toggle("oculto", abierto);
        this.textContent = abierto ? "▶" : "▼";
      });

      // Eliminar venta
      detalle.querySelector(".btn-venta-eliminar").addEventListener("click", function () {
        if (confirm("¿Eliminar esta venta? Esta acción no se puede deshacer.")) {
          _eliminar(this.dataset.id);
        }
      });

      card.appendChild(header);
      card.appendChild(detalle);
      _listEl.appendChild(card);
    });
  }

  // ---------------------------------------------------------
  // abrir / cerrar panel
  // ---------------------------------------------------------
  function abrir() {
    _panelActivo = true;
    _panel.classList.remove("oculto");
    _renderStats();
    _renderLista();
  }

  function cerrar() {
    _panelActivo = false;
    _panel.classList.add("oculto");
  }

  // ---------------------------------------------------------
  // init
  // ---------------------------------------------------------
  function init() {
    _cargar();

    _panel         = document.getElementById("ventasPanel");
    _listEl        = document.getElementById("ventasLista");
    _filtroPeriodo = document.getElementById("ventaFiltroPeriodo");
    _filtroMedio   = document.getElementById("ventaFiltroMedio");
    _statHoyCount  = document.getElementById("ventaStatCount");
    _statHoyTotal  = document.getElementById("ventaStatHoy");
    _statSemTotal  = document.getElementById("ventaStatSemana");

    // Botón sidebar
    document.getElementById("btnVentas")
      .addEventListener("click", abrir);

    // Botón cerrar panel
    document.getElementById("cerrarVentas")
      .addEventListener("click", cerrar);

    // Filtros
    if (_filtroPeriodo) _filtroPeriodo.addEventListener("change", function () {
      _renderStats();
      _renderLista();
    });
    if (_filtroMedio) _filtroMedio.addEventListener("change", _renderLista);

    // Escuchar registro desde TicketModule
    EventBus.on("ventas:registrar", function (datos) {
      registrar(datos.items, datos.total, datos.medioPago);
    });

    console.info("[VentasModule] iniciado");
  }

  return {
    init      : init,
    abrir     : abrir,
    cerrar    : cerrar,
    registrar : registrar,
  };

})(App.EventBus, App.Storage);