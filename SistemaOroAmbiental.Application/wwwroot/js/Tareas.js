let gridTareas;

/**
 * Columnas:
 * 0 Acciones
 * 1 Fecha (DATE)
 * 2 FechaLimite (DATE)
 * 3 Personal (SELECT2 remoto)
 * 4 Estado (SELECT2 remoto)
 * 5 Descripción (TEXT)
 */
const columnConfig = [
    { index: 1, filterType: 'text' }, // Fecha (filtra texto yyyy-mm-dd)
    { index: 2, filterType: 'text' }, // Fecha limite
    { index: 3, filterType: 'select', fetchDataFunc: listaPersonalFilter },
    { index: 4, filterType: 'select', fetchDataFunc: listaEstadosFilter },
    { index: 5, filterType: 'text' },
];

$(document).ready(() => {



    Permisos.init();
    Permisos.aplicarUI("Tareas");


    listaTareas();


    // Ejecutar SOLO una vez
    $(document).off("click.select2fix").on(
        "click.select2fix",
        ".select2-container--default .select2-selection--single",
        function () {
            const $select = $(this).closest(".select2-container").prev("select");
            if ($select.length) {
                if ($select.data("select2") && $select.data("select2").isOpen()) return;
                $select.select2("open");
            }
        }
    );


    // ✅ Validación: inputs/textarea con input+blur, selects SOLO change (porque select2 hace blur y rompe)
    document.querySelectorAll("#modalEdicion input, #modalEdicion textarea").forEach(el => {
        el.setAttribute("autocomplete", "off");
        el.addEventListener("input", () => validarCampoIndividual(el));
        el.addEventListener("blur", () => validarCampoIndividual(el));
        el.addEventListener("change", () => validarCampoIndividual(el));
    });

    document.querySelectorAll("#modalEdicion select").forEach(el => {
        el.addEventListener("change", () => validarCampoIndividual(el));
    });

    // Select2: forzar validación cuando selecciona o limpia (en modal)
    $("#modalEdicion").on("select2:select select2:clear", "select", function () {
        validarCampoIndividual(this);
    });

    inicializarSelect2Modal();
});

/* =========================
   SELECT2 HELPERS
========================= */

function ensureSelect2($el, options) {
    if (!$el || !$el.length) return;

    // ✅ no destruir/recrear si ya está y el parent es el mismo (reduce bugs + scroll)
    if ($el.data('select2')) {
        const currentParent = $el.data('select2').$dropdown?.parent();
        const nextParent = options?.dropdownParent;
        if (currentParent && nextParent && currentParent[0] === nextParent[0]) return;

        $el.select2('destroy');
    }

    $el.select2(Object.assign({
        width: '100%',
        allowClear: true,
        placeholder: "Todos"
    }, options || {}));
}

function inicializarSelect2Modal() {
    const opts = {
        width: '100%',
        dropdownParent: $('#modalEdicion')
    };

    ensureSelect2($("#cmbPersonal"), opts);
    ensureSelect2($("#cmbEstado"), opts);
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

function guardarTarea() {

    const id = $("#txtId").val();
    const esNuevo = id === "";

    // 🔥 PERMISOS
    const puedeCrear = Permisos.tiene("Tareas", "Crear");
    const puedeEditar = Permisos.tiene("Tareas", "Editar");

    if (esNuevo && !puedeCrear) {
        errorModal("No tenés permisos para crear tareas.");
        return false;
    }

    if (!esNuevo && !puedeEditar) {
        errorModal("No tenés permisos para editar tareas.");
        return false;
    }

    // 🔥 VALIDACIÓN
    if (!validarCampos()) return false;

    const modelo = {
        Id: id !== "" ? parseInt(id, 10) : 0,

        Fecha: $("#dtpFecha").val() || null,
        FechaLimite: $("#dtpFechaLimite").val() || null,

        IdPersonal: $("#cmbPersonal").val()
            ? parseInt($("#cmbPersonal").val(), 10)
            : null,

        IdEstado: $("#cmbEstado").val()
            ? parseInt($("#cmbEstado").val(), 10)
            : null,

        Descripcion: ($("#txtDescripcion").val() || "").trim(),
    };

    const url = esNuevo ? "/Tareas/Insertar" : "/Tareas/Actualizar";
    const method = esNuevo ? "POST" : "PUT";

    const scrollY = window.scrollY;

    fetch(url, {
        method: method,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(modelo)
    })
        .then(r => {
            if (!r.ok) throw new Error(r.statusText);
            return r.json();
        })
        .then(_ => {
            $('#modalEdicion').modal('hide');

            const mensaje = esNuevo
                ? "Tarea registrada correctamente"
                : "Tarea modificada correctamente";

            exitoModal(mensaje);

            return listaTareas().then(() =>
                window.scrollTo({ top: scrollY, behavior: "instant" })
            );
        })
        .catch(err => {
            console.error('Error:', err);
            errorModal("Ha ocurrido un error.");
        });
}
function nuevaTarea() {

    if (!Permisos.tiene("Tareas", "Crear")) {
        errorModal("No tenés permisos.");
        return;
    }
    limpiarModal();

    setModalSoloLectura(false);
    // ===== fechas por defecto con moment =====
    const hoy = moment().format("YYYY-MM-DD");
    const fechaLimite = moment().add(7, "days").format("YYYY-MM-DD");

    $("#dtpFecha").val(hoy);
    $("#dtpFechaLimite").val(fechaLimite);

    // cargar combos
    Promise.all([
        listaPersonal(),
        listaEstados()
    ]).then(() => {
        inicializarSelect2Modal();
    });

    $('#modalEdicion').modal('show');

    $("#btnGuardar").html(`<i class="fa fa-check"></i> Registrar`);
    $("#modalEdicionLabel").text("Nueva Tarea");

    $("#infoAuditoria").addClass("d-none");
    $("#infoRegistro").html("");
    $("#infoModificacion").html("");
}

async function mostrarModal(modelo) {

   

    limpiarModal();

    setModalSoloLectura(false);

    $("#txtId").val(modelo.Id || "");

    $("#dtpFecha").val(normalizarDateInput(modelo.Fecha));
    $("#dtpFechaLimite").val(normalizarDateInput(modelo.FechaLimite));

    $("#txtDescripcion").val(modelo.Descripcion || "");

    await listaPersonal();
    await listaEstados();

    if (modelo.IdPersonal != null) $("#cmbPersonal").val(modelo.IdPersonal).trigger("change.select2");
    if (modelo.IdEstado != null) $("#cmbEstado").val(modelo.IdEstado).trigger("change.select2");

    inicializarSelect2Modal();

    // Auditoría
    let textoAuditoria = "";

    if (modelo.UsuarioModifica && modelo.FechaModifica) {
        textoAuditoria = `
            <i class="fa fa-edit"></i>
            Última modificación por 
            <strong>${modelo.UsuarioModifica}</strong> 
            el <strong>${formatearFecha(modelo.FechaModifica)}</strong>
        `;
        $("#infoModificacion").html(textoAuditoria);
        $("#infoRegistro").html("");
    } else if (modelo.UsuarioRegistra && modelo.FechaRegistra) {
        textoAuditoria = `
            <i class="fa fa-user"></i>
            Registrado por 
            <strong>${modelo.UsuarioRegistra}</strong> 
            el <strong>${formatearFecha(modelo.FechaRegistra)}</strong>
        `;
        $("#infoRegistro").html(textoAuditoria);
        $("#infoModificacion").html("");
    }

    if (textoAuditoria !== "") $("#infoAuditoria").removeClass("d-none");
    else $("#infoAuditoria").addClass("d-none");

    $('#modalEdicion').modal('show');

    $("#btnGuardar").html(`<i class="fa fa-check"></i> Guardar`);
    $("#modalEdicionLabel").text("Editar Tarea");
}

const editarTarea = id => {

    if (!Permisos.tiene("Tareas", "Editar")) {
        errorModal("No tenés permisos.");
        return;
    }

    fetch("/Tareas/EditarInfo?id=" + id, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(r => {
            if (!r.ok) throw new Error("Ha ocurrido un error.");
            return r.json();
        })
        .then(dataJson => {
            if (dataJson) mostrarModal(dataJson);
            else throw new Error("Ha ocurrido un error.");
        })
        .catch(_ => errorModal("Ha ocurrido un error."));
};

async function eliminarTarea(id) {
    

    if (!Permisos.tiene("Tareas", "Eliminar")) {
        errorModal("No tenés permisos.");
        return;
    }

    const confirmado = await confirmarModal("¿Desea eliminar esta tarea?");
    if (!confirmado) return;

    const scrollY = window.scrollY;

    try {
        const response = await fetch("/Tareas/Eliminar?id=" + id, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al eliminar la Tarea.");

        const dataJson = await response.json();
        if (dataJson.valor) {
            await listaTareas();
            exitoModal("Tarea eliminada correctamente");
            window.scrollTo({ top: scrollY, behavior: "instant" });
        } else {
            errorModal("No se pudo eliminar.");
        }
    } catch (e) {
        console.error("Ha ocurrido un error:", e);
        errorModal("Ha ocurrido un error.");
    }
}

/* =========================
   LISTA + DATATABLE
========================= */

async function listaTareas() {
    const paginaActual = gridTareas != null ? gridTareas.page() : 0;
    const scrollY = window.scrollY;

    const response = await fetch(`/Tareas/Lista`, {
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
        gridTareas.page(paginaActual).draw('page');
    }

    // ✅ evita “bajadas raras” por redraw
    window.scrollTo({ top: scrollY, behavior: "instant" });
}

async function configurarDataTable(data) {

    if (!gridTareas) {

        const $thead = $('#grd_Tareas thead');
        if ($thead.find('tr.filters').length === 0) {
            $thead.find('tr').first().clone(true).addClass('filters').appendTo($thead);
        }

        gridTareas = $('#grd_Tareas').DataTable({
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
                            ver: "verTarea",
                            editar: "editarTarea",
                            eliminar: "eliminarTarea"
                        }, "Tareas");
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Fecha', render: d => normalizarFechaTabla(d) },
                { data: 'FechaLimite', render: d => normalizarFechaTabla(d) },
                { data: 'Personal' },
                { data: 'Estado' },
                { data: 'Descripcion' },
            ],

            dom: 'Bfrtip',
            buttons: getBotonesExportacion(gridTareas, "Tareas"),

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

                        // ✅ limpiar real
                        $select.on('select2:clear', function () {
                            api.column(config.index).search('').draw(false);
                        });

                        // ✅ cambio
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
                        const $input = $(`<input class="rp-filter-input" type="text" placeholder="Buscar...">`)
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
        gridTareas.clear().rows.add(data).draw(false);
        actualizarKpis(data);
    }
}

/* =========================
   COMBOS MODAL
========================= */

function resetSelect(id, placeholder) {
    const el = document.getElementById(id);
    if (!el) return;

    // no mates el change global del país (acá no aplica), solo resetea opciones
    el.innerHTML = "";
    el.append(new Option(placeholder || "Seleccionar", ""));
}

async function listaPersonal() {
    const response = await fetch(`/Personal/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await response.json();

    resetSelect("cmbPersonal", "Seleccionar");
    const select = document.getElementById("cmbPersonal");
    (data || []).forEach(x => select.append(new Option(x.Nombre, x.Id)));

    inicializarSelect2Modal();
}

async function listaEstados() {
    const response = await fetch(`/TareasEstados/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await response.json();

    resetSelect("cmbEstado", "Seleccionar");
    const select = document.getElementById("cmbEstado");
    (data || []).forEach(x => select.append(new Option(x.Nombre, x.Id)));

    inicializarSelect2Modal();
}

/* =========================
   FILTROS - DATOS (para selects)
========================= */

async function listaPersonalFilter() {
    const response = await fetch(`/Personal/Lista`, { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await response.json();
    return (data || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

async function listaEstadosFilter() {
    const response = await fetch(`/TareasEstados/Lista`, { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await response.json();
    return (data || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

/* =========================
   CONFIG COLUMNAS
========================= */

function configurarOpcionesColumnas() {
    const grid = $('#grd_Tareas').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');

    const storageKey = `Tareas_Columnas`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") {

            const isChecked = savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;
            grid.column(index).visible(isChecked);

            const name = $('#grd_Tareas thead tr').first().find('th').eq(index).text();

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
        const columnIdx = parseInt($(this).data('column'), 10);
        const isChecked = $(this).is(':checked');

        savedConfig[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));

        grid.column(columnIdx).visible(isChecked);
    });
}

/* =========================
   VALIDACIONES
========================= */

function limpiarModal() {
    const formulario = document.querySelector("#modalEdicion");
    if (!formulario) return;

    formulario.querySelectorAll("input, select, textarea").forEach(el => {
        if (el.tagName === "SELECT") el.value = "";
        else el.value = "";
        el.classList.remove("is-invalid", "is-valid");
    });

    // limpiar select2 visible
    ["#cmbPersonal", "#cmbEstado"].forEach(sel => {
        const $s = $(sel);
        if ($s.length && $s.data("select2")) $s.val("").trigger("change.select2");
    });

    $("#errorCampos").addClass("d-none");
}

function validarCampoIndividual(el) {
    const id = el.id;

    const camposObligatorios = [
        "dtpFecha",
        "dtpFechaLimite",
        "cmbPersonal",
        "cmbEstado",
        "txtDescripcion"
    ];

    if (!camposObligatorios.includes(id)) return;

    const valor = (el.value ?? "").toString().trim();
    const esValido = valor !== "";

    setEstadoCampo(el, esValido);
    verificarErroresGenerales();
}

function verificarErroresGenerales() {
    const errorMsg = document.getElementById("errorCampos");
    if (!errorMsg) return;

    const hayInvalidos = document.querySelectorAll("#modalEdicion .is-invalid").length > 0;
    if (!hayInvalidos) errorMsg.classList.add("d-none");
}

function validarCampos() {
    const campos = [
        "#dtpFecha",
        "#dtpFechaLimite",
        "#cmbPersonal",
        "#cmbEstado",
        "#txtDescripcion"
    ];

    let valido = true;

    campos.forEach(selector => {
        const el = document.querySelector(selector);
        const valor = (el?.value ?? "").toString().trim();
        const esValido = !!el && valor !== "";

        if (!esValido) valido = false;
        if (el) setEstadoCampo(el, esValido);
    });

    document.getElementById("errorCampos")?.classList.toggle("d-none", valido);
    return valido;
}

/* =========================
   KPI + helpers
========================= */

function actualizarKpis(data) {
    const cant = Array.isArray(data) ? data.length : 0;
    $('#kpiCantTareas').text(cant);
}

function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


const verTarea = id => {

    fetch("/Tareas/EditarInfo?id=" + id, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(r => {
            if (!r.ok) throw new Error("Ha ocurrido un error.");
            return r.json();
        })
        .then(async dataJson => {

            if (!dataJson) throw new Error("Ha ocurrido un error.");

            await mostrarModal(dataJson);

            // ⭐ GLOBAL
            setModalSoloLectura(true);

            $("#modalEdicionLabel").text("Ver Tarea");
        })
        .catch(_ => errorModal("Ha ocurrido un error."));
};