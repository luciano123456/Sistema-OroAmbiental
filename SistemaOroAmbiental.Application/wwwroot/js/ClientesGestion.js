/* =========================================================
   CLIENTES GESTION - Hub unificado por cliente
========================================================= */

const CG = {
    id: 0,
    modelo: null,
    contactos: [],
    contactoSelId: 0,
    tabsLoaded: {},
    grids: {},
    establecimientoModal: null,
    contratoModal: null,
    modalCobro: null,
    modalControlMensual: null,
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
    secMoving: false,
    viewPref: "auto",
    listMeta: {},
    geoCache: { provincias: [] },
    idDiaRecoleccionLegacy: 0
};

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
    contratosLista: id => `/Contratos/Lista?idCliente=${id}`,
    entregasLista: "/ClientesEntregas/ListaFiltrada",
    ccMovimientos: "/ClientesCuentaCorriente/Movimientos",
    ccResumen: "/ClientesCuentaCorriente/Resumen",
    ccRegistrarCobro: "/ClientesCuentaCorriente/RegistrarCobro",
    ccEliminar: id => `/ClientesCuentaCorriente/Eliminar?id=${id}`,
    cuentas: "/Cuentas/Lista",
    entregaNuevoModif: (idEntrega, idCliente) =>
        `/ClientesEntregas/NuevoModif?id=${idEntrega || 0}&idCliente=${idCliente || 0}`,
    entregaEditarInfo: id => `/ClientesEntregas/EditarInfo?id=${id}`,
    controlAnual: (idCliente, anio) =>
        `/ClientesOperativo/ControlAnual?idCliente=${idCliente}&anio=${anio}`,
    controlMensual: (idCliente, anios, meses) => {
        const p = new URLSearchParams({ idCliente: String(idCliente) });
        if (anios?.length) p.set("anios", anios.join(","));
        if (meses?.length) p.set("meses", meses.join(","));
        return `/ClientesOperativo/ControlMensual?${p.toString()}`;
    },
    recorridosPorCliente: idCliente => `/Recorridos/PorCliente?idCliente=${idCliente}`,
    stockCliente: idCliente => `/ClientesOperativo/StockCliente?idCliente=${idCliente}`,
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
    cuentaCorriente: "Cuenta corriente"
};

const authCg = () => ({
    Authorization: "Bearer " + token,
    "Content-Type": "application/json"
});

$(document).ready(async () => {
    CG.id = Number(window.CG_INIT?.id || $("#cgId").val() || 0);

    initModalesCg();
    wireEventosCg();
    initSelect2Cg();
    initSeccionesPlegablesCg();

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
        $("#cgHubOperativo").prop("hidden", true);
        $("#btnNuevoContactoCg").prop("disabled", true);
    }
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
        ["#cgTipoGenerador", ...CG_REC_CAMION_SELECTORS, "#cgRecSemana", "#cgRecListaPrecio"]
            .forEach(sel => refreshSelect2Cg($(sel)));
    }
}

function initModalesCg() {
    if (typeof initEstablecimientoModal === "function") {
        CG.establecimientoModal = initEstablecimientoModal({
            token: token,
            onSaved: async () => {
                CG.tabsLoaded.establecimientos = false;
                await cargarTabEstablecimientos();
            },
            onDeleted: async () => {
                CG.tabsLoaded.establecimientos = false;
                await cargarTabEstablecimientos();
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

    const modalContactoEl = document.getElementById("modalContactoCg");
    if (modalContactoEl) CG.modalContacto = new bootstrap.Modal(modalContactoEl);

    $("#cgCmSinEntrega").on("change", syncSinEntregaUiCg);
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
    $("#btnNuevoContratoCg, #btnNuevoContratoTab").on("click", abrirNuevoContratoCg);
    $("#btnRegistrarCobroCg, #btnRegistrarCobroTab").on("click", abrirModalCobroCg);
    $("#btnConfirmarCobroCg").on("click", busyHandler(confirmarCobroCg));
    $("#btnRefreshCcCg").on("click", () => cargarTabCuentaCorriente(true));
    $("#btnRefreshControlMensual").on("click", () => cargarHubDatosCg(true));
    $("#cgHubOperativo").on("click", ".cg-cm-chip", function () {
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
    $("#btnGuardarControlMensualCg").on("click", busyHandler(guardarControlMensualCg));
    $("#cgControlMensualBody").on("click", "tr[data-mes]", function () {
        const anio = Number($(this).data("anio"));
        const mes = Number($(this).data("mes"));
        mostrarDetalleMesHub(anio, mes);
    });
    $("#cgCards_controlMensual").on("click", "article[data-mes]", function () {
        const anio = Number($(this).data("anio"));
        const mes = Number($(this).data("mes"));
        mostrarDetalleMesHub(anio, mes);
    });
    $("#btnCerrarMesDetail").on("click", () => {
        $("#cgHubMesDetail").prop("hidden", true);
        CG.hubMesSel = null;
        $("#cgControlMensualBody tr").removeClass("is-selected");
    });
    $("#btnEditarMesHub").on("click", () => {
        if (CG.hubMesSel) abrirModalControlMensual(CG.hubMesSel.anio, CG.hubMesSel.mes);
    });

    $("#cgHubEntregasList").on("click", ".cg-hub-entrega-toggle", function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleHubEntregaDetalle(Number($(this).closest(".cg-hub-entrega-row").data("id")));
    });

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
        "#cgRecSemana", "#cgRecListaPrecio"].forEach(sel => {
        ensureSelect2Cg($(sel), opts);
    });
}

function ensureSelect2Cg($el, opts) {
    if (!$el?.length) return;
    if ($el.data("select2")) $el.select2("destroy");
    $el.select2(Object.assign({ width: "100%", allowClear: true }, opts || {}));
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
        llenarComboCg("#cgRecSemana", API_CG.semanas, null, "Nombre"),
        llenarComboCg("#cgRecListaPrecio", API_CG.listasPrecios, null, "Nombre")
    ]);
    [...CG_REC_CAMION_SELECTORS, "#cgRecSemana", "#cgRecListaPrecio"].forEach(sel => {
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
        if (r.IdListaPrecio) $("#cgRecListaPrecio").val(String(r.IdListaPrecio)).trigger("change");
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
    ["#cgRecSemana", "#cgRecListaPrecio"].forEach(sel => $(sel).val("").trigger("change"));
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
        IdListaPrecio: intOrNullCg("#cgRecListaPrecio") || 0,
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
    return !!(m.DiasSemana?.length || m.IdSemanaRecoleccion || m.IdListaPrecio
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
    const urlEntrega = API_CG.entregaNuevoModif(0, CG.id);
    $("#btnNuevaEntregaCg, #btnNuevaEntregaHub")
        .attr("href", urlEntrega)
        .removeAttr("hidden")
        .prop("hidden", false);
    $("#btnNuevoEstablecimientoCg, #btnNuevoContratoCg").prop("hidden", false);
    $("#btnNuevoContactoCg").prop("disabled", false);
    $("#cgHubOperativo").prop("hidden", false);
}

function habilitarTabsRelacionados(habilitar) {
    const tabs = ["establecimientos", "contratos", "cuentaCorriente"];
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

    try {
        switch (tab) {
            case "establecimientos": await cargarTabEstablecimientos(); break;
            case "contratos": await cargarTabContratos(); break;
            case "cuentaCorriente":
                await cargarTabCuentaCorriente(true);
                await cargarTabCobros();
                break;
        }
    } catch (e) {
        console.error(`Error cargando tab ${tab}:`, e);
        if (typeof errorModal === "function") {
            const nombre = CG_TAB_LABELS[tab] || "esta seccion";
            errorModal(`No se pudo cargar ${nombre}. Intente nuevamente.`);
        }
    }
}

async function cargarHubDatosCg(force) {
    if (CG.id <= 0) return;
    $("#cgHubOperativo").prop("hidden", false);
    $("#btnNuevoContactoCg").prop("disabled", false);
    await Promise.all([
        cargarTabContactos(),
        cargarTabControlMensual(!!force),
        cargarHubStockCg(!!force),
        cargarHubEntregasCg(!!force)
    ]);
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
    const data = all.filter(x => x.IdCliente === CG.id);
    configurarGrillaCg("establecimientos", "#grd_EstablecimientosCg", data, [
        columnaGridAcciones({
            editar: "editarEstablecimientoCg",
            eliminar: "eliminarEstablecimientoCg"
        }, "Establecimientos"),
        columnaGridId(),
        { data: "IdEstablecimientoCliente", defaultContent: "" },
        { data: "Nombre" },
        { data: "Domicilio" },
        { data: "Partido", defaultContent: "" },
        { data: "CodigoPartido", defaultContent: "" },
        { data: "Localidad" },
        { data: "CodigoLocalidad", defaultContent: "" },
        { data: "Camion" },
        { data: "DiaRecoleccion" },
        { data: "SemanaRecoleccion" },
        { data: "ListaPrecio" }
    ]);
    CG.tabsLoaded.establecimientos = true;
}

function editarEstablecimientoCg(id) {
    if (CG.establecimientoModal) CG.establecimientoModal.abrirEditar(id);
}
window.editarEstablecimientoCg = editarEstablecimientoCg;

async function eliminarEstablecimientoCg(id) {
    if (CG.establecimientoModal) await CG.establecimientoModal.eliminar(id);
}
window.eliminarEstablecimientoCg = eliminarEstablecimientoCg;

async function abrirNuevoEstablecimientoCg() {
    if (!CG.establecimientoModal) return;
    await CG.establecimientoModal.abrirNuevo(CG.id);
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
    const cont = $("#cgHubEntregasList");
    if (!cont.length) return;

    const list = (items || [])
        .slice()
        .sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha))
        .slice(0, 12);

    if (!list.length) {
        cont.html(`<div class="cg-hub-stock-empty">Sin entregas cargadas para este cliente.</div>`);
        return;
    }

    cont.html(list.map(e => {
        const saldo = Number(e.Saldo) || 0;
        const saldoCls = saldo > 0 ? "is-deuda" : (saldo < 0 ? "is-ok" : "");
        const open = CG.entregaHubExpandida === e.Id;
        const cached = CG.entregasDetalleCache[e.Id];
        return `<div class="cg-hub-entrega-row ${saldoCls}${open ? " is-open" : ""}" data-id="${e.Id}">
            <div class="cg-hub-entrega-item">
                <div class="cg-hub-entrega-main">
                    <strong>#${e.Id}</strong>
                    <span>${formatearFechaCortaCg(e.Fecha)}</span>
                    <small>${escapeCg(e.Establecimiento || e.Estado || "")}</small>
                </div>
                <div class="cg-hub-entrega-money">
                    <span>Total ${fmtMoneyCg(e.ImporteTotal)}</span>
                    <strong>Saldo ${fmtMoneyCg(e.Saldo)}</strong>
                </div>
                <button type="button" class="cg-hub-entrega-toggle" title="${open ? "Ocultar detalle" : "Ver productos"}" aria-expanded="${open}">
                    <i class="fa fa-chevron-${open ? "down" : "right"}"></i>
                </button>
            </div>
            <div class="cg-hub-entrega-detail"${open ? "" : " hidden"}>
                ${open ? (cached ? buildHubEntregaDetalleHtml(cached) : `<div class="cg-hub-entrega-loading"><i class="fa fa-spinner fa-spin"></i> Cargando...</div>`) : ""}
            </div>
        </div>`;
    }).join(""));
}

async function toggleHubEntregaDetalle(idEntrega) {
    if (!idEntrega) return;

    if (CG.entregaHubExpandida === idEntrega) {
        CG.entregaHubExpandida = 0;
        renderHubEntregasCg(CG.entregasHub);
        return;
    }

    CG.entregaHubExpandida = idEntrega;
    renderHubEntregasCg(CG.entregasHub);

    if (!CG.entregasDetalleCache[idEntrega]) {
        try {
            const det = await fetchJsonCg(API_CG.entregaEditarInfo(idEntrega), { headers: authCg() });
            CG.entregasDetalleCache[idEntrega] = det;
        } catch (err) {
            console.warn("No se pudo cargar detalle de entrega:", err);
            CG.entregasDetalleCache[idEntrega] = { _error: true };
        }
        if (CG.entregaHubExpandida === idEntrega) {
            renderHubEntregasCg(CG.entregasHub);
        }
    }
}

function tipoMovimientoEntregaLabel(tipo) {
    const t = Number(tipo) || 0;
    if (t === 2) return "Retiro";
    if (t === 3) return "Recuperado";
    return "Entrega";
}

function buildHubEntregaDetalleHtml(det) {
    if (!det || det._error) {
        return `<div class="cg-hub-stock-empty">No se pudo cargar el detalle de la entrega.</div>`;
    }

    const lineas = Array.isArray(det.Lineas) ? det.Lineas : [];
    const recuperadas = Array.isArray(det.LineasRecuperadas) ? det.LineasRecuperadas : [];
    const meta = [
        det.Estado ? `Estado: ${escapeCg(det.Estado)}` : "",
        det.Camion ? `Unidad: ${escapeCg(det.Camion)}` : "",
        det.Establecimiento ? `Est.: ${escapeCg(det.Establecimiento)}` : ""
    ].filter(Boolean).join(" · ");

    let body = "";
    if (!lineas.length && !recuperadas.length) {
        body = `<div class="cg-hub-stock-empty">Esta entrega no tiene productos cargados.</div>`;
    } else {
        const rows = [
            ...lineas.map(l => ({ ...l, _tipoLabel: tipoMovimientoEntregaLabel(l.TipoMovimiento) })),
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
                        <td>${escapeCg(l.Producto)}${l.Medida ? ` <small class="text-muted">(${escapeCg(l.Medida)})</small>` : ""}</td>
                        <td class="text-end">${fmtQtyCg(l.Cantidad)}</td>
                        <td class="text-end">${fmtMoneyCg(l.PrecioVenta)}</td>
                        <td class="text-end">${fmtMoneyCg(l.SubtotalFinal)}</td>
                    </tr>`).join("")}
                </tbody>
            </table>
        </div>`;
    }

    const notas = [det.NotaCliente, det.NotaInterna].filter(Boolean);
    return `<div class="cg-hub-entrega-detail-inner">
        ${meta ? `<div class="cg-hub-entrega-meta">${meta}</div>` : ""}
        ${body}
        <div class="cg-hub-entrega-foot">
            <div class="cg-hub-entrega-totales">
                <span>Abonado ${fmtMoneyCg(det.ImporteAbonado)}</span>
                <strong>Total ${fmtMoneyCg(det.ImporteTotal)}</strong>
            </div>
            <a class="cg-btn cg-btn--ghost cg-btn--sm" href="${API_CG.entregaNuevoModif(det.Id, CG.id)}">
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
    const $aniosChips = $("#cgControlAniosChips");
    const $mesesChips = $("#cgControlMesesChips");
    if (!$aniosChips.length || !$mesesChips.length) return;

    const actual = new Date().getFullYear();
    CG.controlFiltros.anios = [actual];
    CG.controlFiltros.meses = [];

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
    const { anios, meses } = CG.controlFiltros;

    $("#cgControlAniosChips .cg-cm-chip").each(function () {
        const v = parseInt($(this).data("val"), 10);
        $(this).toggleClass("is-active", anios.includes(v));
    });

    $("#cgControlMesesChips .cg-cm-chip").each(function () {
        const v = parseInt($(this).data("val"), 10);
        $(this).toggleClass("is-active", meses.includes(v));
    });

    syncPresetButtonsCg();
    actualizarResumenFiltrosCg();

    if (refreshData) cargarTabControlMensual(true);
}

function toggleFiltroControlCg(tipo, val) {
    if (!val || Number.isNaN(val)) return;

    if (tipo === "anio") {
        const idx = CG.controlFiltros.anios.indexOf(val);
        if (idx >= 0) CG.controlFiltros.anios.splice(idx, 1);
        else CG.controlFiltros.anios.push(val);
        CG.controlFiltros.anios.sort((a, b) => b - a);
    } else if (tipo === "mes") {
        const idx = CG.controlFiltros.meses.indexOf(val);
        if (idx >= 0) CG.controlFiltros.meses.splice(idx, 1);
        else CG.controlFiltros.meses.push(val);
        CG.controlFiltros.meses.sort((a, b) => a - b);
    }

    renderEstadoFiltrosControlCg(true);
}

function actualizarResumenFiltrosCg() {
    const { anios, meses } = CG.controlFiltros;
    const txtAnios = anios.length
        ? `${anios.length} ano${anios.length === 1 ? "" : "s"}`
        : "Sin anos";
    const txtMeses = meses.length
        ? `${meses.length} mes${meses.length === 1 ? "" : "es"}`
        : "Todos los meses";
    $("#cgControlFiltroResumen").text(`${txtAnios} · ${txtMeses}`);
}

function syncPresetButtonsCg() {
    const meses = CG.controlFiltros.meses;
    const presets = {
        "1,2,3": [1, 2, 3],
        "4,5,6": [4, 5, 6],
        "7,8,9": [7, 8, 9],
        "10,11,12": [10, 11, 12]
    };

    $(".cg-preset-meses").removeClass("is-active");

    if (meses.length === 0) {
        $('.cg-preset-meses[data-meses="all"]').addClass("is-active");
    } else {
        Object.entries(presets).forEach(([key, vals]) => {
            const match = vals.length === meses.length && vals.every(v => meses.includes(v));
            if (match) $(`.cg-preset-meses[data-meses="${key}"]`).addClass("is-active");
        });
    }

    const $btnAnios = $("#btnControlAniosRecientes");
    $btnAnios.removeClass("is-active");
    if (esPresetAniosRecientesCg(CG.controlFiltros.anios)) {
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
        anios: [...CG.controlFiltros.anios],
        meses: [...CG.controlFiltros.meses]
    };
}

function aplicarPresetMesesCg(valor) {
    if (valor === "all") {
        CG.controlFiltros.meses = [];
    } else {
        CG.controlFiltros.meses = String(valor || "")
            .split(",")
            .map(v => parseInt(v.trim(), 10))
            .filter(n => n >= 1 && n <= 12);
    }
    renderEstadoFiltrosControlCg(false);
}

function aplicarPresetAniosRecientesCg() {
    const actual = new Date().getFullYear();
    CG.controlFiltros.anios = [actual, actual - 1, actual - 2];
    renderEstadoFiltrosControlCg(false);
}

async function cargarTabControlMensual(force) {
    if (CG.id <= 0) return;
    if (force) CG.tabsLoaded.controlMensual = false;

    const { anios, meses } = leerFiltrosControlCg();
    CG.controlAnualError = false;

    try {
        const data = await fetchJsonCg(
            API_CG.controlMensual(CG.id, anios, meses),
            { headers: authCg() }
        );
        CG.controlFiltrado = data;
        CG.controlAnio = anios[0] || new Date().getFullYear();
        renderControlMensualCg(data);
    } catch (e) {
        console.warn("Control mensual no disponible:", e);
        CG.controlAnualError = true;
        CG.controlFiltrado = {
            Filas: [],
            StockActual: 0,
            TotalSaldo: 0,
            DatosParciales: true
        };
        renderControlMensualCg(CG.controlFiltrado);
    }
    CG.tabsLoaded.controlMensual = true;
}

function renderControlMensualCg(data) {
    const filas = Array.isArray(data?.Filas) ? data.Filas : (data?.Meses || []);
    const tbody = $("#cgControlMensualBody");
    const { anios } = leerFiltrosControlCg();
    const aniosUnicos = [...new Set(filas.map(f => f.Anio).filter(Boolean))];
    const mostrarAnio = anios.length > 1 || aniosUnicos.length > 1;

    $("#cgControlStockActual").text(fmtQtyCg(data?.StockActual));
    const totalSaldo = Number(data?.TotalSaldo) || 0;
    $("#cgControlSaldoAnual")
        .text(fmtMoneyCg(totalSaldo))
        .removeClass("rp-money-pos rp-money-neg rp-money-zero")
        .addClass(typeof clsSaldoMoney === "function" ? clsSaldoMoney(totalSaldo) : "");
    $("#cgControlError").toggleClass("d-none", !(data?.DatosParciales || CG.controlAnualError));
    $("#cgControlCount").text(filas.length
        ? String(filas.length)
        : "0");

    $(".cg-cm-table").toggleClass("cg-cm-show-anio", !!mostrarAnio);

    if (!filas.length) {
        tbody.html(`<tr class="cg-cm-empty"><td colspan="17" class="text-center py-4">
            No hay datos para los filtros elegidos.</td></tr>`);
        renderControlMensualCardsCg([], mostrarAnio);
        return;
    }

    tbody.html(filas.map(m => {
        const rowClass = m.SinEntrega ? "cg-cm-sin-entrega" : "";
        const anio = m.Anio || CG.controlAnio;
        const saldo = Number(m.Saldo) || 0;
        const saldoClass = typeof clsSaldoMoney === "function"
            ? clsSaldoMoney(saldo)
            : (saldo > 0 ? "cg-cm-saldo-pos" : (saldo < 0 ? "cg-cm-saldo-neg" : "cg-cm-saldo-cero"));
        const sel = CG.hubMesSel && CG.hubMesSel.anio === anio && CG.hubMesSel.mes === m.Mes ? " is-selected" : "";

        return `<tr class="${rowClass}${sel}" data-anio="${anio}" data-mes="${m.Mes}">
            <td class="cg-col-anio cg-cm-mes">${anio}</td>
            <td class="cg-cm-mes">${escapeCg(m.MesNombre)}</td>
            <td class="cg-cm-date">${formatearFechaCortaCg(m.FechaVisita)}</td>
            <td class="cg-cm-num cg-cm-grp-start">${fmtQtyCg(m.Entregadas)}</td>
            <td class="cg-cm-num">${fmtQtyCg(m.Retiradas)}</td>
            <td class="cg-cm-num">${fmtQtyCg(m.StockCliente)}</td>
            <td class="cg-cm-num cg-cm-grp-start">${fmtMoneyCg(m.SubtotalEntregas)}</td>
            <td class="cg-cm-num">${fmtMoneyCg(m.SubtotalRetiros)}</td>
            <td class="cg-cm-num cg-cm-grp-start">${fmtMoneyCg(m.AbonoEfectivo)}</td>
            <td class="cg-cm-num">${fmtMoneyCg(m.AbonoTransferencia)}</td>
            <td class="cg-cm-date">${formatearFechaCortaCg(m.FechaTransferencia)}</td>
            <td class="cg-cm-num cg-cm-debe cg-cm-grp-start">${fmtMoneyCg(m.Debe)}</td>
            <td class="cg-cm-num cg-cm-haber">${fmtMoneyCg(m.Haber)}</td>
            <td class="cg-cm-num ${saldoClass}">${fmtMoneyCg(m.Saldo)}</td>
            <td class="cg-cm-num">${m.CajasAFavor ?? 0}</td>
            <td class="cg-cm-flag">${m.SinEntrega ? '<i class="fa fa-times"></i>' : ""}</td>
            <td class="cg-cm-obs" title="${escapeCg(m.Observaciones || "")}">${escapeCg(truncarCg(m.Observaciones, 28))}</td>
        </tr>`;
    }).join(""));

    renderControlMensualCardsCg(filas, mostrarAnio);

    if (CG.hubMesSel) {
        const still = filas.find(f => Number(f.Anio || CG.controlAnio) === CG.hubMesSel.anio && Number(f.Mes) === CG.hubMesSel.mes);
        if (still) mostrarDetalleMesHub(CG.hubMesSel.anio, CG.hubMesSel.mes, true);
        else {
            $("#cgHubMesDetail").prop("hidden", true);
            CG.hubMesSel = null;
        }
    }
}

function mostrarDetalleMesHub(anio, mes, keepScroll) {
    const filas = CG.controlFiltrado?.Filas || [];
    const m = filas.find(x => Number(x.Mes) === mes && Number(x.Anio || CG.controlAnio) === anio);
    if (!m) return;

    CG.hubMesSel = { anio, mes };
    $("#cgControlMensualBody tr").removeClass("is-selected");
    $(`#cgControlMensualBody tr[data-anio="${anio}"][data-mes="${mes}"]`).addClass("is-selected");

    $("#cgHubMesDetailTitulo").text(`${m.MesNombre} ${anio} — productos`);
    const prods = Array.isArray(m.Productos) ? m.Productos : [];
    const wrap = $("#cgHubMesProductos");

    if (!prods.length) {
        wrap.html(`<div class="cg-hub-stock-empty">Sin lineas de producto en entregas de este mes. Podes editar visita, abonos y observaciones.</div>`);
    } else {
        wrap.html(`<table class="cg-hub-prod-table">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th class="text-end">Entregadas</th>
                    <th class="text-end">P.u. ent.</th>
                    <th class="text-end">Sub. ent.</th>
                    <th class="text-end">Retiradas</th>
                    <th class="text-end">P.u. ret.</th>
                    <th class="text-end">Sub. ret.</th>
                </tr>
            </thead>
            <tbody>
                ${prods.map(p => `<tr>
                    <td>${escapeCg(p.Producto)}</td>
                    <td class="text-end">${fmtQtyCg(p.Entregadas)}</td>
                    <td class="text-end">${fmtMoneyCg(p.PrecioUnitarioEntrega)}</td>
                    <td class="text-end">${fmtMoneyCg(p.SubtotalEntregas)}</td>
                    <td class="text-end">${fmtQtyCg(p.Retiradas)}</td>
                    <td class="text-end">${fmtMoneyCg(p.PrecioUnitarioRetiro)}</td>
                    <td class="text-end">${fmtMoneyCg(p.SubtotalRetiros)}</td>
                </tr>`).join("")}
            </tbody>
        </table>`);
    }

    $("#cgHubMesDetail").prop("hidden", false);
    if (!keepScroll) {
        document.getElementById("cgHubMesDetail")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

function truncarCg(txt, max) {
    if (!txt) return "";
    return txt.length > max ? txt.slice(0, max) + "…" : txt;
}

function syncSinEntregaUiCg() {
    const activo = $("#cgCmSinEntrega").is(":checked");
    $("#lblCgCmSinEntrega").text(activo ? "Mes sin entrega" : "Con entrega este mes");
    $("#cgCmSinEntregaBox").toggleClass("is-active", activo);
}

function setImporteInputCg(selector, valor) {
    const n = Number(valor) || 0;
    const $el = $(selector);
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
    const raw = $(selector).val();
    if (raw == null || String(raw).trim() === "") return 0;
    if (typeof parseNumero === "function") return parseNumero(raw) || 0;
    if (typeof formatearSinMiles === "function") return formatearSinMiles(raw) || 0;
    const n = parseFloat(String(raw).replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

function abrirModalControlMensual(anio, mes) {
    const filas = CG.controlFiltrado?.Filas || CG.controlAnual?.Meses || [];
    const m = filas.find(x => Number(x.Mes) === mes && Number(x.Anio || CG.controlAnio) === anio);
    if (!m) return;

    $("#cgCmIdControl").val(m.IdControl || 0);
    $("#cgCmAnio").val(anio);
    $("#cgCmMes").val(m.Mes);
    $("#cgCmMesTitulo").text(`${m.MesNombre} ${anio}`);
    $("#cgCmFechaVisita").val(fechaInputCg(m.FechaVisita));
    setImporteInputCg("#cgCmAbonoEfectivo", m.AbonoEfectivo);
    setImporteInputCg("#cgCmAbonoTransferencia", m.AbonoTransferencia);
    $("#cgCmFechaTransferencia").val(fechaInputCg(m.FechaTransferencia));
    $("#cgCmCajasAFavor").val(m.CajasAFavor ?? 0);
    $("#cgCmSinEntrega").prop("checked", !!m.SinEntrega);
    syncSinEntregaUiCg();
    $("#cgCmObservaciones").val(m.Observaciones || "");
    CG.modalControlMensual?.show();
}

async function guardarControlMensualCg() {
    const mes = parseInt($("#cgCmMes").val(), 10);
    const anio = parseInt($("#cgCmAnio").val(), 10);
    if (!mes || !anio) return;

    const idControl = parseInt($("#cgCmIdControl").val(), 10) || 0;
    const abonoEfectivo = leerImporteInputCg("#cgCmAbonoEfectivo");
    const abonoTransferencia = leerImporteInputCg("#cgCmAbonoTransferencia");

    const modelo = {
        Id: idControl,
        IdCliente: CG.id,
        Anio: anio,
        Mes: mes,
        FechaVisita: parseFechaCg($("#cgCmFechaVisita").val()),
        SinEntrega: $("#cgCmSinEntrega").is(":checked"),
        CajasAFavor: parseInt($("#cgCmCajasAFavor").val(), 10) || 0,
        Observaciones: ($("#cgCmObservaciones").val() || "").trim() || null,
        AbonoEfectivo: abonoEfectivo,
        AbonoTransferencia: abonoTransferencia,
        FechaTransferencia: parseFechaCg($("#cgCmFechaTransferencia").val())
    };

    let data;
    try {
        data = await fetchJsonCg(API_CG.guardarControlMensual, {
            method: "POST",
            headers: authCg(),
            body: JSON.stringify(modelo)
        });
    } catch (e) {
        errorModal("No se pudo guardar el control mensual.");
        return;
    }

    if (!data?.valor) {
        errorModal(data?.mensaje || "No se pudo guardar.");
        return;
    }

    exitoModal(data.mensaje || "Control mensual guardado.");
    CG.modalControlMensual?.hide();
    CG.tabsLoaded.controlMensual = false;
    await cargarTabControlMensual(true);
    await cargarHubStockCg(true);
}

/* ---- Stock cliente (hub) ---- */

async function cargarHubStockCg(force) {
    if (force) CG.tabsLoaded.stockCliente = false;

    const data = await fetchJsonCg(API_CG.stockCliente(CG.id), { headers: authCg() }) || [];
    CG.stockCliente = Array.isArray(data) ? data : [];
    renderHubStockCg(CG.stockCliente);
    CG.tabsLoaded.stockCliente = true;
}

function renderHubStockCg(items) {
    const cont = $("#cgHubStockCards");
    if (!cont.length) return;

    const list = (items || []).filter(x => (Number(x.Entregadas) || 0) !== 0 || (Number(x.Retiradas) || 0) !== 0);
    if (!list.length) {
        cont.html(`<div class="cg-hub-stock-empty">Todavia no hay cajas en poder del cliente.</div>`);
        return;
    }

    cont.html(list.map(s => {
        const enPoder = Number(s.EnPoderCliente) || 0;
        const tone = enPoder > 0 ? "has-stock" : (enPoder < 0 ? "neg-stock" : "");
        return `<div class="cg-hub-stock-card ${tone}">
            <div class="cg-hub-stock-name">${escapeCg(s.Producto)}</div>
            <div class="cg-hub-stock-nums">
                <span><small>Entreg.</small><strong>${fmtQtyCg(s.Entregadas)}</strong></span>
                <span><small>Retir.</small><strong>${fmtQtyCg(s.Retiradas)}</strong></span>
                <span class="cg-hub-stock-poder"><small>En poder</small><strong>${fmtQtyCg(enPoder)}</strong></span>
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
        $("#cgSaldoAnterior").text(fmtMoneyCg(res.SaldoAnterior)).attr("class", "val " + (typeof clsSaldoMoney === "function" ? clsSaldoMoney(res.SaldoAnterior) : ""));
        $("#cgDebe").text(fmtMoneyCg(res.Debe)).attr("class", "val rp-money-out");
        $("#cgHaber").text(fmtMoneyCg(res.Haber)).attr("class", "val rp-money-in");
        $("#cgSaldoActual").text(fmtMoneyCg(res.SaldoActual)).attr("class", "val " + (typeof clsSaldoMoney === "function" ? clsSaldoMoney(res.SaldoActual) : ""));
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
            const cls = typeof clsSaldoMoney === "function" ? clsSaldoMoney(n) : "rp-money-zero";
            return `<strong class="${cls}">${fmtMoneyCg(n)}</strong>`;
        }}
    ]);

    CG.tabsLoaded.cuentaCorriente = true;
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
            { label: "Saldo", value: r => fmtMoneyCg(r.Saldo), cls: r => typeof clsSaldoMoney === "function" ? clsSaldoMoney(r.Saldo) : "cg-val-saldo" }
        ],
        actions: r => `<a class="cg-card-btn" href="${API_CG.entregaNuevoModif(r.Id, CG.id)}"><i class="fa fa-pencil"></i> Ver / editar</a>`
    },
    stockCliente: {
        title: r => r.Producto,
        subtitle: () => "Stock en poder del cliente",
        tone: () => "cg-data-card--purple",
        fields: [
            { label: "Entregadas", value: r => fmtQtyCg(r.Entregadas) },
            { label: "Retiradas", value: r => fmtQtyCg(r.Retiradas) },
            { label: "En poder", value: r => fmtQtyCg(r.EnPoderCliente), cls: "cg-val-accent", full: true }
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
            { label: "Saldo", value: r => fmtMoneyCg(r.Saldo), cls: r => typeof clsSaldoMoney === "function" ? clsSaldoMoney(r.Saldo) : "cg-val-saldo" }
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
        entregas: r => { window.location.href = API_CG.entregaNuevoModif(r.Id, CG.id); }
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
    const $grid = $("#cgCards_controlMensual");
    if (!$grid.length) return;

    if (!filas.length) {
        $grid.html(`<div class="cg-cards-empty"><i class="fa fa-calendar"></i> No hay datos para los filtros elegidos.</div>`);
        return;
    }

    $grid.html(filas.map(m => {
        const anio = m.Anio || CG.controlAnio;
        const saldo = Number(m.Saldo) || 0;
        const saldoCls = typeof clsSaldoMoney === "function"
            ? clsSaldoMoney(saldo)
            : (saldo > 0 ? "cg-val-saldo-pos" : (saldo < 0 ? "cg-val-saldo-neg" : "cg-val-saldo-cero"));
        return `
            <article class="cg-data-card cg-data-card--cm rp-card-selectable ${m.SinEntrega ? "is-warn" : ""}"
                     data-anio="${anio}" data-mes="${m.Mes}" tabindex="0" role="button">
                <div class="cg-data-card-head">
                    <div class="cg-data-card-head-text">
                        <div class="cg-data-card-title">${escapeCg(m.MesNombre)}${mostrarAnio ? ` ${anio}` : ""}</div>
                        <div class="cg-data-card-sub">Visita: ${formatearFechaCortaCg(m.FechaVisita) || "-"}</div>
                    </div>
                    ${m.SinEntrega ? `<span class="cg-data-card-badge cg-data-card-badge--warn">Sin entrega</span>` : ""}
                </div>
                <div class="cg-data-card-body">
                    <div class="cg-card-field"><span>Entreg.</span><strong>${fmtQtyCg(m.Entregadas)}</strong></div>
                    <div class="cg-card-field"><span>Retir.</span><strong>${fmtQtyCg(m.Retiradas)}</strong></div>
                    <div class="cg-card-field"><span>Debe</span><strong class="cg-val-debe">${fmtMoneyCg(m.Debe)}</strong></div>
                    <div class="cg-card-field"><span>Haber</span><strong class="cg-val-haber">${fmtMoneyCg(m.Haber)}</strong></div>
                    <div class="cg-card-field cg-card-field--full"><span>Saldo</span><strong class="${saldoCls}">${fmtMoneyCg(m.Saldo)}</strong></div>
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
