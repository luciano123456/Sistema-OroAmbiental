/* =========================================================
   CLIENTES GESTION - Hub unificado por cliente
   (cliente + establecimientos: lineas completas + importe tras cuenta)
========================================================= */
window.__OA_CG_BUILD = "contratos-ctr-v38-20260826";

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
    contratosLista: [],
    contratosEstSelIds: [],
    contratoModal: null,
    modalCobro: null,
    modalControlMensual: null,
    modalInteres: null,
    modalInteresesHist: null,
    interesesHistAnio: null,
    interesesHistMes: null,
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
    wsEntregasMes: [],
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
    switcherNav: [],
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
        wsEntregasMes: [],
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
    combo: "/Clientes/Combo",
    establecimientosPorCliente: idCliente => `/ClientesEstablecimientos/ListaPorCliente?idCliente=${idCliente}`,
    contratosLista: id => `/Contratos/Lista?idCliente=${id}`,
    entregasLista: "/ClientesEntregas/ListaFiltrada",
    ccMovimientos: "/ClientesCuentaCorriente/Movimientos",
    ccResumen: "/ClientesCuentaCorriente/Resumen",
    ccRegistrarCobro: "/ClientesCuentaCorriente/RegistrarCobro",
    ccRegistrarInteres: "/ClientesCuentaCorriente/RegistrarInteres",
    ccActualizarInteres: "/ClientesCuentaCorriente/ActualizarInteres",
    ccEliminar: id => `/ClientesCuentaCorriente/Eliminar?id=${id}`,
    cuentas: "/Cuentas/Lista",
    entregaNuevoModif: (idEntrega, idCliente, volverCliente = false) => {
        let url = `/ClientesEntregas/NuevoModif?id=${idEntrega || 0}`;
        if (idCliente) url += `&idCliente=${idCliente}`;
        if (volverCliente && idCliente) url += `&volverCliente=true`;
        return url;
    },
    /** Navega a entrega guardando el contexto de la ficha del cliente para el botón Volver. */
    irEntregaDesdeCliente: (idEntrega, idCliente) => {
        if (typeof guardarEstadoRetornoCg === "function") guardarEstadoRetornoCg();
        window.location.assign(API_CG.entregaNuevoModif(idEntrega, idCliente, true));
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
    entregaActualizar: "/ClientesEntregas/Actualizar",
    entregaEliminar: id => `/ClientesEntregas/Eliminar?id=${id}`,
    entregaCobros: id => `/ClientesEntregas/Cobros?id=${id}`,
    guardarControlMensual: "/ClientesOperativo/GuardarControlMensual",
    vaciarAbonosMes: "/ClientesOperativo/VaciarAbonosMes",
    recoleccionPrincipal: id => `/Clientes/RecoleccionPrincipal?idCliente=${id}`,
    recoleccionPrincipalGuardar: "/Clientes/RecoleccionPrincipal",
    dias: "/Dias/Lista",
    semanas: "/Semanas/Lista",
    listasPrecios: "/ListasPrecios/Lista",
    camiones: "/Camiones/Lista?soloActivos=true",
    manifiestosDocumentos: (id, idEst) => {
        const est = Number(idEst) || 0;
        const qs = est > 0 ? `&idEstablecimiento=${est}` : "";
        return `/Clientes/ManifiestosDocumentos?idCliente=${id}${qs}`;
    },
    descargarCertificado: id => `/Clientes/DescargarCertificado?id=${id}`,
    descargarManifiestoHistorial: (idCamion, id) => `/Clientes/DescargarManifiestoHistorial?idCamion=${idCamion}&id=${id}`,
    eliminarCertificado: id => `/Clientes/EliminarCertificado?id=${id}`,
    eliminarManifiestoHistorial: (idCamion, id) => `/Clientes/EliminarManifiestoHistorial?idCamion=${idCamion}&id=${id}`
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
    initClienteSwitcherCg();
    initSeccionesPlegablesCg();

    await withCgLoading(CG.id > 0 ? "Cargando cliente y planilla…" : "Preparando formulario…", async () => {
        await cargarCombosDatosCg();

        if (CG.id > 0) {
            await cargarClienteCg(CG.id);
            await cargarRecorridosAsignadosCg();
            habilitarTabsRelacionados(true);
            await cargarHubDatosCg(true);
            aplicarDeepLinkGestionCg();
            await restaurarEstadoRetornoCg();
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
const CG_NAV_RETURN_PREFIX = "cg.navReturn.v1.";
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

/** Estado de solapa / establecimiento / mes abierto al ir a una entrega (para Volver). */
function aplicarDeepLinkGestionCg() {
    if (!(CG.id > 0)) return;
    const q = new URLSearchParams(window.location.search);
    const est = Number(q.get("est") || 0);
    const tab = (q.get("tab") || "").toLowerCase();
    const tabsOk = ["datos", "establecimientos", "contratos", "cuentaCorriente", "entregas"];
    if (!(est > 0) && tab !== "stock" && tab !== "pagos" && !tabsOk.includes(tab)) return;

    let mainTab = "datos";
    if (est > 0) mainTab = "establecimientos";
    else if (tab === "stock" || tab === "pagos") mainTab = "datos";
    else if (tabsOk.includes(tab)) mainTab = tab;

    const st = {
        v: 1,
        idCliente: CG.id,
        mainTab,
        estIds: est > 0 ? [est] : [],
        estTab: est > 0 ? (tab === "pagos" ? "pagos" : "stock") : null,
        hubActivo: est > 0 ? "est" : "cliente",
        mesCliente: null,
        mesEst: null
    };
    try {
        sessionStorage.setItem(CG_NAV_RETURN_PREFIX + CG.id, JSON.stringify(st));
    } catch { /* noop */ }
}

function capturarEstadoRetornoCg() {
    if (!(CG.id > 0)) return null;

    const mainTab = document.querySelector("#cgTabsNav button.nav-link.active[data-cg-tab]")
        ?.getAttribute("data-cg-tab") || "datos";

    let estTab = null;
    if ($("#tabBtnStockEst").hasClass("active")) estTab = "stock";
    else if ($("#tabBtnContactosEst").hasClass("active")) estTab = "contactos";
    else if ($("#tabBtnContratosEst").hasClass("active")) estTab = "contratos";
    else if ($("#tabBtnProductosEst").hasClass("active")) estTab = "productos";
    else if ($("#tabBtnManifiestosEst").hasClass("active")) estTab = "manifiestos";
    else if ($("#tabBtnDatosEst").hasClass("active")) estTab = "datos";

    const mesClienteVisible = !$("#cgHubMesDetail").prop("hidden") && CG.hubMesSel
        ? { anio: Number(CG.hubMesSel.anio), mes: Number(CG.hubMesSel.mes) }
        : null;
    const mesEst = CG.hubs?.est?.hubMesSel;
    const mesEstVisible = mesEst && !$("#cgEstHubMesDetail").prop("hidden")
        ? { anio: Number(mesEst.anio), mes: Number(mesEst.mes) }
        : null;

    return {
        v: 1,
        idCliente: CG.id,
        mainTab,
        estIds: idsEstablecimientoSeleccionadosCg(),
        estTab: mainTab === "establecimientos" ? (estTab || "datos") : null,
        hubActivo: CG.hubActivo === "est" ? "est" : "cliente",
        mesCliente: mesClienteVisible,
        mesEst: mesEstVisible,
        controlFiltrosCliente: {
            anios: [...(CG.controlFiltros?.anios || [])],
            meses: [...(CG.controlFiltros?.meses || [])]
        },
        controlFiltrosEst: CG.hubs?.est?.controlFiltros
            ? {
                anios: [...(CG.hubs.est.controlFiltros.anios || [])],
                meses: [...(CG.hubs.est.controlFiltros.meses || [])]
            }
            : null
    };
}

function guardarEstadoRetornoCg() {
    const st = capturarEstadoRetornoCg();
    if (!st) return;
    try {
        sessionStorage.setItem(CG_NAV_RETURN_PREFIX + st.idCliente, JSON.stringify(st));
    } catch (e) {
        console.warn("No se pudo guardar estado de retorno:", e);
    }
}

function consumirEstadoRetornoCg(idCliente) {
    try {
        const key = CG_NAV_RETURN_PREFIX + idCliente;
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        sessionStorage.removeItem(key);
        const st = JSON.parse(raw);
        if (!st || Number(st.idCliente) !== Number(idCliente)) return null;
        return st;
    } catch {
        return null;
    }
}

async function restaurarEstadoRetornoCg() {
    const st = consumirEstadoRetornoCg(CG.id);
    if (!st) return;

    try {
        if (st.controlFiltrosCliente) {
            CG.controlFiltros = {
                anios: [...(st.controlFiltrosCliente.anios || [])],
                meses: [...(st.controlFiltrosCliente.meses || [])]
            };
        }

        const mainTab = st.mainTab || "datos";

        if (mainTab === "establecimientos") {
            CG.establecimientoSelIds = (st.estIds || []).map(Number).filter(x => x > 0);
            syncEstablecimientoSelStateCg();
        }

        if (mainTab !== "datos") {
            const btn = document.querySelector(`#cgTabsNav button[data-cg-tab="${mainTab}"]`);
            if (btn && !btn.disabled) {
                bootstrap.Tab.getOrCreateInstance(btn).show();
                await cargarTabCg(mainTab);
            }
        }

        if (mainTab === "establecimientos") {
            // Reaplicar por si el lazy-load limpió la selección
            CG.establecimientoSelIds = (st.estIds || []).map(Number).filter(x => x > 0);
            syncEstablecimientoSelStateCg();
            await aplicarSeleccionEstablecimientosCg();

            const estTabMap = {
                stock: "tabBtnStockEst",
                contactos: "tabBtnContactosEst",
                contratos: "tabBtnContratosEst",
                productos: "tabBtnProductosEst",
                manifiestos: "tabBtnManifiestosEst",
                datos: "tabBtnDatosEst"
            };
            const estBtnId = estTabMap[st.estTab] || "tabBtnDatosEst";
            const estBtn = document.getElementById(estBtnId);
            if (estBtn && !estBtn.disabled && !estBtn.classList.contains("d-none")) {
                bootstrap.Tab.getOrCreateInstance(estBtn).show();
            }

            if (st.estTab === "contratos") {
                await cargarContratosEstablecimientoCg(idsEstablecimientoSeleccionadosCg()[0]);
            }

            if (st.estTab === "manifiestos") {
                await cargarTabManifiestos(true);
            }

            if (st.estTab === "stock" || st.mesEst) {
                CG.hubActivo = "est";
                await cargarHubEstablecimientoCg(true);
                if (st.controlFiltrosEst) {
                    hubEstStateCg().controlFiltros = {
                        anios: [...(st.controlFiltrosEst.anios || [])],
                        meses: [...(st.controlFiltrosEst.meses || [])]
                    };
                    await cargarTabControlMensual(true, idsEstablecimientoSeleccionadosCg());
                }
                if (st.mesEst?.anio && st.mesEst?.mes) {
                    await withHubModeCg("est", async () => {
                        await abrirWorkspaceMesCg(st.mesEst.anio, st.mesEst.mes, true);
                    });
                    document.getElementById("cgEstHubMesDetail")
                        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }
            }
            return;
        }

        // Cliente / control de pagos en solapa Datos
        CG.hubActivo = "cliente";
        if (st.mesCliente?.anio && st.mesCliente?.mes) {
            await cargarTabControlMensual(true);
            await abrirWorkspaceMesCg(st.mesCliente.anio, st.mesCliente.mes, true);
            document.getElementById("cgHubMesDetail")
                ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } else if (mainTab === "datos") {
            document.getElementById("cgHubOperativo")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    } catch (e) {
        console.warn("No se pudo restaurar el contexto al volver:", e);
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
        cargarRecorridosAsignadosCg();
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
                CG.tabsLoaded.contratos = false;
                const idGuardado = Number(modelo?.Id || data?.id || 0);
                await cargarTabEstablecimientos();
                await cargarRecorridosAsignadosCg();
                if (idGuardado > 0) {
                    CG.establecimientoSelId = idGuardado;
                    resaltarListaEstablecimientoCg(idGuardado);
                    $("#btnEliminarEstTab").removeClass("d-none");
                    setStockEstTabDisponibleCg(true);
                    CG.hubActivo = "est";
                    await cargarHubEstablecimientoCg(true);
                    if ($("#tabBtnContratosEst").hasClass("active")) {
                        await cargarContratosEstablecimientoCg(idGuardado);
                    }
                }
                syncEstEditorFootCg();
            },
            onDeleted: async () => {
                CG.establecimientoSelId = 0;
                CG.establecimientoSelIds = [];
                syncEstablecimientoSelStateCg();
                limpiarHubEstablecimientoCg();
                setStockEstTabDisponibleCg(false);
                CG.tabsLoaded.establecimientos = false;
                await cargarTabEstablecimientos();
                syncEstEditorFootCg();
            },
            onClosed: () => {
                CG.establecimientoSelId = 0;
                resaltarListaEstablecimientoCg(0);
                $("#btnEliminarEstTab").addClass("d-none");
                syncEstEditorFootCg();
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
                    syncEstEditorFootCg();
                }
            }
        });
    }

    if (typeof initContratoModal === "function") {
        CG.contratoModal = initContratoModal({
            token: token,
            onSaved: async () => {
                CG.tabsLoaded.contratos = false;
                await refrescarContratosCg();
            },
            onDeleted: async () => {
                CG.tabsLoaded.contratos = false;
                await refrescarContratosCg();
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

    const avisoOrdenCg = document.getElementById("avisoOrdenRecorridoCg");
    if (avisoOrdenCg && typeof rpBindAvisoOrdenRecorrido === "function") {
        rpBindAvisoOrdenRecorrido(avisoOrdenCg);
    }

    $("#cgActivo").on("change", function () {
        $("#lblActivoCg").text(this.checked ? "Activo" : "Inactivo");
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
    $("#btnContratosEstSelTodos").on("click", () => seleccionarTodosContratosEstCg());
    $("#cgEstList").on("click", ".cg-est-pill", function (e) {
        e.preventDefault();
        const id = Number($(this).data("id")) || 0;
        if (!id) return;
        toggleEstablecimientoSelCg(id, { exclusive: e.shiftKey });
    });
    $("#cgContratosEstList").on("click", ".cg-est-pill", function (e) {
        e.preventDefault();
        const id = Number($(this).data("id")) || 0;
        if (!id) return;
        toggleContratosEstSelCg(id, { exclusive: e.shiftKey });
    });
    $(document).on("click", "#tabBtnDatosEst.disabled, #tabBtnContactosEst.disabled, #tabBtnContratosEst.disabled, #tabBtnProductosEst.disabled, #tabBtnManifiestosEst.disabled", function (e) {
        e.preventDefault();
        e.stopPropagation();
    });
    $(document).on("shown.bs.tab", "#tabBtnStockEst", () => {
        CG.hubActivo = "est";
        syncEstEditorFootCg();
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
    $(document).on("shown.bs.tab", "#tabBtnDatosEst, #tabBtnContactosEst, #tabBtnContratosEst, #tabBtnProductosEst, #tabBtnManifiestosEst", function () {
        CG.hubActivo = "cliente";
        syncEstEditorFootCg();
        if (this.id === "tabBtnContratosEst") {
            const idEst = idsEstablecimientoSeleccionadosCg()[0] || 0;
            cargarContratosEstablecimientoCg(idEst);
        }
        if (this.id === "tabBtnManifiestosEst") {
            cargarTabManifiestos(true);
        }
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
    $(document).on("click", "#cgHubOperativo .cg-cm-chip, #cgEstHubMount .cg-cm-chip", function (e) {
        e.preventDefault();
        syncHubActivoFromElCg(this);
        const tipo = String($(this).attr("data-tipo") || "").toLowerCase();
        const val = parseInt($(this).attr("data-val"), 10);
        toggleFiltroControlCg(tipo, val);
    });
    $(document).on("click", "#cgHubOperativo .cg-preset-meses, #cgEstHubMount .cg-preset-meses", function (e) {
        e.preventDefault();
        syncHubActivoFromElCg(this);
        aplicarPresetMesesCg($(this).attr("data-meses"));
        cargarTabControlMensual(true, isHubEstCg() ? idsEstablecimientoSeleccionadosCg() : null);
    });
    $(document).on("click", "#btnControlAniosRecientes, #btnEstControlAniosRecientes", function (e) {
        e.preventDefault();
        syncHubActivoFromElCg(this);
        aplicarPresetAniosRecientesCg();
        cargarTabControlMensual(true, isHubEstCg() ? idsEstablecimientoSeleccionadosCg() : null);
    });
    // Legacy bindings replaced by delegated handlers above (hub-aware).
    $h("btnGuardarControlMensualCg").on("click", busyHandler(guardarVisitaUnificadaCg));
    $h("btnGuardarDatosMesCg").on("click", busyHandler(() => guardarControlMensualCg({ silent: false })));
    $(document).on("click", "#btnVaciarMontosMesCg, #btnEstVaciarMontosMesCg", busyHandler(function () {
        syncHubActivoFromElCg(this);
        return vaciarAbonosMesCg();
    }));
    $h("btnWsNuevaEntregaMes").on("click", () => {
        CG.hubActivo = "cliente";
        agregarEntregaDraftMesCg();
    });
    $h("cgControlMensualBody").on("click", "tr[data-mes]", function (e) {
        if ($(e.target).closest(".cg-cm-int-eye, .cg-cm-obs-eye, .cg-cm-visita-editor").length) return;
        CG.hubActivo = "cliente";
        const anio = Number($(this).data("anio"));
        const mes = Number($(this).data("mes"));
        abrirWorkspaceMesCg(anio, mes);
    });
    $h("cgCards_controlMensual").on("click", "article[data-mes]", function (e) {
        if ($(e.target).closest(".cg-cm-int-eye, .cg-cm-obs-eye, .cg-cm-visita-editor").length) return;
        CG.hubActivo = "cliente";
        const anio = Number($(this).data("anio"));
        const mes = Number($(this).data("mes"));
        abrirWorkspaceMesCg(anio, mes);
    });
    $(document).on("click", "#cgEstAtrasosLista .cg-atraso-chip-reclamar", function (e) {
        e.preventDefault();
        e.stopPropagation();
        CG.hubActivo = "est";
        reclamarDeudaEstablecimientoCg({
            meses: [{ anio: Number($(this).data("anio")), mes: Number($(this).data("mes")) }]
        });
    });
    $(document).on("click", "#cgAtrasosAlert .cg-atraso-chip, #cgEstAtrasosAlert .cg-atraso-chip", function () {
        syncHubActivoFromElCg(this);
        const anio = Number($(this).data("anio"));
        const mes = Number($(this).data("mes"));
        abrirWorkspaceMesCg(anio, mes);
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
        CG.hubActivo = "cliente";
        $h("cgHubMesDetail").prop("hidden", true);
        setHubPropCg("hubMesSel", null);
        setHubPropCg("wsLineas", []);
        setHubPropCg("wsCobros", []);
        setHubPropCg("wsEntregasMes", []);
        $h("cgControlMensualBody").find("tr").removeClass("is-selected");
        $h("cgCards_controlMensual").find("article").removeClass("is-selected");
        actualizarChipsAtrasosSeleccionCg(-1, -1);
    });
    $h("btnInteresMesHub").on("click", () => {
        CG.hubActivo = "cliente";
        CG.interesHubMode = "cliente";
        if (hubPropCg("hubMesSel")) abrirModalInteresCg(hubPropCg("hubMesSel").anio, hubPropCg("hubMesSel").mes);
    });
    $h("btnVerInteresesMesHub").on("click", () => {
        CG.hubActivo = "cliente";
        CG.interesHubMode = "cliente";
        if (hubPropCg("hubMesSel")) abrirModalInteresesHistCg(hubPropCg("hubMesSel").anio, hubPropCg("hubMesSel").mes);
    });
    $h("btnVerInteresesCg").on("click", () => {
        CG.hubActivo = "cliente";
        CG.interesHubMode = "cliente";
        abrirModalInteresesHistCg(null, null);
    });
    $(document).on("click", "#cgHubOperativo #btnContactoHub, #cgEstHubMount #btnEstContactoHub, #cgHubOperativo #btnReclamoDeudaAtrasos, #cgEstHubMount #btnEstReclamoDeudaAtrasos", function (e) {
        e.preventDefault();
        syncHubActivoFromElCg(this);
        contactarEstablecimientoCg({ modo: "junto" });
    });
    $(document).on("click", "#cgHubOperativo #btnReclamoMesHub, #cgEstHubMount #btnEstReclamoMesHub", function (e) {
        e.preventDefault();
        syncHubActivoFromElCg(this);
        const sel = hubPropCg("hubMesSel");
        if (!sel) {
            errorModal("Elegí un mes para reclamar.");
            return;
        }
        contactarEstablecimientoCg({ meses: [{ anio: sel.anio, mes: sel.mes }] });
    });
    $(document).on("click", ".cg-cm-int-eye", function (e) {
        e.preventDefault();
        e.stopPropagation();
        syncHubActivoFromElCg(this);
        const anio = Number($(this).data("anio"));
        const mes = Number($(this).data("mes"));
        if (!anio || !mes) return;
        abrirModalInteresesHistCg(anio, mes);
    });
    $(document).on("click", ".cg-cm-obs-eye", function (e) {
        e.preventDefault();
        e.stopPropagation();
        syncHubActivoFromElCg(this);
        abrirModalObsControlCg(this);
    });
    $(document).on("click", ".cg-cm-visita-edit", function (e) {
        e.preventDefault();
        e.stopPropagation();
        syncHubActivoFromElCg(this);
        iniciarEdicionFechaVisitaCg(this);
    });
    $(document).on("click", ".cg-cm-visita-ok", function (e) {
        e.preventDefault();
        e.stopPropagation();
        guardarFechaVisitaInlineCg(this);
    });
    $(document).on("click", ".cg-cm-visita-cancel", function (e) {
        e.preventDefault();
        e.stopPropagation();
        cancelarEdicionFechaVisitaCg(this);
    });
    $(document).on("click", ".cg-cm-visita-cal", function (e) {
        e.preventDefault();
        e.stopPropagation();
        abrirCalendarioFechaVisitaCg(this);
    });
    $(document).on("change", ".cg-cm-visita-picker", function () {
        const iso = (this.value || "").trim();
        if (!iso) return;
        $(this).closest(".cg-cm-visita-editor").find(".cg-cm-visita-input").val(isoADdMmYyyyCg(iso));
    });
    $(document).on("input", ".cg-cm-visita-input", function () {
        enmascararFechaCortaInputCg(this);
    });
    $(document).on("keydown", ".cg-cm-visita-editor", function (e) {
        if (e.key === "Escape") {
            e.preventDefault();
            cancelarEdicionFechaVisitaCg(this);
        } else if (e.key === "Enter") {
            e.preventDefault();
            guardarFechaVisitaInlineCg(this);
        }
    });
    $(document).on("click", ".cg-cm-visita-editor", function (e) {
        e.stopPropagation();
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
        if (s) agregarLineaWsCg(prefLineaDesdeSugeridoWsCg(s, $(this).data("tipo")));
    });
    $h("cgWsLineasBody").on("click", ".btn-ws-quitar", function () {
        const idx = Number($(this).data("idx"));
        if (Number.isNaN(idx)) return;
        hubPropCg("wsLineas").splice(idx, 1);
        renderLineasWsCg();
        actualizarResumenCobrosWsCg();
    });
    $(document).off("click.noretSign").on("click.noretSign", ".cg-ws-lineas-list .ws-noret-sign, #cgWsLineasBody .ws-noret-sign, #cgEstWsLineasBody .ws-noret-sign", function (e) {
        e.preventDefault();
        e.stopPropagation();
        syncHubActivoFromElCg(this);
        activarLineasHubDesdeAccCg(this);
        const $row = $(this).closest(".cg-ws-linea");
        const idx = Number($row.data("idx"));
        const linea = lineasWsDeCg(this)[idx];
        if (!linea) return;
        leerCamposLineaWsDesdeDomCg($row, linea);
        aplicarSignoNoRetiradoWsCg($row, linea, Number($(this).data("sign")));
        $row.find(".ws-sub").text(fmtMoneyCg(subtotalLineaWsCg(linea)));
        refrescarSaldosNoRetiradoWsCg(this);
        actualizarResumenCobrosWsCg(this);
        actualizarAlertaDuplicadosLineasWsCg(this);
    });
    $(document).off("change.wsAccLinea input.wsAccLinea").on("change.wsAccLinea input.wsAccLinea", ".cg-ws-acc .cg-ws-linea select, .cg-ws-acc .cg-ws-linea input", async function () {
        syncHubActivoFromElCg(this);
        activarLineasHubDesdeAccCg(this);
        const idx = Number($(this).closest(".cg-ws-linea").data("idx"));
        const linea = lineasWsDeCg(this)[idx];
        if (!linea) return;
        const $row = $(this).closest(".cg-ws-linea");
        const campo = $(this).hasClass("ws-prod") ? "prod"
            : $(this).hasClass("ws-lista") ? "lista"
            : $(this).hasClass("ws-tipo") ? "tipo"
            : "otro";
        leerCamposLineaWsDesdeDomCg($row, linea);
        sincronizarUiNoRetiradoWsCg($row, linea);
        await sincronizarPrecioLineaWsCg($row, linea, campo);
        $row.find(".ws-sub").text(fmtMoneyCg(subtotalLineaWsCg(linea)));
        refrescarSaldosNoRetiradoWsCg(this);
        actualizarResumenCobrosWsCg(this);
        actualizarAlertaDuplicadosLineasWsCg(this);
    });
    $(document).off("click.wsAcc").on("click.wsAcc", ".cg-ws-acc-head", function (e) {
        e.preventDefault();
        syncHubActivoFromElCg(this);
        toggleEntregaAccCg($(this).attr("data-uid") || $(this).closest(".cg-ws-acc").attr("data-uid"));
    });
    $(document).off("click.wsAccLineaAdd").on("click.wsAccLineaAdd", ".cg-ws-acc .btn-ws-acc-linea", function (e) {
        e.preventDefault();
        e.stopPropagation();
        syncHubActivoFromElCg(this);
        agregarLineaWsCg(null, this);
    });
    $(document).off("click.wsAccCobroAdd").on("click.wsAccCobroAdd", ".cg-ws-acc .btn-ws-acc-cobro", function (e) {
        e.preventDefault();
        e.stopPropagation();
        syncHubActivoFromElCg(this);
        agregarCobroWsCg(null, this);
    });
    $(document).off("click.wsAccChip").on("click.wsAccChip", ".cg-ws-acc .cg-ws-chip", function (e) {
        e.preventDefault();
        e.stopPropagation();
        syncHubActivoFromElCg(this);
        const idx = Number($(this).data("idx"));
        const s = CG.wsSugeridos[idx];
        if (s) agregarLineaWsCg(prefLineaDesdeSugeridoWsCg(s, $(this).data("tipo")), this);
    });
    $(document).off("click.wsAccQuitar").on("click.wsAccQuitar", ".cg-ws-acc .btn-ws-quitar", function (e) {
        e.preventDefault();
        e.stopPropagation();
        syncHubActivoFromElCg(this);
        activarLineasHubDesdeAccCg(this);
        const idx = Number($(this).data("idx"));
        if (Number.isNaN(idx)) return;
        lineasWsDeCg(this).splice(idx, 1);
        renderLineasWsCg(this);
        actualizarResumenCobrosWsCg(this);
    });
    $(document).off("click.wsAccQuitarCobro").on("click.wsAccQuitarCobro", ".cg-ws-acc .btn-ws-quitar-cobro", function (e) {
        e.preventDefault();
        e.stopPropagation();
        syncHubActivoFromElCg(this);
        const key = Number($(this).data("key"));
        const cobros = cobrosWsDeCg(this);
        const i = cobros.findIndex(c => Number(c._key) === key);
        if (i >= 0) cobros.splice(i, 1);
        renderCobrosWsCg(this);
    });
    $(document).off("change.wsAccCobro input.wsAccCobro").on("change.wsAccCobro input.wsAccCobro", ".cg-ws-acc .cg-ws-cobro-row input, .cg-ws-acc .cg-ws-cobro-row select", function () {
        syncHubActivoFromElCg(this);
        const $row = $(this).closest(".cg-ws-cobro-row");
        if ($(this).hasClass("ws-cobro-cuenta")) syncImporteHabilitadoCobroWsCg($row);
        sincronizarCobrosWsDesdeDomCg(this);
        actualizarResumenCobrosWsCg(this);
    });
    $(document).off("change.wsAccEst").on("change.wsAccEst", ".cg-ws-acc .ws-acc-est", async function () {
        syncHubActivoFromElCg(this);
        const $acc = $wsAccFromCg(this);
        const ent = entregaByUidCg($acc.attr("data-uid"));
        if (ent) ent.IdEstablecimiento = Number($(this).val()) || 0;
        await cargarSugeridosEnAccCg($acc, Number($(this).val()) || 0);
    });
    $(document).off("change.wsAccFecha").on("change.wsAccFecha", ".cg-ws-acc .ws-acc-fecha", function () {
        syncHubActivoFromElCg(this);
        const $acc = $wsAccFromCg(this);
        const ent = entregaByUidCg($acc.attr("data-uid"));
        if (ent) ent.Fecha = $(this).val() || "";
        $h("cgCmFechaVisita").val($(this).val() || "");
        $h("cgWsFechaEntrega").val($(this).val() || "");
    });
    $(document).off("click.wsAccGuardar").on("click.wsAccGuardar", ".cg-ws-acc .btn-ws-acc-guardar", busyHandler(function () {
        syncHubActivoFromElCg(this);
        return guardarVisitaUnificadaCg(this);
    }));
    $(document).off("click.wsAccEliminar").on("click.wsAccEliminar", ".cg-ws-acc .btn-ws-acc-eliminar", busyHandler(function () {
        syncHubActivoFromElCg(this);
        return eliminarEntregaAccCg(this);
    }));
    $h("cgWsLineasBody").on("change input", "select, input", async function () {
        const idx = Number($(this).closest(".cg-ws-linea").data("idx"));
        const linea = hubPropCg("wsLineas")[idx];
        if (!linea) return;
        const $row = $(this).closest(".cg-ws-linea");
        const campo = $(this).hasClass("ws-prod") ? "prod"
            : $(this).hasClass("ws-lista") ? "lista"
            : $(this).hasClass("ws-tipo") ? "tipo"
            : "otro";

        leerCamposLineaWsDesdeDomCg($row, linea);
        sincronizarUiNoRetiradoWsCg($row, linea);

        await sincronizarPrecioLineaWsCg($row, linea, campo);

        $row.find(".ws-sub").text(fmtMoneyCg(subtotalLineaWsCg(linea)));
        refrescarSaldosNoRetiradoWsCg();
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
        if (idEntrega <= 0) {
            if (typeof errorModal === "function") errorModal("No se pudo identificar la entrega a abrir.");
            return;
        }
        API_CG.irEntregaDesdeCliente(idEntrega, CG.id);
    });
    $(document).on("click", "a[href*='/ClientesEntregas/NuevoModif'][href*='volverCliente=true']", function () {
        // Guarda solapa / mes abierto antes de salir (Nueva entrega, cards, etc.)
        guardarEstadoRetornoCg();
    });
    $("#btnRefreshEntregasTab").on("click", () => cargarHubEntregasCg(true));
    $("#btnRefreshManifiestosCg").on("click", () => cargarTabManifiestos(true));

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
        "#cgCondicionIva", "#cgTipoGenerador", "#cgCobroCuenta",
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
    const opts = Object.assign({ cache: "no-store" }, options);
    const r = await fetch(url, opts);
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
        verificarOrdenRecorridoCg();
    } catch (e) {
        console.warn("No se pudo cargar recoleccion principal:", e);
    }
}

function limpiarRecoleccionCg() {
    $("#cgEstId, #cgIdEstablecimientoCliente, #cgDiasHorarios, #cgOrdenRecorrido, #cgEstKilos").val("");
    CG_REC_CAMION_SELECTORS.forEach(sel => $(sel).val("").trigger("change"));
    $("#cgRecSemana").val("").trigger("change");
    CG.idDiaRecoleccionLegacy = 0;
    if (typeof rpOcultarAvisoOrdenRecorrido === "function") {
        rpOcultarAvisoOrdenRecorrido(document.getElementById("avisoOrdenRecorridoCg"));
    }
}

let _ordenRecorridoCgTimer = null;
function verificarOrdenRecorridoCg() {
    clearTimeout(_ordenRecorridoCgTimer);
    _ordenRecorridoCgTimer = setTimeout(() => verificarOrdenRecorridoCgNow(), 280);
}

async function verificarOrdenRecorridoCgNow() {
    const root = document.getElementById("avisoOrdenRecorridoCg");
    const orden = intOrNullCg("#cgOrdenRecorrido");
    const semana = intOrNullCg("#cgRecSemana");
    const idExcluir = parseInt($("#cgEstId").val(), 10) || 0;

    if (!orden || orden <= 0 || !semana) {
        if (typeof rpOcultarAvisoOrdenRecorrido === "function")
            rpOcultarAvisoOrdenRecorrido(root);
        return;
    }

    const dias = obtenerDiasSemanaRecoleccionCg();
    for (const d of dias) {
        if (!d.IdCamion) continue;
        try {
            const info = await fetchJsonCg(
                `/ClientesEstablecimientos/OcupanteOrdenRecorrido?idCamion=${d.IdCamion}&idDia=${d.IdDia}&idSemana=${semana}&orden=${orden}&idExcluir=${idExcluir}`,
                { headers: authCg() }
            );
            if (info?.Ocupado || info?.ocupado) {
                if (typeof rpMostrarAvisoOrdenRecorrido === "function") {
                    rpMostrarAvisoOrdenRecorrido(root, {
                        posicion: orden,
                        nombre: typeof rpNombreOcupanteOrden === "function" ? rpNombreOcupanteOrden(info) : "otra persona"
                    });
                }
                return;
            }
        } catch (e) {
            console.warn(e);
        }
    }

    if (typeof rpOcultarAvisoOrdenRecorrido === "function")
        rpOcultarAvisoOrdenRecorrido(root);
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
        OrdenRecorrido: (() => {
            const n = intOrNullCg("#cgOrdenRecorrido");
            return n && n > 0 ? n : null;
        })(),
        DesplazarOrdenRecorrido: typeof rpDecisionAvisoOrdenRecorrido === "function"
            && rpDecisionAvisoOrdenRecorrido(document.getElementById("avisoOrdenRecorridoCg")) === true,
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
        renderRecorridosCg([], false, "#cgRecorridosAsignados");
        return;
    }

    try {
        const items = await fetchJsonCg(API_CG.recorridosPorCliente(CG.id), { headers: authCg() });
        renderRecorridosCg(items || [], false, "#cgRecorridosAsignados");
    } catch (e) {
        console.warn("Recorridos asignados no disponibles:", e);
        renderRecorridosCg([], true, "#cgRecorridosAsignados");
    }
}

async function guardarRecoleccionPrincipalCg() {
    if (CG.id <= 0 || !tieneDatosRecoleccionCg()) return { ok: true };

    const aviso = document.getElementById("avisoOrdenRecorridoCg");
    if (aviso && !aviso.hidden
        && typeof rpDecisionAvisoOrdenRecorrido === "function"
        && rpDecisionAvisoOrdenRecorrido(aviso) === null) {
        return { ok: false, mensaje: "El Nº de recorrido ya está ocupado. Indicá si querés reemplazar y desplazar a los demás." };
    }

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
        $("#cgNumeroCliente").val(m.NumeroCliente ?? "");
        $("#cgActivo").prop("checked", m.Activo !== false);
        $("#lblActivoCg").text(m.Activo !== false ? "Activo" : "Inactivo");

        if (m.IdSucursal) $("#cgSucursal").val(String(m.IdSucursal)).trigger("change");
        if (m.IdProfesion) $("#cgProfesion").val(String(m.IdProfesion)).trigger("change");
        if (m.IdCondicionIva) $("#cgCondicionIva").val(String(m.IdCondicionIva)).trigger("change");
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
    sincronizarSwitcherClienteCg(titulo);
}

function textoClienteComboCg(c) {
    if (!c) return "Cliente";
    const nro = c.NumeroCliente ? `#${c.NumeroCliente} · ` : "";
    const inact = c.Activo === false ? " (inactivo)" : "";
    return `${nro}${c.Nombre || "Cliente"}${inact}`;
}

function tabActualCg() {
    return document.querySelector("#cgTabsNav button.nav-link.active[data-cg-tab]")
        ?.getAttribute("data-cg-tab") || "";
}

function irAClienteGestionCg(id) {
    const dest = Number(id) || 0;
    if (!(dest > 0) || dest === Number(CG.id)) return;
    const tab = tabActualCg();
    const qs = tab && tab !== "datos" ? `&tab=${encodeURIComponent(tab)}` : "";
    window.location.href = `/Clientes/Gestion?id=${dest}${qs}`;
}

function sincronizarSwitcherClienteCg(titulo) {
    const $sel = $("#cgClienteSwitcher");
    if (!$sel.length || !(CG.id > 0)) return;
    const nro = $("#cgNumeroCliente").val();
    const activo = $("#cgActivo").prop("checked") !== false;
    const cuit = ($("#cgCuit").val() || "").trim();
    const desdeLista = (CG.switcherNav || []).find(c => Number(c.Id) === Number(CG.id));
    const txt = textoClienteComboCg(desdeLista || {
        Nombre: titulo || "Cliente",
        NumeroCliente: nro ? Number(nro) : null,
        Activo: activo
    });
    const data = {
        id: CG.id,
        text: txt,
        cuit: (desdeLista && desdeLista.Cuit) || cuit,
        activo
    };
    $sel.find("option").remove();
    const opt = new Option(txt, String(CG.id), true, true);
    $.data(opt, "data", data);
    $sel.append(opt).val(String(CG.id));
    if ($sel.data("select2")) $sel.trigger("change.select2");
    $sel.next(".select2-container").find(".select2-selection__rendered").text(txt).attr("title", txt);
}

function actualizarNavClienteCg() {
    const list = Array.isArray(CG.switcherNav) ? CG.switcherNav : [];
    const idx = list.findIndex(c => Number(c.Id) === Number(CG.id));
    const $prev = $("#btnClientePrevCg");
    const $next = $("#btnClienteNextCg");
    const show = CG.id > 0 && list.length > 1;
    $prev.prop("hidden", !show);
    $next.prop("hidden", !show);
    $prev.prop("disabled", idx <= 0);
    $next.prop("disabled", idx < 0 || idx >= list.length - 1);
}

function moverClienteSwitcherCg(dir) {
    const list = Array.isArray(CG.switcherNav) ? CG.switcherNav : [];
    const idx = list.findIndex(c => Number(c.Id) === Number(CG.id));
    const dest = list[idx + dir];
    if (!dest) return;
    irAClienteGestionCg(dest.Id);
}

async function cargarNavClienteSwitcherCg() {
    try {
        const idQs = CG.id > 0 ? `&id=${CG.id}` : "";
        const data = await fetchJsonCg(`${API_CG.combo}?q=&take=80&incluirInactivos=true${idQs}`, { headers: authCg() });
        const rows = Array.isArray(data) ? data : [];
        CG.switcherNav = rows.slice().sort((a, b) =>
            String(a.Nombre || "").localeCompare(String(b.Nombre || ""), "es", { sensitivity: "base" }));
        actualizarNavClienteCg();
        if (CG.id > 0) {
            const actual = CG.switcherNav.find(c => Number(c.Id) === Number(CG.id));
            sincronizarSwitcherClienteCg(actual?.Nombre || $("#cgTituloCliente").text());
        }
    } catch (e) {
        console.warn("No se pudo cargar lista de clientes del encabezado:", e);
    }
}

function initClienteSwitcherCg() {
    const $sel = $("#cgClienteSwitcher");
    if (!$sel.length || $sel.data("select2")) return;

    if (CG.id > 0) {
        $sel.append(new Option("Cargando…", CG.id, true, true));
    }

    $sel.select2({
        width: "100%",
        allowClear: false,
        placeholder: "Buscar cliente…",
        minimumInputLength: 0,
        dropdownParent: $(".cg-page"),
        ajax: {
            delay: 220,
            transport: function (params, success, failure) {
                const q = (params.data.term || "").trim();
                const idQs = CG.id > 0 ? `&id=${CG.id}` : "";
                fetchJsonCg(`${API_CG.combo}?q=${encodeURIComponent(q)}&take=40&incluirInactivos=true${idQs}`, { headers: authCg() })
                    .then(data => {
                        const rows = Array.isArray(data) ? data : [];
                        if (!q) {
                            CG.switcherNav = rows.slice().sort((a, b) =>
                                String(a.Nombre || "").localeCompare(String(b.Nombre || ""), "es", { sensitivity: "base" }));
                            actualizarNavClienteCg();
                        }
                        success({
                            results: rows.map(c => ({
                                id: c.Id,
                                text: textoClienteComboCg(c),
                                cuit: c.Cuit || "",
                                activo: c.Activo !== false
                            }))
                        });
                    })
                    .catch(failure);
            }
        },
        templateResult: function (item) {
            if (!item.id) return item.text;
            const $el = $("<span class='cg-switcher-opt'/>");
            $el.append($("<span/>").text(item.text));
            if (item.cuit) {
                $el.append($("<small class='d-block'/>").css("opacity", 0.65).text("CUIT " + item.cuit));
            }
            return $el;
        },
        templateSelection: function (item) {
            const fromEl = item && item.element ? (item.element.textContent || "").trim() : "";
            if (fromEl && fromEl !== "Cargando…") return fromEl;
            return (item.text && item.text !== "Cargando…") ? item.text : (fromEl || "Cliente");
        }
    });

    $sel.on("select2:select", function (e) {
        irAClienteGestionCg(e.params?.data?.id);
    });

    $("#btnClientePrevCg").on("click", () => moverClienteSwitcherCg(-1));
    $("#btnClienteNextCg").on("click", () => moverClienteSwitcherCg(1));
    cargarNavClienteSwitcherCg();
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
        NumeroCliente: intOrNullCg("#cgNumeroCliente"),
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
            window.location.href = `/Clientes/Gestion?id=${data.id}`;
            return;
        }

        await cargarClienteCg(m.Id);
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
    return String(t ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
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

function buildEstPillsHtmlCg(list) {
    const palette = ["mint", "sky", "amber", "violet", "rose", "teal"];
    return (list || []).map((e, idx) => {
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
    }).join("");
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

    cont.html(buildEstPillsHtmlCg(list));
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
    if (n === 1) {
        const e = (CG.establecimientosLista || []).find(x => x.Id === ids[0]) || {};
        $("#cgEstSelLabel").html(htmlResumenEstablecimientoSelCg(e, ids[0]));
    } else {
        const nombres = ids.map(id => {
            const e = (CG.establecimientosLista || []).find(x => x.Id === id);
            return e?.Nombre || `#${id}`;
        });
        $("#cgEstSelLabel").html(`
            <span class="cg-est-selbar-name">${n} seleccionados</span>
            <span class="cg-est-selbar-meta">${escapeCg(nombres.join(" · "))}</span>`);
    }
    $("#cgEstSelMode").text(n === 1 ? "Edición completa" : "Planilla combinada");
}

function partesDomicilioEstablecimientoCg(e) {
    if (!e) return [];
    const calleNro = [e.Calle || e.Domicilio, e.Numero].filter(Boolean).join(" ").trim();
    const partes = [];
    if (calleNro) partes.push(calleNro);
    else if (e.Domicilio) partes.push(String(e.Domicilio).trim());
    if (e.Descripcion) partes.push(String(e.Descripcion).trim());
    if (e.Localidad) partes.push(String(e.Localidad).trim());
    if (e.Partido) partes.push(String(e.Partido).trim());
    if (e.Provincia) partes.push(String(e.Provincia).trim());
    return [...new Set(partes.filter(Boolean))];
}

function htmlResumenEstablecimientoSelCg(e, idFallback) {
    const nombre = escapeCg(e?.Nombre || (idFallback ? `#${idFallback}` : "Establecimiento"));
    const partes = partesDomicilioEstablecimientoCg(e);
    const meta = partes.length
        ? `<span class="cg-est-selbar-meta">${partes.map(escapeCg).join(" · ")}</span>`
        : `<span class="cg-est-selbar-meta is-muted">Sin domicilio cargado</span>`;
    return `<span class="cg-est-selbar-name">${nombre}</span>${meta}`;
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
    aplicarModoTabsEstCg(ids.length);
    syncEstEditorFootCg();

    if (ids.length === 0) {
        $("#cgEstEditor").addClass("d-none");
        $("#cgEstEditorEmpty").removeClass("d-none");
        limpiarHubEstablecimientoCg();
        setStockEstTabDisponibleCg(false);
        CG.hubActivo = "cliente";
        renderManifiestosCg([]);
        CG.tabsLoaded.manifiestos = 0;
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
        syncEstEditorFootCg();
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
        if ($("#tabBtnManifiestosEst").hasClass("active")) {
            await cargarTabManifiestos(true);
        }
        syncEstEditorFootCg();
    });
}

/** Footer Guardar/Cancelar establecimiento: no aplica en Control de pagos (tiene su propio Guardar). */
function syncEstEditorFootCg() {
    const ids = idsEstablecimientoSeleccionadosCg();
    const multi = ids.length > 1;
    const enStock = $("#tabBtnStockEst").hasClass("active");
    // Alta: no hay pill seleccionado, pero el editor está abierto en borrador → hay que mostrar Guardar/Registrar
    const editorVisible = !$("#cgEstEditor").hasClass("d-none");
    const idEnEditor = Number(CG.establecimientoModal?.getId?.() || 0);
    const borradorNuevo = editorVisible && ids.length === 0 && !idEnEditor;
    $("#cgEstEditorFoot").toggleClass("d-none", multi || (ids.length === 0 && !borradorNuevo) || enStock);
}

function aplicarModoTabsEstCg(cantidad) {
    const multi = cantidad > 1;
    const map = [
        ["#tabBtnDatosEst", "#tabDatosEst"],
        ["#tabBtnContactosEst", "#tabContactosEst"],
        ["#tabBtnContratosEst", "#tabContratosEst"],
        ["#tabBtnProductosEst", "#tabProductosEst"],
        ["#tabBtnManifiestosEst", "#tabManifiestosEst"]
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
        $("#tabBtnDatosEst, #tabBtnContactosEst, #tabBtnContratosEst, #tabBtnProductosEst, #tabBtnManifiestosEst").removeClass("active");
    } else if (cantidad === 1 && !$stockBtn.hasClass("active") && !$("#tabBtnDatosEst").hasClass("active")
        && !$("#tabBtnContactosEst").hasClass("active") && !$("#tabBtnContratosEst").hasClass("active")
        && !$("#tabBtnProductosEst").hasClass("active") && !$("#tabBtnManifiestosEst").hasClass("active")) {
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

function reclamarDeudaEstablecimientoCg(opts) {
    return contactarEstablecimientoCg(opts);
}
window.reclamarDeudaEstablecimientoCg = reclamarDeudaEstablecimientoCg;

function mensajeWhatsappEstablecimientoCg() {
    return contactarEstablecimientoCg({ libre: true });
}
window.mensajeWhatsappEstablecimientoCg = mensajeWhatsappEstablecimientoCg;

function contactarEstablecimientoDirectoCg(idEstablecimiento, opts) {
    return contactarEstablecimientoCg({ ...(opts || {}), idEstablecimiento });
}
window.contactarEstablecimientoDirectoCg = contactarEstablecimientoDirectoCg;

async function asegurarListaEstablecimientosCg() {
    if ((CG.establecimientosLista || []).length) return CG.establecimientosLista;
    if (!CG.id) return [];
    try {
        const all = await fetchJsonCg(API_CG.establecimientosLista, { headers: authCg() }) || [];
        CG.establecimientosLista = (Array.isArray(all) ? all : []).filter(e => Number(e.IdCliente || CG.id) === CG.id || !e.IdCliente);
    } catch {
        CG.establecimientosLista = [];
    }
    return CG.establecimientosLista;
}

function elegirEstablecimientoContactoCg(items) {
    return new Promise((resolve) => {
        const modalEl = document.getElementById("modalElegirEstContactoCg");
        const listaEl = document.getElementById("cgEstContactoLista");
        if (!modalEl || !listaEl) {
            errorModal("Elegí un establecimiento en la solapa Establecimientos.");
            resolve(0);
            return;
        }

        listaEl.innerHTML = (items || []).map(e => {
            const id = Number(e.Id) || 0;
            const nom = escapeCg(e.Nombre || e.nombre || `Establecimiento #${id}`);
            const dom = escapeCg(e.Domicilio || e.Calle || "");
            return `<button type="button" class="cg-est-contacto-item" data-id="${id}">
                <i class="fa fa-map-marker"></i>
                <span><strong>${nom}</strong>${dom ? `<br><small class="text-muted">${dom}</small>` : ""}</span>
            </button>`;
        }).join("");

        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        let settled = false;

        const finish = (id) => {
            if (settled) return;
            settled = true;
            $(listaEl).off("click.cgEstPick");
            modalEl.removeEventListener("hidden.bs.modal", onHide);
            modal.hide();
            resolve(Number(id) || 0);
        };

        const onHide = () => finish(0);
        modalEl.addEventListener("hidden.bs.modal", onHide, { once: true });

        $(listaEl).off("click.cgEstPick").on("click.cgEstPick", ".cg-est-contacto-item", function () {
            finish(Number($(this).data("id")) || 0);
        });

        modal.show();
    });
}

async function resolverIdEstablecimientoContactoCg() {
    const ids = idsEstablecimientoSeleccionadosCg();
    let id = Number(
        ids[0]
        || document.getElementById("txtIdEst")?.value
        || document.getElementById("cgEstId")?.value
        || 0
    );
    if (id > 0) return id;

    const items = (await asegurarListaEstablecimientosCg()).filter(e => Number(e.Id) > 0);
    if (items.length === 1) return Number(items[0].Id);
    if (!items.length) {
        errorModal("No hay establecimientos cargados para este cliente.");
        return 0;
    }
    return elegirEstablecimientoContactoCg(items);
}

async function contactarEstablecimientoCg(opts) {
    const cfg = opts || {};
    let id = Number(cfg.idEstablecimiento || 0);
    if (!id) id = await resolverIdEstablecimientoContactoCg();
    if (!id) return;

    const payload = { ...cfg };
    delete payload.idEstablecimiento;

    if (typeof abrirReclamoDeudaEstablecimiento === "function") {
        abrirReclamoDeudaEstablecimiento(id, payload);
        return;
    }
    if (cfg.libre && typeof abrirMensajeWhatsappEstablecimiento === "function") {
        abrirMensajeWhatsappEstablecimiento(id, payload);
        return;
    }
    errorModal("No se pudo abrir WhatsApp / mail.");
}
window.contactarEstablecimientoCg = contactarEstablecimientoCg;

async function abrirNuevoEstablecimientoCg() {
    if (!CG.establecimientoModal) return;
    CG.establecimientoSelIds = [];
    CG.establecimientoSelId = 0;
    syncEstablecimientoSelStateCg();
    limpiarHubEstablecimientoCg();
    setStockEstTabDisponibleCg(false);
    aplicarModoTabsEstCg(1);
    $("#cgEstMultiBanner").addClass("d-none");
    $("#cgEstEditorEmpty").addClass("d-none");
    $("#cgEstEditor").removeClass("d-none");
    syncEstEditorFootCg();
    await withCgLoading("Preparando nuevo establecimiento…", async () => {
        await CG.establecimientoModal.abrirNuevo(CG.id);
        syncEstEditorFootCg();
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
            $h("btnWsNuevaEntregaMes").toggleClass("d-none", multi);
            $h("cgWsEntregasAcc").toggleClass("d-none", multi);
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
        const reclamoOk = document.getElementById("btnEstContactoHub")
            && document.getElementById("btnEstReclamoDeudaAtrasos")
            && document.getElementById("btnEstReclamoMesHub");
        const visitaOk = document.getElementById("cgEstWsCobrosBody")
            && document.getElementById("cgEstWsCobrosMesBody")
            && document.getElementById("cgEstCmFechaVisita")
            && document.querySelector("#cgEstHubMesDetail .cg-ws-split");
        if (alertOk && visitaOk && reclamoOk) return true;
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
    // Chips / presets / años recientes: handlers globales con syncHubActivoFromElCg
    $(root).on("click", "#btnEstRegistrarVisitaMesHub", () => {
        CG.hubActivo = "est";
        const now = new Date();
        abrirWorkspaceMesCg(now.getFullYear(), now.getMonth() + 1);
    });
    $(root).on("click", "#cgEstControlMensualBody tr[data-mes]", function (e) {
        if ($(e.target).closest(".cg-cm-int-eye, .cg-cm-obs-eye, .cg-cm-visita-editor").length) return;
        CG.hubActivo = "est";
        abrirWorkspaceMesCg(Number($(this).data("anio")), Number($(this).data("mes")));
    });
    $(root).on("click", "#cgEstCards_controlMensual article[data-mes]", function (e) {
        if ($(e.target).closest(".cg-cm-int-eye, .cg-cm-obs-eye, .cg-cm-visita-editor").length) return;
        CG.hubActivo = "est";
        abrirWorkspaceMesCg(Number($(this).data("anio")), Number($(this).data("mes")));
    });
    $(root).on("click", "#btnEstCerrarMesDetail", () => {
        CG.hubActivo = "est";
        $h("cgHubMesDetail").prop("hidden", true);
        setHubPropCg("hubMesSel", null);
        setHubPropCg("wsLineas", []);
        setHubPropCg("wsCobros", []);
        setHubPropCg("wsEntregasMes", []);
        $h("cgControlMensualBody").find("tr").removeClass("is-selected");
        actualizarChipsAtrasosSeleccionCg(-1, -1);
    });
    $(root).on("click", "#btnEstInteresMesHub", () => {
        CG.hubActivo = "est";
        CG.interesHubMode = "est";
        if (hubPropCg("hubMesSel")) abrirModalInteresCg(hubPropCg("hubMesSel").anio, hubPropCg("hubMesSel").mes);
    });
    $(root).on("click", "#btnEstVerInteresesMesHub", () => {
        CG.hubActivo = "est";
        CG.interesHubMode = "est";
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
    $(root).on("click", "#btnEstGuardarDatosMesCg", busyHandler(() => {
        CG.hubActivo = "est";
        return guardarControlMensualCg({ silent: false });
    }));
    $(root).on("click", "#btnEstVaciarMontosMesCg", busyHandler(() => {
        CG.hubActivo = "est";
        return vaciarAbonosMesCg();
    }));
    $(root).on("click", "#btnEstWsNuevaEntregaMes", () => {
        CG.hubActivo = "est";
        agregarEntregaDraftMesCg();
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
        if (s) agregarLineaWsCg(prefLineaDesdeSugeridoWsCg(s, $(this).data("tipo")));
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

        leerCamposLineaWsDesdeDomCg($row, linea);
        sincronizarUiNoRetiradoWsCg($row, linea);

        await sincronizarPrecioLineaWsCg($row, linea, campo);

        $row.find(".ws-sub").text(fmtMoneyCg(subtotalLineaWsCg(linea)));
        refrescarSaldosNoRetiradoWsCg();
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
        CG.interesHubMode = "est";
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

function actividadEstablecimientoCg(e, contrato) {
    const fromContrato = String(contrato?.Actividad || "").trim();
    if (fromContrato) return fromContrato;
    const act = String(e?.Actividad || "").trim();
    if (act) return act;
    const $selAct = $("#cmbActividadEst option:selected");
    if ($selAct.length && Number($selAct.val()) > 0) {
        return String($selAct.text() || "").trim();
    }
    const tg = String(e?.TipoGenerador || "").trim();
    if (tg) {
        const idx = tg.indexOf(" - ");
        return idx >= 0 ? tg.slice(idx + 3).trim() : tg;
    }
    const $sel = $("#cmbTipoGeneradorEst option:selected");
    if ($sel.length && Number($sel.val()) > 0) {
        const text = String($sel.text() || "").trim();
        const idx = text.indexOf(" - ");
        return idx >= 0 ? text.slice(idx + 3).trim() : text;
    }
    return "";
}

function diasRestantesContratoCg(fechaVenc) {
    if (!fechaVenc) return null;
    const venc = new Date(fechaVenc);
    if (Number.isNaN(venc.getTime())) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    venc.setHours(0, 0, 0, 0);
    return Math.ceil((venc - hoy) / 86400000);
}

function htmlContratosEmptyCg(opts = {}) {
    const msg = opts.message || "Todavía no hay contratos.";
    const btn = opts.showBtn !== false
        ? `<button type="button" class="cg-btn cg-btn--success cg-btn--sm" onclick="${opts.btnFn || "abrirNuevoContratoEstCg()"}">
                <i class="fa fa-plus"></i> ${escapeCg(opts.btnLabel || "Nuevo contrato")}
           </button>`
        : "";
    return `<div class="cg-ctr-empty">
        <div class="cg-ctr-empty-orb"></div>
        <i class="fa fa-file-text-o"></i>
        <p>${escapeCg(msg)}</p>
        ${btn}
    </div>`;
}

function syncContratosEstInlineMetaCg(est, contratos) {
    const act = actividadEstablecimientoCg(est, contratos[0]);
    const $chip = $("#contratoEstActChip");
    if (act) {
        $chip.removeClass("d-none").html(`<i class="fa fa-briefcase"></i> ${escapeCg(act)}`);
    } else {
        $chip.addClass("d-none").empty();
    }
    const vig = contratos.filter(c => c.Vigente).length;
    const ven = contratos.length - vig;
    $("#contratoEstCantidad").text(String(contratos.length));
    $("#contratoEstVigentes").text(String(vig));
    $("#contratoEstVencidos").text(String(ven));
}

function htmlContratoCardCg(c, actividad) {
    const vigente = !!c.Vigente;
    const tone = vigente ? "is-vigente" : "is-vencido";
    const badge = vigente ? "Vigente" : "Vencido";
    const dias = diasRestantesContratoCg(c.FechaVencimiento);
    let plazoHtml = "";
    if (dias !== null) {
        if (vigente) {
            plazoHtml = dias === 0
                ? `<span class="cg-ctr-plazo cg-ctr-plazo--warn"><i class="fa fa-clock-o"></i> Vence hoy</span>`
                : `<span class="cg-ctr-plazo cg-ctr-plazo--ok"><i class="fa fa-clock-o"></i> ${dias} día${dias === 1 ? "" : "s"} restantes</span>`;
        } else {
            plazoHtml = `<span class="cg-ctr-plazo cg-ctr-plazo--off"><i class="fa fa-history"></i> Venció hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}</span>`;
        }
    }
    const actHtml = actividad
        ? `<div class="cg-ctr-act-pill"><i class="fa fa-briefcase"></i> ${escapeCg(actividad)}</div>`
        : "";

    return `<article class="cg-ctr-card ${tone}">
        <div class="cg-ctr-card-accent"></div>
        <div class="cg-ctr-card-body">
            <header class="cg-ctr-card-head">
                <div class="cg-ctr-card-icon"><i class="fa fa-file-text"></i></div>
                <div class="cg-ctr-card-head-text">
                    <span class="cg-ctr-card-id">Contrato #${c.Id}</span>
                    <h6>${escapeCg(c.TipoContrato || "Sin tipo")}</h6>
                </div>
                <span class="cg-ctr-status">${escapeCg(badge)}</span>
            </header>
            ${actHtml}
            ${plazoHtml}
            <div class="cg-ctr-timeline">
                <div class="cg-ctr-tl-item">
                    <span class="cg-ctr-tl-label"><i class="fa fa-calendar-o"></i> Contrato</span>
                    <strong>${escapeCg(formatearFechaCortaCg(c.FechaContrato))}</strong>
                </div>
                <div class="cg-ctr-tl-item">
                    <span class="cg-ctr-tl-label"><i class="fa fa-play"></i> Inicio</span>
                    <strong>${escapeCg(formatearFechaCortaCg(c.FechaInicio))}</strong>
                </div>
                <div class="cg-ctr-tl-item">
                    <span class="cg-ctr-tl-label"><i class="fa fa-flag-checkered"></i> Vencimiento</span>
                    <strong>${escapeCg(formatearFechaCortaCg(c.FechaVencimiento))}</strong>
                </div>
            </div>
            <footer class="cg-ctr-card-foot">
                <button type="button" class="cg-ctr-btn-edit" onclick="editarContratoCg(${c.Id})">
                    <i class="fa fa-pencil"></i> Editar contrato
                </button>
            </footer>
        </div>
    </article>`;
}

async function cargarEstablecimientosClienteCg() {
    if ((CG.establecimientosLista || []).length && CG.establecimientosLista[0]?.IdCliente === CG.id) {
        return CG.establecimientosLista;
    }
    const all = await fetchJsonCg(API_CG.establecimientosLista, { headers: authCg() }) || [];
    const data = (Array.isArray(all) ? all : []).filter(x => x.IdCliente === CG.id);
    CG.establecimientosLista = data;
    return data;
}

async function cargarTabContratos(force) {
    if (CG.tabsLoaded.contratos && !force) return;

    const [establecimientos, contratos] = await Promise.all([
        cargarEstablecimientosClienteCg(),
        fetchJsonCg(API_CG.contratosLista(CG.id), { headers: authCg() })
    ]);

    CG.contratosLista = Array.isArray(contratos) ? contratos : [];
    renderContratosEstPillsCg(establecimientos);

    const valid = new Set((establecimientos || []).map(x => x.Id));
    let sel = (CG.contratosEstSelIds || []).filter(id => valid.has(id));
    if (!sel.length && valid.size) sel = [...valid];
    CG.contratosEstSelIds = sel;

    syncContratosEstSelStateCg();
    renderContratosPanelsCg();
    CG.tabsLoaded.contratos = true;
}

function renderContratosEstPillsCg(items) {
    const cont = $("#cgContratosEstList");
    if (!cont.length) return;

    const list = items || [];
    if (!list.length) {
        cont.html(`
            <div class="cg-est-pills-empty">
                <i class="fa fa-building-o"></i>
                <span>Sin establecimientos — creá uno en la solapa Establecimientos</span>
            </div>`);
        return;
    }

    cont.html(buildEstPillsHtmlCg(list));
}

function syncContratosEstSelStateCg() {
    const ids = [...new Set((CG.contratosEstSelIds || []).map(Number).filter(x => x > 0))];
    CG.contratosEstSelIds = ids;

    $("#cgContratosEstList .cg-est-pill").each(function () {
        const id = Number($(this).data("id")) || 0;
        const on = ids.includes(id);
        $(this).toggleClass("is-active", on).attr("aria-selected", on ? "true" : "false");
    });

    const n = ids.length;
    const total = (CG.establecimientosLista || []).length;
    const $bar = $("#cgContratosSelBar");
    if (n <= 0 || !total) {
        $bar.addClass("d-none");
        return;
    }
    $bar.removeClass("d-none");
    if (n === total) {
        $("#cgContratosSelLabel").html(`
            <span class="cg-est-selbar-name">Todos los establecimientos</span>
            <span class="cg-est-selbar-meta">${n} puntos de entrega</span>`);
    } else if (n === 1) {
        const e = (CG.establecimientosLista || []).find(x => x.Id === ids[0]) || {};
        $("#cgContratosSelLabel").html(htmlResumenEstablecimientoSelCg(e, ids[0]));
    } else {
        const nombres = ids.map(id => {
            const e = (CG.establecimientosLista || []).find(x => x.Id === id);
            return e?.Nombre || `#${id}`;
        });
        $("#cgContratosSelLabel").html(`
            <span class="cg-est-selbar-name">${n} seleccionados</span>
            <span class="cg-est-selbar-meta">${escapeCg(nombres.join(" · "))}</span>`);
    }
    $("#cgContratosSelMode").text(n === total ? "Vista completa" : "Filtrado");
}

function toggleContratosEstSelCg(id, opts = {}) {
    const idEst = Number(id) || 0;
    if (!idEst) return;

    let ids = [...(CG.contratosEstSelIds || [])];
    if (opts.exclusive) {
        ids = [idEst];
    } else if (ids.includes(idEst)) {
        if (ids.length <= 1) return;
        ids = ids.filter(x => x !== idEst);
    } else {
        ids.push(idEst);
    }

    CG.contratosEstSelIds = ids;
    syncContratosEstSelStateCg();
    renderContratosPanelsCg();
}

function seleccionarTodosContratosEstCg() {
    const all = (CG.establecimientosLista || []).map(x => x.Id).filter(x => x > 0);
    if (!all.length) return;
    const same = all.length === (CG.contratosEstSelIds || []).length
        && all.every(id => CG.contratosEstSelIds.includes(id));
    CG.contratosEstSelIds = same ? (all.length ? [all[0]] : []) : all;
    syncContratosEstSelStateCg();
    renderContratosPanelsCg();
}

function renderContratosPanelsCg() {
    const $panels = $("#cgContratosPanels");
    const $empty = $("#cgContratosEmpty");
    if (!$panels.length) return;

    const ids = [...(CG.contratosEstSelIds || [])];
    if (!ids.length) {
        $panels.empty();
        $empty.removeClass("d-none");
        return;
    }
    $empty.addClass("d-none");

    const palette = ["mint", "sky", "amber", "violet", "rose", "teal"];
    const html = ids.map((idEst, idx) => {
        const est = (CG.establecimientosLista || []).find(x => x.Id === idEst) || {};
        const contratos = (CG.contratosLista || []).filter(c => Number(c.IdEstablecimiento) === idEst);
        const actividad = actividadEstablecimientoCg(est, contratos[0]);
        const tone = palette[idx % palette.length];
        const inicial = String(est.Nombre || "?").trim().charAt(0).toUpperCase();
        const resumen = partesDomicilioEstablecimientoCg(est);
        const cards = contratos.length
            ? `<div class="cg-ctr-grid">${contratos.map(c => htmlContratoCardCg(c, actividadEstablecimientoCg(est, c))).join("")}</div>`
            : htmlContratosEmptyCg({
                message: "Sin contratos en este establecimiento",
                btnFn: `abrirNuevoContratoCg(${idEst})`,
                btnLabel: "Crear contrato"
            });

        return `<section class="cg-contratos-est-panel tone-${tone}">
            <header class="cg-contratos-est-head">
                <span class="cg-contratos-est-avatar">${escapeCg(inicial)}</span>
                <div class="cg-contratos-est-info">
                    <h6>${escapeCg(est.Nombre || `#${idEst}`)}</h6>
                    ${actividad ? `<span class="cg-contratos-actividad"><i class="fa fa-briefcase"></i> ${escapeCg(actividad)}</span>` : ""}
                    ${resumen.length ? `<span class="cg-contratos-dom">${resumen.map(escapeCg).join(" · ")}</span>` : ""}
                </div>
                <span class="cg-contratos-count">${contratos.length} contrato${contratos.length === 1 ? "" : "s"}</span>
            </header>
            ${cards}
        </section>`;
    }).join("");

    $panels.html(html);
}

async function refrescarContratosCg() {
    CG.tabsLoaded.contratos = false;
    if ($("#tabContratos").hasClass("active") || $("#tabContratos").hasClass("show")) {
        await cargarTabContratos(true);
    }
    if ($("#tabBtnContratosEst").hasClass("active")) {
        await cargarContratosEstablecimientoCg(idsEstablecimientoSeleccionadosCg()[0]);
    }
}

async function cargarContratosEstablecimientoCg(idEst) {
    const id = Number(idEst) || idsEstablecimientoSeleccionadosCg()[0] || 0;
    const $sec = $("#sectionContratosEst");
    const $lista = $("#listaContratosEst");
    if (!$lista.length) return;

    if (id <= 0) {
        $sec.addClass("rp-section-disabled");
        $("#contratoEstNombre").text("Nuevo");
        syncContratosEstInlineMetaCg({}, []);
        $("#contratoEstHint").html(`<i class="fa fa-info-circle"></i> Guardá el establecimiento para ver sus contratos.`);
        $lista.html(htmlContratosEmptyCg({
            message: "Guardá el establecimiento para ver sus contratos.",
            showBtn: false
        }));
        return;
    }

    $sec.removeClass("rp-section-disabled");
    const est = (CG.establecimientosLista || []).find(x => x.Id === id) || {};
    $("#contratoEstNombre").text(est.Nombre || `#${id}`);
    const resumen = partesDomicilioEstablecimientoCg(est);
    $("#contratoEstHint").html(resumen.length
        ? `<i class="fa fa-map-marker"></i> ${resumen.map(escapeCg).join(" · ")}`
        : `<i class="fa fa-building-o"></i> Punto de entrega`);

    if (!CG.contratosLista?.length || !CG.tabsLoaded.contratos) {
        const contratos = await fetchJsonCg(API_CG.contratosLista(CG.id), { headers: authCg() }) || [];
        CG.contratosLista = Array.isArray(contratos) ? contratos : [];
    }

    const delEst = (CG.contratosLista || []).filter(c => Number(c.IdEstablecimiento) === id);
    syncContratosEstInlineMetaCg(est, delEst);

    if (!delEst.length) {
        $lista.html(htmlContratosEmptyCg({ message: "Todavía no hay contratos para este establecimiento." }));
        return;
    }

    $lista.html(`<div class="cg-ctr-grid cg-ctr-grid--inline">${delEst.map(c =>
        htmlContratoCardCg(c, actividadEstablecimientoCg(est, c))
    ).join("")}</div>`);
}

function editarContratoCg(id) {
    if (CG.contratoModal) CG.contratoModal.abrirEditar(id);
}
window.editarContratoCg = editarContratoCg;

async function abrirNuevoContratoCg(idEstablecimiento) {
    if (!CG.contratoModal) return;
    const idEst = Number(idEstablecimiento)
        || (CG.contratosEstSelIds?.length === 1 ? CG.contratosEstSelIds[0] : 0)
        || idsEstablecimientoSeleccionadosCg()[0]
        || 0;
    await CG.contratoModal.abrirNuevo(CG.id, idEst || undefined);
}

async function abrirNuevoContratoEstCg() {
    const idEst = idsEstablecimientoSeleccionadosCg()[0] || Number(CG.establecimientoModal?.getId?.() || 0);
    await abrirNuevoContratoCg(idEst);
}
window.abrirNuevoContratoEstCg = abrirNuevoContratoEstCg;
window.abrirNuevoContratoCg = abrirNuevoContratoCg;

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

async function cargarTabManifiestos(force) {
    const idEst = idsEstablecimientoSeleccionadosCg()[0] || Number(CG.establecimientoSelId) || 0;
    if (CG.id <= 0 || idEst <= 0) {
        renderManifiestosCg([]);
        CG.tabsLoaded.manifiestos = 0;
        return;
    }
    if (!force && CG.tabsLoaded.manifiestos === idEst) return;

    const items = await fetchJsonCg(API_CG.manifiestosDocumentos(CG.id, idEst), { headers: authCg() }) || [];
    renderManifiestosCg(items);
    CG.tabsLoaded.manifiestos = idEst;
}

function renderManifiestosCg(items) {
    const lista = Array.isArray(items) ? items : [];
    const certs = lista.filter(x => String(x.Tipo || x.tipo || "").toLowerCase() === "certificado");
    const manifs = lista.filter(x => String(x.Tipo || x.tipo || "").toLowerCase() !== "certificado");

    $("#cgMfCertCount").text(String(certs.length));
    $("#cgMfManifCount").text(String(manifs.length));

    renderListaDocsMf("#cgTabCertificadosList", certs, true);
    renderListaDocsMf("#cgTabManifiestosList", manifs, false);
}

function renderListaDocsMf(selector, items, esCert) {
    const cont = $(selector);
    if (!items.length) {
        cont.html(`<div class="cg-hub-stock-empty">${esCert ? "Sin certificados registrados." : "Sin manifiestos registrados."}</div>`);
        return;
    }

    cont.html(items.map(x => {
        const id = x.Id ?? x.id;
        const idCamion = x.IdCamion ?? x.idCamion;
        const numero = x.Numero ?? x.numero;
        const numManif = x.NumeroManifiesto ?? x.numeroManifiesto;
        const numCert = x.NumeroCertificado ?? x.numeroCertificado;
        const cantidad = x.Cantidad ?? x.cantidad ?? "";
        const recorrido = x.Recorrido ?? x.recorrido ?? "";
        const camion = x.Camion ?? x.camion ?? "";
        const fecha = formatearFechaCg(x.Fecha ?? x.fecha);
        const usuario = x.Usuario ?? x.usuario ?? "";
        const titulo = x.RazonSocial ?? x.razonSocial ?? "";

        const numLabel = esCert
            ? `Cert. Nº ${escapeCg(numCert || numero)}${numManif ? ` · Manif. ${escapeCg(numManif)}` : ""}`
            : `Manif. Nº ${escapeCg(numero)}`;

        const dlUrl = esCert
            ? API_CG.descargarCertificado(id)
            : API_CG.descargarManifiestoHistorial(idCamion, id);

        return `<article class="cg-mf-item" data-tipo="${esCert ? "certificado" : "manifiesto"}" data-id="${id}" data-id-camion="${idCamion || 0}">
            <div class="cg-mf-item-head">
                <strong class="cg-mf-item-num">${numLabel}</strong>
            </div>
            <div class="cg-mf-item-body">
                <div class="cg-mf-item-title">${escapeCg(titulo)}</div>
                <div class="cg-mf-item-meta">
                    ${cantidad ? `<span><i class="fa fa-balance-scale"></i> ${escapeCg(cantidad)} kg</span>` : ""}
                    ${camion ? `<span><i class="fa fa-truck"></i> ${escapeCg(camion)}</span>` : ""}
                    ${recorrido ? `<span><i class="fa fa-map-marker"></i> ${escapeCg(recorrido)}</span>` : ""}
                    <span><i class="fa fa-calendar"></i> ${escapeCg(fecha)}</span>
                    ${usuario ? `<span><i class="fa fa-user"></i> ${escapeCg(usuario)}</span>` : ""}
                </div>
            </div>
            <div class="cg-mf-item-actions">
                <button type="button" class="cg-btn cg-btn--ghost cg-btn--sm cg-mf-dl" data-url="${escapeCg(dlUrl)}" title="Descargar PDF">
                    <i class="fa fa-download"></i> PDF
                </button>
                <button type="button" class="cg-btn cg-btn--ghost cg-btn--sm cg-mf-del"
                        data-tipo="${esCert ? "certificado" : "manifiesto"}"
                        data-id="${id}"
                        data-id-camion="${idCamion || 0}"
                        title="${esCert ? "Eliminar certificado" : "Eliminar manifiesto"}">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        </article>`;
    }).join(""));

    cont.find(".cg-mf-dl").on("click", async function () {
        const url = $(this).data("url");
        if (!url) return;
        try {
            await withCgLoading("Descargando documento…", async () => {
                const response = await fetch(url, { headers: { Authorization: "Bearer " + token } });
                if (!response.ok) {
                    if (typeof errorModal === "function") errorModal("No se pudo descargar el documento.");
                    return;
                }
                const raw = await response.blob();
                const ct = (response.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
                const disp = response.headers.get("Content-Disposition") || "";
                const basic = /filename="?([^";]+)"?/i.exec(disp);
                let archivo = "Documento.pdf";
                if (basic && basic[1]) archivo = basic[1];
                const esCert = String(url).toLowerCase().includes("descargacertificado");
                if (esCert && (ct === "application/zip" || /\.zip$/i.test(archivo))) {
                    if (typeof errorModal === "function") errorModal("El certificado no se pudo descargar como PDF.");
                    return;
                }
                if (!/\.pdf$/i.test(archivo) || /\.zip$/i.test(archivo)) archivo = "Documento.pdf";
                const blob = ct !== "application/zip"
                    ? new Blob([raw], { type: "application/pdf" })
                    : raw;
                const href = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = href;
                a.download = archivo;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(href), 1500);
            });
        } catch (e) {
            console.error(e);
            if (typeof errorModal === "function") errorModal("Error al descargar el documento.");
        }
    });

    cont.find(".cg-mf-del").on("click", async function () {
        const id = Number($(this).data("id")) || 0;
        const idCamion = Number($(this).data("idCamion")) || 0;
        const tipo = String($(this).data("tipo") || "");
        if (!id) return;

        const esCertDel = tipo === "certificado";
        const ok = typeof confirmarModal === "function"
            ? await confirmarModal(esCertDel
                ? "¿Eliminar este certificado del historial?"
                : "¿Eliminar este manifiesto del historial?")
            : window.confirm(esCertDel
                ? "¿Eliminar este certificado del historial?"
                : "¿Eliminar este manifiesto del historial?");
        if (!ok) return;

        try {
            const url = esCertDel
                ? API_CG.eliminarCertificado(id)
                : API_CG.eliminarManifiestoHistorial(idCamion, id);
            const data = await fetchJsonCg(url, { method: "DELETE", headers: authCg() });
            if (!data?.valor) {
                if (typeof errorModal === "function") errorModal(data?.mensaje || "No se pudo eliminar.");
                return;
            }
            CG.tabsLoaded.manifiestos = false;
            await cargarTabManifiestos(true);
            if (typeof exitoModal === "function") {
                exitoModal(data.mensaje || (esCertDel ? "Certificado eliminado." : "Manifiesto eliminado."));
            }
        } catch (e) {
            console.error(e);
            if (typeof errorModal === "function") {
                errorModal(esCertDel ? "No se pudo eliminar el certificado." : "No se pudo eliminar el manifiesto.");
            }
        }
    });
}

/* ---- Recorridos (inline en recoleccion) ---- */

async function cargarTabRecorridos() {
    try {
        const items = await fetchJsonCg(API_CG.recorridosPorCliente(CG.id), { headers: authCg() });
        renderRecorridosCg(items || [], false, "#cgRecorridosAsignados");
    } catch (e) {
        console.warn("Recorridos no disponibles:", e);
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
                <p class="cg-empty-hint">Este cliente todavia no esta en ninguna ruta. Se asigna desde el establecimiento o desde el modulo Recorridos.</p>
            </div>`);
        return;
    }

    const grupos = [];
    const mapa = {};
    items.forEach(r => {
        const key = String(r.IdEstablecimiento || 0) + "|" + (r.Establecimiento || "Sin establecimiento");
        if (!mapa[key]) {
            mapa[key] = {
                nombre: r.Establecimiento || "Sin establecimiento",
                domicilio: r.Domicilio || "",
                localidad: r.Localidad || "",
                items: []
            };
            grupos.push(mapa[key]);
        }
        mapa[key].items.push(r);
    });

    cont.html(grupos.map(g => {
        const filas = g.items.map(r => {
            const horario = (r.Horario || "").trim();
            const obs = (r.Observacion || "").trim();
            return `<div class="cg-ra-row ${r.Activo ? "" : "is-inactivo"}${r.Reprogramado ? " is-reprog" : ""}">
                <div class="cg-ra-dia"><i class="fa fa-calendar"></i> ${escapeCg(r.Dia || "-")}</div>
                <div class="cg-ra-meta">
                    <span><i class="fa fa-truck"></i> ${escapeCg(r.Camion || "-")}</span>
                    <span><i class="fa fa-repeat"></i> ${escapeCg(r.Semana || "-")}</span>
                    <span><i class="fa fa-sort-numeric-asc"></i> Pos. ${r.Posicion ?? "-"}</span>
                    ${horario ? `<span><i class="fa fa-clock-o"></i> ${escapeCg(horario)}</span>` : `<span class="text-muted"><i class="fa fa-clock-o"></i> Sin horario</span>`}
                    ${r.Zona ? `<span><i class="fa fa-map-marker"></i> ${escapeCg(r.Zona)}</span>` : ""}
                </div>
                <div class="cg-ra-flags">
                    ${r.Reprogramado ? `<span class="badge bg-danger">Reprogramado</span>` : ""}
                    ${r.Activo ? "" : `<span class="badge bg-dark">Inactivo</span>`}
                </div>
                ${obs ? `<div class="cg-ra-obs">${escapeCg(obs)}</div>` : ""}
            </div>`;
        }).join("");
        const sub = [g.domicilio, g.localidad].filter(Boolean).join(" · ");
        return `<article class="cg-ra-card">
            <header class="cg-ra-head">
                <div>
                    <div class="cg-ra-est">${escapeCg(g.nombre)}</div>
                    ${sub ? `<div class="cg-ra-sub">${escapeCg(sub)}</div>` : ""}
                </div>
                <span class="cg-ra-count">${g.items.length} ${g.items.length === 1 ? "ruta" : "rutas"}</span>
            </header>
            ${filas}
        </article>`;
    }).join(""));
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
        Reprogramado: String($el.data("reprogramado")) === "1",
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
            `<button type="button" class="cg-cm-chip cg-cm-chip--anio" data-tipo="anio" data-val="${y}" aria-pressed="false">${y}</button>`
        );
    }

    $mesesChips.empty();
    for (let m = 1; m <= 12; m++) {
        $mesesChips.append(
            `<button type="button" class="cg-cm-chip cg-cm-chip--mes" data-tipo="mes" data-val="${m}" title="${MES_NOMBRES_CG[m]}" aria-pressed="false">${MESES_CORTOS_CG[m - 1]}</button>`
        );
    }

    renderEstadoFiltrosControlCg(false);
}

function renderEstadoFiltrosControlCg(refreshData = true) {
    const { anios, meses } = hubFiltrosCg();
    const aniosNorm = (anios || []).map(Number).filter(n => Number.isFinite(n));
    const mesesNorm = (meses || []).map(Number).filter(n => n >= 1 && n <= 12);

    // Mantener arrays numéricos (evita includes() fallido por strings)
    hubFiltrosCg().anios = aniosNorm;
    hubFiltrosCg().meses = mesesNorm;

    const $chipsRoot = isHubEstCg() ? $("#cgEstHubMount") : $("#cgHubOperativo");
    $chipsRoot.find("#" + mapHubDomIdCg("cgControlAniosChips") + " .cg-cm-chip").each(function () {
        const v = parseInt($(this).attr("data-val"), 10);
        $(this).toggleClass("is-active", aniosNorm.includes(v));
        $(this).attr("aria-pressed", aniosNorm.includes(v) ? "true" : "false");
    });

    $chipsRoot.find("#" + mapHubDomIdCg("cgControlMesesChips") + " .cg-cm-chip").each(function () {
        const v = parseInt($(this).attr("data-val"), 10);
        const on = mesesNorm.includes(v);
        $(this).toggleClass("is-active", on);
        $(this).attr("aria-pressed", on ? "true" : "false");
    });

    syncPresetButtonsCg();
    actualizarResumenFiltrosCg();
    sincronizarWorkspaceConFiltroMesesCg(mesesNorm);

    if (refreshData) {
        const idsEst = isHubEstCg() ? idsEstablecimientoSeleccionadosCg() : null;
        cargarTabControlMensual(true, idsEst);
    }
}

function sincronizarWorkspaceConFiltroMesesCg(mesesNorm) {
    const sel = hubPropCg("hubMesSel");
    if (!sel) return;
    // Si hay filtro de meses y el mes abierto ya no está, cerrar el detalle
    if (mesesNorm.length > 0 && !mesesNorm.includes(Number(sel.mes))) {
        $h("cgHubMesDetail").prop("hidden", true);
        setHubPropCg("hubMesSel", null);
        $h("cgControlMensualBody").find("tr").removeClass("is-selected");
        $h("cgCards_controlMensual").find("article").removeClass("is-selected");
    }
}

function toggleFiltroControlCg(tipo, val) {
    const n = Number(val);
    if (!Number.isFinite(n) || Number.isNaN(n)) return;

    if (tipo === "anio") {
        const arr = hubFiltrosCg().anios;
        const idx = arr.indexOf(n);
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(n);
        hubFiltrosCg().anios.sort((a, b) => b - a);
    } else if (tipo === "mes") {
        const arr = hubFiltrosCg().meses;
        const idx = arr.indexOf(n);
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(n);
        hubFiltrosCg().meses.sort((a, b) => a - b);
    } else {
        return;
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
    const colspanNoRet = Math.max(nProd, 1);

    thead.html(`
        <tr class="cg-cm-head-grp">
            ${mostrarAnio ? `<th class="cg-cm-sticky-left cg-cm-col-anio" rowspan="2">Año</th>` : ""}
            <th class="${mostrarAnio ? "cg-cm-sticky-left-2" : "cg-cm-sticky-left"}" rowspan="2">Mes</th>
            <th class="${mostrarAnio ? "cg-cm-sticky-left-3" : "cg-cm-sticky-left-2"}" rowspan="2">Visita</th>
                            <th class="cg-cm-th-grp-ent" colspan="${colspanEnt}">Productos entregados</th>
            <th class="cg-cm-th-grp-ret" colspan="${colspanRet}">Productos retirados</th>
            <th class="cg-cm-th-grp-noret" colspan="${colspanNoRet}">Productos no retirados</th>
            <th class="cg-cm-th-grp-money" colspan="7">Pagos y saldo</th>
            <th class="cg-cm-obs-col cg-cm-th-obs" rowspan="2" title="Observaciones del mes">Obs.</th>
        </tr>
        <tr class="cg-cm-head-cols">
            ${nProd
                ? columnas.map(c => `<th class="cg-cm-th-prod-ent" title="${escapeCg(c.Nombre)}">${escapeCg((c.Abreviatura || c.Nombre || "").trim() || ("#" + c.IdProducto))}</th>`).join("")
                : `<th class="cg-cm-th-prod-ent">—</th>`}
            ${nProd
                ? columnas.map(c => `<th class="cg-cm-th-prod-ret" title="${escapeCg(c.Nombre)}">${escapeCg((c.Abreviatura || c.Nombre || "").trim() || ("#" + c.IdProducto))}</th>`).join("")
                : `<th class="cg-cm-th-prod-ret">—</th>`}
            ${nProd
                ? columnas.map(c => `<th class="cg-cm-th-prod-noret" title="${escapeCg(c.Nombre)}">${escapeCg((c.Abreviatura || c.Nombre || "").trim() || ("#" + c.IdProducto))}</th>`).join("")
                : `<th class="cg-cm-th-prod-noret">—</th>`}
            <th class="cg-cm-cell-money" title="Cargo del mes (entregas + retiros)">Total</th>
            <th class="cg-cm-cell-money">Efectivo</th>
            <th class="cg-cm-cell-money">Transf.</th>
            <th>F. transf.</th>
            <th class="cg-cm-cell-money">Intereses</th>
            <th class="cg-cm-cell-money" title="Total + intereses − pagos del mes">Rest. mes</th>
            <th class="cg-cm-cell-money cg-cm-th-saldo" title="Saldo acumulado al cierre del mes">Saldo acum.</th>
        </tr>`);

    if (!filas.length) {
        const cols = (mostrarAnio ? 1 : 0) + 2 + colspanEnt + colspanRet + colspanNoRet + 8;
        tbody.html(`<tr class="cg-cm-empty"><td colspan="${cols}" class="text-center py-4">
            No hay datos para los filtros elegidos.</td></tr>`);
        renderControlMensualCardsCg([], mostrarAnio);
        return;
    }

    tbody.html(filas.map(m => {
        const rowClass = "";
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
            if (!mapaProd[id]) mapaProd[id] = { Entregadas: 0, Retiradas: 0, NoRetiradas: 0 };
            mapaProd[id].Entregadas += Number(p.Entregadas) || 0;
            mapaProd[id].Retiradas += Number(p.Retiradas) || 0;
            mapaProd[id].NoRetiradas += Number(p.NoRetiradas) || 0;
        });
        const totalMesFila = Number(m.TotalMes != null ? m.TotalMes : ((Number(m.Debe) || 0) + (Number(m.TotalIntereses) || 0))) || 0;
        const restanteMesFila = Number(m.RestanteMes != null ? m.RestanteMes : (totalMesFila - (Number(m.Haber) || 0))) || 0;
        const restanteClass = typeof clsSaldoDeudaMoney === "function"
            ? clsSaldoDeudaMoney(restanteMesFila)
            : "";

        const celdasEnt = nProd
            ? columnas.map(c => {
                const p = mapaProd[c.IdProducto];
                const q = Number(p?.Entregadas) || 0;
                const cls = q === 0 ? "is-empty" : "";
                return `<td class="cg-cm-cell-qty ${cls}" title="${escapeCg(c.Nombre)}">${q === 0 ? "—" : fmtQtyCg(q)}</td>`;
            }).join("")
            : `<td class="cg-cm-cell-qty is-empty">—</td>`;

        const celdasRet = nProd
            ? columnas.map(c => {
                const p = mapaProd[c.IdProducto];
                const q = Number(p?.Retiradas) || 0;
                return `<td class="cg-cm-cell-qty ${q === 0 ? "is-empty" : ""}" title="${escapeCg(c.Nombre)}">${q === 0 ? "—" : fmtQtyCg(q)}</td>`;
            }).join("")
            : `<td class="cg-cm-cell-qty is-empty">—</td>`;

        const celdasNoRet = nProd
            ? columnas.map(c => {
                const p = mapaProd[c.IdProducto];
                const q = Number(p?.NoRetiradas) || 0;
                return `<td class="cg-cm-cell-qty cg-cm-cell-noret ${q === 0 ? "is-empty" : (q < 0 ? "is-neg" : "")}" title="${escapeCg(c.Nombre)}">${q === 0 ? "—" : fmtQtySignedCg(q)}</td>`;
            }).join("")
            : `<td class="cg-cm-cell-qty cg-cm-cell-noret is-empty">—</td>`;

        return `<tr class="${rowClass}${sel}${vencido}" data-anio="${anio}" data-mes="${m.Mes}">
            ${mostrarAnio ? `<td class="cg-cm-sticky-left cg-cm-col-anio cg-cm-mes">${anio}</td>` : ""}
            <td class="${mostrarAnio ? "cg-cm-sticky-left-2" : "cg-cm-sticky-left"} cg-cm-mes">${escapeCg(m.MesNombre)}${badgeAtraso}</td>
            <td class="${mostrarAnio ? "cg-cm-sticky-left-3" : "cg-cm-sticky-left-2"} cg-cm-date">${celdaFechaVisitaCg(m, anio)}</td>
            ${celdasEnt}
            ${celdasRet}
            ${celdasNoRet}
            <td class="cg-cm-cell-money cg-cm-debe" title="Total del mes (entregas + retiros + intereses)">${fmtMoneyCg(totalMesFila)}</td>
            <td class="cg-cm-cell-money ${(Number(m.AbonoEfectivo) || 0) > 0 ? "cg-cm-haber" : ""}">${fmtMoneyCg(m.AbonoEfectivo)}</td>
            <td class="cg-cm-cell-money ${(Number(m.AbonoTransferencia) || 0) > 0 ? "cg-cm-haber" : ""}">${fmtMoneyCg(m.AbonoTransferencia)}</td>
            <td class="cg-cm-date">${formatearFechaCortaCg(m.FechaTransferencia)}</td>
            <td class="cg-cm-cell-money cg-cm-int">${celdaInteresesMesCg(m, anio)}</td>
            <td class="cg-cm-cell-money ${restanteClass}" title="Restante de este mes">${fmtMoneyCg(restanteMesFila)}</td>
            <td class="cg-cm-cell-money cg-cm-saldo-final ${saldoClass}" title="Saldo acumulado">${fmtMoneyCg(m.Saldo)}</td>
            <td class="cg-cm-obs-col">${celdaObsOjoCg(m, anio)}</td>
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
    const bodyId = mapHubDomIdCg("cgControlMensualBody");
    const cardsId = mapHubDomIdCg("cgCards_controlMensual");
    $(`#${bodyId} tr`).removeClass("is-selected");
    $(`#${bodyId} tr[data-anio="${anio}"][data-mes="${mes}"]`).addClass("is-selected");
    $(`#${cardsId} article`).removeClass("is-selected");
    $(`#${cardsId} article[data-anio="${anio}"][data-mes="${mes}"]`).addClass("is-selected");

    $h("cgHubMesDetailTitulo").text(`${m.MesNombre} ${anio}`);
    const totalMes = Number(m.TotalMes != null ? m.TotalMes : ((Number(m.Debe) || 0) + (Number(m.TotalIntereses) || 0))) || 0;
    const restanteMes = Number(m.RestanteMes != null ? m.RestanteMes : (totalMes - (Number(m.Haber) || 0))) || 0;
    const saldoAcum = Number(m.Saldo) || 0;
    const clsRest = typeof clsSaldoDeudaMoney === "function" ? clsSaldoDeudaMoney(restanteMes) : "";
    const clsAcum = typeof clsSaldoDeudaMoney === "function" ? clsSaldoDeudaMoney(saldoAcum) : "";
    $h("cgMesWsKpis").html(`
        <div class="cg-mes-ws-kpi"><span>Entregadas</span><strong>${fmtQtyCg(m.Entregadas)}</strong></div>
        <div class="cg-mes-ws-kpi"><span>Retiradas</span><strong>${fmtQtyCg(m.Retiradas)}</strong></div>
        <div class="cg-mes-ws-kpi cg-mes-ws-kpi--noret"><span>No retiradas</span><strong>${fmtQtySignedCg(m.NoRetiradas)}</strong></div>
        <div class="cg-mes-ws-kpi"><span>Stock mes</span><strong>${fmtQtyCg(m.StockCliente)}</strong></div>
        <div class="cg-mes-ws-kpi cg-mes-ws-kpi--total" title="Retiros del mes + intereses">
            <span>Total mes</span><strong class="cg-val-debe">${fmtMoneyCg(totalMes)}</strong>
        </div>
        <div class="cg-mes-ws-kpi" title="Intereses asignados a este mes">
            <span>Intereses</span><strong class="cg-val-debe">${fmtMoneyCg(m.TotalIntereses)}</strong>
        </div>
        <div class="cg-mes-ws-kpi cg-mes-ws-kpi--pagado" title="Cobros / abonos del mes">
            <span>Pagado</span><strong class="cg-val-haber">${fmtMoneyCg(m.Haber)}</strong>
        </div>
        <div class="cg-mes-ws-kpi cg-mes-ws-kpi--restante" title="Total mes − pagado (solo este mes)">
            <span>Restante mes</span><strong class="${clsRest}">${fmtMoneyCg(restanteMes)}</strong>
        </div>
        <div class="cg-mes-ws-kpi cg-mes-ws-kpi--acum" title="Deuda o saldo a favor acumulado al cierre de este mes">
            <span>Saldo acum.</span><strong class="${clsAcum}">${fmtMoneyCg(saldoAcum)}</strong>
        </div>
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
                    <th colspan="3" class="cg-prod-th-grp cg-prod-th-grp--noret"><i class="fa fa-ban"></i> No retiradas</th>
                </tr>
                <tr class="cg-hub-prod-cols">
                    <th class="text-end cg-prod-th-ent">Cant.</th>
                    <th class="text-end cg-prod-th-ent">P. unit.</th>
                    <th class="text-end cg-prod-th-ent">Subtotal</th>
                    <th class="text-end cg-prod-th-ret">Cant.</th>
                    <th class="text-end cg-prod-th-ret">P. unit.</th>
                    <th class="text-end cg-prod-th-ret">Subtotal</th>
                    <th class="text-end cg-prod-th-noret">Cant.</th>
                    <th class="text-end cg-prod-th-noret">P. unit.</th>
                    <th class="text-end cg-prod-th-noret">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${prods.map(p => {
                    const lista = p.ListaPrecio || p.listaPrecio || "";
                    const ent = Number(p.Entregadas) || 0;
                    const ret = Number(p.Retiradas) || 0;
                    const noRet = Number(p.NoRetiradas) || 0;
                    const subEnt = Number(p.SubtotalEntregas) || 0;
                    const subRet = Number(p.SubtotalRetiros) || 0;
                    const subNoRet = Number(p.SubtotalNoRetiros) || 0;
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
                    <td class="text-end cg-prod-td-noret ${noRet ? (noRet < 0 ? "is-filled is-neg" : "is-filled") : "is-zero"}">${fmtQtySignedCg(p.NoRetiradas)}</td>
                    <td class="text-end cg-prod-td-noret ${noRet ? "is-filled" : "is-zero"}">${fmtMoneyCg(p.PrecioUnitarioNoRetiro)}</td>
                    <td class="text-end cg-prod-td-noret cg-prod-td-sub ${subNoRet ? "is-filled" : "is-zero"}">${fmtMoneyCg(p.SubtotalNoRetiros)}</td>
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
    await cargarYRenderEntregasMesCg(anio, mes);
    await cargarCobrosMesWsCg(anio, mes);

    $h("cgHubMesDetail").prop("hidden", false);
    actualizarBotonInteresMesHub(m, anio, mes);
    actualizarChipsAtrasosSeleccionCg(anio, mes);
    if (!keepScroll) {
        window.setTimeout(() => enfocarMesSeleccionadoCg(anio, mes), 50);
        window.setTimeout(() => enfocarMesSeleccionadoCg(anio, mes), 280);
    }
}

function fechaIsoLocalCg(f) {
    if (!f) return "";
    const s = String(f);
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    try {
        const d = new Date(f);
        if (Number.isNaN(d.getTime())) return "";
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, "0");
        const da = String(d.getDate()).padStart(2, "0");
        return `${y}-${mo}-${da}`;
    } catch { return ""; }
}

function fechaPerteneceYmCg(f, anio, mes) {
    const iso = fechaIsoLocalCg(f);
    if (!iso) return false;
    return iso.slice(0, 4) === String(anio) && Number(iso.slice(5, 7)) === Number(mes);
}

function scrollParentOverflowCg(el) {
    let p = el && el.parentElement;
    while (p && p !== document.body && p !== document.documentElement) {
        const st = window.getComputedStyle(p);
        const oy = st.overflowY || st.overflow;
        if (/(auto|scroll|overlay)/.test(oy) && p.scrollHeight > p.clientHeight + 8) return p;
        p = p.parentElement;
    }
    return null;
}

function scrollNodoAVistaCg(el, pad) {
    if (!el) return;
    const padding = pad == null ? 12 : pad;
    const parent = scrollParentOverflowCg(el);
    if (parent) {
        const pRect = parent.getBoundingClientRect();
        const eRect = el.getBoundingClientRect();
        parent.scrollTop += (eRect.top - pRect.top) - padding;
        return;
    }
    const rect = el.getBoundingClientRect();
    const y = (window.pageYOffset || document.documentElement.scrollTop || 0) + rect.top - 72;
    const top = Math.max(0, y);
    try {
        window.scrollTo(0, top);
    } catch { /* noop */ }
    document.documentElement.scrollTop = top;
    document.body.scrollTop = top;
}

function enfocarMesSeleccionadoCg(anio, mes) {
    const row = document.querySelector(
        `#${mapHubDomIdCg("cgControlMensualBody")} tr[data-anio="${anio}"][data-mes="${mes}"]`
    );
    const card = document.querySelector(
        `#${mapHubDomIdCg("cgCards_controlMensual")} article[data-anio="${anio}"][data-mes="${mes}"]`
    );
    const detail = document.getElementById(mapHubDomIdCg("cgHubMesDetail"));
    if (row) scrollNodoAVistaCg(row, 8);
    else if (card) scrollNodoAVistaCg(card, 8);
    if (detail && !detail.hidden) scrollNodoAVistaCg(detail, 16);
}

function entregasMesListaCg() {
    return hubPropCg("wsEntregasMes") || [];
}

function entregaByUidCg(uid) {
    return entregasMesListaCg().find(x => String(x.uid) === String(uid)) || null;
}

function $wsAccFromCg(el) {
    return $(el).closest(".cg-ws-acc");
}

function $wsLineasBodyCg(el) {
    const $acc = $wsAccFromCg(el);
    if ($acc.length) return $acc.find(".cg-ws-lineas-list");
    return $h("cgWsLineasBody");
}

function $wsCobrosBodyCg(el) {
    const $acc = $wsAccFromCg(el);
    if ($acc.length) return $acc.find(".cg-ws-cobros-list");
    return $h("cgWsCobrosBody");
}

function lineasWsDeCg(el) {
    const $acc = $wsAccFromCg(el);
    if ($acc.length) {
        const ent = entregaByUidCg($acc.attr("data-uid"));
        if (ent) return ent.Lineas;
    }
    return hubPropCg("wsLineas") || [];
}

function cobrosWsDeCg(el) {
    const $acc = $wsAccFromCg(el);
    if ($acc.length) {
        const ent = entregaByUidCg($acc.attr("data-uid"));
        if (ent) return ent.Cobros;
    }
    return hubPropCg("wsCobros") || [];
}

function activarLineasHubDesdeAccCg(el) {
    const $acc = $wsAccFromCg(el);
    const ent = $acc.length ? entregaByUidCg($acc.attr("data-uid")) : null;
    if (ent) {
        setHubPropCg("wsLineas", ent.Lineas);
        setHubPropCg("wsCobros", ent.Cobros);
        if (ent.Fecha) {
            $h("cgCmFechaVisita").val(ent.Fecha);
            $h("cgWsFechaEntrega").val(ent.Fecha);
        }
        if (ent.IdEstablecimiento) $h("cgWsEstablecimiento").val(String(ent.IdEstablecimiento));
    }
    return ent;
}

function nuevoUidEntregaMesCg() {
    return "n-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1000);
}

function lineaDesdeDetalleCg(l) {
    const cant = Number(l.Cantidad) || 0;
    const noret = !!l.NoRetirado || (Number(l.TipoMovimiento) === 2 && cant < 0);
    return {
        Id: Number(l.Id) || 0,
        IdProducto: Number(l.IdProducto) || 0,
        IdListaPrecio: Number(l.IdListaPrecio) || 0,
        TipoMovimiento: Number(l.TipoMovimiento) || 1,
        NoRetirado: noret,
        NoRetiradoSigno: noret && cant < 0 ? -1 : 1,
        Cantidad: Math.abs(cant) || 0,
        PrecioVenta: Number(l.PrecioVenta) || 0,
        PorcDescuento: Number(l.PorcDescuento) || 0,
        PorcIva: Number(l.PorcIva) || 0
    };
}

function cobroDesdeDetalleCg(c) {
    return {
        _key: CG.wsNextCobroKey++,
        IdCobro: Number(c.IdCobro || c.idCobro) || 0,
        IdMovimientoCc: Number(c.IdMovimientoCc || c.idMovimientoCc) || 0,
        Fecha: fechaIsoLocalCg(c.Fecha || c.fecha),
        IdCuenta: Number(c.IdCuenta || c.idCuenta) || 0,
        Concepto: c.Concepto || c.concepto || "Cobro visita",
        Importe: Number(c.Importe || c.importe) || 0
    };
}

function crearEntregaDraftMesCg(anio, mes, expanded) {
    const lim = limitesMesIsoCg(anio, mes);
    let fecha = $h("cgCmFechaVisita").val() || fechaIsoLocalCg(new Date());
    if (!fechaPerteneceYmCg(fecha, anio, mes)) fecha = lim.max;
    const idEst = Number($h("cgWsEstablecimiento").val()) || hubIdEstablecimientoCg() || 0;
    return {
        uid: nuevoUidEntregaMesCg(),
        Id: 0,
        Fecha: fecha,
        IdEstablecimiento: idEst,
        IdContrato: null,
        IdEstado: null,
        IdCamion: null,
        NotaInterna: "",
        NotaCliente: "",
        EstablecimientoNombre: "",
        Lineas: [],
        LineasRecuperadas: [],
        Cobros: [],
        expanded: !!expanded,
        esNueva: true
    };
}

async function cargarYRenderEntregasMesCg(anio, mes) {
    const prevOpen = new Set(
        entregasMesListaCg().filter(x => x.expanded && Number(x.Id) > 0).map(x => Number(x.Id))
    );
    const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const lastDay = new Date(anio, mes, 0).getDate();
    const hasta = `${anio}-${String(mes).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    let lista = [];
    try {
        lista = await fetchJsonCg(API_CG.entregasLista, {
            method: "POST",
            headers: authCg(),
            body: JSON.stringify({
                FechaDesde: desde,
                FechaHasta: hasta,
                IdCliente: CG.id
            })
        }) || [];
    } catch (e) {
        console.warn(e);
        lista = [];
    }
    if (!Array.isArray(lista)) lista = [];

    const idEstLock = hubIdEstablecimientoCg();
    lista = lista.filter(e => {
        if (!fechaPerteneceYmCg(e.Fecha || e.fecha, anio, mes)) return false;
        if (idEstLock > 0) {
            const idEst = Number(e.IdEstablecimiento || e.idEstablecimiento) || 0;
            if (idEst && idEst !== idEstLock) return false;
        }
        return true;
    }).sort((a, b) => {
        const fa = fechaIsoLocalCg(a.Fecha || a.fecha);
        const fb = fechaIsoLocalCg(b.Fecha || b.fecha);
        if (fa !== fb) return fa < fb ? -1 : 1;
        return (Number(a.Id) || 0) - (Number(b.Id) || 0);
    });

    const loaded = [];
    for (const item of lista) {
        const id = Number(item.Id || item.id) || 0;
        if (id <= 0) continue;
        let det = null;
        let cobros = [];
        try {
            det = await fetchJsonCg(API_CG.entregaEditarInfo(id), { headers: authCg() });
        } catch (e) {
            console.warn(e);
        }
        try {
            const r = await fetchJsonCg(API_CG.entregaCobros(id), { headers: authCg() });
            cobros = Array.isArray(r?.Cobros) ? r.Cobros : (Array.isArray(r?.cobros) ? r.cobros : []);
        } catch (e) {
            console.warn(e);
        }
        if (!det) continue;
        loaded.push({
            uid: "e-" + id,
            Id: id,
            Fecha: fechaIsoLocalCg(det.Fecha || item.Fecha),
            IdEstablecimiento: Number(det.IdEstablecimiento || item.IdEstablecimiento) || 0,
            IdContrato: det.IdContrato || null,
            IdEstado: det.IdEstado || null,
            IdCamion: det.IdCamion || null,
            NotaInterna: det.NotaInterna || "",
            NotaCliente: det.NotaCliente || "",
            EstablecimientoNombre: det.Establecimiento || item.Establecimiento || "",
            Lineas: (det.Lineas || []).map(lineaDesdeDetalleCg),
            LineasRecuperadas: det.LineasRecuperadas || [],
            Cobros: cobros.map(cobroDesdeDetalleCg),
            expanded: false,
            esNueva: false
        });
    }

    if (loaded.length) {
        if (prevOpen.size) {
            loaded.forEach(x => { x.expanded = prevOpen.has(Number(x.Id)); });
            if (!loaded.some(x => x.expanded)) loaded[loaded.length - 1].expanded = true;
        } else {
            loaded[loaded.length - 1].expanded = true;
        }
    } else {
        loaded.push(crearEntregaDraftMesCg(anio, mes, true));
    }

    setHubPropCg("wsEntregasMes", loaded);
    const lastEnt = loaded[loaded.length - 1];
    if (lastEnt) {
        setHubPropCg("wsLineas", lastEnt.Lineas);
        setHubPropCg("wsCobros", lastEnt.Cobros);
        if (lastEnt.Fecha) {
            $h("cgCmFechaVisita").val(lastEnt.Fecha);
            $h("cgWsFechaEntrega").val(lastEnt.Fecha);
        }
        if (lastEnt.IdEstablecimiento) $h("cgWsEstablecimiento").val(String(lastEnt.IdEstablecimiento));
    }
    renderEntregasMesAccCg();
}

function agregarEntregaDraftMesCg() {
    const sel = hubPropCg("hubMesSel");
    if (!sel) return;
    const list = entregasMesListaCg().slice();
    list.forEach(x => { x.expanded = false; });
    const draft = crearEntregaDraftMesCg(sel.anio, sel.mes, true);
    list.push(draft);
    setHubPropCg("wsEntregasMes", list);
    setHubPropCg("wsLineas", draft.Lineas);
    setHubPropCg("wsCobros", draft.Cobros);
    renderEntregasMesAccCg();
    const $acc = $h("cgWsEntregasAcc").find(`.cg-ws-acc[data-uid="${draft.uid}"]`);
    if ($acc.length) scrollNodoAVistaCg($acc.get(0), 12);
}

function toggleEntregaAccCg(uid, forceOpen) {
    const list = entregasMesListaCg();
    const ent = list.find(x => String(x.uid) === String(uid));
    if (!ent) return;
    const $acc = $h("cgWsEntregasAcc").find(`.cg-ws-acc[data-uid="${uid}"]`);
    if ($acc.length && $acc.hasClass("is-open")) {
        $acc.find(".cg-ws-linea").each(function () {
            const idx = Number($(this).data("idx"));
            const linea = ent.Lineas[idx];
            if (linea) leerCamposLineaWsDesdeDomCg($(this), linea);
        });
        sincronizarCobrosWsDesdeDomCg($acc);
        ent.Fecha = $acc.find(".ws-acc-fecha").val() || ent.Fecha;
        ent.IdEstablecimiento = Number($acc.find(".ws-acc-est").val()) || ent.IdEstablecimiento;
    }
    const next = forceOpen == null ? !ent.expanded : !!forceOpen;
    ent.expanded = next;
    $acc.toggleClass("is-open", next);
    $acc.find(".cg-ws-acc-chev i").attr("class", next ? "fa fa-chevron-down" : "fa fa-chevron-right");
    if (next) {
        activarLineasHubDesdeAccCg($acc);
        cargarSugeridosEnAccCg($acc, Number($acc.find(".ws-acc-est").val()) || ent.IdEstablecimiento);
        renderLineasWsCg($acc);
        renderCobrosWsCg($acc);
    }
}

function htmlOptsEstablecimientoWsCg(selectedId) {
    const opts = [`<option value="">Seleccionar</option>`];
    (CG.wsEstablecimientos || []).forEach(e => {
        const id = e.Id || e.id;
        const nom = e.Nombre || e.nombre || `Est. #${id}`;
        const sel = Number(selectedId) === Number(id) ? " selected" : "";
        opts.push(`<option value="${id}"${sel}>${escapeCg(nom)}</option>`);
    });
    return opts.join("");
}

function resumenEntregaAccCg(ent) {
    const lineas = (ent.Lineas || []).filter(lineaConCantidadWsCg);
    const cobros = (ent.Cobros || []).filter(c => Number(c.Importe) > 0);
    const totEnt = totalPorTipoWsCg(lineas, 1);
    const totRet = totalPorTipoWsCg(lineas, 2);
    const totPag = cobros.reduce((s, c) => s + (Number(c.Importe) || 0), 0);
    return {
        nLineas: lineas.length,
        totEnt,
        totRet,
        totPag,
        saldo: (totEnt + totRet) - totPag
    };
}

function renderEntregasMesAccCg() {
    const list = entregasMesListaCg();
    const $box = $h("cgWsEntregasAcc");
    $h("cgWsEntregasCount").text(String(list.filter(x => Number(x.Id) > 0 || (x.Lineas || []).length).length || list.length));
    if (!$box.length) return;
    const lastUid = list.length ? list[list.length - 1].uid : "";
    $box.html(list.map((ent, i) => htmlEntregaAccCg(ent, i, lastUid)).join(""));
    list.forEach(ent => {
        const $acc = $box.find(`.cg-ws-acc[data-uid="${ent.uid}"]`);
        if (!$acc.length) return;
        if (ent.IdEstablecimiento) $acc.find(".ws-acc-est").val(String(ent.IdEstablecimiento));
        const idEstLock = hubIdEstablecimientoCg();
        if (idEstLock > 0) $acc.find(".ws-acc-est").prop("disabled", true);
        if (ent.expanded) {
            renderLineasWsCg($acc);
            renderCobrosWsCg($acc);
            cargarSugeridosEnAccCg($acc, Number($acc.find(".ws-acc-est").val()) || ent.IdEstablecimiento);
        }
    });
}

function htmlEntregaAccCg(ent, idx, lastUid) {
    const n = idx + 1;
    const res = resumenEntregaAccCg(ent);
    const open = !!ent.expanded;
    const esLast = String(ent.uid) === String(lastUid);
    const fechaTxt = formatearFechaCortaCg(ent.Fecha) || ent.Fecha || "Sin fecha";
    const estNom = ent.EstablecimientoNombre
        || (CG.wsEstablecimientos || []).find(e => Number(e.Id || e.id) === Number(ent.IdEstablecimiento))?.Nombre
        || (ent.IdEstablecimiento ? `Est. #${ent.IdEstablecimiento}` : "Sin establecimiento");
    const pill = ent.esNueva || !(Number(ent.Id) > 0)
        ? `<span class="cg-ws-acc-pill cg-ws-acc-pill--new">Nueva</span>`
        : (esLast ? `<span class="cg-ws-acc-pill cg-ws-acc-pill--last">Última</span>` : "");
    const titulo = Number(ent.Id) > 0 ? `Entrega #${ent.Id}` : `Entrega nueva`;
    return `
    <article class="cg-ws-acc${open ? " is-open" : ""}${ent.esNueva ? " is-draft" : ""}" data-uid="${escapeCg(ent.uid)}" data-id="${ent.Id || 0}">
        <button type="button" class="cg-ws-acc-head" data-uid="${escapeCg(ent.uid)}">
            <span class="cg-ws-acc-chev"><i class="fa fa-chevron-${open ? "down" : "right"}"></i></span>
            <span class="cg-ws-acc-head-main">
                <span class="cg-ws-acc-head-title">
                    ${escapeCg(titulo)} ${pill}
                    <span>· ${escapeCg(fechaTxt)}</span>
                </span>
                <span class="cg-ws-acc-head-meta">${escapeCg(estNom)} · ${res.nLineas} producto(s)</span>
            </span>
            <span class="cg-ws-acc-head-money">
                <strong>${fmtMoneyCg(res.totEnt + res.totRet)}</strong>
                <small>Cobrado ${fmtMoneyCg(res.totPag)}</small>
            </span>
        </button>
        <div class="cg-ws-acc-body">
            <div class="cg-ws-meta-bar">
                <div class="cg-ws-meta-field">
                    <label class="form-label cg-ws-label">Fecha</label>
                    <input type="date" class="form-control ws-acc-fecha" value="${escapeCg(ent.Fecha || "")}" />
                </div>
                <div class="cg-ws-meta-field cg-ws-meta-field--grow">
                    <label class="form-label cg-ws-label">Establecimiento</label>
                    <select class="form-control ws-acc-est">${htmlOptsEstablecimientoWsCg(ent.IdEstablecimiento)}</select>
                </div>
            </div>
            <div class="cg-ws-split">
                <section class="cg-ws-col">
                    <div class="cg-ws-col-head">
                        <span>Productos</span>
                        <button type="button" class="cg-btn cg-btn--ghost cg-btn--xs btn-ws-acc-linea">
                            <i class="fa fa-plus"></i> Línea
                        </button>
                    </div>
                    <div class="cg-ws-sugeridos ws-acc-sugeridos"></div>
                    <div class="cg-ws-lineas-wrap">
                        <div class="cg-ws-lineas-list"></div>
                    </div>
                    <div class="cg-ws-dup-alert d-none ws-acc-dup" role="alert">
                        <i class="fa fa-exclamation-triangle"></i>
                        <div>
                            <strong>Líneas repetidas</strong>
                            <span>No podés cargar dos líneas 100% iguales. Si cambia algún dato, sí se permite.</span>
                        </div>
                    </div>
                </section>
                <section class="cg-ws-col">
                    <div class="cg-ws-col-head">
                        <span>Cobros de esta entrega</span>
                        <button type="button" class="cg-btn cg-btn--ghost cg-btn--xs btn-ws-acc-cobro">
                            <i class="fa fa-plus"></i> Cobro
                        </button>
                    </div>
                    <div class="cg-ws-cobros-kpis">
                        <div class="cg-ws-cobro-kpi"><span>Entregado</span><strong class="ws-acc-tot-ent">$ 0,00</strong></div>
                        <div class="cg-ws-cobro-kpi"><span>Retirado</span><strong class="ws-acc-tot-ret">$ 0,00</strong></div>
                        <div class="cg-ws-cobro-kpi"><span>Cobrado</span><strong class="ws-acc-tot-pag">$ 0,00</strong></div>
                        <div class="cg-ws-cobro-kpi"><span>Saldo</span><strong class="ws-acc-saldo">$ 0,00</strong></div>
                    </div>
                    <div class="cg-ws-cobros-list"></div>
                </section>
            </div>
            <div class="cg-ws-acc-actions">
                ${Number(ent.Id) > 0 ? `<button type="button" class="cg-btn cg-btn--ghost cg-btn--sm btn-ws-acc-eliminar"><i class="fa fa-trash"></i> Eliminar</button>` : ""}
                <button type="button" class="cg-btn cg-btn--success cg-btn--sm btn-ws-acc-guardar">
                    <i class="fa fa-check"></i> Guardar esta entrega
                </button>
            </div>
        </div>
    </article>`;
}

async function cargarSugeridosEnAccCg($acc, idEstablecimiento) {
    const $box = $acc.find(".ws-acc-sugeridos");
    if (!$box.length) return;
    try {
        CG.wsSugeridos = await fetchJsonCg(API_CG.productosSugeridos(CG.id, idEstablecimiento), { headers: authCg() }) || [];
    } catch (e) {
        CG.wsSugeridos = [];
    }
    if (!CG.wsSugeridos.length) {
        $box.html(`<span class="text-muted small">Sin productos del establecimiento. Agregá líneas a mano.</span>`);
        return;
    }
    $box.html(CG.wsSugeridos.map((s, i) => {
        const label = (s.Abreviatura || s.Producto || "").trim();
        const lista = s.ListaPrecio ? ` · ${s.ListaPrecio}` : "";
        return htmlChipSugeridoWsCg(s, i);
    }).join(""));
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

function precioDesdeSugeridosWsCg(idProducto, idLista) {
    const idP = Number(idProducto || 0);
    const idL = Number(idLista || 0);
    if (idP <= 0) return null;
    const rows = (CG.wsSugeridos || []).filter(s =>
        Number(s.IdProducto) === idP && Number(s.PrecioVenta) > 0
    );
    if (!rows.length) return null;
    if (idL > 0) {
        const exact = rows.find(s => Number(s.IdListaPrecio) === idL);
        if (exact) return Number(exact.PrecioVenta);
    }
    // Si la lista del establecimiento no coincide (o viene vacía), igual usar su precio.
    const sinLista = rows.find(s => !(Number(s.IdListaPrecio) > 0));
    if (sinLista) return Number(sinLista.PrecioVenta);
    return Number(rows[0].PrecioVenta);
}

async function obtenerPrecioListaWsCg(idProducto, idLista) {
    const idL = Number(idLista || 0);
    if (!idProducto || !idL) return null;
    const rows = await obtenerPreciosProductoWsCg(idProducto);
    const match = (rows || []).find(r => Number(r.IdListaPrecio) === idL);
    // Matriz completa con 0 si no hay tarifa: no pisar el precio del establecimiento.
    if (match && Number(match.PrecioVenta) > 0) return Number(match.PrecioVenta);

    const desdeSug = precioDesdeSugeridosWsCg(idProducto, idL);
    if (desdeSug != null && desdeSug > 0) return desdeSug;
    return null;
}

/** Entrega y Retiro: precio de lista al elegir producto + lista. */
async function sincronizarPrecioLineaWsCg($row, linea, campo) {
    if (campo === "lista" && !(Number(linea.IdListaPrecio) > 0)) {
        linea.PrecioVenta = 0;
        $row.find(".ws-precio").val(fmtQtyCg(0));
        return;
    }

    if (campo === "tipo") {
        if (linea.IdProducto > 0 && linea.IdListaPrecio > 0) {
            const precio = await obtenerPrecioListaWsCg(linea.IdProducto, linea.IdListaPrecio);
            if (precio != null && Number(precio) > 0) {
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
        let idListaAuto = 0;
        if (conPrecio.length === 1) {
            idListaAuto = Number(conPrecio[0].IdListaPrecio);
        } else {
            const sugConPrecio = (CG.wsSugeridos || []).filter(s =>
                Number(s.IdProducto) === linea.IdProducto
                && Number(s.PrecioVenta) > 0
                && Number(s.IdListaPrecio) > 0
            );
            if (sugConPrecio.length === 1) {
                idListaAuto = Number(sugConPrecio[0].IdListaPrecio);
            }
        }
        if (idListaAuto > 0) {
            linea.IdListaPrecio = idListaAuto;
            $row.find(".ws-lista").val(String(linea.IdListaPrecio));
        }
    }

    if (linea.IdProducto > 0 && linea.IdListaPrecio > 0) {
        const precio = await obtenerPrecioListaWsCg(linea.IdProducto, linea.IdListaPrecio);
        if (precio != null && Number(precio) > 0) {
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
        return htmlChipSugeridoWsCg(s, i);
    }).join(""));
}

function prefLineaDesdeSugeridoWsCg(s, tipoRaw) {
    const tipo = Number(tipoRaw) === 2 ? 2 : 1;
    return {
        IdProducto: s.IdProducto,
        IdListaPrecio: s.IdListaPrecio || 0,
        TipoMovimiento: tipo,
        Cantidad: s.Cantidad || 1,
        PrecioVenta: Number(s.PrecioVenta) || 0
    };
}

function htmlChipSugeridoWsCg(s, i) {
    const label = (s.Abreviatura || s.Producto || "").trim();
    const lista = s.ListaPrecio ? ` · ${s.ListaPrecio}` : "";
    const nom = escapeCg(s.Producto || label);
    const qty = fmtQtyCg(s.Cantidad);
    const precio = fmtMoneyCg(s.PrecioVenta);
    return `<span class="cg-ws-chip-pair">
        <button type="button" class="cg-ws-chip" data-idx="${i}" data-tipo="1"
            title="Entrega: descuenta el depósito. ${nom}${lista}">
            <i class="fa fa-plus"></i> ${escapeCg(label)} × ${qty} · Entrega
        </button>
        <button type="button" class="cg-ws-chip cg-ws-chip--retiro" data-idx="${i}" data-tipo="2"
            title="Retiro: no baja ni sube el depósito. ${nom}${lista}">
            Retiro × ${qty} · ${precio}
        </button>
    </span>`;
}

function agregarLineaWsCg(pref, el) {
    activarLineasHubDesdeAccCg(el);
    const idProducto = pref?.IdProducto || 0;
    const idLista = pref?.IdListaPrecio || 0;
    const tipo = Number(pref?.TipoMovimiento || 1) || 1;
    let precio = Number(pref?.PrecioVenta) || 0;
    if (!(precio > 0) && idProducto > 0) {
        const desdeSug = precioDesdeSugeridosWsCg(idProducto, idLista);
        if (desdeSug != null && Number(desdeSug) > 0) precio = Number(desdeSug);
    }
    lineasWsDeCg(el).push({
        Id: 0,
        IdProducto: idProducto,
        IdListaPrecio: idLista,
        TipoMovimiento: tipo,
        NoRetirado: !!pref?.NoRetirado && tipo === 2,
        NoRetiradoSigno: Number(pref?.NoRetiradoSigno) === -1 ? -1 : 1,
        Cantidad: magnitudCantidadWsCg(pref?.Cantidad || 1) || 1,
        PrecioVenta: precio
    });
    renderLineasWsCg(el);
    actualizarResumenCobrosWsCg(el);
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
    const noRet = tipo === 2 && !!l.NoRetirado
        ? (signoNoRetiradoWsCg(l) < 0 ? "-1" : "1")
        : "0";
    return [
        Number(l.IdProducto) || 0,
        tipo,
        noRet,
        idLista,
        normNumClaveWsCg(magnitudCantidadWsCg(l.Cantidad)),
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

function actualizarAlertaDuplicadosLineasWsCg(el) {
    const lineas = lineasWsDeCg(el);
    const dups = indicesLineasDuplicadasWsCg(lineas);
    const hayDup = dups.size > 0;
    const $body = $wsLineasBodyCg(el);
    $body.find(".cg-ws-linea").each(function () {
        const idx = Number($(this).data("idx"));
        $(this).toggleClass("cg-ws-linea--dup", dups.has(idx));
    });
    const $acc = $wsAccFromCg(el);
    const $alert = $acc.length ? $acc.find(".ws-acc-dup") : $h("cgWsLineasDupAlert");
    if ($alert.length) $alert.toggleClass("d-none", !hayDup);
    return !hayDup;
}

function renderLineasWsCg(el) {
    const lineas = lineasWsDeCg(el);
    const $body = $wsLineasBodyCg(el);
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

    if (!lineas.length) {
        $body.html(`<div class="cg-ws-lineas-empty">Sin líneas. Agregá un producto o usá un sugerido arriba.</div>`);
        actualizarAlertaDuplicadosLineasWsCg(el);
        return;
    }

    $body.html(lineas.map((l, i) => {
        const esRetiro = Number(l.TipoMovimiento || 1) === 2;
        const noretOn = esRetiro && !!l.NoRetirado;
        const noretSign = noretOn ? signoNoRetiradoWsCg(l) : 0;
        const noretCls = noretOn
            ? (noretSign < 0 ? "is-on is-neg" : "is-on is-pos")
            : "";
        const cantMostrar = magnitudCantidadWsCg(l.Cantidad) || Number(l.Cantidad) || 0;
        return `
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
                    <select class="form-control ws-tipo" title="Entrega descuenta depósito. Retiro no mueve el inventario.">
                        <option value="1">Entrega (depósito −)</option>
                        <option value="2">Retiro (sin stock)</option>
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
                    <input type="text" class="form-control Inputmiles ws-cant" value="${fmtQtyCg(cantMostrar)}" inputmode="decimal" />
                </label>
                <label class="cg-ws-field cg-ws-field--num cg-ws-field--precio">
                    <span>Precio</span>
                    <input type="text" class="form-control Inputmiles ws-precio" value="${fmtQtyCg(Number(l.PrecioVenta) || 0)}" inputmode="decimal" />
                </label>
            </div>
            <div class="cg-ws-linea-foot">
                <div class="cg-ws-linea-subtotal">
                    <span>Subtotal</span>
                    <strong class="ws-sub">${fmtMoneyCg(subtotalLineaWsCg(l))}</strong>
                </div>
                <div class="cg-ws-noret-ctl ${esRetiro ? "" : "d-none"} ${noretCls}" data-sign="${noretSign}"
                     title="No retirado + suma al saldo (quedó sin retirar). No retirado − resta y lo compensa.">
                    <button type="button" class="cg-ws-noret-btn ws-noret-sign" data-sign="-1" title="No retirado −">−</button>
                    <div class="cg-ws-noret-mid">
                        <i class="fa fa-ban" aria-hidden="true"></i>
                        <span class="cg-ws-noret-label">No retirado</span>
                        <strong class="cg-ws-noret-qty">${noretOn ? fmtQtySignedCg(cantidadEfectivaWsCg(l)) : ""}</strong>
                    </div>
                    <button type="button" class="cg-ws-noret-btn ws-noret-sign" data-sign="1" title="No retirado +">+</button>
                </div>
                <span class="cg-ws-noret-saldo d-none" title="Saldo de no retirado de este producto"></span>
                <button type="button" class="btn btn-outline-danger btn-sm btn-ws-quitar" data-idx="${i}" title="Quitar">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join(""));

    lineas.forEach((l, i) => {
        const $row = $body.find(`.cg-ws-linea[data-idx="${i}"]`);
        if (l.IdProducto) $row.find(".ws-prod").val(String(l.IdProducto));
        if (l.IdListaPrecio) $row.find(".ws-lista").val(String(l.IdListaPrecio));
        $row.find(".ws-tipo").val(String(l.TipoMovimiento || 1));
        sincronizarUiNoRetiradoWsCg($row, l);
    });
    actualizarAlertaDuplicadosLineasWsCg(el);
}

function magnitudCantidadWsCg(n) {
    const v = Number(n);
    return Number.isFinite(v) ? Math.abs(v) : 0;
}

function signoNoRetiradoWsCg(linea) {
    if (!(Number(linea?.TipoMovimiento) === 2 && linea?.NoRetirado)) return 1;
    return Number(linea.NoRetiradoSigno) === -1 ? -1 : 1;
}

function cantidadEfectivaWsCg(linea) {
    const mag = magnitudCantidadWsCg(linea?.Cantidad);
    if (Number(linea?.TipoMovimiento) === 2 && linea?.NoRetirado) {
        return mag * signoNoRetiradoWsCg(linea);
    }
    return mag;
}

function subtotalLineaWsCg(linea) {
    return cantidadEfectivaWsCg(linea) * (Number(linea?.PrecioVenta) || 0);
}

function lineaConCantidadWsCg(linea) {
    return Number(linea?.IdProducto) > 0 && magnitudCantidadWsCg(linea?.Cantidad) > 0;
}

function fmtQtySignedCg(n) {
    const v = Number(n) || 0;
    const abs = fmtQtyCg(Math.abs(v));
    if (v > 0) return "+" + abs;
    if (v < 0) return "−" + abs;
    return abs;
}

function saldoNoRetiradoProductoWsCg(idProducto) {
    const idP = Number(idProducto || 0);
    if (idP <= 0) return 0;
    const saved = (hubPropCg("stockCliente") || []).find(s => Number(s.IdProducto) === idP);
    let saldo = Number(saved?.NoRetiradas) || 0;
    (hubPropCg("wsLineas") || []).forEach(l => {
        if (Number(l.IdProducto) !== idP) return;
        if (Number(l.TipoMovimiento) !== 2 || !l.NoRetirado) return;
        saldo += cantidadEfectivaWsCg(l);
    });
    return saldo;
}

function leerCamposLineaWsDesdeDomCg($row, linea) {
    linea.IdProducto = Number($row.find(".ws-prod").val()) || 0;
    linea.IdListaPrecio = Number($row.find(".ws-lista").val()) || 0;
    linea.TipoMovimiento = Number($row.find(".ws-tipo").val()) || 1;
    const rawCant = leerNumeroWsCg($row.find(".ws-cant").val());
    linea.PrecioVenta = leerNumeroWsCg($row.find(".ws-precio").val());
    if (Number(linea.TipoMovimiento) === 2 && rawCant < 0) {
        linea.NoRetirado = true;
        linea.NoRetiradoSigno = -1;
        linea.Cantidad = Math.abs(rawCant);
        $row.find(".ws-cant").val(fmtQtyCg(linea.Cantidad));
    } else {
        linea.Cantidad = Math.abs(rawCant);
    }
    if (Number(linea.TipoMovimiento) !== 2) {
        linea.NoRetirado = false;
        linea.NoRetiradoSigno = 1;
    }
}

function aplicarSignoNoRetiradoWsCg($row, linea, signWanted) {
    const want = Number(signWanted) === -1 ? -1 : 1;
    if (Number(linea.TipoMovimiento) !== 2) {
        linea.NoRetirado = false;
        linea.NoRetiradoSigno = 1;
        sincronizarUiNoRetiradoWsCg($row, linea);
        return;
    }
    if (linea.NoRetirado && signoNoRetiradoWsCg(linea) === want) {
        linea.NoRetirado = false;
        linea.NoRetiradoSigno = 1;
    } else {
        linea.NoRetirado = true;
        linea.NoRetiradoSigno = want;
        if (!(magnitudCantidadWsCg(linea.Cantidad) > 0)) {
            linea.Cantidad = 1;
            $row.find(".ws-cant").val(fmtQtyCg(1));
        }
    }
    sincronizarUiNoRetiradoWsCg($row, linea);
}

function sincronizarUiNoRetiradoWsCg($row, linea) {
    if (!$row?.length) return;
    const esRetiro = Number(linea?.TipoMovimiento || $row.find(".ws-tipo").val() || 1) === 2;
    const $ctl = $row.find(".cg-ws-noret-ctl");
    const $saldo = $row.find(".cg-ws-noret-saldo");
    $ctl.toggleClass("d-none", !esRetiro);

    if (!esRetiro) {
        if (linea) {
            linea.NoRetirado = false;
            linea.NoRetiradoSigno = 1;
        }
        $ctl.removeClass("is-on is-pos is-neg").attr("data-sign", "0");
        $ctl.find(".cg-ws-noret-qty").text("");
        $saldo.addClass("d-none").text("");
        return;
    }

    const on = !!linea?.NoRetirado;
    const sign = on ? signoNoRetiradoWsCg(linea) : 0;
    $ctl.toggleClass("is-on", on)
        .toggleClass("is-pos", on && sign > 0)
        .toggleClass("is-neg", on && sign < 0)
        .attr("data-sign", String(sign));
    $ctl.find(".cg-ws-noret-qty").text(on ? fmtQtySignedCg(cantidadEfectivaWsCg(linea)) : "");

    const idProd = Number(linea?.IdProducto) || 0;
    if (idProd > 0) {
        const saldo = saldoNoRetiradoProductoWsCg(idProd);
        $saldo.removeClass("d-none is-zero is-pos is-neg")
            .addClass(saldo > 0 ? "is-pos" : (saldo < 0 ? "is-neg" : "is-zero"))
            .text(`saldo ${fmtQtySignedCg(saldo)}`);
    } else {
        $saldo.addClass("d-none").text("");
    }
}

function refrescarSaldosNoRetiradoWsCg(el) {
    const $body = $wsLineasBodyCg(el);
    const lineas = lineasWsDeCg(el);
    $body.find(".cg-ws-linea").each(function () {
        const i = Number($(this).data("idx"));
        const ln = lineas[i];
        if (ln) sincronizarUiNoRetiradoWsCg($(this), ln);
    });
}

function sincronizarCheckNoRetiradoWsCg($row, linea) {
    sincronizarUiNoRetiradoWsCg($row, linea);
}

function agregarCobroWsCg(preset, el) {
    activarLineasHubDesdeAccCg(el);
    const $acc = $wsAccFromCg(el);
    const hoy = ($acc.find(".ws-acc-fecha").val() || $h("cgCmFechaVisita").val() || $h("cgWsFechaEntrega").val() || new Date().toISOString().slice(0, 10));
    const cobros = cobrosWsDeCg(el);
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
    renderCobrosWsCg(el);
}

function sincronizarCobrosWsDesdeDomCg(el) {
    const cobros = cobrosWsDeCg(el);
    $wsCobrosBodyCg(el).find(".cg-ws-cobro-row").each(function () {
        const key = Number($(this).data("key"));
        const cobro = cobros.find(c => Number(c._key) === key);
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
        const cobro = cobrosWsDeCg($row).find(c => Number(c._key) === key);
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

function cobrosWsParaGuardarCg(el) {
    sincronizarCobrosWsDesdeDomCg(el);
    return cobrosWsDeCg(el).filter(c => Number(c.Importe) > 0 && Number(c.IdCuenta) > 0);
}

function totalPorTipoWsCg(lineas, tipo) {
    const t = Number(tipo);
    return (lineas || [])
        .filter(l => Number(l.TipoMovimiento || 1) === t)
        .reduce((s, l) => s + subtotalLineaWsCg(l), 0);
}

/** Lo cobrable = entrega + retiro. */
function totalCobrableWsCg(lineas) {
    return totalPorTipoWsCg(lineas, 1) + totalPorTipoWsCg(lineas, 2);
}

function actualizarResumenCobrosWsCg(el) {
    const lineas = (lineasWsDeCg(el) || []).filter(lineaConCantidadWsCg);
    const cobros = cobrosWsParaGuardarCg(el);
    const totalEnt = totalPorTipoWsCg(lineas, 1);
    const totalRet = totalPorTipoWsCg(lineas, 2);
    const totalPag = cobros.reduce((s, c) => s + Number(c.Importe || 0), 0);
    const saldo = (totalEnt + totalRet) - totalPag;
    const $acc = $wsAccFromCg(el);
    if ($acc.length) {
        $acc.find(".ws-acc-tot-ent").text(fmtMoneyCg(totalEnt));
        $acc.find(".ws-acc-tot-ret").text(fmtMoneyCg(totalRet));
        $acc.find(".ws-acc-tot-pag").text(fmtMoneyCg(totalPag));
        $acc.find(".ws-acc-saldo").text(fmtMoneyCg(saldo))
            .toggleClass("text-danger", saldo > 0.009)
            .toggleClass("text-success", saldo < -0.009);
        return;
    }
    $h("cgWsCobroTotEntrega").text(fmtMoneyCg(totalEnt));
    $h("cgWsCobroTotRetiro").text(fmtMoneyCg(totalRet));
    $h("cgWsCobroTotPagado").text(fmtMoneyCg(totalPag));
    $h("cgWsCobroSaldo").text(fmtMoneyCg(saldo))
        .toggleClass("text-danger", saldo > 0.009)
        .toggleClass("text-success", saldo < -0.009);
}

function renderCobrosWsCg(el) {
    const cobros = cobrosWsDeCg(el);
    const $body = $wsCobrosBodyCg(el);
    if (!$body.length) return;

    if (!cobros.length) {
        $body.html(`<div class="cg-ws-lineas-empty">Sin cobros de esta entrega. Usá + Cobro si cobrás junto con la visita.</div>`);
        actualizarResumenCobrosWsCg(el);
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
    actualizarResumenCobrosWsCg(el);
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
            const esCobro = String(m.TipoMovimiento || m.Origen || "").toLowerCase().includes("cobro");
            return esCobro && fechaPerteneceYmCg(f, anio, mes);
        });
        const idsMovEntrega = new Set();
        entregasMesListaCg().forEach(ent => {
            (ent.Cobros || []).forEach(c => {
                if (Number(c.IdMovimientoCc) > 0) idsMovEntrega.add(Number(c.IdMovimientoCc));
            });
        });
        const sueltos = cobrosMes.filter(m => !idsMovEntrega.has(Number(m.Id || m.id) || 0));
        if (!sueltos.length) {
            $body.html(`<div class="cg-ws-lineas-empty">Sin cobros sueltos en este mes (los de cada entrega están arriba).</div>`);
            return;
        }
        $body.html(sueltos.map(m => `
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

function cobrosMesParaPlanillaCg(cobrosAcc, uidAcc) {
    const lista = [];
    entregasMesListaCg().forEach(e => {
        if (uidAcc && e.uid === uidAcc) return;
        (e.Cobros || []).forEach(c => {
            if (Number(c.Importe) > 0 && Number(c.IdCuenta) > 0) lista.push(c);
        });
    });
    (cobrosAcc || []).forEach(c => {
        if (Number(c.Importe) > 0 && Number(c.IdCuenta) > 0) lista.push(c);
    });
    return lista;
}

async function guardarVisitaUnificadaCg(el) {
    if (!CG.id) return;
    let $acc = $wsAccFromCg(el);
    if (!$acc.length) $acc = $h("cgWsEntregasAcc").find(".cg-ws-acc.is-open").last();
    const ent = $acc.length ? (activarLineasHubDesdeAccCg($acc) || entregaByUidCg($acc.attr("data-uid"))) : null;
    const ctx = $acc.length ? $acc : el;

    $wsLineasBodyCg(ctx).find(".cg-ws-linea").each(function () {
        const idx = Number($(this).data("idx"));
        const linea = lineasWsDeCg(ctx)[idx];
        if (!linea) return;
        leerCamposLineaWsDesdeDomCg($(this), linea);
    });
    if ($acc.length) {
        if (ent) {
            ent.Fecha = $acc.find(".ws-acc-fecha").val() || ent.Fecha;
            ent.IdEstablecimiento = Number($acc.find(".ws-acc-est").val()) || 0;
        }
        $h("cgCmFechaVisita").val($acc.find(".ws-acc-fecha").val() || "");
        $h("cgWsFechaEntrega").val($acc.find(".ws-acc-fecha").val() || "");
        $h("cgWsEstablecimiento").val($acc.find(".ws-acc-est").val() || "");
    }

    const lineas = (lineasWsDeCg(ctx) || []).filter(lineaConCantidadWsCg);
    const cobros = cobrosWsParaGuardarCg(ctx);
    const hayProductos = lineas.length > 0;
    const idEntrega = Number(ent?.Id) || 0;

    if (lineas.some(l => Number(l.TipoMovimiento) === 2 && !l.NoRetirado && !(Number(l.IdListaPrecio) > 0))) {
        errorModal("Seleccioná la lista / tipo de pago en las líneas de retiro.");
        return;
    }

    if (!actualizarAlertaDuplicadosLineasWsCg(ctx) || hayLineasDuplicadasWsCg(lineas)) {
        errorModal("No podés repetir una línea 100% igual (producto, tipo, lista, cantidad y precio). Si cambia algún dato, sí se permite.");
        const $a = $acc.length ? $acc.find(".ws-acc-dup") : $h("cgWsLineasDupAlert");
        if ($a.length && $a.offset()) {
            $("html, body").animate({ scrollTop: $a.offset().top - 100 }, 200);
        }
        return;
    }

    if (cobros.length && cobrosWsDeCg(ctx).some(c => Number(c.Importe) > 0 && !(Number(c.IdCuenta) > 0))) {
        errorModal("Cada cobro con importe debe tener una cuenta de caja.");
        return;
    }

    if (hayProductos) {
        const fecha = ($acc.find(".ws-acc-fecha").val() || $h("cgCmFechaVisita").val() || $h("cgWsFechaEntrega").val());
        if (!fecha) {
            errorModal("Indicá la fecha de la entrega.");
            return;
        }
        $h("cgWsFechaEntrega").val(fecha);
        const idEstWs = Number($acc.find(".ws-acc-est").val() || $h("cgWsEstablecimiento").val()) || hubIdEstablecimientoCg() || 0;
        if (idEstWs <= 0) {
            errorModal("Seleccioná el establecimiento de la entrega.");
            return;
        }

        const payload = {
            Id: idEntrega,
            Fecha: fecha,
            IdCliente: CG.id,
            IdEstablecimiento: idEstWs,
            IdContrato: ent?.IdContrato || null,
            IdEstado: ent?.IdEstado || null,
            IdCamion: ent?.IdCamion || null,
            NotaInterna: ent?.NotaInterna || `Desde control mensual${hubPropCg("hubMesSel") ? ` (${hubPropCg("hubMesSel").mes}/${hubPropCg("hubMesSel").anio})` : ""} · est ${idEstWs}`,
            NotaCliente: ent?.NotaCliente || null,
            Lineas: lineas.map(l => ({
                Id: Number(l.Id) || 0,
                IdProducto: l.IdProducto,
                IdListaPrecio: l.IdListaPrecio > 0 ? l.IdListaPrecio : null,
                TipoMovimiento: l.TipoMovimiento,
                NoRetirado: Number(l.TipoMovimiento) === 2 && !!l.NoRetirado,
                Cantidad: cantidadEfectivaWsCg(l),
                PrecioVenta: l.PrecioVenta,
                CostoUnitario: 0,
                PorcDescuento: Number(l.PorcDescuento) || 0,
                PorcIva: Number(l.PorcIva) || 0
            })),
            LineasRecuperadas: (ent?.LineasRecuperadas || []).map(l => ({
                Id: Number(l.Id) || 0,
                IdProducto: l.IdProducto,
                IdListaPrecio: l.IdListaPrecio > 0 ? l.IdListaPrecio : null,
                TipoMovimiento: 3,
                Cantidad: l.Cantidad,
                PrecioVenta: l.PrecioVenta,
                CostoUnitario: l.CostoUnitario || 0,
                PorcDescuento: l.PorcDescuento || 0,
                PorcIva: l.PorcIva || 0
            })),
            Cobros: cobros.map(c => ({
                IdCobro: Number(c.IdCobro) || 0,
                IdMovimientoCc: Number(c.IdMovimientoCc) || 0,
                IdCuenta: c.IdCuenta,
                Fecha: c.Fecha,
                Concepto: c.Concepto || "Cobro visita",
                Importe: c.Importe
            }))
        };

        let dataEnt;
        try {
            const url = idEntrega > 0 ? API_CG.entregaActualizar : API_CG.entregaInsertar;
            const method = idEntrega > 0 ? "PUT" : "POST";
            dataEnt = await fetchJsonCg(url, {
                method,
                headers: authCg(),
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error(e);
            errorModal(idEntrega > 0 ? "Error al actualizar la entrega." : "Error al registrar la entrega.");
            return;
        }
        if (!dataEnt?.valor) {
            errorModal(dataEnt?.mensaje || "No se pudo guardar la entrega.");
            return;
        }
    } else if (cobros.length) {
        errorModal("Los cobros de esta entrega necesitan al menos un producto. Para un cobro suelto usá «Cobro sin entrega».");
        return;
    } else if (idEntrega > 0) {
        errorModal("La entrega tiene que tener al menos un producto.");
        return;
    }

    const cobrosMesPlanilla = cobrosMesParaPlanillaCg(cobros, ent?.uid);
    if (cobrosMesPlanilla.length) {
        const { efectivo, transferencia } = clasificarAbonosDesdeCobrosWsCg(cobrosMesPlanilla);
        setImporteInputCg("#cgCmAbonoEfectivo", efectivo);
        setImporteInputCg("#cgCmAbonoTransferencia", transferencia);
        if (transferencia > 0 && !$h("cgCmFechaTransferencia").val()) {
            $h("cgCmFechaTransferencia").val(
                cobrosMesPlanilla.find(c => c.Fecha)?.Fecha || $h("cgCmFechaVisita").val() || "");
        }
    }

    try {
        await guardarControlMensualCg({ silent: true });
    } catch (e) {
        errorModal("No se pudo guardar la visita.");
        return;
    }

    exitoModal(idEntrega > 0
        ? "Entrega actualizada."
        : (hayProductos ? "Entrega registrada." : "Visita guardada."));

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

async function eliminarEntregaAccCg(el) {
    const $acc = $wsAccFromCg(el);
    const ent = entregaByUidCg($acc.attr("data-uid"));
    if (!ent) return;
    const id = Number(ent.Id) || 0;
    if (id > 0) {
        if (typeof ejecutarEliminacionEntidad !== "function") {
            errorModal("No está disponible el asistente de eliminación.");
            return;
        }
        const resultado = await ejecutarEliminacionEntidad({
            entidadLabel: `la entrega #${id}`,
            urlDependencias: `/ClientesEntregas/DependenciasEliminar?id=${id}`,
            urlEliminar: cascada => `/ClientesEntregas/Eliminar?id=${id}&cascada=${cascada ? "true" : "false"}`,
            headers: authCg(),
            fetchJson: fetchJsonCg
        });
        if (resultado.accion !== "ok") return;
    } else {
        setHubPropCg("wsEntregasMes", entregasMesListaCg().filter(x => x.uid !== ent.uid));
        if (!entregasMesListaCg().length) {
            const sel = hubPropCg("hubMesSel");
            if (sel) setHubPropCg("wsEntregasMes", [crearEntregaDraftMesCg(sel.anio, sel.mes, true)]);
        }
        renderEntregasMesAccCg();
        return;
    }
    exitoModal("Entrega eliminada.");
    CG.tabsLoaded.cuentaCorriente = false;
    if (isHubEstCg()) await cargarHubEstablecimientoCg(true);
    else await cargarHubDatosCg(true);
    if (hubPropCg("hubMesSel")) {
        await abrirWorkspaceMesCg(hubPropCg("hubMesSel").anio, hubPropCg("hubMesSel").mes, true);
        const sel = hubPropCg("hubMesSel");
        const filas = hubPropCg("controlFiltrado")?.Filas || [];
        const m = filas.find(x => Number(x.Mes) === Number(sel.mes) && Number(x.Anio || CG.controlAnio) === Number(sel.anio));
        const sinMov = !m || ((Number(m.Entregadas) || 0) === 0 && (Number(m.Retiradas) || 0) === 0);
        const hayAbono = !!m && ((Number(m.AbonoEfectivo) || 0) > 0 || (Number(m.AbonoTransferencia) || 0) > 0);
        if (sinMov && hayAbono) {
            await vaciarAbonosMesCg({ silent: true });
        }
    }
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
        isHubEstCg()
            ? `Deuda vencida (más de 1 mes): ${fmtMoneyCg(totalBase)}. Tocá un mes para ver el detalle, o el ícono verde para reclamar ese período.`
            : `Deuda vencida (más de 1 mes): ${fmtMoneyCg(totalBase)}. Tocá un mes para abrir el detalle o cargar interés.`
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
        const reclamar = isHubEstCg()
            ? `<button type="button" class="cg-atraso-chip-reclamar" data-anio="${x.anio}" data-mes="${x.mes}" title="Reclamar ${escapeCg(x.mesNombre)} ${x.anio}">
                <i class="fa fa-whatsapp"></i>
            </button>`
            : "";
        return `<div class="cg-atraso-chip-wrap">
            <button type="button" class="cg-atraso-chip${active}" data-anio="${x.anio}" data-mes="${x.mes}">
                <span class="cg-atraso-chip-mes">${escapeCg(x.mesNombre)} ${x.anio}</span>
                <span class="cg-atraso-chip-monto rp-money-out">${fmtMoneyCg(x.base)}</span>
                ${intBadge}
            </button>
            ${reclamar}
        </div>`;
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

function celdaFechaVisitaCg(m, anio, enCard) {
    const txt = formatearFechaCortaCg(m.FechaVisita) || "—";
    const wrap = enCard ? "cg-cm-visita-cell cg-cm-visita-card" : "cg-cm-visita-cell";
    const label = enCard ? `<span class="cg-cm-visita-label">Visita:</span>` : "";
    return `<div class="${wrap}">
        ${label}
        <span class="cg-cm-visita-txt">${escapeCg(txt)}</span>
    </div>`;
}

function limitesMesIsoCg(anio, mes) {
    const last = new Date(anio, mes, 0).getDate();
    const mm = String(mes).padStart(2, "0");
    return {
        min: `${anio}-${mm}-01`,
        max: `${anio}-${mm}-${String(last).padStart(2, "0")}`
    };
}

function isoADdMmYyyyCg(iso) {
    const s = (iso || "").toString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
}

function ddMmYyyyAIsoCg(txt) {
    const raw = (txt || "").trim();
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    let d, m, y;
    const slash = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (slash) {
        d = Number(slash[1]);
        m = Number(slash[2]);
        y = Number(slash[3]);
    } else {
        const digits = raw.replace(/\D/g, "");
        if (digits.length !== 8) return "";
        d = Number(digits.slice(0, 2));
        m = Number(digits.slice(2, 4));
        y = Number(digits.slice(4, 8));
    }
    if (!y || m < 1 || m > 12 || d < 1 || d > 31) return "";
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return "";
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function fechaPerteneceAlMesCg(iso, anio, mes) {
    if (!iso || iso.length < 10) return false;
    const [y, m] = iso.split("-").map(Number);
    return y === Number(anio) && m === Number(mes);
}

function isoDefaultVisitaMesCg(anio, mes, fechaExistente) {
    const existente = fechaInputCg(fechaExistente);
    if (existente && fechaPerteneceAlMesCg(existente, anio, mes)) return existente;
    const { min, max } = limitesMesIsoCg(anio, mes);
    const hoy = new Date();
    const last = Number(max.slice(8));
    const day = String(Math.min(Math.max(hoy.getDate(), 1), last)).padStart(2, "0");
    const cand = `${anio}-${String(mes).padStart(2, "0")}-${day}`;
    if (cand < min) return min;
    if (cand > max) return max;
    return cand;
}

function enmascararFechaCortaInputCg(el) {
    const digits = (el.value || "").replace(/\D/g, "").slice(0, 8);
    let next = digits;
    if (digits.length > 4) next = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) next = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    if (el.value !== next) el.value = next;
}

function abrirCalendarioFechaVisitaCg(btn) {
    const picker = $(btn).closest(".cg-cm-visita-editor").find(".cg-cm-visita-picker").get(0);
    if (!picker) return;
    const iso = ddMmYyyyAIsoCg($(btn).closest(".cg-cm-visita-editor").find(".cg-cm-visita-input").val());
    if (iso) picker.value = iso;
    try {
        if (typeof picker.showPicker === "function") picker.showPicker();
        else picker.click();
    } catch {
        picker.click();
    }
}

function iniciarEdicionFechaVisitaCg(btn) {
    const $btn = $(btn);
    const anio = Number($btn.data("anio"));
    const mes = Number($btn.data("mes"));
    if (!anio || !mes) return;

    const $cell = $btn.closest(".cg-cm-visita-cell");
    if (!$cell.length || $cell.hasClass("is-editing")) return;

    $(".cg-cm-visita-cell.is-editing").each(function () {
        if (this !== $cell[0]) cancelarEdicionFechaVisitaCg(this);
    });

    const filas = hubPropCg("controlFiltrado")?.Filas || [];
    const m = filas.find(x => Number(x.Mes) === mes && Number(x.Anio || CG.controlAnio) === anio);
    const lim = limitesMesIsoCg(anio, mes);
    const iso = isoDefaultVisitaMesCg(anio, mes, m?.FechaVisita);

    $cell.data("prev-html", $cell.html());
    $cell.addClass("is-editing");
    $cell.html(`
        <div class="cg-cm-visita-editor" data-anio="${anio}" data-mes="${mes}">
            <input type="text" class="cg-cm-visita-input" inputmode="numeric" autocomplete="off" maxlength="10"
                   placeholder="dd/mm/aaaa" value="${isoADdMmYyyyCg(iso)}" aria-label="Fecha de visita">
            <input type="date" class="cg-cm-visita-picker" min="${lim.min}" max="${lim.max}" value="${iso}" tabindex="-1" aria-hidden="true">
            <button type="button" class="cg-cm-visita-btn cg-cm-visita-cal" title="Calendario">
                <i class="fa fa-calendar" aria-hidden="true"></i>
            </button>
            <button type="button" class="cg-cm-visita-btn cg-cm-visita-ok" title="Aceptar">
                <i class="fa fa-check" aria-hidden="true"></i>
            </button>
            <button type="button" class="cg-cm-visita-btn cg-cm-visita-cancel" title="Cancelar">
                <i class="fa fa-times" aria-hidden="true"></i>
            </button>
        </div>`);
    const input = $cell.find(".cg-cm-visita-input").get(0);
    if (input) {
        input.focus();
        input.select();
    }
}

function cancelarEdicionFechaVisitaCg(el) {
    const $cell = $(el).closest(".cg-cm-visita-cell");
    const prev = $cell.data("prev-html");
    $cell.removeClass("is-editing");
    if (prev) $cell.html(prev);
}

async function guardarFechaVisitaInlineCg(el) {
    const $ed = $(el).closest(".cg-cm-visita-editor");
    if (!$ed.length || $ed.data("saving")) return;

    const anio = Number($ed.data("anio"));
    const mes = Number($ed.data("mes"));
    const fecha = ddMmYyyyAIsoCg($ed.find(".cg-cm-visita-input").val());
    if (!anio || !mes) return;
    if (!fecha) {
        errorModal("Indicá la fecha de la visita (dd/mm/aaaa).");
        $ed.find(".cg-cm-visita-input").trigger("focus");
        return;
    }
    if (!fechaPerteneceAlMesCg(fecha, anio, mes)) {
        const nom = (MES_NOMBRES_CG[mes] || "ese mes").toLowerCase();
        errorModal(`Solo se pueden elegir días de ${nom} ${anio}.`);
        $ed.find(".cg-cm-visita-input").trigger("focus");
        return;
    }

    const filas = hubPropCg("controlFiltrado")?.Filas || [];
    const m = filas.find(x => Number(x.Mes) === mes && Number(x.Anio || CG.controlAnio) === anio);
    if (!m) {
        errorModal("No se encontró el mes para actualizar la fecha.");
        return;
    }

    const actual = fechaInputCg(m.FechaVisita);
    if (actual === fecha) {
        cancelarEdicionFechaVisitaCg(el);
        return;
    }

    $ed.data("saving", true);
    $ed.find("input, button").prop("disabled", true);

    const modelo = {
        Id: Number(m.IdControl) || 0,
        IdCliente: CG.id,
        IdEstablecimiento: hubIdEstablecimientoCg(),
        Anio: anio,
        Mes: mes,
        FechaVisita: parseFechaCg(fecha),
        SinEntrega: !!m.SinEntrega,
        CajasAFavor: parseInt(m.CajasAFavor, 10) || 0,
        Observaciones: (m.Observaciones || "").trim() || null,
        AbonoEfectivo: Number(m.AbonoEfectivo) || 0,
        AbonoTransferencia: Number(m.AbonoTransferencia) || 0,
        FechaTransferencia: parseFechaCg(fechaInputCg(m.FechaTransferencia))
    };

    try {
        const data = await fetchJsonCg(API_CG.guardarControlMensual, {
            method: "POST",
            headers: authCg(),
            body: JSON.stringify(modelo)
        });

        if (!data?.valor) {
            errorModal(data?.mensaje || "No se pudo actualizar la fecha de visita.");
            $ed.data("saving", false);
            $ed.find("input, button").prop("disabled", false);
            return;
        }

        m.FechaVisita = fecha;
        const sel = hubPropCg("hubMesSel");
        if (sel && Number(sel.anio) === anio && Number(sel.mes) === mes) {
            $h("cgCmFechaVisita").val(fecha);
            $h("cgWsFechaEntrega").val(fecha);
        }

        if (typeof exitoModal === "function") exitoModal("Fecha de visita actualizada.");

        if (isHubEstCg()) {
            await cargarHubEstablecimientoCg(true);
        } else {
            CG.tabsLoaded.controlMensual = false;
            await cargarTabControlMensual(true);
        }
        if (hubPropCg("hubMesSel")) {
            await abrirWorkspaceMesCg(hubPropCg("hubMesSel").anio, hubPropCg("hubMesSel").mes, true);
        }
    } catch (e) {
        console.error(e);
        errorModal("No se pudo actualizar la fecha de visita.");
        $ed.data("saving", false);
        $ed.find("input, button").prop("disabled", false);
    }
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
    const $reclamo = $h("btnReclamoMesHub");
    if ($reclamo.length) {
        const rest = Number(m?.RestanteMes != null ? m.RestanteMes : ((Number(m?.Debe) || 0) - (Number(m?.Haber) || 0))) || 0;
        $reclamo.toggleClass("d-none", !(isHubEstCg() && rest > 0.009));
    }
    const $btn = $h("btnInteresMesHub");
    if (!$btn.length) return;
    const ok = puedeCargarInteresMesCg(m, anio, mes);
    $btn.toggleClass("d-none", !ok);

    const cant = Number(m?.CantidadIntereses) || 0;
    const $ver = $h("btnVerInteresesMesHub");
    // Siempre visible en el detalle del mes (cliente y establecimiento).
    $ver.removeClass("d-none");
    $ver.html(cant > 0
        ? `<i class="fa fa-eye"></i> Ver intereses (${cant})`
        : `<i class="fa fa-eye"></i> Ver intereses`);
}

function abrirModalInteresesHistCg(anioFiltro, mesFiltro) {
    CG.interesesHistAnio = anioFiltro != null ? Number(anioFiltro) : null;
    CG.interesesHistMes = mesFiltro != null ? Number(mesFiltro) : null;

    const todos = Array.isArray(hubPropCg("controlFiltrado")?.Intereses) ? hubPropCg("controlFiltrado").Intereses : [];
    const filtrar = CG.interesesHistAnio != null && CG.interesesHistMes != null;
    const lista = filtrar
        ? interesesDelMesCg(CG.interesesHistAnio, CG.interesesHistMes)
        : todos.slice().sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime());

    const m = filtrar
        ? (hubPropCg("controlFiltrado")?.Filas || []).find(x =>
            Number(x.Mes) === CG.interesesHistMes && Number(x.Anio || CG.controlAnio) === CG.interesesHistAnio)
        : null;
    if (filtrar) {
        const nom = m?.MesNombre || `Mes ${CG.interesesHistMes}`;
        $("#cgInteresesHistSub").text(
            isHubEstCg()
                ? `${nom} ${CG.interesesHistAnio} · este establecimiento`
                : `${nom} ${CG.interesesHistAnio} · todos los establecimientos`
        );
    } else {
        $("#cgInteresesHistSub").text(
            isHubEstCg()
                ? "Intereses de este establecimiento"
                : "Todos los intereses del cliente (con establecimiento)"
        );
    }

    const total = lista.reduce((s, x) => s + (Number(x.Importe) || 0), 0);
    CG.interesesHistTotal = total;
    const filasPlanilla = hubPropCg("controlFiltrado")?.Filas || [];
    const conInt = filasPlanilla.filter(f => (Number(f.CantidadIntereses) || 0) > 0).length;
    const atrasados = listarMesesAtrasadosCg(filasPlanilla);
    const atrasadosSinInt = atrasados.filter(a => {
        const f = filasPlanilla.find(x => Number(x.Anio || CG.controlAnio) === a.anio && Number(x.Mes) === a.mes);
        return !(Number(f?.CantidadIntereses) || 0);
    });

    $("#cgInteresesHistResumen").html(
        filtrar
            ? htmlResumenMesInteresHistCg(m, lista.length, total)
            : `<div class="cg-interes-hist-kpis">
            <div><span>Cargas</span><strong>${lista.length}</strong></div>
            <div><span>Total</span><strong class="rp-money-out">${fmtMoneyCg(total)}</strong></div>
            <div><span>Meses con interés</span><strong>${conInt}</strong></div>
            <div><span>Atrasados sin interés</span><strong class="${atrasadosSinInt.length ? "rp-money-out" : ""}">${atrasadosSinInt.length}</strong></div>
        </div>
        ${atrasadosSinInt.length ? `
            <div class="cg-interes-hist-pendientes">
                <strong>Atrasados sin interés cargado:</strong>
                <div class="cg-interes-hist-chips">
                    ${atrasadosSinInt.map(x =>
                        `<button type="button" class="cg-atraso-chip" data-anio="${x.anio}" data-mes="${x.mes}">
                            <span class="cg-atraso-chip-mes">${escapeCg(x.mesNombre)} ${x.anio}</span>
                            <span class="cg-atraso-chip-monto rp-money-out">${fmtMoneyCg(x.base)}</span>
                        </button>`).join("")}
                </div>
            </div>` : ""}`
    );

    const partesBody = [];
    if (!lista.length) {
        partesBody.push(`<div class="cg-hub-stock-empty">No hay intereses cargados${filtrar ? " en este mes" : ""}${isHubEstCg() ? " para este establecimiento" : ""}.</div>`);
    } else {
        const mostrarEst = !isHubEstCg();
        partesBody.push(`
            <table class="cg-hub-prod-table cg-interes-hist-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Mes ref.</th>
                        ${mostrarEst ? "<th>Establecimiento</th>" : ""}
                        <th>Concepto</th>
                        <th class="text-end">Importe</th>
                        <th class="text-center" style="width:7rem">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${lista.map(i => {
                        const id = Number(i.Id) || 0;
                        const mesRef = i.MesNombreRef
                            ? `${escapeCg(i.MesNombreRef)} ${i.AnioRef || ""}`
                            : (i.AnioRef && i.MesRef ? `${i.MesRef}/${i.AnioRef}` : "—");
                        const conceptoEdit = conceptoInteresSinTagCg(i.Concepto || "");
                        const importeEdit = fmtImporteInputCg(i.Importe);
                        const disabled = id <= 0 ? "disabled" : "";
                        const idEst = Number(i.IdEstablecimiento ?? i.idEstablecimiento) || 0;
                        const estNom = (
                            i.Establecimiento
                            || i.establecimiento
                            || (idEst > 0 ? `Est. #${idEst}` : "Cliente (general)")
                        ).toString().trim();
                        return `<tr class="cg-interes-hist-row" data-id="${id}" data-anio-ref="${i.AnioRef || ""}" data-mes-ref="${i.MesRef || ""}" data-est-id="${idEst || ""}" data-concepto-orig="${escapeCg(conceptoEdit)}" data-importe-orig="${Number(i.Importe) || 0}">
                            <td>${formatearFechaCortaCg(i.Fecha)}</td>
                            <td>${mesRef}</td>
                            ${mostrarEst ? `<td><span class="cg-interes-hist-est">${escapeCg(estNom)}</span></td>` : ""}
                            <td>
                                <input type="text" class="form-control form-control-sm cg-interes-hist-concepto" value="${escapeCg(conceptoEdit)}" ${disabled} maxlength="160" />
                            </td>
                            <td class="text-end">
                                <input type="text" class="form-control form-control-sm text-end cg-interes-hist-importe" value="${escapeCg(importeEdit)}" ${disabled} inputmode="decimal" />
                            </td>
                            <td class="text-center cg-interes-hist-actions">
                                <button type="button" class="cg-btn cg-btn--ghost cg-btn--sm cg-interes-hist-save" title="Guardar cambios" ${disabled}>
                                    <i class="fa fa-save"></i>
                                </button>
                                <button type="button" class="cg-btn cg-btn--danger-ghost cg-btn--sm cg-interes-hist-del" title="Eliminar y revertir interés" ${disabled}>
                                    <i class="fa fa-trash"></i>
                                </button>
                            </td>
                        </tr>`;
                    }).join("")}
                </tbody>
            </table>`);
    }
    if (filtrar) partesBody.push(htmlAltaInteresHistCg(CG.interesesHistAnio, CG.interesesHistMes));
    $("#cgInteresesHistBody").html(partesBody.join(""));

    $("#cgInteresesHistResumen").off("click.cgIntHist").on("click.cgIntHist", ".cg-atraso-chip", function () {
        const anio = Number($(this).data("anio"));
        const mes = Number($(this).data("mes"));
        CG.modalInteresesHist?.hide();
        mostrarDetalleMesHub(anio, mes);
    });

    $("#cgInteresesHistBody")
        .off(".cgIntHist")
        .on("click.cgIntHist", ".cg-interes-hist-save", busyHandler(function () {
            const $tr = $(this).closest("tr");
            return guardarInteresHistCg($tr);
        }))
        .on("click.cgIntHist", ".cg-interes-hist-del", busyHandler(function () {
            const $tr = $(this).closest("tr");
            return eliminarInteresHistCg($tr);
        }))
        .on("click.cgIntHist", "#btnMostrarAltaInteresHist", () => mostrarAltaInteresHistCg())
        .on("click.cgIntHist", "#btnHistNuevoInteres", busyHandler(() => agregarInteresDesdeHistCg()))
        .on("input.cgIntHist change.cgIntHist keyup.cgIntHist", "#cgHistNuevoBase", () => syncAltaInteresHistCamposCg("base"))
        .on("input.cgIntHist change.cgIntHist keyup.cgIntHist", "#cgHistNuevoPct", () => syncAltaInteresHistCamposCg("pct"));

    CG.modalInteresesHist?.show();
}

function htmlAltaInteresHistCg(anio, mes) {
    const modo = CG.interesHubMode || (isHubEstCg() ? "est" : "cliente");
    const mostrarEst = modo !== "est";
    return `
        <div class="cg-interes-hist-alta-wrap">
            <button type="button" class="cg-btn cg-btn--primary cg-btn--sm" id="btnMostrarAltaInteresHist">
                <i class="fa fa-plus"></i> Añadir interés
            </button>
            <div class="cg-interes-hist-alta d-none" id="cgHistAltaPanel">
                <div class="cg-interes-hist-alta-title"><i class="fa fa-plus"></i> Nuevo interés</div>
            <div class="row g-2 align-items-end">
                <div class="col-md-3">
                    <label class="form-label">Fecha</label>
                    <input type="date" id="cgHistNuevoFecha" class="form-control form-control-sm" />
                </div>
                <div class="col-md-3">
                    <label class="form-label">Base</label>
                    <input type="text" id="cgHistNuevoBase" class="form-control form-control-sm text-end Inputmiles"
                           inputmode="decimal" autocomplete="off"
                           title="Deuda o monto sobre el que se aplica el %." />
                </div>
                <div class="col-md-2">
                    <label class="form-label">% interés</label>
                    <input type="number" id="cgHistNuevoPct" class="form-control form-control-sm" min="0" step="0.01" />
                </div>
                <div class="col-md-4">
                    <label class="form-label">Importe</label>
                    <input type="text" id="cgHistNuevoImporte" class="form-control form-control-sm text-end" readonly tabindex="-1"
                           title="Se calcula solo: Base × % / 100. Es lo que se va a cobrar." />
                </div>
                ${mostrarEst ? `<div class="col-md-4">
                    <label class="form-label">Establecimiento</label>
                    <select id="cgHistNuevoEstablecimiento" class="form-select form-select-sm">
                        <option value="">Cliente (general)</option>
                    </select>
                </div>` : `<input type="hidden" id="cgHistNuevoEstablecimiento" value="" />`}
                <div class="col-12">
                    <label class="form-label">Concepto</label>
                    <input type="text" id="cgHistNuevoConcepto" class="form-control form-control-sm" maxlength="160" />
                </div>
                <div class="col-12 d-flex justify-content-end">
                    <button type="button" class="cg-btn cg-btn--primary cg-btn--sm" id="btnHistNuevoInteres">
                        <i class="fa fa-check"></i> Guardar interés
                    </button>
                </div>
            </div>
        </div>
        </div>`;
}

function fmtPctAltaHistCg(valor) {
    const n = Math.round((Number(valor) || 0) * 100) / 100;
    return Number.isFinite(n) ? String(n) : "";
}

function roundMoneyAltaHistCg(valor) {
    return Math.round((Number(valor) || 0) * 100) / 100;
}

function filaMesInteresHistCg(anio, mes) {
    return (hubPropCg("controlFiltrado")?.Filas || []).find(x =>
        Number(x.Mes) === Number(mes) && Number(x.Anio || CG.controlAnio) === Number(anio));
}

function htmlResumenMesInteresHistCg(m, cargas, totalCargas) {
    const totalMes = Number(m?.TotalMes != null ? m.TotalMes : ((Number(m?.Debe) || 0) + (Number(m?.TotalIntereses) || 0))) || 0;
    const pagado = Number(m?.Haber) || 0;
    const restante = Number(m?.RestanteMes != null ? m.RestanteMes : (totalMes - pagado)) || 0;
    const deuda = baseAdeudadaMesCg(m);
    const saldo = Number(m?.Saldo) || 0;
    const clsRest = typeof clsSaldoDeudaMoney === "function" ? clsSaldoDeudaMoney(restante) : "";
    const clsDeuda = typeof clsSaldoDeudaMoney === "function" ? clsSaldoDeudaMoney(deuda) : "";
    const clsAcum = typeof clsSaldoDeudaMoney === "function" ? clsSaldoDeudaMoney(saldo) : "";
    const anio = Number(m?.Anio || CG.interesesHistAnio);
    const mes = Number(m?.Mes || CG.interesesHistMes);
    const atrasado = m ? puedeCargarInteresMesCg(m, anio, mes) : false;
    const mesNom = m?.MesNombre || `Mes ${mes}`;

    return `
        <div class="cg-interes-hist-mesbox">
            <div class="cg-interes-hist-mesbox-head">
                <div>
                    <span class="cg-interes-hist-mesbox-kicker">Situación del mes</span>
                    <strong>${escapeCg(mesNom)} ${anio || ""}</strong>
                </div>
                ${atrasado ? `<span class="cg-interes-hist-mesbox-badge"><i class="fa fa-exclamation-triangle"></i> Atrasado</span>` : ""}
            </div>
            <div class="cg-interes-hist-mesbox-grid">
                <div class="cg-interes-hist-mesbox-kpi cg-interes-hist-mesbox-kpi--monto" title="Retiros del mes + intereses">
                    <span>Monto del mes</span>
                    <strong class="cg-val-debe">${fmtMoneyCg(totalMes)}</strong>
                </div>
                <div class="cg-interes-hist-mesbox-kpi cg-interes-hist-mesbox-kpi--pagado" title="Cobros / abonos del mes">
                    <span>Pagado</span>
                    <strong class="cg-val-haber">${fmtMoneyCg(pagado)}</strong>
                </div>
                <div class="cg-interes-hist-mesbox-kpi cg-interes-hist-mesbox-kpi--deuda" title="Total mes − pagado">
                    <span>Debe / restante</span>
                    <strong class="${clsRest}">${fmtMoneyCg(restante)}</strong>
                </div>
                <div class="cg-interes-hist-mesbox-kpi" title="Saldo adeudado vencido sobre el que se calcula el interés">
                    <span>Base interés</span>
                    <strong class="${clsDeuda}">${fmtMoneyCg(deuda)}</strong>
                </div>
                <div class="cg-interes-hist-mesbox-kpi cg-interes-hist-mesbox-kpi--int" title="Intereses ya cargados a este mes">
                    <span>Intereses</span>
                    <strong class="rp-money-out">${fmtMoneyCg(totalCargas)}</strong>
                    <em>${cargas} carga${cargas === 1 ? "" : "s"}</em>
                </div>
                <div class="cg-interes-hist-mesbox-kpi cg-interes-hist-mesbox-kpi--acum" title="Deuda o saldo a favor acumulado al cierre">
                    <span>Saldo acum.</span>
                    <strong class="${clsAcum}">${fmtMoneyCg(saldo)}</strong>
                </div>
            </div>
        </div>`;
}

function mostrarAltaInteresHistCg() {
    const anio = CG.interesesHistAnio;
    const mes = CG.interesesHistMes;
    const m = filaMesInteresHistCg(anio, mes);
    const mesNom = m?.MesNombre || `Mes ${mes}`;
    $("#btnMostrarAltaInteresHist").addClass("d-none");
    $("#cgHistAltaPanel").removeClass("d-none");
    $("#cgHistNuevoFecha").val(new Date().toISOString().slice(0, 10));
    $("#cgHistNuevoBase").val("");
    $("#cgHistNuevoPct").val("");
    $("#cgHistNuevoImporte").val("0");
    $("#cgHistNuevoConcepto").val(`Interés por atraso ${mesNom} ${anio}`);
    llenarEstAltaInteresHistCg();
}

function escribirImporteAltaHistCg(selector, valor) {
    const n = roundMoneyAltaHistCg(valor);
    const $el = $(selector);
    const esImporteCalc = selector === "#cgHistNuevoImporte";
    if (n <= 0) {
        $el.val(esImporteCalc ? "0" : "");
        return;
    }
    $el.val(n.toLocaleString("es-AR", {
        minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
        maximumFractionDigits: 2
    }));
}

function leerCampoAltaHistCg(selector) {
    const raw = $(selector).val();
    if (raw == null || String(raw).trim() === "") return 0;
    if (typeof parseNumero === "function") return parseNumero(raw) || 0;
    const n = parseFloat(String(raw).replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

function baseRefAltaInteresHistCg() {
    const m = filaMesInteresHistCg(CG.interesesHistAnio, CG.interesesHistMes);
    const deuda = baseAdeudadaMesCg(m);
    if (deuda > 0.009) return deuda;
    const totalMes = Number(m?.TotalMes != null ? m.TotalMes : ((Number(m?.Debe) || 0) + (Number(m?.TotalIntereses) || 0))) || 0;
    if (totalMes > 0.009) return totalMes;
    return Number(CG.interesesHistTotal) || 0;
}

function lockSyncAltaInteresHistCg() {
    CG._syncAltaInteresHist = true;
    CG._syncAltaInteresHistGen = (CG._syncAltaInteresHistGen || 0) + 1;
    const gen = CG._syncAltaInteresHistGen;
    return () => {
        window.setTimeout(() => {
            if (CG._syncAltaInteresHistGen === gen) CG._syncAltaInteresHist = false;
        }, 50);
    };
}

function syncAltaInteresHistCamposCg(origen) {
    if (CG._syncAltaInteresHist) return;
    const unlock = lockSyncAltaInteresHistCg();
    try {
        let base = leerCampoAltaHistCg("#cgHistNuevoBase");
        let pct = leerCampoAltaHistCg("#cgHistNuevoPct");

        if (origen === "base") {
            if (base <= 0.009) {
                escribirImporteAltaHistCg("#cgHistNuevoImporte", 0);
                return;
            }
            if (pct <= 0) {
                pct = leerPctInteresDefaultCg();
                $("#cgHistNuevoPct").val(fmtPctAltaHistCg(pct));
            }
        }

        if (origen === "pct") {
            if (pct <= 0) {
                escribirImporteAltaHistCg("#cgHistNuevoImporte", 0);
                return;
            }
            if (base <= 0.009) {
                base = baseRefAltaInteresHistCg();
                if (base > 0.009) escribirImporteAltaHistCg("#cgHistNuevoBase", base);
            }
        }

        if (base > 0.009 && pct > 0) {
            escribirImporteAltaHistCg("#cgHistNuevoImporte", base * pct / 100);
        } else {
            escribirImporteAltaHistCg("#cgHistNuevoImporte", 0);
        }
    } finally {
        unlock();
    }
}

async function llenarEstAltaInteresHistCg() {
    const $sel = $("#cgHistNuevoEstablecimiento");
    if (!$sel.length) return;

    const modo = CG.interesHubMode || (isHubEstCg() ? "est" : "cliente");
    if (modo === "est") {
        const idEst = hubIdEstablecimientoCg() || (idsEstablecimientoSeleccionadosCg()[0] || 0);
        $sel.val(idEst || "");
        return;
    }

    if ($sel.is("select")) {
        let lista = Array.isArray(CG.establecimientos) ? CG.establecimientos : [];
        if (!lista.length && CG.id) {
            try {
                lista = await fetchJsonCg(API_CG.establecimientosPorCliente(CG.id), { headers: authCg() }) || [];
                CG.establecimientos = lista;
            } catch { lista = []; }
        }
        const opts = [`<option value="">Cliente (general)</option>`]
            .concat(lista.map(e => {
                const id = Number(e.Id ?? e.id) || 0;
                if (!id) return "";
                const nom = (e.Nombre ?? e.nombre ?? `Est. #${id}`).toString().trim();
                return `<option value="${id}">${escapeCg(nom)}</option>`;
            }).filter(Boolean));
        $sel.html(opts.join(""));
        const idSel = hubIdEstablecimientoCg() || (idsEstablecimientoSeleccionadosCg()[0] || 0);
        if (idSel) $sel.val(String(idSel));
    }
}

async function agregarInteresDesdeHistCg() {
    if (!CG.id) {
        errorModal("Seleccione un cliente.");
        return;
    }

    const anioRef = Number(CG.interesesHistAnio) || null;
    const mesRef = Number(CG.interesesHistMes) || null;
    if (!anioRef || !mesRef) {
        errorModal("Abrí el detalle de un mes para agregar el interés.");
        return;
    }

    const importe = leerImporteDesdeTextoCg($("#cgHistNuevoImporte").val());
    const concepto = ($("#cgHistNuevoConcepto").val() || "").trim();
    const fecha = $("#cgHistNuevoFecha").val();
    const pct = Number($("#cgHistNuevoPct").val()) || 0;

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

    const modoInteres = CG.interesHubMode || (isHubEstCg() ? "est" : "cliente");
    let idEstInteres = 0;
    if (modoInteres === "est") {
        idEstInteres = hubIdEstablecimientoCg() || (idsEstablecimientoSeleccionadosCg()[0] || 0);
    } else {
        idEstInteres = parseInt($("#cgHistNuevoEstablecimiento").val(), 10) || 0;
    }

    const data = await fetchJsonCg(API_CG.ccRegistrarInteres, {
        method: "POST",
        headers: authCg(),
        body: JSON.stringify({
            IdCliente: CG.id,
            Fecha: fecha,
            Concepto: concepto,
            Importe: importe,
            AnioRef: anioRef,
            MesRef: mesRef,
            IdEstablecimiento: idEstInteres > 0 ? idEstInteres : null
        })
    });

    if (!data?.valor) {
        errorModal(data?.mensaje || "No se pudo registrar el interés.");
        return;
    }

    guardarPctInteresDefaultCg(pct);
    exitoModal(data.mensaje || "Interés registrado.");
    await refrescarTrasCambioInteresCg();
}

function conceptoInteresSinTagCg(concepto) {
    return String(concepto || "")
        .replace(/\s*[·•]\s*ref:\d{4}-\d{2}\s*/gi, " ")
        .replace(/\s*ref:\d{4}-\d{2}\s*/gi, " ")
        .replace(/\s*[·•]\s*est:\d+\s*/gi, " ")
        .replace(/\s*est:\d+\s*/gi, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function fmtImporteInputCg(valor) {
    const n = Number(valor) || 0;
    if (n === 0) return "";
    return n.toLocaleString("es-AR", {
        minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
        maximumFractionDigits: 2
    });
}

function leerImporteDesdeTextoCg(raw) {
    if (raw == null || String(raw).trim() === "") return 0;
    if (typeof parseNumero === "function") return parseNumero(raw) || 0;
    if (typeof formatearSinMiles === "function") return formatearSinMiles(raw) || 0;
    const n = parseFloat(String(raw).replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

async function refrescarTrasCambioInteresCg() {
    CG.tabsLoaded.controlMensual = false;
    CG.tabsLoaded.cuentaCorriente = false;
    const modo = CG.interesHubMode || (isHubEstCg() ? "est" : "cliente");
    const mesKeep = hubPropCg("hubMesSel");

    if (modo === "est") {
        await withHubModeCg("est", async () => {
            await cargarTabControlMensual(true, idsEstablecimientoSeleccionadosCg());
            if (mesKeep) {
                setHubPropCg("hubMesSel", { anio: Number(mesKeep.anio), mes: Number(mesKeep.mes) });
                try { await abrirWorkspaceMesCg(Number(mesKeep.anio), Number(mesKeep.mes), true); } catch { /* opcional */ }
            }
        });
        try {
            await withHubModeCg("cliente", async () => {
                CG.tabsLoaded.controlMensual = false;
                await cargarTabControlMensual(true, null);
            });
        } catch { /* opcional */ }
    } else {
        await withHubModeCg("cliente", async () => {
            await cargarTabControlMensual(true, null);
            if (mesKeep) {
                setHubPropCg("hubMesSel", { anio: Number(mesKeep.anio), mes: Number(mesKeep.mes) });
                try { await abrirWorkspaceMesCg(Number(mesKeep.anio), Number(mesKeep.mes), true); } catch { /* opcional */ }
            }
        });
    }

    if (typeof cargarTabCuentaCorriente === "function") {
        try { await cargarTabCuentaCorriente(true); } catch { /* opcional */ }
    }
    abrirModalInteresesHistCg(CG.interesesHistAnio, CG.interesesHistMes);
}

async function guardarInteresHistCg($tr) {
    const id = Number($tr.data("id")) || 0;
    if (id <= 0) {
        errorModal("Este interés no se puede editar (sin Id). Recargá la planilla.");
        return;
    }

    const concepto = ($tr.find(".cg-interes-hist-concepto").val() || "").trim();
    const importe = leerImporteDesdeTextoCg($tr.find(".cg-interes-hist-importe").val());
    const anioRef = Number($tr.data("anio-ref")) || null;
    const mesRef = Number($tr.data("mes-ref")) || null;
    const idEst = Number($tr.data("est-id")) || 0;

    if (!concepto) {
        errorModal("El concepto es obligatorio.");
        return;
    }
    if (importe <= 0) {
        errorModal("El importe debe ser mayor a cero.");
        return;
    }

    const data = await fetchJsonCg(API_CG.ccActualizarInteres, {
        method: "POST",
        headers: authCg(),
        body: JSON.stringify({
            Id: id,
            Concepto: concepto,
            Importe: importe,
            AnioRef: anioRef,
            MesRef: mesRef,
            IdEstablecimiento: idEst > 0 ? idEst : null
        })
    });

    if (!data?.valor) {
        errorModal(data?.mensaje || "No se pudo actualizar el interés.");
        return;
    }

    exitoModal(data.mensaje || "Interés actualizado.");
    await refrescarTrasCambioInteresCg();
}

async function eliminarInteresHistCg($tr) {
    const id = Number($tr.data("id")) || 0;
    if (id <= 0) {
        errorModal("Este interés no se puede eliminar (sin Id). Recargá la planilla.");
        return;
    }

    const concepto = ($tr.find(".cg-interes-hist-concepto").val() || "").trim() || "este interés";
    const histVisible = $("#modalInteresesHistCg").hasClass("show");
    if (histVisible && CG.modalInteresesHist) {
        try { CG.modalInteresesHist.hide(); } catch { /* noop */ }
    }
    const ok = typeof confirmarModal === "function"
        ? await confirmarModal(`¿Eliminar "${concepto}" y revertir el cargo en cuenta corriente?`)
        : confirm(`¿Eliminar "${concepto}" y revertir el cargo en cuenta corriente?`);
    if (!ok) {
        if (histVisible) abrirModalInteresesHistCg(CG.interesesHistAnio, CG.interesesHistMes);
        return;
    }

    const data = await fetchJsonCg(API_CG.ccEliminar(id), { method: "DELETE", headers: authCg() });
    if (!data?.valor) {
        errorModal(data?.mensaje || "No se pudo eliminar el interés.");
        return;
    }

    exitoModal(data.mensaje || "Interés eliminado y revertido.");
    await refrescarTrasCambioInteresCg();
}

async function abrirModalInteresCg(anio, mes) {
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
    const modoInteres = CG.interesHubMode || (isHubEstCg() ? "est" : "cliente");

    $("#cgInteresAnio").val(anio);
    $("#cgInteresMes").val(mes);
    $("#cgInteresSubtitulo").text(`Atraso de ${mesNom} ${anio}`);
    setImporteInputCg("#cgInteresBase", base);
    $("#cgInteresPct").val(pct);
    $("#cgInteresFecha").val(new Date().toISOString().slice(0, 10));
    $("#cgInteresConcepto").val(`Interés por atraso ${mesNom} ${anio}`);
    recalcularImporteInteresCg();
    await prepararSelectEstInteresCg(modoInteres);

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

async function prepararSelectEstInteresCg(modoInteres) {
    const $wrap = $("#cgInteresEstWrap");
    const $sel = $("#cgInteresEstablecimiento");
    if (!$wrap.length || !$sel.length) return;

    if (modoInteres === "est") {
        const idEst = hubIdEstablecimientoCg() || (idsEstablecimientoSeleccionadosCg()[0] || 0);
        const nom = (CG.establecimientos || []).find(e => Number(e.Id) === idEst)?.Nombre
            || (CG.establecimientos || []).find(e => Number(e.Id) === idEst)?.nombre
            || (idEst ? `Establecimiento #${idEst}` : "");
        $wrap.removeClass("d-none");
        $sel.prop("disabled", true).html(
            idEst
                ? `<option value="${idEst}" selected>${escapeCg(nom)}</option>`
                : `<option value="">Sin establecimiento</option>`
        );
        return;
    }

    // Vista cliente: elegir establecimiento o dejar general.
    $wrap.removeClass("d-none");
    $sel.prop("disabled", false);
    let lista = Array.isArray(CG.establecimientos) ? CG.establecimientos : [];
    if (!lista.length && CG.id) {
        try {
            lista = await fetchJsonCg(API_CG.establecimientosPorCliente(CG.id), { headers: authCg() }) || [];
            CG.establecimientos = lista;
        } catch { lista = []; }
    }
    const opts = [`<option value="">Cliente (general) — sin establecimiento</option>`]
        .concat(lista.map(e => {
            const id = Number(e.Id ?? e.id) || 0;
            if (!id) return "";
            const nom = (e.Nombre ?? e.nombre ?? `Est. #${id}`).toString().trim();
            return `<option value="${id}">${escapeCg(nom)}</option>`;
        }).filter(Boolean));
    $sel.html(opts.join(""));
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

    const modoInteres = CG.interesHubMode || (isHubEstCg() ? "est" : "cliente");
    let idEstInteres = 0;
    if (modoInteres === "est") {
        idEstInteres = hubIdEstablecimientoCg() || (idsEstablecimientoSeleccionadosCg()[0] || 0);
    } else {
        idEstInteres = parseInt($("#cgInteresEstablecimiento").val(), 10) || 0;
    }

    const estNomSel = idEstInteres > 0
        ? (($("#cgInteresEstablecimiento option:selected").text() || "").trim() || `Est. #${idEstInteres}`)
        : "Cliente (general)";

    const payload = {
        IdCliente: CG.id,
        Fecha: fecha,
        Concepto: concepto,
        Importe: importe,
        AnioRef: anioRef,
        MesRef: mesRef,
        IdEstablecimiento: idEstInteres > 0 ? idEstInteres : null
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

    // Actualización local inmediata para que Intereses / Total / Restante no queden en 0
    // mientras vuelve el reload (y por si la solapa est filtraba mal los movimientos).
    aplicarInteresLocalCg(anioRef, mesRef, {
        Fecha: fecha,
        Concepto: concepto,
        Importe: importe,
        AnioRef: anioRef,
        MesRef: mesRef,
        IdEstablecimiento: idEstInteres > 0 ? idEstInteres : null,
        Establecimiento: estNomSel
    });

    CG.tabsLoaded.controlMensual = false;
    CG.tabsLoaded.cuentaCorriente = false;
    const mesKeep = hubPropCg("hubMesSel") || (anioRef && mesRef ? { anio: anioRef, mes: mesRef } : null);
    if (mesKeep) setHubPropCg("hubMesSel", { anio: Number(mesKeep.anio), mes: Number(mesKeep.mes) });

    // Recargar el hub desde el que se cargó el interés (evita pintar en el DOM equivocado).
    if (modoInteres === "est") {
        await withHubModeCg("est", async () => {
            const idsEst = idsEstablecimientoSeleccionadosCg();
            await cargarTabControlMensual(true, idsEst);
        });
        // También refrescar planilla cliente si existe, para que vea el interés con el est.
        try {
            await withHubModeCg("cliente", async () => {
                CG.tabsLoaded.controlMensual = false;
                await cargarTabControlMensual(true, null);
            });
        } catch { /* opcional */ }
    } else {
        await withHubModeCg("cliente", async () => {
            await cargarTabControlMensual(true, null);
        });
        // Si hay hub est abierto, refrescarlo también (filtra por est:).
        if (document.getElementById("cgEstHubMount")?.querySelector(".cg-cm-planilla")) {
            try {
                await withHubModeCg("est", async () => {
                    const idsEst = idsEstablecimientoSeleccionadosCg();
                    if (idsEst.length) await cargarTabControlMensual(true, idsEst);
                });
            } catch { /* opcional */ }
        }
    }
    if (typeof cargarTabCuentaCorriente === "function") {
        try { await cargarTabCuentaCorriente(true); } catch { /* opcional */ }
    }
}

/** Suma un interés recién cargado al estado en memoria y re-pinta planilla/workspace. */
function aplicarInteresLocalCg(anio, mes, mov) {
    if (!anio || !mes || !mov) return;
    const data = hubPropCg("controlFiltrado");
    if (!data) return;

    if (!Array.isArray(data.Intereses)) data.Intereses = [];
    const nuevo = {
        Id: mov.Id || 0,
        Fecha: mov.Fecha,
        Concepto: mov.Concepto || "",
        Importe: Number(mov.Importe) || 0,
        AnioRef: Number(anio),
        MesRef: Number(mes),
        MesNombreRef: null,
        IdEstablecimiento: mov.IdEstablecimiento != null ? Number(mov.IdEstablecimiento) || null : null,
        Establecimiento: mov.Establecimiento || (mov.IdEstablecimiento ? `Est. #${mov.IdEstablecimiento}` : "Cliente (general)")
    };
    data.Intereses = [nuevo, ...data.Intereses];

    const filas = Array.isArray(data.Filas) ? data.Filas : [];
    const fila = filas.find(x => Number(x.Mes) === Number(mes) && Number(x.Anio || CG.controlAnio) === Number(anio));
    if (fila) {
        const prevCant = Number(fila.CantidadIntereses) || 0;
        const prevTot = Number(fila.TotalIntereses) || 0;
        const importe = Number(mov.Importe) || 0;
        fila.CantidadIntereses = prevCant + 1;
        fila.TotalIntereses = Math.round((prevTot + importe) * 100) / 100;
        if (!Array.isArray(fila.Intereses)) fila.Intereses = [];
        fila.Intereses = [nuevo, ...fila.Intereses];
        const debe = Number(fila.Debe) || 0;
        const haber = Number(fila.Haber) || 0;
        fila.TotalMes = Math.round((debe + fila.TotalIntereses) * 100) / 100;
        fila.RestanteMes = Math.round((fila.TotalMes - haber) * 100) / 100;
    }

    setHubPropCg("controlFiltrado", data);
    renderControlMensualCg(data);
}

function truncarCg(txt, max) {
    if (!txt) return "";
    return txt.length > max ? txt.slice(0, max) + "…" : txt;
}

function celdaObsOjoCg(m, anio) {
    const obs = (m?.Observaciones || "").trim();
    if (!obs) {
        return `<span class="cg-cm-obs-empty" title="Sin observaciones">—</span>`;
    }
    const mesNombre = escapeCg(m.MesNombre || "");
    const anioVal = Number(anio || m.Anio || CG.controlAnio) || "";
    return `<button type="button"
        class="cg-cm-obs-eye"
        data-anio="${anioVal}"
        data-mes="${Number(m.Mes) || ""}"
        data-mes-nombre="${mesNombre}"
        title="Ver observación"
        aria-label="Ver observación">
        <span class="cg-cm-obs-eye-stack" aria-hidden="true">
            <i class="fa fa-eye cg-cm-obs-eye-open"></i>
            <i class="fa fa-eye-slash cg-cm-obs-eye-closed"></i>
        </span>
    </button>`;
}

function abrirModalObsControlCg(el) {
    const $btn = $(el);
    const anio = Number($btn.attr("data-anio")) || 0;
    const mes = Number($btn.attr("data-mes")) || 0;
    const filas = hubPropCg("controlFiltrado")?.Filas || [];
    const fila = filas.find(x => Number(x.Mes) === mes && Number(x.Anio || CG.controlAnio) === anio);
    const obs = String(fila?.Observaciones || "").trim();
    if (!obs) return;

    const mesNombre = $btn.attr("data-mes-nombre") || fila?.MesNombre || "";
    const sub = [mesNombre, anio || ""].filter(Boolean).join(" ") || (mes ? `Mes ${mes}` : "Observación del mes");

    $("#cgObsModalSub").text(sub);
    $("#cgObsModalBody").text(obs);

    const modalEl = document.getElementById("modalObsControlCg");
    if (!modalEl || typeof bootstrap === "undefined") return;
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
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

async function vaciarAbonosMesCg(opts) {
    const silent = !!(opts && opts.silent);
    const mes = parseInt($h("cgCmMes").val(), 10);
    const anio = parseInt($h("cgCmAnio").val(), 10);
    if (!mes || !anio || !(CG.id > 0)) return;

    if (!silent) {
        const ok = typeof confirmarModal === "function"
            ? await confirmarModal("¿Poner en cero el pago en efectivo y la transferencia de este mes? No borra entregas ni intereses.")
            : window.confirm("¿Vaciar los montos de este mes?");
        if (!ok) return;
    }

    setImporteInputCg("#cgCmAbonoEfectivo", 0);
    setImporteInputCg("#cgCmAbonoTransferencia", 0);

    let data;
    try {
        data = await fetchJsonCg(API_CG.vaciarAbonosMes, {
            method: "POST",
            headers: authCg(),
            body: JSON.stringify({
                IdCliente: CG.id,
                IdEstablecimiento: hubIdEstablecimientoCg(),
                Anio: anio,
                Mes: mes
            })
        });
    } catch (e) {
        if (!silent) errorModal("No se pudieron vaciar los montos del mes.");
        throw e;
    }

    if (!data?.valor) {
        if (!silent) errorModal(data?.mensaje || "No se pudieron vaciar los montos.");
        return;
    }

    if (!silent) exitoModal(data.mensaje || "Montos del mes en cero.");

    if (isHubEstCg()) await cargarHubEstablecimientoCg(true);
    else {
        CG.tabsLoaded.controlMensual = false;
        await cargarTabControlMensual(true);
        await cargarHubStockCg(true);
    }
    if (hubPropCg("hubMesSel")) {
        await abrirWorkspaceMesCg(hubPropCg("hubMesSel").anio, hubPropCg("hubMesSel").mes, true);
    }
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

    const list = (items || []).filter(x =>
        (Number(x.Entregadas) || 0) !== 0
        || (Number(x.Retiradas) || 0) !== 0
        || (Number(x.NoRetiradas) || 0) !== 0);
    if (!list.length) {
        cont.html(`<div class="cg-hub-stock-empty">Todavia no hay cajas en poder del cliente.</div>`);
        return;
    }

    cont.html(list.map(s => {
        const enPoder = Number(s.EnPoderCliente) || 0;
        const poderCls = typeof clsSaldoMoney === "function" ? clsSaldoMoney(enPoder) : "";
        const tone = enPoder > 0 ? "has-stock" : (enPoder < 0 ? "neg-stock" : "zero-stock");
        const noRet = Number(s.NoRetiradas) || 0;
        return `<div class="cg-hub-stock-card ${tone}">
            <div class="cg-hub-stock-name">${escapeCg(s.Producto)}</div>
            <div class="cg-hub-stock-nums">
                <span><small>Entreg.</small><strong class="rp-money-in">${fmtQtyCg(s.Entregadas)}</strong></span>
                <span><small>Retir.</small><strong class="rp-money-out">${fmtQtyCg(s.Retiradas)}</strong></span>
                ${noRet !== 0 ? `<span><small>No ret.</small><strong class="cg-val-noret ${noRet < 0 ? "is-neg" : ""}">${fmtQtySignedCg(noRet)}</strong></span>` : ""}
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
            <button type="button" class="cg-card-btn" onclick="contactarEstablecimientoDirectoCg(${r.Id})"><i class="fa fa-whatsapp"></i> WhatsApp / mail</button>
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
            { label: "No retiradas", value: r => fmtQtySignedCg(r.NoRetiradas), cls: "cg-val-noret" },
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
        entregas: r => { API_CG.irEntregaDesdeCliente(r.Id, CG.id); }
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
        const totalMes = Number(m.TotalMes != null ? m.TotalMes : ((Number(m.Debe) || 0) + (Number(m.TotalIntereses) || 0))) || 0;
        const restanteMes = Number(m.RestanteMes != null ? m.RestanteMes : (totalMes - (Number(m.Haber) || 0))) || 0;
        const saldo = Number(m.Saldo) || 0;
        const restanteCls = typeof clsSaldoDeudaMoney === "function"
            ? clsSaldoDeudaMoney(restanteMes)
            : "";
        const saldoCls = typeof clsSaldoDeudaMoney === "function"
            ? clsSaldoDeudaMoney(saldo)
            : (saldo > 0 ? "cg-val-saldo-neg" : (saldo < 0 ? "cg-val-saldo-pos" : "cg-val-saldo-cero"));
        const atrasado = puedeCargarInteresMesCg(m, anio, m.Mes);
        const badge = atrasado
            ? `<span class="cg-data-card-badge cg-data-card-badge--atraso">Atrasado</span>`
            : "";
        return `
            <article class="cg-data-card cg-data-card--cm rp-card-selectable ${atrasado ? "is-atraso" : ""}"
                     data-anio="${anio}" data-mes="${m.Mes}" tabindex="0" role="button">
                <div class="cg-data-card-head">
                    <div class="cg-data-card-head-text">
                        <div class="cg-data-card-title">${escapeCg(m.MesNombre)}${mostrarAnio ? ` ${anio}` : ""}</div>
                        <div class="cg-data-card-sub">${celdaFechaVisitaCg(m, anio, true)}</div>
                    </div>
                    ${badge}
                </div>
                <div class="cg-data-card-body">
                    <div class="cg-card-field"><span>Entreg.</span><strong class="rp-money-in">${fmtQtyCg(m.Entregadas)}</strong></div>
                    <div class="cg-card-field"><span>Retir.</span><strong class="rp-money-out">${fmtQtyCg(m.Retiradas)}</strong></div>
                    <div class="cg-card-field"><span>No ret.</span><strong class="cg-val-noret">${fmtQtySignedCg(m.NoRetiradas)}</strong></div>
                    <div class="cg-card-field"><span>Total mes</span><strong class="cg-val-debe">${fmtMoneyCg(totalMes)}</strong></div>
                    <div class="cg-card-field"><span>Efectivo</span><strong class="${(Number(m.AbonoEfectivo) || 0) > 0 ? "cg-val-haber" : ""}">${fmtMoneyCg(m.AbonoEfectivo)}</strong></div>
                    <div class="cg-card-field"><span>Transf.</span><strong class="${(Number(m.AbonoTransferencia) || 0) > 0 ? "cg-val-haber" : ""}">${fmtMoneyCg(m.AbonoTransferencia)}</strong></div>
                    <div class="cg-card-field"><span>Intereses</span><strong class="${atrasado && !(Number(m.CantidadIntereses) || 0) ? "rp-money-out" : ""}">${(Number(m.CantidadIntereses) || 0) > 0 ? `${m.CantidadIntereses}× ${fmtMoneyCg(m.TotalIntereses)}` : "—"}</strong></div>
                    <div class="cg-card-field"><span>Restante mes</span><strong class="${restanteCls}">${fmtMoneyCg(restanteMes)}</strong></div>
                    <div class="cg-card-field"><span>Saldo acum.</span><strong class="${saldoCls}">${fmtMoneyCg(saldo)}</strong></div>
                    ${m.Observaciones ? `<div class="cg-card-field cg-card-field--full cg-card-field--obs"><span>Obs.</span>${celdaObsOjoCg(m, anio)}</div>` : ""}
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
