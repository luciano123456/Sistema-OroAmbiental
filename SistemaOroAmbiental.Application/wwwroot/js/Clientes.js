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
    { index: 10, filterType: 'text' },
    { index: 11, filterType: 'text' },
    { index: 12, filterType: 'activo' }
];

registrarFiltrosGrilla('grd_Clientes', columnConfig, {
    defaultActivoModo: 'todos',
    panelTitle: "Filtros",
    panelExpanded: true,
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
        { targets: 10, className: "rp-col-recorrido", width: "108px" },
        { targets: 11, className: "rp-col-recorridos", width: "260px" },
        { targets: 12, className: "rp-col-activo", width: "108px" }
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

function renderRecorridoCliente(row, type) {
    const val = String(row?.Recorrido || "No").toLowerCase() === "si" ? "Si" : "No";
    if (type && type !== "display") return val;
    const si = val === "Si";
    return `<span class="cl-rec-badge ${si ? "is-si" : "is-no"}">${val}</span>`;
}

function renderRecorridosCliente(row, type) {
    const full = String(row?.Recorridos || "");
    if (type && type !== "display") return full;
    if (!full) return `<span class="cl-rec-vacio">—</span>`;
    const visible = full.length > 140 ? full.slice(0, 137) + "…" : full;
    return `<span class="cl-rec-lista" title="${escapeHtmlClientes(full)}">${escapeHtmlClientes(visible)}</span>`;
}

const URL_GESTION_CLIENTE = id => id > 0 ? `/Clientes/Gestion?id=${id}` : "/Clientes/Gestion";

const API_CLIENTES = {
    lista: "/Clientes/Lista",
    listaPaginada: "/Clientes/ListaPaginada",
    paginaDeId: "/Clientes/PaginaDeId",
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

    $("#grd_Clientes").data("rpActivoModo", "todos");

    cargarDashboardClientes();
    initGridClientes();

    $("#listaAlertasLicencia")
        .off("dblclick.clAlertaNav")
        .on("dblclick.clAlertaNav", ".cl-alerta-card, .cl-alerta-card .cl-alerta-nombre", function (e) {
            e.preventDefault();
            const $card = $(this).closest(".cl-alerta-card");
            irDesdeAlertaLicencia($card.data("id"));
        });

    $(".cl-page")
        .on("click.clKpi", ".cl-kpi-card[data-situacion]", function () {
            toggleSituacionCliente(String($(this).data("situacion") || ""));
        })
        .on("keydown.clKpi", ".cl-kpi-card[data-situacion]", function (e) {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            $(this).trigger("click");
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
        && window.irAFilaGrilla("grd_Clientes", id, {
            scroll: true,
            flash: true,
            limpiarFiltros: true,
            paginaDeIdUrl: API_CLIENTES.paginaDeId
        });

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

    recargarGrillaServer(gridClientes);
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

const CLIENTES_GRID_HEADERS = [
    "", "Id", "Nombre", "CUIT", "Sucursal", "Provincia", "Profesion",
    "Condicion IVA", "Telefono", "Email", "Recorrido", "Recorridos", "Activo"
];

/** Una sola fila de encabezado, con la misma cantidad de celdas que columns. */
function normalizarTheadClientes() {
    const $thead = $("#grd_Clientes").children("thead");
    if (!$thead.length) return;

    $thead.find("tr.filters").remove();
    let $row = $thead.children("tr").first();
    if (!$row.length) $row = $("<tr></tr>").appendTo($thead);
    $thead.children("tr").not($row).remove();

    const $cells = $row.children("th,td");
    if ($cells.length === CLIENTES_GRID_HEADERS.length) return;

    $row.empty();
    CLIENTES_GRID_HEADERS.forEach(text => {
        $row.append($("<th></th>").text(text));
    });
}

async function initGridClientes() {
    if (gridClientes) return;

    normalizarTheadClientes();

    gridClientes = $('#grd_Clientes').DataTable({
        serverSide: true,
        processing: true,
        ajax: crearOpcionesAjaxGrillaServer(API_CLIENTES.listaPaginada, "#grd_Clientes"),
        language: {
            sLengthMenu: "Mostrar MENU registros",
            url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json",
            processing: "Cargando..."
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
            {
                data: 'Recorrido',
                className: 'rp-col-recorrido',
                defaultContent: "",
                render: function (_data, type, row) {
                    return renderRecorridoCliente(row, type);
                }
            },
            {
                data: 'Recorridos',
                className: 'rp-col-recorridos',
                defaultContent: "",
                render: function (_data, type, row) {
                    return renderRecorridosCliente(row, type);
                }
            },
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
        drawCallback: function () {
            const total = $("#grd_Clientes").data("rpRecordsFiltered") ?? $("#grd_Clientes").data("rpRecordsTotal");
            actualizarKpis(total);
        },
        initComplete: async function () {
            const api = this.api();
            configurarOpcionesColumnas();
            await initFiltrosGrillaListaEnInitComplete(api, '#grd_Clientes', columnConfig, {
                defaultActivoModo: 'todos',
                panelTitle: "Filtros",
                panelExpanded: true,
                initSelect2: ($el) => inicializarSelect2Filtro($el)
            }, {
                afterFilters: async () => {
                    await montarFiltrosExtraClientes();
                },
                afterAdjust: () => {
                    setTimeout(() => ajustarColumnasGrillaLista(api, '#grd_Clientes'), 200);
                }
            });
        }
    });
}

function listaClientes() {
    recargarGrillaServer(gridClientes);
}

async function configurarDataTable(_data) {
    listaClientes();
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
    const storageKey = `Clientes_Columnas_v2`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        if (typeof esColumnaMenuGrilla === "function" ? esColumnaMenuGrilla(col) : (col.data && col.data !== "Id")) {
            const isChecked = savedConfig[`col_${index}`] !== undefined
                ? savedConfig[`col_${index}`]
                : true;

            const name = ($(grid.column(index).header()).text() || CLIENTES_GRID_HEADERS[index] || "").trim();
            grid.column(index).visible(isChecked, false);

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
        aplicarVisibilidadColumnaClientes(grid, columnIdx, isChecked);
    });

    try { grid.columns.adjust(); } catch { /* scrollX aun no listo */ }
}

function aplicarVisibilidadColumnaClientes(grid, columnIdx, isChecked) {
    const $wrap = $("#grd_Clientes").closest(".dataTables_wrapper");
    $wrap.find("thead tr.filters").remove();
    grid.column(columnIdx).visible(isChecked, false);
    if (typeof sincronizarFilaFiltrosScrollHeadGrilla === "function") {
        sincronizarFilaFiltrosScrollHeadGrilla(grid, "#grd_Clientes");
    }
    try { grid.columns.adjust(); } catch { /* sin scroll */ }
    grid.draw(false);
}

function actualizarKpis(totalOrData) {
    let cant = 0;
    if (typeof totalOrData === "number") {
        cant = totalOrData;
    } else if (Array.isArray(totalOrData)) {
        cant = totalOrData.length;
    } else {
        cant = $("#grd_Clientes").data("rpRecordsFiltered") ?? 0;
    }
    $("#kpiCantClientes").text(cant);
    cargarDashboardClientes();
}

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const filtrosCli = {
    dias: [],
    semanas: [],
    camion: "",
    zona: "",
    cobertura: "",
    situacion: "",
    tipoGenerador: "",
    calificacion: "",
    localidad: "",
    nroCliente: "",
    contrato: "",
    contacto: ""
};

const catFiltrosCli = {
    dias: [],
    semanas: [],
    camiones: [],
    tipos: [],
    calificaciones: []
};

const SITUACIONES_CLI = [
    { id: "", label: "Todas" },
    { id: "activos", label: "Activos" },
    { id: "suspendidos", label: "Suspendidos" },
    { id: "baja", label: "Baja" },
    { id: "licencia", label: "Licencia" },
    { id: "alertas", label: "Por vencer" }
];

const aplicarFiltrosExtraClientesDebounced = rpDebounce(() => aplicarFiltrosExtraClientes(), 300);

function toggleSituacionCliente(sit) {
    filtrosCli.situacion = filtrosCli.situacion === sit ? "" : sit;
    syncSituacionVisual();
    aplicarFiltrosExtraClientes();
}

function normNombreFiltro(nombre) {
    return String(nombre || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function etiquetaDiaCorta(nombre) {
    const map = {
        lunes: "Lun",
        martes: "Mar",
        miercoles: "Mie",
        jueves: "Jue",
        viernes: "Vie",
        sabado: "Sab",
        domingo: "Dom"
    };
    return map[normNombreFiltro(nombre)] || String(nombre || "").slice(0, 3);
}

function etiquetaSemanaCorta(nombre) {
    const n = String(nombre || "").trim();
    const num = n.match(/(\d+)/);
    if (/semana/i.test(n) && num) return "S" + num[1];
    return n.length > 16 ? n.slice(0, 14) + "…" : n;
}

function idItemLista(item) {
    return Number(item?.Id ?? item?.id ?? 0);
}

function nombreItemLista(item) {
    return String(item?.Etiqueta || item?.Nombre || item?.nombre || "").trim();
}

async function fetchListaFiltroCliente(url) {
    try {
        const response = await fetch(url, {
            headers: { Authorization: "Bearer " + (window.token || token) }
        });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.warn("No se pudo cargar el filtro", url, e);
        return [];
    }
}

function armarPayloadFiltrosExtra() {
    const p = {};
    const sinRuta = filtrosCli.cobertura === "sin";

    if (!sinRuta) {
        if (filtrosCli.dias.length) p.RecDia = filtrosCli.dias.join(",");
        if (filtrosCli.semanas.length) p.RecSemana = filtrosCli.semanas.join(",");
        if (filtrosCli.camion) p.RecCamion = String(filtrosCli.camion);
        if (filtrosCli.zona.trim()) p.RecZona = filtrosCli.zona.trim();
    }
    if (filtrosCli.cobertura === "con" || filtrosCli.cobertura === "sin")
        p.RecCobertura = filtrosCli.cobertura;
    if (filtrosCli.situacion) p.Situacion = filtrosCli.situacion;
    if (filtrosCli.tipoGenerador) p.TipoGenerador = String(filtrosCli.tipoGenerador);
    if (filtrosCli.calificacion) p.Calificacion = String(filtrosCli.calificacion);
    if (filtrosCli.localidad.trim()) p.Localidad = filtrosCli.localidad.trim();
    if (filtrosCli.nroCliente.trim()) p.NroCliente = filtrosCli.nroCliente.trim();
    if (filtrosCli.contrato) p.Contrato = filtrosCli.contrato;
    if (filtrosCli.contacto) p.Contacto = filtrosCli.contacto;
    return p;
}

function aplicarFiltrosExtraClientes() {
    const payload = armarPayloadFiltrosExtra();
    const $table = $("#grd_Clientes");
    const $panel = $("#panelFiltrosGrid_grd_Clientes");
    $table.data("rpFiltrosExtra", payload);
    $panel.data("rpExtraCount", Object.keys(payload).length);
    if (typeof refrescarBadgeFiltrosPanel === "function" && $panel.length)
        refrescarBadgeFiltrosPanel($panel);
    renderResumenFiltrosCliente(payload);
    syncCoberturaVisual();
    if (gridClientes) gridClientes.draw();
}

function resetFiltrosExtraClientes() {
    filtrosCli.dias = [];
    filtrosCli.semanas = [];
    filtrosCli.camion = "";
    filtrosCli.zona = "";
    filtrosCli.cobertura = "";
    filtrosCli.situacion = "";
    filtrosCli.tipoGenerador = "";
    filtrosCli.calificacion = "";
    filtrosCli.localidad = "";
    filtrosCli.nroCliente = "";
    filtrosCli.contrato = "";
    filtrosCli.contacto = "";
    $("#grd_Clientes").data("rpFiltrosExtra", {});
    $("#panelFiltrosGrid_grd_Clientes").data("rpExtraCount", 0);
    volcarFiltrosExtraEnUi();
    renderResumenFiltrosCliente({});
}

function syncSituacionVisual() {
    $("#clChipsSituacion .cl-chip").each(function () {
        const id = String($(this).attr("data-id") ?? "");
        const on = id === (filtrosCli.situacion || "");
        $(this).toggleClass("is-on", on).attr("aria-pressed", on);
    });
    $(".cl-kpi-card[data-situacion]").each(function () {
        const id = String($(this).data("situacion") || "");
        const on = !!filtrosCli.situacion && id === filtrosCli.situacion;
        $(this).toggleClass("is-on", on).attr("aria-pressed", on);
    });
}

function syncCoberturaVisual() {
    const sin = filtrosCli.cobertura === "sin";
    $("#clFiltrosExtra").toggleClass("is-sin-recorrido", sin);
    $("#clSegCobertura button").each(function () {
        const on = String($(this).attr("data-val") ?? "") === filtrosCli.cobertura;
        $(this).toggleClass("is-on", on).attr("aria-pressed", on);
    });
    $("#clSegContrato button").each(function () {
        const on = String($(this).attr("data-val") ?? "") === filtrosCli.contrato;
        $(this).toggleClass("is-on", on).attr("aria-pressed", on);
    });
}

function setSelectFiltroCliente(selector, value) {
    const $el = $(selector);
    if (!$el.length) return;
    $el.val(value || "");
    if ($el.data("select2")) $el.trigger("change.select2");
}

function initSelectsFiltroCliente($root) {
    if (!$root?.length || typeof $.fn.select2 !== "function") return;
    $root.find("select.cl-filtro-select").each(function () {
        const $el = $(this);
        if ($el.data("select2")) return;
        const placeholder = $el.find("option[value='']").first().text() || "Todos";
        $el.select2({
            width: "100%",
            dropdownParent: $(document.body),
            dropdownCssClass: "cl-s2-dropdown",
            placeholder: placeholder,
            allowClear: true,
            minimumResultsForSearch: 8
        });
        $el.on("select2:open.clExtra", function () {
            $(".select2-container--open .select2-dropdown").last().addClass("cl-s2-dropdown");
        });
    });
}

function volcarFiltrosExtraEnUi() {
    $("#clChipsDias .cl-chip").each(function () {
        const id = Number($(this).data("id"));
        const on = filtrosCli.dias.includes(id);
        $(this).toggleClass("is-on", on).attr("aria-pressed", on);
    });
    $("#clChipsSemanas .cl-chip").each(function () {
        const id = Number($(this).data("id"));
        const on = filtrosCli.semanas.includes(id);
        $(this).toggleClass("is-on", on).attr("aria-pressed", on);
    });
    setSelectFiltroCliente("#clFiltroCamion", filtrosCli.camion);
    $("#clFiltroZona").val(filtrosCli.zona || "");
    setSelectFiltroCliente("#clFiltroTipo", filtrosCli.tipoGenerador);
    setSelectFiltroCliente("#clFiltroCalificacion", filtrosCli.calificacion);
    $("#clFiltroLocalidad").val(filtrosCli.localidad || "");
    $("#clFiltroNro").val(filtrosCli.nroCliente || "");
    setSelectFiltroCliente("#clFiltroContacto", filtrosCli.contacto);
    syncSituacionVisual();
    syncCoberturaVisual();
}

function nombreCatalogo(lista, id) {
    const item = (lista || []).find(x => idItemLista(x) === Number(id));
    return item ? nombreItemLista(item) : "";
}

function renderResumenFiltrosCliente(payload) {
    const $box = $("#clFiltrosResumen");
    if (!$box.length) return;

    const pills = [];
    if (!filtrosCli.cobertura || filtrosCli.cobertura !== "sin") {
        filtrosCli.dias.forEach(id => {
            const nombre = nombreCatalogo(catFiltrosCli.dias, id);
            pills.push({ kind: "dia", id, label: etiquetaDiaCorta(nombre) || nombre || ("Dia " + id) });
        });
        filtrosCli.semanas.forEach(id => {
            const nombre = nombreCatalogo(catFiltrosCli.semanas, id);
            pills.push({ kind: "semana", id, label: etiquetaSemanaCorta(nombre) || nombre || ("Semana " + id) });
        });
        if (payload.RecCamion) {
            pills.push({
                kind: "camion",
                label: nombreCatalogo(catFiltrosCli.camiones, payload.RecCamion) || "Camion"
            });
        }
        if (payload.RecZona) pills.push({ kind: "zona", label: "Zona: " + payload.RecZona });
    }
    if (payload.RecCobertura === "con") pills.push({ kind: "cobertura", label: "Con recorrido" });
    if (payload.RecCobertura === "sin") pills.push({ kind: "cobertura", label: "Sin recorrido" });

    const sit = SITUACIONES_CLI.find(s => s.id === payload.Situacion);
    if (sit) pills.push({ kind: "situacion", label: sit.label });
    if (payload.TipoGenerador) {
        pills.push({
            kind: "tipo",
            label: nombreCatalogo(catFiltrosCli.tipos, payload.TipoGenerador) || "Tipo generador"
        });
    }
    if (payload.Calificacion) {
        pills.push({
            kind: "calificacion",
            label: nombreCatalogo(catFiltrosCli.calificaciones, payload.Calificacion) || "Calificacion"
        });
    }
    if (payload.Localidad) pills.push({ kind: "localidad", label: payload.Localidad });
    if (payload.NroCliente) pills.push({ kind: "nro", label: "Nro. " + payload.NroCliente });
    if (payload.Contrato === "vigente") pills.push({ kind: "contrato", label: "Contrato vigente" });
    if (payload.Contrato === "vencido") pills.push({ kind: "contrato", label: "Contrato vencido" });
    if (payload.Contrato === "sin") pills.push({ kind: "contrato", label: "Sin contrato" });
    if (payload.Contacto === "conemail") pills.push({ kind: "contacto", label: "Con email" });
    if (payload.Contacto === "sinemail") pills.push({ kind: "contacto", label: "Sin email" });
    if (payload.Contacto === "contel") pills.push({ kind: "contacto", label: "Con telefono" });
    if (payload.Contacto === "sintel") pills.push({ kind: "contacto", label: "Sin telefono" });

    if (!pills.length) {
        $box.addClass("d-none").empty();
        return;
    }

    $box.removeClass("d-none").html(
        `<span class="cl-resumen-label"><i class="fa fa-filter"></i> Viendo</span>` +
        pills.map(p => `<button type="button" class="cl-resumen-pill" data-kind="${escapeHtmlCl(p.kind)}" data-id="${p.id ?? ""}">
            <span>${escapeHtmlCl(p.label)}</span><i class="fa fa-times" aria-hidden="true"></i>
        </button>`).join("") +
        `<button type="button" class="cl-resumen-clear">Limpiar</button>`
    );
}

function quitarPillFiltroCliente(kind, id) {
    const num = Number(id);
    if (kind === "dia") filtrosCli.dias = filtrosCli.dias.filter(x => x !== num);
    else if (kind === "semana") filtrosCli.semanas = filtrosCli.semanas.filter(x => x !== num);
    else if (kind === "camion") filtrosCli.camion = "";
    else if (kind === "zona") filtrosCli.zona = "";
    else if (kind === "cobertura") filtrosCli.cobertura = "";
    else if (kind === "situacion") filtrosCli.situacion = "";
    else if (kind === "tipo") filtrosCli.tipoGenerador = "";
    else if (kind === "calificacion") filtrosCli.calificacion = "";
    else if (kind === "localidad") filtrosCli.localidad = "";
    else if (kind === "nro") filtrosCli.nroCliente = "";
    else if (kind === "contrato") filtrosCli.contrato = "";
    else if (kind === "contacto") filtrosCli.contacto = "";
    volcarFiltrosExtraEnUi();
    aplicarFiltrosExtraClientes();
}

function toggleIdFiltro(lista, id) {
    const n = Number(id);
    const i = lista.indexOf(n);
    if (i >= 0) lista.splice(i, 1);
    else lista.push(n);
}

function opcionesSelectFiltro(items, placeholder, textFn) {
    const opts = [`<option value="">${escapeHtmlCl(placeholder)}</option>`];
    (items || []).forEach(item => {
        const id = idItemLista(item);
        const texto = textFn ? textFn(item) : nombreItemLista(item);
        if (!id || !texto) return;
        opts.push(`<option value="${id}">${escapeHtmlCl(texto)}</option>`);
    });
    return opts.join("");
}

function htmlChips(items, cortoFn) {
    if (!items.length) return `<span class="cl-filtro-vacio">Sin datos</span>`;
    return items.map(item => {
        const id = idItemLista(item);
        const nombre = nombreItemLista(item);
        if (!id || !nombre) return "";
        const corto = cortoFn(nombre);
        return `<button type="button" class="cl-chip" data-id="${id}" title="${escapeHtmlCl(nombre)}" aria-pressed="false">${escapeHtmlCl(corto)}</button>`;
    }).join("");
}

async function montarFiltrosExtraClientes() {
    const $panel = $("#panelFiltrosGrid_grd_Clientes");
    if (!$panel.length || $("#clFiltrosExtra").length) return;

    const [dias, semanas, camiones, tipos, calificaciones] = await Promise.all([
        fetchListaFiltroCliente("/Dias/Lista"),
        fetchListaFiltroCliente("/Semanas/Lista"),
        fetchListaFiltroCliente("/Camiones/Lista"),
        fetchListaFiltroCliente("/ClientesTiposGenerador/Lista"),
        fetchListaFiltroCliente("/ClientesCalificaciones/Lista")
    ]);

    const ordenDia = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
    catFiltrosCli.dias = dias.slice().sort((a, b) => {
        const ia = ordenDia.indexOf(normNombreFiltro(nombreItemLista(a)));
        const ib = ordenDia.indexOf(normNombreFiltro(nombreItemLista(b)));
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    catFiltrosCli.semanas = semanas.slice().sort((a, b) => idItemLista(a) - idItemLista(b));
    catFiltrosCli.camiones = camiones;
    catFiltrosCli.tipos = tipos;
    catFiltrosCli.calificaciones = calificaciones;

    const html = `
        <div class="cl-filtros-extra" id="clFiltrosExtra">
            <section class="cl-filtro-sec">
                <div class="cl-filtro-sec-h">
                    <i class="fa fa-road"></i>
                    <div>
                        <strong>Recorrido</strong>
                        <span>Dia, semana, camion o zona. Se puede combinar.</span>
                    </div>
                </div>
                <div class="cl-rec-detalle">
                    <div class="cl-filtro-line">
                        <span class="cl-filtro-k">Dia</span>
                        <div class="cl-chips" id="clChipsDias">${htmlChips(catFiltrosCli.dias, etiquetaDiaCorta)}</div>
                    </div>
                    <div class="cl-filtro-line">
                        <span class="cl-filtro-k">Semana</span>
                        <div class="cl-chips" id="clChipsSemanas">${htmlChips(catFiltrosCli.semanas, etiquetaSemanaCorta)}</div>
                    </div>
                    <div class="cl-filtro-grid">
                        <label class="cl-filtro-field">
                            <span>Camion</span>
                            <select id="clFiltroCamion" class="cl-filtro-select">${opcionesSelectFiltro(camiones, "Todos los camiones")}</select>
                        </label>
                        <label class="cl-filtro-field">
                            <span>Zona</span>
                            <input id="clFiltroZona" class="cl-filtro-input" type="text" placeholder="Norte, Centro..." autocomplete="off">
                        </label>
                    </div>
                </div>
                <div class="cl-filtro-line cl-filtro-line-seg">
                    <span class="cl-filtro-k">En ruta</span>
                    <div class="cl-seg" id="clSegCobertura">
                        <button type="button" data-val="" class="is-on" aria-pressed="true">Todos</button>
                        <button type="button" data-val="con" aria-pressed="false">Con recorrido</button>
                        <button type="button" data-val="sin" aria-pressed="false">Sin recorrido</button>
                    </div>
                </div>
            </section>
            <section class="cl-filtro-sec">
                <div class="cl-filtro-sec-h">
                    <i class="fa fa-user"></i>
                    <div>
                        <strong>Cliente</strong>
                        <span>Situacion, contrato, zona y contacto.</span>
                    </div>
                </div>
                <div class="cl-filtro-line">
                    <span class="cl-filtro-k">Situacion</span>
                    <div class="cl-chips" id="clChipsSituacion">
                        ${SITUACIONES_CLI.map(s => `<button type="button" class="cl-chip cl-chip-sit cl-chip-sit-${s.id || "todas"}${s.id ? "" : " is-on"}" data-id="${s.id}" aria-pressed="${s.id ? "false" : "true"}">${s.label}</button>`).join("")}
                    </div>
                </div>
                <div class="cl-filtro-grid">
                    <label class="cl-filtro-field">
                        <span>Tipo generador</span>
                        <select id="clFiltroTipo" class="cl-filtro-select">${opcionesSelectFiltro(tipos, "Todos", item => nombreItemLista(item))}</select>
                    </label>
                    <label class="cl-filtro-field">
                        <span>Calificacion</span>
                        <select id="clFiltroCalificacion" class="cl-filtro-select">${opcionesSelectFiltro(calificaciones, "Todas")}</select>
                    </label>
                    <label class="cl-filtro-field">
                        <span>Localidad o domicilio</span>
                        <input id="clFiltroLocalidad" class="cl-filtro-input" type="text" placeholder="Localidad, partido, calle..." autocomplete="off">
                    </label>
                    <label class="cl-filtro-field">
                        <span>Nro. cliente</span>
                        <input id="clFiltroNro" class="cl-filtro-input" type="text" inputmode="numeric" placeholder="Ej. 120" autocomplete="off">
                    </label>
                    <label class="cl-filtro-field">
                        <span>Contacto</span>
                        <select id="clFiltroContacto" class="cl-filtro-select">
                            <option value="">Todos</option>
                            <option value="conemail">Con email</option>
                            <option value="sinemail">Sin email</option>
                            <option value="contel">Con telefono</option>
                            <option value="sintel">Sin telefono</option>
                        </select>
                    </label>
                </div>
                <div class="cl-filtro-line cl-filtro-line-seg">
                    <span class="cl-filtro-k">Contrato</span>
                    <div class="cl-seg" id="clSegContrato">
                        <button type="button" data-val="" class="is-on" aria-pressed="true">Todos</button>
                        <button type="button" data-val="vigente" aria-pressed="false">Vigente</button>
                        <button type="button" data-val="vencido" aria-pressed="false">Vencido</button>
                        <button type="button" data-val="sin" aria-pressed="false">Sin contrato</button>
                    </div>
                </div>
            </section>
        </div>`;

    const $actions = $panel.find(".rp-filtros-actions");
    if ($actions.length) $actions.before(html);
    else $panel.find(".rp-filtros-body").append(html);

    if (!$("#clFiltrosResumen").length)
        $panel.after(`<div id="clFiltrosResumen" class="cl-filtros-resumen d-none"></div>`);

    $panel.off(".clExtra");
    $panel.on("click.clExtra", "#clChipsDias .cl-chip", function () {
        toggleIdFiltro(filtrosCli.dias, $(this).data("id"));
        volcarFiltrosExtraEnUi();
        aplicarFiltrosExtraClientes();
    });
    $panel.on("click.clExtra", "#clChipsSemanas .cl-chip", function () {
        toggleIdFiltro(filtrosCli.semanas, $(this).data("id"));
        volcarFiltrosExtraEnUi();
        aplicarFiltrosExtraClientes();
    });
    $panel.on("click.clExtra", "#clChipsSituacion .cl-chip", function () {
        toggleSituacionCliente(String($(this).attr("data-id") ?? ""));
    });
    $panel.on("click.clExtra", "#clSegCobertura button", function () {
        filtrosCli.cobertura = String($(this).attr("data-val") ?? "");
        syncCoberturaVisual();
        aplicarFiltrosExtraClientes();
    });
    $panel.on("click.clExtra", "#clSegContrato button", function () {
        filtrosCli.contrato = String($(this).attr("data-val") ?? "");
        syncCoberturaVisual();
        aplicarFiltrosExtraClientes();
    });
    $panel.on("change.clExtra", "#clFiltroCamion", function () {
        filtrosCli.camion = this.value || "";
        aplicarFiltrosExtraClientes();
    });
    $panel.on("change.clExtra", "#clFiltroTipo", function () {
        filtrosCli.tipoGenerador = this.value || "";
        aplicarFiltrosExtraClientes();
    });
    $panel.on("change.clExtra", "#clFiltroCalificacion", function () {
        filtrosCli.calificacion = this.value || "";
        aplicarFiltrosExtraClientes();
    });
    $panel.on("change.clExtra", "#clFiltroContacto", function () {
        filtrosCli.contacto = this.value || "";
        aplicarFiltrosExtraClientes();
    });
    $panel.on("input.clExtra", "#clFiltroZona", function () {
        filtrosCli.zona = this.value || "";
        aplicarFiltrosExtraClientesDebounced();
    });
    $panel.on("input.clExtra", "#clFiltroLocalidad", function () {
        filtrosCli.localidad = this.value || "";
        aplicarFiltrosExtraClientesDebounced();
    });
    $panel.on("input.clExtra", "#clFiltroNro", function () {
        filtrosCli.nroCliente = this.value || "";
        aplicarFiltrosExtraClientesDebounced();
    });

    $("#clFiltrosResumen")
        .off(".clExtra")
        .on("click.clExtra", ".cl-resumen-pill", function (e) {
            e.preventDefault();
            e.stopPropagation();
            quitarPillFiltroCliente(String($(this).data("kind") || ""), $(this).data("id"));
        })
        .on("click.clExtra", ".cl-resumen-clear", function (e) {
            e.preventDefault();
            const $btn = $panel.find(".rp-grid-filtros-limpiar");
            if ($btn.length) $btn.trigger("click");
            else {
                resetFiltrosExtraClientes();
                if (gridClientes) gridClientes.draw();
            }
        });

    $("#grd_Clientes")
        .off("rp:filtros-limpiados.clExtra")
        .on("rp:filtros-limpiados.clExtra", function () {
            resetFiltrosExtraClientes();
        });

    initSelectsFiltroCliente($("#clFiltrosExtra"));
    volcarFiltrosExtraEnUi();
}
