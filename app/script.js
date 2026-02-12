// ---------------------------
// DATOS PRINCIPALES
// ---------------------------
let productos = [];
let gananciaGlobal = 0;
let gananciasPorCategoria = {};

let modoEditor = null; // "editar" | "crear"
let productoEditando = null;

let promoActual = {
  nombre: "",
  descuento: 0,
  items: [], // productos de la promo
};

let modoPromoActivo = false;
let modoTicketActivo = false;
let accionPendiente = null;

let promoPanelActivo = false;
let infoVendedorVisible = false;

// ---------------------------
// ELEMENTOS DEL DOM
// ---------------------------
// Búsqueda y filtros
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

// Lista de productos
const productList = document.getElementById("productList");

// Gestión de ganancia global
const btnGestion = document.getElementById("btnGestion");
const btnCerrarGlobal = document.getElementById("cerrarGlobal");
const gestion = document.getElementById("gestion");
const gananciaGlobalInput = document.getElementById("gananciaGlobalInput");
const aplicarGlobalBtn = document.getElementById("aplicarGlobal");
const bannerGanancia = document.getElementById("bannerGanancia");
const cerrarBannerBtn = document.getElementById("cerrarBanner");
const gananciasCategoriaInputs = document.querySelectorAll(
  ".ganancia-categoria",
);

// Editor de productos
const guardarProductoBtn = document.getElementById("guardarProducto");
const btnAgregarProducto = document.getElementById("btnAgregarProducto");
const editorProducto = document.getElementById("editorProducto");
const cerrarEditorBtn = document.getElementById("cerrarEditor");
const cancelarEdicionBtn = document.getElementById("cancelarEdicion");

// Confirmaciones
const overlayConfirmacion = document.getElementById("overlayConfirmacion");
const confirmacionTexto = document.getElementById("confirmacionTexto");
const confirmacionTitulo = document.getElementById("confirmacionTitulo");
const confirmarAccionBtn = document.getElementById("confirmarAccion");
const cancelarConfirmacionBtn = document.getElementById("cancelarConfirmacion");

// Promos
const btnPromo = document.getElementById("btnPromo");
const promoPanel = document.getElementById("promoPanel");
const cerrarPromo = document.getElementById("cerrarPromo");
const promoDescuentoInput = document.getElementById("promoDescuento");
const totalAhorroElemento = document.getElementById("totalAhorro");
const totalConDescuentoElemento = document.getElementById("totalConDescuento");
const promoWarning = document.getElementById("promoWarning");
const totalSinDescuentoElemento = document.getElementById("totalSinDescuento");

// Backup / Import
const importarInput = document.getElementById("importarInput");

// ---------------------------
// INICIALIZAR DATOS
// ---------------------------

function inicializarDatos() {
  const dataLocal = cargarDesdeLocalStorage();

  if (dataLocal) {
    productos = dataLocal.productos || [];
    gananciaGlobal = dataLocal.gananciaGlobal || 0;
    gananciasPorCategoria = dataLocal.gananciasPorCategoria || {};
  } else {
    productos = DATA.productos;
    gananciaGlobal = DATA.configuracion.gananciaGlobal;
    gananciasPorCategoria = {};
  }
}

function guardarEnLocalStorage() {
  const data = {
    productos,
    gananciaGlobal,
    gananciasPorCategoria,
  };
  localStorage.setItem("miAppProductos", JSON.stringify(data));
}

function cargarDesdeLocalStorage() {
  const data = localStorage.getItem("miAppProductos");
  return data ? JSON.parse(data) : null;
}

// ---------------------------
// CARGAR DATOS
// ---------------------------

inicializarDatos();
ordenarProductos();
mostrarProductos(productos);
editorProducto.classList.add("oculto");

// ---------------------------
// ORDENAR ALFABÉTICAMENTE
// ---------------------------
function ordenarProductos() {
  productos.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );
}

// ---------------------------
// RESTAURAR PROMO DESDE LOCAL STORAGE
// ---------------------------
function restaurarPromoDesdeLocalStorage() {
  const guardado = localStorage.getItem("promoActual");
  if (!guardado) return;

  try {
    const data = JSON.parse(guardado);

    promoActual = data.promoActual;
    modoPromoActivo = data.modoPromoActivo;

    promoDescuentoInput.value = promoActual.descuento || 0;
    document.getElementById("promoNombre").value = promoActual.nombre || "";

    if (modoPromoActivo) {
      renderPromo();
      filtrarProductos();
    }
  } catch {
    localStorage.removeItem("promoActual");
  }
}
restaurarPromoDesdeLocalStorage();

// ---------------------------
// CALCULAR PRECIO FINAL
// ---------------------------
function calcularPrecio(producto) {
  let gananciaUsada = gananciaGlobal;

  // 🥇 margen del producto
  if (producto.ganancia !== null) {
    gananciaUsada = producto.ganancia;
  }
  // 🥈 margen de categoría
  else if (gananciasPorCategoria[producto.categoria] !== undefined) {
    gananciaUsada = gananciasPorCategoria[producto.categoria];
  }

  const precioBase = producto.costo + (producto.costo * gananciaUsada) / 100;
  const precioRedondeado = Math.ceil(precioBase / 10) * 10;

  return precioRedondeado;
}

// ---------------------------
// MOSTRAR PRODUCTOS
// ---------------------------
function mostrarProductos(lista) {
  productList.innerHTML = "";

  if (lista.length === 0) {
    productList.innerHTML = "<li>No se encontraron productos</li>";
    return;
  }

  lista.forEach((producto) => {
    const li = document.createElement("li");
    li.classList.add("product-item");

    // 👉 CONTENEDOR IZQUIERDO (promo + info)
    const leftGroup = document.createElement("div");
    leftGroup.classList.add("product-left");

    // BOTÓN PROMO (solo en modo promo)
    if (promoPanelActivo) {
      const btnPromoItem = document.createElement("button");
      btnPromoItem.classList.add("btn-icono", "btn-promo-item");
      btnPromoItem.textContent = "🎁";

      btnPromoItem.addEventListener("click", (e) => {
        e.stopPropagation();
        agregarProductoAPromo(producto);
      });

      leftGroup.appendChild(btnPromoItem);
    }
    //BOTÓN TICKET
    if (modoTicketActivo) {
      const btnTicketItem = document.createElement("button");
      btnTicketItem.classList.add("btn-icono", "btn-ticket-item");
      btnTicketItem.textContent = "🧾";

      btnTicketItem.addEventListener("click", (e) => {
        e.stopPropagation();
        agregarProductoATicket(producto);
      });

      leftGroup.appendChild(btnTicketItem);
    }

    // INFO DEL PRODUCTO
    const info = document.createElement("div");
    info.classList.add("product-info");

    const nombre = document.createElement("div");
    nombre.classList.add("product-name");
    nombre.textContent = producto.nombre;

    const codigo = document.createElement("div");
    codigo.classList.add("product-code");
    codigo.textContent = "Código: " + producto.codigo;

    const categoria = document.createElement("div");
    categoria.classList.add("product-category");
    categoria.textContent = "Categoría: " + producto.categoria;

    const precio = document.createElement("div");
    precio.classList.add("product-price");

    const precioLabel = document.createElement("span");
    precioLabel.classList.add("price-label");
    precioLabel.textContent = "Precio público";

    const precioSimbolo = document.createElement("span");
    precioSimbolo.classList.add("price-currency");
    precioSimbolo.textContent = " $ ";

    const precioValor = document.createElement("span");
    precioValor.classList.add("price-value");
    precioValor.textContent = calcularPrecio(producto);

    precio.appendChild(precioLabel);
    precio.appendChild(precioSimbolo);
    precio.appendChild(precioValor);

    info.appendChild(nombre);
    info.appendChild(codigo);
    info.appendChild(categoria);
    info.appendChild(precio);

    // info va dentro del grupo izquierdo
    leftGroup.appendChild(info);

    // ACCIONES (derecha)
    const acciones = document.createElement("div");
    acciones.classList.add("product-actions");

    const btnEditar = document.createElement("button");
    btnEditar.classList.add("btn-icono");
    btnEditar.textContent = "✏️";

    const btnEliminar = document.createElement("button");
    btnEliminar.classList.add("btn-icono");
    btnEliminar.textContent = "🗑️";

    btnEditar.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirConfirmacion("editar", producto);
    });

    btnEliminar.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirConfirmacion("eliminar", producto);
    });

    acciones.appendChild(btnEditar);
    acciones.appendChild(btnEliminar);

    // ARMADO FINAL
    li.appendChild(leftGroup);
    li.appendChild(acciones);
    productList.appendChild(li);
  });
}

// ---------------------------
// BUSCADOR + FILTRO CATEGORÍA
// ---------------------------
function filtrarProductos() {
  const texto = searchInput.value.toLowerCase();
  const categoria = categoryFilter.value;

  let filtrados = productos.filter((p) => {
    const coincideTexto =
      p.nombre.toLowerCase().includes(texto) ||
      p.codigo.toLowerCase().includes(texto);

    const coincideCategoria =
      !categoria ||
      p.categoria.toLowerCase().trim() === categoria.toLowerCase().trim();

    return coincideTexto && coincideCategoria;
  });

  if (texto) {
    filtrados.sort((a, b) => {
      const aNombre = a.nombre.toLowerCase();
      const bNombre = b.nombre.toLowerCase();

      const aEmpieza = aNombre.startsWith(texto);
      const bEmpieza = bNombre.startsWith(texto);

      if (aEmpieza && !bEmpieza) return -1;
      if (!aEmpieza && bEmpieza) return 1;

      return aNombre.localeCompare(bNombre, "es", { sensitivity: "base" });
    });
  }

  mostrarProductos(filtrados);
}

searchInput.addEventListener("input", filtrarProductos);
categoryFilter.addEventListener("change", filtrarProductos);

// ---------------------------
// MOSTRAR / OCULTAR GESTIÓN
// ---------------------------

btnGestion.addEventListener("click", () => {
  gestion.classList.toggle("oculto");
  gananciaGlobalInput.value = gananciaGlobal;

  gananciasCategoriaInputs.forEach((input) => {
    const cat = input.dataset.categoria;
    input.value =
      gananciasPorCategoria[cat] !== undefined
        ? gananciasPorCategoria[cat]
        : "";
  });
});

btnCerrarGlobal.addEventListener("click", () => {
  gestion.classList.toggle("oculto");
  gananciaGlobalInput.value = gananciaGlobal;
});

// ---------------------------
// APLICAR GANANCIA GLOBAL
// ---------------------------

aplicarGlobalBtn.addEventListener("click", () => {
  gananciaGlobal = parseFloat(gananciaGlobalInput.value) || 0;

  gananciasPorCategoria = {};

  gananciasCategoriaInputs.forEach((input) => {
    const valor = input.value;
    const categoria = input.dataset.categoria;

    if (valor !== "") {
      gananciasPorCategoria[categoria] = parseFloat(valor);
    }
  });

  ordenarProductos();
  searchInput.value = "";
  categoryFilter.value = "";
  mostrarProductos(productos);
  guardarEnLocalStorage();

  bannerGanancia.classList.remove("oculto");

  setTimeout(() => {
    bannerGanancia.classList.add("oculto");
  }, 3000);
});

// ---------------------------
// ABRIR EDITOR
// ---------------------------
function abrirEditor(modo, producto = null) {
  modoEditor = modo;
  productoEditando = producto;

  const titulo = document.getElementById("productoEditando");
  const precioPublico = document.getElementById("editPrecioPublico");

  if (modo === "crear") {
    titulo.textContent = "Nuevo producto";

    document.getElementById("editNombre").value = "";
    document.getElementById("editCodigo").value = "";
    document.getElementById("editCategoria").value = "";
    document.getElementById("editCosto").value = "";
    document.getElementById("editGanancia").value = "";
    precioPublico.textContent = "-";
  }

  if (modo === "editar") {
    titulo.textContent = "Editando: " + producto.nombre;

    document.getElementById("editNombre").value = producto.nombre;
    document.getElementById("editCodigo").value = producto.codigo;
    document.getElementById("editCategoria").value = producto.categoria;
    document.getElementById("editCosto").value = producto.costo;
    document.getElementById("editGanancia").value =
      producto.ganancia !== null ? producto.ganancia : "";
    precioPublico.textContent = "$ " + calcularPrecio(producto);
  }

  editorProducto.classList.remove("oculto");
}

// ---------------------------
// GUARDAR PRODUCTO
// ---------------------------

guardarProductoBtn.addEventListener("click", () => {
  const nombre = document.getElementById("editNombre").value.trim();
  const codigo = document.getElementById("editCodigo").value.trim();
  const categoria = document.getElementById("editCategoria").value;
  const costo = parseFloat(document.getElementById("editCosto").value);
  const gananciaInput = document.getElementById("editGanancia").value;
  const ganancia = gananciaInput === "" ? null : parseFloat(gananciaInput);

  if (!nombre || !codigo || isNaN(costo)) {
    alert("Completá nombre, código y costo");
    return;
  }

  if (modoEditor === "crear") {
    productos.push({
      nombre,
      codigo,
      categoria,
      costo,
      ganancia,
    });
  }

  if (modoEditor === "editar") {
    productoEditando.nombre = nombre;
    productoEditando.codigo = codigo;
    productoEditando.categoria = categoria;
    productoEditando.costo = costo;
    productoEditando.ganancia = ganancia;
  }

  ordenarProductos();
  // Actualizar lista respetando el buscador
  actualizarListaDespuesEdicion();
  guardarEnLocalStorage();
  cerrarEditorProducto();
});

// ---------------------------
// LIMPIAR SELECCIÓN
// ---------------------------

function limpiarSeleccion() {
  document.querySelectorAll(".product-item").forEach((item) => {
    item.classList.remove("seleccionado");
  });
}

// ---------------------------
// CERRAR EDITOR
// ---------------------------
function cerrarEditorProducto() {
  editorProducto.classList.add("oculto");
  modoEditor = null;
  productoEditando = null;
}

// ---------------------------
// CONECTAR BOTONES
// ---------------------------
cerrarEditorBtn.addEventListener("click", cerrarEditorProducto);
cancelarEdicionBtn.addEventListener("click", cerrarEditorProducto);
document.getElementById("exportarBtn").addEventListener("click", exportarDatos);
const btnToggleInfoVendedor = document.getElementById("toggleInfoVendedor");
btnToggleInfoVendedor.addEventListener("click", () => {
  infoVendedorVisible = !infoVendedorVisible;
  btnToggleInfoVendedor.textContent = infoVendedorVisible
    ? "Ocultar info vendedor"
    : "Mostrar info vendedor";
  renderInfoVendedor();
});

// ---------------------------
// CERRAR BANNER
// ---------------------------
cerrarBannerBtn.addEventListener("click", () => {
  bannerGanancia.classList.add("oculto");
});

// ---------------------------
// ABRIR CONFIRMACIÓN
// ---------------------------
function abrirConfirmacion(tipo, producto) {
  accionPendiente = { tipo, producto };

  // Reset visual
  confirmacionTitulo.classList.remove("titulo-peligro");

  if (tipo === "editar") {
    confirmacionTitulo.textContent = "Editar producto";
    confirmacionTexto.textContent = `¿Querés editar el producto "${producto.nombre}"?`;
  }

  if (tipo === "eliminar") {
    confirmacionTitulo.textContent = "Eliminar producto";
    confirmacionTexto.textContent = `¿Seguro que querés eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`;
    confirmacionTitulo.classList.add("titulo-peligro");
  }

  overlayConfirmacion.classList.remove("oculto");
}

// ---------------------------
// CONFIRMAR ACCIÓN
// ---------------------------
confirmarAccionBtn.addEventListener("click", () => {
  if (!accionPendiente) return;

  const { tipo, producto } = accionPendiente;

  if (tipo === "editar") {
    abrirEditor("editar", producto);
  }

  if (tipo === "eliminar") {
    productos = productos.filter((p) => p !== producto);
    mostrarProductos(productos);
    guardarEnLocalStorage();
    searchInput.value = "";
    categoryFilter.value = "";
  }

  if (accionPendiente.tipo === "importar") {
    importarDatos();
    searchInput.value = "";
    categoryFilter.value = "";
  }

  cerrarConfirmacion();
});

// ---------------------------
// CANCELAR CERRAR CONFIRMACIÓN
// ---------------------------
function cerrarConfirmacion() {
  overlayConfirmacion.classList.add("oculto");
  accionPendiente = null;
}

cancelarConfirmacionBtn.addEventListener("click", cerrarConfirmacion);

// ---------------------------
// AGREGAR PRODUCTO
// ---------------------------
btnAgregarProducto.addEventListener("click", () => {
  abrirEditor("crear");
});

// ---------------------------
// EXPORTAR DATOS
// ---------------------------
function exportarDatos() {
  const datos = {
    version: 1,
    fecha: new Date().toISOString(),
    productos: productos,
  };

  const json = JSON.stringify(datos, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "mi-negocio-backup.json";
  a.click();

  URL.revokeObjectURL(url);
}

// ---------------------------
// IMPORTAR DATOS
// ---------------------------
function importarDatos() {
  const input = document.getElementById("importarInput");
  const archivo = input.files[0];

  if (!archivo) {
    alert("Seleccioná un archivo primero");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const datos = JSON.parse(e.target.result);

      // Validación mínima
      if (!datos.productos || !Array.isArray(datos.productos)) {
        alert("Archivo inválido: no contiene productos válidos");
        return;
      }

      productos = datos.productos;

      ordenarProductos();
      // Guardar inmediatamente en localStorage
      guardarEnLocalStorage();

      // Limpiar buscador al actualizar la lista
      searchInput.value = "";
      categoryFilter.value = "";

      // Mostrar productos
      mostrarProductos(productos);

      alert("Datos importados correctamente");

      // Limpiar input para futuras importaciones
      input.value = "";
    } catch (error) {
      console.error("Error al parsear JSON:", error);
      alert("Error al leer el archivo: " + error.message);
    }
  };

  reader.readAsText(archivo);
}

// ---------------------------
// DROPDOWN BACKUP FUNCIONAL
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {
  const btnBackup = document.getElementById("btnBackup");
  const dropdown = btnBackup.parentElement; // el contenedor .dropdown
  const importarInput = document.getElementById("importarInput");

  // Toggle del dropdown al hacer click en el botón
  btnBackup.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("show");
  });

  // Cerrar dropdown al hacer click fuera
  document.addEventListener("click", () => {
    dropdown.classList.remove("show");
  });

  // Input file integrado (opción moderna)
  importarInput.addEventListener("change", () => {
    if (importarInput.files.length) {
      abrirConfirmacionImport();
      // No llamar a importarDatos() todavía
    }
  });
});

// ---------------------------
// ABRIR CONFIRMACION IMPORTAR
// ---------------------------
function abrirConfirmacionImport() {
  confirmacionTitulo.textContent = "Importar datos";
  confirmacionTexto.textContent =
    "⚠️ Esto reemplazará todos los productos actuales. ¿Querés continuar?";

  accionPendiente = { tipo: "importar" }; // tipo especial para importar
  overlayConfirmacion.classList.remove("oculto");
}

// ---------------------------
// ACTUALIZAR LISTA DESPUÉS DE EDICIÓN
// ---------------------------
function actualizarListaDespuesEdicion() {
  filtrarProductos();
}
// ---------------------------
// PROMO – NOMBRE
// ---------------------------
const promoNombreInput = document.getElementById("promoNombre");

promoNombreInput.addEventListener("input", () => {
  if (!promoActual) return;

  promoActual.nombre = promoNombreInput.value.trim();
  actualizarPreview(); // refresca el modal si está abierto
});

// ---------------------------
// AGREGAR PRODUCTO A PROMO
// ---------------------------
function agregarProductoAPromo(producto) {
  const precioPublico = calcularPrecio(producto);

  const yaExiste = promoActual.items.find(
    (item) => item.nombre === producto.nombre,
  );

  if (yaExiste) {
    return; // no duplicamos ni sumamos
  }

  promoActual.items.push({
    nombre: producto.nombre,
    precio: precioPublico,
    cantidad: 1, // valor inicial, luego editable
    costo: producto.costo, // SOLO para cálculos internos
    ganancia: producto.ganancia !== null ? producto.ganancia : gananciaGlobal,
  });
  guardarPromoEnLocalStorage();
  renderPromo();
}

// ---------------------------
// ABRIR PROMO
// ---------------------------
btnPromo.addEventListener("click", () => {
  promoPanelActivo = true;
  promoPanel.classList.remove("oculto");
  filtrarProductos();
});

// ---------------------------
// CERRAR PROMO
// ---------------------------
cerrarPromo.addEventListener("click", () => {
  promoPanelActivo = false;
  promoPanel.classList.add("oculto");
  filtrarProductos();
});

// ---------------------------
// GUARDAR PROMO EN LOCAL STORAGE
// ---------------------------
function guardarPromoEnLocalStorage() {
  localStorage.setItem(
    "promoActual",
    JSON.stringify({
      promoActual,
      modoPromoActivo,
    }),
  );
}

// ---------------------------
// RENDER PROMO
// ---------------------------
function renderPromo() {
  const promoLista = document.getElementById("promoLista");
  promoLista.innerHTML = "";
  limpiarInfoVendedor();
  if (promoActual.items.length === 0) {
    promoLista.innerHTML = "<p>No hay productos en la promo</p>";

    // RESET TOTAL Y DESCUENTO
    promoDescuentoInput.value = 0;
    totalSinDescuentoElemento.textContent = "Total sin descuento: $0";
    totalAhorroElemento.textContent = "Ahorro: $0";
    totalConDescuentoElemento.textContent = "Total Precio Promo: $0";
    promoWarning.textContent = "";
    limpiarInfoVendedor();

    return;
  }

  promoActual.items.forEach((item, index) => {
    const fila = document.createElement("div");
    fila.classList.add("promo-item");

    // Nombre
    const nombre = document.createElement("div");
    nombre.classList.add("promo-nombre");
    nombre.textContent = item.nombre;

    // Precio unitario (FIJO)
    const precioUnitario = document.createElement("div");
    precioUnitario.classList.add("promo-precio-unitario");
    precioUnitario.textContent = `Precio unitario: $${item.precio}`;

    // Cantidad (editable)
    const cantidad = document.createElement("input");
    cantidad.type = "number";
    cantidad.min = 1;
    cantidad.value = item.cantidad;
    cantidad.classList.add("promo-cantidad");

    cantidad.addEventListener("input", () => {
      let valor = parseInt(cantidad.value);
      if (isNaN(valor) || valor < 1) valor = 1;
      item.cantidad = valor;
      cantidad.value = valor;
      renderPromo();
    });

    // Subtotal (precio * cantidad)
    const subtotal = document.createElement("div");
    subtotal.classList.add("promo-subtotal");
    subtotal.textContent = `Subtotal: $${item.precio * item.cantidad}`;

    // Quitar
    const quitar = document.createElement("button");
    quitar.textContent = "❌";
    quitar.classList.add("promo-quitar");

    quitar.addEventListener("click", () => {
      promoActual.items.splice(index, 1);
      renderPromo();
    });

    // Armado visual del item
    fila.appendChild(nombre);
    fila.appendChild(precioUnitario);
    fila.appendChild(cantidad);
    fila.appendChild(subtotal);
    fila.appendChild(quitar);

    promoLista.appendChild(fila);
  });

  // 🔑 recalcular totales y descuento
  actualizarDescuento();
}

// ---------------------------
// ACTUALIZAR DESCUENTO
// ---------------------------
function actualizarDescuento() {
  const totalSinDescuento = calcularTotalPromo();
  const descuento = parseFloat(promoDescuentoInput.value) || 0;

  promoActual.descuento = descuento;

  // ⚠️ Validación de descuento máximo seguro
  // ⚠️ Validación de descuento máximo seguro (REAL, por promo)
  let descuentoMaxSeguro = 0;

  if (totalSinDescuento > 0) {
    descuentoMaxSeguro =
      (1 - calcularCostoTotalPromo() / totalSinDescuento) * 100;
  }

  const descuentoMaxSeguroNum = Number(descuentoMaxSeguro.toFixed(2));

  promoWarning.textContent =
    descuento > descuentoMaxSeguroNum
      ? `⚠️ Descuento máximo seguro: ${descuentoMaxSeguroNum}%`
      : "";

  // Totales
  const ahorro = Math.round((totalSinDescuento * descuento) / 100);
  const precioTotalConDescuento = totalSinDescuento - ahorro;

  totalSinDescuentoElemento.textContent = `Total sin descuento: $${totalSinDescuento}`;
  totalAhorroElemento.textContent = `Ahorro: $${ahorro}`;
  totalConDescuentoElemento.textContent = `Total Precio Promo: $${precioTotalConDescuento}`;
  renderInfoVendedor();
}

// Listener unificado para recalcular totales y warning al cambiar el descuento
promoDescuentoInput.addEventListener("input", actualizarDescuento);

// ---------------------------
// CALCULAR TOTAL PRECIO PROMO
// ---------------------------
function calcularTotalPromo() {
  return promoActual.items.reduce((total, item) => {
    return total + item.precio * item.cantidad;
  }, 0);
}

// Cada vez que cambia la cantidad o se renderiza la promo, recalculamos el descuento
promoDescuentoInput.addEventListener("input", actualizarDescuento);

// ---------------------------
// CALCULAR COSTO TOTAL PROMO
// ---------------------------
function calcularCostoTotalPromo() {
  return promoActual.items.reduce((total, item) => {
    return total + item.costo * item.cantidad;
  }, 0);
}

// ---------------------------
// REVISAR MENSAJE WHATSAPP
// ---------------------------
const whatsappModal = document.getElementById("whatsappModal");
const mensajePreview = document.getElementById("mensajePreview");
const chkSubtotales = document.getElementById("chkSubtotales");
const chkTotalSinDescuento = document.getElementById("chkTotalSinDescuento");
const chkDescuento = document.getElementById("chkDescuento");
const chkAhorro = document.getElementById("chkAhorro");
document.getElementById("enviarWhatsapp").addEventListener("click", () => {
  // Cerrar panel de promo (solo UI)
  promoPanel.classList.add("oculto");
  // Abrir modal
  whatsappModal.classList.remove("oculto");
  // Mostrar texto inicial según defaults de checkboxes
  actualizarPreview();
});

// Cerrar modal
document
  .getElementById("cerrarModal")
  .addEventListener("click", cerrarWhatsappModal);

// Cada vez que se cambia una opción, actualizar preview
[chkSubtotales, chkTotalSinDescuento, chkDescuento, chkAhorro].forEach(
  (chk) => {
    chk.addEventListener("change", actualizarPreview);
  },
);

// Función para actualizar preview
function actualizarPreview() {
  if (!promoActual) {
    mensajePreview.value = "";
    return;
  }

  const opciones = {
    subtotales: chkSubtotales.checked,
    totalSinDescuento: chkTotalSinDescuento.checked,
    descuento: chkDescuento.checked,
    ahorro: chkAhorro.checked,
  };

  const texto = generarTextoPromo(promoActual, opciones);
  mensajePreview.value = texto;

  // Guardado provisorio (solo estado actual)
  localStorage.setItem(
    "promoPreview",
    JSON.stringify({
      opciones,
      texto,
    }),
  );
}

// Función generar texto promo
function generarTextoPromo(promo, opciones) {
  let texto = "";

  // Nombre promo (siempre)
  if (promo.nombre) {
    texto += `✦ ${promo.nombre} ✦\n\n`;
  }

  // Productos (siempre)
  promo.items.forEach((prod) => {
    texto += `• ${prod.nombre} x${prod.cantidad}`;

    if (opciones.subtotales) {
      texto += ` — $${prod.precio * prod.cantidad}`;
    }

    texto += `\n`;
  });

  texto += `\n`;

  // 👇 LEER DEL PANEL PROMO (fuente real)
  const nombrePromo = document.getElementById("promoNombre").value.trim();
  const totalSin = document.getElementById("totalSinDescuento").textContent;
  const ahorro = document.getElementById("totalAhorro").textContent;
  const totalFinal = document.getElementById("totalConDescuento").textContent;
  const descuento = document.getElementById("promoDescuento").value;

  // Opcionales
  if (opciones.totalSinDescuento) {
    texto += `${totalSin}\n`;
  }

  if (opciones.descuento) {
    texto += `Descuento: ${descuento}%\n`;
  }

  if (opciones.ahorro) {
    texto += `${ahorro}\n`;
  }

  // Total final (siempre)
  texto += `\n${totalFinal}`;

  return texto;
}

//Función para restaurar preview
(function restaurarPreview() {
  const guardado = localStorage.getItem("promoPreview");
  if (!guardado) return;

  try {
    const data = JSON.parse(guardado);

    chkSubtotales.checked = data.opciones.subtotales;
    chkTotalSinDescuento.checked = data.opciones.totalSinDescuento;
    chkDescuento.checked = data.opciones.descuento;
    chkAhorro.checked = data.opciones.ahorro;

    mensajePreview.value = data.texto;
  } catch (e) {
    localStorage.removeItem("promoPreview");
  }
})();

//Función que copia el mensaje a whatsapp
const copiarWhatsAppBtn = document.getElementById("copiarWhatsApp");
function enviarWhatsapp() {
  const texto = mensajePreview.value.trim();

  if (!texto) {
    alert("No hay mensaje para enviar");
    return;
  }

  const textoNormalizado = texto.normalize("NFC").replace(/\r\n/g, "\n");

  const textoCodificado = encodeURIComponent(textoNormalizado);

  const url = `https://wa.me/?text=${textoCodificado}`;

  window.open(url, "_blank");
  cerrarWhatsappModal();
}
copiarWhatsAppBtn.addEventListener("click", enviarWhatsapp);

// Función para cerrar whatsapp modal
function cerrarWhatsappModal() {
  whatsappModal.classList.add("oculto");
  promoPanelActivo = false;
  filtrarProductos();
}

// ---------------------------
// INFO PARA EL VENDEDOR
// ---------------------------
function renderInfoVendedor() {
  const info = document.getElementById("infoVendedor");

  if (!promoActual.items.length || !infoVendedorVisible) {
    info.classList.add("oculto");
    info.innerHTML = "";
    return;
  }

  const totalCosto = calcularCostoTotalPromo();
  const totalSinDescuento = calcularTotalPromo();
  const descuento = promoActual.descuento || 0;

  const ahorro = Math.round((totalSinDescuento * descuento) / 100);
  const totalFinal = totalSinDescuento - ahorro;

  const ganancia = totalFinal - totalCosto;
  const margen =
    totalCosto > 0 ? ((ganancia / totalCosto) * 100).toFixed(2) : "0.00";

  info.classList.remove("oculto");
  info.innerHTML = `
    <strong>Info para el vendedor</strong>
    <div>Total costo: $${totalCosto}</div>
    <div>Ganancia estimada: $${ganancia}</div>
    <div>Margen real: ${margen}%</div>
  `;
}
// Limpiar info vendedor
function limpiarInfoVendedor() {
  const info = document.getElementById("infoVendedor");
  if (!info) return;

  info.innerHTML = "";
  info.classList.add("oculto");
}
