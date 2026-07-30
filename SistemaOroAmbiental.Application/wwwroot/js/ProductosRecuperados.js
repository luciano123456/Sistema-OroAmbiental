/* Productos recuperados - cards, filtros estandar, sin DataTables */



const REC = {

    historial: [],

    stock: []

};



let modalRecuperadoManual;



const API_REC = {

    historial: "/ProductosRecuperados/ListaHistorial",

    dashboard: "/ProductosRecuperados/Dashboard",

    stock: (idSuc, buscar) => {

        const p = new URLSearchParams();

        if (idSuc) p.set("idSucursal", idSuc);

        if (buscar) p.set("buscar", buscar);

        return `/ProductosRecuperados/StockRecuperado?${p.toString()}`;

    },

    registrar: "/ProductosRecuperados/RegistrarManual",
    eliminar: id => `/ProductosRecuperados/EliminarManual?id=${id}`,

    sucursales: "/Sucursales/Lista",

    productos: "/Productos/Lista?soloActivos=true"

};



const authHeadersRec = () => ({

    Authorization: "Bearer " + (token || ""),

    "Content-Type": "application/json"

});



function fmtQtyRec(n) {

    if (typeof formatearNumero === "function") return formatearNumero(Number(n || 0));

    return Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

}



function leerCantidadRec(val) {

    if (typeof leerInputNumerico === "function") return leerInputNumerico(val);

    const n = parseFloat(String(val || "").replace(/\./g, "").replace(",", "."));

    return isNaN(n) ? 0 : n;

}



function escapeHtmlRec(s) {

    return String(s ?? "")

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;");

}



function fmtFechaRec(d) {

    if (!d) return "-";

    const s = String(d).slice(0, 10);

    if (s.length < 10) return s;

    const [y, m, day] = s.split("-");

    return `${day}/${m}/${y}`;

}



function obtenerFiltroRec() {

    return {

        IdSucursal: parseInt($("#fSucursalRec").val(), 10) || null,

        FechaDesde: $("#fDesdeRec").val() || null,

        FechaHasta: $("#fHastaRec").val() || null,

        Texto: ($("#fTextoRec").val() || "").trim() || null

    };

}



function renderEmptyRec(cont, icon, title, sub) {

    cont.html(`

        <div class="vi-empty">

            <div class="vi-empty-icon"><i class="fa ${icon}"></i></div>

            <div class="vi-empty-title">${escapeHtmlRec(title)}</div>

            <div class="vi-empty-sub">${escapeHtmlRec(sub)}</div>

        </div>

    `);

}



$(document).ready(async () => {

    modalRecuperadoManual = new bootstrap.Modal(document.getElementById("modalRecuperadoManual"));



    const hoy = new Date();

    const hace30 = new Date(hoy);

    hace30.setDate(hace30.getDate() - 30);

    $("#fHastaRec").val(hoy.toISOString().slice(0, 10));

    $("#fDesdeRec").val(hace30.toISOString().slice(0, 10));

    $("#mFechaRec").val(hoy.toISOString().slice(0, 10));



    await cargarSucursalesRec();
    initSelectsFiltrosRec();

    await cargarProductosModalRec();



    $("#btnFiltrarRec, #btnRefreshRecuperados").on("click", aplicarFiltrosRec);

    $("#btnLimpiarRec").on("click", limpiarFiltrosRec);

    $("#btnNuevoRecuperado").on("click", abrirModalRecuperadoManual);

    $("#btnGuardarRecuperadoManual").on("click", guardarRecuperadoManual);

    $("#txtBuscarHistorialRec").on("input", () => renderHistorialRec());
    $("#fOrigenRec").on("change", () => renderHistorialRec());
    $("#fTextoRec").on("keydown", e => { if (e.key === "Enter") aplicarFiltrosRec(); });

    $("#listaHistorialRec").on("click", ".btn-eliminar-rec-manual", function () {
        const id = parseInt($(this).data("id"), 10);
        if (id > 0) eliminarRecuperadoManual(id);
    });

    await aplicarFiltrosRec();

});



async function cargarSucursalesRec() {

    const r = await fetch(API_REC.sucursales, { headers: authHeadersRec() });

    const data = r.ok ? await r.json() : [];

    const $s = $("#fSucursalRec, #mSucursalRec").empty().append(`<option value="">Todas / Seleccionar</option>`);

    (data || []).forEach(x => $s.append(`<option value="${x.Id}">${escapeHtmlRec(x.Nombre)}</option>`));

    if ($("#fSucursalRec").data("select2")) $("#fSucursalRec").select2("destroy");

    $("#fSucursalRec").select2({
        width: "100%",
        allowClear: true,
        placeholder: "Todas las sucursales",
        dropdownParent: $("#panelFiltrosRecuperados")
    });

}



function initSelectsFiltrosRec() {
    const $origen = $("#fOrigenRec");
    if ($origen.data("select2")) $origen.select2("destroy");
    $origen.select2({
        width: "100%",
        allowClear: true,
        placeholder: "Todos",
        minimumResultsForSearch: Infinity,
        dropdownParent: $("#panelFiltrosRecuperados")
    });
}



async function cargarProductosModalRec() {

    const r = await fetch(API_REC.productos, { headers: authHeadersRec() });

    const data = r.ok ? await r.json() : [];

    const $p = $("#mProductoRec").empty().append(`<option value="">Seleccionar</option>`);

    (data || []).forEach(x => $p.append(`<option value="${x.Id}">${escapeHtmlRec(x.Nombre)}</option>`));

    if ($p.data("select2")) $p.select2("destroy");

    $p.select2({ width: "100%", dropdownParent: $("#modalRecuperadoManual") });

}



function limpiarFiltrosRec() {

    const hoy = new Date();

    const hace30 = new Date(hoy);

    hace30.setDate(hace30.getDate() - 30);

    $("#fSucursalRec").val("").trigger("change");

    $("#fDesdeRec").val(hace30.toISOString().slice(0, 10));

    $("#fHastaRec").val(hoy.toISOString().slice(0, 10));

    $("#fTextoRec").val("");

    $("#fOrigenRec").val("").trigger("change");

    $("#txtBuscarHistorialRec").val("");

    aplicarFiltrosRec();

}



async function aplicarFiltrosRec() {

    await cargarTodoRec();

}



async function cargarTodoRec() {

    await Promise.all([

        cargarDashboardRec(),

        cargarStockRecuperadoCards(),

        cargarHistorialRec()

    ]);

}



async function cargarDashboardRec() {

    const filtro = obtenerFiltroRec();

    const r = await fetch(API_REC.dashboard, {

        method: "POST",

        headers: authHeadersRec(),

        body: JSON.stringify(filtro)

    });

    if (!r.ok) return;

    const d = await r.json();



    $("#kpiTotalRecuperado").text(fmtQtyRec(d.TotalRecuperadoPeriodo));

    $("#kpiMovimientosRec").text(String(d.TotalMovimientos || 0));

    $("#kpiProductosRec").text(String(d.TotalProductosDistintos || 0));



    const mas = d.MasRecuperados || [];
    const menos = d.MenosRecuperados || [];
    $("#badgeMasRec").text(String(mas.length));
    $("#badgeMenosRec").text(String(menos.length));

    renderRankingRec("#listaMasRecuperados", mas, true);
    renderRankingRec("#listaMenosRecuperados", menos, false);
}



function renderRankingRec(selector, items, highlightTop) {

    const $cont = $(selector);

    $cont.empty();

    if (!items.length) {

        renderEmptyRec($cont, "fa-bar-chart", "Sin datos en el periodo", "Ajusta las fechas o registra recuperos.");

        return;

    }

    items.forEach((x, i) => {

        const pos = i + 1;

        const topCls = highlightTop && pos <= 3 ? " pr-rk-top" : "";

        $cont.append(`

            <div class="pr-rank-item${topCls}">

                <div class="pr-rk-pos">${pos}</div>

                <div class="pr-rk-main">

                    <div class="pr-rk-name">${escapeHtmlRec(x.Producto)}</div>

                    ${x.Categoria ? `<div class="pr-rk-cat">${escapeHtmlRec(x.Categoria)}</div>` : ""}

                </div>

                <div class="pr-rk-stats">

                    <div class="pr-rk-qty">${fmtQtyRec(x.CantidadTotal)}</div>

                    <div class="pr-rk-mov">${x.CantidadMovimientos || 0} mov.</div>

                </div>

            </div>

        `);

    });

}



async function cargarStockRecuperadoCards() {

    const idSuc = parseInt($("#fSucursalRec").val(), 10) || 0;

    const texto = ($("#fTextoRec").val() || "").trim();

    const r = await fetch(API_REC.stock(idSuc || null, texto), { headers: authHeadersRec() });

    REC.stock = r.ok ? await r.json() : [];



    const totalStock = (REC.stock || []).reduce((s, x) => s + Number(x.StockRecuperado || 0), 0);

    $("#kpiStockActualRec").text(fmtQtyRec(totalStock));

    $("#badgeStockRec").text(String((REC.stock || []).length));



    const $grid = $("#stockRecuperadoGrid");

    $grid.empty();



    if (!REC.stock.length) {

        renderEmptyRec($grid, "fa-cubes", "Sin stock recuperado", "Los productos recuperados en entregas o manual apareceran aqui.");

        return;

    }



    REC.stock.forEach(x => {

        $grid.append(`

            <div class="pr-stock-card">

                <div class="pr-sc-top">

                    <div class="pr-sc-icon"><i class="fa fa-recycle"></i></div>

                    <div>

                        <div class="pr-sc-name">${escapeHtmlRec(x.Producto)}</div>

                        <div class="pr-sc-meta">

                            ${escapeHtmlRec(x.Categoria || "Sin categoria")}

                            · ${escapeHtmlRec(x.Sucursal)}

                        </div>

                    </div>

                </div>

                <div class="pr-sc-qty-lbl">Stock recuperado</div>

                <div class="pr-sc-qty">${fmtQtyRec(x.StockRecuperado)}</div>

            </div>

        `);

    });

}



async function cargarHistorialRec() {

    const filtro = obtenerFiltroRec();

    const r = await fetch(API_REC.historial, {

        method: "POST",

        headers: authHeadersRec(),

        body: JSON.stringify(filtro)

    });

    REC.historial = r.ok ? await r.json() : [];

    renderHistorialRec();

}



function renderHistorialRec() {

    const $cont = $("#listaHistorialRec");

    $cont.empty();



    const origenFiltro = ($("#fOrigenRec").val() || "").trim();

    const q = ($("#txtBuscarHistorialRec").val() || "").trim().toLowerCase();



    let list = REC.historial || [];

    if (origenFiltro) list = list.filter(x => String(x.Origen || "") === origenFiltro);

    if (q) {

        list = list.filter(x => {

            const blob = [

                x.Producto, x.Cliente, x.Concepto, x.Sucursal, x.Origen, x.Categoria, x.Medida

            ].join(" ").toLowerCase();

            return blob.includes(q);

        });

    }



    $("#badgeHistorialRec").text(String(list.length));



    if (!list.length) {

        renderEmptyRec($cont, "fa-history", "Sin recuperaciones", "No hay movimientos con los filtros actuales.");

        return;

    }



    list.forEach(x => {

        const esEntrega = String(x.Origen || "") === "Entrega";

        const badgeCls = esEntrega ? "badge-rec-entrega" : "badge-rec-manual";

        const idEntrega = Number(x.IdEntrega || 0);

        const linkEntrega = idEntrega > 0
            ? `<a class="btn btn-sm btn-outline-light" href="/ClientesEntregas/NuevoModif?id=${idEntrega}">
                    <i class="fa fa-truck"></i> Ver entrega #${idEntrega}
               </a>`
            : "";

        const btnEliminar = x.PuedeEliminar
            ? `<button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-rec-manual" data-id="${x.Id}" title="Eliminar">
                    <i class="fa fa-trash"></i>
               </button>`
            : "";

        const acciones = (linkEntrega || btnEliminar)
            ? `<div class="pr-rc-actions d-flex gap-2 flex-wrap">${linkEntrega}${btnEliminar}</div>`
            : "";

        $cont.append(`

            <div class="pr-rec-card">

                <div class="pr-rc-top">

                    <div class="pr-rc-title">${escapeHtmlRec(x.Producto)}</div>

                    <span class="pr-rc-badge ${badgeCls}">${escapeHtmlRec(x.Origen || "-")}</span>

                </div>

                <div class="pr-rc-middle">

                    <div class="pr-rc-fecha"><i class="fa fa-calendar-o me-1"></i>${fmtFechaRec(x.Fecha)}</div>

                    <div class="pr-rc-cantidad">+ ${fmtQtyRec(x.Cantidad)}</div>

                </div>

                <div class="pr-rc-meta">

                    ${x.Cliente ? `<span><i class="fa fa-user"></i>${escapeHtmlRec(x.Cliente)}</span>` : ""}

                    <span><i class="fa fa-building-o"></i>${escapeHtmlRec(x.Sucursal || "-")}</span>

                    ${x.Categoria ? `<span><i class="fa fa-tag"></i>${escapeHtmlRec(x.Categoria)}</span>` : ""}

                    ${x.Medida ? `<span><i class="fa fa-balance-scale"></i>${escapeHtmlRec(x.Medida)}</span>` : ""}

                </div>

                ${x.Concepto ? `<div class="pr-rc-concepto">${escapeHtmlRec(x.Concepto)}</div>` : ""}

                ${acciones}
            </div>
        `);
    });
}

async function eliminarRecuperadoManual(id) {
    const ok = typeof confirmarModal === "function"
        ? await confirmarModal("¿Eliminar este recupero manual? Se descontara del stock recuperado.")
        : confirm("¿Eliminar este recupero manual?");
    if (!ok) return;

    const r = await fetch(API_REC.eliminar(id), {
        method: "DELETE",
        headers: authHeadersRec()
    });
    const result = await r.json();

    if (result.valor === true || result.valor === "true") {
        if (typeof exitoModal === "function") exitoModal(result.mensaje || "Eliminado.");
        await cargarTodoRec();
    } else if (typeof errorModal === "function") {
        errorModal(result.mensaje || "No se pudo eliminar.");
    }
}



function abrirModalRecuperadoManual() {

    const idSuc = parseInt($("#fSucursalRec").val(), 10) || 0;

    if (idSuc > 0) $("#mSucursalRec").val(String(idSuc));

    $("#mCantidadRec").val("");

    $("#mConceptoRec").val("");

    modalRecuperadoManual.show();

}



async function guardarRecuperadoManual() {

    const payload = {

        IdSucursal: parseInt($("#mSucursalRec").val(), 10) || 0,

        IdProducto: parseInt($("#mProductoRec").val(), 10) || 0,

        Cantidad: leerCantidadRec($("#mCantidadRec").val()),

        Fecha: $("#mFechaRec").val() || null,

        Concepto: ($("#mConceptoRec").val() || "").trim() || null

    };



    const r = await fetch(API_REC.registrar, {

        method: "POST",

        headers: authHeadersRec(),

        body: JSON.stringify(payload)

    });

    const result = await r.json();

    if (result.valor === true || result.valor === "true") {

        modalRecuperadoManual.hide();

        if (typeof exitoModal === "function") exitoModal(result.mensaje || "Guardado.");

        await cargarTodoRec();

    } else if (typeof errorModal === "function") {

        errorModal(result.mensaje || "No se pudo guardar.");

    }

}


