let gridRepresentantes;

/**
 * Columnas:
 * 0 Acciones
 * 1 Nombre
 * 2 DNI
 * 3 País (select)
 * 4 Tipo Doc (select dependiente de país)
 * 5 Nro Doc
 * 6 Dirección
 * 7 Teléfono
 * 8 Email
 */
const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'select', fetchDataFunc: listaPaisesFilter },
    { index: 4, filterType: 'select', fetchDataFunc: listaTiposDocumentoFilter },
    { index: 5, filterType: 'text' },
    { index: 6, filterType: 'text' },
    { index: 7, filterType: 'text' },
    { index: 8, filterType: 'text' },
];

$(document).ready(() => {

    listaRepresentantes();

    document.querySelectorAll("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").forEach(el => {
        el.setAttribute("autocomplete", "off");
        el.addEventListener("input", () => validarCampoIndividual(el));
        el.addEventListener("change", () => validarCampoIndividual(el));
        el.addEventListener("blur", () => validarCampoIndividual(el));
    });

    // Evento cambio país → cargar tipos documento
    $("#cmbPais").on("change", function () {
        const idPais = $(this).val();
        listaTiposDocumento(idPais);
    });

});

/* =========================
   CRUD
========================= */

function guardarCambios() {
    if (!validarCampos()) return false;

    const id = $("#txtId").val();

    const modelo = {
        "Id": id !== "" ? id : 0,
        "Nombre": $("#txtNombre").val(),
        "Dni": $("#txtDni").val(),
        "IdPais": $("#cmbPais").val() || null,
        "IdTipoDocumento": $("#cmbTipoDocumento").val() || null,
        "NumeroDocumento": $("#txtNumeroDocumento").val(),
        "Telefono": $("#txtTelefono").val(),
        "Direccion": $("#txtDireccion").val(),
        "Email": $("#txtEmail").val()
    };

    const url = id === "" ? "/Representantes/Insertar" : "/Representantes/Actualizar";
    const method = id === "" ? "POST" : "PUT";

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
            const mensaje = id === "" ? "Representante registrado correctamente" : "Representante modificado correctamente";
            $('#modalEdicion').modal('hide');
            exitoModal(mensaje);
            listaRepresentantes();
        })
        .catch(err => {
            console.error('Error:', err);
            errorModal("Ha ocurrido un error.");
        });
}

function nuevoRepresentante() {
    limpiarModal();
    listaPaises();
   

    $('#modalEdicion').modal('show');

    $("#btnGuardar").html(`<i class="fa fa-check"></i> Registrar`);
    $("#modalEdicionLabel").text("Nuevo Representante");

    $("#infoAuditoria").addClass("d-none");
    $("#infoRegistro").html("");
    $("#infoModificacion").html("");
}

async function mostrarModal(modelo) {
    limpiarModal();

    $("#txtId").val(modelo.Id || "");
    $("#txtNombre").val(modelo.Nombre || "");
    $("#txtDni").val(modelo.Dni || "");
    $("#txtNumeroDocumento").val(modelo.NumeroDocumento || "");
    $("#txtDireccion").val(modelo.Direccion || "");
    $("#txtTelefono").val(modelo.Telefono || "");
    $("#txtEmail").val(modelo.Email || "");

    await listaPaises();

    if (modelo.IdPais != null) {
        $("#cmbPais").val(modelo.IdPais);
        await listaTiposDocumento(modelo.IdPais);
    }

    if (modelo.IdTipoDocumento != null) {
        $("#cmbTipoDocumento").val(modelo.IdTipoDocumento);
    }

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

    if (textoAuditoria !== "") {
        $("#infoAuditoria").removeClass("d-none");
    } else {
        $("#infoAuditoria").addClass("d-none");
    }


    $('#modalEdicion').modal('show');

    $("#btnGuardar").html(`<i class="fa fa-check"></i> Guardar`);
    $("#modalEdicionLabel").text("Editar Representante");
}

const editarRepresentante = id => {
    

    fetch("/Representantes/EditarInfo?id=" + id, {
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

async function eliminarRepresentante(id) {
    

    const confirmado = await confirmarModal("¿Desea eliminar este representante?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Representantes/Eliminar?id=" + id, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al eliminar el Representante.");

        const dataJson = await response.json();
        if (dataJson.valor) {
            listaRepresentantes();
            exitoModal("Representante eliminado correctamente");
        }
    } catch (e) {
        console.error("Ha ocurrido un error:", e);
        errorModal("Ha ocurrido un error.");
    }
}

/* =========================
   LISTA + DATATABLE
========================= */

async function listaRepresentantes() {
    let paginaActual = gridRepresentantes != null ? gridRepresentantes.page() : 0;

    const response = await fetch(`/Representantes/Lista`, {
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
        gridRepresentantes.page(paginaActual).draw('page');
    }
}

async function configurarDataTable(data) {

    if (!gridRepresentantes) {

        const $thead = $('#grd_Representantes thead');
        if ($thead.find('tr.filters').length === 0) {
            $thead.find('tr').first().clone(true).addClass('filters').appendTo($thead);
        }

        gridRepresentantes = $('#grd_Representantes').DataTable({
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
                        return `
                <div class="acciones-menu" data-id="${data}">
                    <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})'>
                        <i class='fa fa-ellipsis-v fa-lg text-white'></i>
                    </button>
                    <div class="acciones-dropdown" style="display: none;">
                        <button class='btn btn-sm btneditar' onclick='editarRepresentante(${data})'>
                            <i class='fa fa-pencil-square-o text-success'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' onclick='eliminarRepresentante(${data})'>
                            <i class='fa fa-trash-o text-danger'></i> Eliminar
                        </button>
                    </div>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre' },
                { data: 'Dni' },
                { data: 'Pais' },
                { data: 'TipoDocumento' },
                { data: 'NumeroDocumento' },
                { data: 'Direccion' },
                { data: 'Telefono' },
                { data: 'Email' },
            ],

            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Excel',
                    className: 'rp-dt-btn',
                    exportOptions: {
                        columns: ':visible:not(:first-child)'
                    }
                },
                {
                    extend: 'pdfHtml5',
                    text: 'PDF',
                    className: 'rp-dt-btn',
                    exportOptions: {
                        columns: ':visible:not(:first-child)'
                    }
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    className: 'rp-dt-btn',
                    exportOptions: {
                        columns: ':visible:not(:first-child)'
                    }
                },
                'pageLength'
            ],


            orderCellsTop: true,
            fixedHeader: true,

            initComplete: async function () {
                const api = this.api();

                for (const config of columnConfig) {

                    if (config.index > 8) continue;

                    const cell = $('.filters th').eq(config.index);

                    if (config.filterType === 'select') {

                        const select = $(`<select class="rp-filter-select">
                                            <option value="">Todos</option>
                                          </select>`)
                            .appendTo(cell.empty())
                            .on('change', async function () {
                                const selectedText = $(this).find('option:selected').text();
                                const use = (selectedText && selectedText !== "Todos");

                                await api.column(config.index)
                                    .search(use ? '^' + escapeRegex(selectedText) + '$' : '', true, false)
                                    .draw();
                            });

                        const datos = await config.fetchDataFunc();
                        (datos || []).forEach(item => {
                            select.append(`<option value="${item.Id}">${item.Nombre}</option>`);
                        });

                    } else {

                        const input = $(`<input class="rp-filter-input" type="text" placeholder="Buscar...">`)
                            .appendTo(cell.empty())
                            .on('keyup change', function () {
                                api.column(config.index)
                                    .search(this.value)
                                    .draw();
                            });
                    }
                }

                $('.filters th').eq(0).html('');
                configurarOpcionesColumnas();
                actualizarKpis(data);
            }
        });

    } else {
        gridRepresentantes.clear().rows.add(data).draw();
        actualizarKpis(data);
    }
}

/* =========================
   COMBOS
========================= */

async function listaPaises() {
    const response = await fetch(`/Paises/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await response.json();

    $('#cmbPais option').remove();
    const select = document.getElementById("cmbPais");

    select.append(new Option("Seleccionar", ""));

    data.forEach(x => {
        select.append(new Option(x.Nombre, x.Id));
    });
}

async function listaTiposDocumento(idPaisSeleccionado = null) {
    const response = await fetch(`/PaisesTiposDocumentos/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await response.json();

    $('#cmbTipoDocumento option').remove();
    const select = document.getElementById("cmbTipoDocumento");

    select.append(new Option("Seleccionar", ""));

    data
        .filter(x => !idPaisSeleccionado || x.IdCombo == idPaisSeleccionado)
        .forEach(x => {
            select.append(new Option(x.Nombre, x.Id));
        });
}

/* =========================
   FILTROS
========================= */

async function listaPaisesFilter() {
    const response = await fetch(`/Paises/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await response.json();
    return data;
}

async function listaTiposDocumentoFilter() {
    const response = await fetch(`/PaisesTiposDocumentos/Lista`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await response.json();
    return data.map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

/* =========================
   CONFIG COLUMNAS
========================= */

function configurarOpcionesColumnas() {
    const grid = $('#grd_Representantes').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');

    const storageKey = `Representantes_Columnas`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") {

            const isChecked = savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;
            grid.column(index).visible(isChecked);

            const name = $('#grd_Representantes thead tr').first().find('th').eq(index).text();

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
   ACCIONES DROPDOWN
========================= */

function toggleAcciones(id) {
    var $dropdown = $(`.acciones-menu[data-id="${id}"] .acciones-dropdown`);

    if ($dropdown.is(":visible")) {
        $dropdown.hide();
    } else {
        
        $dropdown.show();
    }
}

$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) {
        
    }
});
/* =========================
   VALIDACIONES
========================= */

function limpiarModal() {
    const formulario = document.querySelector("#modalEdicion");
    if (!formulario) return;

    formulario.querySelectorAll("input, select, textarea").forEach(el => {
        if (el.tagName === "SELECT") el.selectedIndex = 0;
        else el.value = "";

        el.classList.remove("is-invalid", "is-valid");
    });

    $("#errorCampos").addClass("d-none");
}

function validarCampoIndividual(el) {
    const id = el.id;
    const valor = el.value ? el.value.trim() : "";

    const camposObligatorios = ["txtNombre", "txtDni", "cmbPais", "cmbTipoDocumento"];

    if (!camposObligatorios.includes(id)) return;

    if (valor === "" || valor === "Seleccionar") {
        el.classList.remove("is-valid");
        el.classList.add("is-invalid");
    } else {
        el.classList.remove("is-invalid");
        el.classList.add("is-valid");
    }

    verificarErroresGenerales();
}

function verificarErroresGenerales() {
    const errorMsg = document.getElementById("errorCampos");
    const hayInvalidos = document.querySelectorAll("#modalEdicion .is-invalid").length > 0;
    if (!errorMsg) return;

    if (!hayInvalidos) errorMsg.classList.add("d-none");
}

function validarCampos() {
    const campos = [
        "#txtNombre",
        "#txtDni",
        "#cmbPais",
        "#cmbTipoDocumento"
    ];

    let valido = true;

    campos.forEach(selector => {
        const campo = document.querySelector(selector);
        const valor = campo?.value.trim();

        if (!campo || !valor || valor === "Seleccionar") {
            campo?.classList.add("is-invalid");
            campo?.classList.remove("is-valid");
            valido = false;
        } else {
            campo.classList.remove("is-invalid");
            campo.classList.add("is-valid");
        }
    });

    document.getElementById("errorCampos").classList.toggle("d-none", valido);
    return valido;
}


/* =========================
   KPI + helpers
========================= */

function actualizarKpis(data) {
    const cant = Array.isArray(data) ? data.length : 0;
    $('#kpiCantRepresentantes').text(cant);
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
