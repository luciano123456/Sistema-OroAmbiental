/* =========================================================
   CUENTA CORRIENTE ClienteS
   - Izquierda: Clientes
   - Derecha: movimientos
   - Pago => HABER
   - Venta => DEBE
   - Ajuste => Debe o Haber
========================================================= */

let gridCuentaCorriente;
let sucursalesCC = [];
let cuentasCC = [];
let validacionPagoCC = null;
let validacionAjusteCC = null;

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
    clientes: (buscar = "", soloSaldoActivo = false) =>
        `/ClientesCuentaCorriente/ListaClientes?buscar=${encodeURIComponent(buscar || "")}&soloSaldoActivo=${soloSaldoActivo}`,

    movimientos: "/ClientesCuentaCorriente/Movimientos",
    resumen: "/ClientesCuentaCorriente/Resumen",
    movimiento: id => `/ClientesCuentaCorriente/Movimiento?id=${id}`,
    registrarCobro: "/ClientesCuentaCorriente/RegistrarCobro",
    registrarAjuste: "/ClientesCuentaCorriente/RegistrarAjuste",
    eliminar: id => `/ClientesCuentaCorriente/Eliminar?id=${id}`,
    sucursales: "/Sucursales/Lista",
    cuentas: "/Cuentas/Lista"
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

/** Número desde input .Inputmiles (parseNumero / leerInputNumerico en site.js). */
function leerNumCC(valor) {
    if (typeof parseNumero === "function") return parseNumero(valor);
    if (typeof leerInputNumerico === "function") return leerInputNumerico(valor);
    const n = parseFloat(String(valor ?? "").replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
}

$(document).ready(async () => {

    Permisos.init();
    Permisos.aplicarUI("CLIENTES CC");


    wireEventos();

    inicializarFechasPorDefecto();

    await Promise.all([
        cargarSucursalesCC(),
        cargarCuentasCC(),
        cargarClientes()
    ]);

    inicializarSelect2CC();
    wireSucursalCuentaModales();
    initValidacionesCC();
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

}

/* =========================================================
   SUCURSALES / CUENTAS (CAJA)
========================================================= */

function cuentasPorSucursal(idSucursal) {
    if (!idSucursal) return cuentasCC || [];
    return (cuentasCC || []).filter(x => String(x.IdCombo) === String(idSucursal));
}

async function cargarSucursalesCC() {
    try {
        sucursalesCC = await fetchSucursalesPermitidas(API.sucursales);
    } catch {
        sucursalesCC = [];
    }
    llenarCombosSucursalCC();
}

async function cargarCuentasCC() {
    try {
        const r = await fetch(API.cuentas, { headers: authHeaders() });
        if (!r.ok) throw new Error();
        cuentasCC = await r.json();
    } catch {
        cuentasCC = [];
    }
}

function llenarCombosSucursalCC() {
    const opts = {
        primeraOpcion: primeraOpcionSucursal({ value: "", text: "Seleccionar" }),
        seleccionarPorDefecto: true
    };
    llenarSelectSucursales($("#pSucursal"), sucursalesCC, opts);
    llenarSelectSucursales($("#aSucursal"), sucursalesCC, opts);
    aplicarBloqueoSucursalUnica($("#pSucursal"), { triggerChange: false });
    aplicarBloqueoSucursalUnica($("#aSucursal"), { triggerChange: false });
    sincronizarCuentaCC("#pSucursal", "#pCuenta", "#modalPago");
    sincronizarCuentaCC("#aSucursal", "#aCuenta", "#modalAjuste");
}

function sincronizarCuentaCC(selectorSucursal, selectorCuenta, modalSelector) {
    const idSuc = $(selectorSucursal).val();
    if (idSuc) cargarCuentasModalCC(selectorCuenta, idSuc, modalSelector);
}

function cargarCuentasModalCC(selectorCuenta, idSucursal, modalSelector) {
    const $cuenta = $(selectorCuenta);
    const val = $cuenta.val();

    $cuenta.empty();
    if (!idSucursal) {
        $cuenta.append(`<option value="">Seleccione sucursal primero</option>`);
    } else {
        $cuenta.append(`<option value="">Seleccionar</option>`);
        cuentasPorSucursal(idSucursal).forEach(x => {
            $cuenta.append(`<option value="${x.Id}">${x.Nombre}</option>`);
        });
    }

    if (val && $cuenta.find(`option[value="${val}"]`).length) {
        $cuenta.val(val);
    } else {
        $cuenta.val(null);
    }

    ensureSelect2($cuenta, { dropdownParent: $(modalSelector) });
}

function wireSucursalCuentaModales() {
    $("#pSucursal").on("change", function () {
        cargarCuentasModalCC("#pCuenta", $(this).val(), "#modalPago");
        $("#pCuenta").val(null).trigger("change.select2");
        validacionPagoCC?.onSelect2Change(this);
    });

    $("#aSucursal").on("change", function () {
        cargarCuentasModalCC("#aCuenta", $(this).val(), "#modalAjuste");
        $("#aCuenta").val(null).trigger("change.select2");
        validacionAjusteCC?.onSelect2Change(this);
    });

    document.addEventListener("configuracionActualizada", async (e) => {
        const d = e.detail || {};
        const ctrl = d.tipo || d.controller || "";
        if (ctrl !== "Cuentas" && ctrl !== "Sucursales") return;

        if (ctrl === "Sucursales") await cargarSucursalesCC();
        else await cargarCuentasCC();
    });
}

/* =========================================================
   ClienteS
========================================================= */

async function cargarClientes() {

    const buscarCliente = ($("#txtBuscarCliente").val() || "").trim();
    const soloSaldoActivo = $("#fClienteSaldoActivo").is(":checked");

    const r = await fetch(API.clientes(buscarCliente, soloSaldoActivo), {
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
        TipoMovimiento: $("#fTipo").val() || null,
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
            order: [[1, "desc"]],

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
                { data: 'TipoMovimiento' },
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
            $("#vmTipo").text(m.TipoMovimiento || "");
            $("#vmConcepto").text(m.Concepto || "");
            $("#vmDebe").text(fmtMoney(m.Debe || 0));
            $("#vmHaber").text(fmtMoney(m.Haber || 0));
            $("#vmSaldo").text(fmtMoney(m.Saldo ?? m.saldo ?? 0));

            if (m.Sucursal) {
                $("#vmSucursal").text(m.Sucursal);
                $("#divVmSucursal").show();
            } else {
                $("#divVmSucursal").hide();
            }

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

function esCampoValidoPagoCC(el) {
    if (!el?.id) return true;
    let valor;
    if (el.tagName === "SELECT") {
        valor = $(el).val();
    } else {
        valor = (el.value ?? "").toString().trim();
    }
    let esValido = valor !== null && valor !== "";
    if (el.id === "pImporte") {
        esValido = valor !== "" && leerNumCC(valor) > 0;
    }
    return esValido;
}

function esCampoValidoAjusteCC(el) {
    if (!el?.id) return true;
    const impactaCaja = leerNumCC($("#aDebe").val()) > 0 || leerNumCC($("#aHaber").val()) > 0;
    if (el.id === "aSucursal" || el.id === "aCuenta") {
        if (!impactaCaja) return true;
        return !!$(el).val();
    }
    if (el.id === "aDebe" || el.id === "aHaber") {
        const valor = (el.value ?? "").toString().trim();
        return valor === "" || leerNumCC(valor) >= 0;
    }
    if (el.id === "aFecha" || el.id === "aConcepto") {
        return (el.value ?? "").toString().trim() !== "";
    }
    return true;
}

function erroresReglasAjusteCC() {
    const debe = leerNumCC($("#aDebe").val());
    const haber = leerNumCC($("#aHaber").val());
    const impactaCaja = debe > 0 || haber > 0;
    const errores = [];
    if (impactaCaja && !$("#aSucursal").val()) errores.push("Sucursal");
    if (impactaCaja && !$("#aCuenta").val()) errores.push("Cuenta");
    if (debe === 0 && haber === 0) errores.push("Debe o Haber");
    if (debe > 0 && haber > 0) errores.push("Solo un lado (Debe o Haber)");
    return errores;
}

function initValidacionesCC() {
    if (typeof crearValidacionPanelModulo !== "function") return;

    document.querySelectorAll("#modalPago input, #modalAjuste input").forEach(el => {
        el.setAttribute("autocomplete", "off");
    });

    validacionPagoCC = crearValidacionPanelModulo({
        modalSelector: "#modalPago",
        panelSelector: "#errorCamposPago",
        select2Namespace: "cc-pago",
        campos: [
            { id: "pFecha", nombre: "Fecha" },
            { id: "pSucursal", nombre: "Sucursal" },
            { id: "pCuenta", nombre: "Cuenta" },
            { id: "pImporte", nombre: "Importe" },
            { id: "pConcepto", nombre: "Concepto" }
        ],
        esCampoValido: esCampoValidoPagoCC
    });

    validacionAjusteCC = crearValidacionPanelModulo({
        modalSelector: "#modalAjuste",
        panelSelector: "#errorCamposAjuste",
        select2Namespace: "cc-ajuste",
        getCampos: () => {
            const impactaCaja = leerNumCC($("#aDebe").val()) > 0 || leerNumCC($("#aHaber").val()) > 0;
            const campos = [
                { id: "aFecha", nombre: "Fecha" },
                { id: "aConcepto", nombre: "Concepto" }
            ];
            if (impactaCaja) {
                campos.push({ id: "aSucursal", nombre: "Sucursal" });
                campos.push({ id: "aCuenta", nombre: "Cuenta" });
            }
            return campos;
        },
        esCampoValido: esCampoValidoAjusteCC
    });

    const validarAjusteBase = validacionAjusteCC.validarTodos.bind(validacionAjusteCC);
    validacionAjusteCC.validarTodos = function () {
        const reglas = erroresReglasAjusteCC();
        const okBase = validarAjusteBase();
        if (!okBase || reglas.length) {
            const errores = [...validacionAjusteCC._listarErrores(), ...reglas];
            if (errores.length) {
                const msg = `Revisá los siguientes campos/reglas:<br><strong>${[...new Set(errores)].join(", ")}</strong>`;
                validacionAjusteCC.cancelarPanelExito?.();
                if (typeof mostrarErrorPanelRp === "function") {
                    mostrarErrorPanelRp("#errorCamposAjuste", msg);
                }
                validacionAjusteCC._submitIntento = true;
                validacionAjusteCC._errorVisible = true;
                validacionAjusteCC._ultimoMensajeError = msg;
            }
            return false;
        }
        return true;
    };
}

function abrirModalPago() {

    if (!Permisos.tiene("CLIENTES CC", "Crear")) {
        errorModal("No tenés permisos.");
        return;
    }


    if (!ACC.ClienteSel) {
        return errorModal("Seleccioná un Cliente.");
    }

    validacionPagoCC?.reset();

    $("#pClienteNombre").val(ACC.ClienteSel.Nombre || ACC.ClienteSel.NombreArtistico || "");
    $("#pFecha").val(moment().format("YYYY-MM-DD"));

    llenarCombosSucursalCC();
    ensureSelect2($("#pSucursal"), {
        dropdownParent: $("#modalPago"),
        allowClear: !(typeof usuarioTieneUnicaSucursal === "function" && usuarioTieneUnicaSucursal())
    });
    const idSucPago = aplicarBloqueoSucursalUnica($("#pSucursal"), { triggerChange: false });
    cargarCuentasModalCC("#pCuenta", idSucPago || null, "#modalPago");

    // TEXTO BOTON
    $("#modalPago .btn-primary").text("Registrar");

    $('#modalPago').modal('show');
}

function validarPago() {
    return validacionPagoCC?.validarTodos() ?? false;
}
async function guardarPago() {

    if (!ACC.ClienteSel) {
        return errorModal("Seleccioná un Cliente.");
    }

    if (!validarPago()) return;

    const modelo = {
        IdCliente: ACC.ClienteSel.Id,
        Fecha: $("#pFecha").val(),
        IdCuenta: parseInt($("#pCuenta").val(), 10),
        Importe: leerNumCC($("#pImporte").val()),
        Concepto: $("#pConcepto").val()
    };

    try {
        const response = await fetch(API.registrarCobro, {
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

        if (typeof cerrarPanelRp === "function") cerrarPanelRp("#errorCamposPago");
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
    if (typeof mostrarErrorPanelRp === "function") {
        mostrarErrorPanelRp("#errorCamposPago", mensaje);
    }
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

    validacionAjusteCC?.reset();

    $("#aClienteNombre").val(ACC.ClienteSel.Nombre || ACC.ClienteSel.NombreArtistico || "");
    $("#aFecha").val(moment().format("YYYY-MM-DD"));

    llenarCombosSucursalCC();
    ensureSelect2($("#aSucursal"), {
        dropdownParent: $("#modalAjuste"),
        allowClear: !(typeof usuarioTieneUnicaSucursal === "function" && usuarioTieneUnicaSucursal())
    });
    const idSucAjuste = aplicarBloqueoSucursalUnica($("#aSucursal"), { triggerChange: false });
    cargarCuentasModalCC("#aCuenta", idSucAjuste || null, "#modalAjuste");

    // TEXTO BOTON
    $("#modalAjuste .btn-primary").text("Registrar");

    $('#modalAjuste').modal('show');
}

function validarAjuste() {
    return validacionAjusteCC?.validarTodos() ?? false;
}

async function guardarAjuste() {

    if (!ACC.ClienteSel) {
        return errorModal("Seleccioná un Cliente.");
    }

    if (!validarAjuste()) return;

    const idCuenta = $("#aCuenta").val();

    const modelo = {
        IdCliente: ACC.ClienteSel.Id,
        Fecha: $("#aFecha").val(),
        IdCuenta: idCuenta ? parseInt(idCuenta, 10) : null,
        Debe: leerNumCC($("#aDebe").val()),
        Haber: leerNumCC($("#aHaber").val()),
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

        if (typeof cerrarPanelRp === "function") cerrarPanelRp("#errorCamposAjuste");
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
    if (typeof mostrarErrorPanelRp === "function") {
        mostrarErrorPanelRp("#errorCamposAjuste", mensaje);
    }
}

/* =========================================================
   PDF ESTADO DE CUENTA
========================================================= */

function exportarEstadoCuentaPdf() {
    errorModal("Exportación PDF pendiente de implementar.");
    return;

    if (!ACC.ClienteSel) {
        return errorModal("Seleccioná un Cliente.");
    }

    const Cliente = ACC.ClienteSel.Nombre || "Cliente";
    const rows = ACC.movimientos.map(x => ([
        formatearFecha(x.Fecha),
        x.TipoMovimiento || "",
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
            { text: 'Sistema Levels', style: 'title' },
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