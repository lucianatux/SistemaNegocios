// =============================================================
// VentasModule.js — Registro de ventas
// =============================================================

var App = App || {};

App.VentasModule = (function (EventBus, Storage) {
  var _ventas = [];
  var _panelActivo = false;
  var _periodoActivo = "hoy";

  var _panel = null;
  var _listEl = null;
  var _filtroMedio = null;
  var _statCount = null;
  var _statTotal = null;
  var _statGanancia = null;
  var _statMargen = null;
  var _desgloseEfMonto = null;
  var _desgloseEfCount = null;
  var _desgloseTriMonto = null;
  var _desgloseTriCount = null;
  var _barraEf = null;
  var _barratr = null;

  var CLAVE = "tero_ventas";

  function _guardar() {
    Storage.guardar(CLAVE, _ventas);
  }
  function _cargar() {
    var datos = Storage.cargar(CLAVE);
    _ventas = Array.isArray(datos) ? datos : [];
  }

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
    return (
      d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01"
    );
  }

  function _formatearFecha(fechaStr) {
    var p = fechaStr.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  function _desdeParaPeriodo(periodo) {
    if (periodo === "hoy") return _hoy();
    if (periodo === "semana") return _inicioSemana();
    if (periodo === "mes") return _inicioMes();
    return null;
  }

  function _ventasDelPeriodo(periodo) {
    var desde = _desdeParaPeriodo(periodo);
    return _ventas.filter(function (v) {
      return !desde || v.fecha >= desde;
    });
  }

  function _ventasFiltradas() {
    var medio = _filtroMedio ? _filtroMedio.value : "";
    return _ventasDelPeriodo(_periodoActivo).filter(function (v) {
      return !medio || v.medioPago === medio;
    });
  }

  // ---------------------------------------------------------
  // registrar
  // ---------------------------------------------------------
  function registrar(datos) {
    var items = datos.items;
    var total = datos.total;
    var medioPago = datos.medioPago;
    var hoy = _hoy();
    var ahora = new Date();
    var hora =
      String(ahora.getHours()).padStart(2, "0") +
      ":" +
      String(ahora.getMinutes()).padStart(2, "0");

    var ventasHoy = _ventas.filter(function (v) {
      return v.fecha === hoy;
    });
    var numero = ventasHoy.length + 1;

    var venta = {
      id: hoy + "-" + String(numero).padStart(3, "0"),
      numero: numero,
      fecha: hoy,
      hora: hora,
      items: items,
      total: total,
      medioPago: medioPago,
      clienteId: datos.clienteId || null,
      clienteNombre: datos.clienteNombre || null,
    };

    _ventas.unshift(venta);
    _guardar();
    EventBus.emit("ventas:registrada", { venta: venta });
    return venta;
  }

  // ---------------------------------------------------------
  // eliminar
  // ---------------------------------------------------------
  function _eliminar(id) {
    _ventas = _ventas.filter(function (v) {
      return v.id !== id;
    });
    _guardar();
    _renderTodo();
  }

  // ---------------------------------------------------------
  // _calcularStats — sobre un array de ventas
  // ---------------------------------------------------------
  function _calcularStats(lista) {
    var total = lista.reduce(function (a, v) {
      return a + v.total;
    }, 0);
    var costo = lista.reduce(function (a, v) {
      return (
        a +
        v.items.reduce(function (b, item) {
          return b + (item.costo || 0) * item.cantidad;
        }, 0)
      );
    }, 0);
    var ganancia = total - Math.round(costo);
    var margen = total > 0 ? Math.round((ganancia / total) * 100) : 0;
    return {
      count: lista.length,
      total: total,
      ganancia: ganancia,
      margen: margen,
    };
  }

  // ---------------------------------------------------------
  // _renderStats
  // ---------------------------------------------------------
  function _renderStats() {
    var lista = _ventasDelPeriodo(_periodoActivo);
    var stats = _calcularStats(lista);

    if (_statCount) _statCount.textContent = stats.count;
    if (_statTotal)
      _statTotal.textContent = "$" + stats.total.toLocaleString("es-AR");
    if (_statGanancia)
      _statGanancia.textContent = "$" + stats.ganancia.toLocaleString("es-AR");
    if (_statMargen) _statMargen.textContent = stats.margen + "%";

    // Desglose por medio
    var ef = lista.filter(function (v) {
      return v.medioPago === "efectivo";
    });
    var tr = lista.filter(function (v) {
      return v.medioPago === "transferencia";
    });
    var mEf = ef.reduce(function (a, v) {
      return a + v.total;
    }, 0);
    var mTr = tr.reduce(function (a, v) {
      return a + v.total;
    }, 0);
    var tot = mEf + mTr || 1;

    if (_desgloseEfMonto)
      _desgloseEfMonto.textContent = "$" + mEf.toLocaleString("es-AR");
    if (_desgloseEfCount)
      _desgloseEfCount.textContent =
        ef.length + (ef.length === 1 ? " venta" : " ventas");
    if (_desgloseTriMonto)
      _desgloseTriMonto.textContent = "$" + mTr.toLocaleString("es-AR");
    if (_desgloseTriCount)
      _desgloseTriCount.textContent =
        tr.length + (tr.length === 1 ? " venta" : " ventas");
    if (_barraEf) _barraEf.style.width = Math.round((mEf / tot) * 100) + "%";
    if (_barratr) _barratr.style.width = Math.round((mTr / tot) * 100) + "%";
  }

  // ---------------------------------------------------------
  // _renderLista
  // ---------------------------------------------------------
  function _renderLista() {
    if (!_listEl) return;
    _listEl.innerHTML = "";

    var lista = _ventasFiltradas();

    if (lista.length === 0) {
      _listEl.innerHTML =
        "<p class='ventas-vacio'>No hay ventas en este período</p>";
      return;
    }

    lista.forEach(function (venta) {
      var card = document.createElement("div");
      card.classList.add("venta-card");

      var badgeClass =
        venta.medioPago === "efectivo"
          ? "badge-efectivo"
          : "badge-transferencia";
      var badgeText =
        venta.medioPago === "efectivo" ? "Efectivo" : "Transferencia";
      var fechaFmt = _formatearFecha(venta.fecha);

      var header = document.createElement("div");
      header.classList.add("venta-card-header");
      header.innerHTML =
        '<div class="venta-card-izq">' +
        '<span class="venta-meta"> · ' +
        fechaFmt +
        " " +
        venta.hora +
        (venta.clienteNombre ? " · 👤 " + venta.clienteNombre : "") +
        "</span>" +
        "</div>" +
        '<div class="venta-card-der">' +
        '<span class="venta-badge ' +
        badgeClass +
        '">' +
        badgeText +
        "</span>" +
        '<span class="venta-total">$' +
        venta.total.toLocaleString("es-AR") +
        "</span>" +
        '<button class="venta-toggle" data-id="' +
        venta.id +
        '">▶</button>' +
        "</div>";

      var detalle = document.createElement("div");
      detalle.classList.add("venta-card-detalle", "oculto");

      var itemsHTML = venta.items
        .map(function (item) {
          return (
            '<div class="venta-item">' +
            "<span>" +
            item.nombre +
            " x" +
            item.cantidad +
            "</span>" +
            "<span>$" +
            item.subtotal.toLocaleString("es-AR") +
            "</span>" +
            "</div>"
          );
        })
        .join("");

      detalle.innerHTML =
        itemsHTML +
        '<div class="venta-acciones">' +
        '<button class="btn-venta-eliminar" data-id="' +
        venta.id +
        '">🗑️ Eliminar venta</button>' +
        "</div>";

      header
        .querySelector(".venta-toggle")
        .addEventListener("click", function () {
          var abierto = !detalle.classList.contains("oculto");
          detalle.classList.toggle("oculto", abierto);
          this.textContent = abierto ? "▶" : "▼";
        });

      detalle
        .querySelector(".btn-venta-eliminar")
        .addEventListener("click", function () {
          if (
            confirm("¿Eliminar esta venta? Esta acción no se puede deshacer.")
          ) {
            _eliminar(this.dataset.id);
          }
        });

      card.appendChild(header);
      card.appendChild(detalle);
      _listEl.appendChild(card);
    });
  }

  function _renderTodo() {
    _renderStats();
    _renderLista();
  }

  // ---------------------------------------------------------
  // abrir / cerrar
  // ---------------------------------------------------------
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
    _cargar();

    _panel = document.getElementById("ventasPanel");
    _listEl = document.getElementById("ventasLista");
    _filtroMedio = document.getElementById("ventaFiltroMedio");
    _statCount = document.getElementById("ventaStatCount");
    _statTotal = document.getElementById("ventaStatHoy");
    _statGanancia = document.getElementById("ventaStatGanancia");
    _statMargen = document.getElementById("ventaStatMargen");
    _desgloseEfMonto = document.getElementById("desgloseEfectivoMonto");
    _desgloseEfCount = document.getElementById("desgloseEfectivoCount");
    _desgloseTriMonto = document.getElementById("desgloseTransferenciaMonto");
    _desgloseTriCount = document.getElementById("desgloseTransferenciaCount");
    _barraEf = document.getElementById("barraEfectivo");
    _barratr = document.getElementById("barraTransferencia");

    document.getElementById("btnVentas").addEventListener("click", abrir);
    document.getElementById("cerrarVentas").addEventListener("click", cerrar);

    // Tabs de período
    document.querySelectorAll(".ventas-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".ventas-tab").forEach(function (t) {
          t.classList.remove("activo");
        });
        this.classList.add("activo");
        _periodoActivo = this.dataset.periodo;
        _renderTodo();
      });
    });

    if (_filtroMedio) _filtroMedio.addEventListener("change", _renderLista);

    EventBus.on("ventas:registrar", function (datos) {
      registrar(datos);
    });

    // Actualizar stats si el panel está abierto cuando se registra una venta
    EventBus.on("ventas:registrada", function () {
      if (_panelActivo) _renderTodo();
    });

    // Importar ventas desde backup completo
    EventBus.on("ventas:importadas", function (datos) {
      _ventas = Array.isArray(datos.ventas) ? datos.ventas : [];
      _guardar();
      if (_panelActivo) _renderTodo();
    });

    console.info("[VentasModule] iniciado");
  }

  return { init: init, abrir: abrir, cerrar: cerrar, registrar: registrar, getVentas: function() { return _ventas; }, };
})(App.EventBus, App.Storage);