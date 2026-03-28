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

    // Redondeo hacia arriba al entero más cercano
    return Math.ceil(precioBase);
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

  // API pública
  return {
    calcular                  : calcular,
    calcularDesdeStore        : calcularDesdeStore,
    calcularMargenReal        : calcularMargenReal,
    calcularDescuentoMaxSeguro: calcularDescuentoMaxSeguro,
  };

})();