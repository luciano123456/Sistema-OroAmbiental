/* Análisis de datos — Oro Ambiental */
(function () {
    const charts = {};
    const PALETTE = ["#38bdf8", "#2dd4bf", "#fbbf24", "#f87171", "#a78bfa", "#fb7185", "#34d399", "#fb923c", "#60a5fa", "#94a3b8"];
    const CHART_TXT = "#94a3b8";
    const CHART_GRID = "rgba(148,163,184,0.12)";

    let periodoActivo = "3m";
    let cache = { clientes: null, operaciones: null, finanzas: null, inventario: null, recorridos: null };
    let clientesCatalogo = [];
    let establecimientosCliente = [];
    let filtroCliente = { id: 0, nombre: "", idsEstab: [] };

    function authHeaders() {
        const token = window.token || localStorage.getItem("JwtToken") || "";
        return { Authorization: "Bearer " + token };
    }

    function money(n) {
        return Number(n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    function num(n) {
        return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 1 });
    }

    function qs(id) { return document.getElementById(id); }

    function fmtDate(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    function startOfWeek(d) {
        const x = new Date(d);
        const day = x.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        x.setDate(x.getDate() + diff);
        x.setHours(0, 0, 0, 0);
        return x;
    }

    const PERIODO_LABELS = {
        hoy: "Hoy",
        semana: "Esta semana",
        mes: "Este mes",
        "3m": "Últimos 3 meses",
        "6m": "Últimos 6 meses",
        anio: "Último año",
        ytd: "Este año",
        custom: "Personalizado"
    };

    function aplicarPeriodo(key) {
        periodoActivo = key;
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        let desde = new Date(hoy);
        let hasta = new Date(hoy);

        switch (key) {
            case "hoy":
                break;
            case "semana":
                desde = startOfWeek(hoy);
                break;
            case "mes":
                desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                break;
            case "3m":
                desde = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
                break;
            case "6m":
                desde = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);
                break;
            case "anio":
                desde = new Date(hoy);
                desde.setFullYear(desde.getFullYear() - 1);
                break;
            case "ytd":
                desde = new Date(hoy.getFullYear(), 0, 1);
                break;
            case "custom":
                qs("axPeriodoLabel").textContent = "Personalizado";
                return;
            default:
                desde = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
        }

        qs("fltDesde").value = fmtDate(desde);
        qs("fltHasta").value = fmtDate(hasta);
        qs("axPeriodoLabel").textContent = PERIODO_LABELS[key] || key;
    }

    function filtrosQuery() {
        const p = new URLSearchParams();
        const desde = qs("fltDesde").value;
        const hasta = qs("fltHasta").value;
        const suc = qs("fltSucursal").value;
        const dias = qs("fltDiasSinMov").value;
        if (desde) p.set("fechaDesde", desde);
        if (hasta) p.set("fechaHasta", hasta);
        if (suc) p.set("idSucursal", suc);
        if (dias) p.set("diasSinMovimiento", dias);
        if (filtroCliente.id > 0) {
            p.set("idCliente", String(filtroCliente.id));
            if (filtroCliente.idsEstab.length) {
                p.set("idsEstablecimientos", filtroCliente.idsEstab.join(","));
            }
        }
        return p.toString();
    }

    function actualizarBannerCliente() {
        const banner = qs("axClientBanner");
        const txt = qs("axClientBannerText");
        if (!banner || !txt) return;
        if (!filtroCliente.id) {
            banner.classList.add("d-none");
            return;
        }
        const n = filtroCliente.idsEstab.length;
        const estTxt = n === 0
            ? "todos los establecimientos"
            : (n === 1 ? "1 establecimiento" : `${n} establecimientos`);
        txt.textContent = `Filtrando: ${filtroCliente.nombre} · ${estTxt}`;
        banner.classList.remove("d-none");
    }

    function renderEstablecimientos() {
        const block = qs("axEstabBlock");
        const list = qs("axEstabList");
        if (!block || !list) return;
        if (!filtroCliente.id || !establecimientosCliente.length) {
            block.classList.add("d-none");
            list.innerHTML = "";
            return;
        }
        block.classList.remove("d-none");
        const selected = new Set(filtroCliente.idsEstab);
        const allSelected = selected.size === 0 || selected.size === establecimientosCliente.length;
        list.innerHTML = establecimientosCliente.map(e => {
            const id = Number(prop(e, "id", "Id"));
            const nom = prop(e, "nombre", "Nombre", "etiqueta", "Etiqueta") || `Est. #${id}`;
            const checked = allSelected || selected.has(id);
            return `<label class="ax-estab-item ${checked ? "is-on" : ""}" data-id="${id}">
                <input type="checkbox" ${checked ? "checked" : ""} />
                <span>${nom}</span>
            </label>`;
        }).join("");

        list.querySelectorAll(".ax-estab-item").forEach(lab => {
            lab.addEventListener("change", () => {
                lab.classList.toggle("is-on", lab.querySelector("input").checked);
                syncEstabResumen();
            });
        });
        syncEstabResumen();
    }

    function syncEstabResumen() {
        const checks = [...document.querySelectorAll("#axEstabList input[type=checkbox]")];
        const on = checks.filter(c => c.checked).length;
        const el = qs("axEstabResumen");
        if (!el) return;
        if (!checks.length) el.textContent = "Sin establecimientos";
        else if (on === 0) el.textContent = "Ninguno marcado";
        else if (on === checks.length) el.textContent = `Todos (${on})`;
        else el.textContent = `${on} de ${checks.length}`;
    }

    function leerEstabsSeleccionados() {
        const checks = [...document.querySelectorAll("#axEstabList input[type=checkbox]")];
        if (!checks.length) return [];
        const ids = checks.filter(c => c.checked).map(c => Number(c.closest(".ax-estab-item").dataset.id));
        if (ids.length === 0 || ids.length === checks.length) return [];
        return ids;
    }

    async function seleccionarCliente(cli) {
        const id = Number(prop(cli, "id", "Id"));
        const nombre = prop(cli, "nombre", "Nombre") || `Cliente #${id}`;
        const nro = prop(cli, "numeroCliente", "NumeroCliente");
        filtroCliente = { id, nombre, idsEstab: [] };
        qs("fltIdCliente").value = String(id);
        qs("fltClienteBuscar").value = "";
        qs("fltClienteSug").classList.add("d-none");
        const chip = qs("fltClienteChip");
        const sel = qs("fltClienteSelected");
        if (chip && sel) {
            chip.textContent = nro ? `Nº ${nro} · ${nombre}` : nombre;
            sel.classList.remove("d-none");
        }
        try {
            const res = await fetch(`/ClientesEstablecimientos/ListaPorCliente?idCliente=${id}`, { headers: authHeaders() });
            establecimientosCliente = res.ok ? (await res.json()) : [];
            if (!Array.isArray(establecimientosCliente)) establecimientosCliente = [];
        } catch (_) {
            establecimientosCliente = [];
        }
        renderEstablecimientos();
        actualizarBannerCliente();
        // Al elegir cliente, arranca con todos los establecimientos y refresca
        filtroCliente.idsEstab = [];
        actualizarBannerCliente();
        cargarTodo();
    }

    function limpiarCliente() {
        filtroCliente = { id: 0, nombre: "", idsEstab: [] };
        establecimientosCliente = [];
        qs("fltIdCliente").value = "";
        qs("fltClienteBuscar").value = "";
        qs("fltClienteSelected")?.classList.add("d-none");
        qs("axEstabBlock")?.classList.add("d-none");
        qs("axEstabList").innerHTML = "";
        qs("fltClienteSug")?.classList.add("d-none");
        actualizarBannerCliente();
        cargarTodo();
    }

    function aplicarFiltroCliente() {
        if (!filtroCliente.id) {
            cargarTodo();
            return;
        }
        filtroCliente.idsEstab = leerEstabsSeleccionados();
        actualizarBannerCliente();
        cargarTodo();
    }

    function initClienteFilter() {
        const input = qs("fltClienteBuscar");
        const sug = qs("fltClienteSug");
        if (!input || !sug) return;

        let timer = null;
        input.addEventListener("input", () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                const term = (input.value || "").trim().toLowerCase();
                if (term.length < 1) {
                    sug.classList.add("d-none");
                    sug.innerHTML = "";
                    return;
                }
                const hits = clientesCatalogo.filter(c => {
                    const nom = String(prop(c, "nombre", "Nombre") || "").toLowerCase();
                    const nro = String(prop(c, "numeroCliente", "NumeroCliente") || "");
                    const cuit = String(prop(c, "cuit", "Cuit") || "").toLowerCase();
                    return nom.includes(term) || nro.includes(term) || cuit.includes(term);
                }).slice(0, 20);

                if (!hits.length) {
                    sug.innerHTML = '<button type="button" disabled>Sin resultados</button>';
                    sug.classList.remove("d-none");
                    return;
                }
                sug.innerHTML = hits.map(c => {
                    const id = prop(c, "id", "Id");
                    const nom = prop(c, "nombre", "Nombre");
                    const nro = prop(c, "numeroCliente", "NumeroCliente");
                    return `<button type="button" data-id="${id}">
                        ${nom}
                        <small>${nro ? `Nº ${nro}` : "Sin número"}</small>
                    </button>`;
                }).join("");
                sug.classList.remove("d-none");
                sug.querySelectorAll("button[data-id]").forEach(btn => {
                    btn.addEventListener("click", () => {
                        const cli = clientesCatalogo.find(x => Number(prop(x, "id", "Id")) === Number(btn.dataset.id));
                        if (cli) seleccionarCliente(cli);
                    });
                });
            }, 180);
        });

        document.addEventListener("click", (ev) => {
            if (!sug.contains(ev.target) && ev.target !== input) sug.classList.add("d-none");
        });

        qs("btnEstabTodos")?.addEventListener("click", () => {
            document.querySelectorAll("#axEstabList input[type=checkbox]").forEach(c => {
                c.checked = true;
                c.closest(".ax-estab-item")?.classList.add("is-on");
            });
            syncEstabResumen();
        });
        qs("btnEstabNinguno")?.addEventListener("click", () => {
            document.querySelectorAll("#axEstabList input[type=checkbox]").forEach(c => {
                c.checked = false;
                c.closest(".ax-estab-item")?.classList.remove("is-on");
            });
            syncEstabResumen();
        });
        qs("btnAplicarCliente")?.addEventListener("click", aplicarFiltroCliente);
        qs("btnLimpiarCliente")?.addEventListener("click", limpiarCliente);
    }

    async function api(path) {
        const q = filtrosQuery();
        const url = q ? `${path}?${q}` : path;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) throw new Error("Error al cargar " + path);
        return res.json();
    }

    function destroyChart(key) {
        if (charts[key]) {
            charts[key].destroy();
            delete charts[key];
        }
    }

    function baseOptions(extra = {}) {
        const opts = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: !!extra.legend,
                    position: "bottom",
                    labels: { color: CHART_TXT, boxWidth: 12, font: { size: 12 }, padding: 12 }
                },
                tooltip: {
                    backgroundColor: "rgba(15,23,42,0.95)",
                    titleFont: { size: 13 },
                    bodyFont: { size: 12 },
                    padding: 10
                }
            }
        };
        if (!extra.noScales) {
            opts.scales = {
                x: {
                    ticks: { color: CHART_TXT, font: { size: 12 }, maxRotation: 40 },
                    grid: { color: CHART_GRID }
                },
                y: {
                    ticks: { color: CHART_TXT, font: { size: 12 } },
                    grid: { color: CHART_GRID }
                },
                ...(extra.scales || {})
            };
        }
        return opts;
    }

    function makeChart(key, canvasId, config) {
        destroyChart(key);
        const el = qs(canvasId);
        if (!el || typeof Chart === "undefined") return;
        charts[key] = new Chart(el, config);
    }

    function setText(id, text) {
        const el = qs(id);
        if (el) el.textContent = text;
    }

    function prop(obj, ...keys) {
        if (!obj) return undefined;
        for (const k of keys) {
            if (obj[k] !== undefined && obj[k] !== null) return obj[k];
        }
        return undefined;
    }

    function renderRank(containerId, items, mapFn) {
        const el = qs(containerId);
        if (!el) return;
        if (!items || !items.length) {
            el.innerHTML = '<div class="ax-rank-empty">No hay datos en este período</div>';
            return;
        }
        const max = Math.max(...items.map(x => mapFn(x).value), 1);
        el.innerHTML = items.map((item, i) => {
            const m = mapFn(item);
            const pct = Math.round((m.value / max) * 100);
            return `<div class="ax-rank-item">
                <span class="ax-rank-pos">${i + 1}</span>
                <div>
                    <div class="ax-rank-name">${m.name}</div>
                    ${m.sub ? `<span class="ax-rank-sub">${m.sub}</span>` : ""}
                </div>
                <div class="ax-rank-val">${m.valueText}</div>
                <div class="ax-rank-bar"><i style="width:${pct}%"></i></div>
            </div>`;
        }).join("");
    }

    function doughnut(key, canvasId, labels, data) {
        makeChart(key, canvasId, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
                    borderWidth: 0,
                    cutout: "65%"
                }]
            },
            options: baseOptions({ legend: true, noScales: true })
        });
    }

    function bar(key, canvasId, labels, datasets, horizontal) {
        makeChart(key, canvasId, {
            type: "bar",
            data: { labels, datasets },
            options: {
                ...baseOptions({ legend: datasets.length > 1 }),
                indexAxis: horizontal ? "y" : "x"
            }
        });
    }

    function line(key, canvasId, labels, datasets) {
        makeChart(key, canvasId, {
            type: "line",
            data: { labels, datasets },
            options: baseOptions({ legend: true })
        });
    }

    function pintarKpisGlobales() {
        const ops = cache.operaciones || {};
        const fin = cache.finanzas || {};
        setText("kpiEntregado", money(prop(ops, "entregadoImporte", "EntregadoImporte")));
        setText("kpiCobrado", money(prop(fin, "cobradoPeriodo", "CobradoPeriodo") ?? prop(ops, "cobradoPeriodo", "CobradoPeriodo")));
        setText("kpiGanancia", money(prop(ops, "gananciaPeriodo", "GananciaPeriodo")));
        setText("kpiDeuda", money(prop(fin, "saldoCcClientes", "SaldoCcClientes") ?? prop(cache.clientes, "saldoCcTotal", "SaldoCcTotal")));
    }

    function pintarClientes(d) {
        if (!d) return;
        setText("cliTotal", num(prop(d, "total", "Total")));
        setText("cliActivos", num(prop(d, "activos", "Activos")));
        setText("cliSuspendidos", num(prop(d, "suspendidos", "Suspendidos")));
        setText("cliBaja", num(prop(d, "baja", "Baja")));
        setText("cliLicVencer", num(prop(d, "licenciasPorVencer", "LicenciasPorVencer")));
        setText("cliEstab", num(prop(d, "establecimientosTotal", "EstablecimientosTotal")));
        setText("cliConDeuda", num(prop(d, "clientesConDeuda", "ClientesConDeuda")));
        setText("cliAFavor", num(prop(d, "clientesConSaldoAFavor", "ClientesConSaldoAFavor")));
        setText("cliSinEntrega", num(prop(d, "sinEntregaReciente", "SinEntregaReciente")));
        setText("cliSaldoCc", money(prop(d, "saldoCcTotal", "SaldoCcTotal")));

        const estados = prop(d, "porEstado", "PorEstado") || [];
        doughnut("cliEstados", "chartCliEstados",
            estados.map(x => prop(x, "etiqueta", "Etiqueta")),
            estados.map(x => Number(prop(x, "cantidad", "Cantidad") || 0)));

        const gens = prop(d, "porTipoGenerador", "PorTipoGenerador") || [];
        doughnut("cliGen", "chartCliGenerador",
            gens.map(x => prop(x, "etiqueta", "Etiqueta")),
            gens.map(x => Number(prop(x, "cantidad", "Cantidad") || 0)));

        const bajas = prop(d, "bajasPorMes", "BajasPorMes") || [];
        bar("cliBajas", "chartCliBajas",
            bajas.map(x => prop(x, "etiqueta", "Etiqueta")),
            [{
                label: "Bajas",
                data: bajas.map(x => Number(prop(x, "cantidad", "Cantidad") || 0)),
                backgroundColor: "#f87171",
                borderRadius: 6
            }]);

        renderRank("rankCliDeudores", prop(d, "topDeudores", "TopDeudores") || [], x => ({
            name: prop(x, "nombre", "Nombre"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: Number(prop(x, "saldo", "Saldo") || 0),
            valueText: money(prop(x, "saldo", "Saldo"))
        }));

        renderRank("rankCliAFavor", prop(d, "topAFavor", "TopAFavor") || [], x => ({
            name: prop(x, "nombre", "Nombre"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: Math.abs(Number(prop(x, "saldo", "Saldo") || 0)),
            valueText: money(prop(x, "saldo", "Saldo"))
        }));

        renderRank("rankCliLicencias", prop(d, "alertasLicencia", "AlertasLicencia") || [], x => ({
            name: prop(x, "titulo", "Titulo"),
            sub: prop(x, "detalle", "Detalle"),
            value: 1,
            valueText: "!"
        }));

        renderRank("rankCliSinEntrega", prop(d, "sinEntregaRecienteLista", "SinEntregaRecienteLista") || [], x => ({
            name: prop(x, "nombre", "Nombre"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: 1,
            valueText: "—"
        }));

        renderRank("rankCliTopEnt", prop(d, "topPorEntregasPeriodo", "TopPorEntregasPeriodo") || [], x => ({
            name: prop(x, "nombre", "Nombre"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: Number(prop(x, "cantidad", "Cantidad") || 0),
            valueText: num(prop(x, "cantidad", "Cantidad")) + " ent."
        }));

        renderRank("rankCliPartido", prop(d, "porPartido", "PorPartido") || [], x => ({
            name: prop(x, "etiqueta", "Etiqueta"),
            sub: `${prop(x, "cantidadClientes", "CantidadClientes")} clientes`,
            value: Number(prop(x, "cantidadEstablecimientos", "CantidadEstablecimientos") || 0),
            valueText: num(prop(x, "cantidadEstablecimientos", "CantidadEstablecimientos")) + " est."
        }));

        renderRank("rankCliLocalidad", prop(d, "porLocalidad", "PorLocalidad") || [], x => ({
            name: prop(x, "etiqueta", "Etiqueta"),
            sub: `${prop(x, "cantidadClientes", "CantidadClientes")} clientes`,
            value: Number(prop(x, "cantidadEstablecimientos", "CantidadEstablecimientos") || 0),
            valueText: num(prop(x, "cantidadEstablecimientos", "CantidadEstablecimientos")) + " est."
        }));

        renderRank("rankCliEstab", prop(d, "porEstablecimiento", "PorEstablecimiento") || [], x => ({
            name: prop(x, "nombre", "Nombre"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: Number(prop(x, "importeEntregado", "ImporteEntregado") || 0),
            valueText: money(prop(x, "importeEntregado", "ImporteEntregado"))
        }));
    }

    function pintarOperaciones(d) {
        if (!d) return;
        setText("opsEntregas", num(prop(d, "entregasCantidad", "EntregasCantidad")));
        setText("opsUEnt", num(prop(d, "unidadesEntregadas", "UnidadesEntregadas")));
        setText("opsURet", num(prop(d, "unidadesRetiradas", "UnidadesRetiradas")));
        setText("opsRec", num(prop(d, "recuperadoCantidad", "RecuperadoCantidad")));
        setText("opsRatio", num(prop(d, "ratioRecuperadoPct", "RatioRecuperadoPct")) + "%");
        setText("opsTicket", money(prop(d, "ticketPromedio", "TicketPromedio")));
        setText("opsImpEnt", money(prop(d, "entregadoImporte", "EntregadoImporte")));
        setText("opsImpRet", money(prop(d, "retiradoImporte", "RetiradoImporte")));
        setText("opsCosto", money(prop(d, "costoPeriodo", "CostoPeriodo")));
        setText("opsGanancia", money(prop(d, "gananciaPeriodo", "GananciaPeriodo")));

        const serie = prop(d, "serieMensual", "SerieMensual") || [];
        line("opsSerie", "chartOpsSerie",
            serie.map(x => prop(x, "mesNombre", "MesNombre")),
            [
                {
                    label: "Entregado $",
                    data: serie.map(x => Number(prop(x, "entregado", "Entregado") || 0)),
                    borderColor: "#38bdf8",
                    backgroundColor: "rgba(56,189,248,0.15)",
                    tension: 0.3,
                    fill: true
                },
                {
                    label: "Retiros $",
                    data: serie.map(x => Number(prop(x, "retirado", "Retirado") || 0)),
                    borderColor: "#a78bfa",
                    tension: 0.3,
                    fill: false
                },
                {
                    label: "Margen $",
                    data: serie.map(x => Number(prop(x, "ganancia", "Ganancia") || 0)),
                    borderColor: "#2dd4bf",
                    tension: 0.3,
                    fill: false
                }
            ]);

        const mix = prop(d, "mixMovimientos", "MixMovimientos") || [];
        doughnut("opsMix", "chartOpsMix",
            mix.map(x => prop(x, "etiqueta", "Etiqueta")),
            mix.map(x => Number(prop(x, "cantidad", "Cantidad") || 0)));

        const camiones = prop(d, "porCamion", "PorCamion") || [];
        bar("opsCamion", "chartOpsCamion",
            camiones.map(x => prop(x, "etiqueta", "Etiqueta")),
            [{
                label: "Importe",
                data: camiones.map(x => Number(prop(x, "importe", "Importe") || 0)),
                backgroundColor: "#38bdf8",
                borderRadius: 6
            }]);

        renderRank("rankOpsProdEnt", prop(d, "topProductosEntregados", "TopProductosEntregados") || [], x => ({
            name: prop(x, "producto", "Producto"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: Number(prop(x, "cantidad", "Cantidad") || 0),
            valueText: num(prop(x, "cantidad", "Cantidad")) + " u."
        }));

        renderRank("rankOpsProdRet", prop(d, "topProductosRetirados", "TopProductosRetirados") || [], x => ({
            name: prop(x, "producto", "Producto"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: Number(prop(x, "cantidad", "Cantidad") || 0),
            valueText: num(prop(x, "cantidad", "Cantidad")) + " u."
        }));

        renderRank("rankOpsProdRec", prop(d, "topProductosRecuperados", "TopProductosRecuperados") || [], x => ({
            name: prop(x, "producto", "Producto"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: Number(prop(x, "cantidad", "Cantidad") || 0),
            valueText: num(prop(x, "cantidad", "Cantidad")) + " u."
        }));

        renderRank("rankOpsMargen", prop(d, "topProductosPorMargen", "TopProductosPorMargen") || [], x => ({
            name: prop(x, "producto", "Producto"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: Math.abs(Number(prop(x, "ganancia", "Ganancia") || 0)),
            valueText: money(prop(x, "ganancia", "Ganancia"))
        }));

        renderRank("rankOpsClientes", prop(d, "topClientesPorImporte", "TopClientesPorImporte") || [], x => ({
            name: prop(x, "nombre", "Nombre"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: Number(prop(x, "importe", "Importe") || 0),
            valueText: money(prop(x, "importe", "Importe"))
        }));

        renderRank("rankOpsCliRet", prop(d, "topClientesPorRetiros", "TopClientesPorRetiros") || [], x => ({
            name: prop(x, "nombre", "Nombre"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: Number(prop(x, "cantidad", "Cantidad") || 0),
            valueText: num(prop(x, "cantidad", "Cantidad")) + " u."
        }));

        renderRank("rankOpsEstab", prop(d, "porEstablecimiento", "PorEstablecimiento") || [], x => ({
            name: prop(x, "nombre", "Nombre"),
            sub: prop(x, "subtitulo", "Subtitulo") + ` · margen ${money(prop(x, "ganancia", "Ganancia"))}`,
            value: Number(prop(x, "importeEntregado", "ImporteEntregado") || 0),
            valueText: money(prop(x, "importeEntregado", "ImporteEntregado"))
        }));
    }

    function pintarFinanzas(d) {
        if (!d) return;
        setText("finCobrado", money(prop(d, "cobradoPeriodo", "CobradoPeriodo")));
        setText("finGastos", money(prop(d, "gastosPeriodo", "GastosPeriodo")));
        setText("finResultado", money(prop(d, "resultadoPeriodo", "ResultadoPeriodo")));
        setText("finFacturado", money(prop(d, "facturadoEntregas", "FacturadoEntregas")));
        setText("finCantCobros", num(prop(d, "cantidadCobros", "CantidadCobros")));
        setText("finPromCobro", money(prop(d, "promedioCobro", "PromedioCobro")));
        setText("finEfectivo", money(prop(d, "saldoEfectivo", "SaldoEfectivo")));
        setText("finBanco", money(prop(d, "saldoBanco", "SaldoBanco")));
        setText("finDeuda", money(prop(d, "saldoCcClientes", "SaldoCcClientes")));
        setText("finProv", money(prop(d, "saldoCcProveedores", "SaldoCcProveedores")));

        const serie = prop(d, "serieMensual", "SerieMensual") || [];
        line("finSerie", "chartFinSerie",
            serie.map(x => prop(x, "mesNombre", "MesNombre")),
            [
                {
                    label: "Cobrado",
                    data: serie.map(x => Number(prop(x, "cobrado", "Cobrado") || 0)),
                    borderColor: "#34d399",
                    backgroundColor: "rgba(52,211,153,0.12)",
                    tension: 0.3,
                    fill: true
                },
                {
                    label: "Gastos",
                    data: serie.map(x => Number(prop(x, "gastos", "Gastos") || 0)),
                    borderColor: "#f87171",
                    tension: 0.3,
                    fill: false
                }
            ]);

        const formas = prop(d, "cobrosPorForma", "CobrosPorForma") || [];
        doughnut("finForma", "chartFinForma",
            formas.map(x => prop(x, "etiqueta", "Etiqueta")),
            formas.map(x => Number(prop(x, "importe", "Importe") || 0)));

        const cats = prop(d, "gastosPorCategoria", "GastosPorCategoria") || [];
        doughnut("finGastos", "chartFinGastos",
            cats.map(x => prop(x, "etiqueta", "Etiqueta")),
            cats.map(x => Number(prop(x, "importe", "Importe") || 0)));

        renderRank("rankFinGastos", cats, x => ({
            name: prop(x, "etiqueta", "Etiqueta"),
            sub: `${prop(x, "cantidad", "Cantidad") || prop(x, "cantidadMovimientos", "CantidadMovimientos") || 0} movimientos`,
            value: Number(prop(x, "importe", "Importe") || 0),
            valueText: money(prop(x, "importe", "Importe"))
        }));

        const cards = qs("cardsFinMes");
        if (cards) {
            const meses = prop(d, "porMes", "PorMes") || [];
            if (!meses.length) {
                cards.innerHTML = '<div class="ax-rank-empty">No hay datos mensuales</div>';
            } else {
                cards.innerHTML = meses.map(m => {
                    const ok = !!prop(m, "cobroMayorGasto", "CobroMayorGasto");
                    return `<div class="ax-month-card ${ok ? "ok" : "bad"}">
                        <div class="m-title"><span>${prop(m, "periodo", "Periodo")}</span><span>${ok ? "Sí" : "No"}</span></div>
                        <div class="m-row"><span>Cobrado</span><strong>${money(prop(m, "cobrado", "Cobrado"))}</strong></div>
                        <div class="m-row"><span>Gastos</span><strong>${money(prop(m, "gastos", "Gastos"))}</strong></div>
                        <div class="m-row"><span>Resultado</span><strong>${money(prop(m, "resultado", "Resultado"))}</strong></div>
                    </div>`;
                }).join("");
            }
        }

        renderRank("rankFinCobradores", prop(d, "topCobradores", "TopCobradores") || [], x => ({
            name: prop(x, "nombre", "Nombre"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: Number(prop(x, "importe", "Importe") || 0),
            valueText: money(prop(x, "importe", "Importe"))
        }));

        renderRank("rankFinDeudores", prop(d, "topDeudores", "TopDeudores") || [], x => ({
            name: prop(x, "nombre", "Nombre"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: Number(prop(x, "saldo", "Saldo") || 0),
            valueText: money(prop(x, "saldo", "Saldo"))
        }));
    }

    function pintarInventario(d) {
        if (!d) return;
        setText("invProd", num(prop(d, "productosActivos", "ProductosActivos")));
        setText("invBajo", num(prop(d, "productosBajoMinimo", "ProductosBajoMinimo")));
        setText("invVendU", num(prop(d, "stockVendibleUnidades", "StockVendibleUnidades")));
        setText("invRecU", num(prop(d, "stockRecuperadoUnidades", "StockRecuperadoUnidades")));
        setText("invVendVal", money(prop(d, "valorVendible", "ValorVendible")));
        setText("invRecPeriodo", num(prop(d, "recuperadoEnPeriodoUnidades", "RecuperadoEnPeriodoUnidades")));

        const mix = prop(d, "vendibleVsRecuperado", "VendibleVsRecuperado") || [];
        doughnut("invMix", "chartInvMix",
            mix.map(x => prop(x, "etiqueta", "Etiqueta")),
            mix.map(x => Number(prop(x, "cantidad", "Cantidad") || 0)));

        renderRank("rankInvRec", prop(d, "topRecuperadosPeriodo", "TopRecuperadosPeriodo") || [], x => ({
            name: prop(x, "producto", "Producto"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: Number(prop(x, "cantidad", "Cantidad") || 0),
            valueText: num(prop(x, "cantidad", "Cantidad")) + " u."
        }));

        renderRank("rankInvTopVend", prop(d, "topStockVendible", "TopStockVendible") || [], x => ({
            name: prop(x, "producto", "Producto"),
            sub: prop(x, "sucursal", "Sucursal"),
            value: Number(prop(x, "stock", "Stock") || 0),
            valueText: num(prop(x, "stock", "Stock")) + " u."
        }));

        renderRank("rankInvTopRec", prop(d, "topStockRecuperado", "TopStockRecuperado") || [], x => ({
            name: prop(x, "producto", "Producto"),
            sub: prop(x, "sucursal", "Sucursal"),
            value: Number(prop(x, "stock", "Stock") || 0),
            valueText: num(prop(x, "stock", "Stock")) + " u."
        }));

        renderRank("rankInvBajo", prop(d, "bajoMinimo", "BajoMinimo") || [], x => ({
            name: prop(x, "producto", "Producto"),
            sub: `${prop(x, "sucursal", "Sucursal")} · mínimo ${num(prop(x, "stockMinimo", "StockMinimo"))}`,
            value: Number(prop(x, "stock", "Stock") || 0),
            valueText: num(prop(x, "stock", "Stock")) + " u."
        }));

        renderRank("rankInvParado", prop(d, "sinMovimiento", "SinMovimiento") || [], x => ({
            name: prop(x, "producto", "Producto"),
            sub: prop(x, "diasSinMovimiento", "DiasSinMovimiento") < 0
                ? null
                : `${prop(x, "diasSinMovimiento", "DiasSinMovimiento")} días`,
            value: Number(prop(x, "valorInversion", "ValorInversion") || 0),
            valueText: money(prop(x, "valorInversion", "ValorInversion"))
        }));
    }

    function pintarRecorridos(d) {
        if (!d) return;
        setText("recParadas", num(prop(d, "paradasActivas", "ParadasActivas")));
        setText("recCamiones", num(prop(d, "camionesConRuta", "CamionesConRuta")));
        setText("recEnRuta", num(prop(d, "clientesEnRuta", "ClientesEnRuta")));
        setText("recActivos", num(prop(d, "clientesActivosTotal", "ClientesActivosTotal")));
        setText("recCobertura", num(prop(d, "coberturaPct", "CoberturaPct")) + "%");
        setText("recFuera", num(prop(d, "clientesActivosFueraDeRuta", "ClientesActivosFueraDeRuta")));

        const camiones = prop(d, "porCamion", "PorCamion") || [];
        bar("recCamion", "chartRecCamion",
            camiones.map(x => prop(x, "etiqueta", "Etiqueta")),
            [{
                label: "Paradas",
                data: camiones.map(x => Number(prop(x, "cantidad", "Cantidad") || 0)),
                backgroundColor: "#2dd4bf",
                borderRadius: 6
            }]);

        const dias = prop(d, "porDia", "PorDia") || [];
        doughnut("recDia", "chartRecDia",
            dias.map(x => prop(x, "etiqueta", "Etiqueta")),
            dias.map(x => Number(prop(x, "cantidad", "Cantidad") || 0)));

        const semanas = prop(d, "porSemana", "PorSemana") || [];
        doughnut("recSemana", "chartRecSemana",
            semanas.map(x => prop(x, "etiqueta", "Etiqueta")),
            semanas.map(x => Number(prop(x, "cantidad", "Cantidad") || 0)));

        renderRank("rankRecCarga", prop(d, "rankingCargaCamion", "RankingCargaCamion") || [], x => ({
            name: prop(x, "etiqueta", "Etiqueta"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: Number(prop(x, "cantidad", "Cantidad") || 0),
            valueText: num(prop(x, "cantidad", "Cantidad")) + " paradas"
        }));

        renderRank("rankRecFuera", prop(d, "fueraDeRuta", "FueraDeRuta") || [], x => ({
            name: prop(x, "nombre", "Nombre"),
            sub: prop(x, "subtitulo", "Subtitulo"),
            value: 1,
            valueText: "—"
        }));
    }

    async function cargarClientesCatalogo() {
        try {
            const res = await fetch("/Clientes/Lista", { headers: authHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            clientesCatalogo = Array.isArray(data) ? data : (data.data || data.Data || []);
        } catch (_) {
            clientesCatalogo = [];
        }
    }

    async function cargarSucursales() {
        try {
            const res = await fetch("/Sucursales/Lista", { headers: authHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            const sel = qs("fltSucursal");
            if (!sel) return;
            const list = Array.isArray(data) ? data : (data.data || data.Data || []);
            list.forEach(s => {
                const id = prop(s, "id", "Id");
                const nombre = prop(s, "nombre", "Nombre");
                if (id == null) return;
                const opt = document.createElement("option");
                opt.value = id;
                opt.textContent = nombre;
                sel.appendChild(opt);
            });
        } catch (_) { /* ignore */ }
    }

    async function cargarTodo() {
        const btn = qs("btnAplicar");
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Cargando…';
        }
        try {
            const [clientes, operaciones, finanzas, inventario, recorridos] = await Promise.all([
                api("/AnalisisDatos/Clientes"),
                api("/AnalisisDatos/Operaciones"),
                api("/AnalisisDatos/Finanzas"),
                api("/AnalisisDatos/Inventario"),
                api("/AnalisisDatos/Recorridos")
            ]);
            cache = { clientes, operaciones, finanzas, inventario, recorridos };
            pintarKpisGlobales();
            pintarClientes(clientes);
            pintarOperaciones(operaciones);
            pintarFinanzas(finanzas);
            pintarInventario(inventario);
            pintarRecorridos(recorridos);
        } catch (err) {
            console.error(err);
            if (typeof mostrarErrorModal === "function") {
                mostrarErrorModal("No se pudo cargar el análisis de datos.");
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa fa-refresh"></i> Actualizar';
            }
        }
    }

    function initTabs() {
        document.querySelectorAll(".ax-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll(".ax-tab").forEach(t => t.classList.remove("active"));
                document.querySelectorAll(".ax-panel").forEach(p => p.classList.remove("active"));
                tab.classList.add("active");
                const panel = qs(tab.getAttribute("data-tab"));
                if (panel) panel.classList.add("active");
            });
        });
    }

    function initPeriodos() {
        document.querySelectorAll("#axPeriodos .ax-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                document.querySelectorAll("#axPeriodos .ax-chip").forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
                const key = chip.getAttribute("data-periodo");
                aplicarPeriodo(key);
                if (key !== "custom") cargarTodo();
            });
        });
    }

    document.addEventListener("DOMContentLoaded", async () => {
        initTabs();
        initPeriodos();
        initClienteFilter();
        aplicarPeriodo("3m");
        await Promise.all([cargarSucursales(), cargarClientesCatalogo()]);

        qs("btnAplicar")?.addEventListener("click", () => {
            document.querySelectorAll("#axPeriodos .ax-chip").forEach(c => c.classList.remove("active"));
            const custom = document.querySelector('#axPeriodos .ax-chip[data-periodo="custom"]');
            if (custom) custom.classList.add("active");
            periodoActivo = "custom";
            qs("axPeriodoLabel").textContent = "Personalizado";
            cargarTodo();
        });
        qs("fltSucursal")?.addEventListener("change", cargarTodo);
        qs("fltDiasSinMov")?.addEventListener("change", cargarTodo);

        await cargarTodo();
    });
})();
