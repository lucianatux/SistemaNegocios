// =============================================================
// ProductListModule.js — Renderizado de la lista de productos
// =============================================================

var App = App || {};

App.ProductListModule = (function (
  EventBus,
  Store,
  PriceService,
  ProductService,
) {
  var _productList = null;
  var _importInput = null;
  var _ultimoSeleccionado = null;

  function render(lista) {
    _productList.innerHTML = "";

    if (!lista || lista.length === 0) {
      _productList.innerHTML =
        "<li style='padding:16px;color:#888;font-size:14px'>No se encontraron productos</li>";
      return;
    }

    var modoPromo = Store.get("modoPromo");
    var modoTicket = Store.get("modoTicket");

    lista.forEach(function (producto) {
      var li = document.createElement("li");
      li.classList.add("product-item");

      var leftGroup = document.createElement("div");
      leftGroup.classList.add("product-left");

      if (modoPromo) {
        var btnPromoItem = document.createElement("button");
        btnPromoItem.classList.add("btn-icono");

        if (producto.porPeso) {
          btnPromoItem.textContent = "⚖️";
          btnPromoItem.title = "Pesar y agregar a promo";
          btnPromoItem.addEventListener("click", function (e) {
            e.stopPropagation();
            EventBus.emit("pesaje:abrir", {
              producto: producto,
              destino: "promo",
            });
          });
        } else {
          btnPromoItem.textContent = "🎁";
          btnPromoItem.title = "Agregar a promo";
          btnPromoItem.addEventListener("click", function (e) {
            e.stopPropagation();
            EventBus.emit("promo:agregar-producto", { producto: producto });
          });
        }
        leftGroup.appendChild(btnPromoItem);
      }

      if (modoTicket) {
        var btnTicketItem = document.createElement("button");
        btnTicketItem.classList.add("btn-icono");

        if (producto.porPeso) {
          btnTicketItem.textContent = "⚖️";
          btnTicketItem.title = "Pesar y agregar al ticket";
          btnTicketItem.addEventListener("click", function (e) {
            e.stopPropagation();
            EventBus.emit("pesaje:abrir", {
              producto: producto,
              destino: "ticket",
            });
          });
        } else {
          btnTicketItem.textContent = "🧾";
          btnTicketItem.title = "Agregar al ticket";
          btnTicketItem.addEventListener("click", function (e) {
            e.stopPropagation();
            EventBus.emit("ticket:agregar-producto", { producto: producto });
          });
        }
        leftGroup.appendChild(btnTicketItem);
      }

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
      // Badge de escalas de precio
      if (Array.isArray(producto.escalas) && producto.escalas.length > 0) {
        var badgeEscalas = document.createElement("span");
        badgeEscalas.classList.add("badge-escalas");
        badgeEscalas.textContent = "🏷️ " + producto.escalas.length + " escalas";
        nombre.appendChild(badgeEscalas);
      } else if (producto.ganancia !== null && producto.ganancia !== undefined && producto.ganancia !== "") {
        var badgeEspecial = document.createElement("span");
        badgeEspecial.classList.add("badge-escalas");
        badgeEspecial.textContent = "🏷️ margen especial";
        nombre.appendChild(badgeEspecial);
      }

      var meta = document.createElement("div");
      meta.classList.add("product-meta");
      meta.textContent = "Cód: " + producto.codigo + " · " + producto.categoria;

      info.appendChild(nombre);
      info.appendChild(meta);
      leftGroup.appendChild(info);

      var precio = document.createElement("div");
      precio.classList.add("product-price");
      precio.textContent = "$ " + PriceService.calcularDesdeStore(producto);
      if (producto.porPeso) {
        var unit = document.createElement("span");
        unit.classList.add("price-unit");
        unit.textContent = "/100gr";
        precio.appendChild(unit);
      }

      // Badge de stock en lista
      var stockInfo = App.StockModule
        ? App.StockModule.getStock(producto.codigo)
        : null;
      if (
        stockInfo &&
        stockInfo.stock !== null &&
        stockInfo.stock !== undefined
      ) {
        var stockBadge = document.createElement("span");
        stockBadge.classList.add("product-stock");
        var esBajo = App.StockModule && App.StockModule.esBajo(stockInfo);
        stockBadge.classList.add(esBajo ? "bajo" : "ok");
        var unidad = producto.porPeso ? "g" : "u.";
        stockBadge.textContent = stockInfo.stock + " " + unidad;
        precio.appendChild(stockBadge);
      }

      var acciones = document.createElement("div");
      acciones.classList.add("product-actions");

      var btnEditar = document.createElement("button");
      btnEditar.classList.add("btn-icono");
      btnEditar.textContent = "✏️";
      btnEditar.title = "Editar";

      var btnEliminar = document.createElement("button");
      btnEliminar.classList.add("btn-icono");
      btnEliminar.textContent = "🗑️";
      btnEliminar.title = "Eliminar";

      btnEditar.addEventListener("click", function (e) {
        e.stopPropagation();
        EventBus.emit("editor:confirmar", {
          tipo: "editar",
          producto: producto,
        });
      });

      btnEliminar.addEventListener("click", function (e) {
        e.stopPropagation();
        EventBus.emit("editor:confirmar", {
          tipo: "eliminar",
          producto: producto,
        });
      });

      acciones.appendChild(btnEditar);
      acciones.appendChild(btnEliminar);

      li.appendChild(leftGroup);
      li.appendChild(precio);
      li.appendChild(acciones);
      _productList.appendChild(li);
      li.addEventListener("click", function () {
        // Quitar selección anterior
        document
          .querySelectorAll(".product-item.seleccionado")
          .forEach(function (el) {
            el.classList.remove("seleccionado");
          });
        // Si ya estaba seleccionado, deseleccionar (toggle)
        if (this === _ultimoSeleccionado) {
          _ultimoSeleccionado = null;
        } else {
          li.classList.add("seleccionado");
          _ultimoSeleccionado = li;
        }
      });
    });
  }

  function init() {
    _productList = document.getElementById("productList");
    _importInput = document.getElementById("importarInput");

    EventBus.on("productos:filtrados", function (datos) {
      render(datos.lista);
    });
    EventBus.on("store:modoPromo:cambiado", function () {
      EventBus.emit("busqueda:refiltrar");
    });
    EventBus.on("store:modoTicket:cambiado", function () {
      EventBus.emit("busqueda:refiltrar");
    });
    EventBus.on("store:ganancia:cambiado", function () {
      EventBus.emit("busqueda:refiltrar");
    });
    EventBus.on("stock:actualizado", function () {
      EventBus.emit("busqueda:refiltrar");
    });
    EventBus.on("store:stock:cambiado", function () {
      EventBus.emit("busqueda:refiltrar");
    });

    document
      .getElementById("exportarBtn")
      .addEventListener("click", function () {
        ProductService.exportar();
      });

    // Imprimir lista de productos
    var btnImprimirLista = document.getElementById("btnImprimirLista");
    if (btnImprimirLista) {
      btnImprimirLista.addEventListener("click", function () {
        var productos = Store.getProductos();
        var filas = productos.map(function (p) {
          var precio = PriceService.calcularDesdeStore(p);
          return '<tr>' +
            '<td style="padding:5px 10px;border-bottom:1px solid #eee">' + p.nombre + '</td>' +
            '<td style="padding:5px 10px;border-bottom:1px solid #eee;color:#555">' + p.codigo + '</td>' +
            '<td style="padding:5px 10px;border-bottom:1px solid #eee;color:#555">' + p.categoria + '</td>' +
            '<td style="padding:5px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:700">' +
            '$' + precio.toLocaleString('es-AR') +
            (p.porPeso ? '<span style="font-weight:400;color:#888">/100g</span>' : '') +
            '</td>' +
            '</tr>';
        }).join('');

        var ventana = window.open('', '_blank');
        var fecha = new Date().toLocaleDateString('es-AR');
        ventana.document.write(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lista de precios</title>' +
          '<style>body{font-family:sans-serif;padding:20px;color:#222}' +
          'h2{margin-bottom:4px}p{color:#666;margin:0 0 16px}' +
          'table{border-collapse:collapse;width:100%}' +
          'th{text-align:left;padding:8px 10px;background:#f0f0f0;border-bottom:2px solid #ccc}' +
          'tr:nth-child(even){background:#fafafa}' +
          '@media print{button{display:none}}' +
          '</style></head><body>' +
          '<button onclick="window.print()" style="margin-bottom:16px;padding:8px 16px;cursor:pointer">🖨️ Imprimir</button>' +
          '<h2>Lista de precios</h2><p>' + productos.length + ' productos · ' + fecha + '</p>' +
          '<table><thead><tr>' +
          '<th>Nombre</th><th>Código</th><th>Categoría</th><th style="text-align:right">Precio</th>' +
          '</tr></thead><tbody>' + filas + '</tbody></table>' +
          '</body></html>'
        );
        ventana.document.close();
      });
    }

    _importInput.addEventListener("change", function () {
      if (_importInput.files.length) {
        EventBus.emit("producto:importar:pedir-confirmacion");
      }
    });

    EventBus.on("producto:importar:confirmar", function () {
      var archivo = _importInput.files[0];
      ProductService.importar(archivo, function (resultado) {
        if (!resultado.ok) {
          alert(resultado.error);
        } else {
          alert(resultado.cantidad + " productos importados correctamente");
          EventBus.emit("busqueda:limpiar");
        }
        _importInput.value = "";
      });
    });

    // (dropdown backup eliminado — botones directos en sidebar)

    console.info("[ProductListModule] iniciado");
  }

  return { init: init, render: render };
})(App.EventBus, App.Store, App.PriceService, App.ProductService);