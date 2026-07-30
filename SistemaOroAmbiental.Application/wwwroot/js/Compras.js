/* =========================================================
   COMPRAS.JS  Listado (Sistema Oro Ambiental)
========================================================= */

let gridCompras;
let proveedoresCompras = [];
let sucursalesCompras = [];

const API = {
    lista: "/Compras/ListaFiltrada",
    editarInfo: id => `/Compras/EditarInfo?id=${id}`,
    eliminar: id => `/Compras/Eliminar?id=${id}`,
    nuevoModif: (id, idProveedor) => {
        let url = `/Compras/NuevoModif?id=${id || 0}`;
        if (idProveedor) url += `&idProveedor=${idProveedor}`;
        return url;
    },
    proveedores: "/Proveedores/Lista",
    sucursales: "/Sucursales/Lista"
};

const authHeaders = () => ({
    Authorization: "Bearer " + token,
    "Content-Type": "application/json"
});

const columnConfigCompras = [
    { index: 2, filterType: "text" },
    { index: 3, filterType: "text" },
    { index: 4, filterType: "text" },
    { index: 5, filterType: "text" },
    { index: 6, filterType: "text" },
    { index: 7, filterType: "text" },
    { index: 8, filterType: "text" },
    { index: 9, filterType: "text" },
    { index: 10, filterType: "text" },
    { index: 11, filterType: "text" },
    { index: 12, filterType: "text" }
];

registrarFiltrosGrilla('grd_Compras', columnConfigCompras, {
    includeActivo: false,
    panelTitle: 'Filtrar resultados cargados'
});

$(document).ready(async () => {
    if (typeof initPanelFiltrosPersistido === "function") {
        initPanelFiltrosPersistido("panelFiltrosComprasWrap", "panelFiltrosCompras");
    }

    wireEventosCompras();
    inicializarFechasCompras();
    await cargarCombosCompras();
    await cargarCompras();
});

function wireEventosCompras() {
    $("#btnNuevaCompra").on("click", () => {
        window.location.href = API.nuevoModif(0);
    });

    $("#btnRefreshCompras").on("click", cargarCompras);

    $("#grd_Compras tbody").on("click", ".cm-prod-trigger", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = Number($(this).data("id"));
        if (id > 0) abrirModalProductosCompra(id);
    });

    $("#cmProdBtnEditar").on("click", function () {
        const id = Number($(this).data("id"));
        if (id > 0) window.location.href = API.nuevoModif(id);
    });
}

function inicializarFechasCompras() {
    const hoy = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - 30);
    $("#fFechaDesde").val(desde.toISOString().slice(0, 10));
    $("#fFechaHasta").val(hoy.toISOString().slice(0, 10));
}

async function cargarCombosCompras() {
    const [prov, suc] = await Promise.all([
        fetch(API.proveedores, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
        typeof fetchSucursalesPermitidas === "function"
            ? fetchSucursalesPermitidas(API.sucursales)
            : fetch(API.sucursales, { headers: authHeaders() }).then(r => r.ok ? r.json() : [])
    ]);

    proveedoresCompras = prov || [];
    sucursalesCompras = suc || [];

    const $prov = $("#fProveedor");
    $prov.empty().append(`<option value="">Todos</option>`);
    proveedoresCompras.forEach(p => {
        $prov.append(`<option value="${p.Id}">${p.Nombre}</option>`);
    });

    if (typeof llenarSelectSucursales === "function") {
        llenarSelectSucursales($("#fSucursal"), sucursalesCompras, { placeholderTodos: true });
    } else {
        const $suc = $("#fSucursal");
        $suc.empty().append(`<option value="">Todas</option>`);
        sucursalesCompras.forEach(s => {
            $suc.append(`<option value="${s.Id}">${s.Nombre}</option>`);
        });
    }

    ensureSelect2Compras($("#fProveedor"), { dropdownParent: $("#panelFiltrosCompras"), placeholder: "Todos" });
    ensureSelect2Compras($("#fSucursal"), { dropdownParent: $("#panelFiltrosCompras"), placeholder: "Todas" });

    if (typeof aplicarBloqueoSucursalUnica === "function") {
        aplicarBloqueoSucursalUnica($("#fSucursal"), { triggerChange: false, sucursales: sucursalesCompras });
    }
}

function ensureSelect2Compras($el, opts) {
    if (!$el?.length) return;
    if ($el.data("select2")) $el.select2("destroy");
    $el.select2(Object.assign({ width: "100%", allowClear: true }, opts || {}));
}

function obtenerFiltrosCompras() {
    return {
        FechaDesde: $("#fFechaDesde").val() || null,
        FechaHasta: $("#fFechaHasta").val() || null,
        IdProveedor: $("#fProveedor").val() ? parseInt($("#fProveedor").val(), 10) : null,
        IdSucursal: $("#fSucursal").val() ? parseInt($("#fSucursal").val(), 10) : null,
        Texto: ($("#fTexto").val() || "").trim() || null
    };
}

async function aplicarFiltrosCompras() {
    await cargarCompras();
}

async function limpiarFiltrosCompras() {
    inicializarFechasCompras();
    $("#fProveedor").val("").trigger("change");
    $("#fSucursal").val("").trigger("change");
    $("#fTexto").val("");
    await cargarCompras();
}

async function cargarCompras() {
    const response = await fetch(API.lista, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(obtenerFiltrosCompras())
    });

    if (!response.ok) {
        errorModal("Error cargando compras.");
        return;
    }

    const data = await response.json();
    configurarGrillaCompras(data || []);
    actualizarKpisCompras(data || []);
}

function actualizarKpisCompras(data) {
    const cant = data.length;
    const total = data.reduce((s, x) => s + Number(x.ImporteTotal || 0), 0);
    const items = data.reduce((s, x) => s + Number(x.CantidadProductos || 0), 0);

    $("#kpiCantidad").text(cant);
    $("#kpiTotal").text(fmtMoneyCompras(total));
    $("#kpiItems").text(items);
}

function renderAccionesCompra(id, row) {
    let html = `<div class="rp-row-actions" data-id="${id}">`;

    html += `<button type="button" class="btn btn-sm rp-act rp-act-view" title="Ver / Editar"
        onclick="editarCompra(${id})"><i class="fa fa-pencil-square-o"></i></button>`;

    html += `<button type="button" class="btn btn-sm rp-act rp-act-del" title="Eliminar"
        onclick="eliminarCompra(${id}, ${row.TienePagos ? "true" : "false"})"><i class="fa fa-trash-o"></i></button>`;

    html += `</div>`;
    return html;
}

function configurarGrillaCompras(data) {
    if (!gridCompras) {
        gridCompras = $("#grd_Compras").DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            autoWidth: false,
            columnDefs: typeof columnDefsGridLista === "function" ? columnDefsGridLista() : [],
            scrollX: true,
            order: [[2, "desc"]],
            dom: "Bfrtip",
            buttons: typeof getBotonesExportacion === "function"
                ? getBotonesExportacion(gridCompras, "Compras")
                : [],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                await armarFiltrosGrillaLista(api, "#grd_Compras", columnConfigCompras, {
                    includeActivo: false,
                    panelTitle: "Filtrar resultados cargados"
                });
            },
            columns: [
                columnaGridAcciones(null, "Compras", (id, type, row) => renderAccionesCompra(id, row)),
                columnaGridId(),
                {
                    data: "Fecha",
                    render: v => formatearFechaParaVista(v)
                },
                { data: "Proveedor" },
                { data: "Sucursal" },
                {
                    data: "CantidadProductos",
                    className: "text-center",
                    orderable: false,
                    render: (v, type, row) => renderCeldaProductosCompra(v, row)
                },
                {
                    data: "Subtotal",
                    className: "text-end",
                    render: v => fmtMoneyCompras(v)
                },
                {
                    data: "Descuentos",
                    className: "text-end",
                    render: v => fmtMoneyCompras(v)
                },
                {
                    data: "TotalIva",
                    className: "text-end",
                    render: v => fmtMoneyCompras(v)
                },
                {
                    data: "ImporteTotal",
                    className: "text-end",
                    render: v => `<strong>${fmtMoneyCompras(v)}</strong>`
                },
                {
                    data: "TotalPagado",
                    className: "text-end",
                    render: (v, type, row) => {
                        const pagado = Number(v || 0);
                        if (pagado <= 0) return `<span class="text-muted-cc"></span>`;
                        return `<span class="cm-col-pagado">${fmtMoneyCompras(pagado)}</span>`;
                    }
                },
                {
                    data: "SaldoPendiente",
                    className: "text-end",
                    render: (v, type, row) => {
                        const saldo = Number(v ?? Math.max(0, Number(row.ImporteTotal || 0) - Number(row.TotalPagado || 0)));
                        if (saldo <= 0.01) return `<span class="cm-col-saldo-ok">$ 0,00</span>`;
                        return `<span class="cm-col-saldo-pend">${fmtMoneyCompras(saldo)}</span>`;
                    }
                },
                {
                    data: "NotaInterna",
                    render: (v, type, row) => {
                        const nota = (v || "").trim();
                        const pagos = row.TienePagos
                            ? ` <span class="badge-pagos-compra" title="Tiene pagos a proveedor"><i class="fa fa-money"></i></span>`
                            : "";
                        return (nota || "") + pagos;
                    }
                }
            ]
        });
    } else {
        gridCompras.clear().rows.add(data).draw(false);
    }
}

window.editarCompra = function editarCompra(id) {
    window.location.href = API.nuevoModif(id);
};

async function eliminarCompra(id, tienePagos) {
    const msgPagos = tienePagos === true || tienePagos === "true"
        ? " Tambien se revertiran los pagos al proveedor (caja y cuenta corriente)."
        : "";
    const ok = await confirmarModal(
        `Eliminar esta compra? Se revertira el stock y la deuda en cuenta corriente del proveedor.${msgPagos}`);
    if (!ok) return;

    const response = await fetch(API.eliminar(id), {
        method: "DELETE",
        headers: authHeaders()
    });

    const result = await response.json();

    if (result.valor) {
        exitoModal(result.mensaje || "Compra eliminada correctamente.");
        await cargarCompras();
    } else {
        errorModal(result.mensaje || "No se pudo eliminar.");
    }
}

function fmtMoneyCompras(n) {
    const num = Number(n || 0);
    const partes = num.toFixed(2).split(".");
    const formateado = typeof formatearMiles === "function"
        ? formatearMiles(partes[0] + "," + partes[1])
        : partes[0] + "," + partes[1];
    return "$ " + (formateado || "0,00");
}

function fmtCantCompras(n) {
    const num = Number(n || 0);
    const s = num % 1 === 0 ? String(Math.round(num)) : num.toFixed(2).replace(".", ",");
    return typeof formatearMiles === "function" ? formatearMiles(s) : s;
}

function escapeHtmlCompras(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}

function renderCeldaProductosCompra(cantidad, row) {
    const n = Number(cantidad || 0);
    if (n <= 0) {
        return `<span class="cm-prod-sin">0</span>`;
    }
    const label = n === 1 ? "1 producto" : `${n} productos`;
    return `
        <button type="button" class="cm-prod-trigger" data-id="${row.Id}" title="Ver detalle de productos">
            <span class="cm-prod-badge"><i class="fa fa-cubes"></i> ${label}</span>
        </button>`;
}

async function abrirModalProductosCompra(idCompra) {
    const modalEl = document.getElementById("modalCompraProductos");
    if (!modalEl) return;

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl, {
        backdrop: true,
        keyboard: true
    });

    $("#cmProdLoading").show();
    $("#cmProdGrid").empty().hide();
    $("#cmProdEmpty").addClass("d-none");
    $("#cmProdResumen").empty();
    $("#cmProdModalTitle").text("Productos de la compra");
    $("#cmProdModalSub").text("");
    $("#cmProdBtnEditar").prop("hidden", true).removeData("id");

    bsModal.show();

    try {
        const r = await fetch(API.editarInfo(idCompra), { headers: authHeaders() });
        if (!r.ok) {
            errorModal("No se pudo cargar el detalle de la compra.");
            bsModal.hide();
            return;
        }

        const d = await r.json();
        renderModalProductosCompra(d);
    } catch {
        errorModal("Error al cargar productos de la compra.");
        bsModal.hide();
    } finally {
        $("#cmProdLoading").hide();
    }
}

function renderModalProductosCompra(detalle) {
    const id = detalle.Id || detalle.id || 0;
    const proveedor = detalle.Proveedor || detalle.proveedor || "";
    const sucursal = detalle.Sucursal || detalle.sucursal || "";
    const fecha = formatearFechaParaVista(detalle.Fecha || detalle.fecha);
    const lineas = detalle.Lineas || detalle.lineas || [];
    const puedeEditar = detalle.PuedeEditar !== false && detalle.puedeEditar !== false;

    $("#cmProdModalTitle").text(`Compra #${id}`);
    $("#cmProdModalSub").text(`${proveedor} - ${sucursal} - ${fecha}`);

    const totalPagado = Number(detalle.TotalPagado ?? detalle.totalPagado ?? 0);
    const saldoPend = Number(detalle.SaldoPendiente ?? detalle.saldoPendiente
        ?? Math.max(0, Number(detalle.ImporteTotal ?? detalle.importeTotal ?? 0) - totalPagado));

    const resumenHtml = `
        <div class="cm-prod-resumen-item">
            <div class="lbl">Items</div>
            <div class="val">${lineas.length}</div>
        </div>
        <div class="cm-prod-resumen-item">
            <div class="lbl">Subtotal</div>
            <div class="val">${fmtMoneyCompras(detalle.Subtotal ?? detalle.subtotal)}</div>
        </div>
        <div class="cm-prod-resumen-item">
            <div class="lbl">Descuentos</div>
            <div class="val">${fmtMoneyCompras(detalle.Descuentos ?? detalle.descuentos)}</div>
        </div>
        <div class="cm-prod-resumen-item">
            <div class="lbl">IVA</div>
            <div class="val">${fmtMoneyCompras(detalle.TotalIva ?? detalle.totalIva)}</div>
        </div>
        <div class="cm-prod-resumen-item cm-prod-resumen-total">
            <div class="lbl">Total compra</div>
            <div class="val">${fmtMoneyCompras(detalle.ImporteTotal ?? detalle.importeTotal)}</div>
        </div>
        <div class="cm-prod-resumen-item">
            <div class="lbl">Pagado proveedor</div>
            <div class="val cm-col-pagado">${totalPagado > 0 ? fmtMoneyCompras(totalPagado) : ""}</div>
        </div>
        <div class="cm-prod-resumen-item ${saldoPend > 0.01 ? "cm-prod-resumen-pend" : ""}">
            <div class="lbl">Saldo pendiente</div>
            <div class="val">${fmtMoneyCompras(saldoPend)}</div>
        </div>`;
    $("#cmProdResumen").html(resumenHtml);

    if (!lineas.length) {
        $("#cmProdEmpty").removeClass("d-none");
        $("#cmProdGrid").hide();
        return;
    }

    const cards = lineas.map(l => {
        const nombre = l.Producto || l.producto || "Producto";
        const medida = l.Medida || l.medida || "";
        const cant = l.Cantidad ?? l.cantidad ?? 0;
        const costo = l.CostoUnitario ?? l.costoUnitario ?? 0;
        const porcDesc = l.PorcDescuento ?? l.porcDescuento ?? 0;
        const porcIva = l.PorcIva ?? l.porcIva ?? 0;
        const subtotal = l.SubtotalFinal ?? l.subtotalFinal ?? 0;

        return `
            <article class="cm-prod-card">
                <div class="cm-prod-card-head">
                    <div class="cm-prod-card-icon"><i class="fa fa-cube"></i></div>
                    <div class="cm-prod-card-title">
                        <div class="cm-prod-card-name">${escapeHtmlCompras(nombre)}</div>
                        ${medida ? `<span class="cm-prod-card-medida">${escapeHtmlCompras(medida)}</span>` : ""}
                    </div>
                </div>
                <div class="cm-prod-card-stats">
                    <div class="cm-prod-stat">
                        <div class="lbl">Cantidad</div>
                        <div class="val">${fmtCantCompras(cant)}</div>
                    </div>
                    <div class="cm-prod-stat">
                        <div class="lbl">Costo unit.</div>
                        <div class="val">${fmtMoneyCompras(costo)}</div>
                    </div>
                    <div class="cm-prod-stat">
                        <div class="lbl">% Desc.</div>
                        <div class="val">${fmtCantCompras(porcDesc)}%</div>
                    </div>
                    <div class="cm-prod-stat">
                        <div class="lbl">% IVA</div>
                        <div class="val">${fmtCantCompras(porcIva)}%</div>
                    </div>
                    <div class="cm-prod-stat cm-prod-stat-wide cm-prod-stat-total">
                        <div class="lbl">Subtotal linea</div>
                        <div class="val">${fmtMoneyCompras(subtotal)}</div>
                    </div>
                </div>
            </article>`;
    }).join("");

    $("#cmProdGrid").html(cards).show();

    if (puedeEditar && id > 0) {
        $("#cmProdBtnEditar").data("id", id).prop("hidden", false);
    }
}
