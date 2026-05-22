let gridClientes;
let clienteModal;

const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'select', fetchDataFunc: listaSucursalesFilter },
    { index: 4, filterType: 'select', fetchDataFunc: listaProvinciasFilter },
    { index: 5, filterType: 'select', fetchDataFunc: listaProfesionesFilter },
    { index: 6, filterType: 'select', fetchDataFunc: listaCondicionesIvaFilter },
    { index: 7, filterType: 'text' },
    { index: 8, filterType: 'text' }
];

$(document).ready(() => {

    const modalEl = document.querySelector("[data-cliente-modal]");
    if (!modalEl) {
        console.error("No se encontró [data-cliente-modal]. Verifique que el partial M_Clientes esté en la vista.");
        return;
    }

    clienteModal = new ClienteModal(modalEl, {
        token: token,
        onSaved: async () => { await listaClientes(); },
        onDeleted: async () => { await listaClientes(); }
    });

    window.verCliente = (id) => clienteModal.abrirVer(id);
    window.editarCliente = (id) => clienteModal.abrirEditar(id);
    window.eliminarCliente = (id) => clienteModal.eliminar(id);
    window.verFicha = (id) => clienteModal.abrirVer(id);
    window.nuevoCliente = () => clienteModal.abrirNuevo();

    $(document)
        .off("click.select2fix.clientes")
        .on("click.select2fix.clientes", ".select2-container--default .select2-selection--single", function () {
            const $select = $(this).closest(".select2-container").prev("select");
            if ($select.length) {
                if ($select.data("select2") && $select.data("select2").isOpen()) return;
                $select.select2("open");
            }
        });

    listaClientes();
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

        const $thead = $('#grd_Clientes thead');
        if ($thead.find('tr.filters').length === 0) {
            $thead.find('tr').first().clone(true).addClass('filters').appendTo($thead);
        }

        gridClientes = $('#grd_Clientes').DataTable({
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
                            ver: "verCliente",
                            editar: "editarCliente",
                            eliminar: "eliminarCliente"
                        }, "Clientes");
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre' },
                { data: 'Cuit' },
                { data: 'Sucursal' },
                { data: 'Provincia' },
                { data: 'Profesion' },
                { data: 'CondicionIva' },
                { data: 'Telefono' },
                { data: 'Email' },
            ],
            dom: 'Bfrtip',
            buttons: getBotonesExportacion(gridClientes, "Clientes"),
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
                            <select class="rp-filter-select" style="width:100%"></select>
                        `).appendTo(cell);

                        if (config.index === 3 && typeof prepararFiltroSucursalDataTable === "function") {
                            await prepararFiltroSucursalDataTable($select, api, config.index, inicializarSelect2Filtro);
                        } else {
                            const datos = await config.fetchDataFunc();
                            $select.append(`<option value="">Todos</option>`);
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
                        }
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
        if (col.data && col.data !== "Id") {
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
    $('#kpiCantClientes').text(cant);
}

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
