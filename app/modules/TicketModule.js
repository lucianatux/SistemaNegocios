// =============================================================
// TicketModule.js — Sistema de ticket de venta
// =============================================================

var App = App || {};

App.TicketModule = (function (EventBus, Store, PriceService) {
  var _ticket = { items: [] };

  var _panel = null;
  var _ticketItems = null;
  var _ticketTotal = null;
  var _ticketFinal = null;
  var _descuentoInput = null;
  var _recargoInput = null;
  var _fechaEl = null;
  var _modalCerrarVenta = null;
  var _medioSeleccionado = "efectivo";

  // ---------------------------------------------------------
  // abrir / cerrar
  // ---------------------------------------------------------
  function abrir() {
    Store.set("modoTicket", true);
    _activarModoColumnas();
    _restaurarDesdeStore();
    _render();
    _mostrarFecha();
  }

  function cerrar() {
    Store.set("modoTicket", false);
    _desactivarModoColumnas();
  }

  // ---------------------------------------------------------
  // _mostrarFecha
  // ---------------------------------------------------------
  function _mostrarFecha() {
    var ahora = new Date();
    _fechaEl.textContent = ahora.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  // ---------------------------------------------------------
  // agregarProducto
  // ---------------------------------------------------------
  function agregarProducto(producto) {
    var existe = _ticket.items.find(function (item) {
      return item.nombre === producto.nombre;
    });
    if (existe) return;

    _ticket.items.push({
      nombre: producto.nombre,
      precio: PriceService.calcularConEscalaDesdeStore(producto, 1),
      cantidad: 1,
      costo: producto.costo || 0,
      // Se congelan al momento de la venta: si mañana el producto cambia
      // de categoría o se borra, la venta vieja mantiene su clasificación.
      categoria: producto.categoria || null,
      codigo: producto.codigo || null,
      _producto: producto, // referencia para recalcular escalas al cambiar cantidad
    });

    _guardarEnStore();
    _render();
  }

  // ---------------------------------------------------------
  // _eliminar
  // ---------------------------------------------------------
  function _eliminar(index) {
    _ticket.items.splice(index, 1);
    _guardarEnStore();
    _render();
  }

  // ---------------------------------------------------------
  // _calcularTotalFinal — devuelve el número
  // ---------------------------------------------------------
  function _calcularTotalFinal() {
    var subtotal = _ticket.items.reduce(function (acc, item) {
      return acc + item.precio * item.cantidad;
    }, 0);
    var descuento = parseFloat(_descuentoInput.value) || 0;
    var recargo = parseFloat(_recargoInput.value) || 0;
    var conDesc = subtotal - subtotal * (descuento / 100);
    return Math.round(conDesc + conDesc * (recargo / 100));
  }

  // ---------------------------------------------------------
  // _actualizarTotalesDOM
  // ---------------------------------------------------------
  function _actualizarTotalesDOM() {
    var subtotal = _ticket.items.reduce(function (acc, item) {
      return acc + item.precio * item.cantidad;
    }, 0);
    _ticketTotal.textContent = "$" + subtotal.toLocaleString("es-AR");
    _ticketFinal.textContent =
      "$" + _calcularTotalFinal().toLocaleString("es-AR");
  }

  // ---------------------------------------------------------
  // _render
  // ---------------------------------------------------------
  function _render() {
    _ticketItems.innerHTML = "";

    if (_ticket.items.length === 0) {
      _ticketItems.innerHTML =
        "<p class='ticket-vacio'>No hay productos en el ticket</p>";
      _ticketTotal.textContent = "$0";
      _ticketFinal.textContent = "$0";
      _descuentoInput.value = 0;
      _recargoInput.value = 0;
      return;
    }

    _ticket.items.forEach(function (item, index) {
      var subtotal = item.precio * item.cantidad;
      var fila = document.createElement("div");
      fila.classList.add("ticket-item");

      var subtotalId = "subtotal-" + index;
      var precioUnitId = "precio-unit-" + index;

      fila.innerHTML =
        '<div class="ticket-item-info">' +
        '<div class="ticket-item-nombre">' +
        item.nombre +
        "</div>" +
        '<div class="ticket-item-detalle">' +
        '<input type="number" min="1" value="' +
        item.cantidad +
        '" ' +
        'class="ticket-cantidad" data-index="' +
        index +
        '" />' +
        ' x $<span id="' + precioUnitId + '">' +
        item.precio.toLocaleString("es-AR") +
        '</span>' +
        ' = <span id="' +
        subtotalId +
        '">$' +
        subtotal.toLocaleString("es-AR") +
        "</span>" +
        "</div>" +
        "</div>" +
        '<button class="ticket-eliminar" data-index="' +
        index +
        '">✕</button>';

      _ticketItems.appendChild(fila);
    });

    _ticketItems.querySelectorAll(".ticket-eliminar").forEach(function (btn) {
      btn.addEventListener("click", function () {
        _eliminar(parseInt(btn.dataset.index));
      });
    });

    _ticketItems.querySelectorAll(".ticket-cantidad").forEach(function (input) {
      function actualizar() {
        var idx = parseInt(input.dataset.index);
        var cantidad = parseInt(input.value) || 1;
        if (cantidad < 1) {
          cantidad = 1;
          input.value = 1;
        }
        _ticket.items[idx].cantidad = cantidad;

        // Recalcular precio unitario si el producto tiene escalas
        var prod = _ticket.items[idx]._producto;
        if (prod && Array.isArray(prod.escalas) && prod.escalas.length > 0) {
          var nuevoPrecio = PriceService.calcularConEscalaDesdeStore(prod, cantidad);
          _ticket.items[idx].precio = nuevoPrecio;
          var spanUnit = document.getElementById("precio-unit-" + idx);
          if (spanUnit) spanUnit.textContent = nuevoPrecio.toLocaleString("es-AR");
        }

        // Actualizar subtotal
        var span = document.getElementById("subtotal-" + idx);
        if (span) {
          var sub = _ticket.items[idx].precio * cantidad;
          span.textContent = "$" + sub.toLocaleString("es-AR");
        }

        _guardarEnStore();
        _actualizarTotalesDOM();
      }

      input.addEventListener("input", actualizar);
      input.addEventListener("change", actualizar);
    });

    _guardarEnStore();
    _actualizarTotalesDOM();
  }

  // ---------------------------------------------------------
  // _guardarEnStore / _restaurarDesdeStore
  // ---------------------------------------------------------
  function _guardarEnStore() {
    Store.setTicket(_ticket);
  }

  function _restaurarDesdeStore() {
    var guardado = Store.get("ticketActual");
    if (guardado && guardado.items) {
      _ticket = guardado;

      // Reenlazar _producto desde el catálogo actual (se pierde en serialización JSON)
      var productos = App.Store.getProductos ? App.Store.getProductos() : [];
      _ticket.items.forEach(function (item) {
        if (!item._producto) {
          item._producto = productos.find(function (p) {
            return p.nombre === item.nombre;
          }) || null;
        }
      });

      _render();
    }
  }

  function _abrirModalCerrarVenta() {
    if (_ticket.items.length === 0) {
      alert("El ticket está vacío");
      return;
    }

    var total = _calcularTotalFinal();
    document.getElementById("cerrarVentaTotal").textContent =
      "$" + total.toLocaleString("es-AR");

    // Resetear estado del modal
    _medioSeleccionado = "efectivo";
    document.querySelectorAll(".cerrar-medio-btn").forEach(function (b) {
      b.classList.toggle("activo", b.dataset.medio === "efectivo");
    });
    document.getElementById("cerrarVentaMonto").value = "";
    document.getElementById("cerrarVentaTotalCheck").checked = false;
    document.getElementById("cerrarMixtoEfectivo").value = "";
    document.getElementById("cerrarMixtoTransferencia").value = "";
    document.getElementById("cerrarMixtoAviso").textContent = "";
    document.getElementById("cerrarMixtoSeccion").style.display = "none";
    document.getElementById("cerrarMontoSeccion").style.display = "block";
    document.getElementById("cerrarFiadoSeccion").style.display = "none";
    document.getElementById("cerrarFiadoPendiente").textContent = "";

    // Poblar selector de clientes
    App.EventBus.emit("clientes:poblar-selector");

    _modalCerrarVenta.classList.remove("oculto");
  }

  function _cerrarModalCerrarVenta() {
    _modalCerrarVenta.classList.add("oculto");
  }

  function _actualizarModalCerrarVenta() {
    var total = _calcularTotalFinal();
    var esFiado  = _medioSeleccionado === "fiado";
    var esMixto  = _medioSeleccionado === "mixto";
    var montoInput =
      parseFloat(document.getElementById("cerrarVentaMonto").value) || 0;
    var pagoTotal = document.getElementById("cerrarVentaTotalCheck").checked;

    // Sección monto estándar — oculta en fiado total y en mixto
    document.getElementById("cerrarMontoSeccion").style.display =
      (esFiado || esMixto) ? "none" : "block";

    // Sección mixto — solo visible en modo mixto
    document.getElementById("cerrarMixtoSeccion").style.display =
      esMixto ? "block" : "none";

    // Actualizar aviso de suma en modo mixto
    var pendienteMixto = 0;
    if (esMixto) {
      var ef  = parseFloat(document.getElementById("cerrarMixtoEfectivo").value)      || 0;
      var tr  = parseFloat(document.getElementById("cerrarMixtoTransferencia").value)  || 0;
      var suma = ef + tr;
      var aviso = document.getElementById("cerrarMixtoAviso");
      if (suma === 0) {
        aviso.textContent = "";
        aviso.style.color = "var(--color-texto-suave)";
      } else if (suma === total) {
        aviso.textContent = "✅ Monto exacto";
        aviso.style.color = "var(--color-primario)";
      } else if (suma > total) {
        aviso.textContent = "✅ El cliente entrega $" + suma.toLocaleString("es-AR");
        aviso.style.color = "var(--color-primario)";
      } else {
        pendienteMixto = total - suma;
        aviso.textContent = "⚠️ Falta $" + pendienteMixto.toLocaleString("es-AR") + " → quedará como fiado";
        aviso.style.color = "#c0392b";
      }
    }

    // Sección fiado — siempre visible, pero el título cambia
    document.getElementById("cerrarFiadoSeccion").style.display = "block";

    var hayPendiente =
      !esFiado && !esMixto && !pagoTotal && montoInput > 0 && montoInput < total;
    var pendiente = esFiado ? total : esMixto ? pendienteMixto : hayPendiente ? total - montoInput : 0;

    // Cambiar título según si hay pendiente o no
    document.querySelector(
      "#cerrarFiadoSeccion .cerrar-sec-titulo",
    ).textContent =
      pendiente > 0
        ? "Saldo pendiente → fiado"
        : "Asociar a un cliente (opcional)";

    // Mostrar pendiente solo si corresponde
    if (pendiente > 0) {
      document.getElementById("cerrarFiadoPendiente").textContent =
        "Queda pendiente: $" + pendiente.toLocaleString("es-AR");
    } else {
      document.getElementById("cerrarFiadoPendiente").textContent = "";
    }
  }

  function _confirmarCerrarVenta() {
    var subtotalItems = _ticket.items.reduce(function (acc, item) {
      return acc + item.precio * item.cantidad;
    }, 0);
    var total = _calcularTotalFinal();
    var descuento = parseFloat(_descuentoInput.value) || 0;
    var recargo   = parseFloat(_recargoInput.value)   || 0;

    var esFiado   = _medioSeleccionado === "fiado";
    var esMixto   = _medioSeleccionado === "mixto";
    var montoInput = parseFloat(document.getElementById("cerrarVentaMonto").value) || 0;
    var pagoTotal  = document.getElementById("cerrarVentaTotalCheck").checked;
    var clienteId  = document.getElementById("cerrarVentaCliente").value;

    // --- Modo MIXTO: calcular suma y determinar sobra/falta ---
    var montoEfectivo      = 0;
    var montoTransferencia = 0;
    var sumaMixto          = 0;
    if (esMixto) {
      montoEfectivo      = parseFloat(document.getElementById("cerrarMixtoEfectivo").value)      || 0;
      montoTransferencia = parseFloat(document.getElementById("cerrarMixtoTransferencia").value)  || 0;
      sumaMixto = montoEfectivo + montoTransferencia;

      if (montoEfectivo <= 0 || montoTransferencia <= 0) {
        alert("Ingresá los montos en efectivo y en transferencia");
        return;
      }
    }

    // montoPagado: en mixto es la suma real entregada (puede superar o ser menor al total)
    var montoPagado = esFiado ? 0 : esMixto ? sumaMixto : pagoTotal ? total : montoInput;
    var pendiente   = total - montoPagado;
    // Si sobra en mixto, pendiente queda negativo → no hay fiado ni error, se acepta igual que efectivo con vuelto

    // Resolver nombre del cliente UNA sola vez, antes de todos los bloques
    var clienteNombre = "";
    if (clienteId && App.ClientesModule) {
      var cli = App.ClientesModule.getClientes().find(function (c) {
        return c.id === clienteId;
      });
      if (cli) clienteNombre = cli.nombre;
    }

    // Si hay fiado, necesita cliente
    if (pendiente > 0 && !clienteId) {
      alert("Seleccioná un cliente para cargar el fiado");
      return;
    }

    // Si no hay pendiente y hay cliente → asociar la compra al historial del cliente
    if (pendiente === 0 && clienteId) {
      var descAsociada = _ticket.items
        .map(function (i) { return i.nombre + " x" + i.cantidad; })
        .join(", ");
      App.EventBus.emit("clientes:registrar-compra", {
        clienteId: clienteId,
        monto: montoPagado,
        descripcion: descAsociada,
      });
    }

    var itemsParaVenta = _ticket.items.map(function (item) {
      return {
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precio,
        subtotal: item.precio * item.cantidad,
        costo: item.costo || 0,
        categoria: item.categoria || null,
        codigo: item.codigo || null,
      };
    });

    // Adjuntar ajustes solo si los hay
    var ajustes = null;
    if (descuento > 0 || recargo > 0) {
      ajustes = {
        subtotalItems: subtotalItems,
        descuento: descuento,
        recargo: recargo,
        totalFinal: total,
      };
    }

    // Registrar venta si hubo pago
    if (montoPagado > 0) {
      if (esMixto) {
        // Dos registros separados por lo que realmente entregó en cada medio
        App.EventBus.emit("ventas:registrar", {
          items: itemsParaVenta,
          total: montoEfectivo,
          medioPago: "efectivo",
          clienteId: clienteId || null,
          clienteNombre: clienteNombre || null,
          ajustes: ajustes,
          esMixto: true,
          totalMixto: total,
          contarVenta: true,
        });
        App.EventBus.emit("ventas:registrar", {
          items: [],          // sin items: el costo ya se contó en el registro de efectivo
          total: montoTransferencia,
          medioPago: "transferencia",
          clienteId: clienteId || null,
          clienteNombre: clienteNombre || null,
          ajustes: null,      // ajustes ya están en el primero
          esMixto: true,
          totalMixto: total,
        });
      } else {
        App.EventBus.emit("ventas:registrar", {
          items: itemsParaVenta,
          total: montoPagado,
          medioPago: _medioSeleccionado,
          clienteId: clienteId || null,
          clienteNombre: clienteNombre || null,
          ajustes: ajustes,
          contarVenta: true,
        });
      }
    }

    // Registrar fiado si quedó pendiente
    if (pendiente > 0 && clienteId) {
      var desc = _ticket.items
        .map(function (i) { return i.nombre + " x" + i.cantidad; })
        .join(", ");
      App.EventBus.emit("clientes:registrar-fiado", {
        clienteId: clienteId,
        monto: pendiente,
        descripcion: desc,
        items: itemsParaVenta,
      });
    }

    // Fiado total → registrar en ventas pero marcado como no contabilizable
    if (esFiado && clienteId) {
      App.EventBus.emit("ventas:registrar", {
        items: itemsParaVenta,
        total: total,
        medioPago: "fiado",
        clienteId: clienteId,
        clienteNombre: clienteNombre,
        ajustes: ajustes,
        soloHistorial: true,
        contarVenta: true,
      });
    }

    _cerrarModalCerrarVenta();
    alert("Venta cerrada correctamente");
  }

  function _activarModoColumnas() {
    document.body.classList.add("modo-venta");
    document.getElementById("modoTopbarBadge").textContent = "🛒 Venta";

    // Mover el ticketPanel a la columna derecha
    var colDer = document.getElementById("modoColDer");
    colDer.appendChild(_panel);
    _panel.classList.remove("oculto");
    _panel.style.position = "static";
    _panel.style.width = "100%";
    _panel.style.height = "100%";
    _panel.style.boxShadow = "none";

    // Inicializar buscador del modo
    App.ModoColumnasModule.iniciarBuscador();
  }

  function _desactivarModoColumnas() {
    document.body.classList.remove("modo-venta");

    // Devolver el ticketPanel al main
    var main = document.querySelector("main");
    main.appendChild(_panel);
    _panel.classList.add("oculto");
    _panel.style.position = "";
    _panel.style.width = "";
    _panel.style.height = "";
    _panel.style.boxShadow = "";
  }

  // ---------------------------------------------------------
  // init
  // ---------------------------------------------------------
  function init() {
    _panel = document.getElementById("ticketPanel");
    _ticketItems = document.getElementById("ticketItems");
    _ticketTotal = document.getElementById("ticketTotal");
    _ticketFinal = document.getElementById("ticketTotalFinal");
    _descuentoInput = document.getElementById("ticketDescuento");
    _recargoInput = document.getElementById("ticketRecargo");
    _fechaEl = document.getElementById("ticketFecha");
    _modalCerrarVenta = document.getElementById("modalCerrarVenta");

    document.getElementById("btnTicket").addEventListener("click", abrir);
    document.getElementById("cerrarTicket").addEventListener("click", cerrar);

    _descuentoInput.addEventListener("input", _actualizarTotalesDOM);
    _recargoInput.addEventListener("input", _actualizarTotalesDOM);

    document
      .getElementById("btnImprimir")
      .addEventListener("click", function () {
        _mostrarFecha();
        window.print();
      });

    document
      .getElementById("btnNuevaVenta")
      .addEventListener("click", function () {
        _ticket = { items: [] };
        _guardarEnStore();
        _render();
        _mostrarFecha();
      });

    // Botón cerrar venta → abre modal unificado
    document
      .getElementById("btnCerrarVenta")
      .addEventListener("click", _abrirModalCerrarVenta);
    document
      .getElementById("cerrarModalCerrarVenta")
      .addEventListener("click", _cerrarModalCerrarVenta);
    document
      .getElementById("confirmarCerrarVenta")
      .addEventListener("click", _confirmarCerrarVenta);

    // Botones de medio de pago
    document.querySelectorAll(".cerrar-medio-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".cerrar-medio-btn").forEach(function (b) {
          b.classList.remove("activo");
        });
        this.classList.add("activo");
        _medioSeleccionado = this.dataset.medio;
        _actualizarModalCerrarVenta();
      });
    });

    // Input monto y checkbox
    document
      .getElementById("cerrarVentaMonto")
      .addEventListener("input", _actualizarModalCerrarVenta);
    document
      .getElementById("cerrarVentaTotalCheck")
      .addEventListener("change", function () {
        if (this.checked) {
          document.getElementById("cerrarVentaMonto").value =
            _calcularTotalFinal();
        }
        _actualizarModalCerrarVenta();
      });

    // Inputs modo mixto
    document
      .getElementById("cerrarMixtoEfectivo")
      .addEventListener("input", _actualizarModalCerrarVenta);
    document
      .getElementById("cerrarMixtoTransferencia")
      .addEventListener("input", _actualizarModalCerrarVenta);

    document
      .getElementById("btnNuevoClienteDesdeVenta")
      .addEventListener("click", function () {
        var nombre = prompt("Nombre del cliente:");
        if (!nombre || !nombre.trim()) return;
        var notas =
          prompt("Notas opcionales (dejá vacío si no querés agregar):") || "";
        var cli = App.ClientesModule.agregarCliente(
          nombre.trim(),
          notas.trim(),
        );

        // Poblar selector y seleccionar el nuevo cliente
        App.EventBus.emit("clientes:poblar-selector");
        document.getElementById("cerrarVentaCliente").value = cli.id;
        _actualizarModalCerrarVenta();
      });

    // Eventos producto desde lista
    EventBus.on("ticket:agregar-producto", function (datos) {
      agregarProducto(datos.producto);
    });

    EventBus.on(
      "ticket:agregar-producto-calculado",
      function (productoCalculado) {
        var existe = _ticket.items.find(function (item) {
          return item.nombre === productoCalculado.nombre;
        });
        if (existe) return;
        _ticket.items.push(productoCalculado);
        _guardarEnStore();
        _render();
      },
    );

    // Limpiar ticket cuando cambia el margen de ganancia
    EventBus.on("ticket:limpiar", function () {
      _ticket = { items: [] };
      _render();
    });

    _restaurarDesdeStore();

    console.info("[TicketModule] iniciado");
  }

  return {
    init: init,
    abrir: abrir,
    cerrar: cerrar,
    agregarProducto: agregarProducto,
  };
})(App.EventBus, App.Store, App.PriceService);