/* =========================================================
   FINANZAS - Control mensual
========================================================= */

const FG_CM_MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const FG_CM = {
    listo: false,
    anios: [],
    meses: [],
    fuentes: { efectivo: true, bancos: true, gastos: true },
    data: null
};

window.initFinanzasControlMensual = async function () {
    if (!FG_CM.listo) {
        initFiltrosFgCm();
        wireFgCm();
        FG_CM.listo = true;
    }
    await cargarControlMensualFg(true);
};

function wireFgCm() {
    $("#fgCmBtnRefresh").off("click.fgcm").on("click.fgcm", () => cargarControlMensualFg(true));

    $("#fgCmAniosChips, #fgCmMesesChips").off("click.fgcm").on("click.fgcm", ".cg-cm-chip", function () {
        const tipo = $(this).data("tipo");
        const val = parseInt($(this).data("val"), 10);
        toggleFiltroFgCm(tipo, val);
    });

    $(".fg-cm-preset-meses").off("click.fgcm").on("click.fgcm", function () {
        aplicarPresetMesesFgCm($(this).data("meses"));
    });

    $("#fgCmAniosRecientes").off("click.fgcm").on("click.fgcm", aplicarAniosRecientesFgCm);

    $(".fg-cm-fuente").off("click.fgcm").on("click.fgcm", function () {
        const f = $(this).data("fuente");
        FG_CM.fuentes[f] = !FG_CM.fuentes[f];
        $(this).toggleClass("is-active", !!FG_CM.fuentes[f]);
        // Al menos una fuente activa
        if (!FG_CM.fuentes.efectivo && !FG_CM.fuentes.bancos && !FG_CM.fuentes.gastos) {
            FG_CM.fuentes[f] = true;
            $(this).addClass("is-active");
        }
        syncColumnasFuentesFgCm();
        cargarControlMensualFg(true);
    });
}

function initFiltrosFgCm() {
    const actual = new Date().getFullYear();
    FG_CM.anios = [actual];
    FG_CM.meses = [];

    const $anios = $("#fgCmAniosChips").empty();
    for (let y = actual; y >= actual - 8; y--) {
        $anios.append(`<button type="button" class="cg-cm-chip cg-cm-chip--anio" data-tipo="anio" data-val="${y}">${y}</button>`);
    }

    const $meses = $("#fgCmMesesChips").empty();
    for (let m = 1; m <= 12; m++) {
        $meses.append(`<button type="button" class="cg-cm-chip cg-cm-chip--mes" data-tipo="mes" data-val="${m}">${FG_CM_MESES[m - 1]}</button>`);
    }

    renderEstadoFiltrosFgCm(false);
    syncColumnasFuentesFgCm();
}

function toggleFiltroFgCm(tipo, val) {
    if (!val || Number.isNaN(val)) return;
    const arr = tipo === "anio" ? FG_CM.anios : FG_CM.meses;
    const idx = arr.indexOf(val);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(val);
    if (tipo === "anio") FG_CM.anios.sort((a, b) => b - a);
    else FG_CM.meses.sort((a, b) => a - b);
    if (FG_CM.anios.length === 0) FG_CM.anios = [new Date().getFullYear()];
    renderEstadoFiltrosFgCm(true);
}

function aplicarPresetMesesFgCm(valor) {
    if (valor === "all") FG_CM.meses = [];
    else {
        FG_CM.meses = String(valor || "")
            .split(",")
            .map(x => parseInt(x, 10))
            .filter(x => x >= 1 && x <= 12);
    }
    renderEstadoFiltrosFgCm(true);
}

function aplicarAniosRecientesFgCm() {
    const actual = new Date().getFullYear();
    FG_CM.anios = [actual, actual - 1, actual - 2];
    renderEstadoFiltrosFgCm(true);
}

function renderEstadoFiltrosFgCm(refresh) {
    $("#fgCmAniosChips .cg-cm-chip").each(function () {
        $(this).toggleClass("is-active", FG_CM.anios.includes(parseInt($(this).data("val"), 10)));
    });
    $("#fgCmMesesChips .cg-cm-chip").each(function () {
        $(this).toggleClass("is-active", FG_CM.meses.includes(parseInt($(this).data("val"), 10)));
    });

    $(".fg-cm-preset-meses").removeClass("is-active");
    if (FG_CM.meses.length === 0) {
        $('.fg-cm-preset-meses[data-meses="all"]').addClass("is-active");
    } else {
        ["1,2,3", "4,5,6", "7,8,9", "10,11,12"].forEach(key => {
            const vals = key.split(",").map(Number);
            const ok = vals.length === FG_CM.meses.length && vals.every(v => FG_CM.meses.includes(v));
            if (ok) $(`.fg-cm-preset-meses[data-meses="${key}"]`).addClass("is-active");
        });
    }

    const actual = new Date().getFullYear();
    const recientes = [actual, actual - 1, actual - 2];
    $("#fgCmAniosRecientes").toggleClass(
        "is-active",
        FG_CM.anios.length === 3 && recientes.every(y => FG_CM.anios.includes(y))
    );

    const nAnios = FG_CM.anios.length;
    const nMeses = FG_CM.meses.length || 12;
    $("#fgCmCount").text(nAnios * nMeses);
    $("#fgCmFiltroResumen").text(
        `${nAnios} ano${nAnios === 1 ? "" : "s"} · ${FG_CM.meses.length ? nMeses + " meses" : "Todos los meses"}`
    );

    if (refresh) cargarControlMensualFg(true);
}

function syncColumnasFuentesFgCm() {
    const root = document.getElementById("fgSectionControl");
    if (!root) return;
    root.classList.toggle("fg-cm-hide-efe", !FG_CM.fuentes.efectivo);
    root.classList.toggle("fg-cm-hide-ban", !FG_CM.fuentes.bancos);
    root.classList.toggle("fg-cm-hide-gas", !FG_CM.fuentes.gastos);
}

function fmtMoneyFgCm(n) {
    if (typeof formatearMoneda === "function") return formatearMoneda(Number(n || 0));
    return "$ " + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function clsSaldoFgCm(n) {
    if (typeof clsSaldoMoney === "function") return clsSaldoMoney(n);
    const v = Number(n || 0);
    if (v > 0) return "cg-cm-saldo-pos";
    if (v < 0) return "cg-cm-saldo-neg";
    return "cg-cm-saldo-cero";
}

function filaTieneMovimientoFgCm(f) {
    return Number(f.IngEfectivo || 0) !== 0
        || Number(f.EgrEfectivo || 0) !== 0
        || Number(f.IngBanco || 0) !== 0
        || Number(f.EgrBanco || 0) !== 0
        || Number(f.Gastos || 0) !== 0
        || Number(f.Ingresos || 0) !== 0
        || Number(f.Egresos || 0) !== 0;
}

function renderEmptyControlMensualFg(mensaje) {
    const texto = mensaje || "No hay registros";
    $("#fgCmBody").html(`
        <tr class="cg-cm-empty">
            <td colspan="11">
                <div class="fg-cm-empty">
                    <i class="fa fa-inbox"></i>
                    <strong>${texto}</strong>
                    <small>Proba otro periodo o fuentes (Efectivo / Bancos / Gastos).</small>
                </div>
            </td>
        </tr>
    `);
}

async function cargarControlMensualFg() {
    const $body = $("#fgCmBody");
    $body.html(`<tr class="cg-cm-empty"><td colspan="11"><div class="fg-cm-empty fg-cm-empty--loading"><i class="fa fa-refresh fa-spin"></i> Cargando...</div></td></tr>`);

    try {
        const response = await fetch("/Finanzas/ControlMensual", {
            method: "POST",
            headers: {
                Authorization: "Bearer " + (typeof token !== "undefined" ? token : (window.token || "")),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                Anios: FG_CM.anios,
                Meses: FG_CM.meses,
                IncluirEfectivo: !!FG_CM.fuentes.efectivo,
                IncluirBancos: !!FG_CM.fuentes.bancos,
                IncluirGastos: !!FG_CM.fuentes.gastos
            })
        });

        if (!response.ok) throw new Error(response.statusText);
        const data = await response.json();
        FG_CM.data = data;
        renderControlMensualFg(data);
    } catch (e) {
        console.error(e);
        $("#fgCmKpiIngresos, #fgCmKpiEgresos, #fgCmKpiGastos, #fgCmKpiNeto").text(fmtMoneyFgCm(0));
        renderEmptyControlMensualFg("No hay registros");
    }
}

function renderControlMensualFg(data) {
    const payload = data || {};
    $("#fgCmKpiIngresos").text(fmtMoneyFgCm(payload.TotalIngresos)).attr("class", "val rp-money-in");
    $("#fgCmKpiEgresos").text(fmtMoneyFgCm(payload.TotalEgresos)).attr("class", "val rp-money-out");
    $("#fgCmKpiGastos").text(fmtMoneyFgCm(payload.TotalGastos)).attr("class", "val rp-money-out");
    $("#fgCmKpiNeto").text(fmtMoneyFgCm(payload.NetoPeriodo)).attr("class", "val " + clsSaldoFgCm(payload.NetoPeriodo));

    const filas = (payload.Filas || []).filter(filaTieneMovimientoFgCm);
    const $body = $("#fgCmBody").empty();

    if (!filas.length) {
        renderEmptyControlMensualFg("No hay registros");
        return;
    }

    filas.forEach(f => {
        $body.append(`
            <tr>
                <td>${f.Anio}</td>
                <td class="cg-cm-mes">${f.MesNombre || ""}</td>
                <td class="cg-cm-num fg-cm-col-efe rp-money-in">${fmtMoneyFgCm(f.IngEfectivo)}</td>
                <td class="cg-cm-num fg-cm-col-efe rp-money-out">${fmtMoneyFgCm(f.EgrEfectivo)}</td>
                <td class="cg-cm-num fg-cm-col-ban rp-money-in">${fmtMoneyFgCm(f.IngBanco)}</td>
                <td class="cg-cm-num fg-cm-col-ban rp-money-out">${fmtMoneyFgCm(f.EgrBanco)}</td>
                <td class="cg-cm-num fg-cm-col-gas rp-money-out">${fmtMoneyFgCm(f.Gastos)}</td>
                <td class="cg-cm-num rp-money-in">${fmtMoneyFgCm(f.Ingresos)}</td>
                <td class="cg-cm-num rp-money-out">${fmtMoneyFgCm(f.Egresos)}</td>
                <td class="cg-cm-num ${clsSaldoFgCm(f.Neto)}">${fmtMoneyFgCm(f.Neto)}</td>
                <td class="cg-cm-num ${clsSaldoFgCm(f.Saldo)}"><strong>${fmtMoneyFgCm(f.Saldo)}</strong></td>
            </tr>
        `);
    });

    syncColumnasFuentesFgCm();
}
