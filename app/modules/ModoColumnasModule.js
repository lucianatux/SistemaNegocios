// =============================================================
// ModoColumnasModule.js — Buscador y lista en modo dos columnas
// =============================================================

var App = App || {};

App.ModoColumnasModule = (function (
  EventBus,
  Store,
  PriceService,
  ProductService,
) {
  var _lista = null;
  var _listaWrap = null; // div.modo-lista — el que tiene el scroll real
  var _input = null;
  var _select = null;
  var _busqueda = "";
  var _categoria = "";
  var _ultimoInput = 0; // timestamp del último caracter — para detectar lector

  function _productosFiltrados() {
    var lista = ProductService.filtrar(_busqueda, _categoria);
    var porCodigo =
      App.SearchModule && App.SearchModule.getOrdenPorCodigo
        ? App.SearchModule.getOrdenPorCodigo()
        : false;
    if (porCodigo) {
      lista = lista.slice().sort(function (a, b) {
        return (a.codigo || "").localeCompare(b.codigo || "", "es", {
          numeric: true,
          sensitivity: "base",
        });
      });
    }
    return lista;
  }

  function _render() {
    if (!_lista) return;
    _lista.innerHTML = "";

    var productos = _productosFiltrados();
    var modoTicket = Store.get("modoTicket");
    var modoPromo = Store.get("modoPromo");

    if (productos.length === 0) {
      _lista.innerHTML =
        "<li style='padding:16px;color:var(--color-texto-suave);font-size:14px'>No se encontraron productos</li>";
      return;
    }

    productos.forEach(function (producto) {
      var li = document.createElement("li");
      li.classList.add("product-item");

      var leftGroup = document.createElement("div");
      leftGroup.classList.add("product-left");

      var info = document.createElement("div");
      info.classList.add("product-info");

      var nombre = document.createElement("div");
      nombre.classList.add("product-name");
      nombre.textContent = producto.nombre;
      if (producto.porPeso) {
        var badge = document.createElement("span");
        badge.classList.add("badge-peso");
        badge.textContent = "⚖️ por 100gr";
        nombre.appendChild(badge);
      }
      if (Array.isArray(producto.escalas) && producto.escalas.length > 0) {
        var badgeEscalas = document.createElement("span");
        badgeEscalas.classList.add("badge-escalas");
        badgeEscalas.textContent = "🏷️ " + producto.escalas.length + " escalas";
        nombre.appendChild(badgeEscalas);
      }

      var meta = document.createElement("div");
      meta.classList.add("product-meta");
      meta.textContent =
        "Código: " + producto.codigo + " · " + producto.categoria;

      info.appendChild(nombre);
      info.appendChild(meta);
      leftGroup.appendChild(info);

      var precio = document.createElement("div");
      precio.classList.add("product-price");
      // Mostrar precio con escala x1 (la mínima). Si no tiene escalas, precio normal.
      precio.textContent =
        "$ " + PriceService.calcularConEscalaDesdeStore(producto, 1);
      if (producto.porPeso) {
        var unit = document.createElement("span");
        unit.classList.add("price-unit");
        unit.textContent = "/100gr";
        precio.appendChild(unit);
      }
      if (Array.isArray(producto.escalas) && producto.escalas.length > 0) {
        var unitEscala = document.createElement("span");
        unitEscala.classList.add("price-unit");
        unitEscala.textContent = " desde";
        precio.prepend(unitEscala);
      }

      // Botón agregar
      var btnAgregar = document.createElement("button");
      btnAgregar.classList.add("btn-agregar-modo");

      if (producto.porPeso) {
        btnAgregar.textContent = "⚖️ Pesar";
        btnAgregar.addEventListener("click", function () {
          var destino = modoTicket ? "ticket" : "promo";
          EventBus.emit("pesaje:abrir", {
            producto: producto,
            destino: destino,
          });
        });
      } else if (modoTicket) {
        btnAgregar.textContent = "+";
        btnAgregar.addEventListener("click", function () {
          EventBus.emit("ticket:agregar-producto", { producto: producto });
        });
      } else if (modoPromo) {
        btnAgregar.textContent = "🎁";
        btnAgregar.addEventListener("click", function () {
          EventBus.emit("promo:agregar-producto", { producto: producto });
        });
      }

      li.appendChild(leftGroup);
      li.appendChild(precio);
      li.appendChild(btnAgregar);
      _lista.appendChild(li);
    });
  }

  function _scrollAlTope() {
    if (_listaWrap) _listaWrap.scrollTop = 0;
    if (_lista) _lista.scrollTop = 0;
  }

  function iniciarBuscador() {
    _lista = document.getElementById("modoProductList");
    _listaWrap = _lista ? _lista.closest(".modo-lista") : null;
    _input = document.getElementById("modoBuscadorInput");
    _select = document.getElementById("modoCategoryFilter");

    _busqueda = "";
    _categoria = "";
    _ultimoInput = 0;
    _input.value = "";
    _select.value = "";

    _input.oninput = function () {
      _ultimoInput = Date.now(); // registrar momento del último caracter
      _busqueda = this.value;
      _render();
      _scrollAlTope();
    };

    // Enter en el buscador del modo columnas:
    // Busca por código EXACTO. Si encuentra exactamente un producto,
    // lo agrega al ticket/promo. Si no, no hace nada (la lista ya muestra
    // el filtro parcial gracias al oninput).
    _input.onkeydown = function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();

      var codigoBuscado = (_input.value || "").trim().toLowerCase();
      if (!codigoBuscado) return;

      var resultados = App.Store.getProductos().filter(function (p) {
        return p.codigo && String(p.codigo).toLowerCase() === codigoBuscado;
      });

      if (resultados.length !== 1) return; // 0 o varios → no agregar nada

      var producto = resultados[0];
      var modoTicket = Store.get("modoTicket");
      var modoPromo = Store.get("modoPromo");

      if (producto.porPeso) {
        var destino = modoTicket ? "ticket" : "promo";
        EventBus.emit("pesaje:abrir", { producto: producto, destino: destino });
      } else if (modoTicket) {
        EventBus.emit("ticket:agregar-producto", { producto: producto });
      } else if (modoPromo) {
        EventBus.emit("promo:agregar-producto", { producto: producto });
      }

      // Limpiar buscador listo para el próximo escaneo / tipeo
      _input.value = "";
      _busqueda = "";
      _ultimoInput = 0;
      _render();
    };

    _select.onchange = function () {
      _categoria = this.value;
      _render();
      _scrollAlTope();
    };

    // Botón orden por código / nombre — delega al toggle global de SearchModule
    var btnOrdenModo = document.getElementById("btnOrdenCodigoModo");
    if (btnOrdenModo) {
      btnOrdenModo.onclick = function () {
        if (App.SearchModule && App.SearchModule.toggleOrden) {
          App.SearchModule.toggleOrden();
        }
      };
    }

    _render();
    _scrollAlTope();
  }

  function init() {
    // Botón X del topbar — cierra ticket o promo según el modo activo
    document
      .getElementById("modoTopbarCerrar")
      .addEventListener("click", function () {
        if (Store.get("modoTicket")) {
          App.TicketModule.cerrar();
        } else if (Store.get("modoPromo")) {
          App.PromoModule.cerrar();
        }
      });

    // Re-renderizar si cambia el catálogo o el stock
    EventBus.on("store:productos:cambiado", function () {
      if (Store.get("modoTicket") || Store.get("modoPromo")) _render();
    });
    EventBus.on("stock:actualizado", function () {
      if (Store.get("modoTicket") || Store.get("modoPromo")) _render();
    });
    // Re-renderizar si cambia el criterio de orden global
    EventBus.on("orden:cambiado", function () {
      if (Store.get("modoTicket") || Store.get("modoPromo")) _render();
    });
    console.info("[ModoColumnasModule] iniciado");
  }

  return { init: init, iniciarBuscador: iniciarBuscador };
})(App.EventBus, App.Store, App.PriceService, App.ProductService);
