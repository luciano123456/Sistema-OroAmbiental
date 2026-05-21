let modalArtistaVentas = null;
let modalPersonalVentas = null;
let modalClienteVentas = null;
let modalProductoraVentas = null;
let modalUbicacionVentas = null;


(function () {
    "use strict";

    /* =========================
       STATE
    ========================= */
    const VN = {
        init: window.VN_INIT || { id: 0, idCliente: 0 },
        clientes: [],
        combos: {
            productoras: [],
            ubicaciones: [],
            monedas: [],
            estados: [],
            tiposContrato: [],
            opcionesBinarias: [],
            artistas: [],
            representantes: [],
            personal: [],
            cargos: [],
            tiposComision: [],
            cuentas: []
        },
        detalle: {
            artistas: [],
            personal: [],
            cobros: []
        },
        flags: {
            ready: false,
            restoringDraft: false,
            dirty: false,
            autosaveEnabled: true
        }
    };

    /* =========================
       ENDPOINTS (según tu proyecto)
    ========================= */
    const API = {
        // VentasController
        
        editarInfo: (id) => `/Ventas/EditarInfo?id=${id}`,
        insertar: "/Ventas/Insertar",
        actualizar: "/Ventas/Actualizar",

        // Combos
        productoras: "/Productoras/Lista",
        listaClientes: "/Ventas/ListaClientes",
        ubicaciones: "/Ubicaciones/Lista",
        monedas: "/PaisesMoneda/Lista",
        estadosVenta: "/VentasEstados/Lista",
        tiposContrato: "/TiposContratos/Lista",
        opcionesBinarias: "/OpcionesBinarias/Lista",
        artistas: "/Artistas/Lista",
        representantes: "/Personal/Lista",
        personal: "/Personal/Lista",
        cargos: "/PersonalRol/Lista",
        tiposComision: "/TiposComisiones/Lista",
        cuentas: "/MonedasCuenta/Lista",
        cuentasPorMoneda: (id) => `/MonedasCuenta/ListaMoneda?idMoneda=${id}`,
    };

    /* =========================
       AUTH HEADERS (token global)
    ========================= */
    const authHeaders = () => ({
        "Authorization": "Bearer " + (token || ""),
        "Content-Type": "application/json"
    });

    function getCotizacionHoyDesdeSistema(idMonedaVenta) {

        if (!idMonedaVenta) return 1;

        const moneda = (VN.combos.monedas || [])
            .find(x => Number(x.Id) === Number(idMonedaVenta));

        return Number(moneda?.Cotizacion || 1);
    }

    /* =========================
       DRAFT
    ========================= */
    const DRAFT_KEY = () => {
        const userId = localStorage.getItem("userId") || "default";
        return `VN_DRAFT_${userId}`;
    };

    function vnFormatInput(valor) {

    if (valor == null || valor === "") return "";

    const num = Number(valor);

    if (isNaN(num)) return "";

    return num.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


    async function recargarEstadosVenta(mantenerSeleccion = true, idSeleccionar = null) {
        try {
            const select = document.getElementById("IdEstado");
            if (!select) return;

            const valorActual = mantenerSeleccion ? select.value : "";

            const estados = await vnFetchJson(API.estadosVenta);

            VN.combos.estados = Array.isArray(estados) ? estados : [];

            vnFillSelectDom(select, VN.combos.estados, "Id", "Nombre", "Seleccionar");

            if (idSeleccionar) {
                select.value = String(idSeleccionar);
            } else if (valorActual) {
                const existe = VN.combos.estados.some(x => String(x.Id) === String(valorActual));
                if (existe) {
                    select.value = String(valorActual);
                }
            }

            if (window.jQuery && $(select)?.data("select2")) {
                $(select).trigger("change.select2");
            } else if (window.jQuery) {
                $(select).trigger("change");
            } else {
                select.dispatchEvent(new Event("change", { bubbles: true }));
            }

        } catch (e) {
            console.error("Error recargando estados de venta", e);
        }
    }

    function registrarListenerConfiguracionesGlobales() {
        document.addEventListener("configuracionActualizada", async function (e) {
            try {
                const detail = e.detail || {};
                const tipo = detail.tipo || "";
                const nuevoId = detail.nuevoId || null;

                if (tipo === "VentasEstados") {
                    await recargarEstadosVenta(true, nuevoId);
                }
            } catch (err) {
                console.error("Error procesando configuracionActualizada", err);
            }
        });
    }

    function getCotizacionUSD() {

        if (!Array.isArray(VN?.combos?.monedas))
            return 1;

        const usd = VN.combos.monedas.find(m => {

            const nom = String(m.Nombre || "").toUpperCase();
            const desc = String(m.Descripcion || "").toUpperCase();

            return (
                nom.includes("USD") ||
                nom.includes("DOLAR") ||
                desc.includes("DOLAR")
            );

        });

        return Number(usd?.Cotizacion || 1);
    }

    /* =========================
       HELPERS
    ========================= */
    function $(sel) { return window.jQuery ? window.jQuery(sel) : null; }

    function vnToastOk(msg) {
        if (typeof window.exitoModal === "function") window.exitoModal(msg);
        else alert(msg);
    }
    function vnToastErr(msg) {
        if (typeof window.errorModal === "function") window.errorModal(msg);
        else alert(msg);
    }
    async function vnConfirm(msg) {
        if (typeof window.confirmarModal === "function") return await window.confirmarModal(msg);
        return confirm(msg);
    }

    function vnToNumber(v) {

        if (v == null) return 0;

        let s = String(v).trim();

        if (!s) return 0;

        // quitar miles
        s = s.replace(/\./g, "");

        // decimal coma → punto
        s = s.replace(",", ".");

        const n = parseFloat(s);

        return isNaN(n) ? 0 : n;
    }

    function vnRound2(n) {
        const x = Number(n || 0);
        return Math.round(x * 100) / 100;
    }

    function vnFmtMoneyARS(n) {
        try {
            const v = vnRound2(Number(n || 0));
            return v.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } catch {
            return "$ 0,00";
        }
    }

    function vnIsoLocalFromDate(d) {
        try {
            const dt = (d instanceof Date) ? d : new Date(d);
            if (isNaN(dt.getTime())) return "";
            const pad = x => String(x).padStart(2, "0");
            return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
        } catch { return ""; }
    }

    function vnIsoDateTimeLocal(d) {

        if (!d) return "";

        const dt = new Date(d);
        if (isNaN(dt.getTime())) return "";

        const pad = n => String(n).padStart(2, "0");

        return dt.getFullYear() + "-" +
            pad(dt.getMonth() + 1) + "-" +
            pad(dt.getDate()) + "T" +
            pad(dt.getHours()) + ":" +
            pad(dt.getMinutes());

    }


    function vnNowIsoLocal() {
        return vnIsoLocalFromDate(new Date());
    }

    async function vnFetchJson(url) {
        const r = await fetch(url, { method: "GET", headers: authHeaders() });
        if (!r.ok) throw new Error(r.statusText);
        return await r.json();
    }

    function vnSetSaving(state, text, mode) {
        // reuse ids from tu HTML si los agregás luego; acá usamos summary como feedback mínimo
        // (si querés barra, agregala al HTML: #spinSaving, #txtEstadoGuardado)
        const spin = document.getElementById("spinSaving");
        const lbl = document.getElementById("txtEstadoGuardado");
        const status = document.getElementById("lblEstadoGuardado");

        if (spin) spin.classList.toggle("d-none", !state);
        if (lbl) lbl.textContent = text || (state ? "Guardando..." : "Listo");
        if (status) {
            status.classList.remove("ok", "err");
            if (mode === "ok") status.classList.add("ok");
            if (mode === "err") status.classList.add("err");
        }
    }

    function fmtFechaHora(valor) {

        if (!valor) return "";

        const m = moment(valor);

        if (!m.isValid()) return "";

        return m.format("DD/MM/YYYY HH:mm");
    }

    async function cargarCuentasPorMoneda(idx, idMoneda) {

        const sel = document.querySelector(`select.vn-c-cuenta[data-idx="${idx}"]`);
        if (!sel) return;

        if (!idMoneda) {
            vnFillSelectDom(sel, [], "Id", "Nombre", "Seleccionar");
            return;
        }

        try {

            const cuentas = await vnFetchJson(API.cuentasPorMoneda(idMoneda));

            vnFillSelectDom(sel, cuentas, "Id", "Nombre", "Seleccionar");

            $(sel)?.select2({
                width: "100%",
                allowClear: true,
                placeholder: "Cuenta"
            });

        }
        catch (e) {
            console.error("Error cargando cuentas", e);
        }
    }

    function vnMarkDirty() {
        if (VN.flags.restoringDraft) return;
        VN.flags.dirty = true;
    }

    function ensureSelect2(domSel, options) {
        const jq = $(domSel);
        if (!jq || !jq.length) return;

        if (jq.data("select2")) jq.select2("destroy");

        const modal = jq.closest(".modal"); // 👈 clave

        jq.select2(Object.assign({
            width: "100%",
            allowClear: true,
            placeholder: "Seleccionar",
            dropdownParent: modal.length ? modal : $(document.body) // 👈 FIX
        }, options || {}));
    }

    function vnFillSelectDom(el, data, idField, textField, placeholder) {
        if (!el) return;
        el.innerHTML = "";
        el.append(new Option(placeholder || "Seleccionar", "", true, true));
        (data || []).forEach(x => {
            const val = x[idField] ?? x.Id;
            const txt = x[textField] ?? x.Nombre ?? x.Descripcion ?? "";
            el.append(new Option(txt, val));
        });
    }

    function vnGetImporteTotal() {
        return vnToNumber(document.getElementById("ImporteTotal")?.value);
    }

    function vnGetClienteId() {
        const el = document.getElementById("IdCliente");
        return Number(el?.value || 0);
    }


    /* =========================================================
    CONTRATOS (DOCX con plantilla servidor)
    - Depende de: VN, buildModel, validarCamposVenta, vnRound2, vnToNumber
    - Usa: errorModal / exitoModal
    ========================================================= */


    async function exportarResumen(tipo) {

        const idVenta = Number(document.getElementById("Venta_Id")?.value || 0);

        if (!idVenta) {
            errorModal("Primero guardá la venta.");
            return;
        }

        try {

            const v = await vnFetchJson(`/Ventas/EditarInfo?id=${idVenta}`);

            if (tipo === "cliente")
                exportarResumenCliente(v);
            else
                exportarResumenComisiones(v);

        }
        catch (e) {

            console.error(e);
            errorModal("No se pudo generar el PDF.");

        }

    }

    async function exportarResumenCliente(v) {

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("p", "mm", "a4");

        const logo = await cargarImagenBase64("/Imagenes/Logo_Negro.png");

        const PAGE_W = 210;
        const M = 6;
        const X = M;
        const W = PAGE_W - (M * 2);

        const BLACK = [0, 0, 0];
        const WHITE = [255, 255, 255];

        const cobros = Array.isArray(v.Cobros) ? v.Cobros : [];
        const artistas = Array.isArray(v.Artistas) ? v.Artistas : [];

        let y = 5;

        const cotUSD = getCotizacionUSD();

        /* =========================
           HELPERS
        ========================= */

        function money(n, dec = 2) {
            return Number(n || 0).toLocaleString("es-AR", {
                minimumFractionDigits: dec,
                maximumFractionDigits: dec
            });
        }

        function fmtFecha(valor) {

            if (!valor) return "";

            const m = moment(valor, [
                "YYYY-MM-DD",
                "YYYY-MM-DDTHH:mm:ss",
                "DD/MM/YYYY",
                "DD-MM-YYYY"
            ], true);

            if (!m.isValid()) return "";

            return m.format("DD/MM/YYYY");
        }



        function txt(x, y, text, opt = {}) {

            const {
                size = 8,
                bold = false,
                align = "left",
                color = [0, 0, 0]
            } = opt;

            doc.setFont("helvetica", bold ? "bold" : "normal");
            doc.setFontSize(size);
            doc.setTextColor(color[0], color[1], color[2]);

            doc.text(String(text ?? ""), x, y, { align });

        }

        function rect(x, y, w, h, fill = null) {

            if (fill) {

                doc.setFillColor(fill[0], fill[1], fill[2]);
                doc.rect(x, y, w, h, "F");

            } else {

                doc.rect(x, y, w, h);

            }

        }

        function sectionBar(y, title) {

            rect(X, y, W, 6, BLACK);

            txt(X + 3, y + 4, title, {
                size: 7,
                bold: true,
                color: WHITE
            });

        }

        function cell(x, y, w, h, textValue = "", opt = {}) {

            const { align = "left" } = opt;

            rect(x, y, w, h);

            let tx = x + 1.5;

            if (align === "center") tx = x + w / 2;
            if (align === "right") tx = x + w - 1.5;

            txt(tx, y + 4, textValue, { size: 7, align });

        }

        /* =========================
           DATOS DERIVADOS
        ========================= */

        const artistasTxt = artistas
            .map(a => a.Artista)
            .filter(Boolean)
            .join(", ");

        const representanteTxt = artistas
            .map(a => a.Representante)
            .filter(Boolean)
            .join(", ");

        const cobradoARS = cobros.reduce(
            (a, x) => a + Number(x.Conversion || 0),
            0
        );

        const cobradoUSD = cobradoARS / cotUSD;

        /* =========================
           BORDE
        ========================= */

        doc.rect(2, 2, 206, 292);

        /* =========================
           CABECERA
        ========================= */

        rect(X, y, W, 6, BLACK);

        txt(PAGE_W / 2, y + 4, "DOCUMENTO NO VÁLIDO COMO FACTURA", {
            align: "center",
            size: 8,
            color: WHITE
        });

        y += 6;

        /* =========================
           HEADER EMPRESA
        ========================= */

        rect(X, y, W, 28);

        doc.addImage(logo, "PNG", X + 6, y + 5, 18, 12);

        txt(X + 30, y + 8, "OroAmbiental", { bold: true });
        txt(X + 30, y + 13, "Cuit: 20-35970758-5", { size: 7 });
        txt(X + 30, y + 18, "Ingresos Brutos: 20359707585", { size: 7 });
        txt(X + 30, y + 23, "Fecha de inicio actividad: 01/03/2021", { size: 7 });

        txt(X + W - 18, y + 8, "VENTA N°", { align: "center", size: 11 });

        txt(X + W - 18, y + 18, String(v.Id || ""), {
            align: "center",
            size: 18
        });

        y += 28;

        /* =========================
           INFORMACION
        ========================= */

        sectionBar(y, "Información de la venta");

        y += 6;

        rect(X, y, W, 38);

        const duracion = v.Duracion
            ? moment(v.Duracion).format("HH:mm")
            : "";

        const left = [
            `Fecha: ${fmtFecha(v.Fecha)}`,
            `Artista/s: ${artistasTxt}`,
            `Representante: ${representanteTxt}`,
            `Cliente: ${v.Cliente || ""}`,
            `Productora: ${v.Productora || ""}`,
            `Lugar: ${v.Ubicacion || ""}`,
            `Ubicación: ${v.Ubicacion || ""}`,
            `Espacio: ${v.NombreEvento || ""}`
        ];

        const right = [
            `Nombre evento: ${v.NombreEvento || ""}`,
            `Duración: ${duracion}`,
            `Estado: ${v.Estado || ""}`,
            `Moneda: ${v.Moneda || ""}`,
            `Importe total: ${v.Moneda} ${money(v.ImporteTotal)}`,
            `Importe abonado: ${v.Moneda} ${money(v.ImporteAbonado)}`,
            `Saldo: ${v.Moneda} ${money(v.Saldo)}`,
            `Cotización HOY: $${money(cotUSD)}`
        ];

        let ly = y + 5;

        left.forEach(t => {
            txt(X + 3, ly, t, { size: 7 });
            ly += 4.5;
        });

        let ry = y + 5;

        right.forEach(t => {
            txt(X + 95, ry, t, { size: 7 });
            ry += 4.5;
        });

        y += 43;

        /* =========================
           COBROS
        ========================= */

        sectionBar(y, "Cobros asociados");
        y += 6;

        const headerH = 6;
        const rowH = 7;

        const rows = cobros.length ? cobros : [{}];
        const tableH = headerH + (rows.length * rowH);

        rect(X, y, W, tableH);

        const cw = [30, 60, 30, 30, 30];

        const cx = [
            X,
            X + cw[0],
            X + cw[0] + cw[1],
            X + cw[0] + cw[1] + cw[2],
            X + cw[0] + cw[1] + cw[2] + cw[3]
        ];

        cell(cx[0], y, cw[0], headerH, "Fecha", { align: "center" });
        cell(cx[1], y, cw[1], headerH, "Cuenta", { align: "center" });
        cell(cx[2], y, cw[2], headerH, "Importe", { align: "center" });
        cell(cx[3], y, cw[3], headerH, "Cotización", { align: "center" });
        cell(cx[4], y, cw[4], headerH, "Conversión", { align: "center" });

        rows.forEach((c, i) => {

            const yy = y + headerH + (i * rowH);

            const fecha = c.Fecha ? moment(c.Fecha, "YYYY-MM-DD").format("DD/MM/YYYY") : "";
            const cuenta = c.Cuenta || "";
            const importe = c.Importe ? `${c.Moneda || ""} ${money(c.Importe)}` : "";
            const cot = c.Cotizacion ? money(c.Cotizacion) : "";
            const conv = c.Conversion ? money(c.Conversion) : "";

            cell(cx[0], yy, cw[0], rowH, fecha);
            cell(cx[1], yy, cw[1], rowH, cuenta);
            cell(cx[2], yy, cw[2], rowH, importe, { align: "right" });
            cell(cx[3], yy, cw[3], rowH, cot, { align: "right" });
            cell(cx[4], yy, cw[4], rowH, conv, { align: "right" });

        });

        y += tableH + 6;

        /* =========================
           RESUMEN
        ========================= */

        sectionBar(y, "Resumen");
        y += 6;

        rect(X, y, W, 16);

        txt(X + 3, y + 5, "Notas:", { size: 7 });

        txt(X + W - 3, y + 5,
            `Abonado ARS: $ ${money(cobradoARS)}`,
            { align: "right", size: 7 }
        );

        txt(X + W - 3, y + 10,
            `Abonado USD: USD ${money(cobradoUSD)}`,
            { align: "right", size: 7 }
        );

        /* =========================
           NOMBRE ARCHIVO
        ========================= */

        const fecha = moment(v.Fecha).isValid()
            ? moment(v.Fecha).format("DD.MM.YYYY")
            : moment().format("DD.MM.YYYY");

        const cliente = (v.Cliente || "")
            .toUpperCase()
            .replace(/[^\w\s.]/gi, "")
            .trim();

        const ubicacion = (v.Ubicacion || "")
            .toUpperCase()
            .replace(/[^\w\s.]/gi, "")
            .trim();

        const nombre = `Resumen ${cliente}-${fecha}-${ubicacion}.pdf`;

        doc.save(nombre);

    }


    async function exportarResumenComisiones(v) {

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("p", "mm", "a4");

        const PAGE_W = 210;
        const M = 6;

        const X = M;
        const W = PAGE_W - (M * 2);

        const BLACK = [0, 0, 0];
        const WHITE = [255, 255, 255];

        const logo = await cargarImagenBase64("/Imagenes/Logo_Negro.png");

        const artistas = Array.isArray(v.Artistas) ? v.Artistas : [];
        const personal = Array.isArray(v.Personal) ? v.Personal : [];
        const cobros = Array.isArray(v.Cobros) ? v.Cobros : [];

        const importeTotal = Number(v.ImporteTotal || 0);
        const importeAbonado = Number(v.ImporteAbonado || 0);
        const saldo = Number(v.Saldo || 0);

        let y = 5;

        /* =========================================
           HELPERS
        ========================================= */

        function generarNombrePDF(v) {

            const fecha = moment(v.Fecha).isValid()
                ? moment(v.Fecha).format("DD-MM-YYYY")
                : moment().format("DD-MM-YYYY");

            const evento = (v.NombreEvento || "Evento")
                .toUpperCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")   // quitar acentos
                .replace(/[^A-Z0-9 ]/g, "")        // quitar símbolos
                .trim()
                .replace(/\s+/g, "_");

            return `Resumen_comisiones-${fecha}-${evento}.pdf`;
        }

        function money(n, dec = 2) {
            return Number(n || 0).toLocaleString("es-AR", {
                minimumFractionDigits: dec,
                maximumFractionDigits: dec
            });
        }

        function money0(n) {
            return Number(n || 0).toLocaleString("es-AR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });
        }

        function fmtFecha(valor) {

            if (!valor) return "";

            const d = new Date(valor);

            if (isNaN(d.getTime()))
                return String(valor);

            const dd = String(d.getDate()).padStart(2, "0");
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const yy = d.getFullYear();

            return `${dd}/${mm}/${yy}`;
        }



        function fmtDuracion(valor) {

            if (!valor) return "";

            const d = new Date(valor);

            if (isNaN(d.getTime()))
                return String(valor).slice(0, 5);

            const hh = String(d.getHours()).padStart(2, "0");
            const mm = String(d.getMinutes()).padStart(2, "0");

            return `${hh}:${mm}`;
        }

        function txt(x, y, text, opt = {}) {

            const {
                size = 8,
                bold = false,
                align = "left",
                color = [0, 0, 0]
            } = opt;

            doc.setFont("helvetica", bold ? "bold" : "normal");
            doc.setFontSize(size);
            doc.setTextColor(color[0], color[1], color[2]);

            doc.text(String(text ?? ""), x, y, { align });
        }

        function rect(x, y, w, h, fill = null, lineWidth = 0.2) {

            doc.setLineWidth(lineWidth);
            doc.setDrawColor(0, 0, 0);

            if (fill) {

                doc.setFillColor(fill[0], fill[1], fill[2]);
                doc.rect(x, y, w, h, "FD");

            } else {

                doc.rect(x, y, w, h);

            }

        }

        function sectionBar(y, title) {

            rect(X, y, W, 6, BLACK, 0.2);

            txt(X + 3, y + 4, title, {
                size: 7,
                bold: true,
                color: WHITE
            });

        }

        function cell(x, y, w, h, textValue = "", opt = {}) {

            const {
                align = "left",
                fontSize = 7
            } = opt;

            rect(x, y, w, h, null, 0.2);

            let tx = x + 1.5;

            if (align === "center")
                tx = x + w / 2;

            if (align === "right")
                tx = x + w - 1.5;

            txt(tx, y + 4, textValue, {
                size: fontSize,
                align
            });
        }

        /* =========================================
           COTIZACION USD
        ========================================= */

      

        const idMonedaVenta = Number(v.IdMoneda || 0);
        const cotUSD = getCotizacionHoyDesdeSistema(idMonedaVenta);

        const monedaNombre = String(v.Moneda || "").toUpperCase();
        const esUSD = monedaNombre.includes("USD") || monedaNombre.includes("DOLAR") || monedaNombre.includes("US$");

        /* =========================================
           CALCULOS
        ========================================= */

        const cobradoARS = cobros.reduce(
            (a, x) => a + Number(x.Conversion || 0),
            0
        );

        const cobradoUSD = cobradoARS / cotUSD;

        const comisionPersonalARS = personal.reduce(
            (a, x) => a + Number(x.TotalComision || 0),
            0
        );

        const comisionArtistaARS = artistas.reduce(
            (a, x) => a + Number(x.TotalComision || 0),
            0
        );

        const comisionPersonalUSD = comisionPersonalARS / cotUSD;
        const comisionArtistaUSD = comisionArtistaARS / cotUSD;

        const artistasTxt = artistas.map(a => a.Artista).filter(Boolean).join(", ");
        const repTxt = artistas.map(a => a.Representante).filter(Boolean).join(", ");

        /* =========================================
           BORDE
        ========================================= */

        rect(2, 2, 206, 292, null, 0.3);

        /* =========================================
           TOP
        ========================================= */

        rect(X, y, W, 6, BLACK);

        txt(PAGE_W / 2, y + 4, "DOCUMENTO NO VÁLIDO COMO FACTURA", {
            align: "center",
            size: 8,
            color: WHITE
        });

        y += 6;

        /* =========================================
           HEADER
        ========================================= */

        rect(X, y, W, 28);

        doc.addImage(logo, "PNG", X + 6, y + 5, 18, 12);

        txt(X + 30, y + 8, "OroAmbiental", { bold: true });
        txt(X + 30, y + 13, "CUIT: 20-35970758-5", { size: 7 });
        txt(X + 30, y + 18, "Ingresos Brutos: 20359707585", { size: 7 });
        txt(X + 30, y + 23, "Inicio actividad: 01/03/2021", { size: 7 });

        txt(X + W - 18, y + 8, "VENTA N°", { align: "center", size: 11 });
        txt(X + W - 18, y + 18, String(v.Id || ""), { align: "center", size: 18 });

        y += 28;

        /* =========================================
           INFO VENTA
        ========================================= */

        sectionBar(y, "Información de venta");
        y += 6;

        rect(X, y, W, 38);

        const left = [
            `Fecha: ${fmtFecha(v.Fecha)}`,
            `Artistas: ${artistasTxt}`,
            `Representante: ${repTxt}`,
            `Cliente: ${v.Cliente || ""}`,
            `Productora: ${v.Productora || ""}`,
            `Lugar: ${v.Ubicacion || ""}`,
            `Espacio: ${v.NombreEvento || ""}`
        ];

        const right = [
            `Evento: ${v.NombreEvento}`,
            `Duración: ${fmtDuracion(v.Duracion)}`,
            `Estado: ${v.Estado}`,
            `Moneda: ${v.Moneda}`,
            `Importe total: ${v.Moneda} ${money0(importeTotal)}`,
            `Importe abonado: ${v.Moneda} ${money0(importeAbonado)}`,
            `Saldo: ${v.Moneda} ${money0(saldo)}`,
            `Cotización USD hoy: ${money(cotUSD, 2)}`
        ];

        let ly = y + 5;

        left.forEach(t => {

            txt(X + 3, ly, t, { size: 7 });
            ly += 4.5;

        });

        let ry = y + 5;

        right.forEach(t => {

            txt(X + 95, ry, t, { size: 7 });
            ry += 4.5;

        });

        y += 38 + 5;

        /* =========================================
           COBROS
        ========================================= */

        sectionBar(y, "Cobros asociados");
        y += 6;

        const headerH = 6;
        const rowH = 7;

        const rows = Math.max(cobros.length, 1);

        const tableH = headerH + (rows * rowH);

        rect(X, y, W, tableH);

        const cw = [28, 55, 30, 30, 30];

        const cx = [
            X,
            X + cw[0],
            X + cw[0] + cw[1],
            X + cw[0] + cw[1] + cw[2],
            X + cw[0] + cw[1] + cw[2] + cw[3]
        ];

        cell(cx[0], y, cw[0], headerH, "Fecha", { align: "center" });
        cell(cx[1], y, cw[1], headerH, "Cuenta", { align: "center" });
        cell(cx[2], y, cw[2], headerH, "Importe", { align: "center" });
        cell(cx[3], y, cw[3], headerH, "Cotización", { align: "center" });
        cell(cx[4], y, cw[4], headerH, "Conversión", { align: "center" });

        if (cobros.length === 0) {

            cell(cx[0], y + headerH, cw[0], rowH, "-", { align: "center" });
            cell(cx[1], y + headerH, cw[1], rowH, "Sin cobros", { align: "center" });

        }
        else {

            cobros.forEach((c, i) => {

                const yy = y + headerH + (i * rowH);

                cell(cx[0], yy, cw[0], rowH, fmtFechaHora(c.Fecha));
                cell(cx[1], yy, cw[1], rowH, c.Cuenta || "");
                cell(cx[2], yy, cw[2], rowH, `${c.Moneda || ""} ${money0(c.Importe)}`);
                cell(cx[3], yy, cw[3], rowH, money(c.Cotizacion));
                cell(cx[4], yy, cw[4], rowH, money0(c.Conversion));

            });

        }

        y += tableH;

        /* =========================================
           RESUMEN COBROS
        ========================================= */

        sectionBar(y, "Resumen de cobros");
        y += 6;

        rect(X, y, W, 16);

        txt(X + W - 3, y + 5, `Abonado ARS: $ ${money0(cobradoARS)}`, { align: "right" });
        txt(X + W - 3, y + 10, `Abonado USD: USD ${money0(cobradoUSD)}`, { align: "right" });

        y += 16;

        /* =========================================
           COMISION PERSONAL
        ========================================= */

        sectionBar(y, "Resumen de comisiones");
        y += 6;

        const rowsP = Math.max(personal.length, 1);
        const tablePH = 6 + rowsP * 7 + 10;

        rect(X, y, W, tablePH);

        const pw = [24, 82, 38, 38];

        const px = [
            X,
            X + pw[0],
            X + pw[0] + pw[1],
            X + pw[0] + pw[1] + pw[2]
        ];

        cell(px[0], y, pw[0], 6, "% Comisión", { align: "center" });
        cell(px[1], y, pw[1], 6, "Puesto", { align: "center" });
        cell(px[2], y, pw[2], 6, "Total ARS", { align: "center" });
        cell(px[3], y, pw[3], 6, "Total USD", { align: "center" });

        let totalPersonalARS = 0;
        let totalPersonalUSD = 0;

        personal.forEach((p, i) => {

            const yy = y + 6 + (i * 7);

            const totalVenta = Number(v.ImporteTotal || 0);
            const pct = Number(p.PorcComision || 0);

            const total = vnRound2(totalVenta * (pct / 100));

            // 🔥 EL TOTAL YA VIENE EN MONEDA ORIGINAL
            let ars = 0;
            let usd = 0;

            if (esUSD) {
                usd = total;
                ars = total * cotUSD;
            } else {
                ars = total;
                usd = cotUSD > 0 ? total / cotUSD : 0;
            }
            totalPersonalARS += ars;
            totalPersonalUSD += usd;

            cell(px[0], yy, pw[0], 7, `${p.PorcComision}%`, { align: "center" });
            cell(px[1], yy, pw[1], 7, p.Cargo || "");
            cell(px[2], yy, pw[2], 7, `$ ${money0(ars)}`);
            cell(px[3], yy, pw[3], 7, `USD ${money0(usd)}`);

        });

        txt(X + W - 3, y + tablePH - 5, `Comisión ARS: $ ${money0(totalPersonalARS)}`, { align: "right" });
        txt(X + W - 3, y + tablePH - 1, `Comisión USD: USD ${money0(totalPersonalUSD)}`, { align: "right" });

        y += tablePH;

        /* =========================================
           COMISION ARTISTA
        ========================================= */

        sectionBar(y, "Resumen de comisión de artista");
        y += 6;

        const rowsA = Math.max(artistas.length, 1);
        const tableAH = 6 + rowsA * 7 + 10;

        rect(X, y, W, tableAH);

        let totalArtistaARS = 0;
        let totalArtistaUSD = 0;

        artistas.forEach((a, i) => {

            const yy = y + 6 + (i * 7);

            const totalVenta = Number(v.ImporteTotal || 0);
            const pct = Number(a.PorcComision || 0);

            const total = vnRound2(totalVenta * (pct / 100));

            let ars = 0;
            let usd = 0;

            if (esUSD) {
                usd = total;
                ars = total * cotUSD;
            } else {
                ars = total;
                usd = cotUSD > 0 ? total / cotUSD : 0;
            }

            totalArtistaARS += ars;
            totalArtistaUSD += usd;

            cell(px[0], yy, pw[0], 7, `${a.PorcComision}%`, { align: "center" });
            cell(px[1], yy, pw[1], 7, a.Artista || "");
            cell(px[2], yy, pw[2], 7, `$ ${money0(ars)}`);
            cell(px[3], yy, pw[3], 7, `USD ${money0(usd)}`);

        });

        txt(X + W - 3, y + tableAH - 5, `Comisión ARS: $ ${money0(totalArtistaARS)}`, { align: "right" });
        txt(X + W - 3, y + tableAH - 1, `Comisión USD: USD ${money0(totalArtistaUSD)}`, { align: "right" });

        doc.save(generarNombrePDF(v));

    }
    async function exportarContrato(tipo) {
        try {
            if (!validarCamposVenta()) return;

            const idVenta = Number(document.getElementById("Venta_Id")?.value || 0);
            if (!idVenta) {
                errorModal("Primero guardá la venta.");
                return;
            }

            const idTipoContrato = Number(document.getElementById("IdTipoContrato")?.value || 0);
            if (!idTipoContrato) {
                errorModal("Seleccioná el Tipo de contrato.");
                return;
            }

            // 🔥 DATA COMPLETA DESDE BACK
            const v = await vnFetchJson(API.editarInfo(idVenta));

            const tplBuf = await fetchContratoTemplate(
                idTipoContrato,
                `Contrato_${idTipoContrato}.docx`
            );

            const data = buildContratoData(v);

            console.log("DATA CONTRATO:", data);

            const blobDocx = renderDocxFromTemplate(tplBuf, data);

            if (tipo === "word") {
                const url = URL.createObjectURL(blobDocx);

                const a = document.createElement("a");
                a.href = url;
                a.download = `${data.NombreArchivo}.docx`;
                a.click();

                URL.revokeObjectURL(url);

                exitoModal("Contrato generado en Word.");
                return;
            }

            const arrayBuffer = await blobDocx.arrayBuffer();

            const result = await mammoth.convertToHtml({ arrayBuffer });
            const html = result.value;

            const container = document.createElement("div");
            container.style.padding = "40px";
            container.style.left = "-9999px";
            container.style.top = "-9999px";
            container.style.background = "white";
            container.innerHTML = html;

            document.body.appendChild(container);

            const opt = {
                margin: 10,
                filename: `${data.NombreArchivo}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: {
                    unit: "mm",
                    format: "a4",
                    orientation: "portrait"
                }
            };

            await html2pdf()
                .set(opt)
                .from(container)
                .save();

            document.body.removeChild(container);

            exitoModal("Contrato generado en PDF.");
        }
        catch (e) {
            console.error(e);
            errorModal("No se pudo generar el contrato.");
        }
    }
    async function fetchContratoTemplate(idTipoContrato, fallbackName) {
        const r = await fetch(`/Contratos/Descargar?idTipoContrato=${idTipoContrato}&nombre=${encodeURIComponent(fallbackName)}`, {
            method: "GET",
            headers: { "Authorization": "Bearer " + (token || "") }
        });

        if (!r.ok) {
            // 🔥 este error tiene que ir con errorModal
            throw new Error("No existe plantilla para este tipo de contrato.");
        }

        return await r.arrayBuffer();
    }
    async function fetchContratoTemplate(idTipoContrato, fallbackName) {
        const r = await fetch(`/Contratos/Descargar?idTipoContrato=${idTipoContrato}&nombre=${encodeURIComponent(fallbackName)}`, {
            method: "GET",
            headers: { "Authorization": "Bearer " + (token || "") }
        });

        if (!r.ok) {
            // 🔥 este error tiene que ir con errorModal
            throw new Error("No existe plantilla para este tipo de contrato.");
        }

        return await r.arrayBuffer();
    }

    function buildContratoData(v) {

        v = v || {};

        const safe = x => x == null ? "" : String(x);
        const num = x => Number(x || 0);
        const money = n => num(n).toLocaleString("es-AR");

        let Dia = "";
        let Mes = "";
        let Año = "";
        let FechaEvento = "";

        if (v.Fecha) {
            const f = new Date(v.Fecha);

            if (!isNaN(f)) {
                Dia = f.getDate();
                Mes = f.toLocaleString("es-AR", { month: "long" });
                Año = f.getFullYear();
                FechaEvento = f.toLocaleDateString("es-AR");
            }
        }

        let DuracionHora = "0";
        let DuracionMinuto = "00";

        if (v.Duracion) {

            const parts = String(v.Duracion).split(":");

            if (parts.length === 2) {
                DuracionHora = parts[0];
                DuracionMinuto = parts[1];
            }
        }

        const artistas = Array.isArray(v.Artistas) ? v.Artistas : [];
        const a1 = artistas[0] || {};
        const a2 = artistas[1] || {};

        const personal = Array.isArray(v.Personal) ? v.Personal : [];
        const p1 = personal[0] || {};
        const p2 = personal[1] || {};

        const importeTotal = num(v.ImporteTotal);
        const mitad1 = Math.floor(importeTotal / 2);
        const mitad2 = importeTotal - mitad1;

        const totalCobrado = num(v.ImporteAbonado);
        const saldo = num(v.Saldo);

        const clienteNombre = safe(v.Cliente);
        const moneda = safe(v.Moneda);

        const nombreArchivo =
            (safe(v.NombreEvento) || safe(clienteNombre) || "Contrato")
                .replace(/[^\w\s-]/gi, "")
                .replace(/\s+/g, "_");

        return {
            Cliente: clienteNombre,
            NombreCliente: " " + clienteNombre + " ",

            DniCliente: " " + safe(v.DniCliente) + " ",
            CuitCliente: safe(v.CuitCliente),
            DomicilioCliente: safe(v.DomicilioCliente),
            TelefonoCliente: safe(v.TelefonoCliente),
            EmailCliente: safe(v.EmailCliente),

            ProductoraCliente: safe(v.Productora),

            FirmaNombreCliente: clienteNombre,
            FirmaDNICliente: safe(v.DniCliente),
            FirmaDniCliente: safe(v.DniCliente),

            NombreEvento: safe(v.NombreEvento),

            Ubicacion: safe(v.Ubicacion),
            "Ubicación": safe(v.Ubicacion),
            Lugar: safe(v.Ubicacion),
            Espacio: safe(v.NombreEvento),

            Dia,
            Mes,
            Año,
            FechaEvento,

            DuracionHora,
            DuracionMinuto,

            Exclusividad:
                Number(v.IdOpExclusividad || 0) === 1
                    ? " con exclusividad artística según lo pactado entre las partes."
                    : "",

            Moneda: moneda,
            NombreMoneda_1: moneda,
            NombreMoneda_2: moneda,
            NombreMoneda_3: moneda,

            ImporteTotal: importeTotal,
            ImporteTotalTexto: money(importeTotal),

            Mitad: mitad1,
            Mitad_1: mitad1,
            Mitad_2: mitad2,

            ImporteTotalMitad_1: mitad1,
            ImporteTotalMitad_2: mitad2,

            MitadTexto_1: money(mitad1),
            MitadTexto_2: money(mitad2),

            TotalCobrado: totalCobrado,
            Saldo: saldo,

            NombreArtista: safe(a1.Artista),
            NombreArtista1: safe(a1.Artista),
            NombreArtista_2: safe(a1.Artista),
            FirmaNombreArtista1: safe(a1.Artista),

            DniArtista: safe(a1.DniArtista),
            CuitArtista: safe(a1.CuitArtista),
            DomicilioArtista: safe(a1.DomicilioArtista),
            FirmaDNIArtista1: safe(a1.DniArtista),

            NombreArtista2: safe(a2.Artista),
            FirmaNombreArtista2: safe(a2.Artista),

            DniArtista2: safe(a2.DniArtista),
            CuitArtista2: safe(a2.CuitArtista),
            DomicilioArtista2: safe(a2.DomicilioArtista),
            FirmaDNIArtista2: safe(a2.DniArtista),

            NombreRepresentante: safe(a1.Representante),
            NombreRepresentante1: safe(a1.Representante),
            FirmaNombreRepresentante: safe(a1.Representante),
            FirmaNombreRepresentante1: safe(a1.Representante),

            DniRepresentante: safe(a1.DniRepresentante),
            CuitRepresentante: safe(a1.CuitRepresentante),
            DomicilioRepresentante: safe(a1.DomicilioRepresentante),
            FirmaDNIRepresentante: safe(a1.DniRepresentante),
            FirmaDNIRepresentante1: safe(a1.DniRepresentante),

            NombreRepresentante2: safe(a2.Representante),
            FirmaNombreRepresentante2: safe(a2.Representante),

            DniRepresentante2: safe(a2.DniRepresentante),
            CuitRepresentante2: safe(a2.CuitRepresentante),
            DomicilioRepresentante2: safe(a2.DomicilioRepresentante),
            FirmaDNIRepresentante2: safe(a2.DniRepresentante),

            NombrePersonal1: safe(p1.Personal),
            CargoPersonal1: safe(p1.Cargo),
            NombrePersonal2: safe(p2.Personal),
            CargoPersonal2: safe(p2.Cargo),

            DatosArtista2: "",

            IdVenta: safe(v.Id),
            NombreArchivo: nombreArchivo
        };
    }
    function textById(list, id) {
        id = Number(id || 0);
        if (!id) return "";
        const it = (list || []).find(x => Number(x.Id) === id);
        return it?.Nombre || it?.Descripcion || "";
    }

    function renderDocxFromTemplate(arrayBuffer, data) {

        const zip = new PizZip(arrayBuffer);

        const doc = new docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => "",
            delimiters: {
                start: "{",
                end: "}"
            }
        });

        doc.render(data);

        return doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        });
    }
    /* =========================
       INIT
    ========================= */
    document.addEventListener("DOMContentLoaded", async () => {

        Permisos.init();
        Permisos.aplicarUI("Ventas");

        try {
            await initModalArtistaVentas();
            await initModalPersonalVentas();
            await initModalClienteVentas();
            await initModalProductoraVentas();
            await initModalUbicacionVentas();
            initDuracionMask();
            actualizarVisibilidadContrato();
            actualizarVisibilidadResumenes();
           
            initSecciones()
            bindUI();

            registrarEventosEstadoVenta();
            registrarListenerConfiguracionesGlobales();

            await cargarCombosBase();
            await cargarClientes();

            initSelectsBasicos();

            // defaults
            setDefaultsNueva();

            // si viene idCliente
            if (Number(VN.init.idCliente || 0) > 0) {
                setClienteSeleccionado(Number(VN.init.idCliente), true);
            }

            const btnVenta = document.getElementById("btnGuardarVenta");

            // si viene id (editar)
            const idVenta = Number(VN.init.id || document.getElementById("Venta_Id")?.value || 0);
            if (idVenta > 0) {

                const titulo = document.getElementById("tituloVenta");

                if (!Permisos.tiene("Ventas", "Editar")) {
                    btnVenta.setAttribute("hidden", "hidden");
                } else {
                    if (titulo) titulo.textContent = " Modificar venta";
                }

                await abrirVenta(idVenta);

            } else {

                const titulo = document.getElementById("tituloVenta");


                if (!Permisos.tiene("Ventas", "Crear")) {
                    btnVenta.setAttribute("hidden", "hidden");
                } else {
                    if (titulo) titulo.textContent = " Registrar venta";
                }

               

                document.getElementById("Venta_Id").value = "0";

                renderDetalle();
                recalcularTotales();

                // auditoría vacía
                setAuditoria({});

                vnSetSaving(false, "Listo", "ok");
            }

          
            // autosave draft
            setInterval(() => {
                if (!VN.flags.autosaveEnabled) return;
                if (!VN.flags.ready) return;
                if (!VN.flags.dirty) return;
                guardarDraft(false);
            }, 6000);

            VN.flags.ready = true;
        } catch (e) {
            console.error(e);
            vnToastErr("Error inicializando la pantalla de ventas.");
        }
    });
    document.addEventListener("click", function (e) {
        const isSelect2 =
            e.target.closest(".select2-container") ||
            e.target.closest(".select2-dropdown");

        if (!isSelect2) {
            $(".select2-hidden-accessible").each(function () {
                if ($(this).data("select2")) {
                    $(this).select2("close");
                }
            });
        }
    });
    document.addEventListener("input", function (e) {
        const input = e.target;
        if (!input.classList || !input.classList.contains("Inputmiles")) return;

        let value = input.value ?? "";
        const hadTrailingComma = value.endsWith(",");

        value = value.replace(/[^0-9.,]/g, "");

        const firstComma = value.indexOf(",");
        if (firstComma >= 0) {
            const before = value.slice(0, firstComma);
            const after = value.slice(firstComma + 1).replace(/,/g, "");
            value = before + "," + after;
        }

        let [entero, decimal] = value.split(",");
        entero = (entero || "").replace(/\./g, "");

        if (entero !== "") {
            entero = Number(entero).toLocaleString("es-AR");
        }

        if (decimal !== undefined) {
            input.value = `${entero},${decimal}`;
        } else if (hadTrailingComma) {
            input.value = `${entero},`;
        } else {
            input.value = entero;
        }
    });

    function bindUI() {

        const btnGuardar = document.getElementById("btnGuardarVenta");
        const btnReset = document.getElementById("btnReset");
        const btnDraftRestore = document.getElementById("btnDraftRestore");
        const btnDraftClear = document.getElementById("btnDraftClear");
        const btnDraftSave = document.getElementById("btnDraftSave");

        /* =========================
           BOTONES PRINCIPALES
        ========================= */

        btnDraftSave?.addEventListener("click", () => {
            guardarDraft(true);
        });

        btnGuardar?.addEventListener("click", () => guardarVenta());

        btnReset?.addEventListener("click", async () => {
            const ok = await vnConfirm("¿Reiniciar la venta? (no guarda cambios)");
            if (!ok) return;
            resetAll();
        });

        btnDraftRestore?.addEventListener("click", () => restaurarDraft());

        btnDraftClear?.addEventListener("click", async () => {
            const ok = await vnConfirm("¿Eliminar el borrador guardado?");
            if (!ok) return;
            localStorage.removeItem(DRAFT_KEY());
            vnToastOk("Borrador eliminado.");
        });

        /* =========================
           EXPORTACIONES
        ========================= */

        document.getElementById("btnResumenComisiones")
            ?.addEventListener("click", () => exportarResumen("comisiones"));

        document.getElementById("btnResumenCliente")
            ?.addEventListener("click", () => exportarResumen("cliente"));

        document.getElementById("btnContrato")?.addEventListener("click", async () => {

            const idTipoContrato = Number(document.getElementById("IdTipoContrato")?.value || 0);

            if (!idTipoContrato) {
                vnToastErr("Seleccioná el Tipo de contrato antes de generar.");
                return;
            }

            const formato = document.getElementById("Contrato_Formato")?.value || "pdf";

            await exportarContrato(formato);
        });

        /* =========================
           AGREGAR DETALLE
        ========================= */

        document.getElementById("btnAddArtista")?.addEventListener("click", () => {

            VN.detalle.artistas.push({
                Id: 0,
                IdArtista: 0,
                IdRepresentante: 0,
                PorcComision: 0,
                TotalComision: 0
            });

            renderDetalle();
            vnMarkDirty();
        });

        document.getElementById("btnAddPersonal")?.addEventListener("click", () => {

            VN.detalle.personal.push({
                Id: 0,
                IdPersonal: 0,
                IdCargo: 0,
                IdTipoComision: 0,
                PorcComision: 0,
                TotalComision: 0
            });

            renderDetalle();
            vnMarkDirty();
        });

        document.getElementById("btnAddCobro")?.addEventListener("click", () => {

            const idMoneda = Number(document.getElementById("IdMoneda")?.value || 0);

            VN.detalle.cobros.push({
                Id: 0,
                Fecha: new Date(),
                IdMoneda: idMoneda,
                IdCuenta: 0,
                Importe: 0,
                Cotizacion: getCotizacionById(idMoneda),
                Conversion: 0,
                ManualConversion: false,
                NotaCliente: "",
                NotaInterna: ""
            });

            renderDetalle();
            recalcularTotales();
            vnMarkDirty();
        });

        /* =========================
           ELIMINAR VENTA
        ========================= */

        const btnEliminar = document.getElementById("btnEliminarVenta");

        btnEliminar?.addEventListener("click", async () => {

            if (!Permisos.tiene("Ventas", "Eliminar")) {
                errorModal("No tenés permisos.");
                return;
            }

            const id = Number(document.getElementById("Venta_Id")?.value || 0);

            if (!id) {
                errorModal("La venta aún no está guardada.");
                return;
            }

            const ok = await confirmarModal("¿Eliminar la venta? Esta acción no se puede deshacer.");
            if (!ok) return;

            try {

                const r = await fetch(`/Ventas/Eliminar?id=${id}`, {
                    method: "DELETE",
                    headers: { "Authorization": "Bearer " + (token || "") }
                });

                const data = await r.json();

                if (!data.valor) {
                    errorModal(data.mensaje);
                    return;
                }

                exitoModal("Venta eliminada correctamente.");

                setTimeout(() => {
                    window.location.href = "/Ventas";
                }, 800);

            } catch (e) {
                console.error(e);
                errorModal("Error eliminando la venta.");
            }
        });

        /* =========================
           EVENTO GLOBAL (CLAVE)
        ========================= */

        $(document).on("select2:select select2:clear", "select", function () {

            const el = this;

            // 🔥 FORZAR MISMA LÓGICA
            handleChangeGlobal(el);

        });

        document.addEventListener("change", function (e) {
            handleChangeGlobal(e.target);
        });

        /* =========================
           INPUT GLOBAL (CONTROLADO)
        ========================= */

        document.addEventListener("input", function (e) {

            const el = e.target;
            if (!el) return;

            // 🔥 IMPORTE TOTAL
            if (el.id === "ImporteTotal") {

                vnMarkDirty();

                recalcularTodasLasComisiones();
                recalcularTotales();
            }

        });

        /* =========================
           SELECT2 CLOSE (UX)
        ========================= */

        document.addEventListener("click", function (e) {

            const isSelect2 =
                e.target.closest(".select2-container") ||
                e.target.closest(".select2-dropdown");

            if (!isSelect2) {
                $(".select2-hidden-accessible").each(function () {
                    if ($(this).data("select2")) {
                        $(this).select2("close");
                    }
                });
            }

        });

    }

    function handleChangeGlobal(el) {

        if (!el) return;

        validarCampoIndividual(el);

        const id = el.id;

        // 🔥 MONEDA
        if (id === "IdMoneda") {

            vnMarkDirty();

            actualizarCobrosPorCambioMonedaVenta();

            recalcularTodasLasComisiones();
            recalcularTotales();

            return;
        }

        const recalcularIds = [
            "IdCliente",
            "Fecha",
            "IdUbicacion",
            "IdProductora",
            "IdEstado",
            "IdTipoContrato"
        ];

        if (recalcularIds.includes(id)) {

            vnMarkDirty();
            recalcularTotales();
        }

    }
    /* =========================
       CARGAS BASE
    ========================= */
    async function cargarCombosBase() {
        const [
            productoras, ubicaciones, monedas, estados, tiposContrato, opcionesBinarias,
            artistas, representantes, personal, cargos, tiposComision, cuentas
        ] = await Promise.all([
            vnFetchJson(API.productoras).catch(_ => []),
            vnFetchJson(API.ubicaciones).catch(_ => []),
            vnFetchJson(API.monedas).catch(_ => []),
            vnFetchJson(API.estadosVenta).catch(_ => []),
            vnFetchJson(API.tiposContrato).catch(_ => []),
            vnFetchJson(API.opcionesBinarias).catch(_ => []),

            vnFetchJson(API.artistas).catch(_ => []),
            vnFetchJson(API.representantes).catch(_ => []),

            vnFetchJson(API.personal).catch(_ => []),
            vnFetchJson(API.cargos).catch(_ => []),
            vnFetchJson(API.tiposComision).catch(_ => []),

            vnFetchJson(API.cuentas).catch(_ => [])
        ]);

        VN.combos.productoras = productoras || [];
        VN.combos.ubicaciones = ubicaciones || [];
        VN.combos.monedas = monedas || [];
        VN.combos.estados = estados || [];
        VN.combos.tiposContrato = tiposContrato || [];
        VN.combos.opcionesBinarias = opcionesBinarias || [];

        VN.combos.artistas = artistas || [];
        VN.combos.representantes = representantes || [];

        VN.combos.personal = personal || [];
        VN.combos.cargos = cargos || [];
        VN.combos.tiposComision = tiposComision || [];

        VN.combos.cuentas = cuentas || [];
    }

    async function cargarClientes() {
        const data = await vnFetchJson(API.listaClientes).catch(_ => []);
        VN.clientes = Array.isArray(data) ? data : [];
    }

    /* =========================
       INIT SELECTS
    ========================= */
    function initSelectsBasicos() {
        // Cliente (Select2 local con búsqueda)
        const selCli = document.getElementById("IdCliente");
        vnFillSelectDom(selCli, VN.clientes, "Id", "Nombre", "Seleccionar");

        ensureSelect2("#IdCliente", {
            placeholder: "Seleccioná cliente",
            matcher: function (params, data) {
                if (!params.term) return data;
                if (!data || !data.text) return null;
                const term = params.term.toLowerCase();
                return data.text.toLowerCase().includes(term) ? data : null;
            }
        });

        // Combos Datos
        vnFillSelectDom(document.getElementById("IdUbicacion"), VN.combos.ubicaciones, "Id", "Descripcion", "Seleccionar");
        vnFillSelectDom(document.getElementById("IdProductora"), VN.combos.productoras, "Id", "Nombre", "Seleccionar");
        vnFillSelectDom(document.getElementById("IdMoneda"), VN.combos.monedas, "Id", "Nombre", "Seleccionar");
        vnFillSelectDom(document.getElementById("IdEstado"), VN.combos.estados, "Id", "Nombre", "Seleccionar");
        vnFillSelectDom(document.getElementById("IdTipoContrato"), VN.combos.tiposContrato, "Id", "Nombre", "Seleccionar");

        // Exclusividad: 1=SI 2=NO (tu regla)
        // Endpoint también puede devolverlo, pero lo rellenamos robusto:
        const opBin = VN.combos.opcionesBinarias?.length ? VN.combos.opcionesBinarias : [
            { Id: 1, Nombre: "Sí" },
            { Id: 2, Nombre: "No" }
        ];
        vnFillSelectDom(document.getElementById("IdOpExclusividad"), opBin, "Id", "Nombre", "—");

        ensureSelect2("#IdUbicacion");
        ensureSelect2("#IdProductora");
        ensureSelect2("#IdMoneda");
        ensureSelect2("#IdEstado");
        ensureSelect2("#IdTipoContrato");
        ensureSelect2("#IdOpExclusividad");

        // change cliente writes hidden
        $("#IdCliente")?.on("change", function () {
            const idCliente = Number(this.value || 0);
            document.getElementById("Venta_IdCliente").value = String(idCliente || 0);
            vnMarkDirty();
        });
    }

    function setClienteSeleccionado(idCliente, triggerChange) {
        const el = document.getElementById("IdCliente");
        if (!el) return;
        el.value = String(idCliente || "");
        if (triggerChange) $("#IdCliente")?.trigger("change.select2");
        document.getElementById("Venta_IdCliente").value = String(idCliente || 0);
    }

    function setDefaultsNueva() {

        const id = Number(document.getElementById("Venta_Id")?.value || 0)
        if (id > 0) return

        const f = document.getElementById("Fecha")
        if (f && !f.value)
            f.value = vnTodayIso()

        const d = document.getElementById("Duracion")
        if (d && !d.value)
            d.value = "02:00"

    }

    function resetAll() {
        // reset form fields (sin recargar combos)
        document.getElementById("Venta_Id").value = "0";

        // cliente: mantener si venía desde query? por defecto lo limpiamos
        setClienteSeleccionado(0, true);

        document.getElementById("Fecha").value = vnNowIsoLocal();
        document.getElementById("NombreEvento").value = "";
        document.getElementById("Duracion").value = "00:00";

        document.getElementById("IdUbicacion").value = "";
        $("#IdUbicacion")?.trigger("change.select2");

        document.getElementById("IdProductora").value = "";
        $("#IdProductora")?.trigger("change.select2");

        document.getElementById("IdMoneda").value = "";
        $("#IdMoneda")?.trigger("change.select2");

        document.getElementById("IdEstado").value = "";
        $("#IdEstado")?.trigger("change.select2");

        document.getElementById("IdTipoContrato").value = "";
        $("#IdTipoContrato")?.trigger("change.select2");

        document.getElementById("IdOpExclusividad").value = "";
        $("#IdOpExclusividad")?.trigger("change.select2");

        document.getElementById("DiasPrevios").value = "";
        document.getElementById("FechaHasta").value = "";
        document.getElementById("ImporteTotal").value = "";

        document.getElementById("NotaInterna").value = "";
        document.getElementById("NotaCliente").value = "";

        // detalle
        VN.detalle.artistas = [];
        VN.detalle.personal = [];
        VN.detalle.cobros = [];

        renderDetalle();
        recalcularTotales();
        actualizarVisibilidadContrato();
        actualizarVisibilidadResumenes();

        VN.flags.dirty = false;
        vnSetSaving(false, "Listo", "ok");
    }

    /* =========================
       ABRIR VENTA (editar)
    ========================= */
    async function abrirVenta(idVenta) {
        try {
            vnSetSaving(true, "Cargando venta...");

            const v = await vnFetchJson(API.editarInfo(idVenta));

            document.getElementById("Venta_Id").value = String(v.Id || 0);
            document.getElementById("Venta_IdCliente").value = String(v.IdCliente || 0);

            // =========================
            // Cliente
            // =========================
            setClienteSeleccionado(Number(v.IdCliente || 0), true);

            // =========================
            // Fecha (input type="date" => YYYY-MM-DD)
            // =========================
            const elFecha = document.getElementById("Fecha");
            if (elFecha) {
                elFecha.value = vnIsoDateOnly(v.Fecha); // ✅ date-only
            }

            // =========================
            // Nombre evento
            // =========================
            document.getElementById("NombreEvento").value = v.NombreEvento || "";

            // =========================
            // Duración (input "HH:mm")
            // VM trae DateTime => extraer HH:mm
            // =========================
            const elDur = document.getElementById("Duracion");
            if (elDur) {
                if (typeof v.Duracion === "string") {
                    elDur.value = v.Duracion;
                } else {
                    elDur.value = vnTimeHHmm(v.Duracion);
                }
            }

            // =========================
            // Combos (Select2)
            // =========================
            document.getElementById("IdUbicacion").value = String(v.IdUbicacion || "");
            $("#IdUbicacion")?.trigger("change.select2");

            document.getElementById("IdProductora").value = String(v.IdProductora || "");
            $("#IdProductora")?.trigger("change.select2");

            document.getElementById("IdMoneda").value = String(v.IdMoneda || "");
            $("#IdMoneda")?.trigger("change.select2");

            document.getElementById("IdEstado").value = String(v.IdEstado || "");
            $("#IdEstado")?.trigger("change.select2");

            document.getElementById("IdTipoContrato").value = String(v.IdTipoContrato || "");
            $("#IdTipoContrato")?.trigger("change.select2");

            document.getElementById("IdOpExclusividad").value =
                v.IdOpExclusividad != null ? String(v.IdOpExclusividad) : "";
            $("#IdOpExclusividad")?.trigger("change.select2");

            // =========================
            // Campos opcionales
            // =========================
            document.getElementById("DiasPrevios").value =
                v.DiasPrevios != null ? String(v.DiasPrevios) : "";

            const elFechaHasta = document.getElementById("FechaHasta");
            if (elFechaHasta) {
                // si tu input es datetime-local: usar vnIsoDateTimeLocal
                // si tu input es date: usar vnIsoDateOnly
                // (te dejo el más común: datetime-local)
                elFechaHasta.value = v.FechaHasta ? vnIsoDateTimeLocal(v.FechaHasta) : "";
            }

            // =========================
            // ImporteTotal (texto, y si tenés miles, lo formateás después)
            // =========================
            const elImp = document.getElementById("ImporteTotal");
            if (elImp) {
                // guardo como número simple, sin "NaN"
                elImp.value = vnFormatInput(v.ImporteTotal);
            }

            document.getElementById("NotaInterna").value = v.NotaInterna || "";
            document.getElementById("NotaCliente").value = v.NotaCliente || "";

            // =========================
            // Detalle (normalización)
            // =========================
            VN.detalle.artistas = Array.isArray(v.Artistas)
                ? v.Artistas.map(x => ({
                    Id: Number(x.Id || 0),
                    IdArtista: Number(x.IdArtista || 0),
                    IdRepresentante: Number(x.IdRepresentante || 0),
                    PorcComision: Number(x.PorcComision || 0),
                    TotalComision: Number(x.TotalComision || 0)
                }))
                : [];

            VN.detalle.personal = Array.isArray(v.Personal)
                ? v.Personal.map(x => ({
                    Id: Number(x.Id || 0),
                    IdPersonal: Number(x.IdPersonal || 0),
                    IdCargo: Number(x.IdCargo || 0),
                    IdTipoComision: Number(x.IdTipoComision || 0),
                    PorcComision: Number(x.PorcComision || 0),
                    TotalComision: Number(x.TotalComision || 0)
                }))
                : [];

            VN.detalle.cobros = Array.isArray(v.Cobros)
                ? v.Cobros.map(x => {
                    const importe = Number(x.Importe || 0);
                    const cot = Number(x.Cotizacion || 1) || 1;
                    const conv = Number(x.Conversion || 0);

                    return {
                        Id: Number(x.Id || 0),
                        Fecha: x.Fecha ? new Date(x.Fecha) : new Date(),
                        IdMoneda: Number(x.IdMoneda || 0),
                        IdCuenta: Number(x.IdCuenta || 0),
                        Importe: importe,
                        Cotizacion: cot,
                        Conversion: conv > 0 ? conv : vnRound2(importe * cot), // ✅ fallback consistente
                        ManualConversion: true, // viene de backend => respetamos
                        NotaCliente: x.NotaCliente || "",
                        NotaInterna: x.NotaInterna || ""
                    };
                })
                : [];

            // =========================
            // Render + totales
            // =========================
            renderDetalle();
            recalcularTotales();

            // =========================
            // Auditoría
            // =========================
            setAuditoria(v);

            actualizarVisibilidadContrato();
            actualizarVisibilidadResumenes();

            VN.flags.dirty = false;
            vnSetSaving(false, "Listo", "ok");

            // Si usás input con miles, aplicalo al final
            if (typeof aplicarFormatoMiles === "function") aplicarFormatoMiles();

        } catch (e) {
            console.error(e);
            vnToastErr("No se pudo abrir la venta.");
            vnSetSaving(false, "Error", "err");
        }
    }

    function setAuditoria(v) {

        const audReg = document.getElementById("audReg");
        const audMod = document.getElementById("audMod");

        const emptyHtml = `
        <div class="vn-empty">
            <i class="fa fa-clock-o"></i>
            <div>Sin información de auditoría</div>
            <small>La auditoría se generará cuando se registre o modifique la venta</small>
        </div>
    `;

     


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
                <div class="vn-chip mt-2">
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
        renderArtistas();
        renderPersonal();
        renderCobros();

        const cntA = document.getElementById("cntArtistas");
        const cntP = document.getElementById("cntPersonal");
        const cntC = document.getElementById("cntCobros");

        if (cntA) cntA.textContent = `(${VN.detalle.artistas.length})`;
        if (cntP) cntP.textContent = `(${VN.detalle.personal.length})`;
        if (cntC) cntC.textContent = `(${VN.detalle.cobros.length})`;

        aplicarFormatoMiles()

    }

    function renderArtistas() {
        const tb = document.getElementById("tbArtistas");
        if (!tb) return;

        tb.innerHTML = "";

        if (VN.detalle.artistas.length === 0) {
            tb.innerHTML = `
            <div class="vn-empty-card">
                <div class="vn-empty">
                    <i class="fa fa-music"></i>
                    <div>No hay artistas cargados</div>
                    <small>Presioná <b>Agregar artista</b> para comenzar</small>
                </div>
            </div>
        `;
            return;
        }

        VN.detalle.artistas.forEach((it, idx) => {
            tb.insertAdjacentHTML("beforeend", `
            <div class="vn-item-card">
                <div class="vn-item-card-head">
                    <div class="vn-item-card-title">
                        <i class="fa fa-music"></i>
                        Artista #${idx + 1}
                    </div>

                  <button class="vn-btn-delete"
        type="button"
        onclick="window.vnDelArtista(${idx})">
    <i class="fa fa-trash"></i>
</button>
                </div>

                <div class="vn-item-grid vn-item-grid-2">
                    <div class="vn-field">
                        <label class="vn-label-sm">Artista</label>
                        <select class="form-select vn-input vn-a-art" data-idx="${idx}"></select>
                    </div>

                    <div class="vn-field">
                        <label class="vn-label-sm">Representante</label>
                        <select class="form-select vn-input vn-a-rep" data-idx="${idx}"></select>
                    </div>

                    <div class="vn-field">
                        <label class="vn-label-sm">% comisión</label>
                        <input class="form-control vn-input vn-a-porc Inputmiles"
                               data-idx="${idx}"
                              type="text"inputmode="decimal"
                               value="${vnFormatInput(it.PorcComision)}">
                    </div>

                    <div class="vn-field">
                        <label class="vn-label-sm">Total comisión</label>
                        <input class="form-control vn-input vn-a-total Inputmiles"
                               data-idx="${idx}"
                               type="text"
                               value="${vnFormatInput(it.TotalComision)}">
                    </div>
                </div>
            </div>
        `);
        });

        tb.querySelectorAll("select.vn-a-art").forEach(sel => {
            const idx = Number(sel.dataset.idx);

            vnFillSelectDom(sel, VN.combos.artistas, "Id", "Nombre", "Seleccionar");
            sel.value = String(VN.detalle.artistas[idx].IdArtista || "");

            $(sel)?.select2({
                width: "100%",
                allowClear: true,
                placeholder: "Artista"
            }).on("change", function () {
                VN.detalle.artistas[idx].IdArtista = Number(this.value || 0);
                vnMarkDirty();
            });
        });

        tb.querySelectorAll("select.vn-a-rep").forEach(sel => {
            const idx = Number(sel.dataset.idx);

            vnFillSelectDom(sel, VN.combos.representantes, "Id", "Nombre", "Seleccionar");
            sel.value = String(VN.detalle.artistas[idx].IdRepresentante || "");

            $(sel)?.select2({
                width: "100%",
                allowClear: true,
                placeholder: "Representante"
            }).on("change", function () {
                VN.detalle.artistas[idx].IdRepresentante = Number(this.value || 0);
                vnMarkDirty();
            });
        });

        tb.querySelectorAll("input.vn-a-porc").forEach(inp => {
            inp.addEventListener("input", function () {
                const idx = Number(this.dataset.idx);
                VN.detalle.artistas[idx].PorcComision = vnToNumber(this.value);
                recalcularTodasLasComisiones();
                recalcularTotales();
                vnMarkDirty();
            });
        });

        tb.querySelectorAll("input.vn-a-total").forEach(inp => {
            inp.addEventListener("input", function () {
                const idx = Number(this.dataset.idx);
                VN.detalle.artistas[idx].TotalComision = vnToNumber(this.value);
                calcArtistaFromTotal(idx);
                recalcularTotales();
                vnMarkDirty();
            });
        });
    }

    function actualizarCobrosPorCambioMonedaVenta() {

        const idMonedaVenta = Number(document.getElementById("IdMoneda")?.value || 0);
        if (!idMonedaVenta) return;

        const cotVenta = getCotizacionById(idMonedaVenta);

        VN.detalle.cobros.forEach((c, idx) => {

            const idMonedaCobro = Number(c.IdMoneda || 0);
            if (!idMonedaCobro) return;

            const cotCobro = Number(c.Cotizacion || getCotizacionById(idMonedaCobro));
            const importe = Number(c.Importe || 0);

            if (!c.ManualConversion) {

                const conversion = importe * (cotCobro / cotVenta);

                c.Conversion = vnRound2(conversion);

                // 🔥 actualizar input UI
                const elConv = document.querySelector(`input.vn-c-conv[data-idx="${idx}"]`);
                if (elConv) elConv.value = c.Conversion;
            }

        });

        recalcularTotales();
    }

    function recalcularTodasLasComisiones() {

        const total = vnGetImporteTotal();

        // 🔥 ARTISTAS
        VN.detalle.artistas.forEach((a, idx) => {

            const pct = Number(a.PorcComision || 0);

            a.TotalComision = vnRound2(total * (pct / 100));

            const el = document.querySelector(`input.vn-a-total[data-idx="${idx}"]`);
            if (el) el.value = a.TotalComision;

        });

        // 🔥 PERSONAL
        VN.detalle.personal.forEach((p, idx) => {

            const tipo = Number(p.IdTipoComision || 0);

            if (tipo === 1) {
                // porcentaje
                const pct = Number(p.PorcComision || 0);

                p.TotalComision = vnRound2(total * (pct / 100));

                const el = document.querySelector(`input.vn-p-total[data-idx="${idx}"]`);
                if (el) el.value = p.TotalComision;
            }

            if (tipo === 2) {
                // fijo → recalcular porcentaje
                const val = Number(p.TotalComision || 0);

                p.PorcComision = total > 0
                    ? vnRound2((val / total) * 100)
                    : 0;

                const el = document.querySelector(`input.vn-p-porc[data-idx="${idx}"]`);
                if (el) el.value = p.PorcComision;
            }

        });

    }

    function calcArtistaFromTotal(idx) {
        const it = VN.detalle.artistas[idx];
        const total = vnGetImporteTotal();
        const val = Number(it.TotalComision || 0);
        it.PorcComision = total > 0 ? vnRound2((val / total) * 100) : 0;
        const inp = document.querySelector(`input.vn-a-porc[data-idx="${idx}"]`);
        if (inp) inp.value = formatearMiles(String(it.PorcComision || 0));
    }

    function renderPersonal() {
        const tb = document.getElementById("tbPersonal");
        if (!tb) return;

        tb.innerHTML = "";

        if (VN.detalle.personal.length === 0) {
            tb.innerHTML = `
            <div class="vn-empty-card">
                <div class="vn-empty">
                    <i class="fa fa-id-badge"></i>
                    <div>No hay personal asignado</div>
                    <small>Presioná <b>Agregar personal</b> para comenzar</small>
                </div>
            </div>
        `;
            return;
        }

        VN.detalle.personal.forEach((it, idx) => {
            const isFixed = Number(it.IdTipoComision || 0) === 2;

            tb.insertAdjacentHTML("beforeend", `
            <div class="vn-item-card">
                <div class="vn-item-card-head">
                    <div class="vn-item-card-title">
                        <i class="fa fa-id-badge"></i>
                        Personal #${idx + 1}
                    </div>

                     <button class="vn-btn-delete"
        type="button"
                            onclick="window.vnDelPersonal(${idx})">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>

                <div class="vn-item-grid vn-item-grid-2">
                    <div class="vn-field">
                        <label class="vn-label-sm">Personal</label>
                        <select class="form-select vn-input vn-p-personal" data-idx="${idx}"></select>
                    </div>

                    <div class="vn-field">
                        <label class="vn-label-sm">Cargo</label>
                        <select class="form-select vn-input vn-p-cargo" data-idx="${idx}"></select>
                    </div>

                    <div class="vn-field">
                        <label class="vn-label-sm">Tipo comisión</label>
                        <select class="form-select vn-input vn-p-tipo" data-idx="${idx}"></select>
                    </div>

                    <div class="vn-field">
                        <label class="vn-label-sm">% comisión</label>
                        <input class="form-control vn-input vn-p-porc Inputmiles"
                               data-idx="${idx}"
                              type="text"
                              inputmode="decimal"
                               value="${vnFormatInput(it.PorcComision)}"
                               ${isFixed ? "disabled" : ""}>
                    </div>

                    <div class="vn-field vn-field-full">
                        <label class="vn-label-sm">Total comisión</label>
                        <input class="form-control vn-input vn-p-total Inputmiles"
                               data-idx="${idx}"
                               type="text"
                               value="${vnFormatInput(it.TotalComision)}">
                    </div>
                </div>
            </div>
        `);
        });

        tb.querySelectorAll("select.vn-p-personal").forEach(sel => {
            const idx = Number(sel.dataset.idx);

            vnFillSelectDom(sel, VN.combos.personal, "Id", "Nombre", "Seleccionar");
            sel.value = String(VN.detalle.personal[idx].IdPersonal || "");

            $(sel)?.select2({
                width: "100%",
                allowClear: true,
                placeholder: "Personal"
            }).on("change", function () {
                VN.detalle.personal[idx].IdPersonal = Number(this.value || 0);
                vnMarkDirty();
            });
        });

        tb.querySelectorAll("select.vn-p-cargo").forEach(sel => {
            const idx = Number(sel.dataset.idx);

            vnFillSelectDom(sel, VN.combos.cargos, "Id", "Nombre", "Seleccionar");
            sel.value = String(VN.detalle.personal[idx].IdCargo || "");

            $(sel)?.select2({
                width: "100%",
                allowClear: true,
                placeholder: "Cargo"
            }).on("change", function () {
                VN.detalle.personal[idx].IdCargo = Number(this.value || 0);
                vnMarkDirty();
            });
        });

        tb.querySelectorAll("select.vn-p-tipo").forEach(sel => {
            const idx = Number(sel.dataset.idx);

            vnFillSelectDom(sel, VN.combos.tiposComision, "Id", "Nombre", "Seleccionar");
            sel.value = String(VN.detalle.personal[idx].IdTipoComision || "");

            $(sel)?.select2({
                width: "100%",
                allowClear: true,
                placeholder: "Tipo comisión"
            }).on("change", function () {
                const tipo = Number(this.value || 0);
                VN.detalle.personal[idx].IdTipoComision = tipo;

                const inpPct = document.querySelector(`input.vn-p-porc[data-idx="${idx}"]`);
                if (inpPct) inpPct.disabled = (tipo === 2);

                if (tipo === 1) {
                    recalcularTodasLasComisiones();
                } else if (tipo === 2) {
                    calcPersonalFixed(idx);
                }

                recalcularTotales();
                vnMarkDirty();
            });
        });

        tb.querySelectorAll("input.vn-p-porc").forEach(inp => {
            inp.addEventListener("input", function () {
                const idx = Number(this.dataset.idx);
                VN.detalle.personal[idx].PorcComision = vnToNumber(this.value);
                recalcularTodasLasComisiones();
                recalcularTotales();
                vnMarkDirty();
            });
        });

        tb.querySelectorAll("input.vn-p-total").forEach(inp => {
            inp.addEventListener("input", function () {
                const idx = Number(this.dataset.idx);
                VN.detalle.personal[idx].TotalComision = vnToNumber(this.value);

                const tipo = Number(VN.detalle.personal[idx].IdTipoComision || 0);
                if (tipo === 1) {
                    calcPersonalFromTotal(idx);
                } else if (tipo === 2) {
                    calcPersonalFixed(idx);
                }

                recalcularTotales();
                vnMarkDirty();
            });
        });
    }

    function calcPersonalFromPercent(idx) {
        const it = VN.detalle.personal[idx];
        const total = vnGetImporteTotal();
        const pct = Number(it.PorcComision || 0);
        it.TotalComision = vnRound2(total * (pct / 100));
        const inp = document.querySelector(`input.vn-p-total[data-idx="${idx}"]`);
        if (inp) inp.value = formatearMiles(String(it.TotalComision || 0));
    }

    function calcPersonalFromTotal(idx) {
        const it = VN.detalle.personal[idx];
        const total = vnGetImporteTotal();
        const val = Number(it.TotalComision || 0);
        it.PorcComision = total > 0 ? vnRound2((val / total) * 100) : 0;
        const inp = document.querySelector(`input.vn-p-porc[data-idx="${idx}"]`);
        if (inp) inp.value = formatearMiles(String(it.PorcComision || 0));
    }

    function calcPersonalFixed(idx) {
        // fijo: total es el valor ingresado, porcentaje informativo
        const it = VN.detalle.personal[idx];
        const total = vnGetImporteTotal();
        const val = Number(it.TotalComision || 0);
        it.PorcComision = total > 0 ? vnRound2((val / total) * 100) : 0;
        const inp = document.querySelector(`input.vn-p-porc[data-idx="${idx}"]`);
        if (inp) inp.value = formatearMiles(String(it.PorcComision || 0));
    }

    function renderCobros() {
        const tb = document.getElementById("tbCobros");
        if (!tb) return;

        tb.innerHTML = "";

        if (VN.detalle.cobros.length === 0) {
            tb.innerHTML = `
            <div class="vn-empty-card">
                <div class="vn-empty">
                    <i class="fa fa-money"></i>
                    <div>No hay cobros registrados</div>
                    <small>Podés agregar cobros cuando empiecen los pagos</small>
                </div>
            </div>
        `;
            return;
        }

        VN.detalle.cobros.forEach((it, idx) => {
            const fechaIso = vnIsoLocalFromDate(it.Fecha || new Date());

            tb.insertAdjacentHTML("beforeend", `
            <div class="vn-item-card">
                <div class="vn-item-card-head">
                    <div class="vn-item-card-title">
                        <i class="fa fa-money"></i>
                        Cobro #${idx + 1}
                    </div>

                     <button class="vn-btn-delete"
        type="button"
                            onclick="window.vnDelCobro(${idx})">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>

                <div class="vn-item-grid vn-item-grid-2">
                    <div class="vn-field">
                        <label class="vn-label-sm">Fecha</label>
                        <input class="form-control vn-input vn-c-fecha"
                               data-idx="${idx}"
                               type="datetime-local"
                               value="${fechaIso}">
                    </div>

                    <div class="vn-field">
                        <label class="vn-label-sm">Moneda</label>
                        <select class="form-select vn-input vn-c-mon" data-idx="${idx}"></select>
                    </div>

                    <div class="vn-field">
                        <label class="vn-label-sm">Cuenta</label>
                        <select class="form-select vn-input vn-c-cuenta" data-idx="${idx}"></select>
                    </div>

                    <div class="vn-field">
                        <label class="vn-label-sm">Importe</label>
                        <input class="form-control vn-input vn-c-imp Inputmiles"
                               data-idx="${idx}"
                               type="text"
                               value="${Number(it.Importe || 0)}">
                    </div>

                    <div class="vn-field">
                        <label class="vn-label-sm">Cotización</label>
                        <input class="form-control vn-input vn-c-cot Inputmiles"
                               data-idx="${idx}"
                               type="text"
                               inputmode="decimal"
                               value="${Number(it.Cotizacion || 1)}">
                    </div>

                    <div class="vn-field">
                        <label class="vn-label-sm">Convertido</label>
                        <input class="form-control vn-input vn-c-conv Inputmiles"
                               data-idx="${idx}"
                               type="text"
                               value="${Number(it.Conversion || 0)}">
                    </div>
                </div>
            </div>
        `);
        });

        tb.querySelectorAll("select.vn-c-mon").forEach(sel => {
            const idx = Number(sel.dataset.idx);

            vnFillSelectDom(sel, VN.combos.monedas, "Id", "Nombre", "Seleccionar");
            sel.value = String(VN.detalle.cobros[idx].IdMoneda || "");

            $(sel)?.select2({
                width: "100%",
                allowClear: true,
                placeholder: "Moneda"
            }).on("change", async function () {

                const idMoneda = Number(this.value || 0);

                const cobro = VN.detalle.cobros[idx];
                cobro.IdMoneda = idMoneda;

                // 🔥 1. TRAER COTIZACIÓN AUTOMÁTICA
                const cot = getCotizacionById(idMoneda);
                cobro.Cotizacion = cot;

                // actualizar input cotización
                const inpCot = document.querySelector(`input.vn-c-cot[data-idx="${idx}"]`);
                if (inpCot) inpCot.value = cot;

                // 🔥 2. RESET MANUAL
                cobro.ManualConversion = false;

                // 🔥 3. RESET CUENTA
                await cargarCuentasPorMoneda(idx, idMoneda);

                cobro.IdCuenta = 0;

                const selCuenta = document.querySelector(`select.vn-c-cuenta[data-idx="${idx}"]`);
                if (selCuenta) {
                    selCuenta.value = "";
                    $(selCuenta)?.trigger("change.select2");
                }

                // 🔥 4. RECALCULAR COBRO
                recalcularCobro(idx);

                // 🔥 5. MARCAR DIRTY
                vnMarkDirty();
            });
        });

        tb.querySelectorAll("select.vn-c-cuenta").forEach(async sel => {
            const idx = Number(sel.dataset.idx);
            const idMoneda = Number(VN.detalle.cobros[idx].IdMoneda || 0);

            if (idMoneda) {
                await cargarCuentasPorMoneda(idx, idMoneda);
                sel.value = String(VN.detalle.cobros[idx].IdCuenta || "");
                $(sel)?.trigger("change.select2");
            } else {
                vnFillSelectDom(sel, [], "Id", "Nombre", "Seleccionar");
            }

            $(sel)?.off("change.vncuenta").on("change.vncuenta", function () {
                VN.detalle.cobros[idx].IdCuenta = Number(this.value || 0);
                vnMarkDirty();
            });
        });

        tb.querySelectorAll("input.vn-c-fecha").forEach(inp => {
            inp.addEventListener("change", function () {
                const idx = Number(this.dataset.idx);
                VN.detalle.cobros[idx].Fecha = new Date(this.value);
                vnMarkDirty();
            });
        });

        tb.querySelectorAll("input.vn-c-imp").forEach(inp => {
            inp.addEventListener("input", function () {
                const idx = Number(this.dataset.idx);
                VN.detalle.cobros[idx].Importe = vnToNumber(this.value);
                VN.detalle.cobros[idx].ManualConversion = false;
                recalcularCobro(idx);
                vnMarkDirty();
            });
        });

        tb.querySelectorAll("input.vn-c-cot").forEach(inp => {
            inp.addEventListener("input", function () {
                const idx = Number(this.dataset.idx);
                VN.detalle.cobros[idx].Cotizacion = vnToNumber(this.value) || 1;
                VN.detalle.cobros[idx].ManualConversion = false;
                recalcularCobro(idx);
                vnMarkDirty();
            });
        });
        tb.querySelectorAll("input.vn-c-conv").forEach(inp => {
            inp.addEventListener("input", function () {

                const idx = Number(this.dataset.idx);
                const c = VN.detalle.cobros[idx];

                c.Conversion = vnToNumber(this.value);
                c.ManualConversion = true;

                const idMonedaVenta = Number(document.getElementById("IdMoneda")?.value || 0);
                const idMonedaCobro = Number(c.IdMoneda || 0);

                const cotVenta = getCotizacionById(idMonedaVenta);
                const cotCobro = Number(c.Cotizacion || getCotizacionById(idMonedaCobro));

                if (cotVenta && cotCobro) {

                    // 🔥 cálculo inverso
                    const importe = c.Conversion * (cotVenta / cotCobro);

                    c.Importe = vnRound2(importe);

                    const inpImp = document.querySelector(`input.vn-c-imp[data-idx="${idx}"]`);
                    if (inpImp) inpImp.value = formatearMiles(String(c.Importe || 0));
                }

                recalcularTotales();
                vnMarkDirty();
            });
        });
    }

    function recalcularCobro(idx) {

        const c = VN.detalle.cobros[idx];
        if (!c) return;

        const importe = Number(c.Importe || 0);

        const idMonedaVenta = Number(document.getElementById("IdMoneda")?.value || 0);
        const idMonedaCobro = Number(c.IdMoneda || 0);

        if (!idMonedaVenta || !idMonedaCobro) return;

        // 🔥 obtener cotizaciones reales
        const cotVenta = getCotizacionById(idMonedaVenta);
        const cotCobro = Number(c.Cotizacion || getCotizacionById(idMonedaCobro));

        if (!cotVenta || !cotCobro) return;

        if (!c.ManualConversion) {

            const conversion = importe * (cotCobro / cotVenta);

            c.Conversion = vnRound2(conversion);

            const el = document.querySelector(`input.vn-c-conv[data-idx="${idx}"]`);
            if (el) el.value = c.Conversion;
        }

        recalcularTotales();
    }

    function getCotizacionById(idMoneda) {

        const m = VN.combos.monedas.find(x => Number(x.Id) === Number(idMoneda));

        return Number(m?.Cotizacion || 1);
    }

    /* =========================
       DELETE handlers (global for onclick)
    ========================= */
    window.vnDelArtista = function (i) {
        VN.detalle.artistas.splice(i, 1);
        renderDetalle();
        recalcularTotales();
        vnMarkDirty();
    };
    window.vnDelPersonal = function (i) {
        VN.detalle.personal.splice(i, 1);
        renderDetalle();
        recalcularTotales();
        vnMarkDirty();
    };
    window.vnDelCobro = function (i) {
        VN.detalle.cobros.splice(i, 1);
        renderDetalle();
        recalcularTotales();
        vnMarkDirty();
    };

    /* =========================
       CÁLCULOS
    ========================= */
    function recalcularTotales() {
        const importeTotal = vnGetImporteTotal();

        // recalcular comisiones al vuelo según importeTotal (para %)
        VN.detalle.artistas.forEach((a, idx) => {
            // si el usuario cambió el % (o si total está en 0), mantenemos % como fuente
            // criterio: si existe % y no está NaN, recalculamos total desde %
            // (si quieren que total sea fuente, ya lo manejamos en input total change)
            if (typeof a.PorcComision === "number" && !isNaN(a.PorcComision)) {
                // no pisar si el user estaba editando total? esto solo corre por cambios generales; ok
                // respetamos el total si fue editado manualmente: no tenemos flag; usamos heurística:
                // si total == 0 y %>0 => recalcular
                if ((Number(a.TotalComision || 0) === 0 && Number(a.PorcComision || 0) > 0) || VN.flags.restoringDraft) {
                    a.TotalComision = vnRound2(importeTotal * (Number(a.PorcComision || 0) / 100));
                }
            }
        });

        VN.detalle.personal.forEach((p, idx) => {
            const tipo = Number(p.IdTipoComision || 0);
            if (tipo === 1) {
                // %
                if ((Number(p.TotalComision || 0) === 0 && Number(p.PorcComision || 0) > 0) || VN.flags.restoringDraft) {
                    p.TotalComision = vnRound2(importeTotal * (Number(p.PorcComision || 0) / 100));
                }
            }
            if (tipo === 2) {
                // fijo: % informativo
                p.PorcComision = importeTotal > 0 ? vnRound2((Number(p.TotalComision || 0) / importeTotal) * 100) : 0;
            }
        });

        const totalComisiones =
            (VN.detalle.artistas || []).reduce((a, x) => a + Number(x.TotalComision || 0), 0) +
            (VN.detalle.personal || []).reduce((a, x) => a + Number(x.TotalComision || 0), 0);

        // Cobrado: usamos Conversion (base currency)
        const cobrado = (VN.detalle.cobros || []).reduce((a, x) => a + Number(x.Conversion || 0), 0);

        const saldo = vnRound2(importeTotal - cobrado);

        // Summary IDs (del HTML)
        const sumImporte = document.getElementById("sumImporte");
        const sumComisiones = document.getElementById("sumComisiones");
        const sumCobrado = document.getElementById("sumCobrado");
        const sumSaldo = document.getElementById("sumSaldo");

        if (sumImporte) sumImporte.textContent = vnFmtMoneyARS(importeTotal);
        if (sumComisiones) sumComisiones.textContent = vnFmtMoneyARS(totalComisiones);
        if (sumCobrado) sumCobrado.textContent = vnFmtMoneyARS(cobrado);
        if (sumSaldo) sumSaldo.textContent = vnFmtMoneyARS(saldo);

        const alerta = document.getElementById("alertComisiones");

        if (alerta) {

            if (totalComisiones > importeTotal) {
                alerta.style.display = "flex";
            } else {
                alerta.style.display = "none";
            }

        }
    }

    /* =========================
       VALIDACIÓN (mínima + robusta)
    ========================= */
    function validarCamposVenta() {

        let errores = []
        let erroresCampos = []

        const campos = [
            { id: "IdCliente", nombre: "Cliente" },
            { id: "Fecha", nombre: "Fecha" },
            { id: "NombreEvento", nombre: "Nombre evento" },
            { id: "IdUbicacion", nombre: "Ubicación" },
            { id: "IdProductora", nombre: "Productora" },
            { id: "IdMoneda", nombre: "Moneda" },
            { id: "IdEstado", nombre: "Estado" },
            { id: "IdTipoContrato", nombre: "Tipo contrato" },
            { id: "ImporteTotal", nombre: "Importe total" }
        ]

        campos.forEach(c => {

            const el = document.getElementById(c.id)
            if (!el) return

            const val = (el.value ?? "").toString().trim()

            const esValido = val !== ""

            setEstadoCampo(el, esValido)

            if (!esValido) {
                errores.push(c.nombre)
                erroresCampos.push(c.id) // 🔥 clave para marcar sección
            }

        })

        // 🔥 DURACIÓN
        const dur = document.getElementById("Duracion")?.value || ""

        if (!/^\d{2}:\d{2}$/.test(dur)) {

            errores.push("Duración")
            erroresCampos.push("Duracion")

            setEstadoCampo(document.getElementById("Duracion"), false)
        }

        // 🔥 ARTISTAS (mínimo 1)
        if (!Array.isArray(VN.detalle.artistas) || VN.detalle.artistas.length === 0) {

            errores.push("Debe agregar al menos un artista")
            erroresCampos.push("artistas")

        }

        // 🔥 ARTISTAS
        VN.detalle.artistas.forEach((a, i) => {

            let hayError = false

            if (!a.IdArtista) {
                errores.push(`Artista #${i + 1} (artista)`)
                hayError = true

                const sel = document.querySelector(`select.vn-a-art[data-idx="${i}"]`)
                if (sel) setEstadoCampo(sel, false)
            }

            if (!a.IdRepresentante) {
                errores.push(`Artista #${i + 1} (representante)`)
                hayError = true

                const sel = document.querySelector(`select.vn-a-rep[data-idx="${i}"]`)
                if (sel) setEstadoCampo(sel, false)
            }

            if (hayError) {
                erroresCampos.push("artistas") // 🔥 clave para pintar sección
            }

        })

        // 🔥 COBROS
        VN.detalle.cobros.forEach((c, i) => {

            let hayError = false

            if (!c.IdCuenta) {
                errores.push(`Cobro #${i + 1} (cuenta)`)
                hayError = true
            }

            if (!c.IdMoneda) {
                errores.push(`Cobro #${i + 1} (moneda)`)
                hayError = true
            }

            if (Number(c.Importe || 0) <= 0) {
                errores.push(`Cobro #${i + 1} (importe)`)
                hayError = true
            }

            if (hayError) {
                erroresCampos.push("cobros") // 🔥 mapea a sección cobros
            }

        })

        // 🔥 MARCAR SECCIONES
        if (errores.length > 0) {

            marcarSeccionesPorErrores(erroresCampos)

            // opcional: ir a la primera con error
            irAPrimeraSeccionConError()

            mostrarErrorCampos(
                `Debes completar los campos requeridos:<br>
        <strong>${errores.join(", ")}</strong>`,
                null,
                "validacion"
            )

            return false
        }

        // limpiar estados si todo OK
        marcarSeccionesPorErrores([])

        cerrarErrorCampos()

        return true
    }

    /* =========================
       BUILD MODEL (VMVenta)
    ========================= */
    function buildModel() {

        const idVenta = Number(document.getElementById("Venta_Id")?.value || 0);
        const idCliente = vnGetClienteId();

        recalcularTotales();

        const importeTotal = vnGetImporteTotal();

        const totalComisiones =
            (VN.detalle.artistas || []).reduce((a, x) => a + Number(x.TotalComision || 0), 0) +
            (VN.detalle.personal || []).reduce((a, x) => a + Number(x.TotalComision || 0), 0);

        const cobrado =
            (VN.detalle.cobros || []).reduce((a, x) => a + Number(x.Conversion || 0), 0);

        const saldo = vnRound2(importeTotal - totalComisiones - cobrado);

        const dur = document.getElementById("Duracion")?.value || "00:00";
        const [h, m] = dur.split(":").map(Number);

        const durDate = new Date();
        durDate.setHours(h || 0);
        durDate.setMinutes(m || 0);
        durDate.setSeconds(0);
        durDate.setMilliseconds(0);

        const model = {

            Id: idVenta,

            Fecha: document.getElementById("Fecha")?.value
                ? new Date(document.getElementById("Fecha").value)
                : new Date(),

            Duracion: dur,

            IdUbicacion: Number(document.getElementById("IdUbicacion")?.value || 0),

            NombreEvento:
                document.getElementById("NombreEvento")?.value || "",

            IdCliente: Number(idCliente || 0),

            IdProductora: Number(document.getElementById("IdProductora")?.value || 0),

            IdMoneda: Number(document.getElementById("IdMoneda")?.value || 0),

            IdEstado: Number(document.getElementById("IdEstado")?.value || 0),

            ImporteTotal: vnRound2(importeTotal),

            ImporteAbonado: vnRound2(cobrado),

            Saldo: vnRound2(saldo),

            NotaInterna:
                (document.getElementById("NotaInterna")?.value || "").trim() || null,

            NotaCliente:
                (document.getElementById("NotaCliente")?.value || "").trim() || null,

            IdTipoContrato:
                Number(document.getElementById("IdTipoContrato")?.value || 0),

            IdOpExclusividad:
                document.getElementById("IdOpExclusividad")?.value
                    ? Number(document.getElementById("IdOpExclusividad").value)
                    : null,

            DiasPrevios:
                document.getElementById("DiasPrevios")?.value
                    ? Number(document.getElementById("DiasPrevios").value)
                    : null,

            FechaHasta:
                document.getElementById("FechaHasta")?.value
                    ? new Date(document.getElementById("FechaHasta").value)
                    : null,

            Artistas: (VN.detalle.artistas || []).map(x => ({
                Id: Number(x.Id || 0),
                IdArtista: Number(x.IdArtista || 0),
                IdRepresentante: Number(x.IdRepresentante || 0),
                PorcComision: vnRound2(Number(x.PorcComision || 0)),
                TotalComision: vnRound2(Number(x.TotalComision || 0))
            })),

            Personal: (VN.detalle.personal || []).map(x => {

                const tipo = Number(x.IdTipoComision || 0);
                const total = vnRound2(Number(x.TotalComision || 0));

                const pct =
                    tipo === 2
                        ? (importeTotal > 0
                            ? vnRound2((total / importeTotal) * 100)
                            : 0)
                        : vnRound2(Number(x.PorcComision || 0));

                return {
                    Id: Number(x.Id || 0),
                    IdPersonal: Number(x.IdPersonal || 0),
                    IdCargo: Number(x.IdCargo || 0),
                    IdTipoComision: tipo,
                    PorcComision: pct,
                    TotalComision: total
                };

            }),

            Cobros: (VN.detalle.cobros || [])
                .filter(x => Number(x.IdCuenta || 0) > 0)
                .map(x => ({

                    Id: Number(x.Id || 0),

                    Fecha: x.Fecha
                        ? new Date(x.Fecha)
                        : new Date(),

                    IdMoneda: Number(x.IdMoneda || 0),

                    IdCuenta: Number(x.IdCuenta || 0),

                    Importe: vnRound2(Number(x.Importe || 0)),

                    Cotizacion: vnRound2(Number(x.Cotizacion || 1)),

                    Conversion: vnRound2(
                        Number(
                            x.Conversion > 0
                                ? x.Conversion
                                : (Number(x.Importe || 0) *
                                    Number(x.Cotizacion || 1))
                        )
                    ),

                    NotaCliente:
                        (x.NotaCliente || "").trim() || null,

                    NotaInterna:
                        (x.NotaInterna || "").trim() || null
                }))
        };

        return model;
    }

    /* =========================
       GUARDAR
    ========================= */
    async function guardarVenta() {

       

        if (!validarCamposVenta()) return;

        const model = buildModel();
        const isNew = Number(model.Id || 0) === 0;

        if (isNew && !Permisos.tiene("Ventas", "Crear")) {
            errorModal("No tenés permisos.");
            return;
        }

        if (!isNew && !Permisos.tiene("Ventas", "Editar")) {
            errorModal("No tenés permisos.");
            return;
        }



        try {

            vnSetSaving(true, "Guardando...");

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

                vnToastErr(data.mensaje || "No se pudo guardar.");
                vnSetSaving(false, "Error", "err");
                return;

            }

            vnToastOk(data.mensaje || "Guardado OK");

            // limpiar draft
            localStorage.removeItem(DRAFT_KEY());
            VN.flags.dirty = false;

            vnSetSaving(false, "Guardado", "ok");

            // siempre ir al index
            setTimeout(() => {
                window.location.href = "/Ventas";
            }, 600);

        } catch (e) {

            console.error(e);
            vnToastErr("Error guardando la venta.");
            vnSetSaving(false, "Error", "err");

        }
    }

    /* =========================
       DRAFT PRO
    ========================= */
    function guardarDraft(showToast) {
        try {
            const idCliente = vnGetClienteId();
            if (!idCliente) return;

            const payload = {
                ts: new Date().toISOString(),
                idVenta: Number(document.getElementById("Venta_Id")?.value || 0),
                idCliente: idCliente,
                form: {
                    Fecha: document.getElementById("Fecha")?.value || "",
                    NombreEvento: document.getElementById("NombreEvento")?.value || "",
                    Duracion: document.getElementById("Duracion")?.value || "",
                    IdUbicacion: document.getElementById("IdUbicacion")?.value || "",
                    IdProductora: document.getElementById("IdProductora")?.value || "",
                    IdMoneda: document.getElementById("IdMoneda")?.value || "",
                    IdEstado: document.getElementById("IdEstado")?.value || "",
                    IdTipoContrato: document.getElementById("IdTipoContrato")?.value || "",
                    IdOpExclusividad: document.getElementById("IdOpExclusividad")?.value || "",
                    DiasPrevios: document.getElementById("DiasPrevios")?.value || "",
                    FechaHasta: document.getElementById("FechaHasta")?.value || "",
                    ImporteTotal: formatearSinMiles(document.getElementById("ImporteTotal")?.value) || "",
                    NotaInterna: document.getElementById("NotaInterna")?.value || "",
                    NotaCliente: document.getElementById("NotaCliente")?.value || ""
                },
                detalle: VN.detalle
            };

            localStorage.setItem(DRAFT_KEY(), JSON.stringify(payload));
            if (showToast) vnToastOk("Borrador guardado.");

            VN.flags.dirty = false;
            vnSetSaving(false, "Borrador guardado", "ok");
        } catch (e) {
            console.error(e);
        }
    }

    async function restaurarDraft() {
        try {
            const raw = localStorage.getItem(DRAFT_KEY());
            if (!raw) { vnToastErr("No hay borrador guardado."); return; }

            const d = JSON.parse(raw);
            if (!d || !d.form || !d.idCliente) { vnToastErr("Borrador inválido."); return; }

            VN.flags.restoringDraft = true;

            // set venta id (solo informativo; si era nueva, dejamos 0)
            document.getElementById("Venta_Id").value = String(Number(d.idVenta || 0));

            // cliente
            setClienteSeleccionado(Number(d.idCliente || 0), true);

            // form
            document.getElementById("Fecha").value = d.form.Fecha || vnNowIsoLocal();
            document.getElementById("NombreEvento").value = d.form.NombreEvento || "";
            document.getElementById("Duracion").value = d.form.Duracion || vnNowIsoLocal();

            document.getElementById("IdUbicacion").value = String(d.form.IdUbicacion || "");
            $("#IdUbicacion")?.trigger("change.select2");

            document.getElementById("IdProductora").value = String(d.form.IdProductora || "");
            $("#IdProductora")?.trigger("change.select2");

            document.getElementById("IdMoneda").value = String(d.form.IdMoneda || "");
            $("#IdMoneda")?.trigger("change.select2");

            document.getElementById("IdEstado").value = String(d.form.IdEstado || "");
            $("#IdEstado")?.trigger("change.select2");

            document.getElementById("IdTipoContrato").value = String(d.form.IdTipoContrato || "");
            $("#IdTipoContrato")?.trigger("change.select2");

            document.getElementById("IdOpExclusividad").value = String(d.form.IdOpExclusividad || "");
            $("#IdOpExclusividad")?.trigger("change.select2");

            document.getElementById("DiasPrevios").value = d.form.DiasPrevios || "";
            document.getElementById("FechaHasta").value = d.form.FechaHasta || "";
            document.getElementById("ImporteTotal").value = d.form.ImporteTotal || "";
            document.getElementById("NotaInterna").value = d.form.NotaInterna || "";
            document.getElementById("NotaCliente").value = d.form.NotaCliente || "";

            // detalle (clonar seguro)
            VN.detalle = d.detalle || { artistas: [], personal: [], cobros: [] };
            VN.detalle.artistas = Array.isArray(VN.detalle.artistas) ? VN.detalle.artistas : [];
            VN.detalle.personal = Array.isArray(VN.detalle.personal) ? VN.detalle.personal : [];
            VN.detalle.cobros = Array.isArray(VN.detalle.cobros) ? VN.detalle.cobros : [];

            // normalizar fechas de cobros
            VN.detalle.cobros = VN.detalle.cobros.map(c => ({
                ...c,
                Fecha: c.Fecha ? new Date(c.Fecha) : new Date(),
                ManualConversion: !!c.ManualConversion
            }));

            renderDetalle();
            recalcularTotales();

            VN.flags.dirty = false;
            VN.flags.restoringDraft = false;

            vnToastOk("Borrador restaurado.");
            vnSetSaving(false, "Borrador restaurado", "ok");
        } catch (e) {
            console.error(e);
            VN.flags.restoringDraft = false;
            vnToastErr("No se pudo restaurar el borrador.");
        }
    }

    async function initModalUbicacionVentas() {

        const root = document.querySelector('[data-ubicacion-modal]');

        modalUbicacionVentas = new UbicacionModal(root, {

            token: token,

            onSaved: async (data, modelo) => {

                try {

                    const idNuevo = Number(data.id || modelo.Id || 0);

                    const ubicaciones = await vnFetchJson(API.ubicaciones);

                    VN.combos.ubicaciones = ubicaciones || [];

                    const sel = document.getElementById("IdUbicacion");

                    // 🔥 1. DESTRUIR SELECT2
                    if ($(sel)?.data("select2")) {
                        $(sel).select2("destroy");
                    }

                    // 🔥 2. RECARGAR OPTIONS
                    vnFillSelectDom(sel, VN.combos.ubicaciones, "Id", "Descripcion", "Seleccionar");

                    // 🔥 3. VOLVER A INICIALIZAR SELECT2 (IMPORTANTE)
                    ensureSelect2("#IdUbicacion");

                    // 🔥 4. SELECCIONAR EL NUEVO
                    if (idNuevo > 0) {

                        const val = String(idNuevo);

                        // 🔥 setear valor
                        sel.value = val;

                        // 🔥 select2 necesita esto sí o sí
                        $(sel).val(val).trigger("change.select2");
                    }

                    vnToastOk("Ubicación creada");

                } catch (e) {
                    console.error(e);
                }
            }
        });
    }

    async function initModalClienteVentas() {

        const root = document.querySelector('[data-cliente-modal]');

        modalClienteVentas = new ClienteModal(root, {

            token: token,

            onSaved: async (data, modelo) => {

    try {

        const idNuevo = Number(data.id || modelo.Id || 0);

        const clientes = await vnFetchJson(API.listaClientes);

        VN.clientes = clientes || [];

        const sel = document.getElementById("IdCliente");

        // 🔁 reconstruir select
        vnFillSelectDom(sel, VN.clientes, "Id", "Nombre", "Seleccionar");

        // 🔥 seleccionar automáticamente
        if (idNuevo > 0) {

            sel.value = String(idNuevo);

            $("#IdCliente")?.trigger("change.select2");

            // también actualizar hidden
            document.getElementById("Venta_IdCliente").value = String(idNuevo);
        }

        vnToastOk("Cliente creado correctamente");

    }
    catch (e) {
        console.error("Error recargando clientes", e);
    }

}

        });

    }

    async function initModalProductoraVentas() {

        const root = document.querySelector('[data-productora-modal]');

        modalProductoraVentas = new ProductoraModal(root, {

            token: token,

            onSaved: async (data, modelo) => {

                try {

                    const idNuevo = Number(data.id || modelo.Id || 0);

                    const productoras = await vnFetchJson(API.productoras);

                    VN.productoras = productoras || [];

                    const sel = document.getElementById("IdProductora");

                    // 🔁 reconstruir select
                    vnFillSelectDom(sel, VN.productoras, "Id", "Nombre", "Seleccionar");

                    // 🔥 seleccionar automáticamente
                    if (idNuevo > 0) {

                        sel.value = String(idNuevo);

                        $("#IdProductora")?.trigger("change.select2");

                        // también actualizar hidden
                        document.getElementById("Venta_IdProductora").value = String(idNuevo);
                    }

                    vnToastOk("Productora creada correctamente");

                }
                catch (e) {
                    console.error("Error recargando clientes", e);
                }

            }

        });

    }

    async function initModalArtistaVentas() {

        const root = document.querySelector('[data-artista-modal]');

        modalArtistaVentas = new ArtistasModal(root, {

            token: token,

            onSaved: async (data, modelo) => {

                try {
                    const artistas = await vnFetchJson(API.artistas);

                    VN.combos.artistas = artistas || [];
                    renderArtistas();

                    vnToastOk("Artista creado correctamente");

                }
                catch (e) {

                    console.error("Error recargando artistas", e);

                }

            }

        });

        window.verFicha = (id) => modalArtistaVentas.abrirVer(id);

    }

    async function initModalPersonalVentas() {

        const root = document.querySelector('[data-personal-modal]');

        modalPersonalVentas = new PersonalModal(root, {

            token: token,

            onSaved: async (data, modelo) => {

                try {
                    const personal = await vnFetchJson(API.personal);

                    VN.combos.personal = personal || [];
                    renderPersonal();

                    vnToastOk("Personal creado correctamente");

                }
                catch (e) {

                    console.error("Error recargando personal", e);

                }

            }

        });

        window.verFicha = (id) => modalPersonalVentas.abrirVer(id);

    }



    document.addEventListener("click", async function (e) {

        if (e.target.closest("#btnCrearUbicacion")) {

            if (!modalUbicacionVentas) return;

            await modalUbicacionVentas.abrirNuevo();
        }

        if (e.target.closest("#btnCrearCliente")) {

            if (!modalClienteVentas) {
                console.error("Modal cliente no inicializado");
                return;
            }

            await modalClienteVentas.abrirNuevo();
        }

        if (e.target.closest("#btnCrearProductora")) {

            if (!modalProductoraVentas) {
                console.error("Modal productora no inicializado");
                return;
            }

            await modalProductoraVentas.abrirNuevo();
        }

    });

    document.addEventListener("click", async function (e) {

        if (e.target.closest("#btnCrearArtista")) {

            if (!modalArtistaVentas) {
                console.error("Modal artista no inicializado");
                return;
            }

            await modalArtistaVentas.abrirNuevo();

        }

        if (e.target.closest("#btnCrearPersonal")) {

            if (!modalPersonalVentas) {
                console.error("Modal personal no inicializado");
                return;
            }

            await modalPersonalVentas.abrirNuevo();

        }

    });



})();

/* =========================================================
SECCIONES DINÁMICAS (Artistas / Personal / Cobros / etc)
========================================================= */

function initSecciones() {

    const tabs = document.querySelectorAll(".vn-head-btn")
    const panels = document.querySelectorAll(".vn-section")

    tabs.forEach(tab => {

        tab.addEventListener("click", () => {

            const sec = tab.dataset.sec

            // activar botón
            tabs.forEach(t => t.classList.remove("active"))
            tab.classList.add("active")

            // ocultar paneles
            panels.forEach(p => p.classList.remove("active"))

            // mostrar panel correspondiente
            const panel = document.getElementById("sec-" + sec)

            if (panel)
                panel.classList.add("active")

        })

    })

}



function initDuracionMask() {

    const el = document.getElementById("Duracion");
    if (!el) return;

    el.addEventListener("input", function () {

        let v = this.value.replace(/\D/g, "");

        if (v.length > 4)
            v = v.slice(0, 4);

        if (v.length >= 3)
            v = v.slice(0, 2) + ":" + v.slice(2);

        this.value = v;

    });

    el.addEventListener("blur", function () {

        if (!this.value) return;

        const parts = this.value.split(":");

        if (parts.length !== 2) {
            this.value = "";
            return;
        }

        let h = parseInt(parts[0] || 0);
        let m = parseInt(parts[1] || 0);

        if (isNaN(h) || isNaN(m)) {
            this.value = "";
            return;
        }

        if (h > 23) h = 23;
        if (m > 59) m = 59;

        this.value =
            String(h).padStart(2, "0") +
            ":" +
            String(m).padStart(2, "0");

    });

}
function vnTodayIso() {

    const d = new Date()

    const pad = x => String(x).padStart(2, "0")

    return d.getFullYear() + "-" +
        pad(d.getMonth() + 1) + "-" +
        pad(d.getDate())

}

function validarCampoIndividual(el) {

    const obligatorios = [
        "IdCliente",
        "Fecha",
        "NombreEvento",
        "IdUbicacion",
        "IdProductora",
        "IdMoneda",
        "IdEstado",
        "ImporteTotal",
        "IdTipoContrato"
    ]

    if (!obligatorios.includes(el.id))
        return

    const valor = (el.value ?? "").toString().trim()

    const esValido =
        valor !== "" &&
        valor !== null &&
        valor !== "Seleccionar"

    setEstadoCampo(el, esValido)

}



// Mini helper UI (sin lógica de negocio): marca tile seleccionado y setea #Contrato_Formato
(function () {
    function setFormato(fmt) {
        var inp = document.getElementById("Contrato_Formato");
        if (inp) inp.value = fmt;

        var tileWord = document.getElementById("tileWord");
        var tilePdf = document.getElementById("tilePdf");

        if (tileWord) tileWord.classList.toggle("is-selected", fmt === "word");
        if (tilePdf) tilePdf.classList.toggle("is-selected", fmt === "pdf");

        var rWord = document.querySelector('input[name="ContratoFormato"][value="word"]');
        var rPdf = document.querySelector('input[name="ContratoFormato"][value="pdf"]');
        if (rWord) rWord.checked = (fmt === "word");
        if (rPdf) rPdf.checked = (fmt === "pdf");
    }

    document.addEventListener("click", function (e) {
        var tile = e.target.closest && e.target.closest(".vn-contract-tile");
        if (tile && tile.dataset && tile.dataset.formato) {
            setFormato(tile.dataset.formato);
        }
    });

    // Modal: si eligen Word/PDF desde el modal, sincroniza el selector de la sección
    document.addEventListener("click", function (e) {
        var btn = e.target.closest && e.target.closest(".vn-export-option");
        if (!btn) return;

        var tipo = btn.getAttribute("data-tipo");
        if (tipo === "word" || tipo === "pdf") setFormato(tipo);
    });

    // default
    setFormato("pdf");
})();


function actualizarVisibilidadContrato() {

    const btn = document.getElementById("btnContrato");
    if (!btn) return;

    const idVenta = Number(document.getElementById("Venta_Id")?.value || 0);

    if (idVenta > 0)
        btn.style.display = "block";
    else
        btn.style.display = "none";

}

function vnGetSelectedText(id) {
    const el = document.getElementById(id);
    if (!el) return "";

    const opt = el.options?.[el.selectedIndex];
    return (opt?.text || "").trim();
}

function vnEscapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


function debugPlaceholders(arrayBuffer) {

    const zip = new PizZip(arrayBuffer);

    const placeholders = new Set();

    Object.keys(zip.files)
        .filter(f => f.startsWith("word/") && f.endsWith(".xml"))
        .forEach(file => {

            let xml = zip.file(file).asText();

            // unir textos partidos
            xml = xml.replace(/<\/w:t>\s*<w:t[^>]*>/g, "");

            const matches = xml.match(/@([A-Za-z0-9_]+)/g);

            if (matches) {
                matches.forEach(m => placeholders.add(m));
            }

        });

    console.log("PLACEHOLDERS EN DOCX:");
    console.table([...placeholders]);

}

function debugContratoTemplate(arrayBuffer, data) {

    const zip = new PizZip(arrayBuffer)

    const placeholders = new Set()

    Object.keys(zip.files)
        .filter(f => f.startsWith("word/") && f.endsWith(".xml"))
        .forEach(file => {

            let xml = zip.file(file).asText()

            // unir placeholders partidos por Word
            xml = xml.replace(/<\/w:t>\s*<w:t[^>]*>/g, "")

            // buscar @Campos
            const matches = xml.match(/@([A-Za-z0-9_]+)/g)

            if (matches) {

                matches.forEach(m =>
                    placeholders.add(m.replace("@", ""))
                )

            }

        })

    const docxFields = [...placeholders]
    const dataFields = Object.keys(data)

    const faltanEnData = docxFields.filter(f => !dataFields.includes(f))
    const noUsadosEnDocx = dataFields.filter(f => !docxFields.includes(f))

    console.log("===================================")
    console.log("CAMPOS DETECTADOS EN DOCX")
    console.table(docxFields)

    console.log("===================================")
    console.log("CAMPOS EN DATA (buildContratoData)")
    console.table(dataFields)

    console.log("===================================")
    console.log("❌ CAMPOS QUE DOCX PIDE Y JS NO ENVÍA")
    console.table(faltanEnData)

    console.log("===================================")
    console.log("⚠ CAMPOS QUE JS ENVÍA PERO DOCX NO USA")
    console.table(noUsadosEnDocx)

}

function actualizarVisibilidadResumenes() {

    const sec = document.querySelector('[data-sec="resumenes"]')?.parentElement;
    const panel = document.getElementById("sec-resumenes");

    const idVenta = Number(document.getElementById("Venta_Id")?.value || 0);

    if (!sec || !panel) return;

    if (idVenta > 0) {
        sec.style.display = "block";
    } else {
        sec.style.display = "none";
        panel.style.display = "none";
    }
}

function cargarImagenBase64(url) {

    return new Promise((resolve, reject) => {

        const img = new Image();

        img.crossOrigin = "Anonymous";

        img.onload = function () {

            const canvas = document.createElement("canvas");

            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext("2d");

            ctx.drawImage(img, 0, 0);

            const dataURL = canvas.toDataURL("image/png");

            resolve(dataURL);

        };

        img.onerror = reject;

        img.src = url;

    });

}



function registrarEventosEstadoVenta() {
    const btnCrearEstado = document.getElementById("btnCrearEstadoVenta");

    if (!btnCrearEstado) return;

    btnCrearEstado.addEventListener("click", async function () {
        try {
            await abrirConfiguracion(
                "Estados de venta",   // nombre visible
                "VentasEstados",      // controller configuracion
                null,                 // comboNombre
                null,                 // comboController
                null,                  // lblComboNombre
                true
            );
        } catch (e) {
            console.error("Error al abrir configuraciones de estados", e);
            errorModal("No se pudo abrir la configuración de estados.");
        }
    });
}



document.querySelectorAll(".vn-head-btn").forEach(btn => {

    btn.addEventListener("click", function () {

        const nav = document.querySelector(".vn-head-nav");

        // scroll automático hacia el botón activo
        const left = this.offsetLeft - (nav.clientWidth / 2) + (this.clientWidth / 2);

        nav.scrollTo({
            left: left,
            behavior: "smooth"
        });

    });

});

const nav = document.querySelector(".vn-head-nav");

if (nav) {

    // crear flechas
    const btnLeft = document.createElement("button");
    const btnRight = document.createElement("button");

    btnLeft.innerHTML = '<i class="fa fa-chevron-left"></i>';
    btnRight.innerHTML = '<i class="fa fa-chevron-right"></i>';

    btnLeft.className = "vn-scroll-arrow left";
    btnRight.className = "vn-scroll-arrow right";

    nav.parentElement.style.position = "relative";

    nav.parentElement.appendChild(btnLeft);
    nav.parentElement.appendChild(btnRight);

    // scroll
    btnRight.addEventListener("click", () => {
        nav.scrollBy({ left: 150, behavior: "smooth" });
    });

    btnLeft.addEventListener("click", () => {
        nav.scrollBy({ left: -150, behavior: "smooth" });
    });
    function updateArrows() {
        const maxScroll = nav.scrollWidth - nav.clientWidth;

        const showLeft = nav.scrollLeft > 5;
        const showRight = nav.scrollLeft < maxScroll - 5;

        btnLeft.style.display = showLeft ? "flex" : "none";
        btnRight.style.display = showRight ? "flex" : "none";

        // 👇 activar/desactivar animación
        btnLeft.style.animation = showLeft ? "vnBreathing 2.2s ease-in-out infinite" : "none";
        btnRight.style.animation = showRight ? "vnBreathing 2.2s ease-in-out infinite" : "none";
    }

    nav.addEventListener("scroll", updateArrows);
    window.addEventListener("resize", updateArrows);

    updateArrows();

}




function getSeccionDeCampo(id) {

    const map = {

        // DATOS
        "IdCliente": "datos",
        "Fecha": "datos",
        "NombreEvento": "datos",
        "Duracion": "datos",
        "IdUbicacion": "datos",
        "IdProductora": "datos",
        "artistas": "artistas",
        "IdMoneda": "datos",
        "IdEstado": "datos",
        "ImporteTotal": "datos",

        // CONTRATO
        "IdTipoContrato": "contrato",
        "IdOpExclusividad": "contrato",
        "DiasPrevios": "contrato",
        "FechaHasta": "contrato",

        // NOTAS
        "NotaInterna": "notas",
        "NotaCliente": "notas"

    };

    return map[id] || null;
}

function marcarSeccionesPorErrores(erroresCampos = []) {

    // limpiar estados previos
    document.querySelectorAll(".vn-head-btn").forEach(btn => {
        btn.classList.remove("error", "ok");
    });

    const seccionesConError = new Set();

    erroresCampos.forEach(idCampo => {

        const sec = getSeccionDeCampo(idCampo);
        if (sec) seccionesConError.add(sec);

    });

    document.querySelectorAll(".vn-head-btn").forEach(btn => {

        const sec = btn.dataset.sec;

        if (!sec) return;

        if (seccionesConError.has(sec)) {
            btn.classList.add("error");
        } 
        

    });
}

function irAPrimeraSeccionConError() {

    const btn = document.querySelector(".vn-head-btn.error");

    if (btn) btn.click();
}