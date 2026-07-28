let semanas = [];
let dias = [];
let camiones = [];
let rutasData = [];
let clientesCatalogo = [];
let recorridosSeleccionados = [];
let clientesRecorridoActual = [];
let sugeridosRecorridoActual = [];
let sugeridosPanelVisible = false;
let semanaTabActiva = null;
let modalClienteRecorrido = null;
let busquedaTimer = null;

const getTokenRec = () => window.token || localStorage.getItem("JwtToken") || "";

const headersAuth = () => ({
    Authorization: "Bearer " + getTokenRec(),
    "Content-Type": "application/json"
});

const select2Opts = { width: "100%", allowClear: true, placeholder: "Seleccionar" };

$(document).ready(async () => {
    modalClienteRecorrido = new bootstrap.Modal(document.getElementById("modalClienteRecorrido"));

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

    $("#listaClientesRecorrido").on("blur", ".rec-obs-input", function () {
        const id = parseInt($(this).data("id"), 10);
        guardarObservacionClienteRecorrido(id, $(this).val());
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
    $("#btnHojaRutaRecorrido").on("click", () => abrirHojaRutaRecorrido());
    $("#btnTraerProgramadosRec").on("click", () => {
        sugeridosPanelVisible = true;
        renderPanelSugeridos();
        document.getElementById("panelSugeridosRecorrido")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
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
    $("#btnGuardarClienteRecorrido").on("click", () => guardarClienteRecorrido());

    $("#crCliente").on("change", async function () {
        await cargarEstablecimientosCliente(parseInt($(this).val(), 10));
    });

    $("#crActivo").on("change", function () {
        $("#lblCrActivo").text($(this).is(":checked") ? "Activo" : "Inactivo");
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
            recargarCamionesSelect(null, { silent: true }),
            cargarClientesCatalogo()
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
        placeholder: "Buscar cliente..."
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
    dias = Array.isArray(rDias) ? rDias : [];
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

async function cargarClientesCatalogo() {
    const data = await fetchJson("/Clientes/Lista?soloActivos=true");
    clientesCatalogo = Array.isArray(data) ? data : [];
}

async function cargarEstablecimientosCliente(idCliente, selectedId) {
    const sel = $("#crEstablecimiento");
    sel.empty().append(new Option("Sin establecimiento", ""));

    if (!idCliente) {
        sel.val("").trigger("change");
        return;
    }

    try {
        const data = await fetchJson(`/ClientesEstablecimientos/ListaPorCliente?idCliente=${idCliente}`);
        (data || []).forEach(e => sel.append(new Option(e.Nombre || e.Etiqueta, e.Id)));
    } catch (e) {
        console.warn("No se pudieron cargar establecimientos:", e);
    }

    sel.val(selectedId ? String(selectedId) : "").trigger("change");
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
    }
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
            const label = `${s.Nombre} · ${d.Nombre}${zona ? " - " + zona : ""}`;
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
        $("#btnNuevoClienteRecorrido, #btnHojaRutaRecorrido, #btnTraerProgramadosRec").prop("disabled", true);
        $("#btnTraerProgramadosRec").addClass("d-none");
        ocultarPanelSugeridos();
        if (recargarClientes) renderClientesRecorrido([]);
        return;
    }

    $("#btnNuevoClienteRecorrido, #btnHojaRutaRecorrido").prop("disabled", false);
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
    let base = `${camion} · ${semana} · ${dia}${zona ? " · " + zona : ""}`;
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
    $("#btnNuevoClienteRecorrido, #btnHojaRutaRecorrido, #btnTraerProgramadosRec").prop("disabled", true);
    $("#btnTraerProgramadosRec").addClass("d-none");
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

    try {
        const data = await fetchJson(
            `/Recorridos/ClientesPorRecorrido?idCamion=${idCamion}&idSemana=${idSemana}&idDia=${idDia}`
        );
        renderClientesRecorrido(data);
        await cargarSugeridosRecorrido();
    } catch (e) {
        console.error(e);
        errorModal("No se pudieron cargar los clientes del recorrido.");
    }
}

function getSiguientePosicionRecorrido() {
    if (!clientesRecorridoActual.length) return 1;

    const maxPos = clientesRecorridoActual.reduce((max, item) => {
        const pos = parseInt(item.Posicion, 10);
        return Number.isFinite(pos) && pos > max ? pos : max;
    }, 0);

    return maxPos + 1;
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
        return;
    }

    if (!Array.isArray(data) || !data.length) {
        $lista.html(`
            <div class="rec-empty" id="recEmptyClientes">
                <i class="fa fa-users"></i>
                Sin clientes en este recorrido.<br>
                <span class="text-muted-cc">Usa <strong>Traer programados</strong> para cargar los del dia/semana del establecimiento, o <strong>+ Agregar cliente</strong>.</span>
            </div>`);
        return;
    }

    const html = data.map(item => {
        const badge = item.Activo
            ? '<span class="rec-badge-activo rec-badge-activo--si"><i class="fa fa-check-circle"></i> Activo</span>'
            : '<span class="rec-badge-activo rec-badge-activo--no"><i class="fa fa-pause-circle"></i> Inactivo</span>';

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

        return `
            <article class="rec-cliente-item${item.Activo ? "" : " rec-cliente-item--inactive"}" data-id="${item.Id}">
                <div class="rec-cliente-pos" title="Posicion en la ruta">
                    <span>${item.Posicion}</span>
                </div>
                <div class="rec-cliente-main">
                    <div class="rec-cliente-name">${escapeHtml(item.Cliente)}</div>
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
                </div>
                <div class="rec-cliente-status">${badge}</div>
                <div class="rec-cliente-actions">
                    <button type="button" class="rec-cliente-btn rec-cliente-btn--edit" onclick="editarClienteRecorrido(${item.Id})" title="Editar">
                        <i class="fa fa-pencil"></i>
                    </button>
                    <button type="button" class="rec-cliente-btn rec-cliente-btn--delete" onclick="eliminarClienteRecorrido(${item.Id})" title="Quitar de la ruta">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
                <div class="rec-cliente-obs">
                    <label class="rec-cliente-obs-label">Observacion hoja de ruta</label>
                    <textarea class="form-control rec-input rec-obs-input" data-id="${item.Id}" rows="2"
                              maxlength="500" placeholder="Notas para imprimir en la hoja de ruta...">${escapeHtml(item.Observacion || "")}</textarea>
                </div>
            </article>`;
    }).join("");

    $lista.html(html);

    const activos = data.filter(x => x.Activo).length;
    const suffix = `${data.length} cliente${data.length === 1 ? "" : "s"}${activos !== data.length ? ` (${activos} activos)` : ""}`;
    actualizarLabelRecorridoSeleccionado(suffix);
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

    if (!esEdicion && getRecorridoActivo()) {
        await cargarClientesRecorrido();
    }

    const sel = $("#crCliente");
    sel.empty();
    clientesCatalogo.forEach(c => sel.append(new Option(c.Nombre, c.Id)));

    const idCliente = modelo?.IdCliente || clientesCatalogo[0]?.Id || "";

    $("#crId").val(modelo?.Id || 0);
    sel.val(idCliente ? String(idCliente) : "").trigger("change");
    $("#crPosicion").val(esEdicion ? (modelo?.Posicion ?? 1) : getSiguientePosicionRecorrido());
    $("#crObservacion").val(modelo?.Observacion || "");
    $("#crActivo").prop("checked", modelo?.Activo !== false);
    $("#lblCrActivo").text(modelo?.Activo === false ? "Inactivo" : "Activo");
    $("#modalClienteRecorridoTitulo").text(esEdicion ? "Editar cliente en recorrido" : "Agregar cliente al recorrido");
    $("#modalClienteRecorridoSub").text($("#lblRecorridoSeleccionado").text());

    await cargarEstablecimientosCliente(parseInt(idCliente, 10), modelo?.IdEstablecimiento || null);
    modalClienteRecorrido.show();
}

async function editarClienteRecorrido(id) {
    try {
        const data = await fetchJson(`/Recorridos/EditarInfoClienteRecorrido?id=${id}`);
        abrirModalClienteRecorrido({
            Id: data.Id,
            IdCliente: data.IdCliente,
            IdEstablecimiento: data.IdEstablecimiento,
            Posicion: data.Posicion,
            Activo: data.Activo,
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
        Posicion: parseInt($("#crPosicion").val(), 10) || 1,
        Activo: $("#crActivo").is(":checked"),
        Observacion: ($("#crObservacion").val() || "").trim() || null
    };

    if (!payload.IdCliente) {
        errorModal("Selecciona un cliente.");
        return;
    }

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

    const payload = {
        Id: item.Id,
        IdCliente: item.IdCliente,
        IdEstablecimiento: item.IdEstablecimiento,
        IdCamion: activo.idCamion,
        IdSemana: activo.idSemana,
        IdDia: activo.idDia,
        Posicion: item.Posicion,
        Activo: item.Activo,
        Observacion: valor || null
    };

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

    const url = `/Recorridos/HojaRuta?${params.toString()}`;

    try {
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
    } catch (e) {
        console.error(e);
        errorModal("Error al abrir la hoja de ruta.");
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
        if (pendientes.length && !clientesRecorridoActual.length) sugeridosPanelVisible = true;

        renderPanelSugeridos();
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
        ocultarPanelSugeridos();
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
