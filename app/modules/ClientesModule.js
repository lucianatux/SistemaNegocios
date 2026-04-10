// =============================================================
// ClientesModule.js — Gestión de clientes y fiado
// =============================================================

var App = App || {};

App.ClientesModule = (function (EventBus, Storage) {
  var _clientes = [];
  var _clienteActivo = null;
  var _filtroActivo = "todos";
  var _busqueda = "";
  var _medioPagoSeleccionado = "efectivo";

  var CLAVE = "tero_clientes";

  function _guardar() {
    Storage.guardar(CLAVE, _clientes);
  }
  function _cargar() {
    var d = Storage.cargar(CLAVE);
    _clientes = Array.isArray(d) ? d : [];
  }

  function _hoy() {
    return new Date().toISOString().slice(0, 10);
  }
  function _hora() {
    var a = new Date();
    return (
      String(a.getHours()).padStart(2, "0") +
      ":" +
      String(a.getMinutes()).padStart(2, "0")
    );
  }
  function _formatFecha(f) {
    var p = f.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }
  function _iniciales(nombre) {
    return nombre
      .trim()
      .split(" ")
      .slice(0, 2)
      .map(function (p) {
        return p[0].toUpperCase();
      })
      .join("");
  }

  // ---------------------------------------------------------
  // CRUD clientes
  // ---------------------------------------------------------
  function _nuevoId() {
    return "cli_" + Date.now();
  }

  function agregarCliente(nombre, notas) {
    var cli = {
      id: _nuevoId(),
      nombre: nombre.trim(),
      notas: (notas || "").trim(),
      saldo: 0,
      historial: [],
    };
    _clientes.unshift(cli);
    _guardar();
    return cli;
  }

  function _buscarPorId(id) {
    return _clientes.find(function (c) {
      return c.id === id;
    });
  }

  function getClientes() {
    return _clientes;
  }

  // ---------------------------------------------------------
  // Movimientos
  // ---------------------------------------------------------
  function registrarFiado(clienteId, monto, descripcion, items) {
    var cli = _buscarPorId(clienteId);
    if (!cli) return;

    cli.saldo -= monto;
    cli.historial.unshift({
      tipo: "fiado",
      fecha: _hoy(),
      hora: _hora(),
      monto: monto,
      descripcion: descripcion || "",
      items: items || [],
    });
    _guardar();
    _actualizarFichaAbierta(cli);
    EventBus.emit("clientes:actualizado");
  }

  function registrarPago(clienteId, monto, medioPago) {
    var cli = _buscarPorId(clienteId);
    if (!cli) return;

    var montoReal = monto || Math.abs(cli.saldo);
    cli.saldo += montoReal;
    if (cli.saldo > 0) cli.saldo = 0;

    cli.historial.unshift({
      tipo: "pago",
      fecha: _hoy(),
      hora: _hora(),
      monto: montoReal,
      medioPago: medioPago || "efectivo",
    });
    _guardar();

    // Registrar en ventas como entrada nueva
    EventBus.emit("ventas:registrar", {
      items: [
        {
          nombre: "Pago de deuda — " + cli.nombre,
          cantidad: 1,
          precioUnitario: montoReal,
          subtotal: montoReal,
          costo: 0,
        },
      ],
      total: montoReal,
      medioPago: medioPago || "efectivo",
    });

    _actualizarFichaAbierta(cli);
    EventBus.emit("clientes:actualizado");
  }

  // ---------------------------------------------------------
  // Render lista
  // ---------------------------------------------------------
  function _clientesFiltrados() {
    var busq = _busqueda.toLowerCase();
    return _clientes.filter(function (c) {
      if (busq && !c.nombre.toLowerCase().includes(busq)) return false;
      if (_filtroActivo === "deuda") return c.saldo < 0;
      if (_filtroActivo === "aldia") return c.saldo >= 0;
      return true;
    });
  }

  function _renderStats() {
    var total = _clientes.length;
    var deuda = _clientes.reduce(function (a, c) {
      return a + (c.saldo < 0 ? Math.abs(c.saldo) : 0);
    }, 0);
    document.getElementById("clienteStatTotal").textContent = total;
    document.getElementById("clienteStatDeuda").textContent =
      "$" + deuda.toLocaleString("es-AR");
  }

  function _renderLista() {
    var el = document.getElementById("clientesLista");
    if (!el) return;
    el.innerHTML = "";

    var lista = _clientesFiltrados();
    if (lista.length === 0) {
      el.innerHTML =
        "<p class='ventas-vacio'>No hay clientes en esta vista</p>";
      return;
    }

    lista.forEach(function (cli) {
      var tieneDeuda = cli.saldo < 0;
      var fila = document.createElement("div");
      fila.classList.add("cliente-item");

      var avatar = document.createElement("div");
      avatar.classList.add("cliente-avatar");
      if (tieneDeuda) avatar.classList.add("deuda");
      avatar.textContent = _iniciales(cli.nombre);

      var info = document.createElement("div");
      info.classList.add("cliente-info");
      info.innerHTML =
        '<div class="cliente-nombre">' +
        cli.nombre +
        "</div>" +
        '<div class="cliente-notas">' +
        (cli.notas || "—") +
        "</div>";

      var saldo = document.createElement("div");
      saldo.classList.add("cliente-saldo");
      if (tieneDeuda) {
        saldo.classList.add("deuda");
        saldo.textContent = "-$" + Math.abs(cli.saldo).toLocaleString("es-AR");
      } else {
        saldo.classList.add("aldia");
        saldo.textContent = "Al día";
      }

      fila.appendChild(avatar);
      fila.appendChild(info);
      fila.appendChild(saldo);
      fila.addEventListener("click", function () {
        _abrirFicha(cli);
      });

      el.appendChild(fila);
    });
  }

  function _renderTodo() {
    _renderStats();
    _renderLista();
  }

  // ---------------------------------------------------------
  // Ficha cliente
  // ---------------------------------------------------------
  function _abrirFicha(cli) {
    _clienteActivo = cli;
    var modal = document.getElementById("fichaClienteModal");

    document.getElementById("fichaClienteNombre").textContent = cli.nombre;
    document.getElementById("fichaClienteNotas").textContent = cli.notas || "";

    _renderFichaSaldo(cli);
    _renderHistorial(cli);
    modal.classList.remove("oculto");
  }

  function _renderFichaSaldo(cli) {
    var box = document.getElementById("fichaSaldoBox");
    var el = document.getElementById("fichaSaldo");
    var tieneDeuda = cli.saldo < 0;

    box.className = "ficha-saldo-box" + (tieneDeuda ? "" : " aldia");
    document.querySelector(".ficha-saldo-label").textContent = tieneDeuda
      ? "Deuda actual"
      : "Estado";

    el.textContent = tieneDeuda
      ? "$" + Math.abs(cli.saldo).toLocaleString("es-AR")
      : "Al día ✓";
  }

  function _renderHistorial(cli) {
    var el = document.getElementById("fichaHistorial");
    el.innerHTML = "";

    if (!cli.historial || cli.historial.length === 0) {
      el.innerHTML =
        "<p style='color:var(--color-texto-suave);font-size:12px;" +
        "text-align:center;padding:12px'>Sin movimientos</p>";
      return;
    }

    cli.historial.forEach(function (mov) {
      var esPago = mov.tipo === "pago";
      var esCompra = mov.tipo === "compra";
      var esFiado = mov.tipo === "fiado";

      var tieneDetalle = esFiado && mov.items && mov.items.length > 0;

      var desc = esPago
        ? "💵 Pago"
        : esCompra
          ? "🛍️ Compra" + (mov.descripcion ? " — " + mov.descripcion : "")
          : "📋 Fiado" + (mov.descripcion ? " — " + mov.descripcion : "");

      // Contenedor del movimiento
      var wrap = document.createElement("div");
      wrap.style.borderBottom = "1px dashed var(--color-borde)";
      wrap.style.paddingBottom = "4px";
      wrap.style.marginBottom = "4px";

      // Fila principal
      var fila = document.createElement("div");
      fila.classList.add("hist-mov");
      fila.style.borderBottom = "none";
      fila.style.cursor = tieneDetalle ? "pointer" : "default";

      fila.innerHTML =
        "<div>" +
        '<div class="hist-tipo">' +
        desc +
        (tieneDetalle
          ? ' <span style="font-size:10px;color:var(--color-texto-suave)">▶</span>'
          : "") +
        "</div>" +
        '<div class="hist-fecha">' +
        _formatFecha(mov.fecha) +
        " · " +
        mov.hora +
        "</div>" +
        "</div>" +
        '<div class="hist-monto ' +
        (esPago || esCompra ? "pago" : "debe") +
        '">' +
        (esPago || esCompra ? "+" : "-") +
        "$" +
        mov.monto.toLocaleString("es-AR") +
        "</div>";

      wrap.appendChild(fila);

      // Detalle expandible (solo fiados con items)
      if (tieneDetalle) {
        var detalle = document.createElement("div");
        detalle.style.display = "none";
        detalle.style.background = "var(--color-fondo)";
        detalle.style.borderRadius = "6px";
        detalle.style.padding = "8px 10px";
        detalle.style.marginTop = "4px";
        detalle.style.fontSize = "12px";

        // Items de la venta
        var itemsHTML = mov.items
          .map(function (item) {
            return (
              '<div style="display:flex;justify-content:space-between;' +
              "padding:3px 0;border-bottom:1px solid var(--color-borde);" +
              'color:var(--color-texto)">' +
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

        // Total de la venta original
        var totalVenta = mov.items.reduce(function (a, i) {
          return a + i.subtotal;
        }, 0);

        // Si hay diferencia entre total venta y monto fiado → hubo pago parcial
        var pagoParcial = totalVenta - mov.monto;

        var resumenHTML =
          '<div style="display:flex;justify-content:space-between;' +
          "padding:4px 0;margin-top:4px;font-weight:700;" +
          'color:var(--color-texto)">' +
          "<span>Total de la venta</span>" +
          "<span>$" +
          totalVenta.toLocaleString("es-AR") +
          "</span>" +
          "</div>";

        if (pagoParcial > 0) {
          resumenHTML +=
            '<div style="display:flex;justify-content:space-between;' +
            'padding:3px 0;color:var(--color-primario)">' +
            "<span>Pagó en el momento</span>" +
            "<span>-$" +
            pagoParcial.toLocaleString("es-AR") +
            "</span>" +
            "</div>" +
            '<div style="display:flex;justify-content:space-between;' +
            'padding:3px 0;font-weight:700;color:#b00020">' +
            "<span>Quedó pendiente</span>" +
            "<span>$" +
            mov.monto.toLocaleString("es-AR") +
            "</span>" +
            "</div>";
        }

        detalle.innerHTML = itemsHTML + resumenHTML;
        wrap.appendChild(detalle);

        // Toggle expandir/colapsar
        var toggleEl = fila.querySelector(".hist-tipo span");
        fila.addEventListener("click", function () {
          var abierto = detalle.style.display !== "none";
          detalle.style.display = abierto ? "none" : "block";
          if (toggleEl) toggleEl.textContent = abierto ? "▶" : "▼";
        });
      }

      el.appendChild(wrap);
    });
  }

  function _actualizarFichaAbierta(cli) {
    var modal = document.getElementById("fichaClienteModal");
    if (
      !modal.classList.contains("oculto") &&
      _clienteActivo &&
      _clienteActivo.id === cli.id
    ) {
      _renderFichaSaldo(cli);
      _renderHistorial(cli);
    }
  }

  // ---------------------------------------------------------
  // Modal nuevo/editar cliente
  // ---------------------------------------------------------
  var _modoModalCliente = "nuevo";

  function _abrirModalCliente(modo, cli) {
    _modoModalCliente = modo;
    document.getElementById("modalClienteTitulo").textContent =
      modo === "nuevo" ? "Nuevo cliente" : "Editar cliente";
    document.getElementById("clienteNombreInput").value = cli ? cli.nombre : "";
    document.getElementById("clienteNotasInput").value = cli ? cli.notas : "";
    document.getElementById("modalCliente").classList.remove("oculto");
    document.getElementById("clienteNombreInput").focus();
  }

  function _confirmarModalCliente() {
    var nombre = document.getElementById("clienteNombreInput").value.trim();
    if (!nombre) {
      alert("El nombre es obligatorio");
      return;
    }
    var notas = document.getElementById("clienteNotasInput").value.trim();

    if (_modoModalCliente === "nuevo") {
      agregarCliente(nombre, notas);
    } else if (_clienteActivo) {
      _clienteActivo.nombre = nombre;
      _clienteActivo.notas = notas;
      _guardar();
      document.getElementById("fichaClienteNombre").textContent = nombre;
      document.getElementById("fichaClienteNotas").textContent = notas;
    }

    document.getElementById("modalCliente").classList.add("oculto");
    _renderTodo();
  }

  // ---------------------------------------------------------
  // Modal pago
  // ---------------------------------------------------------
  function _abrirModalPago() {
    if (!_clienteActivo) return;
    var deuda = Math.abs(_clienteActivo.saldo);
    document.getElementById("modalPagoDeuda").textContent =
      "Deuda actual: $" + deuda.toLocaleString("es-AR");
    document.getElementById("modalPagoMonto").value = "";

    // Resetear medio
    _medioPagoSeleccionado = "efectivo";
    document.querySelectorAll(".pago-medio-btn").forEach(function (b) {
      b.classList.toggle("activo", b.dataset.medio === "efectivo");
    });

    document.getElementById("modalPago").classList.remove("oculto");
    document.getElementById("modalPagoMonto").focus();
  }

  function _confirmarPago() {
    if (!_clienteActivo) return;
    var montoInput = document.getElementById("modalPagoMonto").value;
    var monto = montoInput !== "" ? parseFloat(montoInput) : null;
    registrarPago(_clienteActivo.id, monto, _medioPagoSeleccionado);
    document.getElementById("modalPago").classList.add("oculto");
    _renderTodo();
  }

  // ---------------------------------------------------------
  // Modal deuda manual
  // ---------------------------------------------------------
  function _abrirModalDeuda() {
    if (!_clienteActivo) return;
    document.getElementById("modalDeudaMonto").value = "";
    document.getElementById("modalDeudaDesc").value = "";
    document.getElementById("modalDeuda").classList.remove("oculto");
    document.getElementById("modalDeudaMonto").focus();
  }

  function _confirmarDeuda() {
    if (!_clienteActivo) return;
    var monto =
      parseFloat(document.getElementById("modalDeudaMonto").value) || 0;
    var desc = document.getElementById("modalDeudaDesc").value.trim();
    if (monto <= 0) {
      alert("Ingresá un monto válido");
      return;
    }
    registrarFiado(_clienteActivo.id, monto, desc, []);
    document.getElementById("modalDeuda").classList.add("oculto");
    _renderTodo();
  }

  // ---------------------------------------------------------
  // Eliminar cliente
  // ---------------------------------------------------------
  function _eliminarCliente() {
    if (!_clienteActivo) return;
    if (
      !confirm(
        "¿Eliminar a " +
          _clienteActivo.nombre +
          "? Esta acción no se puede deshacer.",
      )
    )
      return;
    _clientes = _clientes.filter(function (c) {
      return c.id !== _clienteActivo.id;
    });
    _guardar();
    _clienteActivo = null;
    document.getElementById("fichaClienteModal").classList.add("oculto");
    _renderTodo();
  }

  // ---------------------------------------------------------
  // Poblar selector de clientes (para cerrar venta)
  // ---------------------------------------------------------
  function _poblarSelectorClientes() {
    var sel = document.getElementById("cerrarVentaCliente");
    sel.innerHTML = '<option value="">Seleccionar cliente...</option>';
    _clientes.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent =
        c.nombre +
        (c.saldo < 0
          ? " (debe $" + Math.abs(c.saldo).toLocaleString("es-AR") + ")"
          : "");
      sel.appendChild(opt);
    });
  }

  // ---------------------------------------------------------
  // abrir / cerrar panel
  // ---------------------------------------------------------
  function abrir() {
    document.getElementById("clientesPanel").classList.remove("oculto");
    _renderTodo();
  }

  function cerrar() {
    document.getElementById("clientesPanel").classList.add("oculto");
  }

  // ---------------------------------------------------------
  // init
  // ---------------------------------------------------------
  function init() {
    _cargar();

    document.getElementById("btnClientes").addEventListener("click", abrir);
    document.getElementById("cerrarClientes").addEventListener("click", cerrar);

    // Buscador
    document
      .getElementById("clienteBuscador")
      .addEventListener("input", function () {
        _busqueda = this.value;
        _renderLista();
      });

    // Filtros
    document.querySelectorAll(".cliente-filtro-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".cliente-filtro-btn").forEach(function (b) {
          b.classList.remove("activo");
        });
        this.classList.add("activo");
        _filtroActivo = this.dataset.filtro;
        _renderLista();
      });
    });

    // Nuevo cliente desde panel
    document.querySelector("#clientesPanel .ventas-header button:last-child") &&
      document
        .getElementById("clientesPanel")
        .addEventListener("click", function (e) {
          if (e.target.textContent === "+ Nuevo")
            _abrirModalCliente("nuevo", null);
        });

    // Botón nuevo en el header del panel
    document
      .getElementById("btnNuevoCliente")
      .addEventListener("click", function () {
        _abrirModalCliente("nuevo", null);
      });

    // Ficha — botones
    document
      .getElementById("cerrarFichaCliente")
      .addEventListener("click", function () {
        document.getElementById("fichaClienteModal").classList.add("oculto");
      });
    document
      .getElementById("btnRegistrarPago")
      .addEventListener("click", _abrirModalPago);
    document.querySelectorAll(".pago-medio-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".pago-medio-btn").forEach(function (b) {
          b.classList.remove("activo");
        });
        this.classList.add("activo");
        _medioPagoSeleccionado = this.dataset.medio;
      });
    });
    document
      .getElementById("btnCargarDeuda")
      .addEventListener("click", _abrirModalDeuda);
    document
      .getElementById("btnEditarCliente")
      .addEventListener("click", function () {
        _abrirModalCliente("editar", _clienteActivo);
      });
    document
      .getElementById("btnEliminarCliente")
      .addEventListener("click", _eliminarCliente);

    // Modal cliente
    document
      .getElementById("confirmarModalCliente")
      .addEventListener("click", _confirmarModalCliente);
    document
      .getElementById("cerrarModalCliente")
      .addEventListener("click", function () {
        document.getElementById("modalCliente").classList.add("oculto");
      });

    // Modal pago
    document
      .getElementById("confirmarModalPago")
      .addEventListener("click", _confirmarPago);
    document
      .getElementById("cerrarModalPago")
      .addEventListener("click", function () {
        document.getElementById("modalPago").classList.add("oculto");
      });

    // Modal deuda
    document
      .getElementById("confirmarModalDeuda")
      .addEventListener("click", _confirmarDeuda);
    document
      .getElementById("cerrarModalDeuda")
      .addEventListener("click", function () {
        document.getElementById("modalDeuda").classList.add("oculto");
      });

    // Escuchar apertura del modal cerrar venta para poblar selector
    EventBus.on("clientes:poblar-selector", _poblarSelectorClientes);

    // Escuchar registro de fiado desde cerrar venta
    EventBus.on("clientes:registrar-fiado", function (datos) {
      registrarFiado(
        datos.clienteId,
        datos.monto,
        datos.descripcion,
        datos.items,
      );
    });

    EventBus.on("clientes:registrar-compra", function (datos) {
      var cli = _buscarPorId(datos.clienteId);
      if (!cli) return;
      cli.historial.unshift({
        tipo: "compra",
        fecha: _hoy(),
        hora: _hora(),
        monto: datos.monto,
        descripcion: datos.descripcion,
      });
      _guardar();
      _actualizarFichaAbierta(cli);
      EventBus.emit("clientes:actualizado");
    });

    console.info("[ClientesModule] iniciado");
  }

  return {
    init: init,
    abrir: abrir,
    cerrar: cerrar,
    getClientes: getClientes,
    agregarCliente: agregarCliente,
    registrarFiado: registrarFiado,
    registrarPago: registrarPago,
  };
})(App.EventBus, App.Storage);
