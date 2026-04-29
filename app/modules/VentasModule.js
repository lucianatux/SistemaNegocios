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
  var _filtroCliente = null;
  var _anioSeleccionado = new Date().getFullYear();
  var _nombresMeses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];

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
    // Período mes específico: "mes-2025-04"
    if (periodo && periodo.startsWith("mes-")) {
      var mesStr = periodo.slice(4); // "2025-04"
      return _ventas.filter(function (v) {
        return v.fecha.startsWith(mesStr);
      });
    }
    var desde = _desdeParaPeriodo(periodo);
    return _ventas.filter(function (v) {
      return !desde || v.fecha >= desde;
    });
  }

  function _ventasFiltradas() {
    var medio = _filtroMedio ? _filtroMedio.value : "";
    var clienteId = _filtroCliente ? _filtroCliente.value : "";
    return _ventasDelPeriodo(_periodoActivo).filter(function (v) {
      var okMedio = !medio || v.medioPago === medio;
      var okCliente = !clienteId || v.clienteId === clienteId;
      return okMedio && okCliente;
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
      ajustes: datos.ajustes || null,
      soloHistorial: datos.soloHistorial || false,
      contarVenta: datos.contarVenta || false,
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
    // Bug 2: fiados totales (soloHistorial) no se contabilizan
    var contables = lista.filter(function (v) {
      return !v.soloHistorial;
    });
    var total = contables.reduce(function (a, v) {
      return a + v.total;
    }, 0);
    var costo = contables.reduce(function (a, v) {
      return (
        a +
        v.items.reduce(function (b, item) {
          return b + (item.costo || 0) * item.cantidad;
        }, 0)
      );
    }, 0);
    var ganancia = total - Math.round(costo);
    var margenVenta = total > 0 ? Math.round((ganancia / total) * 100) : 0;
    var markupCosto = costo > 0 ? Math.round((ganancia / costo) * 100) : 0;
    return {
      count: lista.filter(function (v) {
        return v.contarVenta;
      }).length,
      total: total,
      ganancia: ganancia,
      markup: markupCosto,
      margen: margenVenta,
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
    if (_statMargen) _statMargen.textContent = stats.markup + "%";
    var subMargen = document.getElementById("ventaStatMargenVenta");
    if (subMargen)
      subMargen.textContent = "Margen sobre venta: " + stats.margen + "%";

    // Desglose por medio — excluir fiados (soloHistorial)
    var contables = lista.filter(function (v) {
      return !v.soloHistorial;
    });
    var ef = contables.filter(function (v) {
      return v.medioPago === "efectivo";
    });
    var tr = contables.filter(function (v) {
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

      // Bug 2: badge según medio (incluyendo fiado)
      var badgeClass =
        venta.medioPago === "efectivo"
          ? "badge-efectivo"
          : venta.medioPago === "fiado"
            ? "badge-fiado"
            : "badge-transferencia";
      var badgeText =
        venta.medioPago === "efectivo"
          ? "Efectivo"
          : venta.medioPago === "fiado"
            ? "📋 Fiado"
            : "Transferencia";
      var fechaFmt = _formatearFecha(venta.fecha);

      var header = document.createElement("div");
      header.classList.add("venta-card-header");
      if (venta.soloHistorial) header.classList.add("venta-card-fiado");
      header.innerHTML =
        '<div class="venta-card-izq">' +
        '<span class="venta-meta"> · ' +
        fechaFmt +
        " " +
        venta.hora +
        // Bug 4: nombre del cliente en el header igual que ventas normales
        (venta.clienteNombre ? " · 👤 " + venta.clienteNombre : "") +
        "</span>" +
        "</div>" +
        '<div class="venta-card-der">' +
        '<span class="venta-badge ' +
        badgeClass +
        '">' +
        badgeText +
        "</span>" +
        '<span class="venta-total' +
        (venta.soloHistorial ? " venta-total-fiado" : "") +
        '">$' +
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

      // Bug 3: mostrar ajustes solo si los hay
      var ajustesHTML = "";
      if (venta.ajustes) {
        var aj = venta.ajustes;
        ajustesHTML +=
          '<div class="venta-item venta-item-ajuste">' +
          "<span>Subtotal</span><span>$" +
          aj.subtotalItems.toLocaleString("es-AR") +
          "</span></div>";
        if (aj.descuento > 0) {
          var montoDesc = Math.round((aj.subtotalItems * aj.descuento) / 100);
          ajustesHTML +=
            '<div class="venta-item venta-item-ajuste venta-item-descuento">' +
            "<span>Descuento " +
            aj.descuento +
            "%</span><span>-$" +
            montoDesc.toLocaleString("es-AR") +
            "</span></div>";
        }
        if (aj.recargo > 0) {
          var baseRecargo =
            aj.subtotalItems -
            Math.round((aj.subtotalItems * aj.descuento) / 100);
          var montoRecargo = Math.round((baseRecargo * aj.recargo) / 100);
          ajustesHTML +=
            '<div class="venta-item venta-item-ajuste venta-item-recargo">' +
            "<span>Recargo " +
            aj.recargo +
            "%</span><span>+$" +
            montoRecargo.toLocaleString("es-AR") +
            "</span></div>";
        }
        ajustesHTML +=
          '<div class="venta-item venta-item-total">' +
          "<span><strong>Total final</strong></span><span><strong>$" +
          aj.totalFinal.toLocaleString("es-AR") +
          "</strong></span></div>";
      }

      detalle.innerHTML =
        itemsHTML +
        ajustesHTML +
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
  // _poblarFiltroClientes
  // ---------------------------------------------------------
  function _poblarFiltroClientes() {
    if (!_filtroCliente) return;
    var clientes = App.ClientesModule ? App.ClientesModule.getClientes() : [];
    // Solo clientes que aparecen en alguna venta
    var idsConVentas = {};
    _ventas.forEach(function (v) {
      if (v.clienteId) idsConVentas[v.clienteId] = v.clienteNombre;
    });
    _filtroCliente.innerHTML = '<option value="">Todos los clientes</option>';
    Object.keys(idsConVentas).forEach(function (id) {
      var opt = document.createElement("option");
      opt.value = id;
      opt.textContent = idsConVentas[id] || id;
      _filtroCliente.appendChild(opt);
    });
  }

  // ---------------------------------------------------------
  // _aniosConVentas / _generarTabsMeses / _poblarSelectorAnio
  // ---------------------------------------------------------
  function _aniosConVentas() {
    var anios = {};
    _ventas.forEach(function (v) {
      anios[v.fecha.slice(0, 4)] = true;
    });
    anios[new Date().getFullYear()] = true;
    return Object.keys(anios).sort().reverse();
  }

  function _generarTabsMeses() {
    var contenedorMeses = document.getElementById("ventasTabsMeses");
    if (!contenedorMeses) return;
    // Preservar el select, limpiar solo los botones de mes
    var botonesViejos = contenedorMeses.querySelectorAll(".ventas-tab-mes");
    botonesViejos.forEach(function (b) {
      b.remove();
    });

    var anioActual = new Date().getFullYear();
    var mesActual = new Date().getMonth();
    var limite = _anioSeleccionado === anioActual ? mesActual : 11;

    for (var m = 0; m <= limite; m++) {
      (function (mes) {
        var btn = document.createElement("button");
        btn.classList.add("ventas-tab-mes");
        btn.textContent = _nombresMeses[mes];
        var mesStr = _anioSeleccionado + "-" + String(mes + 1).padStart(2, "0");
        btn.addEventListener("click", function () {
          document
            .querySelectorAll(".ventas-tab, .ventas-tab-mes")
            .forEach(function (t) {
              t.classList.remove("activo");
            });
          btn.classList.add("activo");
          _periodoActivo = "mes-" + mesStr;
          _renderTodo();
        });
        contenedorMeses.appendChild(btn);
      })(m);
    }
  }

  function _poblarSelectorAnio() {
    var selectorAnio = document.getElementById("ventaAnioSelect");
    if (!selectorAnio) return;
    var anios = _aniosConVentas();
    selectorAnio.innerHTML = "";
    anios.forEach(function (anio) {
      var opt = document.createElement("option");
      opt.value = anio;
      opt.textContent = anio;
      if (parseInt(anio) === _anioSeleccionado) opt.selected = true;
      selectorAnio.appendChild(opt);
    });
  }

  // ---------------------------------------------------------
  // abrir / cerrar
  // ---------------------------------------------------------
  function abrir() {
    _panelActivo = true;
    _panel.classList.remove("oculto");
    _poblarSelectorAnio();
    _generarTabsMeses();
    _poblarFiltroClientes();
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
    _filtroCliente = document.getElementById("ventaFiltroCliente");

    document.getElementById("btnVentas").addEventListener("click", abrir);
    document.getElementById("cerrarVentas").addEventListener("click", cerrar);

    // Tabs de período fijas
    document.querySelectorAll(".ventas-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document
          .querySelectorAll(".ventas-tab, .ventas-tab-mes")
          .forEach(function (t) {
            t.classList.remove("activo");
          });
        this.classList.add("activo");
        _periodoActivo = this.dataset.periodo;
        _renderTodo();
      });
    });

    // Listener selector de año (se registra una sola vez en init)
    var selectorAnio = document.getElementById("ventaAnioSelect");
    if (selectorAnio) {
      selectorAnio.addEventListener("change", function () {
        _anioSeleccionado = parseInt(this.value);
        if (
          _periodoActivo.startsWith("mes-") &&
          !_periodoActivo.startsWith("mes-" + _anioSeleccionado)
        ) {
          _periodoActivo = "hoy";
          document
            .querySelectorAll(".ventas-tab, .ventas-tab-mes")
            .forEach(function (t) {
              t.classList.remove("activo");
            });
          var tabHoy = document.querySelector(
            ".ventas-tab[data-periodo='hoy']",
          );
          if (tabHoy) tabHoy.classList.add("activo");
        }
        _generarTabsMeses();
        _renderTodo();
      });
    }

    if (_filtroMedio) _filtroMedio.addEventListener("change", _renderLista);
    if (_filtroCliente) _filtroCliente.addEventListener("change", _renderLista);

    EventBus.on("ventas:registrar", function (datos) {
      registrar(datos);
    });

    // Eliminar venta por id (desde historial de cliente)
    EventBus.on("ventas:eliminar", function (datos) {
      if (!datos || !datos.ventaId) return;
      _ventas = _ventas.filter(function (v) {
        return v.id !== datos.ventaId;
      });
      _guardar();
      if (_panelActivo) _renderTodo();
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

  return {
    init: init,
    abrir: abrir,
    cerrar: cerrar,
    registrar: registrar,
    getVentas: function () {
      return _ventas;
    },
  };
})(App.EventBus, App.Storage);
