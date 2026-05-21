/* =========================================================
   CURRENCY WIDGET GLOBAL PRO — COMPLETO Y ESTABLE
   - token es GLOBAL (NO se declara acá)
   - Pins por usuario (localStorage)
   - Máx 3 monedas
   - Drag individual por moneda (hold corto y fluido)
   - Posición libre guardada por moneda
   - Snap inteligente a bordes / esquinas
   - Evita superposición entre monedas
   - Tamaño configurable por usuario
   - Límites viewport
   - No pisa navbar
   - Auto-refresh configurable
   - Chequea cada 1 minuto
   - Actualiza SOLO si corresponde
   - 1 sola llamada backend: /PaisesMoneda/ActualizarMasivo
   - ARS no se actualiza
   - Efecto up/down solo si cambia
========================================================= */

/* ==============================
   KEYS / STATE
============================== */

const userId = localStorage.getItem("userId") || "default";
const CW_POSITION_KEY = "currencyWidget_position_" + userId; // legacy / compat

const CW_KEYS = {
    PINS: "currencyWidget_" + userId,
    UPDATES: "currencyLastUpdate_" + userId,
    REFRESH_MIN: "currencyRefreshConfig_" + userId,
    MANUAL_SYNC: "currencyWidget_sync_" + userId,
    NEXT_UPDATE: "currencyNextUpdate_" + userId,
    SCALE: "currencyWidget_scale_" + userId
};

const CW_DEFAULT_REFRESH_MIN = 6;
const CW_CHECK_EVERY_MS = 60 * 1000;

let monedasGlobal = [];
let monedasPin = [];
let ultimaActualizacion = {};
let autoCheckTimer = null;
let countdownTimer = null;
let isUpdatingNow = false;
let isUpdatingCurrencies = false;
let nextUpdateTimestamp = 0;

const widgetDomIndex = {};
let monedasIndex = {};

/* ==============================
   DRAG / LAYOUT STATE
============================== */

const CW_PILL_HOLD_MS = 350;
const CW_PILL_MOVE_TOLERANCE = 1;
const CW_NAVBAR_FALLBACK_HEIGHT = 60;
const CW_PILL_GAP_Y = 12;
const CW_PILL_DEFAULT_LEFT = 20;
const CW_PILL_DEFAULT_TOP = 75;
const CW_VIEWPORT_PADDING = 8;
const CW_SMART_GAP = 12;
const CW_SNAP_THRESHOLD = 18;
const CW_MIN_SCALE = 0.8;
const CW_MAX_SCALE = 1.35;
const CW_SCALE_STEP = 0.05;
const CW_DEFAULT_SCALE = 0.92;

/* ==============================
   POSICIONES INDIVIDUALES
============================== */

function getPillPositionKey(id) {
    return `currencyWidget_pill_position_${userId}_${id}`;
}

function guardarPosicionMoneda(id, left, top) {
    localStorage.setItem(
        getPillPositionKey(id),
        JSON.stringify({
            left: Number(left) || 0,
            top: Number(top) || 0
        })
    );
}

function obtenerPosicionMoneda(id) {
    try {
        const raw = localStorage.getItem(getPillPositionKey(id));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function eliminarPosicionMoneda(id) {
    localStorage.removeItem(getPillPositionKey(id));
}

function resetearPosicionesMonedas() {
    for (const id of monedasPin) {
        eliminarPosicionMoneda(id);
    }

    localStorage.removeItem(CW_POSITION_KEY);
    renderWidget();
}

/* ==============================
   ESCALA / TAMAÑO
============================== */

function obtenerEscalaWidget() {
    const raw = localStorage.getItem(CW_KEYS.SCALE);
    const n = Number(raw);
    if (!Number.isFinite(n)) return CW_DEFAULT_SCALE;
    return clamp(round2(n), CW_MIN_SCALE, CW_MAX_SCALE);
}

function guardarEscalaWidget(scale) {
    localStorage.setItem(CW_KEYS.SCALE, String(clamp(round2(scale), CW_MIN_SCALE, CW_MAX_SCALE)));
}

function setScaleWidget(scale) {
    guardarEscalaWidget(scale);
    aplicarEscalaTodasLasPills();
    asegurarTodasLasPillsDentroPantalla();
    actualizarPanelEscala();
}

function incrementarEscalaWidget(delta) {
    setScaleWidget(obtenerEscalaWidget() + delta);
}

function resetearEscalaWidget() {
    setScaleWidget(CW_DEFAULT_SCALE);
}

function aplicarEscalaPill(pill) {
    if (!pill) return;
    const scale = obtenerEscalaWidget();
    pill.style.setProperty("--cw-scale", String(scale));
}

function aplicarEscalaTodasLasPills() {
    Object.values(widgetDomIndex).forEach(pill => aplicarEscalaPill(pill));
}

window.CurrencyWidgetScaleUp = function () {
    incrementarEscalaWidget(CW_SCALE_STEP);
};

window.CurrencyWidgetScaleDown = function () {
    incrementarEscalaWidget(-CW_SCALE_STEP);
};

window.CurrencyWidgetScaleReset = function () {
    resetearEscalaWidget();
};

/* ==============================
   PUBLIC API
============================== */

window.CurrencyWidget = {
    setRefreshMinutes: async (minutos) => {
        guardarRefreshConfig(minutos);

        nextUpdateTimestamp = Date.now();
        localStorage.setItem(CW_KEYS.NEXT_UPDATE, String(nextUpdateTimestamp));

        actualizarCountdownTexto();
        renderRefreshState();

        await verificarSiDebeActualizar();
    },

    refreshFromServer: async () => {
        await cargarMonedasGlobal();
        renderWidget();
    },

    setMonedas: (lista) => {
        if (Array.isArray(lista)) {
            monedasGlobal = lista;
            rebuildMonedasIndex();
            limpiarPinsInexistentes();
            renderWidget();
        }
    },

    notifyMonedaUpdate: (id, nuevaCotizacion, timestampMs) => {
        const moneda = monedasGlobal.find(x => Number(x.Id) === Number(id));
        if (!moneda) return;

        const prev = toMoneyNumber(moneda.Cotizacion);
        const next = toMoneyNumber(nuevaCotizacion);

        moneda.Cotizacion = next;
        guardarUltimaActualizacion(Number(id), timestampMs || Date.now());
        renderWidget();

        if (!sameMoney(prev, next)) {
            aplicarEfectoCambio(Number(id), prev, next);
        }
    },

    getPinnedIds: () => [...monedasPin],
    render: () => renderWidget(),
    resetPosition: () => resetearPosicionesMonedas(),
    setScale: (scale) => setScaleWidget(scale),
    getScale: () => obtenerEscalaWidget(),
    scaleUp: () => incrementarEscalaWidget(CW_SCALE_STEP),
    scaleDown: () => incrementarEscalaWidget(-CW_SCALE_STEP),
    resetScale: () => resetearEscalaWidget()
};

/* ==============================
   INIT
============================== */

document.addEventListener("DOMContentLoaded", async () => {

    nextUpdateTimestamp = obtenerProximoUpdate() || 0;

    cargarPins();

    await cargarMonedasGlobal();
    limpiarPinsInexistentes();
    cargarUltimasActualizaciones();

    renderWidget();

    bindRefreshUI();

    await verificarSiDebeActualizar();
    iniciarAutoCheck();
    iniciarCountdown();

    window.addEventListener("resize", () => {
        asegurarTodasLasPillsDentroPantalla();
    });
});

/* ==============================
   COMPAT / LEGACY POSITION
============================== */

function aplicarPosicionGuardada() {
    return;
}

function guardarPosicionWidget() {
    return;
}

function resetearPosicionWidget() {
    resetearPosicionesMonedas();
}

function asegurarPosicionDentroPantalla(cont) {
    if (!cont) return;
}

function activarMovimientoWidget() {
    return;
}

function onWidgetMouseDown() {
    return;
}

function onWidgetMouseMove() {
    return;
}

function onWidgetMouseUp() {
    return;
}

function cancelarHoldWidget() {
    return;
}

/* ==============================
   CONFIG REFRESH MINUTES
============================== */

function obtenerRefreshConfig() {
    const val = localStorage.getItem(CW_KEYS.REFRESH_MIN);
    const n = parseInt(val, 10);
    return Number.isFinite(n) && n > 0 ? n : CW_DEFAULT_REFRESH_MIN;
}

function guardarRefreshConfig(minutos) {
    const n = parseInt(minutos, 10);
    const safe = Number.isFinite(n) && n > 0 ? n : CW_DEFAULT_REFRESH_MIN;
    localStorage.setItem(CW_KEYS.REFRESH_MIN, String(safe));
    renderWidget();
}

/* ==============================
   FETCH MONEDAS
============================== */

async function cargarMonedasGlobal() {
    try {
        const resp = await fetch("/PaisesMoneda/Lista", {
            headers: { "Authorization": "Bearer " + token }
        });

        if (!resp.ok) return;

        const data = await resp.json();

        if (Array.isArray(data)) {
            monedasGlobal = data;
            rebuildMonedasIndex();
            limpiarPinsInexistentes();
        }
    } catch (e) {
        console.warn("CurrencyWidget cargarMonedasGlobal", e);
    }
}

function rebuildMonedasIndex() {
    monedasIndex = {};
    for (const m of monedasGlobal) {
        monedasIndex[Number(m.Id)] = m;
    }
}

function limpiarPinsInexistentes() {
    if (!Array.isArray(monedasPin) || !monedasPin.length) return;

    const idsValidos = new Set(monedasGlobal.map(m => Number(m.Id)));
    const cantidadAntes = monedasPin.length;

    const eliminados = monedasPin.filter(id => !idsValidos.has(Number(id)));

    monedasPin = monedasPin.filter(id => idsValidos.has(Number(id)));

    if (monedasPin.length !== cantidadAntes) {
        guardarPins();

        for (const id of eliminados) {
            eliminarPosicionMoneda(id);
        }

        Object.keys(ultimaActualizacion).forEach(id => {
            if (!idsValidos.has(Number(id))) {
                delete ultimaActualizacion[id];
            }
        });

        localStorage.setItem(CW_KEYS.UPDATES, JSON.stringify(ultimaActualizacion));
    }
}

/* ==============================
   LOCAL STORAGE
============================== */

function cargarPins() {
    try {
        const data = localStorage.getItem(CW_KEYS.PINS);
        const arr = data ? JSON.parse(data) : [];
        monedasPin = Array.isArray(arr) ? arr.map(x => Number(x)).filter(Boolean) : [];
    } catch {
        monedasPin = [];
    }
}

function guardarPins() {
    localStorage.setItem(CW_KEYS.PINS, JSON.stringify(monedasPin));
}

function cargarUltimasActualizaciones() {
    try {
        const data = localStorage.getItem(CW_KEYS.UPDATES);
        const obj = data ? JSON.parse(data) : {};
        ultimaActualizacion = obj && typeof obj === "object" ? obj : {};

        for (const id of monedasPin) {
            if (!ultimaActualizacion[id]) {
                ultimaActualizacion[id] = Date.now();
            }
        }

        localStorage.setItem(CW_KEYS.UPDATES, JSON.stringify(ultimaActualizacion));
    } catch {
        ultimaActualizacion = {};
    }
}

function guardarUltimaActualizacion(id, whenMs) {
    ultimaActualizacion[id] = whenMs || Date.now();
    localStorage.setItem(CW_KEYS.UPDATES, JSON.stringify(ultimaActualizacion));
}

/* ==============================
   PIN
============================== */

function togglePin(id) {
    id = Number(id);

    if (monedasPin.includes(id)) {
        monedasPin = monedasPin.filter(x => x !== id);
        eliminarPosicionMoneda(id);
    } else {
        if (monedasPin.length >= 3) {
            advertenciaModal("Máximo 3 monedas");
            return;
        }
        monedasPin.push(id);
    }

    guardarPins();

    if (typeof listarMonedas === "function") {
        try { listarMonedas(); } catch { }
    }

    renderWidget();
}

window.togglePin = togglePin;

/* ==============================
   AUTO CHECK
============================== */

function iniciarAutoCheck() {
    if (autoCheckTimer) clearInterval(autoCheckTimer);

    autoCheckTimer = setInterval(async () => {
        await verificarSiDebeActualizar();
    }, CW_CHECK_EVERY_MS);
}

/* ==============================
   DECIDE SI ACTUALIZAR
============================== */

async function verificarSiDebeActualizar() {
    if (isUpdatingNow) return;
    if (!monedasPin.length) return;

    if (!nextUpdateTimestamp) {
        nextUpdateTimestamp = obtenerProximoUpdate();
    }

    if (Date.now() < nextUpdateTimestamp) return;

    const ids = monedasPin.filter(id => {
        const m = monedasIndex[id];
        return m && !String(m.Nombre || "").toUpperCase().includes("ARS");
    });

    if (!ids.length) return;

    await actualizarMasivo(ids);
}

/* ==============================
   UPDATE MASIVO
============================== */

async function actualizarMasivo(ids) {
    if (isUpdatingNow) return;
    if (!Array.isArray(ids) || ids.length === 0) return;

    isUpdatingNow = true;
    isUpdatingCurrencies = true;
    renderRefreshState();

    const start = performance.now();

    try {
        const batchController = new AbortController();
        const batchTimeoutMs = 3000;
        const batchTimer = setTimeout(() => batchController.abort(), batchTimeoutMs);

        const tasks = ids.map(async (id) => {
            const m = monedasIndex[id];
            if (!m) return null;

            const url = getExternalUrlByNombre(m.Nombre);
            if (!url) return null;

            const next = await fetchExternalRate(url);
            if (next == null) return null;

            if (batchController.signal.aborted) return null;

            return { id: Number(m.Id), next: round2(next) };
        });

        let results = [];
        try {
            results = await Promise.allSettled(tasks);
        } catch {
            results = [];
        } finally {
            clearTimeout(batchTimer);
        }

        const updates = [];
        const changes = [];

        for (const r of results) {
            if (r.status !== "fulfilled" || !r.value) continue;

            const { id, next } = r.value;
            const m = monedasGlobal.find(x => Number(x.Id) === id);
            if (!m) continue;

            const prev = round2(toMoneyNumber(m.Cotizacion));

            if (sameMoney(prev, next)) {
                guardarUltimaActualizacion(id, Date.now());
                continue;
            }

            updates.push({ Id: id, Cotizacion: next });
            changes.push({ id, prev, next });
        }

        if (updates.length) {
            await putActualizarMasivo(updates);

            const now = Date.now();
            for (const u of updates) {
                const m = monedasGlobal.find(x => Number(x.Id) === u.Id);
                if (m) m.Cotizacion = u.Cotizacion;
                guardarUltimaActualizacion(u.Id, now);
            }

            renderWidget();

            window.dispatchEvent(new CustomEvent("cw:monedasActualizadas", {
                detail: { cambios: changes }
            }));

            for (const c of changes) {
                aplicarEfectoCambio(c.id, c.prev, c.next);
            }
        } else {
            renderWidget();
        }

    } catch (e) {
        console.warn("CurrencyWidget actualizarMasivo", e);
    } finally {
        isUpdatingNow = false;
        isUpdatingCurrencies = false;

        guardarProximoUpdate();
        renderRefreshState();

        const ms = Math.round(performance.now() - start);
        console.log("CurrencyWidget actualizarMasivo total ms:", ms);
    }
}

function guardarProximoUpdate() {
    const refreshMin = obtenerRefreshConfig();
    nextUpdateTimestamp = Date.now() + (refreshMin * 60000);
    localStorage.setItem(CW_KEYS.NEXT_UPDATE, String(nextUpdateTimestamp));
}

function obtenerProximoUpdate() {
    const v = localStorage.getItem(CW_KEYS.NEXT_UPDATE);
    return v ? Number(v) : 0;
}

function renderRefreshState() {
    const el = document.getElementById("refreshCountdown");
    if (!el) return;

    if (isUpdatingCurrencies) {
        el.innerHTML = `
            <div class="refresh-loading">
                <div class="refresh-bar"></div>
                <span>Actualizando cotizaciones...</span>
            </div>
        `;
        return;
    }

    actualizarCountdownTexto();

    document.querySelector(".refresh-premium")
        ?.classList.toggle("updating", isUpdatingCurrencies);
}

async function putActualizarMasivo(lista) {
    const controller = new AbortController();
    const timeoutMs = 2500;
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const resp = await fetch("/PaisesMoneda/ActualizarMasivo", {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(lista),
            signal: controller.signal
        });

        if (!resp.ok) return false;

        const json = await resp.json();
        return !!json?.valor;
    } catch {
        return false;
    } finally {
        clearTimeout(t);
    }
}

/* ==============================
   FETCH EXTERNAL API
============================== */

function getExternalUrlByNombre(nombre) {
    const n = String(nombre || "").toUpperCase().trim();

    if (n.includes("DOLAR") || n.includes("US$")) return "https://dolarapi.com/v1/dolares/blue";
    if (n.includes("REAL")) return "https://dolarapi.com/v1/cotizaciones/brl";
    if (n.includes("UY")) return "https://dolarapi.com/v1/cotizaciones/uyu";
    if (n.includes("ARS")) return null;

    return null;
}

async function fetchExternalRate(url) {
    const controller = new AbortController();
    const timeoutMs = 1800;
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const resp = await fetch(url, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal
        });

        if (!resp.ok) return null;

        const data = await resp.json();

        const raw =
            data?.venta ??
            data?.price ??
            data?.rate ??
            data?.value ??
            null;

        if (raw == null) return null;

        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    } catch {
        return null;
    } finally {
        clearTimeout(t);
    }
}

/* ==============================
   RENDER WIDGET
============================== */

function renderWidget() {
    const cont = document.getElementById("currencyWidget");
    if (!cont) return;

    cont.innerHTML = "";

    Object.keys(widgetDomIndex).forEach(id => {
        if (!monedasPin.includes(Number(id))) {
            const pill = widgetDomIndex[id];
            if (pill && pill.parentNode) {
                pill.parentNode.removeChild(pill);
            }
            delete widgetDomIndex[id];
        }
    });

    let defaultIndex = 0;

    for (const id of monedasPin) {
        const m = monedasGlobal.find(x => Number(x.Id) === Number(id));
        if (!m) continue;

        let pill = widgetDomIndex[id];

        if (!pill) {
            pill = document.createElement("div");
            pill.className = "currency-pill";
            pill.dataset.id = id;
            pill.setAttribute("role", "button");
            pill.setAttribute("tabindex", "0");

            document.body.appendChild(pill);
            widgetDomIndex[id] = pill;

            activarDragSingle(pill);
            activarDragMoneda(pill, id);
        }

        actualizarContenidoPill(pill, m);
        aplicarEscalaPill(pill);
        asegurarPosicionInicialPill(pill, id, defaultIndex);

        defaultIndex++;
    }

    asegurarTodasLasPillsDentroPantalla();
}

function activarDragSingle(pill) {
    pill.addEventListener("dragstart", (e) => {
        e.preventDefault();
    });

    pill.addEventListener("dragover", (e) => e.preventDefault());

    pill.addEventListener("drop", (e) => {
        e.preventDefault();
    });
}

function reorderPins(draggedId, targetId) {
    draggedId = Number(draggedId);
    targetId = Number(targetId);

    const fromIndex = monedasPin.indexOf(draggedId);
    const toIndex = monedasPin.indexOf(targetId);

    if (fromIndex === -1 || toIndex === -1) return;

    monedasPin.splice(fromIndex, 1);
    monedasPin.splice(toIndex, 0, draggedId);

    guardarPins();
    renderWidget();
}

function actualizarContenidoPill(pill, m) {
    if (!pill._cw) {
        pill.innerHTML = `
            <div class="currency-pill-inner">
                <div class="currency-badge-wrap">
                    <div class="currency-badge"></div>
                </div>
                <div class="currency-content">
                    <span class="currency-name"></span>
                    <span class="currency-value"></span>
                    <span class="currency-updated"></span>
                </div>

                <div class="currency-pill-actions">
                    <button type="button" class="currency-pill-scale-down" title="Achicar" aria-label="Achicar">−</button>
                    <button type="button" class="currency-pill-scale-up" title="Agrandar" aria-label="Agrandar">+</button>
                </div>
            </div>
        `;

        pill._cw = {
            badge: pill.querySelector(".currency-badge"),
            name: pill.querySelector(".currency-name"),
            value: pill.querySelector(".currency-value"),
            updated: pill.querySelector(".currency-updated"),
            reset: pill.querySelector(".currency-pill-reset"),
            scaleUp: pill.querySelector(".currency-pill-scale-up"),
            scaleDown: pill.querySelector(".currency-pill-scale-down"),
            scaleReset: pill.querySelector(".currency-pill-scale-reset")
        };


        pill._cw.scaleUp.addEventListener("click", (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            incrementarEscalaWidget(CW_SCALE_STEP);
        });

        pill._cw.scaleDown.addEventListener("click", (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            incrementarEscalaWidget(-CW_SCALE_STEP);
        });

 

        pill.addEventListener("dblclick", (ev) => {
            ev.preventDefault();
            eliminarPosicionMoneda(Number(pill.dataset.id));
            renderWidget();
        });
    }

    const nombre = String(m.Nombre || "");
    pill._cw.badge.textContent = nombre.substring(0, 2).toUpperCase();
    pill._cw.name.textContent = nombre;
    pill._cw.value.textContent = format2(m.Cotizacion);
    pill._cw.updated.textContent = obtenerTextoActualizacion(m.Id);

    actualizarPanelEscalaPill(pill);
}

function actualizarPanelEscala() {
    Object.values(widgetDomIndex).forEach(pill => actualizarPanelEscalaPill(pill));
}

function actualizarPanelEscalaPill(pill) {
    if (!pill?._cw) return;
    const scale = obtenerEscalaWidget();
    pill.dataset.scale = String(scale);
   
}

/* ==============================
   POSICION / DRAG PILL
============================== */

function getNavbarHeight() {
    const navbar = document.querySelector(".navbar");
    return navbar ? Math.ceil(navbar.getBoundingClientRect().height) : CW_NAVBAR_FALLBACK_HEIGHT;
}

function getScaledOuterSize(pill) {
    const scale = obtenerEscalaWidget();
    const rect = pill.getBoundingClientRect();
    const width = rect.width || (pill.offsetWidth * scale) || 180;
    const height = rect.height || (pill.offsetHeight * scale) || 68;
    return { width, height };
}

function getViewportBoundsForPill(pill) {
    const navbarHeight = getNavbarHeight();
    const { width, height } = getScaledOuterSize(pill);

    return {
        minLeft: CW_VIEWPORT_PADDING,
        minTop: navbarHeight + CW_VIEWPORT_PADDING,
        maxLeft: Math.max(CW_VIEWPORT_PADDING, window.innerWidth - width - CW_VIEWPORT_PADDING),
        maxTop: Math.max(navbarHeight + CW_VIEWPORT_PADDING, window.innerHeight - height - CW_VIEWPORT_PADDING)
    };
}

function asegurarPosicionPillDentroPantalla(pill) {
    if (!pill) return;

    const bounds = getViewportBoundsForPill(pill);

    let left = parseInt(pill.style.left || `${CW_PILL_DEFAULT_LEFT}`, 10);
    let top = parseInt(pill.style.top || `${CW_PILL_DEFAULT_TOP}`, 10);

    if (!Number.isFinite(left)) left = CW_PILL_DEFAULT_LEFT;
    if (!Number.isFinite(top)) top = CW_PILL_DEFAULT_TOP;

    left = clamp(left, bounds.minLeft, bounds.maxLeft);
    top = clamp(top, bounds.minTop, bounds.maxTop);

    pill.style.left = `${left}px`;
    pill.style.top = `${top}px`;
}

function asegurarTodasLasPillsDentroPantalla() {
    const ids = Object.keys(widgetDomIndex).map(Number).filter(Number.isFinite);

    for (const id of ids) {
        const pill = widgetDomIndex[id];
        if (!pill) continue;

        asegurarPosicionPillDentroPantalla(pill);

        const snapped = obtenerPosicionSinSuperposicion(
            id,
            parseInt(pill.style.left || "0", 10),
            parseInt(pill.style.top || "0", 10),
            false
        );

        pill.style.left = `${snapped.left}px`;
        pill.style.top = `${snapped.top}px`;

        guardarPosicionMoneda(
            id,
            parseInt(pill.style.left || "0", 10),
            parseInt(pill.style.top || "0", 10)
        );
    }
}

function asegurarPosicionInicialPill(pill, id, defaultIndex) {
    const saved = obtenerPosicionMoneda(id);

    if (saved && Number.isFinite(Number(saved.left)) && Number.isFinite(Number(saved.top))) {
        pill.style.left = `${Number(saved.left)}px`;
        pill.style.top = `${Number(saved.top)}px`;
    } else {
        const initial = obtenerPosicionDefaultInteligente(id, defaultIndex, pill);
        pill.style.left = `${initial.left}px`;
        pill.style.top = `${initial.top}px`;
    }

    asegurarPosicionPillDentroPantalla(pill);

    const snapped = obtenerPosicionSinSuperposicion(
        id,
        parseInt(pill.style.left || "0", 10),
        parseInt(pill.style.top || "0", 10),
        false
    );

    pill.style.left = `${snapped.left}px`;
    pill.style.top = `${snapped.top}px`;
}

function obtenerPosicionDefaultInteligente(id, defaultIndex, pill) {
    const bounds = getViewportBoundsForPill(pill);
    const { width, height } = getScaledOuterSize(pill);

    const anchors = [
        { left: CW_PILL_DEFAULT_LEFT, top: CW_PILL_DEFAULT_TOP },
        { left: window.innerWidth - width - CW_VIEWPORT_PADDING - 20, top: CW_PILL_DEFAULT_TOP + 10 },
        { left: CW_PILL_DEFAULT_LEFT + 12, top: CW_PILL_DEFAULT_TOP + height + CW_SMART_GAP + 4 },
        { left: window.innerWidth - width - CW_VIEWPORT_PADDING - 20, top: CW_PILL_DEFAULT_TOP + height + CW_SMART_GAP + 8 }
    ];

    const fallback = anchors[defaultIndex % anchors.length] || anchors[0];

    const normalized = {
        left: clamp(fallback.left, bounds.minLeft, bounds.maxLeft),
        top: clamp(fallback.top, bounds.minTop, bounds.maxTop)
    };

    return obtenerPosicionSinSuperposicion(id, normalized.left, normalized.top, false);
}

function getRectFromPosition(pill, left, top) {
    const { width, height } = getScaledOuterSize(pill);
    return {
        left,
        top,
        right: left + width,
        bottom: top + height,
        width,
        height
    };
}

function rectsOverlap(a, b, gap = 0) {
    return !(
        a.right + gap <= b.left ||
        a.left >= b.right + gap ||
        a.bottom + gap <= b.top ||
        a.top >= b.bottom + gap
    );
}

function obtenerRectActualPill(otherPill) {
    const left = parseInt(otherPill.style.left || "0", 10);
    const top = parseInt(otherPill.style.top || "0", 10);
    return getRectFromPosition(otherPill, left, top);
}

function aplicarSnapABordes(pill, left, top) {
    const bounds = getViewportBoundsForPill(pill);
    const rect = getRectFromPosition(pill, left, top);

    const distLeft = Math.abs(left - bounds.minLeft);
    const distRight = Math.abs(bounds.maxLeft - left);
    const distTop = Math.abs(top - bounds.minTop);
    const distBottom = Math.abs(bounds.maxTop - top);

    if (distLeft <= CW_SNAP_THRESHOLD) left = bounds.minLeft;
    if (distRight <= CW_SNAP_THRESHOLD) left = bounds.maxLeft;
    if (distTop <= CW_SNAP_THRESHOLD) top = bounds.minTop;
    if (distBottom <= CW_SNAP_THRESHOLD) top = bounds.maxTop;

    // snap leve respecto de otras monedas
    Object.entries(widgetDomIndex).forEach(([otherId, otherPill]) => {
        if (Number(otherId) === Number(pill.dataset.id)) return;
        if (!otherPill?.isConnected) return;

        const otherRect = obtenerRectActualPill(otherPill);
        const currentRect = getRectFromPosition(pill, left, top);

        const nearLeft = Math.abs(currentRect.left - (otherRect.right + CW_SMART_GAP)) <= CW_SNAP_THRESHOLD;
        const nearRight = Math.abs(currentRect.right - (otherRect.left - CW_SMART_GAP)) <= CW_SNAP_THRESHOLD;
        const nearTop = Math.abs(currentRect.top - (otherRect.bottom + CW_SMART_GAP)) <= CW_SNAP_THRESHOLD;
        const nearBottom = Math.abs(currentRect.bottom - (otherRect.top - CW_SMART_GAP)) <= CW_SNAP_THRESHOLD;

        const verticalOverlap = !(currentRect.bottom <= otherRect.top || currentRect.top >= otherRect.bottom);
        const horizontalOverlap = !(currentRect.right <= otherRect.left || currentRect.left >= otherRect.right);

        if (nearLeft && verticalOverlap) left = otherRect.right + CW_SMART_GAP;
        if (nearRight && verticalOverlap) left = otherRect.left - currentRect.width - CW_SMART_GAP;
        if (nearTop && horizontalOverlap) top = otherRect.bottom + CW_SMART_GAP;
        if (nearBottom && horizontalOverlap) top = otherRect.top - currentRect.height - CW_SMART_GAP;
    });

    left = clamp(left, bounds.minLeft, bounds.maxLeft);
    top = clamp(top, bounds.minTop, bounds.maxTop);

    return { left, top };
}

function obtenerPosicionSinSuperposicion(id, left, top, useSnap = true) {
    const pill = widgetDomIndex[id];
    if (!pill) return { left, top };

    const bounds = getViewportBoundsForPill(pill);

    left = clamp(left, bounds.minLeft, bounds.maxLeft);
    top = clamp(top, bounds.minTop, bounds.maxTop);

    if (useSnap) {
        const snapped = aplicarSnapABordes(pill, left, top);
        left = snapped.left;
        top = snapped.top;
    }

    let rect = getRectFromPosition(pill, left, top);

    const others = Object.entries(widgetDomIndex)
        .filter(([otherId, otherPill]) => Number(otherId) !== Number(id) && otherPill?.isConnected)
        .map(([, otherPill]) => obtenerRectActualPill(otherPill));

    let guard = 0;
    while (guard < 30) {
        const overlap = others.find(other => rectsOverlap(rect, other, 2));
        if (!overlap) break;

        const canMoveBelow = overlap.bottom + CW_SMART_GAP + rect.height <= bounds.maxTop + rect.height;
        const canMoveRight = overlap.right + CW_SMART_GAP + rect.width <= bounds.maxLeft + rect.width;

        if (canMoveBelow) {
            top = overlap.bottom + CW_SMART_GAP;
        } else if (canMoveRight) {
            left = overlap.right + CW_SMART_GAP;
        } else {
            left = bounds.minLeft;
            top = clamp(top + rect.height + CW_SMART_GAP, bounds.minTop, bounds.maxTop);
        }

        left = clamp(left, bounds.minLeft, bounds.maxLeft);
        top = clamp(top, bounds.minTop, bounds.maxTop);
        rect = getRectFromPosition(pill, left, top);
        guard++;
    }

    return { left, top };
}

function activarDragMoneda(pill, id) {
    let holdTimer = null;
    let dragging = false;
    let moved = false;
    let offsetX = 0;
    let offsetY = 0;
    let downX = 0;
    let downY = 0;

    const clearHold = () => {
        if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }
    };

    pill.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        if (!(e.target instanceof Element)) return;
        if (e.target.closest(".currency-pill-reset")) return;
        if (e.target.closest(".currency-pill-scale-up")) return;
        if (e.target.closest(".currency-pill-scale-down")) return;
        if (e.target.closest(".currency-pill-scale-reset")) return;

        dragging = false;
        moved = false;
        downX = e.clientX;
        downY = e.clientY;

        const rect = pill.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        clearHold();

        holdTimer = setTimeout(() => {
            dragging = true;
            pill.classList.add("dragging");
            pill.classList.add("selected");
            document.body.classList.add("cw-no-select");
        }, CW_PILL_HOLD_MS);
    });

    document.addEventListener("mousemove", (e) => {
        if (!holdTimer && !dragging) return;

        const dxBefore = Math.abs(e.clientX - downX);
        const dyBefore = Math.abs(e.clientY - downY);

        if (!dragging && (dxBefore > CW_PILL_MOVE_TOLERANCE || dyBefore > CW_PILL_MOVE_TOLERANCE)) {
            clearHold();
            return;
        }

        if (!dragging) return;

        moved = true;
        e.preventDefault();

        const bounds = getViewportBoundsForPill(pill);

        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;

        newLeft = clamp(newLeft, bounds.minLeft, bounds.maxLeft);
        newTop = clamp(newTop, bounds.minTop, bounds.maxTop);

        const resolved = obtenerPosicionSinSuperposicion(id, newLeft, newTop, true);

        pill.style.left = `${resolved.left}px`;
        pill.style.top = `${resolved.top}px`;
    });

    const finishDrag = () => {
        clearHold();

        if (!dragging) return;

        dragging = false;
        pill.classList.remove("dragging");
        document.body.classList.remove("cw-no-select");

        asegurarPosicionPillDentroPantalla(pill);

        const finalPos = obtenerPosicionSinSuperposicion(
            id,
            parseInt(pill.style.left || "0", 10),
            parseInt(pill.style.top || "0", 10),
            true
        );

        pill.style.left = `${finalPos.left}px`;
        pill.style.top = `${finalPos.top}px`;

        guardarPosicionMoneda(id, finalPos.left, finalPos.top);

        if (moved) {
            pill.classList.add("selected");
            setTimeout(() => {
                pill.classList.remove("selected");
            }, 900);
        } else {
            pill.classList.remove("selected");
        }
    };

    document.addEventListener("mouseup", finishDrag);
    document.addEventListener("mouseleave", () => {
        clearHold();
    });

    pill.addEventListener("keydown", (e) => {
        const step = e.shiftKey ? 20 : 8;
        let left = parseInt(pill.style.left || "0", 10);
        let top = parseInt(pill.style.top || "0", 10);
        let changed = false;

        switch (e.key) {
            case "ArrowLeft":
                left -= step;
                changed = true;
                break;
            case "ArrowRight":
                left += step;
                changed = true;
                break;
            case "ArrowUp":
                top -= step;
                changed = true;
                break;
            case "ArrowDown":
                top += step;
                changed = true;
                break;
            case "+":
            case "=":
                incrementarEscalaWidget(CW_SCALE_STEP);
                return;
            case "-":
            case "_":
                incrementarEscalaWidget(-CW_SCALE_STEP);
                return;
            case "0":
                resetearEscalaWidget();
                return;
            case "Escape":
                eliminarPosicionMoneda(id);
                renderWidget();
                return;
            default:
                return;
        }

        if (!changed) return;

        e.preventDefault();

        const resolved = obtenerPosicionSinSuperposicion(id, left, top, true);

        pill.style.left = `${resolved.left}px`;
        pill.style.top = `${resolved.top}px`;
        asegurarPosicionPillDentroPantalla(pill);
        guardarPosicionMoneda(
            id,
            parseInt(pill.style.left || "0", 10),
            parseInt(pill.style.top || "0", 10)
        );
        pill.classList.add("selected");
        setTimeout(() => pill.classList.remove("selected"), 700);
    });
}

/* ==============================
   FECHA / TEXTO ACTUALIZACIÓN
============================== */

function obtenerTextoActualizacion(id) {
    const ts = Number(ultimaActualizacion[id] || 0);
    if (!ts) return "Sin actualizar";

    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");

    return `Actualizado ${hh}:${mm}`;
}

window.CurrencyWidgetManualRefresh = async function (id) {
    await actualizarMasivo([Number(id)]);
};

/* ==============================
   EFECTO UP / DOWN
============================== */

function aplicarEfectoCambio(id, anterior, nuevo) {
    const pill = document.querySelector(`.currency-pill[data-id='${id}']`);
    if (!pill) return;

    const valueEl = pill.querySelector(".currency-value");
    if (!valueEl) return;

    pill.classList.remove("up", "down");
    valueEl.classList.remove("value-up", "value-down");

    const oldIcon = valueEl.querySelector("i");
    if (oldIcon) oldIcon.remove();

    if (nuevo > anterior) {
        pill.classList.add("up");
        valueEl.classList.add("value-up");
        valueEl.insertAdjacentHTML("beforeend", ` <i class="fa fa-arrow-up"></i>`);
    } else if (nuevo < anterior) {
        pill.classList.add("down");
        valueEl.classList.add("value-down");
        valueEl.insertAdjacentHTML("beforeend", ` <i class="fa fa-arrow-down"></i>`);
    } else {
        return;
    }

    setTimeout(() => {
        pill.classList.remove("up", "down");
        valueEl.classList.remove("value-up", "value-down");
        const ic = valueEl.querySelector("i");
        if (ic) ic.remove();
    }, 2000);
}

/* ==============================
   COUNTDOWN
============================== */

function iniciarCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
        if (isUpdatingCurrencies) {
            renderRefreshState();
            return;
        }

        actualizarCountdownTexto();
    }, 1000);
}

function actualizarCountdownTexto() {
    const el = document.getElementById("refreshCountdown");
    if (!el) return;

    if (isUpdatingCurrencies) return;

    const nextTs = obtenerProximoUpdate();

    if (!nextTs) {
        el.textContent = "";
        return;
    }

    const remaining = nextTs - Date.now();

    if (remaining <= 0 && !isUpdatingNow) {
        el.textContent = "Actualizando...";
        verificarSiDebeActualizar();
        return;
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const mm = Math.floor(totalSeconds / 60);
    const ss = totalSeconds % 60;

    el.textContent = `Actualiza en ${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
}

function bindRefreshUI() {
    const sel = document.getElementById("currencyRefreshSelect");
    if (!sel) return;

    if (sel.options.length === 0) {
        const opts = [1, 2, 3, 5, 6, 10, 15, 20, 30, 45, 60];
        for (const m of opts) {
            const o = document.createElement("option");
            o.value = String(m);
            o.textContent = `${m} min`;
            sel.appendChild(o);
        }
    }

    const current = obtenerRefreshConfig();
    sel.value = String(current);

    sel.addEventListener("change", async () => {
        guardarRefreshConfig(sel.value);
        await verificarSiDebeActualizar();
    });

    actualizarRefreshUILabel();
}

function actualizarRefreshUILabel() {
    const lbl = document.getElementById("refreshLabel");
    if (!lbl) return;
    lbl.textContent = `${obtenerRefreshConfig()} min`;
}

/* ==============================
   HELPERS
============================== */

function toMoneyNumber(v) {
    if (v == null) return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;

    const s = String(v).trim();
    if (!s) return 0;

    const normalized = s.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
}

function round2(n) {
    n = Number(n);
    if (!Number.isFinite(n)) return 0;
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

function sameMoney(a, b) {
    return round2(a) === round2(b);
}

function format2(v) {
    const n = round2(toMoneyNumber(v));
    return n.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}