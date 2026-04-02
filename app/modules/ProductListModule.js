// =============================================================
// ProductListModule.js — Renderizado de la lista de productos
// =============================================================

var App = App || {};

App.ProductListModule = (function (EventBus, Store, PriceService, ProductService) {

  var _productList  = null;
  var _importInput  = null;

  function render(lista) {
    _productList.innerHTML = "";

    if (!lista || lista.length === 0) {
      _productList.innerHTML = "<li style='padding:16px;color:#888;font-size:14px'>No se encontraron productos</li>";
      return;
    }

    var modoPromo  = Store.get("modoPromo");
    var modoTicket = Store.get("modoTicket");

    lista.forEach(function (producto) {
      var li = document.createElement("li");
      li.classList.add("product-item");

      var leftGroup = document.createElement("div");
      leftGroup.classList.add("product-left");

      if (modoPromo) {
        var btnPromoItem = document.createElement("button");
        btnPromoItem.classList.add("btn-icono");
        btnPromoItem.textContent = "🎁";
        btnPromoItem.title = "Agregar a promo";
        btnPromoItem.addEventListener("click", function (e) {
          e.stopPropagation();
          EventBus.emit("promo:agregar-producto", { producto: producto });
        });
        leftGroup.appendChild(btnPromoItem);
      }

      if (modoTicket) {
        var btnTicketItem = document.createElement("button");
        btnTicketItem.classList.add("btn-icono");
        btnTicketItem.textContent = "🧾";
        btnTicketItem.title = "Agregar al ticket";
        btnTicketItem.addEventListener("click", function (e) {
          e.stopPropagation();
          EventBus.emit("ticket:agregar-producto", { producto: producto });
        });
        leftGroup.appendChild(btnTicketItem);
      }

      var info = document.createElement("div");
      info.classList.add("product-info");

      var nombre = document.createElement("div");
      nombre.classList.add("product-name");
      nombre.textContent = producto.nombre;

      var meta = document.createElement("div");
      meta.classList.add("product-meta");
      meta.textContent = "Cód: " + producto.codigo + " · " + producto.categoria;

      info.appendChild(nombre);
      info.appendChild(meta);
      leftGroup.appendChild(info);

      var precio = document.createElement("div");
      precio.classList.add("product-price");
      precio.textContent = "$ " + PriceService.calcularDesdeStore(producto);

      var acciones    = document.createElement("div");
      acciones.classList.add("product-actions");

      var btnEditar   = document.createElement("button");
      btnEditar.classList.add("btn-icono");
      btnEditar.textContent = "✏️";
      btnEditar.title = "Editar";

      var btnEliminar = document.createElement("button");
      btnEliminar.classList.add("btn-icono");
      btnEliminar.textContent = "🗑️";
      btnEliminar.title = "Eliminar";

      btnEditar.addEventListener("click", function (e) {
        e.stopPropagation();
        EventBus.emit("editor:confirmar", { tipo: "editar", producto: producto });
      });

      btnEliminar.addEventListener("click", function (e) {
        e.stopPropagation();
        EventBus.emit("editor:confirmar", { tipo: "eliminar", producto: producto });
      });

      acciones.appendChild(btnEditar);
      acciones.appendChild(btnEliminar);

      li.appendChild(leftGroup);
      li.appendChild(precio);
      li.appendChild(acciones);
      _productList.appendChild(li);
    });
  }

  function init() {
    _productList = document.getElementById("productList");
    _importInput = document.getElementById("importarInput");

    EventBus.on("productos:filtrados", function (datos) { render(datos.lista); });
    EventBus.on("store:modoPromo:cambiado",  function () { EventBus.emit("busqueda:refiltrar"); });
    EventBus.on("store:modoTicket:cambiado", function () { EventBus.emit("busqueda:refiltrar"); });
    EventBus.on("store:ganancia:cambiado",   function () { EventBus.emit("busqueda:refiltrar"); });

    document.getElementById("exportarBtn")
      .addEventListener("click", function () { ProductService.exportar(); });

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