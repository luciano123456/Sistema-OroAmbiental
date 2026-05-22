let listaVacia = false;
let vieneDeModalConfiguraciones = false;
window.esModoAtajo = false;

function showModalById(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;

    if (window.bootstrap?.Modal) {
        bootstrap.Modal.getOrCreateInstance(el).show();
    } else if (window.jQuery) {
        window.jQuery(el).modal("show");
    }
}

function hideModalById(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;

    const inst = window.bootstrap?.Modal?.getInstance(el);
    if (inst) {
        inst.hide();
    } else if (window.jQuery) {
        window.jQuery(el).modal("hide");
    }
}

function hideAllModals() {
    document.querySelectorAll(".modal.show").forEach(el => {
        const inst = window.bootstrap?.Modal?.getInstance(el);
        if (inst) inst.hide();
        else if (window.jQuery) window.jQuery(el).modal("hide");
    });
}

document.addEventListener("DOMContentLoaded", function () {

    var userSession = JSON.parse(localStorage.getItem('userSession'));

    mostrarMenuCompleto();
    marcarNavActivo();

    if (userSession) {

        
        //if (userSession.IdRol == 1 || userSession.IdRol == 3) {
        //    document.getElementById("seccionPuntosDeVenta").removeAttribute("hidden");
        //    document.getElementById("seccionCuentas").removeAttribute("hidden");
        //    document.getElementById("seccionConfiguraciones").removeAttribute("hidden");
        //    document.getElementById("seccionCajas").removeAttribute("hidden");
        //    document.getElementById("seccionOperaciones").removeAttribute("hidden");
        //    document.getElementById("seccionGastos").removeAttribute("hidden");
        //}

        //if (userSession.IdPuntoVenta != null && userSession.IdRol != 1 && userSession.IdRol != 3) {
        //    document.getElementById("seccionCajas").removeAttribute("hidden");
        //    document.getElementById("seccionOperaciones").removeAttribute("hidden");
        //    document.getElementById("seccionGastos").removeAttribute("hidden");
        //}
        // Si el usuario está en el localStorage, actualizar el texto del enlace
        var userFullName = (userSession.Nombre + ' ' + userSession.Apellido).trim();
        $("#userName").text(userFullName || "Usuario");

    }

    initNavbarDropdowns();
});

/** Dropdowns del navbar con Popper fixed (quedan por encima de tablas/modales de página). */
function initNavbarDropdowns() {
    if (!window.bootstrap?.Dropdown) return;

    document.querySelectorAll(".rp-navbar [data-bs-toggle='dropdown']").forEach(toggle => {
        bootstrap.Dropdown.getOrCreateInstance(toggle, {
            offset: [0, 4],
            popperConfig(defaultBootstrapConfig) {
                return Object.assign({}, defaultBootstrapConfig, { strategy: "fixed" });
            }
        });
    });
}

function mostrarMenuCompleto() {
    document.querySelectorAll("#navbarSupportedContent .nav-item").forEach(el => {
        el.removeAttribute("hidden");
    });
}

/** Resalta el ítem del menú según la URL actual. */
function marcarNavActivo() {
    const path = (window.location.pathname || "").toLowerCase().replace(/\/+$/, "") || "/";

    document.querySelectorAll(".rp-navbar .dropdown-item[href], .rp-navbar .rp-nav-link[href]").forEach(anchor => {
        const href = (anchor.getAttribute("href") || "").trim();
        if (!href || href === "#") return;

        const target = href.toLowerCase().replace(/\/+$/, "");
        const match = path === target || (target.length > 1 && path.startsWith(target + "/"));

        anchor.classList.toggle("active", match);

        if (match) {
            const dropdown = anchor.closest(".dropdown");
            const toggle = dropdown?.querySelector(".nav-link.dropdown-toggle");
            if (toggle) toggle.classList.add("active");
        }
    });
}

/** En configuraciones, Sucursales debe listar todas (no solo las asignadas al usuario). */
function urlListaCatalogoConfig(controller) {
    if (controller === "Sucursales") {
        return `/${controller}/ListaTodas`;
    }
    return `/${controller}/Lista`;
}

async function listaConfiguracion() {
    const url = urlListaCatalogoConfig(controllerConfiguracion);
    const response = await fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) throw new Error('Error al cargar configuraciones');

    const data = await response.json();
    return data.map(configuracion => ({
        Id: configuracion.Id,
        Nombre: configuracion.Nombre,
        NombreCombo: configuracion.NombreCombo
    }));
}


async function abrirConfiguracion(
    _nombreConfiguracion,
    _controllerConfiguracion,
    _comboNombre = null,
    _comboController = null,
    _lblComboNombre,
    esAtajo = false
) {
    try {

        nombreConfiguracion = _nombreConfiguracion;
        controllerConfiguracion = _controllerConfiguracion;
        comboNombre = _comboNombre;
        comboController = _comboController;
        lblComboNombre = _lblComboNombre;

        window.esModoAtajo = esAtajo; // 🔥 CLAVE

        const result = await llenarConfiguraciones();

        if (!result) {
            await errorModal("Ha ocurrido un error al cargar la lista");
            return;
        }

        hideModalById("ModalEdicionConfiguraciones");
        showModalById("modalConfiguracion");

        cancelarModificarConfiguracion();

        // 🔥 MODO ATAJO
        if (esAtajo) {

            // ocultar eliminar
            document.querySelectorAll(".rp-icon-btn.danger").forEach(btn => {
                btn.style.display = "none";
            });

            // abrir directamente en "nuevo"
            agregarConfiguracion();

        } else {

            // mostrar eliminar normal
            document.querySelectorAll(".rp-icon-btn.danger").forEach(btn => {
                btn.style.display = "";
            });
        }

        $('#txtNombreConfiguracion').off('input').on('input', validarCamposConfiguracion);
        $('#cmbConfiguracion').off('change').on('change', validarCamposConfiguracion);
        $('#txtBuscarConfiguracion').off('input').on('input', filtrarConfiguraciones);

        document.getElementById("modalConfiguracionLabel").innerText =
            "Configuracion de " + nombreConfiguracion;

        const buscador = document.getElementById("txtBuscarConfiguracion");
        if (buscador) buscador.value = "";

    } catch (ex) {
        errorModal("Ha ocurrido un error al cargar la lista");
    }
}
async function editarConfiguracion(id) {
    fetch("/" + controllerConfiguracion + "/EditarInfo?id=" + id, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token // 👈 tu token aquí
        }
    })
        .then(response => {
            if (!response.ok) throw new Error("Ha ocurrido un error.");
            return response.json();
        })
        .then(dataJson => {
            if (dataJson !== null) {

                document.getElementById("btnRegistrarModificarConfiguracion").textContent = "Modificar";
                document.getElementById("agregarConfiguracion").setAttribute("hidden", "hidden");
                document.getElementById("txtNombreConfiguracion").value = dataJson.Nombre;
                document.getElementById("txtIdConfiguracion").value = dataJson.Id;

                document.getElementById("contenedorNombreConfiguracion").removeAttribute("hidden");

                if (comboNombre != null) {
                    document.getElementById("lblConfiguracionCombo").innerText = lblComboNombre;
                    document.getElementById("cmbConfiguracion").value = dataJson.IdCombo;
                }

                validarCamposConfiguracion();
            } else {
                throw new Error("Ha ocurrido un error.");
            }
        })
        .catch(error => {
            errorModal("Ha ocurrido un error.");
        });
}


async function llenarConfiguraciones() {

    try {

        let ocultarEliminar = window.esModoAtajo || false;

        const buscador = document.getElementById("txtBuscarConfiguracion");
        if (buscador) {
            buscador.value = "";
        }

        let configuraciones = await listaConfiguracion();

        if (comboNombre != null) {
            llenarComboConfiguracion();
            document.getElementById("divConfiguracionCombo").removeAttribute("hidden", "");
        } else {
            document.getElementById("divConfiguracionCombo").setAttribute("hidden", "hidden");
        }


        document.getElementById("lblListaVacia").innerText = "";
        document.getElementById("lblListaVacia").setAttribute("hidden", "hidden");

        $("#configuracion-list").empty();

        if (configuraciones.length == 0) {
            document.getElementById("lblListaVacia").innerText = `La lista de ${nombreConfiguracion} esta vacia.`;

            document.getElementById("lblListaVacia").style.color = 'red';
            document.getElementById("lblListaVacia").removeAttribute("hidden");
            listaVacia = true;

        } else {

            listaVacia = false;
            configuraciones.forEach((configuracion, index) => {

                let nombreConfig = configuracion.Nombre;

                if (configuracion.NombreCombo != null) {
                    nombreConfig += " - " + configuracion.NombreCombo;
                }

                var indexado = configuracion.Id
                $("#configuracion-list").append(`
    <div class="rp-list-item" data-texto="${escapeHtml(nombreConfig).toLowerCase()}">
        <div class="rp-item-left">
            <div class="rp-item-icon">
                <i class="fa fa-tag"></i>
            </div>
            <div class="rp-item-text">${nombreConfig}</div>
        </div>

        <div class="rp-list-actions">
            <button class="rp-icon-btn"
                onclick="editarConfiguracion(${indexado})">
                <i class="fa fa-pencil"></i>
            </button>

          ${ocultarEliminar ? "" : `
<button class="rp-icon-btn danger"
    onclick="eliminarConfiguracion(${indexado})">
    <i class="fa fa-trash"></i>
</button>
`}
        </div>
    </div>
`);

            });


        }
        return true;
    } catch (ex) {
        return false;

    }
}



async function eliminarConfiguracion(id) {


    let resultado = await confirmarModal("¿Desea eliminar el/la" + nombreConfiguracion + "?");
    if (!resultado) return;

    if (resultado) {
        try {
            const response = await fetch("/" + controllerConfiguracion + "/Eliminar?id=" + id, {
                method: "DELETE",
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error("Error al eliminar " + nombreConfiguracion);
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                await llenarConfiguraciones();

                exitoModal(dataJson.mensaje || (nombreConfiguracion + " eliminada correctamente"));

                document.dispatchEvent(new CustomEvent("configuracionActualizada", {
                    detail: {
                        tipo: controllerConfiguracion,
                        nuevoId: null,
                        accion: "eliminar"
                    }
                }));
            } else {
                errorModal(dataJson?.mensaje || "No se pudo eliminar");
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
            errorModal("Ha ocurrido un error al eliminar");
        }
    }
}


async function llenarComboConfiguracion() {
    const res = await fetch(urlListaCatalogoConfig(comboController), {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });
    if (!res.ok) throw new Error('Error al cargar combo');

    const data = await res.json();
    llenarSelect("cmbConfiguracion", data);
}

function validarCamposConfiguracion() {
    const nombre = $("#txtNombreConfiguracion").val();
    const combo = $("#cmbConfiguracion").val();

    const camposValidos = nombre !== "";
    const selectValido = combo !== "";

    // estilos
    $("#lblNombreConfiguracion").css("color", camposValidos ? "" : "red");
    $("#txtNombreConfiguracion").css("border-color", camposValidos ? "" : "red");
    $("#cmbConfiguracion").css("border-color", selectValido ? "" : "red");

    // lógica de validación
    if (comboNombre != null) {
        return camposValidos && selectValido;
    } else {
        return camposValidos;
    }
}


function guardarCambiosConfiguracion() {
    if (validarCamposConfiguracion()) {
        const idConfiguracion = $("#txtIdConfiguracion").val();
        const idCombo = $("#cmbConfiguracion").val();
        const nuevoModelo = {
            "Id": idConfiguracion !== "" ? idConfiguracion : 0,
            "IdCombo": comboNombre != null ? idCombo : 0,
            "Nombre": $("#txtNombreConfiguracion").val(),
        };

        const url = idConfiguracion === "" ? "/" + controllerConfiguracion + "/Insertar" : "/" + controllerConfiguracion + "/Actualizar";
        const method = idConfiguracion === "" ? "POST" : "PUT";

        fetch(url, {
            method: method,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoModelo)
        })
            .then(response => {
                if (!response.ok) throw new Error(response.statusText);
                return response.json();
            })
            .then(async dataJson => {

                if (dataJson?.valor === false) {
                    errorModal(dataJson?.mensaje || "No se pudo guardar");
                    return;
                }

                const esNuevo = idConfiguracion === "";

                const mensaje = dataJson?.mensaje || (esNuevo
                    ? nombreConfiguracion + " registrado/a correctamente"
                    : nombreConfiguracion + " modificado/a correctamente");

                cancelarModificarConfiguracion();

                const ok = await llenarConfiguraciones();

                if (!ok) {
                    errorModal("Error recargando la lista");
                    return;
                }

                exitoModal(mensaje);

                const nuevoId = dataJson?.id ?? null;

                document.dispatchEvent(new CustomEvent("configuracionActualizada", {
                    detail: {
                        tipo: controllerConfiguracion,
                        nuevoId: nuevoId,
                        accion: esNuevo ? "insertar" : "actualizar"
                    }
                }));

                // 🔥🔥🔥 CLAVE
                if (window.esModoAtajo) {
                    setTimeout(() => {
                        hideModalById("modalConfiguracion");
                    }, 300);
                }

            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}

function cancelarModificarConfiguracion() {
    document.getElementById("txtNombreConfiguracion").value = "";
    document.getElementById("txtIdConfiguracion").value = "";
    document.getElementById("contenedorNombreConfiguracion").setAttribute("hidden", "hidden");
    document.getElementById("agregarConfiguracion").removeAttribute("hidden");

    if (listaVacia == true) {
        document.getElementById("lblListaVacia").innerText = `La lista de ${nombreConfiguracion} esta vacia.`;
        document.getElementById("lblListaVacia").style.color = 'red';
        document.getElementById("lblListaVacia").removeAttribute("hidden");
    }
}

function agregarConfiguracion() {
    document.getElementById("txtNombreConfiguracion").value = "";
    document.getElementById("txtIdConfiguracion").value = "";
    document.getElementById("contenedorNombreConfiguracion").removeAttribute("hidden");
    document.getElementById("agregarConfiguracion").setAttribute("hidden", "hidden");
    document.getElementById("lblListaVacia").innerText = "";
    document.getElementById("lblListaVacia").setAttribute("hidden", "hidden");
    document.getElementById("btnRegistrarModificarConfiguracion").textContent = "Agregar";

    $('#lblNombreConfiguracion').css('color', 'red');
    $('#txtNombreConfiguracion').css('border-color', 'red');

    if (comboNombre != null) {
        document.getElementById("lblConfiguracionCombo").innerText = lblComboNombre;
        document.getElementById("cmbConfiguracion").value = "";
        $('#cmbConfiguracion').css('border-color', 'red');
    }
}

function abrirConfiguraciones() {
    vieneDeModalConfiguraciones = true;

    showModalById("ModalEdicionConfiguraciones");
    $("#btnGuardarConfiguracion").text("Aceptar");
    $("#modalEdicionLabel").text("Configuraciones");

    const buscadorSecciones = document.getElementById("txtBuscarSeccionesConfiguracion");
    if (buscadorSecciones) {
        buscadorSecciones.value = "";
        filtrarSeccionesConfiguraciones();
        $("#txtBuscarSeccionesConfiguracion").off("input").on("input", filtrarSeccionesConfiguraciones);
        setTimeout(() => buscadorSecciones.focus(), 150);
    }
}

function filtrarSeccionesConfiguraciones() {
    const input = document.getElementById("txtBuscarSeccionesConfiguracion");
    const grid = document.getElementById("rpConfigSeccionesGrid");
    const lblVacio = document.getElementById("lblSeccionesConfiguracionVacio");

    if (!input || !grid) return;

    const texto = input.value.trim().toLowerCase();
    const cards = grid.querySelectorAll(".rp-config-card");
    let visibles = 0;

    cards.forEach(card => {
        const titulo = card.querySelector(".rp-config-title")?.textContent || "";
        const sub = card.querySelector(".rp-config-sub")?.textContent || "";
        const extra = card.getAttribute("data-buscar") || "";
        const blob = `${titulo} ${sub} ${extra}`.toLowerCase();
        const coincide = !texto || blob.includes(texto);

        card.style.display = coincide ? "" : "none";
        if (coincide) visibles++;
    });

    if (!lblVacio) return;

    if (texto && visibles === 0) {
        lblVacio.textContent = `No se encontraron secciones para "${input.value}".`;
        lblVacio.removeAttribute("hidden");
    } else {
        lblVacio.textContent = "";
        lblVacio.setAttribute("hidden", "hidden");
    }
}

    document.querySelectorAll('.nav-item.dropdown').forEach(dropdown => {
        dropdown.addEventListener('mouseenter', function () {
            const dropdownMenu = this.querySelector('.dropdown-menu');
            dropdownMenu.classList.add('show'); // Mostrar el dropdown
        });

        dropdown.addEventListener('mouseleave', function () {
            const dropdownMenu = this.querySelector('.dropdown-menu');
            dropdownMenu.classList.remove('show'); // Ocultar el dropdown
        });
    });

function cerrarSesion() {
    localStorage.removeItem('JwtToken'); // Borrar token
    window.location.href = '/Login/Logout'; // Ir al login
}

function volverConfiguraciones() {

    if (vieneDeModalConfiguraciones) {
        // volver al modal anterior
        hideModalById("modalConfiguracion");
        showModalById("ModalEdicionConfiguraciones");
    } else {
        hideAllModals();
    }
}

async function abrirContratosPlantillas() {
    try {
        // cierra el modal general y abre el de plantillas
        hideModalById("ModalEdicionConfiguraciones");
        await cargarContratosPlantillasUI();
        showModalById("modalContratosPlantillas");
    } catch (e) {
        console.error(e);
        errorModal("No se pudieron cargar las plantillas de contratos.");
    }
}

async function cargarContratosPlantillasUI() {
    const cont = document.getElementById("contratosPlantillas-list");
    const lblVacio = document.getElementById("lblContratosPlantillasVacio");
    if (!cont) return;

    cont.innerHTML = "";

    // 1) tipos de contrato (ya existe tu controller de config)
    const tipos = await fetch(`/TiposContratos/Lista`, {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    }).then(r => r.ok ? r.json() : []);

    if (!tipos || tipos.length === 0) {
        lblVacio?.removeAttribute("hidden");
        return;
    }
    lblVacio?.setAttribute("hidden", "hidden");

    // 2) estado de plantillas en servidor
    const plantillas = await fetch(`/Contratos/Lista`, {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    }).then(r => r.ok ? r.json() : []);

    const map = new Map((plantillas || []).map(x => [Number(x.IdTipoContrato), x]));

    // 3) render
    tipos.forEach(t => {
        const idTipo = Number(t.Id || 0);
        const nombre = t.Nombre || `Tipo ${idTipo}`;

        const existe = map.has(idTipo);
        const info = map.get(idTipo);
        const fecha = info?.FechaModifica ? new Date(info.FechaModifica).toLocaleString("es-AR") : "";

        cont.insertAdjacentHTML("beforeend", `
            <div class="rp-contract-row" data-id="${idTipo}">
                <div class="rp-contract-left">
                    <div class="rp-item-icon"><i class="fa fa-file-text-o"></i></div>
                    <div>
                        <div class="rp-item-text"><b>${escapeHtml(nombre)}</b></div>
                        <div style="font-size:12px; opacity:.8;">
                            ID: ${idTipo} ${existe ? ("• Actualizado: " + fecha) : "• Sin plantilla"}
                        </div>
                    </div>
                </div>

                <div class="rp-contract-actions">
                    <span class="rp-contract-badge ${existe ? "ok" : "no"}">
                        ${existe ? "Plantilla OK" : "Falta plantilla"}
                    </span>

                    <input class="form-control rp-file-input"
                           type="file"
                           accept=".docx"
                           data-file="${idTipo}">

                    <button class="rp-btn rp-btn-primary rp-btn-mini"
                            onclick="subirPlantillaContrato(${idTipo})">
                        <i class="fa fa-upload"></i>
                        Subir/Reemplazar
                    </button>

                    <button class="rp-btn rp-btn-soft rp-btn-mini"
                            ${existe ? "" : "disabled"}
                            onclick="descargarPlantillaContrato(${idTipo}, '${escapeJs(nombre)}')">
                        <i class="fa fa-download"></i>
                        Descargar
                    </button>

                    <button class="rp-btn rp-btn-soft rp-btn-mini"
                            ${existe ? "" : "disabled"}
                            onclick="eliminarPlantillaContrato(${idTipo})">
                        <i class="fa fa-trash"></i>
                        Eliminar
                    </button>
                </div>
            </div>
        `);
    });
}

async function subirPlantillaContrato(idTipoContrato) {
    try {
        const row = document.querySelector(`.rp-contract-row[data-id="${idTipoContrato}"]`);
        const input = row?.querySelector(`input[type="file"][data-file="${idTipoContrato}"]`);
        const file = input?.files?.[0];

        if (!file) {
            errorModal("Seleccioná un .docx para subir.");
            return;
        }
        if (!file.name.toLowerCase().endsWith(".docx")) {
            errorModal("Solo se permite .docx.");
            return;
        }

        const fd = new FormData();
        fd.append("file", file);

        const r = await fetch(`/Contratos/Subir?idTipoContrato=${idTipoContrato}`, {
            method: "POST",
            headers: { 'Authorization': 'Bearer ' + token },
            body: fd
        });

        const data = await r.json();
        if (!data.valor) {
            errorModal(data.mensaje || "No se pudo subir la plantilla.");
            return;
        }

        exitoModal(data.mensaje || "Plantilla guardada.");
        await cargarContratosPlantillasUI();
    } catch (e) {
        console.error(e);
        errorModal("Error subiendo la plantilla.");
    }
}

async function descargarPlantillaContrato(idTipoContrato, nombreTipo) {
    try {
        const r = await fetch(`/Contratos/Descargar?idTipoContrato=${idTipoContrato}&nombre=${encodeURIComponent(nombreTipo)}`, {
            method: "GET",
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!r.ok) {
            errorModal("No se pudo descargar la plantilla.");
            return;
        }

        const blob = await r.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `Contrato_${nombreTipo}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error(e);
        errorModal("Error descargando la plantilla.");
    }
}

async function eliminarPlantillaContrato(idTipoContrato) {
    const ok = await confirmarModal("¿Eliminar la plantilla de este tipo de contrato?");
    if (!ok) return;

    try {
        const r = await fetch(`/Contratos/Eliminar?idTipoContrato=${idTipoContrato}`, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        const data = await r.json();
        if (!data.valor) {
            errorModal(data.mensaje || "No se pudo eliminar.");
            return;
        }

        exitoModal(data.mensaje || "Plantilla eliminada.");
        await cargarContratosPlantillasUI();
    } catch (e) {
        console.error(e);
        errorModal("Error eliminando la plantilla.");
    }
}

function escapeHtml(s) {
    return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeJs(s) {
    return String(s ?? "").replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function filtrarConfiguraciones() {
    const input = document.getElementById("txtBuscarConfiguracion");
    const lista = document.getElementById("configuracion-list");

    if (!input || !lista) return;

    const texto = input.value.trim().toLowerCase();
    const items = lista.querySelectorAll(".rp-list-item");

    let visibles = 0;

    items.forEach(item => {
        const textoItem = (item.getAttribute("data-texto") || "").toLowerCase();
        const coincide = textoItem.includes(texto);

        item.style.display = coincide ? "" : "none";

        if (coincide) visibles++;
    });

    const lblListaVacia = document.getElementById("lblListaVacia");

    if (items.length > 0 && visibles === 0) {
        lblListaVacia.innerText = `No se encontraron resultados para "${input.value}".`;
        lblListaVacia.style.color = 'red';
        lblListaVacia.removeAttribute("hidden");
    } else if (listaVacia === true) {
        lblListaVacia.innerText = `La lista de ${nombreConfiguracion} esta vacia.`;
        lblListaVacia.style.color = 'red';
        lblListaVacia.removeAttribute("hidden");
    } else {
        lblListaVacia.innerText = "";
        lblListaVacia.setAttribute("hidden", "hidden");
    }
}