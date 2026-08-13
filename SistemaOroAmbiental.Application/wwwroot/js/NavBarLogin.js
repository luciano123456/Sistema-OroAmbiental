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
        // Si el usuario esta en el localStorage, actualizar el texto del enlace
        var userFullName = (userSession.Nombre + ' ' + userSession.Apellido).trim();
        $("#userName").text(userFullName || "Usuario");

        if (window.RpAvatar) {
            RpAvatar.applyToNavbar({
                color: userSession.AvatarColor,
                icono: userSession.AvatarIcono,
                foto: userSession.AvatarFoto
            });
        }
    }

    initNavbarDropdowns();
});

/** Dropdowns del navbar con Popper fixed (quedan por encima de tablas/modales de pagina). */
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

/** Resalta el item del menu segun la URL actual. */
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

function getPerfilConfigGeo(controller) {
    switch (controller) {
        case "Provincias":
            return { codigo: true };
        case "Partidos":
            return { codigo: true, provincia: true };
        case "Localidades":
            return { codigo: true, provincia: true, partido: true };
        case "ClientesTiposGenerador":
            return { codigo: true };
        case "TiposPago":
            // Código estable: Efectivo / Transferencia (para totales de hoja de ruta)
            return { codigo: true };
        default:
            return null;
    }
}

let cacheProvinciasConfigGeo = null;
let cachePartidosConfigGeo = null;

async function ensureCacheProvinciasConfigGeo() {
    if (cacheProvinciasConfigGeo) return cacheProvinciasConfigGeo;

    const res = await fetch("/Provincias/Lista", {
        headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
        }
    });
    if (!res.ok) throw new Error("Error al cargar provincias");

    cacheProvinciasConfigGeo = await res.json();
    return cacheProvinciasConfigGeo;
}

async function ensureCachePartidosConfigGeo() {
    if (cachePartidosConfigGeo) return cachePartidosConfigGeo;

    const res = await fetch("/Partidos/Lista", {
        headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
        }
    });
    if (!res.ok) throw new Error("Error al cargar partidos");

    cachePartidosConfigGeo = await res.json();
    return cachePartidosConfigGeo;
}

function nombreProvinciaConfigGeo(idProvincia) {
    if (!idProvincia) return "";
    const item = (cacheProvinciasConfigGeo || []).find(x => Number(x.Id) === Number(idProvincia));
    return item?.Nombre || "";
}

function nombrePartidoConfigGeo(idPartido) {
    if (!idPartido) return "";
    const item = (cachePartidosConfigGeo || []).find(x => Number(x.Id) === Number(idPartido));
    return item?.Nombre || "";
}

function formatearNombreConfigGeo(configuracion) {
    let nombreConfig = configuracion.Nombre || "";

    if (configuracion.Codigo) {
        nombreConfig = `[${configuracion.Codigo}] ${nombreConfig}`;
    }

    if (configuracion.NombreCombo) {
        nombreConfig += " - " + configuracion.NombreCombo;
        return nombreConfig;
    }

    const perfil = getPerfilConfigGeo(controllerConfiguracion);
    if (perfil?.partido) {
        const partido = nombrePartidoConfigGeo(configuracion.IdPartido);
        const provincia = nombreProvinciaConfigGeo(configuracion.IdProvincia);
        const extra = [partido, provincia].filter(Boolean).join(" / ");
        if (extra) nombreConfig += " - " + extra;
    } else if (perfil?.provincia) {
        const provincia = nombreProvinciaConfigGeo(configuracion.IdProvincia);
        if (provincia) nombreConfig += " - " + provincia;
    }

    return nombreConfig;
}

function configurarPanelGeo() {
    const perfil = getPerfilConfigGeo(controllerConfiguracion);
    const divCodigo = document.getElementById("divConfiguracionCodigo");
    const divPartido = document.getElementById("divConfiguracionPartido");

    if (!perfil) {
        divCodigo?.setAttribute("hidden", "hidden");
        divPartido?.setAttribute("hidden", "hidden");
    } else {
        divCodigo?.removeAttribute("hidden");
        if (perfil.partido) {
            divPartido?.removeAttribute("hidden");
        } else {
            divPartido?.setAttribute("hidden", "hidden");
        }
    }

    configurarPanelCuentas();
}

function configurarPanelCuentas() {
    const div = document.getElementById("divConfiguracionTipoCuenta");
    if (!div) return;

    if (controllerConfiguracion === "Cuentas") {
        div.removeAttribute("hidden");
    } else {
        div.setAttribute("hidden", "hidden");
    }
}

async function llenarComboPartidoConfiguracion(idProvincia, selectedId) {
    const sel = document.getElementById("cmbConfiguracionPartido");
    if (!sel) return;

    sel.innerHTML = "";
    sel.add(new Option("Seleccionar", ""));

    if (!idProvincia) return;

    const res = await fetch(`/Partidos/ListaPorProvincia?idProvincia=${idProvincia}`, {
        headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
        }
    });
    if (!res.ok) throw new Error("Error al cargar partidos");

    const data = await res.json();
    (data || []).forEach(item => sel.add(new Option(item.Nombre, item.Id)));

    if (selectedId) sel.value = String(selectedId);
}

function limpiarCamposGeoConfiguracion() {
    const txtCodigo = document.getElementById("txtCodigoConfiguracion");
    const cmbPartido = document.getElementById("cmbConfiguracionPartido");

    if (txtCodigo) txtCodigo.value = "";
    if (cmbPartido) {
        cmbPartido.innerHTML = "";
        cmbPartido.add(new Option("Seleccionar", ""));
    }
}

function aplicarPrefillGeoAtajo() {
    if (!window.esModoAtajo) return Promise.resolve();

    const perfil = getPerfilConfigGeo(controllerConfiguracion);
    if (!perfil) return Promise.resolve();

    if (perfil.provincia) {
        const idProvincia = document.getElementById("cmbProvinciaEst")?.value
            || document.getElementById("cgProvincia")?.value
            || "";
        const cmbProvincia = document.getElementById("cmbConfiguracion");
        if (cmbProvincia && idProvincia) {
            cmbProvincia.value = idProvincia;
            if (perfil.partido) {
                return llenarComboPartidoConfiguracion(
                    idProvincia,
                    document.getElementById("cmbPartidoEst")?.value
                        || document.getElementById("cgPartido")?.value
                        || null
                );
            }
        }
    }

    return Promise.resolve();
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
        Codigo: configuracion.Codigo,
        NombreCombo: configuracion.NombreCombo,
        IdProvincia: configuracion.IdProvincia,
        IdPartido: configuracion.IdPartido
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
        configurarPanelGeo();

        if (getPerfilConfigGeo(controllerConfiguracion)) {
            await ensureCacheProvinciasConfigGeo();
            if (controllerConfiguracion === "Localidades") {
                await ensureCachePartidosConfigGeo();
            }
        }

        // 🔥 MODO ATAJO
        if (esAtajo) {

            // ocultar eliminar
            document.querySelectorAll(".rp-icon-btn.danger").forEach(btn => {
                btn.style.display = "none";
            });

            // abrir directamente en "nuevo"
            agregarConfiguracion();
            await aplicarPrefillGeoAtajo();

        } else {

            // mostrar eliminar normal
            document.querySelectorAll(".rp-icon-btn.danger").forEach(btn => {
                btn.style.display = "";
            });
        }

        $('#txtNombreConfiguracion').off('input').on('input', validarCamposConfiguracion);
        $('#txtCodigoConfiguracion').off('input').on('input', validarCamposConfiguracion);
        $('#cmbConfiguracion').off('change').on('change', async function () {
            const perfil = getPerfilConfigGeo(controllerConfiguracion);
            if (perfil?.partido) {
                await llenarComboPartidoConfiguracion(this.value, null);
            }
            validarCamposConfiguracion();
        });
        $('#cmbConfiguracionPartido').off('change').on('change', validarCamposConfiguracion);
        $('#cmbConfiguracionTipoCuenta').off('change').on('change', validarCamposConfiguracion);
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
    try {
        const response = await fetch("/" + controllerConfiguracion + "/EditarInfo?id=" + id, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            }
        });

        if (!response.ok) throw new Error("Ha ocurrido un error.");

        const dataJson = await response.json();
        if (dataJson == null) throw new Error("Ha ocurrido un error.");

        document.getElementById("btnRegistrarModificarConfiguracion").textContent = "Modificar";
        document.getElementById("agregarConfiguracion").setAttribute("hidden", "hidden");
        document.getElementById("txtNombreConfiguracion").value = dataJson.Nombre || "";
        document.getElementById("txtIdConfiguracion").value = dataJson.Id;
        document.getElementById("contenedorNombreConfiguracion").removeAttribute("hidden");

        const perfil = getPerfilConfigGeo(controllerConfiguracion);
        limpiarCamposGeoConfiguracion();

        if (perfil?.codigo) {
            document.getElementById("txtCodigoConfiguracion").value = dataJson.Codigo || "";
        }

        if (perfil?.provincia) {
            document.getElementById("lblConfiguracionCombo").innerText = lblComboNombre || "Provincia";
            document.getElementById("cmbConfiguracion").value = dataJson.IdProvincia || "";
            if (perfil.partido) {
                await llenarComboPartidoConfiguracion(dataJson.IdProvincia, dataJson.IdPartido);
            }
        } else if (comboNombre != null) {
            document.getElementById("lblConfiguracionCombo").innerText = lblComboNombre;
            document.getElementById("cmbConfiguracion").value = dataJson.IdCombo || "";
        }

        if (controllerConfiguracion === "Cuentas") {
            document.getElementById("cmbConfiguracionTipoCuenta").value = dataJson.Codigo || "Efectivo";
        }

        validarCamposConfiguracion();
    } catch (error) {
        errorModal("Ha ocurrido un error.");
    }
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
            await llenarComboConfiguracion();
            document.getElementById("divConfiguracionCombo").removeAttribute("hidden", "");
        } else {
            document.getElementById("divConfiguracionCombo").setAttribute("hidden", "hidden");
        }

        if (getPerfilConfigGeo(controllerConfiguracion)) {
            await ensureCacheProvinciasConfigGeo();
            if (controllerConfiguracion === "Localidades") {
                await ensureCachePartidosConfigGeo();
            }
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

                let nombreConfig = formatearNombreConfigGeo(configuracion);

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

                if (getPerfilConfigGeo(controllerConfiguracion)) {
                    cacheProvinciasConfigGeo = null;
                    cachePartidosConfigGeo = null;
                }

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
    const perfil = getPerfilConfigGeo(controllerConfiguracion);
    const nombre = ($("#txtNombreConfiguracion").val() || "").trim();
    const codigo = ($("#txtCodigoConfiguracion").val() || "").trim();
    const combo = $("#cmbConfiguracion").val();
    const partido = $("#cmbConfiguracionPartido").val();

    const nombreValido = nombre !== "";
    const codigoValido = !perfil?.codigo || codigo !== "";
    const selectValido = combo !== "" && combo != null;
    const partidoValido = !perfil?.partido || (partido !== "" && partido != null);

    $("#lblNombreConfiguracion").css("color", nombreValido ? "" : "red");
    $("#txtNombreConfiguracion").css("border-color", nombreValido ? "" : "red");
    $("#txtCodigoConfiguracion").css(
        "border-color",
        perfil?.codigo && !codigoValido ? "red" : ""
    );

    if (comboNombre != null || perfil?.provincia) {
        $("#cmbConfiguracion").css("border-color", selectValido ? "" : "red");
    } else {
        $("#cmbConfiguracion").css("border-color", "");
    }

    if (perfil?.partido) {
        $("#cmbConfiguracionPartido").css("border-color", partidoValido ? "" : "red");
    } else {
        $("#cmbConfiguracionPartido").css("border-color", "");
    }

    const provinciaValida = !perfil?.provincia || selectValido;
    const comboValido = comboNombre == null || selectValido;
    return nombreValido && codigoValido && provinciaValida && comboValido && partidoValido;
}

function guardarCambiosConfiguracion() {
    if (!validarCamposConfiguracion()) {
        errorModal("Debes completar los campos requeridos");
        return;
    }

    const idConfiguracion = $("#txtIdConfiguracion").val();
    const idCombo = $("#cmbConfiguracion").val();
    const perfil = getPerfilConfigGeo(controllerConfiguracion);

    let nuevoModelo;

    if (perfil) {
        nuevoModelo = {
            Id: idConfiguracion !== "" ? Number(idConfiguracion) : 0,
            Nombre: ($("#txtNombreConfiguracion").val() || "").trim(),
            Codigo: ($("#txtCodigoConfiguracion").val() || "").trim()
        };

        if (perfil.provincia) {
            nuevoModelo.IdProvincia = Number(idCombo) || 0;
        }

        if (perfil.partido) {
            const idPartido = $("#cmbConfiguracionPartido").val();
            nuevoModelo.IdPartido = idPartido ? Number(idPartido) : null;
        }
    } else {
        nuevoModelo = {
            Id: idConfiguracion !== "" ? idConfiguracion : 0,
            IdCombo: comboNombre != null ? idCombo : 0,
            Nombre: ($("#txtNombreConfiguracion").val() || "").trim()
        };

        if (controllerConfiguracion === "Cuentas") {
            nuevoModelo.Codigo = $("#cmbConfiguracionTipoCuenta").val() || "Efectivo";
        }
    }

    const url = idConfiguracion === "" ? "/" + controllerConfiguracion + "/Insertar" : "/" + controllerConfiguracion + "/Actualizar";
    const method = idConfiguracion === "" ? "POST" : "PUT";
    const $btn = $("#btnRegistrarModificarConfiguracion");

    $btn.prop("disabled", true);

    fetch(url, {
        method: method,
        headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(nuevoModelo)
    })
        .then(async response => {
            let dataJson = null;
            try {
                dataJson = await response.json();
            } catch {
                dataJson = null;
            }

            if (!response.ok) {
                throw new Error(dataJson?.mensaje || dataJson?.title || response.statusText || "Error al guardar");
            }

            return dataJson;
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

            if (getPerfilConfigGeo(controllerConfiguracion)) {
                cacheProvinciasConfigGeo = null;
                cachePartidosConfigGeo = null;
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

            if (window.esModoAtajo) {
                setTimeout(() => {
                    hideModalById("modalConfiguracion");
                }, 300);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            errorModal(error?.message || "Ha ocurrido un error al guardar");
        })
        .finally(() => {
            $btn.prop("disabled", false);
        });
}

function cancelarModificarConfiguracion() {
    document.getElementById("txtNombreConfiguracion").value = "";
    document.getElementById("txtIdConfiguracion").value = "";
    limpiarCamposGeoConfiguracion();
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
    limpiarCamposGeoConfiguracion();
    document.getElementById("contenedorNombreConfiguracion").removeAttribute("hidden");
    document.getElementById("agregarConfiguracion").setAttribute("hidden", "hidden");
    document.getElementById("lblListaVacia").innerText = "";
    document.getElementById("lblListaVacia").setAttribute("hidden", "hidden");
    document.getElementById("btnRegistrarModificarConfiguracion").textContent = "Agregar";

    $('#lblNombreConfiguracion').css('color', 'red');
    $('#txtNombreConfiguracion').css('border-color', 'red');

    const perfil = getPerfilConfigGeo(controllerConfiguracion);

    if (comboNombre != null || perfil?.provincia) {
        document.getElementById("lblConfiguracionCombo").innerText = lblComboNombre || "Provincia";
        document.getElementById("cmbConfiguracion").value = "";
        $('#cmbConfiguracion').css('border-color', 'red');
    }

    if (perfil?.partido) {
        document.getElementById("cmbConfiguracionPartido").value = "";
    }

    if (controllerConfiguracion === "Cuentas") {
        document.getElementById("cmbConfiguracionTipoCuenta").value = "Efectivo";
    }

    validarCamposConfiguracion();
}

function obtenerPrefVistaListados() {
    if (window.RpGridView) return RpGridView.getPref();
    const pref = localStorage.getItem("rpGridViewPref") || localStorage.getItem("cgViewPref") || "auto";
    return ["auto", "table", "cards"].includes(pref) ? pref : "auto";
}

function syncPreferenciasVisualizacionUi(pref) {
    const val = ["auto", "table", "cards"].includes(pref) ? pref : "auto";
    $("#rpConfigViewOptions .rp-config-view-card").removeClass("is-active");
    $(`#rpConfigViewOptions .rp-config-view-card[data-rp-view="${val}"]`).addClass("is-active");
}

function guardarPrefVistaListados(pref) {
    const val = ["auto", "table", "cards"].includes(pref) ? pref : "auto";
    localStorage.setItem("rpGridViewPref", val);
    localStorage.setItem("cgViewPref", val);
    syncPreferenciasVisualizacionUi(val);

    if (window.RpGridView) {
        RpGridView.setPref(val);
    } else {
        $(".cg-page, .cl-page, .page-99, .ld-index")
            .removeClass("rp-view-mode-auto rp-view-mode-table rp-view-mode-cards cg-mode-auto cg-mode-table cg-mode-cards")
            .addClass(`rp-view-mode-${val} cg-mode-${val}`);
        $(document).trigger("rpGridViewChanged", [val]);
    }
}

function initPreferenciasVisualizacion() {
    syncPreferenciasVisualizacionUi(obtenerPrefVistaListados());

    $("#rpConfigViewOptions")
        .off("click.rpViewPref")
        .on("click.rpViewPref", ".rp-config-view-card", function (e) {
            e.preventDefault();
            e.stopPropagation();
            guardarPrefVistaListados($(this).data("rpView") || "auto");
        });
}

function abrirConfiguraciones() {
    vieneDeModalConfiguraciones = true;

    showModalById("ModalEdicionConfiguraciones");
    $("#btnGuardarConfiguracion").text("Aceptar");
    $("#modalEdicionLabel").text("Configuraciones");

    initPreferenciasVisualizacion();

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
    const go = () => { window.location.href = '/Login/Logout'; };
    if (window.SessionManager?.beginVoluntaryLogout) {
        Promise.resolve(window.SessionManager.beginVoluntaryLogout())
            .catch(() => { })
            .finally(go);
        return;
    }
    sessionStorage.removeItem('sesionExpirada');
    sessionStorage.setItem('logoutVoluntario', '1');
    localStorage.removeItem('JwtToken');
    localStorage.removeItem('userSession');
    localStorage.removeItem('sessionExpiresAt');
    go();
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
    const plantillas = await fetch(`/ContratosPlantillas/Lista`, {
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
            errorModal("Selecciona un .docx para subir.");
            return;
        }
        if (!file.name.toLowerCase().endsWith(".docx")) {
            errorModal("Solo se permite .docx.");
            return;
        }

        const fd = new FormData();
        fd.append("file", file);

        const r = await fetch(`/ContratosPlantillas/Subir?idTipoContrato=${idTipoContrato}`, {
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
        const r = await fetch(`/ContratosPlantillas/Descargar?idTipoContrato=${idTipoContrato}&nombre=${encodeURIComponent(nombreTipo)}`, {
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
        const r = await fetch(`/ContratosPlantillas/Eliminar?idTipoContrato=${idTipoContrato}`, {
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