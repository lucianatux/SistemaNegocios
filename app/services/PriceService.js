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
  // redondearPrecio — redondea al múltiplo de 10 MÁS CERCANO
  // (el medio, 5, va hacia arriba), con un piso mínimo de 10.
  //   2698 -> 2700   4401 -> 4400   3195 -> 3200
  //   2304 -> 2300     45 -> 50       3 -> 10 (piso)
  // ---------------------------------------------------------
  var PASO_REDONDEO = 10;
  var PRECIO_MINIMO = 10;

  function redondearPrecio(valor) {
    if (typeof valor !== "number" || !isFinite(valor)) return 0;
    // El +0.0001 evita que un 2649,99999998 (error de coma flotante)
    // caiga del lado equivocado al redondear los "medios".
    var redondeado = Math.round(valor / PASO_REDONDEO + 0.0001) * PASO_REDONDEO;
    return Math.max(PRECIO_MINIMO, redondeado);
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
    // Prioridad 2: margen de categoría
    else if (
      gananciasPorCategoria &&
      gananciasPorCategoria[producto.categoria] !== undefined
    ) {
      gananciaUsada = gananciasPorCategoria[producto.categoria];
    }

    var precioBase = producto.costo + (producto.costo * gananciaUsada) / 100;

    // Redondeo al múltiplo de 100 más cercano (regla del Excel del cliente)
    return redondearPrecio(precioBase);
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
    return redondearPrecio(producto.costo + (producto.costo * margen) / 100);
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