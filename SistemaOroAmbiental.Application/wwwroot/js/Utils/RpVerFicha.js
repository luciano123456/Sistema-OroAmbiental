/**
 * Abrir ficha existente desde paneles de error (duplicados, relaciones, etc.).
 * Usa data-rp-ver-ficha + data-handler para invocar el handler global correcto por entidad.
 */
(function (window, $) {
    "use strict";

    const _handlers = {};

    function registrar(nombre, fn) {
        if (!nombre || typeof fn !== "function") return;
        _handlers[nombre] = fn;
        window[nombre] = fn;
    }

    function abrir(id, handlerName) {
        const idNum = parseInt(id, 10);
        if (!idNum) return false;

        const name = handlerName || window.rpVerFichaHandlerDefault || "verFicha";
        const fn = _handlers[name] || window[name];
        if (typeof fn !== "function") {
            console.warn("RpVerFicha: handler no registrado:", name, "id=", idNum);
            return false;
        }

        try {
            const r = fn(idNum);
            if (r && typeof r.then === "function") {
                r.catch((e) => console.error("RpVerFicha.abrir", e));
            }
        } catch (e) {
            console.error("RpVerFicha.abrir", e);
            return false;
        }
        return true;
    }

    function tituloIcono(tipo) {
        switch (tipo) {
            case "duplicado":
                return { titulo: "Registro duplicado detectado", icono: "fa-exclamation-triangle" };
            case "relacion":
                return { titulo: "No se puede eliminar", icono: "fa-link" };
            case "error":
                return { titulo: "No se pudo guardar", icono: "fa-times-circle" };
            default:
                return { titulo: "Campos requeridos", icono: "fa-exclamation-circle" };
        }
    }

    function botonHtml(idReferencia, handlerName) {
        const id = parseInt(idReferencia, 10);
        if (!id) return "";
        const h = String(handlerName || "verFicha").replace(/["']/g, "");
        return `
            <button type="button" class="rp-btn-ref" data-rp-ver-ficha data-id="${id}" data-handler="${h}">
                <i class="fa fa-eye me-1"></i> Abrir ficha existente →
            </button>`;
    }

    function renderErrorCampos(container, mensaje, idReferencia, tipo, handlerVerFicha) {
        if (!container) return;

        const { titulo, icono } = tituloIcono(tipo);
        const botonReferencia = botonHtml(idReferencia, handlerVerFicha);

        container.innerHTML = `
            <div class="rp-error-box">
                <div class="rp-error-icon"><i class="fa ${icono}"></i></div>
                <div class="rp-error-content">
                    <div class="rp-error-title">${titulo}</div>
                    <div class="rp-error-text">${mensaje || ""}</div>
                </div>
                ${botonReferencia}
            </div>`;

        container.classList.remove("d-none");
        container.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function bindClick() {
        if (!$ || !$.fn) return;
        $(document).off("click.rpVerFicha", "[data-rp-ver-ficha]").on("click.rpVerFicha", "[data-rp-ver-ficha]", function (e) {
            e.preventDefault();
            e.stopPropagation();
            const id = $(this).data("id");
            const handler = $(this).data("handler");
            abrir(id, handler);
        });
    }

    bindClick();

    window.RpVerFicha = {
        registrar,
        abrir,
        botonHtml,
        tituloIcono,
        renderErrorCampos
    };
})(window, window.jQuery);
