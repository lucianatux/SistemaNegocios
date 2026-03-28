// =============================================================
// Storage.js — Persistencia unificada en localStorage
// =============================================================
// Regla: nadie en la app escribe en localStorage directamente.
// Todo pasa por acá. Las claves string solo existen en este archivo.
//
// Uso:
//   App.Storage.guardarDatos(datos)
//   App.Storage.cargarDatos()
//   App.Storage.guardarTicket(datos)
//   App.Storage.cargarTicket()
//   App.Storage.eliminarTicket()
//   ... (ver API completa abajo)
// =============================================================

var App = App || {};

App.Storage = (function () {

  // ---------------------------------------------------------
  // Claves de localStorage — definidas UNA sola vez acá.
  // Cambiar una clave acá la cambia en toda la app.
  // ---------------------------------------------------------
  var CLAVES = {
    DATOS_PRINCIPALES : "tero_datos",
    PROMO             : "tero_promo",
    TICKET            : "tero_ticket",
    PROMO_PREVIEW     : "tero_promo_preview",
  };

  // ---------------------------------------------------------
  // API genérica interna (privada)
  // ---------------------------------------------------------

  function _guardar(clave, datos) {
    try {
      localStorage.setItem(clave, JSON.stringify(datos));
    } catch (error) {
      console.error("[Storage] Error al guardar '" + clave + "':", error);
    }
  }

  function _cargar(clave) {
    try {
      var raw = localStorage.getItem(clave);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error("[Storage] Error al cargar '" + clave + "':", error);
      return null;
    }
  }

  function _eliminar(clave) {
    try {
      localStorage.removeItem(clave);
    } catch (error) {
      console.error("[Storage] Error al eliminar '" + clave + "':", error);
    }
  }

  // ---------------------------------------------------------
  // API pública nombrada
  // Cada módulo usa su método, nunca las claves directamente.
  // ---------------------------------------------------------
  return {

    // ---- Productos y configuración ----
    guardarDatos: function (datos) {
      _guardar(CLAVES.DATOS_PRINCIPALES, datos);
    },
    cargarDatos: function () {
      return _cargar(CLAVES.DATOS_PRINCIPALES);
    },

    // ---- Promo ----
    guardarPromo: function (datos) {
      _guardar(CLAVES.PROMO, datos);
    },
    cargarPromo: function () {
      return _cargar(CLAVES.PROMO);
    },
    eliminarPromo: function () {
      _eliminar(CLAVES.PROMO);
    },

    // ---- Ticket ----
    guardarTicket: function (datos) {
      _guardar(CLAVES.TICKET, datos);
    },
    cargarTicket: function () {
      return _cargar(CLAVES.TICKET);
    },
    eliminarTicket: function () {
      _eliminar(CLAVES.TICKET);
    },

    // ---- Preview WhatsApp ----
    guardarPromoPreview: function (datos) {
      _guardar(CLAVES.PROMO_PREVIEW, datos);
    },
    cargarPromoPreview: function () {
      return _cargar(CLAVES.PROMO_PREVIEW);
    },

    // ---- API genérica (para módulos futuros) ----
    // Uso: App.Storage.guardar("mi_modulo_datos", {...})
    guardar  : _guardar,
    cargar   : _cargar,
    eliminar : _eliminar,

  };

})();