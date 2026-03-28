// =============================================================
// ProductListModule.js — Renderizado de la lista de productos
// =============================================================
// Responsabilidades:
//   - Escuchar "productos:filtrados" y renderizar la lista
//   - Agregar botones según el modo activo (promo, ticket)
//   - Delegar acciones a EditorModule vía EventBus
//   - Manejar exportar/importar del backup
// =============================================================

var App = App || {};

App.ProductListModule = (function (EventBus, Store, PriceService, ProductService) {

  var _productList  = null;
  var _importInput  = null;

  // ---------------------------------------------------------
  // render — dibuja la lista recibida
  // ---------------------------------------------------------
  function render(lista) {
    _productList.innerHTML = "";

    if (!lista || lista.length === 0) {
      _productList.innerHTML = "<li>No se encontraron productos</li>";
      return;
    }

    var modoPromo  = Store.get("modoPromo");
    var modoTicket = Store.get("modoTicket");

    lista.forEach(function (producto) {
      var li = document.createElement("li");
      li.classList.add("product-item");

      // — Grupo izquierdo —
      var leftGroup = document.createElement("div");
      leftGroup.classList.add("product-left");

      // Botón promo
      if (modoPromo) {
        var btnPromoItem = document.createElement("button");
        btnPromoItem.classList.add("btn-icono", "btn-promo-item");
        btnPromoItem.textContent = "🎁";
        btnPromoItem.addEventListener("click", function (e) {
          e.stopPropagation();
          EventBus.emit("promo:agregar-producto", { producto: producto });
        });
        leftGroup.appendChild(btnPromoItem);
      }

      // Botón ticket
      if (modoTicket) {
        var btnTicketItem = document.createElement("button");
        btnTicketItem.classList.add("btn-icono", "btn-ticket-item");
        btnTicketItem.textContent = "🧾";
        btnTicketItem.addEventListener("click", function (e) {
          e.stopPropagation();
          EventBus.emit("ticket:agregar-producto", { producto: producto });
        });
        leftGroup.appendChild(btnTicketItem);
      }

      // Info del producto
      var info      = document.createElement("div");
      info.classList.add("product-info");

      var nombre    = document.createElement("div");
      nombre.classList.add("product-name");
      nombre.textContent = producto.nombre;

      var codigo    = document.createElement("div");
      codigo.classList.add("product-code");
      codigo.textContent = "Código: " + producto.codigo;

      var categoria = document.createElement("div");
      categoria.classList.add("product-category");
      categoria.textContent = "Categoría: " + producto.categoria;

      var precio    = document.createElement("div");
      precio.classList.add("product-price");

      var precioLabel   = document.createElement("span");
      precioLabel.classList.add("price-label");
      precioLabel.textContent = "Precio público";

      var precioSimbolo = document.createElement("span");
      precioSimbolo.classList.add("price-currency");
      precioSimbolo.textContent = " $ ";

      var precioValor   = document.createElement("span");
      precioValor.classList.add("price-value");
      precioValor.textContent = PriceService.calcularDesdeStore(producto);

      precio.appendChild(precioLabel);
      precio.appendChild(precioSimbolo);
      precio.appendChild(precioValor);

      info.appendChild(nombre);
      info.appendChild(codigo);
      info.appendChild(categoria);
      info.appendChild(precio);
      leftGroup.appendChild(info);

      // — Acciones (derecha) —
      var acciones    = document.createElement("div");
      acciones.classList.add("product-actions");

      var btnEditar   = document.createElement("button");
      btnEditar.classList.add("btn-icono");
      btnEditar.textContent = "✏️";

      var btnEliminar = document.createElement("button");
      btnEliminar.classList.add("btn-icono");
      btnEliminar.textContent = "🗑️";

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
      li.appendChild(acciones);
      _productList.appendChild(li);
    });
  }

  // ---------------------------------------------------------
  // init
  // ---------------------------------------------------------
  function init() {
    _productList = document.getElementById("productList");
    _importInput = document.getElementById("importarInput");

    // Escuchar resultado del filtrado
    EventBus.on("productos:filtrados", function (datos) {
      render(datos.lista);
    });

    // Re-renderizar cuando cambia el modo promo o ticket
    EventBus.on("store:modoPromo:cambiado",  function () {
      EventBus.emit("busqueda:refiltrar");
    });
    EventBus.on("store:modoTicket:cambiado", function () {
      EventBus.emit("busqueda:refiltrar");
    });

    // Re-renderizar cuando cambian las ganancias (los precios cambian)
    EventBus.on("store:ganancia:cambiado", function () {
      EventBus.emit("busqueda:refiltrar");
    });

    // Exportar
    document.getElementById("exportarBtn")
      .addEventListener("click", function () {
        ProductService.exportar();
      });

    // Importar — pedir confirmación primero
    _importInput.addEventListener("change", function () {
      if (_importInput.files.length) {
        EventBus.emit("producto:importar:pedir-confirmacion");
      }
    });

    // Importar — ejecutar tras confirmación
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

    // Dropdown backup
    var btnBackup = document.getElementById("btnBackup");
    var dropdown  = btnBackup.parentElement;

    btnBackup.addEventListener("click", function (e) {
      e.stopPropagation();
      dropdown.classList.toggle("show");
    });
    document.addEventListener("click", function () {
      dropdown.classList.remove("show");
    });

    console.info("[ProductListModule] iniciado");
  }

  return { init: init, render: render };

})(App.EventBus, App.Store, App.PriceService, App.ProductService);