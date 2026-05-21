let gridClientes;
let clienteModal;

/**
 * Columnas:
 * 0 Acciones
 * 1 Nombre (TEXT)
 * 2 Productora (SELECT2 remoto)
 * 3 País (SELECT2 remoto)
 * 4 Dni (TEXT)
 * 5 Provincia (SELECT local)
 * 6 Tipo Doc (SELECT2 remoto)
 * 7 Nro Doc (TEXT)
 * 8 Condición IVA (SELECT2 remoto)
 * 9 Teléfono (TEXT)
 * 10 Email (TEXT)
 */
const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'select', fetchDataFunc: listaProductorasFilter },
    { index: 3, filterType: 'select', fetchDataFunc: listaPaisesFilter },
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'select_local' },
    { index: 6, filterType: 'select', fetchDataFunc: listaTiposDocumentoFilter },
    { index: 7, filterType: 'text' },
    { index: 8, filterType: 'select', fetchDataFunc: listaCondicionesIvaFilter },
    { index: 9, filterType: 'text' },
    { index: 10, filterType: 'text' }
];

$(document).ready(() => {

    Permisos.init();
    Permisos.aplicarUI("Clientes");

    clienteModal = new ClienteModal(document.body, {
        token: token,

        onSaved: async () => {
            await listaClientes();
        },

        onDeleted: async () => {
            await listaClientes();
        }
    });

    window.verCliente = (id) => clienteModal.abrirVer(id);
    window.editarCliente = (id) => clienteModal.abrirEditar(id);
    window.eliminarCliente = (id) => clienteModal.eliminar(id);
    window.verFicha = (id) => clienteModal.abrirVer(id);
    window.nuevoCliente = () => clienteModal.abrirNuevo();

    // UX select2 abierta al click
    $(document)
        .off("click.select2fix.clientes")
        .on("click.select2fix.clientes", ".select2-container--default .select2-selection--single", function () {
            const $select = $(this).closest(".select2-container").prev("select");
            if ($select.length) {
                if ($select.data("select2") && $select.data("select2").isOpen()) return;
                $select.select2("open");
            }
        });

    // limpiar pegado raro
    $(document).on("paste", "input[type=text], textarea", function (e) {
        e.preventDefault();

        let texto = (e.originalEvent || e).clipboardData.getData('text');

        texto = texto
            .replace(/[“”]/g, '"')
            .replace(/[‘’]/g, "'")
            .replace(/\u00A0/g, ' ')
            .trim();

        document.execCommand("insertText", false, texto);
    });

    listaClientes();
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
                { data: 'Productora' },
                { data: 'Pais' },
                { data: 'Dni' },
                { data: 'Provincia' },
                { data: 'TipoDocumento' },
                { data: 'NumeroDocumento' },
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
        gridClientes.clear().rows.add(data).draw();
        actualizarKpis(data);
    }
}

/* =========================
   FILTROS - DATOS
========================= */

async function listaProductorasFilter() {
    const response = await fetch(`/Productoras/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await response.json();
    return (data || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

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
    return (data || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

async function listaCondicionesIvaFilter() {
    const response = await fetch(`/PaisesCondicionesIVA/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await response.json();
    return (data || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

/* =========================
   CONFIG COLUMNAS
========================= */

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

/* =========================
   KPI + HELPERS
========================= */

function actualizarKpis(data) {
    const cant = Array.isArray(data) ? data.length : 0;
    $('#kpiCantClientes').text(cant);
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

function toDecimal(val) {
    if (val == null) return 0;
    const s = (val + "").trim();
    if (!s) return 0;
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

function normalizarDateInput(fecha) {
    if (!fecha) return "";
    try {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return "";
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    } catch {
        return "";
    }
}