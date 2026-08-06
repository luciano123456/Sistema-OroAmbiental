/* =========================================================
   CAJA.JS - Tesoreria Cajas (Sistema Oro Ambiental)
========================================================= */

let gridCaja;
let cuentasCaja = [];
let sucursalesCaja = [];
let validacionCajaIngreso = null;
let validacionCajaEgreso = null;
let validacionCajaTransferencia = null;

let CAJA_MODO = (window.CAJA_MODO || "TESORERIA").toUpperCase();
window.CAJA_MODO = CAJA_MODO;
let CAJA_MODULO_LISTO = false;

function getTipoCuentaFiltro() {
    if (CAJA_MODO === "EFECTIVO") return "Efectivo";
    if (CAJA_MODO === "BANCO") return "Banco";
    return null;
}

function cuentasFiltradasPorModo(lista) {
    const tipo = getTipoCuentaFiltro();
    if (!tipo) return lista || [];
    return (lista || []).filter(x => (x.Codigo || "Efectivo") === tipo);
}

const CJ = {
    movimientos: [],
    movimientosOriginal: [],
    movimientosMap: new Map(),
    resumen: {
        saldoAnterior: 0,
        ingresos: 0,
        egresos: 0,
        saldoActual: 0,
        cantidadMovimientos: 0
    },
    resumenConsolidado: null,
    filtrosActivos: false,
    filtrosServidor: null
};

/**
 * Columnas:
 * 0 Acciones
 * 1 Id
 * 2 Fecha
 * 3 Tipo
 * 4 Origen
 * 5 Sucursal
 * 6 Cuenta
 * 7 Concepto
 * 8 Ingreso
 * 9 Egreso
 * 10 Saldo
 */
const columnConfig = [
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'select_local' },
    { index: 5, filterType: 'select', sucursalDt: true },
    { index: 6, filterType: 'select', fetchDataFunc: listaCuentasFilter },
    { index: 7, filterType: 'text' },
    { index: 8, filterType: 'number' },
    { index: 9, filterType: 'number' },
    { index: 10, filterType: 'number' }
];

registrarFiltrosGrilla('grd_Caja', columnConfig, {
    includeActivo: false,
    panelTitle: 'Filtrar resultados cargados',
    initSelect2: ($el) => inicializarSelect2Filtro($el),
    onSelectChange: async (config, $select, api) => {
        if (config.index !== 5) return;
        const value = $select.val();
        const $panel = $select.closest('.rp-grid-filtros-wrap');
        const $cuentaSelect = $panel.find('.rp-grid-panel-field[data-col="6"]');
        if (!$cuentaSelect.length) return;

        const cuentas = await listaCuentasFilter(value || null);
        $cuentaSelect.empty().append(`<option value="">Todos</option>`);
        (cuentas || []).forEach(item => {
            $cuentaSelect.append(`<option value="${item.Id}">${etiquetaCuenta(item)}</option>`);
        });
        inicializarSelect2Filtro($cuentaSelect);
        $cuentaSelect.val("").trigger("change.select2");
        api.column(6).search('').draw(false);
    },
    afterSelectBuild: async (config, $select) => {
        if (config.index === 6) $select.addClass("rp-filter-select-cuenta");
    }
});

const API = {
    movimientos: "/Cajas/Movimientos",
    resumen: "/Cajas/Resumen",
    resumenConsolidado: "/Cajas/ResumenConsolidado",
    movimiento: id => `/Cajas/Movimiento?id=${id}`,
    transferencia: idMovimientoGrupo => `/Cajas/Transferencia?idMovimientoGrupo=${idMovimientoGrupo}`,
    registrarIngreso: "/Cajas/RegistrarIngreso",
    registrarEgreso: "/Cajas/RegistrarEgreso",
    actualizarMovimientoManual: "/Cajas/ActualizarMovimientoManual",
    registrarTransferencia: "/Cajas/RegistrarTransferencia",
    actualizarTransferencia: "/Cajas/ActualizarTransferencia",
    eliminar: id => `/Cajas/Eliminar?id=${id}`,
    cuentas: "/Cuentas/Lista",
    sucursales: "/Sucursales/Lista"
};

const authHeaders = () => ({
    'Authorization': 'Bearer ' + token
});

function tipoMov(row) {
    return row.TipoMovimiento || "";
}

function etiquetaCuenta(c, mostrarSucursal = true) {
    const nom = (c.Nombre || "").trim();
    const tipo = ((c.Codigo || "Efectivo") === "Banco") ? "Banco" : "Efectivo";
    let base = nom;
    if (mostrarSucursal) {
        const suc = (c.NombreCombo || "").trim();
        if (suc) base = `${nom} (${suc})`;
    }
    // En modo Tesoreria conviene ver el tipo; en Efectivo/Bancos ya esta filtrado
    if (!getTipoCuentaFiltro()) return `${base} · ${tipo}`;
    return base;
}

function sucursalPorCuenta(idCuenta) {
    if (!idCuenta) return null;
    const cuenta = (cuentasCaja || []).find(x => String(x.Id) === String(idCuenta));
    return cuenta?.IdCombo ?? null;
}

async function inicializarModuloCaja() {
    if (CAJA_MODULO_LISTO) return;

    $(document).off("click.select2fix.caja").on(
        "click.select2fix.caja",
        ".select2-container--default .select2-selection--single",
        function () {
            const $select = $(this).closest(".select2-container").prev("select");
            if ($select.length) {
                if ($select.data("select2") && $select.data("select2").isOpen()) return;
                $select.select2("open");
            }
        }
    );

    wireEventos();
    inicializarFechasPorDefecto();
    inicializarModoCaja();

    await cargarSucursales();
    await cargarCuentas();
    resetearFiltrosCajaParaModo();

    await cargarMovimientosYResumen();

    document.querySelectorAll("#modalIngreso input, #modalIngreso select, #modalEgreso input, #modalEgreso select, #modalTransferencia input, #modalTransferencia select").forEach(el => {
        el.setAttribute("autocomplete", "off");
    });

    initValidacionesCaja();

    document.addEventListener("configuracionActualizada", async (e) => {
        const d = e.detail || {};
        const ctrl = d.tipo || d.controller || "";
        if (ctrl !== "Cuentas" && ctrl !== "Sucursales") return;

        if (ctrl === "Sucursales") {
            await cargarSucursales();
            cargarCombosCuentas();
            if (d.nuevoId && window.esModoAtajo) {
                const $suc = $(".modal.show [id$='Sucursal']:visible").first();
                if ($suc.length) {
                    $suc.val(String(d.nuevoId)).trigger("change.select2");
                }
            }
            return;
        }

        await cargarCuentas();

        if (!d.nuevoId || !window.esModoAtajo) return;

        const cuenta = (cuentasCaja || []).find(x => String(x.Id) === String(d.nuevoId));
        if (!cuenta) return;

        const $modal = $(".modal.show");
        if (!$modal.length) return;

        const pares = [
            { suc: "#iSucursal", cta: "#iCuenta", modal: "#modalIngreso" },
            { suc: "#eSucursal", cta: "#eCuenta", modal: "#modalEgreso" },
            { suc: "#tSucursalOrigen", cta: "#tCuentaOrigen", modal: "#modalTransferencia" },
            { suc: "#tSucursalDestino", cta: "#tCuentaDestino", modal: "#modalTransferencia" }
        ];

        for (const p of pares) {
            const $cta = $modal.find(p.cta);
            if (!$cta.length) continue;

            const idSuc = cuenta.IdCombo;
            cargarSucursalesModal(p.suc, p.modal, idSuc);
            cargarCuentasModal(p.cta, idSuc, p.modal);
            $cta.val(String(d.nuevoId)).trigger("change.select2");
            break;
        }
    });

    CAJA_MODULO_LISTO = true;
}

window.initCajaModule = inicializarModuloCaja;

window.refrescarCajaModulo = async function () {
    if (!CAJA_MODULO_LISTO) return;
    await cargarMovimientosYResumen();
};

window.setCajaModo = async function (modo) {
    const nuevo = (modo || "TESORERIA").toString().toUpperCase();
    const cambioModo = CAJA_MODO !== nuevo;
    CAJA_MODO = nuevo;
    window.CAJA_MODO = nuevo;

    if (!CAJA_MODULO_LISTO) {
        await inicializarModuloCaja();
        return;
    }

    inicializarModoCaja();

    cargarCombosCuentas();
    if (cambioModo) {
        resetearFiltrosCajaParaModo();
        limpiarFiltrosColumnasGrilla(gridCaja);
    }

    await cargarMovimientosYResumen();
};

if (!window.CAJA_HUB_MODE) {
    $(document).ready(() => {
        inicializarModuloCaja();
    });
}

/** Sucursal → cuenta por modal (cuando la sucursal ya viene preseleccionada) */
const CAJA_CUENTAS_POR_MODAL = {
    "#modalIngreso": [{ suc: "#iSucursal", cta: "#iCuenta" }],
    "#modalEgreso": [{ suc: "#eSucursal", cta: "#eCuenta" }],
    "#modalTransferencia": [
        { suc: "#tSucursalOrigen", cta: "#tCuentaOrigen" },
        { suc: "#tSucursalDestino", cta: "#tCuentaDestino" }
    ]
};

function sincronizarCuentasDesdeSucursal(selectorSucursal, modalSelector) {
    const pares = CAJA_CUENTAS_POR_MODAL[modalSelector];
    if (!pares) return;

    const idSuc = $(selectorSucursal).val();
    if (!idSuc) return;

    pares.forEach(p => {
        if (p.suc === selectorSucursal) {
            cargarCuentasModal(p.cta, idSuc, modalSelector);
        }
    });
}

/* =========================
   SELECT2
========================= */

function ensureSelect2($el, options) {
    if (!$el || !$el.length) return;

    if ($el.data('select2')) {
        $el.select2('destroy');
    }

    $el.select2(Object.assign({
        width: '100%',
        allowClear: true
    }, options || {}));
}

function forzarFiltrosCajaAbiertos() {
    // Select2 a veces deja un valor "fantasma" (ej. primer tipo) y oculta los GASTO
    const $tipo = $("#fTipo");
    if ($tipo.length) {
        const t = $tipo.val();
        if (t == null || t === undefined || t === "null" || t === "undefined") {
            $tipo.val("").trigger("change.select2");
        }
    }
    const $cta = $("#fCuenta");
    if ($cta.length) {
        const c = $cta.val();
        if (c == null || c === undefined || c === "null" || c === "undefined") {
            $cta.val("");
        }
    }
    const $suc = $("#fSucursal");
    if ($suc.length && !($suc.prop("disabled"))) {
        const s = $suc.val();
        if (s == null || s === undefined || s === "null" || s === "undefined") {
            $suc.val("");
        }
    }
    if (!$("#fFechaDesde").val() || !$("#fFechaHasta").val()) {
        inicializarFechasPorDefecto();
    }
}

function inicializarSelect2Caja() {
    const unica = typeof usuarioTieneUnicaSucursal === "function" && usuarioTieneUnicaSucursal(sucursalesCaja);

    ensureSelect2($("#fSucursal"), {
        dropdownParent: $("#panelFiltrosCaja"),
        placeholder: unica ? "" : "Todas",
        minimumResultsForSearch: 0,
        allowClear: !unica
    });

    ensureSelect2($("#fCuenta"), {
        dropdownParent: $("#panelFiltrosCaja"),
        placeholder: "Todas",
        allowClear: true,
        minimumResultsForSearch: 0
    });

    ensureSelect2($("#fTipo"), {
        dropdownParent: $("#panelFiltrosCaja"),
        placeholder: "Todos",
        allowClear: true,
        minimumResultsForSearch: 0
    });

    ensureSelect2($("#iSucursal"), { dropdownParent: $("#modalIngreso"), placeholder: "Seleccionar" });
    ensureSelect2($("#iCuenta"), { dropdownParent: $("#modalIngreso"), placeholder: "Seleccionar" });

    ensureSelect2($("#eSucursal"), { dropdownParent: $("#modalEgreso"), placeholder: "Seleccionar" });
    ensureSelect2($("#eCuenta"), { dropdownParent: $("#modalEgreso"), placeholder: "Seleccionar" });

    ensureSelect2($("#tSucursalOrigen"), { dropdownParent: $("#modalTransferencia"), placeholder: "Seleccionar" });
    ensureSelect2($("#tCuentaOrigen"), { dropdownParent: $("#modalTransferencia"), placeholder: "Seleccionar" });
    ensureSelect2($("#tSucursalDestino"), { dropdownParent: $("#modalTransferencia"), placeholder: "Seleccionar" });
    ensureSelect2($("#tCuentaDestino"), { dropdownParent: $("#modalTransferencia"), placeholder: "Seleccionar" });

    const bloqueoOpts = { sucursales: sucursalesCaja, triggerChange: false };
    aplicarBloqueoSucursalUnica($("#fSucursal"), bloqueoOpts);
    aplicarBloqueoSucursalUnica($("#iSucursal"), bloqueoOpts);
    aplicarBloqueoSucursalUnica($("#eSucursal"), bloqueoOpts);
    aplicarBloqueoSucursalUnica($("#tSucursalOrigen"), bloqueoOpts);
    aplicarBloqueoSucursalUnica($("#tSucursalDestino"), bloqueoOpts);

    if (unica) {
        cargarFiltroCuentas($("#fSucursal").val());
    }
}

function inicializarSelect2Filtro($select) {
    ensureSelect2($select, {
        dropdownParent: $(document.body),
        minimumResultsForSearch: 0,
        allowClear: true,
        placeholder: "Todos"
    });
}

/* =========================
   EVENTOS / FECHAS
========================= */

function wireEventos() {
    $("#btnRefreshCaja").on("click", async () => {
        await cargarMovimientosYResumen();
    });

    $("#btnIngreso").on("click", abrirModalIngreso);
    $("#btnEgreso").on("click", abrirModalEgreso);
    $("#btnTransferencia").on("click", abrirModalTransferencia);

    $("#fSucursal").on("change", function () {
        cargarFiltroCuentas($(this).val());
    });

    $("#iSucursal").on("change", function () {
        cargarCuentasModal("#iCuenta", $(this).val(), "#modalIngreso");
        $("#iCuenta").val(null).trigger("change.select2");
        validarCampoIngresoIndividual(document.getElementById("iSucursal"));
    });

    $("#eSucursal").on("change", function () {
        cargarCuentasModal("#eCuenta", $(this).val(), "#modalEgreso");
        $("#eCuenta").val(null).trigger("change.select2");
        validarCampoEgresoIndividual(document.getElementById("eSucursal"));
    });

    $("#tSucursalOrigen").on("change", function () {
        cargarCuentasModal("#tCuentaOrigen", $(this).val(), "#modalTransferencia");
        $("#tCuentaOrigen").val(null).trigger("change.select2");
        validarCampoTransferenciaIndividual(document.getElementById("tSucursalOrigen"));
    });

    $("#tSucursalDestino").on("change", function () {
        cargarCuentasModal("#tCuentaDestino", $(this).val(), "#modalTransferencia");
        $("#tCuentaDestino").val(null).trigger("change.select2");
        validarCampoTransferenciaIndividual(document.getElementById("tSucursalDestino"));
    });
}

function inicializarFechasPorDefecto() {
    const hoy = moment().format("YYYY-MM-DD");
    const inicioMes = moment().startOf("month").format("YYYY-MM-DD");

    $("#fFechaDesde").val(inicioMes);
    $("#fFechaHasta").val(hoy);
}

/* =========================
   COMBOS
========================= */

async function cargarSucursales() {
    try {
        sucursalesCaja = await fetchSucursalesPermitidas(API.sucursales);
    } catch (e) {
        console.error(e);
        sucursalesCaja = [];
    }

    const unica = typeof usuarioTieneUnicaSucursal === "function"
        && usuarioTieneUnicaSucursal(sucursalesCaja);

    // En filtros de caja: "Todas" por defecto (no forzar IdSucursalDefault del usuario,
    // eso ocultaba gastos de otras sucursales).
    llenarSelectSucursales($("#fSucursal"), sucursalesCaja, {
        primeraOpcion: primeraOpcionSucursal({ value: "", text: "Todas" }, sucursalesCaja),
        seleccionarPorDefecto: unica
    });

    if (unica) {
        const idUnica = typeof getIdSucursalDefaultUsuario === "function"
            ? getIdSucursalDefaultUsuario(sucursalesCaja)
            : null;
        if (idUnica) $("#fSucursal").val(String(idUnica));
    } else {
        $("#fSucursal").val("");
    }
}

async function cargarCuentas() {
    try {
        const response = await fetch(API.cuentas, { headers: authHeaders() });
        if (!response.ok) throw new Error();
        cuentasCaja = await response.json();
    } catch (e) {
        console.error(e);
        cuentasCaja = [];
    }

    cargarCombosCuentas();
}

function inicializarModoCaja() {
    const panel = document.getElementById("panelKpisConsolidado");
    if (panel) {
        panel.hidden = CAJA_MODO !== "TESORERIA";
        panel.classList.toggle("d-none", CAJA_MODO !== "TESORERIA");
    }

    const titulos = {
        EFECTIVO: "Caja efectivo",
        BANCO: "Bancos",
        TESORERIA: "Tesoreria"
    };
    $("#cajaTituloHub").text(titulos[CAJA_MODO] || titulos.TESORERIA);
}

function cuentasPorSucursal(idSucursal) {
    let lista = cuentasCaja || [];
    if (idSucursal) {
        lista = lista.filter(x => String(x.IdCombo) === String(idSucursal));
    }
    return cuentasFiltradasPorModo(lista);
}

function cargarCombosCuentas() {
    cargarFiltroCuentas($("#fSucursal").val());
    cargarSucursalesModal("#iSucursal", "#modalIngreso", null);
    cargarSucursalesModal("#eSucursal", "#modalEgreso", null);
    cargarSucursalesModal("#tSucursalOrigen", "#modalTransferencia", null);
    cargarSucursalesModal("#tSucursalDestino", "#modalTransferencia", null);
    inicializarSelect2Caja();
}

function cargarSucursalesModal(selectorSucursal, modalSelector, idSucursalSel) {
    const $suc = $(selectorSucursal);
    const valorActual = idSucursalSel != null ? idSucursalSel : $suc.val();

    const idUnica = typeof getIdSucursalDefaultUsuario === "function"
        ? getIdSucursalDefaultUsuario(sucursalesCaja)
        : null;

    llenarSelectSucursales($suc, sucursalesCaja, {
        primeraOpcion: primeraOpcionSucursal({ value: "", text: "Seleccionar" }, sucursalesCaja),
        seleccionarPorDefecto: true
    });

    if (valorActual && $suc.find(`option[value="${valorActual}"]`).length) {
        $suc.val(String(valorActual));
    } else if (idUnica) {
        $suc.val(String(idUnica));
    }

    if ($suc.data("select2")) $suc.select2("destroy");

    const unica = typeof usuarioTieneUnicaSucursal === "function" && usuarioTieneUnicaSucursal(sucursalesCaja);
    ensureSelect2($suc, {
        dropdownParent: $(modalSelector),
        placeholder: unica ? " " : "Seleccionar",
        allowClear: !unica
    });

    aplicarBloqueoSucursalUnica($suc, { sucursales: sucursalesCaja, triggerChange: false });
    sincronizarCuentasDesdeSucursal(selectorSucursal, modalSelector);
}

function cargarFiltroCuentas(idSucursal) {
    const $fCuenta = $("#fCuenta");
    const valorActual = $fCuenta.val();

    if ($fCuenta.data("select2")) {
        $fCuenta.select2("destroy");
    }

    $fCuenta.empty().append(`<option value="">Todas</option>`);

    cuentasPorSucursal(idSucursal).forEach(x => {
        $fCuenta.append(`<option value="${x.Id}">${etiquetaCuenta(x, true)}</option>`);
    });

    // Solo conservar la cuenta si sigue existiendo en el combo (mismo tipo de cuenta)
    if (valorActual && $fCuenta.find(`option[value="${valorActual}"]`).length) {
        $fCuenta.val(valorActual);
    } else {
        $fCuenta.val("");
    }

    ensureSelect2($fCuenta, {
        dropdownParent: $("#panelFiltrosCaja"),
        placeholder: "Todas",
        minimumResultsForSearch: 0
    });
}

function cargarCuentasModal(selectorCuenta, idSucursal, modalSelector) {
    const $cuenta = $(selectorCuenta);
    const valorActual = $cuenta.val();

    $cuenta.empty();

    if (!idSucursal) {
        $cuenta.append(`<option value="">Seleccione sucursal primero</option>`);
    } else {
        $cuenta.append(`<option value="">Seleccionar</option>`);
        cuentasPorSucursal(idSucursal).forEach(x => {
            $cuenta.append(`<option value="${x.Id}">${etiquetaCuenta(x, false)}</option>`);
        });
    }

    if (valorActual && $cuenta.find(`option[value="${valorActual}"]`).length) {
        $cuenta.val(valorActual);
    } else {
        $cuenta.val(null);
    }

    ensureSelect2($cuenta, {
        dropdownParent: $(modalSelector),
        placeholder: idSucursal ? "Seleccionar" : "Seleccione sucursal primero"
    });
}

/* =========================
   FILTROS EXTERNOS
========================= */

function resetearFiltrosCajaParaModo() {
    const unica = typeof usuarioTieneUnicaSucursal === "function"
        && usuarioTieneUnicaSucursal(sucursalesCaja);
    const $sucursal = $("#fSucursal");

    if (unica) {
        const idSucursalDefault = typeof getIdSucursalDefaultUsuario === "function"
            ? getIdSucursalDefaultUsuario(sucursalesCaja)
            : null;
        const idUnica = idSucursalDefault ?? sucursalesCaja[0]?.Id;
        $sucursal.val(idUnica != null ? String(idUnica) : "").trigger("change.select2");
    } else {
        $sucursal.val("").trigger("change.select2");
    }

    cargarFiltroCuentas($sucursal.val());
    $("#fCuenta").val("").trigger("change.select2");
    $("#fTipo").val("").trigger("change.select2");
    $("#fTexto").val("");
    CJ.filtrosServidor = null;
    CJ.filtrosActivos = false;
    actualizarEstadoFiltrosCaja();
}

function obtenerFiltrosCaja() {
    forzarFiltrosCajaAbiertos();

    const rawCuenta = $("#fCuenta").val();
    const rawSucursal = $("#fSucursal").val();
    const rawTipo = $("#fTipo").val();

    let idCuenta = rawCuenta != null && String(rawCuenta).trim() !== ""
        ? parseInt(rawCuenta, 10) : NaN;
    let idSucursal = rawSucursal != null && String(rawSucursal).trim() !== ""
        ? parseInt(rawSucursal, 10) : NaN;
    let tipo = rawTipo != null ? String(rawTipo).trim() : "";

    const sucursalValida = Number.isFinite(idSucursal)
        && (sucursalesCaja || []).some(x => String(x.Id) === String(idSucursal));
    if (Number.isFinite(idSucursal) && !sucursalValida) {
        idSucursal = NaN;
        $("#fSucursal").val("").trigger("change.select2");
    }

    const cuentaValida = Number.isFinite(idCuenta)
        && cuentasPorSucursal(Number.isFinite(idSucursal) ? idSucursal : null)
            .some(x => String(x.Id) === String(idCuenta));
    if (Number.isFinite(idCuenta) && !cuentaValida) {
        idCuenta = NaN;
        $("#fCuenta").val("").trigger("change.select2");
    }

    const tipoValido = tipo !== "" && $("#fTipo option").toArray()
        .some(option => String(option.value) === tipo);
    if (tipo && !tipoValido) {
        tipo = "";
        $("#fTipo").val("").trigger("change.select2");
    }

    CJ.filtrosServidor = {
        FechaDesde: $("#fFechaDesde").val() || null,
        FechaHasta: $("#fFechaHasta").val() || null,
        IdCuenta: Number.isFinite(idCuenta) ? idCuenta : null,
        IdSucursal: Number.isFinite(idSucursal) ? idSucursal : null,
        TipoMovimiento: tipo || null,
        Texto: ($("#fTexto").val() || "").trim() || null,
        TipoCuenta: getTipoCuentaFiltro()
    };

    return { ...CJ.filtrosServidor };
}

async function aplicarFiltrosCaja() {
    const filtros = obtenerFiltrosCaja();
    CJ.filtrosActivos = Object.values(filtros).some(x => x !== null && x !== "");
    actualizarEstadoFiltrosCaja();
    await cargarMovimientosYResumen();
}

async function limpiarFiltrosCaja() {
    inicializarFechasPorDefecto();
    resetearFiltrosCajaParaModo();
    limpiarFiltrosColumnasGrilla();
    await cargarMovimientosYResumen();
}

function actualizarEstadoFiltrosCaja() {
    const txt = CJ.filtrosActivos ? "Filtros activos" : "";
    $("#txtFiltrosEstadoCaja").text(txt);
}

/* =========================
   LISTA + RESUMEN
========================= */

async function cargarMovimientosYResumen() {
    try {
        forzarFiltrosCajaAbiertos();
        const filtros = obtenerFiltrosCaja();

        // Sync gastos→caja primero; despues cargar todo con los mismos filtros
        try {
            await fetch("/Cajas/SincronizarGastos", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" }
            });
        } catch (syncErr) {
            console.warn("Sync gastos caja:", syncErr);
        }

        const tasks = [cargarMovimientos(filtros), cargarResumen(filtros)];
        if (CAJA_MODO === "TESORERIA") {
            tasks.push(cargarResumenConsolidado(filtros));
        }
        await Promise.all(tasks);
        renderMovimientos();
        actualizarKpis();
        if (CAJA_MODO === "TESORERIA") {
            actualizarKpisConsolidado();
        }
        setTimeout(() => ajustarGrillaCaja(), 60);
    } catch (e) {
        console.error("Caja cargarMovimientosYResumen:", e);
        errorModal("No se pudieron cargar los movimientos de caja.");
    }
}

async function cargarMovimientos(filtros = null) {
    const response = await fetch(API.movimientos, {
        method: "POST",
        headers: {
            ...authHeaders(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(filtros ?? obtenerFiltrosCaja())
    });

    if (!response.ok) {
        errorModal("Error cargando movimientos.");
        return;
    }

    const data = await response.json();

    CJ.movimientosOriginal = data || [];
    CJ.movimientos = [...CJ.movimientosOriginal];
    CJ.movimientosMap = new Map();

    CJ.movimientos.forEach(x => {
        x.Ingreso = Number(x.Ingreso || 0);
        x.Egreso = Number(x.Egreso || 0);
        x.Saldo = Number(x.Saldo || 0);
        CJ.movimientosMap.set(x.Id, x);
    });
}

async function cargarResumen(filtros = null) {
    const response = await fetch(API.resumen, {
        method: "POST",
        headers: {
            ...authHeaders(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(filtros ?? obtenerFiltrosCaja())
    });

    if (!response.ok) {
        errorModal("Error cargando resumen.");
        return;
    }

    const data = await response.json();

    CJ.resumen = {
        saldoAnterior: Number(data.SaldoAnterior || 0),
        ingresos: Number(data.Ingresos || 0),
        egresos: Number(data.Egresos || 0),
        saldoActual: Number(data.SaldoActual || 0),
        cantidadMovimientos: Number(data.CantidadMovimientos || 0)
    };
}

async function cargarResumenConsolidado(filtros = null) {
    const response = await fetch(API.resumenConsolidado, {
        method: "POST",
        headers: {
            ...authHeaders(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(filtros ?? obtenerFiltrosCaja())
    });

    if (!response.ok) {
        errorModal("Error cargando resumen consolidado.");
        return;
    }

    CJ.resumenConsolidado = await response.json();
}

function renderOrigenCaja(origen) {
    const val = (origen || "").toUpperCase();
    if (val === "GASTOS") {
        return `<a href="/Gastos" class="rp-link-origen">Gastos</a>`;
    }
    return origen || "";
}

function renderMovimientos() {
    configurarDataTable(CJ.movimientos);
}

/* =========================
   ACCIONES GRID
========================= */

function renderAccionesCaja(id, row) {
    if (tipoMov(row) === "SALDO_ANTERIOR") {
        return "";
    }

    if (typeof renderAccionesGrid === "function" && row.PuedeEditar && row.PuedeEliminar) {
        return renderAccionesGrid(id, {
            ver: "verMovimiento",
            editar: "editarMovimiento",
            eliminar: "eliminarMovimiento"
        }, "Cajas");
    }

    let html = `<div class="rp-row-actions" data-id="${id}">`;

    html += `
        <button type="button"
            class="btn btn-sm rp-act rp-act-view"
            title="Ver"
            onclick="verMovimiento(${id})">
            <i class="fa fa-file-text-o"></i>
        </button>`;

    if (row.PuedeEditar) {
        html += `
        <button type="button"
            class="btn btn-sm rp-act rp-act-edit"
            title="Editar"
            onclick="editarMovimiento(${id})">
            <i class="fa fa-pencil-square-o"></i>
        </button>`;
    }

    if (row.PuedeEliminar) {
        html += `
        <button type="button"
            class="btn btn-sm rp-act rp-act-del"
            title="Eliminar"
            onclick="eliminarMovimiento(${id})">
            <i class="fa fa-trash-o"></i>
        </button>`;
    }

    html += `</div>`;
    return html;
}

/* =========================
   DATATABLE
========================= */

function $theadFiltrosCaja(api) {
    const dtApi = api || gridCaja;
    if (dtApi && typeof dtApi.table === "function") {
        return $(dtApi.table().header());
    }
    return $('#grd_Caja thead');
}

function $celdaFiltroColumnaCaja(index, api) {
    return $theadFiltrosCaja(api).find('tr.filters th').eq(index);
}

function asegurarFilaFiltrosCaja(api) {
    const $thead = $theadFiltrosCaja(api);
    if ($thead.find('tr.filters').length) return;

    const cols = api.columns().count();
    const $row = $('<tr class="filters"></tr>');
    for (let i = 0; i < cols; i++) {
        let cls = "";
        if (i === 0) cls = "rp-col-id-h";
        else if (i === 1) cls = "rp-col-acciones-h";
        $row.append($("<th></th>").addClass(cls));
    }
    $thead.append($row);
    if (typeof sincronizarFiltrosScrollHeadGrilla === "function") {
        sincronizarFiltrosScrollHeadGrilla(api, "#grd_Caja");
    }
}

/**
 * Limpia busquedas de columnas y controles de la fila de filtros.
 * Con sucursal unica, mantiene el filtro de sucursal aplicado por prepararFiltroSucursalDataTable.
 */
function limpiarFiltrosColumnasGrilla(api, opts = {}) {
    const dt = api || gridCaja;
    if (!dt) return;

    const unica = opts.preserveSucursalUnica !== false
        && typeof usuarioTieneUnicaSucursal === "function"
        && usuarioTieneUnicaSucursal();
    const sucursalSearch = unica ? dt.column(5).search() : "";

    dt.columns().every(function () {
        this.search("");
    });

    for (const config of columnConfig) {
        if (config.index === 5 && unica) continue;

        const cell = $celdaFiltroColumnaCaja(config.index);
        const $select = cell.find("select");
        const $input = cell.find("input");

        if ($select.length) {
            $select.val(null);
            if ($select.data("select2")) {
                $select.trigger("change.select2");
            }
        }
        if ($input.length) {
            $input.val("");
        }
    }

    if (unica && sucursalSearch) {
        dt.column(5).search(sucursalSearch);
    }

    dt.draw(false);
}

async function configurarDataTable(data) {

    if (!gridCaja) {

        gridCaja = $('#grd_Caja').DataTable({
            data: data,
            language: {
                emptyTable: "No hay registros",
                zeroRecords: "No hay registros con esos filtros",
                infoEmpty: "Sin registros",
                info: "Mostrando _START_ a _END_ de _TOTAL_",
                infoFiltered: "(filtrado de _MAX_)",
                lengthMenu: "Mostrar _MENU_ registros",
                search: "Buscar:",
                paginate: { first: "Primero", last: "Ultimo", next: "Siguiente", previous: "Anterior" }
            },
            autoWidth: false,
            columnDefs: typeof columnDefsGridLista === "function" ? columnDefsGridLista() : [],
            scrollX: true,
            scrollCollapse: true,
            columns: [
                columnaGridAcciones(null, "Cajas", function (id, type, row) {
                    return renderAccionesCaja(id, row);
                }),
                columnaGridId(),
                {
                    data: 'Fecha',
                    render: function (v, type, row) {
                        if (type === 'sort' || type === 'type') {
                            if (tipoMov(row) === "SALDO_ANTERIOR") {
                                return -999999999999;
                            }
                            return new Date(v).getTime();
                        }
                        return formatearFechaParaVista(v);
                    }
                },
                { data: 'TipoMovimiento', render: function (v, type, row) { return tipoMov(row) || v || ""; } },
                {
                    data: 'Origen',
                    render: function (v, type) {
                        if (type !== 'display') return v || "";
                        return renderOrigenCaja(v);
                    }
                },
                { data: 'Sucursal' },
                { data: 'Cuenta' },
                {
                    data: 'Concepto',
                    render: function (v, type, row) {
                        if (tipoMov(row) === "SALDO_ANTERIOR") {
                            return `<span class="badge bg-info">Saldo anterior</span>`;
                        }
                        return v || "";
                    }
                },
                {
                    data: 'Ingreso',
                    className: "text-end",
                    render: function (v) {
                        const n = Number(v || 0);
                        if (!n) return fmtMoney(v);
                        return `<span class="rp-money-in">${fmtMoney(v)}</span>`;
                    }
                },
                {
                    data: 'Egreso',
                    className: "text-end",
                    render: function (v) {
                        const n = Number(v || 0);
                        if (!n) return fmtMoney(v);
                        return `<span class="rp-money-out">${fmtMoney(v)}</span>`;
                    }
                },
                {
                    data: 'Saldo',
                    className: "text-end",
                    render: function (v) {
                        const n = Number(v || 0);
                        const cls = typeof clsSaldoMoney === "function" ? clsSaldoMoney(n) : "rp-money-zero";
                        return `<strong class="${cls}">${fmtMoney(n)}</strong>`;
                    }
                }
            ],
            order: [[2, 'asc']],
            dom: 'Bfrtip',
            buttons: typeof getBotonesExportacion === "function" ? getBotonesExportacion(null, "Cajas") : [],
            orderCellsTop: true,
            fixedHeader: false,
            initComplete: async function () {
                const api = this.api();
                try {
                    await armarFiltrosGrillaLista(api, '#grd_Caja', columnConfig, {
                        includeActivo: false,
                        panelTitle: 'Filtrar resultados cargados',
                        initSelect2: ($el) => inicializarSelect2Filtro($el),
                        onSelectChange: async (config, $select, api) => {
                            if (config.index !== 5) return;
                            const value = $select.val();
                            const $panel = $select.closest('.rp-grid-filtros-wrap');
                            const $cuentaSelect = $panel.find('.rp-grid-panel-field[data-col="6"]');
                            if (!$cuentaSelect.length) return;
                            const cuentas = await listaCuentasFilter(value || null);
                            $cuentaSelect.empty().append(`<option value="">Todos</option>`);
                            (cuentas || []).forEach(item => {
                                $cuentaSelect.append(`<option value="${item.Id}">${etiquetaCuenta(item)}</option>`);
                            });
                            inicializarSelect2Filtro($cuentaSelect);
                            $cuentaSelect.val("").trigger("change.select2");
                            api.column(6).search('').draw(false);
                        },
                        afterSelectBuild: async (config, $select) => {
                            if (config.index === 6) $select.addClass("rp-filter-select-cuenta");
                        }
                    });
                    configurarOpcionesColumnasCaja();
                } catch (ex) {
                    console.error("Filtros grilla caja:", ex);
                }
                actualizarKpis();
                setTimeout(() => ajustarGrillaCaja(), 50);
            }
        });

    } else {
        gridCaja.clear().rows.add(data || []).draw(false);
        actualizarKpis();
        setTimeout(() => ajustarGrillaCaja(), 50);
    }
}

window.ajustarGrillaCaja = function ajustarGrillaCaja() {
    if (!gridCaja) return;
    try {
        const $wrap = $("#grd_Caja").closest(".dt-dark-wrap");
        if ($wrap.length && ($wrap.is(":hidden") || $wrap.parents().filter(":hidden").length)) return;
        gridCaja.columns.adjust();
        gridCaja.draw(false);
        $($.fn.dataTable.tables(true)).DataTable().columns.adjust();
    } catch (e) {
        console.warn("ajustarGrillaCaja:", e);
    }
};

/* =========================
   FILTROS DATATABLE
========================= */

async function listaSucursalesFilter() {
    return await fetchSucursalesPermitidas(API.sucursales);
}

async function listaCuentasFilter(idSucursal = null) {
    return cuentasPorSucursal(idSucursal);
}

/* =========================
   CONFIG COLUMNAS
========================= */

function configurarOpcionesColumnasCaja() {
    const grid = $('#grd_Caja').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenuCaja');
    const storageKey = `Caja_Columnas`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        if (typeof esColumnaMenuGrilla === "function" ? esColumnaMenuGrilla(col) : (col.data && col.data !== "Id")) {
            const isChecked = savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;
            grid.column(index).visible(isChecked);

            const name = $('#grd_Caja thead tr').first().find('th').eq(index).text();

            container.append(`
                <li class="rp-dd-item">
                    <label class="rp-dd-label">
                        <input type="checkbox" class="toggle-column-caja" data-column="${index}" ${isChecked ? 'checked' : ''}>
                        <span>${name}</span>
                    </label>
                </li>
            `);
        }
    });

    $('.toggle-column-caja').off('change').on('change', function () {
        const columnIdx = parseInt($(this).data('column'), 10);
        const isChecked = $(this).is(':checked');

        savedConfig[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));
        grid.column(columnIdx).visible(isChecked);
    });
}

/* =========================
   KPIS
========================= */

function actualizarKpis() {
    const saldoAnterior = CJ.resumen.saldoAnterior || 0;
    const ingresos = CJ.resumen.ingresos || 0;
    const egresos = CJ.resumen.egresos || 0;
    const saldoActual = CJ.resumen.saldoActual ?? (saldoAnterior + ingresos - egresos);
    const cantidad = CJ.resumen.cantidadMovimientos ?? (CJ.movimientos || []).filter(m => tipoMov(m) !== "SALDO_ANTERIOR").length;

    $("#kpiSaldoAnterior").text(fmtMoney(saldoAnterior)).attr("class", "val " + (typeof clsSaldoMoney === "function" ? clsSaldoMoney(saldoAnterior) : ""));
    $("#kpiIngresos").text(fmtMoney(ingresos)).attr("class", "val rp-money-in");
    $("#kpiEgresos").text(fmtMoney(egresos)).attr("class", "val rp-money-out");
    $("#kpiSaldoActual").text(fmtMoney(saldoActual)).attr("class", "val " + (typeof clsSaldoMoney === "function" ? clsSaldoMoney(saldoActual) : ""));
    $("#kpiMovimientos").text(cantidad);

    const chip = $("#chipCajaEstado");
    chip.removeClass("ok warn neg");

    if (cantidad === 0 && ingresos === 0 && egresos === 0) {
        chip.addClass("warn").html(`<i class="fa fa-line-chart"></i> Sin datos`);
    } else if (saldoActual > 0) {
        chip.addClass("ok").html(`<i class="fa fa-arrow-up"></i> Saldo positivo ${fmtMoney(saldoActual)}`);
    } else if (saldoActual < 0) {
        chip.addClass("neg").html(`<i class="fa fa-arrow-down"></i> Saldo negativo ${fmtMoney(saldoActual)}`);
    } else {
        chip.addClass("warn").html(`<i class="fa fa-minus-circle"></i> Saldo cero`);
    }
}

function actualizarKpisConsolidado() {
    const data = CJ.resumenConsolidado || {};
    const ingE = Number(data.IngresosEfectivo || 0);
    const egrE = Number(data.EgresosEfectivo || 0);
    const ingB = Number(data.IngresosBanco || 0);
    const egrB = Number(data.EgresosBanco || 0);
    $("#kpiSaldoEfectivo").text(fmtMoney(data.SaldoEfectivo || 0)).attr("class", "val " + (typeof clsSaldoMoney === "function" ? clsSaldoMoney(data.SaldoEfectivo) : ""));
    $("#kpiSaldoBanco").text(fmtMoney(data.SaldoBanco || 0)).attr("class", "val " + (typeof clsSaldoMoney === "function" ? clsSaldoMoney(data.SaldoBanco) : ""));
    $("#kpiSaldoTotal").text(fmtMoney(data.SaldoTotal || 0)).attr("class", "val " + (typeof clsSaldoMoney === "function" ? clsSaldoMoney(data.SaldoTotal) : ""));
    $("#kpiIngEfectivo").text(fmtMoney(ingE)).attr("class", "val rp-money-in");
    $("#kpiEgrEfectivo").text(fmtMoney(egrE)).attr("class", "val rp-money-out");
    $("#kpiIngBanco").text(fmtMoney(ingB)).attr("class", "val rp-money-in");
    $("#kpiEgrBanco").text(fmtMoney(egrB)).attr("class", "val rp-money-out");
    const neto = (ingE + ingB) - (egrE + egrB);
    $("#kpiNetoConsolidado").text(fmtMoney(neto)).attr("class", "val " + (typeof clsSaldoMoney === "function" ? clsSaldoMoney(neto) : ""));
}

/* =========================
   VER / EDITAR / ELIMINAR
========================= */

async function verMovimiento(id) {
    try {
        const response = await fetch(API.movimiento(id), { headers: authHeaders() });
        if (!response.ok) throw new Error();

        const m = await response.json();

        $("#vmFecha").text(formatearFechaParaVista(m.Fecha));
        $("#vmTipo").text(m.TipoMovimiento || "");
        $("#vmOrigen").text(m.Origen || "");
        $("#vmSucursal").text(m.Sucursal || "");
        $("#vmCuenta").text(m.Cuenta || "");
        $("#vmConcepto").text(m.Concepto || "");
        $("#vmIngreso").text(fmtMoney(m.Ingreso || 0)).attr("class", "v rp-money-in");
        $("#vmEgreso").text(fmtMoney(m.Egreso || 0)).attr("class", "v rp-money-out");
        $("#vmSaldo").text(fmtMoney(m.Saldo || 0)).attr("class", "v " + (typeof clsSaldoMoney === "function" ? clsSaldoMoney(m.Saldo) : ""));

        $("#modalVerMovimiento").modal("show");
    } catch (e) {
        console.error(e);
        errorModal("No se pudo obtener el movimiento.");
    }
}

async function editarMovimiento(id) {
    try {
        const response = await fetch(API.movimiento(id), { headers: authHeaders() });
        if (!response.ok) throw new Error();

        const m = await response.json();

        if (!m.PuedeEditar) {
            errorModal("Este movimiento no se puede editar.");
            return;
        }

        const tipo = m.TipoMovimiento || "";

        if (tipo === "TRANSFERENCIA") {
            const idGrupo = m.IdMovimiento;
            const rt = await fetch(API.transferencia(idGrupo), { headers: authHeaders() });
            if (!rt.ok) throw new Error();

            const t = await rt.json();

            limpiarModalTransferencia();

            $("#tIdMovimientoGrupo").val(t.IdMovimientoGrupo || idGrupo || "");
            $("#tFecha").val(formatearFechaParaInput(t.Fecha));
            $("#tNota").val(t.NotaInterna || "");

            const idSucOrigen = t.IdSucursalOrigen || sucursalPorCuenta(t.IdCuentaOrigen);
            const idSucDestino = t.IdSucursalDestino || sucursalPorCuenta(t.IdCuentaDestino);

            cargarSucursalesModal("#tSucursalOrigen", "#modalTransferencia", idSucOrigen);
            cargarSucursalesModal("#tSucursalDestino", "#modalTransferencia", idSucDestino);
            cargarCuentasModal("#tCuentaOrigen", idSucOrigen, "#modalTransferencia");
            cargarCuentasModal("#tCuentaDestino", idSucDestino, "#modalTransferencia");

            $("#tCuentaOrigen").val(t.IdCuentaOrigen).trigger("change");
            $("#tCuentaDestino").val(t.IdCuentaDestino).trigger("change");

            const importe = t.ImporteOrigen || t.ImporteDestino || 0;
            $("#tImporte").val(formatearMiles(String(importe)));
            if (typeof aplicarFormatoMiles === "function") aplicarFormatoMiles();

            $("#modalTransferenciaLabel").text("Editar transferencia");
            $("#btnGuardarTransferencia").html(`<i class="fa fa-check"></i> Guardar`);
            $("#modalTransferencia").modal("show");
            return;
        }

        if (tipo === "INGRESO MANUAL") {
            limpiarModalIngreso();

            $("#iId").val(m.Id || "");
            $("#iFecha").val(formatearFechaParaInput(m.Fecha));

            const idSucIngreso = m.IdSucursal || sucursalPorCuenta(m.IdCuenta);
            cargarSucursalesModal("#iSucursal", "#modalIngreso", idSucIngreso);
            cargarCuentasModal("#iCuenta", idSucIngreso, "#modalIngreso");
            $("#iCuenta").val(m.IdCuenta).trigger("change");
            $("#iImporte").val(formatearMiles(String(m.Ingreso || 0)));
            $("#iConcepto").val(m.Concepto || "");
            if (typeof aplicarFormatoMiles === "function") aplicarFormatoMiles();

            $("#modalIngresoLabel").text("Editar ingreso manual");
            $("#btnGuardarIngreso").html(`<i class="fa fa-check"></i> Guardar`);
            $("#modalIngreso").modal("show");
            return;
        }

        if (tipo === "EGRESO MANUAL") {
            limpiarModalEgreso();

            $("#eId").val(m.Id || "");
            $("#eFecha").val(formatearFechaParaInput(m.Fecha));

            const idSucEgreso = m.IdSucursal || sucursalPorCuenta(m.IdCuenta);
            cargarSucursalesModal("#eSucursal", "#modalEgreso", idSucEgreso);
            cargarCuentasModal("#eCuenta", idSucEgreso, "#modalEgreso");
            $("#eCuenta").val(m.IdCuenta).trigger("change");
            $("#eImporte").val(formatearMiles(String(m.Egreso || 0)));
            $("#eConcepto").val(m.Concepto || "");
            if (typeof aplicarFormatoMiles === "function") aplicarFormatoMiles();

            $("#modalEgresoLabel").text("Editar egreso manual");
            $("#btnGuardarEgreso").html(`<i class="fa fa-check"></i> Guardar`);
            $("#modalEgreso").modal("show");
            return;
        }

        errorModal("Este tipo de movimiento no admite edicion desde esta pantalla.");
    } catch (e) {
        console.error(e);
        errorModal("No se pudo editar el movimiento.");
    }
}

async function eliminarMovimiento(id) {
    const confirmado = await confirmarModal("¿Desea eliminar este movimiento?");
    if (!confirmado) return;

    try {
        const response = await fetch(API.eliminar(id), {
            method: "DELETE",
            headers: authHeaders()
        });

        if (!response.ok) throw new Error();

        const data = await response.json();

        if (!data.valor) {
            errorModal(data.mensaje || "No se pudo eliminar.");
            return;
        }

        exitoModal(data.mensaje || "Movimiento eliminado correctamente.");
        await cargarMovimientosYResumen();
    } catch (e) {
        console.error(e);
        errorModal("Ha ocurrido un error al eliminar.");
    }
}

function valorCampoValidoCaja(el) {
    if (!el) return false;

    let valor;
    if (el.tagName === "SELECT") {
        valor = $(el).val();
    } else {
        valor = (el.value ?? "").toString().trim();
    }

    let esValido = valor !== null && valor !== "";

    if (el.id === "iImporte" || el.id === "eImporte" || el.id === "tImporte") {
        esValido = valor !== "" && parseNumero(valor) > 0;
    }

    return esValido;
}

function initValidacionesCaja() {
    if (typeof ValidacionModalAbm !== "function") return;

    const modalIngreso = document.getElementById("modalIngreso");
    if (modalIngreso) {
        validacionCajaIngreso = new ValidacionModalAbm({
            modalEl: modalIngreso,
            getPanel: () => document.getElementById("errorCamposIngreso"),
            campos: [
                { id: "iFecha", nombre: "Fecha" },
                { id: "iSucursal", nombre: "Sucursal" },
                { id: "iCuenta", nombre: "Cuenta" },
                { id: "iImporte", nombre: "Importe" },
                { id: "iConcepto", nombre: "Concepto" }
            ],
            esCampoValido: valorCampoValidoCaja,
            mostrarError: mostrarErrorCamposIngreso,
            cerrarPanel: cerrarErrorCamposIngreso
        });
        validacionCajaIngreso.attachEvents({ select2Namespace: "caja-ingreso" });
    }

    const modalEgreso = document.getElementById("modalEgreso");
    if (modalEgreso) {
        validacionCajaEgreso = new ValidacionModalAbm({
            modalEl: modalEgreso,
            getPanel: () => document.getElementById("errorCamposEgreso"),
            campos: [
                { id: "eFecha", nombre: "Fecha" },
                { id: "eSucursal", nombre: "Sucursal" },
                { id: "eCuenta", nombre: "Cuenta" },
                { id: "eImporte", nombre: "Importe" },
                { id: "eConcepto", nombre: "Concepto" }
            ],
            esCampoValido: valorCampoValidoCaja,
            mostrarError: mostrarErrorCamposEgreso,
            cerrarPanel: cerrarErrorCamposEgreso
        });
        validacionCajaEgreso.attachEvents({ select2Namespace: "caja-egreso" });
    }

    const modalTransferencia = document.getElementById("modalTransferencia");
    if (modalTransferencia) {
        validacionCajaTransferencia = new ValidacionModalAbm({
            modalEl: modalTransferencia,
            getPanel: () => document.getElementById("errorCamposTransferencia"),
            campos: [
                { id: "tFecha", nombre: "Fecha" },
                { id: "tSucursalOrigen", nombre: "Sucursal origen" },
                { id: "tCuentaOrigen", nombre: "Cuenta origen" },
                { id: "tSucursalDestino", nombre: "Sucursal destino" },
                { id: "tCuentaDestino", nombre: "Cuenta destino" },
                { id: "tImporte", nombre: "Importe" },
                { id: "tNota", nombre: "Nota / concepto" }
            ],
            esCampoValido: valorCampoValidoCaja,
            mostrarError: mostrarErrorCamposTransferencia,
            cerrarPanel: cerrarErrorCamposTransferencia
        });
        validacionCajaTransferencia.attachEvents({ select2Namespace: "caja-transferencia" });
    }
}

/* =========================
   MODAL INGRESO
========================= */

function abrirModalIngreso() {
    limpiarModalIngreso();
    $("#iFecha").val(moment().format("YYYY-MM-DD"));
    $("#modalIngresoLabel").text("Ingreso manual");
    $("#btnGuardarIngreso").html(`<i class="fa fa-check"></i> Registrar`);
    $("#modalIngreso").modal("show");
}

function limpiarModalIngreso() {
    $("#iId").val("");

    $("#modalIngreso input").each(function () {
        if (this.id !== "iId") this.value = "";
        this.classList.remove("is-invalid", "is-valid");
    });

    $("#modalIngreso select").each(function () {
        $(this).val(null).trigger("change.select2");
        this.classList.remove("is-invalid", "is-valid");
        if ($(this).data("select2")) {
            $(this).next(".select2").find(".select2-selection").removeClass("is-invalid is-valid");
        }
    });

    cargarSucursalesModal("#iSucursal", "#modalIngreso", null);
    validacionCajaIngreso?.reset();
}

function validarCampoIngresoIndividual(el) {
    if (el?.target) el = el.target;
    return validacionCajaIngreso?.onBlur(el);
}

function validarIngreso() {
    return validacionCajaIngreso?.validarTodos() ?? false;
}

async function guardarIngreso() {
    if (!validarIngreso()) return;

    return withBusy("#btnGuardarIngreso", async () => {
    const id = ($("#iId").val() || "").trim();

    const modelo = {
        Id: id !== "" ? parseInt(id, 10) : null,
        Fecha: $("#iFecha").val(),
        IdCuenta: $("#iCuenta").val() ? parseInt($("#iCuenta").val(), 10) : null,
        Importe: parseNumero($("#iImporte").val()),
        Concepto: ($("#iConcepto").val() || "").trim()
    };

    const url = id === "" ? API.registrarIngreso : API.actualizarMovimientoManual;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                ...authHeaders(),
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(modelo)
        });

        if (!response.ok) throw new Error();

        const data = await response.json();

        if (!data.valor) {
            mostrarErrorCamposIngreso(data.mensaje || "No se pudo guardar.");
            return;
        }

        cerrarErrorCamposIngreso();
        $("#modalIngreso").modal("hide");
        exitoModal(data.mensaje || (id === "" ? "Ingreso registrado correctamente." : "Ingreso modificado correctamente."));
        await cargarMovimientosYResumen();
    } catch (e) {
        console.error(e);
        mostrarErrorCamposIngreso("Ha ocurrido un error inesperado al guardar.");
    }
    });
}

function mostrarErrorCamposIngreso(mensaje) {
    validacionCajaIngreso?.cancelarPanelExito?.();
    const panel = $("#errorCamposIngreso");
    panel.removeClass("d-none rp-panel-exito");
    panel.find(".rp-error-title").text("Campos requeridos");
    panel.find(".rp-error-icon i").attr("class", "fa fa-exclamation-circle");
    panel.find(".rp-error-message").html(mensaje || "");
}

function cerrarErrorCamposIngreso() {
    const panel = document.getElementById("errorCamposIngreso");
    if (!panel) return;
    validacionCajaIngreso?.restaurarPanelEstructura?.();
    panel.classList.add("d-none");
    const msg = panel.querySelector(".rp-error-message");
    if (msg) msg.innerHTML = "";
}

/* =========================
   MODAL EGRESO
========================= */

function abrirModalEgreso() {
    limpiarModalEgreso();
    $("#eFecha").val(moment().format("YYYY-MM-DD"));
    $("#modalEgresoLabel").text("Egreso manual");
    $("#btnGuardarEgreso").html(`<i class="fa fa-check"></i> Registrar`);
    $("#modalEgreso").modal("show");
}

function limpiarModalEgreso() {
    $("#eId").val("");

    $("#modalEgreso input").each(function () {
        if (this.id !== "eId") this.value = "";
        this.classList.remove("is-invalid", "is-valid");
    });

    $("#modalEgreso select").each(function () {
        $(this).val(null).trigger("change.select2");
        this.classList.remove("is-invalid", "is-valid");
        if ($(this).data("select2")) {
            $(this).next(".select2").find(".select2-selection").removeClass("is-invalid is-valid");
        }
    });

    cargarSucursalesModal("#eSucursal", "#modalEgreso", null);
    validacionCajaEgreso?.reset();
}

function validarCampoEgresoIndividual(el) {
    if (el?.target) el = el.target;
    return validacionCajaEgreso?.onBlur(el);
}

function validarEgreso() {
    return validacionCajaEgreso?.validarTodos() ?? false;
}

async function guardarEgreso() {
    if (!validarEgreso()) return;

    return withBusy("#btnGuardarEgreso", async () => {
    const id = ($("#eId").val() || "").trim();

    const modelo = {
        Id: id !== "" ? parseInt(id, 10) : null,
        Fecha: $("#eFecha").val(),
        IdCuenta: $("#eCuenta").val() ? parseInt($("#eCuenta").val(), 10) : null,
        Importe: parseNumero($("#eImporte").val()),
        Concepto: ($("#eConcepto").val() || "").trim()
    };

    const url = id === "" ? API.registrarEgreso : API.actualizarMovimientoManual;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                ...authHeaders(),
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(modelo)
        });

        if (!response.ok) throw new Error();

        const data = await response.json();

        if (!data.valor) {
            mostrarErrorCamposEgreso(data.mensaje || "No se pudo guardar.");
            return;
        }

        cerrarErrorCamposEgreso();
        $("#modalEgreso").modal("hide");
        exitoModal(data.mensaje || (id === "" ? "Egreso registrado correctamente." : "Egreso modificado correctamente."));
        await cargarMovimientosYResumen();
    } catch (e) {
        console.error(e);
        mostrarErrorCamposEgreso("Ha ocurrido un error inesperado al guardar.");
    }
    });
}

function mostrarErrorCamposEgreso(mensaje) {
    validacionCajaEgreso?.cancelarPanelExito?.();
    const panel = $("#errorCamposEgreso");
    panel.removeClass("d-none rp-panel-exito");
    panel.find(".rp-error-title").text("Campos requeridos");
    panel.find(".rp-error-icon i").attr("class", "fa fa-exclamation-circle");
    panel.find(".rp-error-message").html(mensaje || "");
}

function cerrarErrorCamposEgreso() {
    const panel = document.getElementById("errorCamposEgreso");
    if (!panel) return;
    validacionCajaEgreso?.restaurarPanelEstructura?.();
    panel.classList.add("d-none");
    const msg = panel.querySelector(".rp-error-message");
    if (msg) msg.innerHTML = "";
}

/* =========================
   MODAL TRANSFERENCIA
========================= */

function abrirModalTransferencia() {
    limpiarModalTransferencia();
    $("#tFecha").val(moment().format("YYYY-MM-DD"));
    $("#modalTransferenciaLabel").text("Transferencia entre cuentas");
    $("#btnGuardarTransferencia").html(`<i class="fa fa-check"></i> Registrar`);
    $("#modalTransferencia").modal("show");
}

function limpiarModalTransferencia() {
    $("#tIdMovimientoGrupo").val("");

    $("#modalTransferencia input").each(function () {
        if (this.id !== "tIdMovimientoGrupo") this.value = "";
        this.classList.remove("is-invalid", "is-valid");
    });

    $("#modalTransferencia select").each(function () {
        $(this).val(null).trigger("change.select2");
        this.classList.remove("is-invalid", "is-valid");
        if ($(this).data("select2")) {
            $(this).next(".select2").find(".select2-selection").removeClass("is-invalid is-valid");
        }
    });

    cargarSucursalesModal("#tSucursalOrigen", "#modalTransferencia", null);
    cargarSucursalesModal("#tSucursalDestino", "#modalTransferencia", null);
    validacionCajaTransferencia?.reset();
}

function validarCampoTransferenciaIndividual(el) {
    if (el?.target) el = el.target;
    return validacionCajaTransferencia?.onBlur(el);
}

function validarTransferencia() {
    if (!validacionCajaTransferencia?.validarTodos()) return false;

    const idCuentaOrigen = $("#tCuentaOrigen").val();
    const idCuentaDestino = $("#tCuentaDestino").val();

    if (idCuentaOrigen && idCuentaDestino && String(idCuentaOrigen) === String(idCuentaDestino)) {
        validacionCajaTransferencia?.cancelarPanelExito?.();
        mostrarErrorCamposTransferencia(
            `Revisa los siguientes campos/reglas:<br><strong>Origen y destino no pueden ser la misma cuenta</strong>`
        );
        return false;
    }

    return true;
}

async function guardarTransferencia() {
    if (!validarTransferencia()) return;

    return withBusy("#btnGuardarTransferencia", async () => {
    const idGrupo = ($("#tIdMovimientoGrupo").val() || "").trim();

    const modelo = {
        IdMovimientoGrupo: idGrupo !== "" ? parseInt(idGrupo, 10) : null,
        Fecha: $("#tFecha").val(),
        IdCuentaOrigen: $("#tCuentaOrigen").val() ? parseInt($("#tCuentaOrigen").val(), 10) : null,
        IdCuentaDestino: $("#tCuentaDestino").val() ? parseInt($("#tCuentaDestino").val(), 10) : null,
        Importe: parseNumero($("#tImporte").val()),
        NotaInterna: ($("#tNota").val() || "").trim()
    };

    const url = idGrupo === "" ? API.registrarTransferencia : API.actualizarTransferencia;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                ...authHeaders(),
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(modelo)
        });

        if (!response.ok) throw new Error();

        const data = await response.json();

        if (!data.valor) {
            mostrarErrorCamposTransferencia(data.mensaje || "No se pudo guardar.");
            return;
        }

        cerrarErrorCamposTransferencia();
        $("#modalTransferencia").modal("hide");
        exitoModal(data.mensaje || (idGrupo === "" ? "Transferencia registrada correctamente." : "Transferencia modificada correctamente."));
        await cargarMovimientosYResumen();
    } catch (e) {
        console.error(e);
        mostrarErrorCamposTransferencia("Ha ocurrido un error inesperado al guardar.");
    }
    });
}

function mostrarErrorCamposTransferencia(mensaje) {
    validacionCajaTransferencia?.cancelarPanelExito?.();
    const panel = $("#errorCamposTransferencia");
    panel.removeClass("d-none rp-panel-exito");
    panel.find(".rp-error-title").text("Campos requeridos");
    panel.find(".rp-error-icon i").attr("class", "fa fa-exclamation-circle");
    panel.find(".rp-error-message").html(mensaje || "");
}

function cerrarErrorCamposTransferencia() {
    const panel = document.getElementById("errorCamposTransferencia");
    if (!panel) return;
    validacionCajaTransferencia?.restaurarPanelEstructura?.();
    panel.classList.add("d-none");
    const msg = panel.querySelector(".rp-error-message");
    if (msg) msg.innerHTML = "";
}

/* =========================
   HELPERS
========================= */

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fmtMoney(n) {
    const num = Number(n || 0);
    const partes = num.toFixed(2).split(".");
    const formateado = formatearMiles(partes[0] + "," + partes[1]);
    return "$ " + (formateado || "0,00");
}
