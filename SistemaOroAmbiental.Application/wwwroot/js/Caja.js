/* =========================================================
   CAJA.JS
   - misma arquitectura que tus otros módulos
   - filtros externos + filtros por columna
   - validaciones visuales
   - moment correcto
   - registrar / guardar según alta o edición
========================================================= */

let gridCaja;
let monedasCaja = [];
let cuentasFiltro = [];
let cuentasCache = [];
let cuentasPorMonedaMap = new Map();

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
    filtrosActivos: false
};

/**
 * Columnas:
 * 0 Acciones
 * 1 Fecha
 * 2 Tipo
 * 3 Origen
 * 4 Cuenta
 * 5 Moneda
 * 6 Concepto
 * 7 Ingreso
 * 8 Egreso
 * 9 Saldo
 */
const columnConfig = [

    { index: 1, filterType: 'text' },           // Fecha
    { index: 2, filterType: 'select_local' },   // Tipo
    { index: 3, filterType: 'select_local' },   // Origen

    { index: 4, filterType: 'select', fetchDataFunc: listaMonedasFilter }, // Moneda
    { index: 5, filterType: 'select', fetchDataFunc: listaCuentasFilter }, // Cuenta

    { index: 6, filterType: 'text' },           // Concepto

    { index: 7, filterType: 'number' },         // Ingreso
    { index: 8, filterType: 'number' },         // Egreso
    { index: 9, filterType: 'number' }          // Saldo
];

const API = {
    movimientos: "/Caja/Movimientos",
    resumen: "/Caja/Resumen",
    movimiento: id => `/Caja/Movimiento?id=${id}`,
    transferencia: id => `/Caja/Transferencia?id=${id}`,

    registrarIngreso: "/Caja/RegistrarIngreso",
    registrarEgreso: "/Caja/RegistrarEgreso",
    actualizarMovimientoManual: "/Caja/ActualizarMovimientoManual",

    registrarTransferencia: "/Caja/RegistrarTransferencia",
    actualizarTransferencia: "/Caja/ActualizarTransferencia",

    eliminar: id => `/Caja/Eliminar?id=${id}`,

    monedas: "/PaisesMoneda/Lista",
    cuentasPorMoneda: idMoneda => `/MonedasCuenta/ListaMoneda?idMoneda=${idMoneda}`
};

const authHeaders = () => ({
    'Authorization': 'Bearer ' + token
});

$(document).ready(async () => {

    Permisos.init();
    Permisos.aplicarUI("Cajas");

    // igual que hacés en otros lados
    $(document).off("click.select2fix").on(
        "click.select2fix",
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

    await cargarMonedas();

    inicializarSelect2Caja();

    await cargarMovimientosYResumen();

    // validaciones campo a campo
    document.querySelectorAll("#modalIngreso input, #modalIngreso select").forEach(el => {
        el.setAttribute("autocomplete", "off");
        el.addEventListener("input", () => validarCampoIngresoIndividual(el));
        el.addEventListener("change", () => validarCampoIngresoIndividual(el));
        el.addEventListener("blur", () => validarCampoIngresoIndividual(el));
    });

    document.querySelectorAll("#modalEgreso input, #modalEgreso select").forEach(el => {
        el.setAttribute("autocomplete", "off");
        el.addEventListener("input", () => validarCampoEgresoIndividual(el));
        el.addEventListener("change", () => validarCampoEgresoIndividual(el));
        el.addEventListener("blur", () => validarCampoEgresoIndividual(el));
    });

    document.querySelectorAll("#modalTransferencia input, #modalTransferencia select").forEach(el => {
        el.setAttribute("autocomplete", "off");
        el.addEventListener("input", () => validarCampoTransferenciaIndividual(el));
        el.addEventListener("change", () => validarCampoTransferenciaIndividual(el));
        el.addEventListener("blur", () => validarCampoTransferenciaIndividual(el));
    });

    $("#modalIngreso").on("select2:select select2:clear change", "select", function () {
        validarCampoIngresoIndividual(this);
    });

    $("#modalEgreso").on("select2:select select2:clear change", "select", function () {
        validarCampoEgresoIndividual(this);
    });

    $("#modalTransferencia").on("select2:select select2:clear change", "select", function () {
        validarCampoTransferenciaIndividual(this);
    });
});

/* =========================
   SELECT2 HELPERS
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

function inicializarSelect2Caja() {
    ensureSelect2($("#fMoneda"), {
        dropdownParent: $("#panelFiltrosCaja"),
        placeholder: "Todas",
        minimumResultsForSearch: 0
    });

    ensureSelect2($("#fCuenta"), {
        dropdownParent: $("#panelFiltrosCaja"),
        placeholder: "Todas",
        minimumResultsForSearch: 0
    });

    ensureSelect2($("#fTipo"), {
        dropdownParent: $("#panelFiltrosCaja"),
        placeholder: "Todos",
        minimumResultsForSearch: 0
    });

    ensureSelect2($("#iMoneda"), {
        dropdownParent: $("#modalIngreso"),
        placeholder: "Seleccionar"
    });

    ensureSelect2($("#iCuenta"), {
        dropdownParent: $("#modalIngreso"),
        placeholder: "Seleccionar"
    });

    ensureSelect2($("#eMoneda"), {
        dropdownParent: $("#modalEgreso"),
        placeholder: "Seleccionar"
    });

    ensureSelect2($("#eCuenta"), {
        dropdownParent: $("#modalEgreso"),
        placeholder: "Seleccionar"
    });

    ensureSelect2($("#tMonedaOrigen"), {
        dropdownParent: $("#modalTransferencia"),
        placeholder: "Seleccionar"
    });

    ensureSelect2($("#tCuentaOrigen"), {
        dropdownParent: $("#modalTransferencia"),
        placeholder: "Seleccionar"
    });

    ensureSelect2($("#tMonedaDestino"), {
        dropdownParent: $("#modalTransferencia"),
        placeholder: "Seleccionar"
    });

    ensureSelect2($("#tCuentaDestino"), {
        dropdownParent: $("#modalTransferencia"),
        placeholder: "Seleccionar"
    });
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
   MOMENT HELPERS
========================= */



function formatearFechaHoraParaVista(fecha) {
    const m = moment(fecha, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('DD/MM/YYYY HH:mm') : '';
}

/* =========================
   INIT / EVENTOS
========================= */

function wireEventos() {

    $("#btnRefreshCaja").on("click", async () => {
        await cargarMovimientosYResumen();
    });

    $("#btnIngreso").on("click", abrirModalIngreso);
    $("#btnEgreso").on("click", abrirModalEgreso);
    $("#btnTransferencia").on("click", abrirModalTransferencia);

    $("#fMoneda").on("change", async function () {
        const idMoneda = $(this).val();
        await cargarFiltroCuentasPorMoneda(idMoneda);
    });

    $("#iMoneda").on("change", async function () {
        const idMoneda = $(this).val();
        await cargarCuentasModal("#iCuenta", idMoneda, "#modalIngreso");
        validarCampoIngresoIndividual(this);
        validarCampoIngresoIndividual(document.getElementById("iCuenta"));
    });

    $("#eMoneda").on("change", async function () {
        const idMoneda = $(this).val();
        await cargarCuentasModal("#eCuenta", idMoneda, "#modalEgreso");
        validarCampoEgresoIndividual(this);
        validarCampoEgresoIndividual(document.getElementById("eCuenta"));
    });

    $("#tMonedaOrigen").on("change", async function () {
        const idMoneda = $(this).val();
        await cargarCuentasModal("#tCuentaOrigen", idMoneda, "#modalTransferencia");
        validarCampoTransferenciaIndividual(this);
        validarCampoTransferenciaIndividual(document.getElementById("tCuentaOrigen"));
    });

    $("#tMonedaDestino").on("change", async function () {
        const idMoneda = $(this).val();
        await cargarCuentasModal("#tCuentaDestino", idMoneda, "#modalTransferencia");
        validarCampoTransferenciaIndividual(this);
        validarCampoTransferenciaIndividual(document.getElementById("tCuentaDestino"));
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

async function cargarMonedas() {
    try {
        const response = await fetch(API.monedas, {
            headers: authHeaders()
        });

        if (!response.ok) throw new Error("Error cargando monedas");

        monedasCaja = await response.json();

        await precargarCuentasCache();

        cargarCombosMonedas();
    } catch (e) {
        console.error(e);
        monedasCaja = [];
        cuentasCache = [];
        cuentasPorMonedaMap = new Map();
        cargarCombosMonedas();
    }
}
function cargarCombosMonedas() {

    const $fMoneda = $("#fMoneda");
    const $iMoneda = $("#iMoneda");
    const $eMoneda = $("#eMoneda");
    const $tMonedaOrigen = $("#tMonedaOrigen");
    const $tMonedaDestino = $("#tMonedaDestino");

    $fMoneda.empty().append(`<option value="">Todas</option>`);
    $iMoneda.empty().append(`<option value="">Seleccionar</option>`);
    $eMoneda.empty().append(`<option value="">Seleccionar</option>`);
    $tMonedaOrigen.empty().append(`<option value="">Seleccionar</option>`);
    $tMonedaDestino.empty().append(`<option value="">Seleccionar</option>`);

    (monedasCaja || []).forEach(x => {
        const nombre = x.Nombre || x.nombre || x.Simbolo || "Moneda";

        $fMoneda.append(`<option value="${x.Id}">${nombre}</option>`);
        $iMoneda.append(`<option value="${x.Id}">${nombre}</option>`);
        $eMoneda.append(`<option value="${x.Id}">${nombre}</option>`);
        $tMonedaOrigen.append(`<option value="${x.Id}">${nombre}</option>`);
        $tMonedaDestino.append(`<option value="${x.Id}">${nombre}</option>`);
    });

    $("#fCuenta").empty().append(`<option value="">Todas</option>`);
    $("#iCuenta").empty().append(`<option value="">Seleccionar</option>`);
    $("#eCuenta").empty().append(`<option value="">Seleccionar</option>`);
    $("#tCuentaOrigen").empty().append(`<option value="">Seleccionar</option>`);
    $("#tCuentaDestino").empty().append(`<option value="">Seleccionar</option>`);

    inicializarSelect2Caja();
}

async function cargarFiltroCuentasPorMoneda(idMoneda) {

    const $fCuenta = $("#fCuenta");
    $fCuenta.empty().append(`<option value="">Todas</option>`);

    if (!idMoneda) {
        inicializarSelect2Caja();
        return;
    }

    const cuentas = cuentasPorMonedaMap.get(String(idMoneda)) || [];

    cuentas.forEach(x => {
        $fCuenta.append(`<option value="${x.Id}">${x.Nombre}</option>`);
    });

    inicializarSelect2Caja();
}

async function cargarCuentasModal(selectorCuenta, idMoneda, modalSelector) {

    const $cuenta = $(selectorCuenta);
    $cuenta.empty().append(`<option value="">Seleccionar</option>`);

    if (!idMoneda) {
        ensureSelect2($cuenta, { dropdownParent: $(modalSelector) });
        return;
    }

    const cuentas = cuentasPorMonedaMap.get(String(idMoneda)) || [];

    cuentas.forEach(x => {
        $cuenta.append(`<option value="${x.Id}">${x.Nombre}</option>`);
    });

    ensureSelect2($cuenta, { dropdownParent: $(modalSelector) });
}

/* =========================
   FILTROS EXTERNOS
========================= */

function obtenerFiltrosCaja() {
    return {
        FechaDesde: $("#fFechaDesde").val() || null,
        FechaHasta: $("#fFechaHasta").val() || null,
        IdMoneda: $("#fMoneda").val() || null,
        IdCuenta: $("#fCuenta").val() || null,
        TipoMov: $("#fTipo").val() || null,
        Texto: ($("#fTexto").val() || "").trim() || null
    };
}

async function aplicarFiltrosCaja() {

    const filtros = obtenerFiltrosCaja();

    CJ.filtrosActivos = Object.values(filtros).some(x => x !== null && x !== "");

    actualizarEstadoFiltrosCaja();

    await cargarMovimientosYResumen();
}

async function limpiarFiltrosCaja() {

    inicializarFechasPorDefecto();

    $("#fMoneda").val("").trigger("change");
    $("#fCuenta").empty().append(`<option value="">Todas</option>`).trigger("change");
    $("#fTipo").val("").trigger("change");
    $("#fTexto").val("");

    CJ.filtrosActivos = false;
    actualizarEstadoFiltrosCaja();

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
    await Promise.all([
        cargarMovimientos(),
        cargarResumen()
    ]);

    renderMovimientos();
    actualizarKpis();
}

async function cargarMovimientos() {

    const response = await fetch(API.movimientos, {
        method: "POST",
        headers: {
            ...authHeaders(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(obtenerFiltrosCaja())
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
async function cargarResumen() {

    const response = await fetch(API.resumen, {
        method: "POST",
        headers: {
            ...authHeaders(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(obtenerFiltrosCaja())
    });

    if (!response.ok) {
        errorModal("Error cargando resumen.");
        return;
    }

    const data = await response.json();

    CJ.resumen = {
        saldoAnterior: Number(data.SaldoAnterior || 0),
        ingresos: Number(data.Ingresos || data.ingresos || 0),
        egresos: Number(data.Egresos || data.egresos || 0),
        saldoActual: Number(data.SaldoActual || 0),
        cantidadMovimientos: Number(data.CantidadMovimientos || 0)
    };
}

function renderMovimientos() {
    configurarDataTable(CJ.movimientos);
}

/* =========================
   DATATABLE
========================= */

async function configurarDataTable(data) {

    if (!gridCaja) {

        const $thead = $('#grd_Caja thead');
        if ($thead.find('tr.filters').length === 0) {
            $thead.find('tr').first().clone(true).addClass('filters').appendTo($thead);
        }

        gridCaja = $('#grd_Caja').DataTable({
            data: data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: true,
            scrollCollapse: true,

            columns: [
                {
                    data: "Id",
                    title: '',
                    width: "1%",
                    render: function (data, type, row) {

                            if (row.TipoMov === "SALDO_ANTERIOR")
                                return "";

                        if (typeof renderAccionesGrid === "function") {
                                    return renderAccionesGrid(data, {
                                        ver: "verMovimiento",
                                        editar: "editarMovimiento",
                                        eliminar:  "eliminarMovimiento"
                                    }, "Cajas");
                                

                            }

                            return "";
                        

                        let html = `
<div class="cc-actions">
    <button class="cc-btn ver" onclick="verMovimiento(${data})">
        <i class="fa fa-eye"></i>
    </button>
`;

                        if (row.PuedeEditar) {
                            html += `
    <button class="cc-btn edit" onclick="editarMovimiento(${data})">
        <i class="fa fa-pencil"></i>
    </button>
`;
                        }

                        if (row.PuedeEliminar) {
                            html += `
    <button class="cc-btn del" onclick="eliminarMovimiento(${data})">
        <i class="fa fa-trash"></i>
    </button>
`;
                        }

                        html += `</div>`;

                        return html;
                    },
                    orderable: false,
                    searchable: false,
                },

                {
                    data: 'Fecha',
                    render: function (v, type, row) {

                        if (type === 'sort') {

                            // saldo anterior siempre primero
                            if (row.TipoMov === "SALDO_ANTERIOR")
                                return -999999999999;

                            return new Date(v).getTime();
                        }

                        return formatearFechaParaVista(v);
                    }
                },

                { data: 'TipoMov' },
                { data: 'Origen' },
                { data: 'Moneda' },
                { data: 'Cuenta' },
                
                {
                    data: 'Concepto',
                    render: function (v, type, row) {

                        if (row.TipoMov === "SALDO_ANTERIOR") {
                            return `<span class="badge bg-info">Saldo anterior</span>`;
                        }

                        return v;
                    }
                },

                {
                    data: 'Ingreso',
                    className: "text-end",
                    render: function (v) {
                        return formatearNumero(v);
                    }
                },

                {
                    data: 'Egreso',
                    className: "text-end",
                    render: function (v) {
                        return formatearNumero(v);
                    }
                },

                {
                    data: 'Saldo',
                    className: "text-end",
                    render: function (v) {

                        const n = Number(v || 0);

                        let cls = "saldo-cero";
                        if (n > 0) cls = "saldo-deuda";
                        if (n < 0) cls = "saldo-favor";

                        return `<strong class="${cls}">${formatearNumero(n)}</strong>`;
                    }
                }
            ],

            order: [
                [0, 'asc'], // prioridad
                [2, 'asc'], // fecha
                [1, 'asc']  // id
            ],

            dom: 'Bfrtip',
            buttons: getBotonesExportacion(gridCaja, "Cajas"),

            orderCellsTop: true,
            fixedHeader: true,

            initComplete: async function () {
                const api = this.api();

                for (const config of columnConfig) {

                    const cell = $('.filters th').eq(config.index);
                    if (!cell.length) continue;

                    cell.empty();

                    if (config.filterType === 'select' || config.filterType === 'select_local') {

                        const $select = $(`
                <select class="rp-filter-select" style="width:100%">
                    <option value="">Todos</option>
                </select>
            `).appendTo(cell);

                        if (config.index === 4) {
                            $select.addClass("rp-filter-select-moneda");
                        }

                        if (config.index === 5) {
                            $select.addClass("rp-filter-select-cuenta");
                        }

                        if (config.filterType === 'select') {
                            const datos = await config.fetchDataFunc();

                            (datos || []).forEach(item => {
                                $select.append(`<option value="${item.Id}">${item.Nombre}</option>`);
                            });

                        } else {
                            const uniques = new Set();

                            api.column(config.index).data().each(v => {
                                const txt = (v ?? "").toString().trim();
                                if (txt) uniques.add(txt);
                            });

                            [...uniques].sort().forEach(txt => {
                                $select.append(`<option value="${txt}">${txt}</option>`);
                            });
                        }

                        inicializarSelect2Filtro($select);

                        $select.on('select2:clear', function () {
                            api.column(config.index).search('').draw(false);
                        });

                        $select.on('change', async function () {

                            const value = $(this).val();

                            if (config.index === 4) {
                                const monedaSeleccionada = value;
                                const $cuentaSelect = $('.filters th').eq(5).find('select.rp-filter-select-cuenta');

                                if ($cuentaSelect.length) {

                                    const cuentas = await listaCuentasFilter(monedaSeleccionada || null);

                                    $cuentaSelect.empty().append(`<option value="">Todos</option>`);

                                    (cuentas || []).forEach(item => {
                                        $cuentaSelect.append(`<option value="${item.Id}">${item.Nombre}</option>`);
                                    });

                                    inicializarSelect2Filtro($cuentaSelect);
                                    $cuentaSelect.val("").trigger("change.select2");
                                    api.column(5).search('').draw(false);
                                }
                            }

                            if (!value) {
                                api.column(config.index).search('').draw(false);
                                return;
                            }

                            const text = $(this).find('option:selected').text();

                            api.column(config.index)
                                .search('^' + escapeRegex(text) + '$', true, false)
                                .draw(false);
                        });

                    } else if (config.filterType === 'number') {

                        $(`
                <input type="number"
                       step="0.01"
                       class="rp-filter-input"
                       placeholder="Buscar...">
            `)
                            .appendTo(cell)
                            .on('keyup change', function () {
                                const val = this.value;

                                if (!val) {
                                    api.column(config.index).search('').draw(false);
                                    return;
                                }

                                api.column(config.index).search(val).draw(false);
                            });

                    } else {

                        $(`<input class="rp-filter-input" type="text" placeholder="Buscar...">`)
                            .appendTo(cell)
                            .on('keyup change', function () {
                                api.column(config.index).search(this.value).draw(false);
                            });
                    }
                }

                $('.filters th').eq(0).html('');

                configurarOpcionesColumnasCaja();
                actualizarKpis();
            }
        });

    } else {
        gridCaja.clear().rows.add(data).draw(false);
        actualizarKpis();
    }
}

/* =========================
   FILTROS DATOS
========================= */

async function listaMonedasFilter() {
    try {
        const response = await fetch(API.monedas, {
            headers: authHeaders()
        });

        if (!response.ok) throw new Error();

        const data = await response.json();

        return (data || []).map(x => ({
            Id: x.Id,
            Nombre: x.Nombre || x.Simbolo || "Moneda"
        }));
    } catch {
        return [];
    }
}

async function listaCuentasFilter() {
    try {
        const idsMoneda = (monedasCaja || []).map(x => x.Id);

        const listas = await Promise.all(
            idsMoneda.map(async idMoneda => {
                try {
                    const response = await fetch(API.cuentasPorMoneda(idMoneda), {
                        headers: authHeaders()
                    });

                    if (!response.ok) return [];

                    return await response.json();
                } catch {
                    return [];
                }
            })
        );

        const flat = listas.flat();
        const map = new Map();

        flat.forEach(x => {
            if (!map.has(x.Id)) {
                map.set(x.Id, { Id: x.Id, Nombre: x.Nombre });
            }
        });

        return [...map.values()].sort((a, b) => (a.Nombre || "").localeCompare(b.Nombre || ""));
    } catch {
        return [];
    }
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
        if (col.data && col.data !== "Id") {

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

    const movimientos = CJ.movimientos || [];

    let ingresos = 0;
    let egresos = 0;

    movimientos.forEach(m => {
        ingresos += Number(m.Ingreso || 0);
        egresos += Number(m.Egreso || 0);
    });

    const saldoAnterior = CJ.resumen.saldoAnterior || 0;

    const saldoActual = saldoAnterior + ingresos - egresos;

    $("#kpiSaldoAnterior").text(fmtMoney(saldoAnterior));
    $("#kpiIngresos").text(fmtMoney(ingresos));
    $("#kpiEgresos").text(fmtMoney(egresos));
    $("#kpiSaldoActual").text(fmtMoney(saldoActual));
    $("#kpiMovimientos").text(movimientos.length);

    const chip = $("#chipCajaEstado");

    chip.removeClass("ok warn neg");

    if (saldoActual > 0) {
        chip.addClass("ok").html(`<i class="fa fa-arrow-up"></i> Saldo positivo ${fmtMoney(saldoActual)}`);
    }
    else if (saldoActual < 0) {
        chip.addClass("neg").html(`<i class="fa fa-arrow-down"></i> Saldo negativo ${fmtMoney(saldoActual)}`);
    }
    else {
        chip.addClass("warn").html(`<i class="fa fa-minus-circle"></i> Saldo cero`);
    }
}
/* =========================
   VER / EDITAR / ELIMINAR
========================= */

async function verMovimiento(id) {
    try {
        const response = await fetch(API.movimiento(id), {
            headers: authHeaders()
        });

        if (!response.ok) throw new Error("No se pudo obtener el movimiento");

        const m = await response.json();

        $("#vmFecha").text(formatearFechaHoraParaVista(m.Fecha));
        $("#vmTipo").text(m.TipoMov || "");
        $("#vmOrigen").text(m.Origen || "");
        $("#vmCuenta").text(m.Cuenta || "");
        $("#vmMoneda").text(m.Moneda || "");
        $("#vmConcepto").text(m.Concepto || "");
        $("#vmIngreso").text(fmtMoney(m.Ingreso || 0));
        $("#vmEgreso").text(fmtMoney(m.Egreso || 0));
        $("#vmSaldo").text(fmtMoney(m.Saldo || 0));

        $("#modalVerMovimiento").modal("show");
    } catch (e) {
        console.error(e);
        errorModal("No se pudo obtener el movimiento.");
    }
}

async function editarMovimiento(id) {
    try {
        const response = await fetch(API.movimiento(id), {
            headers: authHeaders()
        });

        if (!response.ok) throw new Error("No se pudo obtener el movimiento");

        const m = await response.json();

        if (!m.PuedeEditar) {
            errorModal("Este movimiento no se puede editar.");
            return;
        }

        if (m.TipoMov === "TRANSFERENCIA") {

            const rt = await fetch(API.transferencia(m.IdMov), {
                headers: authHeaders()
            });

            if (!rt.ok) throw new Error("No se pudo obtener la transferencia");

            const t = await rt.json();

            limpiarModalTransferencia();

            $("#tId").val(t.Id || "");
            $("#tFecha").val(formatearFechaParaInput(t.Fecha));
            $("#tCotizacion").val(t.Cotizacion || 1);
            $("#tNota").val(t.NotaInterna || "");

            $("#tMonedaOrigen").val(t.IdMonedaOrigen).trigger("change");
            await cargarCuentasModal("#tCuentaOrigen", t.IdMonedaOrigen, "#modalTransferencia");
            $("#tCuentaOrigen").val(t.IdCuentaOrigen).trigger("change");

            $("#tMonedaDestino").val(t.IdMonedaDestino).trigger("change");
            await cargarCuentasModal("#tCuentaDestino", t.IdMonedaDestino, "#modalTransferencia");
            $("#tCuentaDestino").val(t.IdCuentaDestino).trigger("change");

            $("#tImporteOrigen").val(t.ImporteOrigen || 0);
            $("#tImporteDestino").val(t.ImporteDestino || 0);

            $("#modalTransferenciaLabel").text("Editar transferencia");
            $("#btnGuardarTransferencia").html(`<i class="fa fa-check"></i> Guardar`);

            $("#modalTransferencia").modal("show");
            return;
        }

        if (m.TipoMov === "INGRESO MANUAL") {
            limpiarModalIngreso();

            $("#iId").val(m.Id || "");
            $("#iFecha").val(formatearFechaParaInput(m.Fecha));
            $("#iMoneda").val(m.IdMoneda).trigger("change");
            await cargarCuentasModal("#iCuenta", m.IdMoneda, "#modalIngreso");
            $("#iCuenta").val(m.IdCuenta).trigger("change");
            $("#iImporte").val(m.Ingreso || 0);
            $("#iConcepto").val(m.Concepto || "");

            $("#modalIngresoLabel").text("Editar ingreso manual");
            $("#btnGuardarIngreso").html(`<i class="fa fa-check"></i> Guardar`);

            $("#modalIngreso").modal("show");
            return;
        }

        if (m.TipoMov === "EGRESO MANUAL") {
            limpiarModalEgreso();

            $("#eId").val(m.Id || "");
            $("#eFecha").val(formatearFechaParaInput(m.Fecha));
            $("#eMoneda").val(m.IdMoneda).trigger("change");
            await cargarCuentasModal("#eCuenta", m.IdMoneda, "#modalEgreso");
            $("#eCuenta").val(m.IdCuenta).trigger("change");
            $("#eImporte").val(m.Egreso || 0);
            $("#eConcepto").val(m.Concepto || "");

            $("#modalEgresoLabel").text("Editar egreso manual");
            $("#btnGuardarEgreso").html(`<i class="fa fa-check"></i> Guardar`);

            $("#modalEgreso").modal("show");
            return;
        }

    } catch (e) {
        console.error(e);
        errorModal("No se pudo editar el movimiento.");
    }
}

async function eliminarMovimiento(id) {

    if (!Permisos.tiene("Cajas", "Eliminar")) {
        errorModal("No tenés permisos.");
        return;
    }

    const confirmado = await confirmarModal("¿Desea eliminar este movimiento?");
    if (!confirmado) return;

    try {
        const response = await fetch(API.eliminar(id), {
            method: "DELETE",
            headers: authHeaders()
        });

        if (!response.ok) throw new Error("Error HTTP");

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
            const $selection = $(this).next(".select2").find(".select2-selection");
            $selection.removeClass("is-invalid is-valid");
        }
    });

    $("#iCuenta").empty().append(`<option value="">Seleccionar</option>`);

    cerrarErrorCamposIngreso();
}

function validarCampoIngresoIndividual(el) {

    if (!el) return;
    if (el.target) el = el.target;

    const obligatorios = ["iFecha", "iMoneda", "iCuenta", "iImporte", "iConcepto"];
    if (!el.id || !obligatorios.includes(el.id)) return;

    let valor;

    if (el.tagName === "SELECT") {
        valor = $(el).val();
    } else {
        valor = (el.value ?? "").toString().trim();
    }

    let esValido = valor !== null && valor !== "";

    if (el.id === "iImporte") {
        esValido = valor !== "" && Number(valor) > 0;
    }

    setEstadoCampo(el, esValido);
    verificarErroresIngresoGeneral();
}

function validarIngreso() {

    const fecha = $("#iFecha").val();
    const moneda = $("#iMoneda").val();
    const cuenta = $("#iCuenta").val();
    const concepto = ($("#iConcepto").val() || "").trim();
    const importe = Number($("#iImporte").val() || 0);

    let errores = [];

    setEstadoCampo(document.getElementById("iFecha"), !!fecha);
    setEstadoCampo(document.getElementById("iMoneda"), !!moneda);
    setEstadoCampo(document.getElementById("iCuenta"), !!cuenta);
    setEstadoCampo(document.getElementById("iConcepto"), concepto !== "");
    setEstadoCampo(document.getElementById("iImporte"), importe > 0);

    if (!fecha) errores.push("Fecha");
    if (!moneda) errores.push("Moneda");
    if (!cuenta) errores.push("Cuenta");
    if (!concepto) errores.push("Concepto");
    if (importe <= 0) errores.push("Importe");

    if (errores.length > 0) {
        mostrarErrorCamposIngreso(
            `Debes completar los campos requeridos:<br><strong>${errores.join(", ")}</strong>`
        );
        return false;
    }

    cerrarErrorCamposIngreso();
    return true;
}

async function guardarIngreso() {

    if (!validarIngreso()) return;

    const id = ($("#iId").val() || "").trim();

    const modelo = {
        Id: id !== "" ? parseInt(id, 10) : null,
        Fecha: $("#iFecha").val(),
        IdMoneda: $("#iMoneda").val() ? parseInt($("#iMoneda").val(), 10) : null,
        IdCuenta: $("#iCuenta").val() ? parseInt($("#iCuenta").val(), 10) : null,
        Importe: Number($("#iImporte").val() || 0),
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

        if (!response.ok) throw new Error("Error HTTP");

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
}

function mostrarErrorCamposIngreso(mensaje) {
    const panel = $("#errorCamposIngreso");
    panel.removeClass("d-none");
    panel.find(".rp-error-message").html(mensaje || "");
}

function cerrarErrorCamposIngreso() {
    $("#errorCamposIngreso").addClass("d-none");
    $("#errorCamposIngreso .rp-error-message").html("");
}

function verificarErroresIngresoGeneral() {
    const hayInvalidos = document.querySelectorAll("#modalIngreso .is-invalid").length > 0;
    if (!hayInvalidos) cerrarErrorCamposIngreso();
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
            const $selection = $(this).next(".select2").find(".select2-selection");
            $selection.removeClass("is-invalid is-valid");
        }
    });

    $("#eCuenta").empty().append(`<option value="">Seleccionar</option>`);

    cerrarErrorCamposEgreso();
}

function validarCampoEgresoIndividual(el) {

    if (!el) return;
    if (el.target) el = el.target;

    const obligatorios = ["eFecha", "eMoneda", "eCuenta", "eImporte", "eConcepto"];
    if (!el.id || !obligatorios.includes(el.id)) return;

    let valor;

    if (el.tagName === "SELECT") {
        valor = $(el).val();
    } else {
        valor = (el.value ?? "").toString().trim();
    }

    let esValido = valor !== null && valor !== "";

    if (el.id === "eImporte") {
        esValido = valor !== "" && Number(valor) > 0;
    }

    setEstadoCampo(el, esValido);
    verificarErroresEgresoGeneral();
}

function validarEgreso() {

    const fecha = $("#eFecha").val();
    const moneda = $("#eMoneda").val();
    const cuenta = $("#eCuenta").val();
    const concepto = ($("#eConcepto").val() || "").trim();
    const importe = Number($("#eImporte").val() || 0);

    let errores = [];

    setEstadoCampo(document.getElementById("eFecha"), !!fecha);
    setEstadoCampo(document.getElementById("eMoneda"), !!moneda);
    setEstadoCampo(document.getElementById("eCuenta"), !!cuenta);
    setEstadoCampo(document.getElementById("eConcepto"), concepto !== "");
    setEstadoCampo(document.getElementById("eImporte"), importe > 0);

    if (!fecha) errores.push("Fecha");
    if (!moneda) errores.push("Moneda");
    if (!cuenta) errores.push("Cuenta");
    if (!concepto) errores.push("Concepto");
    if (importe <= 0) errores.push("Importe");

    if (errores.length > 0) {
        mostrarErrorCamposEgreso(
            `Debes completar los campos requeridos:<br><strong>${errores.join(", ")}</strong>`
        );
        return false;
    }

    cerrarErrorCamposEgreso();
    return true;
}

async function guardarEgreso() {

    if (!validarEgreso()) return;

    const id = ($("#eId").val() || "").trim();

    const modelo = {
        Id: id !== "" ? parseInt(id, 10) : null,
        Fecha: $("#eFecha").val(),
        IdMoneda: $("#eMoneda").val() ? parseInt($("#eMoneda").val(), 10) : null,
        IdCuenta: $("#eCuenta").val() ? parseInt($("#eCuenta").val(), 10) : null,
        Importe: Number($("#eImporte").val() || 0),
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

        if (!response.ok) throw new Error("Error HTTP");

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
}

function mostrarErrorCamposEgreso(mensaje) {
    const panel = $("#errorCamposEgreso");
    panel.removeClass("d-none");
    panel.find(".rp-error-message").html(mensaje || "");
}

function cerrarErrorCamposEgreso() {
    $("#errorCamposEgreso").addClass("d-none");
    $("#errorCamposEgreso .rp-error-message").html("");
}

function verificarErroresEgresoGeneral() {
    const hayInvalidos = document.querySelectorAll("#modalEgreso .is-invalid").length > 0;
    if (!hayInvalidos) cerrarErrorCamposEgreso();
}

/* =========================
   MODAL TRANSFERENCIA
========================= */

function abrirModalTransferencia() {

    limpiarModalTransferencia();

    $("#tFecha").val(moment().format("YYYY-MM-DD"));
    $("#tCotizacion").val("1");

    $("#modalTransferenciaLabel").text("Transferencia entre cuentas");
    $("#btnGuardarTransferencia").html(`<i class="fa fa-check"></i> Registrar`);

    $("#modalTransferencia").modal("show");
}

function limpiarModalTransferencia() {

    $("#tId").val("");

    $("#modalTransferencia input").each(function () {
        if (this.id !== "tId") this.value = "";
        this.classList.remove("is-invalid", "is-valid");
    });

    $("#modalTransferencia select").each(function () {
        $(this).val(null).trigger("change.select2");
        this.classList.remove("is-invalid", "is-valid");

        if ($(this).data("select2")) {
            const $selection = $(this).next(".select2").find(".select2-selection");
            $selection.removeClass("is-invalid is-valid");
        }
    });

    $("#tCuentaOrigen").empty().append(`<option value="">Seleccionar</option>`);
    $("#tCuentaDestino").empty().append(`<option value="">Seleccionar</option>`);

    cerrarErrorCamposTransferencia();
}

function validarCampoTransferenciaIndividual(el) {

    if (!el) return;
    if (el.target) el = el.target;

    const obligatorios = [
        "tFecha",
        "tCotizacion",
        "tNota",
        "tMonedaOrigen",
        "tCuentaOrigen",
        "tImporteOrigen",
        "tMonedaDestino",
        "tCuentaDestino",
        "tImporteDestino"
    ];

    if (!el.id || !obligatorios.includes(el.id)) return;

    let valor;

    if (el.tagName === "SELECT") {
        valor = $(el).val();
    } else {
        valor = (el.value ?? "").toString().trim();
    }

    let esValido = valor !== null && valor !== "";

    if (["tCotizacion", "tImporteOrigen", "tImporteDestino"].includes(el.id)) {
        esValido = valor !== "" && Number(valor) > 0;
    }

    setEstadoCampo(el, esValido);
    verificarErroresTransferenciaGeneral();
}

function validarTransferencia() {

    const fecha = $("#tFecha").val();
    const cotizacion = Number($("#tCotizacion").val() || 0);
    const nota = ($("#tNota").val() || "").trim();

    const idMonedaOrigen = $("#tMonedaOrigen").val();
    const idCuentaOrigen = $("#tCuentaOrigen").val();
    const importeOrigen = Number($("#tImporteOrigen").val() || 0);

    const idMonedaDestino = $("#tMonedaDestino").val();
    const idCuentaDestino = $("#tCuentaDestino").val();
    const importeDestino = Number($("#tImporteDestino").val() || 0);

    let errores = [];

    setEstadoCampo(document.getElementById("tFecha"), !!fecha);
    setEstadoCampo(document.getElementById("tCotizacion"), cotizacion > 0);
    setEstadoCampo(document.getElementById("tNota"), nota !== "");

    setEstadoCampo(document.getElementById("tMonedaOrigen"), !!idMonedaOrigen);
    setEstadoCampo(document.getElementById("tCuentaOrigen"), !!idCuentaOrigen);
    setEstadoCampo(document.getElementById("tImporteOrigen"), importeOrigen > 0);

    setEstadoCampo(document.getElementById("tMonedaDestino"), !!idMonedaDestino);
    setEstadoCampo(document.getElementById("tCuentaDestino"), !!idCuentaDestino);
    setEstadoCampo(document.getElementById("tImporteDestino"), importeDestino > 0);

    if (!fecha) errores.push("Fecha");
    if (cotizacion <= 0) errores.push("Cotización");
    if (!nota) errores.push("Nota interna");

    if (!idMonedaOrigen) errores.push("Moneda origen");
    if (!idCuentaOrigen) errores.push("Cuenta origen");
    if (importeOrigen <= 0) errores.push("Importe origen");

    if (!idMonedaDestino) errores.push("Moneda destino");
    if (!idCuentaDestino) errores.push("Cuenta destino");
    if (importeDestino <= 0) errores.push("Importe destino");

    if (idMonedaOrigen && idMonedaDestino && idCuentaOrigen && idCuentaDestino) {
        if (String(idMonedaOrigen) === String(idMonedaDestino) && String(idCuentaOrigen) === String(idCuentaDestino)) {
            errores.push("Origen y destino no pueden ser la misma cuenta");
        }
    }

    if (errores.length > 0) {
        mostrarErrorCamposTransferencia(
            `Revisá los siguientes campos/reglas:<br><strong>${errores.join(", ")}</strong>`
        );
        return false;
    }

    cerrarErrorCamposTransferencia();
    return true;
}

async function guardarTransferencia() {

    if (!validarTransferencia()) return;

    const id = ($("#tId").val() || "").trim();

    const modelo = {
        Id: id !== "" ? parseInt(id, 10) : null,
        Fecha: $("#tFecha").val(),
        IdMonedaOrigen: $("#tMonedaOrigen").val() ? parseInt($("#tMonedaOrigen").val(), 10) : null,
        IdCuentaOrigen: $("#tCuentaOrigen").val() ? parseInt($("#tCuentaOrigen").val(), 10) : null,
        ImporteOrigen: Number($("#tImporteOrigen").val() || 0),
        IdMonedaDestino: $("#tMonedaDestino").val() ? parseInt($("#tMonedaDestino").val(), 10) : null,
        IdCuentaDestino: $("#tCuentaDestino").val() ? parseInt($("#tCuentaDestino").val(), 10) : null,
        ImporteDestino: Number($("#tImporteDestino").val() || 0),
        Cotizacion: Number($("#tCotizacion").val() || 0),
        NotaInterna: ($("#tNota").val() || "").trim()
    };

    const url = id === "" ? API.registrarTransferencia : API.actualizarTransferencia;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                ...authHeaders(),
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(modelo)
        });

        if (!response.ok) throw new Error("Error HTTP");

        const data = await response.json();

        if (!data.valor) {
            mostrarErrorCamposTransferencia(data.mensaje || "No se pudo guardar.");
            return;
        }

        cerrarErrorCamposTransferencia();
        $("#modalTransferencia").modal("hide");

        exitoModal(data.mensaje || (id === "" ? "Transferencia registrada correctamente." : "Transferencia modificada correctamente."));

        await cargarMovimientosYResumen();

    } catch (e) {
        console.error(e);
        mostrarErrorCamposTransferencia("Ha ocurrido un error inesperado al guardar.");
    }
}

function mostrarErrorCamposTransferencia(mensaje) {
    const panel = $("#errorCamposTransferencia");
    panel.removeClass("d-none");
    panel.find(".rp-error-message").html(mensaje || "");
}

function cerrarErrorCamposTransferencia() {
    $("#errorCamposTransferencia").addClass("d-none");
    $("#errorCamposTransferencia .rp-error-message").html("");
}

function verificarErroresTransferenciaGeneral() {
    const hayInvalidos = document.querySelectorAll("#modalTransferencia .is-invalid").length > 0;
    if (!hayInvalidos) cerrarErrorCamposTransferencia();
}

/* =========================
   HELPERS GENERALES
========================= */

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatearNumero(n) {
    return Number(n || 0).toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function fmtMoney(n) {
    return Number(n || 0).toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2
    });
}

function toDecimal(val) {
    if (val == null) return 0;
    const s = (val + "").trim();
    if (!s) return 0;
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

$(document).on("paste", "input[type=text], textarea", function (e) {
    e.preventDefault();

    let texto = (e.originalEvent || e).clipboardData.getData('text');

    texto = texto
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\u00A0/g, ' ')
        .trim();

    document.execCommand("insertText", false, texto);
});

async function listaCuentasFilter(idMoneda = null) {

    let cuentas = [];

    if (idMoneda) {
        cuentas = cuentasPorMonedaMap.get(String(idMoneda)) || [];
    } else {
        cuentas = [...cuentasCache];
    }

    const map = new Map();

    cuentas.forEach(x => {
        if (!map.has(String(x.Id))) {
            map.set(String(x.Id), {
                Id: x.Id,
                Nombre: x.Nombre,
                IdMoneda: x.IdMoneda
            });
        }
    });

    return [...map.values()].sort((a, b) =>
        (a.Nombre || "").localeCompare(b.Nombre || "")
    );
}

async function precargarCuentasCache() {
    cuentasCache = [];
    cuentasPorMonedaMap = new Map();

    const idsMoneda = (monedasCaja || []).map(x => x.Id).filter(Boolean);

    const listas = await Promise.all(
        idsMoneda.map(async idMoneda => {
            try {
                const response = await fetch(API.cuentasPorMoneda(idMoneda), {
                    headers: authHeaders()
                });

                if (!response.ok) return [];

                const data = await response.json();

                return (data || []).map(x => ({
                    Id: x.Id,
                    Nombre: x.Nombre,
                    IdMoneda: idMoneda
                }));
            } catch {
                return [];
            }
        })
    );

    cuentasCache = listas.flat();

    idsMoneda.forEach(idMoneda => {
        const cuentas = cuentasCache.filter(x => String(x.IdMoneda) === String(idMoneda));
        cuentasPorMonedaMap.set(String(idMoneda), cuentas);
    });
}