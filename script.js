const WHATSAPP = "5492262510921";

let categoriaActual = "Todos";
let carrito = [];
let productosNuevos = [];

const grilla = document.getElementById("grilla");
const barraCategorias = document.getElementById("categorias");
const menuLista = document.getElementById("menuLista");
const tituloSeccion = document.getElementById("tituloSeccion");
const sinResultados = document.getElementById("sinResultados");
const buscador = document.getElementById("buscador");
const panelMenu = document.getElementById("menu");
const panelCarrito = document.getElementById("carrito");
const fondoOscuro = document.getElementById("fondoOscuro");
const carritoLista = document.getElementById("carritoLista");
const contador = document.getElementById("contador");
const totalTexto = document.getElementById("total");
const aviso = document.getElementById("aviso");

function formatoPrecio(numero) {
  return "$" + numero.toLocaleString("es-AR");
}

function plural(tipo, cantidad) {
  const palabra = tipo.toLowerCase();
  if (cantidad === 1) {
    return palabra;
  }
  if (palabra === "color") {
    return "colores";
  }
  return palabra + "s";
}

function todosLosProductos() {
  return productosNuevos.concat(productos);
}

function buscarProducto(id) {
  const lista = todosLosProductos();
  for (let i = 0; i < lista.length; i++) {
    if (String(lista[i].id) === String(id)) {
      return lista[i];
    }
  }
  return null;
}

function hayStock(producto) {
  return producto.stock !== false && producto.oculto !== true;
}

function fotoDe(producto) {
  if (producto.imagen) {
    return producto.imagen;
  }
  return "img/" + producto.img;
}

function contarProductos(categoria) {
  const lista = todosLosProductos();
  let cantidad = 0;
  for (let i = 0; i < lista.length; i++) {
    if (lista[i].oculto === true) {
      continue;
    }
    if (categoria === "Todos" || lista[i].categoria === categoria) {
      cantidad++;
    }
  }
  return cantidad;
}

function refrescar() {
  mostrarCategorias();
  mostrarProductos();
  mostrarCarrito();
}

function escucharCambios() {
  if (typeof firebase === "undefined" || firebaseConfig.apiKey === "PEGAR_ACA") {
    console.log("Firebase no está configurado: se usan los datos de productos.js");
    return;
  }

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  db.collection("tienda").doc("estado").onSnapshot(
    function (documento) {
      if (documento.exists && documento.data().productos) {
        aplicarCambios(documento.data().productos);
      }
    },
    function (error) {
      console.log("No se pudieron leer los cambios:", error);
    }
  );

  db.collection("productosNuevos").orderBy("creado", "desc").onSnapshot(
    function (resultado) {
      cargarProductosNuevos(resultado);
    },
    function (error) {
      console.log("No se pudieron leer los productos nuevos:", error);
    }
  );
}

function aplicarCambios(cambios) {
  for (let i = 0; i < productos.length; i++) {
    const cambio = cambios[productos[i].id];

    if (cambio) {
      if (cambio.precio !== undefined) {
        productos[i].precio = cambio.precio;
      }
      if (cambio.stock !== undefined) {
        productos[i].stock = cambio.stock;
      }
      if (cambio.oculto !== undefined) {
        productos[i].oculto = cambio.oculto;
      }
    }
  }

  refrescar();
}

function cargarProductosNuevos(resultado) {
  const treintaDias = 30 * 24 * 60 * 60 * 1000;
  productosNuevos = [];

  resultado.forEach(function (documento) {
    const datos = documento.data();

    productosNuevos.push({
      id: "n-" + documento.id,
      nombre: datos.nombre,
      categoria: datos.categoria,
      precio: datos.precio,
      imagen: datos.imagen,
      nota: datos.nota,
      opciones: datos.opciones,
      tipoOpcion: datos.tipoOpcion,
      stock: datos.stock,
      esNuevo: Date.now() - datos.creado < treintaDias
    });

    if (!categorias.includes(datos.categoria)) {
      categorias.push(datos.categoria);
    }
  });

  refrescar();
}

function mostrarCategorias() {
  barraCategorias.innerHTML = "";
  menuLista.innerHTML = "";

  for (let i = 0; i < categorias.length; i++) {
    const nombre = categorias[i];
    const cantidad = contarProductos(nombre);

    if (cantidad === 0 && nombre !== "Todos") {
      continue;
    }

    const boton = document.createElement("button");
    boton.textContent = nombre;
    boton.className = "categoria";
    if (nombre === categoriaActual) {
      boton.classList.add("activa");
    }
    boton.onclick = function () {
      elegirCategoria(nombre);
    };
    barraCategorias.appendChild(boton);

    let textoMenu = nombre;
    if (nombre === "Todos") {
      textoMenu = "Todos los productos";
    }

    const renglon = document.createElement("li");
    const botonMenu = document.createElement("button");
    botonMenu.innerHTML = textoMenu + " <small>" + cantidad + "</small>";
    if (nombre === categoriaActual) {
      botonMenu.classList.add("activa");
    }
    botonMenu.onclick = function () {
      elegirCategoria(nombre);
    };
    renglon.appendChild(botonMenu);
    menuLista.appendChild(renglon);
  }
}

function elegirCategoria(nombre) {
  categoriaActual = nombre;
  buscador.value = "";
  mostrarCategorias();
  mostrarProductos();
  cerrarPaneles();
  marcarPestana(1);
  tituloSeccion.scrollIntoView({ behavior: "smooth" });
}

function mostrarProductos() {
  const texto = buscador.value.toLowerCase().trim();
  const lista = todosLosProductos();
  grilla.innerHTML = "";
  let cantidadMostrados = 0;

  if (texto !== "") {
    tituloSeccion.textContent = 'Resultados para "' + buscador.value + '"';
  } else if (categoriaActual === "Todos") {
    tituloSeccion.textContent = "Todos los productos";
  } else {
    tituloSeccion.textContent = categoriaActual;
  }

  for (let i = 0; i < lista.length; i++) {
    const p = lista[i];

    if (p.oculto === true) {
      continue;
    }

    if (texto !== "") {
      if (!p.nombre.toLowerCase().includes(texto)) {
        continue;
      }
    } else if (categoriaActual !== "Todos" && p.categoria !== categoriaActual) {
      continue;
    }

    const conStock = hayStock(p);

    let selectHTML = "";
    let chipHTML = "";
    if (p.opciones && p.opciones.length > 0) {
      const tipo = p.tipoOpcion || "Modelo";
      chipHTML = '<span class="tarjeta-chip">' + p.opciones.length + " " + plural(tipo, p.opciones.length) + "</span>";

      selectHTML = '<label class="opcion-titulo" for="opcion-' + p.id + '">' + tipo + ":</label>";
      selectHTML += '<select id="opcion-' + p.id + '">';
      for (let j = 0; j < p.opciones.length; j++) {
        selectHTML += "<option>" + p.opciones[j] + "</option>";
      }
      selectHTML += "</select>";
    }

    let notaHTML = "";
    if (p.nota) {
      notaHTML = '<p class="nota">' + p.nota + "</p>";
    }

    let etiquetaHTML = "";
    if (!conStock) {
      etiquetaHTML = '<span class="sin-stock-etiqueta">Sin stock</span>';
    } else if (p.esNuevo) {
      etiquetaHTML = '<span class="nuevo-etiqueta">Nuevo</span>';
    }

    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta";
    tarjeta.innerHTML =
      '<div class="tarjeta-foto">' +
        '<img src="' + fotoDe(p) + '" alt="' + p.nombre + '" loading="lazy">' +
        etiquetaHTML +
      "</div>" +
      '<div class="tarjeta-info">' +
        chipHTML +
        "<h3>" + p.nombre + "</h3>" +
        notaHTML +
        '<p class="precio">' + formatoPrecio(p.precio) + "</p>" +
        selectHTML +
        "<button class=\"boton-agregar\" onclick=\"agregarAlCarrito('" + p.id + "')\" " + (conStock ? "" : "disabled") + ">" +
          (conStock ? "Agregar al carrito" : "Sin stock") +
        "</button>" +
      "</div>";

    grilla.appendChild(tarjeta);
    cantidadMostrados++;
  }

  if (cantidadMostrados === 0) {
    sinResultados.style.display = "block";
  } else {
    sinResultados.style.display = "none";
  }
}

const slides = document.querySelectorAll(".slide");
const puntos = document.querySelectorAll(".punto");
let slideActual = 0;
let temporizador;

function irASlide(numero) {
  slideActual = numero;

  for (let i = 0; i < slides.length; i++) {
    slides[i].style.transform = "translateX(-" + (slideActual * 100) + "%)";
  }

  for (let i = 0; i < puntos.length; i++) {
    puntos[i].classList.remove("activo");
  }
  puntos[slideActual].classList.add("activo");

  clearInterval(temporizador);
  temporizador = setInterval(siguienteSlide, 3000);
}

function siguienteSlide() {
  let siguiente = slideActual + 1;
  if (siguiente >= slides.length) {
    siguiente = 0;
  }
  irASlide(siguiente);
}

const pestanas = document.querySelectorAll(".pestana");

function marcarPestana(numero) {
  for (let i = 0; i < pestanas.length; i++) {
    pestanas[i].classList.remove("activa");
  }
  pestanas[numero].classList.add("activa");
}

for (let i = 0; i < pestanas.length; i++) {
  pestanas[i].onclick = function () {
    marcarPestana(i);
  };
}

function agregarAlCarrito(id) {
  const producto = buscarProducto(id);

  if (!producto || !hayStock(producto)) {
    mostrarAviso("Ese producto no tiene stock");
    return;
  }

  let opcion = "";
  if (producto.opciones && producto.opciones.length > 0) {
    opcion = document.getElementById("opcion-" + id).value;
  }

  let encontrado = false;
  for (let i = 0; i < carrito.length; i++) {
    if (String(carrito[i].id) === String(id) && carrito[i].opcion === opcion) {
      carrito[i].cantidad++;
      encontrado = true;
    }
  }

  if (!encontrado) {
    carrito.push({ id: String(id), opcion: opcion, cantidad: 1 });
  }

  guardarCarrito();
  mostrarCarrito();
  mostrarAviso("Agregado al carrito");
}

function cambiarCantidad(posicion, cambio) {
  carrito[posicion].cantidad += cambio;

  if (carrito[posicion].cantidad <= 0) {
    carrito.splice(posicion, 1);
  }

  guardarCarrito();
  mostrarCarrito();
}

function vaciarCarrito() {
  carrito = [];
  guardarCarrito();
  mostrarCarrito();
}

function calcularTotal() {
  let total = 0;
  for (let i = 0; i < carrito.length; i++) {
    const producto = buscarProducto(carrito[i].id);
    if (producto && hayStock(producto)) {
      total += producto.precio * carrito[i].cantidad;
    }
  }
  return total;
}

function carritoTieneSinStock() {
  for (let i = 0; i < carrito.length; i++) {
    const producto = buscarProducto(carrito[i].id);
    if (producto && !hayStock(producto)) {
      return true;
    }
  }
  return false;
}

function mostrarCarrito() {
  carritoLista.innerHTML = "";
  let cantidadTotal = 0;

  for (let i = 0; i < carrito.length; i++) {
    const item = carrito[i];
    const producto = buscarProducto(item.id);

    if (!producto) {
      continue;
    }

    cantidadTotal += item.cantidad;

    let opcionHTML = "";
    if (item.opcion !== "") {
      opcionHTML = '<p class="opcion">' + item.opcion + "</p>";
    }

    let precioHTML = '<span class="item-precio">' + formatoPrecio(producto.precio * item.cantidad) + "</span>";
    if (!hayStock(producto)) {
      precioHTML = '<span class="item-sin-stock">Sin stock</span>';
    }

    const fila = document.createElement("div");
    fila.className = "item";
    fila.innerHTML =
      '<img src="' + fotoDe(producto) + '" alt="">' +
      "<div>" +
        "<h4>" + producto.nombre + "</h4>" +
        opcionHTML +
        '<div class="item-abajo">' +
          '<div class="cantidad">' +
            '<button onclick="cambiarCantidad(' + i + ', -1)" aria-label="Quitar uno">−</button>' +
            "<span>" + item.cantidad + "</span>" +
            '<button onclick="cambiarCantidad(' + i + ', 1)" aria-label="Agregar uno">+</button>' +
          "</div>" +
          precioHTML +
        "</div>" +
      "</div>";

    carritoLista.appendChild(fila);
  }

  if (cantidadTotal === 0) {
    carritoLista.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío. Agregá productos para armar tu pedido.</p>';
  }

  contador.textContent = cantidadTotal;
  totalTexto.textContent = formatoPrecio(calcularTotal());
}

function guardarCarrito() {
  try {
    localStorage.setItem("carritoStarNails", JSON.stringify(carrito));
  } catch (error) {
  }
}

function cargarCarrito() {
  try {
    const guardado = localStorage.getItem("carritoStarNails");
    if (guardado) {
      const lista = JSON.parse(guardado);
      for (let i = 0; i < lista.length; i++) {
        carrito.push({ id: String(lista[i].id), opcion: lista[i].opcion, cantidad: lista[i].cantidad });
      }
    }
  } catch (error) {
    carrito = [];
  }
}

function abrirMenu() {
  panelMenu.classList.add("abierto");
  fondoOscuro.classList.add("visible");
}

function abrirCarrito() {
  panelCarrito.classList.add("abierto");
  fondoOscuro.classList.add("visible");
}

function cerrarPaneles() {
  ocultarVerificacion();
  panelMenu.classList.remove("abierto");
  panelCarrito.classList.remove("abierto");
  fondoOscuro.classList.remove("visible");
}

const campoNombre = document.getElementById("nombreCliente");
const campoDireccion = document.getElementById("direccionCliente");
const botonUbicacion = document.getElementById("usarUbicacion");
const ayudaDireccion = document.getElementById("ayudaDireccion");
const linkMapa = document.getElementById("verMapa");

let ubicacion = null;

function linkGoogleMaps() {
  if (ubicacion) {
    return "https://www.google.com/maps?q=" + ubicacion.lat + "," + ubicacion.lng;
  }
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(campoDireccion.value.trim());
}

function actualizarLinkMapa() {
  if (ubicacion || campoDireccion.value.trim().length >= 5) {
    linkMapa.href = linkGoogleMaps();
    linkMapa.style.display = "inline-block";
  } else {
    linkMapa.style.display = "none";
  }
}

function pedirUbicacion() {
  if (!navigator.geolocation) {
    ayudaDireccion.textContent = "Tu navegador no permite compartir la ubicación.";
    return;
  }

  ayudaDireccion.textContent = "Buscando tu ubicación...";

  navigator.geolocation.getCurrentPosition(
    function (posicion) {
      ubicacion = {
        lat: posicion.coords.latitude.toFixed(6),
        lng: posicion.coords.longitude.toFixed(6)
      };
      ayudaDireccion.textContent = "✓ Ubicación exacta agregada. Igual escribí la dirección.";
      actualizarLinkMapa();
    },
    function () {
      ayudaDireccion.textContent = "No se pudo obtener la ubicación. Escribí la dirección a mano.";
    }
  );
}

function guardarDatosCliente() {
  try {
    localStorage.setItem("clienteStarNails", JSON.stringify({
      nombre: campoNombre.value.trim(),
      direccion: campoDireccion.value.trim()
    }));
  } catch (error) {
  }
}

function cargarDatosCliente() {
  try {
    const guardado = JSON.parse(localStorage.getItem("clienteStarNails"));
    if (guardado) {
      campoNombre.value = guardado.nombre;
      campoDireccion.value = guardado.direccion;
    }
  } catch (error) {
  }
  actualizarLinkMapa();
}

const cajaVerificacion = document.getElementById("verificacion");
const preguntaCaptcha = document.getElementById("preguntaCaptcha");
const respuestaCaptcha = document.getElementById("respuestaCaptcha");
const botonEnviar = document.getElementById("enviarPedido");

let resultadoCorrecto = 0;

function nuevaPregunta() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  resultadoCorrecto = a + b;
  preguntaCaptcha.textContent = "¿Cuánto es " + a + " + " + b + "?";
  respuestaCaptcha.value = "";
}

function mostrarVerificacion() {
  nuevaPregunta();
  cajaVerificacion.style.display = "block";
  botonEnviar.style.display = "none";
  respuestaCaptcha.focus();
}

function ocultarVerificacion() {
  cajaVerificacion.style.display = "none";
  botonEnviar.style.display = "block";
}

function confirmarVerificacion() {
  if (Number(respuestaCaptcha.value) !== resultadoCorrecto) {
    mostrarAviso("Ese no es el resultado, probá de nuevo");
    nuevaPregunta();
    return;
  }

  ocultarVerificacion();
  abrirWhatsApp();
}

function enviarPedido() {
  if (calcularTotal() === 0) {
    mostrarAviso("Agregá productos al carrito primero");
    return;
  }

  if (carritoTieneSinStock()) {
    mostrarAviso("Sacá del carrito lo que está sin stock");
    return;
  }

  if (campoNombre.value.trim().length < 3) {
    mostrarAviso("Escribí tu nombre y apellido");
    campoNombre.focus();
    return;
  }

  if (campoDireccion.value.trim().length < 5) {
    mostrarAviso("Escribí la dirección de entrega");
    campoDireccion.focus();
    return;
  }

  mostrarVerificacion();
}

function abrirWhatsApp() {
  let mensaje = "¡Hola Star Nails! 💅\n";
  mensaje += "Quiero hacer este pedido:\n\n";

  for (let i = 0; i < carrito.length; i++) {
    const item = carrito[i];
    const producto = buscarProducto(item.id);

    if (!producto) {
      continue;
    }

    mensaje += "• " + item.cantidad + " x " + producto.nombre;
    if (item.opcion !== "") {
      mensaje += " (" + item.opcion + ")";
    }
    mensaje += " — " + formatoPrecio(producto.precio * item.cantidad) + "\n";
  }

  mensaje += "\nTotal: " + formatoPrecio(calcularTotal()) + "\n\n";
  mensaje += "👤 Nombre: " + campoNombre.value.trim() + "\n";
  mensaje += "📍 Dirección: " + campoDireccion.value.trim() + "\n";
  mensaje += "🗺️ Mapa: " + linkGoogleMaps();

  guardarDatosCliente();

  const link = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(mensaje);
  window.open(link, "_blank");
}

let tiempoAviso;

function mostrarAviso(texto) {
  aviso.textContent = texto;
  aviso.classList.add("visible");

  clearTimeout(tiempoAviso);
  tiempoAviso = setTimeout(function () {
    aviso.classList.remove("visible");
  }, 2000);
}

document.getElementById("abrirMenu").onclick = abrirMenu;
document.getElementById("cerrarMenu").onclick = cerrarPaneles;
document.getElementById("abrirCarrito").onclick = abrirCarrito;
document.getElementById("cerrarCarrito").onclick = cerrarPaneles;
fondoOscuro.onclick = cerrarPaneles;
document.getElementById("vaciarCarrito").onclick = vaciarCarrito;
document.getElementById("enviarPedido").onclick = enviarPedido;
document.getElementById("confirmarCaptcha").onclick = confirmarVerificacion;
botonUbicacion.onclick = pedirUbicacion;
campoDireccion.oninput = actualizarLinkMapa;

respuestaCaptcha.addEventListener("keydown", function (evento) {
  if (evento.key === "Enter") {
    confirmarVerificacion();
  }
});

buscador.oninput = function () {
  categoriaActual = "Todos";
  mostrarCategorias();
  mostrarProductos();
};

document.addEventListener("keydown", function (evento) {
  if (evento.key === "Escape") {
    cerrarPaneles();
  }
});

cargarCarrito();
cargarDatosCliente();
refrescar();
irASlide(0);
escucharCambios();
