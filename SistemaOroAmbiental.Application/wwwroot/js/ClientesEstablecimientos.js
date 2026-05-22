let gridEstablecimientos;
let establecimientoModal;

const columnConfigEst = [
    { index: 1, filterType: 'select', fetchDataFunc: listaClientesFilterEst },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'select', fetchDataFunc: listaProvinciasFilterEst },
    { index: 5, filterType: 'select', fetchDataFunc: listaDiasFilterEst },
    { index: 6, filterType: 'select', fetchDataFunc: listaSemanasFilterEst },
    { index: 7, filterType: 'select', fetchDataFunc: listaListasPrecioFilterEst },
    { index: 8, filterType: 'text' }
];

$(document).ready(() => {
    const modalEl = document.querySelector("[data-establecimiento-modal]");
    if (!modalEl) {
        console.error("No se encontró [data-establecimiento-modal].");
        return;
    }

    establecimientoModal = new EstablecimientoModal(modalEl, {
        token: token,
        onSaved: async () => { await listaEstablecimientos(); },
        onDeleted: async () => { await listaEstablecimientos(); }
    });

    window.verEstablecimiento = (id) => establecimientoModal.abrirVer(id);
    window.editarEstablecimiento = (id) => establecimientoModal.abrirEditar(id);
    window.eliminarEstablecimiento = (id) => establecimientoModal.eliminar(id);
    window.verFichaEstablecimiento = (id) => establecimientoModal.abrirVer(id);
    window.nuevoEstablecimiento = () => establecimientoModal.abrirNuevo();

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
        const $thead = $("#grd_Establecimientos thead");
        if ($thead.find("tr.filters").length === 0) {
            $thead.find("tr").first().clone(true).addClass("filters").appendTo($thead);
        }

        gridEstablecimientos = $("#grd_Establecimientos").DataTable({
            data: data,
            language: { sLengthMenu: "Mostrar MENU registros", url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            scrollCollapse: true,
            columns: [
                {
                    data: "Id",
                    title: "",
                    width: "1%",
                    render: function (data) {
                        return renderAccionesGrid(data, {
                            ver: "verEstablecimiento",
                            editar: "editarEstablecimiento",
                            eliminar: "eliminarEstablecimiento"
                        }, "Clientes");
                    },
                    orderable: false,
                    searchable: false
                },
                { data: "Cliente" },
                { data: "Nombre" },
                { data: "Cuit" },
                { data: "Provincia" },
                { data: "DiaRecoleccion" },
                { data: "SemanaRecoleccion" },
                { data: "ListaPrecio" },
                {
                    data: null,
                    render: function (row) {
                        const d = row.HorarioRecoleccionDesde || "";
                        const h = row.HorarioRecoleccionHasta || "";
                        return d && h ? `${d} - ${h}` : "";
                    }
                }
            ],
            dom: "Bfrtip",
            buttons: getBotonesExportacion(gridEstablecimientos, "Establecimientos"),
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                for (const config of columnConfigEst) {
                    const cell = $(".filters th").eq(config.index);
                    if (!cell.length) continue;
                    cell.empty();

                    if (config.filterType === "select") {
                        const $select = $(`<select class="rp-filter-select" style="width:100%"></select>`).appendTo(cell);
                        const datos = await config.fetchDataFunc();
                        $select.append(`<option value="">Todos</option>`);
                        (datos || []).forEach(item => {
                            $select.append(`<option value="${item.Id}">${item.Nombre}</option>`);
                        });
                        inicializarSelect2FiltroEst($select);
                        $select.on("select2:clear", () => api.column(config.index).search("").draw(false));
                        $select.on("change", function () {
                            const value = $(this).val();
                            if (!value) {
                                api.column(config.index).search("").draw(false);
                                return;
                            }
                            const text = $(this).find("option:selected").text();
                            api.column(config.index).search("^" + escapeRegex(text) + "$", true, false).draw(false);
                        });
                    } else {
                        $('<input class="rp-filter-input" type="text" placeholder="Buscar...">')
                            .appendTo(cell)
                            .on("keyup change", function () {
                                api.column(config.index).search(this.value).draw(false);
                            });
                    }
                }
                $(".filters th").eq(0).html("");
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
