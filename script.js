let productos = [];
let gananciaGlobal = 0;

const searchInput = document.getElementById("searchInput");
const productList = document.getElementById("productList");


// ---------------------------
// CARGAR DATOS (LOCAL)
// ---------------------------
productos = DATA.productos;
gananciaGlobal = DATA.configuracion.gananciaGlobal;

ordenarProductos();
mostrarProductos(productos);


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
        producto.ganancia !== null
            ? producto.ganancia
            : gananciaGlobal;

    const precio = producto.costo + (producto.costo * gananciaUsada / 100);
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

    lista.forEach(producto => {
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

    const filtrados = productos.filter(producto =>
        producto.nombre.toLowerCase().includes(texto) ||
        producto.codigo.toLowerCase().includes(texto)
    );

    mostrarProductos(filtrados);
});
