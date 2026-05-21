let gridArtistas;
let artistasModal;

// ===============================
// RELACION PERSONAL
// ===============================

let personalCache = [];
let personalSeleccionado = [];
let personalAutomatico = [];
let personalDesdePersonal = [];

let exportTipo = null;

/**
 * Columnas:
 * 0 Acciones
 * 1 Nombre
 * 2 NombreArtistico
 * 3 Productora
 * 4 Representante
 * 5 Pais
 * 6 Provincia
 * 7 TipoDoc
 * 8 NumeroDoc
 * 9 CondicionIva
 * 10 Moneda
 * 11 Precio
 * 12 Telefono
 * 13 Email
 */

const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'select', fetchDataFunc: listaProductorasFilter },
    { index: 4, filterType: 'select', fetchDataFunc: listaRepresentantesFilter },
    { index: 5, filterType: 'select', fetchDataFunc: listaPaisesFilter },
    { index: 6, filterType: 'select', fetchDataFunc: listaProvinciasFilter },
    { index: 7, filterType: 'select', fetchDataFunc: listaTiposDocumentoFilter },
    { index: 8, filterType: 'text' },
    { index: 9, filterType: 'select', fetchDataFunc: listaCondicionesIvaFilter },
    { index: 10, filterType: 'select', fetchDataFunc: listaMonedasFilter },
    { index: 11, filterType: 'text' },
    { index: 12, filterType: 'text' },
    { index: 13, filterType: 'text' }
];

$(document).ready(() => {


    Permisos.init();
    Permisos.aplicarUI("Artistas");

    // Instancia modal (el partial ya está en el HTML)
    artistasModal = new ArtistasModal(document.body, {
        token: token,
        onSaved: () => listaArtistas(),
        onDeleted: () => listaArtistas()
    });

    window.verArtista = (id) => artistasModal.abrirVer(id);
    window.editarArtista = (id) => artistasModal.abrirEditar(id);
    window.eliminarArtista = (id) => artistasModal.eliminar(id);
    window.verFicha = (id) => artistasModal.abrirVer(id);

    listaArtistas();

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
   CRUD
========================= */

async function listaArtistas() {

    let paginaActual = gridArtistas ? gridArtistas.page() : 0;

    const response = await fetch(`/Artistas/Lista`, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok)
        throw new Error(`Error en la solicitud`);

    const data = await response.json();

    await configurarDataTable(data);

    if (paginaActual > 0)
        gridArtistas.page(paginaActual).draw('page');

}


/* =========================
   DATATABLE
========================= */

async function configurarDataTable(data) {

    if (!gridArtistas) {

        const $thead = $('#grd_Artistas thead');

        if ($thead.find('tr.filters').length === 0) {
            $thead.find('tr').first().clone(true).addClass('filters').appendTo($thead);
        }

        gridArtistas = $('#grd_Artistas').DataTable({

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
                            ver: "verArtista",
                            editar: "editarArtista",
                            eliminar: "eliminarArtista"
                        }, "Artistas");

                    },
                    orderable: false,
                    searchable: false
                },

                { data: 'Nombre' },
                { data: 'NombreArtistico' },
                { data: 'Productora' },
                { data: 'Representante' },
                { data: 'Pais' },
                { data: 'Provincia' },
                { data: 'TipoDocumento' },
                { data: 'NumeroDocumento' },
                { data: 'CondicionIva' },
                { data: 'Moneda' },

                {
                    data: 'PrecioUnitario',
                    render: function (data) {

                        if (data == null || data === "")
                            return "";

                        const n = Number(data);

                        if (Number.isNaN(n))
                            return data;

                        return n.toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        });

                    }
                },

                { data: 'Telefono' },
                { data: 'Email' }

            ],

            dom: 'Bfrtip',

            buttons: getBotonesExportacion(gridArtistas, "Artistas"),
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

                            $select.append(`
<option value="${item.Id}">${item.Nombre}</option>
`);

                        });

                        inicializarSelect2Filtro($select);

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
                    else {

                        const $input = $(`
<input class="rp-filter-input" type="text" placeholder="Buscar...">
`)
                            .appendTo(cell)
                            .on('keyup change', function () {

                                api.column(config.index)
                                    .search(this.value)
                                    .draw(false);

                            });

                    }

                }

                $('.filters th').eq(0).html('');

                configurarOpcionesColumnas();

                actualizarKpis(data);

            }

        });

    }
    else {

        gridArtistas.clear().rows.add(data).draw();

        actualizarKpis(data);

    }

}


/* =========================
   FILTROS DATA
========================= */

async function listaProductorasFilter() {

    const response = await fetch(`/Productoras/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await response.json();

    return (data || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));

}

async function listaRepresentantesFilter() {

    const response = await fetch(`/Personal/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await response.json();

    return (data || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));

}

async function listaMonedasFilter() {

    const response = await fetch(`/PaisesMoneda/Lista`, {
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

async function listaProvinciasFilter() {

    const response = await fetch(`/PaisesProvincia/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await response.json();

    return (data || []).map(x => ({
        Id: x.Id,
        Nombre: x.Nombre,
        IdPais: x.IdCombo
    }));

}


/* =========================
   CONFIG COLUMNAS
========================= */

function configurarOpcionesColumnas() {

    const grid = $('#grd_Artistas').DataTable();

    const columnas = grid.settings().init().columns;

    const container = $('#configColumnasMenu');

    const storageKey = `Artistas_Columnas`;

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {

        if (col.data && col.data !== "Id") {

            const isChecked =
                savedConfig[`col_${index}`] !== undefined
                    ? savedConfig[`col_${index}`]
                    : true;

            grid.column(index).visible(isChecked);

            const name = $('#grd_Artistas thead tr')
                .first()
                .find('th')
                .eq(index)
                .text();

            container.append(`
<li class="rp-dd-item">
<label class="rp-dd-label">
<input type="checkbox" class="toggle-column" data-column="${index}" ${isChecked ? 'checked' : ''}>
<span>${name}</span>
</label>
</li>
`);

        }

    });

    $('.toggle-column').on('change', function () {

        const columnIdx = parseInt($(this).data('column'));

        const isChecked = $(this).is(':checked');

        savedConfig[`col_${columnIdx}`] = isChecked;

        localStorage.setItem(storageKey, JSON.stringify(savedConfig));

        grid.column(columnIdx).visible(isChecked);

    });

}


/* =========================
   KPIs
========================= */

function actualizarKpis(data) {

    const cant = Array.isArray(data) ? data.length : 0;

    $('#kpiCantArtistas').text(cant);

}


/* =========================
   HELPERS
========================= */

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function refreshSelect2(id) {

    const $el = $(id);

    if ($el.data('select2'))
        $el.trigger('change.select2');

}