let gridPersonal;
let personalModal;
let filtrosPersonalActivos = false;

/**
 * Columnas:
 * 0 Acciones
 * 1 Nombre (TEXT)
 * 2 País (SELECT2 remoto)
 * 3 Dni (TEXT)
 * 4 Tipo Doc (SELECT2 remoto)
 * 5 Nro Doc (TEXT)
 * 6 Condición IVA (SELECT2 remoto)
 * 7 Teléfono (TEXT)
 * 8 Email (TEXT)
 */
const columnConfig = [
    { index: 1, filterType: 'text' }, // Nombre
    { index: 2, filterType: 'select', fetchDataFunc: listaPaisesFilter }, // País
    { index: 3, filterType: 'text' }, // Dni
    { index: 4, filterType: 'select', fetchDataFunc: listaTiposDocumentoFilter }, // Tipo Doc
    { index: 5, filterType: 'text' }, // Nro Doc
    { index: 6, filterType: 'select', fetchDataFunc: listaCondicionesIvaFilter }, // Condición IVA
    { index: 7, filterType: 'text' }, // Teléfono
    { index: 8, filterType: 'text' }  // Email
];

$(document).ready(() => {

    Permisos.init();
    Permisos.aplicarUI("Personal");

    personalModal = new PersonalModal(document.body, {

        token: token,

        onSaved: () => {
            listaPersonal();   // refresca la tabla
        },

        onDeleted: () => {
            listaPersonal();   // refresca cuando eliminás
        }

    });


    window.verPersonal = (id) => personalModal.abrirVer(id);
    window.editarPersonal = (id) => personalModal.abrirEditar(id);
    window.eliminarPersonal = (id) => personalModal.eliminar(id);
    window.verFicha = (id) => personalModal.abrirVer(id);
    window.nuevoPersonal = () => personalModal.abrirNuevo();

    listaPersonal();
    inicializarFiltrosPersonal();
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

async function listaPersonal() {
    let paginaActual = gridPersonal != null ? gridPersonal.page() : 0;

    const response = await fetch(`/Personal/Lista`, {
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
        gridPersonal.page(paginaActual).draw('page');
    }
}

async function configurarDataTable(data) {

    if (!gridPersonal) {

        const $thead = $('#grd_Personal thead');
        if ($thead.find('tr.filters').length === 0) {
            $thead.find('tr').first().clone(true).addClass('filters').appendTo($thead);
        }

        gridPersonal = $('#grd_Personal').DataTable({
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
                            ver: "verPersonal",
                            editar: "editarPersonal",
                            eliminar: "eliminarPersonal"
                        }, "Personal");
                        
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
                { data: 'Telefono' },
                { data: 'Email' },
            ],

            dom: 'Bfrtip',
            buttons: getBotonesExportacion(gridPersonal, "Personal"),

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
        gridPersonal.clear().rows.add(data).draw();
        actualizarKpis(data);
    }
}

/* =========================
   FILTROS - DATOS (para selects de la grilla)
========================= */

async function listaPaisesFilter() {
    const response = await fetch(`/Paises/Lista`, { headers: { 'Authorization': 'Bearer ' + token } });
    return await response.json();
}

async function listaTiposDocumentoFilter() {
    const response = await fetch(`/PaisesTiposDocumentos/Lista`, { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await response.json();
    return (data || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

async function listaCondicionesIvaFilter() {
    const response = await fetch(`/PaisesCondicionesIVA/Lista`, { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await response.json();
    return (data || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

/* =========================
   CONFIG COLUMNAS
========================= */

function configurarOpcionesColumnas() {
    const grid = $('#grd_Personal').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');

    const storageKey = `Personal_Columnas`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") {

            const isChecked = savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;
            grid.column(index).visible(isChecked);

            const name = $('#grd_Personal thead tr').first().find('th').eq(index).text();

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
    $('#kpiCantPersonal').text(cant);
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

function refreshSelect2(id) {
    const $el = $(id);
    if ($el.data('select2')) $el.trigger('change.select2');
}

function getSelect2Selection(el) {
    const $el = $(el);
    const $container = $el.next('.select2-container');
    const $selection = $container.find('.select2-selection');
    return { $container, $selection };
}

function setEstadoCampo(el, esValido) {
    if (!el) return;

    el.classList.remove("is-invalid", "is-valid");
    el.classList.add(esValido ? "is-valid" : "is-invalid");

    if (el.tagName === "SELECT" && $(el).data("select2")) {
        const { $selection, $container } = getSelect2Selection(el);
        $selection.removeClass("is-invalid is-valid").addClass(esValido ? "is-valid" : "is-invalid");
        $container.removeClass("is-invalid is-valid").addClass(esValido ? "is-valid" : "is-invalid");
    }
}

/* =========================================================
   FILTROS PERSONAL (server side)
========================================================= */

async function inicializarFiltrosPersonal() {

    await Promise.all([
        cargarFiltroPaises(),
        cargarFiltroTiposDocumento(),
        cargarFiltroCondicionesIva(),
        cargarFiltroRoles(),
        cargarFiltroArtistas()
    ]);

    inicializarSelect2Filtro($("#fPais"));
    inicializarSelect2Filtro($("#fTipoDocumento"));
    inicializarSelect2Filtro($("#fCondicionIva"));
    inicializarSelect2Filtro($("#fRol"));
    inicializarSelect2Filtro($("#fArtista"));
}

async function cargarFiltroPaises() {
    const r = await fetch(`/Paises/Lista`, { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await r.json();

    const $sel = $("#fPais");
    $sel.empty().append(`<option value="">Todos</option>`);

    (data || []).forEach(x =>
        $sel.append(`<option value="${x.Id}">${x.Nombre}</option>`)
    );
}

async function cargarFiltroTiposDocumento() {
    const r = await fetch(`/PaisesTiposDocumentos/Lista`, { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await r.json();

    const $sel = $("#fTipoDocumento");
    $sel.empty().append(`<option value="">Todos</option>`);

    (data || []).forEach(x =>
        $sel.append(`<option value="${x.Id}">${x.Nombre}</option>`)
    );
}

async function cargarFiltroCondicionesIva() {
    const r = await fetch(`/PaisesCondicionesIVA/Lista`, { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await r.json();

    const $sel = $("#fCondicionIva");
    $sel.empty().append(`<option value="">Todos</option>`);

    (data || []).forEach(x =>
        $sel.append(`<option value="${x.Id}">${x.Nombre}</option>`)
    );
}

async function cargarFiltroRoles() {
    const r = await fetch(`/PersonalRol/Lista`, { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await r.json();

    const $sel = $("#fRol");
    $sel.empty().append(`<option value="">Todos</option>`);

    (data || []).forEach(x =>
        $sel.append(`<option value="${x.Id}">${x.Nombre}</option>`)
    );
}

async function cargarFiltroArtistas() {
    const r = await fetch(`/Artistas/Lista`, { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await r.json();

    const $sel = $("#fArtista");
    $sel.empty().append(`<option value="">Todos</option>`);

    (data || []).forEach(x =>
        $sel.append(`<option value="${x.Id}">${x.NombreArtistico}</option>`)
    );
}

async function aplicarFiltrosPersonal() {

    const filtros = {
        Nombre: $("#fNombre").val() || null,
        IdPais: $("#fPais").val() || null,
        IdTipoDocumento: $("#fTipoDocumento").val() || null,
        IdCondicionIva: $("#fCondicionIva").val() || null,
        IdRol: $("#fRol").val() || null,
        IdArtista: $("#fArtista").val() || null
    };

    filtrosPersonalActivos =
        Object.values(filtros).some(x => x !== null && x !== "");

    actualizarEstadoFiltrosPersonal();

    const response = await fetch(`/Personal/ListaFiltrada`, {
        method: "POST",
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(filtros)
    });

    if (!response.ok)
        return errorModal("Error aplicando filtros");

    const data = await response.json();

    gridPersonal.clear().rows.add(data).draw();
    actualizarKpis(data);
}

function limpiarFiltrosPersonal() {

    $("#fNombre").val("");

    $("#fPais").val(null).trigger("change");
    $("#fTipoDocumento").val(null).trigger("change");
    $("#fCondicionIva").val(null).trigger("change");
    $("#fRol").val(null).trigger("change");
    $("#fArtista").val(null).trigger("change");

    filtrosPersonalActivos = false;
    actualizarEstadoFiltrosPersonal();

    listaPersonal();
}

function actualizarEstadoFiltrosPersonal() {
    const txt = filtrosPersonalActivos ? "Filtros activos" : "";
    $("#txtFiltrosEstadoPersonal").text(txt);
}