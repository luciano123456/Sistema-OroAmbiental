/* Libro Diario — Caja efectivo / Caja bancaria */

const LD = {
    movimientos: [],
    conceptos: [],
    esBancario: false
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
    if (!d) return "—";
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
    return "—";
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

$(document).ready(async () => {
    LD.esBancario = esBancarioActual();
    modalLibroDiario = new bootstrap.Modal(document.getElementById("modalLibroDiario"));

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    $("#fHastaLd").val(hoy.toISOString().slice(0, 10));
    $("#fDesdeLd").val(inicioMes.toISOString().slice(0, 10));
    $("#mFechaLd").val(hoy.toISOString().slice(0, 10));

    await cargarConceptosLd();

    $("#btnFiltrarLd, #btnRefreshLd").on("click", aplicarFiltrosLd);
    $("#btnLimpiarLd").on("click", limpiarFiltrosLd);
    $("#btnNuevoLd").on("click", () => abrirModalLd());
    $("#btnGuardarLd").on("click", guardarMovimientoLd);
    $("#fTextoLd").on("keydown", e => { if (e.key === "Enter") aplicarFiltrosLd(); });

    $("#mUnidadesLd, #mPrecioLd").on("input", () => {
        const u = leerNumLd($("#mUnidadesLd").val());
        const p = leerNumLd($("#mPrecioLd").val());
        if (u > 0 && p > 0) {
            $("#mDebeLd").val(fmtNumLd(u * p));
            recalcIvaModal();
        }
    });

    $("#mDebeLd, #mHaberLd, #mIvaLd, #mOtrosImpLd, #mPorcIvaLd").on("input", () => {
        if ($(document.activeElement).attr("id") === "mPorcIvaLd") recalcIvaModal();
        else recalcTotalModal();
    });

    initAutocompleteLd("#mConceptoLd", "#mConceptoSugLd", "#mIdConceptoLd", buscarConceptosLocal, seleccionarConceptoLd);
    initAutocompleteLd("#mClienteLd", "#mClienteSugLd", "#mIdClienteLd", buscarClientesLd, () => { $("#mIdProveedorLd, #mProveedorLd").val(""); });
    initAutocompleteLd("#mProveedorLd", "#mProveedorSugLd", "#mIdProveedorLd", buscarProveedoresLd, () => { $("#mIdClienteLd, #mClienteLd").val(""); });

    $("#tbodyLibroDiario").on("click", ".btn-edit-ld", function () {
        const id = parseInt($(this).data("id"), 10);
        if (id > 0) abrirModalLd(id);
    });
    $("#tbodyLibroDiario").on("click", ".btn-del-ld", function () {
        const id = parseInt($(this).data("id"), 10);
        if (id > 0) eliminarMovimientoLd(id);
    });

    await aplicarFiltrosLd();
});

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
        const u = leerNumLd($("#mUnidadesLd").val());
        if (u > 0) {
            $("#mDebeLd").val(fmtNumLd(u * c.PrecioUnitario));
            recalcIvaModal();
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
        $("#kpiSaldoAnteriorLd").text(fmtMoneyLd(res.SaldoAnterior));
        $("#kpiTotalDebeLd").text(fmtMoneyLd(res.TotalDebe));
        $("#kpiTotalHaberLd").text(fmtMoneyLd(res.TotalHaber));
        $("#kpiSaldoFinalLd").text(fmtMoneyLd(res.SaldoFinal));
        $("#kpiCantidadLd").text(res.CantidadMovimientos ?? 0);
    }

    renderTablaLd();
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
        $tb.html(`<tr><td colspan="15" class="ld-empty">Sin movimientos en el período</td></tr>`);
        return;
    }

    const rows = LD.movimientos.map(row => {
        const esSaldoAnt = row.Id === 0;
        const cls = esSaldoAnt ? "ld-row-saldo-ant" : "";
        const acc = esSaldoAnt ? "" : `
            <button type="button" class="btn btn-sm rp-act rp-act-edit btn-edit-ld" data-id="${row.Id}" title="Editar"><i class="fa fa-pencil"></i></button>
            <button type="button" class="btn btn-sm rp-act rp-act-del btn-del-ld" data-id="${row.Id}" title="Eliminar"><i class="fa fa-trash"></i></button>`;

        return `<tr class="${cls}">
            <td class="ld-col-acc">${acc}</td>
            <td>${fmtFechaLd(row.Fecha)}</td>
            <td class="ld-col-concepto">${escapeHtmlLd(row.Concepto)}</td>
            <td>${escapeHtmlLd(terceroTexto(row))}</td>
            <td>${escapeHtmlLd(row.RecorridoTexto || "—")}</td>
            <td class="ld-num">${esSaldoAnt ? "" : fmtNumLd(row.Unidades)}</td>
            <td class="ld-num">${esSaldoAnt ? "" : fmtNumLd(row.PrecioUnitario)}</td>
            <td class="ld-num ld-val-debe">${esSaldoAnt ? "" : (row.Debe ? fmtNumLd(row.Debe) : "")}</td>
            <td class="ld-num ld-val-haber">${esSaldoAnt ? "" : (row.Haber ? fmtNumLd(row.Haber) : "")}</td>
            <td class="ld-num">${esSaldoAnt ? "" : fmtNumLd(row.PorcIva)}</td>
            <td class="ld-num">${esSaldoAnt ? "" : fmtNumLd(row.Iva)}</td>
            <td class="ld-num">${esSaldoAnt ? "" : fmtNumLd(row.OtrosImp)}</td>
            <td class="ld-num">${esSaldoAnt ? "" : fmtNumLd(row.Total)}</td>
            <td class="ld-num ld-col-saldo"><strong>${fmtNumLd(row.Saldo)}</strong></td>
            <td>${escapeHtmlLd(row.FormaPago || "")}</td>
        </tr>`;
    }).join("");

    $tb.html(rows);
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
    $("#mIdLd").val("0");
    $("#mIdConceptoLd, #mIdClienteLd, #mIdProveedorLd").val("");
    $("#mConceptoLd, #mClienteLd, #mProveedorLd, #mRecorridoLd").val("");
    $("#mUnidadesLd, #mPrecioLd, #mDebeLd, #mHaberLd, #mPorcIvaLd, #mIvaLd, #mOtrosImpLd, #mTotalLd").val("");
    $("#mFormaPagoLd").val("");
    const hoy = new Date().toISOString().slice(0, 10);
    $("#mFechaLd").val(hoy);
}

async function guardarMovimientoLd() {
    const payload = {
        Id: parseInt($("#mIdLd").val(), 10) || 0,
        Fecha: $("#mFechaLd").val() || new Date().toISOString().slice(0, 10),
        IdConcepto: parseInt($("#mIdConceptoLd").val(), 10) || null,
        Concepto: ($("#mConceptoLd").val() || "").trim(),
        IdCliente: parseInt($("#mIdClienteLd").val(), 10) || null,
        IdProveedor: parseInt($("#mIdProveedorLd").val(), 10) || null,
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
        if (typeof okModal === "function") okModal(data.mensaje);
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
        if (typeof okModal === "function") okModal(data.mensaje);
        await aplicarFiltrosLd();
    } else if (typeof errorModal === "function") {
        errorModal(data.mensaje || "No se pudo eliminar.");
    }
}
