let gridProductos;
let productoModal;

const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'select', fetchDataFunc: listaCategoriasFilter },
    { index: 3, filterType: 'select', fetchDataFunc: listaMedidasFilter },
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'text' }
];

$(document).ready(() => {

    const modalEl = document.querySelector("[data-producto-modal]");
    if (!modalEl) {
        console.error("No se encontró [data-producto-modal]. Verifique que el partial M_Productos esté en la vista.");
        return;
    }

    productoModal = new ProductoModal(modalEl, {
        token: token,
        onSaved: async () => { await listaProductos(); },
        onDeleted: async () => { await listaProductos(); }
    });

    window.verProducto = (id) => productoModal.abrirVer(id);
    window.editarProducto = (id) => productoModal.abrirEditar(id);
    window.eliminarProducto = (id) => productoModal.eliminar(id);
    window.verFicha = (id) => productoModal.abrirVer(id);
    window.nuevoProducto = () => productoModal.abrirNuevo();

    $(document)
        .off("click.select2fix.productos")
        .on("click.select2fix.productos", ".select2-container--default .select2-selection--single", function () {
            const $select = $(this).closest(".select2-container").prev("select");
            if ($select.length) {
                if ($select.data("select2") && $select.data("select2").isOpen()) return;
                $select.select2("open");
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

        const $thead = $('#grd_Productos thead');
        if ($thead.find('tr.filters').length === 0) {
            $thead.find('tr').first().clone(true).addClass('filters').appendTo($thead);
        }

        gridProductos = $('#grd_Productos').DataTable({
            data: data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: true,
            scrollCollapse: true,
            columns: [
                {
                    data: "Id",
                    title: '',
                    width: "1%",
                    render: function (data) {
                        return renderAccionesGrid(data, {
                            ver: "verProducto",
                            editar: "editarProducto",
                            eliminar: "eliminarProducto"
                        }, "Productos");
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre' },
                { data: 'Categoria' },
                { data: 'Medida' },
                {
                    data: 'CostoUnitario',
                    render: (data) => formatearMoneda(data)
                },
                { data: 'StockMinimo' },
            ],
            dom: 'Bfrtip',
            buttons: getBotonesExportacion(gridProductos, "Productos"),
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();

                for (const config of columnConfig) {
                    const cell = $('.filters th').eq(config.index);
                    if (!cell.length) continue;
                    cell.empty();

                    if (config.filterType === 'select') {
                        const $select = $(`
                            <select class="rp-filter-select" style="width:100%">
                                <option value="">Todos</option>
                            </select>
                        `).appendTo(cell);

                        const datos = await config.fetchDataFunc();
                        (datos || []).forEach(item => {
                            $select.append(`<option value="${item.Id}">${item.Nombre}</option>`);
                        });

                        inicializarSelect2Filtro($select);

                        $select.on('select2:clear', function () {
                            api.column(config.index).search('').draw(false);
                        });

                        $select.on('change', function () {
                            const value = $(this).val();
                            if (!value) {
                                api.column(config.index).search('').draw(false);
                                return;
                            }
                            const text = $(this).find('option:selected').text();
                            api.column(config.index)
                                .search('^' + escapeRegex(text) + '$', true, false)
                                .draw(false);
                        });
                    } else {
                        $('<input class="rp-filter-input" type="text" placeholder="Buscar...">')
                            .appendTo(cell)
                            .on('keyup change', function () {
                                api.column(config.index).search(this.value).draw(false);
                            });
                    }
                }

                $('.filters th').eq(0).html('');
                configurarOpcionesColumnas();
                actualizarKpis(data);
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

function configurarOpcionesColumnas() {
    const grid = $('#grd_Productos').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');
    const storageKey = `Productos_Columnas`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") {
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
