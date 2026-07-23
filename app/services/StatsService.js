// =============================================================
// StatsService.js — Cálculo de estadísticas de ventas
// =============================================================
// Funciones puras: reciben un array de ventas y devuelven números.
// No tocan el DOM, no leen ni escriben en Storage, no dependen de
// ningún otro módulo. Eso las hace testeables y reusables.
//
// Retrocompatible: las ventas guardadas antes de que los ítems
// llevaran `categoria` simplemente no aportan al desglose. Eso no
// se oculta, se informa como porcentaje de cobertura.
// =============================================================

var App = App || {};

App.StatsService = (function () {
  // Mismas claves que el <select id="editCategoria"> del editor.
  // Si se agrega una categoría allá, se agrega acá.
  var ETIQUETAS = {
    Libreria: "Librería",
    Cotillon: "Cotillón",
    Reposteria: "Repostería",
    Regaleria: "Regalería",
    Descartables: "Descartables",
    Electronica: "Electrónica",
    Copias: "Copias",
  };

  // ---------------------------------------------------------
  // _esPagoDeuda — saldar un fiado no es vender mercadería, así
  // que no puede repartirse entre categorías. Las ventas nuevas
  // traen la bandera; las viejas se reconocen por su forma.
  // ---------------------------------------------------------
  function _esPagoDeuda(venta) {
    if (venta.esPagoDeuda) return true;
    return !!(
      venta.items &&
      venta.items.length === 1 &&
      venta.items[0].nombre === "Pago de deuda"
    );
  }

  // ---------------------------------------------------------
  // _montoAtribuible — cuánto valen los ítems de esta venta una
  // vez aplicados descuentos, recargos y pagos parciales.
  //
  //   ajustes.totalFinal  hubo descuento o recargo
  //   totalMixto          pago mixto: el primer registro lleva
  //                       todos los ítems pero solo el monto en
  //                       efectivo, y el segundo va sin ítems.
  //                       Sin esto el desglose quedaría corto.
  //   total               caso normal y pago parcial
  // ---------------------------------------------------------
  function _montoAtribuible(venta) {
    if (venta.ajustes && typeof venta.ajustes.totalFinal === "number") {
      return venta.ajustes.totalFinal;
    }
    if (typeof venta.totalMixto === "number") return venta.totalMixto;
    return venta.total || 0;
  }

  // Ventas viejas podrían no tener `subtotal` guardado.
  function _subtotalItem(item) {
    if (typeof item.subtotal === "number") return item.subtotal;
    return (item.precioUnitario || 0) * (item.cantidad || 0);
  }

  // ---------------------------------------------------------
  // porCategoria — devuelve
  //
  //   {
  //     categorias: [{ clave, etiqueta, monto, costo, ganancia,
  //                    margen, unidades, porcentaje }]   desc
  //     cobertura : { conCategoria, total, porcentaje }
  //   }
  //
  // `porcentaje` de cada categoría se calcula sobre el monto con
  // categoría, no sobre el total del período: de otro modo, con
  // ventas viejas en el medio, todos los valores se achicarían y
  // dejarían de significar nada.
  // ---------------------------------------------------------
  function porCategoria(lista) {
    // Mismo criterio que el resto del panel: los fiados totales no
    // se contabilizan hasta que se cobran.
    var contables = (lista || []).filter(function (venta) {
      return !venta.soloHistorial;
    });

    var acumulado = {};
    var conCategoria = 0;
    var total = 0;

    contables.forEach(function (venta) {
      total += venta.total || 0;

      if (_esPagoDeuda(venta)) return;
      if (!Array.isArray(venta.items) || !venta.items.length) return;

      var subtotalItems = venta.items.reduce(function (acc, item) {
        return acc + _subtotalItem(item);
      }, 0);
      if (subtotalItems <= 0) return;

      // El descuento o recargo se reparte entre las categorías en
      // proporción a lo que aportó cada una. El costo no se toca:
      // un descuento baja lo que cobrás, no lo que te salió.
      var factor = _montoAtribuible(venta) / subtotalItems;

      venta.items.forEach(function (item) {
        var clave = item.categoria;
        if (!clave || !ETIQUETAS[clave]) return;

        if (!acumulado[clave]) {
          acumulado[clave] = {
            clave: clave,
            etiqueta: ETIQUETAS[clave],
            monto: 0,
            costo: 0,
            unidades: 0,
          };
        }

        var monto = _subtotalItem(item) * factor;
        acumulado[clave].monto += monto;
        acumulado[clave].costo += (item.costo || 0) * (item.cantidad || 0);
        acumulado[clave].unidades += item.cantidad || 0;
        conCategoria += monto;
      });
    });

    conCategoria = Math.round(conCategoria);
    total = Math.round(total);

    var categorias = Object.keys(acumulado)
      .map(function (clave) {
        var cat = acumulado[clave];
        cat.monto = Math.round(cat.monto);
        cat.costo = Math.round(cat.costo);
        cat.ganancia = cat.monto - cat.costo;
        cat.margen =
          cat.monto > 0 ? Math.round((cat.ganancia / cat.monto) * 100) : 0;
        cat.porcentaje =
          conCategoria > 0 ? Math.round((cat.monto / conCategoria) * 100) : 0;
        return cat;
      })
      .sort(function (a, b) {
        return b.monto - a.monto;
      });

    return {
      categorias: categorias,
      cobertura: {
        conCategoria: conCategoria,
        total: total,
        porcentaje: total > 0 ? Math.round((conCategoria / total) * 100) : 0,
      },
    };
  }

  // ---------------------------------------------------------
  // API pública
  // ---------------------------------------------------------
  return {
    porCategoria: porCategoria,
    etiqueta: function (clave) {
      return ETIQUETAS[clave] || clave;
    },
  };
})();