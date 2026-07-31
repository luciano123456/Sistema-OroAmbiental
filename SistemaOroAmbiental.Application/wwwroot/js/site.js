function obtenerTokenJwt() {
    return localStorage.getItem("JwtToken");
}

const token = obtenerTokenJwt();
window.token = token;
window.obtenerTokenJwt = obtenerTokenJwt;

const TEXTOS_MODAL = {
    confirmacionTitulo: "Confirmaci\u00F3n",
    confirmacionBtn: "S\u00ED, continuar"
};

function aplicarTextosModalesEstaticos() {
    const tituloConfirmar = document.getElementById("modalConfirmarLabel");
    const btnConfirmar = document.getElementById("btnModalConfirmarAceptar");
    if (tituloConfirmar) tituloConfirmar.textContent = TEXTOS_MODAL.confirmacionTitulo;
    if (btnConfirmar) btnConfirmar.textContent = TEXTOS_MODAL.confirmacionBtn;
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        aplicarTextosModalesEstaticos();
        ensureRpToastStack();
    });
} else {
    aplicarTextosModalesEstaticos();
    ensureRpToastStack();
}

const RP_MODALES_FEEDBACK = new Set(["modalConfirmar"]);
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
 * Tras cerrar exito/error/confirmacion encima de otro modal, Bootstrap a veces deja
 * backdrops de mas o body.modal-open mal - la pantalla queda oscura sin motivo.
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

function rpElevarModalFeedback(modalEl) {
    if (!modalEl) return;
    const z = rpZIndexFeedback(modalEl);
    modalEl.style.setProperty("z-index", String(z), "important");
    rpElevarBackdropModal(z);
}

/** Apila modales de edicion; los de feedback quedan siempre encima. */
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


// Formatear el numero de manera correcta
function formatNumber(number) {
    if (typeof number !== 'number' || isNaN(number)) {
        return "$ 0,00";
    }

    const parts = number.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return "$ " + parts.join(",");
}

const RP_TOAST_DEFAULT_MS = {
    success: 4500,
    error: 7000,
    warning: 6000,
    info: 4800
};

function escapeHtmlRpToast(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function rpToastMeta(tipo) {
    switch (tipo) {
        case "success":
            return { icon: "fa-check", title: "Listo" };
        case "error":
            return { icon: "fa-times", title: "Ups" };
        case "warning":
            return { icon: "fa-exclamation", title: "Atencion" };
        default:
            return { icon: "fa-info", title: "Aviso" };
    }
}

function ensureRpToastStack() {
    let stack = document.getElementById("rpToastStack");
    if (stack) return stack;

    stack = document.createElement("div");
    stack.id = "rpToastStack";
    stack.className = "rp-toast-stack";
    stack.setAttribute("aria-live", "polite");
    stack.setAttribute("aria-atomic", "false");
    document.body.appendChild(stack);
    return stack;
}

function showToast(texto, tipo = "success", duracionMs) {
    const mensaje = String(texto ?? "").trim();
    if (!mensaje) return;

    const tipoNorm = ["success", "error", "warning", "info"].includes(tipo) ? tipo : "info";
    const ms = duracionMs ?? RP_TOAST_DEFAULT_MS[tipoNorm] ?? 4500;
    const meta = rpToastMeta(tipoNorm);
    const stack = ensureRpToastStack();

    const toast = document.createElement("article");
    toast.className = `rp-toast rp-toast--${tipoNorm}`;
    toast.setAttribute("role", "status");
    toast.innerHTML = `
        <div class="rp-toast-glow" aria-hidden="true"></div>
        <div class="rp-toast-panel">
            <div class="rp-toast-icon-wrap" aria-hidden="true">
                <span class="rp-toast-icon-ring"></span>
                <i class="fa ${meta.icon}"></i>
            </div>
            <div class="rp-toast-body">
                <span class="rp-toast-label">${meta.title}</span>
                <p class="rp-toast-msg">${escapeHtmlRpToast(mensaje)}</p>
            </div>
            <button type="button" class="rp-toast-close" aria-label="Cerrar">
                <i class="fa fa-times"></i>
            </button>
        </div>
        <div class="rp-toast-progress" aria-hidden="true"><span style="--rp-toast-ms:${ms}ms"></span></div>
    `;

    let hideTimer = null;
    let remaining = ms;
    let hideAt = 0;

    const cerrar = () => {
        if (!toast.isConnected) return;
        toast.classList.remove("is-visible");
        toast.classList.add("is-leaving");
        window.setTimeout(() => toast.remove(), 360);
    };

    const scheduleHide = (delay) => {
        if (hideTimer) window.clearTimeout(hideTimer);
        hideAt = Date.now() + delay;
        hideTimer = window.setTimeout(cerrar, delay);
    };

    toast.querySelector(".rp-toast-close")?.addEventListener("click", () => {
        if (hideTimer) window.clearTimeout(hideTimer);
        cerrar();
    });

    toast.addEventListener("mouseenter", () => {
        if (!hideTimer) return;
        window.clearTimeout(hideTimer);
        hideTimer = null;
        remaining = Math.max(hideAt - Date.now(), 1200);
        toast.classList.add("is-paused");
    });

    toast.addEventListener("mouseleave", () => {
        toast.classList.remove("is-paused");
        scheduleHide(remaining);
    });

    stack.appendChild(toast);

    while (stack.children.length > 5) {
        stack.firstElementChild?.remove();
    }

    requestAnimationFrame(() => {
        toast.classList.add("is-visible");
        scheduleHide(ms);
    });
}

window.showToast = showToast;

/* =========================================================
   Busy lock (anti doble-submit) — estilo Mercado Pago
   Uso:
     await withBusy(btn, async () => { ... });
     await withBusy('#btnGuardar', async () => { ... });
     $("#btnX").on("click", busyHandler(fn));
     onclick="withBusy(this, () => guardarX())"
========================================================= */

function resolveBusyEl(btn) {
    if (!btn) return null;
    if (typeof btn === "string") {
        try { return document.querySelector(btn); } catch { return null; }
    }
    if (btn.jquery) return btn[0] || null;
    if (btn instanceof Element) return btn;
    return null;
}

function isBusy(btn) {
    const el = resolveBusyEl(btn);
    return !!(el && el.dataset.busyActive === "1");
}

function setBusyButton(btn, loading, opts = {}) {
    const el = resolveBusyEl(btn);
    if (!el) return;

    if (loading) {
        if (el.dataset.busyActive === "1") return;
        el.dataset.busyActive = "1";
        el.dataset.busyPrevDisabled = el.disabled ? "1" : "0";
        el.dataset.busyPrevHtml = el.innerHTML;
        el.disabled = true;
        el.setAttribute("aria-busy", "true");
        el.classList.add("is-busy");
        if (opts.loadingHtml !== false) {
            const label = opts.label || "Guardando...";
            el.innerHTML = opts.loadingHtml
                || `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>${label}`;
        }
        return;
    }

    if (el.dataset.busyActive !== "1") return;
    el.dataset.busyActive = "0";
    el.disabled = el.dataset.busyPrevDisabled === "1";
    el.removeAttribute("aria-busy");
    el.classList.remove("is-busy");
    if (el.dataset.busyPrevHtml != null) {
        el.innerHTML = el.dataset.busyPrevHtml;
    }
    delete el.dataset.busyPrevDisabled;
    delete el.dataset.busyPrevHtml;
}

/**
 * Bloquea el boton hasta que termine la promesa. Si ya esta ocupado, no vuelve a ejecutar.
 * @returns {Promise<*>} resultado de fn, o undefined si se ignoro por busy
 */
async function withBusy(btn, fn, opts = {}) {
    if (typeof fn !== "function") return;

    const el = resolveBusyEl(btn);
    if (el && el.dataset.busyActive === "1") return;

    setBusyButton(el, true, opts);
    try {
        return await fn();
    } finally {
        setBusyButton(el, false);
    }
}

/** Handler de click que aplica withBusy sobre e.currentTarget / this */
function busyHandler(fn, opts = {}) {
    return async function (e) {
        const btn = opts.button
            || (e && e.currentTarget instanceof Element ? e.currentTarget : null)
            || (this instanceof Element ? this : null);
        return withBusy(btn, () => fn.call(this, e), opts);
    };
}

window.resolveBusyEl = resolveBusyEl;
window.isBusy = isBusy;
window.setBusyButton = setBusyButton;
window.withBusy = withBusy;
window.busyHandler = busyHandler;

/** Clase CSS para saldo/total: + verde, - rojo, 0 amarillo */
function clsSaldoMoney(n) {
    const v = Number(n || 0);
    if (v > 0) return "rp-money-pos";
    if (v < 0) return "rp-money-neg";
    return "rp-money-zero";
}
window.clsSaldoMoney = clsSaldoMoney;

/**
 * Saldos de cliente donde + = debe (rojo), - = a favor (verde), 0 = amarillo.
 * Control de pagos, CC y hoja de ruta.
 */
function clsSaldoDeudaMoney(n) {
    const v = Number(n || 0);
    if (v > 0) return "rp-money-neg";
    if (v < 0) return "rp-money-pos";
    return "rp-money-zero";
}
window.clsSaldoDeudaMoney = clsSaldoDeudaMoney;

// Seguridad global: si el boton ya esta busy, bloquear clicks adicionales (capture).
if (!window._rpBusyClickGuard) {
    window._rpBusyClickGuard = true;
    document.addEventListener("click", function (e) {
        const btn = e.target?.closest?.("button, input[type='submit'], a.btn");
        if (!btn || btn.dataset.busyActive !== "1") return;
        e.preventDefault();
        e.stopImmediatePropagation();
    }, true);
}

/** @deprecated Usar showToast - alias global para compatibilidad */
function exitoModal(texto) {
    showToast(texto || "Guardado correctamente.", "success");
}

/** @deprecated Usar showToast - alias global para compatibilidad */
function errorModal(texto) {
    showToast(texto || "No se pudo completar la operacion.", "error");
}

/** @deprecated Usar showToast - alias global para compatibilidad */
function advertenciaModal(texto) {
    showToast(texto || "Revise los datos ingresados.", "warning");
}

window.okModal = exitoModal;
window.exitoModal = exitoModal;
window.errorModal = errorModal;
window.advertenciaModal = advertenciaModal;

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
 * Modal generico post-guardado: muestra exito y pregunta si volver al listado.
 * @param {object} opciones
 * @param {string} [opciones.titulo]
 * @param {string} [opciones.mensaje]
 * @param {string} [opciones.pregunta]
 * @param {string} [opciones.btnSalir]
 * @param {string} [opciones.btnQuedarse]
 * @param {string} [opciones.urlSalida] - Si se indica, navega al confirmar salida.
 * @param {string} [opciones.icono] - Clase FontAwesome (ej. fa-check-circle).
 * @returns {Promise<{salir: boolean}>}
 */
function modalGuardadoConSalida(opciones = {}) {
    return new Promise((resolve) => {
        const modalEl = document.getElementById("modalGuardadoConSalida");
        if (!modalEl) {
            resolve({ salir: false });
            return;
        }

        const cfg = Object.assign({
            titulo: "Guardado correctamente",
            mensaje: "Los cambios se guardaron correctamente.",
            pregunta: "Deseas volver al listado?",
            btnSalir: "Si, volver al listado",
            btnQuedarse: "No, seguir aca",
            urlSalida: null,
            icono: "fa-check-circle"
        }, opciones || {});

        const tituloEl = document.getElementById("modalGuardadoConSalidaTitulo");
        const mensajeEl = document.getElementById("modalGuardadoConSalidaMensaje");
        const preguntaEl = document.getElementById("modalGuardadoConSalidaPregunta");
        const iconEl = document.getElementById("modalGuardadoConSalidaIcon");
        const btnSalir = document.getElementById("btnGuardadoSalir");
        const btnQuedarse = document.getElementById("btnGuardadoQuedarse");

        if (tituloEl) tituloEl.textContent = cfg.titulo;
        if (mensajeEl) mensajeEl.textContent = cfg.mensaje;
        if (preguntaEl) preguntaEl.textContent = cfg.pregunta;
        if (iconEl) iconEl.className = `fa ${cfg.icono}`;

        if (btnSalir) {
            btnSalir.innerHTML = `<i class="fa fa-arrow-left"></i><span>${cfg.btnSalir}</span>`;
        }
        if (btnQuedarse) {
            btnQuedarse.innerHTML = `<i class="fa fa-pencil"></i><span>${cfg.btnQuedarse}</span>`;
        }

        let resuelto = false;

        const finalizar = (salir) => {
            if (resuelto) return;
            resuelto = true;
            resolve({ salir: !!salir });
        };

        const ocultarModal = () => {
            if (window.bootstrap?.Modal) {
                const inst = bootstrap.Modal.getInstance(modalEl);
                if (inst) inst.hide();
            } else if (window.jQuery) {
                window.jQuery(modalEl).modal("hide");
            }
        };

        const onSalir = () => {
            finalizar(true);
            ocultarModal();
            if (cfg.urlSalida) {
                window.location.href = cfg.urlSalida;
            }
        };

        const onQuedarse = () => {
            finalizar(false);
            ocultarModal();
        };

        if (btnSalir) {
            btnSalir.onclick = onSalir;
        }
        if (btnQuedarse) {
            btnQuedarse.onclick = onQuedarse;
        }

        modalEl.addEventListener("hidden.bs.modal", () => {
            if (!resuelto) finalizar(false);
        }, { once: true });

        if (typeof rpElevarModalFeedback === "function") {
            rpElevarModalFeedback(modalEl);
        }

        if (window.bootstrap?.Modal) {
            const inst = bootstrap.Modal.getOrCreateInstance(modalEl, {
                backdrop: "static",
                keyboard: false
            });
            inst.show();
        } else if (window.jQuery) {
            window.jQuery(modalEl).modal({ backdrop: "static", keyboard: false });
            window.jQuery(modalEl).modal("show");
        }
    });
}

/**
 * Flujo de eliminacion con listado de dependencias.
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
                    <strong>${cant}</strong> - ${etiqueta}
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
            `¿Confirma eliminar ${entidadLabel} y TODOS los registros asociados listados? Esta accion no se puede deshacer.`)
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
    currency: 'ARS', // Cambia "ARS" por el codigo de moneda que necesites
    minimumFractionDigits: 2
});

function convertirMonedaAFloat(moneda) {
    // Eliminar el simbolo de la moneda y otros caracteres no numericos
    const soloNumeros = moneda.replace(/[^0-9,.-]/g, '');

    // Eliminar separadores de miles y convertir la coma en punto
    const numeroFormateado = soloNumeros.replace(/\./g, '').replace(',', '.');

    // Convertir a flotante
    const numero = parseFloat(numeroFormateado);

    // Devolver el numero formateado como cadena, asegurando los decimales
    return numero.toFixed(2); // Asegura siempre dos decimales en la salida
}
function convertirAMonedaDecimal(valor) {
    // Reemplazar coma por punto
    if (typeof valor === 'string') {
        valor = valor.replace(',', '.'); // Cambiar la coma por el punto
    }
    // Convertir a numero flotante
    return parseFloat(valor);
}

function formatoNumero(valor) {
    // Reemplaza la coma por punto y elimina otros caracteres no numericos (como $)
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

    // Agregar el simbolo $ al inicio
    return `$ ${formateado}`;
}


function toggleAcciones(id) {
    const dropdown = document.querySelector(`.acciones-menu[data-id='${id}'] .acciones-dropdown`);
    const isVisible = dropdown.style.display === 'block';

    // Oculta todos los demas menus desplegables
    document.querySelectorAll('.acciones-dropdown').forEach(el => el.style.display = 'none');

    if (!isVisible) {
        // Muestra el menu
        dropdown.style.display = 'block';

        // Obten las coordenadas del boton
        const menuButton = document.querySelector(`.acciones-menu[data-id='${id}']`);
        const rect = menuButton.getBoundingClientRect();

        // Mueve el menu al body y ajusta su posicion
        const dropdownClone = dropdown.cloneNode(true);
        dropdownClone.style.position = 'fixed';
        dropdownClone.style.left = `${rect.left}px`;
        dropdownClone.style.top = `${rect.bottom}px`;
        dropdownClone.style.zIndex = '10000';
        dropdownClone.style.display = 'block';

        // Limpia menus previos si es necesario
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

    // permitir solo numeros, coma y punto
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
    // solo puntos multiples → miles
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

    // Ocultar boton guardar/registrar
    $("#btnGuardar").toggleClass("d-none", esSoloLectura);

    // Opcional: por si tenes otro boton en el footer
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

    // Evitar que se “pinten” validaciones mientras esta solo lectura
    $modal.attr("data-sololectura", esSoloLectura ? "1" : "0");
}



/* =====================================
GS-UI - Render Acciones Grid GLOBAL
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

/** Definicion de anchos fijos para Id + acciones (evita desalineado con scrollX). */
function columnDefsGridLista() {
    return [
        { targets: 0, className: "rp-col-acciones", width: "118px", orderable: false },
        { targets: 1, className: "rp-col-id", width: "92px" }
    ];
}

/** Crea fila de filtros alineada con las columnas del DataTable (llamar en initComplete). */
function inicializarFilaFiltrosGrilla(api, tableSelector) {
    sincronizarFilaFiltrosScrollHeadGrilla(api, tableSelector);
}

/** Con scrollX, asegura fila de filtros en thead principal y scroll head. */
function sincronizarFilaFiltrosScrollHeadGrilla(api, tableSelector) {
    const $table = $(tableSelector);
    if (!$table.length) return;

    const colCount = api.columns().count();
    const $wrapper = $table.closest(".dataTables_wrapper");
    const $scrollThead = $wrapper.find(".dataTables_scrollHeadInner table thead");

    const ensureRow = ($thead) => {
        if (!$thead.length) return null;
        const $headerRow = $thead.find("tr").first();
        $thead.find("tr.filters").remove();
        const $row = $('<tr class="filters"></tr>');
        for (let i = 0; i < colCount; i++) {
            const $headerCell = $headerRow.find("th").eq(i);
            const cls = ($headerCell.attr("class") || "").trim();
            let extra = "";
            if (i === 0) extra = "rp-col-acciones-h";
            else if (i === 1) extra = "rp-col-id-h";
            $row.append($("<th></th>").addClass([cls, extra].filter(Boolean).join(" ")));
        }
        $thead.append($row);
        return $row;
    };

    ensureRow($table.find("thead"));
    if ($scrollThead.length) ensureRow($scrollThead);
}

/** Todas las celdas de filtro (scroll head + thead principal). */
function celdasFiltroGrillaTodas(tableSelector) {
    if (!tableSelector) return $();

    const $table = $(tableSelector);
    const $wrapper = $table.closest(".dataTables_wrapper");
    const $scroll = $wrapper.find(".dataTables_scrollHeadInner table thead tr.filters th");
    const $main = $table.find("thead tr.filters th");

    if ($scroll.length && $main.length) return $scroll.add($main);
    if ($scroll.length) return $scroll;
    return $main;
}

/** Monta el control en la fila de filtros visible (scroll head con scrollX). */
async function montarControlFiltroTheadGrilla(tableSelector, colIndex, buildControl) {
    const $cells = celdasFiltroGrilla(tableSelector);
    const $cell = $cells.eq(colIndex);
    if (!$cell.length) return null;

    $cell.empty();
    const $control = await buildControl(false);
    if ($control) $cell.append($control);
    return $control;
}

/** Indica si una celda de filtro no tiene control montado. */
function celdaFiltroGrillaTieneControl($cell) {
    if (!$cell?.length) return false;
    return $cell.find("input, select, .select2-container, .rp-filter-activo-toggle, .rp-filter-activo-chips, .rp-filter-segment, .rp-filter-thead-spacer").length > 0;
}

/** Detecta columnas sin filtro en thead (p. ej. tras draw() con scrollX). */
function theadFiltrosGrillaIncompleto(tableSelector, api, configs, opts = {}) {
    const $cells = celdasFiltroGrilla(tableSelector);
    if (!$cells.length) return true;

    const idxActivo = typeof indiceColumnaActivoGrilla === "function" ? indiceColumnaActivoGrilla(api) : null;

    for (const config of configs || []) {
        if (config.index === 0 || config.index === 1) continue;
        if (opts.maxColumnIndex !== null && config.index > opts.maxColumnIndex) continue;

        const $cell = $cells.eq(config.index);
        if (!celdaFiltroGrillaTieneControl($cell)) return true;
    }

    if (idxActivo !== undefined && idxActivo !== null && opts.includeActivo !== false) {
        const $cell = $cells.eq(idxActivo);
        if (!celdaFiltroGrillaTieneControl($cell)) return true;
    }

    return false;
}

/** Devuelve las celdas de filtro visibles de una grilla. */
function celdasFiltroGrilla(tableSelector) {
    if (!tableSelector) return $("thead tr.filters th");

    const $table = $(tableSelector);
    const $wrapper = $table.closest(".dataTables_wrapper");
    const $scrollHeadCells = $wrapper.find(".dataTables_scrollHeadInner table thead tr.filters th");

    if ($scrollHeadCells.length) return $scrollHeadCells;
    return $(`${tableSelector} thead tr.filters th`);
}

/** Primera columna de grillas: muestra el Id numerico. */
function columnaGridId() {
    return {
        data: "Id",
        name: "grid_id",
        title: "Id",
        width: "92px",
        className: "text-center rp-col-id",
        orderable: true,
        searchable: true,
        render: function (data, type) {
            if (data === null || data === undefined || data === "") return "";
            if (type === "sort" || type === "filter" || type === "type") return data;
            if (type === "export" || type === "print") return data;
            return `<span class="rp-grid-id" title="ID ${data}"><span class="rp-grid-id-hash">#</span>${data}</span>`;
        }
    };
}

/** Segunda columna: botones de accion (mismo campo Id, solo render visual). */
function columnaGridAcciones(acciones, modulo, renderCustom) {
    return {
        data: "Id",
        name: "grid_acciones",
        title: "",
        width: "118px",
        className: "text-center rp-col-acciones",
        orderable: false,
        searchable: false,
        render: function (data, type, row) {
            if (type === "sort" || type === "filter" || type === "type") return "";
            if (type === "export" || type === "print") return "";

            const id = row?.Id ?? row?.id ?? data;
            if (typeof renderCustom === "function") {
                return renderCustom(id, type, row);
            }
            if (acciones) {
                return renderAccionesGrid(id, acciones, modulo);
            }
            return "";
        }
    };
}

/** Indica si la columna puede mostrarse en el menu "Config. columnas". */
function esColumnaMenuGrilla(col) {
    if (!col) return false;
    if (col.name === "grid_id" || col.name === "grid_acciones") return false;
    if (String(col.className || "").includes("rp-col-acciones")) return false;
    if (col.data === "Id") return false;
    return !!col.data;
}

/** Vacia acciones (indice 0) y crea filtro de Id (indice 1). */
async function finalizarFiltrosGridLista(api, tableSelector) {
    await montarControlFiltroTheadGrilla(tableSelector, 0, async () => $("<span class='rp-filter-thead-spacer'></span>"));

    await montarControlFiltroTheadGrilla(tableSelector, 1, async () => {
        const $input = $(`<input type="text" class="rp-filter-input rp-filter-thead rp-filter-id" placeholder="Id..." autocomplete="off">`);
        $input.on("keyup change", function () {
            api.column(1).search(this.value.trim()).draw(false);
        });
        return $input;
    });

    ajustarColumnasGrillaLista(api, tableSelector);
}

const RP_URL_CAMBIAR_ACTIVO = {
    Clientes: "/Clientes/CambiarActivo",
    Productos: "/Productos/CambiarActivo",
    Proveedores: "/Proveedores/CambiarActivo",
    Camiones: "/Camiones/CambiarActivo"
};

/** Ultima columna: switch activo/inactivo en grillas maestras. */
function columnaGridActivo(modulo) {
    return {
        data: "Activo",
        name: "grid_activo",
        title: "Activo",
        className: "text-center rp-col-activo",
        orderable: true,
        searchable: false,
        render: function (data, type, row) {
            if (type === "sort" || type === "filter" || type === "type") {
                return data === false || data === 0 ? 0 : 1;
            }
            if (type === "export" || type === "print") {
                return data === false || data === 0 ? "No" : "Si";
            }
            const checked = data !== false && data !== 0;
            const id = row?.Id ?? row?.id ?? 0;
            return `<label class="rp-switch rp-switch-grid dt-no-row-select" title="${checked ? "Activo" : "Inactivo"}">
                <input type="checkbox" class="rp-switch-input rp-grid-activo-toggle" data-modulo="${modulo}" data-id="${id}" ${checked ? "checked" : ""}>
                <span class="rp-switch-slider"></span>
            </label>`;
        }
    };
}

function esFilaActivaGrilla(data) {
    return data && data.Activo !== false && data.Activo !== 0;
}

function createdRowEstiloActivoGrilla(row, data) {
    const $tr = $(row);
    if (!esFilaActivaGrilla(data)) {
        $tr.addClass("dt-row-inactivo");
    } else {
        $tr.removeClass("dt-row-inactivo");
    }
}

function crearFiltroActivoDataTable(tableSelector, initialModo = "activos") {
    const tableId = $(tableSelector).attr("id") || tableSelector;
    const state = { modo: initialModo || "activos" };

    const fn = function (settings, data, dataIndex) {
        const api = new $.fn.dataTable.Api(settings);
        const nodeId = $(api.table().node()).attr("id");
        if (nodeId !== tableId) return true;

        const row = api.row(dataIndex).data();
        if (!row || typeof row.Activo === "undefined") return true;

        const activo = esFilaActivaGrilla(row);
        if (state.modo === "activos") return activo;
        if (state.modo === "inactivos") return !activo;
        return true;
    };

    $.fn.dataTable.ext.search.push(fn);

    return {
        setModo(modo) {
            state.modo = modo || "activos";
        },
        destroy() {
            const idx = $.fn.dataTable.ext.search.indexOf(fn);
            if (idx >= 0) $.fn.dataTable.ext.search.splice(idx, 1);
        }
    };
}

function crearControlFiltroActivoUI(modoInicial, onChange, options = {}) {
    const modo = modoInicial || "activos";
    const compact = options.compact !== false;
    const wrapClass = compact
        ? "rp-filter-activo-toggle rp-filter-thead"
        : "rp-filter-activo-toggle rp-filter-activo-toggle-panel";
    const $wrap = $(`<div class="${wrapClass}" role="group" aria-label="Filtrar activos" data-modo="${modo}" data-default-modo="${modo}"></div>`);
    $wrap.append('<span class="rp-filter-activo-glider" aria-hidden="true"></span>');

    const items = [
        { modo: "activos", label: "Si", title: "Solo activos", icon: "fa-check-circle" },
        { modo: "inactivos", label: "No", title: "Solo inactivos", icon: "fa-times-circle" },
        { modo: "todos", label: "Todos", title: "Ver todos", icon: "fa-circle-thin" }
    ];

    items.forEach(it => {
        const active = it.modo === modo ? " is-active" : "";
        $wrap.append(
            `<button type="button" class="rp-filter-activo-opt${active}" data-modo="${it.modo}" title="${it.title}" aria-pressed="${it.modo === modo}">
                <i class="fa ${it.icon}" aria-hidden="true"></i>
                <span>${it.label}</span>
            </button>`
        );
    });

    $wrap.data("modo", modo);

    $wrap.on("click", ".rp-filter-activo-opt, .rp-filter-segment-btn, .rp-filter-activo-chip", function () {
        const m = $(this).data("modo");
        setModoFiltroActivoUI($wrap, m);
        if (typeof onChange === "function") onChange(m);
    });

    return $wrap;
}

function getModoFiltroActivoUI($wrap) {
    return $wrap?.data("modo") || $wrap?.data("defaultModo") || "activos";
}

function setModoFiltroActivoUI($wrap, modo) {
    if (!$wrap?.length) return;
    const m = modo || "activos";
    $wrap.data("modo", m).attr("data-modo", m);
    $wrap.find(".rp-filter-activo-opt, .rp-filter-activo-chip, .rp-filter-segment-btn").each(function () {
        const on = $(this).data("modo") === m;
        $(this).toggleClass("is-active", on).attr("aria-pressed", on ? "true" : "false");
    });
}

function inicializarFiltroActivoGrilla(api, tableSelector, colIndex, defaultModo = "activos") {
    const modo = defaultModo || "activos";
    let filtro = $(tableSelector).data("rpFiltroActivo");
    if (!filtro) {
        filtro = crearFiltroActivoDataTable(tableSelector, modo);
        $(tableSelector).data("rpFiltroActivo", filtro);
    } else if (filtro.setModo) {
        filtro.setModo(modo);
    }

    return montarControlFiltroTheadGrilla(tableSelector, colIndex, async () =>
        crearControlFiltroActivoUI(modo, (m) => {
            filtro.setModo(m);
            api.draw(false);
        })
    ).then(() => {
        if (modo !== "activos") api.draw(false);
    });
}

function indiceColumnaActivoGrilla(api) {
    return api.columns().indexes().toArray().find(i => {
        const col = api.settings()[0].aoColumns[i];
        return col && (col.name === "grid_activo" || col.sName === "grid_activo");
    });
}

/* =========================================================
   Panel de filtros plegable - todas las grillas grd_*
========================================================= */

window.RP_GRID_FILTER_REGISTRY = window.RP_GRID_FILTER_REGISTRY || {};

function escapeRegexGrilla(text) {
    return String(text ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function registrarFiltrosGrilla(tableId, columnConfig, options = {}) {
    if (!tableId) return;
    const opts = Object.assign({
        usarFilaColumnas: true,
        panelSoloGlobal: true,
        panelExpanded: false,
        autoColumnas: true
    }, options || {});
    RP_GRID_FILTER_REGISTRY[tableId] = { columnConfig: columnConfig || [], options: opts };
}

function initPanelFiltrosPersistido(panelId, collapseId) {
    const key = `rpFiltrosCollapse_${panelId || collapseId}`;
    const $collapse = collapseId ? $(`#${collapseId}`) : null;
    if (!$collapse?.length) return;

    const saved = localStorage.getItem(key);
    if (saved === "true") {
        $collapse.addClass("show");
        $(`[data-bs-target="#${collapseId}"]`).attr("aria-expanded", "true");
    } else if (saved === "false") {
        $collapse.removeClass("show");
        $(`[data-bs-target="#${collapseId}"]`).attr("aria-expanded", "false");
    }

    $collapse.off("shown.bs.collapse.rpFiltros hidden.bs.collapse.rpFiltros")
        .on("shown.bs.collapse.rpFiltros", () => localStorage.setItem(key, "true"))
        .on("hidden.bs.collapse.rpFiltros", () => localStorage.setItem(key, "false"));
}

function tituloColumnaGrilla(api, tableSelector, colIndex) {
    const $table = $(tableSelector);
    const title = $table.find("thead tr").first().find("th").eq(colIndex).text().trim();
    if (title) return title;
    const col = api.settings()[0].aoColumns[colIndex];
    return col?.sTitle || col?.title || `Columna ${colIndex}`;
}

/** Completa columnConfig con filtros de texto en columnas buscables no configuradas. */
function expandirColumnConfigGrilla(api, columnConfig) {
    const configs = [...(columnConfig || [])];
    const configured = new Set(configs.map(c => c.index));
    const idxActivo = typeof indiceColumnaActivoGrilla === "function" ? indiceColumnaActivoGrilla(api) : null;

    api.columns().every(function (i) {
        if (i === 0 || i === 1 || configured.has(i)) return;

        if (i === idxActivo) {
            configs.push({ index: i, filterType: "activo" });
            return;
        }

        const col = api.settings()[0].aoColumns[i];
        if (!col || col.bSearchable === false) return;

        configs.push({ index: i, filterType: "text" });
    });

    return configs.sort((a, b) => a.index - b.index);
}

function limpiarFiltrosTheadGrilla(tableSelector, api) {
    celdasFiltroGrillaTodas(tableSelector).find("input").val("");
    celdasFiltroGrillaTodas(tableSelector).find(".rp-filter-activo-toggle, .rp-filter-activo-chips, .rp-filter-segment").each(function () {
        const $el = $(this);
        const def = $el.data("defaultModo") || "activos";
        setModoFiltroActivoUI($el, def);
        const filtro = $(tableSelector).data("rpFiltroActivo");
        if (filtro?.setModo) filtro.setModo(def);
    });
    celdasFiltroGrillaTodas(tableSelector).find("select").each(function () {
        const $el = $(this);
        $el.val("");
        triggerClearFiltroSelectGrilla($el);
    });
    if (api?.search) api.search("").columns().search("");
    if (api?.draw) api.draw(false);
}

function poblarOpcionesSelectLocalGrilla(api, colIndex, $select, placeholder) {
    $select.empty();
    $select.append(`<option value="">${placeholder}...</option>`);
    const uniques = new Set();
    api.column(colIndex).data().each(v => {
        const txt = (v ?? "").toString().trim();
        if (txt) uniques.add(txt);
    });
    [...uniques].sort((a, b) => a.localeCompare(b, "es")).forEach(txt => {
        $select.append(`<option value="${txt}">${txt}</option>`);
    });
}

/** Thead: select nativo visible (Select2 rompe scrollX/alineacion). */
function marcarSelectNativoThead($select) {
    if (!$select?.length) return;
    if ($select.data("select2")) {
        try { $select.select2("destroy"); } catch { /* ignore */ }
    }
    $select.addClass("rp-filter-select-native");
}

/** Control compacto para celda thead (sin wrappers Bootstrap). */
async function buildTheadFilterControl(api, tableSelector, config, options) {
    const escapeRegex = options.escapeRegex || escapeRegexGrilla;
    const colIndex = config.index;
    const placeholder = config.placeholder || tituloColumnaGrilla(api, tableSelector, colIndex);

    if (config.filterType === "select" || config.filterType === "select_local") {
        const $select = $(`<select class="rp-filter-select rp-filter-thead rp-filter-select-native" data-col="${colIndex}"></select>`);

        if (config.sucursalDt && typeof prepararFiltroSucursalDataTable === "function") {
            try {
                await prepararFiltroSucursalDataTable($select, api, colIndex, marcarSelectNativoThead);
            } catch (err) {
                console.warn("Filtro sucursal fallo, usando valores locales:", err);
                poblarOpcionesSelectLocalGrilla(api, colIndex, $select, placeholder);
                marcarSelectNativoThead($select);
            }
        } else if (config.filterType === "select_local") {
            poblarOpcionesSelectLocalGrilla(api, colIndex, $select, placeholder);
            marcarSelectNativoThead($select);
        } else {
            $select.append(`<option value="">${placeholder}...</option>`);
            if (config.opcionesEstaticas) {
                config.opcionesEstaticas.forEach(txt => $select.append(`<option value="${txt}">${txt}</option>`));
            } else if (config.localOptions) {
                config.localOptions.forEach(opt => $select.append(`<option value="${opt.value}">${opt.label}</option>`));
            } else if (config.fetchDataFunc) {
                try {
                    const datos = await config.fetchDataFunc();
                    (datos || []).forEach(item => {
                        const texto = item.NombreCombo
                            ? (typeof etiquetaCuenta === "function" ? etiquetaCuenta(item) : item.Nombre)
                            : (item.Nombre || item.Text || "");
                        if (texto) $select.append(`<option value="${item.Id ?? item.id ?? texto}">${texto}</option>`);
                    });
                } catch (err) {
                    console.warn("Filtro remoto fallo, usando valores de la grilla:", err);
                    poblarOpcionesSelectLocalGrilla(api, colIndex, $select, placeholder);
                }
            }
            marcarSelectNativoThead($select);
        }

        const applySelectSearch = () => {
            const value = $select.val();
            if (!value) {
                api.column(colIndex).search("").draw(false);
                return;
            }
            let searchText = $select.find("option:selected").text();
            if (typeof options.getSelectSearchText === "function") {
                searchText = options.getSelectSearchText(config, $select) || searchText;
            } else if (config.filterType === "select_local" || config.opcionesEstaticas) {
                searchText = value;
            }
            api.column(colIndex)
                .search("^" + escapeRegex(searchText) + "$", true, false)
                .draw(false);
        };

        bindClearFiltroSelectGrilla($select, () => api.column(colIndex).search("").draw(false));
        $select.on("change", async function () {
            if (typeof options.onSelectChange === "function") {
                await options.onSelectChange(config, $select, api, "thead");
            }
            applySelectSearch();
        });
        return $select;
    }

    const inputType = config.filterType === "number" ? "number" : "text";
    const $input = $(`<input type="${inputType}" ${inputType === "number" ? 'step="0.01"' : ""} class="rp-filter-input rp-filter-thead" data-col="${colIndex}" placeholder="${placeholder}..." autocomplete="off">`);
    $input.on("keyup change", function () {
        api.column(colIndex).search(this.value || "").draw(false);
    });
    return $input;
}

async function poblarFiltroTheadGrilla(api, tableSelector, config, options) {
    await montarControlFiltroTheadGrilla(tableSelector, config.index, () =>
        buildTheadFilterControl(api, tableSelector, config, options));
}

const RP_GRID_FILTER_ARMED = {};
const RP_GRID_FILTERS_STATE = {};

async function poblarFiltrosTheadDesdeConfig(api, tableSelector, configs, opts) {
    const idxActivo = typeof indiceColumnaActivoGrilla === "function" ? indiceColumnaActivoGrilla(api) : null;
    let activoMontado = false;

    for (const config of configs) {
        if (config.index === 0 || config.index === 1) continue;
        if (opts.maxColumnIndex !== null && config.index > opts.maxColumnIndex) continue;

        if (config.filterType === "activo" || (idxActivo !== undefined && idxActivo !== null && config.index === idxActivo)) {
            await inicializarFiltroActivoGrilla(api, tableSelector, config.index, opts.defaultActivoModo || "activos");
            if (config.index === idxActivo) activoMontado = true;
            continue;
        }

        try {
            await poblarFiltroTheadGrilla(api, tableSelector, config, opts);
        } catch (err) {
            console.warn(`No se pudo montar filtro columna ${config.index}:`, err);
        }
    }

    if (idxActivo !== undefined && idxActivo !== null && opts.includeActivo !== false && !activoMontado) {
        await inicializarFiltroActivoGrilla(api, tableSelector, idxActivo, opts.defaultActivoModo || "activos");
    }
}

/** Orden correcto en initComplete: draw primero, filtros despues (scrollX no borra selects). */
window.initFiltrosGrillaListaEnInitComplete = async function (api, tableSelector, columnConfig, options, hooks) {
    const opts = options || {};
    const h = hooks || {};

    if (typeof h.beforeDraw === "function") await h.beforeDraw(api);
    api.draw(false);
    await armarFiltrosGrillaLista(api, tableSelector, columnConfig, opts);
    if (typeof h.afterFilters === "function") await h.afterFilters(api);
    ajustarColumnasGrillaLista(api, tableSelector);
    if (typeof h.afterAdjust === "function") h.afterAdjust(api);
};

function engancharRestauracionFiltrosTheadGrilla(api, tableSelector, tableId) {
    if (!api || api._rpFiltrosTheadHook) return;
    api._rpFiltrosTheadHook = true;

    $(api.table().node()).on("draw.dt.rpFiltros", function () {
        if (api._rpRestaurandoFiltrosThead) return;
        setTimeout(() => restaurarFiltrosTheadGrillaSiFaltan(api, tableSelector, tableId), 0);
    });
}

async function restaurarFiltrosTheadGrillaSiFaltan(api, tableSelector, tableId) {
    const state = RP_GRID_FILTERS_STATE[tableId];
    if (!state?.configs?.length || state.opts?.usarFilaColumnas === false) return;
    if (!theadFiltrosGrillaIncompleto(tableSelector, api, state.configs, state.opts)) return;

    api._rpRestaurandoFiltrosThead = true;
    try {
        sincronizarFilaFiltrosScrollHeadGrilla(api, tableSelector);
        await finalizarFiltrosGridLista(api, tableSelector);
        await poblarFiltrosTheadDesdeConfig(api, tableSelector, state.configs, state.opts);
        sincronizarAnchosFiltrosTheadGrilla(tableSelector);
        ajustarColumnasGrillaLista(api, tableSelector);
    } finally {
        api._rpRestaurandoFiltrosThead = false;
    }
}

/** Menu de columnas visible - reemplaza configurarOpcionesColumnas duplicado en cada modulo. */
function configurarMenuColumnasDataTable(apiOrGrid, menuSelector, storageKey, tableSelector) {
    const api = apiOrGrid?.columns ? apiOrGrid : (typeof apiOrGrid?.settings === "function" ? apiOrGrid : null);
    if (!api) return;

    const grid = api;
    const columnas = grid.settings().init().columns;
    const container = $(menuSelector);
    const key = storageKey || "rp_columnas";
    const savedConfig = JSON.parse(localStorage.getItem(key) || "{}");
    const $table = tableSelector ? $(tableSelector) : $(grid.table().node());

    container.empty();

    columnas.forEach((col, index) => {
        if (typeof esColumnaMenuGrilla === "function" ? !esColumnaMenuGrilla(col) : !(col.data && col.data !== "Id")) {
            return;
        }

        const isChecked = savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;
        grid.column(index).visible(isChecked);

        const name = $table.find("thead tr").first().find("th").eq(index).text().trim()
            || col.title || col.sTitle || `Col ${index}`;

        container.append(`
            <li class="rp-dd-item">
                <label class="rp-dd-label">
                    <input type="checkbox" class="toggle-column" data-column="${index}" ${isChecked ? "checked" : ""}>
                    <span>${name}</span>
                </label>
            </li>`);
    });

    container.find(".toggle-column").off("change.rpCols").on("change.rpCols", function () {
        const columnIdx = parseInt($(this).data("column"), 10);
        const isChecked = $(this).is(":checked");
        savedConfig[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(key, JSON.stringify(savedConfig));
        grid.column(columnIdx).visible(isChecked);
        ajustarColumnasGrillaLista(grid, `#${$table.attr("id")}`);
    });
}

function defaultInitSelect2FiltroGrilla($el) {
    if (!$el?.length || $el.data("select2")) return;
    if (typeof $.fn.select2 !== "function") {
        $el.addClass("rp-filter-select-native");
        return;
    }
    $el.select2({
        width: "100%",
        allowClear: true,
        placeholder: "Todos",
        dropdownParent: $(document.body),
        minimumResultsForSearch: 0
    });
}

function bindClearFiltroSelectGrilla($select, handler) {
    if (!$select?.length || typeof handler !== "function") return;
    if ($select.data("select2")) {
        $select.on("select2:clear", handler);
    }
}

function triggerClearFiltroSelectGrilla($select) {
    if (!$select?.length) return;
    if ($select.data("select2")) {
        $select.trigger("change.select2");
    } else {
        $select.trigger("change");
    }
}

function insertarPanelFiltrosGrilla($table, $panel) {
    const $wrap = $table.closest(".dt-dark-wrap");
    const $gridPanel = $wrap.closest(".rp-grid-panel");
    const $insertBefore = $gridPanel.length ? $gridPanel : $wrap;
    const $host = $insertBefore.parent();
    $panel.insertBefore($insertBefore);
    $host.addClass("rp-grid-has-filtros-panel");
    return $panel;
}

function actualizarBadgeFiltrosGrilla($panel, count) {
    const $badge = $panel.find(".rp-filtros-badge");
    if (!$badge.length) return;
    if (count > 0) {
        $badge.text(`${count} activo${count === 1 ? "" : "s"}`).removeClass("d-none");
    } else {
        $badge.addClass("d-none").text("");
    }
}

function filtroPanelSelectTieneValor($el) {
    const val = $el.val();
    if (val === null || val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0 && String(val[0] ?? "").trim() !== "";
    return String(val).trim() !== "";
}

function contarFiltrosActivosPanel($panel) {
    let n = 0;
    $panel.find(".rp-grid-panel-search-global").each(function () {
        if ($(this).val()?.trim()) n++;
    });
    $panel.find(".rp-grid-panel-search-id").each(function () {
        if ($(this).val()?.trim()) n++;
    });
    $panel.find(".rp-grid-panel-field").not(".rp-grid-panel-activo").each(function () {
        const $el = $(this);
        if ($el.hasClass("sucursal-unica-lock")) return;
        if (filtroPanelSelectTieneValor($el)) n++;
    });
    $panel.find(".rp-filter-activo-toggle, .rp-filter-activo-chips, .rp-filter-segment, .rp-grid-panel-activo-chips").each(function () {
        const $el = $(this);
        const val = getModoFiltroActivoUI($el);
        const def = $el.data("defaultModo") || "activos";
        if (val && val !== def) n++;
    });
    return n;
}

function refrescarBadgeFiltrosPanel($panel) {
    actualizarBadgeFiltrosGrilla($panel, contarFiltrosActivosPanel($panel));
}

function limpiarPanelFiltrosGrilla($panel, api, tableSelector) {
    $panel.find(".rp-grid-panel-search-global").val("");
    $panel.find(".rp-grid-panel-search-id").val("");
    $panel.find(".rp-grid-panel-field").not(".rp-grid-panel-activo").each(function () {
        const $el = $(this);
        $el.val("");
        triggerClearFiltroSelectGrilla($el);
    });

    const $activo = $panel.find(".rp-filter-activo-toggle, .rp-filter-activo-chips, .rp-filter-segment, .rp-grid-panel-activo-chips");
    if ($activo.length) {
        const def = $activo.data("defaultModo") || "activos";
        setModoFiltroActivoUI($activo, def);
        const filtro = $(tableSelector).data("rpFiltroActivo");
        if (filtro?.setModo) filtro.setModo(def);
    }

    if (tableSelector) limpiarFiltrosTheadGrilla(tableSelector, api);
    else if (api?.search) { api.search("").columns().search(""); api.draw(false); }

    refrescarBadgeFiltrosPanel($panel);
}

async function crearControlFiltroColumnaGrilla(api, tableSelector, config, $container, options = {}) {
    const initSelect2 = options.initSelect2 || defaultInitSelect2FiltroGrilla;
    const escapeRegex = options.escapeRegex || escapeRegexGrilla;
    const colIndex = config.index;
    const label = config.label || tituloColumnaGrilla(api, tableSelector, colIndex);
    const inputType = config.filterType === "number" ? "number" : "text";
    const $col = $(`
        <div class="col-md-6 col-lg-4 col-xl-3">
            <div class="rp-filter-label">${label}</div>
        </div>`);
    const $fieldWrap = $col.find(".rp-filter-label");

    if (typeof options.beforeFieldBuild === "function") {
        const skip = await options.beforeFieldBuild(config, $col, api, "panel");
        if (skip === false) return null;
    }

    if (config.filterType === "select" || config.filterType === "select_local") {
        const $select = $(`<select class="rp-filter-select rp-grid-panel-field" data-col="${colIndex}" style="width:100%"></select>`);
        $fieldWrap.after($select);

        if (config.sucursalDt && typeof prepararFiltroSucursalDataTable === "function") {
            await prepararFiltroSucursalDataTable($select, api, colIndex, initSelect2);
        } else if (config.filterType === "select_local") {
            $select.append(`<option value=""></option>`);
            const uniques = new Set();
            api.column(colIndex).data().each(v => {
                const txt = (v ?? "").toString().trim();
                if (txt) uniques.add(txt);
            });
            [...uniques].sort().forEach(txt => $select.append(`<option value="${txt}">${txt}</option>`));
            initSelect2($select);
        } else {
            $select.append(`<option value="">Todos</option>`);
            if (config.opcionesEstaticas) {
                config.opcionesEstaticas.forEach(txt => $select.append(`<option value="${txt}">${txt}</option>`));
            } else if (config.localOptions) {
                config.localOptions.forEach(opt => $select.append(`<option value="${opt.value}">${opt.label}</option>`));
            } else if (config.fetchDataFunc) {
                const datos = await config.fetchDataFunc();
                (datos || []).forEach(item => {
                    const texto = item.NombreCombo
                        ? (typeof etiquetaCuenta === "function" ? etiquetaCuenta(item) : item.Nombre)
                        : (item.Nombre || item.Text || "");
                    $select.append(`<option value="${item.Id ?? item.id ?? texto}">${texto}</option>`);
                });
            }
            initSelect2($select);
        }

        if (typeof options.afterSelectBuild === "function") {
            await options.afterSelectBuild(config, $select, api, "panel");
        }

        const applySelectSearch = () => {
            const value = $select.val();
            if (!value) {
                api.column(colIndex).search("").draw(false);
                return;
            }
            let searchText = $select.find("option:selected").text();
            if (typeof options.getSelectSearchText === "function") {
                searchText = options.getSelectSearchText(config, $select) || searchText;
            } else if (config.filterType === "select_local" || config.opcionesEstaticas) {
                searchText = value;
            }
            api.column(colIndex)
                .search("^" + escapeRegex(searchText) + "$", true, false)
                .draw(false);
        };

        bindClearFiltroSelectGrilla($select, () => {
            api.column(colIndex).search("").draw(false);
            refrescarBadgeFiltrosPanel($select.closest(".rp-grid-filtros-wrap"));
        });
        $select.on("change", async function () {
            if (typeof options.onSelectChange === "function") {
                await options.onSelectChange(config, $select, api, "panel");
            }
            applySelectSearch();
            refrescarBadgeFiltrosPanel($select.closest(".rp-grid-filtros-wrap"));
        });

        return $col;
    }

    const $input = $(`<input type="${inputType}" ${inputType === "number" ? 'step="0.01"' : ""} class="rp-filter-input rp-grid-panel-field" data-col="${colIndex}" placeholder="Buscar..." autocomplete="off">`);
    $fieldWrap.after($input);
    $input.on("keyup change", function () {
        api.column(colIndex).search(this.value || "").draw(false);
        refrescarBadgeFiltrosPanel($input.closest(".rp-grid-filtros-wrap"));
    });
    return $col;
}

async function montarPanelFiltrosGrillaLista(api, tableSelector, columnConfig, options = {}) {
    const $table = $(tableSelector);
    if (!$table.length) return null;

    const tableId = $table.attr("id") || tableSelector.replace("#", "");
    const panelId = `panelFiltrosGrid_${tableId}`;
    const collapseId = `collapseFiltrosGrid_${tableId}`;

    if ($(`#${panelId}`).length) return $(`#${panelId}`);

    const opts = Object.assign({
        includeGlobalSearch: true,
        includeIdFilter: false,
        defaultActivoModo: "activos",
        panelTitle: "Busqueda rapida",
        panelExpanded: false,
        panelSoloGlobal: true,
        maxColumnIndex: null,
        initSelect2: defaultInitSelect2FiltroGrilla
    }, options);

    const idxActivo = typeof indiceColumnaActivoGrilla === "function" ? indiceColumnaActivoGrilla(api) : null;

    const $panel = $(`
<div class="rp-filtros-wrap rp-grid-filtros-wrap mb-3" id="${panelId}" data-table-id="${tableId}">
    <div class="rp-filtros-head" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${opts.panelExpanded ? "true" : "false"}">
        <div class="title"><i class="fa fa-filter"></i><span>${opts.panelTitle}</span></div>
        <span class="rp-filtros-badge d-none"></span>
        <i class="fa fa-chevron-down chev"></i>
    </div>
    <div id="${collapseId}" class="collapse${opts.panelExpanded ? " show" : ""}">
        <div class="rp-filtros-body">
            <div class="row g-3 rp-grid-filtros-fields"></div>
            <div class="rp-filtros-actions mt-3">
                <button type="button" class="btn btn-outline-light btn-sm rp-grid-filtros-limpiar"><i class="fa fa-eraser me-1"></i> Limpiar</button>
            </div>
        </div>
    </div>
</div>`);

    insertarPanelFiltrosGrilla($table, $panel);
    initPanelFiltrosPersistido(panelId, collapseId);

    const $fields = $panel.find(".rp-grid-filtros-fields");

    if (opts.includeGlobalSearch) {
        $fields.append(`
            <div class="col-12 col-lg-6">
                <div class="rp-filter-label">Buscar en todo</div>
                <input type="text" class="rp-filter-input rp-grid-panel-search-global" placeholder="Texto libre en cualquier campo..." autocomplete="off">
            </div>`);
        $panel.find(".rp-grid-panel-search-global").on("keyup change", function () {
            api.search(this.value || "").draw(false);
            refrescarBadgeFiltrosPanel($panel);
        });
    }

    if (opts.includeIdFilter) {
        $fields.append(`
            <div class="col-6 col-md-3 col-lg-2">
                <div class="rp-filter-label">Id</div>
                <input type="text" class="rp-filter-input rp-grid-panel-search-id" placeholder="Id..." autocomplete="off">
            </div>`);
        $panel.find(".rp-grid-panel-search-id").on("keyup change", function () {
            api.column(1).search($(this).val()?.trim() || "").draw(false);
            refrescarBadgeFiltrosPanel($panel);
        });
    }

    if (idxActivo !== undefined && idxActivo !== null && opts.includeActivo !== false && !opts.usarFilaColumnas) {
        const modo = opts.defaultActivoModo || "activos";
        $fields.append(`
            <div class="col-6 col-md-3 col-lg-2">
                <div class="rp-filter-label">Estado</div>
            </div>`);
        const $activoCol = $fields.children().last();
        const $activo = crearControlFiltroActivoUI(modo, (m) => {
            const filtro = $(tableSelector).data("rpFiltroActivo");
            if (filtro?.setModo) filtro.setModo(m);
            api.draw(false);
            refrescarBadgeFiltrosPanel($panel);
        }, { compact: false });
        $activoCol.append($activo);
    }

    for (const config of (columnConfig || [])) {
        if (opts.panelSoloGlobal) continue;
        if (opts.maxColumnIndex !== null && config.index > opts.maxColumnIndex) continue;
        if (idxActivo !== undefined && idxActivo !== null && config.index === idxActivo) continue;
        const $field = await crearControlFiltroColumnaGrilla(api, tableSelector, config, $fields, opts);
        if ($field) $fields.append($field);
    }

    $panel.find(".rp-grid-filtros-limpiar").on("click", function () {
        limpiarPanelFiltrosGrilla($panel, api, tableSelector);
    });

    refrescarBadgeFiltrosPanel($panel);
    return $panel;
}

async function armarFiltrosGrillaLista(api, tableSelector, columnConfig, options = {}) {
    const $table = $(tableSelector);
    const tableId = $table.attr("id") || "";
    if (tableId) registrarFiltrosGrilla(tableId, columnConfig, options);

    if (tableId && RP_GRID_FILTER_ARMED[tableId]) {
        return RP_GRID_FILTER_ARMED[tableId];
    }

    const run = (async () => {
        const opts = Object.assign({
            usarFilaColumnas: true,
            panelSoloGlobal: true,
            panelExpanded: false,
            autoColumnas: true
        }, options);

        let configs = [...(columnConfig || [])];
        if (opts.autoColumnas) {
            configs = expandirColumnConfigGrilla(api, configs);
        }

        const idxActivo = typeof indiceColumnaActivoGrilla === "function" ? indiceColumnaActivoGrilla(api) : null;

        if (opts.usarFilaColumnas) {
            inicializarFilaFiltrosGrilla(api, tableSelector);
            await finalizarFiltrosGridLista(api, tableSelector);
            await poblarFiltrosTheadDesdeConfig(api, tableSelector, configs, opts);
        }

        if (idxActivo !== undefined && idxActivo !== null && opts.includeActivo !== false) {
            let filtro = $table.data("rpFiltroActivo");
            if (!filtro && typeof crearFiltroActivoDataTable === "function") {
                filtro = crearFiltroActivoDataTable(tableSelector, opts.defaultActivoModo || "activos");
                $table.data("rpFiltroActivo", filtro);
                if ((opts.defaultActivoModo || "activos") !== "activos") api.draw(false);
            }
        }

        await montarPanelFiltrosGrillaLista(api, tableSelector, configs, opts);
        ajustarColumnasGrillaLista(api, tableSelector);

        if (tableId) {
            RP_GRID_FILTERS_STATE[tableId] = { configs, opts };
            engancharRestauracionFiltrosTheadGrilla(api, tableSelector, tableId);
        }
    })();

    if (tableId) RP_GRID_FILTER_ARMED[tableId] = run;
    try {
        return await run;
    } finally {
        if (tableId) delete RP_GRID_FILTER_ARMED[tableId];
    }
}

async function autoMontarPanelFiltrosGrilla(settings) {
    const table = settings.nTable;
    const tableId = table?.id;
    if (!tableId?.startsWith("grd_")) return;

    const reg = RP_GRID_FILTER_REGISTRY[tableId];
    if (!reg) return;

    const api = new $.fn.dataTable.Api(settings);
    const tableSelector = `#${tableId}`;

    if ($(`#panelFiltrosGrid_${tableId}`).length) {
        await restaurarFiltrosTheadGrillaSiFaltan(api, tableSelector, tableId);
        return;
    }

    await armarFiltrosGrillaLista(api, tableSelector, reg.columnConfig, reg.options);
}

if (!window._rpGridFiltersAutoBound) {
    window._rpGridFiltersAutoBound = true;
    $(function () {
        $(document).on("init.dt", function (e, settings) {
            setTimeout(() => autoMontarPanelFiltrosGrilla(settings), 0);
        });
    });
}

if (!window._rpSelect2TheadFix) {
    window._rpSelect2TheadFix = true;
    $(document).on("click.rpSelect2Thead", "thead tr.filters .select2-container--default .select2-selection--single", function () {
        const $select = $(this).closest(".select2-container").prev("select");
        if (!$select.length) return;
        if ($select.data("select2")?.isOpen()) return;
        $select.select2("open");
    });
}

if (!window._rpGridActivoToggleBound) {
    window._rpGridActivoToggleBound = true;

    $(document).on("change", ".rp-grid-activo-toggle", async function (e) {
        e.stopPropagation();

        const $cb = $(this);
        const $tr = $cb.closest("tr");
        const $table = $cb.closest("table.dataTable");
        const modulo = $cb.data("modulo");
        const url = RP_URL_CAMBIAR_ACTIVO[modulo];
        const activo = $cb.is(":checked");

        let id = 0;
        if ($table.length && $.fn.dataTable) {
            try {
                const api = $table.DataTable();
                const row = api.row($tr);
                const data = row.data();
                id = Number(data?.Id ?? data?.id ?? 0);
            } catch { /* ignore */ }
        }

        if (!url || id <= 0) {
            $cb.prop("checked", !activo);
            return;
        }

        $cb.prop("disabled", true);

        try {
            const r = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: "Bearer " + (token || ""),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ Id: id, Activo: activo })
            });

            const result = r.ok ? await r.json() : null;
            const ok = result?.valor === true || result?.valor === "true" || result?.ok === true;

            if (!ok) {
                $cb.prop("checked", !activo);
                if (typeof errorModal === "function") {
                    errorModal(result?.mensaje || "No se pudo actualizar el estado.");
                }
                return;
            }

            if ($table.length && $.fn.dataTable) {
                const api = $table.DataTable();
                const row = api.row($tr);
                const data = row.data();
                if (data) {
                    data.Activo = activo;
                    row.data(data);
                    createdRowEstiloActivoGrilla($tr[0], data);

                    const filtro = $table.data("rpFiltroActivo");
                    if (filtro) api.draw(false);
                }
            }

            if (modulo === "Clientes" && typeof cargarDashboardClientes === "function") {
                cargarDashboardClientes();
            }
        } catch {
            $cb.prop("checked", !activo);
            if (typeof errorModal === "function") errorModal("Error de comunicacion con el servidor.");
        } finally {
            $cb.prop("disabled", false);
        }
    });
}

/** Iguala anchos de celdas de filtro con las columnas del header (scrollX). */
function sincronizarAnchosFiltrosTheadGrilla(tableSelector) {
    const $table = $(tableSelector);
    if (!$table.length) return;

    const $wrapper = $table.closest(".dataTables_wrapper");
    let $headTable = $wrapper.find(".dataTables_scrollHeadInner table");
    if (!$headTable.length) $headTable = $table;

    const $headerCells = $headTable.find("thead tr").first().find("th");
    const $filterCells = $headTable.find("thead tr.filters th");
    if (!$headerCells.length || !$filterCells.length) return;

    $headerCells.each(function (i) {
        const w = $(this).outerWidth();
        if (w > 0) {
            $filterCells.eq(i).css({ width: w + "px", minWidth: w + "px" });
        }
    });
}

/** Corrige desalineacion de encabezado/cuerpo con scrollX + fixedHeader. */
function ajustarColumnasGrillaLista(api, tableSelector) {
    if (!api) return;
    try {
        api.columns.adjust();
    } catch { /* sin tabla lista */ }

    if (!tableSelector) return;

    const syncScroll = () => {
        try {
            api.columns.adjust();
            if (api.fixedHeader?.adjust) {
                api.fixedHeader.adjust();
            }
            const $table = $(tableSelector);
            const $wrapper = $table.closest(".dataTables_wrapper");
            const $headInner = $wrapper.find(".dataTables_scrollHeadInner");
            const $bodyTable = $wrapper.find(".dataTables_scrollBody table");
            if ($headInner.length && $bodyTable.length) {
                const w = $bodyTable.outerWidth();
                if (w > 0) $headInner.width(w);
            }
            sincronizarAnchosFiltrosTheadGrilla(tableSelector);
            if (window.RpGridView) {
                RpGridView.programarAjuste();
            }
        } catch { /* ignore */ }
    };

    syncScroll();
    setTimeout(syncScroll, 80);
    setTimeout(syncScroll, 280);
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
        title: tituloExport || "Exportacion",
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

    // ✅ EJECUCION REAL
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
   ATAJOS + (alta rapida de catalogos desde modales)
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
        errorModal("No se pudo abrir la configuracion.");
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
        errorModal("No se pudo abrir la configuracion.");
    }
});

function getBotonesExportacion(grid, modulo) {

    const botones = [];

    if (tienePermiso(modulo, "Exportar")) {
        botones.push({
            text: 'Excel',
            action: function (_e, dt) {
                abrirModalExportacion(dt, 'excel', modulo);
            }
        });

        botones.push({
            text: 'PDF',
            action: function (_e, dt) {
                abrirModalExportacion(dt, 'pdf', modulo);
            }
        });

        botones.push({
            text: 'Imprimir',
            action: function (_e, dt) {
                abrirModalExportacion(dt, 'print', modulo);
            }
        });
    }

    // Cantidad de filas - sin overlay que oscurece toda la pantalla
    botones.push({
        extend: "pageLength",
        background: false,
        className: "rp-dt-btn-length"
    });

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
   GRILLAS DT - seleccion, pointer, doble clic
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
        grd_Proveedores: (id) => { window.location.href = `/Proveedores/Gestion?id=${id}`; },
        grd_Usuarios: (id) => window.editarUsuario?.(id),
        grd_Caja: (id) => {
            if (typeof editarMovimiento === "function") {
                editarMovimiento(id);
            }
        }
    };

    function esClicEnControlInteractivo(e) {
        return $(e.target).closest(
            "button, a, input, select, textarea, label, .cm-prod-trigger, .select2-container, .rp-row-actions, .dt-no-row-select, .rp-switch, .rp-switch-grid"
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

    function flashFilaGrilla($tr) {
        if (!$tr?.length) return;
        $tr.addClass("dt-row-flash");
        setTimeout(() => $tr.removeClass("dt-row-flash"), 2400);
    }

    function buscarIndiceFilaGrillaPorId(api, targetId, scope) {
        let foundIdx = -1;
        const collection = scope === "applied" ? api.rows({ search: "applied" }) : api.rows();
        collection.every(function () {
            const data = this.data();
            const rid = Number(data?.Id ?? data?.id ?? data?.ID ?? 0);
            if (rid === targetId) {
                foundIdx = this.index();
                return false;
            }
        });
        return foundIdx;
    }

    function paginaDeIndiceFila(api, rowIdx) {
        const info = api.page.info();
        if (!info.length) return 0;
        return Math.floor(rowIdx / info.length);
    }

    function scrollAFilaGrilla($tr, $table) {
        if (!$tr?.length) return;

        const tr = $tr[0];
        tr.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

        const scrollBody = $table.closest(".dataTables_wrapper").find(".dataTables_scrollBody")[0];
        if (!scrollBody) return;

        const trRect = tr.getBoundingClientRect();
        const bodyRect = scrollBody.getBoundingClientRect();
        if (trRect.top < bodyRect.top || trRect.bottom > bodyRect.bottom) {
            const offset = tr.offsetTop - scrollBody.clientHeight / 2 + tr.clientHeight / 2;
            scrollBody.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
        }
    }

    function deriveGridKeyFromTableId(tableId) {
        return String(tableId || "")
            .replace(/^grd_/i, "")
            .replace(/Cg$/i, "")
            .replace(/([A-Z])/g, "_$1")
            .toLowerCase()
            .replace(/^_/, "")
            .replace(/_/g, "");
    }

    function irACardGrilla(tableId, targetId, opts) {
        const key = deriveGridKeyFromTableId(tableId);
        const $cards = $(`#rpCards_${key}, #cgCards_${key}`);
        if (!$cards.length) return false;

        if (window.RpGridView?.renderCards) {
            window.RpGridView.renderCards(key);
        }

        const $card = $cards.find(`.rp-data-card[data-row-id="${targetId}"], .cg-data-card[data-row-id="${targetId}"]`).first();
        if (!$card.length) return false;

        $cards.find(".rp-data-card.is-selected, .cg-data-card.is-selected").removeClass("is-selected");
        $card.addClass("is-selected");
        $cards.data("rpSelectedKey", `id:${targetId}`);

        if (opts.scroll !== false) {
            $card[0].scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        }

        if (opts.flash !== false) {
            $card.addClass("is-flash-target");
            setTimeout(() => $card.removeClass("is-flash-target"), 2400);
        }

        return true;
    }

    window.irAFilaGrilla = function (tableId, id, opts) {
        opts = Object.assign({ scroll: true, flash: true, limpiarFiltros: true }, opts || {});

        const targetId = Number(id);
        if (!targetId || !tableId) return false;

        if (window.RpGridView && !window.RpGridView.debeMostrarTabla()) {
            return irACardGrilla(tableId, targetId, opts);
        }

        const $table = $(`#${tableId}`);
        if (!$table.length || !$.fn.dataTable) return false;

        let api;
        try {
            api = $table.DataTable();
        } catch {
            return false;
        }

        let foundIdx = buscarIndiceFilaGrillaPorId(api, targetId, "applied");

        if (foundIdx < 0 && opts.limpiarFiltros) {
            const idxAll = buscarIndiceFilaGrillaPorId(api, targetId, "all");
            if (idxAll >= 0) {
                api.search("");
                api.columns().search("");
                api.draw(false);
                foundIdx = buscarIndiceFilaGrillaPorId(api, targetId, "applied");
                if (foundIdx < 0) foundIdx = idxAll;
            }
        }

        if (foundIdx < 0) return false;

        const targetPage = paginaDeIndiceFila(api, foundIdx);
        if (api.page() !== targetPage) {
            api.page(targetPage).draw(false);
        }

        guardarIdSeleccionGrilla($table, targetId, foundIdx);
        aplicarSeleccionVisualGrilla($table, { id: targetId, rowIdx: foundIdx });

        const $tr = $(api.row(foundIdx).node());
        if (opts.scroll) scrollAFilaGrilla($tr, $table);
        if (opts.flash) flashFilaGrilla($tr);

        return $tr.length > 0 || irACardGrilla(tableId, targetId, opts);
    };

    window.registrarGrillaDobleClick = function (tableId, fn) {
        if (tableId && typeof fn === "function") {
            DT_DBLCLICK[tableId] = fn;
        }
    };

    $(document).ready(initGrillaInteraccionGlobal);

})();