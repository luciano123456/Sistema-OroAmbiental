/* Control mensual proveedores - UI (estilo Clientes) */

const PG_CM_MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const PG_CM_MESES_LARGO = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function initControlMensualPg() {
    const el = document.getElementById("modalControlMensualPg");
    if (el) PG.modalControlMensual = new bootstrap.Modal(el);

    initFiltrosControlPg();
    $("#pgCmSinCompra").on("change", syncSinCompraUiPg);
    $("#btnRefreshControlMensualPg").on("click", () => cargarTabControlMensualPg(true));
    $("#tabControlMensualPg").on("click", ".cg-cm-chip", function () {
        toggleFiltroControlPg($(this).data("tipo"), parseInt($(this).data("val"), 10));
    });
    $(".pg-cm-preset-meses").on("click", function () {
        aplicarPresetMesesPg(String($(this).data("meses") || ""));
    });
    $("#btnControlAniosRecientesPg").on("click", aplicarPresetAniosRecientesPg);
    $("#btnGuardarControlMensualPg").on("click", busyHandler(guardarControlMensualPg));
    $("#pgControlMensualBody").on("click", "tr[data-mes]", function () {
        abrirModalControlMensualPg(Number($(this).data("anio")), Number($(this).data("mes")));
    });

    window.abrirModalControlMensual = abrirModalControlMensualPg;
}

function initFiltrosControlPg() {
    const $anios = $("#pgControlAniosChips");
    const $meses = $("#pgControlMesesChips");
    if (!$anios.length || !$meses.length) return;

    const actual = new Date().getFullYear();
    PG.controlFiltros.anios = [actual];
    PG.controlFiltros.meses = [];

    $anios.empty();
    for (let y = actual; y >= actual - 8; y--) {
        $anios.append(`<button type="button" class="cg-cm-chip cg-cm-chip--anio" data-tipo="anio" data-val="${y}">${y}</button>`);
    }

    $meses.empty();
    for (let m = 1; m <= 12; m++) {
        $meses.append(`<button type="button" class="cg-cm-chip cg-cm-chip--mes" data-tipo="mes" data-val="${m}" title="${PG_CM_MESES_LARGO[m]}">${PG_CM_MESES[m - 1]}</button>`);
    }

    renderEstadoFiltrosControlPg(false);
}

function toggleFiltroControlPg(tipo, val) {
    if (!val || Number.isNaN(val)) return;
    if (tipo === "anio") {
        const idx = PG.controlFiltros.anios.indexOf(val);
        if (idx >= 0) PG.controlFiltros.anios.splice(idx, 1);
        else PG.controlFiltros.anios.push(val);
        PG.controlFiltros.anios.sort((a, b) => b - a);
    } else if (tipo === "mes") {
        const idx = PG.controlFiltros.meses.indexOf(val);
        if (idx >= 0) PG.controlFiltros.meses.splice(idx, 1);
        else PG.controlFiltros.meses.push(val);
        PG.controlFiltros.meses.sort((a, b) => a - b);
    }
    renderEstadoFiltrosControlPg(true);
}

function renderEstadoFiltrosControlPg(refreshData = true) {
    const { anios, meses } = PG.controlFiltros;
    $("#pgControlAniosChips .cg-cm-chip").each(function () {
        const v = parseInt($(this).data("val"), 10);
        $(this).toggleClass("is-active", anios.includes(v));
    });
    $("#pgControlMesesChips .cg-cm-chip").each(function () {
        const v = parseInt($(this).data("val"), 10);
        $(this).toggleClass("is-active", meses.includes(v));
    });

    const txtAnios = anios.length ? `${anios.length} ano${anios.length === 1 ? "" : "s"}` : "Sin anos";
    const txtMeses = meses.length ? `${meses.length} mes${meses.length === 1 ? "" : "es"}` : "Todos los meses";
    $("#pgControlFiltroResumen").text(`${txtAnios} · ${txtMeses}`);
    $("#pgControlCount").text(String((anios.length || 1) * (meses.length || 12)));

    if (refreshData) cargarTabControlMensualPg(true);
}

function aplicarPresetMesesPg(csv) {
    if (csv === "all") PG.controlFiltros.meses = [];
    else PG.controlFiltros.meses = csv.split(",").map(x => parseInt(x, 10)).filter(x => x >= 1 && x <= 12);
    renderEstadoFiltrosControlPg(true);
}

function aplicarPresetAniosRecientesPg() {
    const actual = new Date().getFullYear();
    PG.controlFiltros.anios = [actual, actual - 1, actual - 2];
    renderEstadoFiltrosControlPg(true);
}

async function cargarTabControlMensualPg(force) {
    if (PG.id <= 0) return;
    if (force) PG.tabsLoaded.controlMensual = false;
    if (PG.tabsLoaded.controlMensual && !force) return;

    const anios = PG.controlFiltros.anios.length ? PG.controlFiltros.anios : [new Date().getFullYear()];
    const meses = PG.controlFiltros.meses;

    try {
        const data = await fetchJsonPg(API_PG.controlMensual(PG.id, anios, meses), { headers: authPg() });
        PG.controlFiltrado = data;
        renderControlMensualPg(data);
    } catch (e) {
        console.error(e);
        PG.controlFiltrado = { Filas: [] };
        renderControlMensualPg(PG.controlFiltrado);
        $("#pgControlError").removeClass("d-none").find("span").text("No se pudo cargar el control mensual.");
    }

    PG.tabsLoaded.controlMensual = true;
}

function renderControlMensualPg(data) {
    const filas = data?.Filas || data?.filas || [];
    const mostrarAnio = (PG.controlFiltros.anios?.length || 0) !== 1;

    $("#pgControlTotalDebe").text(fmtMoneyPg(data?.TotalDebe ?? data?.totalDebe ?? 0));
    $("#pgControlTotalHaber").text(fmtMoneyPg(data?.TotalHaber ?? data?.totalHaber ?? 0));
    $("#pgControlSaldoPeriodo").text(fmtMoneyPg(data?.TotalSaldo ?? data?.totalSaldo ?? 0));
    $("#pgControlSaldoActual").text(fmtMoneyPg(data?.SaldoActual ?? data?.saldoActual ?? 0));

    if (data?.DatosParciales || data?.datosParciales) {
        $("#pgControlError").removeClass("d-none");
    } else {
        $("#pgControlError").addClass("d-none");
    }

    const tbody = $("#pgControlMensualBody");
    $("#tblControlMensualPg").toggleClass("cg-cm-show-anio", !!mostrarAnio);

    if (!filas.length) {
        tbody.html(`<tr class="cg-cm-empty"><td colspan="10" class="text-center py-4"><i class="fa fa-calendar"></i> Sin datos para los filtros elegidos.</td></tr>`);
        renderControlMensualCardsPg([], mostrarAnio);
        return;
    }

    tbody.html(filas.map(m => {
        const anio = m.Anio || m.anio;
        const saldo = Number(m.Saldo ?? m.saldo) || 0;
        const saldoClass = saldo > 0 ? "cg-cm-saldo-neg" : (saldo < 0 ? "cg-cm-saldo-pos" : "cg-cm-saldo-cero");
        const sinCompra = m.SinCompra === true || m.sinCompra === true;
        return `
            <tr class="${sinCompra ? "cg-cm-sin-entrega" : ""}" data-anio="${anio}" data-mes="${m.Mes || m.mes}" role="button">
                <td class="cg-col-anio cg-cm-mes">${anio}</td>
                <td class="cg-cm-mes">${escapeHtmlPg(m.MesNombre || m.mesNombre || PG_CM_MESES_LARGO[m.Mes || m.mes] || "")}</td>
                <td class="cg-cm-num">${m.CantCompras ?? m.cantCompras ?? 0}</td>
                <td class="cg-cm-num cg-cm-grp-start">${fmtMoneyPg(m.TotalCompras ?? m.totalCompras)}</td>
                <td class="cg-cm-num">${fmtMoneyPg(m.TotalPagos ?? m.totalPagos)}</td>
                <td class="cg-cm-num cg-cm-debe cg-cm-grp-start">${fmtMoneyPg(m.Debe ?? m.debe)}</td>
                <td class="cg-cm-num cg-cm-haber">${fmtMoneyPg(m.Haber ?? m.haber)}</td>
                <td class="cg-cm-num ${saldoClass} cg-cm-th-saldo">${fmtMoneyPg(saldo)}</td>
                <td class="cg-cm-flag">${sinCompra ? '<i class="fa fa-times"></i>' : ""}</td>
                <td class="cg-cm-obs" title="${escapeHtmlPg(m.Observaciones || m.observaciones || "")}">${escapeHtmlPg(truncarPg(m.Observaciones || m.observaciones, 28))}</td>
            </tr>`;
    }).join(""));

    renderControlMensualCardsPg(filas, mostrarAnio);
}

function renderControlMensualCardsPg(filas, mostrarAnio) {
    const $grid = $("#pgCards_controlMensual");
    if (!$grid.length) return;

    if (!filas.length) {
        $grid.html(`<div class="cg-cards-empty"><i class="fa fa-calendar"></i> No hay datos para los filtros elegidos.</div>`);
        return;
    }

    $grid.html(filas.map(m => {
        const anio = m.Anio || m.anio;
        const saldo = Number(m.Saldo ?? m.saldo) || 0;
        const saldoCls = saldo > 0 ? "cg-val-debe" : (saldo < 0 ? "cg-val-haber" : "");
        const sinCompra = m.SinCompra === true || m.sinCompra === true;
        return `
            <article class="cg-data-card cg-data-card--cm rp-card-selectable pg-cm-card ${sinCompra ? "is-warn" : ""}"
                     data-anio="${anio}" data-mes="${m.Mes || m.mes}" tabindex="0" role="button">
                <div class="cg-data-card-head">
                    <div class="cg-data-card-head-text">
                        <div class="cg-data-card-title">${escapeHtmlPg(m.MesNombre || m.mesNombre || "")}${mostrarAnio ? ` ${anio}` : ""}</div>
                        <div class="cg-data-card-sub">${m.CantCompras ?? m.cantCompras ?? 0} compra(s)</div>
                    </div>
                    ${sinCompra ? `<span class="cg-data-card-badge cg-data-card-badge--warn">Sin compra</span>` : ""}
                </div>
                <div class="cg-data-card-body">
                    <div class="cg-card-field"><span>Compras</span><strong>${fmtMoneyPg(m.TotalCompras ?? m.totalCompras)}</strong></div>
                    <div class="cg-card-field"><span>Pagos</span><strong class="cg-val-haber">${fmtMoneyPg(m.TotalPagos ?? m.totalPagos)}</strong></div>
                    <div class="cg-card-field"><span>Debe</span><strong class="cg-val-debe">${fmtMoneyPg(m.Debe ?? m.debe)}</strong></div>
                    <div class="cg-card-field"><span>Haber</span><strong class="cg-val-haber">${fmtMoneyPg(m.Haber ?? m.haber)}</strong></div>
                    <div class="cg-card-field cg-card-field--full"><span>Saldo</span><strong class="${saldoCls}">${fmtMoneyPg(saldo)}</strong></div>
                </div>
            </article>`;
    }).join(""));

    if (window.RpGridView?.restoreCardSelection) RpGridView.restoreCardSelection($grid);
}

function syncSinCompraUiPg() {
    const activo = $("#pgCmSinCompra").is(":checked");
    $("#lblPgCmSinCompra").text(activo ? "Mes sin compra" : "Con compra este mes");
    $("#pgCmSinCompraBox").toggleClass("is-active", activo);
}

function abrirModalControlMensualPg(anio, mes) {
    const filas = PG.controlFiltrado?.Filas || PG.controlFiltrado?.filas || [];
    const m = filas.find(x => (x.Anio || x.anio) === anio && (x.Mes || x.mes) === mes);
    if (!m) return;

    $("#pgCmAnio").val(anio);
    $("#pgCmMes").val(m.Mes || m.mes);
    $("#pgCmMesTitulo").text(m.MesNombre || m.mesNombre || `${PG_CM_MESES_LARGO[mes]} ${anio}`);
    $("#pgCmSinCompra").prop("checked", !!(m.SinCompra ?? m.sinCompra));
    $("#pgCmObservaciones").val(m.Observaciones || m.observaciones || "");
    syncSinCompraUiPg();
    PG.modalControlMensual?.show();
}

async function guardarControlMensualPg() {
    const mes = parseInt($("#pgCmMes").val(), 10);
    const anio = parseInt($("#pgCmAnio").val(), 10);
    const filas = PG.controlFiltrado?.Filas || PG.controlFiltrado?.filas || [];
    const existente = filas.find(x => (x.Anio || x.anio) === anio && (x.Mes || x.mes) === mes);

    const payload = {
        Id: existente?.IdControl || existente?.idControl || 0,
        IdProveedor: PG.id,
        Anio: anio,
        Mes: mes,
        SinCompra: $("#pgCmSinCompra").is(":checked"),
        Observaciones: ($("#pgCmObservaciones").val() || "").trim() || null
    };

    const data = await fetchJsonPg(API_PG.guardarControlMensual, {
        method: "POST",
        headers: authPg(),
        body: JSON.stringify(payload)
    });

    if (!data?.valor) {
        errorModal(data?.mensaje || "No se pudo guardar.");
        return;
    }

    exitoModal(data.mensaje || "Control guardado.");
    PG.modalControlMensual?.hide();
    await cargarTabControlMensualPg(true);
}

function escapeHtmlPg(s) {
    return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function truncarPg(s, n) {
    const t = String(s || "");
    return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}
