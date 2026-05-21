let gridProductoras;
let productoraModal;

/**
 * Columnas:
 * 0 Acciones
 * 1 Nombre
 * 2 País (SELECT2 remoto)
 * 3 Dni (TEXT)
 * 4 Tipo Doc (SELECT2 remoto)
 * 5 Nro Doc (TEXT)
 * 6 Condición IVA (SELECT2 remoto)
 * 7 Provincia (SELECT2 remoto)
 * 8 Teléfono (TEXT)
 * 9 Email (TEXT)
 */
const columnConfig = [
    { index: 1, filterType: 'text' }, // Nombre
    { index: 2, filterType: 'select', fetchDataFunc: listaPaisesFilter }, // País
    { index: 3, filterType: 'text' }, // Dni
    { index: 4, filterType: 'select', fetchDataFunc: listaTiposDocumentoFilter }, // Tipo Doc
    { index: 5, filterType: 'text' }, // Nro Doc
    { index: 6, filterType: 'select', fetchDataFunc: listaCondicionesIvaFilter }, // Condición IVA
    { index: 7, filterType: 'select', fetchDataFunc: listaProvinciasFilter }, // Provincia
    { index: 8, filterType: 'text' }, // Teléfono
    { index: 9, filterType: 'text' }  // Email
];

$(document).ready(() => {

    Permisos.init();
    Permisos.aplicarUI("Productoras");

    productoraModal = new ProductoraModal(document.body, {
        token: token,

        onSaved: async () => {
            await listaProductoras();
        },

        onDeleted: async () => {
            await listaProductoras();
        }
    });

    window.productoraModal = productoraModal;

    window.nuevaProductora = () => productoraModal.abrirNuevo();
    window.editarProductora = (id) => productoraModal.abrirEditar(id);
    window.eliminarProductora = (id) => productoraModal.eliminar(id);
    window.verFicha = (id) => productoraModal.abrirVer(id);
    window.verFichaProductora = (id) => productoraModal.abrirVer(id);

    listaProductoras();
});

/* =========================
   SELECT2 HELPERS
========================= */

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

/* =========================
   LISTA + DATATABLE
========================= */

async function listaProductoras() {
    let paginaActual = gridProductoras != null ? gridProductoras.page() : 0;

    const response = await fetch(`/Productoras/Lista`, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Error en la solicitud: ${response.statusText}`);
    }

    const data = await response.json();
    await configurarDataTable(data);

    if (paginaActual > 0) {
        gridProductoras.page(paginaActual).draw('page');
    }
}

async function configurarDataTable(data) {

    if (!gridProductoras) {

        const $thead = $('#grd_Productoras thead');

        if ($thead.find('tr.filters').length === 0) {
            $thead.find('tr').first().clone(true).addClass('filters').appendTo($thead);
        }

        gridProductoras = $('#grd_Productoras').DataTable({
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
                            ver: "verFichaProductora",
                            editar: "editarProductora",
                            eliminar: "eliminarProductora"
                        }, "Productoras");
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre' },
                { data: 'Pais' },
                { data: 'Dni' },
                { data: 'TipoDocumento' },
                { data: 'NumeroDocumento' },
                { data: 'CondicionIva' },
                { data: 'Provincia' },
                { data: 'Telefono' },
                { data: 'Email' },
            ],

            dom: 'Bfrtip',
            buttons: getBotonesExportacion(gridProductoras, "Productoras"),

            orderCellsTop: true,
            fixedHeader: true,

            initComplete: async function () {
                const api = this.api();

                for (const config of columnConfig) {

                    const cell = $('.filters th').eq(config.index);
                    if (!cell.length) continue;

                    cell.empty();

                    if (config.filterType === 'select' || config.filterType === 'select_local') {

                        const $select = $(`
                            <select class="rp-filter-select" style="width:100%">
                                <option value="">Todos</option>
                            </select>
                        `).appendTo(cell);

                        if (config.filterType === 'select') {
                            const datos = await config.fetchDataFunc();

                            (datos || []).forEach(item => {
                                $select.append(`<option value="${item.Id}">${item.Nombre}</option>`);
                            });
                        } else {
                            const uniques = new Set();

                            api.column(config.index).data().each(v => {
                                const txt = (v ?? "").toString().trim();
                                if (txt) uniques.add(txt);
                            });

                            [...uniques].sort().forEach(txt => {
                                $select.append(`<option value="${txt}">${txt}</option>`);
                            });
                        }

                        inicializarSelect2Filtro($select);

                        $select.on('select2:clear', function () {
                            api.column(config.index).search('').draw(false);
                        });

                        $select.on('change', function () {

                            const value = $(this).val();

                            if (!value) {
                                api.column(config.index)
                                    .search('')
                                    .draw(false);
                                return;
                            }

                            const text = $(this).find('option:selected').text();

                            api.column(config.index)
                                .search('^' + escapeRegex(text) + '$', true, false)
                                .draw(false);
                        });

                    } else {

                        $(`<input class="rp-filter-input" type="text" placeholder="Buscar...">`)
                            .appendTo(cell)
                            .on('keyup change', function () {
                                api.column(config.index).search(this.value).draw(false);
                            });
                    }
                }

                $('.filters th').eq(0).html('');

                configurarOpcionesColumnas();
                actualizarKpis(data);

                $(document).on("click", ".select2-container--default .select2-selection--single", function () {
                    const $select = $(this).closest(".select2-container").prev("select");

                    if ($select.length) {
                        if ($select.data("select2") && $select.data("select2").isOpen()) return;
                        $select.select2("open");
                    }
                });
            }
        });

    } else {
        gridProductoras.clear().rows.add(data).draw(false);
        actualizarKpis(data);
    }
}

/* =========================
   FILTROS - DATOS (para selects de la grilla)
========================= */

async function listaPaisesFilter() {
    const response = await fetch(`/Paises/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    return await response.json();
}

async function listaTiposDocumentoFilter() {
    const response = await fetch(`/PaisesTiposDocumentos/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await response.json();
    return (data || []).map(x => ({
        Id: x.Id,
        Nombre: x.Nombre
    }));
}

async function listaCondicionesIvaFilter() {
    const response = await fetch(`/PaisesCondicionesIVA/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await response.json();
    return (data || []).map(x => ({
        Id: x.Id,
        Nombre: x.Nombre
    }));
}

async function listaProvinciasFilter() {
    try {
        const response = await fetch(`/PaisesProvincia/Lista`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const data = await response.json();

        return (data || []).map(x => ({
            Id: x.Id,
            Nombre: x.Nombre,
            IdPais: x.IdCombo
        }));
    } catch {
        return [];
    }
}

/* =========================
   CONFIG COLUMNAS
========================= */

function configurarOpcionesColumnas() {
    const grid = $('#grd_Productoras').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');

    const storageKey = `Productoras_Columnas`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") {

            const isChecked = savedConfig[`col_${index}`] !== undefined
                ? savedConfig[`col_${index}`]
                : true;

            grid.column(index).visible(isChecked);

            const name = $('#grd_Productoras thead tr').first().find('th').eq(index).text();

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

/* =========================
   KPI + HELPERS
========================= */

function actualizarKpis(data) {
    const cant = Array.isArray(data) ? data.length : 0;
    $('#kpiCantProductoras').text(cant);
}

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatearFecha(fecha) {
    try {
        const d = new Date(fecha);
        return d.toLocaleString("es-AR");
    } catch {
        return fecha;
    }
}