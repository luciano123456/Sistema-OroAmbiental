/* =========================================================
   GASTOS - Listado + ABM + dashboards (Oro Ambiental)
========================================================= */

(function (window) {
    "use strict";

let gridGastos;
let chartsGs = {};
let cuentasGastos = [];
let sucursalesGastos = [];

const API_GS = {
    lista: "/Gastos/ListaFiltrada",
    insertar: "/Gastos/Insertar",
    actualizar: "/Gastos/Actualizar",
    eliminar: id => `/Gastos/Eliminar?id=${id}`,
    editarInfo: id => `/Gastos/EditarInfo?id=${id}`,
    categorias: "/GastosCategorias/Lista",
    cuentas: "/Cuentas/Lista",
    sucursales: "/Sucursales/Lista"
};

const authHeadersGs = () => ({
    Authorization: "Bearer " + token,
    "Content-Type": "application/json"
});

const columnConfigGs = [
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

registrarFiltrosGrilla('grd_GastosHub', columnConfigGs, {
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

window.initFinanzasGastos = async function () {
  if (window.__FG_GASTOS_READY) return;
  window.__FG_GASTOS_READY = true;
    if (typeof Permisos !== "undefined") {
        Permisos.init();
        Permisos.aplicarUI("Gastos");
    }

    if (typeof initPanelFiltrosPersistido === "function") {
        initPanelFiltrosPersistido("panelFiltrosGastosHubWrap", "panelFiltrosGastosHub");
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
            onSaved: async () => {
                await listaGastos(true);
                if (typeof window.refrescarCajaModulo === "function") {
                    await window.refrescarCajaModulo();
                }
                if (typeof window.refrescarFinanzasResumen === "function") {
                    await window.refrescarFinanzasResumen();
                }
            },
            onDeleted: async () => {
                await listaGastos(true);
                if (typeof window.refrescarCajaModulo === "function") {
                    await window.refrescarCajaModulo();
                }
                if (typeof window.refrescarFinanzasResumen === "function") {
                    await window.refrescarFinanzasResumen();
                }
            }
        })
        : null;

    wireEventosGastos();

    $("#gsDashBody").on("shown.bs.collapse", () => {
        if (gridGastos) {
            renderDashboards(gridGastos.rows().data().toArray());
        }
    });

    document.addEventListener("configuracionActualizada", onConfiguracionActualizadaGastos);

    try {
        await inicializarPantallaGastos();
    } catch (e) {
        console.error("init Gastos:", e);
        errorModal("Error al inicializar la pantalla de gastos.");
    }
};

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

    ensureSelect2($("#gsCategoria"), {
        dropdownParent: $("#panelFiltrosGastosHub"),
        placeholder: "Todas",
        minimumResultsForSearch: 0
    });

    ensureSelect2($("#gsSucursal"), {
        dropdownParent: $("#panelFiltrosGastosHub"),
        placeholder: unica ? "" : "Todas",
        minimumResultsForSearch: 0,
        allowClear: !unica
    });

    ensureSelect2($("#gsCuenta"), {
        dropdownParent: $("#panelFiltrosGastosHub"),
        placeholder: "Todas",
        minimumResultsForSearch: 0
    });

    if (typeof aplicarBloqueoSucursalUnica === "function") {
        aplicarBloqueoSucursalUnica($("#gsSucursal"), { sucursales: sucursalesGastos, triggerChange: false });
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
    $("#gsBtnRefresh").on("click", () => listaGastos(true));
    $("#gsBtnNuevo").on("click", () => {
        if (gastoModal) gastoModal.abrirNuevo();
        else if (typeof nuevoGasto === "function") nuevoGasto();
    });

    $("#gsSucursal").on("change", function () {
        cargarFiltroCuentasGastos($(this).val());
    });
}

async function inicializarPantallaGastos() {
    setFiltrosUltimaSemana();
    await cargarDatosFiltros();
    inicializarSelect2PanelGastos();
    cargarFiltroCuentasGastos($("#gsSucursal").val());
    await listaGastos(true);
}

function setFiltrosUltimaSemana() {
    const hoy = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - 30);
    $("#gsFechaDesde").val(desde.toISOString().slice(0, 10));
    $("#gsFechaHasta").val(hoy.toISOString().slice(0, 10));
}

async function cargarDatosFiltros() {
    const [cats, cuentas, sucursales] = await Promise.all([
        obtenerLista(API_GS.categorias),
        obtenerLista(API_GS.cuentas),
        typeof fetchSucursalesPermitidas === "function"
            ? fetchSucursalesPermitidas(API_GS.sucursales)
            : obtenerLista(API_GS.sucursales)
    ]);

    cuentasGastos = cuentas || [];
    sucursalesGastos = sucursales || [];

    const $cat = $("#gsCategoria");
    $cat.empty().append(`<option value="">Todas</option>`);
    (cats || []).forEach(x => $cat.append(`<option value="${x.Id}">${x.Nombre}</option>`));

    const $suc = $("#gsSucursal");
    $suc.empty();
    const unica = typeof usuarioTieneUnicaSucursal === "function" && usuarioTieneUnicaSucursal(sucursalesGastos);
    if (!unica) {
        $suc.append(`<option value="">Todas</option>`);
    }
    sucursalesGastos.forEach(x => $suc.append(`<option value="${x.Id}">${x.Nombre}</option>`));
}

function cargarFiltroCuentasGastos(idSucursal) {
    const $gsCuenta = $("#gsCuenta");
    const valorActual = $gsCuenta.val();

    if ($gsCuenta.data("select2")) {
        $gsCuenta.select2("destroy");
    }

    $gsCuenta.empty().append(`<option value="">Todas</option>`);
    cuentasPorSucursal(idSucursal).forEach(x => {
        $gsCuenta.append(`<option value="${x.Id}">${etiquetaCuenta(x, true)}</option>`);
    });

    if (valorActual && $gsCuenta.find(`option[value="${valorActual}"]`).length) {
        $gsCuenta.val(valorActual);
    }

    ensureSelect2($gsCuenta, {
        dropdownParent: $("#panelFiltrosGastosHub"),
        placeholder: "Todas",
        minimumResultsForSearch: 0
    });
}

function getFiltrosPantalla() {
    return {
        FechaDesde: $("#gsFechaDesde").val() || null,
        FechaHasta: $("#gsFechaHasta").val() || null,
        IdCategoria: $("#gsCategoria").val() ? Number($("#gsCategoria").val()) : null,
        IdSucursal: $("#gsSucursal").val() ? Number($("#gsSucursal").val()) : null,
        IdCuenta: $("#gsCuenta").val() ? Number($("#gsCuenta").val()) : null,
        Concepto: ($("#gsConcepto").val() || "").trim() || null,
        ImporteMin: $("#gsImporteMin").val() ? Number($("#gsImporteMin").val()) : null
    };
}

function aplicarFiltrosGastos() {
    listaGastos(true);
}

function limpiarFiltrosGastos() {
    $("#gsFechaDesde, #gsFechaHasta, #gsConcepto, #gsImporteMin").val("");
    setFiltrosUltimaSemana();
    $("#gsCategoria").val("").trigger("change");
    if (!$("#gsSucursal").prop("disabled")) {
        $("#gsSucursal").val("").trigger("change");
    } else {
        cargarFiltroCuentasGastos($("#gsSucursal").val());
    }
    listaGastos(true);
}

/* ========================= GRILLA ========================= */

async function listaGastos(usarFiltros = true) {
    const paginaActual = gridGastos ? gridGastos.page() : 0;

    try {
        const response = await fetch(API_GS.lista, {
            method: "POST",
            headers: authHeadersGs(),
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
        gridGastos = $("#grd_GastosHub").DataTable({
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
                { data: "ImporteNeto", className: "text-end", render: d => `<span class="rp-money-out">${formatearMonedaARS(d)}</span>` },
                { data: "PorcIva", className: "text-end", render: d => `${Number(d || 0).toFixed(2)}%` },
                { data: "TotalIva", className: "text-end", render: d => formatearMonedaARS(d) },
                { data: "OtrosImpuestos", className: "text-end", render: d => formatearMonedaARS(d) },
                { data: "ImporteTotal", className: "text-end", render: d => `<span class="rp-money-out">${formatearMonedaARS(d)}</span>` },
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
                await armarFiltrosGrillaLista(api, "#grd_GastosHub", columnConfigGs, {
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
    const grid = $("#grd_GastosHub").DataTable();
    const container = $("#gsConfigColumnasMenu");
    const storageKey = "Gastos_Columnas";
    const savedConfig = JSON.parse(localStorage.getItem(storageKey) || "{}");
    container.empty();

    grid.columns().every(function (index) {
        if (index === 0 || index === 1) return;
        const isChecked = savedConfig[`col_${index}`] !== false;
        grid.column(index).visible(isChecked);
        const name = $("#grd_GastosHub thead tr").first().find("th").eq(index).text();
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
    $("#gsKpiCant").text(rows.length);
    const total = rows.reduce((s, x) => s + (Number(x.ImporteTotal) || 0), 0);
    const iva = rows.reduce((s, x) => s + (Number(x.TotalIva) || 0), 0);
    $("#gsKpiTotal").text(formatearMonedaARS(total)).attr("class", "val rp-money-out");
    $("#gsKpiIva").text(formatearMonedaARS(iva));
}

/* ========================= DASHBOARDS ========================= */

function destruirCharts() {
    Object.keys(chartsGs).forEach(k => {
        if (chartsGs[k]) {
            chartsGs[k].destroy();
            chartsGs[k] = null;
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
        $("#gsDashWrap").hide();
        return;
    }

    if (typeof Chart === "undefined") {
        $("#gsDashWrap").hide();
        return;
    }

    $("#gsDashWrap").show();

    const porCategoria = {};
    const porCuenta = {};
    const porMes = {};

    data.forEach(x => {
        const imp = Number(x.ImporteTotal) || 0;
        const cat = (x.Categoria || "Sin categoria").trim();
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

    const colores = ["#4f8cff", "#00d4aa", "#ffb020", "#ff5c5c", "#8e7dff", "#6ee7b7", "#f472b6", "#38bdf8"];
    const topCuentas = Object.entries(porCuenta).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const elCat = document.getElementById("gsChartCategoria");
    const elCta = document.getElementById("gsChartCuenta");
    const elMes = document.getElementById("gsChartMes");
    if (!elCat || !elCta || !elMes) return;

    const tick = "#cbd5e1";
    const grid = "rgba(148, 163, 184, 0.18)";
    const chartBase = {
        responsive: true,
        maintainAspectRatio: false,
        color: tick,
        plugins: {
            legend: {
                labels: {
                    color: tick,
                    boxWidth: 12,
                    font: { size: 11, weight: "600" }
                }
            }
        }
    };

    chartsGs.cat = new Chart(elCat, {
        type: "doughnut",
        data: {
            labels: Object.keys(porCategoria),
            datasets: [{
                data: Object.values(porCategoria),
                backgroundColor: Object.keys(porCategoria).map((_, i) => colores[i % colores.length]),
                borderWidth: 2,
                borderColor: "#0f172a"
            }]
        },
        options: {
            ...chartBase,
            plugins: {
                ...chartBase.plugins,
                legend: {
                    position: "bottom",
                    labels: { color: tick, boxWidth: 12, font: { size: 11, weight: "600" }, padding: 12 }
                },
                tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatearMonedaARS(ctx.raw)}` } }
            }
        }
    });

    chartsGs.cta = new Chart(elCta, {
        type: "bar",
        data: {
            labels: topCuentas.map(x => x[0]),
            datasets: [{
                label: "Total",
                data: topCuentas.map(x => x[1]),
                backgroundColor: topCuentas.map((_, i) => colores[i % colores.length]),
                borderRadius: 6
            }]
        },
        options: {
            ...chartBase,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    ticks: { color: tick, font: { size: 10 }, maxRotation: 45, minRotation: 0 },
                    grid: { color: grid }
                },
                y: {
                    ticks: { color: tick, font: { size: 10 }, callback: v => formatearMonedaARS(v) },
                    grid: { color: grid }
                }
            }
        }
    });

    const meses = Object.keys(porMes).sort();
    chartsGs.mes = new Chart(elMes, {
        type: "line",
        data: {
            labels: meses,
            datasets: [{
                label: "Gastos",
                data: meses.map(m => porMes[m]),
                borderColor: "#00d4aa",
                backgroundColor: "rgba(0,212,170,0.18)",
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: "#00d4aa"
            }]
        },
        options: {
            ...chartBase,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    ticks: { color: tick, font: { size: 10 } },
                    grid: { color: grid }
                },
                y: {
                    ticks: { color: tick, font: { size: 10 }, callback: v => formatearMonedaARS(v) },
                    grid: { color: grid }
                }
            }
        }
    });
}

async function onConfiguracionActualizadaGastos(e) {
    const d = e.detail || {};
    const ctrl = d.tipo || d.controller || "";
    if (ctrl !== "GastosCategorias" && ctrl !== "Cuentas" && ctrl !== "Sucursales") return;

    cuentasGastos = await obtenerLista(API_GS.cuentas) || [];
    await cargarDatosFiltros();
    inicializarSelect2PanelGastos();
    cargarFiltroCuentasGastos($("#gsSucursal").val());
}

async function obtenerLista(url) {
    const r = await fetch(url, { headers: authHeadersGs() });
    return r.ok ? r.json() : [];
}

async function listaCategoriasFilter() {
    return obtenerLista(API_GS.categorias);
}

async function listaCuentasFilter() {
    return obtenerLista(API_GS.cuentas);
}

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

window.aplicarFiltrosGastos = aplicarFiltrosGastos;
window.limpiarFiltrosGastos = limpiarFiltrosGastos;

})(window);
