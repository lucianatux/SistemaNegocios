let productos = [];
let gananciaGlobal = 0;

let productoSeleccionado = null;

const searchInput = document.getElementById("searchInput");
const productList = document.getElementById("productList");

const btnGestion = document.getElementById("btnGestion");
const btnCerrarGlobal = document.getElementById("cerrarGlobal");
const gestion = document.getElementById("gestion");
const gananciaGlobalInput = document.getElementById("gananciaGlobalInput");
const aplicarGlobalBtn = document.getElementById("aplicarGlobal");
const bannerGanancia = document.getElementById("bannerGanancia");
const cerrarBannerBtn = document.getElementById("cerrarBanner");

const guardarProductoBtn = document.getElementById("guardarProducto");

const editorProducto = document.getElementById("editorProducto");
const cerrarEditorBtn = document.getElementById("cerrarEditor");
const cancelarEdicionBtn = document.getElementById("cancelarEdicion");

// ---------------------------
// CARGAR DATOS (LOCAL)
// ---------------------------
productos = DATA.productos;
gananciaGlobal = DATA.configuracion.gananciaGlobal;

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
    precio.textContent = "$ " + calcularPrecio(producto);

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
      e.stopPropagation(); // importante
      seleccionarProducto(producto);
    });

    btnEliminar.addEventListener("click", (e) => {
      e.stopPropagation(); // importante
      console.log("Eliminar producto:", producto.nombre);
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
// BUSCADOR
// ---------------------------
searchInput.addEventListener("input", () => {
  const texto = searchInput.value.toLowerCase();

  const filtrados = productos.filter(
    (producto) =>
      producto.nombre.toLowerCase().includes(texto) ||
      producto.codigo.toLowerCase().includes(texto),
  );

  mostrarProductos(filtrados);
});

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
  mostrarProductos(productos);

  bannerGanancia.classList.remove("oculto");

  setTimeout(() => {
    bannerGanancia.classList.add("oculto");
  }, 3000);
});

// ---------------------------
// SELECCIONAR PRODUCTO
// ---------------------------
function seleccionarProducto(producto) {
  productoSeleccionado = producto;

  // Abrimos editor de producto
  editorProducto.classList.remove("oculto");

  // Indicamos qué producto se edita
  document.getElementById("productoEditando").textContent =
    "Editando: " + producto.nombre;

  // Cargamos datos en el formulario
  document.getElementById("editNombre").value = producto.nombre;
  document.getElementById("editCodigo").value = producto.codigo;
  document.getElementById("editCategoria").value = producto.categoria;
  document.getElementById("editCosto").value = producto.costo;
  document.getElementById("editGanancia").value =
    producto.ganancia !== null ? producto.ganancia : "";
}

// ---------------------------
// GUARDAR PRODUCTO
// ---------------------------

guardarProductoBtn.addEventListener("click", () => {
  if (!productoSeleccionado) return;

  productoSeleccionado.nombre = document.getElementById("editNombre").value;

  productoSeleccionado.codigo = document.getElementById("editCodigo").value;

  productoSeleccionado.categoria =
    document.getElementById("editCategoria").value;

  productoSeleccionado.costo = parseFloat(
    document.getElementById("editCosto").value,
  );

  const gananciaInput = document.getElementById("editGanancia").value;
  productoSeleccionado.ganancia =
    gananciaInput === "" ? null : parseFloat(gananciaInput);

  ordenarProductos();
  mostrarProductos(productos);

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
  productoSeleccionado = null;
  limpiarSeleccion();
}

// ---------------------------
// CONECTAR BOTONES
// ---------------------------
cerrarEditorBtn.addEventListener("click", cerrarEditorProducto);
cancelarEdicionBtn.addEventListener("click", cerrarEditorProducto);

// ---------------------------
// CERRAR BANNER
// ---------------------------
cerrarBannerBtn.addEventListener("click", () => {
  bannerGanancia.classList.add("oculto");
});
