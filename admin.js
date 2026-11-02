const alertaConfig = document.getElementById("alertaConfig");
const seccionLogin = document.getElementById("login");
const seccionPanel = document.getElementById("panel");
const formLogin = document.getElementById("formLogin");
const loginError = document.getElementById("loginError");
const botonEntrar = document.getElementById("botonEntrar");
const botonSalir = document.getElementById("botonSalir");
const listaAdmin = document.getElementById("listaAdmin");
const buscarAdmin = document.getElementById("buscarAdmin");
const filtroCategoria = document.getElementById("filtroCategoria");
const ayudaLista = document.getElementById("ayudaLista");
const resumen = document.getElementById("resumen");
const aviso = document.getElementById("aviso");

const formProducto = document.getElementById("formProducto");
const abrirFormulario = document.getElementById("abrirFormulario");
const cancelarFormulario = document.getElementById("cancelarFormulario");
const fotoProducto = document.getElementById("fotoProducto");
const fotosElegidas = document.getElementById("fotosElegidas");
const ventanaFotos = document.getElementById("ventanaFotos");
const listaFotos = document.getElementById("listaFotos");
const subirFotosExtra = document.getElementById("subirFotosExtra");
const nombreProducto = document.getElementById("nombreProducto");
const categoriaProducto = document.getElementById("categoriaProducto");
const categoriaNueva = document.getElementById("categoriaNueva");
const precioProducto = document.getElementById("precioProducto");
const notaProducto = document.getElementById("notaProducto");
const opcionesProducto = document.getElementById("opcionesProducto");
const tipoOpcionProducto = document.getElementById("tipoOpcionProducto");
const campoOpciones = document.getElementById("campoOpciones");
const guardarProducto = document.getElementById("guardarProducto");

let estado = {};
let productosNuevos = [];
let fotosNuevas = [];
let fotosExtra = {};
let productoFotos = null;
const MAXIMO_FOTOS = 6;

let db;
let auth;

function formatoPrecio(numero) {
  return "$" + numero.toLocaleString("es-AR");
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

function extrasDe(producto) {
  return fotosExtra[String(producto.id)] || [];
}

function fotoDe(producto) {
  if (producto.imagen) {
    return producto.imagen;
  }
  return "img/" + producto.img;
}

function precioActual(producto) {
  if (producto.nuevo) {
    return producto.precio;
  }
  const cambio = estado[producto.id];
  if (cambio && cambio.precio !== undefined) {
    return cambio.precio;
  }
  return producto.precio;
}

function stockActual(producto) {
  if (producto.nuevo) {
    return producto.stock !== false;
  }
  const cambio = estado[producto.id];
  if (cambio && cambio.stock !== undefined) {
    return cambio.stock;
  }
  return producto.stock !== false;
}

function estaBorrado(producto) {
  if (producto.nuevo) {
    return false;
  }
  const cambio = estado[producto.id];
  return cambio !== undefined && cambio.oculto === true;
}

function categoriasActuales() {
  const lista = [];
  for (let i = 0; i < categorias.length; i++) {
    if (categorias[i] !== "Todos") {
      lista.push(categorias[i]);
    }
  }
  for (let i = 0; i < productosNuevos.length; i++) {
    if (!lista.includes(productosNuevos[i].categoria)) {
      lista.push(productosNuevos[i].categoria);
    }
  }
  return lista;
}

let tiempoAviso;
function mostrarAviso(texto) {
  aviso.textContent = texto;
  aviso.classList.add("visible");
  clearTimeout(tiempoAviso);
  tiempoAviso = setTimeout(function () {
    aviso.classList.remove("visible");
  }, 2500);
}

function cargarDatos() {
  listaAdmin.innerHTML = '<p class="panel-ayuda">Cargando productos...</p>';

  db.collection("tienda").doc("estado").get()
    .then(function (documento) {
      estado = {};
      if (documento.exists && documento.data().productos) {
        estado = documento.data().productos;
      }
      return db.collection("productosNuevos").orderBy("creado", "desc").get();
    })
    .then(function (resultado) {
      productosNuevos = [];
      resultado.forEach(function (documento) {
        const datos = documento.data();
        productosNuevos.push({
          id: "n-" + documento.id,
          docId: documento.id,
          nuevo: true,
          nombre: datos.nombre,
          categoria: datos.categoria,
          precio: datos.precio,
          imagen: datos.imagen,
          stock: datos.stock
        });
      });

      return db.collection("fotos").get();
    })
    .then(function (resultado) {
      fotosExtra = {};
      resultado.forEach(function (documento) {
        fotosExtra[documento.id] = documento.data().lista || [];
      });

      cargarSelectsCategorias();
      mostrarResumen();
      mostrarLista();
    })
    .catch(function (error) {
      console.log(error);
      listaAdmin.innerHTML = '<p class="panel-ayuda">No se pudieron cargar los datos. Recargá la página.</p>';
    });
}

function guardarCambio(producto, datos) {
  if (producto.nuevo) {
    return db.collection("productosNuevos").doc(producto.docId).update(datos);
  }

  const cambio = {};
  cambio[producto.id] = datos;
  return db.collection("tienda").doc("estado").set({ productos: cambio }, { merge: true });
}

function actualizarLocal(producto, datos) {
  if (producto.nuevo) {
    for (const clave in datos) {
      producto[clave] = datos[clave];
    }
  } else {
    if (!estado[producto.id]) {
      estado[producto.id] = {};
    }
    for (const clave in datos) {
      estado[producto.id][clave] = datos[clave];
    }
  }
}

function cambiarStock(id, conStock) {
  const producto = buscarProducto(id);
  const interruptor = document.getElementById("stock-" + id);
  interruptor.disabled = true;

  guardarCambio(producto, { stock: conStock })
    .then(function () {
      actualizarLocal(producto, { stock: conStock });
      document.getElementById("textoStock-" + id).textContent = conStock ? "Hay stock" : "Sin stock";
      document.getElementById("fila-" + id).classList.toggle("sin-stock", !conStock);
      mostrarResumen();
      mostrarAviso(conStock ? "Marcado con stock ✓" : "Marcado sin stock ✓");
    })
    .catch(function (error) {
      console.log(error);
      interruptor.checked = !conStock;
      mostrarAviso("No se pudo guardar. Revisá la conexión.");
    })
    .finally(function () {
      interruptor.disabled = false;
    });
}

function guardarPrecio(id) {
  const producto = buscarProducto(id);
  const nuevoPrecio = Number(document.getElementById("precio-" + id).value);

  if (!nuevoPrecio || nuevoPrecio <= 0) {
    mostrarAviso("Escribí un precio válido");
    return;
  }

  guardarCambio(producto, { precio: nuevoPrecio })
    .then(function () {
      actualizarLocal(producto, { precio: nuevoPrecio });
      mostrarAviso("Precio guardado: " + formatoPrecio(nuevoPrecio) + " ✓");
    })
    .catch(function (error) {
      console.log(error);
      mostrarAviso("No se pudo guardar. Revisá la conexión.");
    });
}

function borrarProducto(id) {
  const producto = buscarProducto(id);

  let pregunta = '¿Borrar "' + producto.nombre + '" de la tienda?';
  if (producto.nuevo) {
    pregunta += "\n\nComo lo agregaste vos, se borra para siempre.";
  } else {
    pregunta += '\n\nSi te equivocás, lo podés recuperar en el filtro "Productos borrados".';
  }

  if (!confirm(pregunta)) {
    return;
  }

  let promesa;
  if (producto.nuevo) {
    promesa = db.collection("productosNuevos").doc(producto.docId).delete();
  } else {
    promesa = guardarCambio(producto, { oculto: true });
  }

  promesa
    .then(function () {
      if (producto.nuevo && extrasDe(producto).length > 0) {
        return db.collection("fotos").doc(producto.id).delete();
      }
    })
    .then(function () {
      mostrarAviso("Producto borrado ✓");
      cargarDatos();
    })
    .catch(function (error) {
      console.log(error);
      mostrarAviso("No se pudo borrar. Revisá la conexión.");
    });
}

function restaurarProducto(id) {
  const producto = buscarProducto(id);

  guardarCambio(producto, { oculto: false })
    .then(function () {
      mostrarAviso("Producto restaurado ✓");
      cargarDatos();
    })
    .catch(function (error) {
      console.log(error);
      mostrarAviso("No se pudo restaurar. Revisá la conexión.");
    });
}

function mostrarResumen() {
  const lista = todosLosProductos();
  let visibles = 0;
  let sinStock = 0;

  for (let i = 0; i < lista.length; i++) {
    if (estaBorrado(lista[i])) {
      continue;
    }
    visibles++;
    if (!stockActual(lista[i])) {
      sinStock++;
    }
  }

  resumen.textContent = visibles + " productos · " + sinStock + " sin stock";
}

function cargarSelectsCategorias() {
  const lista = categoriasActuales();
  const filtroElegido = filtroCategoria.value;

  filtroCategoria.innerHTML = '<option value="Todos">Todas las categorías</option>';
  for (let i = 0; i < lista.length; i++) {
    filtroCategoria.innerHTML += "<option>" + lista[i] + "</option>";
  }
  filtroCategoria.innerHTML += '<option value="Borrados">🗑 Productos borrados</option>';
  if (filtroElegido) {
    filtroCategoria.value = filtroElegido;
  }

  categoriaProducto.innerHTML = '<option value="">Elegí una categoría</option>';
  for (let i = 0; i < lista.length; i++) {
    categoriaProducto.innerHTML += "<option>" + lista[i] + "</option>";
  }
  categoriaProducto.innerHTML += '<option value="otra">+ Crear categoría nueva</option>';
}

function mostrarLista() {
  const texto = buscarAdmin.value.toLowerCase().trim();
  const filtro = filtroCategoria.value;
  const verBorrados = filtro === "Borrados";
  const lista = todosLosProductos();
  listaAdmin.innerHTML = "";

  if (verBorrados) {
    ayudaLista.textContent = "Estos productos no se ven en la tienda. Tocá \"Restaurar\" para que vuelvan.";
  } else {
    ayudaLista.textContent = "Tocá el interruptor para marcar si hay stock. Para cambiar un precio, escribilo y tocá \"Guardar\". Los cambios se ven en la tienda al instante.";
  }

  for (let i = 0; i < lista.length; i++) {
    const p = lista[i];

    if (verBorrados !== estaBorrado(p)) {
      continue;
    }
    if (!verBorrados && filtro !== "Todos" && p.categoria !== filtro) {
      continue;
    }
    if (texto !== "" && !p.nombre.toLowerCase().includes(texto)) {
      continue;
    }

    const conStock = stockActual(p);

    const fila = document.createElement("div");
    fila.className = "fila-admin";
    fila.id = "fila-" + p.id;
    if (!conStock || verBorrados) {
      fila.classList.add("sin-stock");
    }

    let etiquetaNuevo = "";
    if (p.nuevo) {
      etiquetaNuevo = ' <span class="etiqueta-agregado">Agregado por vos</span>';
    }

    let controlesHTML = "";
    if (verBorrados) {
      controlesHTML = "<button class=\"boton-restaurar\" onclick=\"restaurarProducto('" + p.id + "')\">Restaurar</button>";
    } else {
      controlesHTML =
        '<div class="fila-precio">' +
          "<span>$</span>" +
          '<input type="number" id="precio-' + p.id + '" value="' + precioActual(p) + '" min="1" aria-label="Precio de ' + p.nombre + '">' +
          "<button onclick=\"guardarPrecio('" + p.id + "')\">Guardar</button>" +
        "</div>" +
        '<label class="interruptor">' +
          '<input type="checkbox" id="stock-' + p.id + '" ' + (conStock ? "checked" : "") + " onchange=\"cambiarStock('" + p.id + "', this.checked)\">" +
          '<span class="interruptor-boton"></span>' +
          '<span class="interruptor-texto" id="textoStock-' + p.id + '">' + (conStock ? "Hay stock" : "Sin stock") + "</span>" +
        "</label>" +
        "<button class=\"boton-fotos\" onclick=\"abrirFotos('" + p.id + "')\" title=\"Fotos del producto\">📷 " + (1 + extrasDe(p).length) + "</button>" +
        "<button class=\"boton-borrar\" onclick=\"borrarProducto('" + p.id + "')\" aria-label=\"Borrar " + p.nombre + "\" title=\"Borrar producto\">🗑</button>";
    }

    fila.innerHTML =
      '<img src="' + fotoDe(p) + '" alt="">' +
      '<div class="fila-nombre">' +
        "<h3>" + p.nombre + "</h3>" +
        "<p>" + p.categoria + etiquetaNuevo + "</p>" +
      "</div>" +
      controlesHTML;

    listaAdmin.appendChild(fila);
  }

  if (listaAdmin.innerHTML === "") {
    if (verBorrados) {
      listaAdmin.innerHTML = '<p class="panel-ayuda">No hay productos borrados.</p>';
    } else {
      listaAdmin.innerHTML = '<p class="panel-ayuda">No hay productos con ese nombre.</p>';
    }
  }
}

function limpiarFormulario() {
  formProducto.reset();
  fotosNuevas = [];
  mostrarFotosElegidas();
  categoriaNueva.style.display = "none";
  campoOpciones.style.display = "none";
}

tipoOpcionProducto.onchange = function () {
  if (tipoOpcionProducto.value === "") {
    campoOpciones.style.display = "none";
  } else {
    campoOpciones.style.display = "block";
    opcionesProducto.focus();
  }
};

abrirFormulario.onclick = function () {
  limpiarFormulario();
  formProducto.style.display = "block";
  abrirFormulario.style.display = "none";
  nombreProducto.focus();
};

cancelarFormulario.onclick = function () {
  formProducto.style.display = "none";
  abrirFormulario.style.display = "block";
};

categoriaProducto.onchange = function () {
  if (categoriaProducto.value === "otra") {
    categoriaNueva.style.display = "block";
    categoriaNueva.focus();
  } else {
    categoriaNueva.style.display = "none";
  }
};

function achicarFoto(imagen) {
  const ancho = 600;
  const alto = 750;

  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d");

  let recorteAncho = imagen.width;
  let recorteAlto = imagen.width * alto / ancho;
  if (recorteAlto > imagen.height) {
    recorteAlto = imagen.height;
    recorteAncho = imagen.height * ancho / alto;
  }
  const x = (imagen.width - recorteAncho) / 2;
  const y = (imagen.height - recorteAlto) / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(imagen, x, y, recorteAncho, recorteAlto, 0, 0, ancho, alto);

  return lienzo.toDataURL("image/jpeg", 0.72);
}

function leerFotos(archivos, alTerminar) {
  const resultado = [];
  let pendientes = archivos.length;

  if (pendientes === 0) {
    alTerminar(resultado);
    return;
  }

  function terminarUna() {
    pendientes--;
    if (pendientes === 0) {
      const listas = [];
      for (let i = 0; i < resultado.length; i++) {
        if (resultado[i]) {
          listas.push(resultado[i]);
        }
      }
      if (listas.length < archivos.length) {
        mostrarAviso("Alguna foto no se pudo usar. Probá con JPG o PNG.");
      }
      alTerminar(listas);
    }
  }

  for (let i = 0; i < archivos.length; i++) {
    const lector = new FileReader();

    lector.onload = function () {
      const imagen = new Image();
      imagen.onload = function () {
        resultado[i] = achicarFoto(imagen);
        terminarUna();
      };
      imagen.onerror = terminarUna;
      imagen.src = lector.result;
    };
    lector.onerror = terminarUna;

    lector.readAsDataURL(archivos[i]);
  }
}

function mostrarFotosElegidas() {
  let html = "";
  for (let i = 0; i < fotosNuevas.length; i++) {
    html += '<div class="foto-mini">' +
      '<img src="' + fotosNuevas[i] + '" alt="Foto ' + (i + 1) + '">' +
      (i === 0 ? '<span class="etiqueta-principal">Principal</span>' : "") +
      '<button type="button" onclick="quitarFotoNueva(' + i + ')" aria-label="Quitar foto">✕</button>' +
      "</div>";
  }
  fotosElegidas.innerHTML = html;
}

function quitarFotoNueva(numero) {
  fotosNuevas.splice(numero, 1);
  mostrarFotosElegidas();
}

fotoProducto.onchange = function () {
  leerFotos(fotoProducto.files, function (nuevas) {
    for (let i = 0; i < nuevas.length; i++) {
      if (fotosNuevas.length < MAXIMO_FOTOS) {
        fotosNuevas.push(nuevas[i]);
      } else {
        mostrarAviso("Máximo " + MAXIMO_FOTOS + " fotos por producto");
      }
    }
    mostrarFotosElegidas();
    fotoProducto.value = "";
  });
};

function abrirFotos(id) {
  productoFotos = buscarProducto(id);
  document.getElementById("tituloFotos").textContent = productoFotos.nombre;
  mostrarFotosProducto();
  ventanaFotos.classList.add("abierto");
  ventanaFotos.setAttribute("aria-hidden", "false");
}

function cerrarFotos() {
  ventanaFotos.classList.remove("abierto");
  ventanaFotos.setAttribute("aria-hidden", "true");
}

function mostrarFotosProducto() {
  const extras = extrasDe(productoFotos);
  let html = '<div class="foto-mini">' +
    '<img src="' + fotoDe(productoFotos) + '" alt="Foto principal">' +
    '<span class="etiqueta-principal">Principal</span>' +
    "</div>";

  for (let i = 0; i < extras.length; i++) {
    html += '<div class="foto-mini">' +
      '<img src="' + extras[i] + '" alt="Foto ' + (i + 2) + '">' +
      '<button type="button" onclick="borrarFotoExtra(' + i + ')" aria-label="Borrar foto">✕</button>' +
      "</div>";
  }
  listaFotos.innerHTML = html;
}

function guardarFotosExtra(lista) {
  const id = String(productoFotos.id);
  let promesa;

  if (lista.length === 0) {
    promesa = db.collection("fotos").doc(id).delete();
  } else {
    promesa = db.collection("fotos").doc(id).set({ lista: lista });
  }

  return promesa.then(function () {
    fotosExtra[id] = lista;
    mostrarFotosProducto();
    mostrarLista();
  });
}

subirFotosExtra.onchange = function () {
  const lista = extrasDe(productoFotos).slice();

  leerFotos(subirFotosExtra.files, function (nuevas) {
    for (let i = 0; i < nuevas.length; i++) {
      if (lista.length < MAXIMO_FOTOS) {
        lista.push(nuevas[i]);
      } else {
        mostrarAviso("Máximo " + MAXIMO_FOTOS + " fotos extra por producto");
      }
    }
    subirFotosExtra.value = "";

    mostrarAviso("Subiendo fotos...");
    guardarFotosExtra(lista)
      .then(function () {
        mostrarAviso("Fotos guardadas ✓ Ya se ven en la tienda");
      })
      .catch(function (error) {
        console.log(error);
        mostrarAviso("No se pudieron guardar. Revisá la conexión.");
      });
  });
};

function borrarFotoExtra(numero) {
  if (!confirm("¿Borrar esta foto?")) {
    return;
  }

  const lista = extrasDe(productoFotos).slice();
  lista.splice(numero, 1);

  guardarFotosExtra(lista)
    .then(function () {
      mostrarAviso("Foto borrada ✓");
    })
    .catch(function (error) {
      console.log(error);
      mostrarAviso("No se pudo borrar. Revisá la conexión.");
    });
}

document.getElementById("cerrarFotos").onclick = cerrarFotos;

ventanaFotos.onclick = function (evento) {
  if (evento.target === ventanaFotos) {
    cerrarFotos();
  }
};

document.addEventListener("keydown", function (evento) {
  if (evento.key === "Escape") {
    cerrarFotos();
  }
});

formProducto.onsubmit = function (evento) {
  evento.preventDefault();

  const nombre = nombreProducto.value.trim();
  const precio = Number(precioProducto.value);
  const nota = notaProducto.value.trim();

  let categoria = categoriaProducto.value;
  if (categoria === "otra") {
    categoria = categoriaNueva.value.trim();
  }

  if (fotosNuevas.length === 0) {
    mostrarAviso("Falta elegir al menos una foto");
    return;
  }
  if (nombre === "") {
    mostrarAviso("Falta el nombre");
    return;
  }
  if (categoria === "") {
    mostrarAviso("Falta la categoría");
    return;
  }
  if (!precio || precio <= 0) {
    mostrarAviso("Falta el precio");
    return;
  }

  const tipoOpcion = tipoOpcionProducto.value;
  const opciones = [];
  let partes = [];
  if (tipoOpcion !== "") {
    partes = opcionesProducto.value.split(",");
  }
  for (let i = 0; i < partes.length; i++) {
    const opcion = partes[i].trim();
    if (opcion !== "") {
      opciones.push(opcion);
    }
  }

  if (tipoOpcion !== "" && opciones.length === 0) {
    mostrarAviso("Escribí las opciones separadas por coma");
    return;
  }

  guardarProducto.disabled = true;
  guardarProducto.textContent = "Guardando...";

  db.collection("productosNuevos").add({
    nombre: nombre,
    categoria: categoria,
    precio: precio,
    nota: nota,
    opciones: opciones,
    tipoOpcion: tipoOpcion,
    imagen: fotosNuevas[0],
    stock: true,
    creado: Date.now()
  })
    .then(function (referencia) {
      if (fotosNuevas.length > 1) {
        return db.collection("fotos").doc("n-" + referencia.id).set({ lista: fotosNuevas.slice(1) });
      }
    })
    .then(function () {
      mostrarAviso("Producto agregado ✓ Ya se ve en la tienda");
      formProducto.style.display = "none";
      abrirFormulario.style.display = "block";
      limpiarFormulario();
      cargarDatos();
    })
    .catch(function (error) {
      console.log(error);
      mostrarAviso("No se pudo guardar. Revisá la conexión.");
    })
    .finally(function () {
      guardarProducto.disabled = false;
      guardarProducto.textContent = "Guardar producto";
    });
};

formLogin.onsubmit = function (evento) {
  evento.preventDefault();

  const email = document.getElementById("email").value.trim();
  const clave = document.getElementById("clave").value;

  loginError.textContent = "";
  botonEntrar.disabled = true;
  botonEntrar.textContent = "Entrando...";

  auth.signInWithEmailAndPassword(email, clave)
    .catch(function (error) {
      console.log(error);
      loginError.textContent = "Email o contraseña incorrectos.";
    })
    .finally(function () {
      botonEntrar.disabled = false;
      botonEntrar.textContent = "Entrar";
    });
};

botonSalir.onclick = function () {
  auth.signOut();
};

if (typeof firebase === "undefined" || firebaseConfig.apiKey === "PEGAR_ACA") {
  alertaConfig.style.display = "block";
  botonEntrar.disabled = true;
} else {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();

  buscarAdmin.oninput = mostrarLista;
  filtroCategoria.onchange = mostrarLista;

  auth.onAuthStateChanged(function (usuario) {
    if (usuario) {
      seccionLogin.style.display = "none";
      seccionPanel.style.display = "block";
      botonSalir.style.display = "inline-block";
      cargarDatos();
    } else {
      seccionLogin.style.display = "block";
      seccionPanel.style.display = "none";
      botonSalir.style.display = "none";
    }
  });
}
