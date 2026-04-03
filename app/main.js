// =============================================================
// main.js — Punto de entrada de la aplicación
// =============================================================
// Se ejecuta último, cuando todos los scripts ya cargaron.
// Su única responsabilidad es inicializar el Core y los módulos
// en el orden correcto.
//
// Orden garantizado:
//   1. EventBus  (ya listo al cargar)
//   2. Storage   (ya listo al cargar)
//   3. Store     (se inicializa acá, DATA ya existe)
//   4. Services  (ya listos al cargar)
//   5. Módulos   (se registran acá en el futuro)
// =============================================================

(function arrancar() {
  // 1. Core — Store necesita que data.js ya esté cargado
  App.Store.inicializar();

  // 2. Módulos de UI — orden importante:
  //    ProductListModule primero (escucha eventos de los demás)
  //    SearchModule último (emite el primer "productos:filtrados")
  App.ProductListModule.init();
  App.GananciaModule.init();
  App.EditorModule.init();
  App.PromoModule.init();
  App.TicketModule.init();
  App.VentasModule.init();
  App.PesajeModule.init();
  App.LightdarkModule.init();
  App.SearchModule.init();

  // Conectar eventos de búsqueda con SearchModule
  App.EventBus.on("busqueda:limpiar", App.SearchModule.limpiar);
  App.EventBus.on("busqueda:refiltrar", App.SearchModule.filtrar);

  // Primer render — todos los módulos ya están listos para escuchar
  App.SearchModule.filtrar();

  var cantProductos = App.Store.getProductos().length;
  console.info(
    "[Tero] App iniciada — " + cantProductos + " productos cargados.",
  );
})();
