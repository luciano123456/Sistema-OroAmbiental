/* Panel in-place de stock / productos de ruta / visita mensual (Recorridos). */
const RS_MESES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const RS = {
    recId: 0,
    idCliente: 0,
    idEst: 0,
    nombre: "",
    estNombre: "",
    anio: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    catalogo: [],
    listas: [],
    cuentas: [],
    terceros: [],
    sugeridos: [],
    stock: [],
    productosRuta: [],
    establecimientos: [],
    control: null,
    entregas: [],
    entregaUid: "",
    nextCobroKey: 1,
    preciosCache: {},
    loaded: false
};

function rsEsc(t) {
    return typeof escapeHtml === "function" ? escapeHtml(t) : String(t ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function rsMoney(n) {
    return typeof fmtMoneyRec === "function" ? fmtMoneyRec(n) : (Number(n) || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function rsCant(n) {
    return typeof fmtCantRec === "function" ? fmtCantRec(n) : String(Number(n) || 0);
}

function rsNum(v) {
    return typeof leerNumeroRec === "function" ? leerNumeroRec(v) : (parseFloat(String(v ?? "").replace(/\./g, "").replace(",", ".")) || 0);
}

function rsIso(d) {
    if (!d) return "";
    if (typeof d === "string") {
        const m = d.match(/^(\d{4}-\d{2}-\d{2})/);
        if (m) return m[1];
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return "";
        d = dt;
    }
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
}

function rsPerteneceYm(f, anio, mes) {
    const iso = rsIso(f);
    return !!iso && iso.slice(0, 4) === String(anio) && Number(iso.slice(5, 7)) === Number(mes);
}

function rsLimitesMes(anio, mes) {
    const last = new Date(anio, mes, 0).getDate();
    const pad = String(mes).padStart(2, "0");
    return {
        min: `${anio}-${pad}-01`,
        max: `${anio}-${pad}-${String(last).padStart(2, "0")}`
    };
}

function rsAuthFetch(url, options) {
    return fetchJson(url, options);
}

function rsEntregaActiva() {
    return (RS.entregas || []).find(x => String(x.uid) === String(RS.entregaUid)) || RS.entregas[0] || null;
}

function rsGestionUrl() {
    const id = RS.idCliente;
    const est = RS.idEst || 0;
    return est > 0
        ? `/Clientes/Gestion?id=${id}&est=${est}&tab=stock`
        : `/Clientes/Gestion?id=${id}&tab=pagos`;
}

function rsMountOverlay() {
    const el = document.getElementById("recStockOverlay");
    if (el && el.parentElement !== document.body) {
        document.body.appendChild(el);
    }
    return el;
}

function rsSyncSubtitulo() {
    $("#recStockTitle").text(RS.nombre);
    $("#recStockSub").text(`${RS_MESES[RS.mes]} ${RS.anio}`);
    $("#recStockGestionLink").attr("href", rsGestionUrl());
}

function rsFillEstSelect() {
    const sel = document.getElementById("recStockEst");
    if (!sel) return;
    const opts = [`<option value="">Sin establecimiento</option>`]
        .concat((RS.establecimientos || []).map(e => {
            const id = Number(e.Id) || 0;
            const nom = e.Nombre || e.Etiqueta || `Establecimiento #${id}`;
            return `<option value="${id}">${rsEsc(nom)}</option>`;
        }));
    sel.innerHTML = opts.join("");
    sel.value = RS.idEst > 0 ? String(RS.idEst) : "";
}

async function rsCargarEstablecimientos() {
    RS.establecimientos = [];
    if (!(RS.idCliente > 0)) {
        rsFillEstSelect();
        return;
    }
    try {
        const data = await rsAuthFetch(`/ClientesEstablecimientos/ListaPorCliente?idCliente=${RS.idCliente}`);
        RS.establecimientos = Array.isArray(data) ? data : [];
    } catch (e) {
        console.warn("No se pudieron cargar establecimientos:", e);
        RS.establecimientos = [];
    }
    if (RS.idEst > 0 && !RS.estNombre) {
        const est = RS.establecimientos.find(x => Number(x.Id) === RS.idEst);
        RS.estNombre = est?.Nombre || est?.Etiqueta || "";
    }
    rsFillEstSelect();
}

function rsPatchCardEstablecimiento() {
    if (!(RS.recId > 0) || typeof clientesRecorridoActual === "undefined") return;
    const item = clientesRecorridoActual.find(x => Number(x.Id) === RS.recId);
    if (!item) return;
    item.IdEstablecimiento = RS.idEst > 0 ? RS.idEst : null;
    item.Establecimiento = RS.estNombre || null;

    const $article = $(`#listaClientesRecorrido .rec-cliente-item[data-id="${RS.recId}"]`);
    if (!$article.length) return;
    $article.attr("data-establecimiento", RS.idEst || 0);
    $article.find(".rec-cliente-btn--stock")
        .attr("onclick", `abrirPagosStockRecorrido(${RS.idCliente}, ${RS.idEst || 0}, ${RS.recId})`);

    const $main = $article.find(".rec-cliente-main");
    $main.find(".rec-cliente-est-line").remove();
    if (RS.estNombre) {
        const $chips = $main.find(".rec-cliente-ubicacion");
        const html = `<div class="rec-cliente-est-line"><i class="fa fa-building-o"></i>${rsEsc(RS.estNombre)}</div>`;
        if ($chips.length) $chips.after(html);
        else $main.append(html);
    }

    const collapse = $article.find(".rec-prod-collapse")[0];
    if (collapse) {
        collapse.dataset.filled = "0";
        if (collapse.classList.contains("show") && typeof asegurarCuerpoProductosRec === "function") {
            asegurarCuerpoProductosRec(collapse);
        }
    }
}

async function rsPersistirEstablecimientoRuta(idEst) {
    if (!(RS.recId > 0) || typeof payloadClienteRecorrido !== "function") return true;
    const item = (typeof clientesRecorridoActual !== "undefined" ? clientesRecorridoActual : [])
        .find(x => Number(x.Id) === RS.recId);
    if (!item) return true;

    const payload = payloadClienteRecorrido(item, {
        IdEstablecimiento: idEst > 0 ? idEst : null
    });
    const data = await rsAuthFetch("/Recorridos/ActualizarClienteRecorrido", {
        method: "PUT",
        body: JSON.stringify(payload)
    });
    if (!(data?.valor ?? data?.Valor)) {
        errorModal(data?.mensaje ?? data?.Mensaje ?? "No se pudo asignar el establecimiento.");
        return false;
    }
    return true;
}

async function rsOnEstablecimientoChange() {
    const $sel = $("#recStockEst");
    const idEst = Number($sel.val()) || 0;
    if (idEst === RS.idEst) return;

    const prevId = RS.idEst;
    const prevNom = RS.estNombre;
    const est = (RS.establecimientos || []).find(x => Number(x.Id) === idEst);
    RS.idEst = idEst;
    RS.estNombre = est?.Nombre || est?.Etiqueta || (idEst ? `Establecimiento #${idEst}` : "");
    $sel.prop("disabled", true);

    try {
        const ok = await rsPersistirEstablecimientoRuta(idEst);
        if (!ok) {
            RS.idEst = prevId;
            RS.estNombre = prevNom;
            rsFillEstSelect();
            return;
        }
        (RS.entregas || []).forEach(e => {
            if (e.esNueva || !(Number(e.IdEstablecimiento) > 0)) e.IdEstablecimiento = idEst;
        });
        rsPatchCardEstablecimiento();
        rsSyncSubtitulo();
        await cargarPanelStockRecorrido();
        await rsRefrescarCard();
    } catch (e) {
        console.error(e);
        RS.idEst = prevId;
        RS.estNombre = prevNom;
        rsFillEstSelect();
        errorModal("No se pudo asignar el establecimiento.");
    } finally {
        $("#recStockEst").prop("disabled", false);
    }
}

function abrirPanelStockRecorrido(idCliente, idEstablecimiento, idRecorridoCliente) {
    const id = Number(idCliente) || 0;
    if (!(id > 0)) {
        errorModal("Este cliente no tiene ficha para abrir pagos y stock.");
        return;
    }
    const recId = Number(idRecorridoCliente) || 0;
    const item = (typeof clientesRecorridoActual !== "undefined" ? clientesRecorridoActual : [])
        .find(x => Number(x.Id) === recId || (Number(x.IdCliente) === id && Number(x.IdEstablecimiento || 0) === Number(idEstablecimiento || 0)));

    const now = new Date();
    RS.recId = recId || Number(item?.Id) || 0;
    RS.idCliente = id;
    RS.idEst = Number(idEstablecimiento) || Number(item?.IdEstablecimiento) || 0;
    RS.nombre = item?.Cliente || "Cliente";
    RS.estNombre = item?.Establecimiento || item?.NombreEstablecimiento || "";
    RS.anio = now.getFullYear();
    RS.mes = now.getMonth() + 1;
    RS.loaded = false;

    const el = rsMountOverlay();
    if (!el) {
        window.open(rsGestionUrl(), "_blank");
        return;
    }
    const $ov = $(el);
    rsSyncSubtitulo();
    $("#recStockMes").val(`${RS.anio}-${String(RS.mes).padStart(2, "0")}`);
    rsFillEstSelect();
    $ov.prop("hidden", false);
    document.body.classList.add("rec-stock-open");
    rsCargarEstablecimientos();
    cargarPanelStockRecorrido();
}

function cerrarPanelStockRecorrido() {
    $("#recStockOverlay").prop("hidden", true);
    document.body.classList.remove("rec-stock-open");
}

function rsShowLoading(msg) {
    $("#recStockLoadingMsg").text(msg || "Cargando…");
    $("#recStockLoading").prop("hidden", false);
}

function rsHideLoading() {
    $("#recStockLoading").prop("hidden", true);
}

async function cargarPanelStockRecorrido() {
    rsShowLoading("Cargando stock y visita…");
    try {
        const lim = rsLimitesMes(RS.anio, RS.mes);
        const qsEst = RS.idEst > 0 ? `&idEstablecimiento=${RS.idEst}` : "";
        const [catalogo, listas, cuentas, stock, control, sugeridos, entregasLista] = await Promise.all([
            rsAuthFetch("/Productos/Lista?soloActivos=true").catch(() => []),
            (typeof ensureListasPreciosRec === "function" ? ensureListasPreciosRec() : rsAuthFetch("/ListasPrecios/Lista")).catch(() => []),
            rsAuthFetch("/Cuentas/Lista").catch(() => []),
            rsAuthFetch(`/ClientesOperativo/StockCliente?idCliente=${RS.idCliente}${qsEst}`).catch(() => []),
            rsAuthFetch(`/ClientesOperativo/ControlMensual?idCliente=${RS.idCliente}&anios=${RS.anio}&meses=${RS.mes}${qsEst}`).catch(() => null),
            RS.idEst > 0
                ? rsAuthFetch(`/ClientesOperativo/ProductosSugeridos?idCliente=${RS.idCliente}&idEstablecimiento=${RS.idEst}`).catch(() => [])
                : Promise.resolve([]),
            rsAuthFetch("/ClientesEntregas/ListaFiltrada", {
                method: "POST",
                body: JSON.stringify({
                    FechaDesde: lim.min,
                    FechaHasta: lim.max,
                    IdCliente: RS.idCliente
                })
            }).catch(() => [])
        ]);

        RS.catalogo = Array.isArray(catalogo) ? catalogo : [];
        RS.listas = Array.isArray(listas) ? listas : (typeof listasPreciosRec !== "undefined" ? listasPreciosRec : []);
        RS.cuentas = Array.isArray(cuentas) ? cuentas : [];
        RS.terceros = [];
        if (RS.idEst > 0) {
            try {
                const terc = await rsAuthFetch(`/ClientesEstablecimientosTerceros/ListaPorEstablecimiento?idEstablecimiento=${RS.idEst}&soloActivos=true`);
                RS.terceros = Array.isArray(terc) ? terc : [];
            } catch { RS.terceros = []; }
        }
        RS.stock = Array.isArray(stock) ? stock : [];
        RS.control = (control?.Filas || []).find(f => Number(f.Mes) === RS.mes && Number(f.Anio || RS.anio) === RS.anio) || control?.Filas?.[0] || {};
        RS.sugeridos = Array.isArray(sugeridos) ? sugeridos : [];

        if (RS.idEst > 0) {
            try {
                RS.productosRuta = await rsAuthFetch(`/ClientesEstablecimientosProductos/ListaPorEstablecimiento?idEstablecimiento=${RS.idEst}`) || [];
            } catch {
                RS.productosRuta = [];
            }
        } else {
            RS.productosRuta = [];
        }

        const lista = (Array.isArray(entregasLista) ? entregasLista : []).filter(e => {
            if (!rsPerteneceYm(e.Fecha || e.fecha, RS.anio, RS.mes)) return false;
            if (RS.idEst > 0) {
                const idEst = Number(e.IdEstablecimiento || e.idEstablecimiento) || 0;
                if (idEst && idEst !== RS.idEst) return false;
            }
            return true;
        }).sort((a, b) => {
            const fa = rsIso(a.Fecha);
            const fb = rsIso(b.Fecha);
            if (fa !== fb) return fa < fb ? -1 : 1;
            return (Number(a.Id) || 0) - (Number(b.Id) || 0);
        });

        RS.entregas = [];
        for (const item of lista) {
            const id = Number(item.Id) || 0;
            if (id <= 0) continue;
            let det = null;
            let cobros = [];
            try { det = await rsAuthFetch(`/ClientesEntregas/EditarInfo?id=${id}`); } catch { det = null; }
            try {
                const r = await rsAuthFetch(`/ClientesEntregas/Cobros?id=${id}`);
                cobros = Array.isArray(r?.Cobros) ? r.Cobros : (Array.isArray(r?.cobros) ? r.cobros : []);
            } catch { cobros = []; }
            if (!det) continue;
            RS.entregas.push(rsMapEntrega(det, item, cobros, false));
        }
        if (!RS.entregas.length) RS.entregas.push(rsDraftEntrega());
        RS.entregaUid = RS.entregas[RS.entregas.length - 1].uid;
        RS.loaded = true;
        renderPanelStockRecorrido();
    } catch (e) {
        console.error(e);
        $("#recStockBody").html(`<div class="rec-stock-empty">No se pudo cargar el panel. Probá de nuevo o abrí gestión completa.</div>`);
        errorModal("No se pudo cargar stock y visita de este cliente.");
    } finally {
        rsHideLoading();
    }
}

function rsMapEntrega(det, item, cobros, esNueva) {
    const id = Number(det.Id || item?.Id) || 0;
    return {
        uid: id > 0 ? "e-" + id : rsNuevoUid(),
        Id: id,
        Fecha: rsIso(det.Fecha || item?.Fecha) || rsLimitesMes(RS.anio, RS.mes).max,
        IdEstablecimiento: Number(det.IdEstablecimiento || item?.IdEstablecimiento) || RS.idEst || 0,
        IdContrato: det.IdContrato || null,
        IdEstado: det.IdEstado || null,
        IdCamion: det.IdCamion || null,
        NotaInterna: det.NotaInterna || "",
        NotaCliente: det.NotaCliente || "",
        Lineas: (det.Lineas || []).map(rsMapLinea),
        LineasRecuperadas: det.LineasRecuperadas || [],
        Cobros: (cobros || []).map(rsMapCobro),
        esNueva: !!esNueva
    };
}

function rsMapLinea(l) {
    const cant = Number(l.Cantidad) || 0;
    const noret = !!l.NoRetirado || (Number(l.TipoMovimiento) === 2 && cant < 0);
    return {
        Id: Number(l.Id) || 0,
        IdProducto: Number(l.IdProducto) || 0,
        IdListaPrecio: Number(l.IdListaPrecio) || 0,
        TipoMovimiento: Number(l.TipoMovimiento) || 1,
        NoRetirado: noret,
        NoRetiradoSigno: noret && cant < 0 ? -1 : 1,
        Cantidad: Math.abs(cant) || 0,
        PrecioVenta: Number(l.PrecioVenta) || 0,
        PorcDescuento: Number(l.PorcDescuento) || 0,
        PorcIva: Number(l.PorcIva) || 0
    };
}

function rsMapCobro(c) {
    return {
        _key: RS.nextCobroKey++,
        IdCobro: Number(c.IdCobro || c.idCobro) || 0,
        IdMovimientoCc: Number(c.IdMovimientoCc || c.idMovimientoCc) || 0,
        Fecha: rsIso(c.Fecha || c.fecha),
        IdCuenta: Number(c.IdCuenta || c.idCuenta) || 0,
        EsPagoTercero: rsEsPagoTercero(c),
        IdTercero: Number(c.IdTercero || c.idTercero) || 0,
        Concepto: c.Concepto || c.concepto || "Cobro visita",
        Importe: Number(c.Importe || c.importe) || 0
    };
}

function rsNuevoUid() {
    return "n-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1000);
}

function rsDraftEntrega() {
    const lim = rsLimitesMes(RS.anio, RS.mes);
    let fecha = rsIso(new Date());
    if (!rsPerteneceYm(fecha, RS.anio, RS.mes)) fecha = lim.max;
    return {
        uid: rsNuevoUid(),
        Id: 0,
        Fecha: fecha,
        IdEstablecimiento: RS.idEst || 0,
        IdContrato: null,
        IdEstado: null,
        IdCamion: null,
        NotaInterna: "",
        NotaCliente: "",
        Lineas: [],
        LineasRecuperadas: [],
        Cobros: [],
        esNueva: true
    };
}

function rsOptsProductos(sel) {
    return [`<option value="">Producto</option>`].concat(
        RS.catalogo.map(p => {
            const id = p.Id || p.id;
            const nom = p.Nombre || p.nombre || `Producto #${id}`;
            return `<option value="${id}" ${Number(sel) === Number(id) ? "selected" : ""}>${rsEsc(nom)}</option>`;
        })
    ).join("");
}

function rsOptsListas(sel) {
    return [`<option value="">Lista</option>`].concat(
        (RS.listas || []).map(l => {
            const id = l.Id || l.id;
            return `<option value="${id}" ${Number(sel) === Number(id) ? "selected" : ""}>${rsEsc(l.Nombre || l.nombre)}</option>`;
        })
    ).join("");
}

function rsOptsTerceros(sel) {
    return [`<option value="">Seleccionar pagador</option>`].concat(
        (RS.terceros || []).map(t => {
            const id = t.Id || t.id;
            const extra = [t.Cuit, t.Banco].filter(Boolean).join(" · ");
            const lab = `${t.Nombre || "Pagador"}${extra ? ` (${extra})` : ""}`;
            return `<option value="${id}" ${Number(sel) === Number(id) ? "selected" : ""}>${rsEsc(lab)}</option>`;
        })
    ).join("");
}

function rsEsPagoTercero(c) {
    return c?.EsPagoTercero === true || c?.esPagoTercero === true || Number(c?.IdTercero || c?.idTercero) > 0;
}

function rsOptsOrigen(esTercero) {
    return `<option value="cliente"${esTercero ? "" : " selected"}>Cliente</option>`
        + `<option value="tercero"${esTercero ? " selected" : ""}>Pago de terceros</option>`;
}

function rsOptsCuentas(sel) {
    return [`<option value="">Cuenta</option>`].concat(
        (RS.cuentas || []).map(c => {
            const id = c.Id || c.id;
            return `<option value="${id}" ${Number(sel) === Number(id) ? "selected" : ""}>${rsEsc(c.Nombre || ("Cuenta #" + id))}</option>`;
        })
    ).join("");
}

function rsNombreProd(id) {
    const p = RS.catalogo.find(x => Number(x.Id || x.id) === Number(id));
    return p?.Nombre || p?.nombre || "";
}

function rsSnapshotForm() {
    if (!$("#rsFecha").length) return;
    rsLeerLineasDom();
    rsLeerCobrosDom();
    if (!RS.control) RS.control = {};
    RS.control.AbonoEfectivo = rsNum($("#rsAbonoEf").val());
    RS.control.AbonoTransferencia = rsNum($("#rsAbonoTr").val());
    RS.control.FechaTransferencia = $("#rsFechaTr").val() || null;
    RS.control.CajasAFavor = parseInt($("#rsCajasFav").val(), 10) || 0;
    RS.control.SinEntrega = $("#rsSinEntrega").is(":checked");
    RS.control.Observaciones = ($("#rsObs").val() || "").trim();
    const ent = rsEntregaActiva();
    if (ent) ent.Fecha = $("#rsFecha").val() || ent.Fecha;
}

function renderPanelStockRecorrido() {
    rsSnapshotForm();
    rsSyncSubtitulo();
    rsFillEstSelect();

    const stockHtml = renderRsStock();
    const rutaHtml = renderRsRuta();
    const visitaHtml = renderRsVisita();
    $("#recStockBody").html(stockHtml + rutaHtml + visitaHtml);
    rsBindMiles("#recStockBody");
    rsRefreshTotales();
}

function renderRsStock() {
    const list = (RS.stock || []).filter(x =>
        (Number(x.Entregadas) || 0) !== 0
        || (Number(x.Retiradas) || 0) !== 0
        || (Number(x.NoRetiradas) || 0) !== 0
        || (Number(x.EnPoderCliente) || 0) !== 0);
    const cards = list.length
        ? `<div class="rec-stock-kpis">${list.map(s => {
            const poder = Number(s.EnPoderCliente) || 0;
            const tone = poder > 0 ? "has-stock" : (poder < 0 ? "neg-stock" : "");
            const noRet = Number(s.NoRetiradas) || 0;
            return `<div class="rec-stock-card ${tone}">
                <div class="name">${rsEsc(s.Producto)}</div>
                <div class="nums">
                    <span>Entreg. <strong>${rsCant(s.Entregadas)}</strong></span>
                    <span>Retir. <strong>${rsCant(s.Retiradas)}</strong></span>
                    ${noRet !== 0 ? `<span>No ret. <strong>${rsCant(noRet)}</strong></span>` : ""}
                    <span>En poder <strong>${rsCant(poder)}</strong></span>
                </div>
            </div>`;
        }).join("")}</div>`
        : `<div class="rec-stock-empty">Todavía no hay cajas en poder del cliente este mes.</div>`;

    return `<section class="rec-stock-sec">
        <div class="rec-stock-sec-head">
            <div>
                <h4><i class="fa fa-archive me-1"></i> Stock en poder</h4>
                <small>Se actualiza al guardar la visita</small>
            </div>
        </div>
        ${cards}
    </section>`;
}

function renderRsRuta() {
    if (!(RS.idEst > 0)) {
        return `<section class="rec-stock-sec">
            <div class="rec-stock-sec-head"><h4>Productos de la hoja de ruta</h4></div>
            <div class="rec-stock-empty">Elegí un establecimiento arriba para cargar los productos de la hoja de ruta.</div>
        </section>`;
    }

    const rows = (RS.productosRuta || []).map(p => `
        <div class="rec-stock-row" data-cep-id="${p.Id}" data-id-producto="${p.IdProducto}">
            <div>
                <strong>${rsEsc(p.Producto || "")}</strong>
                <div class="rec-stock-empty">${rsEsc(p.Abreviatura || "")}${p.ListaPrecio ? " · " + rsEsc(p.ListaPrecio) : ""}</div>
            </div>
            <label>Lista<select class="form-control rs-ruta-lista">${rsOptsListas(p.IdListaPrecio)}</select></label>
            <label>Cant.<input type="text" class="form-control Inputmiles rs-ruta-cant" value="${rsCant(p.Cantidad)}" inputmode="decimal"></label>
            <label>Precio<input type="text" class="form-control Inputmiles rs-ruta-precio" value="${rsMoney(p.PrecioVenta)}" inputmode="decimal"></label>
            <button type="button" class="rec-stock-iconbtn" data-rs-del-ruta="${p.Id}" title="Quitar"><i class="fa fa-trash"></i></button>
        </div>`).join("");

    return `<section class="rec-stock-sec" id="rsSecRuta">
        <div class="rec-stock-sec-head">
            <div>
                <h4><i class="fa fa-cube me-1"></i> Productos a entregar (hoja de ruta)</h4>
                <small>Se imprimen en la hoja. Se guardan al editar.</small>
            </div>
            <span class="rec-prod-count">${(RS.productosRuta || []).length}</span>
        </div>
        <div class="rec-stock-add">
            <label>Producto<select class="form-control" id="rsRutaProdNuevo">${rsOptsProductos("")}</select></label>
            <label>Lista<select class="form-control" id="rsRutaListaNueva">${rsOptsListas("")}</select></label>
            <label>Cant.<input type="text" class="form-control Inputmiles" id="rsRutaCantNueva" value="1" inputmode="decimal"></label>
            <label>Precio<input type="text" class="form-control Inputmiles" id="rsRutaPrecioNuevo" value="0,00" inputmode="decimal"></label>
            <button type="button" class="rec-modal-btn rec-modal-btn--ok" id="btnRsAddRuta"><i class="fa fa-plus"></i></button>
        </div>
        <div id="rsRutaList">${rows || `<div class="rec-stock-empty">Todavía no hay productos. Agregá uno arriba o usá los chips de la visita.</div>`}</div>
    </section>`;
}

function renderRsVisita() {
    const ent = rsEntregaActiva() || rsDraftEntrega();
    const m = RS.control || {};
    const visits = RS.entregas.map(e => {
        const label = Number(e.Id) > 0 ? `#${e.Id}` : "Nueva";
        return `<button type="button" class="rec-stock-visit${e.uid === RS.entregaUid ? " is-on" : ""}" data-rs-uid="${rsEsc(e.uid)}">${rsEsc(label)} · ${rsEsc(e.Fecha || "")}</button>`;
    }).join("");

    const chips = (RS.sugeridos || []).map((s, i) => {
        const label = (s.Abreviatura || s.Producto || "").trim();
        return `<span class="rec-stock-chip-pair">
            <button type="button" class="rec-stock-chip" data-rs-sug="${i}" data-tipo="1"><i class="fa fa-plus"></i> ${rsEsc(label)} · Entrega</button>
            <button type="button" class="rec-stock-chip rec-stock-chip--ret" data-rs-sug="${i}" data-tipo="2">Retiro</button>
        </span>`;
    }).join("");

    const fechaVisita = rsIso(m.FechaVisita) || ent.Fecha || rsLimitesMes(RS.anio, RS.mes).max;

    return `<section class="rec-stock-sec" id="rsSecVisita">
        <div class="rec-stock-sec-head">
            <div>
                <h4><i class="fa fa-calendar-check-o me-1"></i> Visita de ${RS_MESES[RS.mes]}</h4>
                <small>Líneas, cobros y control mensual</small>
            </div>
            <button type="button" class="rec-stock-visit" id="btnRsNuevaEntrega"><i class="fa fa-plus"></i> Otra visita</button>
        </div>
        <div class="rec-stock-visits">${visits}</div>
        <div class="rec-rs-ctrl" style="margin-top:0">
            <label>Fecha
                <input type="date" class="form-control" id="rsFecha" value="${rsEsc(ent.Fecha || fechaVisita)}" />
            </label>
        </div>
        <div class="rec-stock-chips" id="rsChips">${chips || `<span class="rec-stock-empty">Sin productos sugeridos del establecimiento.</span>`}</div>
        <div id="rsLineas">${renderRsLineas(ent)}</div>
        <button type="button" class="rec-stock-visit" id="btnRsAddLinea"><i class="fa fa-plus"></i> Línea</button>
        <div class="rec-rs-tot" id="rsTotales"></div>
        <div id="rsCobros">${renderRsCobros(ent)}</div>
        <button type="button" class="rec-stock-visit" id="btnRsAddCobro"><i class="fa fa-plus"></i> Cobro</button>
        <div class="rec-rs-ctrl">
            <label>Abono efectivo
                <input type="text" class="form-control Inputmiles" id="rsAbonoEf" value="${rsMoney(m.AbonoEfectivo)}" inputmode="decimal">
            </label>
            <label>Abono transferencia
                <input type="text" class="form-control Inputmiles" id="rsAbonoTr" value="${rsMoney(m.AbonoTransferencia)}" inputmode="decimal">
            </label>
            <label>Fecha transferencia
                <input type="date" class="form-control" id="rsFechaTr" value="${rsEsc(rsIso(m.FechaTransferencia))}">
            </label>
            <label>Cajas a favor
                <input type="number" class="form-control" id="rsCajasFav" value="${Number(m.CajasAFavor) || 0}">
            </label>
        </div>
        <label class="rec-stock-check">
            <input type="checkbox" id="rsSinEntrega" ${m.SinEntrega ? "checked" : ""}>
            Sin entrega este mes
        </label>
        <label style="margin-top:.7rem">Observaciones
            <textarea class="form-control rec-input" id="rsObs" rows="2" maxlength="500">${rsEsc(m.Observaciones || "")}</textarea>
        </label>
    </section>`;
}

function rsCantEfectiva(l) {
    const mag = Math.abs(Number(l.Cantidad) || 0);
    if (Number(l.TipoMovimiento) === 2 && l.NoRetirado) return mag * (Number(l.NoRetiradoSigno) === -1 ? -1 : 1);
    return mag;
}

function rsSub(l) {
    return rsCantEfectiva(l) * (Number(l.PrecioVenta) || 0);
}

function renderRsLineas(ent) {
    const lineas = ent?.Lineas || [];
    if (!lineas.length) return `<div class="rec-stock-empty">Sin líneas. Usá un chip o agregá una línea.</div>`;
    return lineas.map((l, i) => `
        <div class="rec-rs-line" data-idx="${i}">
            <label>Producto<select class="form-control rs-ln-prod">${rsOptsProductos(l.IdProducto)}</select></label>
            <label>Tipo
                <select class="form-control rs-ln-tipo">
                    <option value="1" ${Number(l.TipoMovimiento) !== 2 ? "selected" : ""}>Entrega</option>
                    <option value="2" ${Number(l.TipoMovimiento) === 2 ? "selected" : ""}>Retiro</option>
                </select>
            </label>
            <label>Lista<select class="form-control rs-ln-lista">${rsOptsListas(l.IdListaPrecio)}</select></label>
            <label>Cant.<input type="text" class="form-control Inputmiles rs-ln-cant" value="${rsCant(l.Cantidad)}" inputmode="decimal"></label>
            <label>Precio<input type="text" class="form-control Inputmiles rs-ln-precio" value="${rsMoney(l.PrecioVenta)}" inputmode="decimal"></label>
            <label class="rec-rs-noret" ${Number(l.TipoMovimiento) === 2 ? "" : "hidden"}>
                <input type="checkbox" class="rs-ln-noret" ${l.NoRetirado ? "checked" : ""}> No ret.
            </label>
            <button type="button" class="rec-stock-iconbtn rs-ln-del" title="Quitar"><i class="fa fa-trash"></i></button>
        </div>`).join("");
}

function renderRsCobros(ent) {
    const cobros = ent?.Cobros || [];
    if (!cobros.length) return `<div class="rec-stock-empty">Sin cobros de esta visita.</div>`;
    return cobros.map(c => {
        const esTerc = rsEsPagoTercero(c);
        return `
        <div class="rec-rs-cobro" data-key="${c._key}">
            <div class="rec-rs-cobro-main">
            <label>Fecha<input type="date" class="form-control rs-cb-fecha" value="${rsEsc(c.Fecha || "")}"></label>
            <label>Cuenta<select class="form-control rs-cb-cuenta">${rsOptsCuentas(c.IdCuenta)}</select></label>
            <div class="rec-rs-origen-field">
                <span>Origen</span>
                <div class="cg-origen-seg" role="group">
                    <button type="button" class="cg-origen-btn${esTerc ? "" : " is-on"}" data-origen="cliente">Cliente</button>
                    <button type="button" class="cg-origen-btn${esTerc ? " is-on" : ""}" data-origen="tercero">Terceros</button>
                </div>
            </div>
            <label>Concepto<input type="text" class="form-control rs-cb-concepto" value="${rsEsc(c.Concepto || "Cobro visita")}"></label>
            <label>Importe<input type="text" class="form-control Inputmiles rs-cb-imp" value="${rsMoney(c.Importe)}" inputmode="decimal"></label>
            <button type="button" class="rec-stock-iconbtn rs-cb-del" title="Quitar"><i class="fa fa-trash"></i></button>
            </div>
            <div class="rec-rs-cobro-pagador"${esTerc ? "" : " hidden"}>
                <span>¿Quién pagó?</span>
                <select class="form-control rs-cb-tercero">${rsOptsTerceros(c.IdTercero)}</select>
            </div>
        </div>`;
    }).join("");
}

function rsBindMiles(scope) {
    $(scope).find(".Inputmiles").each(function () {
        if (typeof formatearMilesInput === "function") formatearMilesInput(this);
    });
}

function rsLeerLineasDom() {
    const ent = rsEntregaActiva();
    if (!ent) return;
    $("#rsLineas .rec-rs-line").each(function () {
        const idx = Number($(this).data("idx"));
        const l = ent.Lineas[idx];
        if (!l) return;
        l.IdProducto = Number($(this).find(".rs-ln-prod").val()) || 0;
        l.IdListaPrecio = Number($(this).find(".rs-ln-lista").val()) || 0;
        l.TipoMovimiento = Number($(this).find(".rs-ln-tipo").val()) || 1;
        l.Cantidad = rsNum($(this).find(".rs-ln-cant").val());
        l.PrecioVenta = rsNum($(this).find(".rs-ln-precio").val());
        l.NoRetirado = l.TipoMovimiento === 2 && $(this).find(".rs-ln-noret").is(":checked");
        if (l.TipoMovimiento !== 2) l.NoRetirado = false;
    });
    ent.Fecha = $("#rsFecha").val() || ent.Fecha;
}

function rsLeerCobrosDom() {
    const ent = rsEntregaActiva();
    if (!ent) return;
    $("#rsCobros .rec-rs-cobro").each(function () {
        const key = Number($(this).data("key"));
        const c = ent.Cobros.find(x => Number(x._key) === key);
        if (!c) return;
        c.Fecha = $(this).find(".rs-cb-fecha").val() || c.Fecha;
        c.IdCuenta = Number($(this).find(".rs-cb-cuenta").val()) || 0;
        c.EsPagoTercero = $(this).find(".cg-origen-btn.is-on").attr("data-origen") === "tercero";
        c.IdTercero = c.EsPagoTercero ? (Number($(this).find(".rs-cb-tercero").val()) || 0) : 0;
        c.Concepto = ($(this).find(".rs-cb-concepto").val() || "").trim() || "Cobro visita";
        c.Importe = rsNum($(this).find(".rs-cb-imp").val());
    });
}

function rsRefreshTotales() {
    rsLeerLineasDom();
    rsLeerCobrosDom();
    const ent = rsEntregaActiva();
    const lineas = (ent?.Lineas || []).filter(l => Number(l.IdProducto) > 0 && Math.abs(Number(l.Cantidad) || 0) > 0);
    const cobros = (ent?.Cobros || []).filter(c => Number(c.Importe) > 0 && Number(c.IdCuenta) > 0);
    const totEnt = lineas.filter(l => Number(l.TipoMovimiento) !== 2).reduce((s, l) => s + rsSub(l), 0);
    const totRet = lineas.filter(l => Number(l.TipoMovimiento) === 2).reduce((s, l) => s + rsSub(l), 0);
    const totPag = cobros.reduce((s, c) => s + Number(c.Importe || 0), 0);
    const saldo = (totEnt + totRet) - totPag;
    $("#rsTotales").html(`
        <div><span>Entregado</span><strong>$ ${rsMoney(totEnt)}</strong></div>
        <div><span>Retirado</span><strong>$ ${rsMoney(totRet)}</strong></div>
        <div><span>Cobrado</span><strong>$ ${rsMoney(totPag)}</strong></div>
        <div><span>Saldo</span><strong>$ ${rsMoney(saldo)}</strong></div>`);
}

async function rsPrecioLista(idProducto, idLista) {
    const idP = Number(idProducto) || 0;
    const idL = Number(idLista) || 0;
    if (!idP || !idL) return null;
    if (!RS.preciosCache[idP]) {
        try {
            RS.preciosCache[idP] = await rsAuthFetch(`/ProductosPrecios/ListaPorProducto?idProducto=${idP}`) || [];
        } catch {
            RS.preciosCache[idP] = [];
        }
    }
    const match = (RS.preciosCache[idP] || []).find(r => Number(r.IdListaPrecio) === idL);
    if (match && Number(match.PrecioVenta) > 0) return Number(match.PrecioVenta);
    const sug = (RS.sugeridos || []).find(s => Number(s.IdProducto) === idP && Number(s.IdListaPrecio) === idL && Number(s.PrecioVenta) > 0);
    return sug ? Number(sug.PrecioVenta) : null;
}

function rsClasificarAbonos(cobros) {
    let efectivo = 0;
    let transferencia = 0;
    (cobros || []).forEach(c => {
        const cuenta = (RS.cuentas || []).find(x => Number(x.Id) === Number(c.IdCuenta));
        const tipo = String(cuenta?.TipoCuenta || cuenta?.Codigo || "Efectivo").toLowerCase();
        const importe = Number(c.Importe) || 0;
        if (tipo.includes("banco") || tipo.includes("transf")) transferencia += importe;
        else efectivo += importe;
    });
    return { efectivo, transferencia };
}

async function rsGuardarVisita() {
    if (!(RS.idCliente > 0)) return;
    rsLeerLineasDom();
    rsLeerCobrosDom();
    const ent = rsEntregaActiva();
    if (!ent) return;

    const lineas = (ent.Lineas || []).filter(l => Number(l.IdProducto) > 0 && Math.abs(Number(l.Cantidad) || 0) > 0);
    const cobros = (ent.Cobros || []).filter(c => Number(c.Importe) > 0 && Number(c.IdCuenta) > 0);
    const hayProductos = lineas.length > 0;
    const idEntrega = Number(ent.Id) || 0;
    const fecha = $("#rsFecha").val() || ent.Fecha;
    const idEst = RS.idEst || ent.IdEstablecimiento || 0;

    if (lineas.some(l => Number(l.TipoMovimiento) === 2 && !l.NoRetirado && !(Number(l.IdListaPrecio) > 0))) {
        errorModal("Seleccioná la lista en las líneas de retiro.");
        return;
    }
    if (hayProductos && !fecha) {
        errorModal("Indicá la fecha de la entrega.");
        return;
    }
    if (hayProductos && !(idEst > 0)) {
        errorModal("Este cliente necesita un establecimiento en la ruta para guardar la entrega.");
        return;
    }
    if (!hayProductos && cobros.length) {
        errorModal("Los cobros de esta visita necesitan al menos un producto.");
        return;
    }
    if (cobros.some(c => c.EsPagoTercero && !(Number(c.IdTercero) > 0))) {
        errorModal("Si el origen es pago de terceros, seleccioná quién pagó. Si pagó el cliente, dejá Origen en Cliente.");
        return;
    }
    if (!hayProductos && idEntrega > 0) {
        errorModal("La entrega tiene que tener al menos un producto.");
        return;
    }

    rsShowLoading("Guardando visita…");
    try {
        if (hayProductos) {
            const payload = {
                Id: idEntrega,
                Fecha: fecha,
                IdCliente: RS.idCliente,
                IdEstablecimiento: idEst,
                IdContrato: ent.IdContrato || null,
                IdEstado: ent.IdEstado || null,
                IdCamion: ent.IdCamion || null,
                NotaInterna: ent.NotaInterna || `Desde recorrido ${RS.mes}/${RS.anio} · est ${idEst}`,
                NotaCliente: ent.NotaCliente || null,
                Lineas: lineas.map(l => ({
                    Id: Number(l.Id) || 0,
                    IdProducto: l.IdProducto,
                    IdListaPrecio: l.IdListaPrecio > 0 ? l.IdListaPrecio : null,
                    TipoMovimiento: l.TipoMovimiento,
                    NoRetirado: Number(l.TipoMovimiento) === 2 && !!l.NoRetirado,
                    Cantidad: rsCantEfectiva(l),
                    PrecioVenta: l.PrecioVenta,
                    CostoUnitario: 0,
                    PorcDescuento: Number(l.PorcDescuento) || 0,
                    PorcIva: Number(l.PorcIva) || 0
                })),
                LineasRecuperadas: (ent.LineasRecuperadas || []).map(l => ({
                    Id: Number(l.Id) || 0,
                    IdProducto: l.IdProducto,
                    IdListaPrecio: l.IdListaPrecio > 0 ? l.IdListaPrecio : null,
                    TipoMovimiento: 3,
                    Cantidad: l.Cantidad,
                    PrecioVenta: l.PrecioVenta,
                    CostoUnitario: l.CostoUnitario || 0,
                    PorcDescuento: l.PorcDescuento || 0,
                    PorcIva: l.PorcIva || 0
                })),
                Cobros: cobros.map(c => ({
                    IdCobro: Number(c.IdCobro) || 0,
                    IdMovimientoCc: Number(c.IdMovimientoCc) || 0,
                    IdCuenta: c.IdCuenta,
                    EsPagoTercero: !!c.EsPagoTercero,
                    IdTercero: c.EsPagoTercero && Number(c.IdTercero) ? Number(c.IdTercero) : null,
                    Fecha: c.Fecha || fecha,
                    Concepto: c.Concepto || "Cobro visita",
                    Importe: c.Importe
                }))
            };
            const url = idEntrega > 0 ? "/ClientesEntregas/Actualizar" : "/ClientesEntregas/Insertar";
            const method = idEntrega > 0 ? "PUT" : "POST";
            const dataEnt = await rsAuthFetch(url, { method, body: JSON.stringify(payload) });
            if (!dataEnt?.valor) {
                errorModal(dataEnt?.mensaje || "No se pudo guardar la entrega.");
                return;
            }
            if (cobros.length) {
                const { efectivo, transferencia } = rsClasificarAbonos(cobros);
                $("#rsAbonoEf").val(rsMoney(efectivo));
                $("#rsAbonoTr").val(rsMoney(transferencia));
                if (transferencia > 0 && !$("#rsFechaTr").val()) $("#rsFechaTr").val(cobros.find(c => c.Fecha)?.Fecha || fecha);
                rsBindMiles("#rsAbonoEf, #rsAbonoTr");
            }
        }

        const modelo = {
            Id: Number(RS.control?.IdControl) || 0,
            IdCliente: RS.idCliente,
            IdEstablecimiento: RS.idEst > 0 ? RS.idEst : null,
            Anio: RS.anio,
            Mes: RS.mes,
            FechaVisita: fecha || null,
            SinEntrega: $("#rsSinEntrega").is(":checked"),
            CajasAFavor: parseInt($("#rsCajasFav").val(), 10) || 0,
            Observaciones: ($("#rsObs").val() || "").trim() || null,
            AbonoEfectivo: rsNum($("#rsAbonoEf").val()),
            AbonoTransferencia: rsNum($("#rsAbonoTr").val()),
            FechaTransferencia: $("#rsFechaTr").val() || null
        };
        const dataCm = await rsAuthFetch("/ClientesOperativo/GuardarControlMensual", {
            method: "POST",
            body: JSON.stringify(modelo)
        });
        if (!dataCm?.valor) {
            errorModal(dataCm?.mensaje || "No se pudo guardar el control mensual.");
            return;
        }

        if (typeof exitoModal === "function") {
            exitoModal(idEntrega > 0 ? "Entrega actualizada." : (hayProductos ? "Entrega registrada." : "Visita guardada."));
        }
        await cargarPanelStockRecorrido();
        await rsRefrescarCard();
    } catch (e) {
        console.error(e);
        errorModal("No se pudo guardar la visita.");
    } finally {
        rsHideLoading();
    }
}

async function rsRefrescarCard() {
    if (!(RS.recId > 0) || typeof clientesRecorridoActual === "undefined") return;
    const cached = clientesRecorridoActual.find(x => Number(x.Id) === RS.recId);
    if (cached && RS.idEst > 0) {
        try {
            const lista = await rsAuthFetch(`/ClientesEstablecimientosProductos/ListaPorEstablecimiento?idEstablecimiento=${RS.idEst}`) || [];
            cached.Productos = lista.map(p => ({
                Id: p.Id,
                IdProducto: p.IdProducto,
                Producto: p.Producto,
                Abreviatura: p.Abreviatura,
                Cantidad: p.Cantidad,
                IdListaPrecio: p.IdListaPrecio,
                ListaPrecio: p.ListaPrecio,
                PrecioVenta: p.PrecioVenta
            }));
            const $article = $(`#listaClientesRecorrido .rec-cliente-item[data-id="${RS.recId}"]`);
            $article.find(".rec-prod-count").text(String(cached.Productos.length));
            $article.find(".rec-prod-resumen").text(typeof resumenProductosRec === "function"
                ? resumenProductosRec(cached.Productos)
                : (cached.Productos.length ? `${cached.Productos.length} productos` : "Sin productos"));
            const collapse = $article.find(".rec-prod-collapse")[0];
            if (collapse) {
                collapse.dataset.filled = "0";
                if (collapse.classList.contains("show") && typeof asegurarCuerpoProductosRec === "function") {
                    asegurarCuerpoProductosRec(collapse);
                }
            }
        } catch (e) {
            console.warn(e);
        }
    }
}

async function rsAgregarRuta() {
    if (!(RS.idEst > 0)) return;
    const idProducto = Number($("#rsRutaProdNuevo").val()) || 0;
    const idLista = Number($("#rsRutaListaNueva").val()) || 0;
    const cantidad = rsNum($("#rsRutaCantNueva").val());
    const precio = rsNum($("#rsRutaPrecioNuevo").val());
    if (!idProducto || !idLista || !(cantidad > 0)) {
        errorModal("Completá producto, lista y cantidad.");
        return;
    }
    try {
        const data = await rsAuthFetch("/ClientesEstablecimientosProductos/Insertar", {
            method: "POST",
            body: JSON.stringify({
                IdEstablecimiento: RS.idEst,
                IdProducto: idProducto,
                Cantidad: cantidad,
                IdListaPrecio: idLista,
                PrecioVenta: precio
            })
        });
        if (!data?.valor) {
            errorModal(data?.mensaje || "No se pudo agregar el producto.");
            return;
        }
        RS.productosRuta = await rsAuthFetch(`/ClientesEstablecimientosProductos/ListaPorEstablecimiento?idEstablecimiento=${RS.idEst}`) || [];
        renderPanelStockRecorrido();
        await rsRefrescarCard();
    } catch (e) {
        console.error(e);
        errorModal("Error al agregar el producto.");
    }
}

async function rsGuardarRutaRow($row) {
    const id = Number($row.data("cep-id")) || 0;
    const idProducto = Number($row.data("id-producto")) || 0;
    if (!id || !idProducto || !(RS.idEst > 0)) return;
    const idLista = Number($row.find(".rs-ruta-lista").val()) || 0;
    const cantidad = rsNum($row.find(".rs-ruta-cant").val());
    const precio = rsNum($row.find(".rs-ruta-precio").val());
    if (!idLista || !(cantidad > 0) || precio < 0) return;
    try {
        const data = await rsAuthFetch("/ClientesEstablecimientosProductos/Actualizar", {
            method: "PUT",
            body: JSON.stringify({
                Id: id,
                IdEstablecimiento: RS.idEst,
                IdProducto: idProducto,
                Cantidad: cantidad,
                IdListaPrecio: idLista,
                PrecioVenta: precio
            })
        });
        if (!data?.valor) {
            errorModal(data?.mensaje || "No se pudo guardar el producto.");
            return;
        }
        const p = RS.productosRuta.find(x => Number(x.Id) === id);
        if (p) {
            p.Cantidad = cantidad;
            p.IdListaPrecio = idLista;
            p.PrecioVenta = precio;
            p.ListaPrecio = (RS.listas || []).find(l => Number(l.Id) === idLista)?.Nombre || p.ListaPrecio;
        }
        await rsRefrescarCard();
    } catch (e) {
        console.error(e);
        errorModal("Error al guardar el producto.");
    }
}

$(document).ready(() => {
    const $ov = $("#recStockOverlay");
    if (!$ov.length) return;

    $ov.on("click", "[data-rs-close]", cerrarPanelStockRecorrido);
    $(document).on("keydown.recStock", e => {
        if (e.key === "Escape" && !$ov.prop("hidden")) cerrarPanelStockRecorrido();
    });

    $("#recStockMes").on("change", async function () {
        const v = String($(this).val() || "");
        const m = v.match(/^(\d{4})-(\d{2})$/);
        if (!m) return;
        RS.anio = Number(m[1]);
        RS.mes = Number(m[2]);
        await cargarPanelStockRecorrido();
    });

    $("#recStockEst").on("change", () => rsOnEstablecimientoChange());

    $("#btnRsGuardarVisita").on("click", busyHandler(rsGuardarVisita, { label: "Guardando..." }));

    $ov.on("click", "#btnRsAddRuta", () => rsAgregarRuta());
    $ov.on("change", "#rsRutaProdNuevo, #rsRutaListaNueva", async function () {
        const idP = Number($("#rsRutaProdNuevo").val()) || 0;
        const idL = Number($("#rsRutaListaNueva").val()) || 0;
        const precio = await rsPrecioLista(idP, idL);
        if (precio != null) {
            $("#rsRutaPrecioNuevo").val(rsMoney(precio));
            rsBindMiles("#rsRutaPrecioNuevo");
        }
    });
    $ov.on("blur", ".rs-ruta-cant, .rs-ruta-precio", function () {
        rsGuardarRutaRow($(this).closest(".rec-stock-row"));
    });
    $ov.on("change", ".rs-ruta-lista", async function () {
        const $row = $(this).closest(".rec-stock-row");
        const precio = await rsPrecioLista($row.data("id-producto"), $(this).val());
        if (precio != null) {
            $row.find(".rs-ruta-precio").val(rsMoney(precio));
            rsBindMiles($row.find(".rs-ruta-precio"));
        }
        rsGuardarRutaRow($row);
    });
    $ov.on("click", "[data-rs-del-ruta]", async function () {
        const id = Number($(this).data("rs-del-ruta")) || 0;
        if (!id) return;
        const ok = typeof confirmarModal === "function"
            ? await confirmarModal("¿Quitar este producto de la hoja de ruta?")
            : window.confirm("¿Quitar este producto?");
        if (!ok) return;
        try {
            const data = await rsAuthFetch(`/ClientesEstablecimientosProductos/Eliminar?id=${id}`, { method: "DELETE" });
            if (!data?.valor) {
                errorModal(data?.mensaje || "No se pudo quitar.");
                return;
            }
            RS.productosRuta = RS.productosRuta.filter(x => Number(x.Id) !== id);
            renderPanelStockRecorrido();
            await rsRefrescarCard();
        } catch (e) {
            errorModal("No se pudo quitar el producto.");
        }
    });

    $ov.on("click", ".rec-stock-visit[data-rs-uid]", function () {
        rsLeerLineasDom();
        rsLeerCobrosDom();
        RS.entregaUid = String($(this).data("rs-uid"));
        renderPanelStockRecorrido();
    });
    $ov.on("click", "#btnRsNuevaEntrega", function () {
        rsLeerLineasDom();
        rsLeerCobrosDom();
        const draft = rsDraftEntrega();
        RS.entregas.push(draft);
        RS.entregaUid = draft.uid;
        renderPanelStockRecorrido();
    });
    $ov.on("click", ".rec-stock-chip[data-rs-sug]", function () {
        const sug = RS.sugeridos[Number($(this).data("rs-sug"))];
        const ent = rsEntregaActiva();
        if (!sug || !ent) return;
        rsLeerLineasDom();
        ent.Lineas.push({
            Id: 0,
            IdProducto: sug.IdProducto,
            IdListaPrecio: sug.IdListaPrecio || 0,
            TipoMovimiento: Number($(this).data("tipo")) === 2 ? 2 : 1,
            NoRetirado: false,
            NoRetiradoSigno: 1,
            Cantidad: sug.Cantidad || 1,
            PrecioVenta: Number(sug.PrecioVenta) || 0,
            PorcDescuento: 0,
            PorcIva: 0
        });
        $("#rsLineas").html(renderRsLineas(ent));
        rsBindMiles("#rsLineas");
        rsRefreshTotales();
    });
    $ov.on("click", "#btnRsAddLinea", function () {
        const ent = rsEntregaActiva();
        if (!ent) return;
        rsLeerLineasDom();
        ent.Lineas.push({
            Id: 0, IdProducto: 0, IdListaPrecio: 0, TipoMovimiento: 1,
            NoRetirado: false, NoRetiradoSigno: 1, Cantidad: 1, PrecioVenta: 0, PorcDescuento: 0, PorcIva: 0
        });
        $("#rsLineas").html(renderRsLineas(ent));
        rsBindMiles("#rsLineas");
    });
    $ov.on("click", ".rs-ln-del", function () {
        const ent = rsEntregaActiva();
        if (!ent) return;
        rsLeerLineasDom();
        const idx = Number($(this).closest(".rec-rs-line").data("idx"));
        ent.Lineas.splice(idx, 1);
        $("#rsLineas").html(renderRsLineas(ent));
        rsBindMiles("#rsLineas");
        rsRefreshTotales();
    });
    $ov.on("change", ".rs-ln-tipo", function () {
        const $row = $(this).closest(".rec-rs-line");
        $row.find(".rec-rs-noret").prop("hidden", Number($(this).val()) !== 2);
        rsRefreshTotales();
    });
    $ov.on("change", ".rs-ln-prod, .rs-ln-lista", async function () {
        const $row = $(this).closest(".rec-rs-line");
        const precio = await rsPrecioLista($row.find(".rs-ln-prod").val(), $row.find(".rs-ln-lista").val());
        if (precio != null) {
            $row.find(".rs-ln-precio").val(rsMoney(precio));
            rsBindMiles($row.find(".rs-ln-precio"));
        }
        rsRefreshTotales();
    });
    $ov.on("input change", ".rs-ln-cant, .rs-ln-precio, .rs-ln-noret, .rs-cb-imp, .rs-cb-cuenta", rsRefreshTotales);
    $ov.on("click", ".cg-origen-btn", function (e) {
        e.preventDefault();
        const $row = $(this).closest(".rec-rs-cobro");
        const es = $(this).attr("data-origen") === "tercero";
        $row.find(".cg-origen-btn").removeClass("is-on");
        $(this).addClass("is-on");
        $row.find(".rec-rs-cobro-pagador").prop("hidden", !es);
        if (!es) $row.find(".rs-cb-tercero").val("");
        rsLeerCobrosDom();
    });

    $ov.on("click", "#btnRsAddCobro", function () {
        const ent = rsEntregaActiva();
        if (!ent) return;
        rsLeerCobrosDom();
        ent.Cobros.push({
            _key: RS.nextCobroKey++,
            IdCobro: 0,
            IdMovimientoCc: 0,
            Fecha: $("#rsFecha").val() || rsIso(new Date()),
            IdCuenta: 0,
            EsPagoTercero: false,
            IdTercero: 0,
            Concepto: "Cobro visita",
            Importe: 0
        });
        $("#rsCobros").html(renderRsCobros(ent));
        rsBindMiles("#rsCobros");
    });
    $ov.on("click", ".rs-cb-del", function () {
        const ent = rsEntregaActiva();
        if (!ent) return;
        rsLeerCobrosDom();
        const key = Number($(this).closest(".rec-rs-cobro").data("key"));
        ent.Cobros = ent.Cobros.filter(c => Number(c._key) !== key);
        $("#rsCobros").html(renderRsCobros(ent));
        rsBindMiles("#rsCobros");
        rsRefreshTotales();
    });
});

window.abrirPanelStockRecorrido = abrirPanelStockRecorrido;
window.cerrarPanelStockRecorrido = cerrarPanelStockRecorrido;
