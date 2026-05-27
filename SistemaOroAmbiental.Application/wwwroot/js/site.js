function obtenerTokenJwt() {
    return localStorage.getItem("JwtToken");
}

const token = obtenerTokenJwt();
window.token = token;
window.obtenerTokenJwt = obtenerTokenJwt;

const TEXTOS_MODAL = {
    confirmacionTitulo: "Confirmaci\u00F3n",
    confirmacionBtn: "S\u00ED, continuar",
    exitoTitulo: "\u00C9xito"
};

function aplicarTextosModalesEstaticos() {
    const tituloConfirmar = document.getElementById("modalConfirmarLabel");
    const btnConfirmar = document.getElementById("btnModalConfirmarAceptar");
    const tituloExito = document.getElementById("exitoModalLabel");
    if (tituloConfirmar) tituloConfirmar.textContent = TEXTOS_MODAL.confirmacionTitulo;
    if (btnConfirmar) btnConfirmar.textContent = TEXTOS_MODAL.confirmacionBtn;
    if (tituloExito) tituloExito.textContent = TEXTOS_MODAL.exitoTitulo;
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", aplicarTextosModalesEstaticos);
} else {
    aplicarTextosModalesEstaticos();
}

const RP_MODALES_FEEDBACK = new Set(["exitoModal", "errorModal", "AdvertenciaModal", "modalConfirmar"]);
const RP_MODAL_Z_BASE = 10000056;
const RP_MODAL_Z_MIN_FEEDBACK = 10000090;
const RP_MODAL_Z_STEP = 20;

/** Mayor z-index entre modales visibles (p. ej. contratos a 10000056+). */
function rpZIndexMaximoModalAbierto(excluirId = null) {
    let max = 10000055;
    document.querySelectorAll(".modal.show").forEach(m => {
        if (excluirId && m.id === excluirId) return;
        const z = parseInt(window.getComputedStyle(m).zIndex, 10);
        if (!isNaN(z) && z > max) max = z;
    });
    return max;
}

function rpZIndexFeedback(modalEl) {
    const sobreAbiertos = rpZIndexMaximoModalAbierto(modalEl?.id) + RP_MODAL_Z_STEP;
    return Math.max(RP_MODAL_Z_MIN_FEEDBACK, sobreAbiertos);
}

function rpElevarBackdropModal(zIndex) {
    requestAnimationFrame(() => {
        const backdrops = document.querySelectorAll(".modal-backdrop");
        const bd = backdrops[backdrops.length - 1];
        if (bd) bd.style.setProperty("z-index", String(zIndex - 1), "important");
    });
}

/**
 * Tras cerrar éxito/error/confirmación encima de otro modal, Bootstrap a veces deja
 * backdrops de más o body.modal-open mal — la pantalla queda oscura sin motivo.
 */
function rpSincronizarEstadoModales() {
    const modales = Array.from(document.querySelectorAll(".modal.show"));
    let backdrops = Array.from(document.querySelectorAll(".modal-backdrop"));

    while (backdrops.length > modales.length) {
        backdrops[backdrops.length - 1].remove();
        backdrops = Array.from(document.querySelectorAll(".modal-backdrop"));
    }

    if (modales.length > 0) {
        document.body.classList.add("modal-open");
        const topModal = modales[modales.length - 1];
        const z = parseInt(window.getComputedStyle(topModal).zIndex, 10);
        if (!isNaN(z)) {
            rpElevarBackdropModal(z);
        }
        return;
    }

    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("padding-right");
    document.querySelectorAll(".modal-backdrop").forEach(b => b.remove());
}

const _rpModalAutoCloseTimers = {};

function rpElevarModalFeedback(modalEl) {
    if (!modalEl) return;
    const z = rpZIndexFeedback(modalEl);
    modalEl.style.setProperty("z-index", String(z), "important");
    rpElevarBackdropModal(z);
}

/** Apila modales de edición; los de feedback quedan siempre encima. */
if (!window._rpModalStackInit) {
    window._rpModalStackInit = true;

    document.addEventListener("show.bs.modal", (event) => {
        const el = event.target;
        if (!(el instanceof HTMLElement) || !el.classList.contains("modal")) return;

        if (RP_MODALES_FEEDBACK.has(el.id)) {
            rpElevarModalFeedback(el);
            return;
        }

        const modalesAbiertos = document.querySelectorAll(".modal.show").length;
        const zIndex = RP_MODAL_Z_BASE + (10 * modalesAbiertos);
        el.style.setProperty("z-index", String(zIndex), "important");
        rpElevarBackdropModal(zIndex);
    });

    document.addEventListener("hidden.bs.modal", (event) => {
        if (!(event.target instanceof HTMLElement) || !event.target.classList.contains("modal")) {
            return;
        }
        requestAnimationFrame(() => {
            rpSincronizarEstadoModales();
            requestAnimationFrame(rpSincronizarEstadoModales);
        });
    });
}

async function MakeAjax(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: options.dataType,
        contentType: options.contentType
    });
}


async function MakeAjaxFormData(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: false,
        contentType: false,
        isFormData: true,
        processData: false
    });
}


// Formatear el número de manera correcta
function formatNumber(number) {
    if (typeof number !== 'number' || isNaN(number)) {
        return "$ 0,00"; // Si el número no es válido, retornar un valor por defecto
    }

    // Asegurarse de que el número tenga dos decimales
    const parts = number.toFixed(2).split("."); // Dividir en parte entera y decimal

    // Formatear la parte entera con puntos como separadores de miles
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "."); // Usar punto para miles

    // Devolver el número con la coma como separador decimal
    return "$ " + parts.join(",");
}



function mostrarModalConContador(modalId, texto, tiempo) {
    const el = document.getElementById(modalId);
    if (!el) return;

    const textEl = document.getElementById(`${modalId}Text`);
    if (textEl) textEl.textContent = texto;

    if (_rpModalAutoCloseTimers[modalId]) {
        clearTimeout(_rpModalAutoCloseTimers[modalId]);
        _rpModalAutoCloseTimers[modalId] = null;
    }

    const cancelarTimerAutoCierre = () => {
        if (_rpModalAutoCloseTimers[modalId]) {
            clearTimeout(_rpModalAutoCloseTimers[modalId]);
            _rpModalAutoCloseTimers[modalId] = null;
        }
    };

    const programarAutoCierre = (cerrarFn) => {
        cancelarTimerAutoCierre();
        _rpModalAutoCloseTimers[modalId] = setTimeout(() => {
            _rpModalAutoCloseTimers[modalId] = null;
            if (el.classList.contains("show")) {
                cerrarFn();
            }
        }, tiempo);
    };

    el.addEventListener("hidden.bs.modal", () => {
        cancelarTimerAutoCierre();
        requestAnimationFrame(() => {
            rpSincronizarEstadoModales();
            requestAnimationFrame(rpSincronizarEstadoModales);
        });
    }, { once: true });

    const abrir = () => {
        rpElevarModalFeedback(el);

        if (window.bootstrap?.Modal) {
            const inst = bootstrap.Modal.getOrCreateInstance(el);
            el.addEventListener("shown.bs.modal", () => rpElevarModalFeedback(el), { once: true });
            inst.show();
            programarAutoCierre(() => {
                if (el.classList.contains("show")) {
                    inst.hide();
                }
            });
        } else if (window.jQuery) {
            const $el = window.jQuery(el);
            $el.one("shown.bs.modal", () => rpElevarModalFeedback(el));
            $el.modal("show");
            programarAutoCierre(() => {
                if (el.classList.contains("show")) {
                    $el.modal("hide");
                }
            });
        }
    };

    abrir();
}

function exitoModal(texto) {
    mostrarModalConContador('exitoModal', texto, 1000);
}

function errorModal(texto) {
    mostrarModalConContador('errorModal', texto, 3000);
}

function advertenciaModal(texto) {
    mostrarModalConContador('AdvertenciaModal', texto, 3000);
}

function confirmarModal(mensaje) {
    return new Promise((resolve) => {
        const modalEl = document.getElementById('modalConfirmar');
        const mensajeEl = document.getElementById('modalConfirmarMensaje');
        const btnAceptar = document.getElementById('btnModalConfirmarAceptar');

        mensajeEl.innerText = mensaje;

        const modal = new bootstrap.Modal(modalEl, {
            backdrop: 'static',
            keyboard: false
        });

        // Flag para que no resuelva dos veces
        let resuelto = false;

        // Limpia todos los listeners anteriores
        modalEl.replaceWith(modalEl.cloneNode(true));
        // Re-obtener referencias luego de clonar
        const nuevoModalEl = document.getElementById('modalConfirmar');
        const nuevoBtnAceptar = document.getElementById('btnModalConfirmarAceptar');
        const nuevoTitulo = document.getElementById('modalConfirmarLabel');
        const nuevoMensaje = document.getElementById('modalConfirmarMensaje');

        if (nuevoTitulo) nuevoTitulo.textContent = TEXTOS_MODAL.confirmacionTitulo;
        if (nuevoBtnAceptar) nuevoBtnAceptar.textContent = TEXTOS_MODAL.confirmacionBtn;
        if (nuevoMensaje) nuevoMensaje.textContent = mensaje;

        const nuevoModal = new bootstrap.Modal(nuevoModalEl, {
            backdrop: 'static',
            keyboard: false
        });

        nuevoBtnAceptar.onclick = function () {
            if (resuelto) return;
            resuelto = true;
            resolve(true);
            nuevoModal.hide();
        };

        nuevoModalEl.addEventListener('hidden.bs.modal', () => {
            if (resuelto) return;
            resuelto = true;
            resolve(false);
        }, { once: true });

        nuevoModal.show();
    });
}

/**
 * Flujo de eliminación con listado de dependencias.
 * @returns {Promise<{accion:'ok'|'cancelar', data?:object}>}
 */
async function ejecutarEliminacionEntidad(opts) {
    const {
        entidadLabel = "el registro",
        urlDependencias,
        urlEliminar,
        headers = {},
        fetchJson = null
    } = opts || {};

    const doFetch = fetchJson || (async (url, options) => {
        const r = await fetch(url, options);
        if (!r.ok) throw new Error(`Error HTTP ${r.status}`);
        return await r.json();
    });

    let depInfo;
    try {
        depInfo = await doFetch(urlDependencias, { method: "GET", headers });
    } catch (e) {
        console.error(e);
        if (typeof errorModal === "function") errorModal("No se pudieron verificar las dependencias.");
        return { accion: "cancelar" };
    }

    const items = depInfo?.items || depInfo?.Items || [];
    const tieneDeps = items.length > 0;

    if (!tieneDeps) {
        const ok = typeof confirmarModal === "function"
            ? await confirmarModal(`¿Desea eliminar ${entidadLabel}?`)
            : window.confirm(`¿Desea eliminar ${entidadLabel}?`);
        if (!ok) return { accion: "cancelar" };

        try {
            const data = await doFetch(urlEliminar(false), { method: "DELETE", headers });
            const valor = !!(data?.valor ?? data?.Valor);
            if (!valor) {
                if (typeof errorModal === "function") {
                    errorModal(data?.mensaje ?? data?.Mensaje ?? "No se pudo eliminar.");
                }
                return { accion: "cancelar" };
            }
            return { accion: "ok", data };
        } catch (e) {
            console.error(e);
            if (typeof errorModal === "function") errorModal("Ha ocurrido un error al eliminar.");
            return { accion: "cancelar" };
        }
    }

    const eleccion = await new Promise((resolve) => {
        const modalEl = document.getElementById("modalEliminarCascada");
        if (!modalEl) {
            resolve("manual");
            return;
        }

        const titulo = document.getElementById("modalEliminarCascadaTitulo");
        const intro = document.getElementById("modalEliminarCascadaIntro");
        const lista = document.getElementById("modalEliminarCascadaLista");
        const btnCascada = document.getElementById("btnEliminarCascadaConfirmar");
        const btnManual = document.getElementById("btnEliminarCascadaManual");

        if (titulo) titulo.textContent = `Eliminar ${entidadLabel}`;
        if (intro) {
            intro.textContent = depInfo?.mensajeResumen || depInfo?.MensajeResumen
                || `Este registro tiene datos asociados que impiden borrarlo directamente:`;
        }

        if (lista) {
            lista.innerHTML = items.map(it => {
                const etiqueta = it.etiqueta || it.Etiqueta || "Registro";
                const cant = Number(it.cantidad ?? it.Cantidad ?? 0);
                return `<li class="list-group-item bg-transparent text-white border-secondary px-0">
                    <i class="fa fa-link text-warning me-2"></i>
                    <strong>${cant}</strong> — ${etiqueta}
                </li>`;
            }).join("");
        }

        const modal = new bootstrap.Modal(modalEl, { backdrop: "static", keyboard: false });
        let resuelto = false;

        const cerrar = (valor) => {
            if (resuelto) return;
            resuelto = true;
            modal.hide();
            resolve(valor);
        };

        btnCascada.onclick = () => cerrar("cascada");
        btnManual.onclick = () => cerrar("manual");
        modalEl.addEventListener("hidden.bs.modal", () => {
            if (!resuelto) cerrar("cancelar");
        }, { once: true });

        modal.show();
    });

    if (eleccion === "cancelar") return { accion: "cancelar" };

    if (eleccion === "manual") {
        const pasos = depInfo?.instruccionesPasoAPaso || depInfo?.InstruccionesPasoAPaso || "";
        const detalle = items.map((it, i) => {
            const acc = it.accionManual || it.AccionManual || "";
            return `${i + 1}. ${acc}`;
        }).join("\n");

        const msg = (pasos || depInfo?.mensajeResumen || depInfo?.MensajeResumen || "Tiene registros asociados.")
            + (detalle ? `\n\n${detalle}` : "");

        if (typeof errorModal === "function") errorModal(msg);
        return { accion: "cancelar" };
    }

    const okCascada = typeof confirmarModal === "function"
        ? await confirmarModal(
            `¿Confirma eliminar ${entidadLabel} y TODOS los registros asociados listados? Esta acción no se puede deshacer.`)
        : window.confirm("¿Eliminar todo en cascada?");

    if (!okCascada) return { accion: "cancelar" };

    try {
        const data = await doFetch(urlEliminar(true), { method: "DELETE", headers });
        const valor = !!(data?.valor ?? data?.Valor);
        if (!valor) {
            if (typeof errorModal === "function") {
                errorModal(data?.mensaje ?? data?.Mensaje ?? "No se pudo eliminar en cascada.");
            }
            return { accion: "cancelar" };
        }
        return { accion: "ok", data };
    } catch (e) {
        console.error(e);
        if (typeof errorModal === "function") errorModal("Ha ocurrido un error al eliminar en cascada.");
        return { accion: "cancelar" };
    }
}

window.ejecutarEliminacionEntidad = ejecutarEliminacionEntidad;


const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS', // Cambia "ARS" por el código de moneda que necesites
    minimumFractionDigits: 2
});

function convertirMonedaAFloat(moneda) {
    // Eliminar el símbolo de la moneda y otros caracteres no numéricos
    const soloNumeros = moneda.replace(/[^0-9,.-]/g, '');

    // Eliminar separadores de miles y convertir la coma en punto
    const numeroFormateado = soloNumeros.replace(/\./g, '').replace(',', '.');

    // Convertir a flotante
    const numero = parseFloat(numeroFormateado);

    // Devolver el número formateado como cadena, asegurando los decimales
    return numero.toFixed(2); // Asegura siempre dos decimales en la salida
}
function convertirAMonedaDecimal(valor) {
    // Reemplazar coma por punto
    if (typeof valor === 'string') {
        valor = valor.replace(',', '.'); // Cambiar la coma por el punto
    }
    // Convertir a número flotante
    return parseFloat(valor);
}

function formatoNumero(valor) {
    // Reemplaza la coma por punto y elimina otros caracteres no numéricos (como $)
    return parseFloat(valor.replace(/[^0-9,]+/g, '').replace(',', '.')) || 0;
}

function parseDecimal(value) {
    return parseFloat(value.replace(',', '.'));
}


function formatMoneda(valor) {
    // Convertir a string, cambiar el punto decimal a coma y agregar separadores de miles
    let formateado = valor
        .toString()
        .replace('.', ',') // Cambiar punto decimal a coma
        .replace(/\B(?=(\d{3})+(?!\d))/g, "."); // Agregar separadores de miles

    // Agregar el símbolo $ al inicio
    return `$ ${formateado}`;
}


function toggleAcciones(id) {
    const dropdown = document.querySelector(`.acciones-menu[data-id='${id}'] .acciones-dropdown`);
    const isVisible = dropdown.style.display === 'block';

    // Oculta todos los demás menús desplegables
    document.querySelectorAll('.acciones-dropdown').forEach(el => el.style.display = 'none');

    if (!isVisible) {
        // Muestra el menú
        dropdown.style.display = 'block';

        // Obtén las coordenadas del botón
        const menuButton = document.querySelector(`.acciones-menu[data-id='${id}']`);
        const rect = menuButton.getBoundingClientRect();

        // Mueve el menú al body y ajusta su posición
        const dropdownClone = dropdown.cloneNode(true);
        dropdownClone.style.position = 'fixed';
        dropdownClone.style.left = `${rect.left}px`;
        dropdownClone.style.top = `${rect.bottom}px`;
        dropdownClone.style.zIndex = '10000';
        dropdownClone.style.display = 'block';

        // Limpia menús previos si es necesario
        document.querySelectorAll('.acciones-dropdown-clone').forEach(clone => clone.remove());

        dropdownClone.classList.add('acciones-dropdown-clone');
        document.body.appendChild(dropdownClone);
    }
}




function _formatearFechaNativa(fecha, paraVista) {
    if (fecha == null || fecha === "") return "";

    const s = String(fecha).trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
        return paraVista ? `${iso[3]}/${iso[2]}/${iso[1]}` : `${iso[1]}-${iso[2]}-${iso[3]}`;
    }

    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return s;

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return paraVista ? `${dd}/${mm}/${yyyy}` : `${yyyy}-${mm}-${dd}`;
}

function formatearFechaParaInput(fecha) {
    if (typeof moment !== "undefined") {
        const m = moment(fecha, [moment.ISO_8601, "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD"]);
        return m.isValid() ? m.format("YYYY-MM-DD") : "";
    }
    return _formatearFechaNativa(fecha, false);
}

function formatearFechaParaVista(fecha) {
    if (typeof moment !== "undefined") {
        const m = moment(fecha, [moment.ISO_8601, "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD"]);
        return m.isValid() ? m.format("DD/MM/YYYY") : "";
    }
    return _formatearFechaNativa(fecha, true);
}

function formatearMilesInput(input) {

    let value = input.value;

    if (!value) return;

    // permitir solo números, coma y punto
    value = value.replace(/[^0-9.,]/g, "");

    // separar decimal (solo primera coma)
    let parts = value.split(",");
    let entero = parts[0];
    let decimal = parts[1] ?? null;

    // limpiar puntos existentes
    entero = entero.replace(/\./g, "");

    // formatear miles
    if (entero) {
        entero = Number(entero).toLocaleString("es-AR");
    }

    // reconstruir
    input.value = decimal !== null
        ? `${entero},${decimal}`
        : entero;
}

function parseNumero(valor) {

    if (valor == null) return 0;

    let limpio = String(valor)
        .replace(/\./g, "")   // quitar miles
        .replace(",", ".");   // decimal a punto

    const num = parseFloat(limpio);

    return isNaN(num) ? 0 : num;
}

/** Lee un input con formato miles es-AR (alias de parseNumero, usado en CC / compras). */
function leerInputNumerico(valor) {
    return parseNumero(valor);
}

function redondear2(n) {
    const x = Number(n || 0);
    return Math.round(x * 100) / 100;
}

function formatearMonedaARS(n) {

    const v = redondear2(Number(n || 0));

    return v.toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatearNumero(n) {

    return Number(n || 0).toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


function formatearMiles(valor) {

    if (!valor) return "";

    let value = String(valor).replace(/[^0-9.,]/g, "");

    let [entero, decimal] = value.split(",");

    entero = (entero || "").replace(/\./g, "");

    if (entero) {
        entero = Number(entero).toLocaleString("es-AR");
    }

    return decimal !== undefined
        ? `${entero},${decimal}`
        : entero;
}

function formatearSinMiles(valor) {

    if (valor == null) return 0;

    let s = String(valor).trim();

    if (!s) return 0;

    s = s.replace(/\s/g, "");

    // formato AR → 1.500,30
    if (s.includes(".") && s.includes(",")) {
        s = s.replace(/\./g, "").replace(",", ".");
    }
    // solo coma → decimal
    else if (s.includes(",")) {
        s = s.replace(",", ".");
    }
    // solo puntos múltiples → miles
    else if ((s.match(/\./g) || []).length > 1) {
        s = s.replace(/\./g, "");
    }

    const n = parseFloat(s);

    return isNaN(n) ? 0 : n;
}

let audioContext = null;
let audioBuffer = null;


function llenarSelect(selectId, data, valueField = 'Id', textField = 'Nombre', conOpcionVacia = true) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = conOpcionVacia ? '<option value="">Seleccione</option>' : '';
    (data || []).forEach(it => {
        const opt = document.createElement('option');
        opt.value = it[valueField];
        opt.textContent = it[textField];
        sel.appendChild(opt);
    });
}



function formatearFecha(fecha) {
    try {
        const d = new Date(fecha);
        return d.toLocaleString("es-AR");
    } catch {
        return fecha;
    }
}

function normalizarDateInput(fecha) {
    if (!fecha) return "";
    try {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return "";
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    } catch {
        return "";
    }
}

function normalizarFechaTabla(fecha) {
    // Mostramos dd/MM/yyyy (si viene ISO)
    if (!fecha) return "";
    try {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return fecha;
        return d.toLocaleDateString("es-AR");
    } catch {
        return fecha;
    }
}


function abrirModalEdicion() {
    const modalEl = document.getElementById('modalEdicion');

    const modal = new bootstrap.Modal(modalEl, {
        backdrop: 'static',
        keyboard: false
    });

    modal.show();
}


function setModalSoloLectura(esSoloLectura) {
    const $modal = $("#modalEdicion");

    // Ocultar botón guardar/registrar
    $("#btnGuardar").toggleClass("d-none", esSoloLectura);

    // Opcional: por si tenés otro botón en el footer
    // $("#btnAlgoMas").toggleClass("d-none", esSoloLectura);

    // Deshabilitar inputs/textareas
    $modal.find("input, textarea").prop("disabled", esSoloLectura);

    // Deshabilitar selects normales + select2
    $modal.find("select").each(function () {
        const $el = $(this);
        $el.prop("disabled", esSoloLectura);

        if ($el.data("select2")) {
            $el.prop("disabled", esSoloLectura);
            $el.trigger("change.select2");
        }
    });

    // Evitar que se “pinten” validaciones mientras está solo lectura
    $modal.attr("data-sololectura", esSoloLectura ? "1" : "0");
}



/* =====================================
GS-UI — Render Acciones Grid GLOBAL
===================================== */

function renderAccionesGrid(id, acciones, modulo = null) {

    const tienePermiso = () => true;

    const mod = modulo || acciones.modulo || "";

    const btnVer = (acciones.ver && tienePermiso(mod, "VER"))
        ? `
        <button type="button"
            class="btn btn-sm rp-act rp-act-view"
            title="Ver"
            onclick="${acciones.ver}(${id})">
            <i class="fa fa-file-text-o"></i>
        </button>`
        : "";

    const btnEditar = (acciones.editar && tienePermiso(mod, "EDITAR"))
        ? `
        <button type="button"
            class="btn btn-sm rp-act rp-act-edit"
            title="Editar"
            onclick="${acciones.editar}(${id})">
            <i class="fa fa-pencil-square-o"></i>
        </button>`
        : "";

    const btnEliminar = (acciones.eliminar && tienePermiso(mod, "ELIMINAR"))
        ? `
        <button type="button"
            class="btn btn-sm rp-act rp-act-del"
            title="Eliminar"
            onclick="${acciones.eliminar}(${id})">
            <i class="fa fa-trash-o"></i>
        </button>`
        : "";

    return `
        <div class="rp-row-actions" data-id="${id}">
            ${btnVer}
            ${btnEditar}
            ${btnEliminar}
        </div>
    `;
}
/* ======================================================
EXPORTADOR GLOBAL DATATABLES
(usar desde cualquier grid)
====================================================== */

window.ExportadorDT = {
    grid: null,
    tipo: null
};

/* =========================
   ABRIR MODAL
========================= */

window.abrirModalExportacion = function (grid, tipo, nombreListado) {

    if (!grid) return;

    ExportadorDT.grid = grid;
    ExportadorDT.tipo = tipo;
    ExportadorDT.nombreListado = nombreListado || "Datos";

    const container = $("#exportColumnsContainer");
    container.empty();

    const columns = grid.settings()[0].aoColumns;

    columns.forEach((col, index) => {

        if (index === 0) return;
        if (!grid.column(index).visible()) return;

        const nombre = col.sTitle || `Columna ${index}`;

        container.append(`
<label class="export-item">
    <input type="checkbox"
           class="export-col"
           value="${index}"
           checked>
    <span class="export-pill">${nombre}</span>
</label>
`);
    });

    $("#modalExportar").modal("show");
};

/* =========================
   CONFIRMAR EXPORT
========================= */

$(document).off("click.exportador")
    .on("click.exportador", "#btnConfirmarExport", function () {

        const columnas = [];

        $(".export-col:checked").each(function () {
            columnas.push(parseInt($(this).val()));
        });

        if (!columnas.length) {
            alert("Seleccione al menos una columna");
            return;
        }

        $("#modalExportar").modal("hide");

        ejecutarExportacionGlobal(columnas);
    });


/* =========================
   EXPORT REAL
========================= */

window.ejecutarExportacionGlobal = function (columnas) {

    const grid = ExportadorDT.grid;
    const tipo = ExportadorDT.tipo;

    if (!grid) return;

    const tituloExport = `Listado de ${ExportadorDT.nombreListado}`;

    const configBase = {
        title: tituloExport || "Exportación",
        exportOptions: {
            columns: columnas
        }
    };

    let buttonConfig;

    switch (tipo) {
        case "excel":
            buttonConfig = { extend: 'excelHtml5', ...configBase };
            break;

        case "pdf":
            buttonConfig = {
                extend: 'pdfHtml5',
                orientation: 'landscape',
                pageSize: 'A4',
                ...configBase
            };
            break;

        case "print":
            buttonConfig = { extend: 'print', ...configBase };
            break;

        default:
            return;
    }

    const temp = new $.fn.dataTable.Buttons(grid, {
        buttons: [buttonConfig]
    });

    // ✅ EJECUCIÓN REAL
    temp.container().find('button').trigger('click');
};

$(document).on("change", "#chkExportAll", function () {
    $(".export-col").prop("checked", this.checked);
});

window.ExportadorDT = {
    grid: null,
    tipo: null,
    nombreListado: null   // 👈 NUEVO
};

function cerrarErrorCampos() {
    $("#errorCampos").addClass("d-none");
}

function mostrarErrorCampos(
    mensaje,
    idReferencia = null,
    tipo = "validacion", // validacion | duplicado | relacion | error
    handlerVerFicha = null
) {
    const container = document.getElementById("errorCampos");
    if (!container) return;

    const handler = handlerVerFicha || window.rpVerFichaHandlerDefault || "verFicha";

    if (window.RpVerFicha?.renderErrorCampos) {
        window.RpVerFicha.renderErrorCampos(container, mensaje, idReferencia, tipo, handler);
        return;
    }

    const { titulo, icono } = { titulo: "Campos requeridos", icono: "fa-exclamation-circle" };
    container.innerHTML = `
        <div class="rp-error-box">
            <div class="rp-error-icon"><i class="fa ${icono}"></i></div>
            <div class="rp-error-content">
                <div class="rp-error-title">${titulo}</div>
                <div class="rp-error-text">${mensaje}</div>
            </div>
        </div>`;
    container.classList.remove("d-none");
    container.scrollIntoView({ behavior: "smooth", block: "center" });
}




function getSelect2Selection(el) {
    const $el = $(el);
    const s2 = $el.data("select2");
    if (s2 && s2.$selection && s2.$container) {
        return {
            $selection: s2.$selection,
            $container: s2.$container
        };
    }

    const $cont = $el.nextAll(".select2-container").first();
    return {
        $selection: $cont.find(".select2-selection").first(),
        $container: $cont
    };
}


function setEstadoCampo(el, esValido) {
    const $el = $(el);
    const esSelect = el.tagName === "SELECT";
    const valor = ($el.val() ?? "").toString().trim();

    // 1) clases en el elemento real
    el.classList.toggle("is-invalid", !esValido);
    el.classList.toggle("is-valid", esValido);

    // 2) clases en select2 (lo visible)
    if (esSelect && $el.data("select2")) {
        const { $selection, $container } = getSelect2Selection(el);
        $selection.toggleClass("is-invalid", !esValido);
        $selection.toggleClass("is-valid", esValido);

        // por si tu CSS apunta al container
        $container.toggleClass("is-invalid", !esValido);
        $container.toggleClass("is-valid", esValido);
    }

    // 3) mensaje "Campo obligatorio" (col-md-* , rp-select-plus + select2, etc.)
    let $wrap = $el.closest(".mb-3, .form-group, [class*='col-'], .col, .rp-field, .rp-form-group");
    if (!$wrap.length && esSelect) {
        $wrap = $el.closest(".rp-select-plus").parent();
    }

    let $msg = $wrap.find(".invalid-feedback, .rp-invalid-msg, .campo-obligatorio, small.text-danger").first();

    if (!$msg.length && esSelect) {
        const $plus = $el.closest(".rp-select-plus");
        $msg = $plus.next(".invalid-feedback, .rp-invalid-msg, .campo-obligatorio, small.text-danger").first();
    }

    if ($msg.length) {
        $msg.toggleClass("d-none", esValido);
        if (!esValido) {
            $msg.css("display", "block");
        } else {
            $msg.css("display", "");
        }
    }
}




function aplicarFormatoMiles() {

    document.querySelectorAll(".Inputmiles").forEach(inp => {

        const num = inp.value;

        if (!num) {
            inp.value = "";
            return;
        }

        inp.value = formatearMiles(num);

    });

}

document.addEventListener("input", function (e) {
    const input = e.target;
    if (!input?.classList?.contains("Inputmiles")) return;
    if (typeof formatearMilesInput === "function") {
        formatearMilesInput(input);
    }
});

function vnTimeHHmm(value) {

    if (!value) return "00:00";

    const d = value instanceof Date ? value : new Date(value);

    if (isNaN(d.getTime())) return "00:00";

    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");

    return `${hh}:${mm}`;
}

function vnIsoDateOnly(value) {

    if (!value) return "";

    const d = value instanceof Date ? value : new Date(value);

    if (isNaN(d.getTime())) return "";

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
}


function tienePermiso() {
    return true;
}

/* =========================================================
   ATAJOS + (alta rápida de catálogos desde modales)
   data-config-nombre, data-config-controller
   Opcional: data-config-combo-nombre, data-config-combo-controller, data-config-combo-label
========================================================= */

document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".rp-btn-plus[data-config-controller], .vn-btn-plus[data-config-controller]");
    if (!btn || btn.disabled) return;

    e.preventDefault();
    window._rpUltimoAtajoConfigBtn = btn;

    const modalPadre = btn.closest(".modal");
    if (modalPadre?.getAttribute("data-sololectura") === "1") return;

    if (typeof abrirConfiguracion !== "function") {
        errorModal("No se pudo abrir la configuración.");
        return;
    }

    const nombre = btn.getAttribute("data-config-nombre") || "";
    const controller = btn.getAttribute("data-config-controller") || "";
    const comboNombre = btn.getAttribute("data-config-combo-nombre") || null;
    const comboController = btn.getAttribute("data-config-combo-controller") || null;
    const lblCombo = btn.getAttribute("data-config-combo-label") || null;

    try {
        await abrirConfiguracion(
            nombre,
            controller,
            comboNombre,
            comboController,
            lblCombo,
            true
        );
    } catch (err) {
        console.error(err);
        errorModal("No se pudo abrir la configuración.");
    }
});

function getBotonesExportacion(grid,modulo) {

    const botones = [];

    if (tienePermiso(modulo, "Exportar")) {
        botones.push({
            text: 'Excel',
            action: () => abrirModalExportacion(grid, 'excel', modulo)
        });

        botones.push({
            text: 'PDF',
            action: () => abrirModalExportacion(grid, 'pdf', modulo)
        });

        botones.push({
            text: 'Imprimir',
            action: () => abrirModalExportacion(grid, 'print', modulo)
        });
    }

    // siempre dejamos este
    botones.push('pageLength');

    return botones;
}

/* =========================
   SUCURSALES DEL USUARIO LOGUEADO
========================= */

function obtenerUserSession() {
    try {
        return JSON.parse(localStorage.getItem("userSession") || "{}");
    } catch {
        return {};
    }
}

function getSucursalesUsuarioSession() {
    const u = obtenerUserSession();
    return Array.isArray(u.Sucursales) ? u.Sucursales : [];
}

function getIdSucursalDefaultUsuario(sucursalesList) {
    const u = obtenerUserSession();
    if (u.IdSucursalDefault) return Number(u.IdSucursalDefault);
    const list = sucursalesList || getSucursalesUsuarioSession();
    if (list.length === 1) return Number(list[0].Id);
    return null;
}

function usuarioTieneUnicaSucursal(sucursalesList) {
    const list = sucursalesList || getSucursalesUsuarioSession();
    return list.length === 1;
}

/** Si el usuario tiene 1 sola sucursal, no muestra "Todas" / "Seleccionar". */
function primeraOpcionSucursal(opcionPorDefecto, sucursalesList) {
    if (usuarioTieneUnicaSucursal(sucursalesList)) return null;
    return opcionPorDefecto || null;
}

function desbloquearSelectSucursal($select) {
    if (!$select || !$select.length) return;
    $select.prop("disabled", false).removeAttr("aria-readonly").removeClass("sucursal-unica-lock");
    const $wrap = $select.next(".select2-container");
    if ($wrap.length) {
        $wrap.removeClass("sucursal-unica-lock").css("pointer-events", "");
    }
}

async function fetchSucursalesPermitidas(url) {
    const apiUrl = url || "/Sucursales/Lista";
    const headers = typeof authHeaders === "function"
        ? authHeaders()
        : { Authorization: "Bearer " + (typeof token !== "undefined" ? token : (window.token || localStorage.getItem("JwtToken") || "")) };

    try {
        const response = await fetch(apiUrl, { headers });
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        console.error(e);
        return [];
    }
}

function llenarSelectSucursales($select, sucursales, options) {
    if (!$select || !$select.length) return;

    options = options || {};
    if (options.placeholderTodos && !usuarioTieneUnicaSucursal(sucursales)) {
        options.primeraOpcion = { value: "", text: "Todas" };
    }

    const unica = usuarioTieneUnicaSucursal();
    const lista = unica ? getSucursalesUsuarioSession() : (sucursales || []);
    const valorActual = $select.val();

    $select.empty();

    const primera = unica ? null : options.primeraOpcion;
    if (primera) {
        $select.append(
            `<option value="${primera.value ?? ""}">${primera.text || ""}</option>`
        );
    }

    lista.forEach(x => {
        $select.append(`<option value="${x.Id}">${x.Nombre}</option>`);
    });

    let val = valorActual;
    if ((!val || val === "") && options.seleccionarPorDefecto !== false) {
        const def = getIdSucursalDefaultUsuario(lista);
        if (def && $select.find(`option[value="${def}"]`).length) {
            val = String(def);
        }
    }

    if (val && $select.find(`option[value="${val}"]`).length) {
        $select.val(val);
    }
}

/**
 * Bloquea el combo cuando hay una sola sucursal asignada.
 * Devuelve el Id de sucursal forzado o null.
 */
function aplicarBloqueoSucursalUnica($select, options) {
    if (!$select || !$select.length) return null;

    options = options || {};
    const listCheck = options.sucursales || getSucursalesUsuarioSession();

    if (!usuarioTieneUnicaSucursal(listCheck)) {
        desbloquearSelectSucursal($select);
        return null;
    }

    const id = getIdSucursalDefaultUsuario(listCheck);
    if (!id) return null;

    $select.val(String(id));
    $select.prop("disabled", true).attr("aria-readonly", "true").addClass("sucursal-unica-lock");

    const $wrap = $select.next(".select2-container");
    if ($wrap.length) {
        $wrap.addClass("sucursal-unica-lock");
        $wrap.css("pointer-events", "none");
    }

    if ($select.data("select2")) {
        $select.trigger("change.select2");
    }

    if (options.triggerChange !== false) {
        $select.trigger("change");
    }

    return id;
}

function escapeRegexSucursal(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aplicarSucursalPorDefectoEnSelectores(selectores) {
    const def = getIdSucursalDefaultUsuario();
    if (!def) return;

    (selectores || []).forEach(sel => {
        const $s = $(sel);
        if (!$s.length) return;
        if (!$s.val() && $s.find(`option[value="${def}"]`).length) {
            $s.val(String(def)).trigger("change");
        }
        aplicarBloqueoSucursalUnica($s, { triggerChange: false });
    });
}

/**
 * Filtro de grilla DataTables para columna Sucursal.
 */
async function prepararFiltroSucursalDataTable($select, api, columnIndex, initSelect2Fn) {
    const datos = await fetchSucursalesPermitidas("/Sucursales/Lista");
    const unica = usuarioTieneUnicaSucursal();

    $select.empty();
    if (!unica) {
        $select.append(`<option value="">Todos</option>`);
    }

    (datos || []).forEach(item => {
        $select.append(`<option value="${item.Id}">${item.Nombre}</option>`);
    });

    if (typeof initSelect2Fn === "function") {
        initSelect2Fn($select);
    }

    const id = aplicarBloqueoSucursalUnica($select, { triggerChange: false, sucursales: datos });

    if (id != null && api != null && columnIndex != null) {
        const text = $select.find("option:selected").text();
        api.column(columnIndex)
            .search("^" + escapeRegexSucursal(text) + "$", true, false)
            .draw(false);
        return datos;
    }

    if (!unica) {
        $select.on("select2:clear", function () {
            api.column(columnIndex).search("").draw(false);
        });

        $select.on("change", function () {
            const value = $(this).val();
            if (!value) {
                api.column(columnIndex).search("").draw(false);
                return;
            }
            const text = $(this).find("option:selected").text();
            api.column(columnIndex)
                .search("^" + escapeRegexSucursal(text) + "$", true, false)
                .draw(false);
        });
    }

    return datos;
}

/* =====================================
   GRILLAS DT — selección, pointer, doble clic
   Aplica a todas las tablas .dt-dark
===================================== */

(function () {

    window.DT_FILA_SELECCION = window.DT_FILA_SELECCION || {};
    window.DT_FILA_SELECCION_TIMER = window.DT_FILA_SELECCION_TIMER || {};
    let dtSeleccionandoFila = false;

    const DT_DBLCLICK = {
        grd_Compras: (id) => {
            if (typeof window.editarCompra === "function") {
                window.editarCompra(id);
            } else {
                window.location.href = `/Compras/NuevoModif?id=${id}`;
            }
        },
        grd_Clientes: (id) => window.editarCliente?.(id),
        grd_Productos: (id) => window.editarProducto?.(id),
        grd_Proveedores: (id) => window.editarProveedor?.(id),
        grd_Usuarios: (id) => window.editarUsuario?.(id),
        grd_Caja: (id) => {
            if (typeof editarMovimiento === "function") {
                editarMovimiento(id);
            }
        }
    };

    function esClicEnControlInteractivo(e) {
        return $(e.target).closest(
            "button, a, input, select, textarea, label, .cm-prod-trigger, .select2-container, .rp-row-actions, .dt-no-row-select"
        ).length > 0;
    }

    function esFilaGrillaValida($tr) {
        if (!$tr?.length || !$tr.parent().is("tbody")) return false;
        if ($tr.hasClass("dataTables_empty") || $tr.hasClass("child")) return false;
        return true;
    }

    function claveTablaGrilla($table) {
        return $table.attr("id") || `dt_${$table.closest(".dataTables_wrapper").index()}`;
    }

    function guardarIdSeleccionGrilla($table, id, rowIdx) {
        const key = claveTablaGrilla($table);
        if (id > 0) {
            window.DT_FILA_SELECCION[key] = { id: Number(id), rowIdx: rowIdx ?? null };
        } else {
            delete window.DT_FILA_SELECCION[key];
        }
    }

    function leerSeleccionGrilla($table) {
        const key = claveTablaGrilla($table);
        const v = window.DT_FILA_SELECCION[key];
        if (!v) return null;
        if (typeof v === "number") return { id: v, rowIdx: null };
        return v;
    }

    function leerIdSeleccionGrilla($table) {
        const s = leerSeleccionGrilla($table);
        return s?.id > 0 ? Number(s.id) : null;
    }

    function obtenerIdFilaGrilla($tr) {
        const $table = $tr.closest("table.dataTable");
        if ($table.length && $.fn.dataTable) {
            try {
                const api = $table.DataTable();
                const data = api.row($tr).data();
                if (data) {
                    const id = data.Id ?? data.id ?? data.ID ?? 0;
                    if (Number(id) > 0) return Number(id);
                }
            } catch { /* sin DataTable */ }
        }

        const fromActions = $tr.find(".rp-row-actions[data-id]").first().data("id")
            ?? $tr.find("[data-id]").first().data("id");
        return Number(fromActions) || 0;
    }

    function idFilaDesdeTr($table, $tr) {
        const id = obtenerIdFilaGrilla($tr);
        if (id > 0) return id;
        const fromDom = Number($tr.find(".rp-row-actions[data-id]").first().data("id") ?? 0);
        return fromDom > 0 ? fromDom : 0;
    }

    function marcarTrSeleccionada($tr, activo) {
        if (!$tr?.length) return;
        if (activo) {
            $tr.addClass("dt-row-selected").attr("data-dt-selected", "1");
        } else {
            $tr.removeClass("dt-row-selected").removeAttr("data-dt-selected");
        }
    }

    function limpiarSeleccionVisualGrilla($table) {
        if (!$table.length) return;
        $table.find("tbody tr.dt-row-selected")
            .removeClass("dt-row-selected")
            .removeAttr("data-dt-selected");
    }

    function aplicarSeleccionVisualGrilla($table, sel) {
        if (!$table.length) return;

        const selId = sel?.id ?? (typeof sel === "number" ? sel : null);
        const selIdx = sel?.rowIdx ?? null;

        limpiarSeleccionVisualGrilla($table);
        if (!selId) return;

        let marcada = false;

        if ($.fn.dataTable) {
            try {
                const api = $table.DataTable();
                if (selIdx !== null && selIdx >= 0) {
                    const row = api.row(selIdx);
                    const node = row.length ? row.node() : null;
                    if (node) {
                        marcarTrSeleccionada($(node), true);
                        marcada = true;
                    }
                }
                if (!marcada) {
                    api.rows({ page: "current" }).every(function () {
                        const data = this.data();
                        const rid = Number(data?.Id ?? data?.id ?? data?.ID ?? 0);
                        if (rid === selId) {
                            marcarTrSeleccionada($(this.node()), true);
                            marcada = true;
                        }
                    });
                }
            } catch { /* sin DataTable */ }
        }

        if (!marcada) {
            $table.find("tbody tr").each(function () {
                const $tr = $(this);
                if ($tr.hasClass("dataTables_empty") || $tr.hasClass("child")) return;
                if (idFilaDesdeTr($table, $tr) === selId) {
                    marcarTrSeleccionada($tr, true);
                }
            });
        }
    }

    function programarRestaurarSeleccionGrilla($table) {
        const key = claveTablaGrilla($table);
        clearTimeout(window.DT_FILA_SELECCION_TIMER[key]);
        window.DT_FILA_SELECCION_TIMER[key] = setTimeout(() => {
            if (dtSeleccionandoFila) return;
            const sel = leerSeleccionGrilla($table);
            aplicarSeleccionVisualGrilla($table, sel);
        }, 10);
    }

    function seleccionarFilaGrilla($tr) {
        const $table = $tr.closest("table.dt-dark");
        if (!$table.length) return;

        const id = obtenerIdFilaGrilla($tr) || idFilaDesdeTr($table, $tr);
        if (id <= 0) return;

        let rowIdx = null;
        try {
            rowIdx = $table.DataTable().row($tr).index();
        } catch { /* sin api */ }

        const actual = leerIdSeleccionGrilla($table);

        dtSeleccionandoFila = true;

        if (actual === id) {
            guardarIdSeleccionGrilla($table, 0, null);
            limpiarSeleccionVisualGrilla($table);
        } else {
            guardarIdSeleccionGrilla($table, id, rowIdx);
            marcarTrSeleccionada($tr, true);
            aplicarSeleccionVisualGrilla($table, { id, rowIdx });
        }

        setTimeout(() => { dtSeleccionandoFila = false; }, 80);
    }

    function restaurarSeleccionGrilla($table) {
        if (dtSeleccionandoFila) return;
        programarRestaurarSeleccionGrilla($table);
    }

    function enlazarDrawSeleccionGrilla($table) {
        if (!$table?.length) return;
        $table.off("draw.dt.internalRowSelect");
        $table.on("draw.dt.internalRowSelect", function () {
            programarRestaurarSeleccionGrilla($(this));
        });
    }

    function patchDataTableDrawCallbackSeleccion() {
        if (!$.fn.dataTable || $.fn.dataTable.defaults._dtRowSelectPatched) return;

        const prev = $.fn.dataTable.defaults.drawCallback;
        $.fn.dataTable.defaults.drawCallback = function (settings) {
            if (typeof prev === "function") {
                prev.call(this, settings);
            }
            const $table = $(settings.nTable);
            if ($table.hasClass("dt-dark")) {
                programarRestaurarSeleccionGrilla($table);
            }
        };
        $.fn.dataTable.defaults._dtRowSelectPatched = true;
    }

    function ejecutarDobleClickFila($tr) {
        const id = obtenerIdFilaGrilla($tr);
        if (id <= 0) return;

        const $table = $tr.closest("table.dt-dark");
        const tableId = $table.attr("id") || "";

        const urlTpl = $table.data("dtDblclickUrl");
        if (urlTpl) {
            window.location.href = String(urlTpl).replace("{id}", id);
            return;
        }

        const handler = DT_DBLCLICK[tableId];
        if (typeof handler === "function") {
            handler(id);
        }
    }

    function initGrillaInteraccionGlobal() {
        patchDataTableDrawCallbackSeleccion();

        $("table.dt-dark").each(function () {
            enlazarDrawSeleccionGrilla($(this));
        });

        $(document)
            .off("init.dt.dtRowSelect")
            .on("init.dt.dtRowSelect", "table.dt-dark", function () {
                const $t = $(this);
                enlazarDrawSeleccionGrilla($t);
                restaurarSeleccionGrilla($t);
            });

        $(document)
            .off("click.dtRowSelect")
            .on("click.dtRowSelect", "table.dt-dark tbody tr", function (e) {
                if (esClicEnControlInteractivo(e)) return;

                const $tr = $(this);
                if (!esFilaGrillaValida($tr)) return;

                seleccionarFilaGrilla($tr);
            });

        $(document)
            .off("dblclick.dtRowNav")
            .on("dblclick.dtRowNav", "table.dt-dark tbody tr", function (e) {
                if (esClicEnControlInteractivo(e)) return;

                const $tr = $(this);
                if (!esFilaGrillaValida($tr)) return;

                ejecutarDobleClickFila($tr);
            });
    }

    window.registrarGrillaDobleClick = function (tableId, fn) {
        if (tableId && typeof fn === "function") {
            DT_DBLCLICK[tableId] = fn;
        }
    };

    $(document).ready(initGrillaInteraccionGlobal);

})();