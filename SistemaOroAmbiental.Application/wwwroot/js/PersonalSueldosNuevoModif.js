/* =========================================================
   PersonalSueldosNuevoModif.js
========================================================= */

(function () {
    "use strict";

    const SN = {
        init: window.SN_INIT || { id: 0, idPersonal: 0 },
        combos: {
            personal: [],
            monedas: [],
            cuentas: []
        },
        detalle: {
            pagos: []
        },
        flags: {
            ready: false,
            restoringDraft: false,
            dirty: false,
            autosaveEnabled: true
        }
    };

    const API = {
        editarInfo: (id) => `/PersonalSueldos/EditarInfo?id=${id}`,
        insertar: "/PersonalSueldos/Insertar",
        actualizar: "/PersonalSueldos/Actualizar",
        eliminar: (id) => `/PersonalSueldos/Eliminar?id=${id}`,

        personal: "/Personal/Lista",
        monedas: "/PaisesMoneda/Lista",
        cuentas: "/MonedasCuenta/Lista",
        cuentasPorMoneda: (id) => `/MonedasCuenta/ListaMoneda?idMoneda=${id}`
    };

    const authHeaders = () => ({
        "Authorization": "Bearer " + (token || ""),
        "Content-Type": "application/json"
    });

    const DRAFT_KEY = () => {
        const userId = localStorage.getItem("userId") || "default";
        return `SN_DRAFT_${userId}`;
    };

    function $(sel) { return window.jQuery ? window.jQuery(sel) : null; }

    function okMsg(msg) {
        if (typeof window.exitoModal === "function") window.exitoModal(msg);
        else alert(msg);
    }

    function errMsg(msg) {
        if (typeof window.errorModal === "function") window.errorModal(msg);
        else alert(msg);
    }

    async function confirmMsg(msg) {
        if (typeof window.confirmarModal === "function") return await window.confirmarModal(msg);
        return confirm(msg);
    }

    function toNumber(v) {
        if (v == null) return 0;
        let s = String(v).trim();
        if (!s) return 0;
        s = s.replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", ".");
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
    }

    function round2(n) {
        return Math.round(Number(n || 0) * 100) / 100;
    }

    function fmtMoney(n) {
        try {
            return round2(n).toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        } catch {
            return "$ 0";
        }
    }

    function todayIso() {
        const d = new Date();
        const pad = x => String(x).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    function isoDateOnly(d) {
        if (!d) return "";
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return "";
        const pad = x => String(x).padStart(2, "0");
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    }

    function isoDateTimeLocal(d) {
        if (!d) return "";
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return "";
        const pad = x => String(x).padStart(2, "0");
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }

    async function fetchJson(url) {
        const r = await fetch(url, { method: "GET", headers: authHeaders() });
        if (!r.ok) throw new Error(r.statusText);
        return await r.json();
    }

    function markDirty() {
        if (SN.flags.restoringDraft) return;
        SN.flags.dirty = true;
    }

    function fillSelect(el, data, idField, textField, placeholder) {
        if (!el) return;
        el.innerHTML = "";
        el.append(new Option(placeholder || "Seleccionar", "", true, true));
        (data || []).forEach(x => {
            const val = x[idField] ?? x.Id;
            const txt = x[textField] ?? x.Nombre ?? x.Descripcion ?? "";
            el.append(new Option(txt, val));
        });
    }

    function ensureSelect2(selector, options) {
        const jq = $(selector);
        if (!jq || !jq.length) return;
        if (jq.data("select2")) jq.select2("destroy");

        jq.select2(Object.assign({
            width: "100%",
            allowClear: true,
            placeholder: "Seleccionar"
        }, options || {}));
    }

    async function cargarCuentasPorMoneda(idx, idMoneda) {
        const sel = document.querySelector(`select.sn-p-cuenta[data-idx="${idx}"]`);
        if (!sel) return;

        if (!idMoneda) {
            fillSelect(sel, [], "Id", "Nombre", "Seleccionar");
            return;
        }

        try {
            const cuentas = await fetchJson(API.cuentasPorMoneda(idMoneda));
            fillSelect(sel, cuentas, "Id", "Nombre", "Seleccionar");

            $(sel)?.select2({
                width: "100%",
                allowClear: true,
                placeholder: "Cuenta"
            });
        } catch (e) {
            console.error("Error cargando cuentas", e);
        }
    }

    function getImporteTotal() {
        return toNumber(document.getElementById("ImporteTotal")?.value);
    }

    function getPagadoTotal() {
        return (SN.detalle.pagos || []).reduce((a, x) => a + Number(x.Conversion || 0), 0);
    }

    /* =========================
       INIT
    ========================= */

    document.addEventListener("DOMContentLoaded", async () => {
        try {

            Permisos.init();
            Permisos.aplicarUI("Personal Sueldos");

            initSecciones();
            bindUI();

            await cargarCombosBase();
            initSelectsBasicos();

            setDefaultsNueva();

            if (Number(SN.init.idPersonal || 0) > 0) {
                setPersonalSeleccionado(Number(SN.init.idPersonal), true);
            }

            const idSueldo = Number(SN.init.id || document.getElementById("Sueldo_Id")?.value || 0);

            if (idSueldo > 0) {
                const titulo = document.getElementById("tituloSueldo");
                if (titulo) titulo.textContent = " Modificar sueldo";
                await abrirSueldo(idSueldo);
            } else {
                const titulo = document.getElementById("tituloSueldo");
                if (titulo) titulo.textContent = " Registrar sueldo";

                document.getElementById("Sueldo_Id").value = "0";

                renderDetalle();
                recalcularTotales();
                setAuditoria({});
                actualizarPreviewRecibo();
            }

            setInterval(() => {
                if (!SN.flags.autosaveEnabled) return;
                if (!SN.flags.ready) return;
                if (!SN.flags.dirty) return;
                guardarDraft(false);
            }, 6000);

            SN.flags.ready = true;
        } catch (e) {
            console.error(e);
            errMsg("Error inicializando la pantalla de sueldos.");
        }
    });

    /* =========================
       UI
    ========================= */

    function bindUI() {
        document.getElementById("btnGuardarSueldo")?.addEventListener("click", guardarSueldo);

        document.getElementById("btnAddPago")?.addEventListener("click", () => {
            SN.detalle.pagos.push({
                Id: 0,
                Fecha: new Date(),
                IdMoneda: Number(document.getElementById("IdMoneda")?.value || 0) || 0,
                IdCuenta: 0,
                Importe: 0,
                Cotizacion: 1,
                Conversion: 0,
                ManualConversion: false
            });
            renderDetalle();
            recalcularTotales();
            markDirty();
        });

        document.getElementById("btnEliminarSueldo")?.addEventListener("click", async () => {

            if (!Permisos.tiene("Personal Sueldos", "Eliminar")) {
                errorModal("No tenés permisos.");
                return;
            }

            const id = Number(document.getElementById("Sueldo_Id")?.value || 0);

            if (!id) {
                errMsg("El sueldo aún no está guardado.");
                return;
            }

            const ok = await confirmMsg("¿Eliminar el sueldo? Esta acción no se puede deshacer.");
            if (!ok) return;

            try {
                const r = await fetch(API.eliminar(id), {
                    method: "DELETE",
                    headers: { "Authorization": "Bearer " + (token || "") }
                });

                const data = await r.json();

                if (!data.valor) {
                    errMsg(data.mensaje || "No se pudo eliminar.");
                    return;
                }

                okMsg("Sueldo eliminado correctamente.");

                setTimeout(() => {
                    window.location.href = "/PersonalSueldos";
                }, 800);

            } catch (e) {
                console.error(e);
                errMsg("Error eliminando el sueldo.");
            }
        });

        document.getElementById("btnDraftSave")?.addEventListener("click", () => guardarDraft(true));
        document.getElementById("btnDraftRestore")?.addEventListener("click", restaurarDraft);
        document.getElementById("btnDraftClear")?.addEventListener("click", async () => {
            const ok = await confirmMsg("¿Eliminar el borrador guardado?");
            if (!ok) return;
            localStorage.removeItem(DRAFT_KEY());
            okMsg("Borrador eliminado.");
        });

        document.getElementById("btnReciboPdf")?.addEventListener("click", exportarReciboPdf);
        document.getElementById("btnReciboPdf2")?.addEventListener("click", exportarReciboPdf);

        const watchIds = [
            "IdPersonal", "Fecha", "IdMoneda", "Concepto", "ImporteTotal",
            "NotaPersonal", "NotaInterna"
        ];

        watchIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener("input", () => {
                validarCampoIndividual(el);
                recalcularTotales();
                actualizarPreviewRecibo();
                markDirty();
            });
            el.addEventListener("change", () => {
                validarCampoIndividual(el);
                recalcularTotales();
                actualizarPreviewRecibo();
                markDirty();
            });
        });

        $(document).on("select2:select select2:clear change", "select", function () {
            validarCampoIndividual(this);
            recalcularTotales();
            actualizarPreviewRecibo();
            markDirty();
        });

        document.addEventListener("input", function (e) {
            const input = e.target;
            if (!input.classList || !input.classList.contains("Inputmiles")) return;

            const cursorPos = input.selectionStart || 0;
            const originalLength = input.value.length;

            const soloNumeros = input.value.replace(/\D/g, "");
            if (!soloNumeros) { input.value = ""; return; }

            const formateado = formatearMiles(soloNumeros);
            input.value = formateado;

            const newLength = formateado.length;
            const delta = newLength - originalLength;
            const newPos = Math.max(0, cursorPos + delta);

            try { input.setSelectionRange(newPos, newPos); } catch { }
        });
    }

    /* =========================
       CARGAS BASE
    ========================= */

    async function cargarCombosBase() {
        const [personal, monedas, cuentas] = await Promise.all([
            fetchJson(API.personal).catch(_ => []),
            fetchJson(API.monedas).catch(_ => []),
            fetchJson(API.cuentas).catch(_ => [])
        ]);

        SN.combos.personal = personal || [];
        SN.combos.monedas = monedas || [];
        SN.combos.cuentas = cuentas || [];
    }

    function initSelectsBasicos() {
        fillSelect(document.getElementById("IdPersonal"), SN.combos.personal, "Id", "Nombre", "Seleccionar");
        fillSelect(document.getElementById("IdMoneda"), SN.combos.monedas, "Id", "Nombre", "Seleccionar");

        ensureSelect2("#IdPersonal", {
            placeholder: "Seleccioná personal",
            matcher: function (params, data) {
                if (!params.term) return data;
                if (!data || !data.text) return null;
                const term = params.term.toLowerCase();
                return data.text.toLowerCase().includes(term) ? data : null;
            }
        });

        ensureSelect2("#IdMoneda");
    }

    function setPersonalSeleccionado(idPersonal, triggerChange) {
        const el = document.getElementById("IdPersonal");
        if (!el) return;
        el.value = String(idPersonal || "");
        if (triggerChange) $("#IdPersonal")?.trigger("change.select2");
        document.getElementById("Sueldo_IdPersonal").value = String(idPersonal || 0);
    }

    function setDefaultsNueva() {
        const id = Number(document.getElementById("Sueldo_Id")?.value || 0);
        if (id > 0) return;

        const f = document.getElementById("Fecha");
        if (f && !f.value) f.value = todayIso();
    }

    /* =========================
       ABRIR
    ========================= */

    async function abrirSueldo(idSueldo) {
        try {
            const s = await fetchJson(API.editarInfo(idSueldo));

            document.getElementById("Sueldo_Id").value = String(s.Id || 0);
            document.getElementById("Sueldo_IdPersonal").value = String(s.IdPersonal || 0);

            setPersonalSeleccionado(Number(s.IdPersonal || 0), true);

            document.getElementById("Fecha").value = isoDateOnly(s.Fecha);
            document.getElementById("IdMoneda").value = String(s.IdMoneda || "");
            $("#IdMoneda")?.trigger("change.select2");

            document.getElementById("Concepto").value = s.Concepto || "";
            document.getElementById("ImporteTotal").value = String(Number(s.ImporteTotal ?? 0));
            document.getElementById("NotaPersonal").value = s.NotaPersonal || "";
            document.getElementById("NotaInterna").value = s.NotaInterna || "";

            SN.detalle.pagos = Array.isArray(s.Pagos)
                ? s.Pagos.map(x => ({
                    Id: Number(x.Id || 0),
                    Fecha: x.Fecha ? new Date(x.Fecha) : new Date(),
                    IdMoneda: Number(x.IdMoneda || 0),
                    IdCuenta: Number(x.IdCuenta || 0),
                    Importe: Number(x.Importe || 0),
                    Cotizacion: Number(x.Cotizacion || 1) || 1,
                    Conversion: Number(x.Conversion || 0),
                    ManualConversion: true
                }))
                : [];

            renderDetalle();
            recalcularTotales();
            setAuditoria(s);
            

            SN.flags.dirty = false;
        } catch (e) {
            console.error(e);
            errMsg("No se pudo abrir el sueldo.");
        }
    }

    /* =========================
       AUDITORIA
    ========================= */

    function setAuditoria(v) {
        const audReg = document.getElementById("audReg");
        const audMod = document.getElementById("audMod");

        const emptyHtml = `
        <div class="vn-empty">
            <i class="fa fa-clock-o"></i>
            <div>Sin información de auditoría</div>
            <small>La auditoría se generará cuando se registre o modifique el sueldo</small>
        </div>`;

        if (audReg) {
            if (v?.UsuarioRegistra && v?.FechaRegistra) {
                audReg.innerHTML = `
                <div class="vn-chip">
                    <i class="fa fa-plus-circle"></i>
                    Registrado por <b>${v.UsuarioRegistra}</b>
                    • <b>${humanDate(v.FechaRegistra)}</b>
                </div>`;
            } else {
                audReg.innerHTML = emptyHtml;
            }
        }

        if (audMod) {
            if (v?.UsuarioModifica && v?.FechaModifica) {
                audMod.innerHTML = `
                <div class="vn-chip">
                    <i class="fa fa-plus-circle"></i>
                    Modificado por <b>${v.UsuarioModifica}</b>
                    • <b>${humanDate(v.FechaModifica)}</b>
                </div>`;
            } 
            
        }

       
    }

    function humanDate(fecha) {
        try {
            const d = new Date(fecha);
            if (isNaN(d.getTime())) return "";
            return d.toLocaleString("es-AR");
        } catch { return ""; }
    }

    /* =========================
       RENDER DETALLE
    ========================= */

    function renderDetalle() {
        renderPagos();

        const cnt = document.getElementById("cntPagos");
        if (cnt) cnt.textContent = `(${SN.detalle.pagos.length})`;

        actualizarPreviewRecibo();
    }

    function renderPagos() {
        const tb = document.getElementById("tbPagos");
        if (!tb) return;
        tb.innerHTML = "";

        if (SN.detalle.pagos.length === 0) {
            tb.innerHTML = `
            <tr class="vn-empty-row">
                <td colspan="7">
                    <div class="vn-empty">
                        <i class="fa fa-money"></i>
                        <div>No hay pagos registrados</div>
                        <small>Podés agregar pagos cuando empiecen los abonos</small>
                    </div>
                </td>
            </tr>`;
            return;
        }

        SN.detalle.pagos.forEach((it, idx) => {
            const fechaIso = isoDateTimeLocal(it.Fecha || new Date());
            tb.insertAdjacentHTML("beforeend", `
                <tr>
                    <td><input class="form-control vn-input vn-mini sn-p-fecha" data-idx="${idx}" type="datetime-local" value="${fechaIso}"></td>
                    <td><select class="form-select vn-input vn-mini sn-p-mon" data-idx="${idx}"></select></td>
                    <td><select class="form-select vn-input vn-mini sn-p-cuenta" data-idx="${idx}"></select></td>
                    <td><input class="form-control vn-input vn-mini sn-p-imp Inputmiles" data-idx="${idx}" type="text" value="${Number(it.Importe || 0)}"></td>
                    <td><input class="form-control vn-input vn-mini sn-p-cot" data-idx="${idx}" type="number" step="0.0001" min="0" value="${Number(it.Cotizacion || 1)}"></td>
                    <td><input class="form-control vn-input vn-mini sn-p-conv Inputmiles" data-idx="${idx}" type="text" value="${Number(it.Conversion || 0)}"></td>
                    <td class="text-end">
                        <button class="btn btn-outline-danger vn-btn vn-mini" type="button" onclick="window.snDelPago(${idx})">
                            <i class="fa fa-trash"></i>
                        </button>
                    </td>
                </tr>`);
        });

        tb.querySelectorAll("select.sn-p-mon").forEach(sel => {
            const idx = Number(sel.dataset.idx);

            fillSelect(sel, SN.combos.monedas, "Id", "Nombre", "Seleccionar");
            sel.value = String(SN.detalle.pagos[idx].IdMoneda || "");

            $(sel)?.select2({
                width: "100%",
                allowClear: true,
                placeholder: "Moneda"
            }).on("change", function () {

                const idMoneda = Number(this.value || 0);
                SN.detalle.pagos[idx].IdMoneda = idMoneda;

                const moneda = SN.combos.monedas.find(m => Number(m.Id) === idMoneda);
                if (moneda) {
                    const cot = Number(moneda.Cotizacion || 1);
                    SN.detalle.pagos[idx].Cotizacion = cot;

                    const cotEl = document.querySelector(`input.sn-p-cot[data-idx="${idx}"]`);
                    if (cotEl) cotEl.value = cot;
                }

                cargarCuentasPorMoneda(idx, idMoneda);
                recalcularPago(idx);
                actualizarPreviewRecibo();
                markDirty();
            });
        });

        tb.querySelectorAll("select.sn-p-cuenta").forEach(async sel => {
            const idx = Number(sel.dataset.idx);
            const idMoneda = SN.detalle.pagos[idx].IdMoneda || 0;

            await cargarCuentasPorMoneda(idx, idMoneda);

            sel.value = String(SN.detalle.pagos[idx].IdCuenta || "");
            $(sel)?.select2({
                width: "100%",
                allowClear: true,
                placeholder: "Cuenta"
            });

            $(sel)?.on("change", function () {
                SN.detalle.pagos[idx].IdCuenta = Number(this.value || 0);
                markDirty();
            });
        });

        tb.querySelectorAll("input.sn-p-fecha").forEach(inp => {
            inp.addEventListener("change", function () {
                const idx = Number(this.dataset.idx);
                SN.detalle.pagos[idx].Fecha = new Date(this.value);
                actualizarPreviewRecibo();
                markDirty();
            });
        });

        tb.querySelectorAll("input.sn-p-imp").forEach(inp => {
            inp.addEventListener("input", function () {
                const idx = Number(this.dataset.idx);
                SN.detalle.pagos[idx].Importe = toNumber(this.value);
                SN.detalle.pagos[idx].ManualConversion = false;
                recalcularPago(idx);
                actualizarPreviewRecibo();
                markDirty();
            });
        });

        tb.querySelectorAll("input.sn-p-cot").forEach(inp => {
            inp.addEventListener("input", function () {
                const idx = Number(this.dataset.idx);
                SN.detalle.pagos[idx].Cotizacion = toNumber(this.value) || 1;
                SN.detalle.pagos[idx].ManualConversion = false;
                recalcularPago(idx);
                actualizarPreviewRecibo();
                markDirty();
            });
        });

        tb.querySelectorAll("input.sn-p-conv").forEach(inp => {
            inp.addEventListener("input", function () {
                const idx = Number(this.dataset.idx);
                SN.detalle.pagos[idx].Conversion = toNumber(this.value);
                SN.detalle.pagos[idx].ManualConversion = true;
                recalcularTotales();
                actualizarPreviewRecibo();
                markDirty();
            });
        });
    }

    function recalcularPago(idx) {
        const p = SN.detalle.pagos[idx];
        if (!p) return;

        const imp = Number(p.Importe || 0);
        const cot = Number(p.Cotizacion || 1) || 1;

        if (!p.ManualConversion) {
            p.Conversion = round2(imp * cot);
            const convEl = document.querySelector(`input.sn-p-conv[data-idx="${idx}"]`);
            if (convEl) convEl.value = String(p.Conversion || 0);
        }

        recalcularTotales();
    }

    window.snDelPago = function (i) {
        SN.detalle.pagos.splice(i, 1);
        renderDetalle();
        recalcularTotales();
        markDirty();
    };

    /* =========================
       CALCULOS
    ========================= */

    function recalcularTotales() {
        const importeTotal = getImporteTotal();
        const pagado = getPagadoTotal();
        const saldo = round2(importeTotal - pagado);

        const sumImporte = document.getElementById("sumImporte");
        const sumPagado = document.getElementById("sumPagado");
        const sumSaldo = document.getElementById("sumSaldo");

        if (sumImporte) sumImporte.textContent = fmtMoney(importeTotal);
        if (sumPagado) sumPagado.textContent = fmtMoney(pagado);
        if (sumSaldo) sumSaldo.textContent = fmtMoney(saldo);

        actualizarPreviewRecibo();
    }

    /* =========================
       RECIBO PDF
    ========================= */

    function actualizarPreviewRecibo() {

    const personalId = Number(document.getElementById("IdPersonal")?.value || 0);
    const personal = SN.combos.personal.find(x => Number(x.Id) === personalId);

    const monedaId = Number(document.getElementById("IdMoneda")?.value || 0);
    const moneda = SN.combos.monedas.find(x => Number(x.Id) === monedaId);

    const concepto = document.getElementById("Concepto")?.value || "-";
    const fecha = document.getElementById("Fecha")?.value;

    const total = getImporteTotal();
    const pagado = getPagadoTotal();
    const saldo = round2(total - pagado);

    setText("rvPersonal", personal?.Nombre || "-");
    setText("rvFecha", moment(fecha, "YYYY-MM-DD").format("DD/MM/YYYY"));
    setText("rvMoneda", moneda?.Nombre || "-");
    setText("rvConcepto", concepto);

    setText("rvTotal", fmtMoney(total));
    setText("rvPagado", fmtMoney(pagado));
    setText("rvSaldo", fmtMoney(saldo));

    const cont = document.getElementById("rvPagosDetalle");

    if (!cont) return;

    if (!SN.detalle.pagos || SN.detalle.pagos.length === 0) {

        cont.innerHTML = `
        <div class="rpv-empty">
            Sin pagos registrados
        </div>`;

        return;
    }

    let html = "";

    SN.detalle.pagos.forEach(p => {

        html += `
        <div class="rpv-pago-item">
            <span>
                ${p.Fecha ? moment(p.Fecha).format("DD/MM/YYYY") : "-"}
            </span>

            <span>
                ${fmtMoney(p.Importe || 0)}
            </span>

            <strong>
                ${fmtMoney(p.Conversion || 0)}
            </strong>
        </div>
        `;

    });

    cont.innerHTML = html;

}

    function setText(id, txt) {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
    }

    async function exportarReciboPdf() {

        const { jsPDF } = window.jspdf;

        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        const personal = document.getElementById("rvPersonal")?.innerText || "-";
        const fecha = document.getElementById("rvFecha")?.innerText || "-";
        const moneda = document.getElementById("rvMoneda")?.innerText || "-";
        const concepto = document.getElementById("rvConcepto")?.innerText || "-";

        const total = document.getElementById("rvTotal")?.innerText || "$0";
        const pagado = document.getElementById("rvPagado")?.innerText || "$0";
        const saldo = document.getElementById("rvSaldo")?.innerText || "$0";

        const pagos = SN.detalle.pagos || [];

        let y = 20;

        // =============================
        // TITULO
        // =============================

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("RECIBO DE SUELDO", 105, y, { align: "center" });

        y += 8;

        doc.setTextColor(200, 0, 0);
        doc.setFontSize(10);
        doc.text("DOCUMENTO NO VALIDO COMO FACTURA", 105, y, { align: "center" });

        doc.setTextColor(0, 0, 0);

        y += 15;

        // =============================
        // DATOS
        // =============================

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);

        doc.text("Personal:", 20, y);
        doc.text("Fecha:", 110, y);

        doc.setFont("helvetica", "normal");

        doc.text(personal, 40, y);
        doc.text(fecha, 130, y);

        y += 8;

        doc.setFont("helvetica", "bold");

        doc.text("Moneda:", 20, y);
        doc.text("Concepto:", 110, y);

        doc.setFont("helvetica", "normal");

        doc.text(moneda, 40, y);
        doc.text(concepto, 130, y);

        y += 10;

        // =============================
        // CAJA RESUMEN
        // =============================

        doc.setDrawColor(200);
        doc.roundedRect(20, y, 170, 30, 4, 4);

        let yy = y + 8;

        doc.setFont("helvetica", "normal");

        doc.text("Total sueldo", 25, yy);
        doc.text(total, 185, yy, { align: "right" });

        doc.setDrawColor(220);
        doc.line(25, yy + 2, 185, yy + 2);

        yy += 10;

        doc.text("Total pagado", 25, yy);
        doc.text(pagado, 185, yy, { align: "right" });

        doc.line(25, yy + 2, 185, yy + 2);

        yy += 10;

        doc.setTextColor(200, 0, 0);
        doc.text("Saldo pendiente", 25, yy);
        doc.text(saldo, 185, yy, { align: "right" });
        doc.setTextColor(0, 0, 0);

        y += 45;

        // =============================
        // DETALLE PAGOS
        // =============================

        doc.setFont("helvetica", "bold");
        doc.text("Detalle de pagos", 20, y);

        y += 10;

        doc.setFont("helvetica", "normal");

        pagos.forEach(p => {

            const fecha = moment(p.Fecha).format("DD/MM/YYYY");
            const importe = fmtMoney(p.Importe);
            const conv = fmtMoney(p.Conversion);

            doc.text(fecha, 20, y);

            doc.text(importe, 120, y, { align: "right" });
            doc.text(conv, 185, y, { align: "right" });

            doc.setDrawColor(220);
            doc.line(20, y + 2, 185, y + 2);

            y += 10;

        });

        y += 20;

        // =============================
        // FIRMAS
        // =============================

        doc.setDrawColor(120);

        doc.line(25, y, 90, y);
        doc.line(120, y, 185, y);

        y += 6;

        doc.setFontSize(9);

        doc.text("Firma del empleado", 57, y, { align: "center" });
        doc.text("Firma de la empresa", 152, y, { align: "center" });

        doc.save("Recibo_Sueldo.pdf");
    }

    async function esperarRenderPdf() {
        // 2 frames + pequeño delay para fuentes/layout
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await new Promise(resolve => setTimeout(resolve, 300));

        if (document.fonts && document.fonts.ready) {
            try {
                await document.fonts.ready;
            } catch { }
        }
    }

    function normalizarReciboParaPdf(root) {
        if (!root) return;

        // ancho estable para impresión
        root.style.width = "100%";
        root.style.maxWidth = "100%";
        root.style.margin = "0";
        root.style.padding = "0";
        root.style.background = "#ffffff";
        root.style.boxShadow = "none";
        root.style.transform = "none";
        root.style.filter = "none";
        root.style.overflow = "visible";

        // limpiar posibles clases problemáticas en hijos
        root.querySelectorAll("*").forEach(el => {
            el.style.transform = "none";
            el.style.filter = "none";

            // evitar recortes raros
            if (getComputedStyle(el).overflow === "hidden") {
                el.style.overflow = "visible";
            }
        });
    }
    /* =========================
       VALIDACION
    ========================= */

    function validarCamposSueldo() {
        let errores = [];

        const campos = [
            { id: "IdPersonal", nombre: "Personal" },
            { id: "Fecha", nombre: "Fecha" },
            { id: "IdMoneda", nombre: "Moneda" },
            { id: "Concepto", nombre: "Concepto" },
            { id: "ImporteTotal", nombre: "Importe total" }
        ];

        campos.forEach(c => {
            const el = document.getElementById(c.id);
            if (!el) return;

            const val = (el.value ?? "").toString().trim();
            const esValido = val !== "";

            setEstadoCampoLocal(el, esValido);

            if (!esValido) errores.push(c.nombre);
        });

        if (getImporteTotal() <= 0) {
            errores.push("Importe total");
            setEstadoCampoLocal(document.getElementById("ImporteTotal"), false);
        }

        SN.detalle.pagos.forEach((p, i) => {
            if (!p.IdCuenta) errores.push(`Pago #${i + 1} (cuenta)`);
            if (!p.IdMoneda) errores.push(`Pago #${i + 1} (moneda)`);
            if (Number(p.Importe || 0) <= 0) errores.push(`Pago #${i + 1} (importe)`);
        });

        if (errores.length > 0) {
            mostrarErrorCamposLocal(
                `Debes completar los campos requeridos:<br><strong>${errores.join(", ")}</strong>`
            );
            return false;
        }

        cerrarErrorCamposLocal();
        return true;
    }

    function validarCampoIndividual(el) {
        const obligatorios = [
            "IdPersonal",
            "Fecha",
            "IdMoneda",
            "Concepto",
            "ImporteTotal"
        ];

        if (!obligatorios.includes(el.id)) return;

        const valor = (el.value ?? "").toString().trim();
        const esValido = valor !== "" && valor !== "Seleccionar";

        setEstadoCampoLocal(el, esValido);
    }

    /* =========================
       BUILD MODEL
    ========================= */

    function buildModel() {
        recalcularTotales();

        const importeTotal = getImporteTotal();
        const pagado = getPagadoTotal();
        const saldo = round2(importeTotal - pagado);

        return {
            Id: Number(document.getElementById("Sueldo_Id")?.value || 0),

            Fecha: document.getElementById("Fecha")?.value
                ? new Date(document.getElementById("Fecha").value)
                : new Date(),

            IdPersonal: Number(document.getElementById("IdPersonal")?.value || 0),
            IdMoneda: Number(document.getElementById("IdMoneda")?.value || 0),
            Concepto: document.getElementById("Concepto")?.value || "",
            ImporteTotal: round2(importeTotal),
            ImportePagado: round2(pagado),
            Saldo: round2(saldo),

            NotaPersonal: (document.getElementById("NotaPersonal")?.value || "").trim() || null,
            NotaInterna: (document.getElementById("NotaInterna")?.value || "").trim() || null,

            Pagos: (SN.detalle.pagos || [])
                .filter(x => Number(x.IdCuenta || 0) > 0)
                .map(x => ({
                    Id: Number(x.Id || 0),
                    Fecha: x.Fecha ? new Date(x.Fecha) : new Date(),
                    IdMoneda: Number(x.IdMoneda || 0),
                    IdCuenta: Number(x.IdCuenta || 0),
                    Importe: round2(Number(x.Importe || 0)),
                    Cotizacion: round2(Number(x.Cotizacion || 1)),
                    Conversion: round2(Number(x.Conversion > 0 ? x.Conversion : (Number(x.Importe || 0) * Number(x.Cotizacion || 1))))
                }))
        };
    }

    /* =========================
       GUARDAR
    ========================= */

    async function guardarSueldo() {

        if (!Permisos.tiene("Personal Sueldos", "crear")) {
            errorModal("No tenés permisos.");
            return;
        }

        if (!validarCamposSueldo()) return;

        const model = buildModel();
        const isNew = Number(model.Id || 0) === 0;

        try {
            const url = isNew ? API.insertar : API.actualizar;
            const method = isNew ? "POST" : "PUT";

            const r = await fetch(url, {
                method,
                headers: authHeaders(),
                body: JSON.stringify(model)
            });

            if (!r.ok) throw new Error(r.statusText);

            const data = await r.json();

            if (!data.valor) {
                errMsg(data.mensaje || "No se pudo guardar.");
                return;
            }

            okMsg(data.mensaje || "Guardado OK");

            localStorage.removeItem(DRAFT_KEY());
            SN.flags.dirty = false;

            setTimeout(() => {
                window.location.href = "/PersonalSueldos";
            }, 600);

        } catch (e) {
            console.error(e);
            errMsg("Error guardando el sueldo.");
        }
    }

    /* =========================
       DRAFT
    ========================= */

    function guardarDraft(showToast) {
        try {
            const idPersonal = Number(document.getElementById("IdPersonal")?.value || 0);
            if (!idPersonal) return;

            const payload = {
                ts: new Date().toISOString(),
                idSueldo: Number(document.getElementById("Sueldo_Id")?.value || 0),
                idPersonal: idPersonal,
                form: {
                    Fecha: document.getElementById("Fecha")?.value || "",
                    IdMoneda: document.getElementById("IdMoneda")?.value || "",
                    Concepto: document.getElementById("Concepto")?.value || "",
                    ImporteTotal: formatearSinMiles(document.getElementById("ImporteTotal")?.value) || "",
                    NotaPersonal: document.getElementById("NotaPersonal")?.value || "",
                    NotaInterna: document.getElementById("NotaInterna")?.value || ""
                },
                detalle: SN.detalle
            };

            localStorage.setItem(DRAFT_KEY(), JSON.stringify(payload));
            if (showToast) okMsg("Borrador guardado.");

            SN.flags.dirty = false;
        } catch (e) {
            console.error(e);
        }
    }

    async function restaurarDraft() {
        try {
            const raw = localStorage.getItem(DRAFT_KEY());
            if (!raw) { errMsg("No hay borrador guardado."); return; }

            const d = JSON.parse(raw);
            if (!d || !d.form || !d.idPersonal) { errMsg("Borrador inválido."); return; }

            SN.flags.restoringDraft = true;

            document.getElementById("Sueldo_Id").value = String(Number(d.idSueldo || 0));
            setPersonalSeleccionado(Number(d.idPersonal || 0), true);

            document.getElementById("Fecha").value = d.form.Fecha || todayIso();
            document.getElementById("IdMoneda").value = String(d.form.IdMoneda || "");
            $("#IdMoneda")?.trigger("change.select2");

            document.getElementById("Concepto").value = d.form.Concepto || "";
            document.getElementById("ImporteTotal").value = d.form.ImporteTotal || "";
            document.getElementById("NotaPersonal").value = d.form.NotaPersonal || "";
            document.getElementById("NotaInterna").value = d.form.NotaInterna || "";

            SN.detalle = d.detalle || { pagos: [] };
            SN.detalle.pagos = Array.isArray(SN.detalle.pagos) ? SN.detalle.pagos : [];

            SN.detalle.pagos = SN.detalle.pagos.map(p => ({
                ...p,
                Fecha: p.Fecha ? new Date(p.Fecha) : new Date(),
                ManualConversion: !!p.ManualConversion
            }));

            renderDetalle();
            recalcularTotales();

            SN.flags.dirty = false;
            SN.flags.restoringDraft = false;

            okMsg("Borrador restaurado.");
        } catch (e) {
            console.error(e);
            SN.flags.restoringDraft = false;
            errMsg("No se pudo restaurar el borrador.");
        }
    }

    /* =========================
       HELPERS UI
    ========================= */

    window.cerrarErrorCamposLocal = function () {
        const panel = document.getElementById("errorCampos");
        if (!panel) return;
        panel.classList.add("d-none");
    };

    function mostrarErrorCamposLocal(html) {
        const panel = document.getElementById("errorCampos");
        const msg = panel?.querySelector(".rp-error-message");
        if (!panel || !msg) return;
        msg.innerHTML = html;
        panel.classList.remove("d-none");
    }

    function setEstadoCampoLocal(el, esValido) {
        if (!el) return;
        el.classList.toggle("is-invalid", !esValido);
    }

    function formatearMiles(v) {
        const num = String(v || "").replace(/\D/g, "");
        if (!num) return "";
        return Number(num).toLocaleString("es-AR");
    }

    function formatearSinMiles(v) {
        return String(v || "").replace(/\./g, "").replace(/,/g, "");
    }

    /* =========================
       SECCIONES
    ========================= */

    function initSecciones() {
        const tabs = document.querySelectorAll(".vn-head-btn");
        const panels = document.querySelectorAll(".vn-section");

        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                const sec = tab.dataset.sec;
                tabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                panels.forEach(p => p.classList.remove("active"));
                const panel = document.getElementById("sec-" + sec);
                if (panel) panel.classList.add("active");
            });
        });
    }


})();

