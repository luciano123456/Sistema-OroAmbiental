/* =========================================================
   PROVEEDORES GESTION - Hub unificado
========================================================= */

const PG = {
    id: 0,
    modelo: null,
    contactos: [],
    contactoSelId: 0,
    tabsLoaded: {},
    grids: {},
    listMeta: {},
    viewPref: "auto",
    sucursales: [],
    cuentas: [],
    modalPago: null,
    modalAjuste: null,
    controlFiltros: { anios: [], meses: [] },
    controlFiltrado: null,
    modalControlMensual: null
};

const API_PG = {
    editar: id => `/Proveedores/EditarInfo?id=${id}`,
    insertar: "/Proveedores/Insertar",
    actualizar: "/Proveedores/Actualizar",
    eliminar: (id, cascada) => `/Proveedores/Eliminar?id=${id}&cascada=${cascada ? "true" : "false"}`,
    dependencias: id => `/Proveedores/DependenciasEliminar?id=${id}`,
    condicionesIva: "/CondicionesIva/Lista",
    bancos: "/Bancos/Lista",
    sucursales: "/Sucursales/Lista",
    cuentas: "/Cuentas/Lista",
    contactosLista: id => `/ProveedoresContactos/ListaPorProveedor?idProveedor=${id}`,
    contactosInsertar: "/ProveedoresContactos/Insertar",
    contactosActualizar: "/ProveedoresContactos/Actualizar",
    contactosEliminar: id => `/ProveedoresContactos/Eliminar?id=${id}`,
    ccMovimientos: "/ProveedoresCuentaCorriente/Movimientos",
    ccResumen: "/ProveedoresCuentaCorriente/Resumen",
    ccRegistrarPago: "/ProveedoresCuentaCorriente/RegistrarPago",
    ccRegistrarAjuste: "/ProveedoresCuentaCorriente/RegistrarAjuste",
    ccEliminar: id => `/ProveedoresCuentaCorriente/Eliminar?id=${id}`,
    comprasLista: "/Compras/ListaFiltrada",
    compraNuevoModif: (id, idProveedor) => {
        let url = `/Compras/NuevoModif?id=${id || 0}`;
        if (idProveedor) url += `&idProveedor=${idProveedor}`;
        return url;
    },
    controlMensual: (id, anios, meses) => {
        const p = new URLSearchParams({ idProveedor: String(id) });
        if (anios?.length) p.set("anios", anios.join(","));
        if (meses?.length) p.set("meses", meses.join(","));
        return `/ProveedoresOperativo/ControlMensual?${p.toString()}`;
    },
    guardarControlMensual: "/ProveedoresOperativo/GuardarControlMensual"
};

const PG_TAB_LABELS = {
    contactos: "Contactos",
    cuentaCorriente: "Cuenta corriente",
    compras: "Compras",
    pagos: "Pagos",
    controlMensual: "Control mensual"
};

const PG_CARD_SCHEMAS = {
    cuentaCorriente: {
        title: r => r.TipoMovimiento,
        subtitle: r => formatearFechaPg(r.Fecha),
        badge: r => `#${r.Id}`,
        tone: r => r.TipoMovimiento === "PAGO" ? "cg-data-card--green" : "cg-data-card--blue",
        fields: [
            { label: "Concepto", value: r => r.Concepto, full: true },
            { label: "Debe", value: r => fmtMoneyPg(r.Debe), cls: "cg-val-debe" },
            { label: "Haber", value: r => fmtMoneyPg(r.Haber), cls: "cg-val-haber" },
            { label: "Saldo", value: r => fmtMoneyPg(r.Saldo), cls: "cg-val-saldo" }
        ],
        actions: r => r.PuedeEliminar
            ? `<button type="button" class="cg-card-btn cg-card-btn--danger" onclick="eliminarMovCcPg(${r.Id})"><i class="fa fa-trash"></i> Eliminar</button>`
            : ""
    },
    compras: {
        title: r => formatearFechaPg(r.Fecha),
        subtitle: r => r.Sucursal || "Sin sucursal",
        badge: r => `#${r.Id}`,
        tone: () => "cg-data-card--rose",
        fields: [
            { label: "Total", value: r => fmtMoneyPg(r.ImporteTotal), cls: "cg-val-neutral" },
            { label: "Pagado", value: r => fmtMoneyPg(r.TotalPagado), cls: "cg-val-haber" },
            { label: "Restante", value: r => fmtMoneyPg(r.SaldoPendiente), cls: "cg-val-debe", full: true }
        ],
        actions: r => `<a class="cg-card-btn" href="${API_PG.compraNuevoModif(r.Id, PG.id)}"><i class="fa fa-pencil"></i> Ver / editar</a>`
    },
    pagos: {
        title: r => r.Concepto || "Pago",
        subtitle: r => formatearFechaPg(r.Fecha),
        badge: r => `#${r.Id}`,
        tone: () => "cg-data-card--green",
        fields: [
            { label: "Importe", value: r => fmtMoneyPg(r.Haber), cls: "cg-val-haber", full: true }
        ],
        actions: r => r.PuedeEliminar
            ? `<button type="button" class="cg-card-btn cg-card-btn--danger" onclick="eliminarMovCcPg(${r.Id})"><i class="fa fa-trash"></i> Eliminar</button>`
            : ""
    }
};

const authPg = () => ({
    Authorization: "Bearer " + token,
    "Content-Type": "application/json"
});

$(document).ready(async () => {
    PG.id = Number(window.PG_INIT?.id || $("#pgId").val() || 0);

    if (typeof Permisos !== "undefined") {
        Permisos.init();
        Permisos.aplicarUI("Proveedores CC");
    }

    wireEventosPg();
    initSelect2Pg();
    initModalesPg();
    initViewModePg();
    initFechasCcPg();
    initControlMensualPg();

    await cargarCombosDatosPg();

    if (PG.id > 0) {
        await cargarProveedorPg(PG.id);
        habilitarTabsRelacionadosPg(true);
    } else {
        actualizarHeaderPg("Nuevo proveedor", "Complete los datos y registre el proveedor");
        habilitarTabsRelacionadosPg(false);
    }
});

function initModalesPg() {
    const elPago = document.getElementById("modalPagoPg");
    const elAjuste = document.getElementById("modalAjustePg");
    if (elPago) PG.modalPago = new bootstrap.Modal(elPago);
    if (elAjuste) PG.modalAjuste = new bootstrap.Modal(elAjuste);
}

function wireEventosPg() {
    $("#btnGuardarProveedorPg").on("click", busyHandler(guardarProveedorPg));
    $("#btnEliminarProveedorPg").on("click", busyHandler(eliminarProveedorPg));
    $("#btnCerrarErrorPg").on("click", cerrarErrorPg);
    $("#pgActivo").on("change", function () {
        $("#lblActivoPg").text(this.checked ? "Activo" : "Inactivo");
    });

    $('button[data-pg-tab]').on("shown.bs.tab", async function () {
        const tab = $(this).data("pgTab");
        await cargarTabPg(tab);
        if (debeMostrarTablaPg()) RpGridView.programarAjuste();
    });

    $("#btnGuardarContactoPg").on("click", busyHandler(guardarContactoPg));
    $("#btnNuevoContactoPg").on("click", limpiarFormContactoPg);
    $("#pgListaContactos").on("click", function (e) {
        const btnDel = e.target.closest(".btn-eliminar-contacto-pg");
        if (btnDel) {
            e.stopPropagation();
            eliminarContactoPg(Number(btnDel.dataset.id));
            return;
        }
        const item = e.target.closest(".rp-contact-item");
        if (item) seleccionarContactoPg(Number(item.dataset.id));
    });

    $("#btnFiltrarCcPg").on("click", () => cargarTabCuentaCorriente(true));
    $("#btnLimpiarCcPg").on("click", limpiarFiltrosCcPg);
    $("#btnRefreshCcPg").on("click", () => cargarTabCuentaCorriente(true));
    $("#btnRefreshComprasPg").on("click", () => cargarTabCompras(true));
    $("#btnPagoPg, #btnPagoTabPg").on("click", abrirModalPagoPg);
    $("#btnAjustePg").on("click", abrirModalAjustePg);
    $("#btnConfirmarPagoPg").on("click", busyHandler(confirmarPagoPg));
    $("#btnConfirmarAjustePg").on("click", busyHandler(confirmarAjustePg));

    $("#pgPagoSucursal").on("change", filtrarCuentasPorSucursalPg);

    document.addEventListener("configuracionActualizada", async (e) => {
        const tipo = e.detail?.tipo;
        const nuevoId = e.detail?.nuevoId;
        const map = {
            CondicionesIva: "#pgCondicionIva",
            Bancos: "#pgBanco"
        };
        const sel = map[tipo];
        if (sel) await recargarComboPg(sel, nuevoId);
        if (tipo === "Sucursales") await cargarSucursalesPg();
    });

    $(document).on("rpGridViewChanged", function (_e, pref) {
        PG.viewPref = pref || RpGridView.getPref();
        aplicarModoVistaPg();
        Object.keys(PG.listMeta || {}).forEach(renderCardsPg);
    });
}

function initSelect2Pg() {
    const opts = { width: "100%", allowClear: true, placeholder: "Seleccionar" };
    ["#pgCondicionIva", "#pgBanco", "#pgCcTipo", "#pgPagoSucursal", "#pgPagoCuenta"].forEach(sel => {
        ensureSelect2Pg($(sel), opts);
    });
}

function ensureSelect2Pg($el, opts) {
    if (!$el?.length) return;
    if ($el.data("select2")) $el.select2("destroy");
    $el.select2(Object.assign({ width: "100%", allowClear: true }, opts || {}));
}

function initFechasCcPg() {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    $("#pgCcDesde").val(inicio.toISOString().slice(0, 10));
    $("#pgCcHasta").val(hoy.toISOString().slice(0, 10));
}

function limpiarFiltrosCcPg() {
    initFechasCcPg();
    $("#pgCcTipo").val("").trigger("change");
    $("#pgCcTexto").val("");
    cargarTabCuentaCorriente(true);
}

async function fetchJsonPg(url, options = {}) {
    const r = await fetch(url, options);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
}

async function llenarComboPg(selector, url, selectedId) {
    const $sel = $(selector);
    $sel.empty().append(new Option("Seleccionar", ""));
    try {
        const data = await fetchJsonPg(url, { headers: authPg() });
        (data || []).forEach(x => $sel.append(new Option(x.Nombre, x.Id)));
    } catch (e) {
        console.warn(`No se pudo cargar combo ${selector}:`, e);
    }
    if (selectedId) $sel.val(String(selectedId)).trigger("change");
}

async function recargarComboPg(selector, nuevoId) {
    const mapUrl = {
        "#pgCondicionIva": API_PG.condicionesIva,
        "#pgBanco": API_PG.bancos
    };
    const url = mapUrl[selector];
    if (!url) return;
    await llenarComboPg(selector, url, nuevoId || $(selector).val());
}

async function cargarCombosDatosPg() {
    await Promise.all([
        llenarComboPg("#pgCondicionIva", API_PG.condicionesIva),
        llenarComboPg("#pgBanco", API_PG.bancos)
    ]);
    await cargarSucursalesPg();
    PG.cuentas = await fetchJsonPg(API_PG.cuentas, { headers: authPg() }) || [];
}

async function cargarSucursalesPg() {
    PG.sucursales = typeof fetchSucursalesPermitidas === "function"
        ? await fetchSucursalesPermitidas(API_PG.sucursales)
        : await fetchJsonPg(API_PG.sucursales, { headers: authPg() }) || [];

    const $s = $("#pgPagoSucursal").empty().append(new Option("Seleccionar", ""));
    PG.sucursales.forEach(x => $s.append(new Option(x.Nombre, x.Id)));
    ensureSelect2Pg($s, { placeholder: "Seleccionar" });

    if (typeof aplicarBloqueoSucursalUnica === "function") {
        aplicarBloqueoSucursalUnica($s, { triggerChange: false, sucursales: PG.sucursales });
    }
    filtrarCuentasPorSucursalPg();
}

function cuentasPorSucursalPg(idSucursal) {
    if (!idSucursal) return PG.cuentas || [];
    return (PG.cuentas || []).filter(x => String(x.IdCombo ?? x.IdSucursal) === String(idSucursal));
}

function filtrarCuentasPorSucursalPg() {
    const idSuc = parseInt($("#pgPagoSucursal").val(), 10) || 0;
    const $c = $("#pgPagoCuenta").empty().append(new Option("Seleccionar", ""));
    cuentasPorSucursalPg(idSuc).forEach(x => {
        $c.append(new Option(x.Nombre, x.Id));
    });
    ensureSelect2Pg($c, { placeholder: "Seleccionar", dropdownParent: $("#modalPagoPg") });
}

async function cargarProveedorPg(id) {
    try {
        const m = await fetchJsonPg(API_PG.editar(id), { headers: authPg() });
        PG.modelo = m;
        PG.id = m.Id;
        $("#pgId").val(m.Id);

        $("#pgNombre").val(m.Nombre || "");
        $("#pgCuit").val(m.Cuit || "");
        $("#pgTelefono").val(m.Telefono || "");
        $("#pgEmail").val(m.Email || "");
        $("#pgAlias").val(m.AliasBancario || "");
        $("#pgCbu").val(m.CbuBancario || "");
        $("#pgActivo").prop("checked", m.Activo !== false);
        $("#lblActivoPg").text(m.Activo !== false ? "Activo" : "Inactivo");

        if (m.IdCondicionIva) $("#pgCondicionIva").val(String(m.IdCondicionIva)).trigger("change");
        if (m.IdBanco) $("#pgBanco").val(String(m.IdBanco)).trigger("change");

        setAuditoriaPg(m);
        actualizarHeaderPg(m.Nombre || "Proveedor", m.Cuit ? `CUIT ${m.Cuit}` : "");
        actualizarEnlacesAccionPg();
        $("#btnEliminarProveedorPg").prop("hidden", false);
        $("#lblGuardarProveedorPg").text("Guardar");
    } catch (e) {
        console.error(e);
        errorModal("No se pudo cargar la informacion del proveedor.");
    }
}

function actualizarHeaderPg(titulo, subtitulo) {
    $("#pgTituloProveedor").text(titulo || "Proveedor");
    const $sub = $("#pgSubtituloProveedor");
    if (subtitulo) $sub.text(subtitulo).removeClass("d-none");
    else $sub.text("").addClass("d-none");
}

function actualizarEnlacesAccionPg() {
    if (PG.id <= 0) return;
    const url = API_PG.compraNuevoModif(0, PG.id);
    $("#btnNuevaCompraPg, #btnNuevaCompraTabPg").attr("href", url).prop("hidden", false);
}

function habilitarTabsRelacionadosPg(habilitar) {
    ["contactos", "cuentaCorriente", "compras", "pagos", "controlMensual"].forEach(t => {
        $(`button[data-pg-tab="${t}"]`).prop("disabled", !habilitar);
    });
}

function setAuditoriaPg(m) {
    const wrap = $("#pgAuditoria");
    $("#pgInfoRegistro, #pgInfoModificacion").empty();
    wrap.addClass("d-none");
    if (!m) return;
    if (m.UsuarioModifica && m.FechaUsuarioModifica) {
        $("#pgInfoModificacion").html(`<div class="rp-auditoria-item"><i class="fa fa-edit"></i> Ultima modificacion por <strong>${m.UsuarioModifica}</strong> el <strong>${formatearFechaPg(m.FechaUsuarioModifica)}</strong></div>`);
        wrap.removeClass("d-none");
    } else if (m.UsuarioRegistra && m.FechaUsuarioRegistra) {
        $("#pgInfoRegistro").html(`<div class="rp-auditoria-item"><i class="fa fa-user"></i> Registrado por <strong>${m.UsuarioRegistra}</strong> el <strong>${formatearFechaPg(m.FechaUsuarioRegistra)}</strong></div>`);
        wrap.removeClass("d-none");
    }
}

function obtenerModeloPg() {
    return {
        Id: PG.id || 0,
        Nombre: ($("#pgNombre").val() || "").trim(),
        Cuit: ($("#pgCuit").val() || "").trim(),
        Telefono: $("#pgTelefono").val() || null,
        Email: $("#pgEmail").val() || null,
        IdCondicionIva: parseInt($("#pgCondicionIva").val(), 10) || 0,
        IdBanco: intOrNullPg("#pgBanco"),
        AliasBancario: ($("#pgAlias").val() || "").trim() || null,
        CbuBancario: ($("#pgCbu").val() || "").trim() || null,
        Activo: $("#pgActivo").is(":checked")
    };
}

function intOrNullPg(sel) {
    const v = $(sel).val();
    if (!v) return null;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
}

function validarDatosPg() {
    const m = obtenerModeloPg();
    if (!m.Nombre || !m.Cuit || !m.IdCondicionIva) {
        mostrarErrorPg("Complete Nombre, CUIT y Condicion IVA.");
        return false;
    }
    return true;
}

async function guardarProveedorPg() {
    if (!validarDatosPg()) return;
    const m = obtenerModeloPg();
    const esNuevo = !m.Id;
    const url = esNuevo ? API_PG.insertar : API_PG.actualizar;
    const method = esNuevo ? "POST" : "PUT";

    try {
        const data = await fetchJsonPg(url, { method, headers: authPg(), body: JSON.stringify(m) });
        if (!data?.valor) {
            mostrarErrorPg(data?.mensaje || "No se pudo guardar.");
            return;
        }
        cerrarErrorPg();

        if (esNuevo && data.id) {
            window.location.href = `/Proveedores/Gestion?id=${data.id}`;
            return;
        }

        await cargarProveedorPg(m.Id);
        if (typeof modalGuardadoConSalida === "function") {
            await modalGuardadoConSalida({
                titulo: "Proveedor actualizado",
                mensaje: data.mensaje || "Proveedor modificado correctamente",
                pregunta: "Desea volver al listado de proveedores?",
                btnSalir: "Si, ir a Proveedores",
                btnQuedarse: "No, seguir editando",
                urlSalida: "/Proveedores/Index"
            });
        } else {
            exitoModal(data.mensaje || "Proveedor modificado correctamente");
        }
    } catch (e) {
        console.error(e);
        mostrarErrorPg("Error inesperado al guardar.");
    }
}

async function eliminarProveedorPg() {
    if (PG.id <= 0) return;
    if (typeof ejecutarEliminacionEntidad !== "function") {
        errorModal("No esta disponible el asistente de eliminacion.");
        return;
    }
    const resultado = await ejecutarEliminacionEntidad({
        entidadLabel: "este proveedor",
        urlDependencias: API_PG.dependencias(PG.id),
        urlEliminar: cascada => API_PG.eliminar(PG.id, cascada),
        headers: authPg(),
        fetchJson: fetchJsonPg
    });
    if (resultado.accion !== "ok") return;
    exitoModal(resultado.data?.mensaje || "Proveedor eliminado.");
    window.location.href = "/Proveedores/Index";
}

function mostrarErrorPg(msg) {
    const panel = $("#errorCamposPg");
    panel.find(".rp-error-message").text(msg);
    panel.removeClass("d-none");
}

function cerrarErrorPg() {
    $("#errorCamposPg").addClass("d-none").find(".rp-error-message").text("");
}

async function cargarTabPg(tab) {
    if (PG.id <= 0) return;
    if (PG.tabsLoaded[tab] && tab !== "cuentaCorriente" && tab !== "compras" && tab !== "controlMensual") return;

    try {
        switch (tab) {
            case "contactos": await cargarTabContactosPg(); break;
            case "cuentaCorriente": await cargarTabCuentaCorriente(); break;
            case "compras": await cargarTabCompras(); break;
            case "pagos": await cargarTabPagos(); break;
            case "controlMensual": await cargarTabControlMensualPg(true); break;
        }
    } catch (e) {
        console.error(`Error cargando tab ${tab}:`, e);
        errorModal(`No se pudo cargar ${PG_TAB_LABELS[tab] || "esta seccion"}.`);
    }
}

/* ---- Contactos ---- */

async function cargarTabContactosPg() {
    PG.contactos = await fetchJsonPg(API_PG.contactosLista(PG.id), { headers: authPg() }) || [];
    limpiarFormContactoPg();
    renderContactosPg();
    PG.tabsLoaded.contactos = true;
}

function renderContactosPg() {
    const items = PG.contactos || [];
    $("#pgContactoCantidad").text(String(items.length));
    const cont = $("#pgListaContactos");
    if (!items.length) {
        cont.html(`<div class="rp-contact-empty">No hay contactos cargados.</div>`);
        return;
    }
    cont.html(items.map(c => {
        const meta = [c.Telefono, c.Email].filter(Boolean).join(" · ");
        const active = c.Id === PG.contactoSelId ? " active" : "";
        return `<div class="rp-contact-item${active}" data-id="${c.Id}">
            <div class="flex-grow-1">
                <div class="rp-contact-item-main"><strong>${escapePg(c.Nombre)}</strong>
                ${c.Puesto ? `<small>${escapePg(c.Puesto)}</small>` : ""}</div>
                ${meta ? `<div class="rp-contact-item-meta">${escapePg(meta)}</div>` : ""}
            </div>
            <div class="rp-contact-item-actions">
                <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-contacto-pg" data-id="${c.Id}"><i class="fa fa-trash"></i></button>
            </div>
        </div>`;
    }).join(""));
}

function escapePg(t) {
    return String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function limpiarFormContactoPg() {
    PG.contactoSelId = 0;
    $("#pgContactoId, #pgContactoNombre, #pgContactoPuesto, #pgContactoTelefono, #pgContactoTelefonoAlt, #pgContactoEmail").val("");
    $("#pgContactoFormTitulo").text("Nuevo contacto");
    renderContactosPg();
}

function seleccionarContactoPg(id) {
    const c = (PG.contactos || []).find(x => x.Id === id);
    if (!c) return;
    PG.contactoSelId = id;
    $("#pgContactoId").val(c.Id);
    $("#pgContactoNombre").val(c.Nombre || "");
    $("#pgContactoPuesto").val(c.Puesto || "");
    $("#pgContactoTelefono").val(c.Telefono || "");
    $("#pgContactoTelefonoAlt").val(c.TelefonoAlt || "");
    $("#pgContactoEmail").val(c.Email || "");
    $("#pgContactoFormTitulo").text("Editar contacto");
    renderContactosPg();
}

async function guardarContactoPg() {
    const nombre = ($("#pgContactoNombre").val() || "").trim();
    if (!nombre) { errorModal("El nombre del contacto es obligatorio."); return; }

    const idContacto = parseInt($("#pgContactoId").val(), 10) || 0;
    const modelo = {
        Id: idContacto,
        IdProveedor: PG.id,
        Nombre: nombre,
        Puesto: $("#pgContactoPuesto").val() || null,
        Telefono: $("#pgContactoTelefono").val() || null,
        TelefonoAlt: $("#pgContactoTelefonoAlt").val() || null,
        Email: $("#pgContactoEmail").val() || null
    };

    const esNuevo = !modelo.Id;
    const data = await fetchJsonPg(esNuevo ? API_PG.contactosInsertar : API_PG.contactosActualizar, {
        method: esNuevo ? "POST" : "PUT",
        headers: authPg(),
        body: JSON.stringify(modelo)
    });

    if (!data?.valor) { errorModal(data?.mensaje || "No se pudo guardar."); return; }
    exitoModal(data.mensaje || "Contacto guardado.");
    PG.tabsLoaded.contactos = false;
    await cargarTabContactosPg();
}

async function eliminarContactoPg(id) {
    const ok = typeof confirmarModal === "function"
        ? await confirmarModal("Eliminar este contacto?")
        : confirm("Eliminar este contacto?");
    if (!ok) return;

    const data = await fetchJsonPg(API_PG.contactosEliminar(id), { method: "DELETE", headers: authPg() });
    if (!data?.valor) { errorModal(data?.mensaje || "No se pudo eliminar."); return; }
    exitoModal(data.mensaje || "Contacto eliminado.");
    PG.tabsLoaded.contactos = false;
    await cargarTabContactosPg();
}

/* ---- Cuenta corriente ---- */

function obtenerFiltroCcPg(extra = {}) {
    return Object.assign({
        IdProveedor: PG.id,
        FechaDesde: $("#pgCcDesde").val() || null,
        FechaHasta: $("#pgCcHasta").val() || null,
        TipoMovimiento: $("#pgCcTipo").val() || null,
        Texto: ($("#pgCcTexto").val() || "").trim() || null
    }, extra);
}

async function cargarTabCuentaCorriente(force) {
    if (force) PG.tabsLoaded.cuentaCorriente = false;

    const filtro = obtenerFiltroCcPg();
    const [movs, res] = await Promise.all([
        fetchJsonPg(API_PG.ccMovimientos, { method: "POST", headers: authPg(), body: JSON.stringify(filtro) }),
        fetchJsonPg(API_PG.ccResumen, { method: "POST", headers: authPg(), body: JSON.stringify(filtro) })
    ]);

    if (res) {
        $("#pgSaldoAnterior").text(fmtMoneyPg(res.SaldoAnterior));
        $("#pgDebe").text(fmtMoneyPg(res.Debe));
        $("#pgHaber").text(fmtMoneyPg(res.Haber));
        $("#pgSaldoActual").text(fmtMoneyPg(res.SaldoActual));
    }

    const data = (movs || []).filter(x => x.Id > 0);

    configurarGrillaPg("cuentaCorriente", "#grd_CuentaCorrientePg", data, [
        columnaGridAcciones(null, "Proveedores CC", (id, type, row) => {
            if (!row.PuedeEliminar) return "";
            return `<button type="button" class="btn btn-sm btn-outline-danger" onclick="eliminarMovCcPg(${id})"><i class="fa fa-trash"></i></button>`;
        }),
        columnaGridId(),
        { data: "Fecha", render: d => formatearFechaPg(d) },
        { data: "TipoMovimiento" },
        { data: "Concepto" },
        { data: "Debe", className: "text-end", render: d => fmtMoneyPg(d) },
        { data: "Haber", className: "text-end", render: d => fmtMoneyPg(d) },
        { data: "Saldo", className: "text-end", render: d => fmtMoneyPg(d) }
    ]);

    PG.tabsLoaded.cuentaCorriente = true;
}

window.eliminarMovCcPg = async function (id) {
    const ok = typeof confirmarModal === "function"
        ? await confirmarModal("Eliminar este movimiento?")
        : confirm("Eliminar este movimiento?");
    if (!ok) return;

    const data = await fetchJsonPg(API_PG.ccEliminar(id), { method: "DELETE", headers: authPg() });
    if (!data?.valor) { errorModal(data?.mensaje || "No se pudo eliminar."); return; }
    exitoModal(data.mensaje || "Movimiento eliminado.");
    PG.tabsLoaded.cuentaCorriente = false;
    PG.tabsLoaded.pagos = false;
    await cargarTabCuentaCorriente(true);
    if ($("#tabPagosPg").hasClass("active")) await cargarTabPagos(true);
};

function abrirModalPagoPg() {
    $("#pgPagoFecha").val(new Date().toISOString().slice(0, 10));
    $("#pgPagoImporte, #pgPagoConcepto").val("");
    $("#pgPagoConcepto").val("Pago a proveedor");
    filtrarCuentasPorSucursalPg();
    PG.modalPago?.show();
}

function abrirModalAjustePg() {
    $("#pgAjusteFecha").val(new Date().toISOString().slice(0, 10));
    $("#pgAjusteDebe, #pgAjusteHaber, #pgAjusteConcepto").val("");
    PG.modalAjuste?.show();
}

async function confirmarPagoPg() {
    const importe = typeof parseNumero === "function" ? parseNumero($("#pgPagoImporte").val()) : parseFloat($("#pgPagoImporte").val()) || 0;
    const idCuenta = parseInt($("#pgPagoCuenta").val(), 10) || 0;
    const concepto = ($("#pgPagoConcepto").val() || "").trim() || "Pago a proveedor";

    if (importe <= 0 || !idCuenta) {
        errorModal("Indique importe y cuenta.");
        return;
    }

    const data = await fetchJsonPg(API_PG.ccRegistrarPago, {
        method: "POST",
        headers: authPg(),
        body: JSON.stringify({
            IdProveedor: PG.id,
            IdCuenta: idCuenta,
            Fecha: $("#pgPagoFecha").val() || new Date().toISOString().slice(0, 10),
            Concepto: concepto,
            Importe: importe
        })
    });

    if (!data?.valor) { errorModal(data?.mensaje || "No se pudo registrar."); return; }
    exitoModal(data.mensaje || "Pago registrado.");
    PG.modalPago?.hide();
    PG.tabsLoaded.cuentaCorriente = false;
    PG.tabsLoaded.pagos = false;
    if ($("#tabCcPg").hasClass("active")) await cargarTabCuentaCorriente(true);
    if ($("#tabPagosPg").hasClass("active")) await cargarTabPagos(true);
}

async function confirmarAjustePg() {
    const parseNum = v => typeof parseNumero === "function" ? parseNumero(v) : parseFloat(v) || 0;
    const debe = parseNum($("#pgAjusteDebe").val());
    const haber = parseNum($("#pgAjusteHaber").val());
    const concepto = ($("#pgAjusteConcepto").val() || "").trim();

    if (!concepto || (debe <= 0 && haber <= 0)) {
        errorModal("Indique concepto y debe o haber.");
        return;
    }

    const data = await fetchJsonPg(API_PG.ccRegistrarAjuste, {
        method: "POST",
        headers: authPg(),
        body: JSON.stringify({
            IdProveedor: PG.id,
            Fecha: $("#pgAjusteFecha").val() || new Date().toISOString().slice(0, 10),
            Concepto: concepto,
            Debe: debe,
            Haber: haber
        })
    });

    if (!data?.valor) { errorModal(data?.mensaje || "No se pudo registrar."); return; }
    exitoModal(data.mensaje || "Ajuste registrado.");
    PG.modalAjuste?.hide();
    PG.tabsLoaded.cuentaCorriente = false;
    await cargarTabCuentaCorriente(true);
}

/* ---- Compras ---- */

async function cargarTabCompras(force) {
    if (force) PG.tabsLoaded.compras = false;

    const filtro = {
        IdProveedor: PG.id,
        FechaDesde: null,
        FechaHasta: null,
        IdSucursal: null,
        Texto: null
    };

    const data = await fetchJsonPg(API_PG.comprasLista, {
        method: "POST",
        headers: authPg(),
        body: JSON.stringify(filtro)
    }) || [];

    $("#pgKpiComprasCant").text(String(data.length));
    $("#pgKpiComprasTotal").text(fmtMoneyPg(data.reduce((s, x) => s + Number(x.ImporteTotal || 0), 0)));
    $("#pgKpiComprasItems").text(String(data.reduce((s, x) => s + Number(x.CantidadProductos || 0), 0)));

    configurarGrillaPg("compras", "#grd_ComprasPg", data, [
        columnaGridAcciones(null, "Compras", (id) =>
            `<div class="rp-row-actions"><a class="btn btn-sm rp-act rp-act-view" href="${API_PG.compraNuevoModif(id, PG.id)}" title="Ver / Editar"><i class="fa fa-pencil-square-o"></i></a></div>`),
        columnaGridId(),
        { data: "Fecha", render: d => formatearFechaPg(d) },
        { data: "Sucursal" },
        { data: "CantidadProductos", className: "text-center" },
        { data: "ImporteTotal", className: "text-end", render: d => fmtMoneyPg(d) },
        { data: "TotalPagado", className: "text-end", render: d => fmtMoneyPg(d) },
        { data: "SaldoPendiente", className: "text-end", render: d => fmtMoneyPg(d) }
    ], { order: [[2, "desc"]] });

    PG.tabsLoaded.compras = true;
}

/* ---- Pagos ---- */

async function cargarTabPagos(force) {
    if (force) PG.tabsLoaded.pagos = false;

    const movs = await fetchJsonPg(API_PG.ccMovimientos, {
        method: "POST",
        headers: authPg(),
        body: JSON.stringify(obtenerFiltroCcPg({ TipoMovimiento: "PAGO" }))
    }) || [];

    const data = movs.filter(x => x.Id > 0);

    configurarGrillaPg("pagos", "#grd_PagosPg", data, [
        columnaGridAcciones(null, "Proveedores CC", (id, type, row) => {
            if (!row.PuedeEliminar) return "";
            return `<button type="button" class="btn btn-sm btn-outline-danger" onclick="eliminarMovCcPg(${id})"><i class="fa fa-trash"></i></button>`;
        }),
        columnaGridId(),
        { data: "Fecha", render: d => formatearFechaPg(d) },
        { data: "Concepto" },
        { data: "Haber", className: "text-end", render: d => fmtMoneyPg(d) }
    ]);

    PG.tabsLoaded.pagos = true;
}

/* ---- Vista tabla / cards ---- */

function initViewModePg() {
    if (typeof RpGridView === "undefined") return;

    Object.keys(PG_CARD_SCHEMAS).forEach(key => {
        RpGridView.registerSchema(`pg_${key}`, Object.assign({}, PG_CARD_SCHEMAS[key], {
            manualRender: true,
            dblClick: key === "compras" ? r => { window.location.href = API_PG.compraNuevoModif(r.Id, PG.id); } : null
        }));
    });

    PG.viewPref = RpGridView.getPref();
    RpGridView.applyModeToRoot($(".pg-page"), PG.viewPref);
    RpGridView.syncSwitchUi(PG.viewPref);
}

function debeMostrarTablaPg() {
    return typeof RpGridView !== "undefined" && RpGridView.debeMostrarTabla(PG.viewPref || RpGridView.getPref());
}

function aplicarModoVistaPg() {
    if (typeof RpGridView === "undefined") return;
    RpGridView.applyModeToRoot($(".pg-page"), PG.viewPref);
    Object.keys(PG.grids).forEach(k => {
        if (debeMostrarTablaPg() && PG.listMeta[k] && !PG.grids[k]) initDataTablePg(k);
    });
}

function renderCardsPg(key) {
    if (typeof RpGridView === "undefined") return;
    const meta = PG.listMeta[key];
    if (!meta) return;
    const schema = PG_CARD_SCHEMAS[key];
    if (!schema) return;

    const $grid = $(meta.cardsSelector || `#pgCards_${key}`);
    if (!$grid.length) return;

    const data = meta.data || [];
    if (!data.length) {
        $grid.html(`<div class="cg-cards-empty"><i class="fa fa-inbox"></i> Sin registros.</div>`);
        return;
    }

    $grid.html(data.map(row => {
        const title = typeof schema.title === "function" ? schema.title(row) : "";
        const subtitle = typeof schema.subtitle === "function" ? schema.subtitle(row) : "";
        const badge = schema.badge ? schema.badge(row) : "";
        const tone = schema.tone ? schema.tone(row) : "";
        const fields = (schema.fields || []).map(f =>
            `<div class="cg-card-field ${f.full ? "cg-card-field--full" : ""}"><span>${f.label}</span><strong class="${f.cls || ""}">${escapePg(typeof f.value === "function" ? f.value(row) : row[f.value])}</strong></div>`
        ).join("");
        const actions = schema.actions ? schema.actions(row) : "";
        return `<article class="cg-data-card rp-card-selectable ${tone}" tabindex="0" role="button">
            <div class="cg-data-card-head">
                <div class="cg-data-card-head-text">
                    <div class="cg-data-card-title">${escapePg(title)}</div>
                    <div class="cg-data-card-sub">${escapePg(subtitle)}</div>
                </div>
                ${badge ? `<span class="cg-data-card-badge">${escapePg(badge)}</span>` : ""}
            </div>
            <div class="cg-data-card-body">${fields}</div>
            ${actions ? `<div class="cg-data-card-foot">${actions}</div>` : ""}
        </article>`;
    }).join(""));
}

function initDataTablePg(key) {
    const meta = PG.listMeta?.[key];
    if (!meta?.selector || PG.grids[key]) return;

    PG.grids[key] = $(meta.selector).DataTable({
        data: meta.data,
        columns: meta.columns,
        language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        autoWidth: false,
        scrollX: true,
        scrollCollapse: true,
        orderCellsTop: true,
        fixedHeader: true,
        pageLength: meta.opts?.pageLength ?? 10,
        order: meta.opts?.order || [[1, "desc"]],
        columnDefs: typeof columnDefsGridLista === "function" ? columnDefsGridLista() : [],
        initComplete: async function () {
            ajustarColumnasGrillaLista(this.api(), meta.selector);
        }
    });
}

function configurarGrillaPg(key, selector, data, columns, opts = {}) {
    PG.listMeta[key] = {
        data,
        cardsSelector: `#pgCards_${key}`,
        selector,
        columns,
        opts
    };

    if (PG.grids[key]) {
        PG.grids[key].clear().rows.add(data).draw(false);
        if (debeMostrarTablaPg()) RpGridView.programarAjuste();
    } else if (debeMostrarTablaPg()) {
        initDataTablePg(key);
    }

    renderCardsPg(key);
}

function formatearFechaPg(d) {
    if (!d) return "";
    try {
        return new Date(d).toLocaleDateString("es-AR");
    } catch { return d; }
}

function fmtMoneyPg(n) {
    if (typeof formatearMoneda === "function") return formatearMoneda(n);
    const v = Number(n) || 0;
    return v.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}
