/* =========================================================
   UBICACIONES.JS — ESTILO ARTISTAS (FULL PRO)
========================================================= */

let gridUbicaciones;
let ubicacionesModal;

let exportTipo = null;

/* =========================
   COLUMN CONFIG
========================= */

const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' }
];

/* =========================
   INIT
========================= */

$(document).ready(() => {

    Permisos.init();
    Permisos.aplicarUI("Ubicaciones");

    ubicacionesModal = new UbicacionModal(document.body, {
        token: token,
        onSaved: () => listaUbicaciones(),
        onDeleted: () => listaUbicaciones()
    });

    window.verUbicacion = (id) => ubicacionesModal.abrirVer(id);
    window.editarUbicacion = (id) => ubicacionesModal.abrirEditar(id);
    window.eliminarUbicacion = (id) => ubicacionesModal.eliminar(id);
    window.verFicha = (id) => ubicacionesModal.abrirVer(id);
    window.abrirNuevo = () => ubicacionesModal.abrirNuevo();
    listaUbicaciones();
});

/* =========================
   CRUD
========================= */

async function listaUbicaciones() {

    let paginaActual = gridUbicaciones ? gridUbicaciones.page() : 0;

    const response = await fetch(`/Ubicaciones/Lista`, {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });

    if (!response.ok)
        throw new Error("Error cargando ubicaciones");

    const data = await response.json();

    await configurarDataTable(data);

    if (paginaActual > 0)
        gridUbicaciones.page(paginaActual).draw('page');
}

/* =========================
   DATATABLE
========================= */

async function configurarDataTable(data) {

    if (!gridUbicaciones) {

        const $thead = $('#grd_Ubicaciones thead');

        if ($thead.find('tr.filters').length === 0) {
            $thead.find('tr').first().clone(true).addClass('filters').appendTo($thead);
        }

        gridUbicaciones = $('#grd_Ubicaciones').DataTable({

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
                            ver: "verUbicacion",
                            editar: "editarUbicacion",
                            eliminar: "eliminarUbicacion"
                        }, "Ubicaciones");

                    },
                    orderable: false,
                    searchable: false
                },

                { data: 'Descripcion' },
                { data: 'Espacio' },
                { data: 'Direccion' }

            ],

            dom: 'Bfrtip',

            buttons: getBotonesExportacion(gridUbicaciones, "Ubicaciones"),

            orderCellsTop: true,
            fixedHeader: true,

            initComplete: function () {

                const api = this.api();

                columnConfig.forEach(config => {

                    const cell = $('.filters th').eq(config.index);

                    cell.empty();

                    const $input = $(`
                        <input class="rp-filter-input" type="text" placeholder="Buscar...">
                    `)
                        .appendTo(cell)
                        .on('keyup change', function () {
                            api.column(config.index)
                                .search(this.value)
                                .draw(false);
                        });

                });

                $('.filters th').eq(0).html('');

                configurarOpcionesColumnas();

                actualizarKpis(data);

            }

        });

    } else {

        gridUbicaciones.clear().rows.add(data).draw();

        actualizarKpis(data);
    }
}

/* =========================
   CONFIG COLUMNAS
========================= */

function configurarOpcionesColumnas() {

    const grid = $('#grd_Ubicaciones').DataTable();

    const columnas = grid.settings().init().columns;

    const container = $('#configColumnasMenu');

    const storageKey = `Ubicaciones_Columnas`;

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {

        if (col.data && col.data !== "Id") {

            const isChecked =
                savedConfig[`col_${index}`] !== undefined
                    ? savedConfig[`col_${index}`]
                    : true;

            grid.column(index).visible(isChecked);

            const name = $('#grd_Ubicaciones thead tr')
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
   KPI
========================= */

function actualizarKpis(data) {

    const cant = Array.isArray(data) ? data.length : 0;

    $('#kpiCantUbicaciones').text(cant);
}

/* =========================
   HELPERS
========================= */

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}