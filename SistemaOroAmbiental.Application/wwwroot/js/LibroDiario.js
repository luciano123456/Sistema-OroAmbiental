/* Libro Diario - Caja efectivo / Caja bancaria */

const LD = {
    movimientos: [],
    conceptos: [],
    esBancario: false,
    /** 'debe' | 'haber' - lado activo del importe (mutuamente excluyentes) */
    ladoImporte: null
};

let modalLibroDiario;
let acTimer = null;

const API_LD = {
    conceptos: "/LibroDiario/Conceptos?soloActivos=true",
    movimientos: "/LibroDiario/Movimientos",
    resumen: "/LibroDiario/Resumen",
    movimiento: id => `/LibroDiario/Movimiento?id=${id}`,
    guardar: "/LibroDiario/Guardar",
    eliminar: id => `/LibroDiario/Eliminar?id=${id}`,
    clientes: buscar => `/LibroDiario/AutocompleteClientes?buscar=${encodeURIComponent(buscar || "")}`,
    proveedores: buscar => `/LibroDiario/AutocompleteProveedores?buscar=${encodeURIComponent(buscar || "")}`
};

const authHeadersLd = () => ({
    Authorization: "Bearer " + (token || ""),
    "Content-Type": "application/json"
});

function fmtMoneyLd(n) {
    if (typeof formatearMoneda === "function") return formatearMoneda(Number(n || 0));
    return "$ " + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNumLd(n) {
    if (typeof formatearNumero === "function") return formatearNumero(Number(n || 0));
    return Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function leerNumLd(val) {
    if (typeof leerInputNumerico === "function") return leerInputNumerico(val);
    const n = parseFloat(String(val || "").replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
}

function escapeHtmlLd(s) {
    return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function fmtFechaLd(d) {
    if (!d) return "-";
    const s = String(d).slice(0, 10);
    if (s.length < 10) return s;
    const [y, m, day] = s.split("-");
    return `${day}/${m}/${y}`;
}

function esBancarioActual() {
    return $(".ld-index").data("es-bancario") === 1 || $(".ld-index").data("es-bancario") === "1";
}

function obtenerFiltroLd() {
    return {
        FechaDesde: $("#fDesdeLd").val() || null,
        FechaHasta: $("#fHastaLd").val() || null,
        EsBancario: esBancarioActual(),
        Texto: ($("#fTextoLd").val() || "").trim() || null
    };
}

function terceroTexto(row) {
    if (row.Cliente) return row.Cliente;
    if (row.Proveedor) return row.Proveedor;
    return "-";
}

function recalcTotalModal() {
    const debe = leerNumLd($("#mDebeLd").val());
    const haber = leerNumLd($("#mHaberLd").val());
    const iva = leerNumLd($("#mIvaLd").val());
    const otros = leerNumLd($("#mOtrosImpLd").val());
    const base = debe > 0 ? debe : haber;
    $("#mTotalLd").val(fmtNumLd(base + iva + otros));
}

function recalcIvaModal() {
    const debe = leerNumLd($("#mDebeLd").val());
    const haber = leerNumLd($("#mHaberLd").val());
    const porc = leerNumLd($("#mPorcIvaLd").val());
    const base = debe > 0 ? debe : haber;
    if (porc > 0 && base > 0) {
        $("#mIvaLd").val(fmtNumLd(base * porc / 100));
    }
    recalcTotalModal();
}

function detectarLadoImporteLd() {
    const debe = leerNumLd($("#mDebeLd").val());
    const haber = leerNumLd($("#mHaberLd").val());
    if (debe > 0 && haber <= 0) return "debe";
    if (haber > 0 && debe <= 0) return "haber";
    if (LD.ladoImporte) return LD.ladoImporte;
    return "debe";
}

function aplicarImporteDesdeUnidadesLd() {
    const u = leerNumLd($("#mUnidadesLd").val());
    const p = leerNumLd($("#mPrecioLd").val());
    if (u <= 0 || p <= 0) return;

    const importe = u * p;
    const lado = detectarLadoImporteLd();
    if (lado === "haber") {
        $("#mHaberLd").val(fmtNumLd(importe));
        $("#mDebeLd").val("");
    } else {
        $("#mDebeLd").val(fmtNumLd(importe));
        $("#mHaberLd").val("");
    }
    LD.ladoImporte = lado;
    recalcIvaModal();
}

async function inicializarLibroDiarioModulo() {
    if (window.__LD_READY) return;
    window.__LD_READY = true;

    LD.esBancario = esBancarioActual();
    modalLibroDiario = new bootstrap.Modal(document.getElementById("modalLibroDiario"));

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    $("#fHastaLd").val(hoy.toISOString().slice(0, 10));
    $("#fDesdeLd").val(inicioMes.toISOString().slice(0, 10));
    $("#mFechaLd").val(hoy.toISOString().slice(0, 10));

    await cargarConceptosLd();

    $("#btnFiltrarLd, #btnRefreshLd").off("click.ld").on("click.ld", aplicarFiltrosLd);
    $("#btnLimpiarLd").off("click.ld").on("click.ld", limpiarFiltrosLd);
    $("#btnNuevoLd").off("click.ld").on("click.ld", () => abrirModalLd());
    $("#btnGuardarLd").off("click.ld").on("click.ld", busyHandler(guardarMovimientoLd));
    $("#fTextoLd").off("keydown.ld").on("keydown.ld", e => { if (e.key === "Enter") aplicarFiltrosLd(); });

    $("#btnLdEfectivo, #btnLdBancario").off("click.ldTipo").on("click.ldTipo", function () {
        const bancario = String($(this).data("ld-tipo")) === "1";
        $(".ld-index").attr("data-es-bancario", bancario ? "1" : "0").data("es-bancario", bancario ? 1 : 0);
        $("#btnLdEfectivo, #btnLdBancario").removeClass("active");
        $(this).addClass("active");
        $("#ldTitulo").text(bancario ? "Libro diario operativo — Bancario" : "Libro diario operativo — Efectivo");
        LD.esBancario = bancario;
        aplicarFiltrosLd();
    });

    $("#mUnidadesLd, #mPrecioLd").off("input.ld").on("input.ld", aplicarImporteDesdeUnidadesLd);

    $("#mDebeLd").off("input.ld").on("input.ld", function () {
        if (leerNumLd($(this).val()) > 0) {
            LD.ladoImporte = "debe";
            $("#mHaberLd").val("");
        }
        recalcTotalModal();
    });
    $("#mHaberLd").off("input.ld").on("input.ld", function () {
        if (leerNumLd($(this).val()) > 0) {
            LD.ladoImporte = "haber";
            $("#mDebeLd").val("");
        }
        recalcTotalModal();
    });
    $("#mIvaLd, #mOtrosImpLd").off("input.ld").on("input.ld", recalcTotalModal);
    $("#mPorcIvaLd").off("input.ld").on("input.ld", recalcIvaModal);

    initAutocompleteLd("#mConceptoLd", "#mConceptoSugLd", "#mIdConceptoLd", buscarConceptosLocal, seleccionarConceptoLd);
    initAutocompleteLd("#mClienteLd", "#mClienteSugLd", "#mIdClienteLd", buscarClientesLd, () => { $("#mIdProveedorLd, #mProveedorLd").val(""); });
    initAutocompleteLd("#mProveedorLd", "#mProveedorSugLd", "#mIdProveedorLd", buscarProveedoresLd, () => { $("#mIdClienteLd, #mClienteLd").val(""); });

    $("#tbodyLibroDiario").off("click.ld").on("click.ld", ".btn-edit-ld", function () {
        const id = parseInt($(this).data("id"), 10);
        if (id > 0) abrirModalLd(id);
    });
    $("#tbodyLibroDiario").on("click.ld", ".btn-del-ld", function () {
        const id = parseInt($(this).data("id"), 10);
        if (id > 0) eliminarMovimientoLd(id);
    });

    initFiltrosColumnasLd();
    initLibroDiarioViewMode();

    $(document).off("rpGridViewChanged.ld").on("rpGridViewChanged.ld", actualizarVistaLibroDiario);

    await aplicarFiltrosLd();
}

window.initFinanzasLibro = inicializarLibroDiarioModulo;

if (!window.LD_HUB_MODE) {
    $(document).ready(() => inicializarLibroDiarioModulo());
}

function initLibroDiarioViewMode() {
    if (!window.RpGridView?.registerManualList) return;

    RpGridView.registerManualList("libroDiario", {
        pageRoot: ".ld-index",
        wrap: ".ld-table-wrap",
        getData: movimientosFiltradosLd,
        renderCards: renderCardsLd
    });
}

function actualizarVistaLibroDiario() {
    if (window.RpGridView?.debeMostrarTabla()) return;
    renderCardsLd(movimientosFiltradosLd());
}

function obtenerFiltrosColumnaLd() {
    const filtros = {};
    $("#tblLibroDiario .ld-col-filter").each(function () {
        const col = parseInt($(this).data("col"), 10);
        const val = ($(this).val() || "").trim().toLowerCase();
        if (!isNaN(col) && val) filtros[col] = val;
    });
    return filtros;
}

function textoColumnaLd(row, col) {
    const esSaldoAnt = row.Id === 0;
    switch (col) {
        case 1: return fmtFechaLd(row.Fecha);
        case 2: return row.Concepto || "";
        case 3: return terceroTexto(row);
        case 4: return row.RecorridoTexto || "";
        case 5: return esSaldoAnt ? "" : fmtNumLd(row.Unidades);
        case 6: return esSaldoAnt ? "" : fmtNumLd(row.PrecioUnitario);
        case 7: return esSaldoAnt ? "" : (row.Debe ? fmtNumLd(row.Debe) : "");
        case 8: return esSaldoAnt ? "" : (row.Haber ? fmtNumLd(row.Haber) : "");
        case 9: return esSaldoAnt ? "" : fmtNumLd(row.PorcIva);
        case 10: return esSaldoAnt ? "" : fmtNumLd(row.Iva);
        case 11: return esSaldoAnt ? "" : fmtNumLd(row.OtrosImp);
        case 12: return esSaldoAnt ? "" : fmtNumLd(row.Total);
        case 13: return fmtNumLd(row.Saldo);
        case 14: return row.FormaPago || "";
        default: return "";
    }
}

function movimientoPasaFiltrosLd(row, filtros) {
    for (const [col, needle] of Object.entries(filtros)) {
        const txt = String(textoColumnaLd(row, parseInt(col, 10))).trim().toLowerCase();
        if (!txt.includes(needle)) return false;
    }
    return true;
}

function movimientosFiltradosLd() {
    const filtros = obtenerFiltrosColumnaLd();
    const keys = Object.keys(filtros);
    if (!keys.length) return LD.movimientos || [];
    return (LD.movimientos || []).filter(m => movimientoPasaFiltrosLd(m, filtros));
}

function renderCardsLd(movimientos) {
    const $cards = $("#rpCards_libroDiario");
    if (!$cards.length) return;

    const items = Array.isArray(movimientos) ? movimientos : movimientosFiltradosLd();
    if (!items.length) {
        $cards.html('<div class="rp-cards-empty cg-cards-empty"><i class="fa fa-inbox"></i> Sin movimientos en el periodo</div>');
        return;
    }

    $cards.html(items.map(row => {
        const esSaldoAnt = row.Id === 0;
        const tercero = terceroTexto(row);
        const tone = esSaldoAnt ? "ld-card-saldo-ant" : (row.Debe > 0 ? "ld-card-debe" : (row.Haber > 0 ? "ld-card-haber" : ""));

        if (esSaldoAnt) {
            return `
<article class="rp-data-card cg-data-card ld-mov-card ${tone}" data-row-id="0">
    <div class="rp-data-card-head cg-data-card-head">
        <div>
            <div class="rp-data-card-title cg-data-card-title">Saldo anterior</div>
            <div class="rp-data-card-sub cg-data-card-sub">${fmtFechaLd(row.Fecha)}</div>
        </div>
    </div>
    <div class="rp-data-card-body cg-data-card-body">
        <div class="rp-card-field rp-card-field--full"><span>Saldo</span><strong class="${typeof clsSaldoMoney === "function" ? clsSaldoMoney(row.Saldo) : "ld-val-saldo"}">${fmtNumLd(row.Saldo)}</strong></div>
    </div>
</article>`;
        }

        const acc = `<div class="rp-row-actions">
            <button type="button" class="btn btn-sm rp-act rp-act-edit btn-edit-ld" data-id="${row.Id}" title="Editar"><i class="fa fa-pencil-square-o"></i></button>
            <button type="button" class="btn btn-sm rp-act rp-act-del btn-del-ld" data-id="${row.Id}" title="Eliminar"><i class="fa fa-trash-o"></i></button>
        </div>`;

        return `
<article class="rp-data-card cg-data-card ld-mov-card ${tone} rp-card-selectable" data-row-id="${row.Id}" tabindex="0">
    <div class="rp-data-card-head cg-data-card-head">
        <div class="ld-card-head-text">
            <div class="rp-data-card-title cg-data-card-title">${escapeHtmlLd(row.Concepto)}</div>
            <div class="rp-data-card-sub cg-data-card-sub">${escapeHtmlLd(tercero)} · ${fmtFechaLd(row.Fecha)}</div>
        </div>
        <span class="rp-data-card-badge cg-data-card-badge">#${row.Id}</span>
    </div>
    <div class="rp-data-card-body cg-data-card-body">
        <div class="rp-card-field"><span>Recorrido</span><strong>${escapeHtmlLd(row.RecorridoTexto || "-")}</strong></div>
        <div class="rp-card-field"><span>Unid.</span><strong>${fmtNumLd(row.Unidades)}</strong></div>
        <div class="rp-card-field"><span>P.U.</span><strong>${fmtNumLd(row.PrecioUnitario)}</strong></div>
        <div class="rp-card-field"><span>Debe</span><strong class="ld-val-debe">${row.Debe ? fmtNumLd(row.Debe) : "-"}</strong></div>
        <div class="rp-card-field"><span>Haber</span><strong class="ld-val-haber">${row.Haber ? fmtNumLd(row.Haber) : "-"}</strong></div>
        <div class="rp-card-field"><span>Total</span><strong>${fmtNumLd(row.Total)}</strong></div>
        <div class="rp-card-field rp-card-field--full"><span>Saldo</span><strong class="${typeof clsSaldoMoney === "function" ? clsSaldoMoney(row.Saldo) : "ld-val-saldo"}">${fmtNumLd(row.Saldo)}</strong></div>
        <div class="rp-card-field rp-card-field--full"><span>Forma pago</span><strong>${escapeHtmlLd(row.FormaPago || "-")}</strong></div>
    </div>
    <div class="rp-data-card-foot cg-data-card-foot">${acc}</div>
</article>`;
    }).join(""));

    $cards.off("click.ldCardEdit").on("click.ldCardEdit", ".btn-edit-ld", function (e) {
        e.stopPropagation();
        const id = parseInt($(this).data("id"), 10);
        if (id > 0) abrirModalLd(id);
    });
    $cards.off("click.ldCardDel").on("click.ldCardDel", ".btn-del-ld", function (e) {
        e.stopPropagation();
        const id = parseInt($(this).data("id"), 10);
        if (id > 0) eliminarMovimientoLd(id);
    });

    if (window.RpGridView?.restoreCardSelection) {
        RpGridView.restoreCardSelection($cards);
    }
}

function initFiltrosColumnasLd() {
    $("#tblLibroDiario").on("keyup change", ".ld-col-filter", function () {
        filtrarFilasLibroDiario();
    });
}

function filtrarFilasLibroDiario() {
    const filtros = obtenerFiltrosColumnaLd();

    $("#tbodyLibroDiario tr").each(function () {
        const $tr = $(this);
        if ($tr.hasClass("ld-empty")) {
            $tr.show();
            return;
        }
        const id = parseInt($tr.attr("data-ld-id"), 10);
        const row = (LD.movimientos || []).find(m => m.Id === id);
        if (!row) { $tr.show(); return; }
        $tr.toggle(movimientoPasaFiltrosLd(row, filtros));
    });

    actualizarVistaLibroDiario();
}

async function cargarConceptosLd() {
    const r = await fetch(API_LD.conceptos, { headers: authHeadersLd() });
    if (!r.ok) return;
    LD.conceptos = await r.json();
}

function buscarConceptosLocal(term) {
    const t = (term || "").toLowerCase();
    return LD.conceptos
        .filter(c => !t || (c.Nombre || "").toLowerCase().includes(t))
        .slice(0, 15)
        .map(c => ({ Id: c.Id, Nombre: c.Nombre, Extra: fmtMoneyLd(c.PrecioUnitario) }));
}

function seleccionarConceptoLd(item) {
    const c = LD.conceptos.find(x => x.Id === item.Id);
    if (!c) return;
    $("#mIdConceptoLd").val(c.Id);
    $("#mConceptoLd").val(c.Nombre);
    if (c.PrecioUnitario > 0) {
        $("#mPrecioLd").val(fmtNumLd(c.PrecioUnitario));
        if (leerNumLd($("#mUnidadesLd").val()) > 0) {
            aplicarImporteDesdeUnidadesLd();
        }
    }
}

async function buscarClientesLd(term) {
    const r = await fetch(API_LD.clientes(term), { headers: authHeadersLd() });
    if (!r.ok) return [];
    const data = await r.json();
    return data.map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

async function buscarProveedoresLd(term) {
    const r = await fetch(API_LD.proveedores(term), { headers: authHeadersLd() });
    if (!r.ok) return [];
    const data = await r.json();
    return data.map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

function initAutocompleteLd(inputSel, listSel, hiddenSel, fetchFn, onSelectExtra) {
    const $input = $(inputSel);
    const $list = $(listSel);
    const $hidden = $(hiddenSel);

    $input.on("input", () => {
        $hidden.val("");
        clearTimeout(acTimer);
        acTimer = setTimeout(async () => {
            const term = ($input.val() || "").trim();
            const items = await fetchFn(term);
            renderAcListLd($list, items, item => {
                $hidden.val(item.Id);
                $input.val(item.Nombre);
                $list.addClass("d-none").empty();
                onSelectExtra?.(item);
            });
        }, 250);
    });

    $input.on("focus", () => {
        if ($list.children().length) $list.removeClass("d-none");
    });

    $(document).on("click", e => {
        if (!$(e.target).closest(".ld-ac-wrap").length) {
            $list.addClass("d-none");
        }
    });
}

function renderAcListLd($list, items, onPick) {
    if (!items.length) {
        $list.addClass("d-none").empty();
        return;
    }
    const html = items.map(it => `
        <button type="button" class="ld-ac-item" data-id="${it.Id}">
            <span>${escapeHtmlLd(it.Nombre)}</span>
            ${it.Extra ? `<small>${escapeHtmlLd(it.Extra)}</small>` : ""}
        </button>
    `).join("");
    $list.html(html).removeClass("d-none");
    $list.find(".ld-ac-item").on("click", function () {
        const id = parseInt($(this).data("id"), 10);
        const item = items.find(x => x.Id === id);
        if (item) onPick(item);
    });
}

async function aplicarFiltrosLd() {
    const filtro = obtenerFiltroLd();
    const headers = authHeadersLd();

    const [rMov, rRes] = await Promise.all([
        fetch(API_LD.movimientos, { method: "POST", headers, body: JSON.stringify(filtro) }),
        fetch(API_LD.resumen, { method: "POST", headers, body: JSON.stringify(filtro) })
    ]);

    if (rMov.ok) LD.movimientos = await rMov.json();
    else LD.movimientos = [];

    if (rRes.ok) {
        const res = await rRes.json();
        $("#kpiSaldoAnteriorLd").text(fmtMoneyLd(res.SaldoAnterior)).attr("class", "val " + (typeof clsSaldoMoney === "function" ? clsSaldoMoney(res.SaldoAnterior) : ""));
        $("#kpiTotalDebeLd").text(fmtMoneyLd(res.TotalDebe)).attr("class", "val ld-val-debe");
        $("#kpiTotalHaberLd").text(fmtMoneyLd(res.TotalHaber)).attr("class", "val ld-val-haber");
        $("#kpiSaldoFinalLd").text(fmtMoneyLd(res.SaldoFinal)).attr("class", "val " + (typeof clsSaldoMoney === "function" ? clsSaldoMoney(res.SaldoFinal) : "ld-val-saldo"));
        $("#kpiCantidadLd").text(res.CantidadMovimientos ?? 0);
    }

    renderTablaLd();
    actualizarVistaLibroDiario();
}

function limpiarFiltrosLd() {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    $("#fDesdeLd").val(inicioMes.toISOString().slice(0, 10));
    $("#fHastaLd").val(hoy.toISOString().slice(0, 10));
    $("#fTextoLd").val("");
    aplicarFiltrosLd();
}

function renderTablaLd() {
    const $tb = $("#tbodyLibroDiario");
    if (!LD.movimientos.length) {
        $tb.html(`<tr><td colspan="15" class="ld-empty">Sin movimientos en el periodo</td></tr>`);
        return;
    }

    const rows = LD.movimientos.map(row => {
        const esSaldoAnt = row.Id === 0;
        const cls = esSaldoAnt ? "ld-row-saldo-ant" : "";
        const acc = esSaldoAnt ? "" : `<div class="rp-row-actions">
            <button type="button" class="btn btn-sm rp-act rp-act-edit btn-edit-ld" data-id="${row.Id}" title="Editar"><i class="fa fa-pencil-square-o"></i></button>
            <button type="button" class="btn btn-sm rp-act rp-act-del btn-del-ld" data-id="${row.Id}" title="Eliminar"><i class="fa fa-trash-o"></i></button>
        </div>`;

        return `<tr class="${cls}" data-ld-id="${row.Id}">
            <td class="ld-col-acc">${acc}</td>
            <td>${fmtFechaLd(row.Fecha)}</td>
            <td class="ld-col-concepto">${escapeHtmlLd(row.Concepto)}</td>
            <td>${escapeHtmlLd(terceroTexto(row))}</td>
            <td>${escapeHtmlLd(row.RecorridoTexto || "-")}</td>
            <td class="ld-num">${esSaldoAnt ? "" : fmtNumLd(row.Unidades)}</td>
            <td class="ld-num">${esSaldoAnt ? "" : fmtNumLd(row.PrecioUnitario)}</td>
            <td class="ld-num ld-val-debe">${esSaldoAnt ? "" : (row.Debe ? fmtNumLd(row.Debe) : "")}</td>
            <td class="ld-num ld-val-haber">${esSaldoAnt ? "" : (row.Haber ? fmtNumLd(row.Haber) : "")}</td>
            <td class="ld-num">${esSaldoAnt ? "" : fmtNumLd(row.PorcIva)}</td>
            <td class="ld-num">${esSaldoAnt ? "" : fmtNumLd(row.Iva)}</td>
            <td class="ld-num">${esSaldoAnt ? "" : fmtNumLd(row.OtrosImp)}</td>
            <td class="ld-num">${esSaldoAnt ? "" : fmtNumLd(row.Total)}</td>
            <td class="ld-num ld-col-saldo"><strong class="${typeof clsSaldoMoney === "function" ? clsSaldoMoney(row.Saldo) : "ld-val-saldo"}">${fmtNumLd(row.Saldo)}</strong></td>
            <td>${escapeHtmlLd(row.FormaPago || "")}</td>
        </tr>`;
    }).join("");

    $tb.html(rows);
    filtrarFilasLibroDiario();
}

async function abrirModalLd(id) {
    limpiarModalLd();
    if (id) {
        $("#modalLdTitulo").text("Editar movimiento");
        const r = await fetch(API_LD.movimiento(id), { headers: authHeadersLd() });
        if (!r.ok) { errorModal("No se pudo cargar el movimiento."); return; }
        const m = await r.json();
        $("#mIdLd").val(m.Id);
        $("#mFechaLd").val(String(m.Fecha).slice(0, 10));
        $("#mIdConceptoLd").val(m.IdConcepto || "");
        $("#mConceptoLd").val(m.Concepto || "");
        $("#mIdClienteLd").val(m.IdCliente || "");
        $("#mClienteLd").val(m.Cliente || "");
        $("#mIdProveedorLd").val(m.IdProveedor || "");
        $("#mProveedorLd").val(m.Proveedor || "");
        $("#mRecorridoLd").val(m.RecorridoTexto || "");
        $("#mUnidadesLd").val(fmtNumLd(m.Unidades));
        $("#mPrecioLd").val(fmtNumLd(m.PrecioUnitario));
        $("#mDebeLd").val(m.Debe ? fmtNumLd(m.Debe) : "");
        $("#mHaberLd").val(m.Haber ? fmtNumLd(m.Haber) : "");
        const debeVal = leerNumLd(m.Debe);
        const haberVal = leerNumLd(m.Haber);
        LD.ladoImporte = haberVal > 0 && debeVal <= 0 ? "haber" : "debe";
        $("#mPorcIvaLd").val(fmtNumLd(m.PorcIva));
        $("#mIvaLd").val(fmtNumLd(m.Iva));
        $("#mOtrosImpLd").val(fmtNumLd(m.OtrosImp));
        $("#mTotalLd").val(fmtNumLd(m.Total));
        $("#mFormaPagoLd").val(m.FormaPago || "");
    } else {
        $("#modalLdTitulo").text("Nuevo movimiento");
    }
    modalLibroDiario.show();
}

function limpiarModalLd() {
    LD.ladoImporte = null;
    $("#mIdLd").val("0");
    $("#mIdConceptoLd, #mIdClienteLd, #mIdProveedorLd").val("");
    $("#mConceptoLd, #mClienteLd, #mProveedorLd, #mRecorridoLd").val("");
    $("#mUnidadesLd, #mPrecioLd, #mDebeLd, #mHaberLd, #mPorcIvaLd, #mIvaLd, #mOtrosImpLd, #mTotalLd").val("");
    $("#mFormaPagoLd").val("");
    const hoy = new Date().toISOString().slice(0, 10);
    $("#mFechaLd").val(hoy);
}

async function guardarMovimientoLd() {
    const clienteTexto = ($("#mClienteLd").val() || "").trim();
    const proveedorTexto = ($("#mProveedorLd").val() || "").trim();
    const idCliente = parseInt($("#mIdClienteLd").val(), 10) || null;
    const idProveedor = parseInt($("#mIdProveedorLd").val(), 10) || null;

    if (clienteTexto && !idCliente) {
        errorModal("Selecciona el cliente de la lista desplegable.");
        return;
    }
    if (proveedorTexto && !idProveedor) {
        errorModal("Selecciona el proveedor de la lista desplegable.");
        return;
    }

    const payload = {
        Id: parseInt($("#mIdLd").val(), 10) || 0,
        Fecha: $("#mFechaLd").val() || new Date().toISOString().slice(0, 10),
        IdConcepto: parseInt($("#mIdConceptoLd").val(), 10) || null,
        Concepto: ($("#mConceptoLd").val() || "").trim(),
        IdCliente: idCliente,
        Cliente: clienteTexto || null,
        IdProveedor: idProveedor,
        Proveedor: proveedorTexto || null,
        RecorridoTexto: ($("#mRecorridoLd").val() || "").trim() || null,
        Unidades: leerNumLd($("#mUnidadesLd").val()),
        PrecioUnitario: leerNumLd($("#mPrecioLd").val()),
        Debe: leerNumLd($("#mDebeLd").val()),
        Haber: leerNumLd($("#mHaberLd").val()),
        PorcIva: leerNumLd($("#mPorcIvaLd").val()),
        Iva: leerNumLd($("#mIvaLd").val()),
        OtrosImp: leerNumLd($("#mOtrosImpLd").val()),
        Total: leerNumLd($("#mTotalLd").val()),
        FormaPago: $("#mFormaPagoLd").val() || null,
        EsBancario: esBancarioActual()
    };

    const r = await fetch(API_LD.guardar, {
        method: "POST",
        headers: authHeadersLd(),
        body: JSON.stringify(payload)
    });
    const data = await r.json();
    if (data.valor) {
        modalLibroDiario.hide();
        if (typeof exitoModal === "function") exitoModal(data.mensaje || "Movimiento guardado.");
        await aplicarFiltrosLd();
    } else if (typeof errorModal === "function") {
        errorModal(data.mensaje || "No se pudo guardar.");
    }
}

async function eliminarMovimientoLd(id) {
    if (typeof confirmModal === "function") {
        confirmModal("¿Eliminar este movimiento?", async () => {
            await ejecutarEliminarLd(id);
        });
    } else if (confirm("¿Eliminar este movimiento?")) {
        await ejecutarEliminarLd(id);
    }
}

async function ejecutarEliminarLd(id) {
    const r = await fetch(API_LD.eliminar(id), { method: "DELETE", headers: authHeadersLd() });
    const data = await r.json();
    if (data.valor) {
        if (typeof exitoModal === "function") exitoModal(data.mensaje || "Movimiento eliminado.");
        await aplicarFiltrosLd();
    } else if (typeof errorModal === "function") {
        errorModal(data.mensaje || "No se pudo eliminar.");
    }
}
