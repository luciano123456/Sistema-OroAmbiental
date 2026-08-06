/* =========================================================
   CLIENTES GESTION - Hub unificado por cliente
   (cliente + establecimientos: lineas completas + importe tras cuenta)
========================================================= */
window.__OA_CG_BUILD = "inline-guard-v22-20260806";

const CG = {
    id: 0,
    modelo: null,
    contactos: [],
    contactoSelId: 0,
    tabsLoaded: {},
    grids: {},
    establecimientoModal: null,
    establecimientoSelId: 0,
    establecimientoSelIds: [],
    establecimientosLista: [],
    contratoModal: null,
    modalCobro: null,
    modalControlMensual: null,
    modalInteres: null,
    modalInteresesHist: null,
    modalContacto: null,
    controlAnual: null,
    controlFiltrado: null,
    controlAnio: new Date().getFullYear(),
    controlAnualError: false,
    cuentas: [],
    controlFiltros: { anios: [], meses: [] },
    hubMesSel: null,
    stockCliente: [],
    entregasHub: [],
    entregasDetalleCache: {},
    entregaHubExpandida: 0,
    wsLineas: [],
    wsCobros: [],
    wsSugeridos: [],
    wsProductosCatalogo: [],
    wsEstablecimientos: [],
    wsListasPrecios: [],
    wsPreciosCache: {},
    wsNextCobroKey: 1,
    secMoving: false,
    viewPref: "auto",
    listMeta: {},
    geoCache: { provincias: [] },
    idDiaRecoleccionLegacy: 0,
    hubActivo: "cliente",
    hubActivoLock: null,
    hubs: { est: null },
    estHubBound: false
};

function crearHubStateEstCg() {
    return {
        controlFiltros: { anios: [new Date().getFullYear()], meses: [] },
        controlFiltrado: null,
        controlAnualError: false,
        stockCliente: [],
        hubMesSel: null,
        wsLineas: [],
        wsCobros: [],
        idEstablecimiento: 0,
        entregasHub: []
    };
}

function isHubEstCg() {
    if (CG.hubActivoLock != null) return CG.hubActivoLock === "est";
    return CG.hubActivo === "est";
}

/** Fija el modo hub durante awaits para que $h / setHubProp no pinten en el DOM equivocado. */
async function withHubModeCg(mode, fn) {
    if (CG.hubActivoLock === mode) return await fn();
    const prevLock = CG.hubActivoLock;
    const prev = CG.hubActivo;
    CG.hubActivoLock = mode;
    CG.hubActivo = mode;
    try {
        return await fn();
    } finally {
        CG.hubActivoLock = prevLock;
        CG.hubActivo = prev;
    }
}

function hubEstStateCg() {
    if (!CG.hubs.est) CG.hubs.est = crearHubStateEstCg();
    return CG.hubs.est;
}

function hubPropCg(key) {
    return isHubEstCg() ? hubEstStateCg()[key] : CG[key];
}

function setHubPropCg(key, val) {
    if (isHubEstCg()) hubEstStateCg()[key] = val;
    else CG[key] = val;
}

function mapHubDomIdCg(id) {
    if (!isHubEstCg() || !id) return id;
    if (id.startsWith("cgEst") || id.startsWith("btnEst") || id.startsWith("tblEst") || id.startsWith("lblEst")) return id;
    if (id.startsWith("cg")) return "cgEst" + id.slice(2);
    if (id.startsWith("btn")) return "btnEst" + id.slice(3);
    if (id.startsWith("tbl")) return "tblEst" + id.slice(3);
    if (id.startsWith("lbl")) return "lblEst" + id.slice(3);
    return id;
}

function $h(id) {
    return $("#" + mapHubDomIdCg(id));
}

function syncHubActivoFromElCg(el) {
    CG.hubActivo = $(el).closest("#cgEstHubMount").length ? "est" : "cliente";
}

let cgLoadingDepth = 0;

function showCgLoading(msg) {
    cgLoadingDepth++;
    const $el = $("#cgPageLoading");
    if (!$el.length) return;
    if (msg) $("#cgPageLoadingMsg").text(msg);
    $el.prop("hidden", false).attr("aria-busy", "true");
    $(".cg-page").addClass("is-loading");
}

function hideCgLoading() {
    cgLoadingDepth = Math.max(0, cgLoadingDepth - 1);
    if (cgLoadingDepth > 0) return;
    $("#cgPageLoading").prop("hidden", true).attr("aria-busy", "false");
    $(".cg-page").removeClass("is-loading");
}

async function withCgLoading(msg, fn) {
    showCgLoading(msg || "Cargando datos…");
    try {
        return await fn();
    } finally {
        hideCgLoading();
    }
}

function hubFiltrosCg() {
    return isHubEstCg() ? hubEstStateCg().controlFiltros : CG.controlFiltros;
}

function idsEstablecimientoSeleccionadosCg() {
    return [...new Set((CG.establecimientoSelIds || []).map(Number).filter(x => x > 0))];
}

function hubIdsEstablecimientoCg() {
    // En hub de establecimiento (planilla) usa la selección actual.
    // Fuera de ese hub no filtra por establecimiento (planilla del cliente).
    if (!isHubEstCg()) return [];
    return idsEstablecimientoSeleccionadosCg();
}

function hubIdEstablecimientoCg() {
    const ids = hubIdsEstablecimientoCg();
    return ids.length === 1 ? ids[0] : null;
}

function esMultiEstCg() {
    return hubIdsEstablecimientoCg().length > 1;
}

window.hubPropCg = hubPropCg;
window.setHubPropCg = setHubPropCg;
window.$h = $h;
window.hubFiltrosCg = hubFiltrosCg;
window.isHubEstCg = isHubEstCg;
window.hubIdEstablecimientoCg = hubIdEstablecimientoCg;
window.hubEstStateCg = hubEstStateCg;

const CG_DIAS_SEMANA = [
    { id: 1, nombre: "Lunes" },
    { id: 2, nombre: "Martes" },
    { id: 3, nombre: "Miercoles" },
    { id: 4, nombre: "Jueves" },
    { id: 5, nombre: "Viernes" },
    { id: 6, nombre: "Sabado" },
    { id: 7, nombre: "Domingo" }
];

const CG_REC_CAMION_SELECTORS = CG_DIAS_SEMANA.map(d => `#cgRecCamion${d.id}`);

const MES_NOMBRES_CG = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const API_CG = {
    editar: id => `/Clientes/EditarInfo?id=${id}`,
    insertar: "/Clientes/Insertar",
    actualizar: "/Clientes/Actualizar",
    eliminar: (id, cascada) => `/Clientes/Eliminar?id=${id}&cascada=${cascada ? "true" : "false"}`,
    dependencias: id => `/Clientes/DependenciasEliminar?id=${id}`,
    sucursales: "/Sucursales/Lista",
    provincias: "/Provincias/Lista",
    condicionesIva: "/CondicionesIva/Lista",
    profesiones: "/ClientesProfesiones/Lista",
    estados: "/ClientesEstados/Lista",
    motivos: "/ClientesMotivos/Lista",
    calificaciones: "/ClientesCalificaciones/Lista",
    tiposGenerador: "/ClientesTiposGenerador/Lista",
    contactosLista: id => `/ClientesContactos/ListaPorCliente?idCliente=${id}`,
    contactosInsertar: "/ClientesContactos/Insertar",
    contactosActualizar: "/ClientesContactos/Actualizar",
    contactosEliminar: id => `/ClientesContactos/Eliminar?id=${id}`,
    establecimientosLista: "/ClientesEstablecimientos/Lista",
    establecimientosPorCliente: idCliente => `/ClientesEstablecimientos/ListaPorCliente?idCliente=${idCliente}`,
    contratosLista: id => `/Contratos/Lista?idCliente=${id}`,
    entregasLista: "/ClientesEntregas/ListaFiltrada",
    ccMovimientos: "/ClientesCuentaCorriente/Movimientos",
    ccResumen: "/ClientesCuentaCorriente/Resumen",
    ccRegistrarCobro: "/ClientesCuentaCorriente/RegistrarCobro",
    ccRegistrarInteres: "/ClientesCuentaCorriente/RegistrarInteres",
    ccEliminar: id => `/ClientesCuentaCorriente/Eliminar?id=${id}`,
    cuentas: "/Cuentas/Lista",
    entregaNuevoModif: (idEntrega, idCliente, volverCliente = false) => {
        let url = `/ClientesEntregas/NuevoModif?id=${idEntrega || 0}`;
        if (idCliente) url += `&idCliente=${idCliente}`;
        if (volverCliente && idCliente) url += `&volverCliente=true`;
        return url;
    },
    entregaIndex: (idCliente) => {
        let url = `/ClientesEntregas/Index`;
        if (idCliente) url += `?idCliente=${idCliente}`;
        return url;
    },
    entregaEditarInfo: id => `/ClientesEntregas/EditarInfo?id=${id}`,
    controlAnual: (idCliente, anio) =>
        `/ClientesOperativo/ControlAnual?idCliente=${idCliente}&anio=${anio}`,
    controlMensual: (idCliente, anios, meses, idsEstablecimiento) => {
        const p = new URLSearchParams({ idCliente: String(idCliente) });
        if (anios?.length) p.set("anios", anios.join(","));
        if (meses?.length) p.set("meses", meses.join(","));
        const idsCm = Array.isArray(idsEstablecimiento)
            ? idsEstablecimiento.map(Number).filter(x => x > 0)
            : (Number(idsEstablecimiento) > 0 ? [Number(idsEstablecimiento)] : []);
        if (idsCm.length === 1) p.set("idEstablecimiento", String(idsCm[0]));
        else if (idsCm.length > 1) p.set("idEstablecimientos", idsCm.join(","));
        return `/ClientesOperativo/ControlMensual?${p.toString()}`;
    },
    recorridosPorCliente: idCliente => `/Recorridos/PorCliente?idCliente=${idCliente}`,
    stockCliente: idCliente => `/ClientesOperativo/StockCliente?idCliente=${idCliente}`,
    stockEstablecimiento: (idCliente, idsEstablecimiento) => {
        const p = new URLSearchParams({ idCliente: String(idCliente) });
        const idsSt = Array.isArray(idsEstablecimiento)
            ? idsEstablecimiento.map(Number).filter(x => x > 0)
            : (Number(idsEstablecimiento) > 0 ? [Number(idsEstablecimiento)] : []);
        if (idsSt.length === 1) p.set("idEstablecimiento", String(idsSt[0]));
        else if (idsSt.length > 1) p.set("idEstablecimientos", idsSt.join(","));
        return `/ClientesOperativo/StockCliente?${p.toString()}`;
    },
    productosSugeridos: (idCliente, idEstablecimiento) => {
        const p = new URLSearchParams({ idCliente: String(idCliente) });
        if (idEstablecimiento) p.set("idEstablecimiento", String(idEstablecimiento));
        return `/ClientesOperativo/ProductosSugeridos?${p.toString()}`;
    },
    productosCatalogo: "/Productos/Lista?soloActivos=true",
    preciosProducto: id => `/ProductosPrecios/ListaPorProducto?idProducto=${id}`,
    entregaInsertar: "/ClientesEntregas/Insertar",
    guardarControlMensual: "/ClientesOperativo/GuardarControlMensual",
    recoleccionPrincipal: id => `/Clientes/RecoleccionPrincipal?idCliente=${id}`,
    recoleccionPrincipalGuardar: "/Clientes/RecoleccionPrincipal",
    dias: "/Dias/Lista",
    semanas: "/Semanas/Lista",
    listasPrecios: "/ListasPrecios/Lista",
    camiones: "/Camiones/Lista?soloActivos=true"
};

const CG_TAB_LABELS = {
    establecimientos: "Establecimientos",
    contratos: "Contratos",
    cuentaCorriente: "Cuenta corriente",
    entregas: "Entregas"
};

const authCg = () => ({
    Authorization: "Bearer " + token,
    "Content-Type": "application/json"
});

$(document).ready(async () => {
    CG.id = Number(window.CG_INIT?.id || $("#cgId").val() || 0);
    instalarBloqueoImporteSinCuentaCg();

    initModalesCg();
    wireEventosCg();
    initSelect2Cg();
    initSeccionesPlegablesCg();

    await withCgLoading(CG.id > 0 ? "Cargando cliente y planilla…" : "Preparando formulario…", async () => {
        await cargarCombosDatosCg();
        await cargarCombosRecoleccionCg();

        if (CG.id > 0) {
            await cargarClienteCg(CG.id);
            await cargarRecoleccionPrincipalCg();
            habilitarTabsRelacionados(true);
            await cargarHubDatosCg(true);
        } else {
            actualizarHeaderCg("Nuevo cliente", "Complete los datos y registre el cliente");
            habilitarTabsRelacionados(false);
            $h("cgHubOperativo").prop("hidden", true);
            $("#btnNuevoContactoCg").prop("disabled", true);
        }
    });
});

const CG_SECCIONES_KEY = "cg.secciones.v1";
const CG_ORDEN_KEY = "cg.secciones.orden.v1";
const CG_SECCIONES_DEFAULT = {
    identificacion: true,
    domicilio: true,
    comunicacion: true,
    recoleccion: true,
    controlPagos: true,
    stockCliente: true,
    planillaMensual: true,
    entregasRecientes: true
};
const CG_ORDEN_DEFAULT = [
    "identificacion",
    "domicilio",
    "comunicacion",
    "recoleccion",
    "controlPagos"
];

function leerSeccionesPlegablesCg() {
    try {
        const raw = localStorage.getItem(CG_SECCIONES_KEY);
        if (!raw) return { ...CG_SECCIONES_DEFAULT };
        const parsed = JSON.parse(raw);
        return { ...CG_SECCIONES_DEFAULT, ...(parsed && typeof parsed === "object" ? parsed : {}) };
    } catch {
        return { ...CG_SECCIONES_DEFAULT };
    }
}

function guardarSeccionPlegableCg(key, abierta) {
    if (!key) return;
    const state = leerSeccionesPlegablesCg();
    state[key] = !!abierta;
    try {
        localStorage.setItem(CG_SECCIONES_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn("No se pudo guardar preferencia de seccion:", e);
    }
}

function leerOrdenSeccionesCg() {
    try {
        const raw = localStorage.getItem(CG_ORDEN_KEY);
        if (!raw) return [...CG_ORDEN_DEFAULT];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.length) return [...CG_ORDEN_DEFAULT];
        const clean = parsed.filter(k => CG_ORDEN_DEFAULT.includes(k));
        CG_ORDEN_DEFAULT.forEach(k => {
            if (!clean.includes(k)) clean.push(k);
        });
        return clean;
    } catch {
        return [...CG_ORDEN_DEFAULT];
    }
}

function guardarOrdenSeccionesCg(orden) {
    try {
        localStorage.setItem(CG_ORDEN_KEY, JSON.stringify(orden));
    } catch (e) {
        console.warn("No se pudo guardar orden de secciones:", e);
    }
}

function aplicarOrdenSeccionesCg() {
    const $stack = $("#cgSeccionesStack");
    if (!$stack.length) return;

    const orden = leerOrdenSeccionesCg();
    orden.forEach(key => {
        const $sec = $stack.children(`[data-cg-section="${key}"][data-cg-sortable="1"]`);
        if ($sec.length) $stack.append($sec);
    });
    actualizarBotonesOrdenCg();
}

function obtenerOrdenActualSeccionesCg() {
    return $("#cgSeccionesStack")
        .children("[data-cg-sortable='1']")
        .map(function () { return $(this).data("cgSection"); })
        .get()
        .filter(Boolean);
}

function actualizarBotonesOrdenCg() {
    const $items = $("#cgSeccionesStack").children("[data-cg-sortable='1']");
    $items.each(function (idx) {
        const $sec = $(this);
        $sec.find("> .cg-form-section-toggle .cg-sec-move[data-dir='up'], > .cg-hub-head .cg-sec-move[data-dir='up']")
            .prop("disabled", idx === 0);
        $sec.find("> .cg-form-section-toggle .cg-sec-move[data-dir='down'], > .cg-hub-head .cg-sec-move[data-dir='down']")
            .prop("disabled", idx === $items.length - 1);
    });
}

function moverSeccionCg($sec, dir) {
    if (!$sec?.length || CG.secMoving) return;
    const $target = dir === "up" ? $sec.prevAll("[data-cg-sortable='1']").first() : $sec.nextAll("[data-cg-sortable='1']").first();
    if (!$target.length) return;

    const secEl = $sec[0];
    const targetEl = $target[0];
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const firstSec = secEl.getBoundingClientRect();
    const firstTarget = targetEl.getBoundingClientRect();

    if (dir === "up") $sec.insertBefore($target);
    else $sec.insertAfter($target);

    guardarOrdenSeccionesCg(obtenerOrdenActualSeccionesCg());
    actualizarBotonesOrdenCg();

    if (reduceMotion) {
        $sec.add($target).addClass("cg-sec-swap-pulse");
        setTimeout(() => $sec.add($target).removeClass("cg-sec-swap-pulse"), 450);
        return;
    }

    const lastSec = secEl.getBoundingClientRect();
    const lastTarget = targetEl.getBoundingClientRect();
    const dySec = firstSec.top - lastSec.top;
    const dyTarget = firstTarget.top - lastTarget.top;

    if (!dySec && !dyTarget) {
        $sec.add($target).addClass("cg-sec-swap-pulse");
        setTimeout(() => $sec.add($target).removeClass("cg-sec-swap-pulse"), 450);
        return;
    }

    CG.secMoving = true;
    let done = false;
    let fallback = 0;

    $sec.add($target).addClass("cg-sec-swap-active");

    secEl.style.transition = "none";
    targetEl.style.transition = "none";
    secEl.style.transform = `translateY(${dySec}px)`;
    targetEl.style.transform = `translateY(${dyTarget}px)`;
    void secEl.offsetHeight;

    const cleanup = () => {
        if (done) return;
        done = true;
        clearTimeout(fallback);
        secEl.removeEventListener("transitionend", onEnd);
        secEl.style.transition = "";
        targetEl.style.transition = "";
        secEl.style.transform = "";
        targetEl.style.transform = "";
        $sec.add($target).removeClass("cg-sec-swap-active cg-sec-swap-pulse");
        CG.secMoving = false;
        actualizarBotonesOrdenCg();
    };

    const onEnd = (ev) => {
        if (ev.target !== secEl || ev.propertyName !== "transform") return;
        cleanup();
    };

    requestAnimationFrame(() => {
        secEl.style.transition = "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)";
        targetEl.style.transition = "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)";
        secEl.style.transform = "translateY(0)";
        targetEl.style.transform = "translateY(0)";
        $sec.add($target).addClass("cg-sec-swap-pulse");
        secEl.addEventListener("transitionend", onEnd);
    });

    fallback = setTimeout(cleanup, 450);
}

function initSeccionesPlegablesCg() {
    const state = leerSeccionesPlegablesCg();

    $("[data-cg-section]").each(function () {
        const key = $(this).data("cgSection");
        if (!key) return;

        const $toggle = $(this).find("> .cg-form-section-toggle, > .cg-hub-head.cg-form-section-toggle").first();
        const targetSel = $toggle.attr("data-cg-collapse-target") || $toggle.attr("data-bs-target");
        if (!targetSel) return;

        const $body = $(targetSel);
        if (!$body.length) return;

        const abierta = state[key] !== false;
        $toggle.attr("aria-expanded", abierta ? "true" : "false");
        $body.toggleClass("show", abierta);
        $(this).toggleClass("is-collapsed", !abierta);
    });

    // Sub-bloques del hub (stock / planilla / entregas)
    $("#cgHubOperativo .cg-hub-block-title.cg-form-section-toggle").each(function () {
        const $toggle = $(this);
        const $section = $toggle.closest("[data-cg-section]");
        const key = $section.data("cgSection");
        const targetSel = $toggle.attr("data-cg-collapse-target");
        if (!key || !targetSel) return;
        const $body = $(targetSel);
        const abierta = state[key] !== false;
        $toggle.attr("aria-expanded", abierta ? "true" : "false");
        $body.toggleClass("show", abierta);
        $section.toggleClass("is-collapsed", !abierta);
    });

    aplicarOrdenSeccionesCg();

    $(document).on("click", ".cg-form-section-toggle[data-cg-collapse-target]", function (e) {
        if ($(e.target).closest("a, button, input, select, textarea, .cg-sec-reorder, .cg-sec-move").length) {
            return;
        }
        e.preventDefault();
        toggleSeccionCollapseCg($(this));
    });

    $(document).on("click", "#cgSeccionesStack .cg-sec-move", function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const $sec = $(this).closest("[data-cg-sortable='1']");
        moverSeccionCg($sec, $(this).data("dir") === "up" ? "up" : "down");
    });
}

function toggleSeccionCollapseCg($toggle) {
    const targetSel = $toggle.attr("data-cg-collapse-target");
    if (!targetSel) return;
    const $body = $(targetSel);
    if (!$body.length) return;

    const $section = $toggle.closest("[data-cg-section]");
    const key = $section.data("cgSection");
    const abrir = !$body.hasClass("show");

    $body.toggleClass("show", abrir);
    $toggle.attr("aria-expanded", abrir ? "true" : "false");
    if ($section.length) {
        $section.toggleClass("is-collapsed", !abrir);
        if (key) guardarSeccionPlegableCg(key, abrir);
        if ($section.is("[data-cg-sortable='1']")) actualizarBotonesOrdenCg();
    }

    if (abrir && targetSel === "#cgRecoleccionBody") {
        ["#cgTipoGenerador", ...CG_REC_CAMION_SELECTORS, "#cgRecSemana"]
            .forEach(sel => refreshSelect2Cg($(sel)));
    }
}

function initModalesCg() {
    if (typeof initEstablecimientoModal === "function") {
        CG.establecimientoModal = initEstablecimientoModal({
            token: token,
            mode: "inline",
            root: "#cgEstEditor",
            lockClienteId: CG.id,
            onSaved: async (data, modelo) => {
                CG.tabsLoaded.establecimientos = false;
                const idGuardado = Number(modelo?.Id || data?.id || 0);
                await cargarTabEstablecimientos();
                if (idGuardado > 0) {
                    CG.establecimientoSelId = idGuardado;
                    resaltarListaEstablecimientoCg(idGuardado);
                    $("#btnEliminarEstTab").removeClass("d-none");
                    setStockEstTabDisponibleCg(true);
                    CG.hubActivo = "est";
                    await cargarHubEstablecimientoCg(true);
                }
            },
            onDeleted: async () => {
                CG.establecimientoSelId = 0;
                CG.establecimientoSelIds = [];
                syncEstablecimientoSelStateCg();
                limpiarHubEstablecimientoCg();
                setStockEstTabDisponibleCg(false);
                CG.tabsLoaded.establecimientos = false;
                await cargarTabEstablecimientos();
            },
            onClosed: () => {
                CG.establecimientoSelId = 0;
                resaltarListaEstablecimientoCg(0);
                $("#btnEliminarEstTab").addClass("d-none");
            },
            onOpen: async (modo, modalInst, modelo) => {
                const idEst = Number(modelo?.Id || 0);
                if (idEst > 0) {
                    CG.establecimientoSelId = idEst;
                    resaltarListaEstablecimientoCg(idEst);
                    $("#btnEliminarEstTab").removeClass("d-none");
                    setStockEstTabDisponibleCg(true);
                    if ($("#tabBtnStockEst").hasClass("active")) {
                        CG.hubActivo = "est";
                        await cargarHubEstablecimientoCg(true);
                    }
                } else {
                    // Alta: sin selección previa ni datos de control/pagos de otro establecimiento
                    CG.establecimientoSelIds = [];
                    CG.establecimientoSelId = 0;
                    syncEstablecimientoSelStateCg();
                    limpiarHubEstablecimientoCg();
                    setStockEstTabDisponibleCg(false);
                    $("#btnEliminarEstTab").addClass("d-none");
                }
            }
        });
    }

    if (typeof initContratoModal === "function") {
        CG.contratoModal = initContratoModal({
            token: token,
            onSaved: async () => {
                CG.tabsLoaded.contratos = false;
                if ($("#tabContratos").hasClass("active") || $("#tabContratos").hasClass("show")) {
                    await cargarTabContratos();
                }
            },
            onDeleted: async () => {
                CG.tabsLoaded.contratos = false;
                if ($("#tabContratos").hasClass("active") || $("#tabContratos").hasClass("show")) {
                    await cargarTabContratos();
                }
            }
        });
    }

    const modalEl = document.getElementById("modalCobroCg");
    if (modalEl) CG.modalCobro = new bootstrap.Modal(modalEl);

    const modalCmEl = document.getElementById("modalControlMensualCg");
    if (modalCmEl) CG.modalControlMensual = new bootstrap.Modal(modalCmEl);

    const modalInteresEl = document.getElementById("modalInteresCg");
    if (modalInteresEl) CG.modalInteres = new bootstrap.Modal(modalInteresEl);

    const modalInteresesHistEl = document.getElementById("modalInteresesHistCg");
    if (modalInteresesHistEl) CG.modalInteresesHist = new bootstrap.Modal(modalInteresesHistEl);

    const modalContactoEl = document.getElementById("modalContactoCg");
    if (modalContactoEl) CG.modalContacto = new bootstrap.Modal(modalContactoEl);

    $h("cgCmSinEntrega").on("change", syncSinEntregaUiCg);
}

function wireEventosCg() {
    $("#btnGuardarClienteCg").on("click", busyHandler(guardarClienteCg));
    $("#btnEliminarClienteCg").on("click", busyHandler(eliminarClienteCg));
    $("#btnCerrarErrorCg").on("click", cerrarErrorCg);

    $("#cgActivo").on("change", function () {
        $("#lblActivoCg").text(this.checked ? "Activo" : "Inactivo");
    });

    $("#cgMotivo").on("change", function () {
        $("#wrapMotivoDetalle").prop("hidden", !$(this).val());
    });

    $("#cgProvincia").on("change", actualizarCodigoProvinciaCg);

    $('button[data-cg-tab]').on("shown.bs.tab", async function () {
        const tab = $(this).data("cgTab");
        await cargarTabCg(tab);
        if (debeMostrarTablaCg()) {
            RpGridView.programarAjuste();
        }
    });

    $("#btnGuardarContactoCg").on("click", busyHandler(guardarContactoCg));
    $("#btnNuevoContactoCg").on("click", abrirModalNuevoContactoCg);

    $("#cgListaContactos").on("click", function (e) {
        const btnDel = e.target.closest(".btn-eliminar-contacto-cg");
        if (btnDel) {
            e.stopPropagation();
            eliminarContactoCg(Number(btnDel.dataset.id));
            return;
        }
        const btnEdit = e.target.closest(".btn-editar-contacto-cg");
        if (btnEdit) {
            e.stopPropagation();
            abrirModalEditarContactoCg(Number(btnEdit.dataset.id));
            return;
        }
    });

    $("#btnNuevoEstablecimientoCg, #btnNuevoEstTab").on("click", abrirNuevoEstablecimientoCg);
    $("#btnEliminarEstTab").on("click", async () => {
        if (CG.establecimientoSelIds?.length !== 1) return;
        await eliminarEstablecimientoCg(CG.establecimientoSelIds[0]);
    });
    $("#btnEstSelTodos").on("click", () => seleccionarTodosEstablecimientosCg());
    $("#cgEstList").on("click", ".cg-est-pill", function (e) {
        e.preventDefault();
        const id = Number($(this).data("id")) || 0;
        if (!id) return;
        toggleEstablecimientoSelCg(id, { exclusive: e.shiftKey });
    });
    $(document).on("click", "#tabBtnDatosEst.disabled, #tabBtnContactosEst.disabled, #tabBtnProductosEst.disabled", function (e) {
        e.preventDefault();
        e.stopPropagation();
    });
    $(document).on("shown.bs.tab", "#tabBtnStockEst", () => {
        CG.hubActivo = "est";
        if (idsEstablecimientoSeleccionadosCg().length > 0) {
            cargarHubEstablecimientoCg(true);
        } else {
            limpiarHubEstablecimientoCg();
        }
    });
    $(document).on("click", "#tabBtnStockEst.disabled, #tabBtnStockEst.cg-est-tab-locked", function (e) {
        e.preventDefault();
        e.stopPropagation();
    });
    $(document).on("shown.bs.tab", "#tabBtnDatosEst, #tabBtnContactosEst, #tabBtnProductosEst", () => {
        CG.hubActivo = "cliente";
    });
    $(document).on("shown.bs.tab", "#tabBtnEstablecimientos", () => {
        if (idsEstablecimientoSeleccionadosCg().length > 0) {
            aplicarSeleccionEstablecimientosCg();
        }
    });
    $(document).on("hidden.bs.tab", "#tabBtnEstablecimientos", () => {
        CG.hubActivo = "cliente";
    });
    $("#btnNuevoContratoCg, #btnNuevoContratoTab").on("click", abrirNuevoContratoCg);
    $("#btnRegistrarCobroCg, #btnRegistrarCobroTab").on("click", abrirModalCobroCg);
    $("#btnConfirmarCobroCg").on("click", busyHandler(confirmarCobroCg));
    $("#btnRefreshCcCg").on("click", () => cargarTabCuentaCorriente(true));
    $h("btnRefreshControlMensual").on("click", () => cargarHubDatosCg(true));
    $h("cgHubOperativo").on("click", ".cg-cm-chip", function () {
        toggleFiltroControlCg($(this).data("tipo"), parseInt($(this).data("val"), 10));
    });
    $(".cg-preset-meses").on("click", function () {
        aplicarPresetMesesCg($(this).data("meses"));
        cargarTabControlMensual(true);
    });
    $("#btnControlAniosRecientes").on("click", () => {
        aplicarPresetAniosRecientesCg();
        cargarTabControlMensual(true);
    });
    $h("btnGuardarControlMensualCg").on("click", busyHandler(guardarVisitaUnificadaCg));
    $h("cgControlMensualBody").on("click", "tr[data-mes]", function (e) {
        if ($(e.target).closest(".cg-cm-int-eye").length) return;
        const anio = Number($(this).data("anio"));
        const mes = Number($(this).data("mes"));
        abrirWorkspaceMesCg(anio, mes);
    });
    $h("cgCards_controlMensual").on("click", "article[data-mes]", function (e) {
        if ($(e.target).closest(".cg-cm-int-eye").length) return;
        const anio = Number($(this).data("anio"));
        const mes = Number($(this).data("mes"));
        abrirWorkspaceMesCg(anio, mes);
    });
    $(document).on("click", "#cgAtrasosAlert .cg-atraso-chip, #cgEstAtrasosAlert .cg-atraso-chip", function () {
        syncHubActivoFromElCg(this);
        const anio = Number($(this).data("anio"));
        const mes = Number($(this).data("mes"));
        abrirWorkspaceMesCg(anio, mes);
        const bodyId = mapHubDomIdCg("cgControlMensualBody");
        const row = document.querySelector(`#${bodyId} tr[data-anio="${anio}"][data-mes="${mes}"]`);
        row?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    $(document).on("click", "#btnAtrasosToggleLista, #btnEstAtrasosToggleLista", function () {
        syncHubActivoFromElCg(this);
        const $lista = $h("cgAtrasosLista");
        const abierto = !$lista.hasClass("is-collapsed");
        $lista.toggleClass("is-collapsed", abierto);
        $(this).attr("aria-expanded", abierto ? "false" : "true");
        $(this).text(abierto ? "Ver lista" : "Ocultar");
    });
    $h("btnCerrarMesDetail").on("click", () => {
        $h("cgHubMesDetail").prop("hidden", true);
        setHubPropCg("hubMesSel", null);
        setHubPropCg("wsLineas", []);
        setHubPropCg("wsCobros", []);
        $("#cgControlMensualBody tr").removeClass("is-selected");
        actualizarChipsAtrasosSeleccionCg(-1, -1);
    });
    $h("btnInteresMesHub").on("click", () => {
        if (hubPropCg("hubMesSel")) abrirModalInteresCg(hubPropCg("hubMesSel").anio, hubPropCg("hubMesSel").mes);
    });
    $h("btnVerInteresesMesHub").on("click", () => {
        if (hubPropCg("hubMesSel")) abrirModalInteresesHistCg(hubPropCg("hubMesSel").anio, hubPropCg("hubMesSel").mes);
    });
    $h("btnVerInteresesCg").on("click", () => abrirModalInteresesHistCg(null, null));
    $(document).on("click", ".cg-cm-int-eye", function (e) {
        e.preventDefault();
        e.stopPropagation();
        syncHubActivoFromElCg(this);
        const anio = Number($(this).data("anio"));
        const mes = Number($(this).data("mes"));
        if (!anio || !mes) return;
        abrirModalInteresesHistCg(anio, mes);
    });
    $h("cgCmSinEntrega").on("change", syncSinEntregaUiCg);
    $h("cgCmFechaVisita").on("change", function () {
        $h("cgWsFechaEntrega").val($(this).val() || "");
    });
    $h("btnWsAgregarLinea").on("click", () => agregarLineaWsCg());
    $h("btnWsAgregarCobro").on("click", () => agregarCobroWsCg());
    $h("btnWsCobroMes").on("click", () => {
        const fechaVisita = $h("cgCmFechaVisita").val();
        abrirModalCobroCg();
        if (fechaVisita) $("#cgCobroFecha").val(fechaVisita);
    });
    $h("cgWsCobrosBody").on("click", ".btn-ws-quitar-cobro", function () {
        const key = Number($(this).data("key"));
        setHubPropCg("wsCobros", (hubPropCg("wsCobros") || []).filter(c => Number(c._key) !== key));
        renderCobrosWsCg();
    });
    // Cliente + Establecimientos (clon cgEst*): importe solo tras cuenta
    $(document).on("change", "#cgWsCobrosBody .ws-cobro-cuenta, #cgEstWsCobrosBody .ws-cobro-cuenta", function () {
        const $row = $(this).closest(".cg-ws-cobro-row");
        syncImporteHabilitadoCobroWsCg($row);
        sincronizarCobrosWsDesdeDomCg();
        actualizarResumenCobrosWsCg();
    });
    $h("cgWsCobrosBody").on("change input", "input:not(.ws-cobro-cuenta), select:not(.ws-cobro-cuenta)", function () {
        sincronizarCobrosWsDesdeDomCg();
        actualizarResumenCobrosWsCg();
    });
    $("#cgCobroCuenta").on("change", function () {
        syncImporteHabilitadoModalCobroCg();
    });
    instalarBloqueoImporteSinCuentaCg();
    syncImporteHabilitadoModalCobroCg();
    $h("cgWsEstablecimiento").on("change", async function () {
        await cargarSugeridosWsCg(Number($(this).val()) || null);
    });
    $h("cgWsSugeridos").on("click", ".cg-ws-chip", function () {
        const idx = Number($(this).data("idx"));
        const s = CG.wsSugeridos[idx];
        if (s) agregarLineaWsCg({
            IdProducto: s.IdProducto,
            IdListaPrecio: s.IdListaPrecio || 0,
            TipoMovimiento: 1,
            Cantidad: s.Cantidad || 1,
            PrecioVenta: 0
        });
    });
    $h("cgWsLineasBody").on("click", ".btn-ws-quitar", function () {
        const idx = Number($(this).data("idx"));
        if (Number.isNaN(idx)) return;
        hubPropCg("wsLineas").splice(idx, 1);
        renderLineasWsCg();
        actualizarResumenCobrosWsCg();
    });
    $h("cgWsLineasBody").on("change input", "select, input", async function () {
        const idx = Number($(this).closest(".cg-ws-linea").data("idx"));
        const linea = hubPropCg("wsLineas")[idx];
        if (!linea) return;
        const $row = $(this).closest(".cg-ws-linea");
        const campo = $(this).hasClass("ws-prod") ? "prod"
            : $(this).hasClass("ws-lista") ? "lista"
            : $(this).hasClass("ws-tipo") ? "tipo"
            : "otro";

        linea.IdProducto = Number($row.find(".ws-prod").val()) || 0;
        linea.IdListaPrecio = Number($row.find(".ws-lista").val()) || 0;
        linea.TipoMovimiento = Number($row.find(".ws-tipo").val()) || 1;
        linea.Cantidad = leerNumeroWsCg($row.find(".ws-cant").val());
        linea.PrecioVenta = leerNumeroWsCg($row.find(".ws-precio").val());

        await sincronizarPrecioLineaWsCg($row, linea, campo);

        $row.find(".ws-sub").text(fmtMoneyCg(linea.Cantidad * linea.PrecioVenta));
        actualizarResumenCobrosWsCg();
        actualizarAlertaDuplicadosLineasWsCg();
    });
    $h("cgCmSinEntrega").on("change", syncSinEntregaUiCg);
    $("#cgInteresPct").on("input change", recalcularImporteInteresCg);
    $("#btnConfirmarInteresCg").on("click", busyHandler(confirmarInteresCg));

    $(document).on("click", "#cgHubEntregasList .cg-hub-entrega-toggle, #cgTabEntregasList .cg-hub-entrega-toggle, #cgEstHubEntregasList .cg-hub-entrega-toggle", function (e) {
        e.preventDefault();
        e.stopPropagation();
        syncHubActivoFromElCg(this);
        toggleHubEntregaDetalle(Number($(this).closest(".cg-hub-entrega-row").data("id")));
    });
    $(document).on("click", "#cgHubEntregasList .cg-hub-entrega-row, #cgTabEntregasList .cg-hub-entrega-row, #cgEstHubEntregasList .cg-hub-entrega-row", function (e) {
        if ($(e.target).closest("a, button, .cg-hub-entrega-edit, .cg-hub-entrega-toggle").length) return;
        syncHubActivoFromElCg(this);
        toggleHubEntregaDetalle(Number($(this).data("id")));
    });
    $(document).on("click", "#cgHubEntregasList .cg-hub-entrega-edit, #cgTabEntregasList .cg-hub-entrega-edit, #cgEstHubEntregasList .cg-hub-entrega-edit", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const idEntrega = Number(
            $(this).attr("data-id-entrega")
            || $(this).data("id-entrega")
            || $(this).closest(".cg-hub-entrega-row").attr("data-id")
            || $(this).closest(".cg-hub-entrega-row").data("id")
        ) || 0;
        const href = idEntrega > 0
            ? API_CG.entregaNuevoModif(idEntrega, CG.id, true)
            : ($(this).attr("href") || "");
        if (!href || href === "#" || idEntrega <= 0) {
            if (typeof errorModal === "function") errorModal("No se pudo identificar la entrega a abrir.");
            return;
        }
        window.location.assign(href);
    });
    $("#btnRefreshEntregasTab").on("click", () => cargarHubEntregasCg(true));

    initFiltrosControlCg();
    initViewModeCg();

    document.addEventListener("configuracionActualizada", async (e) => {
        const tipo = e.detail?.tipo;
        const nuevoId = e.detail?.nuevoId;

        const map = {
            Sucursales: "#cgSucursal",
            Provincias: "#cgProvincia",
            ClientesProfesiones: "#cgProfesion",
            CondicionesIva: "#cgCondicionIva",
            ClientesEstados: "#cgEstado",
            ClientesMotivos: "#cgMotivo",
            ClientesCalificaciones: "#cgCalificacion",
            ClientesTiposGenerador: "#cgTipoGenerador"
        };
        const sel = map[tipo];
        if (sel) {
            await recargarComboCg(sel, nuevoId, tipo === "ClientesTiposGenerador" ? "Etiqueta" : "Nombre");
            return;
        }
    });
}

function initSelect2Cg() {
    const opts = { width: "100%", allowClear: true, placeholder: "Seleccionar" };
    ["#cgSucursal", "#cgProvincia", "#cgProfesion",
        "#cgCondicionIva", "#cgEstado", "#cgMotivo", "#cgCalificacion", "#cgTipoGenerador", "#cgCobroCuenta",
        ...CG_REC_CAMION_SELECTORS,
        "#cgRecSemana"].forEach(sel => {
        ensureSelect2Cg($(sel), opts);
    });
}

function ensureSelect2Cg($el, opts) {
    if (!$el?.length) return;
    if ($el.data("select2")) $el.select2("destroy");
    const merged = Object.assign({ width: "100%", allowClear: true }, opts || {});
    // Select2 appendeado al body queda detrás de .modal (z-index ~10M); anclar al modal.
    if (!merged.dropdownParent) {
        const $modal = $el.closest(".modal");
        if ($modal.length) merged.dropdownParent = $modal;
    }
    $el.select2(merged);
}

async function fetchJsonCg(url, options = {}) {
    const r = await fetch(url, options);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
}

async function llenarComboCg(selector, url, selectedId, textField = "Nombre", cacheKey = null) {
    const $sel = $(selector);
    $sel.empty().append(new Option("Seleccionar", ""));
    try {
        const data = await fetchJsonCg(url, { headers: authCg() });
        if (cacheKey) {
            CG.geoCache[cacheKey] = data || [];
        }
        (data || []).forEach(x => $sel.append(new Option(x[textField] || x.Nombre, x.Id)));
    } catch (e) {
        console.warn(`No se pudo cargar combo ${selector}:`, e);
        $sel.append(new Option("-", ""));
    }
    if (selectedId) $sel.val(String(selectedId)).trigger("change");
    else $sel.trigger("change");
}

function poblarSelectCamionesCg($sel, camiones, selectedId) {
    $sel.empty().append(new Option("Sin asignar", ""));
    (camiones || []).forEach(x => $sel.append(new Option(x.Nombre, x.Id)));
    if (selectedId) $sel.val(String(selectedId)).trigger("change");
    else $sel.val("").trigger("change");
}

function actualizarCodigoProvinciaCg() {
    const idProv = intOrNullCg("#cgProvincia");
    const prov = (CG.geoCache.provincias || []).find(x => x.Id === idProv);
    $("#cgCodProvincia").val(prov?.Codigo ?? "");
}

async function recargarComboCg(selector, nuevoId, textField = "Nombre") {
    const mapUrl = {
        "#cgSucursal": API_CG.sucursales,
        "#cgProvincia": API_CG.provincias,
        "#cgProfesion": API_CG.profesiones,
        "#cgCondicionIva": API_CG.condicionesIva,
        "#cgEstado": API_CG.estados,
        "#cgMotivo": API_CG.motivos,
        "#cgCalificacion": API_CG.calificaciones,
        "#cgTipoGenerador": API_CG.tiposGenerador
    };
    const url = mapUrl[selector];
    if (!url) return;
    const val = $(selector).val();
    await llenarComboCg(selector, url, nuevoId || val, textField);
}

async function cargarCombosRecoleccionCg() {
    const emptyOpt = { placeholder: "Seleccionar", allowClear: true };
    let camiones = [];
    try {
        camiones = await fetchJsonCg(API_CG.camiones, { headers: authCg() }) || [];
    } catch (e) {
        console.warn("No se pudo cargar camiones:", e);
    }

    CG_REC_CAMION_SELECTORS.forEach(sel => poblarSelectCamionesCg($(sel), camiones));
    await Promise.all([
        llenarComboCg("#cgRecSemana", API_CG.semanas, null, "Nombre")
    ]);
    [...CG_REC_CAMION_SELECTORS, "#cgRecSemana"].forEach(sel => {
        ensureSelect2Cg($(sel), sel.startsWith("#cgRecCamion") ? { placeholder: "Sin asignar", allowClear: true } : emptyOpt);
    });
}

function parseHorarioCg(val) {
    if (!val) return "";
    const s = String(val);
    return s.length >= 5 ? s.substring(0, 5) : s;
}

async function cargarRecoleccionPrincipalCg() {
    if (CG.id <= 0) return;

    limpiarRecoleccionCg();
    CG.idDiaRecoleccionLegacy = 0;

    try {
        const [r] = await Promise.all([
            fetchJsonCg(API_CG.recoleccionPrincipal(CG.id), { headers: authCg() }),
            cargarRecorridosAsignadosCg()
        ]);
        if (!r?.IdEstablecimiento) return;

        CG.idDiaRecoleccionLegacy = r.IdDiaRecoleccion || 0;
        $("#cgEstId").val(r.IdEstablecimiento);
        $("#cgIdEstablecimientoCliente").val(r.IdEstablecimientoCliente || "");
        $("#cgDiasHorarios").val(r.DiasHorarios || "");

        if (r.IdSemanaRecoleccion) $("#cgRecSemana").val(String(r.IdSemanaRecoleccion)).trigger("change");
        if (r.OrdenRecorrido != null) $("#cgOrdenRecorrido").val(r.OrdenRecorrido);
        if (r.Kilos != null) $("#cgEstKilos").val(r.Kilos);
        if (r.IdTipoGenerador) $("#cgTipoGenerador").val(String(r.IdTipoGenerador)).trigger("change");

        const diasMap = {};
        (r.DiasSemana || r.DiasAdicionales || []).forEach(d => {
            if (d?.IdDia >= 1 && d.IdDia <= 7) diasMap[d.IdDia] = d.IdCamion;
        });
        if (r.IdDiaRecoleccion >= 1 && r.IdDiaRecoleccion <= 7 && r.IdCamion) {
            diasMap[r.IdDiaRecoleccion] = r.IdCamion;
        }

        CG_DIAS_SEMANA.forEach(d => {
            const camionId = diasMap[d.id];
            if (camionId) $(`#cgRecCamion${d.id}`).val(String(camionId)).trigger("change");
        });
    } catch (e) {
        console.warn("No se pudo cargar recoleccion principal:", e);
    }
}

function limpiarRecoleccionCg() {
    $("#cgEstId, #cgIdEstablecimientoCliente, #cgDiasHorarios, #cgOrdenRecorrido, #cgEstKilos").val("");
    CG_REC_CAMION_SELECTORS.forEach(sel => $(sel).val("").trigger("change"));
    $("#cgRecSemana").val("").trigger("change");
    CG.idDiaRecoleccionLegacy = 0;
}

function obtenerDiasSemanaRecoleccionCg() {
    const dias = [];
    CG_DIAS_SEMANA.forEach(d => {
        const idCamion = intOrNullCg(`#cgRecCamion${d.id}`);
        if (idCamion) dias.push({ IdDia: d.id, IdCamion: idCamion });
    });
    return dias;
}

function resolverDiaPrincipalRecoleccionCg(diasSemana) {
    if (!diasSemana.length) {
        return { idDia: CG.idDiaRecoleccionLegacy || 0, idCamion: null, extras: [] };
    }

    const ordenados = [...diasSemana].sort((a, b) => a.IdDia - b.IdDia);
    const legacy = ordenados.find(d => d.IdDia === CG.idDiaRecoleccionLegacy);
    const principal = legacy || ordenados[0];
    const extras = ordenados.filter(d => d.IdDia !== principal.IdDia);
    return { idDia: principal.IdDia, idCamion: principal.IdCamion, extras };
}

function obtenerModeloRecoleccionCg() {
    const diasSemana = obtenerDiasSemanaRecoleccionCg();
    const { idDia, idCamion, extras } = resolverDiaPrincipalRecoleccionCg(diasSemana);

    const kilosVal = ($("#cgEstKilos").val() || "").trim();
    const kilos = kilosVal === "" ? null : parseFloat(kilosVal.replace(",", "."));

    return {
        IdCliente: CG.id,
        IdEstablecimiento: parseInt($("#cgEstId").val(), 10) || 0,
        IdEstablecimientoCliente: ($("#cgIdEstablecimientoCliente").val() || "").trim() || null,
        IdDiaRecoleccion: idDia || 0,
        IdSemanaRecoleccion: intOrNullCg("#cgRecSemana") || 0,
        IdCamion: idCamion,
        IdListaPrecio: 0,
        DiasHorarios: ($("#cgDiasHorarios").val() || "").trim() || null,
        OrdenRecorrido: intOrNullCg("#cgOrdenRecorrido"),
        Kilos: Number.isNaN(kilos) ? null : kilos,
        IdTipoGenerador: intOrNullCg("#cgTipoGenerador"),
        DiasSemana: diasSemana,
        DiasAdicionales: extras
    };
}

function tieneDatosRecoleccionCg() {
    const m = obtenerModeloRecoleccionCg();
    return !!(m.DiasSemana?.length || m.IdSemanaRecoleccion
        || m.DiasHorarios || m.IdEstablecimientoCliente || m.OrdenRecorrido || m.Kilos != null || m.IdTipoGenerador);
}

function marcarDiasEnRutaCg(items) {
    const diasEnRuta = new Set(
        (items || []).filter(r => r.Activo !== false).map(r => r.IdDia)
    );

    CG_DIAS_SEMANA.forEach(d => {
        const $el = $(`#cgRecEnRuta${d.id}`);
        if (!$el.length) return;
        $el.html(diasEnRuta.has(d.id)
            ? '<span class="badge bg-success">Si</span>'
            : '<span class="text-muted">No</span>');
    });
}

async function cargarRecorridosAsignadosCg() {
    if (CG.id <= 0) {
        marcarDiasEnRutaCg([]);
        renderRecorridosCg([], false, "#cgRecorridosAsignados");
        return;
    }

    try {
        const items = await fetchJsonCg(API_CG.recorridosPorCliente(CG.id), { headers: authCg() });
        marcarDiasEnRutaCg(items || []);
        renderRecorridosCg(items || [], false, "#cgRecorridosAsignados");
    } catch (e) {
        console.warn("Recorridos asignados no disponibles:", e);
        marcarDiasEnRutaCg([]);
        renderRecorridosCg([], true, "#cgRecorridosAsignados");
    }
}

async function guardarRecoleccionPrincipalCg() {
    if (CG.id <= 0 || !tieneDatosRecoleccionCg()) return { ok: true };

    try {
        const data = await fetchJsonCg(API_CG.recoleccionPrincipalGuardar, {
            method: "PUT",
            headers: authCg(),
            body: JSON.stringify(obtenerModeloRecoleccionCg())
        });

        if (data?.idEstablecimiento) {
            $("#cgEstId").val(data.idEstablecimiento);
        }

        if (data?.valor) {
            await cargarRecorridosAsignadosCg();
        }

        return { ok: !!data?.valor, mensaje: data?.mensaje };
    } catch (e) {
        console.warn("No se pudo guardar recoleccion principal:", e);
        return { ok: false, mensaje: "No se pudo guardar la recoleccion del establecimiento principal." };
    }
}

async function cargarCombosDatosCg() {
    await Promise.all([
        llenarComboCg("#cgSucursal", API_CG.sucursales),
        llenarComboCg("#cgProvincia", API_CG.provincias, null, "Nombre", "provincias"),
        llenarComboCg("#cgProfesion", API_CG.profesiones),
        llenarComboCg("#cgCondicionIva", API_CG.condicionesIva),
        llenarComboCg("#cgEstado", API_CG.estados),
        llenarComboCg("#cgMotivo", API_CG.motivos),
        llenarComboCg("#cgCalificacion", API_CG.calificaciones),
        llenarComboCg("#cgTipoGenerador", API_CG.tiposGenerador, null, "Etiqueta")
    ]);

    const $suc = $("#cgSucursal");
    if (typeof aplicarBloqueoSucursalUnica === "function") {
        aplicarBloqueoSucursalUnica($suc, { triggerChange: false });
    } else if (typeof usuarioTieneUnicaSucursal === "function" && usuarioTieneUnicaSucursal()) {
        const def = typeof getIdSucursalDefaultUsuario === "function" ? getIdSucursalDefaultUsuario() : null;
        if (def) $suc.val(String(def)).trigger("change");
    }

    if (!CG.cuentas.length) {
        CG.cuentas = await fetchJsonCg(API_CG.cuentas, { headers: authCg() }) || [];
        const $c = $("#cgCobroCuenta").empty().append(new Option("Seleccionar", ""));
        CG.cuentas.forEach(x => $c.append(new Option(x.Nombre, x.Id)));
        ensureSelect2Cg($c, { placeholder: "Seleccionar" });
    }
}

function refreshSelect2Cg($el) {
    if (!$el?.length) return;
    if ($el.data("select2")) $el.trigger("change.select2");
}

async function cargarClienteCg(id) {
    try {
        const m = await fetchJsonCg(API_CG.editar(id), { headers: authCg() });
        CG.modelo = m;
        CG.id = m.Id;
        $("#cgId").val(m.Id);

        $("#cgNombre").val(m.Nombre || "");
        $("#cgCuit").val(m.Cuit || "");
        $("#cgTelefono").val(m.Telefono || "");
        $("#cgTelefonoAlt").val(m.TelefonoAlt || "");
        $("#cgEmail").val(m.Email || "");
        $("#cgCalle").val(m.Calle || m.Domicilio || "");
        $("#cgNumero").val(m.Numero || "");
        $("#cgPisoDepto").val(m.PisoDepartamento || "");
        $("#cgCodPostal").val(m.CodPostal || "");
        $("#cgMotivoDetalle").val(m.MotivoDetalle || "");
        $("#cgNumeroCliente").val(m.NumeroCliente ?? "");
        $("#cgFechaInicio").val(fechaInputCg(m.FechaInicio));
        $("#cgFechaLicenciaDesde").val(fechaInputCg(m.FechaLicenciaDesde));
        $("#cgFechaLicenciaHasta").val(fechaInputCg(m.FechaLicenciaHasta));
        $("#cgActivo").prop("checked", m.Activo !== false);
        $("#lblActivoCg").text(m.Activo !== false ? "Activo" : "Inactivo");

        if (m.IdSucursal) $("#cgSucursal").val(String(m.IdSucursal)).trigger("change");
        if (m.IdProfesion) $("#cgProfesion").val(String(m.IdProfesion)).trigger("change");
        if (m.IdCondicionIva) $("#cgCondicionIva").val(String(m.IdCondicionIva)).trigger("change");
        if (m.IdEstado) $("#cgEstado").val(String(m.IdEstado)).trigger("change");
        if (m.IdMotivo) {
            $("#cgMotivo").val(String(m.IdMotivo)).trigger("change");
            $("#wrapMotivoDetalle").prop("hidden", false);
        }
        if (m.IdCalificacion) $("#cgCalificacion").val(String(m.IdCalificacion)).trigger("change");
        if (m.IdTipoGenerador) $("#cgTipoGenerador").val(String(m.IdTipoGenerador)).trigger("change");

        if (m.IdProvincia) {
            $("#cgProvincia").val(String(m.IdProvincia));
            refreshSelect2Cg($("#cgProvincia"));
        }
        actualizarCodigoProvinciaCg();

        setAuditoriaCg(m);
        actualizarHeaderCg(m.Nombre || "Cliente", m.Cuit ? `CUIT ${m.Cuit}` : "");
        actualizarEnlacesAccionCg();
        $("#btnEliminarClienteCg").prop("hidden", false);
        $("#lblGuardarClienteCg").text("Guardar");
    } catch (e) {
        console.error(e);
        if (typeof errorModal === "function") {
            errorModal("No se pudo cargar la informacion del cliente. Intente nuevamente o vuelva al listado.");
        }
    }
}

function actualizarHeaderCg(titulo, subtitulo) {
    $("#cgTituloCliente").text(titulo || "Cliente");
    const $sub = $("#cgSubtituloCliente");
    if (subtitulo) {
        $sub.text(subtitulo).removeClass("d-none");
    } else {
        $sub.text("").addClass("d-none");
    }
}

function actualizarEnlacesAccionCg() {
    if (CG.id <= 0) return;
    const urlNuevaEntrega = API_CG.entregaNuevoModif(0, CG.id, true);
    const urlListaEntregas = API_CG.entregaIndex(CG.id);

    $("#btnNuevaEntregaCg, #btnNuevaEntregaTab")
        .attr("href", urlNuevaEntrega)
        .removeAttr("hidden")
        .prop("hidden", false);

    $("#btnNuevaEntregaHub, #btnVerTodasEntregas, #btnVerModuloEntregasTab, #btnWsAbrirModuloEntregas")
        .attr("href", urlListaEntregas)
        .removeAttr("hidden")
        .prop("hidden", false);

    $("#btnNuevoEstablecimientoCg, #btnNuevoContratoCg").prop("hidden", false);
    $("#btnNuevoContactoCg").prop("disabled", false);
    $h("cgHubOperativo").prop("hidden", false);
}

function habilitarTabsRelacionados(habilitar) {
    const tabs = ["establecimientos", "contratos", "cuentaCorriente", "entregas"];
    tabs.forEach(t => {
        $(`button[data-cg-tab="${t}"]`).prop("disabled", !habilitar);
    });
}

function setAuditoriaCg(m) {
    const wrap = $("#cgAuditoria");
    $("#cgInfoRegistro, #cgInfoModificacion").empty();
    wrap.addClass("d-none");
    if (!m) return;

    if (m.UsuarioModifica && m.FechaUsuarioModifica) {
        $("#cgInfoModificacion").html(`
            <div class="rp-auditoria-item"><i class="fa fa-edit"></i>
            Ultima modificacion por <strong>${m.UsuarioModifica}</strong>
            el <strong>${formatearFechaCg(m.FechaUsuarioModifica)}</strong></div>`);
        wrap.removeClass("d-none");
    } else if (m.UsuarioRegistra && m.FechaUsuarioRegistra) {
        $("#cgInfoRegistro").html(`
            <div class="rp-auditoria-item"><i class="fa fa-user"></i>
            Registrado por <strong>${m.UsuarioRegistra}</strong>
            el <strong>${formatearFechaCg(m.FechaUsuarioRegistra)}</strong></div>`);
        wrap.removeClass("d-none");
    }
}

function formatearFechaCg(f) {
    try { return new Date(f).toLocaleString("es-AR"); } catch { return f; }
}

function fechaInputCg(f) {
    if (!f) return "";
    try {
        const d = new Date(f);
        if (Number.isNaN(d.getTime())) return "";
        return d.toISOString().slice(0, 10);
    } catch { return ""; }
}

function parseFechaCg(val) {
    if (!val) return null;
    return val;
}

function estaEnPeriodoLicenciaCg(desdeStr, hastaStr) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const desde = desdeStr ? new Date(`${desdeStr}T00:00:00`) : null;
    const hasta = hastaStr ? new Date(`${hastaStr}T00:00:00`) : null;

    if (desde && hasta) return hoy >= desde && hoy <= hasta;
    if (desde) return hoy >= desde;
    if (hasta) return hoy <= hasta;
    return false;
}

function aplicarEstadoLicenciaCg() {
    const desde = $("#cgFechaLicenciaDesde").val();
    const hasta = $("#cgFechaLicenciaHasta").val();
    if (!desde && !hasta) return;
    if (!estaEnPeriodoLicenciaCg(desde, hasta)) return;

    const $est = $("#cgEstado");
    const opt = $est.find("option").filter(function () {
        return String($(this).text()).toLowerCase().includes("licencia");
    }).first();

    if (opt.length) {
        $est.val(opt.val()).trigger("change");
    }
}

function obtenerModeloCg() {
    return {
        Id: CG.id || 0,
        IdSucursal: parseInt($("#cgSucursal").val(), 10) || 0,
        Nombre: ($("#cgNombre").val() || "").trim(),
        Cuit: ($("#cgCuit").val() || "").trim(),
        Telefono: $("#cgTelefono").val() || null,
        TelefonoAlt: $("#cgTelefonoAlt").val() || null,
        Email: $("#cgEmail").val() || null,
        Calle: ($("#cgCalle").val() || "").trim() || null,
        Numero: ($("#cgNumero").val() || "").trim() || null,
        PisoDepartamento: ($("#cgPisoDepto").val() || "").trim() || null,
        IdTipoGenerador: intOrNullCg("#cgTipoGenerador"),
        CodPostal: $("#cgCodPostal").val() || null,
        IdProvincia: intOrNullCg("#cgProvincia"),
        IdProfesion: intOrNullCg("#cgProfesion"),
        IdCondicionIva: intOrNullCg("#cgCondicionIva"),
        IdEstado: intOrNullCg("#cgEstado"),
        IdMotivo: intOrNullCg("#cgMotivo"),
        MotivoDetalle: ($("#cgMotivoDetalle").val() || "").trim() || null,
        IdCalificacion: intOrNullCg("#cgCalificacion"),
        NumeroCliente: intOrNullCg("#cgNumeroCliente"),
        FechaInicio: parseFechaCg($("#cgFechaInicio").val()),
        FechaLicenciaDesde: parseFechaCg($("#cgFechaLicenciaDesde").val()),
        FechaLicenciaHasta: parseFechaCg($("#cgFechaLicenciaHasta").val()),
        Activo: $("#cgActivo").is(":checked")
    };
}

function intOrNullCg(sel) {
    const v = $(sel).val();
    if (!v) return null;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
}

function validarDatosCg() {
    const m = obtenerModeloCg();
    if (!m.Nombre || !m.Cuit || !m.IdSucursal) {
        mostrarErrorCg("Complete Nombre, CUIT y Sucursal.");
        return false;
    }
    return true;
}

async function guardarClienteCg() {
    if (!validarDatosCg()) return;
    aplicarEstadoLicenciaCg();
    const m = obtenerModeloCg();
    const esNuevo = !m.Id;
    const url = esNuevo ? API_CG.insertar : API_CG.actualizar;
    const method = esNuevo ? "POST" : "PUT";

    try {
        const data = await fetchJsonCg(url, {
            method,
            headers: authCg(),
            body: JSON.stringify(m)
        });

        if (!data?.valor) {
            mostrarErrorCg(data?.mensaje || "No se pudo guardar.");
            return;
        }

        cerrarErrorCg();

        if (esNuevo && data.id) {
            CG.id = data.id;
            await guardarRecoleccionPrincipalCg();
            window.location.href = `/Clientes/Gestion?id=${data.id}`;
            return;
        }

        await cargarClienteCg(m.Id);
        await guardarRecoleccionPrincipalCg();
        await cargarRecorridosAsignadosCg();

        if (typeof modalGuardadoConSalida === "function") {
            await modalGuardadoConSalida({
                titulo: "Cliente actualizado",
                mensaje: data.mensaje || "Cliente modificado correctamente",
                pregunta: "¿Deseas volver al listado de clientes?",
                btnSalir: "Si, ir a Clientes",
                btnQuedarse: "No, seguir editando",
                urlSalida: "/Clientes/Index"
            });
        } else {
            exitoModal(data.mensaje || "Cliente modificado correctamente");
        }
    } catch (e) {
        console.error(e);
        mostrarErrorCg("Error inesperado al guardar.");
    }
}

async function eliminarClienteCg() {
    if (CG.id <= 0) return;
    if (typeof ejecutarEliminacionEntidad !== "function") {
        errorModal("No esta disponible el asistente de eliminacion.");
        return;
    }

    const resultado = await ejecutarEliminacionEntidad({
        entidadLabel: "este cliente",
        urlDependencias: API_CG.dependencias(CG.id),
        urlEliminar: cascada => API_CG.eliminar(CG.id, cascada),
        headers: authCg(),
        fetchJson: fetchJsonCg
    });

    if (resultado.accion !== "ok") return;
    exitoModal(resultado.data?.mensaje || "Cliente eliminado.");
    window.location.href = "/Clientes/Index";
}

function mostrarErrorCg(msg) {
    const panel = $("#errorCamposCg");
    panel.find(".rp-error-message").text(msg);
    panel.removeClass("d-none");
}

function cerrarErrorCg() {
    $("#errorCamposCg").addClass("d-none").find(".rp-error-message").text("");
}

/* ---- Tabs lazy load ---- */

async function cargarTabCg(tab) {
    if (CG.id <= 0) return;
    if (CG.tabsLoaded[tab] && tab !== "cuentaCorriente") return;

    const nombre = CG_TAB_LABELS[tab] || "sección";
    await withCgLoading(`Cargando ${nombre}…`, async () => {
        try {
            switch (tab) {
                case "establecimientos": await cargarTabEstablecimientos(); break;
                case "contratos": await cargarTabContratos(); break;
                case "cuentaCorriente":
                    await cargarTabCuentaCorriente(true);
                    await cargarTabCobros();
                    break;
                case "entregas":
                    await cargarHubEntregasCg(true);
                    break;
            }
        } catch (e) {
            console.error(`Error cargando tab ${tab}:`, e);
            if (typeof errorModal === "function") {
                errorModal(`No se pudo cargar ${nombre}. Intente nuevamente.`);
            }
        }
    });
}

async function cargarHubDatosCg(force) {
    if (CG.id <= 0) return;
    await withCgLoading("Cargando planilla, stock y entregas…", async () => {
        $h("cgHubOperativo").prop("hidden", false);
        $("#btnNuevoContactoCg").prop("disabled", false);
        await Promise.all([
            cargarTabContactos(),
            cargarTabControlMensual(!!force),
            cargarHubStockCg(!!force),
            cargarHubEntregasCg(!!force)
        ]);
    });
}

/* ---- Contactos ---- */

async function cargarTabContactos() {
    CG.contactos = await fetchJsonCg(API_CG.contactosLista(CG.id), { headers: authCg() }) || [];
    renderContactosCg();
    CG.tabsLoaded.contactos = true;
}

function renderContactosCg() {
    const items = CG.contactos || [];
    $("#cgContactoCantidad").text(String(items.length));
    const cont = $("#cgListaContactos");

    if (!items.length) {
        cont.html(`<div class="cg-contact-empty">Sin personas de contacto. Agrega quien atiende en planta o cobranza.</div>`);
        return;
    }

    cont.html(items.map(c => {
        const phones = [c.Telefono, c.TelefonoAlt].filter(Boolean).join(" · ");
        return `<article class="cg-contact-card" data-id="${c.Id}">
            <div class="cg-contact-card-avatar"><i class="fa fa-user"></i></div>
            <div class="cg-contact-card-body">
                <div class="cg-contact-card-name">${escapeCg(c.Nombre)}</div>
                ${c.Puesto ? `<div class="cg-contact-card-role">${escapeCg(c.Puesto)}</div>` : ""}
                ${phones ? `<div class="cg-contact-card-meta"><i class="fa fa-phone"></i> ${escapeCg(phones)}</div>` : ""}
                ${c.Email ? `<div class="cg-contact-card-meta"><i class="fa fa-envelope"></i> ${escapeCg(c.Email)}</div>` : ""}
            </div>
            <div class="cg-contact-card-actions">
                <button type="button" class="btn btn-sm btn-outline-light btn-editar-contacto-cg" data-id="${c.Id}" title="Editar">
                    <i class="fa fa-pencil"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-contacto-cg" data-id="${c.Id}" title="Eliminar">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        </article>`;
    }).join(""));
}

function escapeCg(t) {
    return String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function limpiarFormContactoCg() {
    CG.contactoSelId = 0;
    $("#cgContactoId, #cgContactoNombre, #cgContactoPuesto, #cgContactoTelefono, #cgContactoTelefonoAlt, #cgContactoEmail").val("");
    $("#cgContactoFormTitulo").text("Nuevo contacto");
}

function abrirModalNuevoContactoCg() {
    if (CG.id <= 0) {
        errorModal("Guarda el cliente antes de agregar contactos.");
        return;
    }
    limpiarFormContactoCg();
    CG.modalContacto?.show();
}

function abrirModalEditarContactoCg(id) {
    const c = (CG.contactos || []).find(x => x.Id === id);
    if (!c) return;
    CG.contactoSelId = id;
    $("#cgContactoId").val(c.Id);
    $("#cgContactoNombre").val(c.Nombre || "");
    $("#cgContactoPuesto").val(c.Puesto || "");
    $("#cgContactoTelefono").val(c.Telefono || "");
    $("#cgContactoTelefonoAlt").val(c.TelefonoAlt || "");
    $("#cgContactoEmail").val(c.Email || "");
    $("#cgContactoFormTitulo").text("Editar contacto");
    CG.modalContacto?.show();
}

function seleccionarContactoCg(id) {
    abrirModalEditarContactoCg(id);
}

async function guardarContactoCg() {
    const nombre = ($("#cgContactoNombre").val() || "").trim();
    if (!nombre) { errorModal("El nombre del contacto es obligatorio."); return; }

    const idContacto = parseInt($("#cgContactoId").val(), 10) || 0;
    const modelo = {
        Id: idContacto,
        IdCliente: CG.id,
        Nombre: nombre,
        Puesto: $("#cgContactoPuesto").val() || null,
        Telefono: $("#cgContactoTelefono").val() || null,
        TelefonoAlt: $("#cgContactoTelefonoAlt").val() || null,
        Email: $("#cgContactoEmail").val() || null
    };

    const esNuevo = !modelo.Id;
    const data = await fetchJsonCg(esNuevo ? API_CG.contactosInsertar : API_CG.contactosActualizar, {
        method: esNuevo ? "POST" : "PUT",
        headers: authCg(),
        body: JSON.stringify(modelo)
    });

    if (!data?.valor) { errorModal(data?.mensaje || "No se pudo guardar."); return; }
    exitoModal(data.mensaje || "Contacto guardado.");
    CG.modalContacto?.hide();
    CG.tabsLoaded.contactos = false;
    await cargarTabContactos();
}

async function eliminarContactoCg(id) {
    const ok = typeof confirmarModal === "function"
        ? await confirmarModal("¿Eliminar este contacto?")
        : confirm("¿Eliminar este contacto?");
    if (!ok) return;

    const data = await fetchJsonCg(API_CG.contactosEliminar(id), { method: "DELETE", headers: authCg() });
    if (!data?.valor) { errorModal(data?.mensaje || "No se pudo eliminar."); return; }
    exitoModal(data.mensaje || "Contacto eliminado.");
    CG.tabsLoaded.contactos = false;
    await cargarTabContactos();
}

/* ---- Establecimientos ---- */

async function cargarTabEstablecimientos() {
    const all = await fetchJsonCg(API_CG.establecimientosLista, { headers: authCg() }) || [];
    const data = (Array.isArray(all) ? all : []).filter(x => x.IdCliente === CG.id);
    CG.establecimientosLista = data;
    renderListaEstablecimientosCg(data);

    const valid = new Set(data.map(x => x.Id));
    CG.establecimientoSelIds = (CG.establecimientoSelIds || []).filter(id => valid.has(id));
    if (CG.establecimientoSelId > 0 && !valid.has(CG.establecimientoSelId)) {
        CG.establecimientoSelId = 0;
    }
    if (!CG.establecimientoSelIds.length && CG.establecimientoSelId > 0) {
        CG.establecimientoSelIds = [CG.establecimientoSelId];
    }
    syncEstablecimientoSelStateCg();
    await aplicarSeleccionEstablecimientosCg();

    CG.tabsLoaded.establecimientos = true;
}

function renderListaEstablecimientosCg(items) {
    const cont = $("#cgEstList");
    if (!cont.length) return;

    const list = items || [];
    if (!list.length) {
        cont.html(`
            <div class="cg-est-pills-empty">
                <i class="fa fa-building-o"></i>
                <span>Todavía no hay establecimientos</span>
                <button type="button" class="cg-btn cg-btn--success cg-btn--sm" id="btnNuevoEstEmpty">
                    <i class="fa fa-plus"></i> Crear el primero
                </button>
            </div>`);
        $("#btnNuevoEstEmpty").on("click", abrirNuevoEstablecimientoCg);
        return;
    }

    const palette = ["mint", "sky", "amber", "violet", "rose", "teal"];
    cont.html(list.map((e, idx) => {
        const domicilio = [e.Calle || e.Domicilio, e.Numero].filter(Boolean).join(" ")
            || e.Domicilio
            || "Sin domicilio";
        const tone = palette[idx % palette.length];
        const inicial = String(e.Nombre || "?").trim().charAt(0).toUpperCase();
        return `<button type="button" class="cg-est-pill tone-${tone}" data-id="${e.Id}" role="option" aria-selected="false">
            <span class="cg-est-pill-check"><i class="fa fa-check"></i></span>
            <span class="cg-est-pill-avatar">${escapeCg(inicial)}</span>
            <span class="cg-est-pill-text">
                <span class="cg-est-pill-name">${escapeCg(e.Nombre || "Sin nombre")}</span>
                <span class="cg-est-pill-dom">${escapeCg(domicilio)}</span>
            </span>
        </button>`;
    }).join(""));
}

function syncEstablecimientoSelStateCg() {
    const ids = [...new Set((CG.establecimientoSelIds || []).map(Number).filter(x => x > 0))];
    CG.establecimientoSelIds = ids;
    CG.establecimientoSelId = ids.length === 1 ? ids[0] : (ids[0] || 0);

    $("#cgEstList .cg-est-pill").each(function () {
        const id = Number($(this).data("id")) || 0;
        const on = ids.includes(id);
        $(this).toggleClass("is-active", on).attr("aria-selected", on ? "true" : "false");
    });

    const n = ids.length;
    $("#btnEliminarEstTab").toggleClass("d-none", n !== 1);
    const $bar = $("#cgEstSelBar");
    if (n <= 0) {
        $bar.addClass("d-none");
        return;
    }
    $bar.removeClass("d-none");
    const nombres = ids.map(id => {
        const e = (CG.establecimientosLista || []).find(x => x.Id === id);
        return e?.Nombre || `#${id}`;
    });
    $("#cgEstSelLabel").text(n === 1 ? nombres[0] : `${n} seleccionados · ${nombres.join(" · ")}`);
    $("#cgEstSelMode").text(n === 1 ? "Edición completa" : "Planilla combinada");
}

function resaltarListaEstablecimientoCg(id) {
    if (id > 0) {
        CG.establecimientoSelIds = [Number(id)];
    } else {
        CG.establecimientoSelIds = [];
    }
    syncEstablecimientoSelStateCg();
}

async function toggleEstablecimientoSelCg(id, opts = {}) {
    const idEst = Number(id) || 0;
    if (!idEst) return;

    let ids = [...(CG.establecimientoSelIds || [])];
    if (opts.exclusive) {
        ids = [idEst];
    } else if (ids.includes(idEst)) {
        ids = ids.filter(x => x !== idEst);
    } else {
        ids.push(idEst);
    }

    CG.establecimientoSelIds = ids;
    syncEstablecimientoSelStateCg();
    await aplicarSeleccionEstablecimientosCg();
}

async function seleccionarTodosEstablecimientosCg() {
    const all = (CG.establecimientosLista || []).map(x => x.Id).filter(x => x > 0);
    if (!all.length) return;
    const same = all.length === (CG.establecimientoSelIds || []).length
        && all.every(id => CG.establecimientoSelIds.includes(id));
    CG.establecimientoSelIds = same ? (all.length ? [all[0]] : []) : all;
    syncEstablecimientoSelStateCg();
    await aplicarSeleccionEstablecimientosCg();
}

async function aplicarSeleccionEstablecimientosCg(opts = {}) {
    const ids = idsEstablecimientoSeleccionadosCg();
    const multi = ids.length > 1;
    const uno = ids.length === 1 ? ids[0] : 0;
    CG.establecimientoSelId = uno || 0;

    $("#cgEstMultiBanner").toggleClass("d-none", !multi);
    $("#cgEstEditorFoot").toggleClass("d-none", multi || ids.length === 0);
    aplicarModoTabsEstCg(ids.length);

    if (ids.length === 0) {
        $("#cgEstEditor").addClass("d-none");
        $("#cgEstEditorEmpty").removeClass("d-none");
        limpiarHubEstablecimientoCg();
        setStockEstTabDisponibleCg(false);
        CG.hubActivo = "cliente";
        return;
    }

    $("#cgEstEditorEmpty").addClass("d-none");
    $("#cgEstEditor").removeClass("d-none");
    setStockEstTabDisponibleCg(true);

    if (multi) {
        CG.hubActivo = "est";
        const tabStock = document.getElementById("tabBtnStockEst");
        if (tabStock && !tabStock.classList.contains("active")) {
            bootstrap.Tab.getOrCreateInstance(tabStock).show();
        }
        await cargarHubEstablecimientoCg(true);
        return;
    }

    // Un solo establecimiento: ficha completa (overlay evita ver campos vacíos al cambiar)
    await withCgLoading("Cargando establecimiento…", async () => {
        CG.hubActivo = "est";
        if (CG.establecimientoModal && uno > 0 && !opts.skipOpen) {
            try {
                await CG.establecimientoModal.abrirEditar(uno);
            } catch (e) {
                console.error(e);
                errorModal("No se pudo cargar el establecimiento.");
            }
        }

        const tabStock = document.getElementById("tabBtnStockEst");
        if (tabStock?.classList.contains("active")) {
            await cargarHubEstablecimientoCg(true);
        }
    });
}

function aplicarModoTabsEstCg(cantidad) {
    const multi = cantidad > 1;
    const map = [
        ["#tabBtnDatosEst", "#tabDatosEst"],
        ["#tabBtnContactosEst", "#tabContactosEst"],
        ["#tabBtnProductosEst", "#tabProductosEst"]
    ];

    map.forEach(([btn, pane]) => {
        const $btn = $(btn);
        const $pane = $(pane);
        $btn.toggleClass("disabled cg-est-tab-locked", multi)
            .attr("aria-disabled", multi ? "true" : "false")
            .prop("disabled", multi);
        if (multi) {
            $btn.addClass("d-none");
            $pane.removeClass("show active");
        } else {
            $btn.removeClass("d-none");
        }
    });

    const $stockBtn = $("#tabBtnStockEst");
    const $stockPane = $("#tabStockEst");
    if (multi) {
        $stockBtn.removeClass("d-none").addClass("active");
        $stockPane.addClass("show active");
        $("#tabBtnDatosEst, #tabBtnContactosEst, #tabBtnProductosEst").removeClass("active");
    } else if (cantidad === 1 && !$stockBtn.hasClass("active") && !$("#tabBtnDatosEst").hasClass("active")
        && !$("#tabBtnContactosEst").hasClass("active") && !$("#tabBtnProductosEst").hasClass("active")) {
        $("#tabBtnDatosEst").addClass("active");
        $("#tabDatosEst").addClass("show active");
        $stockBtn.removeClass("active");
        $stockPane.removeClass("show active");
    }
}

async function seleccionarEstablecimientoCg(id, opts = {}) {
    const idEst = Number(id) || 0;
    if (!idEst) return;
    CG.establecimientoSelIds = [idEst];
    syncEstablecimientoSelStateCg();
    await aplicarSeleccionEstablecimientosCg(opts);
}
window.seleccionarEstablecimientoCg = seleccionarEstablecimientoCg;

function editarEstablecimientoCg(id) {
    seleccionarEstablecimientoCg(id);
}
window.editarEstablecimientoCg = editarEstablecimientoCg;

async function eliminarEstablecimientoCg(id) {
    if (CG.establecimientoModal) await CG.establecimientoModal.eliminar(id);
}
window.eliminarEstablecimientoCg = eliminarEstablecimientoCg;

async function abrirNuevoEstablecimientoCg() {
    if (!CG.establecimientoModal) return;
    CG.establecimientoSelIds = [];
    CG.establecimientoSelId = 0;
    syncEstablecimientoSelStateCg();
    limpiarHubEstablecimientoCg();
    setStockEstTabDisponibleCg(false);
    aplicarModoTabsEstCg(1);
    $("#cgEstMultiBanner").addClass("d-none");
    $("#cgEstEditorFoot").removeClass("d-none");
    $("#cgEstEditorEmpty").addClass("d-none");
    $("#cgEstEditor").removeClass("d-none");
    await withCgLoading("Preparando nuevo establecimiento…", async () => {
        await CG.establecimientoModal.abrirNuevo(CG.id);
    });
}

/** Limpia planilla/stock/entregas del hub de establecimiento (evita datos del est. anterior). */
function limpiarHubEstablecimientoCg() {
    CG.hubs.est = crearHubStateEstCg();
    CG.entregaHubExpandida = 0;
    const mount = document.getElementById("cgEstHubMount");
    if (mount) {
        mount.innerHTML = `<div class="cg-hub-stock-empty">Guardá el establecimiento para ver el control de pagos y stock.</div>`;
    }
    // Los handlers delegados siguen en #cgEstHubMount; el clone se recrea al volver a cargar un est.
}

/** Solapa Control de pagos: solo con establecimiento guardado/seleccionado. */
function setStockEstTabDisponibleCg(disponible) {
    const tabBtn = document.getElementById("tabBtnStockEst");
    const tabPane = document.getElementById("tabStockEst");
    if (!tabBtn || !tabPane) return;

    const $btn = $(tabBtn);
    if (!disponible) {
        if ($btn.hasClass("active")) {
            const datosBtn = document.getElementById("tabBtnDatosEst");
            if (datosBtn && window.bootstrap?.Tab) {
                bootstrap.Tab.getOrCreateInstance(datosBtn).show();
            } else {
                $btn.removeClass("active");
                $(tabPane).removeClass("show active");
                $("#tabBtnDatosEst").addClass("active");
                $("#tabDatosEst").addClass("show active");
            }
        }
        $btn.addClass("disabled cg-est-tab-locked")
            .attr("aria-disabled", "true")
            .prop("disabled", true)
            .attr("title", "Guardá el establecimiento para ver el control");
    } else {
        $btn.removeClass("disabled cg-est-tab-locked")
            .attr("aria-disabled", "false")
            .prop("disabled", false)
            .removeAttr("title");
    }
}

async function cargarStockEstablecimientoCg(idEstablecimiento, force) {
    if (idEstablecimiento > 0) CG.establecimientoSelId = Number(idEstablecimiento);
    await cargarHubEstablecimientoCg(force);
}

async function cargarHubEstablecimientoCg(force) {
    // Usar selección explícita (no depender de hubActivo: puede flippear a "cliente" por solapas).
    const ids = idsEstablecimientoSeleccionadosCg();
    const idEst = ids.length === 1 ? ids[0] : 0;
    const mount = document.getElementById("cgEstHubMount");
    if (!mount) return;
    if (!ids.length || !CG.id) {
        limpiarHubEstablecimientoCg();
        return;
    }

    if (!ensureEstHubCloneCg()) {
        mount.innerHTML = `<div class="cg-hub-stock-empty">No se pudo cargar el control del establecimiento.</div>`;
        return;
    }

    const multi = ids.length > 1;
    const msg = multi
        ? "Cargando planilla combinada de establecimientos…"
        : "Cargando control del establecimiento…";

    await withCgLoading(msg, async () => {
        await withHubModeCg("est", async () => {
            hubEstStateCg().idEstablecimiento = idEst || ids[0];
            resetEstHubUiCg();
            if (!hubFiltrosCg().anios?.length) {
                const actual = new Date().getFullYear();
                hubFiltrosCg().anios = [actual];
                hubFiltrosCg().meses = [];
                initFiltrosControlCg();
            } else {
                const $anios = $h("cgControlAniosChips");
                if (!$anios.children().length) initFiltrosControlCg();
                else renderEstadoFiltrosControlCg(false);
            }
            await Promise.all([
                cargarTabControlMensual(!!force, ids),
                cargarHubStockCg(!!force, ids),
                cargarHubEntregasEstCg(ids)
            ]);

            const $sel = $h("cgWsEstablecimiento");
            if ($sel.length) {
                if (ids.length === 1) {
                    $sel.val(String(ids[0])).prop("disabled", true);
                } else {
                    $sel.prop("disabled", false);
                    if (!$sel.val()) $sel.val("");
                }
            }

            const nombres = ids.map(id => {
                const e = (CG.establecimientosLista || []).find(x => x.Id === id);
                return e?.Nombre || `#${id}`;
            });
            $h("cgHubOperativo").find(".cg-hub-sub").first().html(
                multi
                    ? `Planilla combinada de <strong>${escapeCg(nombres.join(" · "))}</strong>. Para registrar una entrega, dejá uno solo seleccionado.`
                    : "Planilla, stock, visita y abonos de este establecimiento."
            );

            $h("cgHubMesDetail").find(".cg-mes-ws-panel--productos")
                .toggleClass("d-none", multi);
            $h("btnWsAgregarLinea").toggleClass("d-none", multi);
            $h("btnWsAgregarCobro").toggleClass("d-none", multi);
            $h("btnGuardarControlMensualCg").toggleClass("d-none", multi);
        });
        if ($("#tabBtnStockEst").hasClass("active")) CG.hubActivo = "est";
    });
}

/** Vacía KPIs/listas del hub de establecimiento antes de pintar datos nuevos. */
function resetEstHubUiCg() {
    const run = () => {
        $h("cgControlStockActual").text(fmtQtyCg(0));
        $h("cgControlSaldoAnual").text(fmtMoneyCg(0))
            .removeClass("rp-money-pos rp-money-neg rp-money-zero");
        $h("cgControlCount").text("0");
        $h("cgControlMensualBody").empty();
        $h("cgHubStockCards").html(`<div class="cg-hub-stock-empty">Cargando stock…</div>`);
        $h("cgHubEntregasList").html(`<div class="cg-hub-stock-empty">Cargando entregas…</div>`);
        $h("cgHubMesDetail").prop("hidden", true);
        // No hacer .empty() sobre cgAtrasosAlert: destruye título/lista y deja la barra roja vacía.
        $h("cgAtrasosAlert").addClass("d-none").prop("hidden", true);
        $h("cgAtrasosTitulo").text("Hay meses con pago atrasado");
        $h("cgAtrasosResumen").text("Seleccioná un mes para ver el detalle o cargar interés.");
        $h("cgAtrasosLista").empty().removeClass("is-collapsed");
        $h("cgKpiAtrasos").prop("hidden", true);
        $h("cgControlAtrasosCount").text("0");
        $h("cgControlAtrasosMonto").text("sin deuda vencida");
        setHubPropCg("controlFiltrado", null);
        setHubPropCg("stockCliente", []);
        setHubPropCg("entregasHub", []);
        setHubPropCg("hubMesSel", null);
        setHubPropCg("wsLineas", []);
    };
    if (CG.hubActivoLock === "est" || CG.hubActivo === "est") {
        run();
        return;
    }
    const prev = CG.hubActivo;
    CG.hubActivo = "est";
    try { run(); } finally { CG.hubActivo = prev; }
}

function ensureEstHubCloneCg() {
    const mount = document.getElementById("cgEstHubMount");
    const src = document.getElementById("cgHubOperativo");
    if (!mount || !src) return false;

    // Si el clon existe pero le faltan nodos internos (p.ej. alerta de atrasos vaciada), recrear.
    const existing = document.getElementById("cgEstHubOperativo");
    if (existing) {
        const alertOk = document.getElementById("cgEstAtrasosTitulo")
            && document.getElementById("cgEstAtrasosLista")
            && document.getElementById("cgEstAtrasosAlert");
        const visitaOk = document.getElementById("cgEstWsCobrosBody")
            && document.getElementById("cgEstWsCobrosMesBody")
            && document.getElementById("cgEstCmFechaVisita")
            && document.querySelector("#cgEstHubMesDetail .cg-ws-split");
        if (alertOk && visitaOk) return true;
        mount.innerHTML = "";
    }

    const clone = src.cloneNode(true);
    clone.hidden = false;
    clone.removeAttribute("hidden");
    clone.classList.add("cg-est-hub-clone");
    clone.querySelectorAll(".cg-sec-reorder").forEach(el => el.remove());
    clone.querySelectorAll("[data-cg-sortable]").forEach(el => el.removeAttribute("data-cg-sortable"));

    const idMap = new Map();
    clone.querySelectorAll("[id]").forEach(el => {
        const old = el.id;
        const neu = mapHubDomIdAlwaysEstCg(old);
        idMap.set(old, neu);
        el.id = neu;
    });
    // Solo remapea referencias internas (#id / id). No tocar hrefs de navegación (entregas, módulos, etc.).
    clone.querySelectorAll("[data-cg-collapse-target], [aria-controls], [for]").forEach(el => {
        ["data-cg-collapse-target", "aria-controls", "for"].forEach(attr => {
            const v = el.getAttribute(attr);
            if (!v) return;
            if (v.startsWith("#")) {
                const id = v.slice(1);
                if (idMap.has(id)) el.setAttribute(attr, "#" + idMap.get(id));
            } else if (idMap.has(v)) {
                el.setAttribute(attr, idMap.get(v));
            }
        });
    });
    clone.querySelectorAll("a[href^='#']").forEach(el => {
        const v = el.getAttribute("href");
        if (!v || !v.startsWith("#")) return;
        const id = v.slice(1);
        if (idMap.has(id)) el.setAttribute("href", "#" + idMap.get(id));
    });

    const title = clone.querySelector(".cg-hub-title");
    if (title) title.innerHTML = '<i class="fa fa-calendar-check-o"></i> Control de pagos y stock';

    // No arrastrar entregas/planilla del hub del cliente al del establecimiento
    const estList = clone.querySelector("#cgEstHubEntregasList");
    if (estList) estList.innerHTML = `<div class="cg-hub-stock-empty">Sin entregas.</div>`;
    const estBody = clone.querySelector("#cgEstControlMensualBody");
    if (estBody) estBody.innerHTML = "";
    const estStock = clone.querySelector("#cgEstHubStockCards");
    if (estStock) estStock.innerHTML = "";
    const estMes = clone.querySelector("#cgEstHubMesDetail");
    if (estMes) {
        estMes.hidden = true;
        estMes.setAttribute("hidden", "");
    }

    mount.innerHTML = "";
    mount.appendChild(clone);
    bindEstHubEventsCg();
    return true;
}

function mapHubDomIdAlwaysEstCg(id) {
    if (!id) return id;
    if (id.startsWith("cgEst") || id.startsWith("btnEst") || id.startsWith("tblEst") || id.startsWith("lblEst")) return id;
    if (id.startsWith("cg")) return "cgEst" + id.slice(2);
    if (id.startsWith("btn")) return "btnEst" + id.slice(3);
    if (id.startsWith("tbl")) return "tblEst" + id.slice(3);
    if (id.startsWith("lbl")) return "lblEst" + id.slice(3);
    return "est_" + id;
}

function bindEstHubEventsCg() {
    if (CG.estHubBound) return;
    CG.estHubBound = true;
    const root = "#cgEstHubMount";

    $(root).on("click", "#btnEstRefreshControlMensual", () => cargarHubEstablecimientoCg(true));
    $(root).on("click", ".cg-cm-chip", function () {
        CG.hubActivo = "est";
        toggleFiltroControlCg($(this).data("tipo"), parseInt($(this).data("val"), 10));
    });
    $(root).on("click", ".cg-preset-meses", function () {
        CG.hubActivo = "est";
        aplicarPresetMesesCg($(this).data("meses"));
        cargarTabControlMensual(true, idsEstablecimientoSeleccionadosCg());
    });
    $(root).on("click", "#btnEstControlAniosRecientes", () => {
        CG.hubActivo = "est";
        aplicarPresetAniosRecientesCg();
        cargarTabControlMensual(true, idsEstablecimientoSeleccionadosCg());
    });
    $(root).on("click", "#btnEstRegistrarVisitaMesHub", () => {
        CG.hubActivo = "est";
        const now = new Date();
        abrirWorkspaceMesCg(now.getFullYear(), now.getMonth() + 1);
    });
    $(root).on("click", "#cgEstControlMensualBody tr[data-mes]", function (e) {
        if ($(e.target).closest(".cg-cm-int-eye").length) return;
        CG.hubActivo = "est";
        abrirWorkspaceMesCg(Number($(this).data("anio")), Number($(this).data("mes")));
    });
    $(root).on("click", "#cgEstCards_controlMensual article[data-mes]", function (e) {
        if ($(e.target).closest(".cg-cm-int-eye").length) return;
        CG.hubActivo = "est";
        abrirWorkspaceMesCg(Number($(this).data("anio")), Number($(this).data("mes")));
    });
    $(root).on("click", "#btnEstCerrarMesDetail", () => {
        CG.hubActivo = "est";
        $h("cgHubMesDetail").prop("hidden", true);
        setHubPropCg("hubMesSel", null);
        setHubPropCg("wsLineas", []);
        setHubPropCg("wsCobros", []);
        $h("cgControlMensualBody").find("tr").removeClass("is-selected");
        actualizarChipsAtrasosSeleccionCg(-1, -1);
    });
    $(root).on("click", "#btnEstInteresMesHub", () => {
        CG.hubActivo = "est";
        if (hubPropCg("hubMesSel")) abrirModalInteresCg(hubPropCg("hubMesSel").anio, hubPropCg("hubMesSel").mes);
    });
    $(root).on("click", "#btnEstVerInteresesMesHub", () => {
        CG.hubActivo = "est";
        if (hubPropCg("hubMesSel")) abrirModalInteresesHistCg(hubPropCg("hubMesSel").anio, hubPropCg("hubMesSel").mes);
    });
    $(root).on("change", "#cgEstCmSinEntrega", () => {
        CG.hubActivo = "est";
        syncSinEntregaUiCg();
    });
    $(root).on("change", "#cgEstCmFechaVisita", function () {
        CG.hubActivo = "est";
        $h("cgWsFechaEntrega").val($(this).val() || "");
    });
    $(root).on("click", "#btnEstWsAgregarLinea", () => {
        CG.hubActivo = "est";
        agregarLineaWsCg();
    });
    $(root).on("click", "#btnEstWsAgregarCobro", () => {
        CG.hubActivo = "est";
        agregarCobroWsCg();
    });
    $(root).on("click", "#btnEstWsCobroMes", () => {
        CG.hubActivo = "est";
        const fechaVisita = $h("cgCmFechaVisita").val();
        abrirModalCobroCg();
        if (fechaVisita) $("#cgCobroFecha").val(fechaVisita);
    });
    $(root).on("click", "#cgEstWsCobrosBody .btn-ws-quitar-cobro", function () {
        CG.hubActivo = "est";
        const key = Number($(this).data("key"));
        setHubPropCg("wsCobros", (hubPropCg("wsCobros") || []).filter(c => Number(c._key) !== key));
        renderCobrosWsCg();
    });
    $(root).on("change input", "#cgEstWsCobrosBody input:not(.ws-cobro-cuenta), #cgEstWsCobrosBody select:not(.ws-cobro-cuenta)", function () {
        CG.hubActivo = "est";
        sincronizarCobrosWsDesdeDomCg();
        actualizarResumenCobrosWsCg();
    });
    $(root).on("click", ".btn-ws-quitar", function () {
        CG.hubActivo = "est";
        const idx = Number($(this).data("idx"));
        if (Number.isNaN(idx)) return;
        hubPropCg("wsLineas").splice(idx, 1);
        renderLineasWsCg();
        actualizarResumenCobrosWsCg();
    });
    $(root).on("change", "#cgEstWsEstablecimiento", async function () {
        CG.hubActivo = "est";
        await cargarSugeridosWsCg(Number($(this).val()) || null);
    });
    $(root).on("click", "#cgEstWsSugeridos .cg-ws-chip", function () {
        CG.hubActivo = "est";
        const idx = Number($(this).data("idx"));
        const s = CG.wsSugeridos[idx];
        if (s) agregarLineaWsCg({
            IdProducto: s.IdProducto,
            IdListaPrecio: s.IdListaPrecio || 0,
            TipoMovimiento: 1,
            Cantidad: s.Cantidad || 1,
            PrecioVenta: 0
        });
    });
    $(root).on("change input", "#cgEstWsLineasBody select, #cgEstWsLineasBody input", async function () {
        CG.hubActivo = "est";
        const idx = Number($(this).closest(".cg-ws-linea").data("idx"));
        const linea = hubPropCg("wsLineas")[idx];
        if (!linea) return;
        const $row = $(this).closest(".cg-ws-linea");
        const campo = $(this).hasClass("ws-prod") ? "prod"
            : $(this).hasClass("ws-lista") ? "lista"
            : $(this).hasClass("ws-tipo") ? "tipo"
            : "otro";

        linea.IdProducto = Number($row.find(".ws-prod").val()) || 0;
        linea.IdListaPrecio = Number($row.find(".ws-lista").val()) || 0;
        linea.TipoMovimiento = Number($row.find(".ws-tipo").val()) || 1;
        linea.Cantidad = leerNumeroWsCg($row.find(".ws-cant").val());
        linea.PrecioVenta = leerNumeroWsCg($row.find(".ws-precio").val());

        await sincronizarPrecioLineaWsCg($row, linea, campo);

        $row.find(".ws-sub").text(fmtMoneyCg(linea.Cantidad * linea.PrecioVenta));
        actualizarResumenCobrosWsCg();
        actualizarAlertaDuplicadosLineasWsCg();
    });
    $(root).on("click", "#btnEstGuardarControlMensualCg", busyHandler(() => {
        CG.hubActivo = "est";
        return guardarVisitaUnificadaCg();
    }));
    $(root).on("click", "#btnEstVerInteresesCg", function (e) {
        e.preventDefault();
        CG.hubActivo = "est";
        if (typeof abrirModalInteresesHistCg === "function") abrirModalInteresesHistCg();
    });
}

async function resolverContratoEstablecimientoCg(idEstablecimiento) {
    const idEst = Number(idEstablecimiento) || 0;
    if (!idEst || !CG.id) return null;
    try {
        const contratos = await fetchJsonCg(API_CG.contratosLista(CG.id), { headers: authCg() }) || [];
        const delEst = (Array.isArray(contratos) ? contratos : [])
            .filter(c => Number(c.IdEstablecimiento) === idEst);
        if (!delEst.length) return null;
        const activo = delEst.find(c => c.Activo === true || c.Activo === 1 || c.activo === true);
        return Number((activo || delEst[0]).Id) || null;
    } catch (e) {
        console.warn(e);
        return null;
    }
}

async function cargarHubEntregasEstCg(idsForzados) {
    const ids = Array.isArray(idsForzados) && idsForzados.length
        ? idsForzados.map(Number).filter(x => x > 0)
        : idsEstablecimientoSeleccionadosCg();

    await withHubModeCg("est", async () => {
        if (!CG.id || !ids.length) {
            $h("cgHubEntregasList").html(`<div class="cg-hub-stock-empty">Sin entregas.</div>`);
            return;
        }
        try {
            const data = await fetchJsonCg(API_CG.entregasLista, {
                method: "POST",
                headers: authCg(),
                body: JSON.stringify({ IdCliente: CG.id })
            }) || [];
            const nombres = new Set(
                ids.map(id => {
                    const est = (CG.establecimientosLista || []).find(x => x.Id === id);
                    return (est?.Nombre || "").trim().toLowerCase();
                }).filter(Boolean)
            );
            const filtradas = (Array.isArray(data) ? data : []).filter(e => {
                const idEst = Number(e.IdEstablecimiento ?? e.idEstablecimiento) || 0;
                if (idEst > 0 && ids.includes(idEst)) return true;
                const nom = String(e.Establecimiento || e.establecimiento || "").trim().toLowerCase();
                return nom && nombres.has(nom);
            });
            setHubPropCg("entregasHub", filtradas);
            CG.entregaHubExpandida = 0;
            renderHubEntregasCg(filtradas);
        } catch (e) {
            console.warn(e);
            $h("cgHubEntregasList").html(`<div class="cg-hub-stock-empty">No se pudieron cargar las entregas.</div>`);
        }
    });
}

function renderStockEstablecimientoCg() {
    /* compat: el stock ahora vive en el hub clonado */
}

/* ---- Contratos ---- */

async function cargarTabContratos() {
    const data = await fetchJsonCg(API_CG.contratosLista(CG.id), { headers: authCg() }) || [];
    configurarGrillaCg("contratos", "#grd_ContratosCg", data, [
        columnaGridAcciones({ editar: "editarContratoCg" }, "Contratos"),
        columnaGridId(),
        { data: "Establecimiento" },
        { data: "TipoContrato", defaultContent: "" },
        { data: "FechaContrato", render: d => formatearFechaCortaCg(d) },
        { data: "FechaInicio", render: d => formatearFechaCortaCg(d) },
        { data: "FechaVencimiento", render: d => formatearFechaCortaCg(d) },
        { data: "Vigente", render: v => v ? "Si" : "No" }
    ]);
    CG.tabsLoaded.contratos = true;
}

function editarContratoCg(id) {
    if (CG.contratoModal) CG.contratoModal.abrirEditar(id);
}
window.editarContratoCg = editarContratoCg;

async function abrirNuevoContratoCg() {
    if (!CG.contratoModal) return;
    await CG.contratoModal.abrirNuevo();
    window.jQuery("#cmbClienteContrato").val(String(CG.id)).trigger("change");
}

/* ---- Entregas (hub) ---- */

async function cargarHubEntregasCg(force) {
    if (force) CG.tabsLoaded.entregas = false;

    const hoy = new Date();
    const desde = new Date();
    desde.setFullYear(desde.getFullYear() - 2);

    const body = {
        FechaDesde: desde.toISOString().slice(0, 10),
        FechaHasta: hoy.toISOString().slice(0, 10),
        IdCliente: CG.id
    };

    const data = await fetchJsonCg(API_CG.entregasLista, {
        method: "POST",
        headers: authCg(),
        body: JSON.stringify(body)
    }) || [];

    CG.entregasHub = Array.isArray(data) ? data : [];
    if (force) {
        CG.entregasDetalleCache = {};
        CG.entregaHubExpandida = 0;
    }
    renderHubEntregasCg(CG.entregasHub);
    CG.tabsLoaded.entregas = true;
}

function renderHubEntregasCg(items) {
    const html = buildHubEntregasListHtml(items);
    if (isHubEstCg()) {
        const $est = $h("cgHubEntregasList");
        if ($est.length) $est.html(html);
        else $("#cgEstHubEntregasList").html(html);
        return;
    }
    $("#cgHubEntregasList, #cgTabEntregasList").html(html);
}

function buildHubEntregasListHtml(items) {
    const list = (items || [])
        .slice()
        .sort((a, b) => new Date(b.Fecha ?? b.fecha) - new Date(a.Fecha ?? a.fecha))
        .slice(0, 50);

    if (!list.length) {
        return `<div class="cg-hub-stock-empty">Sin entregas cargadas para este cliente.</div>`;
    }

    return list.map(e => {
        const idEntrega = Number(e.Id ?? e.id ?? e.IdEntrega ?? e.idEntrega) || 0;
        const saldo = Number(e.Saldo ?? e.saldo) || 0;
        const saldoCls = saldo > 0 ? "is-deuda" : (saldo < 0 ? "is-ok" : "");
        const open = CG.entregaHubExpandida === idEntrega;
        const cached = CG.entregasDetalleCache[idEntrega];
        const editUrl = API_CG.entregaNuevoModif(idEntrega, CG.id, true);
        return `<div class="cg-hub-entrega-row ${saldoCls}${open ? " is-open" : ""}" data-id="${idEntrega}">
            <div class="cg-hub-entrega-item">
                <div class="cg-hub-entrega-main">
                    <strong>#${idEntrega}</strong>
                    <span>${formatearFechaCortaCg(e.Fecha ?? e.fecha)}</span>
                    <small>${escapeCg(e.Establecimiento || e.establecimiento || e.Estado || e.estado || "")}</small>
                </div>
                <div class="cg-hub-entrega-money">
                    <span>Total ${fmtMoneyCg(e.ImporteTotal ?? e.importeTotal)}</span>
                    <strong>Saldo ${fmtMoneyCg(e.Saldo ?? e.saldo)}</strong>
                </div>
                <div class="cg-hub-entrega-actions">
                    <a class="cg-hub-entrega-edit" href="${editUrl}" data-id-entrega="${idEntrega}" title="Abrir entrega #${idEntrega}">
                        <i class="fa fa-pencil"></i>
                    </a>
                    <button type="button" class="cg-hub-entrega-toggle" title="${open ? "Ocultar detalle" : "Ver productos"}" aria-expanded="${open}">
                        <i class="fa fa-chevron-${open ? "down" : "right"}"></i>
                    </button>
                </div>
            </div>
            <div class="cg-hub-entrega-detail"${open ? "" : " hidden"}>
                ${open ? (cached ? buildHubEntregaDetalleHtml(cached, idEntrega) : `<div class="cg-hub-entrega-loading"><i class="fa fa-spinner fa-spin"></i> Cargando...</div>`) : ""}
            </div>
        </div>`;
    }).join("");
}

async function toggleHubEntregaDetalle(idEntrega) {
    if (!idEntrega) return;
    const lista = Array.isArray(hubPropCg("entregasHub"))
        ? hubPropCg("entregasHub")
        : (CG.entregasHub || []);

    if (CG.entregaHubExpandida === idEntrega) {
        CG.entregaHubExpandida = 0;
        renderHubEntregasCg(lista);
        return;
    }

    CG.entregaHubExpandida = idEntrega;
    renderHubEntregasCg(lista);

    if (!CG.entregasDetalleCache[idEntrega]) {
        try {
            const det = await fetchJsonCg(API_CG.entregaEditarInfo(idEntrega), { headers: authCg() });
            CG.entregasDetalleCache[idEntrega] = det;
        } catch (err) {
            console.warn("No se pudo cargar detalle de entrega:", err);
            CG.entregasDetalleCache[idEntrega] = { _error: true };
        }
        if (CG.entregaHubExpandida === idEntrega) {
            renderHubEntregasCg(lista);
        }
    }
}

function tipoMovimientoEntregaLabel(tipo) {
    const t = Number(tipo) || 0;
    if (t === 2) return "Retiro";
    if (t === 3) return "Recuperado";
    return "Entrega";
}

function buildHubEntregaDetalleHtml(det, idEntregaFallback) {
    if (!det || det._error) {
        return `<div class="cg-hub-stock-empty">No se pudo cargar el detalle de la entrega.</div>`;
    }

    const idEntrega = Number(det.Id ?? det.id ?? idEntregaFallback) || 0;
    const lineas = Array.isArray(det.Lineas) ? det.Lineas : (Array.isArray(det.lineas) ? det.lineas : []);
    const recuperadas = Array.isArray(det.LineasRecuperadas)
        ? det.LineasRecuperadas
        : (Array.isArray(det.lineasRecuperadas) ? det.lineasRecuperadas : []);
    const meta = [
        (det.Estado || det.estado) ? `Estado: ${escapeCg(det.Estado || det.estado)}` : "",
        (det.Camion || det.camion) ? `Unidad: ${escapeCg(det.Camion || det.camion)}` : "",
        (det.Establecimiento || det.establecimiento) ? `Est.: ${escapeCg(det.Establecimiento || det.establecimiento)}` : ""
    ].filter(Boolean).join(" · ");

    let body = "";
    if (!lineas.length && !recuperadas.length) {
        body = `<div class="cg-hub-stock-empty">Esta entrega no tiene productos cargados.</div>`;
    } else {
        const rows = [
            ...lineas.map(l => ({ ...l, _tipoLabel: tipoMovimientoEntregaLabel(l.TipoMovimiento ?? l.tipoMovimiento) })),
            ...recuperadas.map(l => ({ ...l, _tipoLabel: "Recuperado" }))
        ];
        body = `<div class="cg-hub-prod-table-wrap">
            <table class="cg-hub-prod-table">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Producto</th>
                        <th class="text-end">Cant.</th>
                        <th class="text-end">P. unit.</th>
                        <th class="text-end">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(l => `<tr>
                        <td><span class="cg-hub-tipo-badge cg-hub-tipo-${(l._tipoLabel || "").toLowerCase()}">${escapeCg(l._tipoLabel)}</span></td>
                        <td>${escapeCg(l.Producto || l.producto)}${(l.ListaPrecio || l.listaPrecio) ? ` <small class="text-muted">· ${escapeCg(l.ListaPrecio || l.listaPrecio)}</small>` : ""}${(l.Medida || l.medida) ? ` <small class="text-muted">(${escapeCg(l.Medida || l.medida)})</small>` : ""}</td>
                        <td class="text-end">${fmtQtyCg(l.Cantidad ?? l.cantidad)}</td>
                        <td class="text-end">${fmtMoneyCg(l.PrecioVenta ?? l.precioVenta)}</td>
                        <td class="text-end">${fmtMoneyCg(l.SubtotalFinal ?? l.subtotalFinal)}</td>
                    </tr>`).join("")}
                </tbody>
            </table>
        </div>`;
    }

    const notas = [det.NotaCliente || det.notaCliente, det.NotaInterna || det.notaInterna].filter(Boolean);
    const editUrl = API_CG.entregaNuevoModif(idEntrega, CG.id, true);
    return `<div class="cg-hub-entrega-detail-inner">
        ${meta ? `<div class="cg-hub-entrega-meta">${meta}</div>` : ""}
        ${body}
        <div class="cg-hub-entrega-foot">
            <div class="cg-hub-entrega-totales">
                <span>Abonado ${fmtMoneyCg(det.ImporteAbonado ?? det.importeAbonado)}</span>
                <strong>Total ${fmtMoneyCg(det.ImporteTotal ?? det.importeTotal)}</strong>
            </div>
            <a class="cg-hub-entrega-edit" href="${editUrl}" data-id-entrega="${idEntrega}" title="Abrir entrega #${idEntrega}" style="width:auto;padding:0 0.65rem;gap:0.35rem">
                <i class="fa fa-external-link"></i> Abrir entrega
            </a>
        </div>
        ${notas.length ? `<div class="cg-hub-entrega-notas">${notas.map(n => `<div>${escapeCg(n)}</div>`).join("")}</div>` : ""}
    </div>`;
}

async function cargarTabEntregas() {
    await cargarHubEntregasCg(true);
}

/* ---- Recorridos (inline en recoleccion) ---- */

async function cargarTabRecorridos() {
    try {
        const items = await fetchJsonCg(API_CG.recorridosPorCliente(CG.id), { headers: authCg() });
        marcarDiasEnRutaCg(items || []);
        renderRecorridosCg(items || [], false, "#cgRecorridosAsignados");
    } catch (e) {
        console.warn("Recorridos no disponibles:", e);
        marcarDiasEnRutaCg([]);
        renderRecorridosCg([], true, "#cgRecorridosAsignados");
    }
    CG.tabsLoaded.recorridos = true;
}

function renderRecorridosCg(items, huboError, containerSelector) {
    const cont = $(containerSelector || "#cgListaRecorridos");

    if (huboError) {
        cont.html(`
            <div class="cg-empty-state cg-empty-state--warn">
                <span class="cg-empty-icon"><i class="fa fa-exclamation-circle"></i></span>
                <p class="cg-empty-title">No pudimos mostrar los recorridos</p>
                <p class="cg-empty-hint">Intente actualizar la pagina. Si el problema continua, contacte al administrador del sistema.</p>
            </div>`);
        return;
    }

    if (!items.length) {
        cont.html(`
            <div class="cg-empty-state">
                <span class="cg-empty-icon"><i class="fa fa-road"></i></span>
                <p class="cg-empty-title">Sin recorridos asignados</p>
                <p class="cg-empty-hint">Este cliente aun no esta en ninguna ruta de recoleccion. Use <strong>Gestionar recorridos</strong> para asignarlo a una unidad, dia y posicion.</p>
            </div>`);
        return;
    }

    cont.html(items.map(r => `
        <div class="cg-recorrido-item ${r.Activo ? "" : "cg-recorrido-inactivo"}" data-id="${r.Id}">
            <div class="cg-recorrido-main">
                <i class="fa fa-truck me-2"></i>
                <strong>${escapeCg(r.RecorridoTexto || `${r.Camion} ${r.Semana} ${r.Dia}`)}</strong>
                <span class="badge bg-info ms-2">Pos. ${r.Posicion ?? "-"}</span>
                ${r.Establecimiento ? `<small class="text-muted ms-2">${escapeCg(r.Establecimiento)}</small>` : ""}
            </div>
            <div class="cg-recorrido-meta">
                ${r.Zona ? `<span class="badge bg-secondary">${escapeCg(r.Zona)}</span>` : ""}
                ${r.Activo ? "" : `<span class="badge bg-dark">Inactivo</span>`}
            </div>
            <div class="cg-recorrido-obs">
                <label class="cg-recorrido-obs-label">Observacion hoja de ruta</label>
                <textarea class="form-control form-control-sm cg-recorrido-obs-input"
                          rows="2"
                          maxlength="500"
                          data-id="${r.Id}"
                          data-id-cliente="${r.IdCliente}"
                          data-id-establecimiento="${r.IdEstablecimiento ?? ""}"
                          data-id-camion="${r.IdCamion}"
                          data-id-semana="${r.IdSemana}"
                          data-id-dia="${r.IdDia}"
                          data-posicion="${r.Posicion ?? 1}"
                          data-activo="${r.Activo ? "1" : "0"}"
                          placeholder="Indicaciones para el chofer (se ven en la hoja de ruta)">${escapeCg(r.Observacion || "")}</textarea>
            </div>
        </div>`).join(""));

    cont.find(".cg-recorrido-obs-input").off("blur.cgObs").on("blur.cgObs", function () {
        guardarObservacionRecorridoCg(this);
    });
}

async function guardarObservacionRecorridoCg(el) {
    const $el = $(el);
    const id = parseInt($el.data("id"), 10) || 0;
    if (!id) return;

    const valor = ($el.val() || "").trim();
    const prev = ($el.data("prev") ?? $el.prop("defaultValue") ?? "").toString().trim();
    if (valor === prev) return;

    const payload = {
        Id: id,
        IdCliente: parseInt($el.data("id-cliente"), 10) || CG.id,
        IdEstablecimiento: (() => {
            const v = parseInt($el.data("id-establecimiento"), 10);
            return v > 0 ? v : null;
        })(),
        IdCamion: parseInt($el.data("id-camion"), 10),
        IdSemana: parseInt($el.data("id-semana"), 10),
        IdDia: parseInt($el.data("id-dia"), 10),
        Posicion: parseInt($el.data("posicion"), 10) || 1,
        Activo: String($el.data("activo")) === "1",
        Observacion: valor || null
    };

    try {
        const data = await fetchJsonCg("/Recorridos/ActualizarClienteRecorrido", {
            method: "PUT",
            headers: authCg(),
            body: JSON.stringify(payload)
        });

        if (!(data?.valor ?? data?.Valor)) {
            errorModal(data?.mensaje ?? data?.Mensaje ?? "No se pudo guardar la observacion.");
            $el.val(prev);
            return;
        }

        $el.data("prev", valor);
        $el.prop("defaultValue", valor);
        if (typeof showToast === "function") showToast("Observacion guardada.", "success");
    } catch (e) {
        console.error(e);
        errorModal("Error al guardar la observacion.");
        $el.val(prev);
    }
}

/* ---- Control mensual ---- */

const MESES_CORTOS_CG = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function initFiltrosControlCg() {
    const $aniosChips = $h("cgControlAniosChips");
    const $mesesChips = $h("cgControlMesesChips");
    if (!$aniosChips.length || !$mesesChips.length) return;

    const actual = new Date().getFullYear();
    if (!hubFiltrosCg().anios?.length) {
        hubFiltrosCg().anios = [actual];
        hubFiltrosCg().meses = [];
    }

    $aniosChips.empty();
    for (let y = actual; y >= actual - 8; y--) {
        $aniosChips.append(
            `<button type="button" class="cg-cm-chip cg-cm-chip--anio" data-tipo="anio" data-val="${y}">${y}</button>`
        );
    }

    $mesesChips.empty();
    for (let m = 1; m <= 12; m++) {
        $mesesChips.append(
            `<button type="button" class="cg-cm-chip cg-cm-chip--mes" data-tipo="mes" data-val="${m}" title="${MES_NOMBRES_CG[m]}">${MESES_CORTOS_CG[m - 1]}</button>`
        );
    }

    renderEstadoFiltrosControlCg(false);
}

function renderEstadoFiltrosControlCg(refreshData = true) {
    const { anios, meses } = hubFiltrosCg();

    $h("cgControlAniosChips").find(".cg-cm-chip").each(function () {
        const v = parseInt($(this).data("val"), 10);
        $(this).toggleClass("is-active", anios.includes(v));
    });

    $h("cgControlMesesChips").find(".cg-cm-chip").each(function () {
        const v = parseInt($(this).data("val"), 10);
        $(this).toggleClass("is-active", meses.includes(v));
    });

    syncPresetButtonsCg();
    actualizarResumenFiltrosCg();

    if (refreshData) {
        const idsEst = isHubEstCg() ? idsEstablecimientoSeleccionadosCg() : null;
        cargarTabControlMensual(true, idsEst);
    }
}

function toggleFiltroControlCg(tipo, val) {
    if (!val || Number.isNaN(val)) return;

    if (tipo === "anio") {
        const idx = hubFiltrosCg().anios.indexOf(val);
        if (idx >= 0) hubFiltrosCg().anios.splice(idx, 1);
        else hubFiltrosCg().anios.push(val);
        hubFiltrosCg().anios.sort((a, b) => b - a);
    } else if (tipo === "mes") {
        const idx = hubFiltrosCg().meses.indexOf(val);
        if (idx >= 0) hubFiltrosCg().meses.splice(idx, 1);
        else hubFiltrosCg().meses.push(val);
        hubFiltrosCg().meses.sort((a, b) => a - b);
    }

    renderEstadoFiltrosControlCg(true);
}

function actualizarResumenFiltrosCg() {
    const { anios, meses } = hubFiltrosCg();
    const txtAnios = anios.length
        ? `${anios.length} ano${anios.length === 1 ? "" : "s"}`
        : "Sin anos";
    const txtMeses = meses.length
        ? `${meses.length} mes${meses.length === 1 ? "" : "es"}`
        : "Todos los meses";
    $h("cgControlFiltroResumen").text(`${txtAnios} · ${txtMeses}`);
}

function syncPresetButtonsCg() {
    const meses = hubFiltrosCg().meses;
    const presets = {
        "1,2,3": [1, 2, 3],
        "4,5,6": [4, 5, 6],
        "7,8,9": [7, 8, 9],
        "10,11,12": [10, 11, 12]
    };

    const $root = isHubEstCg() ? $("#cgEstHubMount") : $(document);
    $root.find(".cg-preset-meses").removeClass("is-active");

    if (meses.length === 0) {
        $root.find('.cg-preset-meses[data-meses="all"]').addClass("is-active");
    } else {
        Object.entries(presets).forEach(([key, vals]) => {
            const match = vals.length === meses.length && vals.every(v => meses.includes(v));
            if (match) $root.find(`.cg-preset-meses[data-meses="${key}"]`).addClass("is-active");
        });
    }

    const $btnAnios = $h("btnControlAniosRecientes");
    $btnAnios.removeClass("is-active");
    if (esPresetAniosRecientesCg(hubFiltrosCg().anios)) {
        $btnAnios.addClass("is-active");
    }
}

function esPresetAniosRecientesCg(anios) {
    const actual = new Date().getFullYear();
    const expected = [actual, actual - 1, actual - 2];
    const seleccion = [...(anios || [])].sort((a, b) => b - a);
    return seleccion.length === 3 && expected.every(y => seleccion.includes(y));
}

function leerFiltrosControlCg() {
    return {
        anios: [...hubFiltrosCg().anios],
        meses: [...hubFiltrosCg().meses]
    };
}

function aplicarPresetMesesCg(valor) {
    if (valor === "all") {
        hubFiltrosCg().meses = [];
    } else {
        hubFiltrosCg().meses = String(valor || "")
            .split(",")
            .map(v => parseInt(v.trim(), 10))
            .filter(n => n >= 1 && n <= 12);
    }
    renderEstadoFiltrosControlCg(false);
}

function aplicarPresetAniosRecientesCg() {
    const actual = new Date().getFullYear();
    hubFiltrosCg().anios = [actual, actual - 1, actual - 2];
    renderEstadoFiltrosControlCg(false);
}

async function cargarTabControlMensual(force, idsEstForzados) {
    if (CG.id <= 0) return;
    const idsEst = Array.isArray(idsEstForzados)
        ? idsEstForzados.map(Number).filter(x => x > 0)
        : (isHubEstCg() ? idsEstablecimientoSeleccionadosCg() : []);
    const filtrarEst = idsEst.length > 0;

    const run = async () => {
        if (force && !filtrarEst) CG.tabsLoaded.controlMensual = false;

        const { anios, meses } = leerFiltrosControlCg();
        setHubPropCg("controlAnualError", false);

        try {
            const data = await fetchJsonCg(
                API_CG.controlMensual(CG.id, anios, meses, filtrarEst ? idsEst : null),
                { headers: authCg() }
            );
            setHubPropCg("controlFiltrado", data);
            CG.controlAnio = anios[0] || new Date().getFullYear();
            renderControlMensualCg(data);
        } catch (e) {
            console.warn("Control mensual no disponible:", e);
            setHubPropCg("controlAnualError", true);
            const empty = {
                Filas: [],
                StockActual: 0,
                TotalSaldo: 0,
                DatosParciales: true
            };
            setHubPropCg("controlFiltrado", empty);
            renderControlMensualCg(empty);
        }
        if (!filtrarEst) CG.tabsLoaded.controlMensual = true;
    };

    await withCgLoading("Actualizando planilla mensual…", async () => {
        if (filtrarEst) await withHubModeCg("est", run);
        else await run();
    });
}

function renderControlMensualCg(data) {
    const filas = Array.isArray(data?.Filas) ? data.Filas : (data?.Meses || []);
    const columnas = Array.isArray(data?.ProductosColumnas) ? data.ProductosColumnas : [];
    const tbody = $h("cgControlMensualBody");
    const thead = $h("cgControlMensualHead");
    const { anios } = leerFiltrosControlCg();
    const aniosUnicos = [...new Set(filas.map(f => f.Anio).filter(Boolean))];
    const mostrarAnio = anios.length > 1 || aniosUnicos.length > 1;

    $h("cgControlStockActual").text(fmtQtyCg(data?.StockActual));
    const totalSaldo = Number(data?.TotalSaldo) || 0;
    $h("cgControlSaldoAnual")
        .text(fmtMoneyCg(totalSaldo))
        .removeClass("rp-money-pos rp-money-neg rp-money-zero")
        .addClass(typeof clsSaldoDeudaMoney === "function" ? clsSaldoDeudaMoney(totalSaldo) : "");
    $h("cgControlError").toggleClass("d-none", !(data?.DatosParciales || hubPropCg("controlAnualError")));
    $h("cgControlCount").text(filas.length ? String(filas.length) : "0");

    renderAlertaAtrasosCg(filas);
    $h("tblControlMensual").toggleClass("cg-cm-show-anio", !!mostrarAnio);

    const nProd = columnas.length;
    const colspanEnt = Math.max(nProd, 1);
    const colspanRet = Math.max(nProd, 1);

    thead.html(`
        <tr class="cg-cm-head-grp">
            ${mostrarAnio ? `<th class="cg-cm-sticky-left cg-cm-col-anio" rowspan="2">Año</th>` : ""}
            <th class="${mostrarAnio ? "cg-cm-sticky-left-2" : "cg-cm-sticky-left"}" rowspan="2">Mes</th>
            <th class="${mostrarAnio ? "cg-cm-sticky-left-3" : "cg-cm-sticky-left-2"}" rowspan="2">Visita</th>
            <th class="cg-cm-th-grp-ent" colspan="${colspanEnt}">Productos entregados</th>
            <th class="cg-cm-th-grp-ret" colspan="${colspanRet}">Productos retirados</th>
            <th class="cg-cm-th-grp-money" colspan="8">Pagos y saldo</th>
        </tr>
        <tr class="cg-cm-head-cols">
            ${nProd
                ? columnas.map(c => `<th class="cg-cm-th-prod-ent" title="${escapeCg(c.Nombre)}">${escapeCg((c.Abreviatura || c.Nombre || "").trim() || ("#" + c.IdProducto))}</th>`).join("")
                : `<th class="cg-cm-th-prod-ent">—</th>`}
            ${nProd
                ? columnas.map(c => `<th class="cg-cm-th-prod-ret" title="${escapeCg(c.Nombre)}">${escapeCg((c.Abreviatura || c.Nombre || "").trim() || ("#" + c.IdProducto))}</th>`).join("")
                : `<th class="cg-cm-th-prod-ret">—</th>`}
            <th class="cg-cm-cell-money">Debe</th>
            <th class="cg-cm-cell-money">Efectivo</th>
            <th class="cg-cm-cell-money">Transf.</th>
            <th>F. transf.</th>
            <th class="cg-cm-cell-money">Intereses</th>
            <th>S/E</th>
            <th>Obs.</th>
            <th class="cg-cm-cell-money cg-cm-th-saldo">Saldo</th>
        </tr>`);

    if (!filas.length) {
        const cols = (mostrarAnio ? 1 : 0) + 2 + colspanEnt + colspanRet + 8;
        tbody.html(`<tr class="cg-cm-empty"><td colspan="${cols}" class="text-center py-4">
            No hay datos para los filtros elegidos.</td></tr>`);
        renderControlMensualCardsCg([], mostrarAnio);
        return;
    }

    tbody.html(filas.map(m => {
        const rowClass = m.SinEntrega ? "cg-cm-sin-entrega" : "";
        const anio = m.Anio || CG.controlAnio;
        const saldo = Number(m.Saldo) || 0;
        const saldoClass = typeof clsSaldoDeudaMoney === "function"
            ? clsSaldoDeudaMoney(saldo)
            : (saldo > 0 ? "cg-cm-saldo-neg" : (saldo < 0 ? "cg-cm-saldo-pos" : "cg-cm-saldo-cero"));
        const sel = hubPropCg("hubMesSel") && hubPropCg("hubMesSel").anio === anio && hubPropCg("hubMesSel").mes === m.Mes ? " is-selected" : "";
        const atrasado = puedeCargarInteresMesCg(m, anio, m.Mes);
        const vencido = atrasado ? " cg-cm-vencido" : "";
        const badgeAtraso = atrasado
            ? `<span class="cg-cm-badge-atraso" title="Pago atrasado más de 1 mes">Atrasado</span>`
            : "";
        // Productos del mes puede traer varias filas del mismo producto (distinta lista/precio):
        // en la planilla anual se suman cantidades por IdProducto.
        const mapaProd = {};
        (m.Productos || []).forEach(p => {
            const id = Number(p.IdProducto) || 0;
            if (id <= 0) return;
            if (!mapaProd[id]) mapaProd[id] = { Entregadas: 0, Retiradas: 0 };
            mapaProd[id].Entregadas += Number(p.Entregadas) || 0;
            mapaProd[id].Retiradas += Number(p.Retiradas) || 0;
        });

        const celdasEnt = nProd
            ? columnas.map(c => {
                const p = mapaProd[c.IdProducto];
                const q = Number(p?.Entregadas) || 0;
                const cls = q === 0 ? (m.SinEntrega ? "is-zero" : "is-empty") : "";
                return `<td class="cg-cm-cell-qty ${cls}" title="${escapeCg(c.Nombre)}">${q === 0 ? (m.SinEntrega ? "0" : "—") : fmtQtyCg(q)}</td>`;
            }).join("")
            : `<td class="cg-cm-cell-qty is-empty">—</td>`;

        const celdasRet = nProd
            ? columnas.map(c => {
                const p = mapaProd[c.IdProducto];
                const q = Number(p?.Retiradas) || 0;
                return `<td class="cg-cm-cell-qty ${q === 0 ? "is-empty" : ""}" title="${escapeCg(c.Nombre)}">${q === 0 ? "—" : fmtQtyCg(q)}</td>`;
            }).join("")
            : `<td class="cg-cm-cell-qty is-empty">—</td>`;

        return `<tr class="${rowClass}${sel}${vencido}" data-anio="${anio}" data-mes="${m.Mes}">
            ${mostrarAnio ? `<td class="cg-cm-sticky-left cg-cm-col-anio cg-cm-mes">${anio}</td>` : ""}
            <td class="${mostrarAnio ? "cg-cm-sticky-left-2" : "cg-cm-sticky-left"} cg-cm-mes">${escapeCg(m.MesNombre)}${badgeAtraso}</td>
            <td class="${mostrarAnio ? "cg-cm-sticky-left-3" : "cg-cm-sticky-left-2"} cg-cm-date">${formatearFechaCortaCg(m.FechaVisita)}</td>
            ${celdasEnt}
            ${celdasRet}
            <td class="cg-cm-cell-money cg-cm-debe">${fmtMoneyCg(m.Debe)}</td>
            <td class="cg-cm-cell-money ${(Number(m.AbonoEfectivo) || 0) > 0 ? "cg-cm-haber" : ""}">${fmtMoneyCg(m.AbonoEfectivo)}</td>
            <td class="cg-cm-cell-money ${(Number(m.AbonoTransferencia) || 0) > 0 ? "cg-cm-haber" : ""}">${fmtMoneyCg(m.AbonoTransferencia)}</td>
            <td class="cg-cm-date">${formatearFechaCortaCg(m.FechaTransferencia)}</td>
            <td class="cg-cm-cell-money cg-cm-int">${celdaInteresesMesCg(m, anio)}</td>
            <td class="cg-cm-flag">${m.SinEntrega ? '<i class="fa fa-times text-danger"></i>' : ""}</td>
            <td class="cg-cm-obs" title="${escapeCg(m.Observaciones || "")}">${escapeCg(truncarCg(m.Observaciones, 24))}</td>
            <td class="cg-cm-cell-money cg-cm-saldo-final ${saldoClass}">${fmtMoneyCg(m.Saldo)}</td>
        </tr>`;
    }).join(""));

    renderControlMensualCardsCg(filas, mostrarAnio);

    if (hubPropCg("hubMesSel")) {
        const still = filas.find(f => Number(f.Anio || CG.controlAnio) === hubPropCg("hubMesSel").anio && Number(f.Mes) === hubPropCg("hubMesSel").mes);
        if (still) abrirWorkspaceMesCg(hubPropCg("hubMesSel").anio, hubPropCg("hubMesSel").mes, true);
        else {
            $h("cgHubMesDetail").prop("hidden", true);
            setHubPropCg("hubMesSel", null);
        }
    }
}

async function abrirWorkspaceMesCg(anio, mes, keepScroll) {
    const filas = hubPropCg("controlFiltrado")?.Filas || [];
    const m = filas.find(x => Number(x.Mes) === mes && Number(x.Anio || CG.controlAnio) === anio);
    if (!m) return;

    setHubPropCg("hubMesSel", { anio, mes });
    $("#cgControlMensualBody tr").removeClass("is-selected");
    $(`#cgControlMensualBody tr[data-anio="${anio}"][data-mes="${mes}"]`).addClass("is-selected");

    $h("cgHubMesDetailTitulo").text(`${m.MesNombre} ${anio}`);
    $h("cgMesWsKpis").html(`
        <div class="cg-mes-ws-kpi"><span>Entregadas</span><strong>${fmtQtyCg(m.Entregadas)}</strong></div>
        <div class="cg-mes-ws-kpi"><span>Retiradas</span><strong>${fmtQtyCg(m.Retiradas)}</strong></div>
        <div class="cg-mes-ws-kpi"><span>Stock mes</span><strong>${fmtQtyCg(m.StockCliente)}</strong></div>
        <div class="cg-mes-ws-kpi"><span>Debe</span><strong class="cg-val-debe">${fmtMoneyCg(m.Debe)}</strong></div>
        <div class="cg-mes-ws-kpi"><span>Intereses</span><strong class="cg-val-debe">${fmtMoneyCg(m.TotalIntereses)}</strong></div>
        <div class="cg-mes-ws-kpi"><span>Haber</span><strong class="cg-val-haber">${fmtMoneyCg(m.Haber)}</strong></div>
        <div class="cg-mes-ws-kpi"><span>Saldo</span><strong class="${typeof clsSaldoDeudaMoney === "function" ? clsSaldoDeudaMoney(m.Saldo) : ""}">${fmtMoneyCg(m.Saldo)}</strong></div>
    `);

    const prods = Array.isArray(m.Productos) ? m.Productos : [];
    const wrap = $h("cgHubMesProductos");
    if (!prods.length) {
        wrap.html(`<div class="cg-hub-stock-empty">Sin productos en entregas de este mes. Cargalos abajo en el compositor.</div>`);
    } else {
        wrap.html(`<div class="cg-hub-prod-table-wrap"><table class="cg-hub-prod-table cg-hub-prod-table--mes">
            <thead>
                <tr class="cg-hub-prod-grp">
                    <th rowspan="2" class="cg-prod-th-prod">Producto</th>
                    <th rowspan="2" class="cg-prod-th-lista">Lista / tipo pago</th>
                    <th colspan="3" class="cg-prod-th-grp cg-prod-th-grp--ent"><i class="fa fa-arrow-up"></i> Entregadas</th>
                    <th colspan="3" class="cg-prod-th-grp cg-prod-th-grp--ret"><i class="fa fa-arrow-down"></i> Retiradas</th>
                </tr>
                <tr class="cg-hub-prod-cols">
                    <th class="text-end cg-prod-th-ent">Cant.</th>
                    <th class="text-end cg-prod-th-ent">P. unit.</th>
                    <th class="text-end cg-prod-th-ent">Subtotal</th>
                    <th class="text-end cg-prod-th-ret">Cant.</th>
                    <th class="text-end cg-prod-th-ret">P. unit.</th>
                    <th class="text-end cg-prod-th-ret">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${prods.map(p => {
                    const lista = p.ListaPrecio || p.listaPrecio || "";
                    const ent = Number(p.Entregadas) || 0;
                    const ret = Number(p.Retiradas) || 0;
                    const subEnt = Number(p.SubtotalEntregas) || 0;
                    const subRet = Number(p.SubtotalRetiros) || 0;
                    return `<tr>
                    <td class="cg-prod-td-prod">
                        <div class="cg-hub-prod-name">${escapeCg(p.Producto)}</div>
                        ${p.Abreviatura ? `<div class="cg-hub-prod-abrev">${escapeCg(p.Abreviatura)}</div>` : ""}
                    </td>
                    <td class="cg-prod-td-lista">
                        ${lista
                            ? `<span class="cg-hub-prod-lista">${escapeCg(lista)}</span>`
                            : `<span class="cg-hub-prod-lista cg-hub-prod-lista--empty">—</span>`}
                    </td>
                    <td class="text-end cg-prod-td-ent ${ent ? "is-filled" : "is-zero"}">${fmtQtyCg(p.Entregadas)}</td>
                    <td class="text-end cg-prod-td-ent ${ent ? "is-filled" : "is-zero"}">${fmtMoneyCg(p.PrecioUnitarioEntrega)}</td>
                    <td class="text-end cg-prod-td-ent cg-prod-td-sub ${subEnt ? "is-filled" : "is-zero"}">${fmtMoneyCg(p.SubtotalEntregas)}</td>
                    <td class="text-end cg-prod-td-ret ${ret ? "is-filled" : "is-zero"}">${fmtQtyCg(p.Retiradas)}</td>
                    <td class="text-end cg-prod-td-ret ${ret ? "is-filled" : "is-zero"}">${fmtMoneyCg(p.PrecioUnitarioRetiro)}</td>
                    <td class="text-end cg-prod-td-ret cg-prod-td-sub ${subRet ? "is-filled" : "is-zero"}">${fmtMoneyCg(p.SubtotalRetiros)}</td>
                </tr>`;
                }).join("")}
            </tbody>
        </table></div>`);
    }

    $h("cgCmIdControl").val(m.IdControl || 0);
    $h("cgCmAnio").val(anio);
    $h("cgCmMes").val(m.Mes);
    $h("cgCmFechaVisita").val(fechaInputCg(m.FechaVisita) || fechaInputCg(new Date(anio, mes - 1, Math.min(new Date().getDate(), 28))));
    setImporteInputCg("#cgCmAbonoEfectivo", m.AbonoEfectivo);
    setImporteInputCg("#cgCmAbonoTransferencia", m.AbonoTransferencia);
    $h("cgCmFechaTransferencia").val(fechaInputCg(m.FechaTransferencia));
    $h("cgCmCajasAFavor").val(m.CajasAFavor ?? 0);
    $h("cgCmSinEntrega").prop("checked", !!m.SinEntrega);
    syncSinEntregaUiCg();
    $h("cgCmObservaciones").val(m.Observaciones || "");

    // Misma fecha para visita y entrega (un solo campo visible)
    $h("cgWsFechaEntrega").val($h("cgCmFechaVisita").val());
    $h("btnWsAbrirModuloEntregas").attr("href", API_CG.entregaIndex(CG.id));

    await prepararComposerWsCg();
    await cargarCobrosMesWsCg(anio, mes);

    $h("cgHubMesDetail").prop("hidden", false);
    actualizarBotonInteresMesHub(m, anio, mes);
    actualizarChipsAtrasosSeleccionCg(anio, mes);
    if (!keepScroll) {
        document.getElementById("cgHubMesDetail")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

function leerNumeroWsCg(valor) {
    if (valor == null || String(valor).trim() === "") return 0;
    if (typeof parseNumero === "function") return parseNumero(valor) || 0;
    const n = parseFloat(String(valor).replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

async function prepararComposerWsCg() {
    setHubPropCg("wsLineas", []);
    setHubPropCg("wsCobros", []);
    try {
        if (!CG.wsProductosCatalogo.length) {
            CG.wsProductosCatalogo = await fetchJsonCg(API_CG.productosCatalogo, { headers: authCg() }) || [];
        }
    } catch (e) {
        console.warn(e);
        CG.wsProductosCatalogo = [];
    }

    try {
        if (!CG.wsListasPrecios.length) {
            CG.wsListasPrecios = await fetchJsonCg(API_CG.listasPrecios, { headers: authCg() }) || [];
        }
    } catch (e) {
        console.warn(e);
        CG.wsListasPrecios = [];
    }

    if (!CG.cuentas.length) {
        try {
            CG.cuentas = await fetchJsonCg(API_CG.cuentas, { headers: authCg() }) || [];
        } catch (e) {
            console.warn(e);
            CG.cuentas = [];
        }
    }

    try {
        const ests = await fetchJsonCg(API_CG.establecimientosPorCliente(CG.id), { headers: authCg() }) || [];
        CG.wsEstablecimientos = Array.isArray(ests) ? ests : [];
    } catch (e) {
        console.warn(e);
        CG.wsEstablecimientos = [];
    }

    const $sel = $h("cgWsEstablecimiento");
    $sel.empty().append(`<option value="">Seleccionar</option>`);
    CG.wsEstablecimientos.forEach(e => {
        const id = e.Id || e.id;
        const nom = e.Nombre || e.nombre || `Est. #${id}`;
        $sel.append(`<option value="${id}">${escapeCg(nom)}</option>`);
    });
    const idEstLock = hubIdEstablecimientoCg();
    if (idEstLock > 0) {
        $sel.val(String(idEstLock)).prop("disabled", true);
    } else {
        $sel.prop("disabled", false);
        if (CG.wsEstablecimientos.length === 1) {
            $sel.val(String(CG.wsEstablecimientos[0].Id || CG.wsEstablecimientos[0].id));
        }
    }

    await cargarSugeridosWsCg(Number($sel.val()) || null);
    if (!hubPropCg("wsLineas").length) agregarLineaWsCg();
    else renderLineasWsCg();
    renderCobrosWsCg();
}

async function obtenerPreciosProductoWsCg(idProducto) {
    const id = Number(idProducto || 0);
    if (id <= 0) return [];
    if (CG.wsPreciosCache[id]) return CG.wsPreciosCache[id];
    try {
        CG.wsPreciosCache[id] = await fetchJsonCg(API_CG.preciosProducto(id), { headers: authCg() }) || [];
    } catch (e) {
        console.warn(e);
        CG.wsPreciosCache[id] = [];
    }
    return CG.wsPreciosCache[id];
}

async function obtenerPrecioListaWsCg(idProducto, idLista) {
    const idL = Number(idLista || 0);
    if (!idProducto || !idL) return null;
    const rows = await obtenerPreciosProductoWsCg(idProducto);
    const match = (rows || []).find(r => Number(r.IdListaPrecio) === idL);
    if (!match || match.PrecioVenta == null) return null;
    return Number(match.PrecioVenta);
}

/** Entrega (1): precio 0 por defecto. Retiro (2): trae precio de lista. */
async function sincronizarPrecioLineaWsCg($row, linea, campo) {
    const tipo = Number(linea.TipoMovimiento) || 1;

    if (campo === "tipo") {
        if (tipo === 1) {
            linea.PrecioVenta = 0;
            $row.find(".ws-precio").val(fmtQtyCg(0));
            return;
        }
        if (linea.IdProducto > 0 && linea.IdListaPrecio > 0) {
            const precio = await obtenerPrecioListaWsCg(linea.IdProducto, linea.IdListaPrecio);
            if (precio != null) {
                linea.PrecioVenta = precio;
                $row.find(".ws-precio").val(fmtQtyCg(precio));
            }
        }
        return;
    }

    if (campo !== "prod" && campo !== "lista") return;

    if (campo === "prod" && linea.IdProducto > 0 && !linea.IdListaPrecio) {
        const precios = await obtenerPreciosProductoWsCg(linea.IdProducto);
        const conPrecio = (precios || []).filter(p => Number(p.PrecioVenta) > 0);
        if (conPrecio.length === 1) {
            linea.IdListaPrecio = Number(conPrecio[0].IdListaPrecio);
            $row.find(".ws-lista").val(String(linea.IdListaPrecio));
        }
    }

    if (tipo === 1) {
        // Entrega: no traer precio de lista; dejar vacío / 0 (manual).
        return;
    }

    if (linea.IdProducto > 0 && linea.IdListaPrecio > 0) {
        const precio = await obtenerPrecioListaWsCg(linea.IdProducto, linea.IdListaPrecio);
        if (precio != null) {
            linea.PrecioVenta = precio;
            $row.find(".ws-precio").val(fmtQtyCg(precio));
        }
    }
}

async function cargarSugeridosWsCg(idEstablecimiento) {
    try {
        CG.wsSugeridos = await fetchJsonCg(API_CG.productosSugeridos(CG.id, idEstablecimiento), { headers: authCg() }) || [];
    } catch (e) {
        console.warn(e);
        CG.wsSugeridos = [];
    }

    const $box = $h("cgWsSugeridos");
    if (!CG.wsSugeridos.length) {
        $box.html(`<span class="text-muted small">Sin productos del establecimiento. Agregá líneas manualmente.</span>`);
        return;
    }

    $box.html(CG.wsSugeridos.map((s, i) => {
        const label = (s.Abreviatura || s.Producto || "").trim();
        const lista = s.ListaPrecio ? ` · ${s.ListaPrecio}` : "";
        return `<button type="button" class="cg-ws-chip" data-idx="${i}" title="${escapeCg(s.Producto)}${lista}">
            <i class="fa fa-plus"></i> ${escapeCg(label)} × ${fmtQtyCg(s.Cantidad)} · ${fmtMoneyCg(s.PrecioVenta)}
        </button>`;
    }).join(""));
}

function agregarLineaWsCg(pref) {
    hubPropCg("wsLineas").push({
        IdProducto: pref?.IdProducto || 0,
        IdListaPrecio: pref?.IdListaPrecio || 0,
        TipoMovimiento: pref?.TipoMovimiento || 1,
        Cantidad: pref?.Cantidad || 1,
        PrecioVenta: pref?.PrecioVenta || 0
    });
    renderLineasWsCg();
    actualizarResumenCobrosWsCg();
}

function normNumClaveWsCg(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "0";
    return (Math.round(v * 10000) / 10000).toString();
}

/** Huella completa: solo bloquea si TODO coincide. */
function claveLineaWsCompletaCg(l) {
    const tipo = Number(l.TipoMovimiento || 1);
    const idLista = Number(l.IdListaPrecio) > 0 ? Number(l.IdListaPrecio) : 0;
    return [
        Number(l.IdProducto) || 0,
        tipo,
        idLista,
        normNumClaveWsCg(l.Cantidad),
        normNumClaveWsCg(l.PrecioVenta),
        normNumClaveWsCg(l.PorcDescuento || 0),
        normNumClaveWsCg(l.PorcIva || 0)
    ].join("|");
}

function indicesLineasDuplicadasWsCg(lineas) {
    const map = new Map();
    const dups = new Set();
    (lineas || []).forEach((l, i) => {
        if (!(Number(l.IdProducto) > 0)) return;
        const k = claveLineaWsCompletaCg(l);
        if (map.has(k)) {
            dups.add(map.get(k));
            dups.add(i);
        } else {
            map.set(k, i);
        }
    });
    return dups;
}

function hayLineasDuplicadasWsCg(lineas) {
    return indicesLineasDuplicadasWsCg(lineas).size > 0;
}

function actualizarAlertaDuplicadosLineasWsCg() {
    const lineas = hubPropCg("wsLineas") || [];
    const dups = indicesLineasDuplicadasWsCg(lineas);
    const hayDup = dups.size > 0;

    $h("cgWsLineasBody").find(".cg-ws-linea").each(function () {
        const idx = Number($(this).data("idx"));
        $(this).toggleClass("cg-ws-linea--dup", dups.has(idx));
    });

    const $alert = $h("cgWsLineasDupAlert");
    if ($alert.length) $alert.toggleClass("d-none", !hayDup);

    return !hayDup;
}

function renderLineasWsCg() {
    const optsProd = (CG.wsProductosCatalogo || []).map(p => {
        const id = p.Id || p.id;
        const nom = p.Nombre || p.nombre || `#${id}`;
        return `<option value="${id}">${escapeCg(nom)}</option>`;
    }).join("");

    const optsLista = (CG.wsListasPrecios || []).map(l => {
        const id = l.Id || l.id;
        const nom = l.Nombre || l.nombre || `Lista #${id}`;
        return `<option value="${id}">${escapeCg(nom)}</option>`;
    }).join("");

    if (!hubPropCg("wsLineas").length) {
        $h("cgWsLineasBody").html(`<div class="cg-ws-lineas-empty">Sin líneas. Agregá un producto o usá un sugerido arriba.</div>`);
        actualizarAlertaDuplicadosLineasWsCg();
        return;
    }

    $h("cgWsLineasBody").html(hubPropCg("wsLineas").map((l, i) => `
        <div class="cg-ws-linea" data-idx="${i}">
            <div class="cg-ws-linea-top">
                <span class="cg-ws-linea-num">#${i + 1}</span>
            </div>
            <div class="cg-ws-linea-grid">
                <label class="cg-ws-field cg-ws-field--prod">
                    <span>Producto</span>
                    <select class="form-control ws-prod">
                        <option value="">Seleccionar producto</option>
                        ${optsProd}
                    </select>
                </label>
                <label class="cg-ws-field">
                    <span>Tipo</span>
                    <select class="form-control ws-tipo">
                        <option value="1">Entrega</option>
                        <option value="2">Retiro</option>
                    </select>
                </label>
                <label class="cg-ws-field">
                    <span>Lista / Tipo pago</span>
                    <select class="form-control ws-lista">
                        <option value="">Seleccionar</option>
                        ${optsLista}
                    </select>
                </label>
                <label class="cg-ws-field cg-ws-field--num">
                    <span>Cantidad</span>
                    <input type="text" class="form-control Inputmiles ws-cant" value="${fmtQtyCg(l.Cantidad)}" inputmode="decimal" />
                </label>
                <label class="cg-ws-field cg-ws-field--num">
                    <span>Precio</span>
                    <input type="text" class="form-control Inputmiles ws-precio" value="${fmtQtyCg(Number(l.PrecioVenta) || 0)}" inputmode="decimal" />
                </label>
            </div>
            <div class="cg-ws-linea-foot">
                <div class="cg-ws-linea-subtotal">
                    <span>Subtotal</span>
                    <strong class="ws-sub">${fmtMoneyCg((Number(l.Cantidad) || 0) * (Number(l.PrecioVenta) || 0))}</strong>
                </div>
                <button type="button" class="btn btn-outline-danger btn-sm btn-ws-quitar" data-idx="${i}" title="Quitar">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        </div>`).join(""));

    hubPropCg("wsLineas").forEach((l, i) => {
        const $row = $h("cgWsLineasBody").find(`.cg-ws-linea[data-idx="${i}"]`);
        if (l.IdProducto) $row.find(".ws-prod").val(String(l.IdProducto));
        if (l.IdListaPrecio) $row.find(".ws-lista").val(String(l.IdListaPrecio));
        $row.find(".ws-tipo").val(String(l.TipoMovimiento || 1));
    });
    actualizarAlertaDuplicadosLineasWsCg();
}

function agregarCobroWsCg(preset) {
    const hoy = $h("cgCmFechaVisita").val() || $h("cgWsFechaEntrega").val() || new Date().toISOString().slice(0, 10);
    const cobros = hubPropCg("wsCobros") || [];
    const cobro = preset || {
        _key: CG.wsNextCobroKey++,
        Fecha: hoy,
        IdCuenta: 0,
        Concepto: "Cobro visita",
        Importe: 0
    };
    if (!cobro._key) cobro._key = CG.wsNextCobroKey++;
    if (!cobro.IdCuenta && (CG.cuentas || []).length === 1) {
        cobro.IdCuenta = Number(CG.cuentas[0].Id) || 0;
    }
    cobros.push(cobro);
    setHubPropCg("wsCobros", cobros);
    renderCobrosWsCg();
}

function sincronizarCobrosWsDesdeDomCg() {
    $h("cgWsCobrosBody").find(".cg-ws-cobro-row").each(function () {
        const key = Number($(this).data("key"));
        const cobro = (hubPropCg("wsCobros") || []).find(c => Number(c._key) === key);
        if (!cobro) return;
        cobro.Fecha = $(this).find(".ws-cobro-fecha").val() || "";
        cobro.IdCuenta = Number($(this).find(".ws-cobro-cuenta").val()) || 0;
        cobro.Concepto = ($(this).find(".ws-cobro-concepto").val() || "").trim();
        cobro.Importe = leerNumeroWsCg($(this).find(".ws-cobro-importe").val());
    });
}

/** El importe solo se edita después de elegir la cuenta de caja. */
function syncImporteHabilitadoCobroWsCg($row) {
    if (!$row?.length) return;
    const idCuenta = Number($row.find(".ws-cobro-cuenta").val()) || 0;
    const $imp = $row.find(".ws-cobro-importe");
    const habilitar = idCuenta > 0;
    $imp.prop("disabled", !habilitar);
    $imp.prop("readonly", !habilitar);
    $imp.attr("tabindex", habilitar ? "0" : "-1");
    $imp.toggleClass("ws-cobro-importe--locked", !habilitar);
    if (!habilitar) {
        $imp.val("");
        const key = Number($row.data("key"));
        const cobro = (hubPropCg("wsCobros") || []).find(c => Number(c._key) === key);
        if (cobro) cobro.Importe = 0;
    }
    $imp.attr("placeholder", habilitar ? "" : "Elegí cuenta");
    $imp.attr("title", habilitar ? "" : "Seleccioná la cuenta para cargar el importe");
}

function syncImporteHabilitadoModalCobroCg() {
    const idCuenta = parseInt($("#cgCobroCuenta").val(), 10) || 0;
    const $imp = $("#cgCobroImporte");
    const habilitar = idCuenta > 0;
    $imp.prop("disabled", !habilitar).prop("readonly", !habilitar);
    $imp.attr("tabindex", habilitar ? "0" : "-1");
    if (!habilitar) $imp.val("");
    $imp.attr("placeholder", habilitar ? "" : "Elegí cuenta");
    $imp.attr("title", habilitar ? "" : "Seleccioná la cuenta para cargar el importe");
}

/** Red de seguridad: si no hay cuenta, no deja tipear/pegar/enfocar el importe. */
function instalarBloqueoImporteSinCuentaCg() {
    if (window.__oaBloqueoImporteSinCuenta) return;
    window.__oaBloqueoImporteSinCuenta = true;

    const selector = ".ws-cobro-importe, #cgCobroImporte";
    const cuentaDe = (el) => {
        if (!el) return 0;
        if (el.id === "cgCobroImporte") return parseInt($("#cgCobroCuenta").val(), 10) || 0;
        const $row = $(el).closest(".cg-ws-cobro-row");
        return Number($row.find(".ws-cobro-cuenta").val()) || 0;
    };

    document.addEventListener("focusin", (e) => {
        const el = e.target?.closest?.(selector);
        if (!el) return;
        if (cuentaDe(el) > 0) return;
        el.blur();
        el.value = "";
        e.stopImmediatePropagation();
    }, true);

    document.addEventListener("keydown", (e) => {
        const el = e.target?.closest?.(selector);
        if (!el) return;
        if (cuentaDe(el) > 0) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        el.value = "";
    }, true);

    document.addEventListener("paste", (e) => {
        const el = e.target?.closest?.(selector);
        if (!el) return;
        if (cuentaDe(el) > 0) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        el.value = "";
    }, true);

    document.addEventListener("input", (e) => {
        const el = e.target?.closest?.(selector);
        if (!el) return;
        if (cuentaDe(el) > 0) return;
        el.value = "";
        e.stopImmediatePropagation();
    }, true);
}

function cobrosWsParaGuardarCg() {
    sincronizarCobrosWsDesdeDomCg();
    return (hubPropCg("wsCobros") || []).filter(c => Number(c.Importe) > 0 && Number(c.IdCuenta) > 0);
}

function totalPorTipoWsCg(lineas, tipo) {
    const t = Number(tipo);
    return (lineas || [])
        .filter(l => Number(l.TipoMovimiento || 1) === t)
        .reduce((s, l) => s + (Number(l.Cantidad) || 0) * (Number(l.PrecioVenta) || 0), 0);
}

/** Lo cobrable es el retiro (lo que el cliente paga). */
function totalCobrableWsCg(lineas) {
    return totalPorTipoWsCg(lineas, 2);
}

function actualizarResumenCobrosWsCg() {
    const lineas = (hubPropCg("wsLineas") || []).filter(l => l.IdProducto > 0 && l.Cantidad > 0);
    const cobros = cobrosWsParaGuardarCg();
    const totalEnt = totalPorTipoWsCg(lineas, 1);
    const totalRet = totalPorTipoWsCg(lineas, 2);
    const totalPag = cobros.reduce((s, c) => s + Number(c.Importe || 0), 0);
    const saldo = totalRet - totalPag;
    $h("cgWsCobroTotEntrega").text(fmtMoneyCg(totalEnt));
    $h("cgWsCobroTotRetiro").text(fmtMoneyCg(totalRet));
    $h("cgWsCobroTotPagado").text(fmtMoneyCg(totalPag));
    $h("cgWsCobroSaldo").text(fmtMoneyCg(saldo))
        .toggleClass("text-danger", saldo > 0.009)
        .toggleClass("text-success", saldo < -0.009);
}

function renderCobrosWsCg() {
    const cobros = hubPropCg("wsCobros") || [];
    const $body = $h("cgWsCobrosBody");
    if (!$body.length) return;

    if (!cobros.length) {
        $body.html(`<div class="cg-ws-lineas-empty">Sin cobros de entrega. Usá Agregar cobro si cobrás junto con la visita.</div>`);
        actualizarResumenCobrosWsCg();
        return;
    }

    const optsCuentas = (CG.cuentas || []).map(c =>
        `<option value="${c.Id}">${escapeCg(c.Nombre || ("Cuenta #" + c.Id))}</option>`
    ).join("");

    $body.html(cobros.map(c => {
        const tieneCuenta = Number(c.IdCuenta) > 0;
        return `
        <div class="cg-ws-cobro-row" data-key="${c._key}">
            <label>
                <span>Fecha</span>
                <input type="date" class="form-control ws-cobro-fecha" value="${escapeCg(c.Fecha || "")}" />
            </label>
            <label>
                <span>Cuenta</span>
                <select class="form-control ws-cobro-cuenta">
                    <option value="">Seleccionar</option>
                    ${optsCuentas}
                </select>
            </label>
            <label>
                <span>Concepto</span>
                <input type="text" class="form-control ws-cobro-concepto" value="${escapeCg(c.Concepto || "")}" />
            </label>
            <label>
                <span>Importe</span>
                <input type="text" class="form-control Inputmiles ws-cobro-importe" inputmode="decimal"
                       value="${tieneCuenta && c.Importe ? fmtQtyCg(c.Importe) : ""}"
                       ${tieneCuenta ? "" : "disabled readonly tabindex=\"-1\""}
                       placeholder="${tieneCuenta ? "" : "Elegí cuenta"}"
                       title="${tieneCuenta ? "" : "Seleccioná la cuenta para cargar el importe"}" />
            </label>
            <button type="button" class="btn btn-outline-danger btn-sm btn-ws-quitar-cobro" data-key="${c._key}" title="Quitar">
                <i class="fa fa-trash"></i>
            </button>
        </div>`;
    }).join(""));

    cobros.forEach(c => {
        const $row = $body.find(`.cg-ws-cobro-row[data-key="${c._key}"]`);
        if (c.IdCuenta) $row.find(".ws-cobro-cuenta").val(String(c.IdCuenta));
        syncImporteHabilitadoCobroWsCg($row);
        if (typeof prepararInputMiles === "function") {
            $row.find(".ws-cobro-importe").each(function () { prepararInputMiles(this); });
        }
        // Reafirmar por si prepararInputMiles toca el input
        syncImporteHabilitadoCobroWsCg($row);
    });
    actualizarResumenCobrosWsCg();
}

async function cargarCobrosMesWsCg(anio, mes) {
    const $body = $h("cgWsCobrosMesBody");
    if (!$body.length || !CG.id) return;
    try {
        const movs = await fetchJsonCg(API_CG.ccMovimientos, {
            method: "POST",
            headers: authCg(),
            body: JSON.stringify({ IdCliente: CG.id, TipoMovimiento: "Cobro" })
        }) || [];
        const cobrosMes = (Array.isArray(movs) ? movs : []).filter(m => {
            const f = m.Fecha || m.fecha;
            if (!f) return false;
            const d = new Date(f);
            if (Number.isNaN(d.getTime())) return false;
            const esCobro = String(m.TipoMovimiento || m.Origen || "").toLowerCase().includes("cobro");
            return esCobro && d.getFullYear() === Number(anio) && (d.getMonth() + 1) === Number(mes);
        });
        if (!cobrosMes.length) {
            $body.html(`<div class="cg-ws-lineas-empty">Sin cobros cargados en este mes.</div>`);
            return;
        }
        $body.html(cobrosMes.map(m => `
            <div class="cg-ws-cobro-mes-item">
                <div>
                    <div>${escapeCg(formatearFechaCortaCg(m.Fecha))}</div>
                    <small>${escapeCg(m.Concepto || "Cobro")}</small>
                </div>
                <strong>${fmtMoneyCg(m.Haber || m.Importe || 0)}</strong>
            </div>
        `).join(""));
    } catch (e) {
        console.warn(e);
        $body.html(`<div class="cg-ws-lineas-empty">No se pudieron cargar los cobros del mes.</div>`);
    }
}

function clasificarAbonosDesdeCobrosWsCg(cobros) {
    let efectivo = 0;
    let transferencia = 0;
    (cobros || []).forEach(c => {
        const cuenta = (CG.cuentas || []).find(x => Number(x.Id) === Number(c.IdCuenta));
        const tipo = String(cuenta?.TipoCuenta || cuenta?.Codigo || "Efectivo").toLowerCase();
        const importe = Number(c.Importe) || 0;
        if (tipo.includes("banco") || tipo.includes("transf")) transferencia += importe;
        else efectivo += importe;
    });
    return { efectivo, transferencia };
}

async function guardarVisitaUnificadaCg() {
    if (!CG.id) return;

    // Sync líneas
    $h("cgWsLineasBody").find(".cg-ws-linea").each(function () {
        const idx = Number($(this).data("idx"));
        const linea = hubPropCg("wsLineas")[idx];
        if (!linea) return;
        linea.IdProducto = Number($(this).find(".ws-prod").val()) || 0;
        linea.IdListaPrecio = Number($(this).find(".ws-lista").val()) || 0;
        linea.TipoMovimiento = Number($(this).find(".ws-tipo").val()) || 1;
        linea.Cantidad = leerNumeroWsCg($(this).find(".ws-cant").val());
        linea.PrecioVenta = leerNumeroWsCg($(this).find(".ws-precio").val());
    });

    const lineas = (hubPropCg("wsLineas") || []).filter(l => l.IdProducto > 0 && l.Cantidad > 0);
    const cobros = cobrosWsParaGuardarCg();
    const hayProductos = lineas.length > 0;

    if (lineas.some(l => Number(l.TipoMovimiento) === 2 && !(Number(l.IdListaPrecio) > 0))) {
        errorModal("Seleccioná la lista / tipo de pago en las líneas de retiro.");
        return;
    }

    if (!actualizarAlertaDuplicadosLineasWsCg() || hayLineasDuplicadasWsCg(lineas)) {
        errorModal("No podés repetir una línea 100% igual (producto, tipo, lista, cantidad y precio). Si cambia algún dato, sí se permite.");
        const $a = $h("cgWsLineasDupAlert");
        if ($a.length && $a.offset()) {
            $("html, body").animate({ scrollTop: $a.offset().top - 100 }, 200);
        }
        return;
    }

    if (cobros.length && (hubPropCg("wsCobros") || []).some(c => Number(c.Importe) > 0 && !(Number(c.IdCuenta) > 0))) {
        errorModal("Cada cobro con importe debe tener una cuenta de caja.");
        return;
    }

    if (hayProductos) {
        const fecha = $h("cgCmFechaVisita").val() || $h("cgWsFechaEntrega").val();
        if (!fecha) {
            errorModal("Indicá la fecha de la visita.");
            return;
        }
        $h("cgWsFechaEntrega").val(fecha);
        const idEstWs = Number($h("cgWsEstablecimiento").val()) || hubIdEstablecimientoCg() || 0;
        if (idEstWs <= 0) {
            errorModal("Seleccioná el establecimiento de la entrega.");
            return;
        }

        const totalCobrar = totalCobrableWsCg(lineas);
        const sumaCobros = cobros.reduce((s, c) => s + Number(c.Importe || 0), 0);
        if (sumaCobros > totalCobrar + 0.01) {
            errorModal("La suma de los cobros no puede superar el total de lo retirado.");
            return;
        }

        const payload = {
            Id: 0,
            Fecha: fecha,
            IdCliente: CG.id,
            IdEstablecimiento: idEstWs,
            IdContrato: null,
            IdEstado: null,
            IdCamion: null,
            NotaInterna: `Desde control mensual${hubPropCg("hubMesSel") ? ` (${hubPropCg("hubMesSel").mes}/${hubPropCg("hubMesSel").anio})` : ""} · est ${idEstWs}`,
            NotaCliente: null,
            Lineas: lineas.map(l => ({
                Id: 0,
                IdProducto: l.IdProducto,
                IdListaPrecio: l.IdListaPrecio > 0 ? l.IdListaPrecio : null,
                TipoMovimiento: l.TipoMovimiento,
                Cantidad: l.Cantidad,
                PrecioVenta: l.PrecioVenta,
                CostoUnitario: 0,
                PorcDescuento: 0,
                PorcIva: 0
            })),
            LineasRecuperadas: [],
            Cobros: cobros.map(c => ({
                IdCobro: 0,
                IdMovimientoCc: 0,
                IdCuenta: c.IdCuenta,
                Fecha: c.Fecha,
                Concepto: c.Concepto || "Cobro visita",
                Importe: c.Importe
            }))
        };

        let dataEnt;
        try {
            dataEnt = await fetchJsonCg(API_CG.entregaInsertar, {
                method: "POST",
                headers: authCg(),
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error(e);
            errorModal("Error al registrar la entrega.");
            return;
        }
        if (!dataEnt?.valor) {
            errorModal(dataEnt?.mensaje || "No se pudo registrar la entrega.");
            return;
        }
    } else if (cobros.length) {
        errorModal("Los cobros de esta entrega necesitan al menos un producto. Para un cobro suelto usá «Cobro sin entrega».");
        return;
    }

    // Sync abonos planilla (hoja de ruta) con cobros de esta visita
    if (cobros.length) {
        const { efectivo, transferencia } = clasificarAbonosDesdeCobrosWsCg(cobros);
        const prevEf = leerImporteInputCg("#" + mapHubDomIdCg("cgCmAbonoEfectivo"));
        const prevTr = leerImporteInputCg("#" + mapHubDomIdCg("cgCmAbonoTransferencia"));
        setImporteInputCg("#cgCmAbonoEfectivo", prevEf + efectivo);
        setImporteInputCg("#cgCmAbonoTransferencia", prevTr + transferencia);
        if (transferencia > 0 && !$h("cgCmFechaTransferencia").val()) {
            $h("cgCmFechaTransferencia").val(cobros.find(c => c.Fecha)?.Fecha || $h("cgCmFechaVisita").val() || "");
        }
    }

    try {
        await guardarControlMensualCg({ silent: true });
    } catch (e) {
        errorModal("No se pudo guardar la visita.");
        return;
    }

    exitoModal(hayProductos
        ? "Visita y entrega registradas correctamente."
        : "Visita guardada correctamente.");

    setHubPropCg("wsLineas", []);
    setHubPropCg("wsCobros", []);
    CG.tabsLoaded.cuentaCorriente = false;
    CG.tabsLoaded.cobros = false;

    if (isHubEstCg()) await cargarHubEstablecimientoCg(true);
    else await cargarHubDatosCg(true);

    if (hubPropCg("hubMesSel")) {
        await abrirWorkspaceMesCg(hubPropCg("hubMesSel").anio, hubPropCg("hubMesSel").mes, true);
    }
}

async function registrarEntregaDesdeWsCg() {
    return guardarVisitaUnificadaCg();
}

function mostrarDetalleMesHub(anio, mes, keepScroll) {
    return abrirWorkspaceMesCg(anio, mes, keepScroll);
}

const CG_INTERES_PCT_KEY = "oroAmbiental.interesClientePct";
const CG_INTERES_PCT_DEFAULT = 10;

function leerPctInteresDefaultCg() {
    const raw = localStorage.getItem(CG_INTERES_PCT_KEY);
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
    return CG_INTERES_PCT_DEFAULT;
}

function guardarPctInteresDefaultCg(pct) {
    const n = Number(pct);
    if (Number.isFinite(n) && n >= 0) localStorage.setItem(CG_INTERES_PCT_KEY, String(n));
}

/** Mes vencido si ya pasó más de 1 mes desde el fin de ese período. */
function mesVencidoParaInteresCg(anio, mes) {
    const finMes = new Date(anio, mes, 0, 23, 59, 59);
    const limite = new Date();
    limite.setMonth(limite.getMonth() - 1);
    return finMes.getTime() < limite.getTime();
}

function baseAdeudadaMesCg(m) {
    const neto = (Number(m?.Debe) || 0) - (Number(m?.Haber) || 0);
    return neto > 0.009 ? neto : 0;
}

function puedeCargarInteresMesCg(m, anio, mes) {
    return mesVencidoParaInteresCg(anio, mes) && baseAdeudadaMesCg(m) > 0;
}

function listarMesesAtrasadosCg(filas) {
    return (filas || [])
        .map(m => {
            const anio = Number(m.Anio || CG.controlAnio);
            const mes = Number(m.Mes);
            return {
                anio,
                mes,
                mesNombre: m.MesNombre || `Mes ${mes}`,
                base: baseAdeudadaMesCg(m),
                saldo: Number(m.Saldo) || 0,
                ok: puedeCargarInteresMesCg(m, anio, mes)
            };
        })
        .filter(x => x.ok)
        .sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes));
}

function renderAlertaAtrasosCg(filas) {
    const atrasos = listarMesesAtrasadosCg(filas);
    const $alert = $h("cgAtrasosAlert");
    const $kpi = $h("cgKpiAtrasos");

    if (!$alert.length) return;

    // Si el markup interno se perdió (p.ej. un .empty() previo), no mostrar barra roja vacía.
    if (!$h("cgAtrasosTitulo").length || !$h("cgAtrasosLista").length) {
        $alert.addClass("d-none").prop("hidden", true);
        if ($kpi.length) $kpi.prop("hidden", true);
        return;
    }

    if (!atrasos.length) {
        $alert.addClass("d-none").prop("hidden", true);
        $kpi.prop("hidden", true);
        $h("cgControlAtrasosCount").text("0");
        $h("cgControlAtrasosMonto").text("sin deuda vencida");
        $h("cgAtrasosLista").empty();
        return;
    }

    const totalBase = atrasos.reduce((s, x) => s + x.base, 0);
    const n = atrasos.length;
    const titulo = n === 1
        ? "1 mes con pago atrasado"
        : `${n} meses con pago atrasado`;

    $h("cgAtrasosTitulo").text(titulo);
    $h("cgAtrasosResumen").text(
        `Deuda vencida (más de 1 mes): ${fmtMoneyCg(totalBase)}. Tocá un mes para abrir el detalle o cargar interés.`
    );
    $h("cgControlAtrasosCount").text(String(n));
    $h("cgControlAtrasosMonto").text(fmtMoneyCg(totalBase));

    const sel = hubPropCg("hubMesSel");
    $h("cgAtrasosLista").html(atrasos.map(x => {
        const active = sel && sel.anio === x.anio && sel.mes === x.mes ? " is-active" : "";
        const fila = (filas || []).find(f => Number(f.Anio || CG.controlAnio) === x.anio && Number(f.Mes) === x.mes);
        const cantInt = Number(fila?.CantidadIntereses) || 0;
        const intBadge = cantInt > 0
            ? `<span class="cg-atraso-chip-int" title="Ya tiene ${cantInt} interés(es)">${cantInt}× int.</span>`
            : `<span class="cg-atraso-chip-hint">Sin interés</span>`;
        return `<button type="button" class="cg-atraso-chip${active}" data-anio="${x.anio}" data-mes="${x.mes}">
            <span class="cg-atraso-chip-mes">${escapeCg(x.mesNombre)} ${x.anio}</span>
            <span class="cg-atraso-chip-monto rp-money-out">${fmtMoneyCg(x.base)}</span>
            ${intBadge}
        </button>`;
    }).join(""));

    $alert.removeClass("d-none").prop("hidden", false);
    $kpi.prop("hidden", false);

    const $btn = $h("btnAtrasosToggleLista");
    if ($btn.length && !$h("cgAtrasosLista").hasClass("is-collapsed")) {
        $btn.text("Ocultar").attr("aria-expanded", "true");
    }
}

function actualizarChipsAtrasosSeleccionCg(anio, mes) {
    $("#cgAtrasosLista .cg-atraso-chip, #cgEstAtrasosLista .cg-atraso-chip").each(function () {
        const a = Number($(this).data("anio"));
        const m = Number($(this).data("mes"));
        $(this).toggleClass("is-active", a === anio && m === mes);
    });
}

function celdaInteresesMesCg(m, anio) {
    const cant = Number(m.CantidadIntereses) || 0;
    const total = Number(m.TotalIntereses) || 0;
    if (cant <= 0) {
        return `<span class="cg-cm-int-empty" title="Sin intereses cargados">—</span>`;
    }
    const veces = cant === 1 ? "1 vez" : `${cant} veces`;
    return `<div class="cg-cm-int-cell">
        <span class="cg-cm-int-badge" title="${escapeCg(veces)} · ${fmtMoneyCg(total)}">${cant}×</span>
        <span class="cg-cm-int-monto rp-money-out">${fmtMoneyCg(total)}</span>
        <button type="button" class="cg-cm-int-eye" data-anio="${anio}" data-mes="${m.Mes}" title="Ver intereses de este mes">
            <i class="fa fa-eye"></i>
        </button>
    </div>`;
}

function interesesDelMesCg(anio, mes) {
    const filas = hubPropCg("controlFiltrado")?.Filas || [];
    const m = filas.find(x => Number(x.Mes) === mes && Number(x.Anio || CG.controlAnio) === anio);
    if (m?.Intereses?.length) return m.Intereses;
    return (hubPropCg("controlFiltrado")?.Intereses || []).filter(i =>
        Number(i.AnioRef) === Number(anio) && Number(i.MesRef) === Number(mes));
}

function actualizarBotonInteresMesHub(m, anio, mes) {
    const $btn = $h("btnInteresMesHub");
    if (!$btn.length) return;
    const ok = puedeCargarInteresMesCg(m, anio, mes);
    $btn.toggleClass("d-none", !ok);

    const cant = Number(m?.CantidadIntereses) || 0;
    const $ver = $h("btnVerInteresesMesHub");
    $ver.toggleClass("d-none", cant <= 0);
    if (cant > 0) {
        $ver.html(`<i class="fa fa-eye"></i> Ver intereses (${cant})`);
    }
}

function abrirModalInteresesHistCg(anioFiltro, mesFiltro) {
    const todos = Array.isArray(hubPropCg("controlFiltrado")?.Intereses) ? hubPropCg("controlFiltrado").Intereses : [];
    const filtrar = anioFiltro != null && mesFiltro != null;
    const lista = filtrar
        ? interesesDelMesCg(anioFiltro, mesFiltro)
        : todos.slice().sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime());

    if (filtrar) {
        const m = (hubPropCg("controlFiltrado")?.Filas || []).find(x =>
            Number(x.Mes) === mesFiltro && Number(x.Anio || CG.controlAnio) === anioFiltro);
        const nom = m?.MesNombre || `Mes ${mesFiltro}`;
        $("#cgInteresesHistSub").text(`${nom} ${anioFiltro}`);
    } else {
        $("#cgInteresesHistSub").text("Todos los intereses del cliente");
    }

    const total = lista.reduce((s, x) => s + (Number(x.Importe) || 0), 0);
    const filasPlanilla = hubPropCg("controlFiltrado")?.Filas || [];
    const conInt = filasPlanilla.filter(f => (Number(f.CantidadIntereses) || 0) > 0).length;
    const atrasados = listarMesesAtrasadosCg(filasPlanilla);
    const atrasadosSinInt = atrasados.filter(a => {
        const f = filasPlanilla.find(x => Number(x.Anio || CG.controlAnio) === a.anio && Number(x.Mes) === a.mes);
        return !(Number(f?.CantidadIntereses) || 0);
    });

    $("#cgInteresesHistResumen").html(`
        <div class="cg-interes-hist-kpis">
            <div><span>Cargas</span><strong>${lista.length}</strong></div>
            <div><span>Total</span><strong class="rp-money-out">${fmtMoneyCg(total)}</strong></div>
            ${filtrar ? "" : `<div><span>Meses con interés</span><strong>${conInt}</strong></div>
            <div><span>Atrasados sin interés</span><strong class="${atrasadosSinInt.length ? "rp-money-out" : ""}">${atrasadosSinInt.length}</strong></div>`}
        </div>
        ${!filtrar && atrasadosSinInt.length ? `
            <div class="cg-interes-hist-pendientes">
                <strong>Atrasados sin interés cargado:</strong>
                <div class="cg-interes-hist-chips">
                    ${atrasadosSinInt.map(x =>
                        `<button type="button" class="cg-atraso-chip" data-anio="${x.anio}" data-mes="${x.mes}">
                            <span class="cg-atraso-chip-mes">${escapeCg(x.mesNombre)} ${x.anio}</span>
                            <span class="cg-atraso-chip-monto rp-money-out">${fmtMoneyCg(x.base)}</span>
                        </button>`).join("")}
                </div>
            </div>` : ""}
    `);

    if (!lista.length) {
        $("#cgInteresesHistBody").html(`<div class="cg-hub-stock-empty">No hay intereses cargados${filtrar ? " en este mes" : ""}.</div>`);
    } else {
        $("#cgInteresesHistBody").html(`
            <table class="cg-hub-prod-table cg-interes-hist-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Mes ref.</th>
                        <th>Concepto</th>
                        <th class="text-end">Importe</th>
                    </tr>
                </thead>
                <tbody>
                    ${lista.map(i => {
                        const mesRef = i.MesNombreRef
                            ? `${escapeCg(i.MesNombreRef)} ${i.AnioRef || ""}`
                            : (i.AnioRef && i.MesRef ? `${i.MesRef}/${i.AnioRef}` : "—");
                        return `<tr>
                            <td>${formatearFechaCortaCg(i.Fecha)}</td>
                            <td>${mesRef}</td>
                            <td>${escapeCg(i.Concepto || "")}</td>
                            <td class="text-end rp-money-out">${fmtMoneyCg(i.Importe)}</td>
                        </tr>`;
                    }).join("")}
                </tbody>
            </table>`);
    }

    $("#cgInteresesHistResumen").off("click.cgIntHist").on("click.cgIntHist", ".cg-atraso-chip", function () {
        const anio = Number($(this).data("anio"));
        const mes = Number($(this).data("mes"));
        CG.modalInteresesHist?.hide();
        mostrarDetalleMesHub(anio, mes);
        const row = document.querySelector(`#cgControlMensualBody tr[data-anio="${anio}"][data-mes="${mes}"]`);
        row?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    CG.modalInteresesHist?.show();
}

function abrirModalInteresCg(anio, mes) {
    const filas = hubPropCg("controlFiltrado")?.Filas || [];
    const m = filas.find(x => Number(x.Mes) === mes && Number(x.Anio || CG.controlAnio) === anio);
    if (!m) return;

    if (!puedeCargarInteresMesCg(m, anio, mes)) {
        errorModal("Este mes no tiene saldo adeudado vencido (más de 1 mes).");
        return;
    }

    const base = baseAdeudadaMesCg(m);
    const pct = leerPctInteresDefaultCg();
    const mesNom = m.MesNombre || `Mes ${mes}`;
    const cantPrev = Number(m.CantidadIntereses) || 0;
    const totalPrev = Number(m.TotalIntereses) || 0;

    $("#cgInteresAnio").val(anio);
    $("#cgInteresMes").val(mes);
    $("#cgInteresSubtitulo").text(`Atraso de ${mesNom} ${anio}`);
    setImporteInputCg("#cgInteresBase", base);
    $("#cgInteresPct").val(pct);
    $("#cgInteresFecha").val(new Date().toISOString().slice(0, 10));
    $("#cgInteresConcepto").val(`Interés por atraso ${mesNom} ${anio}`);
    recalcularImporteInteresCg();

    const $aviso = $("#cgInteresAvisoExistente");
    if (cantPrev > 0) {
        const veces = cantPrev === 1 ? "1 vez" : `${cantPrev} veces`;
        $aviso
            .removeClass("d-none")
            .html(`<i class="fa fa-exclamation-triangle"></i>
                <span><strong>Atención:</strong> a este mes ya le cargaron intereses <strong>${veces}</strong>
                (total ${fmtMoneyCg(totalPrev)}). Revisá si corresponde sumar otra carga.</span>
                <button type="button" class="cg-btn cg-btn--ghost cg-btn--sm ms-auto" id="btnAvisoVerIntereses">
                    <i class="fa fa-eye"></i> Ver
                </button>`);
        $aviso.off("click.cgAviso").on("click.cgAviso", "#btnAvisoVerIntereses", () => {
            CG.modalInteres?.hide();
            abrirModalInteresesHistCg(anio, mes);
        });
    } else {
        $aviso.addClass("d-none").empty();
    }

    CG.modalInteres?.show();
}

function recalcularImporteInteresCg() {
    const base = leerImporteInputCg("#cgInteresBase");
    const pct = Number($("#cgInteresPct").val()) || 0;
    const sugerido = Math.round((base * pct / 100) * 100) / 100;
    setImporteInputCg("#cgInteresImporte", sugerido);
}

async function confirmarInteresCg() {
    if (!CG.id) {
        errorModal("Seleccione un cliente.");
        return;
    }

    const importe = leerImporteInputCg("#cgInteresImporte");
    const concepto = ($("#cgInteresConcepto").val() || "").trim();
    const fecha = $("#cgInteresFecha").val();
    const pct = Number($("#cgInteresPct").val()) || 0;

    if (importe <= 0) {
        errorModal("Indique un importe de interés mayor a cero.");
        return;
    }
    if (!concepto) {
        errorModal("El concepto es obligatorio.");
        return;
    }
    if (!fecha) {
        errorModal("Indique la fecha.");
        return;
    }

    const anioRef = parseInt($("#cgInteresAnio").val(), 10) || null;
    const mesRef = parseInt($("#cgInteresMes").val(), 10) || null;
    const prev = interesesDelMesCg(anioRef, mesRef);
    if (prev.length > 0) {
        const veces = prev.length === 1 ? "1 vez" : `${prev.length} veces`;
        const ok = typeof confirmarModal === "function"
            ? await confirmarModal(`Este mes ya tiene intereses cargados ${veces}. ¿Sumar otra carga igual?`)
            : confirm(`Este mes ya tiene intereses cargados ${veces}. ¿Sumar otra carga igual?`);
        if (!ok) return;
    }

    const payload = {
        IdCliente: CG.id,
        Fecha: fecha,
        Concepto: concepto,
        Importe: importe,
        AnioRef: anioRef,
        MesRef: mesRef
    };

    const data = await fetchJsonCg(API_CG.ccRegistrarInteres, {
        method: "POST",
        headers: authCg(),
        body: JSON.stringify(payload)
    });

    if (!data?.valor) {
        errorModal(data?.mensaje || "No se pudo registrar el interés.");
        return;
    }

    guardarPctInteresDefaultCg(pct);
    exitoModal(data.mensaje || "Interés registrado.");
    CG.modalInteres?.hide();

    CG.tabsLoaded.controlMensual = false;
    CG.tabsLoaded.cuentaCorriente = false;
    const idsEst = isHubEstCg() ? idsEstablecimientoSeleccionadosCg() : null;
    await cargarTabControlMensual(true, idsEst);
    if (typeof cargarTabCuentaCorriente === "function") {
        try { await cargarTabCuentaCorriente(true); } catch { /* opcional */ }
    }
}

function truncarCg(txt, max) {
    if (!txt) return "";
    return txt.length > max ? txt.slice(0, max) + "…" : txt;
}

function syncSinEntregaUiCg() {
    const activo = $h("cgCmSinEntrega").is(":checked");
    $h("lblCgCmSinEntrega").text(activo ? "Mes sin entrega" : "Con entrega este mes");
    $h("cgCmSinEntregaBox").toggleClass("is-active", activo);
}

function setImporteInputCg(selector, valor) {
    const id = String(selector || "").replace(/^#/, "");
    const $el = (id && $h(id).length) ? $h(id) : $(selector);
    const n = Number(valor) || 0;
    if (n === 0) {
        $el.val("");
        return;
    }
    $el.val(n.toLocaleString("es-AR", {
        minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
        maximumFractionDigits: 2
    }));
}

function leerImporteInputCg(selector) {
    const id = String(selector || "").replace(/^#/, "");
    const $el = (id && $h(id).length) ? $h(id) : $(selector);
    const raw = $el.val();
    if (raw == null || String(raw).trim() === "") return 0;
    if (typeof parseNumero === "function") return parseNumero(raw) || 0;
    if (typeof formatearSinMiles === "function") return formatearSinMiles(raw) || 0;
    const n = parseFloat(String(raw).replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

function abrirModalControlMensual(anio, mes) {
    return abrirWorkspaceMesCg(anio, mes);
}

async function guardarControlMensualCg(opts) {
    const silent = !!(opts && typeof opts === "object" && !opts.originalEvent && !opts.target && opts.silent);
    const mes = parseInt($h("cgCmMes").val(), 10);
    const anio = parseInt($h("cgCmAnio").val(), 10);
    if (!mes || !anio) return;

    const idControl = parseInt($h("cgCmIdControl").val(), 10) || 0;
    const abonoEfectivo = leerImporteInputCg("#" + mapHubDomIdCg("cgCmAbonoEfectivo"));
    const abonoTransferencia = leerImporteInputCg("#" + mapHubDomIdCg("cgCmAbonoTransferencia"));

    const modelo = {
        Id: idControl,
        IdCliente: CG.id,
        IdEstablecimiento: hubIdEstablecimientoCg(),
        Anio: anio,
        Mes: mes,
        FechaVisita: parseFechaCg($h("cgCmFechaVisita").val()),
        SinEntrega: $h("cgCmSinEntrega").is(":checked"),
        CajasAFavor: parseInt($h("cgCmCajasAFavor").val(), 10) || 0,
        Observaciones: ($h("cgCmObservaciones").val() || "").trim() || null,
        AbonoEfectivo: abonoEfectivo,
        AbonoTransferencia: abonoTransferencia,
        FechaTransferencia: parseFechaCg($h("cgCmFechaTransferencia").val())
    };

    let data;
    try {
        data = await fetchJsonCg(API_CG.guardarControlMensual, {
            method: "POST",
            headers: authCg(),
            body: JSON.stringify(modelo)
        });
    } catch (e) {
        if (!silent) errorModal("No se pudo guardar el control mensual.");
        throw e;
    }

    if (!data?.valor) {
        if (!silent) errorModal(data?.mensaje || "No se pudo guardar.");
        return;
    }

    if (!silent) {
        exitoModal(data.mensaje || "Control mensual guardado.");
        if (isHubEstCg()) {
            await cargarHubEstablecimientoCg(true);
        } else {
            CG.tabsLoaded.controlMensual = false;
            await cargarTabControlMensual(true);
            await cargarHubStockCg(true);
        }
        if (hubPropCg("hubMesSel")) {
            await abrirWorkspaceMesCg(hubPropCg("hubMesSel").anio, hubPropCg("hubMesSel").mes, true);
        }
    }
}

/* ---- Stock cliente (hub) ---- */

async function cargarHubStockCg(force, idsEstForzados) {
    const idsEst = Array.isArray(idsEstForzados)
        ? idsEstForzados.map(Number).filter(x => x > 0)
        : (isHubEstCg() ? idsEstablecimientoSeleccionadosCg() : []);
    const filtrarEst = idsEst.length > 0;

    if (force && !filtrarEst) CG.tabsLoaded.stockCliente = false;

    const run = async () => {
        const url = filtrarEst
            ? API_CG.stockEstablecimiento(CG.id, idsEst)
            : API_CG.stockCliente(CG.id);
        const data = await fetchJsonCg(url, { headers: authCg() }) || [];
        setHubPropCg("stockCliente", Array.isArray(data) ? data : []);
        renderHubStockCg(hubPropCg("stockCliente"));
        if (!filtrarEst) CG.tabsLoaded.stockCliente = true;
    };

    if (filtrarEst) await withHubModeCg("est", run);
    else await run();
}

function renderHubStockCg(items) {
    const cont = $h("cgHubStockCards");
    if (!cont.length) return;

    const list = (items || []).filter(x => (Number(x.Entregadas) || 0) !== 0 || (Number(x.Retiradas) || 0) !== 0);
    if (!list.length) {
        cont.html(`<div class="cg-hub-stock-empty">Todavia no hay cajas en poder del cliente.</div>`);
        return;
    }

    cont.html(list.map(s => {
        const enPoder = Number(s.EnPoderCliente) || 0;
        const poderCls = typeof clsSaldoMoney === "function" ? clsSaldoMoney(enPoder) : "";
        const tone = enPoder > 0 ? "has-stock" : (enPoder < 0 ? "neg-stock" : "zero-stock");
        return `<div class="cg-hub-stock-card ${tone}">
            <div class="cg-hub-stock-name">${escapeCg(s.Producto)}</div>
            <div class="cg-hub-stock-nums">
                <span><small>Entreg.</small><strong class="rp-money-in">${fmtQtyCg(s.Entregadas)}</strong></span>
                <span><small>Retir.</small><strong class="rp-money-out">${fmtQtyCg(s.Retiradas)}</strong></span>
                <span class="cg-hub-stock-poder"><small>En poder</small><strong class="${poderCls}">${fmtQtyCg(enPoder)}</strong></span>
            </div>
        </div>`;
    }).join(""));
}

async function cargarTabStockCliente(force) {
    await cargarHubStockCg(force);
}

function fmtQtyCg(n) {
    if (typeof formatearNumero === "function") return formatearNumero(Number(n || 0));
    return (Number(n) || 0).toLocaleString("es-AR");
}

/* ---- Cuenta corriente ---- */

async function cargarTabCuentaCorriente(force) {
    await withCgLoading("Cargando cuenta corriente…", async () => {
        if (force) CG.tabsLoaded.cuentaCorriente = false;

        const filtro = {
            IdCliente: CG.id,
            FechaDesde: null,
            FechaHasta: null
        };

        const [movs, res] = await Promise.all([
            fetchJsonCg(API_CG.ccMovimientos, { method: "POST", headers: authCg(), body: JSON.stringify(filtro) }),
            fetchJsonCg(API_CG.ccResumen, { method: "POST", headers: authCg(), body: JSON.stringify(filtro) })
        ]);

        if (res) {
            $("#cgSaldoAnterior").text(fmtMoneyCg(res.SaldoAnterior)).attr("class", "val " + (typeof clsSaldoDeudaMoney === "function" ? clsSaldoDeudaMoney(res.SaldoAnterior) : ""));
            $("#cgDebe").text(fmtMoneyCg(res.Debe)).attr("class", "val rp-money-out");
            $("#cgHaber").text(fmtMoneyCg(res.Haber)).attr("class", "val rp-money-in");
            $("#cgSaldoActual").text(fmtMoneyCg(res.SaldoActual)).attr("class", "val " + (typeof clsSaldoDeudaMoney === "function" ? clsSaldoDeudaMoney(res.SaldoActual) : ""));
        }

        const data = (movs || []).filter(x => x.TipoMovimiento !== "SALDO_ANTERIOR" && x.Id > 0);

        configurarGrillaCg("cuentaCorriente", "#grd_CuentaCorrienteCg", data, [
            columnaGridAcciones(null, "Clientes CC", (id, type, row) => {
                if (!row.PuedeEliminar) return "";
                return `<button type="button" class="btn btn-sm btn-outline-danger" onclick="eliminarMovCcCg(${id})"><i class="fa fa-trash"></i></button>`;
            }),
            columnaGridId(),
            { data: "Fecha", render: d => formatearFechaCortaCg(d) },
            { data: "TipoMovimiento" },
            { data: "Concepto" },
            { data: "Debe", className: "text-end", render: d => {
                const n = Number(d || 0);
                return n ? `<span class="rp-money-out">${fmtMoneyCg(n)}</span>` : fmtMoneyCg(n);
            }},
            { data: "Haber", className: "text-end", render: d => {
                const n = Number(d || 0);
                return n ? `<span class="rp-money-in">${fmtMoneyCg(n)}</span>` : fmtMoneyCg(n);
            }},
            { data: "Saldo", className: "text-end", render: d => {
                const n = Number(d || 0);
                const cls = typeof clsSaldoDeudaMoney === "function" ? clsSaldoDeudaMoney(n) : "rp-money-zero";
                return `<strong class="${cls}">${fmtMoneyCg(n)}</strong>`;
            }}
        ]);

        CG.tabsLoaded.cuentaCorriente = true;
    });
}

window.eliminarMovCcCg = async function (id) {
    const ok = typeof confirmarModal === "function"
        ? await confirmarModal("¿Eliminar este movimiento?")
        : confirm("¿Eliminar este movimiento?");
    if (!ok) return;

    const data = await fetchJsonCg(API_CG.ccEliminar(id), { method: "DELETE", headers: authCg() });
    if (!data?.valor) { errorModal(data?.mensaje || "No se pudo eliminar."); return; }
    exitoModal(data.mensaje || "Movimiento eliminado.");
    CG.tabsLoaded.cuentaCorriente = false;
    CG.tabsLoaded.cobros = false;
    await cargarTabCuentaCorriente(true);
};

/* ---- Cobros ---- */

async function cargarTabCobros() {
    const filtro = { IdCliente: CG.id, TipoMovimiento: "Cobro" };
    const movs = await fetchJsonCg(API_CG.ccMovimientos, {
        method: "POST",
        headers: authCg(),
        body: JSON.stringify(filtro)
    }) || [];

    const data = movs.filter(x => x.Id > 0 && (x.TipoMovimiento === "Cobro" || x.Origen === "COBRO"));

    configurarGrillaCg("cobros", "#grd_CobrosCg", data, [
        { data: null, defaultContent: "", orderable: false, searchable: false, width: "1px" },
        columnaGridId(),
        { data: "Fecha", render: d => formatearFechaCortaCg(d) },
        { data: "Concepto" },
        { data: "Haber", className: "text-end", render: d => fmtMoneyCg(d) }
    ]);

    CG.tabsLoaded.cobros = true;
}

function abrirModalCobroCg() {
    $("#cgCobroFecha").val(new Date().toISOString().slice(0, 10));
    $("#cgCobroImporte, #cgCobroConcepto").val("");
    $("#cgCobroCuenta").val("").trigger("change");
    syncImporteHabilitadoModalCobroCg();
    CG.modalCobro?.show();
}

async function confirmarCobroCg() {
    const importe = typeof parseNumero === "function" ? parseNumero($("#cgCobroImporte").val()) : parseFloat($("#cgCobroImporte").val()) || 0;
    const idCuenta = parseInt($("#cgCobroCuenta").val(), 10) || 0;
    const concepto = ($("#cgCobroConcepto").val() || "").trim() || "Cobro cliente";

    if (importe <= 0 || !idCuenta) {
        errorModal("Indique importe y cuenta.");
        return;
    }

    const data = await fetchJsonCg(API_CG.ccRegistrarCobro, {
        method: "POST",
        headers: authCg(),
        body: JSON.stringify({
            IdCliente: CG.id,
            IdCuenta: idCuenta,
            Fecha: $("#cgCobroFecha").val() || new Date().toISOString().slice(0, 10),
            Concepto: concepto,
            Importe: importe
        })
    });

    if (!data?.valor) { errorModal(data?.mensaje || "No se pudo registrar."); return; }
    exitoModal(data.mensaje || "Cobro registrado.");
    CG.modalCobro?.hide();
    CG.tabsLoaded.cuentaCorriente = false;
    CG.tabsLoaded.cobros = false;
    CG.tabsLoaded.controlMensual = false;

    // Si el cobro se cargó desde la visita, sumar a abonos planilla (efectivo/transf) para hoja de ruta
    const mesSel = hubPropCg("hubMesSel");
    if (mesSel && !$h("cgHubMesDetail").prop("hidden")) {
        const { efectivo, transferencia } = clasificarAbonosDesdeCobrosWsCg([{ IdCuenta: idCuenta, Importe: importe }]);
        const prevEf = leerImporteInputCg("#" + mapHubDomIdCg("cgCmAbonoEfectivo"));
        const prevTr = leerImporteInputCg("#" + mapHubDomIdCg("cgCmAbonoTransferencia"));
        setImporteInputCg("#cgCmAbonoEfectivo", prevEf + efectivo);
        setImporteInputCg("#cgCmAbonoTransferencia", prevTr + transferencia);
        if (transferencia > 0 && !$h("cgCmFechaTransferencia").val()) {
            $h("cgCmFechaTransferencia").val($("#cgCobroFecha").val() || "");
        }
        try { await guardarControlMensualCg({ silent: true }); } catch { /* noop */ }
        await cargarCobrosMesWsCg(mesSel.anio, mesSel.mes);
        if (isHubEstCg()) await cargarHubEstablecimientoCg(true);
        else await cargarTabControlMensual(true);
        if (hubPropCg("hubMesSel")) {
            await abrirWorkspaceMesCg(hubPropCg("hubMesSel").anio, hubPropCg("hubMesSel").mes, true);
        }
        return;
    }

    if ($("#tabCuentaCorriente").hasClass("active") || $("#tabCuentaCorriente").hasClass("show")) {
        await cargarTabCuentaCorriente(true);
        await cargarTabCobros();
    }
}

/* ---- Vista tabla / cards ---- */

const CG_CARD_BREAKPOINT = 992;

const CG_CARD_SCHEMAS = {
    establecimientos: {
        title: r => r.Nombre,
        subtitle: r => r.Domicilio || "Sin domicilio",
        badge: r => r.Camion || "Sin unidad",
        tone: () => "cg-data-card--blue",
        fields: [
            { label: "Partido", value: r => r.Partido },
            { label: "Cod. partido", value: r => r.CodigoPartido },
            { label: "Localidad", value: r => r.Localidad },
            { label: "Cod. localidad", value: r => r.CodigoLocalidad },
            { label: "Dia rec.", value: r => r.DiaRecoleccion },
            { label: "Semana", value: r => r.SemanaRecoleccion },
            { label: "Lista precio", value: r => r.ListaPrecio, full: true }
        ],
        actions: r => `
            <button type="button" class="cg-card-btn" onclick="editarEstablecimientoCg(${r.Id})"><i class="fa fa-pencil"></i> Editar</button>
            <button type="button" class="cg-card-btn cg-card-btn--danger" onclick="eliminarEstablecimientoCg(${r.Id})"><i class="fa fa-trash"></i> Eliminar</button>`
    },
    contratos: {
        title: r => r.Establecimiento || "Contrato",
        subtitle: r => r.TipoContrato || "Sin tipo",
        badge: r => r.Vigente ? "Vigente" : "Vencido",
        tone: r => r.Vigente ? "cg-data-card--green" : "cg-data-card--muted",
        fields: [
            { label: "Contrato", value: r => formatearFechaCortaCg(r.FechaContrato) },
            { label: "Inicio", value: r => formatearFechaCortaCg(r.FechaInicio) },
            { label: "Vencimiento", value: r => formatearFechaCortaCg(r.FechaVencimiento), full: true }
        ],
        actions: r => `<button type="button" class="cg-card-btn" onclick="editarContratoCg(${r.Id})"><i class="fa fa-pencil"></i> Editar</button>`
    },
    entregas: {
        title: r => r.Establecimiento || "Entrega",
        subtitle: r => formatearFechaCortaCg(r.Fecha),
        badge: r => `#${r.Id}`,
        tone: r => (Number(r.Saldo) || 0) > 0 ? "cg-data-card--warn" : "cg-data-card--teal",
        fields: [
            { label: "Estado", value: r => r.Estado || "-" },
            { label: "Total", value: r => fmtMoneyCg(r.ImporteTotal), cls: "cg-val-neutral" },
            { label: "Pagado", value: r => fmtMoneyCg(r.ImporteAbonado), cls: "cg-val-haber" },
            { label: "Saldo", value: r => fmtMoneyCg(r.Saldo), cls: r => typeof clsSaldoDeudaMoney === "function" ? clsSaldoDeudaMoney(r.Saldo) : "cg-val-saldo" }
        ],
        actions: r => `<a class="cg-card-btn" href="${API_CG.entregaNuevoModif(r.Id, CG.id, true)}"><i class="fa fa-pencil"></i> Ver / editar</a>`
    },
    stockCliente: {
        title: r => r.Producto,
        subtitle: () => "Stock en poder del cliente",
        tone: () => "cg-data-card--purple",
        fields: [
            { label: "Entregadas", value: r => fmtQtyCg(r.Entregadas), cls: "rp-money-in" },
            { label: "Retiradas", value: r => fmtQtyCg(r.Retiradas), cls: "rp-money-out" },
            { label: "En poder", value: r => fmtQtyCg(r.EnPoderCliente), cls: r => typeof clsSaldoMoney === "function" ? clsSaldoMoney(r.EnPoderCliente) : "cg-val-accent", full: true }
        ]
    },
    cuentaCorriente: {
        title: r => r.TipoMovimiento,
        subtitle: r => formatearFechaCortaCg(r.Fecha),
        badge: r => `#${r.Id}`,
        tone: r => r.TipoMovimiento === "Cobro" ? "cg-data-card--green" : "cg-data-card--blue",
        fields: [
            { label: "Concepto", value: r => r.Concepto, full: true },
            { label: "Debe", value: r => fmtMoneyCg(r.Debe), cls: "cg-val-debe" },
            { label: "Haber", value: r => fmtMoneyCg(r.Haber), cls: "cg-val-haber" },
            { label: "Saldo", value: r => fmtMoneyCg(r.Saldo), cls: r => typeof clsSaldoDeudaMoney === "function" ? clsSaldoDeudaMoney(r.Saldo) : "cg-val-saldo" }
        ],
        actions: r => r.PuedeEliminar
            ? `<button type="button" class="cg-card-btn cg-card-btn--danger" onclick="eliminarMovCcCg(${r.Id})"><i class="fa fa-trash"></i> Eliminar</button>`
            : ""
    },
    cobros: {
        title: r => r.Concepto || "Cobro",
        subtitle: r => formatearFechaCortaCg(r.Fecha),
        badge: r => `#${r.Id}`,
        tone: () => "cg-data-card--green",
        fields: [
            { label: "Importe", value: r => fmtMoneyCg(r.Haber), cls: "cg-val-haber", full: true }
        ]
    }
};

function initViewModeCg() {
    const schemaDblClick = {
        establecimientos: r => editarEstablecimientoCg(r.Id),
        contratos: r => editarContratoCg(r.Id),
        entregas: r => { window.location.href = API_CG.entregaNuevoModif(r.Id, CG.id, true); }
    };

    Object.keys(CG_CARD_SCHEMAS).forEach(key => {
        RpGridView.registerSchema(key, Object.assign({}, CG_CARD_SCHEMAS[key], {
            manualRender: true,
            dblClick: schemaDblClick[key] || null
        }));
    });

    CG.viewPref = RpGridView.getPref();
    RpGridView.applyModeToRoot($(".cg-page"), CG.viewPref);
    RpGridView.syncSwitchUi(CG.viewPref);

    $(document).on("rpGridViewChanged", function (_e, pref) {
        CG.viewPref = pref || RpGridView.getPref();
        aplicarModoVistaCg();
        Object.keys(CG.listMeta || {}).forEach(renderCardsCg);
    });
}

function debeMostrarTablaCg() {
    return RpGridView.debeMostrarTabla(CG.viewPref || RpGridView.getPref());
}

function aplicarModoVistaCg() {
    CG.viewPref = RpGridView.getPref();
    RpGridView.applyModeToRoot($(".cg-page"), CG.viewPref);
    RpGridView.syncSwitchUi(CG.viewPref);

    if (debeMostrarTablaCg()) {
        Object.keys(CG.listMeta || {}).forEach(key => {
            if (!CG.grids[key] && CG.listMeta[key]?.selector) {
                initDataTableCg(key);
            }
        });
        RpGridView.programarAjuste();
    }
}

function renderCardsCg(key) {
    const meta = CG.listMeta[key];
    const schema = CG_CARD_SCHEMAS[key];
    const $grid = meta?.cardsSelector ? $(meta.cardsSelector) : $(`#cgCards_${key}`);
    if (!$grid.length || !schema || !meta) return;

    if (!meta.data?.length) {
        $grid.html(`<div class="cg-cards-empty"><i class="fa fa-inbox"></i> Sin registros para mostrar.</div>`);
        return;
    }

    $grid.html(meta.data.map(row => buildCardHtmlCg(row, schema)).join(""));
    if (window.RpGridView?.restoreCardSelection) {
        RpGridView.restoreCardSelection($grid);
    }
}

function buildCardHtmlCg(row, schema) {
    const fields = (schema.fields || []).map(f => `
        <div class="cg-card-field ${f.full ? "cg-card-field--full" : ""}">
            <span>${f.label}</span>
            <strong class="${typeof f.cls === "function" ? (f.cls(row) || "") : (f.cls || "")}">${escapeCg(typeof f.value === "function" ? f.value(row) : row[f.value])}</strong>
        </div>`).join("");

    const tone = schema.tone ? schema.tone(row) : "";
    const actions = schema.actions ? schema.actions(row) : "";
    const badge = schema.badge ? schema.badge(row) : "";
    const subtitle = schema.subtitle ? schema.subtitle(row) : "";

    return `
        <article class="cg-data-card rp-card-selectable ${tone}" data-row-id="${row.Id ?? ""}" tabindex="0" role="button">
            <div class="cg-data-card-head">
                <div class="cg-data-card-head-text">
                    <div class="cg-data-card-title">${escapeCg(schema.title(row))}</div>
                    ${subtitle ? `<div class="cg-data-card-sub">${escapeCg(subtitle)}</div>` : ""}
                </div>
                ${badge ? `<span class="cg-data-card-badge">${escapeCg(badge)}</span>` : ""}
            </div>
            <div class="cg-data-card-body">${fields}</div>
            ${actions ? `<div class="cg-data-card-foot">${actions}</div>` : ""}
        </article>`;
}

function renderControlMensualCardsCg(filas, mostrarAnio) {
    const $grid = $h("cgCards_controlMensual");
    if (!$grid.length) return;

    if (!filas.length) {
        $grid.html(`<div class="cg-cards-empty"><i class="fa fa-calendar"></i> No hay datos para los filtros elegidos.</div>`);
        return;
    }

    $grid.html(filas.map(m => {
        const anio = m.Anio || CG.controlAnio;
        const saldo = Number(m.Saldo) || 0;
        const saldoCls = typeof clsSaldoDeudaMoney === "function"
            ? clsSaldoDeudaMoney(saldo)
            : (saldo > 0 ? "cg-val-saldo-neg" : (saldo < 0 ? "cg-val-saldo-pos" : "cg-val-saldo-cero"));
        const atrasado = puedeCargarInteresMesCg(m, anio, m.Mes);
        const badge = atrasado
            ? `<span class="cg-data-card-badge cg-data-card-badge--atraso">Atrasado</span>`
            : (m.SinEntrega ? `<span class="cg-data-card-badge cg-data-card-badge--warn">Sin entrega</span>` : "");
        return `
            <article class="cg-data-card cg-data-card--cm rp-card-selectable ${m.SinEntrega ? "is-warn" : ""} ${atrasado ? "is-atraso" : ""}"
                     data-anio="${anio}" data-mes="${m.Mes}" tabindex="0" role="button">
                <div class="cg-data-card-head">
                    <div class="cg-data-card-head-text">
                        <div class="cg-data-card-title">${escapeCg(m.MesNombre)}${mostrarAnio ? ` ${anio}` : ""}</div>
                        <div class="cg-data-card-sub">Visita: ${formatearFechaCortaCg(m.FechaVisita) || "-"}</div>
                    </div>
                    ${badge}
                </div>
                <div class="cg-data-card-body">
                    <div class="cg-card-field"><span>Entreg.</span><strong class="rp-money-in">${fmtQtyCg(m.Entregadas)}</strong></div>
                    <div class="cg-card-field"><span>Retir.</span><strong class="rp-money-out">${fmtQtyCg(m.Retiradas)}</strong></div>
                    <div class="cg-card-field"><span>Debe</span><strong class="cg-val-debe">${fmtMoneyCg(m.Debe)}</strong></div>
                    <div class="cg-card-field"><span>Efectivo</span><strong class="${(Number(m.AbonoEfectivo) || 0) > 0 ? "cg-val-haber" : ""}">${fmtMoneyCg(m.AbonoEfectivo)}</strong></div>
                    <div class="cg-card-field"><span>Transf.</span><strong class="${(Number(m.AbonoTransferencia) || 0) > 0 ? "cg-val-haber" : ""}">${fmtMoneyCg(m.AbonoTransferencia)}</strong></div>
                    <div class="cg-card-field"><span>Intereses</span><strong class="${atrasado && !(Number(m.CantidadIntereses) || 0) ? "rp-money-out" : ""}">${(Number(m.CantidadIntereses) || 0) > 0 ? `${m.CantidadIntereses}× ${fmtMoneyCg(m.TotalIntereses)}` : "—"}</strong></div>
                    <div class="cg-card-field cg-card-field--full"><span>Saldo (final)</span><strong class="${saldoCls}">${fmtMoneyCg(m.Saldo)}</strong></div>
                    ${m.Observaciones ? `<div class="cg-card-field cg-card-field--full"><span>Obs.</span><strong>${escapeCg(truncarCg(m.Observaciones, 60))}</strong></div>` : ""}
                </div>
            </article>`;
    }).join(""));

    if (window.RpGridView?.restoreCardSelection) {
        RpGridView.restoreCardSelection($grid);
    }
}

/* ---- DataTable helper ---- */

function initDataTableCg(key) {
    const meta = CG.listMeta?.[key];
    if (!meta?.selector || CG.grids[key]) return;

    const opts = meta.opts || {};
    const tableId = $(meta.selector).attr("id") || "";
    if (tableId.startsWith("grd_")) {
        registrarFiltrosGrilla(tableId, meta.columnConfig || [], meta.filterOpts || {});
    }

    CG.grids[key] = $(meta.selector).DataTable({
        data: meta.data,
        columns: meta.columns,
        language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        autoWidth: false,
        scrollX: true,
        scrollCollapse: true,
        orderCellsTop: true,
        fixedHeader: true,
        pageLength: opts.pageLength ?? 10,
        paging: opts.paging !== false,
        searching: opts.searching !== false,
        info: opts.info !== false,
        dom: opts.dom || "frtip",
        order: opts.order || [[1, "desc"]],
        columnDefs: typeof columnDefsGridLista === "function" ? columnDefsGridLista() : [],
        initComplete: async function () {
            const api = this.api();
            if (tableId.startsWith("grd_") && typeof armarFiltrosGrillaLista === "function") {
                await armarFiltrosGrillaLista(api, meta.selector, meta.columnConfig || [], meta.filterOpts || {});
            }
            programarAjusteGrillasCg();
        }
    });
}

function programarAjusteGrillasCg() {
    RpGridView.programarAjuste();
}

function configurarGrillaCg(key, selector, data, columns, opts = {}) {
    CG.listMeta = CG.listMeta || {};
    CG.listMeta[key] = {
        data,
        cardsSelector: opts.cardsSelector || `#cgCards_${key}`,
        selector,
        columns,
        opts
    };

    if (CG.grids[key]) {
        CG.grids[key].clear().rows.add(data).draw(false);
        if (debeMostrarTablaCg()) {
            RpGridView.programarAjuste();
        }
    } else if (debeMostrarTablaCg()) {
        initDataTableCg(key);
    }

    renderCardsCg(key);
}

function formatearFechaCortaCg(d) {
    if (!d) return "";
    try {
        const dt = new Date(d);
        return dt.toLocaleDateString("es-AR");
    } catch { return d; }
}

function fmtMoneyCg(n) {
    if (typeof formatearMoneda === "function") return formatearMoneda(n);
    const v = Number(n) || 0;
    return v.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}
