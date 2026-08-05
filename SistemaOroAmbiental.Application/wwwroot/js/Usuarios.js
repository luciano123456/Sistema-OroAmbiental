let gridUsuarios;

let permisosUsuarioCache = [];
let permisosUsuarioOriginal = [];
let usuarioPermisosModo = "nuevo"; // nuevo | editar | ver
let moduloPermisoSeleccionadoId = 0;

let sucursalesTodasCache = [];
let sucursalesUsuarioIds = [];
let validacionUsuarioModal = null;

const PERMISOS_COLUMNAS = ["VER", "CREAR", "EDITAR", "ELIMINAR", "EXPORTAR"];

const columnConfig = [
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'text' },
    { index: 6, filterType: 'text' },
    { index: 7, filterType: 'text' },
    { index: 8, filterType: 'select', fetchDataFunc: listaRolesFilter },
    { index: 9, filterType: 'select', fetchDataFunc: listaEstadosFilter }
];

registrarFiltrosGrilla('grd_Usuarios', columnConfig, {
    includeActivo: false,
    maxColumnIndex: 9
});

$(document).ready(() => {
    listaUsuarios();
    // Solo presencia (payload mínimo), sin recargar DataTables
    setInterval(() => {
        if (document.visibilityState === "visible") refrescarPresenciaUsuarios();
    }, 60000);
    cargarTodasSucursalesParaAsignar();

    document.addEventListener("configuracionActualizada", async (e) => {
        const d = e.detail || {};
        if (d.tipo === "Roles") {
            await listaRoles();
            if (d.nuevoId) $("#Roles").val(d.nuevoId).trigger("change");
        }
        if (d.tipo === "UsuariosEstados") {
            await listaEstados();
            if (d.nuevoId) $("#Estados").val(d.nuevoId).trigger("change");
        }
    });

    document.querySelectorAll("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").forEach(el => {
        el.setAttribute("autocomplete", "off");
    });

    initValidacionUsuarioModal();

    $("#Roles").on("change", function () {
        actualizarBadgeUsuarioPermisos();
    });

    $("#txtUsuario, #txtNombre, #txtApellido").on("input", function () {
        actualizarBadgeUsuarioPermisos();
        actualizarBadgeUsuarioSucursales();
    });

    $(document).on("input", "#txtBuscarModuloPermiso", function () {
        renderListaModulosPermisos($(this).val() || "");
    });
});

/* =========================
   CRUD
========================= */

async function guardarCambios() {

    if (!validarCampos()) return false;

    return withBusy("#btnGuardar", async () => {
    const idUsuario = $("#txtId").val();

    const nuevoModelo = {
        "Id": idUsuario !== "" ? idUsuario : 0,
        "Usuario": $("#txtUsuario").val(),
        "Nombre": $("#txtNombre").val(),
        "Apellido": $("#txtApellido").val(),
        "DNI": $("#txtDni").val(),
        "Telefono": $("#txtTelefono").val(),
        "Direccion": $("#txtDireccion").val(),
        "Correo": $("#txtCorreo").val(),
        "IdRol": $("#Roles").val(),
        "IdEstado": $("#Estados").val(),
        "Contrasena": idUsuario === "" ? $("#txtContrasena").val() : "",
        "ContrasenaNueva": $("#txtContrasenaNueva").val(),
        "CambioAdmin": 1
    };

    const url = idUsuario === "" ? "/Usuarios/Insertar" : "/Usuarios/Actualizar";
    const method = idUsuario === "" ? "POST" : "PUT";

    try {

        // 🔥 1. GUARDAR USUARIO
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(nuevoModelo)
        });

        if (!response.ok) throw new Error("Error al guardar usuario");

        const dataJson = await response.json();

        if (dataJson.valor === 'Contrasena') {
            errorModal("Contrasena incorrecta");
            return;
        }

        // 🔥 2. OBTENER ID (clave)
        let idFinal = Number($("#txtId").val());

        if (!idFinal || idFinal <= 0) {
            idFinal =
                normalizarIdUsuarioGuardado(dataJson?.Id) ||
                normalizarIdUsuarioGuardado(dataJson?.id) ||
                normalizarIdUsuarioGuardado(dataJson?.IdUsuario) ||
                normalizarIdUsuarioGuardado(dataJson?.idUsuario) ||
                normalizarIdUsuarioGuardado(dataJson?.valor);
        }

        if (!idFinal || idFinal <= 0) {
            errorModal("No se pudo obtener el ID del usuario.");
            return;
        }

        $("#txtId").val(idFinal);

        // 🔥 3. GUARDAR PERMISOS (SI EXISTEN)
        if (permisosUsuarioCache && permisosUsuarioCache.length > 0) {

            const lista = [];

            (permisosUsuarioCache || []).forEach(mod => {

                const idModulo = Number(mod.IdModulo);
                if (!idModulo) return;

                (mod.Permisos || []).forEach(p => {

                    lista.push({
                        IdUsuario: idFinal,
                        IdModulo: idModulo,
                        Permiso: p.Codigo,
                        Activo: !!p.Activo
                    });

                });

            });

            await fetch(`/UsuariosPermisos/ActualizarMasivo`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: JSON.stringify({
                    IdUsuario: idFinal,
                    Permisos: lista
                })
            });
        }

        await guardarSucursalesUsuario(idFinal);

        // 🔥 4. FIN
        $('#modalEdicion').modal('hide');

        exitoModal(idUsuario === ""
            ? "Usuario guardado correctamente"
            : "Usuario actualizado correctamente");

        await listaUsuarios();

    } catch (err) {
        console.error(err);
        errorModal("Error al guardar usuario y permisos.");
    }
    });
}
function nuevoUsuario() {
    limpiarModal();
    listaEstados();
    listaRoles();

    usuarioPermisosModo = "nuevo";
    setModalSoloLectura(false);
    $('#modalEdicion').modal('show');

    $("#btnGuardar").html(`<i class="fa fa-check"></i> Registrar`);
    $("#modalEdicionLabel").text("Nuevo Usuario");

    document.getElementById("divContrasena").removeAttribute("hidden");
    document.getElementById("divContrasenaNueva").setAttribute("hidden", "hidden");

    prepararPermisosEnModalNuevo();
    prepararSucursalesEnModalNuevo();
}

async function mostrarModal(modelo) {
    limpiarModal();

    usuarioPermisosModo = "editar";
    setModalSoloLectura(false);

    const campos = ["Id", "Usuario", "Nombre", "Apellido", "Dni", "Telefono", "Direccion", "Correo", "Contrasena", "ContrasenaNueva"];
    campos.forEach(campo => {
        const el = $(`#txt${campo}`);
        if (el.length) el.val(modelo[campo] ?? "");
    });

    await listaEstados();
    await listaRoles();

    if (modelo.IdRol != null) $("#Roles").val(modelo.IdRol);
    if (modelo.IdEstado != null) $("#Estados").val(modelo.IdEstado);

    $('#modalEdicion').modal('show');

    $("#btnGuardar").html(`<i class="fa fa-check"></i> Guardar`);
    $("#modalEdicionLabel").text("Editar Usuario");

    document.getElementById("divContrasena").setAttribute("hidden", "hidden");
    document.getElementById("divContrasenaNueva").removeAttribute("hidden");

    actualizarBadgeUsuarioPermisos();
    habilitarSeccionPermisos(true);
    await cargarPermisosUsuario(modelo.Id);
    await cargarSucursalesUsuario(modelo.Id);
}

window.editarUsuario = function editarUsuario(id) {
    $('.rp-actions-dropdown').hide();

    fetch("/Usuarios/EditarInfo?id=" + id, {
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

async function eliminarUsuario(id) {
    $('.rp-actions-dropdown').hide();

    const confirmado = await confirmarModal("¿Desea eliminar este usuario?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Usuarios/Eliminar?id=" + id, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al eliminar el Usuario.");

        const dataJson = await response.json();
        if (dataJson.valor) {
            listaUsuarios();
            exitoModal("Usuario eliminado correctamente");
        }
    } catch (e) {
        console.error("Ha ocurrido un error:", e);
        errorModal("Ha ocurrido un error.");
    }
}

/* =========================
   LISTA + DATATABLE
========================= */

async function listaUsuarios() {
    let paginaActual = gridUsuarios != null ? gridUsuarios.page() : 0;

    const response = await fetch(`/Usuarios/Lista`, {
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
        gridUsuarios.page(paginaActual).draw('page');
    }
}

function rpBadgeEstado(estado) {
    const s = (estado || "").toString().toLowerCase();
    if (s.includes("bloq")) return `<span class="rp-badge rp-badge-danger">Bloqueado</span>`;
    if (s.includes("acti")) return `<span class="rp-badge rp-badge-success">Activo</span>`;
    return `<span class="rp-badge rp-badge-soft">${estado || "-"}</span>`;
}

async function configurarDataTable(data) {

    if (!gridUsuarios) {

        gridUsuarios = $('#grd_Usuarios').DataTable({
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
                    ver: "verUsuario",
                    editar: "editarUsuario",
                    eliminar: "eliminarUsuario"
                }, "Usuarios", (id, type, row) => {
                    const user = String(row?.Usuario || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
                    return `
                    <div class="rp-row-actions" data-id="${id}">
                        <button type="button" class="btn btn-sm rp-act rp-act-view" title="Ver" onclick="verUsuario(${id})">
                            <i class="fa fa-file-text-o"></i>
                        </button>
                        <button type="button" class="btn btn-sm rp-act rp-act-edit" title="Editar" onclick="editarUsuario(${id})">
                            <i class="fa fa-pencil-square-o"></i>
                        </button>
                        <button type="button" class="btn btn-sm rp-act rp-act-eye" title="Historial de conexiones"
                            onclick="verHistorialConexionesUsuario(${id}, '${user}')">
                            <i class="fa fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm rp-act rp-act-del" title="Eliminar" onclick="eliminarUsuario(${id})">
                            <i class="fa fa-trash-o"></i>
                        </button>
                    </div>`;
                }),
                columnaGridId(),
                {
                    data: 'Usuario',
                    render: function (data, type, row) {
                        if (type === "sort" || type === "filter" || type === "type") return data || "";
                        if (type === "export" || type === "print") return data || "";
                        const online = !!row?.EnLinea;
                        return `<span class="usr-user-cell">
                            <span class="usr-presence ${online ? "is-online" : "is-offline"}" title="${online ? "En línea" : "Desconectado"}">
                                <span class="usr-presence-dot"></span>
                            </span>
                            <span class="usr-user-name">${escapeHtml(data)}</span>
                            <span class="usr-presence-label ${online ? "is-online" : "is-offline"}">${online ? "En línea" : "Offline"}</span>
                        </span>`;
                    }
                },
                { data: 'Nombre' },
                { data: 'Apellido' },
                { data: 'Dni' },
                { data: 'Telefono' },
                { data: 'Direccion' },
                { data: 'UsuariosRol' },
                {
                    data: 'Estado',
                    render: function (data) {
                        return rpBadgeEstado(data);
                    }
                },
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Excel',
                    filename: 'Reporte Usuarios',
                    title: '',
                    className: 'rp-dt-btn'
                },
                {
                    extend: 'pdfHtml5',
                    text: 'PDF',
                    filename: 'Reporte Usuarios',
                    title: '',
                    className: 'rp-dt-btn'
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    className: 'rp-dt-btn'
                },
                {
                    extend: "pageLength",
                    background: false,
                    className: "rp-dt-btn-length"
                }
            ],
            orderCellsTop: true,
            fixedHeader: true,
            drawCallback: function () {
                if (typeof ajustarColumnasGrillaLista === "function") {
                    ajustarColumnasGrillaLista(this.api(), "#grd_Usuarios");
                }
            },
            initComplete: async function () {
                const api = this.api();
                await armarFiltrosGrillaLista(api, '#grd_Usuarios', columnConfig, {
                    includeActivo: false,
                    maxColumnIndex: 9
                });
                configurarOpcionesColumnas();
                setTimeout(() => gridUsuarios.columns.adjust(), 10);
                actualizarKpis(data);
            }
        });

    } else {
        gridUsuarios.clear().rows.add(data).draw();
        actualizarKpis(data);
    }
}

/* =========================
   ROLES / ESTADOS
========================= */

async function listaRoles() {
    const response = await fetch(`/UsuariosRoles/Lista`);
    const data = await response.json();

    $('#Roles option').remove();
    const select = document.getElementById("Roles");

    const op0 = document.createElement("option");
    op0.value = "";
    op0.text = "Seleccionar";
    select.appendChild(op0);

    for (let i = 0; i < data.length; i++) {
        const option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);
    }
}

async function listaEstados() {
    const response = await fetch(`/UsuariosEstados/Lista`);
    const data = await response.json();

    $('#Estados option').remove();
    const select = document.getElementById("Estados");

    const op0 = document.createElement("option");
    op0.value = "";
    op0.text = "Seleccionar";
    select.appendChild(op0);

    for (let i = 0; i < data.length; i++) {
        const option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);
    }
}

async function listaEstadosFilter() {
    const response = await fetch(`/UsuariosEstados/Lista`);
    const data = await response.json();
    return (data || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

async function listaRolesFilter() {
    const response = await fetch(`/UsuariosRoles/Lista`);
    const data = await response.json();
    return (data || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

/* =========================
   CONFIG COLUMNAS
========================= */

function configurarOpcionesColumnas() {
    const grid = $('#grd_Usuarios').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');

    const storageKey = `Usuarios_Columnas`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        if (typeof esColumnaMenuGrilla === "function" ? esColumnaMenuGrilla(col) : (col.data && col.data !== "Id")) {
            const isChecked = savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;
            grid.column(index).visible(isChecked);

            const name = (index === 6) ? "Direccion" : (col.data || "Col");

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
   ACCIONES DROPDOWN
========================= */

function toggleAcciones(id) {
    const $dropdown = $(`.acciones-menu[data-id="${id}"] .acciones-dropdown`);

    if ($dropdown.is(":visible")) {
        $dropdown.hide();
    } else {
        $(".acciones-dropdown").hide();
        $dropdown.show();
    }
}

$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) {
        $(".acciones-dropdown").hide();
    }
});

/* =========================
   VALIDACIONES
========================= */

function limpiarModal() {
    const formulario = document.querySelector("#modalEdicion");
    if (!formulario) return;

    formulario.querySelectorAll("input, select, textarea").forEach(el => {
        if (el.id === "txtBuscarModuloPermiso") {
            el.value = "";
            return;
        }

        if (el.tagName === "SELECT") el.selectedIndex = 0;
        else if (el.type === "checkbox") el.checked = false;
        else el.value = "";

        el.classList.remove("is-invalid", "is-valid");
        el.removeAttribute("disabled");
        el.removeAttribute("readonly");
    });

    validacionUsuarioModal?.reset();

    permisosUsuarioCache = [];
    permisosUsuarioOriginal = [];
    moduloPermisoSeleccionadoId = 0;

    actualizarBadgeUsuarioPermisos();
    renderPermisosPlaceholder("Guarda el usuario para administrar permisos.");
    habilitarSeccionPermisos(false);
    actualizarResumenPermisos();

    sucursalesUsuarioIds = [];
    renderSucursalesUsuarioPlaceholder("Guarda el usuario para asignar sucursales.");
    habilitarSeccionSucursales(false);
    actualizarResumenSucursalesUsuario();
}

function getCamposObligatoriosUsuario() {
    const campos = [
        { id: "txtNombre", nombre: "Nombre" },
        { id: "txtUsuario", nombre: "Usuario" },
        { id: "txtApellido", nombre: "Apellido" },
        { id: "txtDni", nombre: "DNI" },
        { id: "Roles", nombre: "Rol" },
        { id: "Estados", nombre: "Estado" }
    ];

    if (($("#txtId").val() || "") === "") {
        campos.push({ id: "txtContrasena", nombre: "Contrasena" });
    }

    return campos;
}

function valorCampoValidoUsuario(el) {
    const valor = (el?.value ?? "").toString().trim();
    return valor !== "" && valor !== "Seleccionar";
}

function initValidacionUsuarioModal() {
    const modal = document.getElementById("modalEdicion");
    if (!modal || typeof ValidacionModalAbm !== "function") return;

    validacionUsuarioModal = new ValidacionModalAbm({
        modalEl: modal,
        getPanel: () => document.getElementById("errorCampos"),
        getCampos: getCamposObligatoriosUsuario,
        esCampoValido: valorCampoValidoUsuario,
        mostrarError: (msg) => {
            if (typeof mostrarErrorCampos === "function") {
                mostrarErrorCampos(msg, null, "validacion");
            }
        },
        cerrarPanel: cerrarErrorCampos
    });

    validacionUsuarioModal.attachEvents({ select2Namespace: "usuarios-abm" });
}

function validarCampoIndividual(el) {
    return validacionUsuarioModal?.onBlur(el);
}

function validarCampos() {
    return validacionUsuarioModal?.validarTodos() ?? false;
}

function cerrarErrorCampos() {
    const panel = document.getElementById("errorCampos");
    if (!panel) return;
    panel.classList.add("d-none");
    panel.innerHTML = "";
}

function actualizarKpis(data) {
    const cant = Array.isArray(data) ? data.length : 0;
    const el = document.getElementById('kpiCantUsuarios');
    if (el) el.textContent = cant;
}

function setModalSoloLectura(soloLectura) {
    const inputs = document.querySelectorAll("#modalEdicion input, #modalEdicion select, #modalEdicion textarea");

    inputs.forEach(el => {
        if (el.id === "txtId") return;
        if (el.id === "txtBuscarModuloPermiso") return;

        if (soloLectura) {
            if (el.tagName === "SELECT" || el.type === "checkbox") {
                el.setAttribute("disabled", "disabled");
            } else {
                el.setAttribute("readonly", "readonly");
            }
        } else {
            el.removeAttribute("disabled");
            el.removeAttribute("readonly");
        }
    });

    $("#btnGuardar").prop("disabled", !!soloLectura);
}

const verUsuario = id => {
    fetch("/Usuarios/EditarInfo?id=" + id, {
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

            usuarioPermisosModo = "ver";
            await mostrarModal(dataJson);

            setModalSoloLectura(true);
            document.getElementById("divContrasenaNueva").setAttribute("hidden", "hidden");

            $("#modalEdicionLabel").text("Ver Usuario");
            bloquearControlesPermisos(true);
        })
        .catch(_ => errorModal("Ha ocurrido un error."));
};

/* =========================
   SUCURSALES
========================= */

async function cargarTodasSucursalesParaAsignar() {
    try {
        const response = await fetch("/Sucursales/ListaTodas", {
            headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json"
            }
        });
        sucursalesTodasCache = response.ok ? await response.json() : [];
    } catch {
        sucursalesTodasCache = [];
    }
}

function prepararSucursalesEnModalNuevo() {
    sucursalesUsuarioIds = [];
    renderSucursalesUsuarioPlaceholder("Guarda el usuario para asignar sucursales.");
    habilitarSeccionSucursales(false);
    actualizarBadgeUsuarioSucursales();
    actualizarResumenSucursalesUsuario();
}

function habilitarSeccionSucursales(habilitar) {
    const section = document.getElementById("sectionSucursalesUsuario");
    const hint = document.getElementById("sucursalHint");
    if (!section || !hint) return;

    if (habilitar) {
        section.classList.remove("rp-section-disabled");
        hint.classList.add("success");
        hint.innerHTML = `<i class="fa fa-check-circle"></i> Marca las sucursales a las que puede acceder.`;
    } else {
        section.classList.add("rp-section-disabled");
        hint.classList.remove("success");
        hint.innerHTML = `<i class="fa fa-info-circle"></i> Guarda el usuario para asignar sucursales.`;
    }

    $("#listaSucursalesUsuario").find("input[type=checkbox]").prop("disabled", !habilitar || usuarioPermisosModo === "ver");
}

function actualizarBadgeUsuarioSucursales() {
    const usuario = ($("#txtUsuario").val() || "").trim();
    const nombre = ($("#txtNombre").val() || "").trim();
    const apellido = ($("#txtApellido").val() || "").trim();

    let texto = "Nuevo";
    if (usuario || nombre || apellido) {
        texto = [usuario, nombre, apellido].filter(Boolean).join(" · ");
    }

    $("#sucUsuarioNombre").text(texto);
}

function renderSucursalesUsuarioPlaceholder(texto) {
    $("#listaSucursalesUsuario").html(`<div class="rp-perm-empty-state">${texto}</div>`);
}

function renderSucursalesUsuarioUI() {
    const $lista = $("#listaSucursalesUsuario");
    $lista.empty();

    if (!sucursalesTodasCache.length) {
        renderSucursalesUsuarioPlaceholder("No hay sucursales cargadas en el sistema.");
        return;
    }

    sucursalesTodasCache.forEach(s => {
        const id = Number(s.Id);
        const checked = sucursalesUsuarioIds.includes(id);
        $lista.append(`
            <label class="rp-suc-card ${checked ? "is-checked" : ""}" data-id="${id}">
                <input type="checkbox" value="${id}" ${checked ? "checked" : ""} />
                <span class="rp-suc-name">${s.Nombre}</span>
            </label>
        `);
    });

    $lista.off("change.suc").on("change.suc", "input[type=checkbox]", function () {
        const id = Number($(this).val());
        const checked = $(this).is(":checked");
        $(this).closest(".rp-suc-card").toggleClass("is-checked", checked);

        if (checked) {
            if (!sucursalesUsuarioIds.includes(id)) sucursalesUsuarioIds.push(id);
        } else {
            sucursalesUsuarioIds = sucursalesUsuarioIds.filter(x => x !== id);
        }
        actualizarResumenSucursalesUsuario();
    });

    actualizarResumenSucursalesUsuario();
}

function actualizarResumenSucursalesUsuario() {
    $("#sucCantAsignadas").text(sucursalesUsuarioIds.length);
}

function marcarTodasSucursalesUsuario(valor) {
    if (usuarioPermisosModo === "ver") return;
    sucursalesUsuarioIds = valor
        ? (sucursalesTodasCache || []).map(s => Number(s.Id)).filter(x => x > 0)
        : [];
    renderSucursalesUsuarioUI();
    habilitarSeccionSucursales(true);
}

async function cargarSucursalesUsuario(idUsuario) {
    await cargarTodasSucursalesParaAsignar();

    if (!idUsuario || Number(idUsuario) <= 0) {
        prepararSucursalesEnModalNuevo();
        return;
    }

    try {
        const response = await fetch(`/Usuarios/SucursalesAsignadas?idUsuario=${idUsuario}`, {
            headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) throw new Error();

        const data = await response.json();
        sucursalesUsuarioIds = (data.IdsSucursales || []).map(x => Number(x)).filter(x => x > 0);
    } catch {
        sucursalesUsuarioIds = [];
    }

    renderSucursalesUsuarioUI();
    habilitarSeccionSucursales(true);
    actualizarBadgeUsuarioSucursales();
}

async function guardarSucursalesUsuario(idUsuario) {
    const ids = (sucursalesUsuarioIds || []).map(x => Number(x)).filter(x => x > 0);

    await fetch("/Usuarios/SucursalesActualizar", {
        method: "POST",
        headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify({
            IdUsuario: idUsuario,
            IdsSucursales: ids
        })
    });
}

/* =========================
   PERMISOS
========================= */

function prepararPermisosEnModalNuevo() {
    permisosUsuarioCache = [];
    permisosUsuarioOriginal = [];
    moduloPermisoSeleccionadoId = 0;
    renderPermisosPlaceholder("Guarda el usuario para administrar permisos.");
    habilitarSeccionPermisos(false);
    actualizarBadgeUsuarioPermisos();
    actualizarResumenPermisos();
}

function habilitarSeccionPermisos(habilitar) {
    const section = document.getElementById("sectionPermisosUsuario");
    const hint = document.getElementById("permisoHint");

    if (!section || !hint) return;

    if (habilitar) {
        section.classList.remove("rp-section-disabled");
        hint.classList.add("success");
        hint.innerHTML = `<i class="fa fa-check-circle"></i> Ya podes administrar permisos por modulo.`;
    } else {
        section.classList.add("rp-section-disabled");
        hint.classList.remove("success");
        hint.innerHTML = `<i class="fa fa-info-circle"></i> Guarda el usuario para administrar permisos.`;
    }

    bloquearControlesPermisos(usuarioPermisosModo === "ver" || !habilitar);
}

function bloquearControlesPermisos(bloquear) {
    $("#btnGuardarPermisos").prop("disabled", bloquear);
    $("#btnResetPermisos").prop("disabled", bloquear);
    $("#btnCopiarRolPermisos").prop("disabled", bloquear);
    $("#btnPermisosTodos").prop("disabled", bloquear);
    $("#btnPermisosNinguno").prop("disabled", bloquear);
    $("#txtBuscarModuloPermiso").prop("disabled", bloquear);

    $("#permDetalleContainer").find("input, button").prop("disabled", bloquear);
}

function actualizarBadgeUsuarioPermisos() {
    const usuario = ($("#txtUsuario").val() || "").trim();
    const nombre = ($("#txtNombre").val() || "").trim();
    const apellido = ($("#txtApellido").val() || "").trim();

    let texto = "Nuevo";
    if (usuario || nombre || apellido) {
        texto = [usuario, nombre, apellido].filter(Boolean).join(" · ");
    }

    $("#permUsuarioNombre").text(texto);
    $("#sucUsuarioNombre").text(texto);
}

function normalizarIdUsuarioGuardado(valor) {
    const n = Number(valor);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

async function cargarPermisosUsuario(idUsuario) {
    try {
        if (!idUsuario || Number(idUsuario) <= 0) {
            prepararPermisosEnModalNuevo();
            return;
        }

        const response = await fetch(`/UsuariosPermisos/Obtener?idUsuario=${idUsuario}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("No se pudieron obtener los permisos.");

        const data = await response.json();
        permisosUsuarioCache = Array.isArray(data) ? data : [];
        permisosUsuarioOriginal = JSON.parse(JSON.stringify(permisosUsuarioCache));

        if (permisosUsuarioCache.length > 0) {
            moduloPermisoSeleccionadoId = Number(permisosUsuarioCache[0].IdModulo || 0);
        } else {
            moduloPermisoSeleccionadoId = 0;
        }

        renderPermisosUI();
        habilitarSeccionPermisos(true);
        actualizarResumenPermisos();
        actualizarBadgeUsuarioPermisos();
    } catch (e) {
        console.error(e);
        permisosUsuarioCache = [];
        permisosUsuarioOriginal = [];
        moduloPermisoSeleccionadoId = 0;
        renderPermisosPlaceholder("No se pudieron cargar los permisos.");
        actualizarResumenPermisos();
        errorModal("No se pudieron cargar los permisos del usuario.");
    }
}

function renderPermisosUI() {
    renderListaModulosPermisos($("#txtBuscarModuloPermiso").val() || "");
    renderDetalleModuloSeleccionado();
}

function renderListaModulosPermisos(filtro = "") {

    const container = $("#listaModulosPermisos");
    container.empty();

    if (!Array.isArray(permisosUsuarioCache) || permisosUsuarioCache.length === 0) {
        container.html(`<div class="rp-perm-empty-state">No hay modulos.</div>`);
        return;
    }

    const txt = (filtro || "").toLowerCase();

    // 🔥 FILTRAR
    const lista = permisosUsuarioCache.filter(x => {
        if (!txt) return true;
        return (x.Modulo || "").toLowerCase().includes(txt)
            || (x.CodigoModulo || "").toLowerCase().includes(txt);
    });

    if (lista.length === 0) {
        container.html(`<div class="rp-perm-empty-state">Sin resultados</div>`);
        return;
    }

    // 🔥 PADRES
    const padres = lista
        .filter(x => !x.Grupo)
        .sort((a, b) => (a.Orden || 0) - (b.Orden || 0));

    let html = "";

    padres.forEach(padre => {

        html += `
            <div class="rp-mod-group">

                <div class="rp-mod-group-title">
                    ${escapeHtml(padre.Modulo)}
                </div>
        `;

        // 🔥 PADRE
        const totalPadre = contarPermisosActivosModulo(padre);
        const isPadreActive = Number(padre.IdModulo) === Number(moduloPermisoSeleccionadoId);

        html += `
            <button type="button"
                    class="rp-mod-item parent ${isPadreActive ? 'active' : ''}"
                    onclick="seleccionarModuloPermisos(${padre.IdModulo})">

                <div class="rp-mod-item-main">
                    <div class="rp-mod-item-title">
                        ${escapeHtml(padre.Modulo)}
                    </div>
                </div>

                <div class="rp-mod-item-count ${totalPadre > 0 ? 'activo' : 'inactivo'}">
                    ${totalPadre}/5
                </div>
            </button>
        `;

        // 🔥 HIJOS
        const hijos = lista
            .filter(x => x.Grupo === padre.CodigoModulo)
            .sort((a, b) => (a.Orden || 0) - (b.Orden || 0));

        hijos.forEach(hijo => {

            const total = contarPermisosActivosModulo(hijo);
            const isActive = Number(hijo.IdModulo) === Number(moduloPermisoSeleccionadoId);

            html += `
                <button type="button"
                        class="rp-mod-item child ${isActive ? 'active' : ''}"
                        onclick="seleccionarModuloPermisos(${hijo.IdModulo})">

                    <div class="rp-mod-item-main">
                        <div class="rp-mod-item-title">
                            ${escapeHtml(hijo.Modulo)}
                        </div>
                    </div>

                    <div class="rp-mod-item-count ${total > 0 ? 'activo' : 'inactivo'}">
                        ${total}/5
                    </div>
                </button>
            `;
        });

        html += `</div>`;
    });

    container.html(html);
}

function renderDetalleModuloSeleccionado() {
    const container = $("#permDetalleContainer");
    const titulo = $("#permModuloNombre");
    const desc = $("#permModuloDesc");

    container.empty();

    const item = permisosUsuarioCache.find(x => Number(x.IdModulo) === Number(moduloPermisoSeleccionadoId));

    if (!item) {
        titulo.text("Selecciona un modulo");
        desc.text("Configuracion de permisos.");
        container.html(`<div class="rp-perm-empty-state">Selecciona un modulo.</div>`);
        return;
    }

    titulo.text(item.Modulo || "Modulo");
    desc.text("Permisos disponibles para este modulo.");

    const idRol = Number($("#Roles").val());
    const esModuloUsuarios = (item.Modulo || "").toLowerCase() === "usuarios";

    let html = `<div class="rp-perm-grid">`;

    (item.Permisos || []).forEach(p => {

        // 🔥 REGLA ADMIN (no se puede tocar)
        const esCritico =
            idRol === 1 &&
            esModuloUsuarios &&
            (p.Codigo === "VER" || p.Codigo === "EDITAR");

        // 🔥 FORZAR SIEMPRE ACTIVO
        if (esCritico) {
            p.Activo = true;
        }

        html += `
            <div class="rp-perm-card ${p.Activo ? 'active' : ''} ${esCritico ? 'rp-perm-locked' : ''}">
                
                <div class="rp-perm-card-top">
                    <div class="rp-perm-card-titlewrap">
                        <div class="rp-perm-card-title">${p.Nombre}</div>
                        <div class="rp-perm-card-desc">${p.Descripcion || ""}</div>
                    </div>
                </div>

                <div class="rp-perm-card-bottom">
                    <label class="rp-switch">
                        <input type="checkbox"
                               class="rp-perm-toggle"
                               data-idmodulo="${item.IdModulo}"
                               data-codigo="${p.Codigo}"
                               ${p.Activo ? "checked" : ""}
                               ${usuarioPermisosModo === "ver" || esCritico ? "disabled" : ""}>
                        <span class="rp-switch-slider"></span>
                    </label>

                    <span class="rp-switch-label">
                        ${esCritico ? "Obligatorio" : (p.Activo ? "Activo" : "Inactivo")}
                    </span>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.html(html);

    $(".rp-perm-toggle").off("change").on("change", function () {

        const idModulo = Number($(this).data("idmodulo"));
        const codigo = $(this).data("codigo");
        const checked = $(this).is(":checked");

        const idRol = Number($("#Roles").val());
        const esModuloUsuarios = (item.Modulo || "").toLowerCase() === "usuarios";

        const esCritico =
            idRol === 1 &&
            esModuloUsuarios &&
            (codigo === "VER" || codigo === "EDITAR");

        // 🔥 DOBLE SEGURIDAD
        if (esCritico) {
            $(this).prop("checked", true);
            return;
        }

        actualizarPermisoEnCache(idModulo, codigo, checked);
        actualizarVisualPermisos();
        actualizarResumenPermisos();
        renderListaModulosPermisos($("#txtBuscarModuloPermiso").val() || "");
    });

    actualizarVisualPermisos();
}
function actualizarVisualPermisos() {
    $("#permDetalleContainer .rp-perm-card").each(function () {
        const checkbox = $(this).find(".rp-perm-toggle");
        const activo = checkbox.is(":checked");
        $(this).toggleClass("active", activo);
        $(this).find(".rp-switch-label").text(activo ? "Activo" : "Inactivo");
    });
}

function actualizarPermisoEnCache(idModulo, codigo, activo) {

    const mod = permisosUsuarioCache.find(x => Number(x.IdModulo) === Number(idModulo));
    if (!mod) return;

    const permiso = (mod.Permisos || []).find(p => p.Codigo === codigo);
    if (!permiso) return;

    const idRol = Number($("#Roles").val());

    // 🔥 REGLA ADMIN
    const esModuloUsuarios = (mod.Modulo || "").toLowerCase() === "usuarios";

    if (idRol === 1 && esModuloUsuarios && (codigo === "VER" || codigo === "EDITAR")) {
        permiso.Activo = true; // 🔥 FORZAR
        return;
    }

    permiso.Activo = !!activo;
}

function contarPermisosActivosModulo(item) {
    if (!item || !item.Permisos) return 0;
    return item.Permisos.filter(p => p.Activo).length;
}

function seleccionarModuloPermisos(idModulo) {
    moduloPermisoSeleccionadoId = Number(idModulo) || 0;
    renderListaModulosPermisos($("#txtBuscarModuloPermiso").val() || "");
    renderDetalleModuloSeleccionado();
}

function renderPermisosPlaceholder(texto) {
    $("#listaModulosPermisos").html(`
        <div class="rp-perm-empty-state">${texto}</div>
    `);

    $("#permDetalleContainer").html(`
        <div class="rp-perm-empty-state">${texto}</div>
    `);

    $("#permModuloNombre").text("Selecciona un modulo");
    $("#permModuloDesc").text("Aca vas a poder activar o desactivar cada permiso de forma individual.");
}

function actualizarResumenPermisos() {
    const cantModulos = Array.isArray(permisosUsuarioCache) ? permisosUsuarioCache.length : 0;

    let checksActivos = 0;
    (permisosUsuarioCache || []).forEach(item => {
        checksActivos += contarPermisosActivosModulo(item);
    });

    $("#permCantModulos").text(cantModulos);
    $("#permCantChecksActivos").text(checksActivos);
}

function marcarTodosPermisos(valor) {

    if (usuarioPermisosModo === "ver") return;

    permisosUsuarioCache.forEach(mod => {
        (mod.Permisos || []).forEach(p => {
            p.Activo = !!valor;
        });
    });

    renderPermisosUI();
    actualizarResumenPermisos();
}

function marcarPermisosModuloActual(valor) {

    if (usuarioPermisosModo === "ver") return;

    const mod = permisosUsuarioCache.find(x => Number(x.IdModulo) === Number(moduloPermisoSeleccionadoId));
    if (!mod) return;

    (mod.Permisos || []).forEach(p => {
        p.Activo = !!valor;
    });

    renderDetalleModuloSeleccionado();
    renderListaModulosPermisos($("#txtBuscarModuloPermiso").val() || "");
    actualizarResumenPermisos();
}

function resetearPermisos() {
    if (usuarioPermisosModo === "ver") return;

    if (!Array.isArray(permisosUsuarioOriginal) || permisosUsuarioOriginal.length === 0) {
        marcarTodosPermisos(false);
        return;
    }

    permisosUsuarioCache = JSON.parse(JSON.stringify(permisosUsuarioOriginal));

    if (!permisosUsuarioCache.some(x => Number(x.IdModulo) === Number(moduloPermisoSeleccionadoId))) {
        moduloPermisoSeleccionadoId = permisosUsuarioCache.length > 0
            ? Number(permisosUsuarioCache[0].IdModulo || 0)
            : 0;
    }

    renderPermisosUI();
    actualizarResumenPermisos();
}

async function copiarDesdeRolUsuario() {
    try {
        if (usuarioPermisosModo === "ver") return;

        const idUsuario = Number($("#txtId").val());
        const idRol = Number($("#Roles").val());

        if (!idUsuario || idUsuario <= 0) {
            errorModal("Primero guarda el usuario.");
            return;
        }

        if (!idRol || idRol <= 0) {
            errorModal("Seleccione un rol.");
            return;
        }

        const confirmado = await confirmarModal("¿Desea copiar los permisos desde el rol seleccionado y reemplazar los actuales?");
        if (!confirmado) return;

        const response = await fetch(`/UsuariosPermisos/CopiarDesdeRol`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify({
                IdUsuario: idUsuario,
                IdRol: idRol,
                ReemplazarExistentes: true
            })
        });

        if (!response.ok) throw new Error("No se pudieron copiar los permisos.");

        const dataJson = await response.json();
        if (!dataJson.valor) {
            errorModal("No se pudieron copiar los permisos desde el rol.");
            return;
        }

        await cargarPermisosUsuario(idUsuario);
        exitoModal("Permisos copiados desde el rol correctamente");
    } catch (e) {
        console.error(e);
        errorModal("Ha ocurrido un error al copiar permisos desde el rol.");
    }
}

async function guardarPermisosMasivo() {
    try {
        if (usuarioPermisosModo === "ver") return;

        const idUsuario = Number($("#txtId").val());
        if (!idUsuario || idUsuario <= 0) {
            errorModal("Primero guarda el usuario.");
            return;
        }

        const lista = [];

        (permisosUsuarioCache || []).forEach(mod => {

            const idModulo = Number(mod.IdModulo);
            if (!idModulo) return;

            (mod.Permisos || []).forEach(p => {

                lista.push({
                    IdUsuario: idUsuario,
                    IdModulo: idModulo,
                    Permiso: p.Codigo,
                    Activo: !!p.Activo
                });

            });

        });

        const response = await fetch(`/UsuariosPermisos/ActualizarMasivo`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify({
                IdUsuario: idUsuario,
                Permisos: lista
            })
        });

        if (!response.ok) throw new Error("No se pudieron guardar los permisos.");

        const dataJson = await response.json();
        if (!dataJson.valor) {
            errorModal("No se pudieron guardar los permisos.");
            return;
        }

        permisosUsuarioOriginal = JSON.parse(JSON.stringify(permisosUsuarioCache));
        actualizarResumenPermisos();
        exitoModal("Permisos guardados correctamente");
    } catch (e) {
        console.error(e);
        errorModal("Ha ocurrido un error al guardar permisos.");
    }
}

/* =========================
   HELPERS
========================= */

function escapeHtml(str) {
    return String(str || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll(`"`, "&quot;")
        .replaceAll(`'`, "&#039;");
}

/* =========================
   HISTORIAL CONEXIONES
========================= */

function fmtFechaConexionUsr(d) {
    if (!d) return "—";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleString("es-AR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
}

async function refrescarPresenciaUsuarios() {
    if (!gridUsuarios) return;
    try {
        const response = await fetch(`/Usuarios/Presencia`, {
            headers: { Authorization: "Bearer " + token }
        });
        if (!response.ok) return;
        const data = await response.json();
        const map = new Map((data || []).map(x => [Number(x.Id), !!x.EnLinea]));

        gridUsuarios.rows({ page: "current" }).every(function () {
            const row = this.data();
            if (!row) return true;
            const id = Number(row.Id);
            const online = map.has(id) ? map.get(id) : !!row.EnLinea;
            if (row.EnLinea === online) return true;
            row.EnLinea = online;

            const $tr = $(this.node());
            const $cell = $tr.find(".usr-user-cell");
            if (!$cell.length) return true;
            $cell.find(".usr-presence")
                .toggleClass("is-online", online)
                .toggleClass("is-offline", !online)
                .attr("title", online ? "En línea" : "Desconectado");
            $cell.find(".usr-presence-label")
                .toggleClass("is-online", online)
                .toggleClass("is-offline", !online)
                .text(online ? "En línea" : "Offline");
            return true;
        });
    } catch {
        /* silencioso: no impacta UX */
    }
}

window.verHistorialConexionesUsuario = async function (id, usuarioNombre) {
    const modalEl = document.getElementById("modalHistorialConexionesUsr");
    if (!modalEl) return;

    $("#usrConnTitulo").text(usuarioNombre || ("Usuario #" + id));
    $("#usrConnSub").text("Cargando movimientos…");
    $("#usrConnKpis").html("");
    $("#usrConnTimeline").html(`<div class="usr-conn-loading"><i class="fa fa-spinner fa-spin"></i> Cargando historial…</div>`);

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();

    try {
        const response = await fetch(`/Usuarios/HistorialConexiones?id=${id}&take=150`, {
            headers: { Authorization: "Bearer " + token }
        });
        if (!response.ok) throw new Error("No se pudo cargar el historial");
        const data = await response.json();

        const online = !!data.EnLinea;
        $("#usrConnTitulo").text(data.Usuario || usuarioNombre || ("#" + id));
        $("#usrConnSub").html(
            `${escapeHtml(data.NombreCompleto || "")} · ` +
            `<span class="usr-presence-label ${online ? "is-online" : "is-offline"}">${online ? "En línea ahora" : "Desconectado"}</span>` +
            (data.FechaUltimaActividad ? ` · última actividad ${fmtFechaConexionUsr(data.FechaUltimaActividad)}` : "")
        );

        $("#usrConnKpis").html(`
            <div class="usr-conn-kpi"><span>Conexiones</span><strong>${data.TotalConexiones || 0}</strong></div>
            <div class="usr-conn-kpi"><span>Salidas</span><strong>${data.TotalDesconexiones || 0}</strong></div>
            <div class="usr-conn-kpi"><span>Eventos</span><strong>${(data.Eventos || []).length}</strong></div>
        `);

        const eventos = Array.isArray(data.Eventos) ? data.Eventos : [];
        if (!eventos.length) {
            $("#usrConnTimeline").html(`<div class="usr-conn-empty">Todavía no hay conexiones registradas para este usuario.</div>`);
            return;
        }

        $("#usrConnTimeline").html(eventos.map(ev => {
            const tipo = Number(ev.Tipo);
            const cls = tipo === 1 ? "is-in" : (tipo === 3 ? "is-exp" : "is-out");
            const icon = tipo === 1 ? "fa-sign-in" : (tipo === 3 ? "fa-clock-o" : "fa-sign-out");
            return `<article class="usr-conn-item ${cls}">
                <div class="usr-conn-icon"><i class="fa ${icon}"></i></div>
                <div class="usr-conn-body">
                    <div class="usr-conn-head">
                        <strong>${escapeHtml(ev.TipoNombre || "Evento")}</strong>
                        <time>${fmtFechaConexionUsr(ev.Fecha)}</time>
                    </div>
                    <div class="usr-conn-meta">
                        ${ev.Ip ? `<span><i class="fa fa-globe"></i> ${escapeHtml(ev.Ip)}</span>` : ""}
                        ${ev.Detalle ? `<span>${escapeHtml(ev.Detalle)}</span>` : ""}
                    </div>
                </div>
            </article>`;
        }).join(""));
    } catch (e) {
        console.error(e);
        $("#usrConnTimeline").html(`<div class="usr-conn-empty">No se pudo cargar el historial de conexiones.</div>`);
        $("#usrConnSub").text("Error al cargar");
    }
};