/* =========================================================
   FINANZAS - Hub unico nativo (sin iframes)
========================================================= */

const FG_TAB_TO_MODO = {
    efectivo: "EFECTIVO",
    bancos: "BANCO",
    tesoreria: "TESORERIA"
};

const FG_STATE = {
    tabActual: null,
    charts: {}
};

document.addEventListener("DOMContentLoaded", () => {
    wireFgTabs();
    wireFgAcciones();
    renderFgDashboards();
    cargarFgGastosResumen();

    const inicial = fgTabDesdeUbicacion() || (window.FG_TAB_INICIAL || "resumen");
    activarTabFg(inicial, { silencioso: true });
});

function wireFgTabs() {
    document.querySelectorAll("[data-fg-tab]").forEach(btn => {
        btn.addEventListener("click", e => {
            e.preventDefault();
            activarTabFg(btn.getAttribute("data-fg-tab"));
        });
    });
}

function wireFgAcciones() {
    document.querySelectorAll("[data-fg-goto]").forEach(el => {
        el.addEventListener("click", e => {
            e.preventDefault();
            activarTabFg(el.getAttribute("data-fg-goto"));
        });
    });
}

function fgTabDesdeUbicacion() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("tab");
    if (q) return normalizarTabFg(q);
    const hash = (window.location.hash || "").replace("#", "");
    return hash ? normalizarTabFg(hash) : null;
}

function normalizarTabFg(valor) {
    if (!valor) return null;
    const v = String(valor).trim().toLowerCase();
    if (v === "librodiario" || v === "libro") return "resumen";
    if (v === "controlmensual" || v === "control") return "controlMensual";
    if (["resumen", "efectivo", "bancos", "tesoreria", "gastos"].includes(v)) return v;
    return null;
}

async function activarTabFg(tab, opciones = {}) {
    const normalizado = normalizarTabFg(tab) || "resumen";
    FG_STATE.tabActual = normalizado;

    document.querySelectorAll("[data-fg-tab]").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-fg-tab") === normalizado);
    });

    const secciones = {
        resumen: "fgSectionResumen",
        efectivo: "fgSectionCaja",
        bancos: "fgSectionCaja",
        tesoreria: "fgSectionCaja",
        gastos: "fgSectionGastos",
        controlMensual: "fgSectionControl",
        libroDiario: "fgSectionLibro"
    };

    const objetivoId = secciones[normalizado];
    document.querySelectorAll(".fg-section").forEach(sec => {
        const mostrar = sec.id === objetivoId;
        sec.hidden = !mostrar;
        sec.classList.toggle("active", mostrar);
    });

    if (!opciones.silencioso) actualizarHashFg(normalizado);

    if (["efectivo", "bancos", "tesoreria"].includes(normalizado)) {
        await abrirCajaFg(FG_TAB_TO_MODO[normalizado]);
        return;
    }

    if (normalizado === "gastos") {
        if (typeof window.initFinanzasGastos === "function") {
            await window.initFinanzasGastos();
        }
        setTimeout(() => {
            if ($.fn.DataTable && $.fn.DataTable.isDataTable("#grd_GastosHub")) {
                $("#grd_GastosHub").DataTable().columns.adjust();
            }
        }, 80);
        return;
    }

    if (normalizado === "controlMensual") {
        if (typeof window.initFinanzasControlMensual === "function") {
            await window.initFinanzasControlMensual();
        }
        return;
    }

    if (normalizado === "libroDiario") {
        if (typeof window.initFinanzasLibro === "function") {
            await window.initFinanzasLibro();
        }
        return;
    }
}

function actualizarHashFg(tab) {
    try {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        window.history.replaceState(null, "", url.toString());
    } catch {
        window.location.hash = tab;
    }
}

async function abrirCajaFg(modo) {
    if (typeof window.setCajaModo === "function") {
        await window.setCajaModo(modo);
    } else if (typeof window.initCajaModule === "function") {
        await window.initCajaModule();
    }

    const titulos = {
        EFECTIVO: "Caja efectivo",
        BANCO: "Bancos",
        TESORERIA: "Tesoreria"
    };
    const $tit = $("#cajaTituloHub");
    if ($tit.length) $tit.text(titulos[modo] || titulos.TESORERIA);

    // DataTables se rompe si se midio el layout oculto: reajustar al mostrar el tab
    requestAnimationFrame(() => {
        setTimeout(() => {
            if (typeof window.ajustarGrillaCaja === "function") window.ajustarGrillaCaja();
        }, 80);
    });
}

function fmtMoneyFg(n) {
    const v = Number(n || 0);
    try {
        return v.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
    } catch {
        return "$ " + v.toFixed(2);
    }
}

function aplicarFgResumenKpis(r) {
    window.FG_RESUMEN = r || window.FG_RESUMEN || {};
    const d = window.FG_RESUMEN;
    const saldoEfe = Number(d.saldoEfectivo || 0);
    const saldoBan = Number(d.saldoBanco || 0);
    const ingEfe = Number(d.ingEfe || 0);
    const egrEfe = Number(d.egrEfe || 0);
    const ingBan = Number(d.ingBan || 0);
    const egrBan = Number(d.egrBan || 0);
    const ingMes = ingEfe + ingBan;
    const egrMes = egrEfe + egrBan;
    const neto = ingMes - egrMes;

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = fmtMoneyFg(val);
    };

    set("fgKpiSaldoEfectivo", saldoEfe);
    set("fgKpiSaldoBanco", saldoBan);
    set("fgKpiSaldoTotal", saldoEfe + saldoBan);
    set("fgKpiNetoMes", neto);
    set("fgKpiIngEfectivo", ingEfe);
    set("fgKpiEgrEfectivo", egrEfe);
    set("fgKpiIngBanco", ingBan);
    set("fgKpiEgrBanco", egrBan);
    set("fgKpiIngresosMes", ingMes);
    set("fgKpiEgresosMes", egrMes);

    renderFgDashboards();
}

window.refrescarFinanzasResumen = async function () {
    try {
        const inicio = moment().startOf("month").format("YYYY-MM-DD");
        const hoy = moment().format("YYYY-MM-DD");
        const response = await fetch("/Cajas/ResumenConsolidado", {
            method: "POST",
            headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ FechaDesde: inicio, FechaHasta: hoy })
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        aplicarFgResumenKpis({
            saldoEfectivo: Number(data.SaldoEfectivo || 0),
            saldoBanco: Number(data.SaldoBanco || 0),
            ingEfe: Number(data.IngresosEfectivo || 0),
            egrEfe: Number(data.EgresosEfectivo || 0),
            ingBan: Number(data.IngresosBanco || 0),
            egrBan: Number(data.EgresosBanco || 0)
        });
        await cargarFgGastosResumen();
    } catch (e) {
        console.warn("Refresco resumen finanzas:", e);
    }
};

/* =========================
   DASHBOARDS RESUMEN
========================= */

function destroyFgChart(key) {
    if (FG_STATE.charts[key]) {
        FG_STATE.charts[key].destroy();
        FG_STATE.charts[key] = null;
    }
}

function renderFgDashboards() {
    const r = window.FG_RESUMEN || {};
    const saldoEfe = Number(r.saldoEfectivo || 0);
    const saldoBan = Number(r.saldoBanco || 0);

    destroyFgChart("saldos");
    const elSaldos = document.getElementById("fgChartSaldos");
    if (elSaldos && typeof Chart !== "undefined") {
        FG_STATE.charts.saldos = new Chart(elSaldos, {
            type: "doughnut",
            data: {
                labels: ["Efectivo", "Banco"],
                datasets: [{
                    data: [Math.abs(saldoEfe), Math.abs(saldoBan)],
                    backgroundColor: ["#f59e0b", "#3b82f6"],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom", labels: { color: "#dbe4f0" } }
                }
            }
        });
    }

    destroyFgChart("flujo");
    const elFlujo = document.getElementById("fgChartFlujo");
    if (elFlujo && typeof Chart !== "undefined") {
        FG_STATE.charts.flujo = new Chart(elFlujo, {
            type: "bar",
            data: {
                labels: ["Efectivo", "Banco"],
                datasets: [
                    {
                        label: "Ingresos",
                        data: [Number(r.ingEfe || 0), Number(r.ingBan || 0)],
                        backgroundColor: "#22c55e"
                    },
                    {
                        label: "Egresos",
                        data: [Number(r.egrEfe || 0), Number(r.egrBan || 0)],
                        backgroundColor: "#ef4444"
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.05)" } },
                    y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.05)" } }
                },
                plugins: {
                    legend: { position: "bottom", labels: { color: "#dbe4f0" } }
                }
            }
        });
    }
}

async function cargarFgGastosResumen() {
    const el = document.getElementById("fgChartGastos");
    if (!el || typeof Chart === "undefined") return;

    try {
        const inicio = moment().startOf("month").format("YYYY-MM-DD");
        const hoy = moment().format("YYYY-MM-DD");
        const response = await fetch("/Gastos/ListaFiltrada", {
            method: "POST",
            headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ FechaDesde: inicio, FechaHasta: hoy })
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        const mapa = {};
        (data || []).forEach(g => {
            const cat = g.Categoria || g.NombreCategoria || "Sin categoria";
            const total = Number(g.Total ?? g.ImporteTotal ?? g.Importe ?? 0);
            mapa[cat] = (mapa[cat] || 0) + total;
        });

        const labels = Object.keys(mapa);
        const values = labels.map(k => mapa[k]);
        const colores = ["#f59e0b", "#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#14b8a6", "#eab308"];

        destroyFgChart("gastos");
        FG_STATE.charts.gastos = new Chart(el, {
            type: labels.length ? "bar" : "bar",
            data: {
                labels: labels.length ? labels : ["Sin datos"],
                datasets: [{
                    label: "Total",
                    data: labels.length ? values : [0],
                    backgroundColor: labels.map((_, i) => colores[i % colores.length])
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.05)" } },
                    y: { ticks: { color: "#94a3b8" }, grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    } catch (e) {
        console.warn("Resumen gastos:", e);
    }
}
