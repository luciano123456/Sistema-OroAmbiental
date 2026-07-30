let gridEstablecimientos;
let establecimientoModal;

const columnConfigEst = [
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'select', fetchDataFunc: listaClientesFilterEst },
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'text' },
    { index: 6, filterType: 'select', fetchDataFunc: listaProvinciasFilterEst },
    { index: 7, filterType: 'select', fetchDataFunc: listaPartidosFilterEst },
    { index: 8, filterType: 'text' },
    { index: 9, filterType: 'select', fetchDataFunc: listaLocalidadesFilterEst },
    { index: 10, filterType: 'text' },
    { index: 11, filterType: 'select', fetchDataFunc: listaDiasFilterEst },
    { index: 12, filterType: 'select', fetchDataFunc: listaSemanasFilterEst },
    { index: 13, filterType: 'select', fetchDataFunc: listaListasPrecioFilterEst },
    { index: 14, filterType: 'text' }
];

registrarFiltrosGrilla('grd_Establecimientos', columnConfigEst, {
    includeActivo: false,
    initSelect2: ($el) => inicializarSelect2FiltroEst($el)
});

function initModalClienteEstablecimientos() {
    if (typeof initClienteModal !== "function") return;
    initClienteModal({
        token: token,
        onSaved: async (data, modelo) => {
            const id = data?.id ?? modelo?.Id;
            if (establecimientoModal) {
                await establecimientoModal.cargarCombos();
                if (id) {
                    establecimientoModal._setFieldValue("cmbClienteEst", id, true);
                    establecimientoModal.cerrarErrorCampos();
                }
            }
        }
    });
}

$(document).ready(() => {
    const modalEl = document.querySelector("[data-establecimiento-modal]");
    if (!modalEl) {
        console.error("No se encontro [data-establecimiento-modal].");
        return;
    }

    initModalClienteEstablecimientos();

    establecimientoModal = typeof initEstablecimientoModal === "function"
        ? initEstablecimientoModal({
            token: token,
            onSaved: async () => { await listaEstablecimientos(); },
            onDeleted: async () => { await listaEstablecimientos(); }
        })
        : null;

    if (!establecimientoModal) return;

    $(document).off("click.select2fix.est").on(
        "click.select2fix.est",
        ".select2-container--default .select2-selection--single",
        function () {
            const $select = $(this).closest(".select2-container").prev("select");
            if ($select.length) {
                if ($select.data("select2") && $select.data("select2").isOpen()) return;
                $select.select2("open");
            }
        }
    );

    listaEstablecimientos();
});

function ensureSelect2Est($el, options) {
    if (!$el || !$el.length) return;
    if ($el.data("select2")) return;
    $el.select2(Object.assign({
        width: "100%",
        allowClear: true,
        placeholder: "Seleccionar"
    }, options || {}));
}

function inicializarSelect2FiltroEst($select) {
    ensureSelect2Est($select, {
        dropdownParent: $(document.body),
        minimumResultsForSearch: 0,
        allowClear: true,
        placeholder: "Todos"
    });
}

async function listaEstablecimientos() {
    const paginaActual = gridEstablecimientos != null ? gridEstablecimientos.page() : 0;

    const response = await fetch("/ClientesEstablecimientos/Lista", {
        method: "GET",
        headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) throw new Error(`Error: ${response.statusText}`);

    const data = await response.json();
    await configurarDataTableEst(data);

    if (paginaActual > 0) {
        gridEstablecimientos.page(paginaActual).draw("page");
    }
}

async function configurarDataTableEst(data) {
    if (!gridEstablecimientos) {
        gridEstablecimientos = $("#grd_Establecimientos").DataTable({
            data: data,
            language: { sLengthMenu: "Mostrar MENU registros", url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            autoWidth: false,
            columnDefs: typeof columnDefsGridLista === "function" ? columnDefsGridLista() : [],
            scrollX: true,
            scrollCollapse: true,
            columns: [
                columnaGridAcciones({
                    ver: "verEstablecimiento",
                    editar: "editarEstablecimiento",
                    eliminar: "eliminarEstablecimiento"
                }, "Clientes"),
                columnaGridId(),
                { data: "IdEstablecimientoCliente", defaultContent: "" },
                { data: "Cliente" },
                { data: "Nombre" },
                { data: "Cuit" },
                { data: "Provincia" },
                { data: "Partido", defaultContent: "" },
                { data: "CodigoPartido", defaultContent: "" },
                { data: "Localidad", defaultContent: "" },
                { data: "CodigoLocalidad", defaultContent: "" },
                { data: "DiaRecoleccion" },
                { data: "SemanaRecoleccion" },
                { data: "ListaPrecio" },
                {
                    data: "DiasHorarios",
                    defaultContent: "",
                    render: function (d, type, row) {
                        if (d) return d;
                        const desde = row.HorarioRecoleccionDesde || "";
                        const hasta = row.HorarioRecoleccionHasta || "";
                        return desde && hasta ? `${desde} - ${hasta}` : "";
                    }
                }
            ],
            dom: "Bfrtip",
            buttons: getBotonesExportacion(gridEstablecimientos, "Establecimientos"),
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                await armarFiltrosGrillaLista(api, "#grd_Establecimientos", columnConfigEst, {
                    includeActivo: false,
                    initSelect2: ($el) => inicializarSelect2FiltroEst($el)
                });
                configurarOpcionesColumnasEst();
                actualizarKpisEst(data);
            }
        });
    } else {
        gridEstablecimientos.clear().rows.add(data).draw();
        actualizarKpisEst(data);
    }
}

async function listaClientesFilterEst() {
    const r = await fetch("/Clientes/Lista", { headers: { Authorization: "Bearer " + token } });
    return await r.json();
}

async function listaProvinciasFilterEst() {
    const r = await fetch("/Provincias/Lista", { headers: { Authorization: "Bearer " + token } });
    return await r.json();
}

async function listaPartidosFilterEst() {
    const r = await fetch("/Partidos/Lista", { headers: { Authorization: "Bearer " + token } });
    return await r.json();
}

async function listaLocalidadesFilterEst() {
    const r = await fetch("/Localidades/Lista", { headers: { Authorization: "Bearer " + token } });
    return await r.json();
}

async function listaDiasFilterEst() {
    const r = await fetch("/Dias/Lista", { headers: { Authorization: "Bearer " + token } });
    return await r.json();
}

async function listaSemanasFilterEst() {
    const r = await fetch("/Semanas/Lista", { headers: { Authorization: "Bearer " + token } });
    return await r.json();
}

async function listaListasPrecioFilterEst() {
    const r = await fetch("/ListasPrecios/Lista", { headers: { Authorization: "Bearer " + token } });
    return await r.json();
}

function configurarOpcionesColumnasEst() {
    if (typeof configurarMenuColumnasDataTable !== "function") return;
    configurarMenuColumnasDataTable(gridEstablecimientos, "configColumnasMenuEst");
}

function actualizarKpisEst(data) {
    const el = document.getElementById("kpiCantEstablecimientos");
    if (el) el.textContent = String((data || []).length);
}
