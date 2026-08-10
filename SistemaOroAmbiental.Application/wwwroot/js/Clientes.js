let gridClientes;

const columnConfig = [
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'select', sucursalDt: true },
    { index: 5, filterType: 'select_local' },
    { index: 6, filterType: 'select_local' },
    { index: 7, filterType: 'select_local' },
    { index: 8, filterType: 'text' },
    { index: 9, filterType: 'text' },
    { index: 10, filterType: 'activo' }
];

registrarFiltrosGrilla('grd_Clientes', columnConfig, {
    defaultActivoModo: 'todos',
    initSelect2: ($el) => inicializarSelect2Filtro($el)
});

function columnDefsClientesGrid() {
    return [
        { targets: 0, className: "rp-col-acciones", width: "118px", orderable: false },
        { targets: 1, className: "rp-col-id", width: "88px" },
        { targets: 2, className: "rp-col-nombre", width: "280px" },
        { targets: 3, className: "rp-col-cuit", width: "145px" },
        { targets: 4, className: "rp-col-sucursal", width: "165px" },
        { targets: 5, className: "rp-col-provincia", width: "155px" },
        { targets: 6, className: "rp-col-profesion", width: "170px" },
        { targets: 7, className: "rp-col-iva", width: "170px" },
        { targets: 8, className: "rp-col-tel", width: "135px" },
        { targets: 9, className: "rp-col-email", width: "280px" },
        { targets: 10, className: "rp-col-activo", width: "108px" }
    ];
}

function parseFechaCliente(val) {
    if (!val) return null;
    const d = val instanceof Date ? val : new Date(val);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Misma regla que backend EstaEnLicencia: fechas ganan; si no hay, estado "Licencia". */
function clienteEnLicencia(data, fechaRef) {
    if (!data) return false;
    const hoy = fechaRef
        ? (fechaRef instanceof Date ? fechaRef : parseFechaCliente(fechaRef))
        : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const desde = parseFechaCliente(data.FechaLicenciaDesde);
    const hasta = parseFechaCliente(data.FechaLicenciaHasta);
    const porEstado = String(data.Estado || "").toLowerCase().includes("licencia");

    if (desde && hasta) return hoy >= desde && hoy <= hasta;
    if (desde && !hasta) return hoy >= desde;
    if (!desde && hasta) return hoy <= hasta;
    return porEstado;
}

function escapeHtmlClientes(text) {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderNombreClienteConLicencia(data, type) {
    const nombre = data?.Nombre ?? "";
    if (type === "sort" || type === "filter" || type === "export" || type === "excel" || type === "csv" || type === "pdf" || type === "print") {
        return nombre;
    }
    const safe = escapeHtmlClientes(nombre);
    if (!clienteEnLicencia(data)) return safe;

    const desde = parseFechaCliente(data.FechaLicenciaDesde);
    const hasta = parseFechaCliente(data.FechaLicenciaHasta);
    const fmt = d => d ? d.toLocaleDateString("es-AR") : null;
    const partes = [];
    if (desde) partes.push(`desde ${fmt(desde)}`);
    if (hasta) partes.push(`hasta ${fmt(hasta)}`);
    const title = partes.length
        ? `En licencia ${partes.join(" ")}`
        : "Cliente en licencia";

    return `<span class="cl-nombre-con-licencia">
        <span class="cl-nombre-texto">${safe}</span>
        <span class="cl-badge-licencia" title="${escapeHtmlClientes(title)}">
            <i class="fa fa-umbrella" aria-hidden="true"></i>
            <span>Licencia</span>
        </span>
    </span>`;
}

const URL_GESTION_CLIENTE = id => id > 0 ? `/Clientes/Gestion?id=${id}` : "/Clientes/Gestion";

const API_CLIENTES = {
    lista: "/Clientes/Lista",
    dashboard: "/ClientesOperativo/Dashboard"
};

$(document).ready(() => {
    window.nuevoCliente = () => { window.location.href = URL_GESTION_CLIENTE(0); };
    window.editarCliente = id => { window.location.href = URL_GESTION_CLIENTE(id); };
    window.verCliente = id => { window.location.href = URL_GESTION_CLIENTE(id); };
    window.eliminarCliente = eliminarClienteIndex;

    if (typeof registrarGrillaDobleClick === "function") {
        registrarGrillaDobleClick("grd_Clientes", id => {
            window.location.href = URL_GESTION_CLIENTE(id);
        });
    }

    cargarDashboardClientes();
    listaClientes();

    $("#listaAlertasLicencia")
        .off("dblclick.clAlertaNav")
        .on("dblclick.clAlertaNav", ".cl-alerta-card, .cl-alerta-card .cl-alerta-nombre", function (e) {
            e.preventDefault();
            const $card = $(this).closest(".cl-alerta-card");
            irDesdeAlertaLicencia($card.data("id"));
        });
});

async function cargarDashboardClientes() {
    try {
        const response = await fetch(API_CLIENTES.dashboard, {
            method: "GET",
            headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) return;

        const d = await response.json();
        actualizarDashboardKpis(d);
    } catch (e) {
        console.warn("No se pudo cargar el dashboard de clientes", e);
    }
}

function actualizarDashboardKpis(d) {
    if (!d) return;

    $("#kpiActivos").text(d.Activos ?? 0);
    $("#kpiSuspendidos").text(d.Suspendidos ?? 0);
    $("#kpiBaja").text(d.Baja ?? 0);
    $("#kpiLicencia").text(d.Licencia ?? 0);
    $("#kpiAlertasLicencia").text(d.LicenciasPorVencer ?? 0);
    $("#kpiBajasMes").text(d.BajasMesActual ?? 0);

    const alertas = d.AlertasLicencia || [];
    const panel = $("#panelAlertasLicencia");
    const lista = $("#listaAlertasLicencia");

    if (!alertas.length) {
        panel.addClass("d-none");
        lista.empty();
        $("#clAlertasLicenciaCount").text("0");
        return;
    }

    panel.removeClass("d-none");
    $("#clAlertasLicenciaCount").text(String(alertas.length));

    lista.html(alertas.map(a => {
        const fecha = a.FechaLicenciaHasta
            ? new Date(a.FechaLicenciaHasta).toLocaleDateString("es-AR")
            : "";
        const dias = Number(a.DiasRestantes ?? 0);
        const urgente = dias <= 7;

        return `<article class="cl-alerta-card${urgente ? " is-urgente" : ""}" data-id="${a.Id}" title="Doble clic para ubicar en el listado">
            <div class="cl-alerta-card-main">
                <span class="cl-alerta-card-icon"><i class="fa fa-user"></i></span>
                <div class="cl-alerta-card-text">
                    <a href="${URL_GESTION_CLIENTE(a.Id)}" class="cl-alerta-nombre">${escapeHtmlCl(a.Nombre)}</a>
                    <span class="cl-alerta-fecha">Vence el ${fecha}</span>
                </div>
            </div>
            <span class="cl-alerta-badge">${dias} dia${dias === 1 ? "" : "s"}</span>
        </article>`;
    }).join(""));
}

function irDesdeAlertaLicencia(id) {
    const clienteId = Number(id);
    if (!clienteId) return;

    $("#listaAlertasLicencia .cl-alerta-card").removeClass("is-target");
    $(`#listaAlertasLicencia .cl-alerta-card[data-id="${clienteId}"]`).addClass("is-target");

    const intentar = () => navegarAFilaCliente(clienteId);

    if (gridClientes) {
        intentar();
        return;
    }

    let intentos = 0;
    const timer = setInterval(() => {
        intentos += 1;
        if (gridClientes) {
            clearInterval(timer);
            intentar();
        } else if (intentos >= 50) {
            clearInterval(timer);
        }
    }, 100);
}

function navegarAFilaCliente(id) {
    const ok = typeof window.irAFilaGrilla === "function"
        && window.irAFilaGrilla("grd_Clientes", id, { scroll: true, flash: true, limpiarFiltros: true });

    if (!ok && typeof errorModal === "function") {
        errorModal("No se encontro el cliente en el listado.");
    }
}

function escapeHtmlCl(t) {
    return String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function eliminarClienteIndex(id) {
    if (typeof ejecutarEliminacionEntidad !== "function") {
        errorModal("No esta disponible el asistente de eliminacion.");
        return;
    }

    const resultado = await ejecutarEliminacionEntidad({
        entidadLabel: "este cliente",
        urlDependencias: `/Clientes/DependenciasEliminar?id=${id}`,
        urlEliminar: cascada => `/Clientes/Eliminar?id=${id}&cascada=${cascada ? "true" : "false"}`,
        headers: { Authorization: "Bearer " + token },
        fetchJson: async (url, options) => {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
            return await response.json();
        }
    });

    if (resultado.accion !== "ok") return;

    if (typeof exitoModal === "function") {
        exitoModal(resultado.data?.mensaje ?? "Cliente eliminado correctamente");
    }

    await listaClientes();
}

function ensureSelect2($el, options) {
    if (!$el || !$el.length) return;
    if ($el.data('select2')) return;
    $el.select2(Object.assign({
        width: '100%',
        allowClear: true,
        placeholder: "Seleccionar"
    }, options || {}));
}

function inicializarSelect2Filtro($select) {
    ensureSelect2($select, {
        dropdownParent: $(document.body),
        minimumResultsForSearch: 0,
        allowClear: true,
        placeholder: "Todos"
    });
}

async function listaClientes() {
    let paginaActual = gridClientes != null ? gridClientes.page() : 0;

    const response = await fetch(`/Clientes/Lista`, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) throw new Error(`Error en la solicitud: ${response.statusText}`);

    const data = await response.json();
    await configurarDataTable(data);

    if (paginaActual > 0) {
        gridClientes.page(paginaActual).draw('page');
    }
}

async function configurarDataTable(data) {

    if (!gridClientes) {

        gridClientes = $('#grd_Clientes').DataTable({
            data: data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            autoWidth: false,
            columnDefs: columnDefsClientesGrid(),
            scrollX: true,
            scrollCollapse: true,
            columns: [
                columnaGridAcciones({
                    ver: "verCliente",
                    editar: "editarCliente",
                    eliminar: "eliminarCliente"
                }, "Clientes"),
                columnaGridId(),
                {
                    data: 'Nombre',
                    className: 'rp-col-nombre',
                    render: function (_data, type, row) {
                        return renderNombreClienteConLicencia(row, type);
                    }
                },
                { data: 'Cuit', className: 'rp-col-cuit' },
                { data: 'Sucursal', className: 'rp-col-sucursal' },
                { data: 'Provincia', className: 'rp-col-provincia' },
                { data: 'Profesion', className: 'rp-col-profesion' },
                { data: 'CondicionIva', className: 'rp-col-iva' },
                { data: 'Telefono', className: 'rp-col-tel' },
                { data: 'Email', className: 'rp-col-email' },
                typeof columnaGridActivo === "function" ? columnaGridActivo("Clientes") : { data: "Activo", className: "rp-col-activo" },
            ],
            createdRow: function (row, data) {
                if (typeof createdRowEstiloActivoGrilla === "function") {
                    createdRowEstiloActivoGrilla(row, data);
                }
                if (clienteEnLicencia(data)) {
                    $(row).addClass("dt-row-licencia");
                }
            },
            dom: 'Bfrtip',
            buttons: getBotonesExportacion(gridClientes, "Clientes"),
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                await initFiltrosGrillaListaEnInitComplete(api, '#grd_Clientes', columnConfig, {
                    defaultActivoModo: 'todos',
                    initSelect2: ($el) => inicializarSelect2Filtro($el)
                }, {
                    afterFilters: () => {
                        configurarOpcionesColumnas();
                        actualizarKpis(data);
                    },
                    afterAdjust: () => {
                        setTimeout(() => ajustarColumnasGrillaLista(api, '#grd_Clientes'), 200);
                    }
                });
            }
        });

    } else {
        gridClientes.clear().rows.add(data).draw();
        actualizarKpis(data);
    }
}

async function listaSucursalesFilter() {
    return await fetchSucursalesPermitidas("/Sucursales/Lista");
}

async function listaProvinciasFilter() {
    const response = await fetch(`/Provincias/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    return await response.json();
}

async function listaProfesionesFilter() {
    const response = await fetch(`/ClientesProfesiones/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    return await response.json();
}

async function listaCondicionesIvaFilter() {
    const response = await fetch(`/CondicionesIva/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    return await response.json();
}

function configurarOpcionesColumnas() {
    const grid = $('#grd_Clientes').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');
    const storageKey = `Clientes_Columnas`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        if (typeof esColumnaMenuGrilla === "function" ? esColumnaMenuGrilla(col) : (col.data && col.data !== "Id")) {
            const isChecked = savedConfig[`col_${index}`] !== undefined
                ? savedConfig[`col_${index}`]
                : true;

            grid.column(index).visible(isChecked);

            const name = $('#grd_Clientes thead tr').first().find('th').eq(index).text();

            container.append(`
                <li class="rp-dd-item">
                    <label class="rp-dd-label">
                        <input type="checkbox"
                               class="toggle-column"
                               data-column="${index}"
                               ${isChecked ? 'checked' : ''}>
                        <span>${name}</span>
                    </label>
                </li>
            `);
        }
    });

    $('.toggle-column').off('change').on('change', function () {
        const columnIdx = parseInt($(this).data('column'), 10);
        const isChecked = $(this).is(':checked');
        savedConfig[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));
        grid.column(columnIdx).visible(isChecked);
    });
}

function actualizarKpis(data) {
    const cant = Array.isArray(data) ? data.length : 0;
    $("#kpiCantClientes").text(cant);
    cargarDashboardClientes();
}

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
