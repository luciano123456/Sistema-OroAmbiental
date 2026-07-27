let gridProductos;
let productoModal;

const columnConfig = [
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'select', fetchDataFunc: listaCategoriasFilter },
    { index: 4, filterType: 'select', fetchDataFunc: listaMedidasFilter },
    { index: 5, filterType: 'text' },
    { index: 6, filterType: 'text' },
    { index: 7, filterType: 'text' },
    { index: 8, filterType: 'select', fetchDataFunc: listaEstadosStockFilter }
];

registrarFiltrosGrilla('grd_Productos', columnConfig, {
    initSelect2: ($el) => inicializarSelect2Filtro($el)
});

const ESTADOS_STOCK_ICONOS = {
    sin_stock: "fa-times-circle",
    bajo: "fa-exclamation-triangle",
    ok: "fa-check-circle",
    normal: "fa-cube"
};

$(document).ready(() => {

    productoModal = typeof initProductoModal === "function"
        ? initProductoModal({
            token: token,
            onSaved: async () => { await listaProductos(); },
            onDeleted: async () => { await listaProductos(); }
        })
        : null;

    if (!productoModal) return;

    $(document)
        .off("click.select2fix.productos")
        .on("click.select2fix.productos", ".select2-container--default .select2-selection--single", function () {
            const $select = $(this).closest(".select2-container").prev("select");
            if ($select.length) {
                if ($select.data("select2") && $select.data("select2").isOpen()) return;
                $select.select2("open");
            }
        });

    $('#grd_Productos').on('click', '.prod-btn-historial-grid', function (e) {
        e.stopPropagation();
        const id = parseInt($(this).data('id'), 10);
        const nombre = $(this).data('nombre') || '';
        if (id > 0 && typeof verHistorialCostoProducto === 'function') {
            verHistorialCostoProducto(id, nombre);
        }
    });

    listaProductos();
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

function formatearMoneda(valor) {
    const n = parseFloat(valor);
    if (Number.isNaN(n)) return valor ?? "";
    return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function listaProductos() {
    let paginaActual = gridProductos != null ? gridProductos.page() : 0;

    const response = await fetch(`/Productos/Lista`, {
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
        gridProductos.page(paginaActual).draw('page');
    }
}

async function configurarDataTable(data) {

    if (!gridProductos) {

        gridProductos = $('#grd_Productos').DataTable({
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
                    ver: "verProducto",
                    editar: "editarProducto",
                    eliminar: "eliminarProducto"
                }, "Productos"),
                columnaGridId(),
                { data: 'Nombre' },
                { data: 'Categoria' },
                { data: 'Medida' },
                {
                    data: 'CostoUnitario',
                    orderable: true,
                    render: (data, type, row) => {
                        const monto = formatearMoneda(data);
                        const id = row?.Id ?? 0;
                        if (!id) return monto;
                        const nombreAttr = String(row?.Nombre || "")
                            .replace(/&/g, "&amp;")
                            .replace(/"/g, "&quot;")
                            .replace(/</g, "&lt;");
                        return `<span class="prod-costo-cell">
                            <span>${monto}</span>
                            <button type="button"
                                    class="btn prod-btn-historial-grid"
                                    data-id="${id}"
                                    data-nombre="${nombreAttr}"
                                    title="Ver historial de costo">
                                <i class="fa fa-eye"></i>
                            </button>
                        </span>`;
                    }
                },
                {
                    data: 'StockTotal',
                    render: (data, type, row) => renderStockCantidad(data, row)
                },
                { data: 'StockMinimo' },
                {
                    data: 'StockEstadoTexto',
                    orderable: true,
                    render: (data, type, row) => renderEstadoStockBadge(row)
                },
                typeof columnaGridActivo === "function" ? columnaGridActivo("Productos") : { data: "Activo" },
            ],
            createdRow: function (row, data) {
                if (typeof createdRowEstiloActivoGrilla === "function") {
                    createdRowEstiloActivoGrilla(row, data);
                }
            },
            dom: 'Bfrtip',
            buttons: getBotonesExportacion(gridProductos, "Productos"),
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                await armarFiltrosGrillaLista(api, '#grd_Productos', columnConfig, {
                    initSelect2: ($el) => inicializarSelect2Filtro($el)
                });
                configurarOpcionesColumnas();
                actualizarKpis(data);
                api.draw(false);
            }
        });

    } else {
        gridProductos.clear().rows.add(data).draw();
        actualizarKpis(data);
    }
}

async function listaCategoriasFilter() {
    const response = await fetch(`/ProductosCategorias/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    return await response.json();
}

async function listaMedidasFilter() {
    const response = await fetch(`/UnidadesMedida/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    return await response.json();
}

async function listaEstadosStockFilter() {
    return [
        { Nombre: "Sin stock" },
        { Nombre: "Bajo mínimo" },
        { Nombre: "Stock OK" },
        { Nombre: "Disponible" }
    ];
}

function renderStockCantidad(valor, row) {
    const n = parseFloat(valor);
    const texto = typeof formatearNumero === "function"
        ? formatearNumero(Number.isNaN(n) ? 0 : n)
        : (Number.isNaN(n) ? "0" : String(n));

    const codigo = (row?.StockEstadoCodigo || "").toLowerCase();
    let cls = "";
    if (codigo === "sin_stock") cls = "prod-stock-cantidad--sin";
    else if (codigo === "bajo") cls = "prod-stock-cantidad--bajo";

    return cls ? `<span class="${cls}">${texto}</span>` : texto;
}

function renderEstadoStockBadge(row) {
    const codigo = (row?.StockEstadoCodigo || "sin_stock").toLowerCase();
    const texto = row?.StockEstadoTexto || "Sin stock";
    const icono = ESTADOS_STOCK_ICONOS[codigo] || "fa-circle";
    return `<span class="prod-stock-estado prod-stock-estado--${codigo}" title="${texto}">
        <i class="fa ${icono}"></i>${texto}
    </span>`;
}

function configurarOpcionesColumnas() {
    const grid = $('#grd_Productos').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');
    const storageKey = `Productos_Columnas`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        if (typeof esColumnaMenuGrilla === "function" ? esColumnaMenuGrilla(col) : (col.data && col.data !== "Id")) {
            const isChecked = savedConfig[`col_${index}`] !== undefined
                ? savedConfig[`col_${index}`]
                : true;

            grid.column(index).visible(isChecked);

            const name = $('#grd_Productos thead tr').first().find('th').eq(index).text();

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
    $('#kpiCantProductos').text(cant);
}

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
