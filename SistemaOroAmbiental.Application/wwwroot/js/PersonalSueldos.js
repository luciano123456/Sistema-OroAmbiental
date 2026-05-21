/* ==========================================
   SUELDOS INDEX PRO — PERSONAL + SUELDOS
========================================== */

let SI = {
    personal: [],
    personalOriginal: [],

    sueldos: [],
    sueldosOriginal: [],

    personalSel: null,

    saldoPorPersonal: new Map(),

    combos: {
        monedas: []
    }
};

const API = {
    personal: "/PersonalSueldos/ListaPersonal",
    sueldos: "/PersonalSueldos/Lista",
    sueldosPorPersonal: id => `/PersonalSueldos/ListaPorPersonal?idPersonal=${id}`,
    listaFiltrada: "/PersonalSueldos/ListaFiltrada",
    monedas: "/PaisesMoneda/Lista"
};

const authHeaders = () => ({
    'Authorization': 'Bearer ' + token
});

$(document).ready(async () => {

    Permisos.init();
    Permisos.aplicarUI("Personal Sueldos");

    $("#btnRefresh").on("click", cargarTodo);

    $("#btnNuevoSueldo").on("click", () => {
        if (SI.personalSel) {
            window.location = `/PersonalSueldos/NuevoModif?idPersonal=${SI.personalSel.Id}`;
            return;
        }
        window.location = "/PersonalSueldos/NuevoModif";
    });

    $("#btnExportPdf").on("click", exportarSueldosPdf);

    $("#txtBuscarPersonal").on("input", aplicarFiltrosPersonal);
    $("#txtBuscarSueldo").on("input", renderSueldos);

    $("#fPersonalSaldo").on("change", aplicarFiltrosPersonal);

    await inicializarCombos();
    await cargarTodo();

    wireFiltrosSueldosUX();
});

/* =========================
   COMBOS
========================= */

async function inicializarCombos() {
    await cargarMonedas();
    inicializarSelect2();
}

async function cargarMonedas() {
    const r = await fetch(API.monedas, { headers: authHeaders() });
    SI.combos.monedas = await r.json();

    const cmb = $("#fMoneda");
    cmb.empty();
    cmb.append(`<option value="">Todas</option>`);

    (SI.combos.monedas || []).forEach(m => {
        cmb.append(`<option value="${m.Id}">${m.Nombre}</option>`);
    });
}

/* =========================
   SELECT2
========================= */

function inicializarSelect2() {

    $("#fMoneda").select2({
        width: "100%",
        dropdownParent: $("#panelFiltrosSueldos"),
        minimumResultsForSearch: 0
    });

    $("#fEstado").select2({
        width: "100%",
        dropdownParent: $("#panelFiltrosSueldos"),
        minimumResultsForSearch: 0
    });

    $('#panelFiltrosSueldos').on('shown.bs.collapse', function () {
        try {
            $("#fMoneda").select2("close");
            $("#fEstado").select2("close");
        } catch { }
    });
}

/* =========================
   LOAD
========================= */

async function cargarTodo() {
    await Promise.all([
        cargarPersonal(),
        cargarSueldos()
    ]);

    calcularSaldoPersonalDesdeSueldos();
    aplicarFiltrosPersonal();
    actualizarKpis();
}

async function cargarPersonal() {
    const r = await fetch(API.personal, { headers: authHeaders() });
    SI.personalOriginal = await r.json();
    SI.personal = [...SI.personalOriginal];

    $("#kpiPersonal").text(SI.personalOriginal.length);
}

async function cargarSueldos() {
    const r = await fetch(API.sueldos, { headers: authHeaders() });
    SI.sueldosOriginal = await r.json();

    if (!SI.personalSel) {
        SI.sueldos = [...SI.sueldosOriginal];
    }

    normalizarSueldos(SI.sueldosOriginal);
    normalizarSueldos(SI.sueldos);

    renderSueldos();
}

/* =========================
   NORMALIZAR / SALDOS
========================= */

function normalizarSueldos(lista) {
    (lista || []).forEach(s => {
        const total = Number(s.ImporteTotal || 0);
        const pagado = Number(s.ImportePagado || 0);
        const saldo = Math.max(0, total - pagado);

        s.ImportePagado = pagado;
        s.Saldo = saldo;
        s.Estado = estadoPagoCalc(total, pagado);
    });
}

function estadoPagoCalc(total, pagado) {
    if (pagado <= 0) return "PENDIENTE";
    if (pagado >= total && total > 0) return "PAGADO";
    return "PARCIAL";
}

function calcularSaldoPersonalDesdeSueldos() {
    const map = new Map();

    (SI.sueldosOriginal || []).forEach(s => {
        const idPersonal = Number(s.IdPersonal || 0);
        if (!idPersonal) return;

        const saldo = Number(s.Saldo || 0) || 0;
        map.set(idPersonal, (map.get(idPersonal) || 0) + saldo);
    });

    SI.saldoPorPersonal = map;

    (SI.personalOriginal || []).forEach(p => {
        const id = p?.Id ?? null;
        p.__SaldoCalc = id ? (SI.saldoPorPersonal.get(id) || 0) : 0;
    });
}

/* =========================
   PERSONAL
========================= */

function aplicarFiltrosPersonal() {
    const cont = $("#personalList");
    cont.html("");

    const q = ($("#txtBuscarPersonal").val() || "").trim().toLowerCase();
    const soloSaldo = $("#fPersonalSaldo").is(":checked");

    let lista = [...(SI.personalOriginal || [])];

    if (soloSaldo) {
        lista = lista.filter(p => Number(p.__SaldoCalc || 0) > 0);
    }

    if (q) {
        lista = lista.filter(p => (p.Nombre || "").toLowerCase().includes(q));
    }

    SI.personal = lista;

    SI.personal.forEach(p => {
        const active = (SI.personalSel?.Id === p.Id) ? "active" : "";
        const inicial = (p.Nombre || "?").trim().charAt(0).toUpperCase();

        cont.append(`
<div class="vi-item ${active}" onclick="seleccionarPersonal(${p.Id})">

    <div class="vi-avatar">
        ${inicial}
    </div>

    <div class="vi-cli">

        <div class="vi-name">
            ${p.Nombre || ""}
        </div>

        <div class="vi-cc">

            <div class="vi-cc-row">
                <span class="vi-cc-label">Saldo</span>
                <span class="vi-cc-val saldo ${Number(p.__SaldoCalc || 0) > 0 ? "deuda" : "ok"}">
                    ${fmtMoney(p.__SaldoCalc || 0)}
                </span>
            </div>

        </div>

    </div>

</div>
        `);
    });

    $("#kpiPersonal").text(SI.personalOriginal.length);

    if (SI.personalSel && soloSaldo) {
        const sel = SI.personal.find(x => x.Id === SI.personalSel.Id);
        if (!sel) {
            SI.personalSel = null;
            $("#lblFiltroPersonal").text("Todo el personal");
            SI.sueldos = [...SI.sueldosOriginal];
            normalizarSueldos(SI.sueldos);
            renderSueldos();
            actualizarKpis();
        }
    }
}

async function seleccionarPersonal(id, mantenerSeleccion = false) {

    if (!mantenerSeleccion && SI.personalSel && SI.personalSel.Id === id) {
        SI.personalSel = null;
        $("#lblFiltroPersonal").text("Todo el personal");
        SI.sueldos = [...SI.sueldosOriginal];

        normalizarSueldos(SI.sueldos);
        aplicarFiltrosPersonal();
        renderSueldos();
        actualizarKpis();
        return;
    }

    SI.personalSel = (SI.personalOriginal || []).find(x => x.Id === id) || null;
    $("#lblFiltroPersonal").text(SI.personalSel ? SI.personalSel.Nombre : "Todo el personal");

    const r = await fetch(API.sueldosPorPersonal(id), { headers: authHeaders() });
    SI.sueldos = await r.json();

    normalizarSueldos(SI.sueldos);
    renderSueldos();
    actualizarKpis();

    aplicarFiltrosPersonal();
}

/* =========================
   SUELDOS
========================= */

function renderSueldos() {
    const cont = $("#sueldosList");
    cont.html("");

    const q = ($("#txtBuscarSueldo").val() || "").trim().toLowerCase();

    const list = (SI.sueldos || []).filter(s => {
        if (!q) return true;

        return (
            (s.Concepto || "").toLowerCase().includes(q) ||
            (s.Personal || "").toLowerCase().includes(q) ||
            (s.Moneda || "").toLowerCase().includes(q)
        );
    });

    if (!list.length) {
        cont.html(`
        <div class="vi-empty">
            <div class="vi-empty-icon"><i class="fa fa-money"></i></div>
            <div class="vi-empty-title">No hay sueldos</div>
            <div class="vi-empty-sub">Cuando registres un sueldo aparecerá aquí.</div>
        </div>
        `);
        return;
    }

    list.forEach(s => {
        const total = Number(s.ImporteTotal || 0);
        const pagado = Number(s.ImportePagado || 0);
        const saldo = Number(s.Saldo || 0);

        const progreso = total > 0
            ? Math.min(100, (pagado / total) * 100)
            : 0;

        let progresoClass = "p0";
        if (progreso > 90) progresoClass = "p100";
        else if (progreso > 60) progresoClass = "p80";
        else if (progreso > 25) progresoClass = "p40";

        const saldoClass =
            saldo > 0 ? "deuda" :
                saldo < 0 ? "favor" :
                    "neutral";

        cont.append(`
<div class="vi-sale" onclick="abrirSueldo(${s.Id})">

    <div class="vi-sale-top">

        <div class="vi-sale-title">
            #${s.Id} • ${s.Concepto || ""}
        </div>

        <div class="vi-estado ${estadoClassSueldo(s.Estado)}">
            ${estadoTextoSueldo(s.Estado)}
        </div>

    </div>

    <div class="vi-sale-middle">

        <div class="vi-sale-fecha">
            ${fmtDate(s.Fecha)}
        </div>

        <div class="vi-importes">

            <div class="vi-total">
                ${fmtMoney(total)}
            </div>

            <div class="vi-saldo ${saldoClass}">
                ${fmtMoney(saldo)}
            </div>

        </div>

    </div>

    <div class="vi-progress">

        <div class="vi-progress-bar ${progresoClass}" style="width:${progreso}%"></div>

        <span class="vi-progress-label">
            ${Math.round(progreso)}%
        </span>

    </div>

    <div class="vi-progress-meta">

        <span>
            ${fmtMoney(pagado)} pagado
        </span>

        <span>
            ${fmtMoney(total)}
        </span>

    </div>

</div>
        `);
    });
}

/* =========================
   FILTROS SUELDOS
========================= */

async function aplicarFiltrosSueldos() {

    const filtros = {
        fechaDesde: $("#fFechaDesde").val() || null,
        fechaHasta: $("#fFechaHasta").val() || null,
        idPersonal: SI.personalSel ? SI.personalSel.Id : null,
        idMoneda: $("#fMoneda").val() || null,
        estado: $("#fEstado").val() || null
    };

    const r = await fetch(API.listaFiltrada, {
        method: "POST",
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(filtros)
    });

    SI.sueldos = await r.json();
    normalizarSueldos(SI.sueldos);

    renderSueldos();
    actualizarKpis();
    actualizarEstadoFiltrosSueldos();
}

function limpiarFiltrosSueldos() {
    $("#fFechaDesde").val("");
    $("#fFechaHasta").val("");
    $("#fMoneda").val("").trigger("change");
    $("#fEstado").val("").trigger("change");
    $("#txtFiltrosEstadoSueldos").text("");

    if (SI.personalSel) {
        seleccionarPersonal(SI.personalSel.Id, true);
    } else {
        SI.sueldos = [...SI.sueldosOriginal];
        normalizarSueldos(SI.sueldos);
        renderSueldos();
        actualizarKpis();
    }
}

function actualizarEstadoFiltrosSueldos() {
    let count = 0;
    if ($("#fFechaDesde").val()) count++;
    if ($("#fFechaHasta").val()) count++;
    if ($("#fMoneda").val()) count++;
    if ($("#fEstado").val()) count++;
}

/* =========================
   KPIS
========================= */

function actualizarKpis() {
    let total = 0, pagado = 0, saldo = 0;

    (SI.sueldos || []).forEach(s => {
        total += Number(s.ImporteTotal || 0);
        pagado += Number(s.ImportePagado || 0);
        saldo += Number(s.Saldo || 0);
    });

    $("#kpiSueldos").text((SI.sueldos || []).length);
    $("#kpiTotal").text(fmtMoney(total));
    $("#kpiPagado").text(fmtMoney(pagado));
    $("#kpiSaldo").text(fmtMoney(saldo));
}

/* =========================
   PDF
========================= */

function exportarSueldosPdf() {

    if (!Permisos.tiene("Personal Sueldos", "Exportar")) {
        errorModal("No tenés permisos.");
        return;
    }

    const lista = (SI.sueldos || []).map(s => ([
        `#${s.Id}`,
        fmtDate(s.Fecha),
        s.Personal || "",
        s.Concepto || "",
        fmtMoney(s.ImporteTotal || 0),
        fmtMoney(s.ImportePagado || 0),
        fmtMoney(s.Saldo || 0),
        estadoTextoSueldo(s.Estado)
    ]));

    const total = (SI.sueldos || []).reduce((a, s) => a + Number(s.ImporteTotal || 0), 0);
    const pagado = (SI.sueldos || []).reduce((a, s) => a + Number(s.ImportePagado || 0), 0);
    const saldo = (SI.sueldos || []).reduce((a, s) => a + Number(s.Saldo || 0), 0);

    const tituloPersonal = SI.personalSel ? `Personal: ${SI.personalSel.Nombre}` : "Todo el personal";

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [30, 30, 30, 30],
        content: [
            {
                text: 'Reporte de Sueldos',
                style: 'header'
            },
            {
                text: `${tituloPersonal}\nFecha de emisión: ${moment().format("DD/MM/YYYY HH:mm")}`,
                margin: [0, 0, 0, 12]
            },
            {
                columns: [
                    { text: `Sueldos: ${(SI.sueldos || []).length}`, style: 'kpi' },
                    { text: `Total: ${fmtMoney(total)}`, style: 'kpi' },
                    { text: `Pagado: ${fmtMoney(pagado)}`, style: 'kpi' },
                    { text: `Saldo: ${fmtMoney(saldo)}`, style: 'kpi' }
                ],
                columnGap: 10,
                margin: [0, 0, 0, 14]
            },
            {
                table: {
                    headerRows: 1,
                    widths: [40, 55, '*', '*', 70, 70, 70, 60],
                    body: [
                        [
                            { text: 'ID', style: 'th' },
                            { text: 'Fecha', style: 'th' },
                            { text: 'Personal', style: 'th' },
                            { text: 'Concepto', style: 'th' },
                            { text: 'Total', style: 'th' },
                            { text: 'Pagado', style: 'th' },
                            { text: 'Saldo', style: 'th' },
                            { text: 'Estado', style: 'th' }
                        ],
                        ...lista
                    ]
                },
                layout: {
                    fillColor: function (rowIndex) {
                        return rowIndex === 0 ? '#1d3557' : (rowIndex % 2 === 0 ? '#f5f7fb' : null);
                    },
                    hLineColor: function () { return '#d9e2ec'; },
                    vLineColor: function () { return '#d9e2ec'; }
                }
            }
        ],
        styles: {
            header: {
                fontSize: 18,
                bold: true,
                color: '#1d3557',
                margin: [0, 0, 0, 10]
            },
            kpi: {
                fontSize: 10,
                bold: true,
                margin: [0, 4, 0, 4]
            },
            th: {
                bold: true,
                color: 'white',
                fontSize: 9
            }
        },
        defaultStyle: {
            fontSize: 9
        }
    };

    pdfMake.createPdf(docDefinition).download(`Sueldos_${moment().format("YYYYMMDD_HHmmss")}.pdf`);
}

/* =========================
   UX
========================= */

function wireFiltrosSueldosUX() {
    const panel = document.getElementById("panelFiltrosSueldos");
    const head = document.querySelector('.rp-filtros-head[data-bs-target="#panelFiltrosSueldos"]');
    if (!panel || !head) return;

    panel.addEventListener("shown.bs.collapse", () => head.classList.add("open"));
    panel.addEventListener("hidden.bs.collapse", () => head.classList.remove("open"));
}

/* =========================
   HELPERS
========================= */

function abrirSueldo(id) {
    window.location = `/PersonalSueldos/NuevoModif?id=${id}`;
}

function fmtMoney(n) {
    return Number(n || 0).toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0
    });
}

function fmtDate(d) {
    try { return new Date(d).toLocaleDateString("es-AR"); }
    catch { return ""; }
}

function estadoClassSueldo(nombre) {
    if (!nombre) return "vi-estado-default";
    const n = nombre.toLowerCase();

    if (n.includes("pag")) return "vi-estado-finalizada";
    if (n.includes("par")) return "vi-estado-pendiente";
    if (n.includes("pend")) return "vi-estado-cancelada";

    return "vi-estado-default";
}

function estadoTextoSueldo(nombre) {
    if (!nombre) return "Pendiente";
    const n = nombre.toUpperCase();

    if (n === "PAGADO") return "Pagado";
    if (n === "PARCIAL") return "Parcial";
    if (n === "PENDIENTE") return "Pendiente";

    return nombre;
}