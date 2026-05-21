/* =========================================================
   CUENTA CORRIENTE ClienteS
   - Izquierda: Clientes
   - Derecha: movimientos
   - Pago => HABER
   - Venta => DEBE
   - Ajuste => Debe o Haber
========================================================= */

let gridCuentaCorriente;
let monedasCC = [];
let cuentasFiltro = [];

const ACC = {
    Clientes: [],
    ClientesOriginal: [],
    movimientos: [],
    movimientosOriginal: [],
    movimientosMap: new Map(),
    ClienteSel: null,
    resumen: {
        saldoAnterior: 0,
        debe: 0,
        haber: 0,
        saldoActual: 0,
        cantidadMovimientos: 0
    },
    filtrosActivos: false
};

const API = {
    Clientes: (buscarCliente = "", soloSaldoActivo = false) =>
        `/ClientesCuentaCorriente/ListaClientes?buscarCliente=${encodeURIComponent(buscarCliente || "")}&soloSaldoActivo=${soloSaldoActivo}`,

    movimientos: "/ClientesCuentaCorriente/Movimientos",
    resumen: "/ClientesCuentaCorriente/Resumen",
    movimiento: id => `/ClientesCuentaCorriente/Movimiento?id=${id}`,
    registrarPago: "/ClientesCuentaCorriente/RegistrarPago",
    registrarAjuste: "/ClientesCuentaCorriente/RegistrarAjuste",
    eliminar: id => `/ClientesCuentaCorriente/Eliminar?id=${id}`,
    monedas: "/PaisesMoneda/Lista",
    cuentasPorMoneda: idMoneda => `/MonedasCuenta/ListaMoneda?idMoneda=${idMoneda}`
};

const columnConfig = [
    { index: 1, filterType: 'text' },   // Fecha
    { index: 2, filterType: 'select', fetchDataFunc: listaTiposMovFilter }, // Tipo
    { index: 3, filterType: 'text' },   // Concepto
    { index: 4, filterType: 'text' },   // Debe
    { index: 5, filterType: 'text' },   // Haber
    { index: 6, filterType: 'text' }    // Saldo
];

const authHeaders = () => ({
    'Authorization': 'Bearer ' + token
});

$(document).ready(async () => {

    Permisos.init();
    Permisos.aplicarUI("CLIENTES CC");


    wireEventos();

    inicializarFechasPorDefecto();

    await Promise.all([
        cargarMonedas(),
        cargarClientes()
    ]);

    inicializarSelect2CC();
    renderClientes();
    mostrarEstadoSinSeleccion();
});

function wireEventos() {

    $("#btnRefreshCC").on("click", async () => {
        await cargarClientes();

        if (ACC.ClienteSel) {
            const nuevoSel = (ACC.ClientesOriginal || []).find(x => x.Id === ACC.ClienteSel.Id);
            if (nuevoSel) {
                ACC.ClienteSel = nuevoSel;
                await cargarCuentaCorrienteSeleccionada();
            } else {
                ACC.ClienteSel = null;
                mostrarEstadoSinSeleccion();
            }
        }

        renderClientes();
    });

    $("#txtBuscarCliente").on("input", function () {
        renderClientes();
    });

    $("#fClienteSaldoActivo").on("change", function () {
        renderClientes();
    });
    $("#btnPago").on("click", abrirModalPago);
    $("#btnAjuste").on("click", abrirModalAjuste);
    $("#btnEstadoPdf").on("click", exportarEstadoCuentaPdf);


    /* =========================
       MONEDA → CUENTAS PAGO
    ========================= */

    $("#pMoneda")
        .on("select2:select", async function () {

            const id = $(this).val();

            await cargarCuentasPago(id);

            $("#pCuenta").val(null).trigger("change");

            validarCampoPagoIndividual(this);
        })

        .on("select2:clear", function () {

            $("#pCuenta").empty()
                .append(`<option value="">Seleccionar</option>`)
                .val(null)
                .trigger("change");

            validarCampoPagoIndividual(this);
            validarCampoPagoIndividual(document.getElementById("pCuenta"));
        });


    $("#pCuenta")
        .on("select2:select", function () {
            validarCampoPagoIndividual(this);
        })
        .on("select2:clear", function () {
            validarCampoPagoIndividual(this);
        });



    /* =========================
       MONEDA → CUENTAS AJUSTE
    ========================= */

    $("#aMoneda")
        .on("select2:select", async function () {

            const id = $(this).val();

            await cargarCuentasAjuste(id);

            $("#aCuenta").val(null).trigger("change");

            validarCampoAjusteIndividual(this);
        })

        .on("select2:clear", function () {

            $("#aCuenta").empty()
                .append(`<option value="">Seleccionar</option>`)
                .val(null)
                .trigger("change");

            validarCampoAjusteIndividual(this);
            validarCampoAjusteIndividual(document.getElementById("aCuenta"));
        });


    $("#aCuenta")
        .on("select2:select", function () {
            validarCampoAjusteIndividual(this);
        })
        .on("select2:clear", function () {
            validarCampoAjusteIndividual(this);
        });



    /* =========================
       VALIDACIONES INPUTS
    ========================= */

    document.querySelectorAll("#modalPago input").forEach(el => {
        el.addEventListener("input", () => validarCampoPagoIndividual(el));
        el.addEventListener("blur", () => validarCampoPagoIndividual(el));
    });

    document.querySelectorAll("#modalAjuste input").forEach(el => {
        el.addEventListener("input", () => validarCampoAjusteIndividual(el));
        el.addEventListener("blur", () => validarCampoAjusteIndividual(el));
    });

}
/* =========================================================
   FECHAS DEFAULT CON MOMENT
========================================================= */

function inicializarFechasPorDefecto() {
    const hoy = moment();
    const inicioMes = moment().startOf("month");

    $("#fFechaDesde").val(inicioMes.format("YYYY-MM-DD"));
    $("#fFechaHasta").val(hoy.format("YYYY-MM-DD"));
}

/* =========================================================
   SELECT2
========================================================= */

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

function inicializarSelect2CC() {

    ensureSelect2($("#fTipo"), {
        dropdownParent: $("#panelFiltrosCC"),
        placeholder: "Todos",
        minimumResultsForSearch: 0
    });

    ensureSelect2($("#fMoneda"), {
        dropdownParent: $("#panelFiltrosCC"),
        placeholder: "Todas",
        minimumResultsForSearch: 0
    });

    ensureSelect2($("#fCuenta"), {
        dropdownParent: $("#panelFiltrosCC"),
        placeholder: "Todas",
        minimumResultsForSearch: 0
    });

 
}

/* =========================================================
   MONEDAS / CUENTAS
========================================================= */

async function cargarMonedas() {
    try {
        const r = await fetch(API.monedas, { headers: authHeaders() });
        if (!r.ok) throw new Error();

        monedasCC = await r.json();
        cargarCombosMonedas();

    } catch {
        monedasCC = [];
        cargarCombosMonedas();
    }
}

function cargarCombosMonedas() {

    const $fMoneda = $("#fMoneda");
    const $pMoneda = $("#pMoneda");
    const $aMoneda = $("#aMoneda");

    $fMoneda.empty().append(`<option value="">Todas</option>`);
    $pMoneda.empty().append(`<option value="">Seleccionar</option>`);
    $aMoneda.empty().append(`<option value="">Seleccionar</option>`);

    (monedasCC || []).forEach(x => {
        const nombre = x.Nombre || x.nombre || x.Simbolo || "Moneda";
        $fMoneda.append(`<option value="${x.Id}">${nombre}</option>`);
        $pMoneda.append(`<option value="${x.Id}">${nombre}</option>`);
        $aMoneda.append(`<option value="${x.Id}">${nombre}</option>`);
    });

    $("#fCuenta").empty().append(`<option value="">Todas</option>`);
    $("#pCuenta").empty().append(`<option value="">Seleccionar</option>`);
    $("#aCuenta").empty().append(`<option value="">Seleccionar</option>`);

    inicializarSelect2CC();
}

async function cargarFiltroCuentasPorMoneda(idMoneda) {

    const $fCuenta = $("#fCuenta");
    $fCuenta.empty().append(`<option value="">Todas</option>`);

    if (!idMoneda) {
        inicializarSelect2CC();
        return;
    }

    try {
        const r = await fetch(API.cuentasPorMoneda(idMoneda), { headers: authHeaders() });
        if (!r.ok) throw new Error();

        cuentasFiltro = await r.json();

        (cuentasFiltro || []).forEach(x => {
            $fCuenta.append(`<option value="${x.Id}">${x.Nombre}</option>`);
        });

    } catch {
        cuentasFiltro = [];
    }

    inicializarSelect2CC();
}

async function cargarCuentasPago(idMoneda) {

    const $pCuenta = $("#pCuenta");
    $pCuenta.empty().append(`<option value="">Seleccionar</option>`);

    if (!idMoneda) {
        inicializarSelect2CC();
        return;
    }

    try {
        const r = await fetch(API.cuentasPorMoneda(idMoneda), { headers: authHeaders() });
        if (!r.ok) throw new Error();

        const cuentas = await r.json();

        (cuentas || []).forEach(x => {
            $pCuenta.append(`<option value="${x.Id}">${x.Nombre}</option>`);
        });

    } catch { }

    inicializarSelect2CC();
}

async function cargarCuentasAjuste(idMoneda) {

    const $aCuenta = $("#aCuenta");
    $aCuenta.empty().append(`<option value="">Seleccionar</option>`);

    if (!idMoneda) {
        inicializarSelect2CC();
        return;
    }

    try {
        const r = await fetch(API.cuentasPorMoneda(idMoneda), { headers: authHeaders() });
        if (!r.ok) throw new Error();

        const cuentas = await r.json();

        (cuentas || []).forEach(x => {
            $aCuenta.append(`<option value="${x.Id}">${x.Nombre}</option>`);
        });

    } catch { }

    inicializarSelect2CC();
}

/* =========================================================
   ClienteS
========================================================= */

async function cargarClientes() {

    const buscarCliente = ($("#txtBuscarCliente").val() || "").trim();
    const soloSaldoActivo = $("#fClienteSaldoActivo").is(":checked");

    const r = await fetch(API.Clientes(buscarCliente, soloSaldoActivo), {
        headers: authHeaders()
    });

    if (!r.ok) {
        errorModal("Error cargando Clientes.");
        return;
    }

    ACC.ClientesOriginal = await r.json();
    ACC.Clientes = [...ACC.ClientesOriginal];
}

function renderClientes() {

    const cont = $("#ClientesList");
    cont.html("");

    let lista = [...(ACC.ClientesOriginal || [])];

    const buscar = ($("#txtBuscarCliente").val() || "").toLowerCase();
    const soloSaldo = $("#fClienteSaldoActivo").is(":checked");

    if (buscar) {
        lista = lista.filter(a =>
            (a.Nombre || "")
                .toLowerCase()
                .includes(buscar)
        );
    }

    if (soloSaldo) {
        lista = lista.filter(a => Math.abs(Number(a.Saldo || 0)) > 0.0001);
    }

    $("#kpiClientes").text(lista.length);

    if (!lista.length) {
        cont.html(`
            <div class="cc-empty">
                <i class="fa fa-users"></i>
                No se encontraron Clientes.
            </div>
        `);
        return;
    }

    lista.forEach(a => {

        const nombre = (a.Nombre || "").trim();
        const inicial = nombre ? nombre.charAt(0).toUpperCase() : "?";
        const saldo = Number(a.Saldo || 0);

        const active = ACC.ClienteSel && ACC.ClienteSel.Id === a.Id ? "active" : "";

        let saldoClass = "saldo-cero";
        if (saldo > 0) saldoClass = "saldo-deuda";
        if (saldo < 0) saldoClass = "saldo-favor";

        cont.append(`
            <div class="cc-artist-item ${active}" onclick="seleccionarCliente(${a.Id})">
                <div class="cc-artist-avatar">${inicial}</div>

                <div class="cc-artist-main">
                    <div class="cc-artist-name">${escapeHtml(nombre)}</div>

                    <div class="cc-artist-meta">
                        <span class="lbl">Saldo</span>
                        <span class="val ${saldoClass}">
                            ${fmtMoney(saldo)}
                        </span>
                    </div>
                </div>
            </div>
        `);
    });
}
async function seleccionarCliente(id) {

    if (ACC.ClienteSel && ACC.ClienteSel.Id === id) {
        ACC.ClienteSel = null;
        ACC.movimientos = [];
        ACC.movimientosOriginal = [];
        ACC.movimientosMap = new Map();

        $("#lblFiltroCliente").text("Seleccioná un Cliente");

        renderClientes();
        mostrarEstadoSinSeleccion();
        return;
    }

    ACC.ClienteSel = (ACC.ClientesOriginal || []).find(x => x.Id === id) || null;

    if (!ACC.ClienteSel) return;

    $("#lblFiltroCliente").text(ACC.ClienteSel.Nombre || ACC.ClienteSel.NombreArtistico || "Cliente");

    await cargarCuentaCorrienteSeleccionada();
    renderClientes();
}

async function cargarCuentaCorrienteSeleccionada() {
    await Promise.all([
        cargarMovimientos(),
        cargarResumen()
    ]);

    renderMovimientos();
    actualizarKpis();
}

/* =========================================================
   FILTROS PANEL DERECHO
========================================================= */

function obtenerFiltrosCC() {
    return {
        IdCliente: ACC.ClienteSel ? ACC.ClienteSel.Id : null,
        FechaDesde: $("#fFechaDesde").val() || null,
        FechaHasta: $("#fFechaHasta").val() || null,
        TipoMov: $("#fTipo").val() || null,
        IdMoneda: $("#fMoneda").val() || null,
        IdCuenta: $("#fCuenta").val() || null,
        Texto: $("#fTexto").val() || null
    };
}

async function aplicarFiltrosCC() {

    const filtros = obtenerFiltrosCC();

    ACC.filtrosActivos = Object.values(filtros).some(x => x !== null && x !== "");

    actualizarEstadoFiltrosCC();

    if (!ACC.ClienteSel) {
        return errorModal("Seleccioná un Cliente para aplicar filtros.");
    }

    await cargarCuentaCorrienteSeleccionada();
}

function limpiarFiltrosCC() {

    inicializarFechasPorDefecto();

    $("#fTipo").val("").trigger("change");
    $("#fMoneda").val("").trigger("change");
    $("#fCuenta").empty().append(`<option value="">Todas</option>`).trigger("change");
    $("#fTexto").val("");

    ACC.filtrosActivos = false;
    actualizarEstadoFiltrosCC();

    if (ACC.ClienteSel) {
        cargarCuentaCorrienteSeleccionada();
    }
}

function actualizarEstadoFiltrosCC() {
    const txt = ACC.filtrosActivos ? "Filtros activos" : "";
    $("#txtFiltrosEstadoCC").text(txt);
}

/* =========================================================
   MOVIMIENTOS / RESUMEN
========================================================= */

async function cargarMovimientos() {

    if (!ACC.ClienteSel) {
        ACC.movimientos = [];
        ACC.movimientosOriginal = [];
        ACC.movimientosMap = new Map();
        return;
    }

    const response = await fetch(API.movimientos, {
        method: "POST",
        headers: {
            ...authHeaders(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(obtenerFiltrosCC())
    });

    if (!response.ok) {
        errorModal("Error cargando movimientos.");
        return;
    }

    const data = await response.json();

    ACC.movimientosOriginal = data || [];
    ACC.movimientos = [...ACC.movimientosOriginal];

    ACC.movimientosMap = new Map();
    (ACC.movimientos || []).forEach(x => ACC.movimientosMap.set(x.Id, x));
}

async function cargarResumen() {

    if (!ACC.ClienteSel) {
        ACC.resumen = {
            saldoAnterior: 0,
            debe: 0,
            haber: 0,
            saldoActual: 0,
            cantidadMovimientos: 0
        };
        return;
    }

    const response = await fetch(API.resumen, {
        method: "POST",
        headers: {
            ...authHeaders(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(obtenerFiltrosCC())
    });

    if (!response.ok) {
        errorModal("Error cargando resumen.");
        return;
    }

    const data = await response.json();

    ACC.resumen = {
        saldoAnterior: Number(data.SaldoAnterior || 0),
        debe: Number(data.Debe || 0),
        haber: Number(data.Haber || 0),
        saldoActual: Number(data.SaldoActual || 0),
        cantidadMovimientos: Number(data.CantidadMovimientos || 0)
    };
}

function renderMovimientos() {

    $("#ccEmpty").toggleClass("d-none", !!ACC.ClienteSel);

    if (!ACC.ClienteSel) {
        if (gridCuentaCorriente) {
            gridCuentaCorriente.clear().draw();
        }
        actualizarKpis();
        return;
    }

    configurarDataTable(ACC.movimientos);
}

async function configurarDataTable(data) {

    if (!gridCuentaCorriente) {

        const $thead = $('#grd_CuentaCorriente thead');
        if ($thead.find('tr.filters').length === 0) {
            $thead.find('tr').first().clone(true).addClass('filters').appendTo($thead);
        }

        gridCuentaCorriente = $('#grd_CuentaCorriente').DataTable({
            data: data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: true,
            scrollCollapse: true,
            order: [],

            columns: [
                {
                    data: "Id",
                    title: '',
                    width: "1%",
                    render: function (data, type, row) {
                        if (typeof renderAccionesGrid === "function" && row.PuedeEliminar) {
                            return renderAccionesGrid(data, {
                                ver: "verMovimiento",
                                eliminar: "eliminarMovimiento"
                            }, "Clientes CC");
                        }

                        return `
<div class="cc-actions">
    <button class="cc-btn ver" onclick="verMovimiento(${data})">
        <i class="fa fa-eye"></i>
    </button>
</div>
`;
                    },
                    orderable: false,
                    searchable: false,
                },
                {
                    data: 'Fecha',
                    render: function (v) {
                        return formatearFecha(v);
                    }
                },
                { data: 'TipoMov' },
                { data: 'Concepto' },
                {
                    data: 'Debe',
                    className: "text-end",
                    render: function (v) {
                        return formatearNumero(v);
                    }
                },
                {
                    data: 'Haber',
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
                },
            ],

            dom: 'Bfrtip',
            buttons: getBotonesExportacion(gridCuentaCorriente, "Clientes CC"),

            orderCellsTop: true,
            fixedHeader: true,

            initComplete: async function () {
                const api = this.api();

                for (const config of columnConfig) {

                    const cell = $('.filters th').eq(config.index);
                    if (!cell.length) continue;

                    cell.empty();

                    if (config.filterType === 'select') {

                        const $select = $(`
                            <select class="rp-filter-select" style="width:100%">
                                <option value="">Todos</option>
                            </select>
                        `).appendTo(cell);

                        const datos = await config.fetchDataFunc();
                        (datos || []).forEach(item => {
                            $select.append(`<option value="${item.Id}">${item.Nombre}</option>`);
                        });

                        ensureSelect2($select, {
                            dropdownParent: $(document.body),
                            minimumResultsForSearch: 0,
                            allowClear: true,
                            placeholder: "Todos"
                        });

                        $select.on('select2:clear', function () {
                            api.column(config.index).search('').draw(false);
                        });

                        $select.on('change', function () {
                            const value = $(this).val();

                            if (!value) {
                                api.column(config.index).search('').draw(false);
                                return;
                            }

                            const text = $(this).find('option:selected').text();

                            api.column(config.index)
                                .search('^' + escapeRegex(text) + '$', true, false)
                                .draw(false);
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

                configurarOpcionesColumnasCC();
                actualizarKpis(data);

                $(document).on("click", ".select2-container--default .select2-selection--single", function () {
                    const $select = $(this).closest(".select2-container").prev("select");
                    if ($select.length) {
                        if ($select.data("select2") && $select.data("select2").isOpen()) return;
                        $select.select2("open");
                    }
                });

            }
        });

    } else {
        gridCuentaCorriente.clear().rows.add(data).draw();
        actualizarKpis(data);
    }
}

/* =========================================================
   CONFIG COLUMNAS
========================================================= */

function configurarOpcionesColumnasCC() {
    const grid = $('#grd_CuentaCorriente').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenuCC');

    const storageKey = `CuentaCorrienteClientes_Columnas`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") {

            const isChecked = savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;
            grid.column(index).visible(isChecked);

            const name = $('#grd_CuentaCorriente thead tr').first().find('th').eq(index).text();

            container.append(`
                <li class="rp-dd-item">
                    <label class="rp-dd-label">
                        <input type="checkbox" class="toggle-column-cc" data-column="${index}" ${isChecked ? 'checked' : ''}>
                        <span>${name}</span>
                    </label>
                </li>
            `);
        }
    });

    $('.toggle-column-cc').off('change').on('change', function () {
        const columnIdx = parseInt($(this).data('column'), 10);
        const isChecked = $(this).is(':checked');

        savedConfig[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));

        grid.column(columnIdx).visible(isChecked);
    });
}

/* =========================================================
   KPIS
========================================================= */

function actualizarKpis() {

    const r = ACC.resumen || {
        saldoAnterior: 0,
        debe: 0,
        haber: 0,
        saldoActual: 0,
        cantidadMovimientos: 0
    };

    $("#kpiSaldoAnterior").text(fmtMoney(r.saldoAnterior));
    $("#kpiDebe").text(fmtMoney(r.debe));
    $("#kpiHaber").text(fmtMoney(r.haber));
    $("#kpiSaldoActual").text(fmtMoney(r.saldoActual));
    $("#kpiMovimientos").text(r.cantidadMovimientos || 0);

    const chip = $("#chipSaldoEstado");
    chip.removeClass("ok warn neg");

    if (!ACC.ClienteSel) {
        chip.addClass("warn").html(`<i class="fa fa-line-chart"></i> Sin Cliente seleccionado`);
        return;
    }

    if (r.saldoActual > 0) {
        chip.addClass("warn").html(`<i class="fa fa-exclamation-circle"></i> Saldo pendiente ${fmtMoney(r.saldoActual)}`);
    } else if (r.saldoActual < 0) {
        chip.addClass("neg").html(`<i class="fa fa-arrow-down"></i> Saldo a favor ${fmtMoney(r.saldoActual)}`);
    } else {
        chip.addClass("ok").html(`<i class="fa fa-check-circle"></i> Cuenta saldada`);
    }
}

function mostrarEstadoSinSeleccion() {
    ACC.resumen = {
        saldoAnterior: 0,
        debe: 0,
        haber: 0,
        saldoActual: 0,
        cantidadMovimientos: 0
    };
    actualizarKpis();
    renderMovimientos();
    renderClientes();
}

/* =========================================================
   VER MOVIMIENTO
========================================================= */

function verMovimiento(id) {

    fetch(API.movimiento(id), {
        headers: authHeaders()
    })
        .then(r => {
            if (!r.ok) throw new Error();
            return r.json();
        })
        .then(m => {

            $("#vmFecha").text(formatearFecha(m.Fecha));
            $("#vmTipo").text(m.TipoMov || "");
            $("#vmConcepto").text(m.Concepto || "");
            $("#vmMoneda").text(m.Moneda || "");
            $("#vmCuenta").text(m.Cuenta || "");
            $("#vmDebe").text(fmtMoney(m.Debe || 0));
            $("#vmHaber").text(fmtMoney(m.Haber || 0));
            $("#vmSaldo").text(fmtMoney(m.saldo || 0));

            if (m.Cuenta) {
                $("#vmCuenta").text(m.Cuenta);
                $("#divVmCuenta").show();
            } else {
                $("#divVmCuenta").hide();
            }

            $("#modalVerMovimiento").modal("show");

        })
        .catch(() => errorModal("No se pudo obtener el movimiento."));
}
/* =========================================================
   ELIMINAR
========================================================= */

async function eliminarMovimiento(id) {

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

        await cargarClientes();

        if (ACC.ClienteSel) {
            const nuevoSel = (ACC.ClientesOriginal || []).find(x => x.Id === ACC.ClienteSel.Id);
            if (nuevoSel) {
                ACC.ClienteSel = nuevoSel;
                await cargarCuentaCorrienteSeleccionada();
            } else {
                ACC.ClienteSel = null;
                mostrarEstadoSinSeleccion();
            }
        }

        renderClientes();

    } catch (e) {
        console.error(e);
        errorModal("Ha ocurrido un error al eliminar.");
    }
}

/* =========================================================
   MODAL PAGO
========================================================= */

function abrirModalPago() {

    if (!Permisos.tiene("CLIENTES CC", "Crear")) {
        errorModal("No tenés permisos.");
        return;
    }


    if (!ACC.ClienteSel) {
        return errorModal("Seleccioná un Cliente.");
    }

    limpiarModalPago();

    $("#pClienteNombre").val(ACC.ClienteSel.Nombre || ACC.ClienteSel.NombreArtistico || "");
    $("#pFecha").val(moment().format("YYYY-MM-DD"));

    ensureSelect2($("#pMoneda"), { dropdownParent: $("#modalPago") });
    ensureSelect2($("#pCuenta"), { dropdownParent: $("#modalPago") });

    // TEXTO BOTON
    $("#modalPago .btn-primary").text("Registrar");

    $('#modalPago').modal('show');
}

function limpiarModalPago() {

    $("#modalPago input").each(function () {
        this.value = "";
        this.classList.remove("is-invalid", "is-valid");
    });

    $("#modalPago select").each(function () {

        $(this).val(null).trigger("change.select2");

        this.classList.remove("is-invalid", "is-valid");

        if ($(this).data("select2")) {
            const $selection = $(this).next(".select2").find(".select2-selection");
            $selection.removeClass("is-invalid is-valid");
        }
    });

    $("#pCuenta").empty().append(`<option value="">Seleccionar</option>`);

    cerrarErrorCamposPago();
}
function validarCampoPagoIndividual(el) {

    if (!el) return;

    if (el.target) {
        el = el.target;
    }

    const obligatorios = ["pFecha", "pMoneda", "pCuenta", "pImporte", "pConcepto"];

    if (!el.id || !obligatorios.includes(el.id)) return;

    let valor;

    if (el.tagName === "SELECT") {
        valor = $(el).val();
    } else {
        valor = (el.value ?? "").toString().trim();
    }

    let esValido = valor !== null && valor !== "";

    if (el.id === "pImporte") {
        esValido = valor !== "" && Number(valor) > 0;
    }

    setEstadoCampo(el, esValido);

    verificarErroresPagoGeneral();
}
function validarPago() {

    const fecha = $("#pFecha").val();
    const moneda = $("#pMoneda").val();
    const cuenta = $("#pCuenta").val();
    const concepto = ($("#pConcepto").val() || "").trim();
    const importe = Number($("#pImporte").val() || 0);

    let errores = [];

    setEstadoCampo(document.getElementById("pFecha"), !!fecha);
    setEstadoCampo(document.getElementById("pMoneda"), !!moneda);
    setEstadoCampo(document.getElementById("pCuenta"), !!cuenta);
    setEstadoCampo(document.getElementById("pConcepto"), concepto !== "");
    setEstadoCampo(document.getElementById("pImporte"), importe > 0);

    if (!fecha) errores.push("Fecha");
    if (!moneda) errores.push("Moneda");
    if (!cuenta) errores.push("Cuenta");
    if (!concepto) errores.push("Concepto");
    if (importe <= 0) errores.push("Importe");

    if (errores.length > 0) {

        mostrarErrorCamposPago(
            `Debes completar los campos requeridos:<br><strong>${errores.join(", ")}</strong>`
        );

        return false;
    }

    cerrarErrorCamposPago();
    return true;
}
async function guardarPago() {

    if (!ACC.ClienteSel) {
        return errorModal("Seleccioná un Cliente.");
    }

    if (!validarPago()) return;

    const modelo = {
        IdCliente: ACC.ClienteSel.Id,
        Fecha: $("#pFecha").val(),
        IdMoneda: $("#pMoneda").val(),
        IdCuenta: $("#pCuenta").val(),
        Importe: $("#pImporte").val(),
        Concepto: $("#pConcepto").val()
    };

    try {
        const response = await fetch(API.registrarPago, {
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
            mostrarErrorCamposPago(data.mensaje || "No se pudo guardar.");
            return;
        }

        cerrarErrorCamposPago();
        $('#modalPago').modal('hide');

        exitoModal(data.mensaje || "Pago registrado correctamente.");

        await cargarClientes();

        if (ACC.ClienteSel) {
            const nuevoSel = (ACC.ClientesOriginal || []).find(x => x.Id === ACC.ClienteSel.Id);
            if (nuevoSel) {
                ACC.ClienteSel = nuevoSel;
                await cargarCuentaCorrienteSeleccionada();
            }
        }

        renderClientes();

    } catch (e) {
        console.error(e);
        mostrarErrorCamposPago("Ha ocurrido un error inesperado al guardar.");
    }
}

function mostrarErrorCamposPago(mensaje) {
    const panel = $("#errorCamposPago");
    panel.removeClass("d-none");
    panel.find(".rp-error-message").html(mensaje || "");
}

function cerrarErrorCamposPago() {
    $("#errorCamposPago").addClass("d-none");
    $("#errorCamposPago .rp-error-message").html("");
}

function verificarErroresPagoGeneral() {
    const hayInvalidos = document.querySelectorAll("#modalPago .is-invalid").length > 0;
    if (!hayInvalidos) cerrarErrorCamposPago();
}

/* =========================================================
   MODAL AJUSTE
========================================================= */
function abrirModalAjuste() {

    if (!Permisos.tiene("CLIENTES CC", "Crear")) {
        errorModal("No tenés permisos.");
        return;
    }


    if (!ACC.ClienteSel) {
        return errorModal("Seleccioná un Cliente.");
    }

    limpiarModalAjuste();

    $("#aClienteNombre").val(ACC.ClienteSel.Nombre || ACC.ClienteSel.NombreArtistico || "");
    $("#aFecha").val(moment().format("YYYY-MM-DD"));

    ensureSelect2($("#aMoneda"), { dropdownParent: $("#modalAjuste") });
    ensureSelect2($("#aCuenta"), { dropdownParent: $("#modalAjuste") });

    // TEXTO BOTON
    $("#modalAjuste .btn-primary").text("Registrar");

    $('#modalAjuste').modal('show');
}

function limpiarModalAjuste() {

    $("#modalAjuste input").each(function () {
        this.value = "";
        this.classList.remove("is-invalid", "is-valid");
    });

    $("#modalAjuste select").each(function () {

        $(this).val("").trigger("change");

        this.classList.remove("is-invalid", "is-valid");

        if ($(this).data("select2")) {
            const $selection = $(this).next(".select2").find(".select2-selection");
            $selection.removeClass("is-invalid is-valid");
        }
    });

    $("#aCuenta").empty().append(`<option value="">Seleccionar</option>`);

    cerrarErrorCamposAjuste();
}

function validarCampoAjusteIndividual(el) {

    if (!el) return;

    const obligatorios = ["aFecha", "aMoneda", "aCuenta", "aDebe", "aHaber", "aConcepto"];

    if (!el.id || !obligatorios.includes(el.id)) return;

    let valor;

    if (el.tagName === "SELECT") {
        valor = $(el).val();
    } else {
        valor = (el.value ?? "").toString().trim();
    }

    let esValido = valor !== null && valor !== "";

    /* 🚨 si el campo está vacío y nunca fue tocado, no validar */
    if (el.id === "aImporte") {
        esValido = valor !== "" && Number(valor) > 0;
    }

    setEstadoCampo(el, esValido);

    verificarErroresAjusteGeneral();
}

function validarAjuste() {

    const fecha = $("#aFecha").val();
    const moneda = $("#aMoneda").val();
    const cuenta = $("#aCuenta").val();
    const concepto = ($("#aConcepto").val() || "").trim();
    const debe = Number($("#aDebe").val() || 0);
    const haber = Number($("#aHaber").val() || 0);

    let errores = [];

    setEstadoCampo(document.getElementById("aFecha"), !!fecha);
    setEstadoCampo(document.getElementById("aMoneda"), !!moneda);
    setEstadoCampo(document.getElementById("aCuenta"), !!cuenta);
    setEstadoCampo(document.getElementById("aConcepto"), concepto !== "");

    if (!fecha) errores.push("Fecha");
    if (!moneda) errores.push("Moneda");
    if (!cuenta) errores.push("Cuenta");
    if (!concepto) errores.push("Concepto");

    if (debe === 0 && haber === 0) {
        errores.push("Debe o Haber");
    }

    if (debe > 0 && haber > 0) {
        errores.push("Solo un lado (Debe o Haber)");
    }

    if (errores.length > 0) {
        mostrarErrorCamposAjuste(
            `Revisá los siguientes campos/reglas:<br><strong>${errores.join(", ")}</strong>`
        );
        return false;
    }

    cerrarErrorCamposAjuste();
    return true;
}

async function guardarAjuste() {

    if (!ACC.ClienteSel) {
        return errorModal("Seleccioná un Cliente.");
    }

    if (!validarAjuste()) return;

    const modelo = {
        IdCliente: ACC.ClienteSel.Id,
        Fecha: $("#aFecha").val(),
        IdMoneda: $("#aMoneda").val(),
        IdCuenta: $("#aCuenta").val(),
        Debe: $("#aDebe").val() || 0,
        Haber: $("#aHaber").val() || 0,
        Concepto: $("#aConcepto").val()
    };

    try {
        const response = await fetch(API.registrarAjuste, {
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
            mostrarErrorCamposAjuste(data.mensaje || "No se pudo guardar.");
            return;
        }

        cerrarErrorCamposAjuste();
        $('#modalAjuste').modal('hide');

        exitoModal(data.mensaje || "Ajuste registrado correctamente.");

        await cargarClientes();

        if (ACC.ClienteSel) {
            const nuevoSel = (ACC.ClientesOriginal || []).find(x => x.Id === ACC.ClienteSel.Id);
            if (nuevoSel) {
                ACC.ClienteSel = nuevoSel;
                await cargarCuentaCorrienteSeleccionada();
            }
        }

        renderClientes();

    } catch (e) {
        console.error(e);
        mostrarErrorCamposAjuste("Ha ocurrido un error inesperado al guardar.");
    }
}

function mostrarErrorCamposAjuste(mensaje) {
    const panel = $("#errorCamposAjuste");
    panel.removeClass("d-none");
    panel.find(".rp-error-message").html(mensaje || "");
}

function cerrarErrorCamposAjuste() {
    $("#errorCamposAjuste").addClass("d-none");
    $("#errorCamposAjuste .rp-error-message").html("");
}

function verificarErroresAjusteGeneral() {
    const hayInvalidos = document.querySelectorAll("#modalAjuste .is-invalid").length > 0;
    if (!hayInvalidos) cerrarErrorCamposAjuste();
}

/* =========================================================
   PDF ESTADO DE CUENTA
========================================================= */

function exportarEstadoCuentaPdf() {

    if (!Permisos.tiene("CLIENTES CC", "Exportar")) {
        errorModal("No tenés permisos.");
        return;
    }


    if (!ACC.ClienteSel) {
        return errorModal("Seleccioná un Cliente.");
    }

    const Cliente = ACC.ClienteSel.Nombre || ACC.ClienteSel.NombreArtistico || "Cliente";
    const rows = ACC.movimientos.map(x => ([
        formatearFecha(x.Fecha),
        x.TipoMov || "",
        x.Concepto || "",
        fmtMoney(x.Debe || 0),
        fmtMoney(x.Haber || 0),
        fmtMoney(x.Saldo || 0)
    ]));

    const body = [
        [
            { text: 'Fecha', style: 'th' },
            { text: 'Tipo', style: 'th' },
            { text: 'Concepto', style: 'th' },
            { text: 'Debe', style: 'th', alignment: 'right' },
            { text: 'Haber', style: 'th', alignment: 'right' },
            { text: 'Saldo', style: 'th', alignment: 'right' }
        ],
        ...rows
    ];

    pdfMake.createPdf({
        pageSize: 'A4',
        pageOrientation: 'landscape',
        content: [
            { text: 'SistemaOroAmbiental', style: 'title' },
            { text: 'Estado de Cuenta Cliente', style: 'subtitle', margin: [0, 0, 0, 12] },
            { text: `Cliente: ${Cliente}`, bold: true, margin: [0, 0, 0, 4] },
            { text: `Emitido: ${moment().format("DD/MM/YYYY")}`, margin: [0, 0, 0, 12] },
            {
                columns: [
                    { text: `Saldo anterior: ${fmtMoney(ACC.resumen.saldoAnterior)}` },
                    { text: `Debe: ${fmtMoney(ACC.resumen.debe)}` },
                    { text: `Haber: ${fmtMoney(ACC.resumen.haber)}` },
                    { text: `Saldo actual: ${fmtMoney(ACC.resumen.saldoActual)}`, bold: true }
                ],
                margin: [0, 0, 0, 12]
            },
            {
                table: {
                    headerRows: 1,
                    widths: [70, 60, '*', 70, 70, 80],
                    body
                },
                layout: 'lightHorizontalLines'
            }
        ],
        styles: {
            title: { fontSize: 18, bold: true },
            subtitle: { fontSize: 11, color: '#555' },
            th: { bold: true, fillColor: '#e9eefb' }
        },
        defaultStyle: {
            fontSize: 9
        }
    }).download(`EstadoCuenta_${Cliente.replace(/\s+/g, "_")}.pdf`);
}

/* =========================================================
   FILTER DATA
========================================================= */

async function listaTiposMovFilter() {
    return [
        { Id: 1, Nombre: "VENTA" },
        { Id: 2, Nombre: "PAGO" },
        { Id: 3, Nombre: "AJUSTE" }
    ];
}

/* =========================================================
   HELPERS
========================================================= */

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function formatearFecha(fecha) {

    if (!fecha) return "";

    const m = moment(fecha, "YYYY-MM-DD").format("DD/MM/YYYY");


    return m;
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

function escapeHtml(str) {
    return (str || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}