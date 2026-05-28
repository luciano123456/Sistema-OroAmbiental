/* =========================================================
   ENTREGAS.JS  Listado (Sistema Oro Ambiental)
========================================================= */

let gridEntregas;
let contratosEntregas = [];
let estadosEntregaEntregas = [];

const API = {
    lista: "/ClientesEntregas/ListaFiltrada",
    editarInfo: id => `/ClientesEntregas/EditarInfo?id=${id}`,
    eliminar: id => `/ClientesEntregas/Eliminar?id=${id}`,
    nuevoModif: (id, idContrato) => {
        let url = `/ClientesEntregas/NuevoModif?id=${id || 0}`;
        if (idContrato) url += `&idContrato=${idContrato}`;
        return url;
    },
    contratos: "/Contratos/Lista",
    estadosEntrega: "/EntregasEstados/Lista"
};

const authHeaders = () => ({
    Authorization: "Bearer " + token,
    "Content-Type": "application/json"
});

const columnConfigEntregas = [
    { index: 2, filterType: "text" },  // Fecha
    { index: 3, filterType: "text" },  // Cliente
    { index: 4, filterType: "text" },  // Establecimiento
    { index: 5, filterType: "text" },  // Estado
    { index: 6, filterType: "text" },  // Productos
    { index: 7, filterType: "text" },  // Subtotal
    { index: 8, filterType: "text" },  // Descuentos
    { index: 9, filterType: "text" },  // IVA
    { index: 10, filterType: "text" }, // Total
    { index: 11, filterType: "text" }, // Pagado
    { index: 12, filterType: "text" }, // Restante
    { index: 13, filterType: "text" }  // Nota
];

$(document).ready(async () => {
    if (typeof initPanelFiltrosPersistido === "function") {
        initPanelFiltrosPersistido("panelFiltrosEntregas");
    }

    wireEventosEntregas();
    inicializarFechasEntregas();
    await cargarCombosEntregas();
    await cargarEntregas();
});

function wireEventosEntregas() {
    $("#btnNuevaEntrega").on("click", () => {
        window.location.href = API.nuevoModif(0);
    });

    $("#btnRefreshEntregas").on("click", cargarEntregas);

    $("#grd_Entregas tbody").on("click", ".cm-prod-trigger", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = Number($(this).data("id"));
        if (id > 0) abrirModalProductosEntrega(id);
    });

    $("#cmProdBtnEditar").on("click", function () {
        const id = Number($(this).data("id"));
        if (id > 0) window.location.href = API.nuevoModif(id);
    });
}

function inicializarFechasEntregas() {
    const hoy = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - 30);
    $("#fFechaDesde").val(desde.toISOString().slice(0, 10));
    $("#fFechaHasta").val(hoy.toISOString().slice(0, 10));
}

async function cargarCombosEntregas() {
    const [prov, suc] = await Promise.all([
        fetch(API.contratos, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
        fetch(API.estadosEntrega, { headers: authHeaders() }).then(r => r.ok ? r.json() : [])
    ]);

    contratosEntregas = prov || [];
    estadosEntregaEntregas = suc || [];

    const $prov = $("#fCliente");
    $prov.empty().append(`<option value="">Todos</option>`);
    contratosEntregas.forEach(p => {
        $prov.append(`<option value="${p.Id}">${p.Etiqueta || p.Cliente}</option>`);
    });

    const $est = $("#fEstado");
    $est.empty().append(`<option value="">Todos</option>`);
    estadosEntregaEntregas.forEach(s => {
        $est.append(`<option value="${s.Id}">${s.Nombre}</option>`);
    });

    ensureSelect2Entregas($("#fCliente"), { dropdownParent: $("#panelFiltrosEntregas"), placeholder: "Todos" });
    ensureSelect2Entregas($("#fEstado"), { dropdownParent: $("#panelFiltrosEntregas"), placeholder: "Todos" });
}

function ensureSelect2Entregas($el, opts) {
    if (!$el?.length) return;
    if ($el.data("select2")) $el.select2("destroy");
    $el.select2(Object.assign({ width: "100%", allowClear: true }, opts || {}));
}

function obtenerFiltrosEntregas() {
    return {
        FechaDesde: $("#fFechaDesde").val() || null,
        FechaHasta: $("#fFechaHasta").val() || null,
        IdContrato: $("#fCliente").val() ? parseInt($("#fCliente").val(), 10) : null,
        IdEstado: $("#fEstado").val() ? parseInt($("#fEstado").val(), 10) : null,
        Texto: ($("#fTexto").val() || "").trim() || null
    };
}

async function aplicarFiltrosEntregas() {
    await cargarEntregas();
}

async function limpiarFiltrosEntregas() {
    inicializarFechasEntregas();
    $("#fCliente").val("").trigger("change");
    $("#fEstado").val("").trigger("change");
    $("#fTexto").val("");
    await cargarEntregas();
}

async function cargarEntregas() {
    const response = await fetch(API.lista, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(obtenerFiltrosEntregas())
    });

    if (!response.ok) {
        errorModal("Error cargando entregas.");
        return;
    }

    const data = await response.json();
    configurarGrillaEntregas(data || []);
    actualizarKpisEntregas(data || []);
}

function actualizarKpisEntregas(data) {
    const cant = data.length;
    const total = data.reduce((s, x) => s + Number(x.ImporteTotal || 0), 0);
    const items = data.reduce((s, x) => s + Number(x.CantidadProductos || 0), 0);

    $("#kpiCantidad").text(cant);
    $("#kpiTotal").text(fmtMoneyEntregas(total));
    $("#kpiItems").text(items);
}

function renderAccionesEntrega(id, row) {
    let html = `<div class="rp-row-actions" data-id="${id}">`;

    html += `<button type="button" class="btn btn-sm rp-act rp-act-view" title="Ver / Editar"
        onclick="editarEntrega(${id})"><i class="fa fa-pencil-square-o"></i></button>`;

    html += `<button type="button" class="btn btn-sm rp-act rp-act-del" title="Eliminar"
        onclick="eliminarEntrega(${id}, ${row.TieneCobros ? "true" : "false"})"><i class="fa fa-trash-o"></i></button>`;

    html += `</div>`;
    return html;
}

function configurarGrillaEntregas(data) {
    if (!gridEntregas) {
        gridEntregas = $("#grd_Entregas").DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            autoWidth: false,
            columnDefs: typeof columnDefsGridLista === "function" ? columnDefsGridLista() : [],
            scrollX: true,
            order: [[2, "desc"]],
            dom: "Bfrtip",
            buttons: typeof getBotonesExportacion === "function"
                ? getBotonesExportacion(gridEntregas, "Entregas")
                : [],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                inicializarFilaFiltrosGrilla(api, "#grd_Entregas");
                finalizarFiltrosGridLista(api, "#grd_Entregas");

                for (const config of columnConfigEntregas) {
                    const cell = celdasFiltroGrilla("#grd_Entregas").eq(config.index);
                    if (!cell.length) continue;

                    $('<input class="rp-filter-input" type="text" placeholder="Buscar..." autocomplete="off">')
                        .appendTo(cell.empty())
                        .on("keyup change", function () {
                            api.column(config.index).search(this.value).draw(false);
                        });
                }
            },
            columns: [
                columnaGridAcciones(null, "Entregas", (id, type, row) => renderAccionesEntrega(id, row)),
                columnaGridId(),
                {
                    data: "Fecha",
                    render: v => formatearFechaParaVista(v)
                },
                { data: "Cliente" },
                { data: "Establecimiento" },
                { data: "Estado" },
                {
                    data: "CantidadProductos",
                    className: "text-center",
                    orderable: false,
                    render: (v, type, row) => renderCeldaProductosEntrega(v, row)
                },
                {
                    data: "Subtotal",
                    className: "text-end",
                    render: v => fmtMoneyEntregas(v)
                },
                {
                    data: "Descuentos",
                    className: "text-end",
                    render: v => fmtMoneyEntregas(v)
                },
                {
                    data: "TotalIva",
                    className: "text-end",
                    render: v => fmtMoneyEntregas(v)
                },
                {
                    data: "ImporteTotal",
                    className: "text-end",
                    render: v => `<strong>${fmtMoneyEntregas(v)}</strong>`
                },
                {
                    data: "ImporteAbonado",
                    className: "text-end",
                    render: (v, type, row) => {
                        const pagado = Number(v || 0);
                        if (pagado <= 0) return `<span class="text-muted-cc"></span>`;
                        return `<span class="cm-col-pagado">${fmtMoneyEntregas(pagado)}</span>`;
                    }
                },
                {
                    data: "Saldo",
                    className: "text-end",
                    render: (v, type, row) => {
                        const saldo = Number(v ?? Math.max(0, Number(row.ImporteTotal || 0) - Number(row.ImporteAbonado || 0)));
                        if (saldo <= 0.01) return `<span class="cm-col-saldo-ok">$ 0,00</span>`;
                        return `<span class="cm-col-saldo-pend">${fmtMoneyEntregas(saldo)}</span>`;
                    }
                },
                {
                    data: "NotaInterna",
                    render: (v, type, row) => {
                        const nota = (v || "").trim();
                        const cobros = row.TieneCobros
                            ? ` <span class="badge-cobros-entrega" title="Tiene cobros a contrato"><i class="fa fa-money"></i></span>`
                            : "";
                        return (nota || "") + cobros;
                    }
                }
            ]
        });
    } else {
        gridEntregas.clear().rows.add(data).draw(false);
    }
}

window.editarEntrega = function editarEntrega(id) {
    window.location.href = API.nuevoModif(id);
};

async function eliminarEntrega(id, tieneCobros) {
    const msgCobros = tieneCobros === true || tieneCobros === "true"
        ? " También se revertirán los cobros al contrato (caja y cuenta corriente)."
        : "";
    const ok = await confirmarModal(
        `¿Eliminar esta entrega? Se revertirá el stock y la deuda en cuenta corriente del contrato.${msgCobros}`);
    if (!ok) return;

    const response = await fetch(API.eliminar(id), {
        method: "DELETE",
        headers: authHeaders()
    });

    const result = await response.json();

    if (result.valor) {
        exitoModal(result.mensaje || "Entrega eliminada correctamente.");
        await cargarEntregas();
    } else {
        errorModal(result.mensaje || "No se pudo eliminar.");
    }
}

function fmtMoneyEntregas(n) {
    const num = Number(n || 0);
    const partes = num.toFixed(2).split(".");
    const formateado = typeof formatearMiles === "function"
        ? formatearMiles(partes[0] + "," + partes[1])
        : partes[0] + "," + partes[1];
    return "$ " + (formateado || "0,00");
}

function fmtCantEntregas(n) {
    const num = Number(n || 0);
    const s = num % 1 === 0 ? String(Math.round(num)) : num.toFixed(2).replace(".", ",");
    return typeof formatearMiles === "function" ? formatearMiles(s) : s;
}

function escapeHtmlEntregas(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}

function renderCeldaProductosEntrega(cantidad, row) {
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

async function abrirModalProductosEntrega(idEntrega) {
    const modalEl = document.getElementById("modalEntregaProductos");
    if (!modalEl) return;

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl, {
        backdrop: true,
        keyboard: true
    });

    $("#cmProdLoading").show();
    $("#cmProdGrid").empty().hide();
    $("#cmProdEmpty").addClass("d-none");
    $("#cmProdResumen").empty();
    $("#cmProdModalTitle").text("Productos de la entrega");
    $("#cmProdModalSub").text("");
    $("#cmProdBtnEditar").prop("hidden", true).removeData("id");

    bsModal.show();

    try {
        const r = await fetch(API.editarInfo(idEntrega), { headers: authHeaders() });
        if (!r.ok) {
            errorModal("No se pudo cargar el detalle de la entrega.");
            bsModal.hide();
            return;
        }

        const d = await r.json();
        renderModalProductosEntrega(d);
    } catch {
        errorModal("Error al cargar productos de la entrega.");
        bsModal.hide();
    } finally {
        $("#cmProdLoading").hide();
    }
}

function renderModalProductosEntrega(detalle) {
    const id = detalle.Id || detalle.id || 0;
    const contrato = detalle.Contrato || detalle.contrato || "";
    const estado = detalle.Estado || detalle.estado || "";
    const fecha = formatearFechaParaVista(detalle.Fecha || detalle.fecha);
    const lineas = detalle.Lineas || detalle.lineas || [];
    const puedeEditar = detalle.PuedeEditar !== false && detalle.puedeEditar !== false;

    $("#cmProdModalTitle").text(`Entrega #${id}`);
    $("#cmProdModalSub").text(`${contrato} ?,? ${estado} ?,? ${fecha}`);

    const totalPagado = Number(detalle.TotalPagado ?? detalle.totalPagado ?? 0);
    const saldoPend = Number(detalle.SaldoPendiente ?? detalle.saldoPendiente
        ?? Math.max(0, Number(detalle.ImporteTotal ?? detalle.importeTotal ?? 0) - totalPagado));

    const resumenHtml = `
        <div class="cm-prod-resumen-item">
            <div class="lbl">ítems</div>
            <div class="val">${lineas.length}</div>
        </div>
        <div class="cm-prod-resumen-item">
            <div class="lbl">Subtotal</div>
            <div class="val">${fmtMoneyEntregas(detalle.Subtotal ?? detalle.subtotal)}</div>
        </div>
        <div class="cm-prod-resumen-item">
            <div class="lbl">Descuentos</div>
            <div class="val">${fmtMoneyEntregas(detalle.Descuentos ?? detalle.descuentos)}</div>
        </div>
        <div class="cm-prod-resumen-item">
            <div class="lbl">IVA</div>
            <div class="val">${fmtMoneyEntregas(detalle.TotalIva ?? detalle.totalIva)}</div>
        </div>
        <div class="cm-prod-resumen-item cm-prod-resumen-total">
            <div class="lbl">Total entrega</div>
            <div class="val">${fmtMoneyEntregas(detalle.ImporteTotal ?? detalle.importeTotal)}</div>
        </div>
        <div class="cm-prod-resumen-item">
            <div class="lbl">Pagado contrato</div>
            <div class="val cm-col-pagado">${totalPagado > 0 ? fmtMoneyEntregas(totalPagado) : ""}</div>
        </div>
        <div class="cm-prod-resumen-item ${saldoPend > 0.01 ? "cm-prod-resumen-pend" : ""}">
            <div class="lbl">Saldo pendiente</div>
            <div class="val">${fmtMoneyEntregas(saldoPend)}</div>
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
        const costo = l.PrecioVenta ?? l.costoUnitario ?? 0;
        const porcDesc = l.PorcDescuento ?? l.porcDescuento ?? 0;
        const porcIva = l.PorcIva ?? l.porcIva ?? 0;
        const subtotal = l.SubtotalFinal ?? l.subtotalFinal ?? 0;

        return `
            <article class="cm-prod-card">
                <div class="cm-prod-card-head">
                    <div class="cm-prod-card-icon"><i class="fa fa-cube"></i></div>
                    <div class="cm-prod-card-title">
                        <div class="cm-prod-card-name">${escapeHtmlEntregas(nombre)}</div>
                        ${medida ? `<span class="cm-prod-card-medida">${escapeHtmlEntregas(medida)}</span>` : ""}
                    </div>
                </div>
                <div class="cm-prod-card-stats">
                    <div class="cm-prod-stat">
                        <div class="lbl">Cantidad</div>
                        <div class="val">${fmtCantEntregas(cant)}</div>
                    </div>
                    <div class="cm-prod-stat">
                        <div class="lbl">Costo unit.</div>
                        <div class="val">${fmtMoneyEntregas(costo)}</div>
                    </div>
                    <div class="cm-prod-stat">
                        <div class="lbl">% Desc.</div>
                        <div class="val">${fmtCantEntregas(porcDesc)}%</div>
                    </div>
                    <div class="cm-prod-stat">
                        <div class="lbl">% IVA</div>
                        <div class="val">${fmtCantEntregas(porcIva)}%</div>
                    </div>
                    <div class="cm-prod-stat cm-prod-stat-wide cm-prod-stat-total">
                        <div class="lbl">Subtotal línea</div>
                        <div class="val">${fmtMoneyEntregas(subtotal)}</div>
                    </div>
                </div>
            </article>`;
    }).join("");

    $("#cmProdGrid").html(cards).show();

    if (puedeEditar && id > 0) {
        $("#cmProdBtnEditar").data("id", id).prop("hidden", false);
    }
}
