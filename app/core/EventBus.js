// =============================================================
// EventBus.js — Comunicación desacoplada entre módulos
// =============================================================
// Patrón: Publish / Subscribe
//
// Uso:
//   App.EventBus.on("productos:actualizado", función)  → suscribirse
//   App.EventBus.emit("productos:actualizado", datos)  → emitir
//   App.EventBus.once("app:lista", función)            → una sola vez
//   var cancelar = App.EventBus.on(...)                → desuscribirse
//   cancelar()
// =============================================================

var App = App || {};

App.EventBus = (function () {

  // Mapa interno: { "nombre:evento": [fn1, fn2, ...] }
  var _listeners = {};

  // ---------------------------------------------------------
  // on — Suscribirse a un evento
  // Devuelve una función para cancelar la suscripción.
  // Usar cuando el módulo puede destruirse (paneles, overlays).
  // ---------------------------------------------------------
  function on(evento, callback) {
    if (typeof callback !== "function") {
      console.warn("[EventBus] El callback de '" + evento + "' no es una función");
      return function () {};
    }

    if (!_listeners[evento]) {
      _listeners[evento] = [];
    }

    _listeners[evento].push(callback);

    return function off() {
      if (!_listeners[evento]) return;
      _listeners[evento] = _listeners[evento].filter(function (fn) {
        return fn !== callback;
      });
    };
  }

  // ---------------------------------------------------------
  // emit — Emitir un evento con datos opcionales
  // Todos los listeners registrados se ejecutan en orden.
  // Los errores en un listener no detienen los demás.
  // ---------------------------------------------------------
  function emit(evento, datos) {
    if (!_listeners[evento] || _listeners[evento].length === 0) return;

    _listeners[evento].forEach(function (callback) {
      try {
        callback(datos);
      } catch (error) {
        console.error("[EventBus] Error en listener de '" + evento + "':", error);
      }
    });
  }

  // ---------------------------------------------------------
  // once — Suscribirse a un evento una sola vez
  // El listener se elimina automáticamente tras la primera ejecución.
  // ---------------------------------------------------------
  function once(evento, callback) {
    var cancelar = on(evento, function (datos) {
      callback(datos);
      cancelar();
    });
  }

  // API pública
  return {
    on:   on,
    emit: emit,
    once: once,
  };

})();