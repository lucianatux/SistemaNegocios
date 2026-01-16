let productos = [];
let gananciaGlobal = 0;

let productoSeleccionado = null;

const searchInput = document.getElementById("searchInput");
const productList = document.getElementById("productList");

const btnGestion = document.getElementById("btnGestion");
const gestion = document.getElementById("gestion");
const gananciaGlobalInput = document.getElementById("gananciaGlobalInput");
const aplicarGlobalBtn = document.getElementById("aplicarGlobal");

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
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
  );
}

// ---------------------------
// CALCULAR PRECIO FINAL
// ---------------------------
function calcularPrecio(producto) {
  const gananciaUsada =
    producto.ganancia !== null ? producto.ganancia : gananciaGlobal;

  const precio = producto.costo + (producto.costo * gananciaUsada) / 100;
  return Math.round(precio);
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

    const nombre = document.createElement("div");
    nombre.classList.add("product-name");
    nombre.textContent = producto.nombre;

    const codigo = document.createElement("div");
    codigo.classList.add("product-code");
    codigo.textContent = "Código: " + producto.codigo;

    const precio = document.createElement("div");
    precio.classList.add("product-price");
    precio.textContent = "$ " + calcularPrecio(producto);

    li.addEventListener("click", () => {
      limpiarSeleccion();
      li.classList.add("seleccionado");
      seleccionarProducto(producto);
    });

    li.appendChild(nombre);
    li.appendChild(codigo);
    li.appendChild(precio);

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
      producto.codigo.toLowerCase().includes(texto)
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

// ---------------------------
// APLICAR GANANCIA GLOBAL
// ---------------------------

aplicarGlobalBtn.addEventListener("click", () => {
  gananciaGlobal = parseFloat(gananciaGlobalInput.value);

  ordenarProductos();
  mostrarProductos(productos);
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

  productoSeleccionado.costo = parseFloat(
    document.getElementById("editCosto").value
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

