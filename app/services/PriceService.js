// =============================================================
// PriceService.js — Cálculo de precios
// =============================================================
// Responsabilidad única: dado un producto y los márgenes,
// devolver el precio público final.
//
// No depende de variables globales ni del DOM.
// Recibe todo lo que necesita como parámetros.
//
// Uso:
//   // Con parámetros explícitos (testeable, sin dependencias):
//   App.PriceService.calcular(producto, gananciaGlobal, gananciasPorCategoria)
//
//   // Wrapper conveniente que lee desde el Store:
//   App.PriceService.calcularDesdeStore(producto)
//
// Jerarquía de márgenes (de mayor a menor prioridad):
//   1. Margen especial del producto  (producto.ganancia !== null)
//   2. Margen de la categoría        (gananciasPorCategoria[categoria])
//   3. Margen global                 (gananciaGlobal)
// =============================================================

var App = App || {};

App.PriceService = (function () {

  // ---------------------------------------------------------
  // _norm — Normaliza un texto para comparar categorías:
  //   - minúsculas
  //   - sin tildes/diacríticos ("Cotillón" === "Cotillon")
  //   - sin espacios sobrantes
  // Evita que un producto guardado como "Cotillon" no encuentre
  // su margen si la clave de categoría se guardó como "Cotillón".
  // ---------------------------------------------------------
  function _norm(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quita diacríticos (tildes)
      .trim();
  }

  // ---------------------------------------------------------
  // _buscarMargenCategoria — devuelve el margen de la categoría
  // del producto, tolerando diferencias de tilde/mayúsculas.
  // Devuelve undefined si la categoría no tiene margen definido.
  // ---------------------------------------------------------
  function _buscarMargenCategoria(categoria, mapa) {
    if (!mapa) return undefined;

    // 1) Coincidencia exacta (camino rápido, 100% retrocompatible)
    if (mapa[categoria] !== undefined) return mapa[categoria];

    // 2) Coincidencia normalizada (tolera tildes / mayúsculas)
    var objetivo = _norm(categoria);
    var claves = Object.keys(mapa);
    for (var i = 0; i < claves.length; i++) {
      if (_norm(claves[i]) === objetivo) return mapa[claves[i]];
    }

    return undefined;
  }

  // ---------------------------------------------------------
  // redondearPrecio — redondea al múltiplo de 50 MÁS CERCANO
  // (el medio, 25, va hacia arriba), con un piso mínimo de 50.
  //   2698 -> 2700   4401 -> 4400   3195 -> 3200
  //   2304 -> 2300     45 -> 50       3 -> 50 (piso)
  // ---------------------------------------------------------
  var PASO_REDONDEO = 50;
  var PRECIO_MINIMO = 50;

  // Categorías con regla propia. Las que no figuran acá usan el paso
  // por defecto. Copias necesita un paso más fino porque con múltiplos
  // de 50 todos los márgenes bajos caían al mismo precio.
  var REDONDEO_POR_CATEGORIA = {
    Copias: { paso: 10, minimo: 10 },
  };

  function _reglaRedondeo(categoria) {
    if (categoria) {
      if (REDONDEO_POR_CATEGORIA[categoria]) {
        return REDONDEO_POR_CATEGORIA[categoria];
      }
      // Tolerante a tildes y mayúsculas, igual que los márgenes.
      var objetivo = _norm(categoria);
      var claves = Object.keys(REDONDEO_POR_CATEGORIA);
      for (var i = 0; i < claves.length; i++) {
        if (_norm(claves[i]) === objetivo) {
          return REDONDEO_POR_CATEGORIA[claves[i]];
        }
      }
    }
    return { paso: PASO_REDONDEO, minimo: PRECIO_MINIMO };
  }

  // `categoria` es opcional: sin ella se usa el paso por defecto, así
  // que cualquier llamada vieja sigue comportándose igual que antes.
  function redondearPrecio(valor, categoria) {
    if (typeof valor !== "number" || !isFinite(valor)) return 0;
    var regla = _reglaRedondeo(categoria);
    // El +0.0001 evita que un 2649,99999998 (error de coma flotante)
    // caiga del lado equivocado al redondear los "medios".
    var redondeado = Math.round(valor / regla.paso + 0.0001) * regla.paso;
    return Math.max(regla.minimo, redondeado);
  }

  // ---------------------------------------------------------
  // calcular — función pura, sin efectos secundarios
  // Siempre devuelve el mismo resultado para los mismos parámetros.
  // ---------------------------------------------------------
  function calcular(producto, gananciaGlobal, gananciasPorCategoria) {
    if (!producto || typeof producto.costo !== "number") {
      console.warn("[PriceService] Producto inválido:", producto);
      return 0;
    }

    var gananciaUsada = gananciaGlobal || 0;

    // Prioridad 1: margen especial del producto
    if (producto.ganancia !== null && producto.ganancia !== undefined) {
      gananciaUsada = producto.ganancia;
    }
    // Prioridad 2: margen de categoría (tolerante a tildes/mayúsculas)
    else {
      var margenCategoria = _buscarMargenCategoria(
        producto.categoria,
        gananciasPorCategoria
      );
      if (margenCategoria !== undefined) {
        gananciaUsada = margenCategoria;
      }
    }

    var precioBase = producto.costo + (producto.costo * gananciaUsada) / 100;

    // Redondeo al múltiplo de 50 más cercano (regla del Excel del cliente)
    return redondearPrecio(precioBase, producto.categoria);
  }

  // ---------------------------------------------------------
  // calcularDesdeStore — wrapper conveniente
  // Lee los márgenes del Store y delega a calcular().
  // Usar en módulos que ya tienen acceso al Store.
  // ---------------------------------------------------------
  function calcularDesdeStore(producto) {
    var gananciaGlobal        = App.Store.get("gananciaGlobal");
    var gananciasPorCategoria = App.Store.get("gananciasPorCategoria");
    return calcular(producto, gananciaGlobal, gananciasPorCategoria);
  }

  // ---------------------------------------------------------
  // calcularMargenReal — para info del vendedor y módulo Caja
  // Devuelve el margen real en % sobre el costo.
  // ---------------------------------------------------------
  function calcularMargenReal(costo, precioFinal) {
    if (!costo || costo <= 0) return 0;
    return Number(((precioFinal - costo) / costo * 100).toFixed(2));
  }

  // ---------------------------------------------------------
  // calcularDescuentoMaxSeguro — para módulo Promo
  // Devuelve el % máximo de descuento sin perder dinero.
  // ---------------------------------------------------------
  function calcularDescuentoMaxSeguro(totalPrecioPublico, totalCosto) {
    if (!totalPrecioPublico || totalPrecioPublico <= 0) return 0;
    var max = (1 - totalCosto / totalPrecioPublico) * 100;
    return Number(max.toFixed(2));
  }

  // ---------------------------------------------------------
  // calcularConEscala — aplica la escala correcta según cantidad
  // Si el producto no tiene escalas, usa calcular() normal.
  // Retrocompatible: si escalas === undefined funciona igual que antes.
  //
  // Nota sobre unidades: para productos por peso, `cantidad` y
  // `cantidadMinima` se expresan en GRAMOS (ej: "desde 500 g").
  // Para productos por unidad, en unidades.
  // ---------------------------------------------------------
  function calcularConEscala(producto, cantidad, gananciaGlobal, gananciasPorCategoria) {
    if (!producto || typeof producto.costo !== "number") return 0;

    // Sin escalas definidas → precio base normal
    if (!Array.isArray(producto.escalas) || producto.escalas.length === 0) {
      return calcular(producto, gananciaGlobal, gananciasPorCategoria);
    }

    var cant = parseFloat(cantidad) || 1;

    // Ordenar escalas de mayor a menor umbral y encontrar la que aplica
    var escalaAplicable = producto.escalas
      .slice()
      .sort(function (a, b) { return b.cantidadMinima - a.cantidadMinima; })
      .find(function (e) { return cant >= e.cantidadMinima; });

    // Si la cantidad es menor al primer umbral, usar la escala de menor umbral
    if (!escalaAplicable) {
      escalaAplicable = producto.escalas
        .slice()
        .sort(function (a, b) { return a.cantidadMinima - b.cantidadMinima; })[0];
    }

    var margen = escalaAplicable ? escalaAplicable.margen : 0;
    return redondearPrecio(
      producto.costo + (producto.costo * margen) / 100,
      producto.categoria
    );
  }

  // ---------------------------------------------------------
  // calcularConEscalaDesdeStore — wrapper conveniente con escala
  // ---------------------------------------------------------
  function calcularConEscalaDesdeStore(producto, cantidad) {
    var gananciaGlobal        = App.Store.get("gananciaGlobal");
    var gananciasPorCategoria = App.Store.get("gananciasPorCategoria");
    return calcularConEscala(producto, cantidad, gananciaGlobal, gananciasPorCategoria);
  }

  // API pública
  return {
    redondearPrecio           : redondearPrecio,
    calcular                  : calcular,
    calcularDesdeStore        : calcularDesdeStore,
    calcularConEscala         : calcularConEscala,
    calcularConEscalaDesdeStore: calcularConEscalaDesdeStore,
    calcularMargenReal        : calcularMargenReal,
    calcularDescuentoMaxSeguro: calcularDescuentoMaxSeguro,
  };

})();