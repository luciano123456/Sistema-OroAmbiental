/* =========================================================
   GASTOS — Listado + ABM + dashboards (Oro Ambiental)
========================================================= */

let gridGastos;
let charts = {};
let cuentasGastos = [];
let sucursalesGastos = [];

const API = {
    lista: "/Gastos/ListaFiltrada",
    insertar: "/Gastos/Insertar",
    actualizar: "/Gastos/Actualizar",
    eliminar: id => `/Gastos/Eliminar?id=${id}`,
    editarInfo: id => `/Gastos/EditarInfo?id=${id}`,
    categorias: "/GastosCategorias/Lista",
    cuentas: "/Cuentas/Lista",
    sucursales: "/Sucursales/Lista"
};

const authHeaders = () => ({
    Authorization: "Bearer " + token,
    "Content-Type": "application/json"
});

const columnConfig = [
    { index: 2, filterType: "text" },
    { index: 3, filterType: "select", fetchDataFunc: listaCategoriasFilter },
    { index: 4, filterType: "select", sucursalDt: true },
    { index: 5, filterType: "select", fetchDataFunc: listaCuentasFilter },
    { index: 6, filterType: "text" },
    { index: 7, filterType: "text" },
    { index: 8, filterType: "number" },
    { index: 9, filterType: "number" },
    { index: 10, filterType: "number" },
    { index: 11, filterType: "number" },
    { index: 12, filterType: "number" },
    { index: 13, filterType: "text" }
];

registrarFiltrosGrilla('grd_Gastos', columnConfig, {
    includeActivo: false,
    panelTitle: 'Filtrar resultados cargados',
    initSelect2: ($el) => inicializarSelect2FiltroGrilla($el),
    getSelectSearchText: (config, $select) => {
        if (config.index === 5) {
            return $select.find("option:selected").text().split(" (")[0].trim();
        }
        return $select.find("option:selected").text();
    }
});

let gastoModal;

$(document).ready(() => {
    if (typeof Permisos !== "undefined") {
        Permisos.init();
        Permisos.aplicarUI("Gastos");
    }

    if (typeof initPanelFiltrosPersistido === "function") {
        initPanelFiltrosPersistido("panelFiltrosGastosWrap", "panelFiltrosGastos");
    }

    $(document)
        .off("click.select2fix.gastos")
        .on("click.select2fix.gastos", ".select2-container--default .select2-selection--single", function () {
            const $select = $(this).closest(".select2-container").prev("select");
            if ($select.length) {
                if ($select.data("select2") && $select.data("select2").isOpen()) return;
                $select.select2("open");
            }
        });

    gastoModal = typeof initGastoModal === "function"
        ? initGastoModal({
            token: token,
            onSaved: async () => { await listaGastos(true); },
            onDeleted: async () => { await listaGastos(true); }
        })
        : null;

    wireEventosGastos();

    $("#dashBodyGastos").on("shown.bs.collapse", () => {
        if (gridGastos) {
            renderDashboards(gridGastos.rows().data().toArray());
        }
    });

    document.addEventListener("configuracionActualizada", onConfiguracionActualizadaGastos);

    inicializarPantallaGastos()
        .catch(e => {
            console.error("init Gastos:", e);
            errorModal("Error al inicializar la pantalla de gastos.");
        });
});

/* ========================= SELECT2 ========================= */

function ensureSelect2($el, options) {
    if (!$el || !$el.length) return;
    if ($el.data("select2")) {
        $el.select2("destroy");
    }
    $el.select2(Object.assign({
        width: "100%",
        allowClear: true
    }, options || {}));
}

function inicializarSelect2FiltroGrilla($select) {
    ensureSelect2($select, {
        dropdownParent: $(document.body),
        minimumResultsForSearch: 0,
        allowClear: true,
        placeholder: "Todos"
    });
}

function inicializarSelect2PanelGastos() {
    const unica = typeof usuarioTieneUnicaSucursal === "function" && usuarioTieneUnicaSucursal(sucursalesGastos);

    ensureSelect2($("#fCategoria"), {
        dropdownParent: $("#panelFiltrosGastos"),
        placeholder: "Todas",
        minimumResultsForSearch: 0
    });

    ensureSelect2($("#fSucursal"), {
        dropdownParent: $("#panelFiltrosGastos"),
        placeholder: unica ? "" : "Todas",
        minimumResultsForSearch: 0,
        allowClear: !unica
    });

    ensureSelect2($("#fCuenta"), {
        dropdownParent: $("#panelFiltrosGastos"),
        placeholder: "Todas",
        minimumResultsForSearch: 0
    });

    if (typeof aplicarBloqueoSucursalUnica === "function") {
        aplicarBloqueoSucursalUnica($("#fSucursal"), { sucursales: sucursalesGastos, triggerChange: false });
    }
}

function etiquetaCuenta(c, mostrarSucursal = true) {
    const nom = (c.Nombre || "").trim();
    if (!mostrarSucursal) return nom;
    const suc = (c.NombreCombo || "").trim();
    return suc ? `${nom} (${suc})` : nom;
}

function cuentasPorSucursal(idSucursal) {
    if (!idSucursal) return cuentasGastos || [];
    return (cuentasGastos || []).filter(x => String(x.IdCombo) === String(idSucursal));
}

/* ========================= EVENTOS / INIT ========================= */

function wireEventosGastos() {
    $("#btnRefreshGastos").on("click", () => listaGastos(true));
    $("#btnNuevoGasto").on("click", () => {
        if (gastoModal) gastoModal.abrirNuevo();
        else if (typeof nuevoGasto === "function") nuevoGasto();
    });

    $("#fSucursal").on("change", function () {
        cargarFiltroCuentasGastos($(this).val());
    });
}

async function inicializarPantallaGastos() {
    setFiltrosUltimaSemana();
    await cargarDatosFiltros();
    inicializarSelect2PanelGastos();
    cargarFiltroCuentasGastos($("#fSucursal").val());
    await listaGastos(true);
}

function setFiltrosUltimaSemana() {
    const hoy = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - 30);
    $("#fFechaDesde").val(desde.toISOString().slice(0, 10));
    $("#fFechaHasta").val(hoy.toISOString().slice(0, 10));
}

async function cargarDatosFiltros() {
    const [cats, cuentas, sucursales] = await Promise.all([
        obtenerLista(API.categorias),
        obtenerLista(API.cuentas),
        typeof fetchSucursalesPermitidas === "function"
            ? fetchSucursalesPermitidas(API.sucursales)
            : obtenerLista(API.sucursales)
    ]);

    cuentasGastos = cuentas || [];
    sucursalesGastos = sucursales || [];

    const $cat = $("#fCategoria");
    $cat.empty().append(`<option value="">Todas</option>`);
    (cats || []).forEach(x => $cat.append(`<option value="${x.Id}">${x.Nombre}</option>`));

    const $suc = $("#fSucursal");
    $suc.empty();
    const unica = typeof usuarioTieneUnicaSucursal === "function" && usuarioTieneUnicaSucursal(sucursalesGastos);
    if (!unica) {
        $suc.append(`<option value="">Todas</option>`);
    }
    sucursalesGastos.forEach(x => $suc.append(`<option value="${x.Id}">${x.Nombre}</option>`));
}

function cargarFiltroCuentasGastos(idSucursal) {
    const $fCuenta = $("#fCuenta");
    const valorActual = $fCuenta.val();

    if ($fCuenta.data("select2")) {
        $fCuenta.select2("destroy");
    }

    $fCuenta.empty().append(`<option value="">Todas</option>`);
    cuentasPorSucursal(idSucursal).forEach(x => {
        $fCuenta.append(`<option value="${x.Id}">${etiquetaCuenta(x, true)}</option>`);
    });

    if (valorActual && $fCuenta.find(`option[value="${valorActual}"]`).length) {
        $fCuenta.val(valorActual);
    }

    ensureSelect2($fCuenta, {
        dropdownParent: $("#panelFiltrosGastos"),
        placeholder: "Todas",
        minimumResultsForSearch: 0
    });
}

function getFiltrosPantalla() {
    return {
        FechaDesde: $("#fFechaDesde").val() || null,
        FechaHasta: $("#fFechaHasta").val() || null,
        IdCategoria: $("#fCategoria").val() ? Number($("#fCategoria").val()) : null,
        IdSucursal: $("#fSucursal").val() ? Number($("#fSucursal").val()) : null,
        IdCuenta: $("#fCuenta").val() ? Number($("#fCuenta").val()) : null,
        Concepto: ($("#fConcepto").val() || "").trim() || null,
        ImporteMin: $("#fImporteMin").val() ? Number($("#fImporteMin").val()) : null
    };
}

function aplicarFiltrosGastos() {
    listaGastos(true);
}

function limpiarFiltrosGastos() {
    $("#fFechaDesde, #fFechaHasta, #fConcepto, #fImporteMin").val("");
    setFiltrosUltimaSemana();
    $("#fCategoria").val("").trigger("change");
    if (!$("#fSucursal").prop("disabled")) {
        $("#fSucursal").val("").trigger("change");
    } else {
        cargarFiltroCuentasGastos($("#fSucursal").val());
    }
    listaGastos(true);
}

/* ========================= GRILLA ========================= */

async function listaGastos(usarFiltros = true) {
    const paginaActual = gridGastos ? gridGastos.page() : 0;

    try {
        const response = await fetch(API.lista, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(usarFiltros ? getFiltrosPantalla() : {})
        });

        if (!response.ok) throw new Error(response.statusText);

        const data = await response.json();
        await configurarDataTable(data);

        if (paginaActual > 0 && gridGastos) {
            gridGastos.page(paginaActual).draw("page");
        }

        actualizarKpis(data);
        renderDashboards(data);
    } catch (e) {
        console.error(e);
        errorModal("No se pudo cargar el listado de gastos.");
    }
}

async function configurarDataTable(data) {
    if (!gridGastos) {
        gridGastos = $("#grd_Gastos").DataTable({
            data: data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            autoWidth: false,
            columnDefs: typeof columnDefsGridLista === "function" ? columnDefsGridLista() : [],
            scrollX: true,
            scrollCollapse: true,
            order: [[2, "desc"]],
            columns: [
                columnaGridAcciones({
                    ver: "verGasto",
                    editar: "editarGasto",
                    eliminar: "eliminarGasto"
                }, "Gastos"),
                columnaGridId(),
                { data: "Fecha", render: d => normalizarFechaTabla(d) },
                { data: "Categoria", defaultContent: "" },
                { data: "Sucursal", defaultContent: "" },
                { data: "Cuenta", defaultContent: "" },
                { data: "NumReferencia", defaultContent: "" },
                { data: "Concepto" },
                { data: "ImporteNeto", className: "text-end", render: d => formatearMonedaARS(d) },
                { data: "PorcIva", className: "text-end", render: d => `${Number(d || 0).toFixed(2)}%` },
                { data: "TotalIva", className: "text-end", render: d => formatearMonedaARS(d) },
                { data: "OtrosImpuestos", className: "text-end", render: d => formatearMonedaARS(d) },
                { data: "ImporteTotal", className: "text-end", render: d => formatearMonedaARS(d) },
                { data: "NotaInterna", defaultContent: "" }
            ],
            dom: "Bfrtip",
            buttons: typeof getBotonesExportacion === "function"
                ? getBotonesExportacion(null, "Gastos")
                : [],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                await armarFiltrosGrillaLista(api, "#grd_Gastos", columnConfig, {
                    includeActivo: false,
                    panelTitle: "Filtrar resultados cargados",
                    initSelect2: ($el) => inicializarSelect2FiltroGrilla($el),
                    getSelectSearchText: (config, $select) => {
                        if (config.index === 5) {
                            return $select.find("option:selected").text().split(" (")[0].trim();
                        }
                        return $select.find("option:selected").text();
                    }
                });
                configurarOpcionesColumnas();
                actualizarKpis(data);
            }
        });
    } else {
        gridGastos.clear().rows.add(data).draw();
        actualizarKpis(data);
    }
}

function configurarOpcionesColumnas() {
    const grid = $("#grd_Gastos").DataTable();
    const container = $("#configColumnasMenu");
    const storageKey = "Gastos_Columnas";
    const savedConfig = JSON.parse(localStorage.getItem(storageKey) || "{}");
    container.empty();

    grid.columns().every(function (index) {
        if (index === 0 || index === 1) return;
        const isChecked = savedConfig[`col_${index}`] !== false;
        grid.column(index).visible(isChecked);
        const name = $("#grd_Gastos thead tr").first().find("th").eq(index).text();
        container.append(`
            <li class="rp-dd-item">
                <label class="rp-dd-label">
                    <input type="checkbox" class="toggle-column" data-column="${index}" ${isChecked ? "checked" : ""}>
                    <span>${name}</span>
                </label>
            </li>`);
    });

    $(".toggle-column").off("change").on("change", function () {
        const idx = parseInt($(this).data("column"), 10);
        const visible = $(this).is(":checked");
        savedConfig[`col_${idx}`] = visible;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));
        grid.column(idx).visible(visible);
    });
}

function actualizarKpis(data) {
    const rows = data || [];
    $("#kpiCantGastos").text(rows.length);
    const total = rows.reduce((s, x) => s + (Number(x.ImporteTotal) || 0), 0);
    const iva = rows.reduce((s, x) => s + (Number(x.TotalIva) || 0), 0);
    $("#kpiTotalGastos").text(formatearMonedaARS(total));
    $("#kpiTotalIva").text(formatearMonedaARS(iva));
}

/* ========================= DASHBOARDS ========================= */

function destruirCharts() {
    Object.keys(charts).forEach(k => {
        if (charts[k]) {
            charts[k].destroy();
            charts[k] = null;
        }
    });
}

function tieneDatosParaDashboard(data) {
    if (!Array.isArray(data) || data.length === 0) return false;
    const total = data.reduce((s, x) => s + (Number(x.ImporteTotal) || 0), 0);
    return total > 0;
}

function renderDashboards(data) {
    destruirCharts();

    if (!tieneDatosParaDashboard(data)) {
        $("#dashWrap").hide();
        return;
    }

    if (typeof Chart === "undefined") {
        $("#dashWrap").hide();
        return;
    }

    $("#dashWrap").show();

    const porCategoria = {};
    const porCuenta = {};
    const porMes = {};

    data.forEach(x => {
        const imp = Number(x.ImporteTotal) || 0;
        const cat = (x.Categoria || "Sin categoría").trim();
        const cta = (x.Cuenta || "Sin cuenta").trim();
        porCategoria[cat] = (porCategoria[cat] || 0) + imp;
        porCuenta[cta] = (porCuenta[cta] || 0) + imp;

        let key = "Sin fecha";
        if (x.Fecha && typeof moment !== "undefined") {
            const m = moment(x.Fecha);
            if (m.isValid()) key = m.format("YYYY-MM");
        }
        porMes[key] = (porMes[key] || 0) + imp;
    });

    const colores = ["#4f8cff", "#00d4aa", "#ffb020", "#ff5c5c", "#8e7dff", "#6ee7b7"];
    const topCuentas = Object.entries(porCuenta).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const elCat = document.getElementById("chartCategoria");
    const elCta = document.getElementById("chartCuenta");
    const elMes = document.getElementById("chartMes");
    if (!elCat || !elCta || !elMes) return;

    const chartBase = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: "#e8f0ff",
                    boxWidth: 10,
                    font: { size: 10 }
                }
            }
        }
    };

    charts.cat = new Chart(elCat, {
        type: "doughnut",
        data: {
            labels: Object.keys(porCategoria),
            datasets: [{ data: Object.values(porCategoria), backgroundColor: colores, borderWidth: 0 }]
        },
        options: {
            ...chartBase,
            plugins: {
                ...chartBase.plugins,
                legend: { position: "bottom", labels: { color: "#e8f0ff", boxWidth: 10, font: { size: 10 } } },
                tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatearMonedaARS(ctx.raw)}` } }
            }
        }
    });

    charts.cta = new Chart(elCta, {
        type: "bar",
        data: {
            labels: topCuentas.map(x => x[0]),
            datasets: [{ label: "Total", data: topCuentas.map(x => x[1]), backgroundColor: "#4f8cff" }]
        },
        options: {
            ...chartBase,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    ticks: { color: "#b8c5dc", font: { size: 10 }, maxRotation: 45, minRotation: 0 },
                    grid: { color: "rgba(255,255,255,0.06)" }
                },
                y: {
                    ticks: { color: "#b8c5dc", font: { size: 10 }, callback: v => formatearMonedaARS(v) },
                    grid: { color: "rgba(255,255,255,0.06)" }
                }
            }
        }
    });

    const meses = Object.keys(porMes).sort();
    charts.mes = new Chart(elMes, {
        type: "line",
        data: {
            labels: meses,
            datasets: [{
                label: "Gastos",
                data: meses.map(m => porMes[m]),
                borderColor: "#00d4aa",
                backgroundColor: "rgba(0,212,170,0.15)",
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 3
            }]
        },
        options: {
            ...chartBase,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    ticks: { color: "#b8c5dc", font: { size: 10 } },
                    grid: { color: "rgba(255,255,255,0.06)" }
                },
                y: {
                    ticks: { color: "#b8c5dc", font: { size: 10 }, callback: v => formatearMonedaARS(v) },
                    grid: { color: "rgba(255,255,255,0.06)" }
                }
            }
        }
    });
}

async function onConfiguracionActualizadaGastos(e) {
    const d = e.detail || {};
    const ctrl = d.tipo || d.controller || "";
    if (ctrl !== "GastosCategorias" && ctrl !== "Cuentas" && ctrl !== "Sucursales") return;

    cuentasGastos = await obtenerLista(API.cuentas) || [];
    await cargarDatosFiltros();
    inicializarSelect2PanelGastos();
    cargarFiltroCuentasGastos($("#fSucursal").val());
}

async function obtenerLista(url) {
    const r = await fetch(url, { headers: authHeaders() });
    return r.ok ? r.json() : [];
}

async function listaCategoriasFilter() {
    return obtenerLista(API.categorias);
}

async function listaCuentasFilter() {
    return obtenerLista(API.cuentas);
}

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
