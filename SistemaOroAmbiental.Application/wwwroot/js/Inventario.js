/* Inventario — productos por sucursal + Stock */

let gridInventario;
let sucursalesInv = [];
let categoriasInv = [];
let productosComboInv = [];
let validacionInvEntrada = null;
let validacionInvSalida = null;
let validacionInvAjuste = null;
let validacionInvTransferencia = null;

const ACC = {
    Productos: [],
    ProductosOriginal: [],
    movimientos: [],
    movimientosOriginal: [],
    movimientosMap: new Map(),
    ProductoSel: null,
    idSucursalLista: null,
    resumen: {
        stockAnterior: 0,
        entradas: 0,
        salidas: 0,
        stockActual: 0,
        cantidadMovimientos: 0
    },
    filtrosActivos: false
};

const API = {
    listaProductos: (idSucursal, buscar, soloBajoMinimo, idCategoria) => {
        const p = new URLSearchParams();
        p.set("idSucursal", idSucursal);
        if (buscar) p.set("buscar", buscar);
        p.set("soloBajoMinimo", soloBajoMinimo);
        if (idCategoria) p.set("idCategoria", idCategoria);
        return `/Inventario/ListaProductos?${p.toString()}`;
    },
    movimientos: "/Inventario/Movimientos",
    resumen: "/Inventario/Resumen",
    movimiento: id => `/Inventario/Movimiento?id=${id}`,
    registrarEntrada: "/Inventario/RegistrarEntrada",
    registrarSalida: "/Inventario/RegistrarSalida",
    registrarAjuste: "/Inventario/RegistrarAjuste",
    registrarTransferencia: "/Inventario/RegistrarTransferencia",
    eliminar: id => `/Inventario/Eliminar?id=${id}`,
    sucursales: "/Sucursales/Lista",
    categorias: "/ProductosCategorias/Lista",
    productosCombo: "/Productos/Lista"
};

const columnConfigInv = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'select', fetchDataFunc: listaTiposMovFilterInv },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'text' },
    { index: 6, filterType: 'text' }
];

const authHeaders = () => ({
    'Authorization': 'Bearer ' + token
});

function fmtQty(n) {
    if (typeof formatearNumero === "function") {
        return formatearNumero(Number(n || 0));
    }
    return Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseQty(valor) {
    if (typeof leerInputNumerico === "function") return leerInputNumerico(valor);
    if (typeof parseNumero === "function") return parseNumero(valor);
    const n = parseFloat(String(valor || "").replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
}

function limpiarCantidadesModal(selector) {
    $(`${selector} .Inputmiles`).val("");
}

function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

$(document).ready(async () => {
    wireEventosInv();
    initValidacionesInventario();
    inicializarFechasPorDefectoInv();

    await Promise.all([
        cargarSucursalesInv(),
        cargarCategoriasInv(),
        cargarProductosComboInv()
    ]);

    mostrarEstadoSinSeleccionInv();
});

function wireEventosInv() {
    $("#btnRefreshInv").on("click", async () => {
        await cargarProductosInv();
        if (ACC.ProductoSel) {
            const nuevo = (ACC.ProductosOriginal || []).find(x => x.IdProducto === ACC.ProductoSel.IdProducto);
            if (nuevo) {
                ACC.ProductoSel = nuevo;
                await cargarStockSeleccionado();
            } else {
                ACC.ProductoSel = null;
                mostrarEstadoSinSeleccionInv();
            }
        }
        renderProductosInv();
    });

    $("#fSucursalLista").on("change", async function () {
        ACC.idSucursalLista = $(this).val() ? parseInt($(this).val(), 10) : null;
        ACC.ProductoSel = null;
        $("#lblFiltroProducto").text("Seleccioná un producto");
        await cargarProductosInv();
        renderProductosInv();
        mostrarEstadoSinSeleccionInv();
    });

    $("#txtBuscarProducto").on("input", () => renderProductosInv());
    $("#fCategoriaLista").on("change", async () => {
        await cargarProductosInv();
        renderProductosInv();
    });
    $("#fSoloBajoMinimo").on("change", async () => {
        await cargarProductosInv();
        renderProductosInv();
    });

    $("#btnEntrada").on("click", abrirModalEntrada);
    $("#btnSalida").on("click", abrirModalSalida);
    $("#btnAjusteInv").on("click", abrirModalAjusteInv);
    $("#btnTransferenciaInv").on("click", abrirModalTransferenciaInv);
}

function esCampoValidoInvSimple(el) {
    if (!el?.id) return true;
    const valor = (el.value ?? "").toString().trim();
    if (el.id === "eCantidad" || el.id === "sCantidad" || el.id === "tCantidad") {
        return valor !== "" && parseQty(valor) > 0;
    }
    return valor !== "";
}

function esCampoValidoAjusteInv(el) {
    if (!el?.id) return true;
    const valor = (el.value ?? "").toString().trim();
    if (el.id === "ajFecha" || el.id === "ajConcepto") return valor !== "";
    if (el.id === "ajEntrada" || el.id === "ajSalida") return valor === "" || parseQty(valor) >= 0;
    return true;
}

function esCampoValidoTransferenciaInv(el) {
    if (!el?.id) return true;
    if (el.id === "tNota") return true;
    if (el.id === "tCantidad") {
        const valor = (el.value ?? "").toString().trim();
        return valor !== "" && parseQty(valor) > 0;
    }
    const valor = el.tagName === "SELECT" ? $(el).val() : (el.value ?? "").toString().trim();
    return valor !== null && valor !== "";
}

function erroresReglasAjusteInv() {
    const entrada = parseQty($("#ajEntrada").val());
    const salida = parseQty($("#ajSalida").val());
    const errores = [];
    if (entrada <= 0 && salida <= 0) errores.push("Entrada o Salida");
    if (entrada > 0 && salida > 0) errores.push("Solo un lado (Entrada o Salida)");
    return errores;
}

function erroresReglasTransferenciaInv() {
    const origen = parseInt($("#tSucursalOrigen").val(), 10);
    const destino = parseInt($("#tSucursalDestino").val(), 10);
    if (origen && destino && origen === destino) return ["Origen y destino distintos"];
    return [];
}

function initValidacionesInventario() {
    if (typeof crearValidacionPanelModulo !== "function") return;

    ["#modalEntrada", "#modalSalida", "#modalAjusteInv", "#modalTransferenciaInv"].forEach(sel => {
        document.querySelectorAll(`${sel} input, ${sel} select`).forEach(el => {
            el.setAttribute("autocomplete", "off");
        });
    });

    validacionInvEntrada = crearValidacionPanelModulo({
        modalSelector: "#modalEntrada",
        panelSelector: "#errorCamposEntrada",
        select2Namespace: "inv-entrada",
        campos: [
            { id: "eFecha", nombre: "Fecha" },
            { id: "eCantidad", nombre: "Cantidad" },
            { id: "eConcepto", nombre: "Concepto" }
        ],
        esCampoValido: esCampoValidoInvSimple
    });

    validacionInvSalida = crearValidacionPanelModulo({
        modalSelector: "#modalSalida",
        panelSelector: "#errorCamposSalida",
        select2Namespace: "inv-salida",
        campos: [
            { id: "sFecha", nombre: "Fecha" },
            { id: "sCantidad", nombre: "Cantidad" },
            { id: "sConcepto", nombre: "Concepto" }
        ],
        esCampoValido: esCampoValidoInvSimple
    });

    validacionInvAjuste = crearValidacionPanelModulo({
        modalSelector: "#modalAjusteInv",
        panelSelector: "#errorCamposAjusteInv",
        select2Namespace: "inv-ajuste",
        campos: [
            { id: "ajFecha", nombre: "Fecha" },
            { id: "ajConcepto", nombre: "Concepto" }
        ],
        esCampoValido: esCampoValidoAjusteInv
    });

    const validarAjusteBase = validacionInvAjuste.validarTodos.bind(validacionInvAjuste);
    validacionInvAjuste.validarTodos = function () {
        const entrada = parseQty($("#ajEntrada").val());
        const salida = parseQty($("#ajSalida").val());
        const reglas = erroresReglasAjusteInv();

        ["ajEntrada", "ajSalida"].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            validacionInvAjuste.marcarTocado(el);
            const ok = reglas.length === 0 || (
                (id === "ajEntrada" && entrada > 0 && salida <= 0) ||
                (id === "ajSalida" && salida > 0 && entrada <= 0) ||
                (entrada <= 0 && salida <= 0 && reglas.includes("Entrada o Salida"))
            );
            if (typeof window.setEstadoCampo === "function") {
                window.setEstadoCampo(el, reglas.length === 0 ? true : ok);
            }
        });

        const okBase = validarAjusteBase();
        if (!okBase || reglas.length) {
            const errores = [...validacionInvAjuste._listarErrores(), ...reglas];
            if (errores.length) {
                const msg = `Revisá los siguientes campos:<br><strong>${[...new Set(errores)].join(", ")}</strong>`;
                validacionInvAjuste.cancelarPanelExito?.();
                if (typeof mostrarErrorPanelRp === "function") {
                    mostrarErrorPanelRp("#errorCamposAjusteInv", msg);
                }
                validacionInvAjuste._submitIntento = true;
                validacionInvAjuste._errorVisible = true;
                validacionInvAjuste._ultimoMensajeError = msg;
            }
            return false;
        }
        return true;
    };

    validacionInvTransferencia = crearValidacionPanelModulo({
        modalSelector: "#modalTransferenciaInv",
        panelSelector: "#errorCamposTransferenciaInv",
        select2Namespace: "inv-transferencia",
        campos: [
            { id: "tFecha", nombre: "Fecha" },
            { id: "tSucursalOrigen", nombre: "Sucursal origen" },
            { id: "tSucursalDestino", nombre: "Sucursal destino" },
            { id: "tProducto", nombre: "Producto" },
            { id: "tCantidad", nombre: "Cantidad" }
        ],
        esCampoValido: esCampoValidoTransferenciaInv
    });

    const validarTransferenciaBase = validacionInvTransferencia.validarTodos.bind(validacionInvTransferencia);
    validacionInvTransferencia.validarTodos = function () {
        const reglas = erroresReglasTransferenciaInv();
        const okBase = validarTransferenciaBase();
        if (!okBase || reglas.length) {
            const errores = [...validacionInvTransferencia._listarErrores(), ...reglas];
            if (errores.length) {
                const msg = `Revisá los siguientes campos:<br><strong>${[...new Set(errores)].join(", ")}</strong>`;
                validacionInvTransferencia.cancelarPanelExito?.();
                if (typeof mostrarErrorPanelRp === "function") {
                    mostrarErrorPanelRp("#errorCamposTransferenciaInv", msg);
                }
                validacionInvTransferencia._submitIntento = true;
                validacionInvTransferencia._errorVisible = true;
                validacionInvTransferencia._ultimoMensajeError = msg;
            }
            return false;
        }
        return true;
    };
}

function validarEntrada() {
    return validacionInvEntrada?.validarTodos() ?? false;
}

function validarSalida() {
    return validacionInvSalida?.validarTodos() ?? false;
}

function validarAjusteInv() {
    return validacionInvAjuste?.validarTodos() ?? false;
}

function validarTransferenciaInv() {
    return validacionInvTransferencia?.validarTodos() ?? false;
}

function inicializarFechasPorDefectoInv() {
    const hoy = moment();
    const inicioMes = moment().startOf("month");
    $("#fFechaDesde").val(inicioMes.format("YYYY-MM-DD"));
    $("#fFechaHasta").val(hoy.format("YYYY-MM-DD"));
}

function ensureSelect2($el, options) {
    if (!$el || !$el.length) return;
    if ($el.data('select2')) $el.select2('destroy');
    $el.select2(Object.assign({ width: '100%', allowClear: true }, options || {}));
}

function inicializarSelect2Inv(sucursales) {
    const unica = typeof usuarioTieneUnicaSucursal === "function"
        && usuarioTieneUnicaSucursal(sucursales);

    const optsSuc = {
        placeholder: unica ? " " : "Seleccionar sucursal",
        allowClear: !unica
    };

    ensureSelect2($("#fSucursalLista"), optsSuc);
    ensureSelect2($("#tSucursalOrigen"), {
        placeholder: unica ? " " : "Seleccionar",
        allowClear: !unica
    });
    ensureSelect2($("#tSucursalDestino"), {
        placeholder: unica ? " " : "Seleccionar",
        allowClear: !unica
    });
    ensureSelect2($("#fCategoriaLista"), { dropdownParent: $(".cc-left"), placeholder: "Todas" });
    ensureSelect2($("#fTipo"), { dropdownParent: $("#panelFiltrosInv"), placeholder: "Todos", minimumResultsForSearch: 0 });
}

async function cargarSucursalesInv() {
    try {
        sucursalesInv = await fetchSucursalesPermitidas(API.sucursales);
    } catch {
        sucursalesInv = [];
    }

    const idUnica = typeof getIdSucursalDefaultUsuario === "function"
        ? getIdSucursalDefaultUsuario(sucursalesInv)
        : null;

    const opts = {
        primeraOpcion: typeof primeraOpcionSucursal === "function"
            ? primeraOpcionSucursal({ value: "", text: "Seleccionar" }, sucursalesInv)
            : { value: "", text: "Seleccionar" },
        seleccionarPorDefecto: true
    };

    const selects = ["#fSucursalLista", "#tSucursalOrigen", "#tSucursalDestino"];
    selects.forEach(sel => {
        const $s = $(sel);
        llenarSelectSucursales($s, sucursalesInv, opts);
        if (idUnica) $s.val(String(idUnica));
    });

    inicializarSelect2Inv(sucursalesInv);

    selects.forEach(sel => {
        if (typeof aplicarBloqueoSucursalUnica === "function") {
            aplicarBloqueoSucursalUnica($(sel), { sucursales: sucursalesInv, triggerChange: false });
        }
    });

    if (idUnica) {
        ACC.idSucursalLista = idUnica;
        $("#fSucursalLista").trigger("change");
    }
}

async function cargarCategoriasInv() {
    try {
        const r = await fetch(API.categorias, { headers: authHeaders() });
        categoriasInv = r.ok ? await r.json() : [];
    } catch {
        categoriasInv = [];
    }
    const $el = $("#fCategoriaLista");
    const val = $el.val();
    $el.find("option:not(:first)").remove();
    (categoriasInv || []).forEach(x => $el.append(`<option value="${x.Id}">${x.Nombre}</option>`));
    if (val) $el.val(val);
}

async function cargarProductosComboInv() {
    try {
        const r = await fetch(API.productosCombo, { headers: authHeaders() });
        productosComboInv = r.ok ? await r.json() : [];
    } catch {
        productosComboInv = [];
    }
    llenarComboProductosTransferencia();
}

function llenarComboProductosTransferencia() {
    const $el = $("#tProducto");
    const val = $el.val();
    $el.empty().append(`<option value="">Seleccionar</option>`);
    (productosComboInv || []).forEach(x => {
        $el.append(`<option value="${x.Id}">${x.Nombre}</option>`);
    });
    if (val) $el.val(val);
}

async function cargarProductosInv() {
    const idSucursal = ACC.idSucursalLista || parseInt($("#fSucursalLista").val(), 10) || 0;
    if (!idSucursal) {
        ACC.ProductosOriginal = [];
        ACC.Productos = [];
        return;
    }
    ACC.idSucursalLista = idSucursal;

    const buscar = ($("#txtBuscarProducto").val() || "").trim();
    const soloBajo = $("#fSoloBajoMinimo").is(":checked");
    const idCat = $("#fCategoriaLista").val() || null;

    try {
        const r = await fetch(API.listaProductos(idSucursal, buscar, soloBajo, idCat), { headers: authHeaders() });
        if (!r.ok) {
            errorModal("Error cargando productos.");
            ACC.ProductosOriginal = [];
            ACC.Productos = [];
            return;
        }
        ACC.ProductosOriginal = await r.json();
        ACC.Productos = [...ACC.ProductosOriginal];
    } catch (e) {
        console.error(e);
        errorModal("Error cargando productos.");
        ACC.ProductosOriginal = [];
        ACC.Productos = [];
    }
}

function renderProductosInv() {
    const cont = $("#ProductosList");
    cont.html("");

    if (!ACC.idSucursalLista) {
        cont.html(`<div class="cc-empty"><i class="fa fa-building"></i> Seleccioná una sucursal.</div>`);
        $("#kpiProductos").text("0");
        return;
    }

    let lista = [...(ACC.ProductosOriginal || [])];
    const buscar = ($("#txtBuscarProducto").val() || "").toLowerCase();
    if (buscar) {
        lista = lista.filter(p => (p.Nombre || "").toLowerCase().includes(buscar));
    }

    $("#kpiProductos").text(lista.length);

    if (!lista.length) {
        cont.html(`<div class="cc-empty"><i class="fa fa-cube"></i> No se encontraron productos.</div>`);
        return;
    }

    lista.forEach(p => {
        const nombre = (p.Nombre || "").trim();
        const inicial = nombre ? nombre.charAt(0).toUpperCase() : "?";
        const stock = Number(p.Stock || 0);
        const active = ACC.ProductoSel && ACC.ProductoSel.IdProducto === p.IdProducto ? "active" : "";
        const bajoCls = p.BajoMinimo ? "inv-bajo-minimo" : "";
        const stockCls = p.BajoMinimo ? "inv-stock-low" : "inv-stock-ok";
        const meta = [p.Categoria, p.Medida].filter(Boolean).join(" · ");

        cont.append(`
            <div class="cc-artist-item ${active} ${bajoCls}" onclick="seleccionarProductoInv(${p.IdProducto})">
                <div class="cc-artist-avatar">${inicial}</div>
                <div class="cc-artist-main">
                    <div class="cc-artist-name">${escapeHtml(nombre)}</div>
                    <div class="cc-artist-meta text-muted" style="font-size:11px">${escapeHtml(meta)}</div>
                    <div class="cc-artist-meta ${stockCls}">
                        <span class="lbl">Stock</span>
                        <span class="val">${fmtQty(stock)}</span>
                        ${p.StockMinimo > 0 ? `<span class="lbl ms-2">Mín.</span><span class="val">${fmtQty(p.StockMinimo)}</span>` : ""}
                    </div>
                </div>
            </div>
        `);
    });
}

async function seleccionarProductoInv(idProducto) {
    if (ACC.ProductoSel && ACC.ProductoSel.IdProducto === idProducto) {
        ACC.ProductoSel = null;
        ACC.movimientos = [];
        ACC.movimientosOriginal = [];
        ACC.movimientosMap = new Map();
        $("#lblFiltroProducto").text("Seleccioná un producto");
        renderProductosInv();
        mostrarEstadoSinSeleccionInv();
        return;
    }

    ACC.ProductoSel = (ACC.ProductosOriginal || []).find(x => x.IdProducto === idProducto) || null;
    if (!ACC.ProductoSel) return;

    $("#lblFiltroProducto").text(ACC.ProductoSel.Nombre || "Producto");
    await cargarStockSeleccionado();
    renderProductosInv();
}

async function cargarStockSeleccionado() {
    await Promise.all([cargarMovimientosInv(), cargarResumenInv()]);
    renderMovimientosInv();
    actualizarKpisInv();
}

function obtenerFiltrosInv() {
    return {
        IdSucursal: ACC.idSucursalLista,
        IdProducto: ACC.ProductoSel ? ACC.ProductoSel.IdProducto : null,
        FechaDesde: $("#fFechaDesde").val() || null,
        FechaHasta: $("#fFechaHasta").val() || null,
        TipoMovimiento: $("#fTipo").val() || null,
        Texto: $("#fTexto").val() || null
    };
}

async function aplicarFiltrosInv() {
    const filtros = obtenerFiltrosInv();
    ACC.filtrosActivos = !!(filtros.TipoMovimiento || filtros.Texto);
    $("#txtFiltrosEstadoInv").text(ACC.filtrosActivos ? "Filtros activos" : "");
    if (!ACC.ProductoSel) return errorModal("Seleccioná un producto.");
    await cargarStockSeleccionado();
}

function limpiarFiltrosInv() {
    inicializarFechasPorDefectoInv();
    $("#fTipo").val("").trigger("change");
    $("#fTexto").val("");
    ACC.filtrosActivos = false;
    $("#txtFiltrosEstadoInv").text("");
    if (ACC.ProductoSel) cargarStockSeleccionado();
}

async function cargarMovimientosInv() {
    if (!ACC.ProductoSel || !ACC.idSucursalLista) {
        ACC.movimientos = [];
        ACC.movimientosOriginal = [];
        ACC.movimientosMap = new Map();
        return;
    }

    try {
        const response = await fetch(API.movimientos, {
            method: "POST",
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(obtenerFiltrosInv())
        });

        if (!response.ok) {
            errorModal("Error cargando movimientos.");
            return;
        }

        const data = await response.json();
        ACC.movimientosOriginal = data || [];
        ACC.movimientos = [...ACC.movimientosOriginal];
        ACC.movimientosMap = new Map();
        (ACC.movimientos || []).forEach(x => { if (x.Id) ACC.movimientosMap.set(x.Id, x); });
    } catch (e) {
        console.error(e);
        errorModal("Error cargando movimientos.");
    }
}

async function cargarResumenInv() {
    if (!ACC.ProductoSel || !ACC.idSucursalLista) {
        ACC.resumen = { stockAnterior: 0, entradas: 0, salidas: 0, stockActual: 0, cantidadMovimientos: 0 };
        return;
    }

    try {
        const response = await fetch(API.resumen, {
            method: "POST",
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(obtenerFiltrosInv())
        });

        if (!response.ok) {
            errorModal("Error cargando resumen.");
            return;
        }

        const data = await response.json();
        ACC.resumen = {
            stockAnterior: Number(data.StockAnterior || 0),
            entradas: Number(data.Entradas || 0),
            salidas: Number(data.Salidas || 0),
            stockActual: Number(data.StockActual || 0),
            cantidadMovimientos: Number(data.CantidadMovimientos || 0)
        };
    } catch (e) {
        console.error(e);
        errorModal("Error cargando resumen.");
    }
}

function renderMovimientosInv() {
    $("#invEmpty").toggleClass("d-none", !!ACC.ProductoSel);
    if (!ACC.ProductoSel) {
        if (gridInventario) gridInventario.clear().draw();
        actualizarKpisInv();
        return;
    }
    configurarDataTableInv(ACC.movimientos);
}

async function configurarDataTableInv(data) {
    if (!gridInventario) {
        const $thead = $('#grd_Inventario thead');
        if ($thead.find('tr.filters').length === 0) {
            $thead.find('tr').first().clone(true).addClass('filters').appendTo($thead);
        }

        gridInventario = $('#grd_Inventario').DataTable({
            data: data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            scrollCollapse: true,
            order: [],
            columns: [
                {
                    data: "Id",
                    title: '',
                    width: "1%",
                    render: function (data, type, row) {
                        if (row.Id === 0) return "";
                        if (typeof renderAccionesGrid === "function" && row.PuedeEliminar) {
                            return renderAccionesGrid(data, { ver: "verMovimientoInv", eliminar: "eliminarMovimientoInv" }, "Inventario");
                        }
                        return `<div class="cc-actions">
                            <button class="cc-btn ver" onclick="verMovimientoInv(${data})"><i class="fa fa-eye"></i></button>
                            ${row.PuedeEliminar ? `<button class="cc-btn del" onclick="eliminarMovimientoInv(${data})"><i class="fa fa-trash"></i></button>` : ""}
                        </div>`;
                    },
                    orderable: false,
                    searchable: false
                },
                { data: 'Fecha', render: v => formatearFecha(v) },
                { data: 'TipoMovimiento' },
                { data: 'Concepto' },
                { data: 'Entrada', className: "text-end inv-qty-entrada", render: v => v > 0 ? fmtQty(v) : "" },
                { data: 'Salida', className: "text-end inv-qty-salida", render: v => v > 0 ? fmtQty(v) : "" },
                {
                    data: 'Stock',
                    className: "text-end",
                    render: v => `<strong>${fmtQty(v)}</strong>`
                }
            ],
            dom: 'Bfrtip',
            buttons: typeof getBotonesExportacion === "function" ? getBotonesExportacion(gridInventario, "Inventario") : [],
            drawCallback: function () { actualizarKpisInv(); },
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                for (const config of columnConfigInv) {
                    const cell = $('.filters th').eq(config.index);
                    if (!cell.length) continue;
                    cell.empty();
                    if (config.filterType === 'select') {
                        const $select = $(`<select class="rp-filter-select" style="width:100%"><option value="">Todos</option></select>`).appendTo(cell);
                        const datos = await config.fetchDataFunc();
                        (datos || []).forEach(item => $select.append(`<option value="${item.Id}">${item.Nombre}</option>`));
                        ensureSelect2($select, { dropdownParent: $(document.body), minimumResultsForSearch: 0, allowClear: true });
                        $select.on('change', function () {
                            const value = $(this).val();
                            if (!value) { api.column(config.index).search('').draw(false); return; }
                            const text = $(this).find('option:selected').text();
                            api.column(config.index).search('^' + escapeRegex(text) + '$', true, false).draw(false);
                        });
                    } else {
                        $(`<input class="rp-filter-input" type="text" placeholder="Buscar...">`).appendTo(cell)
                            .on('keyup change', function () { api.column(config.index).search(this.value).draw(false); });
                    }
                }
                $('.filters th').eq(0).html('');
                configurarOpcionesColumnasInv();
                actualizarKpisInv();
            }
        });
    } else {
        gridInventario.clear().rows.add(data).draw();
        actualizarKpisInv();
    }
}

async function listaTiposMovFilterInv() {
    return [
        { Id: "1", Nombre: "Stock anterior" },
        { Id: "2", Nombre: "Entrada manual" },
        { Id: "3", Nombre: "Salida manual" },
        { Id: "4", Nombre: "Ajuste" },
        { Id: "5", Nombre: "Transferencia (entrada)" },
        { Id: "6", Nombre: "Transferencia (salida)" },
        { Id: "7", Nombre: "Compra" },
        { Id: "8", Nombre: "Entrega" }
    ];
}

function configurarOpcionesColumnasInv() {
    const grid = $('#grd_Inventario').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenuInv');
    const storageKey = `Inventario_Columnas`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};
    container.empty();

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") {
            const isChecked = savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;
            grid.column(index).visible(isChecked);
            const name = $('#grd_Inventario thead tr').first().find('th').eq(index).text();
            container.append(`
                <li class="rp-dd-item">
                    <label class="rp-dd-label">
                        <input type="checkbox" class="toggle-column-inv" data-column="${index}" ${isChecked ? 'checked' : ''}>
                        <span>${name}</span>
                    </label>
                </li>
            `);
        }
    });

    $('.toggle-column-inv').off('change').on('change', function () {
        const columnIdx = parseInt($(this).data('column'), 10);
        const isChecked = $(this).is(':checked');
        savedConfig[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));
        grid.column(columnIdx).visible(isChecked);
    });
}

function actualizarKpisInv() {
    const r = ACC.resumen;
    $("#kpiStockAnterior").text(fmtQty(r.stockAnterior));
    $("#kpiEntradas").text(fmtQty(r.entradas));
    $("#kpiSalidas").text(fmtQty(r.salidas));
    $("#kpiStockActual").text(fmtQty(r.stockActual));
    $("#kpiMovimientos").text(r.cantidadMovimientos || 0);

    const chip = $("#chipStockEstado");
    chip.removeClass("ok warn neg");

    if (!ACC.ProductoSel) {
        chip.addClass("warn").html(`<i class="fa fa-cubes"></i> Sin producto seleccionado`);
        return;
    }

    const stock = Number(ACC.ProductoSel.Stock ?? r.stockActual ?? 0);
    const min = Number(ACC.ProductoSel.StockMinimo || 0);
    if (min > 0 && stock < min) {
        chip.addClass("warn").html(`<i class="fa fa-exclamation-triangle"></i> Bajo mínimo (${fmtQty(stock)} / ${fmtQty(min)})`);
    } else {
        chip.addClass("ok").html(`<i class="fa fa-check-circle"></i> Stock ${fmtQty(stock)}`);
    }
}

function mostrarEstadoSinSeleccionInv() {
    ACC.resumen = { stockAnterior: 0, entradas: 0, salidas: 0, stockActual: 0, cantidadMovimientos: 0 };
    actualizarKpisInv();
    renderMovimientosInv();
}

function invClaseTipoBadge(origen, tipoLabel, entrada, salida) {
    const o = (origen || "").toUpperCase();
    if (o === "MANUAL") {
        if ((entrada || 0) > 0) return "entrada";
        if ((salida || 0) > 0) return "salida";
    }
    if (o === "TRANSFERENCIA") return "transferencia";
    if (o === "COMPRAS") return "compra";
    if (o === "ENTREGAS") return "entrega";

    const t = (tipoLabel || "").toLowerCase();
    if (t.includes("entrada") || t.includes("compra")) return "entrada";
    if (t.includes("salida") || t.includes("entrega")) return "salida";
    if (t.includes("ajuste")) return "ajuste";
    if (t.includes("transferencia")) return "transferencia";
    return "neutral";
}

function invIconoTipo(clase) {
    const map = {
        entrada: "fa-arrow-circle-down",
        salida: "fa-arrow-circle-up",
        ajuste: "fa-sliders",
        transferencia: "fa-exchange",
        compra: "fa-shopping-cart",
        entrega: "fa-truck",
        neutral: "fa-info-circle"
    };
    return map[clase] || "fa-info-circle";
}

function renderInvTipoBadge(tipoLabel, origen, entrada, salida) {
    const clase = invClaseTipoBadge(origen, tipoLabel, entrada, salida);
    const icono = invIconoTipo(clase);
    const texto = tipoLabel || "Movimiento";
    return `<span class="inv-tipo-badge inv-tipo-badge--${clase}">
        <i class="fa ${icono}"></i>${texto}
    </span>`;
}

function fmtQtyDetalle(valor) {
    return fmtQty(Number(valor) || 0);
}

function poblarDetalleMovimientoInv(m) {
    const entrada = Number(m.Entrada) || 0;
    const salida = Number(m.Salida) || 0;
    const stock = Number(m.Stock ?? 0);
    const concepto = (m.Concepto || "").trim() || "—";
    const fechaTxt = formatearFecha(m.Fecha);
    const tipoLabel = m.TipoMovimiento || "";

    $("#vmInvTipoBadge").html(renderInvTipoBadge(tipoLabel, m.Origen, entrada, salida));
    $("#vmInvConceptoHero").text(concepto);
    $("#vmInvFechaHero").text(fechaTxt);
    $("#vmInvStockHero").html(`<strong>${fmtQty(stock)}</strong>`);

    $("#vmInvConcepto").text(concepto);

    if (m.Producto) {
        $("#vmInvProducto").text(m.Producto);
        $("#divVmInvProducto").show();
    } else {
        $("#divVmInvProducto").hide();
    }

    if (m.Sucursal) {
        $("#vmInvSucursal").text(m.Sucursal);
        $("#divVmInvSucursal").show();
    } else {
        $("#divVmInvSucursal").hide();
    }

    const $qtyEntrada = $(".inv-detalle-qty--entrada");
    const $qtySalida = $(".inv-detalle-qty--salida");
    $qtyEntrada.toggleClass("inv-detalle-qty--muted", entrada <= 0);
    $qtySalida.toggleClass("inv-detalle-qty--muted", salida <= 0);

    $("#vmInvEntrada").text(fmtQtyDetalle(entrada));
    $("#vmInvSalida").text(fmtQtyDetalle(salida));
    $("#vmInvStock").html(`<strong>${fmtQty(stock)}</strong>`);
}

function verMovimientoInv(id) {
    fetch(API.movimiento(id), { headers: authHeaders() })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(m => {
            poblarDetalleMovimientoInv(m);
            $("#modalVerMovimientoInv").modal("show");
        })
        .catch(() => errorModal("No se pudo obtener el movimiento."));
}

async function eliminarMovimientoInv(id) {
    const confirmado = await confirmarModal("¿Desea eliminar este movimiento?");
    if (!confirmado) return;

    try {
        const response = await fetch(API.eliminar(id), { method: "DELETE", headers: authHeaders() });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!data.valor) {
            errorModal(data.mensaje || "No se pudo eliminar.");
            return;
        }
        exitoModal(data.mensaje || "Movimiento eliminado.");
        await cargarProductosInv();
        if (ACC.ProductoSel) {
            const nuevo = (ACC.ProductosOriginal || []).find(x => x.IdProducto === ACC.ProductoSel.IdProducto);
            if (nuevo) {
                ACC.ProductoSel = nuevo;
                await cargarStockSeleccionado();
            } else {
                ACC.ProductoSel = null;
                mostrarEstadoSinSeleccionInv();
            }
        }
        renderProductosInv();
    } catch {
        errorModal("Error al eliminar.");
    }
}

function requiereProductoSel() {
    if (!ACC.idSucursalLista) {
        errorModal("Seleccioná una sucursal.");
        return false;
    }
    if (!ACC.ProductoSel) {
        errorModal("Seleccioná un producto.");
        return false;
    }
    return true;
}

function abrirModalEntrada() {
    if (!requiereProductoSel()) return;
    validacionInvEntrada?.reset();
    $("#eProductoNombre").val(ACC.ProductoSel.Nombre);
    $("#eFecha").val(moment().format("YYYY-MM-DD"));
    limpiarCantidadesModal("#modalEntrada");
    $("#eConcepto").val("");
    $("#modalEntrada").modal("show");
}

function abrirModalSalida() {
    if (!requiereProductoSel()) return;
    validacionInvSalida?.reset();
    $("#sProductoNombre").val(ACC.ProductoSel.Nombre);
    $("#sFecha").val(moment().format("YYYY-MM-DD"));
    limpiarCantidadesModal("#modalSalida");
    $("#sConcepto").val("");
    $("#modalSalida").modal("show");
}

function abrirModalAjusteInv() {
    if (!requiereProductoSel()) return;
    validacionInvAjuste?.reset();
    $("#ajProductoNombre").val(ACC.ProductoSel.Nombre);
    $("#ajFecha").val(moment().format("YYYY-MM-DD"));
    limpiarCantidadesModal("#modalAjusteInv");
    $("#ajConcepto").val("");
    $("#modalAjusteInv").modal("show");
}

function abrirModalTransferenciaInv() {
    validacionInvTransferencia?.reset();
    $("#tFecha").val(moment().format("YYYY-MM-DD"));
    limpiarCantidadesModal("#modalTransferenciaInv");
    $("#tNota").val("");
    if (ACC.idSucursalLista) $("#tSucursalOrigen").val(ACC.idSucursalLista);
    if (ACC.ProductoSel) $("#tProducto").val(ACC.ProductoSel.IdProducto);
    ensureSelect2($("#tSucursalOrigen"), { dropdownParent: $("#modalTransferenciaInv") });
    ensureSelect2($("#tSucursalDestino"), { dropdownParent: $("#modalTransferenciaInv") });
    ensureSelect2($("#tProducto"), { dropdownParent: $("#modalTransferenciaInv") });
    $("#modalTransferenciaInv").modal("show");
}

async function guardarEntrada() {
    if (!requiereProductoSel()) return;
    if (!validarEntrada()) return;

    const cantidad = parseQty($("#eCantidad").val());
    const concepto = ($("#eConcepto").val() || "").trim();

    await postInventario(API.registrarEntrada, {
        IdSucursal: ACC.idSucursalLista,
        IdProducto: ACC.ProductoSel.IdProducto,
        Fecha: $("#eFecha").val(),
        Concepto: concepto,
        Cantidad: cantidad
    }, "#modalEntrada", "#errorCamposEntrada");
}

async function guardarSalida() {
    if (!requiereProductoSel()) return;
    if (!validarSalida()) return;

    const cantidad = parseQty($("#sCantidad").val());
    const concepto = ($("#sConcepto").val() || "").trim();

    await postInventario(API.registrarSalida, {
        IdSucursal: ACC.idSucursalLista,
        IdProducto: ACC.ProductoSel.IdProducto,
        Fecha: $("#sFecha").val(),
        Concepto: concepto,
        Cantidad: cantidad
    }, "#modalSalida", "#errorCamposSalida");
}

async function guardarAjusteInv() {
    if (!requiereProductoSel()) return;
    if (!validarAjusteInv()) return;

    const entrada = parseQty($("#ajEntrada").val());
    const salida = parseQty($("#ajSalida").val());
    const concepto = ($("#ajConcepto").val() || "").trim();

    await postInventario(API.registrarAjuste, {
        IdSucursal: ACC.idSucursalLista,
        IdProducto: ACC.ProductoSel.IdProducto,
        Fecha: $("#ajFecha").val(),
        Concepto: concepto,
        Entrada: entrada,
        Salida: salida
    }, "#modalAjusteInv", "#errorCamposAjusteInv");
}

async function guardarTransferenciaInv() {
    if (!validarTransferenciaInv()) return;

    const origen = parseInt($("#tSucursalOrigen").val(), 10);
    const destino = parseInt($("#tSucursalDestino").val(), 10);
    const idProducto = parseInt($("#tProducto").val(), 10);
    const cantidad = parseQty($("#tCantidad").val());
    const nota = ($("#tNota").val() || "").trim();

    await postInventario(API.registrarTransferencia, {
        Fecha: $("#tFecha").val(),
        IdSucursalOrigen: origen,
        IdSucursalDestino: destino,
        IdProducto: idProducto,
        Cantidad: cantidad,
        NotaInterna: nota || "Transferencia entre sucursales"
    }, "#modalTransferenciaInv", "#errorCamposTransferenciaInv", true);
}

async function postInventario(url, modelo, modalSel, errorSel, recargarLista) {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { ...authHeaders(), 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify(modelo)
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!data.valor) {
            mostrarErrorCamposInv(errorSel, data.mensaje || "No se pudo guardar.");
            return;
        }
        $(modalSel).modal("hide");
        exitoModal(data.mensaje || "Registrado correctamente.");
        await cargarProductosInv();
        if (ACC.ProductoSel) {
            const nuevo = (ACC.ProductosOriginal || []).find(x => x.IdProducto === ACC.ProductoSel.IdProducto);
            if (nuevo) {
                ACC.ProductoSel = nuevo;
                await cargarStockSeleccionado();
            }
        } else if (recargarLista && modelo.IdProducto) {
            ACC.ProductoSel = (ACC.ProductosOriginal || []).find(x => x.IdProducto === modelo.IdProducto) || null;
            if (ACC.ProductoSel) await cargarStockSeleccionado();
        }
        renderProductosInv();
    } catch {
        mostrarErrorCamposInv(errorSel, "Error inesperado al guardar.");
    }
}

document.addEventListener("configuracionActualizada", async (e) => {
    const d = e.detail || {};
    const ctrl = d.tipo || d.controller || "";
    if (ctrl === "Sucursales") await cargarSucursalesInv();
    if (ctrl === "ProductosCategorias") await cargarCategoriasInv();
    if (ctrl === "Productos") await cargarProductosComboInv();
});
