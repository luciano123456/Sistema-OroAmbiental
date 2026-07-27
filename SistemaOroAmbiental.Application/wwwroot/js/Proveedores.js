let gridProveedores;
let proveedorModal;

const columnConfig = [
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'select', fetchDataFunc: listaCondicionesIvaFilter },
    { index: 5, filterType: 'select', fetchDataFunc: listaBancosFilter },
    { index: 6, filterType: 'text' },
    { index: 7, filterType: 'text' }
];

registrarFiltrosGrilla('grd_Proveedores', columnConfig, {
    initSelect2: ($el) => inicializarSelect2Filtro($el)
});

$(document).ready(() => {

    proveedorModal = typeof initProveedorModal === "function"
        ? initProveedorModal({
            token: token,
            onSaved: async () => { await listaProveedores(); },
            onDeleted: async () => { await listaProveedores(); }
        })
        : null;

    if (!proveedorModal) return;

    $(document)
        .off("click.select2fix.proveedores")
        .on("click.select2fix.proveedores", ".select2-container--default .select2-selection--single", function () {
            const $select = $(this).closest(".select2-container").prev("select");
            if ($select.length) {
                if ($select.data("select2") && $select.data("select2").isOpen()) return;
                $select.select2("open");
            }
        });

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
            columnDefs: typeof columnDefsGridLista === "function" ? columnDefsGridLista() : [],
            scrollX: true,
            scrollCollapse: true,
            columns: [
                columnaGridAcciones({
                    ver: "verProveedor",
                    editar: "editarProveedor",
                    eliminar: "eliminarProveedor"
                }, "Proveedores"),
                columnaGridId(),
                { data: 'Nombre' },
                { data: 'Cuit' },
                { data: 'CondicionIva' },
                { data: 'Banco' },
                { data: 'Telefono' },
                { data: 'Email' },
                typeof columnaGridActivo === "function" ? columnaGridActivo("Proveedores") : { data: "Activo" },
            ],
            createdRow: function (row, data) {
                if (typeof createdRowEstiloActivoGrilla === "function") {
                    createdRowEstiloActivoGrilla(row, data);
                }
            },
            dom: 'Bfrtip',
            buttons: getBotonesExportacion(gridProveedores, "Proveedores"),
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                await armarFiltrosGrillaLista(api, '#grd_Proveedores', columnConfig, {
                    initSelect2: ($el) => inicializarSelect2Filtro($el)
                });
                configurarOpcionesColumnas();
                actualizarKpis(data);
                api.draw(false);
            }
        });

    } else {
        gridProveedores.clear().rows.add(data).draw();
        actualizarKpis(data);
    }
}

async function listaCondicionesIvaFilter() {
    const response = await fetch(`/CondicionesIva/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    return await response.json();
}

async function listaBancosFilter() {
    const response = await fetch(`/Bancos/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    return await response.json();
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
    });
}

function actualizarKpis(data) {
    const cant = Array.isArray(data) ? data.length : 0;
    $('#kpiCantProveedores').text(cant);
}

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
