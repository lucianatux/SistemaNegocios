let productos = [];
let gananciaGlobal = 0;

let modoEditor = null; // "editar" | "crear"
let productoEditando = null;

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

const productList = document.getElementById("productList");

const btnGestion = document.getElementById("btnGestion");
const btnCerrarGlobal = document.getElementById("cerrarGlobal");
const gestion = document.getElementById("gestion");
const gananciaGlobalInput = document.getElementById("gananciaGlobalInput");
const aplicarGlobalBtn = document.getElementById("aplicarGlobal");
const bannerGanancia = document.getElementById("bannerGanancia");
const cerrarBannerBtn = document.getElementById("cerrarBanner");

const guardarProductoBtn = document.getElementById("guardarProducto");

const btnAgregarProducto = document.getElementById("btnAgregarProducto");
const editorProducto = document.getElementById("editorProducto");
const cerrarEditorBtn = document.getElementById("cerrarEditor");
const cancelarEdicionBtn = document.getElementById("cancelarEdicion");

const overlayConfirmacion = document.getElementById("overlayConfirmacion");
const confirmacionTexto = document.getElementById("confirmacionTexto");
const confirmarAccionBtn = document.getElementById("confirmarAccion");
const cancelarConfirmacionBtn = document.getElementById("cancelarConfirmacion");

const confirmacionTitulo = document.getElementById("confirmacionTitulo");

let accionPendiente = null;

// ---------------------------
// INICIALIZAR DATOS
// ---------------------------
/*productos = DATA.productos;
gananciaGlobal = DATA.configuracion.gananciaGlobal;*/

function inicializarDatos() {
  const dataLocal = cargarDesdeLocalStorage();

  if (dataLocal) {
    productos = dataLocal.productos || [];
    gananciaGlobal = dataLocal.gananciaGlobal || 0;
    console.log("Datos cargados desde localStorage");
  } else {
    productos = DATA.productos;
    gananciaGlobal = DATA.configuracion.gananciaGlobal;
    console.log("Datos cargados desde DATA inicial");
  }
}

function guardarEnLocalStorage() {
  const data = {
    productos,
    gananciaGlobal,
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
// CALCULAR PRECIO FINAL
// ---------------------------
function calcularPrecio(producto) {
  const gananciaUsada =
    producto.ganancia !== null ? producto.ganancia : gananciaGlobal;

  const precioBase = producto.costo + (producto.costo * gananciaUsada) / 100;

  // Redondear siempre hacia arriba al múltiplo de 10 más cercano
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

    // ACCIONES
    const acciones = document.createElement("div");
    acciones.classList.add("product-actions");

    const btnEditar = document.createElement("button");
    btnEditar.classList.add("btn-icono");
    btnEditar.textContent = "✏️";

    const btnEliminar = document.createElement("button");
    btnEliminar.classList.add("btn-icono");
    btnEliminar.textContent = "🗑️";

    // EVENTOS (por ahora simples)
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
    li.appendChild(info);
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
});
btnCerrarGlobal.addEventListener("click", () => {
  gestion.classList.toggle("oculto");
  gananciaGlobalInput.value = gananciaGlobal;
});

// ---------------------------
// APLICAR GANANCIA GLOBAL
// ---------------------------

aplicarGlobalBtn.addEventListener("click", () => {
  gananciaGlobal = parseFloat(gananciaGlobalInput.value);

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
  }

  if (accionPendiente.tipo === "importar") {
    importarDatos();
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

      // Guardar inmediatamente en localStorage
      guardarEnLocalStorage();

      // Limpiar buscador al actualizar la lista
      searchInput.value = "";
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

