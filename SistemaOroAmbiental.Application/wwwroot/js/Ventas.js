/* ==========================================
   VENTAS INDEX PRO — FIX SALDOS + FILTROS
========================================== */

let VI = {
    clientes: [],
    clientesOriginal: [],
    ventas: [],
    ventasOriginal: [],
    clienteSel: null,

    // mapa de saldos por cliente (calculado desde ventas)
    saldoPorCliente: new Map(),

    combos: {
        productoras: [],
        estados: [],
        artistas: []
    }
};

const API = {
    clientes: "/Clientes/Lista",
    ventas: "/Ventas/Lista",
    ventasPorCliente: id => `/Ventas/ListaPorCliente?idCliente=${id}`,

    productoras: "/Productoras/Lista",
    estados: "/VentasEstados/Lista",
    artistas: "/Artistas/Lista"
};

const authHeaders = () => ({
    'Authorization': 'Bearer ' + token
});

$(document).ready(async () => {


    Permisos.init();
    Permisos.aplicarUI("Ventas");


    // eventos
    $("#btnRefresh").on("click", cargarTodo);

    $("#btnNuevaVenta").on("click", () => {

        if (!Permisos.tiene("Ventas", "Crear")) {
            errorModal("No tenés permisos.");
            return;
        }

        window.location = "/Ventas/NuevoModif";
    });

    $("#txtBuscarCliente").on("input", aplicarFiltrosClientes);
    $("#txtBuscarVenta").on("input", renderVentas);

    $("#fClienteSaldo").on("change", aplicarFiltrosClientes);
    $("#fClienteProductora").on("change", aplicarFiltrosClientes);

    // INIT combos + select2
    await inicializarCombos();

    // LOAD principal
    await cargarTodo();

    // Fix collapse estado chevron + width select2 dentro del collapse
    wireFiltrosVentasUX();
});

/* =========================
   COMBOS
========================= */

async function inicializarCombos() {
    await Promise.all([
        cargarProductoras(),
        cargarEstados(),
        cargarArtistas()
    ]);

    inicializarSelect2();
}

async function cargarProductoras() {
    const r = await fetch(API.productoras, { headers: authHeaders() });
    VI.combos.productoras = await r.json();

    const cmb = $("#fClienteProductora");
    cmb.empty();
    cmb.append(`<option value="">Todas</option>`);

    (VI.combos.productoras || []).forEach(p => {
        cmb.append(`<option value="${p.Id}">${p.Nombre}</option>`);
    });
}

async function cargarEstados() {
    const r = await fetch(API.estados, { headers: authHeaders() });
    VI.combos.estados = await r.json();

    const cmb = $("#fEstado");
    cmb.empty();
    cmb.append(`<option value="">Todos</option>`);

    (VI.combos.estados || []).forEach(e => {
        cmb.append(`<option value="${e.Id}">${e.Nombre}</option>`);
    });
}

async function cargarArtistas() {
    const r = await fetch(API.artistas, { headers: authHeaders() });
    VI.combos.artistas = await r.json();

    const cmb = $("#fArtista");
    cmb.empty();
    cmb.append(`<option value="">Todos</option>`);

    (VI.combos.artistas || []).forEach(a => {
        cmb.append(`<option value="${a.Id}">${a.Nombre}</option>`);
    });
}

/* =========================
   SELECT2 (FIX DROPDOWN)
========================= */

function inicializarSelect2() {

    // Productora: vive en panel izquierdo
    $("#fClienteProductora").select2({
        width: "100%",
        dropdownParent: $(".vi-left"),     // CLAVE: evita que se vaya a la mierda
        minimumResultsForSearch: 0
    });

    // Estado/Artista: viven dentro del collapse
    // dropdownParent al panel evita overflow/width raros
    $("#fEstado").select2({
        width: "100%",
        dropdownParent: $("#panelFiltrosVentas"),
        minimumResultsForSearch: 0
    });

    $("#fArtista").select2({
        width: "100%",
        dropdownParent: $("#panelFiltrosVentas"),
        minimumResultsForSearch: 0
    });

    // cuando abrís el collapse, recalcular select2 (si no, quedan mal)
    $('#panelFiltrosVentas').on('shown.bs.collapse', function () {
        try {
            $("#fEstado").select2("close");
            $("#fArtista").select2("close");
        } catch { }
    });
}

/* =========================
   LOAD
========================= */

async function cargarTodo() {

    // cargamos ventas primero o en paralelo; pero el saldo se calcula con ventas
    await Promise.all([
        cargarClientes(),
        cargarVentas()
    ]);

    // 1) calcular saldos por cliente con ventas
    calcularSaldoClientesDesdeVentas();

    // 2) aplicar filtros actuales (productora/saldo/busqueda)
    aplicarFiltrosClientes();

    // 3) actualizar KPIs (según VI.ventas actual)
    actualizarKpis();
}

async function cargarClientes() {
    const r = await fetch(API.clientes, { headers: authHeaders() });
    VI.clientesOriginal = await r.json();
    VI.clientes = [...VI.clientesOriginal];

    VI.clientesOriginal.forEach(c => {
        c.__productorasSet = new Set(getProductorasFromCliente(c));
    });

    $("#kpiClientes").text(VI.clientesOriginal.length);
}

async function cargarVentas() {
    const r = await fetch(API.ventas, { headers: authHeaders() });
    VI.ventasOriginal = await r.json();

    // por default: si no hay cliente seleccionado, muestro todo
    if (!VI.clienteSel) {
        VI.ventas = [...VI.ventasOriginal];
    }

    renderVentas();
}

/* =========================
   SALDOS (LA CLAVE)
========================= */

function getIdClienteFromVenta(v) {
    // soportar nombres posibles
    return v?.IdCliente ?? v?.idCliente ?? v?.ClienteId ?? v?.IDCLIENTE ?? null;
}

function calcularSaldoClientesDesdeVentas() {

    const map = new Map();

    (VI.ventasOriginal || []).forEach(v => {
        const idCliente = getIdClienteFromVenta(v);
        if (!idCliente) return;

        const saldo = Number(v?.Saldo ?? v?.saldo ?? 0) || 0;
        map.set(idCliente, (map.get(idCliente) || 0) + saldo);
    });

    VI.saldoPorCliente = map;

    // inyectar un campo calculado en clientes (para que tu render lo use)
    (VI.clientesOriginal || []).forEach(c => {
        const id = c?.Id ?? c?.id ?? null;
        c.__SaldoCalc = id ? (VI.saldoPorCliente.get(id) || 0) : 0;
    });
}

/* =========================
   PRODUCTORA (robusto)
========================= */

function getProductorasFromCliente(c) {

    if (!c) return [];

    // Caso ideal
    if (Array.isArray(c.ProductorasIds)) {
        return c.ProductorasIds;
    }

    const id =
        c.IdProductora ??
        c.idProductora ??
        c.IdProductoraCliente ??
        c.ProductoraId ??
        null;

    return id ? [id] : [];
}
/* =========================
   CLIENTES
========================= */

function aplicarFiltrosClientes() {

    const cont = $("#clientesList");
    cont.html("");

    const q = ($("#txtBuscarCliente").val() || "").trim().toLowerCase();
    const idProductora = $("#fClienteProductora").val() || "";
    const soloSaldo = $("#fClienteSaldo").is(":checked");

    let lista = [...(VI.clientesOriginal || [])];

    if (idProductora) {

        const id = Number(idProductora);

        lista = lista.filter(c => {

            const prods = getProductorasFromCliente(c);

            if (!prods.length) return false;

            const set = new Set(prods);

            return set.has(id);

        });
    }

    // filtro “solo con saldo”: usa saldo calculado (no c.Saldo)
    if (soloSaldo) {
        lista = lista.filter(c => Number(c.__SaldoCalc || 0) > 0);
    }

    // filtro búsqueda
    if (q) {
        lista = lista.filter(c => (c.Nombre || "").toLowerCase().includes(q));
    }

    VI.clientes = lista;

    // render
    VI.clientes.forEach(c => {

        const active = (VI.clienteSel?.Id === c.Id) ? "active" : "";
        const inicial = (c.Nombre || "?").trim().charAt(0).toUpperCase();

        cont.append(`
<div class="vi-item ${active}" onclick="seleccionarCliente(${c.Id})">

    <div class="vi-avatar">
        ${inicial}
    </div>

    <div class="vi-cli">

        <div class="vi-name">
            ${c.Nombre || ""}
        </div>

        <div class="vi-cc">

            <div class="vi-cc-row">
                <span class="vi-cc-label">Saldo</span>
                <span class="vi-cc-val saldo ${c.__SaldoCalc > 0 ? "deuda" : "ok"}">
                    ${fmtMoney(c.__SaldoCalc || 0)}
                </span>
            </div>

        </div>

    </div>

</div>
`);
    });

    // KPI: podés decidir si querés mostrar total original o filtrado.
    // Yo dejo el KPI como total original (como lo tenías).
    $("#kpiClientes").text(VI.clientesOriginal.length);

    // si “solo saldo” está activo y hay cliente seleccionado sin saldo, lo deselecciono
    if (VI.clienteSel && soloSaldo) {
        const sel = VI.clientes.find(x => x.Id === VI.clienteSel.Id);
        if (!sel) {
            VI.clienteSel = null;
            $("#lblFiltroCliente").text("Todos los clientes");
            VI.ventas = [...VI.ventasOriginal];
            renderVentas();
            actualizarKpis();
        }
    }
}

async function seleccionarCliente(id) {

    // toggle OFF
    if (VI.clienteSel && VI.clienteSel.Id === id) {
        VI.clienteSel = null;
        $("#lblFiltroCliente").text("Todos los clientes");
        VI.ventas = [...VI.ventasOriginal];

        aplicarFiltrosClientes();
        renderVentas();
        actualizarKpis();
        return;
    }

    VI.clienteSel = (VI.clientesOriginal || []).find(x => x.Id === id) || null;
    $("#lblFiltroCliente").text(VI.clienteSel ? VI.clienteSel.Nombre : "Todos los clientes");

    // si tenés endpoint por cliente, ok
    const r = await fetch(API.ventasPorCliente(id), { headers: authHeaders() });
    VI.ventas = await r.json();

    renderVentas();
    actualizarKpis();

    // re-aplicar filtros de clientes para marcar active
    aplicarFiltrosClientes();
}

/* =========================
   VENTAS
========================= */
function renderVentas() {

    const cont = $("#ventasList");
    cont.html("");

    const q = ($("#txtBuscarVenta").val() || "").trim().toLowerCase();

    const list = (VI.ventas || []).filter(v => {
        if (!q) return true;
        return ((v.NombreEvento || "").toLowerCase().includes(q));
    });

    if (!list.length) {

        cont.html(`
        <div class="vi-empty">
            <div class="vi-empty-icon"><i class="fa fa-ticket"></i></div>
            <div class="vi-empty-title">No hay ventas</div>
            <div class="vi-empty-sub">Cuando registres una venta aparecerá aquí.</div>
        </div>
        `);

        return;
    }

    list.forEach(v => {

        const total = Number(v.ImporteTotal || 0);
        const abonado = Number(v.ImporteAbonado || 0);
        const saldo = Number(v.Saldo || 0);

        /* ======================
           PROGRESO
        ====================== */

        const progreso = total > 0
            ? Math.min(100, (abonado / total) * 100)
            : 0;

        let progresoClass = "p0";

        if (progreso > 90) progresoClass = "p100";
        else if (progreso > 60) progresoClass = "p80";
        else if (progreso > 25) progresoClass = "p40";

        /* ======================
           SALDO COLOR
        ====================== */

        const saldoClass =
            saldo > 0 ? "deuda" :
                saldo < 0 ? "favor" :
                    "neutral";

        /* ======================
           RENDER
        ====================== */

        cont.append(`

<div class="vi-sale" onclick="abrirVenta(${v.Id})">

    <div class="vi-sale-top">

        <div class="vi-sale-title">
            #${v.Id} • ${v.NombreEvento || ""}
        </div>

        <div class="vi-estado ${estadoClass(v.Estado)}">
            ${v.Estado || ""}
        </div>

    </div>

    <div class="vi-sale-middle">

        <div class="vi-sale-fecha">
            ${fmtDate(v.Fecha)}
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
            ${fmtMoney(abonado)} cobrado
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
   FILTROS VENTAS (panel derecho)
========================= */

async function aplicarFiltrosVentas() {

    const filtros = {
        fechaDesde: $("#fFechaDesde").val() || null,
        fechaHasta: $("#fFechaHasta").val() || null,
        idEstado: $("#fEstado").val() || null,
        idArtista: $("#fArtista").val() || null,
        idCliente: VI.clienteSel ? VI.clienteSel.Id : null
    };

    const r = await fetch("/Ventas/ListaFiltrada", {
        method: "POST",
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(filtros)
    });

    VI.ventas = await r.json();

    // actualizar saldos calculados por cliente porque cambió la data base visible?
    // OJO: “solo saldo” lo querés por saldo real total (ventasOriginal), no por filtros.
    // Así que NO recalculo desde VI.ventas acá.

    renderVentas();
    actualizarKpis();
    actualizarEstadoFiltrosVentas();
}

function limpiarFiltrosVentas() {
    $("#fFechaDesde").val("");
    $("#fFechaHasta").val("");
    $("#fEstado").val("").trigger("change");
    $("#fArtista").val("").trigger("change");
    $("#txtFiltrosEstadoVentas").text("");

    // volver data según cliente seleccionado
    if (VI.clienteSel) {
        // recargar ventas por cliente sin filtros
        seleccionarCliente(VI.clienteSel.Id);
    } else {
        VI.ventas = [...VI.ventasOriginal];
        renderVentas();
        actualizarKpis();
    }
}

function actualizarEstadoFiltrosVentas() {
    let count = 0;
    if ($("#fFechaDesde").val()) count++;
    if ($("#fFechaHasta").val()) count++;
    if ($("#fEstado").val()) count++;
    if ($("#fArtista").val()) count++;

    $("#txtFiltrosEstadoVentas").text(count ? `${count} filtros activos` : "");
}

/* =========================
   KPIS
========================= */

function actualizarKpis() {
    let total = 0, abon = 0, saldo = 0;

    (VI.ventas || []).forEach(v => {
        total += Number(v.ImporteTotal || 0);
        abon += Number(v.ImporteAbonado || 0);
        saldo += Number(v.Saldo || 0);
    });

    $("#kpiVentas").text((VI.ventas || []).length);
    $("#kpiTotal").text(fmtMoney(total));
    $("#kpiAbonado").text(fmtMoney(abon));
    $("#kpiSaldo").text(fmtMoney(saldo));
}

/* =========================
   UX — collapse chevron (igual feeling Gastos)
========================= */

function wireFiltrosVentasUX() {
    const panel = document.getElementById("panelFiltrosVentas");
    const head = document.querySelector('.rp-filtros-head[data-bs-target="#panelFiltrosVentas"]');
    if (!panel || !head) return;

    panel.addEventListener("shown.bs.collapse", () => head.classList.add("open"));
    panel.addEventListener("hidden.bs.collapse", () => head.classList.remove("open"));
}

/* =========================
   HELPERS
========================= */

function abrirVenta(id) {
    //if (!Permisos.tiene("Ventas", "Editar")) {
    //    return;
    //}
    window.location = `/Ventas/NuevoModif?id=${id}`;
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

function estadoClass(nombre) {
    if (!nombre) return "vi-estado-default";
    const n = nombre.toLowerCase();
    if (n.includes("final")) return "vi-estado-finalizada";
    if (n.includes("cancel")) return "vi-estado-cancelada";
    if (n.includes("reprog")) return "vi-estado-pendiente";
    if (n.includes("deud")) return "vi-estado-pendiente";
    return "vi-estado-default";
}


function calcularCuentaClientes() {

    const map = {};

    VI.ventasOriginal.forEach(v => {

        const id = v.IdCliente;

        if (!map[id]) {
            map[id] = {
                total: 0,
                abonado: 0,
                saldo: 0
            };
        }

        map[id].total += Number(v.ImporteTotal || 0);
        map[id].abonado += Number(v.ImporteAbonado || 0);
    });

    Object.keys(map).forEach(k => {
        map[k].saldo = map[k].total - map[k].abonado;
    });

    VI.clientesOriginal.forEach(c => {

        const cc = map[c.Id] || {
            total: 0,
            abonado: 0,
            saldo: 0
        };

        c.TotalVentas = cc.total;
        c.TotalAbonado = cc.abonado;
        c.Saldo = cc.saldo;

    });

}