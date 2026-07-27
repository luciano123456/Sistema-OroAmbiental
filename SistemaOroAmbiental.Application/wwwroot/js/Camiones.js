let gridCamiones;
let camionModal;

const columnConfig = [
    { index: 2, filterType: 'text' }
];

registrarFiltrosGrilla('grd_Camiones', columnConfig);

$(document).ready(() => {

    camionModal = typeof initCamionModal === "function"
        ? initCamionModal({
            token: token,
            onSaved: async () => { await listaCamiones(); },
            onDeleted: async () => { await listaCamiones(); }
        })
        : null;

    if (!camionModal) return;

    listaCamiones();
});

async function listaCamiones() {
    let paginaActual = gridCamiones != null ? gridCamiones.page() : 0;

    const response = await fetch(`/Camiones/Lista`, {
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
        gridCamiones.page(paginaActual).draw('page');
    }
}

async function configurarDataTable(data) {

    if (!gridCamiones) {

        gridCamiones = $('#grd_Camiones').DataTable({
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
                    ver: "verCamion",
                    editar: "editarCamion",
                    eliminar: "eliminarCamion"
                }, "Camiones"),
                columnaGridId(),
                { data: 'Nombre' },
                typeof columnaGridActivo === "function" ? columnaGridActivo("Camiones") : { data: "Activo" },
            ],
            createdRow: function (row, rowData) {
                if (typeof createdRowEstiloActivoGrilla === "function") {
                    createdRowEstiloActivoGrilla(row, rowData);
                }
            },
            dom: 'Bfrtip',
            buttons: getBotonesExportacion(gridCamiones, "Camiones"),
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                await armarFiltrosGrillaLista(api, '#grd_Camiones', columnConfig);
                configurarOpcionesColumnas();
                actualizarKpis(data);
                api.draw(false);
            }
        });

    } else {
        gridCamiones.clear().rows.add(data).draw();
        actualizarKpis(data);
    }
}

function configurarOpcionesColumnas() {
    const grid = $('#grd_Camiones').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');
    const storageKey = `Camiones_Columnas`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        if (typeof esColumnaMenuGrilla === "function" ? esColumnaMenuGrilla(col) : (col.data && col.data !== "Id")) {
            const isChecked = savedConfig[`col_${index}`] !== undefined
                ? savedConfig[`col_${index}`]
                : true;

            grid.column(index).visible(isChecked);

            const name = $('#grd_Camiones thead tr').first().find('th').eq(index).text();

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
    $('#kpiCantCamiones').text(cant);
}
