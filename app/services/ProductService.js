// =============================================================
// ProductService.js — Lógica de negocio del catálogo
// =============================================================
// Responsabilidades:
//   - Filtrar y buscar productos
//   - Validar datos antes de guardar
//   - Orquestar alta, edición y eliminación via Store
//   - Exportar e importar el catálogo (JSON)
//
// NO toca el DOM. NO conoce inputs ni botones.
// Recibe datos, devuelve resultados, emite eventos.
//
// Uso:
//   App.ProductService.filtrar(texto, categoria) → [productos]
//   App.ProductService.agregar(datos)            → { ok, error }
//   App.ProductService.actualizar(original, datos)→ { ok, error }
//   App.ProductService.eliminar(producto)        → { ok }
//   App.ProductService.exportar()                → descarga JSON
//   App.ProductService.importar(archivo, cb)     → cb({ ok, cantidad, error })
//   App.ProductService.codigoDuplicado(codigo, excluir) → boolean
// =============================================================

var App = App || {};

App.ProductService = (function (Store, PriceService, EventBus) {

  // ---------------------------------------------------------
  // filtrar — Búsqueda + filtro por categoría
  // Devuelve una nueva lista, no modifica el Store.
  // ---------------------------------------------------------
  function filtrar(texto, categoria) {
    var productos = Store.getProductos();
    var textoBajo = (texto || "").toLowerCase().trim();
    var categoriaBaja = (categoria || "").toLowerCase().trim();

    var resultado = productos.filter(function (p) {
      var coincideTexto =
        !textoBajo ||
        p.nombre.toLowerCase().includes(textoBajo) ||
        p.codigo.toLowerCase().includes(textoBajo);

      var coincideCategoria =
        !categoriaBaja ||
        p.categoria.toLowerCase().trim() === categoriaBaja;

      return coincideTexto && coincideCategoria;
    });

    // Si hay texto, los que empiezan con el texto van primero
    if (textoBajo) {
      resultado.sort(function (a, b) {
        var aNombre   = a.nombre.toLowerCase();
        var bNombre   = b.nombre.toLowerCase();
        var aEmpieza  = aNombre.startsWith(textoBajo);
        var bEmpieza  = bNombre.startsWith(textoBajo);

        if (aEmpieza && !bEmpieza) return -1;
        if (!aEmpieza && bEmpieza) return 1;
        return aNombre.localeCompare(bNombre, "es", { sensitivity: "base" });
      });
    }

    return resultado;
  }

  // ---------------------------------------------------------
  // _validar — Valida los datos de un producto
  // Devuelve { ok: true } o { ok: false, error: "mensaje" }
  // ---------------------------------------------------------
  function _validar(datos) {
    if (!datos.nombre || datos.nombre.trim() === "") {
      return { ok: false, error: "El nombre es obligatorio" };
    }
    if (!datos.codigo || datos.codigo.trim() === "") {
      return { ok: false, error: "El código es obligatorio" };
    }
    if (isNaN(datos.costo) || datos.costo === null || datos.costo === "") {
      return { ok: false, error: "El costo es obligatorio" };
    }
    if (datos.costo < 0) {
      return { ok: false, error: "El costo no puede ser negativo" };
    }
    return { ok: true };
  }

  // ---------------------------------------------------------
  // _codigoDuplicado — true si el código ya existe en otro producto
  // Si se pasa `excluir`, ignora ese producto (caso edición:
  // el mismo producto puede tener el mismo código sin ser duplicado)
  // ---------------------------------------------------------
  function _codigoDuplicado(codigo, excluir) {
    var c = String(codigo || "").trim().toLowerCase();
    if (!c) return false;
    return Store.getProductos().some(function (p) {
      if (excluir && p === excluir) return false;
      return p.codigo && String(p.codigo).toLowerCase() === c;
    });
  }

  // ---------------------------------------------------------
  // _normalizar — Limpia y tipifica los datos antes de guardar
  // ---------------------------------------------------------
  function _normalizar(datos) {
    var producto = {
      nombre   : datos.nombre.trim(),
      codigo   : datos.codigo.trim(),
      categoria: datos.categoria || "",
      costo    : parseFloat(datos.costo),
      ganancia : (datos.ganancia === "" || datos.ganancia === null || datos.ganancia === undefined)
                   ? null
                   : parseFloat(datos.ganancia),
      porPeso  : datos.porPeso === true,
    };

    // Escalas de precio por cantidad — campo opcional, retrocompatible
    // Solo se agrega al objeto si hay escalas definidas
    if (Array.isArray(datos.escalas) && datos.escalas.length > 0) {
      producto.escalas = datos.escalas.map(function (e) {
        return {
          cantidadMinima: parseFloat(e.cantidadMinima) || 0,
          margen        : parseFloat(e.margen) || 0,
        };
      });
    }
    // Si no hay escalas, no se agrega el campo (undefined en exportación JSON)

    return producto;
  }

  // ---------------------------------------------------------
  // Alta de producto
  // ---------------------------------------------------------
  function agregar(datos) {
    var validacion = _validar(datos);
    if (!validacion.ok) return validacion;

    if (_codigoDuplicado(datos.codigo)) {
      return {
        ok: false,
        error: "Ya existe un producto con el código '" + datos.codigo.trim() + "'",
      };
    }

    var producto = _normalizar(datos);
    Store.agregarProducto(producto);

    return { ok: true };
  }

  // ---------------------------------------------------------
  // actualizar — Edición de producto existente
  // ---------------------------------------------------------
  function actualizar(productoOriginal, datos) {
    var validacion = _validar(datos);
    if (!validacion.ok) return validacion;

    if (_codigoDuplicado(datos.codigo, productoOriginal)) {
      return {
        ok: false,
        error: "Ya existe otro producto con el código '" + datos.codigo.trim() + "'",
      };
    }

    var cambios = _normalizar(datos);
    Store.actualizarProducto(productoOriginal, cambios);

    return { ok: true };
  }

  // ---------------------------------------------------------
  // eliminar — Baja de producto
  // ---------------------------------------------------------
  function eliminar(producto) {
    Store.eliminarProducto(producto);
    return { ok: true };
  }

  // ---------------------------------------------------------
  // exportar — Descarga el catálogo como archivo JSON
  // Cada producto incluye stock y stockMinimo si están definidos.
  // Si un producto no tiene stock cargado, esos campos se omiten
  // (retrocompatible: equivale a "stock sin definir").
  // ---------------------------------------------------------
  function exportar() {
    var productos = Store.getProductos().map(function (p) {
      var copia = {};
      // Copiar todos los campos del producto tal cual
      Object.keys(p).forEach(function (k) {
        copia[k] = p[k];
      });

      // Inyectar stock si existe
      var s = Store.getStock ? Store.getStock(p.codigo) : null;
      if (s) {
        if (s.stock !== null && s.stock !== undefined) {
          copia.stock = s.stock;
        }
        if (s.stockMinimo !== null && s.stockMinimo !== undefined) {
          copia.stockMinimo = s.stockMinimo;
        }
      }

      return copia;
    });

    var datos = {
      version  : 1,
      fecha    : new Date().toISOString(),
      productos: productos,
    };

    var json = JSON.stringify(datos, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var url  = URL.createObjectURL(blob);

    var a      = document.createElement("a");
    a.href     = url;
    a.download = "tero-backup-productos.json";
    a.click();

    URL.revokeObjectURL(url);
  }

  // ---------------------------------------------------------
  // importar — Carga un archivo JSON y reemplaza el catálogo
  // callback recibe { ok, cantidad } o { ok: false, error }
  // ---------------------------------------------------------
  function importar(archivo, callback) {
    if (!archivo) {
      callback({ ok: false, error: "No se seleccionó ningún archivo" });
      return;
    }

    var reader = new FileReader();

    reader.onload = function (e) {
      try {
        var datos = JSON.parse(e.target.result);

        if (!datos.productos || !Array.isArray(datos.productos)) {
          callback({ ok: false, error: "Archivo inválido: no contiene productos" });
          return;
        }

        // Separar el stock del resto de los datos del producto.
        // Productos viejos sin stock/stockMinimo simplemente no se incluyen
        // en stockData (= "sin definir"), totalmente retrocompatible.
        var productosLimpios = [];
        var stockExtraido = {};

        datos.productos.forEach(function (p) {
          var producto = {};
          Object.keys(p).forEach(function (k) {
            if (k !== "stock" && k !== "stockMinimo") {
              producto[k] = p[k];
            }
          });
          productosLimpios.push(producto);

          var tieneStock = p.stock !== null && p.stock !== undefined;
          var tieneMinimo = p.stockMinimo !== null && p.stockMinimo !== undefined;

          if (tieneStock || tieneMinimo) {
            stockExtraido[p.codigo] = {
              stock      : tieneStock ? p.stock : null,
              stockMinimo: tieneMinimo ? p.stockMinimo : null,
            };
          }
        });

        Store.setProductos(productosLimpios);

        // Reemplazar stockData con lo extraído del archivo
        if (Store.setStock) {
          var stockActual = Store.getStockData ? Store.getStockData() : {};
          Object.keys(stockActual).forEach(function (cod) {
            delete stockActual[cod];
          });
          Object.keys(stockExtraido).forEach(function (codigo) {
            Store.setStock(codigo, stockExtraido[codigo]);
          });
        }

        callback({ ok: true, cantidad: productosLimpios.length });

      } catch (error) {
        callback({ ok: false, error: "Error al leer el archivo: " + error.message });
      }
    };

    reader.onerror = function () {
      callback({ ok: false, error: "No se pudo leer el archivo" });
    };

    reader.readAsText(archivo);
  }

  // API pública
  return {
    filtrar         : filtrar,
    agregar         : agregar,
    actualizar      : actualizar,
    eliminar        : eliminar,
    exportar        : exportar,
    importar        : importar,
    codigoDuplicado : _codigoDuplicado,
  };

})(App.Store, App.PriceService, App.EventBus);