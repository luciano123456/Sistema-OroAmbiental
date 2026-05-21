const token = localStorage.getItem('JwtToken');

async function MakeAjax(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: options.dataType,
        contentType: options.contentType
    });
}


async function MakeAjaxFormData(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: false,
        contentType: false,
        isFormData: true,
        processData: false
    });
}


// Formatear el número de manera correcta
function formatNumber(number) {
    if (typeof number !== 'number' || isNaN(number)) {
        return "$ 0,00"; // Si el número no es válido, retornar un valor por defecto
    }

    // Asegurarse de que el número tenga dos decimales
    const parts = number.toFixed(2).split("."); // Dividir en parte entera y decimal

    // Formatear la parte entera con puntos como separadores de miles
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "."); // Usar punto para miles

    // Devolver el número con la coma como separador decimal
    return "$ " + parts.join(",");
}



function mostrarModalConContador(modal, texto, tiempo) {
    $(`#${modal}Text`).text(texto);
    $(`#${modal}`).modal('show');

    setTimeout(function () {
        $(`#${modal}`).modal('hide');
    }, tiempo);
}

function exitoModal(texto) {
    mostrarModalConContador('exitoModal', texto, 1000);
}

function errorModal(texto) {
    mostrarModalConContador('errorModal', texto, 3000);
}

function advertenciaModal(texto) {
    mostrarModalConContador('AdvertenciaModal', texto, 3000);
}

function confirmarModal(mensaje) {
    return new Promise((resolve) => {
        const modalEl = document.getElementById('modalConfirmar');
        const mensajeEl = document.getElementById('modalConfirmarMensaje');
        const btnAceptar = document.getElementById('btnModalConfirmarAceptar');

        mensajeEl.innerText = mensaje;

        const modal = new bootstrap.Modal(modalEl, {
            backdrop: 'static',
            keyboard: false
        });

        // Flag para que no resuelva dos veces
        let resuelto = false;

        // Limpia todos los listeners anteriores
        modalEl.replaceWith(modalEl.cloneNode(true));
        // Re-obtener referencias luego de clonar
        const nuevoModalEl = document.getElementById('modalConfirmar');
        const nuevoBtnAceptar = document.getElementById('btnModalConfirmarAceptar');

        const nuevoModal = new bootstrap.Modal(nuevoModalEl, {
            backdrop: 'static',
            keyboard: false
        });

        nuevoBtnAceptar.onclick = function () {
            if (resuelto) return;
            resuelto = true;
            resolve(true);
            nuevoModal.hide();
        };

        nuevoModalEl.addEventListener('hidden.bs.modal', () => {
            if (resuelto) return;
            resuelto = true;
            resolve(false);
        }, { once: true });

        nuevoModal.show();
    });
}


const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS', // Cambia "ARS" por el código de moneda que necesites
    minimumFractionDigits: 2
});

function convertirMonedaAFloat(moneda) {
    // Eliminar el símbolo de la moneda y otros caracteres no numéricos
    const soloNumeros = moneda.replace(/[^0-9,.-]/g, '');

    // Eliminar separadores de miles y convertir la coma en punto
    const numeroFormateado = soloNumeros.replace(/\./g, '').replace(',', '.');

    // Convertir a flotante
    const numero = parseFloat(numeroFormateado);

    // Devolver el número formateado como cadena, asegurando los decimales
    return numero.toFixed(2); // Asegura siempre dos decimales en la salida
}
function convertirAMonedaDecimal(valor) {
    // Reemplazar coma por punto
    if (typeof valor === 'string') {
        valor = valor.replace(',', '.'); // Cambiar la coma por el punto
    }
    // Convertir a número flotante
    return parseFloat(valor);
}

function formatoNumero(valor) {
    // Reemplaza la coma por punto y elimina otros caracteres no numéricos (como $)
    return parseFloat(valor.replace(/[^0-9,]+/g, '').replace(',', '.')) || 0;
}

function parseDecimal(value) {
    return parseFloat(value.replace(',', '.'));
}


function formatMoneda(valor) {
    // Convertir a string, cambiar el punto decimal a coma y agregar separadores de miles
    let formateado = valor
        .toString()
        .replace('.', ',') // Cambiar punto decimal a coma
        .replace(/\B(?=(\d{3})+(?!\d))/g, "."); // Agregar separadores de miles

    // Agregar el símbolo $ al inicio
    return `$ ${formateado}`;
}


function toggleAcciones(id) {
    const dropdown = document.querySelector(`.acciones-menu[data-id='${id}'] .acciones-dropdown`);
    const isVisible = dropdown.style.display === 'block';

    // Oculta todos los demás menús desplegables
    document.querySelectorAll('.acciones-dropdown').forEach(el => el.style.display = 'none');

    if (!isVisible) {
        // Muestra el menú
        dropdown.style.display = 'block';

        // Obtén las coordenadas del botón
        const menuButton = document.querySelector(`.acciones-menu[data-id='${id}']`);
        const rect = menuButton.getBoundingClientRect();

        // Mueve el menú al body y ajusta su posición
        const dropdownClone = dropdown.cloneNode(true);
        dropdownClone.style.position = 'fixed';
        dropdownClone.style.left = `${rect.left}px`;
        dropdownClone.style.top = `${rect.bottom}px`;
        dropdownClone.style.zIndex = '10000';
        dropdownClone.style.display = 'block';

        // Limpia menús previos si es necesario
        document.querySelectorAll('.acciones-dropdown-clone').forEach(clone => clone.remove());

        dropdownClone.classList.add('acciones-dropdown-clone');
        document.body.appendChild(dropdownClone);
    }
}




function formatearFechaParaInput(fecha) {
    const m = moment(fecha, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('YYYY-MM-DD') : '';
}

function formatearFechaParaVista(fecha) {
    const m = moment(fecha, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('DD/MM/YYYY') : '';
}

function formatearMilesInput(input) {

    let value = input.value;

    if (!value) return;

    // permitir solo números, coma y punto
    value = value.replace(/[^0-9.,]/g, "");

    // separar decimal (solo primera coma)
    let parts = value.split(",");
    let entero = parts[0];
    let decimal = parts[1] ?? null;

    // limpiar puntos existentes
    entero = entero.replace(/\./g, "");

    // formatear miles
    if (entero) {
        entero = Number(entero).toLocaleString("es-AR");
    }

    // reconstruir
    input.value = decimal !== null
        ? `${entero},${decimal}`
        : entero;
}

function parseNumero(valor) {

    if (valor == null) return 0;

    let limpio = String(valor)
        .replace(/\./g, "")   // quitar miles
        .replace(",", ".");   // decimal a punto

    const num = parseFloat(limpio);

    return isNaN(num) ? 0 : num;
}

function redondear2(n) {
    const x = Number(n || 0);
    return Math.round(x * 100) / 100;
}

function formatearMonedaARS(n) {

    const v = redondear2(Number(n || 0));

    return v.toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatearNumero(n) {

    return Number(n || 0).toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


function formatearMiles(valor) {

    if (!valor) return "";

    let value = String(valor).replace(/[^0-9.,]/g, "");

    let [entero, decimal] = value.split(",");

    entero = (entero || "").replace(/\./g, "");

    if (entero) {
        entero = Number(entero).toLocaleString("es-AR");
    }

    return decimal !== undefined
        ? `${entero},${decimal}`
        : entero;
}

function formatearSinMiles(valor) {

    if (valor == null) return 0;

    let s = String(valor).trim();

    if (!s) return 0;

    s = s.replace(/\s/g, "");

    // formato AR → 1.500,30
    if (s.includes(".") && s.includes(",")) {
        s = s.replace(/\./g, "").replace(",", ".");
    }
    // solo coma → decimal
    else if (s.includes(",")) {
        s = s.replace(",", ".");
    }
    // solo puntos múltiples → miles
    else if ((s.match(/\./g) || []).length > 1) {
        s = s.replace(/\./g, "");
    }

    const n = parseFloat(s);

    return isNaN(n) ? 0 : n;
}

let audioContext = null;
let audioBuffer = null;


function llenarSelect(selectId, data, valueField = 'Id', textField = 'Nombre', conOpcionVacia = true) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = conOpcionVacia ? '<option value="">Seleccione</option>' : '';
    (data || []).forEach(it => {
        const opt = document.createElement('option');
        opt.value = it[valueField];
        opt.textContent = it[textField];
        sel.appendChild(opt);
    });
}



function formatearFecha(fecha) {
    try {
        const d = new Date(fecha);
        return d.toLocaleString("es-AR");
    } catch {
        return fecha;
    }
}

function normalizarDateInput(fecha) {
    if (!fecha) return "";
    try {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return "";
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    } catch {
        return "";
    }
}

function normalizarFechaTabla(fecha) {
    // Mostramos dd/MM/yyyy (si viene ISO)
    if (!fecha) return "";
    try {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return fecha;
        return d.toLocaleDateString("es-AR");
    } catch {
        return fecha;
    }
}


function abrirModalEdicion() {
    const modalEl = document.getElementById('modalEdicion');

    const modal = new bootstrap.Modal(modalEl, {
        backdrop: 'static',
        keyboard: false
    });

    modal.show();
}


function setModalSoloLectura(esSoloLectura) {
    const $modal = $("#modalEdicion");

    // Ocultar botón guardar/registrar
    $("#btnGuardar").toggleClass("d-none", esSoloLectura);

    // Opcional: por si tenés otro botón en el footer
    // $("#btnAlgoMas").toggleClass("d-none", esSoloLectura);

    // Deshabilitar inputs/textareas
    $modal.find("input, textarea").prop("disabled", esSoloLectura);

    // Deshabilitar selects normales + select2
    $modal.find("select").each(function () {
        const $el = $(this);
        $el.prop("disabled", esSoloLectura);

        if ($el.data("select2")) {
            $el.prop("disabled", esSoloLectura);
            $el.trigger("change.select2");
        }
    });

    // Evitar que se “pinten” validaciones mientras está solo lectura
    $modal.attr("data-sololectura", esSoloLectura ? "1" : "0");
}



/* =====================================
GS-UI — Render Acciones Grid GLOBAL
===================================== */

function renderAccionesGrid(id, acciones, modulo = null) {

    const user = JSON.parse(localStorage.getItem("userSession"));
    const permisos = user?.Permisos || [];

    const tienePermiso = (mod, tipo) => {

        const moduloBuscado = (mod || "").toLowerCase().trim();
        const tipoBuscado = (tipo || "").toLowerCase().trim();

        return permisos.some(p => {

            const nombreModulo = (p.Modulo || "").toLowerCase().trim();
            const codigoModulo = (p.CodigoModulo || "").toLowerCase().trim();

            if (nombreModulo !== moduloBuscado && codigoModulo !== moduloBuscado) return false;

            if (!p.Permisos) return false;

            const permiso = p.Permisos.find(x =>
                (x.Codigo || "").toLowerCase() === tipoBuscado
            );

            return !!permiso?.Activo;
        });
    };

    const mod = modulo || acciones.modulo || "";

    const btnVer = (acciones.ver && tienePermiso(mod, "VER"))
        ? `
        <button type="button"
            class="btn btn-sm rp-act rp-act-view"
            title="Ver"
            onclick="${acciones.ver}(${id})">
            <i class="fa fa-file-text-o"></i>
        </button>`
        : "";

    const btnEditar = (acciones.editar && tienePermiso(mod, "EDITAR"))
        ? `
        <button type="button"
            class="btn btn-sm rp-act rp-act-edit"
            title="Editar"
            onclick="${acciones.editar}(${id})">
            <i class="fa fa-pencil-square-o"></i>
        </button>`
        : "";

    const btnEliminar = (acciones.eliminar && tienePermiso(mod, "ELIMINAR"))
        ? `
        <button type="button"
            class="btn btn-sm rp-act rp-act-del"
            title="Eliminar"
            onclick="${acciones.eliminar}(${id})">
            <i class="fa fa-trash-o"></i>
        </button>`
        : "";

    return `
        <div class="rp-row-actions" data-id="${id}">
            ${btnVer}
            ${btnEditar}
            ${btnEliminar}
        </div>
    `;
}
/* ======================================================
EXPORTADOR GLOBAL DATATABLES
(usar desde cualquier grid)
====================================================== */

window.ExportadorDT = {
    grid: null,
    tipo: null
};

/* =========================
   ABRIR MODAL
========================= */

window.abrirModalExportacion = function (grid, tipo, nombreListado) {

    if (!grid) return;

    ExportadorDT.grid = grid;
    ExportadorDT.tipo = tipo;
    ExportadorDT.nombreListado = nombreListado || "Datos";

    const container = $("#exportColumnsContainer");
    container.empty();

    const columns = grid.settings()[0].aoColumns;

    columns.forEach((col, index) => {

        if (index === 0) return;
        if (!grid.column(index).visible()) return;

        const nombre = col.sTitle || `Columna ${index}`;

        container.append(`
<label class="export-item">
    <input type="checkbox"
           class="export-col"
           value="${index}"
           checked>
    <span class="export-pill">${nombre}</span>
</label>
`);
    });

    $("#modalExportar").modal("show");
};

/* =========================
   CONFIRMAR EXPORT
========================= */

$(document).off("click.exportador")
    .on("click.exportador", "#btnConfirmarExport", function () {

        const columnas = [];

        $(".export-col:checked").each(function () {
            columnas.push(parseInt($(this).val()));
        });

        if (!columnas.length) {
            alert("Seleccione al menos una columna");
            return;
        }

        $("#modalExportar").modal("hide");

        ejecutarExportacionGlobal(columnas);
    });


/* =========================
   EXPORT REAL
========================= */

window.ejecutarExportacionGlobal = function (columnas) {

    const grid = ExportadorDT.grid;
    const tipo = ExportadorDT.tipo;

    if (!grid) return;

    const tituloExport = `Listado de ${ExportadorDT.nombreListado}`;

    const configBase = {
        title: tituloExport || "Exportación",
        exportOptions: {
            columns: columnas
        }
    };

    let buttonConfig;

    switch (tipo) {
        case "excel":
            buttonConfig = { extend: 'excelHtml5', ...configBase };
            break;

        case "pdf":
            buttonConfig = {
                extend: 'pdfHtml5',
                orientation: 'landscape',
                pageSize: 'A4',
                ...configBase
            };
            break;

        case "print":
            buttonConfig = { extend: 'print', ...configBase };
            break;

        default:
            return;
    }

    const temp = new $.fn.dataTable.Buttons(grid, {
        buttons: [buttonConfig]
    });

    // ✅ EJECUCIÓN REAL
    temp.container().find('button').trigger('click');
};

$(document).on("change", "#chkExportAll", function () {
    $(".export-col").prop("checked", this.checked);
});

window.ExportadorDT = {
    grid: null,
    tipo: null,
    nombreListado: null   // 👈 NUEVO
};

function cerrarErrorCampos() {
    $("#errorCampos").addClass("d-none");
}

function mostrarErrorCampos(
    mensaje,
    idReferencia = null,
    tipo = "validacion" // validacion | duplicado | relacion | error
) {

    const container = document.getElementById("errorCampos");
    if (!container) return;

    /* =========================
       CONFIG SEGÚN TIPO
    ========================= */

    let titulo = "";
    let icono = "fa-exclamation-triangle";

    switch (tipo) {

        case "duplicado":
            titulo = "Registro duplicado detectado";
            break;

        case "relacion":
            titulo = "No se puede eliminar";
            icono = "fa-link";
            break;

        case "error":
            titulo = "No se pudo guardar";
            icono = "fa-times-circle";
            break;

        default:
            titulo = "Campos requeridos";
            icono = "fa-exclamation-circle";
            break;
    }

    /* =========================
       BOTON REFERENCIA
    ========================= */

    let botonReferencia = "";

    if (idReferencia) {
        botonReferencia = `
            <button class="rp-btn-ref"
                onclick="verFicha(${idReferencia})">
                <i class="fa fa-eye me-1"></i>
                Abrir ficha existente →
            </button>`;
    }

    /* =========================
       RENDER
    ========================= */

    container.innerHTML = `
        <div class="rp-error-box">

            <div class="rp-error-icon">
                <i class="fa ${icono}"></i>
            </div>

            <div class="rp-error-content">
                <div class="rp-error-title">
                    ${titulo}
                </div>

                <div class="rp-error-text">
                    ${mensaje}
                </div>
            </div>

            ${botonReferencia}

        </div>
    `;

    container.classList.remove("d-none");

    container.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}




function getSelect2Selection(el) {
    const $el = $(el);
    const s2 = $el.data("select2");
    if (s2 && s2.$selection && s2.$container) {
        return {
            $selection: s2.$selection,
            $container: s2.$container
        };
    }

    const $cont = $el.nextAll(".select2-container").first();
    return {
        $selection: $cont.find(".select2-selection").first(),
        $container: $cont
    };
}


function setEstadoCampo(el, esValido) {
    const $el = $(el);
    const esSelect = el.tagName === "SELECT";
    const valor = ($el.val() ?? "").toString().trim();

    // 1) clases en el elemento real
    el.classList.toggle("is-invalid", !esValido);
    el.classList.toggle("is-valid", esValido);

    // 2) clases en select2 (lo visible)
    if (esSelect && $el.data("select2")) {
        const { $selection, $container } = getSelect2Selection(el);
        $selection.toggleClass("is-invalid", !esValido);
        $selection.toggleClass("is-valid", esValido);

        // por si tu CSS apunta al container
        $container.toggleClass("is-invalid", !esValido);
        $container.toggleClass("is-valid", esValido);
    }

    // 3) mensaje "Campo obligatorio" (tu caso)
    // Busca feedback cerca del control (adaptable a tu HTML)
    const $wrap = $el.closest(".mb-3, .form-group, .col, .col-md-6, .rp-field, .rp-form-group");
    const $msg = $wrap.find(".invalid-feedback, .rp-invalid-msg, .campo-obligatorio, small.text-danger").first();

    if ($msg.length) {
        // Si es bootstrap invalid-feedback: lo controlamos con display
        // Si es tu <small class="text-danger">Campo obligatorio</small>, también.
        $msg.toggleClass("d-none", esValido);
    }
}




function aplicarFormatoMiles() {

    document.querySelectorAll(".Inputmiles").forEach(inp => {

        const num = inp.value;

        if (!num) {
            inp.value = "";
            return;
        }

        inp.value = formatearMiles(num);

    });

}

function vnTimeHHmm(value) {

    if (!value) return "00:00";

    const d = value instanceof Date ? value : new Date(value);

    if (isNaN(d.getTime())) return "00:00";

    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");

    return `${hh}:${mm}`;
}

function vnIsoDateOnly(value) {

    if (!value) return "";

    const d = value instanceof Date ? value : new Date(value);

    if (isNaN(d.getTime())) return "";

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
}


function tienePermiso(modulo, tipo) {

    const user = JSON.parse(localStorage.getItem("userSession"));
    const permisos = user?.Permisos || [];

    return permisos.some(p =>
        p.Modulo?.toLowerCase() === modulo.toLowerCase() &&
        p[tipo] === true
    );
}

function getBotonesExportacion(grid,modulo) {

    const botones = [];

    if (tienePermiso(modulo, "Exportar")) {
        botones.push({
            text: 'Excel',
            action: () => abrirModalExportacion(grid, 'excel', modulo)
        });

        botones.push({
            text: 'PDF',
            action: () => abrirModalExportacion(grid, 'pdf', modulo)
        });

        botones.push({
            text: 'Imprimir',
            action: () => abrirModalExportacion(grid, 'print', modulo)
        });
    }

    // siempre dejamos este
    botones.push('pageLength');

    return botones;
}