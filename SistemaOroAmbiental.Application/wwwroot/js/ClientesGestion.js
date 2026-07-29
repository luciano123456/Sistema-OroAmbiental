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
    controlAnual: null,
    controlFiltrado: null,
    controlAnio: new Date().getFullYear(),
    controlAnualError: false,
    cuentas: [],
    controlFiltros: { anios: [], meses: [] },
    viewPref: "auto",
    listMeta: {},
    geoCache: { provincias: [], partidos: [], localidades: [] },
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
    partidosPorProvincia: id => `/Partidos/ListaPorProvincia?idProvincia=${id}`,
    localidadesPorPartido: id => `/Localidades/ListaPorPartido?idPartido=${id}`,
    localidadesPorProvincia: id => `/Localidades/ListaPorProvincia?idProvincia=${id}`,
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
    contactos: "Contactos",
    establecimientos: "Establecimientos",
    contratos: "Contratos",
    entregas: "Entregas",
    recorridos: "Recorridos",
    controlMensual: "Control mensual",
    stockCliente: "Stock del cliente",
    cuentaCorriente: "Cuenta corriente",
    cobros: "Cobros"
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

    await cargarCombosDatosCg();
    await cargarCombosRecoleccionCg();

    if (CG.id > 0) {
        await cargarClienteCg(CG.id);
        await cargarRecoleccionPrincipalCg();
        habilitarTabsRelacionados(true);
    } else {
        actualizarHeaderCg("Nuevo cliente", "Complete los datos y registre el cliente");
        habilitarTabsRelacionados(false);
    }
});

function initModalesCg() {
    if (typeof initEstablecimientoModal === "function") {
        CG.establecimientoModal = initEstablecimientoModal({
            token: token,
            onOpen: async (modo, modal) => {
                if (modo !== "nuevo" || !CG.modelo || CG.id <= 0) return;
                const all = await fetchJsonCg(API_CG.establecimientosLista, { headers: authCg() }) || [];
                if (all.some(x => x.IdCliente === CG.id)) return;

                const c = CG.modelo;
                modal._setFieldValue("txtNombreEst", c.Nombre || "");
                modal._setFieldValue("txtCuitEst", c.Cuit || "");
                if (c.IdCondicionIva) modal._setFieldValue("cmbCondicionIvaEst", c.IdCondicionIva, true);
                modal._setFieldValue("txtCalleEst", c.Calle || c.Domicilio || "");
                modal._setFieldValue("txtNumeroEst", c.Numero || "");
                modal._setFieldValue("txtPisoDeptoEst", c.PisoDepartamento || "");
                modal._setFieldValue("txtLocalidadEst", localidadTextoCg() || c.Localidad || "");
                modal._setFieldValue("txtCodPostalEst", c.CodPostal || "");
                if (c.IdProvincia) modal._setFieldValue("cmbProvinciaEst", c.IdProvincia, true);
                if (c.IdTipoGenerador) modal._setFieldValue("cmbTipoGeneradorEst", c.IdTipoGenerador, true);
            },
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
                if ($("#tabContratos").hasClass("active")) await cargarTabContratos();
            },
            onDeleted: async () => {
                CG.tabsLoaded.contratos = false;
                if ($("#tabContratos").hasClass("active")) await cargarTabContratos();
            }
        });
    }

    const modalEl = document.getElementById("modalCobroCg");
    if (modalEl) CG.modalCobro = new bootstrap.Modal(modalEl);

    const modalCmEl = document.getElementById("modalControlMensualCg");
    if (modalCmEl) CG.modalControlMensual = new bootstrap.Modal(modalCmEl);

    $("#cgCmSinEntrega").on("change", syncSinEntregaUiCg);
}

function wireEventosCg() {
    $("#btnGuardarClienteCg").on("click", guardarClienteCg);
    $("#btnEliminarClienteCg").on("click", eliminarClienteCg);
    $("#btnCerrarErrorCg").on("click", cerrarErrorCg);

    $("#cgActivo").on("change", function () {
        $("#lblActivoCg").text(this.checked ? "Activo" : "Inactivo");
    });

    $("#cgMotivo").on("change", function () {
        $("#wrapMotivoDetalle").prop("hidden", !$(this).val());
    });

    $("#cgProvincia").on("change", async function () {
        await cargarPartidosCg($(this).val());
        actualizarCodigosGeoCg();
    });

    $("#cgPartido").on("change", async function () {
        await cargarLocalidadesCg($(this).val());
        actualizarCodigosGeoCg();
    });

    $("#cgLocalidad").on("change", actualizarCodigosGeoCg);

    $("#cgRecoleccionBody").on("shown.bs.collapse", function () {
        ["#cgTipoGenerador", ...CG_REC_CAMION_SELECTORS, "#cgRecSemana", "#cgRecListaPrecio"]
            .forEach(sel => refreshSelect2Cg($(sel)));
    });

    $('button[data-cg-tab]').on("shown.bs.tab", async function () {
        const tab = $(this).data("cgTab");
        await cargarTabCg(tab);
        if (debeMostrarTablaCg()) {
            RpGridView.programarAjuste();
        }
    });

    $("#btnGuardarContactoCg").on("click", guardarContactoCg);
    $("#btnNuevoContactoCg").on("click", limpiarFormContactoCg);

    $("#cgListaContactos").on("click", function (e) {
        const btnDel = e.target.closest(".btn-eliminar-contacto-cg");
        if (btnDel) {
            e.stopPropagation();
            eliminarContactoCg(Number(btnDel.dataset.id));
            return;
        }
        const item = e.target.closest(".rp-contact-item");
        if (item) seleccionarContactoCg(Number(item.dataset.id));
    });

    $("#btnNuevoEstablecimientoCg, #btnNuevoEstTab").on("click", abrirNuevoEstablecimientoCg);
    $("#btnNuevoContratoCg, #btnNuevoContratoTab").on("click", abrirNuevoContratoCg);
    $("#btnRegistrarCobroCg, #btnRegistrarCobroTab").on("click", abrirModalCobroCg);
    $("#btnConfirmarCobroCg").on("click", confirmarCobroCg);
    $("#btnRefreshCcCg").on("click", () => cargarTabCuentaCorriente(true));
    $("#btnRefreshControlMensual").on("click", () => cargarTabControlMensual(true));
    $("#btnRefreshStockCliente").on("click", () => cargarTabStockCliente(true));
    $("#tabControlMensual").on("click", ".cg-cm-chip", function () {
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
    $("#btnGuardarControlMensualCg").on("click", guardarControlMensualCg);
    $("#cgControlMensualBody").on("click", "tr[data-mes]", function () {
        abrirModalControlMensual(Number($(this).data("anio")), Number($(this).data("mes")));
    });

    initFiltrosControlCg();
    initViewModeCg();

    document.addEventListener("configuracionActualizada", async (e) => {
        const tipo = e.detail?.tipo;
        const nuevoId = e.detail?.nuevoId;

        if (tipo === "Partidos") {
            await cargarPartidosCg($("#cgProvincia").val(), nuevoId);
            return;
        }

        if (tipo === "Localidades") {
            await cargarLocalidadesCg($("#cgPartido").val(), nuevoId);
            return;
        }

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
    ["#cgSucursal", "#cgProvincia", "#cgPartido", "#cgLocalidad", "#cgProfesion",
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

function actualizarCodigosGeoCg() {
    const idProv = intOrNullCg("#cgProvincia");
    const idPart = intOrNullCg("#cgPartido");
    const idLoc = intOrNullCg("#cgLocalidad");

    const prov = (CG.geoCache.provincias || []).find(x => x.Id === idProv);
    const part = (CG.geoCache.partidos || []).find(x => x.Id === idPart);
    const loc = (CG.geoCache.localidades || []).find(x => x.Id === idLoc);

    $("#cgCodProvincia").val(prov?.Codigo ?? "");
    $("#cgCodPartido").val(part?.Codigo ?? "");
    $("#cgCodLocalidad").val(loc?.Codigo ?? "");
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

async function cargarPartidosCg(idProvincia, selectedPartidoId, selectedLocalidadId) {
    const $p = $("#cgPartido");
    $p.empty().append(new Option("Seleccionar", ""));
    CG.geoCache.partidos = [];
    CG.geoCache.localidades = [];

    if (!idProvincia) {
        refreshSelect2Cg($p);
        await cargarLocalidadesCg(null);
        actualizarCodigosGeoCg();
        return;
    }

    const data = await fetchJsonCg(API_CG.partidosPorProvincia(idProvincia), { headers: authCg() });
    CG.geoCache.partidos = data || [];
    const seen = new Set();
    (data || []).forEach(x => {
        if (seen.has(x.Id)) return;
        seen.add(x.Id);
        $p.append(new Option(x.Nombre, x.Id));
    });

    if (selectedPartidoId) $p.val(String(selectedPartidoId));
    refreshSelect2Cg($p);
    await cargarLocalidadesCg(selectedPartidoId || null, selectedLocalidadId);
    actualizarCodigosGeoCg();
}

async function cargarLocalidadesCg(idPartido, selectedId) {
    const $l = $("#cgLocalidad");
    $l.empty().append(new Option("Seleccionar", ""));
    CG.geoCache.localidades = [];

    if (!idPartido) {
        refreshSelect2Cg($l);
        actualizarCodigosGeoCg();
        return;
    }

    let data = await fetchJsonCg(API_CG.localidadesPorPartido(idPartido), { headers: authCg() });

    if ((!data || !data.length) && $("#cgProvincia").val()) {
        data = await fetchJsonCg(
            API_CG.localidadesPorProvincia($("#cgProvincia").val()),
            { headers: authCg() }
        );
    }

    CG.geoCache.localidades = data || [];
    const seen = new Set();
    (data || []).forEach(x => {
        if (seen.has(x.Id)) return;
        seen.add(x.Id);
        $l.append(new Option(x.Nombre, x.Id));
    });

    if (selectedId) $l.val(String(selectedId));
    refreshSelect2Cg($l);
    actualizarCodigosGeoCg();
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
            await cargarPartidosCg(m.IdProvincia, m.IdPartido, m.IdLocalidad);
        } else {
            actualizarCodigosGeoCg();
        }

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
    $("#btnNuevaEntregaCg, #btnNuevaEntregaTab").attr("href", urlEntrega).prop("hidden", false);
    $("#btnNuevoEstablecimientoCg, #btnNuevoContratoCg").prop("hidden", false);
}

function habilitarTabsRelacionados(habilitar) {
    const tabs = [
        "contactos", "establecimientos", "contratos", "entregas",
        "recorridos", "controlMensual", "stockCliente",
        "cuentaCorriente", "cobros"
    ];
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
        Localidad: localidadTextoCg(),
        CodPostal: $("#cgCodPostal").val() || null,
        IdProvincia: intOrNullCg("#cgProvincia"),
        IdProfesion: intOrNullCg("#cgProfesion"),
        IdCondicionIva: intOrNullCg("#cgCondicionIva"),
        IdEstado: intOrNullCg("#cgEstado"),
        IdMotivo: intOrNullCg("#cgMotivo"),
        MotivoDetalle: ($("#cgMotivoDetalle").val() || "").trim() || null,
        IdCalificacion: intOrNullCg("#cgCalificacion"),
        IdPartido: intOrNullCg("#cgPartido"),
        IdLocalidad: intOrNullCg("#cgLocalidad"),
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

function localidadTextoCg() {
    const $l = $("#cgLocalidad");
    const val = $l.val();
    if (!val) return null;
    const txt = ($l.find("option:selected").text() || "").trim();
    return txt && txt !== "Seleccionar" ? txt : null;
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
    if (CG.tabsLoaded[tab] && tab !== "cuentaCorriente" && tab !== "controlMensual") return;

    try {
        switch (tab) {
            case "contactos": await cargarTabContactos(); break;
            case "establecimientos": await cargarTabEstablecimientos(); break;
            case "contratos": await cargarTabContratos(); break;
            case "entregas": await cargarTabEntregas(); break;
            case "recorridos": await cargarTabRecorridos(); break;
            case "controlMensual": await cargarTabControlMensual(true); break;
            case "stockCliente": await cargarTabStockCliente(); break;
            case "cuentaCorriente": await cargarTabCuentaCorriente(); break;
            case "cobros": await cargarTabCobros(); break;
        }
    } catch (e) {
        console.error(`Error cargando tab ${tab}:`, e);
        if (typeof errorModal === "function") {
            const nombre = CG_TAB_LABELS[tab] || "esta seccion";
            errorModal(`No se pudo cargar ${nombre}. Intente nuevamente.`);
        }
    }
}

/* ---- Contactos ---- */

async function cargarTabContactos() {
    CG.contactos = await fetchJsonCg(API_CG.contactosLista(CG.id), { headers: authCg() }) || [];
    limpiarFormContactoCg();
    renderContactosCg();
    CG.tabsLoaded.contactos = true;
}

function renderContactosCg() {
    const items = CG.contactos || [];
    $("#cgContactoCantidad").text(String(items.length));
    const cont = $("#cgListaContactos");

    if (!items.length) {
        cont.html(`<div class="rp-contact-empty">No hay contactos cargados.</div>`);
        return;
    }

    cont.html(items.map(c => {
        const meta = [c.Telefono, c.Email].filter(Boolean).join(" · ");
        const active = c.Id === CG.contactoSelId ? " active" : "";
        return `<div class="rp-contact-item${active}" data-id="${c.Id}">
            <div class="flex-grow-1">
                <div class="rp-contact-item-main"><strong>${escapeCg(c.Nombre)}</strong>
                ${c.Puesto ? `<small>${escapeCg(c.Puesto)}</small>` : ""}</div>
                ${meta ? `<div class="rp-contact-item-meta">${escapeCg(meta)}</div>` : ""}
            </div>
            <div class="rp-contact-item-actions">
                <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-contacto-cg" data-id="${c.Id}">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join(""));
}

function escapeCg(t) {
    return String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function limpiarFormContactoCg() {
    CG.contactoSelId = 0;
    $("#cgContactoId, #cgContactoNombre, #cgContactoPuesto, #cgContactoTelefono, #cgContactoTelefonoAlt, #cgContactoEmail").val("");
    $("#cgContactoFormTitulo").text("Nuevo contacto");
    renderContactosCg();
}

function seleccionarContactoCg(id) {
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
    renderContactosCg();
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
    CG.tabsLoaded.contactos = false;
    await cargarTabContactos();
    if (esNuevo && data.id) seleccionarContactoCg(data.id);
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
        { data: "Localidad" },
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
    await CG.establecimientoModal.abrirNuevo();
    CG.establecimientoModal._setFieldValue("cmbClienteEst", CG.id, true);
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

/* ---- Entregas ---- */

async function cargarTabEntregas() {
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

    configurarGrillaCg("entregas", "#grd_EntregasCg", data, [
        columnaGridAcciones(null, "Entregas", (id) =>
            `<a class="btn btn-sm btn-outline-light" href="${API_CG.entregaNuevoModif(id, CG.id)}" title="Editar"><i class="fa fa-pencil"></i></a>`),
        columnaGridId(),
        { data: "Fecha", render: d => formatearFechaCortaCg(d) },
        { data: "Establecimiento" },
        { data: "Estado", defaultContent: "" },
        { data: "ImporteTotal", render: d => fmtMoneyCg(d) },
        { data: "ImporteAbonado", render: d => fmtMoneyCg(d) },
        { data: "Saldo", render: d => fmtMoneyCg(d) }
    ]);
    CG.tabsLoaded.entregas = true;
}

/* ---- Recorridos ---- */

async function cargarTabRecorridos() {
    try {
        const items = await fetchJsonCg(API_CG.recorridosPorCliente(CG.id), { headers: authCg() });
        marcarDiasEnRutaCg(items || []);
        renderRecorridosCg(items || [], false);
    } catch (e) {
        console.warn("Recorridos no disponibles:", e);
        marcarDiasEnRutaCg([]);
        renderRecorridosCg([], true);
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
        <div class="cg-recorrido-item ${r.Activo ? "" : "cg-recorrido-inactivo"}">
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
        </div>`).join(""));
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
    $("#cgControlSaldoAnual").text(fmtMoneyCg(data?.TotalSaldo));
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
        const saldoClass = saldo > 0 ? "cg-cm-saldo-neg" : (saldo < 0 ? "cg-cm-saldo-pos" : "cg-cm-saldo-cero");

        return `<tr class="${rowClass}" data-anio="${anio}" data-mes="${m.Mes}">
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

function abrirModalControlMensual(anio, mes) {
    const filas = CG.controlFiltrado?.Filas || CG.controlAnual?.Meses || [];
    const m = filas.find(x => Number(x.Mes) === mes && Number(x.Anio || CG.controlAnio) === anio);
    if (!m) return;

    $("#cgCmAnio").val(anio);
    $("#cgCmMes").val(m.Mes);
    $("#cgCmMesTitulo").text(`${m.MesNombre} ${anio}`);
    $("#cgCmFechaVisita").val(fechaInputCg(m.FechaVisita));
    $("#cgCmAbonoEfectivo").val(m.AbonoEfectivo || "");
    $("#cgCmAbonoTransferencia").val(m.AbonoTransferencia || "");
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

    const filas = CG.controlFiltrado?.Filas || CG.controlAnual?.Meses || [];
    const mesData = filas.find(x => Number(x.Mes) === mes && Number(x.Anio || CG.controlAnio) === anio);
    const parseNum = v => typeof parseNumero === "function" ? parseNumero(v) : parseFloat(v) || 0;

    const modelo = {
        Id: mesData?.IdControl || 0,
        IdCliente: CG.id,
        Anio: anio,
        Mes: mes,
        FechaVisita: parseFechaCg($("#cgCmFechaVisita").val()),
        SinEntrega: $("#cgCmSinEntrega").is(":checked"),
        CajasAFavor: parseInt($("#cgCmCajasAFavor").val(), 10) || 0,
        Observaciones: ($("#cgCmObservaciones").val() || "").trim() || null,
        AbonoEfectivo: parseNum($("#cgCmAbonoEfectivo").val()),
        AbonoTransferencia: parseNum($("#cgCmAbonoTransferencia").val()),
        FechaTransferencia: parseFechaCg($("#cgCmFechaTransferencia").val())
    };

    const data = await fetchJsonCg(API_CG.guardarControlMensual, {
        method: "POST",
        headers: authCg(),
        body: JSON.stringify(modelo)
    });

    if (!data?.valor) {
        errorModal(data?.mensaje || "No se pudo guardar.");
        return;
    }

    exitoModal(data.mensaje || "Control mensual guardado.");
    CG.modalControlMensual?.hide();
    CG.tabsLoaded.controlMensual = false;
    await cargarTabControlMensual(true);
}

/* ---- Stock cliente ---- */

async function cargarTabStockCliente(force) {
    if (force) CG.tabsLoaded.stockCliente = false;

    const data = await fetchJsonCg(API_CG.stockCliente(CG.id), { headers: authCg() }) || [];

    configurarGrillaCg("stockCliente", "#grd_StockClienteCg", data, [
        { data: "Producto" },
        { data: "Entregadas", className: "text-end", render: d => fmtQtyCg(d) },
        { data: "Retiradas", className: "text-end", render: d => fmtQtyCg(d) },
        { data: "EnPoderCliente", className: "text-end", render: d => fmtQtyCg(d) }
    ], {
        paging: false,
        searching: false,
        info: false,
        dom: "t",
        order: [[0, "asc"]]
    });

    CG.tabsLoaded.stockCliente = true;
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
        $("#cgSaldoAnterior").text(fmtMoneyCg(res.SaldoAnterior));
        $("#cgDebe").text(fmtMoneyCg(res.Debe));
        $("#cgHaber").text(fmtMoneyCg(res.Haber));
        $("#cgSaldoActual").text(fmtMoneyCg(res.SaldoActual));
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
        { data: "Debe", render: d => fmtMoneyCg(d) },
        { data: "Haber", render: d => fmtMoneyCg(d) },
        { data: "Saldo", render: d => fmtMoneyCg(d) }
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
    if ($("#tabCuentaCorriente").hasClass("active")) await cargarTabCuentaCorriente(true);
    if ($("#tabCobros").hasClass("active")) await cargarTabCobros();
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
            { label: "Localidad", value: r => r.Localidad },
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
            { label: "Saldo", value: r => fmtMoneyCg(r.Saldo), cls: "cg-val-saldo" }
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
            { label: "Saldo", value: r => fmtMoneyCg(r.Saldo), cls: "cg-val-saldo" }
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
            <strong class="${f.cls || ""}">${escapeCg(typeof f.value === "function" ? f.value(row) : row[f.value])}</strong>
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
        const saldoCls = saldo > 0 ? "cg-val-debe" : (saldo < 0 ? "cg-val-haber" : "");
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
