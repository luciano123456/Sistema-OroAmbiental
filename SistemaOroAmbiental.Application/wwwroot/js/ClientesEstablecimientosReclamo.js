(function (window, $) {
    "use strict";

    const INTRO_KEY = "oroAmbiental.reclamoDeudaIntro";
    const CIERRE_KEY = "oroAmbiental.reclamoDeudaCierre";
    const MODO_KEY = "oroAmbiental.reclamoDeudaModo";
    const TPL_KEY = "oroAmbiental.reclamoDeudaTpl";
    const LIBRE_TXT_KEY = "oroAmbiental.reclamoLibreTexto";

    const TPL = {
        formal: "Estimado/a {cliente}, le enviamos el informe de cuenta del establecimiento {establecimiento}. Incluimos meses anteriores para que pueda ver los pagos realizados y a qué período se imputaron (muchas veces un pago de un mes cubre deuda previa).",
        corto: "Hola, te mandamos el detalle de cuenta de {establecimiento}: cargos, pagos (efectivo/transferencia) y cómo se imputaron.",
        mio: "Hola, nos comunicamos de Oro Ambiental. Le enviamos el estado de cuenta del establecimiento {establecimiento}, con el detalle de pagos e imputación por mes."
    };
    const CIERRE_DEFAULT = "Quedamos a disposición para coordinar el pago o aclarar cualquier imputación.";

    let bsModal = null;
    let dataActual = null;
    let bound = false;
    let preselectKeys = null;
    let cola = [];
    let colaIdx = 0;
    let colaCanal = "wa";
    let colaActiva = false;
    let destinosWa = [];
    let destSelId = "";

    function tokenAuth() {
        return {
            Authorization: "Bearer " + (window.token || localStorage.getItem("JwtToken") || ""),
            "Content-Type": "application/json"
        };
    }

    function money(n) {
        const v = Number(n) || 0;
        if (typeof formatoMoneda !== "undefined") return formatoMoneda.format(v);
        return v.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
    }

    function capitalizar(s) {
        const t = String(s || "").trim();
        if (!t) return t;
        return t.charAt(0).toUpperCase() + t.slice(1);
    }

    function campo(m, ...names) {
        if (!m || typeof m !== "object") return undefined;
        const map = {};
        Object.keys(m).forEach((k) => { map[k.toLowerCase()] = m[k]; });
        for (const n of names) {
            if (n == null) continue;
            const v = map[String(n).toLowerCase()];
            if (v !== undefined && v !== null && v !== "") return v;
        }
        return undefined;
    }

    function numCampo(m, ...names) {
        const raw = campo(m, ...names);
        if (raw === undefined) return 0;
        const v = Number(raw);
        return Number.isFinite(v) ? v : 0;
    }

    function round2(n) {
        return Math.round((Number(n) || 0) * 100) / 100;
    }

    function etiquetaMes(m) {
        return `${capitalizar(m.MesNombre || `Mes ${m.Mes}`)} ${m.Anio}`;
    }

    function periodoMes(m) {
        return String(m.Periodo || "").trim() || etiquetaMes(m).toLowerCase();
    }

    function fechaCorta(v) {
        if (!v) return "";
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) {
            const s = String(v);
            const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) return `${Number(m[3])}/${Number(m[2])}/${m[1]}`;
            return "";
        }
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    }

    function restanteMes(m) {
        return numCampo(m, "Restante", "RestanteMes");
    }

    function saldoMes(m) {
        return numCampo(m, "Saldo");
    }

    function adeudadoMes(m) {
        return numCampo(m, "Adeudado", "Debe");
    }

    function interesesMes(m) {
        return numCampo(m, "Intereses", "TotalIntereses");
    }

    function totalMes(m) {
        const t = numCampo(m, "TotalMes");
        if (Math.abs(t) > 0.009) return t;
        return round2(adeudadoMes(m) + interesesMes(m));
    }

    function efectivoMes(m) {
        return numCampo(m, "AbonoEfectivo");
    }

    function transfMes(m) {
        return numCampo(m, "AbonoTransferencia");
    }

    function haberMes(m) {
        const h = numCampo(m, "Haber");
        if (Math.abs(h) > 0.009) return h;
        return round2(efectivoMes(m) + transfMes(m));
    }

    function montoDeudaMes(m) {
        if (!m) return 0;
        if (m.Restante != null && m.Restante !== "") return round2(Number(m.Restante) || 0);
        return round2(totalMes(m) - haberMes(m));
    }

    function totalAdeudado(meses) {
        return round2((meses || []).reduce((s, m) => s + Math.max(0, montoDeudaMes(m)), 0));
    }

    function estadoMes(m) {
        const r = montoDeudaMes(m);
        if (r > 0.009) return "deuda";
        if (r < -0.009 || haberMes(m) > totalMes(m) + 0.009) return "afavor";
        return "cancelado";
    }

    function normalizarMes(raw) {
        const anio = numCampo(raw, "Anio");
        const mes = numCampo(raw, "Mes");
        const adeudado = adeudadoMes(raw);
        const intereses = interesesMes(raw);
        let ef = efectivoMes(raw);
        let tr = transfMes(raw);
        const haber = haberMes(raw);
        if (ef <= 0.009 && tr <= 0.009 && haber > 0.009) {
            tr = haber;
        }
        const total = numCampo(raw, "TotalMes") || round2(adeudado + intereses);
        const restanteExp = campo(raw, "Restante", "RestanteMes");
        const restante = restanteExp !== undefined
            ? round2(Number(restanteExp) || 0)
            : round2(total - haber);
        const mesNombre = String(campo(raw, "MesNombre") || `Mes ${mes}`);
        return {
            Anio: anio,
            Mes: mes,
            MesNombre: mesNombre,
            Periodo: String(campo(raw, "Periodo") || "").trim(),
            FechaRecoleccion: campo(raw, "FechaRecoleccion", "FechaVisita") || null,
            Adeudado: adeudado,
            Intereses: intereses,
            TotalMes: total,
            AbonoEfectivo: ef,
            AbonoTransferencia: tr,
            FechaTransferencia: campo(raw, "FechaTransferencia") || null,
            Haber: haber,
            Restante: restante,
            Saldo: saldoMes(raw),
            Estado: estadoMes({ Restante: restante, Haber: haber, TotalMes: total, AbonoEfectivo: ef, AbonoTransferencia: tr }),
            NotaImputacion: campo(raw, "NotaImputacion") || null
        };
    }

    function filasHubControl() {
        try {
            if (typeof hubPropCg !== "function") return [];
            const data = hubPropCg("controlFiltrado");
            return data?.Filas || data?.filas || [];
        } catch {
            return [];
        }
    }

    function fusionarConPlanilla(meses) {
        const filas = filasHubControl();
        if (!filas.length) return meses;
        const map = {};
        filas.forEach((f) => {
            const n = normalizarMes(f);
            if (n.Anio && n.Mes) map[`${n.Anio}-${n.Mes}`] = n;
        });
        return (meses || []).map((m) => {
            const h = map[`${m.Anio}-${m.Mes}`];
            if (!h) return m;
            const fused = {
                ...m,
                Adeudado: Math.max(m.Adeudado, h.Adeudado),
                Intereses: Math.max(m.Intereses, h.Intereses),
                TotalMes: Math.max(m.TotalMes, h.TotalMes),
                AbonoEfectivo: Math.max(m.AbonoEfectivo, h.AbonoEfectivo),
                AbonoTransferencia: Math.max(m.AbonoTransferencia, h.AbonoTransferencia),
                Haber: Math.max(m.Haber, h.Haber),
                Saldo: Math.abs(m.Saldo) > 0.009 ? m.Saldo : h.Saldo,
                FechaRecoleccion: m.FechaRecoleccion || h.FechaRecoleccion,
                FechaTransferencia: m.FechaTransferencia || h.FechaTransferencia
            };
            if (fused.AbonoEfectivo <= 0.009 && fused.AbonoTransferencia <= 0.009 && fused.Haber > 0.009) {
                fused.AbonoTransferencia = fused.Haber;
            }
            fused.Haber = Math.max(fused.Haber, round2(fused.AbonoEfectivo + fused.AbonoTransferencia));
            fused.Restante = round2(fused.TotalMes - fused.Haber);
            fused.Estado = estadoMes(fused);
            return fused;
        });
    }

    function normalizarInforme(raw) {
        const mesesApi = (campo(raw, "Meses") || []).map(normalizarMes);
        return {
            IdEstablecimiento: numCampo(raw, "IdEstablecimiento"),
            IdCliente: numCampo(raw, "IdCliente"),
            Establecimiento: String(campo(raw, "Establecimiento") || ""),
            CodigoEstablecimiento: String(campo(raw, "CodigoEstablecimiento") || ""),
            Direccion: String(campo(raw, "Direccion") || ""),
            Localidad: String(campo(raw, "Localidad") || ""),
            Partido: String(campo(raw, "Partido") || ""),
            Cliente: String(campo(raw, "Cliente") || ""),
            SaldoEstablecimiento: numCampo(raw, "SaldoEstablecimiento"),
            SaldoCliente: numCampo(raw, "SaldoCliente"),
            Meses: fusionarConPlanilla(mesesApi),
            Contactos: campo(raw, "Contactos") || []
        };
    }

    function keysPorDefecto(meses) {
        const lista = meses || [];
        const deuda = lista.filter((m) => montoDeudaMes(m) > 0.009);
        if (!deuda.length) return lista.slice(-6).map((m) => `${m.Anio}-${m.Mes}`);
        const first = deuda[0];
        const firstIdx = lista.findIndex((m) => m.Anio === first.Anio && m.Mes === first.Mes);
        const desde = Math.max(0, firstIdx - 3);
        return lista.slice(desde).map((m) => `${m.Anio}-${m.Mes}`);
    }

    function leerIntro() {
        const tpl = localStorage.getItem(TPL_KEY) || "mio";
        if (tpl === "formal" || tpl === "corto") return TPL[tpl];
        const saved = localStorage.getItem(INTRO_KEY);
        return saved && saved.trim() ? saved : TPL.mio;
    }

    function leerCierre() {
        const saved = localStorage.getItem(CIERRE_KEY);
        return saved && saved.trim() ? saved : CIERRE_DEFAULT;
    }

    function modoActual() {
        const el = document.querySelector('input[name="rdEstModo"]:checked');
        return el?.value === "separado" ? "separado" : "junto";
    }

    function mesesSeleccionados() {
        const ids = [];
        document.querySelectorAll("#rdEstMeses input[type=checkbox]:checked").forEach((el) => {
            ids.push(el.getAttribute("data-key"));
        });
        if (!dataActual || !dataActual.Meses) return [];
        return dataActual.Meses.filter((m) => ids.indexOf(`${m.Anio}-${m.Mes}`) >= 0);
    }

    function esLibre() {
        return !!document.getElementById("rdEstLibre")?.checked;
    }

    function lineasLocal() {
        const lineas = [];
        if (dataActual?.Cliente) lineas.push(`Cliente: ${dataActual.Cliente}`);
        const nom = dataActual?.Establecimiento || "";
        const cod = dataActual?.CodigoEstablecimiento || "";
        if (nom) lineas.push(`Establecimiento: ${nom}${cod ? ` (${cod})` : ""}`);
        if (dataActual?.Direccion) lineas.push(`Dirección: ${dataActual.Direccion}`);
        return lineas;
    }

    function textoDatosLocal() {
        return lineasLocal().join("\n");
    }

    function aplicarModoLibre(on) {
        const chk = document.getElementById("rdEstLibre");
        if (chk) chk.checked = !!on;
        document.getElementById("rdEstDeudaUi")?.classList.toggle("d-none", !!on);
        document.getElementById("rdEstLibrePanel")?.classList.toggle("d-none", !on);
        document.getElementById("rdEstStepper")?.classList.add("d-none");
        const titulo = document.getElementById("rdEstTitulo");
        if (titulo) {
            titulo.textContent = on ? "Mensaje WhatsApp / mail" : "Informe de cuenta / reclamo";
        }
        const ta = document.getElementById("rdEstLibreTexto");
        if (on && ta && !(ta.value || "").trim()) {
            ta.value = localStorage.getItem(LIBRE_TXT_KEY) || "";
        }
        actualizarPreview();
    }

    function aplicarVars(txt, meses) {
        const lista = meses || [];
        const total = totalAdeudado(lista);
        const primero = lista[0];
        const mesesTxt = lista.map(etiquetaMes).join(", ");
        return String(txt || "")
            .replaceAll("{cliente}", dataActual?.Cliente || "")
            .replaceAll("{establecimiento}", dataActual?.Establecimiento || "")
            .replaceAll("{direccion}", dataActual?.Direccion || "")
            .replaceAll("{localidad}", dataActual?.Localidad || "")
            .replaceAll("{partido}", dataActual?.Partido || "")
            .replaceAll("{mes}", primero ? capitalizar(primero.MesNombre || "") : "")
            .replaceAll("{anio}", primero ? String(primero.Anio) : "")
            .replaceAll("{total}", money(total))
            .replaceAll("{meses}", mesesTxt);
    }

    function bloqueMesInforme(m) {
        const lineas = [];
        lineas.push(`*${periodoMes(m)}*`);
        const recol = fechaCorta(m.FechaRecoleccion);
        if (recol) lineas.push(`Recolección: ${recol}`);
        lineas.push(`Cargo del mes: ${money(totalMes(m))}`);
        if (interesesMes(m) !== 0) lineas.push(`Intereses: ${money(interesesMes(m))}`);
        const ef = efectivoMes(m);
        const tr = transfMes(m);
        const hab = haberMes(m);
        const ft = fechaCorta(m.FechaTransferencia);
        if (ef > 0.009) lineas.push(`Abonado efectivo: ${money(ef)}`);
        if (tr > 0.009) lineas.push(`Abonado transferencia: ${money(tr)}${ft ? ` (${ft})` : ""}`);
        if (ef <= 0.009 && tr <= 0.009 && hab > 0.009) {
            lineas.push(`Abonado: ${money(hab)}`);
        }
        if (ef <= 0.009 && tr <= 0.009 && hab <= 0.009) {
            lineas.push("Abonado: $ 0,00");
        }
        lineas.push(`Restante del mes: ${money(montoDeudaMes(m))}`);
        if (Math.abs(saldoMes(m) - montoDeudaMes(m)) > 0.009) {
            lineas.push(`Saldo acumulado: ${money(saldoMes(m))}`);
        }
        if (m.NotaImputacion) lineas.push(`_${m.NotaImputacion}_`);
        return lineas.join("\n");
    }

    function armarMensaje(mesesForzados) {
        if (esLibre()) {
            const raw = (document.getElementById("rdEstLibreTexto")?.value || "").trim();
            return aplicarVars(raw, []);
        }
        if (!dataActual) return "";
        const meses = mesesForzados || mesesSeleccionados();
        const intro = aplicarVars((document.getElementById("rdEstIntro")?.value || "").trim(), meses);
        const cierre = aplicarVars((document.getElementById("rdEstCierre")?.value || "").trim(), meses);
        const total = totalAdeudado(meses);

        const partes = [];
        if (intro) partes.push(intro);
        partes.push("*INFORME DE CUENTA*");
        partes.push(...lineasLocal());
        partes.push("");
        if (meses.length) {
            partes.push("Detalle por mes (un pago puede imputarse a deuda de meses anteriores):");
            partes.push("");
            partes.push(meses.map(bloqueMesInforme).join("\n\n"));
            partes.push("");
            partes.push(`*TOTAL ADEUDADO: ${money(total)}*`);
        } else {
            partes.push("No hay meses seleccionados.");
        }
        if (cierre) {
            partes.push("");
            partes.push(cierre);
        }
        return partes.join("\n");
    }

    function etiquetaBotonWa(base) {
        const d = destinosWa.find((x) => x.id === destSelId);
        const n = d ? String(d.nombre || "").split(" ")[0] : "";
        return n ? `${base} · ${n}` : base;
    }

    function actualizarPreview() {
        if (esLibre()) {
            const pre = document.getElementById("rdEstPreview");
            if (pre) pre.textContent = armarMensaje() || "(escribí el mensaje arriba)";
            const waTxt = document.getElementById("rdEstBtnWaTxt");
            const mailTxt = document.getElementById("rdEstBtnMailTxt");
            if (waTxt) waTxt.textContent = etiquetaBotonWa("WhatsApp");
            if (mailTxt) mailTxt.textContent = "Enviar mail";
            actualizarResumenDestino();
            return;
        }
        const meses = mesesSeleccionados();
        const total = totalAdeudado(meses);
        const kpiM = document.getElementById("rdEstKpiMeses");
        const kpiT = document.getElementById("rdEstKpiTotal");
        if (kpiM) kpiM.textContent = String(meses.length);
        if (kpiT) kpiT.textContent = money(total);
        const pre = document.getElementById("rdEstPreview");
        if (pre) {
            pre.textContent = modoActual() === "separado" && meses.length > 1
                ? armarMensaje([meses[0]]) + "\n\n— Vista del primer mes. Cada envío lleva su propio período. —"
                : armarMensaje(meses);
        }
        const n = meses.length;
        const waTxt = document.getElementById("rdEstBtnWaTxt");
        const mailTxt = document.getElementById("rdEstBtnMailTxt");
        if (modoActual() === "separado" && n > 1) {
            if (waTxt) waTxt.textContent = etiquetaBotonWa(`WhatsApp (${n} msgs)`);
            if (mailTxt) mailTxt.textContent = `Mail (${n} msgs)`;
        } else {
            if (waTxt) waTxt.textContent = etiquetaBotonWa("WhatsApp");
            if (mailTxt) mailTxt.textContent = "Enviar mail";
        }
        actualizarResumenDestino();
    }

    function renderMeses(meses) {
        const wrap = document.getElementById("rdEstMeses");
        const empty = document.getElementById("rdEstSinDeuda");
        if (!wrap) return;
        if (!meses || !meses.length) {
            wrap.innerHTML = "";
            if (empty) empty.classList.remove("d-none");
            return;
        }
        if (empty) empty.classList.add("d-none");
        const keys = preselectKeys && preselectKeys.length
            ? new Set(preselectKeys)
            : new Set(keysPorDefecto(meses));
        wrap.innerHTML = meses.map((m) => {
            const key = `${m.Anio}-${m.Mes}`;
            const checked = keys.has(key) ? "checked" : "";
            const deudaMes = montoDeudaMes(m);
            const est = estadoMes(m);
            const badge = est === "deuda"
                ? `<span class="rd-badge-est is-deuda">Deuda</span>`
                : (est === "afavor"
                    ? `<span class="rd-badge-est is-ok">A favor</span>`
                    : `<span class="rd-badge-est is-paid">Cancelado</span>`);
            const ft = fechaCorta(m.FechaTransferencia);
            const recol = fechaCorta(m.FechaRecoleccion);
            const ef = efectivoMes(m);
            const tr = transfMes(m);
            const hab = haberMes(m);
            const cargo = totalMes(m);
            const partes = [`Cargo ${money(cargo)}`];
            if (ef > 0.009) partes.push(`Ef. ${money(ef)}`);
            if (tr > 0.009) partes.push(`Tr. ${money(tr)}${ft ? ` ${ft}` : ""}`);
            if (ef <= 0.009 && tr <= 0.009 && hab > 0.009) partes.push(`Abonado ${money(hab)}`);
            if (recol) partes.push(`Recol. ${recol}`);
            const montoCls = deudaMes > 0.009 ? "is-deuda" : (deudaMes < -0.009 ? "is-ok" : "");
            return `<div class="rd-mes rd-mes--${est}" data-key="${key}">
                <label class="rd-mes-main">
                    <input type="checkbox" ${checked} data-key="${key}">
                    <span class="rd-mes-nom">${periodoMes(m)} ${badge}</span>
                    <span class="rd-mes-monto ${montoCls}" title="Restante de este mes">${money(deudaMes)}</span>
                </label>
                <div class="rd-mes-meta">${partes.join(" · ")}</div>
                <div class="rd-mes-actions">
                    <button type="button" class="rd-mini rd-mini-wa" data-send="wa" data-key="${key}" title="WhatsApp solo este mes">
                        <i class="fa fa-whatsapp"></i>
                    </button>
                    <button type="button" class="rd-mini rd-mini-mail" data-send="mail" data-key="${key}" title="Mail solo este mes">
                        <i class="fa fa-envelope"></i>
                    </button>
                </div>
            </div>`;
        }).join("");
        activarPreset(preselectKeys && preselectKeys.length ? "" : "rdEstSelDeuda");
    }

    function marcarMesesPor(pred) {
        document.querySelectorAll("#rdEstMeses input[type=checkbox]").forEach((el) => {
            const key = el.getAttribute("data-key");
            const m = (dataActual?.Meses || []).find((x) => `${x.Anio}-${x.Mes}` === key);
            el.checked = !!(m && pred(m));
        });
        actualizarPreview();
    }

    function ultimosN(n) {
        const lista = dataActual?.Meses || [];
        const keys = new Set(lista.slice(-n).map((m) => `${m.Anio}-${m.Mes}`));
        marcarMesesPor((m) => keys.has(`${m.Anio}-${m.Mes}`));
    }

    function activarPreset(id) {
        document.querySelectorAll(".rd-meses-toolbar .rd-chip").forEach((b) => {
            b.classList.toggle("is-active", b.id === id);
        });
    }

    function escapeHtmlRd(s) {
        return String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function origenEsLocal(c) {
        const o = String(campo(c, "Origen") || "").toLowerCase();
        return o.indexOf("establec") >= 0 || o.indexOf("local") >= 0;
    }

    function etiquetaOrigen(c) {
        return origenEsLocal(c) ? "Este local" : (campo(c, "Origen") || "Cliente");
    }

    function pintarLocal() {
        const nom = document.getElementById("rdEstLocalNombre");
        const dir = document.getElementById("rdEstLocalDir");
        const sub = document.getElementById("rdEstSubtitulo");
        const nombre = dataActual?.Establecimiento || "—";
        const cod = dataActual?.CodigoEstablecimiento;
        const titulo = cod ? `${nombre} · ${cod}` : nombre;
        const direccion = dataActual?.Direccion || "";
        if (nom) nom.textContent = titulo;
        if (dir) dir.textContent = direccion || "Sin dirección cargada";
        if (sub) {
            sub.textContent = [dataActual?.Cliente, titulo, direccion].filter(Boolean).join(" · ");
        }
        actualizarResumenDestino();
    }

    function construirDestinosWa(contactos) {
        const lista = (contactos || []).slice().sort((a, b) => {
            const la = origenEsLocal(a) ? 0 : 1;
            const lb = origenEsLocal(b) ? 0 : 1;
            return la - lb;
        });
        const dest = [];
        lista.forEach((c, ci) => {
            const tels = [];
            const t1 = String(campo(c, "Telefono") || "").trim();
            const t2 = String(campo(c, "TelefonoAlt") || "").trim();
            if (t1) tels.push({ raw: t1, etiqueta: "WhatsApp" });
            if (t2 && normalizarWhatsapp(t2) !== normalizarWhatsapp(t1)) {
                tels.push({ raw: t2, etiqueta: "WhatsApp alt." });
            }
            tels.forEach((t, ti) => {
                dest.push({
                    id: `${ci}-${ti}`,
                    nombre: campo(c, "Nombre") || "Sin nombre",
                    puesto: campo(c, "Puesto") || "",
                    origen: etiquetaOrigen(c),
                    esLocal: origenEsLocal(c),
                    email: String(campo(c, "Email") || "").trim(),
                    telefono: t.raw,
                    etiquetaTel: t.etiqueta
                });
            });
        });
        return dest;
    }

    function actualizarResumenDestino() {
        const el = document.getElementById("rdEstDestinoResumen");
        if (!el) return;
        const local = dataActual?.Establecimiento || "este local";
        const dir = dataActual?.Direccion ? ` (${dataActual.Direccion})` : "";
        const tel = (document.getElementById("rdEstTelefono")?.value || "").trim();
        const d = destinosWa.find((x) => x.id === destSelId);
        if (d && tel) {
            const puesto = d.puesto ? ` · ${d.puesto}` : "";
            el.innerHTML = `Vas a mandar al local <strong>${escapeHtmlRd(local)}</strong>${escapeHtmlRd(dir)} · WhatsApp de <strong>${escapeHtmlRd(d.nombre)}</strong>${escapeHtmlRd(puesto)}: <strong>${escapeHtmlRd(tel)}</strong>`;
            return;
        }
        if (tel) {
            el.innerHTML = `Vas a mandar al local <strong>${escapeHtmlRd(local)}</strong>${escapeHtmlRd(dir)} · número <strong>${escapeHtmlRd(tel)}</strong>`;
            return;
        }
        el.innerHTML = `Elegí un WhatsApp de <strong>${escapeHtmlRd(local)}</strong>${escapeHtmlRd(dir)} o escribí el número.`;
    }

    function aplicarDestino(id) {
        destSelId = id || "";
        const d = destinosWa.find((x) => x.id === destSelId);
        const tel = document.getElementById("rdEstTelefono");
        const mail = document.getElementById("rdEstEmail");
        if (d) {
            if (tel) tel.value = d.telefono;
            if (mail && d.email) mail.value = d.email;
        }
        document.querySelectorAll("#rdEstDestinosWa .rd-dest").forEach((btn) => {
            btn.classList.toggle("is-active", btn.getAttribute("data-id") === destSelId);
        });
        actualizarPreview();
    }

    function renderContactos(contactos) {
        destinosWa = construirDestinosWa(contactos);
        const wrap = document.getElementById("rdEstDestinosWa");
        const vacio = document.getElementById("rdEstDestinosWaVacio");
        const tel = document.getElementById("rdEstTelefono");
        const mail = document.getElementById("rdEstEmail");
        if (!wrap) return;

        if (!destinosWa.length) {
            wrap.innerHTML = "";
            if (vacio) vacio.classList.remove("d-none");
            if (tel) tel.value = "";
            const firstMail = (contactos || []).map((c) => String(campo(c, "Email") || "").trim()).find(Boolean);
            if (mail) mail.value = firstMail || "";
            destSelId = "";
            actualizarResumenDestino();
            return;
        }
        if (vacio) vacio.classList.add("d-none");
        wrap.innerHTML = destinosWa.map((d) => {
            const puesto = d.puesto ? ` · ${escapeHtmlRd(d.puesto)}` : "";
            const badge = d.esLocal
                ? `<span class="rd-dest-badge is-local">Este local</span>`
                : `<span class="rd-dest-badge">${escapeHtmlRd(d.origen)}</span>`;
            return `<button type="button" class="rd-dest" data-id="${escapeHtmlRd(d.id)}">
                <span class="rd-dest-waicon"><i class="fa fa-whatsapp"></i></span>
                <span class="rd-dest-body">
                    <span class="rd-dest-name">${escapeHtmlRd(d.nombre)}${puesto} ${badge}</span>
                    <span class="rd-dest-tel">${escapeHtmlRd(d.telefono)} · ${escapeHtmlRd(d.etiquetaTel)}</span>
                </span>
            </button>`;
        }).join("");

        const preferido = destinosWa.find((d) => d.esLocal) || destinosWa[0];
        aplicarDestino(preferido.id);
        const firstMail = preferido.email
            || (contactos || []).map((c) => String(campo(c, "Email") || "").trim()).find(Boolean);
        if (mail && firstMail && !(mail.value || "").trim()) mail.value = firstMail;
    }

    function normalizarWhatsapp(raw) {
        let d = String(raw || "").replace(/\D/g, "");
        if (!d) return "";
        if (d.startsWith("00")) d = d.slice(2);
        if (d.startsWith("0")) d = d.slice(1);
        if (!d.startsWith("54")) d = "54" + d;
        return d;
    }

    function persistirTextos() {
        if (esLibre()) {
            localStorage.setItem(LIBRE_TXT_KEY, document.getElementById("rdEstLibreTexto")?.value || "");
            return;
        }
        const tpl = document.querySelector("#rdEstTemplates .rd-tpl.is-active")?.getAttribute("data-tpl") || "mio";
        localStorage.setItem(TPL_KEY, tpl);
        if (tpl === "mio") localStorage.setItem(INTRO_KEY, document.getElementById("rdEstIntro")?.value || "");
        localStorage.setItem(CIERRE_KEY, document.getElementById("rdEstCierre")?.value || "");
        localStorage.setItem(MODO_KEY, modoActual());
    }

    function setColaActiva(on) {
        colaActiva = !!on;
        const wa = document.getElementById("rdEstBtnWa");
        const mail = document.getElementById("rdEstBtnMail");
        if (wa) wa.disabled = colaActiva;
        if (mail) mail.disabled = colaActiva;
    }

    function resetCola(okMsg) {
        cola = [];
        colaIdx = 0;
        colaActiva = false;
        setColaActiva(false);
        mostrarStepper(false);
        if (okMsg && typeof exitoModal === "function") exitoModal(okMsg);
    }

    function abrirWhatsapp(texto) {
        const tel = normalizarWhatsapp(document.getElementById("rdEstTelefono")?.value);
        if (!tel) {
            if (typeof errorModal === "function") errorModal("Falta el teléfono de WhatsApp.");
            return false;
        }
        const w = window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
        if (w) w.opener = null;
        return true;
    }

    function abrirMail(texto, meses) {
        const email = (document.getElementById("rdEstEmail")?.value || "").trim();
        if (!email) {
            if (typeof errorModal === "function") errorModal("Falta el mail del destinatario.");
            return false;
        }
        const periodo = esLibre()
            ? (dataActual?.Establecimiento || "Oro Ambiental")
            : (meses?.length === 1 ? etiquetaMes(meses[0]) : (dataActual?.Establecimiento || "Oro Ambiental"));
        const asunto = esLibre()
            ? `Mensaje — ${periodo}`
            : `Informe de cuenta — ${periodo}`;
        const href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`;

        // No usar window.open(mailto): abre una pestaña en blanco y deja el modal trabado.
        const a = document.getElementById("rdEstMailtoLink");
        if (a) {
            a.setAttribute("href", href);
            a.click();
            return true;
        }
        window.location.href = href;
        return true;
    }

    function mesPorKey(key) {
        return (dataActual?.Meses || []).find((m) => `${m.Anio}-${m.Mes}` === key);
    }

    function enviarSoloMes(key, canal) {
        const m = mesPorKey(key);
        if (!m) return;
        persistirTextos();
        const txt = armarMensaje([m]);
        if (canal === "mail") abrirMail(txt, [m]);
        else abrirWhatsapp(txt);
    }

    function mostrarStepper(visible) {
        document.getElementById("rdEstStepper")?.classList.toggle("d-none", !visible);
    }

    function refrescarStepper() {
        const n = cola.length;
        const i = colaIdx;
        const m = cola[i];
        const titulo = document.getElementById("rdEstStepperTitulo");
        const texto = document.getElementById("rdEstStepperTexto");
        const next = document.getElementById("rdEstStepperNext");
        if (!m) {
            mostrarStepper(false);
            return;
        }
        mostrarStepper(true);
        const canalTxt = colaCanal === "mail" ? "el correo" : "WhatsApp";
        if (titulo) titulo.textContent = `Mensaje ${i + 1} de ${n} · ${etiquetaMes(m)}`;
        if (texto) {
            texto.textContent = i + 1 < n
                ? `Se abrió ${canalTxt} de este mes. Cerrá el correo si hace falta y tocá Siguiente mes.`
                : "Último mes. Cuando termines, tocá Listo.";
        }
        if (next) next.textContent = i + 1 < n ? "Siguiente mes" : "Listo";
    }

    function dispararColaItem() {
        const m = cola[colaIdx];
        if (!m) return;
        const txt = armarMensaje([m]);
        const ok = colaCanal === "mail" ? abrirMail(txt, [m]) : abrirWhatsapp(txt);
        if (!ok) {
            resetCola();
            return;
        }
        refrescarStepper();
    }

    function empezarCola(canal) {
        if (colaActiva) return;
        cola = mesesSeleccionados();
        if (!cola.length) {
            if (typeof errorModal === "function") errorModal("Seleccioná al menos un mes.");
            return;
        }
        persistirTextos();
        colaCanal = canal;
        colaIdx = 0;
        setColaActiva(true);
        dispararColaItem();
    }

    function enviarLote(canal) {
        if (colaActiva) return;
        persistirTextos();
        if (esLibre()) {
            const txt = armarMensaje();
            if (!txt) {
                if (typeof errorModal === "function") errorModal("Escribí el mensaje personalizado.");
                return;
            }
            if (canal === "mail") abrirMail(txt, []);
            else abrirWhatsapp(txt);
            return;
        }
        const meses = mesesSeleccionados();
        if (!meses.length) {
            if (typeof errorModal === "function") errorModal("Seleccioná al menos un mes.");
            return;
        }
        if (modoActual() === "separado" && meses.length > 1) {
            empezarCola(canal);
            return;
        }
        const txt = armarMensaje(meses);
        if (canal === "mail") abrirMail(txt, meses);
        else abrirWhatsapp(txt);
        resetCola();
    }

    function aplicarTemplate(nombre) {
        document.querySelectorAll("#rdEstTemplates .rd-tpl").forEach((b) => {
            b.classList.toggle("is-active", b.getAttribute("data-tpl") === nombre);
        });
        const intro = document.getElementById("rdEstIntro");
        if (!intro) return;
        if (nombre === "mio") intro.value = localStorage.getItem(INTRO_KEY) || TPL.mio;
        else intro.value = TPL[nombre] || TPL.mio;
        actualizarPreview();
    }

    function bindOnce() {
        if (bound) return;
        bound = true;
        const intro = document.getElementById("rdEstIntro");
        if (intro) intro.addEventListener("input", actualizarPreview);
        document.getElementById("rdEstCierre")?.addEventListener("input", actualizarPreview);
        document.getElementById("rdEstLibre")?.addEventListener("change", () => {
            aplicarModoLibre(esLibre());
        });
        document.getElementById("rdEstLibreTexto")?.addEventListener("input", () => {
            localStorage.setItem(LIBRE_TXT_KEY, document.getElementById("rdEstLibreTexto")?.value || "");
            actualizarPreview();
        });
        document.getElementById("rdEstLibreDatos")?.addEventListener("click", () => {
            const ta = document.getElementById("rdEstLibreTexto");
            if (!ta) return;
            const datos = textoDatosLocal();
            if (!datos) return;
            ta.value = ta.value && ta.value.trim()
                ? `${ta.value.replace(/\s+$/, "")}\n\n${datos}`
                : datos;
            localStorage.setItem(LIBRE_TXT_KEY, ta.value);
            actualizarPreview();
        });
        document.getElementById("rdEstMeses")?.addEventListener("change", actualizarPreview);
        document.getElementById("rdEstMeses")?.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-send]");
            if (!btn) return;
            e.preventDefault();
            enviarSoloMes(btn.getAttribute("data-key"), btn.getAttribute("data-send"));
        });
        document.getElementById("rdEstSelTodos")?.addEventListener("click", () => {
            document.querySelectorAll("#rdEstMeses input[type=checkbox]").forEach((el) => { el.checked = true; });
            activarPreset("rdEstSelTodos");
            actualizarPreview();
        });
        document.getElementById("rdEstSelNinguno")?.addEventListener("click", () => {
            document.querySelectorAll("#rdEstMeses input[type=checkbox]").forEach((el) => { el.checked = false; });
            activarPreset("rdEstSelNinguno");
            actualizarPreview();
        });
        document.getElementById("rdEstSelDeuda")?.addEventListener("click", () => {
            marcarMesesPor((m) => montoDeudaMes(m) > 0.009);
            activarPreset("rdEstSelDeuda");
        });
        document.getElementById("rdEstSelUlt3")?.addEventListener("click", () => {
            ultimosN(3);
            activarPreset("rdEstSelUlt3");
        });
        document.getElementById("rdEstSelUlt6")?.addEventListener("click", () => {
            ultimosN(6);
            activarPreset("rdEstSelUlt6");
        });
        document.getElementById("rdEstDestinosWa")?.addEventListener("click", (e) => {
            const btn = e.target.closest(".rd-dest");
            if (!btn) return;
            aplicarDestino(btn.getAttribute("data-id"));
        });
        document.getElementById("rdEstTelefono")?.addEventListener("input", () => {
            destSelId = "";
            document.querySelectorAll("#rdEstDestinosWa .rd-dest").forEach((b) => b.classList.remove("is-active"));
            actualizarResumenDestino();
        });
        document.getElementById("rdEstBtnWa")?.addEventListener("click", () => enviarLote("wa"));
        document.getElementById("rdEstBtnMail")?.addEventListener("click", () => enviarLote("mail"));
        document.getElementById("rdEstBtnCopiar")?.addEventListener("click", async () => {
            const txt = armarMensaje();
            try {
                await navigator.clipboard.writeText(txt);
                if (typeof exitoModal === "function") exitoModal("Mensaje copiado.");
            } catch {
                if (typeof errorModal === "function") errorModal("No se pudo copiar.");
            }
        });
        document.querySelectorAll('input[name="rdEstModo"]').forEach((el) => {
            el.addEventListener("change", actualizarPreview);
        });
        document.getElementById("rdEstTemplates")?.addEventListener("click", (e) => {
            const btn = e.target.closest(".rd-tpl");
            if (!btn) return;
            const tpl = btn.getAttribute("data-tpl");
            if (document.querySelector("#rdEstTemplates .rd-tpl.is-active")?.getAttribute("data-tpl") === "mio") {
                localStorage.setItem(INTRO_KEY, document.getElementById("rdEstIntro")?.value || "");
            }
            aplicarTemplate(tpl);
        });
        document.getElementById("rdEstStepperNext")?.addEventListener("click", () => {
            if (!colaActiva) return;
            if (colaIdx + 1 >= cola.length) {
                resetCola("Reclamo mes a mes listo.");
                return;
            }
            colaIdx += 1;
            dispararColaItem();
        });
        document.getElementById("rdEstStepperCancel")?.addEventListener("click", () => {
            resetCola();
        });
        document.getElementById("modalReclamoDeudaEst")?.addEventListener("hidden.bs.modal", () => {
            resetCola();
        });
    }

    async function abrir(idEstablecimiento, opts) {
        const id = Number(idEstablecimiento) || 0;
        if (id <= 0) {
            if (typeof errorModal === "function") errorModal("Establecimiento inválido.");
            return;
        }

        const el = document.getElementById("modalReclamoDeudaEst");
        if (!el) {
            if (typeof errorModal === "function") errorModal("No se encontró el formulario de reclamo.");
            return;
        }

        const mesesOpt = Array.isArray(opts?.meses) ? opts.meses : [];
        preselectKeys = mesesOpt
            .map((x) => `${Number(x.anio || x.Anio)}-${Number(x.mes || x.Mes)}`)
            .filter((k) => !k.startsWith("NaN") && k !== "0-0");
        if (!preselectKeys.length) preselectKeys = null;

        resetCola();
        bindOnce();
        if (!bsModal) bsModal = new bootstrap.Modal(el);
        document.getElementById("rdEstLoading")?.classList.remove("d-none");
        document.getElementById("rdEstBody")?.classList.add("d-none");

        const tpl = localStorage.getItem(TPL_KEY) || "mio";
        aplicarTemplate(tpl);
        const cierre = document.getElementById("rdEstCierre");
        if (cierre) cierre.value = leerCierre();
        const modo = opts?.modo || localStorage.getItem(MODO_KEY) || "junto";
        const radio = document.querySelector(`input[name="rdEstModo"][value="${modo}"]`);
        if (radio) radio.checked = true;
        if (mesesOpt.length === 1) {
            const sep = document.querySelector('input[name="rdEstModo"][value="junto"]');
            if (sep) sep.checked = true;
        }
        aplicarModoLibre(!!opts?.libre);

        bsModal.show();

        try {
            const res = await fetch(`/ClientesEstablecimientos/InformeDeuda?id=${id}`, {
                headers: tokenAuth()
            });
            if (!res.ok) throw new Error(res.statusText);
            dataActual = normalizarInforme(await res.json());
            pintarLocal();
            renderMeses(dataActual.Meses || []);
            renderContactos(dataActual.Contactos || []);
            aplicarModoLibre(!!opts?.libre);
            document.getElementById("rdEstLoading")?.classList.add("d-none");
            document.getElementById("rdEstBody")?.classList.remove("d-none");
        } catch {
            if (typeof errorModal === "function") errorModal("No se pudieron cargar los datos del establecimiento.");
            bsModal.hide();
        }
    }

    window.abrirReclamoDeudaEstablecimiento = abrir;
    window.abrirMensajeWhatsappEstablecimiento = function (id, opts) {
        abrir(id, { ...(opts || {}), libre: true });
    };
    window.reclamarDeudaDesdeModalEst = function (opts) {
        const id = Number(document.getElementById("txtIdEst")?.value || 0);
        if (!id) {
            if (typeof errorModal === "function") errorModal("Guardá el establecimiento antes de reclamar la deuda.");
            return;
        }
        abrir(id, opts);
    };
    window.mensajeWhatsappDesdeModalEst = function () {
        const id = Number(document.getElementById("txtIdEst")?.value || 0);
        if (!id) {
            if (typeof errorModal === "function") errorModal("Guardá el establecimiento antes de enviar WhatsApp.");
            return;
        }
        abrir(id, { libre: true });
    };
})(window, window.jQuery);
