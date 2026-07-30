let gridProveedores;

const URL_GESTION_PROVEEDOR = id => id > 0 ? `/Proveedores/Gestion?id=${id}` : "/Proveedores/Gestion";

const columnConfig = [
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'select_local' },
    { index: 5, filterType: 'select_local' },
    { index: 6, filterType: 'text' },
    { index: 7, filterType: 'text' },
    { index: 8, filterType: 'activo' }
];

registrarFiltrosGrilla('grd_Proveedores', columnConfig, {
    defaultActivoModo: 'todos',
    initSelect2: ($el) => inicializarSelect2Filtro($el)
});

function columnDefsProveedoresGrid() {
    return [
        { targets: 0, className: "rp-col-acciones", width: "118px", orderable: false },
        { targets: 1, className: "rp-col-id", width: "88px" },
        { targets: 2, className: "rp-col-nombre", width: "260px" },
        { targets: 3, className: "rp-col-cuit", width: "145px" },
        { targets: 4, className: "rp-col-iva", width: "170px" },
        { targets: 5, className: "rp-col-banco", width: "155px" },
        { targets: 6, className: "rp-col-tel", width: "135px" },
        { targets: 7, className: "rp-col-email", width: "280px" },
        { targets: 8, className: "rp-col-activo", width: "108px" }
    ];
}

$(document).ready(() => {
    window.nuevoProveedor = () => { window.location.href = URL_GESTION_PROVEEDOR(0); };
    window.editarProveedor = id => { window.location.href = URL_GESTION_PROVEEDOR(id); };
    window.verProveedor = id => { window.location.href = URL_GESTION_PROVEEDOR(id); };
    window.eliminarProveedor = eliminarProveedorIndex;

    if (typeof registrarGrillaDobleClick === "function") {
        registrarGrillaDobleClick("grd_Proveedores", id => {
            window.location.href = URL_GESTION_PROVEEDOR(id);
        });
    }

    listaProveedores();
});

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

async function eliminarProveedorIndex(id) {
    if (typeof ejecutarEliminacionEntidad !== "function") {
        errorModal("No esta disponible el asistente de eliminacion.");
        return;
    }

    const resultado = await ejecutarEliminacionEntidad({
        entidadLabel: "este proveedor",
        urlDependencias: `/Proveedores/DependenciasEliminar?id=${id}`,
        urlEliminar: cascada => `/Proveedores/Eliminar?id=${id}&cascada=${cascada ? "true" : "false"}`,
        headers: { Authorization: "Bearer " + token },
        fetchJson: async (url, options) => {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
            return await response.json();
        }
    });

    if (resultado.accion !== "ok") return;
    exitoModal(resultado.data?.mensaje ?? "Proveedor eliminado correctamente");
    await listaProveedores();
}

async function listaProveedores() {
    let paginaActual = gridProveedores != null ? gridProveedores.page() : 0;

    const response = await fetch(`/Proveedores/Lista`, {
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
        gridProveedores.page(paginaActual).draw('page');
    }
}

async function configurarDataTable(data) {

    if (!gridProveedores) {

        gridProveedores = $('#grd_Proveedores').DataTable({
            data: data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            autoWidth: false,
            columnDefs: columnDefsProveedoresGrid(),
            scrollX: true,
            scrollCollapse: true,
            columns: [
                columnaGridAcciones({
                    ver: "verProveedor",
                    editar: "editarProveedor",
                    eliminar: "eliminarProveedor"
                }, "Proveedores"),
                columnaGridId(),
                { data: 'Nombre', className: 'rp-col-nombre' },
                { data: 'Cuit', className: 'rp-col-cuit' },
                { data: 'CondicionIva', className: 'rp-col-iva' },
                { data: 'Banco', className: 'rp-col-banco' },
                { data: 'Telefono', className: 'rp-col-tel' },
                { data: 'Email', className: 'rp-col-email' },
                typeof columnaGridActivo === "function" ? columnaGridActivo("Proveedores") : { data: "Activo" },
            ],
            createdRow: function (row, rowData) {
                if (typeof createdRowEstiloActivoGrilla === "function") {
                    createdRowEstiloActivoGrilla(row, rowData);
                }
            },
            dom: 'Bfrtip',
            buttons: getBotonesExportacion(gridProveedores, "Proveedores"),
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                await initFiltrosGrillaListaEnInitComplete(api, '#grd_Proveedores', columnConfig, {
                    defaultActivoModo: 'todos',
                    initSelect2: ($el) => inicializarSelect2Filtro($el)
                }, {
                    afterFilters: () => {
                        configurarOpcionesColumnas();
                        actualizarKpis(data);
                    },
                    afterAdjust: () => {
                        setTimeout(() => ajustarColumnasGrillaLista(api, '#grd_Proveedores'), 200);
                    }
                });
            }
        });

    } else {
        gridProveedores.clear().rows.add(data).draw();
        actualizarKpis(data);
    }
}

function configurarOpcionesColumnas() {
    const grid = $('#grd_Proveedores').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');
    const storageKey = `Proveedores_Columnas`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        if (typeof esColumnaMenuGrilla === "function" ? esColumnaMenuGrilla(col) : (col.data && col.data !== "Id")) {
            const isChecked = savedConfig[`col_${index}`] !== undefined
                ? savedConfig[`col_${index}`]
                : true;

            grid.column(index).visible(isChecked);

            const name = $('#grd_Proveedores thead tr').first().find('th').eq(index).text();

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
        ajustarColumnasGrillaLista(grid, '#grd_Proveedores');
    });
}

function actualizarKpis(data) {
    const rows = Array.isArray(data) ? data : [];
    $('#kpiCantProveedores').text(rows.length);
    $('#kpiActivosProveedores').text(rows.filter(x => x.Activo !== false && x.Activo !== 0).length);
}

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
