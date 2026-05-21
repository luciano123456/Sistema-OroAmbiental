let gridGastos;
let charts = {};

/**
 * Columnas:
 * 0 Acciones
 * 1 Fecha
 * 2 Categoría
 * 3 Moneda
 * 4 Cuenta
 * 5 Personal
 * 6 Concepto
 * 7 Importe
 * 8 Nota
 */
const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'select', fetchDataFunc: listaCategoriasFilter },
    { index: 3, filterType: 'select', fetchDataFunc: listaMonedasFilter },
    { index: 4, filterType: 'select', fetchDataFunc: listaCuentasFilter },
    { index: 5, filterType: 'select', fetchDataFunc: listaPersonalFilter },
    { index: 6, filterType: 'text' },
    { index: 7, filterType: 'text' },
    { index: 8, filterType: 'text' },
];

$(document).ready(() => {


    Permisos.init();
    Permisos.aplicarUI("GASTOS");

    $('#dashBody').on('shown.bs.collapse', function () {
        if (gridGastos) {
            const data = gridGastos.rows().data().toArray();
            renderDashboards(data);
        }
    });


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


    // Estado texto filtros
    $('#panelFiltros')
      

    // Eventos dependencia: Moneda -> Cuenta (MODAL)
    $("#cmbMoneda").on("change", function () {
        const idMoneda = $(this).val();
        listaCuentasPorMoneda(idMoneda, "#cmbCuenta", true);
    });

    // Eventos dependencia: Moneda -> Cuenta (FILTROS)
    $("#fMoneda").on("change", function () {
        const idMoneda = $(this).val();
        listaCuentasPorMoneda(idMoneda, "#fCuenta", false);
    });

    // Inicializaciones
    initSelect2Global();
    initSelect2Modal();

    // Cargar combos filtros (una vez)
    inicializarFiltros();

    setFiltrosUltimaSemana();

    // Primera carga tabla
    listaGastos(true);

    // Validaciones live (igual estilo reps)
    document.querySelectorAll("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").forEach(el => {
        el.setAttribute("autocomplete", "off");
        el.addEventListener("input", () => validarCampoIndividual(el));
        el.addEventListener("change", () => validarCampoIndividual(el));
        el.addEventListener("blur", () => validarCampoIndividual(el));
    });
});

/* =========================
   SELECT2 INIT
========================= */

function initSelect2Global() {
    // select2 en filtros/pantalla
    $('.select2').select2({ width: '100%' });
}

function initSelect2Modal() {
    // select2 en modal con dropdownParent
    $('#modalEdicion .select2').select2({
        dropdownParent: $('#modalEdicion'),
        width: '100%'
    });
}

/* =========================
   CRUD
========================= */

function guardarCambios() {

    const id = $("#txtId").val();
    const esNuevo = id === "";

    // 🔥 PERMISOS
    const puedeCrear = Permisos.tiene("Gastos", "Crear");
    const puedeEditar = Permisos.tiene("Gastos", "Editar");

    if (esNuevo && !puedeCrear) {
        errorModal("No tenés permisos para registrar gastos.");
        return false;
    }

    if (!esNuevo && !puedeEditar) {
        errorModal("No tenés permisos para modificar gastos.");
        return false;
    }

    // 🔥 VALIDACIÓN
    if (!validarCampos()) return false;

    const modelo = {
        Id: id !== "" ? Number(id) : 0,
        Fecha: $("#txtFecha").val(),

        IdCategoria: Number($("#cmbCategoria").val()),
        IdMoneda: Number($("#cmbMoneda").val()),
        IdCuenta: Number($("#cmbCuenta").val()),
        IdPersonal: $("#cmbPersonal").val()
            ? Number($("#cmbPersonal").val())
            : null,

        Concepto: ($("#txtConcepto").val() || "").trim(),
        Importe: Number($("#txtImporte").val()),
        NotaInterna: ($("#txtNotaInterna").val() || "").trim()
    };

    const url = esNuevo ? "/Gastos/Insertar" : "/Gastos/Actualizar";
    const method = esNuevo ? "POST" : "PUT";

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

            const mensaje = esNuevo
                ? "Gasto registrado correctamente"
                : "Gasto modificado correctamente";

            $('#modalEdicion').modal('hide');
            exitoModal(mensaje);

            listaGastos(false);
        })
        .catch(err => {
            console.error('Error:', err);
            errorModal("Ha ocurrido un error.");
        });
}
function nuevoGasto() {

    if (!Permisos.tiene("Gastos", "Crear")) {
        errorModal("No tenés permisos.");
        return;
    }


    limpiarModal();

    setModalSoloLectura(false);

    // Fecha por defecto HOY (moment) en input date -> YYYY-MM-DD
    const hoy = moment().format("YYYY-MM-DD");
    $("#txtFecha").val(hoy);

    // Cargar combos modal
    cargarCombosModal().then(() => {
        $('#modalEdicion').modal('show');

        $("#btnGuardar").html(`<i class="fa fa-check"></i> Registrar`);
        $("#modalEdicionLabel").text("Nuevo Gasto");

        $("#infoAuditoria").addClass("d-none");
        $("#infoRegistro").html("");
        $("#infoModificacion").html("");
    });
}

async function mostrarModal(modelo) {
    limpiarModal();

    setModalSoloLectura(false);

    $("#txtId").val(modelo.Id || "");
    $("#txtFecha").val((modelo.Fecha || "").split("T")[0] || "");
    $("#txtConcepto").val(modelo.Concepto || "");
    $("#txtImporte").val(modelo.Importe ?? "");
    $("#txtNotaInterna").val(modelo.NotaInterna || "");

    await cargarCombosModal();

    $("#cmbCategoria").val(modelo.IdCategoria).trigger("change");

    // Moneda -> carga cuentas -> set cuenta
    $("#cmbMoneda").val(modelo.IdMoneda).trigger("change");
    await listaCuentasPorMoneda(modelo.IdMoneda, "#cmbCuenta", true);
    $("#cmbCuenta").val(modelo.IdCuenta).trigger("change");

    $("#cmbPersonal").val(modelo.IdPersonal ?? "").trigger("change");

    // Auditoría (igual reps)
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
    $("#modalEdicionLabel").text("Editar Gasto");
}

const editarGasto = id => {

    fetch("/Gastos/EditarInfo?id=" + id, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(r => {
            if (!r.ok) throw new Error("Error");
            return r.json();
        })
        .then(data => {

            if (!data) throw new Error();

            mostrarModal(data);

            // ✅ STANDARD OroAmbiental
            setModalSoloLectura(false);

            $("#modalEdicionLabel").text("Editar Gasto");
        })
        .catch(_ => errorModal("Ha ocurrido un error."));
};
async function eliminarGasto(id) {
    
    if (!Permisos.tiene("Gastos", "Eliminar")) {
        errorModal("No tenés permisos.");
        return;
    }


    const confirmado = await confirmarModal("¿Desea eliminar este gasto?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Gastos/Eliminar?id=" + id, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al eliminar el Gasto.");

        const dataJson = await response.json();
        if (dataJson.valor) {
            listaGastos(false);
            exitoModal("Gasto eliminado correctamente");
        }
    } catch (e) {
        console.error("Ha ocurrido un error:", e);
        errorModal("Ha ocurrido un error.");
    }
}

/* =========================
   LISTA + DATATABLE
========================= */

function aplicarFiltros() {
    listaGastos(true);
}

function limpiarFiltros() {
    $("#fFechaDesde").val("");
    $("#fFechaHasta").val("");
    $("#fConcepto").val("");
    $("#fImporteMin").val("");

    $("#fCategoria").val("").trigger("change");
    $("#fPersonal").val("").trigger("change");
    $("#fMoneda").val("").trigger("change");

    // cuenta depende de moneda
    limpiarSelectCuenta("#fCuenta");

    listaGastos(false);
}

function getFiltrosPantalla() {
    return {
        FechaDesde: $("#fFechaDesde").val() || null,
        FechaHasta: $("#fFechaHasta").val() || null,
        IdCategoria: $("#fCategoria").val() ? Number($("#fCategoria").val()) : null,
        IdPersonal: $("#fPersonal").val() ? Number($("#fPersonal").val()) : null,
        IdMoneda: $("#fMoneda").val() ? Number($("#fMoneda").val()) : null,
        IdCuenta: $("#fCuenta").val() ? Number($("#fCuenta").val()) : null,
        Concepto: ($("#fConcepto").val() || "").trim() || null,
        ImporteMin: $("#fImporteMin").val() ? Number($("#fImporteMin").val()) : null
    };
}

function buildQueryString(obj) {
    const p = new URLSearchParams();
    Object.keys(obj).forEach(k => {
        const v = obj[k];
        if (v !== null && v !== undefined && v !== "") p.append(k, v);
    });
    const qs = p.toString();
    return qs ? ("?" + qs) : "";
}
async function listaGastos(usarFiltros = false) {
    let paginaActual = gridGastos != null ? gridGastos.page() : 0;

    let response;
    let data;

    if (usarFiltros) {

        const filtros = getFiltrosPantalla();

        response = await fetch(`/Gastos/ListaFiltrada`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(filtros)
        });

    } else {

        response = await fetch(`/Gastos/Lista`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
    }

    if (!response.ok)
        throw new Error(`Error en la solicitud: ${response.statusText}`);

    data = await response.json();

    await configurarDataTable(data);

    if (paginaActual > 0) {
        gridGastos.page(paginaActual).draw('page');
    }

    actualizarKpis(data);
    renderDashboards(data);
}


async function configurarDataTable(data) {

    if (!gridGastos) {

        const $thead = $('#grd_Gastos thead');
        if ($thead.find('tr.filters').length === 0) {
            $thead.find('tr').first().clone(true).addClass('filters').appendTo($thead);
        }

        gridGastos = $('#grd_Gastos').DataTable({
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
                            ver: "verGasto",
                            editar: "editarGasto",
                            eliminar: "eliminarGasto"
                        }, "Gastos");
                    },
                    orderable: false,
                    searchable: false
                },
                { data: 'Fecha', render: d => normalizarFechaTabla(d) },
                { data: 'Categoria' },
                { data: 'Moneda' },
                { data: 'Cuenta' },
                { data: 'Personal' },
                { data: 'Concepto' },
                { data: 'Importe', render: d => formatearImporte(d) },
                { data: 'NotaInterna' }
            ],

            dom: 'Bfrtip',
            buttons: getBotonesExportacion(gridGastos, "Gastos"),



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

                        // 🔹 activar select2 en el filtro
                        select.select2({
                            width: '100%',
                            minimumResultsForSearch: 0
                        });

                    } else {

                        $(`<input class="rp-filter-input" type="text" placeholder="Buscar...">`)
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
            }

        });

    } else {
        gridGastos.clear().rows.add(data).draw();
    }
}

/* =========================
   CONFIG COLUMNAS
========================= */

function configurarOpcionesColumnas() {
    const grid = $('#grd_Gastos').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');

    const storageKey = `Gastos_Columnas`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        if (index === 0) return;

        const isChecked = savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;
        grid.column(index).visible(isChecked);

        const name = $('#grd_Gastos thead tr').first().find('th').eq(index).text();

        container.append(`
            <li class="rp-dd-item">
                <label class="rp-dd-label">
                    <input type="checkbox" class="toggle-column" data-column="${index}" ${isChecked ? 'checked' : ''}>
                    <span>${name}</span>
                </label>
            </li>
        `);
    });

    $('.toggle-column').off("change").on('change', function () {
        const columnIdx = parseInt($(this).data('column'), 10);
        const isChecked = $(this).is(':checked');

        savedConfig[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));

        grid.column(columnIdx).visible(isChecked);
    });
}

/* =========================
   COMBOS (MODAL + FILTROS)
========================= */

async function inicializarFiltros() {
    // Cargar combos filtros
    await cargarCombo("/GastosCategorias/Lista", "#fCategoria", false);
    await cargarCombo("/Personal/Lista", "#fPersonal", false);
    await cargarCombo("/PaisesMoneda/Lista", "#fMoneda", false);

    limpiarSelectCuenta("#fCuenta");

    // Select2 en filtros (global)
    $("#fCategoria, #fPersonal, #fMoneda, #fCuenta").select2({ width: "100%" });
}

async function cargarCombosModal() {
    // Cargar combos modal
    await cargarCombo("/GastosCategorias/Lista", "#cmbCategoria", true);
    await cargarCombo("/PaisesMoneda/Lista", "#cmbMoneda", true);
    await cargarCombo("/Personal/Lista", "#cmbPersonal", true);

    // Cuenta depende de moneda
    limpiarSelectCuenta("#cmbCuenta");
    bloquearSelectCuenta("#cmbCuenta", true);

    // select2 modal (con parent)
    $('#modalEdicion .select2').select2({
        dropdownParent: $('#modalEdicion'),
        width: '100%'
    });
}

function limpiarSelectCuenta(selector) {
    const sel = $(selector);

    // si tiene select2, destruir antes de manipular options
    if (sel.hasClass("select2-hidden-accessible")) {
        sel.select2("destroy");
    }

    sel.empty().append(`<option value="">Seleccionar</option>`);
    sel.val("");

    // re-inicializar según si es modal o filtro
    const esModal = (selector === "#cmbCuenta");
    if (esModal) {
        sel.select2({ dropdownParent: $('#modalEdicion'), width: '100%' });
    } else {
        sel.select2({ width: '100%' });
    }
}

function bloquearSelectCuenta(selector, bloquear) {
    $(selector).prop("disabled", bloquear);
}

async function listaCuentasPorMoneda(idMoneda, selectorCuenta, esModal) {

    const sel = $(selectorCuenta);

    // destruir select2 antes de recargar
    if (sel.hasClass("select2-hidden-accessible")) {
        sel.select2("destroy");
    }

    sel.empty().append(`<option value="">Seleccionar</option>`);
    sel.val("");

    if (!idMoneda) {
        bloquearSelectCuenta(selectorCuenta, true);
        // volver select2
        if (esModal) sel.select2({ dropdownParent: $('#modalEdicion'), width: '100%' });
        else sel.select2({ width: '100%' });
        return;
    }

    const response = await fetch(`/MonedasCuenta/ListaMoneda?idMoneda=${idMoneda}`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!response.ok) {
        bloquearSelectCuenta(selectorCuenta, true);
        if (esModal) sel.select2({ dropdownParent: $('#modalEdicion'), width: '100%' });
        else sel.select2({ width: '100%' });
        return;
    }

    const data = await response.json();

    (data || []).forEach(x => {
        sel.append(`<option value="${x.Id}">${x.Nombre}</option>`);
    });

    bloquearSelectCuenta(selectorCuenta, false);

    // volver a activar select2
    if (esModal) sel.select2({ dropdownParent: $('#modalEdicion'), width: '100%' });
    else sel.select2({ width: '100%' });
}

async function cargarCombo(url, selector, esModal) {
    const response = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await response.json();

    const select = $(selector);

    // destruir select2 si existía
    if (select.hasClass("select2-hidden-accessible")) {
        select.select2("destroy");
    }

    select.empty();
    select.append(`<option value="">Seleccionar</option>`);

    (data || []).forEach(x => {
        // En tus endpoints, por lo general viene {Id, Nombre}
        select.append(`<option value="${x.Id}">${x.Nombre}</option>`);
    });

    if (esModal) {
        select.select2({ dropdownParent: $('#modalEdicion'), width: "100%" });
    } else {
        select.select2({ width: "100%" });
    }
}

/* =========================
   FILTROS (para columnConfig)
   (Se mantienen por compatibilidad)
========================= */

async function listaCategoriasFilter() { return await obtenerLista("/GastosCategorias/Lista"); }
async function listaCuentasFilter() { return await obtenerLista("/MonedasCuenta/Lista"); }
async function listaMonedasFilter() { return await obtenerLista("/PaisesMoneda/Lista"); }
async function listaPersonalFilter() { return await obtenerLista("/Personal/Lista"); }

async function obtenerLista(url) {
    const response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
    return await response.json();
}

/* =========================
   DASHBOARDS
========================= */

function renderDashboards(data) {


    if (!Permisos.tiene("Gastos", "Dashboard")) return;

    if (typeof Chart === "undefined") return;

    destruirCharts();

    const sinDatos = !Array.isArray(data) || data.length === 0;

    if (sinDatos) {
        $("#dashWrap").show();
        $("#dashEmpty").show();
        return;
    }

    $("#dashWrap").show();
    $("#dashEmpty").hide();

    // Agrupaciones
    const porCategoria = {};
    const porPersonal = {};
    const porMes = {};

    data.forEach(x => {
        const imp = Number(x.Importe) || 0;

        const cat = (x.Categoria || "Sin categoría").toString().trim();
        const per = (x.Personal || "Sin personal").toString().trim();

        porCategoria[cat] = (porCategoria[cat] || 0) + imp;
        porPersonal[per] = (porPersonal[per] || 0) + imp;

        let key = "Sin fecha";

        if (x.Fecha) {
            const m = moment(x.Fecha, ["YYYY-MM-DD", "DD/MM/YYYY"]);
            if (m.isValid()) {
                key = m.format("YYYY-MM");
            }
        }


        porMes[key] = (porMes[key] || 0) + imp;
    });

    const colores = [
        "#4f8cff", "#00d4aa", "#ffb020", "#ff5c5c",
        "#8e7dff", "#00bcd4", "#ff7ad9", "#6ee7b7"
    ];

    const mesesOrdenados = Object.keys(porMes).sort((a, b) => a.localeCompare(b));

    const elCat = document.getElementById("chartCategoria");
    const elPer = document.getElementById("chartPersonal");
    const elMes = document.getElementById("chartMes");

    if (!elCat || !elPer || !elMes) return;

    charts.cat = new Chart(elCat, {
        type: "doughnut",
        data: {
            labels: Object.keys(porCategoria),
            datasets: [{
                data: Object.values(porCategoria),
                backgroundColor: colores,
                borderWidth: 0
            }]
        },
        options: {
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#fff' }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${formatearImporte(ctx.raw)}`
                    }
                }
            }
        }
    });

    const perEntries = Object.entries(porPersonal)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    charts.per = new Chart(elPer, {
        type: "bar",
        data: {
            labels: perEntries.map(x => x[0]),
            datasets: [{
                data: perEntries.map(x => x[1]),
                backgroundColor: "#4f8cff"
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#fff' }, grid: { display: false } },
                y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,.08)' } }
            }
        }
    });

    charts.mes = new Chart(elMes, {
        type: "line",
        data: {
            labels: mesesOrdenados,
            datasets: [{
                data: mesesOrdenados.map(k => porMes[k]),
                borderColor: "#00d4aa",
                backgroundColor: "rgba(0,212,170,.15)",
                tension: .3,
                fill: true,
                pointRadius: 3
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#fff' }, grid: { display: false } },
                y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,.08)' } }
            }
        }
    });
}

function destruirCharts() {
    Object.values(charts).forEach(c => {
        try { c.destroy(); } catch { }
    });
    charts = {};
}

/* =========================
   VALIDACIONES (estilo reps)
========================= */

function limpiarModal() {
    const formulario = document.querySelector("#modalEdicion");
    if (!formulario) return;

    formulario.querySelectorAll("input, select, textarea").forEach(el => {
        if (el.tagName === "SELECT") {
            // select2: set value vacío
            $(el).val("").trigger("change");
        } else {
            el.value = "";
        }
        el.classList.remove("is-invalid", "is-valid");
    });

    $("#errorCampos").addClass("d-none");

    // auditoría
    $("#infoAuditoria").addClass("d-none");
    $("#infoRegistro").html("");
    $("#infoModificacion").html("");

    // cuenta se bloquea hasta moneda
    bloquearSelectCuenta("#cmbCuenta", true);
}

function validarCampoIndividual(el) {
    const id = el.id;
    const valor = (el.value ?? "").toString().trim();

    const obligatorios = ["txtFecha", "cmbCategoria", "cmbMoneda", "cmbCuenta", "txtConcepto", "txtImporte"];
    if (!obligatorios.includes(id)) return;

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
    if (!errorMsg) return;

    const hayInvalidos = document.querySelectorAll("#modalEdicion .is-invalid").length > 0;
    if (!hayInvalidos) errorMsg.classList.add("d-none");
}

function validarCampos() {
    const campos = [
        "#txtFecha",
        "#cmbCategoria",
        "#cmbMoneda",
        "#cmbCuenta",
        "#txtConcepto",
        "#txtImporte"
    ];

    let valido = true;

    campos.forEach(sel => {
        const campo = document.querySelector(sel);
        const valor = (campo?.value ?? "").toString().trim();

        if (!campo || !valor || valor === "Seleccionar") {
            campo?.classList.add("is-invalid");
            campo?.classList.remove("is-valid");
            valido = false;
        } else {
            campo.classList.remove("is-invalid");
            campo.classList.add("is-valid");
        }
    });

    document.getElementById("errorCampos")?.classList.toggle("d-none", valido);
    return valido;
}

/* =========================
   KPI + helpers
========================= */

function actualizarKpis(data) {
    const cant = Array.isArray(data) ? data.length : 0;
    $('#kpiCantGastos').text(cant);
}

function normalizarFechaTabla(fecha) {
    if (!fecha) return "—";
    // Si viene DateTime ISO: 2026-02-16T00:00:00
    // Mostrar DD/MM/YYYY
    const f = fecha.toString().split("T")[0];
    return moment(f, "YYYY-MM-DD").isValid() ? moment(f, "YYYY-MM-DD").format("DD/MM/YYYY") : fecha;
}

function formatearFecha(fecha) {
    try {
        const d = new Date(fecha);
        return d.toLocaleString("es-AR");
    } catch {
        return fecha;
    }
}

function formatearImporte(v) {
    const n = Number(v);
    if (Number.isNaN(n)) return v ?? "0";
    return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


function setFiltrosUltimaSemana() {

    const hoy = moment().format("YYYY-MM-DD");
    const hace7 = moment().subtract(7, "days").format("YYYY-MM-DD");

    $("#fFechaDesde").val(hace7);
    $("#fFechaHasta").val(hoy);
}


function escapeRegex(text) {
    return (text || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


const verGasto = id => {

    fetch("/Gastos/EditarInfo?id=" + id, {
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

            $("#modalEdicionLabel").text("Ver Gasto");
        })
        .catch(_ => errorModal("Ha ocurrido un error."));
};