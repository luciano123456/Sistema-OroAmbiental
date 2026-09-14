let semanas = [];
let dias = [];
let camiones = [];
let rutasData = [];
let establecimientosClienteCache = [];
let recorridosSeleccionados = [];
let clientesRecorridoActual = [];
let sugeridosRecorridoActual = [];
let sugeridosPanelVisible = false;
let semanaTabActiva = null;
let modalClienteRecorrido = null;
let modalManifiestoRecorrido = null;
let busquedaTimer = null;
let recClientesAbort = null;
let txtSeleccionActiva = false;
let txtSeleccionIds = new Set();
let mfSeleccionActiva = false;
let mfSeleccionIds = new Set();

const getTokenRec = () => window.token || localStorage.getItem("JwtToken") || "";

const headersAuth = () => ({
    Authorization: "Bearer " + getTokenRec(),
    "Content-Type": "application/json"
});

const select2Opts = { width: "100%", allowClear: true, placeholder: "Seleccionar" };

$(document).ready(async () => {
    modalClienteRecorrido = new bootstrap.Modal(document.getElementById("modalClienteRecorrido"));
    const elModalManifiesto = document.getElementById("modalManifiestoRecorrido");
    if (elModalManifiesto) modalManifiestoRecorrido = new bootstrap.Modal(elModalManifiesto);

    if (typeof initCamionModal === "function") {
        initCamionModal({ token: token, onSaved: async () => { await recargarCamionesSelect(); } });
    }

    $("#btnNuevoCamionRec").on("click", () => {
        if (typeof nuevoCamion === "function") nuevoCamion();
        else if (typeof errorModal === "function") errorModal("No se pudo abrir el alta de unidades.");
    });

    $(".rec-btn-shortcut[data-config-controller]").on("click", async function (e) {
        e.preventDefault();
        if (typeof abrirConfiguracion !== "function") {
            errorModal("No se pudo abrir la configuracion.");
            return;
        }
        try {
            await abrirConfiguracion($(this).data("config-nombre"), $(this).data("config-controller"), null, null, null, true);
        } catch (err) {
            console.error(err);
            errorModal("No se pudo abrir la configuracion.");
        }
    });

    $("#listaRutas").on("click", ".rec-btn-unidad-prompt", function () {
        enfocarSelectorUnidad();
    });

    $("#selCamion").on("change", async function () {
        await cargarRutasUnidad();
        limpiarSeleccionRecorrido();
    });

    $("#selRecorridoRapido").on("change", function () {
        const val = $(this).val();
        if (!val) return;
        const [idSemana, idDia] = val.split("_").map(Number);
        const item = rutasData.find(x => x.IdSemana === idSemana && x.IdDia === idDia);

        if (!parseInt($("#selFiltroSemana").val(), 10) && semanas.length > 1 && semanaTabActiva !== idSemana) {
            semanaTabActiva = idSemana;
            renderListaRutas();
        }

        seleccionarRecorrido(idSemana, idDia, item?.Zona || "");
        scrollARuta(idSemana, idDia);
    });

    $("#selFiltroSemana, #selFiltroDia").on("change", () => {
        if ($("#selFiltroSemana").val()) {
            semanaTabActiva = parseInt($("#selFiltroSemana").val(), 10) || null;
        }
        renderListaRutas();
    });

    $("#listaRutas").on("click", ".rec-semana-tab", function () {
        semanaTabActiva = parseInt($(this).data("semana"), 10);
        renderListaRutas();
    });

    $("#listaRutas").on("click", ".rec-ruta-item", function (e) {
        if ($(e.target).closest("input, button, a, label").length) return;
        const $row = $(this);
        toggleSeleccionRecorrido(
            parseInt($row.data("semana"), 10),
            parseInt($row.data("dia"), 10),
            $row.find(".rec-zona-input").val(),
            e.ctrlKey || e.metaKey
        );
    });

    $("#listaRutas").on("click", ".btn-guardar-zona", async function (e) {
        e.stopPropagation();
        const $row = $(this).closest(".rec-ruta-item");
        await guardarMetaRecorrido(
            parseInt($row.data("semana"), 10),
            parseInt($row.data("dia"), 10),
            $row.find(".rec-zona-input").val(),
            $row.find(".rec-salida-input").val()
        );
    });

    $("#listaRutas").on("click", ".btn-ver-clientes", function (e) {
        e.stopPropagation();
        const $row = $(this).closest(".rec-ruta-item");
        seleccionarRecorrido(
            parseInt($row.data("semana"), 10),
            parseInt($row.data("dia"), 10),
            $row.find(".rec-zona-input").val()
        );
    });

    $("#listaRutas").on("keydown", ".rec-ruta-item", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        if ($(e.target).closest("input, button").length) return;
        e.preventDefault();
        $(this).trigger("click");
    });

    $("#listaRutas").on("keydown", ".rec-zona-input, .rec-salida-input", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            $(this).closest(".rec-ruta-item").find(".btn-guardar-zona").trigger("click");
        }
    });

    $("#listaRutas").on("blur", ".rec-salida-input", async function () {
        const $row = $(this).closest(".rec-ruta-item");
        const idSemana = parseInt($row.data("semana"), 10);
        const idDia = parseInt($row.data("dia"), 10);
        const valor = ($(this).val() || "").trim();
        if (valor === getHorarioSalidaRecorrido(idSemana, idDia)) return;

        await guardarMetaRecorrido(
            idSemana,
            idDia,
            $row.find(".rec-zona-input").val(),
            valor,
            { silent: true }
        );
    });

    $("#listaClientesRecorrido").on("show.bs.collapse", ".rec-prod-collapse", function () {
        asegurarCuerpoProductosRec(this);
    });
    $("#listaClientesRecorrido").on("blur", ".rec-obs-input", function () {
        const id = parseInt($(this).data("id"), 10);
        guardarObservacionClienteRecorrido(id, $(this).val());
    });
    $("#listaClientesRecorrido").on("change", ".rec-txt-check", function () {
        const id = parseInt($(this).data("id"), 10);
        if (mfSeleccionActiva) setMfSeleccionCliente(id, this.checked);
        else setTxtSeleccionCliente(id, this.checked);
    });
    $("#listaClientesRecorrido").on("click", ".rec-cliente-item", function (e) {
        if (!txtSeleccionActiva && !mfSeleccionActiva) return;
        if ($(e.target).closest("button, a, textarea, input, select, label, .rec-cliente-obs, .rec-cliente-productos").length)
            return;
        const id = parseInt($(this).data("id"), 10);
        if (!id) return;
        if (mfSeleccionActiva) setMfSeleccionCliente(id, !mfSeleccionIds.has(id));
        else setTxtSeleccionCliente(id, !txtSeleccionIds.has(id));
    });
    $("#listaClientesRecorrido").on("change", ".rec-prod-lista", async function () {
        await onCambioListaProductoRec($(this));
        guardarProductoClienteRecorrido($(this).closest(".rec-prod-row[data-cep-id]"), { alertar: false });
    });
    $("#listaClientesRecorrido").on("blur", ".rec-prod-cant, .rec-prod-precio", function () {
        const alertar = $(this).hasClass("rec-prod-precio");
        guardarProductoClienteRecorrido($(this).closest(".rec-prod-row[data-cep-id]"), { alertar });
    });
    $("#listaClientesRecorrido").on("input", ".rec-prod-precio", function () {
        const $row = $(this).closest(".rec-prod-row[data-cep-id]");
        const raw = $row.attr("data-precio-lista");
        if (raw === undefined || raw === "") return;
        const precioLista = Number(raw);
        if (Number.isNaN(precioLista)) return;
        marcarPrecioVsListaRec($row, leerNumeroRec($(this).val()), precioLista, { alertar: false });
    });

    $("#txtBuscarRecorrido").on("input", function () {
        clearTimeout(busquedaTimer);
        busquedaTimer = setTimeout(() => buscarRecorridos($(this).val().trim()), 350);
    });

    $("#btnCerrarBusqueda").on("click", () => {
        $("#txtBuscarRecorrido").val("");
        $("#panelBusqueda").addClass("d-none");
    });

    $("#btnNuevoClienteRecorrido").on("click", () => abrirModalClienteRecorrido());
    $("#btnHojaRutaRecorrido").on("click", busyHandler(abrirHojaRutaRecorrido, { label: "Generando..." }));
    $("#btnTxtMesRecorrido").on("click", () => abrirModalManifiestoRecorrido(0, "txt-mes"));
    $("#btnTxtSeleccionarRecorrido").on("click", () => activarTxtSeleccionRecorrido());
    $("#btnTxtSelTodosRecorrido").on("click", () => seleccionarTodosTxtRecorrido());
    $("#btnTxtSelExportarRecorrido").on("click", () => abrirModalManifiestoRecorrido(0, "txt-sel"));
    $("#btnTxtSelCancelarRecorrido").on("click", () => cancelarTxtSeleccionRecorrido());
    $("#btnMfSeleccionarRecorrido").on("click", () => activarMfSeleccionRecorrido());
    $("#btnMfSelTodosRecorrido").on("click", () => seleccionarTodosMfRecorrido());
    $("#btnMfSelGenerarRecorrido").on("click", () => abrirModalManifiestoRecorrido(0, "manifiesto-sel"));
    $("#btnMfSelCancelarRecorrido").on("click", () => cancelarMfSeleccionRecorrido());
    $("#btnManifiestosRecorrido").on("click", () => abrirModalManifiestoRecorrido(0, "manifiesto"));
    $("#btnConfirmarManifiestoRecorrido").on("click", busyHandler(confirmarManifiestoRecorrido, { label: "Generando..." }));
    $("#btnExportarTxtIntercambioRecorrido").on("click", busyHandler(exportarArchivoIntercambioRecorrido, { label: "Generando..." }));
    $("#mfGenerarCertificados").on("change", function () {
        const on = $(this).is(":checked");
        $("#mfCertificadosPanel").toggleClass("d-none", !on);
    });
    $("#mfNumeroManifiesto").on("input", function () {
        if (!$("#mfLotePreviewWrap").hasClass("d-none")) pintarPreviewLoteManifiesto();
    });
    $(document).on("input", "#mfLotePreviewBody [data-copias-id]", function () {
        pintarPreviewLoteManifiesto();
    });
    $(document).on("input", "#mfCopiasTodas", function () {
        aplicarCopiasTodasLotePreview($(this).val());
    });
    $(document).on("change", "#mfIdChofer", aplicarChoferSeleccionadoManifiesto);
    $("#mfNumeroManifiesto, #mfNombreManifiesto").on("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            if (($("#mfModoExport").val() || "").startsWith("txt"))
                $("#btnExportarTxtIntercambioRecorrido").trigger("click");
            else
                $("#btnConfirmarManifiestoRecorrido").trigger("click");
        }
    });
    $("#btnTraerProgramadosRec").on("click", () => traerProgramadosRecorrido());
    $("#btnToggleSugeridosRec").on("click", () => {
        sugeridosPanelVisible = !sugeridosPanelVisible;
        renderPanelSugeridos();
    });
    $("#btnAgregarSugeridosRec").on("click", () => agregarSugeridosSeleccionados());
    $("#listaSugeridosRecorrido").on("change", ".rec-sugerido-check", actualizarResumenSugeridos);
    $("#listaSugeridosRecorrido").on("change", "#chkSugeridosTodos", function () {
        const checked = $(this).is(":checked");
        $("#listaSugeridosRecorrido .rec-sugerido-check:not(:disabled)").prop("checked", checked);
        actualizarResumenSugeridos();
    });
    $("#btnGuardarClienteRecorrido").on("click", busyHandler(guardarClienteRecorrido));

    const avisoCr = document.getElementById("avisoOrdenRecorridoCr");
    if (typeof rpBindAvisoOrdenRecorrido === "function") {
        rpBindAvisoOrdenRecorrido(avisoCr);
    }
    $("#crPosicion").on("input change", actualizarAvisoPosicionRecorrido);

    $("#crCliente").on("change", async function () {
        await cargarEstablecimientosCliente(parseInt($(this).val(), 10));
    });

    $("#crEstablecimiento").on("change", aplicarOrdenRecorridoDesdeEstablecimiento);

    $("#crActivo").on("change", function () {
        $("#lblCrActivo").text($(this).is(":checked") ? "Activo" : "Inactivo");
    });

    $("#crReprogramado").on("change", function () {
        actualizarLabelReprogramado($(this).is(":checked"));
    });

    document.addEventListener("configuracionActualizada", async (e) => {
        const tipo = (e.detail?.tipo || "").toLowerCase();
        if (tipo === "semanas" || tipo === "dias") {
            await cargarCatalogos();
            llenarFiltrosCatalogos();
            const idCamion = parseInt($("#selCamion").val(), 10);
            if (idCamion) await cargarRutasUnidad();
            else renderListaRutasVacia();
        }
    });

    await inicializarPagina();
});

async function inicializarPagina() {
    try {
        await Promise.all([
            cargarCatalogos(),
            recargarCamionesSelect(null, { silent: true })
        ]);
        llenarFiltrosCatalogos();
        initSelect2Recorridos();
        renderListaRutasVacia();
        renderClientesRecorrido([]);
    } catch (e) {
        console.error(e);
        if (typeof errorModal === "function") errorModal("No se pudo cargar la pantalla de recorridos.");
    }
}

function initSelect2Recorridos() {
    ["#selCamion", "#selRecorridoRapido", "#selFiltroSemana", "#selFiltroDia"].forEach(sel => {
        ensureSelect2($(sel), select2Opts);
    });
    ensureSelect2($("#crCliente"), Object.assign({}, select2Opts, {
        dropdownParent: $("#modalClienteRecorrido"),
        placeholder: "Buscar cliente...",
        minimumInputLength: 0,
        ajax: {
            delay: 220,
            transport: function (params, success, failure) {
                const q = (params.data.term || "").trim();
                fetchJson(`/Clientes/Combo?q=${encodeURIComponent(q)}&take=40`)
                    .then(data => {
                        const rows = Array.isArray(data) ? data : [];
                        success({
                            results: rows.map(c => ({ id: c.Id, text: c.Nombre || "" }))
                        });
                    })
                    .catch(failure);
            }
        }
    }));
    ensureSelect2($("#crEstablecimiento"), Object.assign({}, select2Opts, {
        dropdownParent: $("#modalClienteRecorrido"),
        placeholder: "Sin establecimiento"
    }));
}

function ensureSelect2($el, opts) {
    if (!$el?.length) return;
    if ($el.data("select2")) $el.select2("destroy");
    $el.select2(Object.assign({}, select2Opts, opts || {}));
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { ...headersAuth(), ...(options.headers || {}) }
    });
    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
    return await response.json();
}

async function cargarCatalogos() {
    const [rSemanas, rDias] = await Promise.all([
        fetchJson("/Semanas/Lista"),
        fetchJson("/Dias/Lista")
    ]);
    semanas = Array.isArray(rSemanas) ? rSemanas : [];
    dias = ordenarDiasSemana(Array.isArray(rDias) ? rDias : []);
}

function ordenIndiceDiaSemana(nombre) {
    const n = String(nombre || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    if (n.startsWith("lun")) return 1;
    if (n.startsWith("mar")) return 2;
    if (n.startsWith("mie")) return 3;
    if (n.startsWith("jue")) return 4;
    if (n.startsWith("vie")) return 5;
    if (n.startsWith("sab")) return 6;
    if (n.startsWith("dom")) return 7;
    return 100;
}

function ordenarDiasSemana(lista) {
    return [...(lista || [])].sort((a, b) => {
        const ia = ordenIndiceDiaSemana(a.Nombre);
        const ib = ordenIndiceDiaSemana(b.Nombre);
        if (ia !== ib) return ia - ib;
        return String(a.Nombre || "").localeCompare(String(b.Nombre || ""), "es");
    });
}

function llenarFiltrosCatalogos() {
    const $sem = $("#selFiltroSemana");
    const $dia = $("#selFiltroDia");
    const semVal = $sem.val();
    const diaVal = $dia.val();

    $sem.find("option:not(:first)").remove();
    semanas.forEach(s => $sem.append(new Option(s.Nombre, s.Id)));

    $dia.find("option:not(:first)").remove();
    dias.forEach(d => $dia.append(new Option(d.Nombre, d.Id)));

    $sem.val(semVal || "").trigger("change.select2");
    $dia.val(diaVal || "").trigger("change.select2");
}

async function recargarCamionesSelect(selectedId, options = {}) {
    const silent = options.silent === true;
    const data = await fetchJson("/Recorridos/Camiones?soloActivos=true");
    camiones = Array.isArray(data) ? data : [];

    const sel = $("#selCamion");
    const prev = selectedId || parseInt(sel.val(), 10) || "";

    sel.empty().append(new Option("Seleccionar unidad", ""));
    camiones.forEach(c => sel.append(new Option(c.Nombre, c.Id)));

    if (prev && camiones.some(c => c.Id === prev)) sel.val(String(prev));
    else sel.val("");

    if (!silent) sel.trigger("change");
    else if (sel.data("select2")) sel.trigger("change.select2");
}

async function cargarEstablecimientosCliente(idCliente, selectedId) {
    const sel = $("#crEstablecimiento");
    sel.empty().append(new Option("Sin establecimiento", ""));
    establecimientosClienteCache = [];

    if (!idCliente) {
        sel.val("").trigger("change");
        return;
    }

    try {
        const data = await fetchJson(`/ClientesEstablecimientos/ListaPorCliente?idCliente=${idCliente}`);
        establecimientosClienteCache = Array.isArray(data) ? data : [];
        establecimientosClienteCache.forEach(e => sel.append(new Option(e.Nombre || e.Etiqueta, e.Id)));
    } catch (e) {
        console.warn("No se pudieron cargar establecimientos:", e);
    }

    sel.val(selectedId ? String(selectedId) : "").trigger("change");
    aplicarOrdenRecorridoDesdeEstablecimiento();
}

function aplicarOrdenRecorridoDesdeEstablecimiento() {
    const idEst = parseInt($("#crEstablecimiento").val(), 10);
    if (!idEst) return;

    const est = establecimientosClienteCache.find(x => Number(x.Id) === idEst);
    if (est?.OrdenRecorrido != null && est.OrdenRecorrido > 0) {
        $("#crPosicion").val(est.OrdenRecorrido);
    } else {
        $("#crPosicion").val(getSiguientePosicionRecorrido());
    }
    actualizarAvisoPosicionRecorrido();
}

async function cargarRutasUnidad() {
    const idCamion = parseInt($("#selCamion").val(), 10);

    if (!idCamion) {
        rutasData = [];
        renderListaRutasVacia();
        return;
    }

    try {
        rutasData = await fetchJson(`/Recorridos/Matriz?idCamion=${idCamion}`);
    } catch (e) {
        console.error(e);
        rutasData = [];
    }

    renderListaRutas();
}

function getUnidadPromptHtml() {
    return `
        <div class="rec-unidad-prompt">
            <div class="rec-unidad-prompt-glow"></div>
            <span class="rec-unidad-prompt-icon"><i class="fa fa-truck"></i></span>
            <p class="rec-unidad-prompt-step">Paso 1</p>
            <h6 class="rec-unidad-prompt-title">Selecciona una unidad</h6>
            <p class="rec-unidad-prompt-text">
                Aca vas a ver las rutas por semana y dia. Elegi la unidad de recoleccion en el selector de arriba para empezar.
            </p>
            <button type="button" class="btn btn-success rec-btn-unidad-prompt">
                <i class="fa fa-hand-pointer-o me-1"></i> Elegir unidad
            </button>
        </div>`;
}

function setEstadoUnidadSeleccionada(seleccionada) {
    $(".rec-page").toggleClass("rec-sin-unidad", !seleccionada);
    $("#recFieldUnidad").toggleClass("rec-field-unidad--pendiente", !seleccionada);
    $("#recCardRutas").toggleClass("rec-card--sin-unidad", !seleccionada);

    if (!seleccionada) {
        $("#lblRutasHint").html(
            '<span class="rec-hint-pendiente"><i class="fa fa-arrow-circle-up"></i> Elegi una unidad arriba para continuar</span>'
        );
        cancelarSeleccionesHojaRecorrido(false);
    }
    syncBotonesTxtPlanta();
}

function enfocarSelectorUnidad() {
    const $field = $("#recFieldUnidad");
    if (!$field.length) return;

    $("html, body").animate({ scrollTop: Math.max(0, $field.offset().top - 90) }, 280);
    setTimeout(() => {
        const $sel = $("#selCamion");
        if ($sel.data("select2")) $sel.select2("open");
        else $sel.trigger("focus");
    }, 320);
}

function renderListaRutasVacia() {
    const idCamion = parseInt($("#selCamion").val(), 10);
    setEstadoUnidadSeleccionada(!!idCamion);

    $("#selRecorridoRapido").prop("disabled", true).empty().append(new Option("Primero elegi una unidad", "")).trigger("change.select2");

    if (!semanas.length || !dias.length) {
        $("#lblRutasHint").text("Configura semanas y dias para armar los recorridos");
        $("#listaRutas").html(`
            <div class="rec-empty">
                <i class="fa fa-calendar-plus-o"></i>
                Todavia no hay semanas o dias cargados.<br>
                <span class="text-muted-cc">Usa los botones <strong>+ Semanas</strong> y <strong>+ Dias</strong> para crearlos.</span>
            </div>`);
        return;
    }

    if (!idCamion) {
        $("#listaRutas").html(getUnidadPromptHtml());
    }
}

function renderRutaItemHtml(s, d, mapa) {
    const key = `${s.Id}_${d.Id}`;
    const ruta = mapa[key];
    const zona = (ruta?.Zona || "").trim();
    const salida = (ruta?.HorarioSalida || "").trim();
    const selected = isRecorridoSeleccionado(s.Id, d.Id);

    return `
        <div class="rec-ruta-item${selected ? " selected" : ""}${zona ? " has-zona" : ""}${salida ? " has-salida" : ""}"
             data-semana="${s.Id}" data-dia="${d.Id}" id="ruta-${key}" role="button" tabindex="0">
            <div class="rec-ruta-main">
                <span class="rec-ruta-badge">${escapeHtml(s.Nombre)}</span>
                <strong class="rec-ruta-dia">${escapeHtml(d.Nombre)}</strong>
            </div>
            <div class="rec-ruta-meta">
                <div class="rec-ruta-zona">
                    <label class="rec-ruta-zona-label">Zona / barrio</label>
                    <div class="rec-ruta-zona-row">
                        <input type="text" class="form-control rec-input rec-zona-input"
                               value="${escapeHtml(zona)}" placeholder="Ej: Lanus, Avellaneda..."
                               maxlength="120" autocomplete="off" />
                    </div>
                </div>
                <div class="rec-ruta-salida">
                    <label class="rec-ruta-zona-label">Horario de salida</label>
                    <input type="text" class="form-control rec-input rec-salida-input"
                           value="${escapeHtml(salida)}" placeholder="Ej: 07:30"
                           maxlength="20" autocomplete="off"
                           title="Horario de salida del recorrido (se imprime en la hoja de ruta)" />
                </div>
                <button type="button" class="btn btn-success btn-sm btn-guardar-zona" title="Guardar zona y horario de salida">
                    <i class="fa fa-check"></i>
                </button>
            </div>
            <div class="rec-ruta-actions">
                <button type="button" class="btn btn-primary btn-sm btn-ver-clientes">
                    <i class="fa fa-users me-1"></i> Clientes
                </button>
            </div>
        </div>`;
}

function renderListaRutas() {
    const idCamion = parseInt($("#selCamion").val(), 10);
    if (!idCamion) {
        renderListaRutasVacia();
        return;
    }

    setEstadoUnidadSeleccionada(true);

    if (!semanas.length || !dias.length) {
        renderListaRutasVacia();
        return;
    }

    const camionNombre = camiones.find(c => c.Id === idCamion)?.Nombre || "";
    $("#lblRutasHint").html(`${camionNombre} - ${semanas.length * dias.length} recorridos posibles · <span class="rec-hint-multi">Ctrl + clic para elegir varios dias</span>`);

    const mapa = {};
    (rutasData || []).forEach(r => { mapa[`${r.IdSemana}_${r.IdDia}`] = r; });

    const filtroSemana = parseInt($("#selFiltroSemana").val(), 10) || null;
    const filtroDia = parseInt($("#selFiltroDia").val(), 10) || null;
    const usarTabsSemana = !filtroSemana && semanas.length > 1;

    if (usarTabsSemana) {
        if (!semanaTabActiva || !semanas.some(s => s.Id === semanaTabActiva)) {
            semanaTabActiva = semanas[0].Id;
        }
    } else if (filtroSemana) {
        semanaTabActiva = filtroSemana;
    }

    const semanasMostrar = usarTabsSemana
        ? semanas.filter(s => s.Id === semanaTabActiva)
        : (filtroSemana ? semanas.filter(s => s.Id === filtroSemana) : semanas);

    const items = [];
    const opcionesRapidas = [];

    semanasMostrar.forEach(s => {
        dias.forEach(d => {
            if (filtroDia && d.Id !== filtroDia) return;
            const key = `${s.Id}_${d.Id}`;
            const ruta = mapa[key];
            const zona = (ruta?.Zona || "").trim();
            const label = zona || `${s.Nombre} · ${d.Nombre}`;
            items.push({ s, d, zona, label, key });
            opcionesRapidas.push({ key, label });
        });
    });

    actualizarSelectRecorridoRapido(opcionesRapidas);

    if (!items.length) {
        $("#listaRutas").html(`<div class="rec-empty"><i class="fa fa-filter"></i>No hay recorridos con ese filtro</div>`);
        return;
    }

    let html = "";

    if (usarTabsSemana) {
        html += `<div class="rec-semana-tabs" role="tablist">`;
        semanas.forEach(s => {
            const activa = s.Id === semanaTabActiva;
            const count = dias.length;
            html += `<button type="button" class="rec-semana-tab${activa ? " is-active" : ""}"
                data-semana="${s.Id}" role="tab" aria-selected="${activa}">
                ${escapeHtml(s.Nombre)}<span class="rec-semana-tab-count">${count}</span>
            </button>`;
        });
        html += `</div>`;
    } else if (semanasMostrar.length === 1) {
        const s = semanasMostrar[0];
        const count = items.length;
        html += `<div class="rec-ruta-semana-head">
            <span>${escapeHtml(s.Nombre)}</span>
            <small>${count} recorrido${count === 1 ? "" : "s"}</small>
        </div>`;
    }

    html += `<div class="rec-rutas-list-inner">`;
    html += items.map(({ s, d }) => renderRutaItemHtml(s, d, mapa)).join("");
    html += `</div>`;

    $("#listaRutas").html(html);
    syncSeleccionRecorridosUI(false);
}

function recorridoKey(idSemana, idDia) {
    return `${idSemana}_${idDia}`;
}

function isRecorridoSeleccionado(idSemana, idDia) {
    return recorridosSeleccionados.some(r => r.idSemana === idSemana && r.idDia === idDia);
}

function getRecorridoActivo() {
    return recorridosSeleccionados.length
        ? recorridosSeleccionados[recorridosSeleccionados.length - 1]
        : null;
}

function crearRecorridoSeleccion(idSemana, idDia, zona) {
    const idCamion = parseInt($("#selCamion").val(), 10);
    if (!idCamion) return null;

    return {
        idCamion,
        idSemana,
        idDia,
        zona: (zona || "").trim()
    };
}

function toggleSeleccionRecorrido(idSemana, idDia, zona, ctrlKey) {
    const item = crearRecorridoSeleccion(idSemana, idDia, zona);
    if (!item) return;

    if (ctrlKey) {
        const idx = recorridosSeleccionados.findIndex(r => r.idSemana === idSemana && r.idDia === idDia);
        if (idx >= 0) recorridosSeleccionados.splice(idx, 1);
        else recorridosSeleccionados.push(item);
    } else {
        recorridosSeleccionados = [item];
    }

    syncSeleccionRecorridosUI(true);
}

function syncSeleccionRecorridosUI(recargarClientes) {
    $(".rec-ruta-item").each(function () {
        const idSemana = parseInt($(this).data("semana"), 10);
        const idDia = parseInt($(this).data("dia"), 10);
        $(this).toggleClass("selected", isRecorridoSeleccionado(idSemana, idDia));
    });

    const activo = getRecorridoActivo();
    if (!activo) {
        $("#lblRecorridoSeleccionado").text("Elegi un recorrido de la lista");
        $("#btnNuevoClienteRecorrido, #btnHojaRutaRecorrido, #btnManifiestosRecorrido, #btnMfSeleccionarRecorrido, #btnTraerProgramadosRec").prop("disabled", true);
        $("#btnTraerProgramadosRec").addClass("d-none");
        ocultarPanelSugeridos();
        cancelarSeleccionesHojaRecorrido(false);
        syncBotonesTxtPlanta();
        if (recargarClientes) renderClientesRecorrido([]);
        return;
    }

    $("#btnNuevoClienteRecorrido, #btnHojaRutaRecorrido, #btnManifiestosRecorrido, #btnMfSeleccionarRecorrido").prop("disabled", false);
    if (recorridosSeleccionados.length === 1) {
        $("#btnTraerProgramadosRec").removeClass("d-none").prop("disabled", false);
    }
    if (recargarClientes) cancelarSeleccionesHojaRecorrido(false);
    syncBotonesTxtPlanta();
    actualizarLabelRecorridoSeleccionado();

    if (recorridosSeleccionados.length === 1) {
        $("#selRecorridoRapido").val(recorridoKey(activo.idSemana, activo.idDia)).trigger("change.select2");
    }

    if (recargarClientes) cargarClientesRecorrido();
}

function actualizarLabelRecorridoSeleccionado(extra) {
    const activo = getRecorridoActivo();
    if (!activo) {
        $("#lblRecorridoSeleccionado").text("Elegi un recorrido de la lista");
        return;
    }

    if (recorridosSeleccionados.length > 1) {
        const camion = camiones.find(c => c.Id === activo.idCamion)?.Nombre || "";
        const resumenDias = recorridosSeleccionados
            .map(r => {
                const semana = semanas.find(s => s.Id === r.idSemana)?.Nombre || "";
                const dia = dias.find(d => d.Id === r.idDia)?.Nombre || "";
                return `${semana} ${dia}`.trim();
            })
            .join(" · ");
        const activoDia = dias.find(d => d.Id === activo.idDia)?.Nombre || "";
        const base = `${camion} · ${recorridosSeleccionados.length} dias seleccionados (${resumenDias}) · viendo ${activoDia}`;
        $("#lblRecorridoSeleccionado").text(extra ? `${base} · ${extra}` : base);
        return;
    }

    $("#lblRecorridoSeleccionado").text(getRecorridoLabelText(extra));
}

function actualizarSelectRecorridoRapido(opciones) {
    const sel = $("#selRecorridoRapido");
    const prev = sel.val();
    sel.prop("disabled", false).empty().append(new Option("Buscar recorrido...", ""));

    opciones.forEach(o => sel.append(new Option(o.label, o.key)));

    if (prev && opciones.some(o => o.key === prev)) sel.val(prev);
    else sel.val("");

    if (sel.data("select2")) sel.trigger("change.select2");
}

function getHorarioSalidaRecorrido(idSemana, idDia) {
    const ruta = rutasData.find(x => x.IdSemana === idSemana && x.IdDia === idDia);
    return (ruta?.HorarioSalida || "").trim();
}

function getRecorridoLabelText(extra) {
    const activo = getRecorridoActivo();
    if (!activo) return "Elegi un recorrido de la lista";
    const { idCamion, idSemana, idDia, zona } = activo;
    const camion = camiones.find(c => c.Id === idCamion)?.Nombre || "";
    const semana = semanas.find(s => s.Id === idSemana)?.Nombre || "";
    const dia = dias.find(d => d.Id === idDia)?.Nombre || "";
    const salida = getHorarioSalidaRecorrido(idSemana, idDia);
    const zonaTxt = (zona || "").trim();
    let base = zonaTxt
        ? zonaTxt
        : [camion, semana, dia].filter(Boolean).join(" · ");
    if (salida) base += ` · Salida ${salida}`;
    return extra ? `${base} · ${extra}` : base;
}

function seleccionarRecorrido(idSemana, idDia, zona) {
    recorridosSeleccionados = [];
    const item = crearRecorridoSeleccion(idSemana, idDia, zona);
    if (!item) return;
    recorridosSeleccionados = [item];
    syncSeleccionRecorridosUI(true);
}

function limpiarSeleccionRecorrido() {
    recorridosSeleccionados = [];
    $(".rec-ruta-item").removeClass("selected");
    $("#lblRecorridoSeleccionado").text("Elegi un recorrido de la lista");
    $("#btnNuevoClienteRecorrido, #btnHojaRutaRecorrido, #btnManifiestosRecorrido, #btnMfSeleccionarRecorrido, #btnTraerProgramadosRec").prop("disabled", true);
    $("#btnTraerProgramadosRec").addClass("d-none");
    cancelarSeleccionesHojaRecorrido(false);
    ocultarPanelSugeridos();
    renderClientesRecorrido([]);
}

function scrollARuta(idSemana, idDia) {
    const el = document.getElementById(`ruta-${idSemana}_${idDia}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function guardarMetaRecorrido(idSemana, idDia, zona, horarioSalida, opciones = {}) {
    const silent = !!opciones.silent;
    const idCamion = parseInt($("#selCamion").val(), 10);
    const valorZona = (zona || "").trim();
    const valorSalida = (horarioSalida || "").trim();

    if (!idCamion) {
        if (!silent) errorModal("Selecciona una unidad.");
        return false;
    }

    if (!valorZona && !valorSalida) {
        if (!silent) errorModal("Ingresa la zona o el horario de salida antes de guardar.");
        return false;
    }

    const anterior = rutasData.find(x => x.IdSemana === idSemana && x.IdDia === idDia);
    const zonaAnterior = (anterior?.Zona || "").trim();
    const salidaAnterior = (anterior?.HorarioSalida || "").trim();

    if (valorZona === zonaAnterior && valorSalida === salidaAnterior) {
        if (!silent && typeof exitoModal === "function") exitoModal("Los datos ya estan guardados.");
        return true;
    }

    try {
        const data = await fetchJson("/Recorridos/GuardarCeldaMatriz", {
            method: "POST",
            body: JSON.stringify({
                IdCamion: idCamion,
                IdSemana: idSemana,
                IdDia: idDia,
                Zona: valorZona,
                HorarioSalida: valorSalida || null
            })
        });

        if (!(data?.valor ?? data?.Valor)) {
            if (!silent) errorModal(data?.mensaje ?? data?.Mensaje ?? "No se pudo guardar.");
            return false;
        }

        const idx = rutasData.findIndex(x => x.IdSemana === idSemana && x.IdDia === idDia);
        const camionNombre = camiones.find(c => c.Id === idCamion)?.Nombre || "";
        const semanaNombre = semanas.find(s => s.Id === idSemana)?.Nombre || "";
        const diaNombre = dias.find(d => d.Id === idDia)?.Nombre || "";

        const item = {
            Id: idx >= 0 ? rutasData[idx].Id : 0,
            IdCamion: idCamion,
            Camion: camionNombre,
            IdSemana: idSemana,
            Semana: semanaNombre,
            IdDia: idDia,
            Dia: diaNombre,
            Zona: valorZona,
            HorarioSalida: valorSalida || null
        };

        if (idx >= 0) rutasData[idx] = item;
        else rutasData.push(item);

        recorridosSeleccionados.forEach(r => {
            if (r.idSemana === idSemana && r.idDia === idDia) r.zona = valorZona;
        });

        renderListaRutas();
        if (getRecorridoActivo()) actualizarLabelRecorridoSeleccionado();
        if (!silent && typeof exitoModal === "function") {
            exitoModal(data?.mensaje ?? data?.Mensaje ?? "Datos guardados.");
        }
        return true;
    } catch (e) {
        console.error(e);
        if (!silent) errorModal("Error al guardar. Verifica tu sesion e intenta de nuevo.");
        return false;
    }
}

async function cargarClientesRecorrido() {
    const activo = getRecorridoActivo();
    if (!activo) return;

    const { idCamion, idSemana, idDia } = activo;
    recClientesAbort?.abort();
    recClientesAbort = new AbortController();
    const signal = recClientesAbort.signal;

    $("#listaClientesRecorrido").html(
        `<div class="rec-empty"><i class="fa fa-spinner fa-spin"></i> Cargando clientes...</div>`
    );
    sugeridosRecorridoActual = [];
    sugeridosPanelVisible = false;
    $("#panelSugeridosRecorrido, #listaSugeridosRecorrido").addClass("d-none");

    try {
        const data = await fetchJson(
            `/Recorridos/ClientesPorRecorrido?idCamion=${idCamion}&idSemana=${idSemana}&idDia=${idDia}`,
            { signal }
        );
        const excluidos = leerExcluidosLicenciaRec(idCamion, idSemana, idDia);
        (data || []).forEach(item => {
            item.NoExportarHoja = excluidos.has(Number(item.Id));
        });
        renderClientesRecorrido(data);
    } catch (e) {
        if (e?.name === "AbortError") return;
        console.error(e);
        errorModal("No se pudieron cargar los clientes del recorrido.");
    }
}

function claveExcluidosLicenciaRec(idCamion, idSemana, idDia) {
    return `rec-no-export-${idCamion}-${idSemana}-${idDia}`;
}

function leerExcluidosLicenciaRec(idCamion, idSemana, idDia) {
    try {
        const raw = sessionStorage.getItem(claveExcluidosLicenciaRec(idCamion, idSemana, idDia));
        const arr = raw ? JSON.parse(raw) : [];
        return new Set((Array.isArray(arr) ? arr : []).map(Number).filter(n => n > 0));
    } catch {
        return new Set();
    }
}

function guardarExcluidosLicenciaRec(idCamion, idSemana, idDia, setIds) {
    try {
        sessionStorage.setItem(
            claveExcluidosLicenciaRec(idCamion, idSemana, idDia),
            JSON.stringify([...setIds])
        );
    } catch (e) {
        console.warn(e);
    }
}

function idsNoExportarLicenciaActuales() {
    return (clientesRecorridoActual || [])
        .filter(x => x.EnLicencia && x.NoExportarHoja)
        .map(x => Number(x.Id))
        .filter(id => id > 0);
}

function idsClientesManifiestoDesde(idDesde) {
    const inicio = Number(idDesde) || 0;
    const excluidos = new Set(idsNoExportarLicenciaActuales());
    const ids = (clientesRecorridoActual || [])
        .map(x => Number(x.Id))
        .filter(id => id > 0 && !excluidos.has(id));
    const idx = ids.indexOf(inicio);
    if (idx < 0) return inicio > 0 ? [inicio] : [];
    return ids.slice(idx);
}

function toggleNoExportarLicenciaRec(idRecorridoCliente) {
    const id = Number(idRecorridoCliente) || 0;
    const item = (clientesRecorridoActual || []).find(x => Number(x.Id) === id);
    if (!item || !item.EnLicencia) return;

    item.NoExportarHoja = !item.NoExportarHoja;

    const activo = getRecorridoActivo();
    if (activo) {
        const set = leerExcluidosLicenciaRec(activo.idCamion, activo.idSemana, activo.idDia);
        if (item.NoExportarHoja) set.add(id);
        else set.delete(id);
        guardarExcluidosLicenciaRec(activo.idCamion, activo.idSemana, activo.idDia, set);
    }

    renderClientesRecorrido(clientesRecorridoActual);
}

function idCamionActualRec() {
    return parseInt($("#selCamion").val(), 10) || 0;
}

function haySeleccionHojaRecorrido() {
    return txtSeleccionActiva || mfSeleccionActiva;
}

function cancelarSeleccionesHojaRecorrido(repintar) {
    const estaba = haySeleccionHojaRecorrido();
    txtSeleccionActiva = false;
    txtSeleccionIds = new Set();
    mfSeleccionActiva = false;
    mfSeleccionIds = new Set();
    $("#panelClientes").removeClass("rec-txt-sel rec-mf-sel");
    $("#barTxtSeleccionRecorrido, #barMfSeleccionRecorrido").addClass("d-none");
    $("#btnTxtMesRecorrido, #btnTxtSeleccionarRecorrido, #btnMfSeleccionarRecorrido, #btnManifiestosRecorrido").removeClass("d-none");
    if (estaba && repintar !== false) renderClientesRecorrido(clientesRecorridoActual);
    syncBotonesTxtPlanta();
}

function syncBotonesTxtPlanta() {
    const hayUnidad = idCamionActualRec() > 0;
    const hayRuta = !!getRecorridoActivo();
    const hayClientes = (clientesRecorridoActual || []).length > 0;
    const sel = haySeleccionHojaRecorrido();

    $("#btnTxtMesRecorrido").prop("disabled", !hayUnidad || sel);
    $("#btnTxtSeleccionarRecorrido").prop("disabled", !hayRuta || !hayClientes || sel);
    $("#btnMfSeleccionarRecorrido").prop("disabled", !hayRuta || !hayClientes || sel);
    $("#btnTxtMesRecorrido, #btnTxtSeleccionarRecorrido").toggleClass("d-none", sel);
    $("#btnMfSeleccionarRecorrido, #btnManifiestosRecorrido").toggleClass("d-none", sel);
    $("#barTxtSeleccionRecorrido").toggleClass("d-none", !txtSeleccionActiva);
    $("#barMfSeleccionRecorrido").toggleClass("d-none", !mfSeleccionActiva);
    $("#panelClientes").toggleClass("rec-txt-sel", txtSeleccionActiva);
    $("#panelClientes").toggleClass("rec-mf-sel", mfSeleccionActiva);
    actualizarBarraTxtSeleccion();
    actualizarBarraMfSeleccion();
}

function activarTxtSeleccionRecorrido() {
    if (!getRecorridoActivo()) {
        errorModal("Selecciona un recorrido para elegir clientes.");
        return;
    }
    if (!(clientesRecorridoActual || []).length) {
        errorModal("Este recorrido no tiene clientes para exportar.");
        return;
    }
    cancelarMfSeleccionRecorrido(false);
    txtSeleccionActiva = true;
    txtSeleccionIds = new Set();
    renderClientesRecorrido(clientesRecorridoActual);
    syncBotonesTxtPlanta();
}

function cancelarTxtSeleccionRecorrido(repintar) {
    const estaba = txtSeleccionActiva;
    txtSeleccionActiva = false;
    txtSeleccionIds = new Set();
    $("#panelClientes").removeClass("rec-txt-sel");
    $("#barTxtSeleccionRecorrido").addClass("d-none");
    if (estaba && repintar !== false) renderClientesRecorrido(clientesRecorridoActual);
    syncBotonesTxtPlanta();
}

function setTxtSeleccionCliente(id, marcado) {
    const n = Number(id) || 0;
    if (n <= 0 || !txtSeleccionActiva) return;
    if (marcado) txtSeleccionIds.add(n);
    else txtSeleccionIds.delete(n);

    const $item = $(`#listaClientesRecorrido .rec-cliente-item[data-id="${n}"]`);
    $item.toggleClass("is-txt-checked", marcado);
    $item.find(".rec-txt-check").prop("checked", marcado);
    actualizarBarraTxtSeleccion();
}

function seleccionarTodosTxtRecorrido() {
    const ids = (clientesRecorridoActual || []).map(x => Number(x.Id)).filter(n => n > 0);
    const todos = ids.length > 0 && ids.every(id => txtSeleccionIds.has(id));
    txtSeleccionIds = todos ? new Set() : new Set(ids);
    renderClientesRecorrido(clientesRecorridoActual);
    syncBotonesTxtPlanta();
}

function actualizarBarraTxtSeleccion() {
    const n = txtSeleccionIds.size;
    $("#lblTxtSeleccionRecorrido").text(
        n === 1 ? "1 seleccionado" : `${n} seleccionados`
    );
    $("#btnTxtSelExportarRecorrido").prop("disabled", n === 0);
}

function activarMfSeleccionRecorrido() {
    if (!getRecorridoActivo()) {
        errorModal("Selecciona un recorrido para elegir clientes.");
        return;
    }
    if (!(clientesRecorridoActual || []).length) {
        errorModal("Este recorrido no tiene clientes para armar manifiestos.");
        return;
    }
    cancelarTxtSeleccionRecorrido(false);
    mfSeleccionActiva = true;
    mfSeleccionIds = new Set();
    renderClientesRecorrido(clientesRecorridoActual);
    syncBotonesTxtPlanta();
}

function cancelarMfSeleccionRecorrido(repintar) {
    const estaba = mfSeleccionActiva;
    mfSeleccionActiva = false;
    mfSeleccionIds = new Set();
    $("#panelClientes").removeClass("rec-mf-sel");
    $("#barMfSeleccionRecorrido").addClass("d-none");
    if (estaba && repintar !== false) renderClientesRecorrido(clientesRecorridoActual);
    syncBotonesTxtPlanta();
}

function setMfSeleccionCliente(id, marcado) {
    const n = Number(id) || 0;
    if (n <= 0 || !mfSeleccionActiva) return;
    if (marcado) mfSeleccionIds.add(n);
    else mfSeleccionIds.delete(n);

    const $item = $(`#listaClientesRecorrido .rec-cliente-item[data-id="${n}"]`);
    $item.toggleClass("is-mf-checked", marcado);
    $item.find(".rec-txt-check").prop("checked", marcado);
    actualizarBarraMfSeleccion();
}

function seleccionarTodosMfRecorrido() {
    const ids = (clientesRecorridoActual || []).map(x => Number(x.Id)).filter(n => n > 0);
    const todos = ids.length > 0 && ids.every(id => mfSeleccionIds.has(id));
    mfSeleccionIds = todos ? new Set() : new Set(ids);
    renderClientesRecorrido(clientesRecorridoActual);
    syncBotonesTxtPlanta();
}

function actualizarBarraMfSeleccion() {
    const n = mfSeleccionIds.size;
    $("#lblMfSeleccionRecorrido").text(
        n === 1 ? "1 seleccionado" : `${n} seleccionados`
    );
    $("#btnMfSelGenerarRecorrido").prop("disabled", n === 0);
}

function getSiguientePosicionRecorrido() {
    if (!clientesRecorridoActual.length) return 1;

    const maxPos = clientesRecorridoActual.reduce((max, item) => {
        const pos = parseInt(item.Posicion, 10);
        return Number.isFinite(pos) && pos > max ? pos : max;
    }, 0);

    return maxPos + 1;
}

function actualizarLabelReprogramado(marcado) {
    $("#lblCrReprogramado").text(marcado ? "Reprogramado" : "Normal");
}

function getClienteEnPosicion(posicion, idExcluir) {
    const pos = parseInt(posicion, 10);
    if (!Number.isFinite(pos) || pos <= 0) return null;
    const excluir = Number(idExcluir) || 0;
    return (clientesRecorridoActual || []).find(x =>
        parseInt(x.Posicion, 10) === pos && Number(x.Id) !== excluir
    ) || null;
}

function actualizarAvisoPosicionRecorrido() {
    const root = document.getElementById("avisoOrdenRecorridoCr");
    const pos = parseInt($("#crPosicion").val(), 10);
    const id = parseInt($("#crId").val(), 10) || 0;
    const ocupante = getClienteEnPosicion(pos, id);
    if (ocupante && typeof rpMostrarAvisoOrdenRecorrido === "function") {
        rpMostrarAvisoOrdenRecorrido(root, {
            posicion: pos,
            nombre: ocupante.Cliente || ocupante.Establecimiento || "otro cliente"
        });
    } else if (typeof rpOcultarAvisoOrdenRecorrido === "function") {
        rpOcultarAvisoOrdenRecorrido(root);
    }
}

function payloadClienteRecorrido(item, extra) {
    const activo = getRecorridoActivo();
    const base = {
        Id: item?.Id || 0,
        IdCliente: item?.IdCliente,
        IdEstablecimiento: item?.IdEstablecimiento > 0 ? item.IdEstablecimiento : null,
        IdCamion: activo?.idCamion,
        IdSemana: activo?.idSemana,
        IdDia: activo?.idDia,
        Posicion: parseInt(item?.Posicion, 10) || 0,
        Activo: item?.Activo !== false,
        Reprogramado: !!item?.Reprogramado,
        Observacion: (item?.Observacion || "").trim() || null
    };
    return extra ? { ...base, ...extra } : base;
}

function renderClientesRecorrido(data) {
    clientesRecorridoActual = Array.isArray(data) ? data : [];
    const $lista = $("#listaClientesRecorrido");
    $lista.empty();

    if (!getRecorridoActivo()) {
        $lista.html(`
            <div class="rec-empty">
                <i class="fa fa-hand-pointer-o"></i>
                Elegi un recorrido y toca <strong>Clientes</strong> para ver la lista
            </div>`);
        syncBotonesTxtPlanta();
        return;
    }

    if (!Array.isArray(data) || !data.length) {
        $lista.html(`
            <div class="rec-empty" id="recEmptyClientes">
                <i class="fa fa-users"></i>
                Sin clientes en este recorrido.<br>
                <span class="text-muted-cc">Usa <strong>Traer programados</strong> para cargar los del dia/semana del establecimiento, o <strong>+ Agregar cliente</strong>.</span>
            </div>`);
        syncBotonesTxtPlanta();
        return;
    }

    const html = data.map(item => {
        const enLicencia = !!item.EnLicencia;
        const noExportar = !!item.NoExportarHoja;
        const reprogramado = !!item.Reprogramado;
        let badge = "";
        if (!enLicencia) {
            if (item.Activo) {
                badge = '<span class="rec-badge-activo rec-badge-activo--si"><i class="fa fa-check-circle"></i> Activo</span>';
            } else {
                badge = '<span class="rec-badge-activo rec-badge-activo--no"><i class="fa fa-pause-circle"></i> Inactivo</span>';
            }
        }

        const domicilioTxt = (item.Domicilio || "").trim();
        const localidadTxt = (item.Localidad || "").trim();
        const camionTxt = (item.Camion || "").trim();

        const domicilioHtml = domicilioTxt
            ? escapeHtml(domicilioTxt)
            : `<span class="rec-cliente-ubicacion-empty">Sin domicilio cargado</span>`;

        const localidadHtml = localidadTxt
            ? `<span class="rec-cliente-chip rec-cliente-chip--loc"><i class="fa fa-map-pin"></i>${escapeHtml(localidadTxt)}</span>`
            : `<span class="rec-cliente-chip rec-cliente-chip--muted"><i class="fa fa-map-pin"></i>Sin localidad</span>`;

        const camionHtml = camionTxt
            ? `<span class="rec-cliente-chip rec-cliente-chip--truck"><i class="fa fa-truck"></i>${escapeHtml(camionTxt)}</span>`
            : `<span class="rec-cliente-chip rec-cliente-chip--muted"><i class="fa fa-truck"></i>Sin unidad</span>`;

        const establecimiento = item.Establecimiento
            ? `<div class="rec-cliente-est-line"><i class="fa fa-building-o"></i>${escapeHtml(item.Establecimiento)}</div>`
            : "";

        const btnNoExport = enLicencia
            ? `<button type="button"
                    class="rec-cliente-btn rec-cliente-btn--export${noExportar ? " is-off" : ""}"
                    onclick="toggleNoExportarLicenciaRec(${item.Id})"
                    aria-pressed="${noExportar ? "true" : "false"}"
                    title="${noExportar ? "No se incluye en la hoja. Clic para exportar." : "Se incluye en la hoja. Clic para no exportar."}">
                    <i class="fa ${noExportar ? "fa-ban" : "fa-file-text-o"}" aria-hidden="true"></i>
               </button>`
            : "";

        const modoSel = mfSeleccionActiva ? "mf" : (txtSeleccionActiva ? "txt" : "");
        const marcadoSel = modoSel === "mf"
            ? mfSeleccionIds.has(Number(item.Id))
            : (modoSel === "txt" && txtSeleccionIds.has(Number(item.Id)));
        const checkSel = modoSel
            ? `<label class="rec-cliente-txtcheck" title="${modoSel === "mf" ? "Incluir en el manifiesto" : "Incluir en el TXT de planta"}">
                    <input type="checkbox" class="rec-txt-check" data-id="${item.Id}" ${marcadoSel ? "checked" : ""}>
                    <span></span>
               </label>`
            : "";

        const clasesItem = [
            "rec-cliente-item",
            item.Activo ? "" : "rec-cliente-item--inactive",
            enLicencia ? "rec-cliente-item--licencia" : "",
            reprogramado ? "rec-cliente-item--reprogramado" : "",
            noExportar ? "rec-cliente-item--noexport" : "",
            modoSel ? "rec-cliente-item--txtsel" : "",
            modoSel === "txt" && marcadoSel ? "is-txt-checked" : "",
            modoSel === "mf" && marcadoSel ? "is-mf-checked" : ""
        ].filter(Boolean).join(" ");

        return `
            <article class="${clasesItem}" data-id="${item.Id}"
                     data-cliente="${item.IdCliente}" data-establecimiento="${item.IdEstablecimiento || 0}"
                     data-licencia="${enLicencia ? "1" : "0"}">
                ${checkSel}
                <div class="rec-cliente-pos" title="Posicion en la ruta">
                    <span>${item.Posicion}</span>
                </div>
                <div class="rec-cliente-main">
                    <div class="rec-cliente-name">
                        ${escapeHtml(item.Cliente)}
                        ${enLicencia ? `<span class="rec-badge-activo rec-badge-activo--licencia" title="Cliente de licencia"><i class="fa fa-pause-circle" aria-hidden="true"></i> De licencia</span>` : ""}
                        ${reprogramado ? `<span class="rec-badge-activo rec-badge-activo--reprog"><i class="fa fa-refresh" aria-hidden="true"></i> Reprogramado</span>` : ""}
                    </div>
                    <div class="rec-cliente-ubicacion">
                        <div class="rec-cliente-domicilio">
                            <i class="fa fa-map-marker" aria-hidden="true"></i>
                            <span>${domicilioHtml}</span>
                        </div>
                        <div class="rec-cliente-ubicacion-chips">
                            ${localidadHtml}
                            ${camionHtml}
                        </div>
                    </div>
                    ${establecimiento}
                    ${enLicencia ? `<div class="rec-cliente-licencia-hint ${noExportar ? "is-off" : ""}">
                        <i class="fa ${noExportar ? "fa-ban" : "fa-check"}" aria-hidden="true"></i>
                        ${noExportar ? "Excluido de la hoja de ruta" : "Incluido en la hoja de ruta"}
                    </div>` : ""}
                </div>
                <div class="rec-cliente-side">
                    ${enLicencia ? "" : `<div class="rec-cliente-status">${badge}</div>`}
                    <div class="rec-cliente-actions">
                        ${btnNoExport}
                        <button type="button"
                                class="rec-cliente-btn rec-cliente-btn--reprog${reprogramado ? " is-on" : ""}"
                                onclick="toggleReprogramadoClienteRecorrido(${item.Id})"
                                title="${reprogramado ? "Quitar reprogramado" : "Marcar como reprogramado"}">
                            <i class="fa fa-refresh"></i>
                        </button>
                        <button type="button" class="rec-cliente-btn rec-cliente-btn--manifiesto" onclick="abrirModalManifiestoRecorrido(${item.Id})" title="Armar manifiesto">
                            <i class="fa fa-file-text-o"></i>
                        </button>
                        <button type="button" class="rec-cliente-btn rec-cliente-btn--txt" onclick="abrirModalManifiestoRecorrido(${item.Id}, 'txt')" title="Exportar TXT a planta">
                            <i class="fa fa-download"></i>
                        </button>
                        <button type="button" class="rec-cliente-btn rec-cliente-btn--stock" onclick="abrirPagosStockRecorrido(${item.IdCliente}, ${item.IdEstablecimiento || 0}, ${item.Id})" title="Cargar stock, pagos y visita">
                            <i class="fa fa-cubes"></i>
                        </button>
                        <button type="button" class="rec-cliente-btn rec-cliente-btn--edit" onclick="editarClienteRecorrido(${item.Id})" title="Editar">
                            <i class="fa fa-pencil"></i>
                        </button>
                        <button type="button" class="rec-cliente-btn rec-cliente-btn--delete" onclick="eliminarClienteRecorrido(${item.Id})" title="Quitar de la ruta">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="rec-cliente-obs">
                    <label class="rec-cliente-obs-label">Observacion hoja de ruta</label>
                    <textarea class="form-control rec-input rec-obs-input" data-id="${item.Id}" rows="2"
                              maxlength="500" placeholder="Notas para imprimir en la hoja de ruta...">${escapeHtml(item.Observacion || "")}</textarea>
                </div>
                ${renderProductosPlegableRec(item)}
            </article>`;
    }).join("");

    $lista.html(html);

    const activos = data.filter(x => x.Activo).length;
    const suffix = `${data.length} cliente${data.length === 1 ? "" : "s"}${activos !== data.length ? ` (${activos} activos)` : ""}`;
    actualizarLabelRecorridoSeleccionado(suffix);
    syncBotonesTxtPlanta();
}

let listasPreciosRec = [];

async function ensureListasPreciosRec() {
    if (listasPreciosRec.length) return listasPreciosRec;
    try {
        const data = await fetchJson("/ListasPrecios/Lista");
        listasPreciosRec = Array.isArray(data) ? data : [];
    } catch (e) {
        console.warn(e);
        listasPreciosRec = [];
    }
    return listasPreciosRec;
}

function fmtMoneyRec(n) {
    const v = Number(n);
    if (Number.isNaN(v)) return "0,00";
    return typeof formatearNumero === "function"
        ? formatearNumero(v)
        : v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCantRec(n) {
    const v = Number(n) || 0;
    return v % 1 === 0
        ? String(Math.trunc(v))
        : v.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

function leerNumeroRec(valor) {
    if (typeof parseNumero === "function") return parseNumero(valor);
    const n = parseFloat(String(valor ?? "").replace(/\./g, "").replace(",", "."));
    return Number.isNaN(n) ? 0 : n;
}

function resumenProductosRec(productos) {
    if (!productos?.length) return "Sin productos";
    return productos.map(p => {
        const abrev = (p.Abreviatura || p.Producto || "PROD").trim();
        return `${fmtCantRec(p.Cantidad)} ${abrev} x $ ${fmtMoneyRec(p.PrecioVenta)}`;
    }).join(" · ");
}

function htmlCuerpoProductosRec(item) {
    const productos = Array.isArray(item.Productos) ? item.Productos : [];
    const tieneEst = item.IdEstablecimiento > 0;

    if (!tieneEst) {
        return `<div class="rec-prod-empty">Asigná un establecimiento al cliente en la ruta para ver productos.</div>`;
    }
    if (!productos.length) {
        return `<div class="rec-prod-empty">Sin productos en el establecimiento. Cargalos con el ícono verde de stock en esta misma tarjeta.</div>`;
    }

    const rows = productos.map(p => {
        const opts = (listasPreciosRec || []).map(l =>
            `<option value="${l.Id}" ${Number(l.Id) === Number(p.IdListaPrecio) ? "selected" : ""}>${escapeHtml(l.Nombre)}</option>`
        ).join("");
        const abrev = (p.Abreviatura || "").trim();
        const listaNombre = (p.ListaPrecio || "").trim();
        const metaLine = [abrev || "Sin abreviatura", listaNombre].filter(Boolean).join(" · ");
        const precioLista = p.PrecioLista != null ? Number(p.PrecioLista) : "";
        return `
            <div class="rec-prod-row" data-cep-id="${p.Id}"
                 data-id-producto="${p.IdProducto}"
                 data-id-establecimiento="${item.IdEstablecimiento}"
                 data-precio-ef="${p.PrecioEfectivo ?? 0}"
                 data-precio-tr="${p.PrecioTransferencia ?? 0}"
                 data-precio-lista="${precioLista}">
                <div class="rec-prod-identity">
                    <span class="rec-prod-avatar"><i class="fa fa-cube"></i></span>
                    <div class="rec-prod-identity-text">
                        <span class="rec-prod-name">${escapeHtml(p.Producto || "")}</span>
                        <span class="rec-prod-abrev">${escapeHtml(metaLine)}</span>
                    </div>
                </div>
                <div class="rec-prod-fields">
                    <label class="rec-prod-field">
                        <span>Cant.</span>
                        <input type="text" class="form-control form-control-sm Inputmiles rec-prod-cant"
                               value="${fmtCantRec(p.Cantidad)}" inputmode="decimal" />
                    </label>
                    <label class="rec-prod-field rec-prod-field--lista">
                        <span>Lista</span>
                        <select class="form-control form-control-sm rec-prod-lista">
                            <option value="">Seleccionar</option>
                            ${opts}
                        </select>
                    </label>
                    <label class="rec-prod-field rec-prod-field--precio">
                        <span>Precio</span>
                        <div class="rec-prod-precio-wrap">
                            <span class="rec-prod-precio-prefix">$</span>
                            <input type="text" class="form-control form-control-sm Inputmiles rec-prod-precio"
                                   value="${fmtMoneyRec(p.PrecioVenta)}" inputmode="decimal" />
                            <span class="rec-prod-precio-warn" title="El precio no coincide con la lista" hidden>
                                <i class="fa fa-exclamation-triangle"></i>
                            </span>
                        </div>
                    </label>
                </div>
            </div>`;
    }).join("");

    return `
        <div class="rec-prod-list">${rows}</div>
        <div class="rec-prod-hint">
            <i class="fa fa-print"></i>
            <span>Estos valores salen en la hoja de ruta y se guardan al editar.</span>
        </div>`;
}

function renderProductosPlegableRec(item) {
    const productos = Array.isArray(item.Productos) ? item.Productos : [];
    const collapseId = `recProdCollapse_${item.Id}`;
    const resumen = resumenProductosRec(productos);

    return `
        <div class="rec-cliente-productos">
            <button class="rec-prod-toggle collapsed" type="button"
                    data-bs-toggle="collapse" data-bs-target="#${collapseId}"
                    aria-expanded="false">
                <span class="rec-prod-toggle-left">
                    <span class="rec-prod-toggle-icon"><i class="fa fa-cube"></i></span>
                    <span class="rec-prod-toggle-copy">
                        <strong>Productos a entregar</strong>
                        <small class="rec-prod-resumen">${escapeHtml(resumen)}</small>
                    </span>
                    <span class="rec-prod-count">${productos.length}</span>
                </span>
                <span class="rec-prod-toggle-chevron"><i class="fa fa-chevron-down"></i></span>
            </button>
            <div id="${collapseId}" class="collapse rec-prod-collapse" data-rec-id="${item.Id}">
                <div class="rec-prod-body"></div>
            </div>
        </div>`;
}

async function asegurarCuerpoProductosRec(collapseEl) {
    if (!collapseEl || collapseEl.dataset.filled === "1") return;
    const id = Number(collapseEl.dataset.recId);
    const item = (clientesRecorridoActual || []).find(x => Number(x.Id) === id);
    if (!item) return;

    await ensureListasPreciosRec();
    const body = collapseEl.querySelector(".rec-prod-body");
    if (body) body.innerHTML = htmlCuerpoProductosRec(item);
    collapseEl.dataset.filled = "1";

    const $wrap = $(collapseEl);
    $wrap.find(".Inputmiles").each(function () {
        if (typeof formatearMilesInput === "function") formatearMilesInput(this);
    });
    marcarPreciosLocalesProductosRec($wrap);
}

async function onCambioListaProductoRec($select) {
    const $row = $select.closest(".rec-prod-row[data-cep-id]");
    const idProducto = parseInt($row.data("id-producto"), 10);
    const idLista = parseInt($select.val() || "0", 10);
    if (!idProducto || !idLista) return;

    try {
        const precioLista = await obtenerPrecioCatalogoListaRec(idProducto, idLista);
        if (precioLista != null) {
            $row.attr("data-precio-lista", precioLista);
            $row.find(".rec-prod-precio").val(fmtMoneyRec(precioLista));
            const el = $row.find(".rec-prod-precio")[0];
            if (el && typeof formatearMilesInput === "function") formatearMilesInput(el);
            marcarPrecioVsListaRec($row, precioLista, precioLista, { alertar: false });
        }
    } catch (e) {
        console.warn(e);
    }
}

async function obtenerPrecioCatalogoListaRec(idProducto, idLista) {
    const rows = await fetchJson(`/ProductosPrecios/ListaPorProducto?idProducto=${idProducto}`);
    const match = (Array.isArray(rows) ? rows : []).find(r => Number(r.IdListaPrecio) === Number(idLista));
    if (!match || match.PrecioVenta == null) return null;
    return Number(match.PrecioVenta);
}

function marcarPrecioVsListaRec($row, precioGuardado, precioLista, { alertar = false } = {}) {
    if (!$row?.length) return;

    const $input = $row.find(".rec-prod-precio");
    const $warnIcon = $row.find(".rec-prod-precio-warn");
    $row.children(".rec-prod-mismatch").remove();

    if (precioLista == null || Number.isNaN(Number(precioLista))) {
        $row.removeClass("rec-prod-row--mismatch");
        $input.removeClass("rec-prod-precio--mismatch");
        $warnIcon.attr("hidden", true).attr("title", "El precio no coincide con la lista");
        return;
    }

    const coincide = Math.abs(Number(precioGuardado) - Number(precioLista)) < 0.005;
    $row.toggleClass("rec-prod-row--mismatch", !coincide);
    $input.toggleClass("rec-prod-precio--mismatch", !coincide);
    $warnIcon.attr("hidden", coincide);

    if (!coincide) {
        const listaNombre = ($row.find(".rec-prod-lista option:selected").text() || "la lista").trim();
        const tip = `Lista ${listaNombre}: $ ${fmtMoneyRec(precioLista)}`;
        $warnIcon.attr("title", tip);
        $row.append(`
            <div class="rec-prod-mismatch" role="status">
                <i class="fa fa-exclamation-triangle"></i>
                <span>No coincide con <strong>${escapeHtml(listaNombre)}</strong> · $ ${fmtMoneyRec(precioLista)}</span>
            </div>`);

        if (alertar && typeof advertenciaModal === "function") {
            advertenciaModal(
                `Ojo: el precio ($ ${fmtMoneyRec(precioGuardado)}) no coincide con la lista ` +
                `"${listaNombre}" ($ ${fmtMoneyRec(precioLista)}). Se guardó igual.`
            );
        }
    }
}

function marcarPreciosLocalesProductosRec($scope) {
    const $rows = ($scope && $scope.length ? $scope : $("#listaClientesRecorrido"))
        .find(".rec-prod-row[data-cep-id]");
    $rows.each(function () {
        const $row = $(this);
        const raw = $row.attr("data-precio-lista");
        const precioLista = raw === undefined || raw === "" ? null : Number(raw);
        const precio = leerNumeroRec($row.find(".rec-prod-precio").val());
        marcarPrecioVsListaRec($row, precio, Number.isNaN(precioLista) ? null : precioLista, { alertar: false });
    });
}

async function verificarPreciosProductosRec($scope) {
    marcarPreciosLocalesProductosRec($scope);
}

async function guardarProductoClienteRecorrido($row, { alertar = false } = {}) {
    if (!$row?.length) return;
    const id = parseInt($row.data("cep-id"), 10);
    const idProducto = parseInt($row.data("id-producto"), 10);
    const idEstablecimiento = parseInt($row.data("id-establecimiento"), 10);
    if (!id || !idProducto || !idEstablecimiento) return;

    const idLista = parseInt($row.find(".rec-prod-lista").val() || "0", 10);
    const cantidad = leerNumeroRec($row.find(".rec-prod-cant").val());
    const precio = leerNumeroRec($row.find(".rec-prod-precio").val());

    if (!idLista || cantidad <= 0 || precio < 0) return;

    try {
        const data = await fetchJson("/ClientesEstablecimientosProductos/Actualizar", {
            method: "PUT",
            body: JSON.stringify({
                Id: id,
                IdEstablecimiento: idEstablecimiento,
                IdProducto: idProducto,
                Cantidad: cantidad,
                IdListaPrecio: idLista,
                PrecioVenta: precio
            })
        });

        if (!data?.valor) {
            if (typeof errorModal === "function") {
                errorModal(data?.mensaje || "No se pudo guardar el producto.");
            }
            return;
        }

        // Actualizar resumen del plegable
        const $article = $row.closest(".rec-cliente-item");
        const productos = [];
        $article.find(".rec-prod-row[data-cep-id]").each(function () {
            const $r = $(this);
            productos.push({
                Abreviatura: $r.find(".rec-prod-abrev").text(),
                Producto: $r.find(".rec-prod-name").text(),
                Cantidad: leerNumeroRec($r.find(".rec-prod-cant").val()),
                PrecioVenta: leerNumeroRec($r.find(".rec-prod-precio").val())
            });
        });
        $article.find(".rec-prod-resumen").text(resumenProductosRec(productos));

        // Sync cache
        const idRec = parseInt($article.data("id"), 10);
        const cached = clientesRecorridoActual.find(x => x.Id === idRec);
        if (cached && Array.isArray(cached.Productos)) {
            const p = cached.Productos.find(x => x.Id === id);
            if (p) {
                p.Cantidad = cantidad;
                p.IdListaPrecio = idLista;
                p.PrecioVenta = precio;
                p.ListaPrecio = listasPreciosRec.find(l => Number(l.Id) === idLista)?.Nombre || p.ListaPrecio;
            }
        }

        // Comparar con el precio de catalogo de esa lista
        let precioLista = $row.attr("data-precio-lista");
        precioLista = precioLista !== undefined && precioLista !== ""
            ? Number(precioLista)
            : null;

        // Si no tenemos el de catalogo en cache, lo pedimos
        if (precioLista == null || Number.isNaN(precioLista)) {
            try {
                precioLista = await obtenerPrecioCatalogoListaRec(idProducto, idLista);
                if (precioLista != null) $row.attr("data-precio-lista", precioLista);
            } catch (e) {
                console.warn(e);
            }
        }

        marcarPrecioVsListaRec($row, precio, precioLista, { alertar });
    } catch (e) {
        console.error(e);
        if (typeof errorModal === "function") errorModal("Error al guardar el producto.");
    }
}

async function abrirHojaRutaRecorrido() {
    if (!recorridosSeleccionados.length) {
        errorModal("Selecciona al menos un recorrido.");
        return;
    }

    const idCamion = recorridosSeleccionados[0].idCamion;
    const recorridosParam = recorridosSeleccionados
        .map(r => recorridoKey(r.idSemana, r.idDia))
        .join(",");

    const params = new URLSearchParams({
        idCamion: String(idCamion),
        recorridos: recorridosParam
    });

    if (recorridosSeleccionados.length === 1) {
        const unico = recorridosSeleccionados[0];
        params.set("idSemana", String(unico.idSemana));
        params.set("idDia", String(unico.idDia));
    }

    const excluir = idsNoExportarLicenciaActuales();
    if (excluir.length) params.set("excluirIds", excluir.join(","));

    const url = `/Recorridos/HojaRuta?${params.toString()}`;

    try {
        await conProceso("Generando hoja de ruta...", async () => {
            const response = await fetch(url, {
                headers: { Authorization: "Bearer " + getTokenRec() }
            });

            if (!response.ok) {
                errorModal("No se pudo generar la hoja de ruta.");
                return;
            }

            const html = await response.text();
            const ventana = window.open("", "_blank");
            if (!ventana) {
                errorModal("El navegador bloqueo la ventana emergente. Permiti pop-ups e intenta de nuevo.");
                return;
            }

            ventana.document.open();
            ventana.document.write(html);
            ventana.document.close();
        });
    } catch (e) {
        console.error(e);
        errorModal("Error al abrir la hoja de ruta.");
    }
}

function paramsRecorridosManifiesto() {
    if (!recorridosSeleccionados.length) return null;

    const idCamion = recorridosSeleccionados[0].idCamion;
    const recorridosParam = recorridosSeleccionados
        .map(r => recorridoKey(r.idSemana, r.idDia))
        .join(",");

    const params = new URLSearchParams({
        idCamion: String(idCamion),
        recorridos: recorridosParam
    });

    if (recorridosSeleccionados.length === 1) {
        const unico = recorridosSeleccionados[0];
        params.set("idSemana", String(unico.idSemana));
        params.set("idDia", String(unico.idDia));
    }

    const excluir = idsNoExportarLicenciaActuales();
    if (excluir.length) params.set("excluirIds", excluir.join(","));

    return params;
}

async function abrirModalManifiestoRecorrido(idRecorrido, modo) {
    const modoNorm = modo || "manifiesto";
    const esTxt = modoNorm.startsWith("txt");
    const esMes = modoNorm === "txt-mes";
    const esSel = modoNorm === "txt-sel";
    const esMfSel = modoNorm === "manifiesto-sel";
    const id = Number(idRecorrido) || 0;

    if (esMes) {
        if (!idCamionActualRec()) {
            errorModal("Elegí una unidad para exportar el TXT del mes.");
            return;
        }
    } else if (!recorridosSeleccionados.length) {
        errorModal("Selecciona al menos un recorrido.");
        return;
    }

    if (esSel && txtSeleccionIds.size === 0) {
        errorModal("Seleccioná al menos un cliente para exportar.");
        return;
    }
    if (esMfSel && mfSeleccionIds.size === 0) {
        errorModal("Seleccioná al menos un cliente para armar el manifiesto.");
        return;
    }

    $("#mfIdRecorrido").val(id > 0 ? String(id) : "0");
    $("#mfModoExport").val(esTxt ? modoNorm : (esMfSel ? "manifiesto-sel" : "manifiesto"));

    const item = id > 0
        ? (clientesRecorridoActual || []).find(x => Number(x.Id) === id)
        : null;

    const camionNombre = camiones.find(c => c.Id === idCamionActualRec())?.Nombre || "Unidad";

    if (esMes) {
        $("#modalManifiestoRecorridoTitulo").text("Exportar TXT del mes");
        $("#btnConfirmarManifiestoRecorrido").addClass("d-none");
        $("#btnExportarTxtIntercambioRecorrido").removeClass("d-none");
        $("#mfNombreManifiesto").val(`MES ${camionNombre}`);
        $("#mfGenerarCertificados").closest(".col-12").addClass("d-none");
        $("#mfCertificadosPanel").addClass("d-none");
        $("#mfLoteOpdsWrap").addClass("d-none");
        $("#mfLotePreviewWrap").addClass("d-none");
        $("#mfModalDialog").removeClass("modal-xl");
    } else if (esSel) {
        $("#modalManifiestoRecorridoTitulo").text(`Exportar TXT (${txtSeleccionIds.size} cliente${txtSeleccionIds.size === 1 ? "" : "s"})`);
        $("#btnConfirmarManifiestoRecorrido").addClass("d-none");
        $("#btnExportarTxtIntercambioRecorrido").removeClass("d-none");
        $("#mfNombreManifiesto").val(nombreRecorridoParaManifiesto());
        $("#mfGenerarCertificados").closest(".col-12").addClass("d-none");
        $("#mfCertificadosPanel").addClass("d-none");
        $("#mfLoteOpdsWrap").addClass("d-none");
        $("#mfLotePreviewWrap").addClass("d-none");
        $("#mfModalDialog").removeClass("modal-xl");
    } else if (esTxt) {
        $("#modalManifiestoRecorridoTitulo").text(id > 0 ? "Exportar TXT a planta" : "Exportar TXT de intercambio");
        $("#btnConfirmarManifiestoRecorrido").addClass("d-none");
        $("#btnExportarTxtIntercambioRecorrido").removeClass("d-none");
        $("#mfNombreManifiesto").val(id > 0
            ? (item?.Cliente || nombreRecorridoParaManifiesto())
            : nombreRecorridoParaManifiesto());
        $("#mfGenerarCertificados").closest(".col-12").addClass("d-none");
        $("#mfCertificadosPanel").addClass("d-none");
        $("#mfLoteOpdsWrap").addClass("d-none");
        $("#mfLotePreviewWrap").addClass("d-none");
        $("#mfModalDialog").removeClass("modal-xl");
    } else if (esMfSel) {
        $("#modalManifiestoRecorridoTitulo").text(`Manifiestos (${mfSeleccionIds.size} cliente${mfSeleccionIds.size === 1 ? "" : "s"})`);
        $("#btnConfirmarManifiestoRecorrido").removeClass("d-none");
        $("#btnExportarTxtIntercambioRecorrido").removeClass("d-none");
        $("#mfNombreManifiesto").val(nombreRecorridoParaManifiesto());
        $("#mfGenerarCertificados").closest(".col-12").removeClass("d-none");
        $("#mfLoteOpdsWrap").removeClass("d-none");
        $("#mfLotePreviewWrap").removeClass("d-none");
        $("#mfModalDialog").addClass("modal-xl");
        $("#mfGenerarLoteOpds").prop("checked", true);
        const idOpdsSel = leerIdTransportistaOpds();
        if (idOpdsSel) $("#mfIdTransportistaOpds").val(idOpdsSel);
    } else if (id > 0) {
        $("#modalManifiestoRecorridoTitulo").text("Armar manifiesto");
        $("#btnConfirmarManifiestoRecorrido").removeClass("d-none");
        $("#btnExportarTxtIntercambioRecorrido").addClass("d-none");
        $("#mfNombreManifiesto").val(item?.Cliente || nombreRecorridoParaManifiesto());
        $("#mfGenerarCertificados").closest(".col-12").removeClass("d-none");
        $("#mfLoteOpdsWrap").addClass("d-none");
        $("#mfLotePreviewWrap").addClass("d-none");
        $("#mfGenerarLoteOpds").prop("checked", false);
        $("#mfModalDialog").removeClass("modal-xl");
    } else {
        $("#modalManifiestoRecorridoTitulo").text("Manifiestos por lote");
        $("#btnConfirmarManifiestoRecorrido").removeClass("d-none");
        $("#btnExportarTxtIntercambioRecorrido").removeClass("d-none");
        $("#mfNombreManifiesto").val(nombreRecorridoParaManifiesto());
        $("#mfGenerarCertificados").closest(".col-12").removeClass("d-none");
        $("#mfLoteOpdsWrap").removeClass("d-none");
        $("#mfLotePreviewWrap").removeClass("d-none");
        $("#mfModalDialog").addClass("modal-xl");
        $("#mfGenerarLoteOpds").prop("checked", true);
        const idOpds = leerIdTransportistaOpds();
        if (idOpds) $("#mfIdTransportistaOpds").val(idOpds);
    }

    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    $("#mfFechaIntercambio").val(`${yyyy}-${mm}-${dd}`);
    $("#mfGenerarCertificados").prop("checked", true);
    $("#mfCertificadosPanel").removeClass("d-none");
    $("#mfFechaEmisionCert").val(`${yyyy}-${mm}-${dd}`);
    $("#mfFechaTratamientoCert").val(`${yyyy}-${mm}-${dd}`);

    try {
        const certData = await fetchJson("/Recorridos/SiguienteNumeroCertificado");
        $("#mfNumeroCertificado").val(String(Number(certData?.numeroCertificado ?? certData?.NumeroCertificado) || 1));
        $("#mfNumeroOrdenCert").val(String(Number(certData?.numeroOrden ?? certData?.NumeroOrden) || 1));
    } catch (e) {
        console.warn(e);
        $("#mfNumeroCertificado").val("1");
        $("#mfNumeroOrdenCert").val("1");
    }

    $("#mfNumeroManifiesto").val("");
    try {
        let urlNumero;
        if (esMes) {
            urlNumero = `/Recorridos/SiguienteNumeroManifiestoCamion?idCamion=${idCamionActualRec()}`;
        } else {
            const params = paramsRecorridosManifiesto();
            if (!params) {
                $("#mfNumeroManifiesto").val("1");
            } else {
                urlNumero = `/Recorridos/SiguienteNumeroManifiesto?${params.toString()}`;
            }
        }
        if (urlNumero) {
            const data = await fetchJson(urlNumero);
            $("#mfNumeroManifiesto").val(String(Number(data?.numero) || 1));
        }
    } catch (e) {
        console.warn(e);
        $("#mfNumeroManifiesto").val("1");
    }

    if (!$("#mfLotePreviewWrap").hasClass("d-none")) pintarPreviewLoteManifiesto();

    await cargarChoferesManifiestoRec();

    if (modalManifiestoRecorrido) modalManifiestoRecorrido.show();
    else errorModal("No se pudo abrir el diálogo.");
}

let choferesManifiestoCache = [];

async function cargarChoferesManifiestoRec() {
    try {
        const data = await fetchJson("/Choferes/Lista?soloActivos=true");
        choferesManifiestoCache = Array.isArray(data) ? data : [];
    } catch {
        choferesManifiestoCache = [];
    }

    const $sel = $("#mfIdChofer");
    const prev = $sel.val();
    $sel.empty().append(`<option value="0">Sin chofer (líneas en blanco)</option>`);
    choferesManifiestoCache.forEach(c => {
        const id = Number(c.Id || c.id);
        const nom = c.Nombre || c.nombre || "";
        $sel.append(`<option value="${id}">${escapeHtml(nom)}</option>`);
    });
    if (prev && $sel.find(`option[value="${prev}"]`).length) $sel.val(prev);
    else if (choferesManifiestoCache.length === 1) $sel.val(String(choferesManifiestoCache[0].Id || choferesManifiestoCache[0].id));
    aplicarChoferSeleccionadoManifiesto();
}

function aplicarChoferSeleccionadoManifiesto() {
    const id = parseInt($("#mfIdChofer").val(), 10) || 0;
    const c = choferesManifiestoCache.find(x => Number(x.Id || x.id) === id);
    $("#mfChoferAclaracion").val(c ? (c.Nombre || "") : "");
    $("#mfChoferDni").val(c ? (c.Dni || c.dni || "") : "");
}

function aplicarChoferManifiestoAParams(params) {
    const id = parseInt($("#mfIdChofer").val(), 10) || 0;
    const nom = ($("#mfChoferAclaracion").val() || "").trim();
    const dni = ($("#mfChoferDni").val() || "").trim();
    if (id > 0) params.set("idChofer", String(id));
    if (nom) params.set("choferNombre", nom);
    if (dni) params.set("choferDni", dni);
}

function abrirPagosStockRecorrido(idCliente, idEstablecimiento, idRecorridoCliente) {
    if (typeof abrirPanelStockRecorrido === "function") {
        abrirPanelStockRecorrido(idCliente, idEstablecimiento, idRecorridoCliente);
        return;
    }
    const id = Number(idCliente) || 0;
    if (!(id > 0)) {
        errorModal("Este cliente no tiene ficha para abrir pagos y stock.");
        return;
    }
    const est = Number(idEstablecimiento) || 0;
    const qs = est > 0
        ? `id=${id}&est=${est}&tab=stock`
        : `id=${id}&tab=pagos`;
    window.open(`/Clientes/Gestion?${qs}`, "_blank");
}

function nombreRecorridoParaManifiesto() {
    const activo = getRecorridoActivo();
    if (!activo) return "";

    if (recorridosSeleccionados.length > 1) {
        return recorridosSeleccionados
            .map(r => {
                const zona = (r.zona || "").trim();
                if (zona) return zona;
                const semana = semanas.find(s => s.Id === r.idSemana)?.Nombre || "";
                const dia = dias.find(d => d.Id === r.idDia)?.Nombre || "";
                return `${semana} ${dia}`.trim();
            })
            .filter(Boolean)
            .join(" · ");
    }

    const zona = (activo.zona || "").trim();
    if (zona) return zona;

    const semana = semanas.find(s => s.Id === activo.idSemana)?.Nombre || "";
    const dia = dias.find(d => d.Id === activo.idDia)?.Nombre || "";
    return `${semana} ${dia}`.trim();
}

function clientesParaLotePreview() {
    const excluidos = new Set(idsNoExportarLicenciaActuales());
    const modo = ($("#mfModoExport").val() || "").trim();
    const soloSel = modo === "manifiesto-sel";
    return (clientesRecorridoActual || []).filter(x => {
        const id = Number(x.Id);
        if (id <= 0 || excluidos.has(id)) return false;
        if (soloSel && !mfSeleccionIds.has(id)) return false;
        return true;
    });
}

function leerCopiasLotePreview() {
    const map = new Map();
    $("#mfLotePreviewBody [data-copias-id]").each(function () {
        const id = Number($(this).attr("data-copias-id"));
        let n = parseInt($(this).val(), 10);
        if (!Number.isFinite(n) || n < 0) n = 0;
        if (n > 50) n = 50;
        map.set(id, n);
    });
    return map;
}

function idsIncluirLotePreview() {
    const copias = leerCopiasLotePreview();
    return clientesParaLotePreview()
        .map(x => Number(x.Id))
        .filter(id => (copias.get(id) || 0) > 0);
}

function aplicarCopiasLoteAParams(params) {
    const copias = leerCopiasLotePreview();
    const partes = [];
    const incluir = [];
    clientesParaLotePreview().forEach(x => {
        const id = Number(x.Id);
        const n = copias.has(id) ? copias.get(id) : 1;
        partes.push(`${id}:${n}`);
        if (n > 0) incluir.push(id);
    });
    if (incluir.length) params.set("incluirIds", incluir.join(","));
    if (partes.length) params.set("copias", partes.join(","));
}

function pintarPreviewLoteManifiesto() {
    const $body = $("#mfLotePreviewBody");
    const $total = $("#mfLotePreviewTotal");
    if (!$body.length) return;

    const clientes = clientesParaLotePreview();
    const copiasPrev = leerCopiasLotePreview();

    if (!clientes.length) {
        $body.html(`<tr><td colspan="4" class="text-muted">No hay clientes en esta hoja para el lote.</td></tr>`);
        $total.text("");
        return;
    }

    const idsActuales = $body.find("[data-copias-id]").map(function () { return Number($(this).attr("data-copias-id")); }).get();
    const idsNuevos = clientes.map(x => Number(x.Id));
    const mismaGrilla = idsActuales.length === idsNuevos.length && idsActuales.every((id, i) => id === idsNuevos[i]);

    if (!mismaGrilla) {
        $body.html(clientes.map(item => {
            const id = Number(item.Id);
            const n = copiasPrev.has(id) ? copiasPrev.get(id) : 1;
            const nombre = escapeHtml(item.Cliente || item.Establecimiento || "");
            const nroCli = escapeHtml((item.CodigoOpds || item.codigoOpds || "").trim() || "—");
            return `<tr>
                <td>${nombre}</td>
                <td><input type="number" class="form-control rec-input mf-lote-copias" data-copias-id="${id}" min="0" max="50" step="1" value="${n}" /></td>
                <td>${nroCli}</td>
                <td class="mf-lote-num">—</td>
            </tr>`;
        }).join(""));
    }

    actualizarNumerosLotePreview();
}

function aplicarCopiasTodasLotePreview(valor) {
    const raw = String(valor ?? "").trim();
    if (raw === "") return;
    let n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) return;
    if (n > 50) n = 50;
    $("#mfLotePreviewBody [data-copias-id]").each(function () {
        $(this).val(n);
    });
    actualizarNumerosLotePreview();
}

function actualizarNumerosLotePreview() {
    let numero = parseInt($("#mfNumeroManifiesto").val(), 10);
    if (!Number.isFinite(numero) || numero < 1) numero = 1;
    let impresos = 0;
    let manifiestos = 0;
    let primero = null;
    let ultimo = null;

    $("#mfLotePreviewBody tr").each(function () {
        const $inp = $(this).find("[data-copias-id]");
        if (!$inp.length) return;
        let n = parseInt($inp.val(), 10);
        if (!Number.isFinite(n) || n < 0) n = 0;
        if (n > 50) n = 50;
        const $num = $(this).find(".mf-lote-num");
        $(this).toggleClass("mf-lote-row--off", n <= 0);
        if (n <= 0) {
            $num.text("—");
            return;
        }
        const nro = numero;
        numero++;
        if (primero == null) primero = nro;
        ultimo = nro;
        manifiestos++;
        impresos += n;
        $num.text(n === 1 ? String(nro) : `${nro} ×${n}`);
    });

    const $total = $("#mfLotePreviewTotal");
    if (manifiestos <= 0) {
        $total.text("Ningún manifiesto a imprimir. Poné copias en los clientes que correspondan.");
    } else if (impresos === 1) {
        $total.text(`Se va a imprimir 1 manifiesto (Nº ${primero}).`);
    } else if (impresos === manifiestos) {
        $total.text(`Se van a imprimir ${manifiestos} manifiestos (Nº ${primero} al ${ultimo}).`);
    } else {
        $total.text(`Se van a imprimir ${impresos} copias de ${manifiestos} manifiestos (Nº ${primero} al ${ultimo}). Las copias de un mismo cliente llevan el mismo número.`);
    }
}

async function confirmarManifiestoRecorrido() {
    const params = paramsRecorridosManifiesto();
    if (!params) {
        errorModal("Selecciona al menos un recorrido.");
        return;
    }

    const numero = parseInt($("#mfNumeroManifiesto").val(), 10);
    if (!Number.isFinite(numero) || numero < 1) {
        errorModal("Ingresá un número de manifiesto válido.");
        return;
    }

    const lotePreview = !$("#mfLotePreviewWrap").hasClass("d-none");
    if (lotePreview) {
        const idsConCopia = idsIncluirLotePreview();
        if (!idsConCopia.length) {
            errorModal("Poné al menos 1 copia en algún cliente para armar el lote.");
            return;
        }
    }

    const nombre = ($("#mfNombreManifiesto").val() || "").trim();
    const fecha = ($("#mfFechaIntercambio").val() || "").trim();
    params.set("numeroInicial", String(numero));
    if (nombre) params.set("nombre", nombre);
    if (fecha) params.set("fecha", fecha);
    aplicarChoferManifiestoAParams(params);
    const idRecorrido = parseInt($("#mfIdRecorrido").val(), 10) || 0;
    if (idRecorrido > 0) {
        const idsDesde = idsClientesManifiestoDesde(idRecorrido);
        const haySiguientes = idsDesde.length > 1;
        if (haySiguientes) {
            const hastaNro = numero + idsDesde.length - 1;
            const aplicarAbajo = typeof confirmarModal === "function"
                ? await confirmarModal(
                    `¿Deseás aplicar esta fecha de programación también a los ${idsDesde.length - 1} cliente(s) que siguen en la hoja (desde este inclusive)? Los manifiestos se van a numerar en secuencia del ${numero} al ${hastaNro}.`,
                    {
                        titulo: "Fecha de programación",
                        aceptar: "Sí, a todos",
                        cancelar: "Solo este"
                    }
                )
                : window.confirm("¿Aplicar la fecha y numerar los manifiestos de los clientes que siguen?");
            if (aplicarAbajo) {
                params.set("incluirIds", idsDesde.join(","));
            } else {
                params.set("idRecorrido", String(idRecorrido));
            }
        } else {
            params.set("idRecorrido", String(idRecorrido));
        }
    } else if (lotePreview) {
        aplicarCopiasLoteAParams(params);
    }

    const conCert = $("#mfGenerarCertificados").is(":checked");
    if (conCert) {
        params.set("generarCertificados", "true");
        const fe = ($("#mfFechaEmisionCert").val() || "").trim();
        const ft = ($("#mfFechaTratamientoCert").val() || "").trim();
        const nc = parseInt($("#mfNumeroCertificado").val(), 10);
        const no = parseInt($("#mfNumeroOrdenCert").val(), 10);
        if (fe) params.set("fechaEmision", fe);
        if (ft) params.set("fechaTratamiento", ft);
        if (Number.isFinite(nc) && nc > 0) params.set("numeroCertificadoInicial", String(nc));
        if (Number.isFinite(no) && no > 0) params.set("numeroOrdenInicial", String(no));
    }

    if ($("#mfLoteOpdsWrap").is(":visible") && $("#mfGenerarLoteOpds").is(":checked")) {
        const idOpds = ($("#mfIdTransportistaOpds").val() || "").trim() || leerIdTransportistaOpds();
        if (!idOpds) {
            errorModal("Ingresá el N° de establecimiento OPDS del transportista para armar el archivo por lote.");
            $("#mfIdTransportistaOpds").trigger("focus");
            return;
        }
        $("#mfIdTransportistaOpds").val(idOpds);
    }

    try {
        await conProceso(conCert ? "Generando manifiestos y certificados..." : "Generando manifiestos...", async () => {
            params.set("formato", "manifiesto");
            const responseMf = await fetch(`/Recorridos/Manifiestos?${params.toString()}`, {
                headers: { Authorization: "Bearer " + getTokenRec() }
            });

            if (responseMf.status === 404) {
                errorModal("No hay clientes para armar el manifiesto en esta hoja.");
                return;
            }

            if (!responseMf.ok) {
                errorModal("No se pudieron generar los manifiestos.");
                return;
            }

            let responseCert = null;
            if (conCert) {
                const certParams = new URLSearchParams(params.toString());
                certParams.set("formato", "certificados");
                certParams.set("generarCertificados", "true");
                responseCert = await fetch(`/Recorridos/Manifiestos?${certParams.toString()}`, {
                    headers: { Authorization: "Bearer " + getTokenRec() }
                });
                if (!responseCert.ok) {
                    await descargarRespuestaArchivo(responseMf, "Manifiesto.pdf");
                    errorModal("El manifiesto se descargó, pero no se pudo generar el certificado.");
                    return;
                }
                await descargarRespuestaArchivo(responseCert, "Certificado.pdf", true);
                await new Promise(r => setTimeout(r, 400));
            }

            await descargarRespuestaArchivo(responseMf, "Manifiesto.pdf");

            const esLoteVisible = $("#mfLoteOpdsWrap").is(":visible");
            const quiereLoteOpds = esLoteVisible && $("#mfGenerarLoteOpds").is(":checked");
            if (quiereLoteOpds) {
                const lote = await descargarManifiestoLoteOpds(params);
                if (modalManifiestoRecorrido) modalManifiestoRecorrido.hide();
                if (($("#mfModoExport").val() || "") === "manifiesto-sel") cancelarMfSeleccionRecorrido();
                if (lote.ok) {
                    if (lote.warning && typeof advertenciaModal === "function") advertenciaModal(lote.warning);
                    else if (typeof exitoModal === "function") exitoModal(mensajeExitoManifiesto(conCert, true));
                } else if (typeof advertenciaModal === "function") {
                    advertenciaModal("El manifiesto se descargó, pero el lote OPDS no: " + (lote.mensaje || "revisá los Ids del ministerio."));
                } else if (typeof exitoModal === "function") {
                    exitoModal(mensajeExitoManifiesto(conCert, false));
                }
                return;
            }

            if (modalManifiestoRecorrido) modalManifiestoRecorrido.hide();
            if (($("#mfModoExport").val() || "") === "manifiesto-sel") cancelarMfSeleccionRecorrido();
            if (typeof exitoModal === "function") {
                exitoModal(mensajeExitoManifiesto(conCert, quiereLoteOpds));
            }
        });
    } catch (e) {
        console.error(e);
        errorModal("Error al generar el PDF del manifiesto.");
    }
}

async function exportarArchivoIntercambioRecorrido() {
    const modo = ($("#mfModoExport").val() || "txt").trim();
    const esMes = modo === "txt-mes";
    const esSel = modo === "txt-sel" || modo === "manifiesto-sel";
    const idCamion = idCamionActualRec();
    if (!idCamion) {
        errorModal("Elegí una unidad.");
        return;
    }

    let params;
    if (esMes) {
        params = new URLSearchParams({
            idCamion: String(idCamion),
            mesCompleto: "true"
        });
    } else {
        params = paramsRecorridosManifiesto();
        if (!params) {
            errorModal("Selecciona al menos un recorrido.");
            return;
        }
    }

    const numero = parseInt($("#mfNumeroManifiesto").val(), 10);
    if (!Number.isFinite(numero) || numero < 1) {
        errorModal("Ingresá un número de manifiesto válido.");
        return;
    }

    const fecha = ($("#mfFechaIntercambio").val() || "").trim();
    if (!fecha) {
        errorModal("Ingresá la fecha del manifiesto.");
        return;
    }

    const nombre = ($("#mfNombreManifiesto").val() || "").trim();
    params.set("numeroInicial", String(numero));
    params.set("fecha", fecha);
    if (nombre) params.set("nombre", nombre);

    if (esSel) {
        const ids = [...(modo === "manifiesto-sel" ? mfSeleccionIds : txtSeleccionIds)].filter(n => n > 0);
        if (!ids.length) {
            errorModal("Seleccioná al menos un cliente para exportar.");
            return;
        }
        params.set("incluirIds", ids.join(","));
    } else {
        const idRecorrido = parseInt($("#mfIdRecorrido").val(), 10) || 0;
        if (idRecorrido > 0) params.set("idRecorrido", String(idRecorrido));
    }

    try {
        await conProceso("Generando TXT...", async () => {
            const response = await fetch(`/Recorridos/ArchivoIntercambio?${params.toString()}`, {
                headers: { Authorization: "Bearer " + getTokenRec() }
            });

            if (response.status === 404) {
                errorModal("No hay clientes para armar el archivo de intercambio.");
                return;
            }

            if (!response.ok) {
                errorModal("No se pudo generar el archivo TXT de intercambio.");
                return;
            }

            const blob = await response.blob();
            const archivo = nombreDescargaIntercambio(response) || `INTERCAMBIO_${fecha.replaceAll("-", "")}.txt`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = archivo;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1500);

            if (modalManifiestoRecorrido) modalManifiestoRecorrido.hide();
            if (modo === "manifiesto-sel") cancelarMfSeleccionRecorrido();
            else if (esSel) cancelarTxtSeleccionRecorrido();
            if (typeof exitoModal === "function") {
                exitoModal("Se descargó el archivo TXT de intercambio para la planta.");
            }
        });
    } catch (e) {
        console.error(e);
        errorModal("Error al exportar el archivo TXT de intercambio.");
    }
}

function nombreDescargaIntercambio(response) {
    const cd = response.headers.get("Content-Disposition") || "";
    const utf = /filename\*=UTF-8''([^;]+)/i.exec(cd);
    if (utf && utf[1]) {
        try { return decodeURIComponent(utf[1]); } catch { return utf[1]; }
    }
    const basic = /filename="?([^";]+)"?/i.exec(cd);
    return basic && basic[1] ? basic[1] : "";
}

async function descargarRespuestaArchivo(response, fallback, exigirPdf) {
    const raw = await response.blob();
    const ct = (response.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
    let archivo = nombreDescargaIntercambio(response) || fallback || "archivo";
    const esZip = ct === "application/zip" || ct === "application/x-zip-compressed" || /\.zip$/i.test(archivo);
    if (exigirPdf && esZip) {
        if (typeof errorModal === "function") {
            errorModal("El certificado no se pudo descargar como PDF.");
        }
        return;
    }
    const esPdf = !esZip && (exigirPdf || ct === "application/pdf" || /\.pdf$/i.test(fallback || ""));
    if (esPdf) {
        if (!/\.pdf$/i.test(archivo) || /\.zip$/i.test(archivo)) {
            archivo = fallback && /\.pdf$/i.test(fallback) ? fallback : archivo.replace(/\.zip$/i, ".pdf");
            if (!/\.pdf$/i.test(archivo)) archivo = "Certificado.pdf";
        }
    }
    const blob = esPdf
        ? new Blob([raw], { type: "application/pdf" })
        : raw;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = archivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function leerIdTransportistaOpds() {
    try { return (localStorage.getItem("mfIdTransportistaOpds") || "").trim(); } catch { return ""; }
}

function guardarIdTransportistaOpds(valor) {
    const v = (valor || "").trim();
    try {
        if (v) localStorage.setItem("mfIdTransportistaOpds", v);
        else localStorage.removeItem("mfIdTransportistaOpds");
    } catch { /* ignore */ }
}

function esManifiestoLoteParams(params) {
    const id = parseInt(params.get("idRecorrido") || "0", 10) || 0;
    return id <= 0;
}

function mensajeExitoManifiesto(conCert, conLote) {
    if (conLote && conCert) return "Se descargaron el PDF, el certificado y el archivo de lote OPDS.";
    if (conLote) return "Se descargaron el PDF de impresión y el archivo de lote OPDS.";
    if (conCert) return "Se descargaron el manifiesto y el certificado.";
    return "Se descargó el manifiesto en PDF.";
}

async function descargarManifiestoLoteOpds(params) {
    const idOpds = ($("#mfIdTransportistaOpds").val() || "").trim() || leerIdTransportistaOpds();
    if (!idOpds) {
        return { ok: false, mensaje: "Falta el N° OPDS del transportista." };
    }
    guardarIdTransportistaOpds(idOpds);

    const loteParams = new URLSearchParams(params.toString());
    loteParams.delete("formato");
    loteParams.delete("generarCertificados");
    loteParams.set("idTransportistaOpds", idOpds);

    await new Promise(r => setTimeout(r, 350));
    const response = await fetch(`/Recorridos/ManifiestoLoteOpds?${loteParams.toString()}`, {
        headers: { Authorization: "Bearer " + getTokenRec() }
    });

    if (response.status === 404) {
        return { ok: false, mensaje: "No hay clientes para armar el archivo de lote." };
    }

    if (!response.ok) {
        let msg = "No se pudo generar el archivo de lote OPDS.";
        try {
            const data = await response.json();
            if (data?.mensaje) msg = data.mensaje;
        } catch { /* ignore */ }
        return { ok: false, mensaje: msg };
    }

    await descargarRespuestaArchivo(response, "LOTE_PATOGENICOS.txt");
    let warning = "";
    try {
        const raw = response.headers.get("X-OA-Warning") || "";
        if (raw) warning = decodeURIComponent(raw);
    } catch { /* ignore */ }
    return { ok: true, warning };
}

async function buscarRecorridos(texto) {
    if (!texto) {
        $("#panelBusqueda").addClass("d-none");
        return;
    }

    const idCamion = parseInt($("#selCamion").val(), 10) || null;

    try {
        const params = new URLSearchParams({ texto });
        if (idCamion) params.set("idCamion", idCamion);
        const data = await fetchJson(`/Recorridos/BuscarClientes?${params.toString()}`);
        renderResultadosBusqueda(data);
        $("#panelBusqueda").removeClass("d-none");
    } catch (e) {
        console.error(e);
    }
}

function renderResultadosBusqueda(data) {
    const tbody = $("#tblBusqueda tbody");
    tbody.empty();

    if (!Array.isArray(data) || !data.length) {
        tbody.append(`<tr><td colspan="6" class="rec-empty"><i class="fa fa-search"></i>Sin resultados</td></tr>`);
        return;
    }

    data.forEach(item => {
        tbody.append(`
            <tr>
                <td>${escapeHtml(item.RecorridoTexto)}</td>
                <td>${escapeHtml(item.Camion)}</td>
                <td>${escapeHtml(item.Zona || "-")}</td>
                <td>${item.Posicion}</td>
                <td>${escapeHtml(item.Cliente)}</td>
                <td class="text-end">
                    <button type="button" class="btn btn-sm btn-outline-info"
                            onclick="irARecorrido(${item.IdCamion}, ${item.IdSemana}, ${item.IdDia})">
                        <i class="fa fa-arrow-right"></i> Ir
                    </button>
                </td>
            </tr>`);
    });
}

async function irARecorrido(idCamion, idSemana, idDia) {
    await recargarCamionesSelect(idCamion, { silent: true });
    $("#selCamion").val(String(idCamion));
    if ($("#selCamion").data("select2")) $("#selCamion").trigger("change.select2");
    await cargarRutasUnidad();

    const ruta = rutasData.find(x => x.IdSemana === idSemana && x.IdDia === idDia);
    seleccionarRecorrido(idSemana, idDia, ruta?.Zona || "");
    scrollARuta(idSemana, idDia);

    $("#panelBusqueda").addClass("d-none");
    $("#txtBuscarRecorrido").val("");
}

async function abrirModalClienteRecorrido(modelo) {
    if (!getRecorridoActivo() && !modelo) return;

    const esEdicion = !!modelo;
    const sel = $("#crCliente");
    const idCliente = modelo?.IdCliente || "";
    const nombreCliente = modelo?.Cliente || (idCliente ? `Cliente #${idCliente}` : "");

    sel.empty();
    if (idCliente) {
        sel.append(new Option(nombreCliente, idCliente, true, true));
    }

    $("#crId").val(modelo?.Id || 0);
    sel.val(idCliente ? String(idCliente) : "").trigger("change");
    $("#crPosicion").val(esEdicion ? (modelo?.Posicion ?? 1) : getSiguientePosicionRecorrido());
    $("#crObservacion").val(modelo?.Observacion || "");
    $("#crActivo").prop("checked", modelo?.Activo !== false);
    $("#lblCrActivo").text(modelo?.Activo === false ? "Inactivo" : "Activo");
    $("#crReprogramado").prop("checked", !!modelo?.Reprogramado);
    actualizarLabelReprogramado(!!modelo?.Reprogramado);
    $("#modalClienteRecorridoTitulo").text(esEdicion ? "Editar cliente en recorrido" : "Agregar cliente al recorrido");
    $("#modalClienteRecorridoSub").text($("#lblRecorridoSeleccionado").text());

    await cargarEstablecimientosCliente(parseInt(idCliente, 10), modelo?.IdEstablecimiento || null);
    actualizarAvisoPosicionRecorrido();
    modalClienteRecorrido.show();
}

async function editarClienteRecorrido(id) {
    const local = (clientesRecorridoActual || []).find(x => Number(x.Id) === Number(id));
    if (local) {
        abrirModalClienteRecorrido(local);
        return;
    }

    try {
        const data = await fetchJson(`/Recorridos/EditarInfoClienteRecorrido?id=${id}`);
        abrirModalClienteRecorrido({
            Id: data.Id,
            IdCliente: data.IdCliente,
            Cliente: data.Cliente,
            IdEstablecimiento: data.IdEstablecimiento,
            Posicion: data.Posicion,
            Activo: data.Activo,
            Reprogramado: data.Reprogramado,
            Observacion: data.Observacion
        });
    } catch (e) {
        console.error(e);
        errorModal("No se pudo cargar el registro.");
    }
}

async function guardarClienteRecorrido() {
    const activo = getRecorridoActivo();
    if (!activo) return;

    const id = parseInt($("#crId").val(), 10) || 0;
    const idEst = parseInt($("#crEstablecimiento").val(), 10) || null;

    const payload = {
        Id: id,
        IdCliente: parseInt($("#crCliente").val(), 10),
        IdEstablecimiento: idEst > 0 ? idEst : null,
        IdCamion: activo.idCamion,
        IdSemana: activo.idSemana,
        IdDia: activo.idDia,
        Posicion: parseInt($("#crPosicion").val(), 10) || 0,
        Activo: $("#crActivo").is(":checked"),
        Reprogramado: $("#crReprogramado").is(":checked"),
        Observacion: ($("#crObservacion").val() || "").trim() || null
    };

    if (!payload.IdCliente) {
        errorModal("Selecciona un cliente.");
        return;
    }

    const ocupante = getClienteEnPosicion(payload.Posicion, payload.Id);
    const aviso = document.getElementById("avisoOrdenRecorridoCr");
    let desplazar = true;
    if (ocupante) {
        const decision = typeof rpDecisionAvisoOrdenRecorrido === "function"
            ? rpDecisionAvisoOrdenRecorrido(aviso)
            : null;
        if (decision === null) {
            actualizarAvisoPosicionRecorrido();
            errorModal("Esa posición ya está ocupada. Indicá si querés reemplazar y desplazar a los demás.");
            return;
        }
        desplazar = decision === true;
    }
    payload.DesplazarSiOcupada = desplazar;

    const url = id > 0 ? "/Recorridos/ActualizarClienteRecorrido" : "/Recorridos/InsertarClienteRecorrido";
    const method = id > 0 ? "PUT" : "POST";

    try {
        const data = await fetchJson(url, { method, body: JSON.stringify(payload) });

        if (!(data?.valor ?? data?.Valor)) {
            errorModal(data?.mensaje ?? data?.Mensaje ?? "No se pudo guardar.");
            return;
        }

        modalClienteRecorrido.hide();
        exitoModal(data?.mensaje ?? data?.Mensaje ?? "Guardado correctamente.");
        await cargarClientesRecorrido();
    } catch (e) {
        console.error(e);
        errorModal("Error al guardar.");
    }
}

async function eliminarClienteRecorrido(id) {
    const ok = typeof confirmarModal === "function"
        ? await confirmarModal("¿Eliminar este cliente del recorrido?")
        : window.confirm("¿Eliminar este cliente del recorrido?");

    if (!ok) return;

    try {
        const data = await fetchJson(`/Recorridos/EliminarClienteRecorrido?id=${id}`, { method: "DELETE" });

        if (!(data?.valor ?? data?.Valor)) {
            errorModal(data?.mensaje ?? data?.Mensaje ?? "No se pudo eliminar.");
            return;
        }

        exitoModal(data?.mensaje ?? data?.Mensaje ?? "Eliminado.");
        await cargarClientesRecorrido();
    } catch (e) {
        console.error(e);
        errorModal("Error al eliminar.");
    }
}

async function guardarObservacionClienteRecorrido(id, observacion) {
    const item = clientesRecorridoActual.find(x => Number(x.Id) === Number(id));
    if (!item) return;

    const activo = getRecorridoActivo();
    if (!activo) return;

    const valor = (observacion || "").trim();
    const anterior = (item.Observacion || "").trim();
    if (valor === anterior) return;

    const payload = payloadClienteRecorrido(item, { Observacion: valor || null });

    try {
        const data = await fetchJson("/Recorridos/ActualizarClienteRecorrido", {
            method: "PUT",
            body: JSON.stringify(payload)
        });

        if (!(data?.valor ?? data?.Valor)) {
            errorModal(data?.mensaje ?? data?.Mensaje ?? "No se pudo guardar la observacion.");
            return;
        }

        item.Observacion = valor || null;
    } catch (e) {
        console.error(e);
        errorModal("Error al guardar la observacion.");
    }
}

async function toggleReprogramadoClienteRecorrido(id) {
    const item = clientesRecorridoActual.find(x => Number(x.Id) === Number(id));
    if (!item) return;

    const activo = getRecorridoActivo();
    if (!activo) return;

    const payload = payloadClienteRecorrido(item, { Reprogramado: !item.Reprogramado });

    try {
        const data = await fetchJson("/Recorridos/ActualizarClienteRecorrido", {
            method: "PUT",
            body: JSON.stringify(payload)
        });

        if (!(data?.valor ?? data?.Valor)) {
            errorModal(data?.mensaje ?? data?.Mensaje ?? "No se pudo actualizar.");
            return;
        }

        item.Reprogramado = !item.Reprogramado;
        renderClientesRecorrido(clientesRecorridoActual);
    } catch (e) {
        console.error(e);
        errorModal("Error al marcar reprogramado.");
    }
}

function escapeHtml(text) {
    if (text == null) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function ocultarPanelSugeridos() {
    sugeridosRecorridoActual = [];
    sugeridosPanelVisible = false;
    $("#panelSugeridosRecorrido, #listaSugeridosRecorrido").addClass("d-none");
    $("#btnTraerProgramadosRec").addClass("d-none").prop("disabled", true);
}

async function traerProgramadosRecorrido() {
    sugeridosPanelVisible = true;
    await cargarSugeridosRecorrido();
    document.getElementById("panelSugeridosRecorrido")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function cargarSugeridosRecorrido() {
    const activo = getRecorridoActivo();
    if (!activo) {
        ocultarPanelSugeridos();
        return;
    }

    const { idCamion, idSemana, idDia } = activo;

    try {
        sugeridosRecorridoActual = await fetchJson(
            `/Recorridos/SugeridosPorRecoleccion?idCamion=${idCamion}&idSemana=${idSemana}&idDia=${idDia}`
        );
        if (!Array.isArray(sugeridosRecorridoActual)) sugeridosRecorridoActual = [];

        const pendientes = sugeridosRecorridoActual.filter(x => !x.YaEnRecorrido);
        renderPanelSugeridos();
        if (!pendientes.length && typeof advertenciaModal === "function") {
            advertenciaModal("No hay clientes programados pendientes para este día y semana.");
        }
    } catch (e) {
        console.warn("No se pudieron cargar sugeridos:", e);
        ocultarPanelSugeridos();
    }
}

function renderPanelSugeridos() {
    const pendientes = (sugeridosRecorridoActual || []).filter(x => !x.YaEnRecorrido);
    const enRuta = (sugeridosRecorridoActual || []).filter(x => x.YaEnRecorrido);
    const $panel = $("#panelSugeridosRecorrido");
    const $lista = $("#listaSugeridosRecorrido");
    const $btnTraer = $("#btnTraerProgramadosRec");

    if (!pendientes.length && !enRuta.length) {
        $panel.addClass("d-none");
        $lista.addClass("d-none");
        return;
    }

    $btnTraer.removeClass("d-none").prop("disabled", false);
    $btnTraer.html(`<i class="fa fa-magic me-1"></i> Traer programados${pendientes.length ? ` (${pendientes.length})` : ""}`);

    if (!pendientes.length) {
        $panel.addClass("d-none");
        return;
    }

    $panel.removeClass("d-none");
    $("#lblSugeridosRecorrido").text(
        `${pendientes.length} cliente${pendientes.length === 1 ? "" : "s"} con recoleccion programada para este dia y semana` +
        (enRuta.length ? ` · ${enRuta.length} ya en la ruta` : "")
    );

    const rows = sugeridosRecorridoActual.map(item => {
        const disabled = item.YaEnRecorrido ? " disabled" : "";
        const checked = !item.YaEnRecorrido ? " checked" : "";
        const extraClass = item.YaEnRecorrido ? " rec-sugerido-item--done" : "";
        const domicilio = [item.Domicilio, item.Localidad].filter(Boolean).join(" · ");
        return `
            <label class="rec-sugerido-item${extraClass}">
                <input type="checkbox" class="rec-sugerido-check" data-cliente="${item.IdCliente}"
                    data-establecimiento="${item.IdEstablecimiento || ""}"${checked}${disabled} />
                <span class="rec-sugerido-main">
                    <strong>${escapeHtml(item.Cliente)}</strong>
                    ${item.Establecimiento ? `<small>${escapeHtml(item.Establecimiento)}</small>` : ""}
                    ${domicilio ? `<span class="rec-sugerido-meta">${escapeHtml(domicilio)}</span>` : ""}
                </span>
                <span class="rec-sugerido-horario">${escapeHtml(item.Horario || "-")}</span>
                ${item.YaEnRecorrido ? `<span class="rec-sugerido-badge">En ruta</span>` : ""}
            </label>`;
    }).join("");

    $lista.html(`
        <label class="rec-sugerido-item rec-sugerido-item--all">
            <input type="checkbox" id="chkSugeridosTodos" checked />
            <span><strong>Seleccionar todos los pendientes</strong></span>
        </label>
        ${rows}`);

    $lista.toggleClass("d-none", !sugeridosPanelVisible);
    $("#btnToggleSugeridosRec").html(
        sugeridosPanelVisible
            ? `<i class="fa fa-chevron-up"></i> Ocultar lista`
            : `<i class="fa fa-list"></i> Ver lista`
    );
    actualizarResumenSugeridos();
}

function actualizarResumenSugeridos() {
    const total = $("#listaSugeridosRecorrido .rec-sugerido-check:not(:disabled):checked").length;
    $("#btnAgregarSugeridosRec").prop("disabled", total === 0)
        .html(`<i class="fa fa-download me-1"></i> Agregar seleccionados${total ? ` (${total})` : ""}`);
}

async function agregarSugeridosSeleccionados() {
    const activo = getRecorridoActivo();
    if (!activo) return;

    const items = [];
    $("#listaSugeridosRecorrido .rec-sugerido-check:not(:disabled):checked").each(function () {
        const idCliente = parseInt($(this).data("cliente"), 10);
        const idEst = parseInt($(this).data("establecimiento"), 10);
        if (idCliente) {
            items.push({
                IdCliente: idCliente,
                IdEstablecimiento: idEst > 0 ? idEst : null
            });
        }
    });

    if (!items.length) {
        errorModal("Selecciona al menos un cliente programado.");
        return;
    }

    const payload = {
        IdCamion: activo.idCamion,
        IdSemana: activo.idSemana,
        IdDia: activo.idDia,
        Items: items
    };

    $("#btnAgregarSugeridosRec, #btnTraerProgramadosRec").prop("disabled", true);

    try {
        const data = await fetchJson("/Recorridos/InsertarClientesRecorridoBulk", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (!(data?.valor ?? data?.Valor)) {
            errorModal(data?.mensaje ?? data?.Mensaje ?? "No se pudieron agregar los clientes.");
            return;
        }

        if (typeof exitoModal === "function") exitoModal(data?.mensaje ?? data?.Mensaje ?? "Clientes agregados.");
        sugeridosPanelVisible = false;
        await cargarClientesRecorrido();
    } catch (e) {
        console.error(e);
        errorModal("Error al agregar clientes programados.");
    } finally {
        $("#btnAgregarSugeridosRec, #btnTraerProgramadosRec").prop("disabled", false);
    }
}
