let gridContratos;
let contratoModal;
let clienteModalContratos;
let establecimientoModalContratos;

const columnConfigContratos = [
    { index: 2, filterType: "select", fetchDataFunc: listaClientesFilterContratos },
    { index: 3, filterType: "text" },
    { index: 4, filterType: "text" },
    { index: 5, filterType: "text" },
    { index: 6, filterType: "text" },
    { index: 7, filterType: "text" },
    { index: 8, filterType: "select", opcionesEstaticas: ["Vigente", "Vencido"] },
    { index: 9, filterType: "text" },
    { index: 10, filterType: "text" }
];

registrarFiltrosGrilla('grd_Contratos', columnConfigContratos, {
    includeActivo: false,
    initSelect2: ($el) => inicializarSelect2FiltroContratos($el),
    escapeRegex: escapeRegexContratos
});

function initModalesAtajosContratos() {
    if (typeof initClienteModal === "function") {
        clienteModalContratos = initClienteModal({
            token: token,
            onSaved: async (data, modelo) => {
                const id = data?.id ?? modelo?.Id;
                if (contratoModal) {
                    await contratoModal.recargarClientes(id);
                    if (id) {
                        window.jQuery("#cmbClienteContrato").val(String(id)).trigger("change");
                    }
                }
            }
        });
    }

    if (typeof initEstablecimientoModal === "function") {
        establecimientoModalContratos = initEstablecimientoModal({
            token: token,
            onSaved: async (data, modelo) => {
                const idEst = data?.id ?? modelo?.Id;
                const idCli = modelo?.IdCliente
                    || parseInt(window.jQuery("#cmbClienteContrato").val(), 10) || 0;
                if (contratoModal && idCli) {
                    await contratoModal.recargarEstablecimientos(idCli, idEst);
                }
            }
        });
    }
}

$(document).ready(() => {
    const modalEl = document.querySelector("[data-contrato-modal]");
    if (!modalEl) {
        console.error("No se encontró [data-contrato-modal].");
        return;
    }

    initModalesAtajosContratos();

    contratoModal = typeof initContratoModal === "function"
        ? initContratoModal({
            token: token,
            onSaved: async () => { await listaContratos(); },
            onDeleted: async () => { await listaContratos(); }
        })
        : null;

    if (!contratoModal) {
        console.error("No se pudo inicializar el modal de contratos.");
        return;
    }

    $(document).off("click.select2fix.contr").on(
        "click.select2fix.contr",
        ".select2-container--default .select2-selection--single",
        function () {
            const $select = $(this).closest(".select2-container").prev("select");
            if ($select.length) {
                if ($select.data("select2") && $select.data("select2").isOpen()) return;
                $select.select2("open");
            }
        }
    );

    listaContratos();
});

function inicializarSelect2FiltroContratos($select) {
    if (!$select?.length) return;
    if ($select.data("select2")) $select.select2("destroy");
    $select.select2({
        width: "100%",
        allowClear: true,
        placeholder: "Todos",
        dropdownParent: $(document.body),
        minimumResultsForSearch: 0
    });
}

async function listaClientesFilterContratos() {
    const r = await fetch("/Clientes/Lista", { headers: { Authorization: "Bearer " + token } });
    if (!r.ok) return [];
    return await r.json();
}

async function listaContratos() {
    const paginaActual = gridContratos != null ? gridContratos.page() : 0;

    try {
        const response = await fetch("/Contratos/ListaGrilla", {
            method: "GET",
            headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            errorModal("Error cargando contratos.");
            return;
        }

        const data = await response.json();
        await configurarDataTableContratos(data);

        if (paginaActual > 0 && gridContratos) {
            gridContratos.page(paginaActual).draw("page");
        }
    } catch (e) {
        console.error(e);
        errorModal("Error cargando contratos.");
    }
}

function renderAccionesContrato(id) {
    return renderAccionesGrid(id, {
        ver: "verContrato",
        editar: "editarContrato",
        eliminar: "eliminarContrato"
    }, "Clientes");
}

function badgeVigencia(vigente) {
    return vigente
        ? `<span class="badge bg-success">Vigente</span>`
        : `<span class="badge bg-secondary">Vencido</span>`;
}

async function configurarDataTableContratos(data) {
    if (!gridContratos) {
        gridContratos = $("#grd_Contratos").DataTable({
            data: data || [],
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            autoWidth: false,
            columnDefs: typeof columnDefsGridLista === "function" ? columnDefsGridLista() : [],
            scrollX: true,
            scrollCollapse: true,
            order: [[5, "desc"]],
            columns: [
                columnaGridAcciones({
                    ver: "verContrato",
                    editar: "editarContrato",
                    eliminar: "eliminarContrato"
                }, "Clientes"),
                columnaGridId(),
                { data: "Cliente" },
                { data: "Establecimiento" },
                { data: "Sucursal", defaultContent: "" },
                {
                    data: "FechaContrato",
                    render: d => typeof formatearFechaParaVista === "function" ? formatearFechaParaVista(d) : d
                },
                {
                    data: "FechaInicio",
                    render: d => typeof formatearFechaParaVista === "function" ? formatearFechaParaVista(d) : d
                },
                {
                    data: "FechaVencimiento",
                    render: d => typeof formatearFechaParaVista === "function" ? formatearFechaParaVista(d) : d
                },
                {
                    data: "Vigente",
                    render: (v, type) => {
                        const vigente = !!v;
                        if (type === "filter" || type === "sort") return vigente ? "Vigente" : "Vencido";
                        return badgeVigencia(vigente);
                    }
                },
                {
                    data: "CantidadEntregas",
                    className: "text-center",
                    render: v => Number(v || 0)
                },
                {
                    data: "CantidadRenovaciones",
                    className: "text-center",
                    render: v => Number(v || 0)
                }
            ],
            dom: "Bfrtip",
            buttons: typeof getBotonesExportacion === "function"
                ? getBotonesExportacion(null, "Contratos")
                : [],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                await armarFiltrosGrillaLista(api, "#grd_Contratos", columnConfigContratos, {
                    includeActivo: false,
                    initSelect2: ($el) => inicializarSelect2FiltroContratos($el),
                    escapeRegex: escapeRegexContratos
                });
                actualizarKpisContratos(data);
            }
        });
    } else {
        gridContratos.clear().rows.add(data || []).draw();
        actualizarKpisContratos(data);
    }
}

function actualizarKpisContratos(data) {
    const lista = data || [];
    $("#kpiCantContratos").text(String(lista.length));
    $("#kpiVigentesContratos").text(String(lista.filter(x => x.Vigente).length));
}

function escapeRegexContratos(text) {
    return String(text ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
