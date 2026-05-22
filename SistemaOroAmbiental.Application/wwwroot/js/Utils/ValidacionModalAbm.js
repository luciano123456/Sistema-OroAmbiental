/**
 * Validación estándar para modales ABM:
 * - Al abrir: sin errores ni verdes.
 * - Blur en requerido vacío: "Campo obligatorio".
 * - Registrar: valida todo + panel general de error.
 * - Al completar campos: borde verde.
 * - Todos los requeridos OK: panel verde ~3s y desaparece.
 */
(function (window) {
    "use strict";

    const MSG_EXITO = "Campos requeridos completados";
    const DURACION_EXITO_MS = 3000;
    const DURACION_ENTRADA_MS = 600;
    const DURACION_SALIDA_MS = 700;

    function limpiarEstadoCampo(el) {
        if (!el || typeof window.jQuery !== "function") return;

        const $el = window.jQuery(el);
        const esSelect = el.tagName === "SELECT";

        el.classList.remove("is-invalid", "is-valid");

        if (esSelect && $el.data("select2") && typeof getSelect2Selection === "function") {
            const { $selection, $container } = getSelect2Selection(el);
            $selection.removeClass("is-invalid is-valid");
            $container.removeClass("is-invalid is-valid");
        }

        let $wrap = $el.closest(".mb-3, .form-group, [class*='col-'], .col, .rp-field, .rp-form-group");
        if (!$wrap.length && esSelect) {
            $wrap = $el.closest(".rp-select-plus").parent();
        }

        let $msg = $wrap.find(".invalid-feedback, .rp-invalid-msg, .campo-obligatorio, small.text-danger").first();

        if (!$msg.length && esSelect) {
            const $plus = $el.closest(".rp-select-plus");
            $msg = $plus.next(".invalid-feedback, .rp-invalid-msg, .campo-obligatorio, small.text-danger").first();
        }

        if ($msg.length) {
            $msg.addClass("d-none").css("display", "");
        }
    }

    class ValidacionModalAbm {

        constructor(options) {
            this.modalEl = options.modalEl;
            this.getPanel = options.getPanel || (() => null);
            this.campos = options.campos || [];
            this.getCampos = options.getCampos || null;
            this.esCampoValido = options.esCampoValido || (() => true);
            this.isSoloLectura = options.isSoloLectura || (() => false);
            this.mostrarError = options.mostrarError || null;
            this.cerrarPanel = options.cerrarPanel || null;

            this._tocados = new Set();
            this._submitIntento = false;
            this._timerExito = null;
            /** Panel verde visible ahora (no reiniciar ni pisar HTML) */
            this._exitoVisible = false;
            /** Ya se mostró el éxito en esta apertura del modal; no repetir al seguir escribiendo */
            this._exitoMostradoEnSesion = false;
            /** Panel rojo de validación visible; no volver a renderizar ni scroll al escribir */
            this._errorVisible = false;
            this._ultimoMensajeError = null;
        }

        _getEl(id) {
            return this.modalEl.querySelector(`#${id}`) || document.getElementById(id);
        }

        _nombreCampo(c) {
            return typeof c === "string" ? c : (c.nombre || c.id);
        }

        _idCampo(c) {
            return typeof c === "string" ? c : c.id;
        }

        _getCamposLista() {
            return typeof this.getCampos === "function" ? this.getCampos() : this.campos;
        }

        esObligatorio(el) {
            if (!el?.id) return false;
            return this._getCamposLista().some(c => this._idCampo(c) === el.id);
        }

        reset() {
            this._tocados.clear();
            this._submitIntento = false;
            this._exitoVisible = false;
            this._exitoMostradoEnSesion = false;
            this._errorVisible = false;
            this._ultimoMensajeError = null;
            this._cancelarTimerExito();

            if (this.modalEl) {
                this.modalEl.querySelectorAll("input, select, textarea").forEach(el => {
                    if (this.esObligatorio(el) || el.classList.contains("is-invalid") || el.classList.contains("is-valid")) {
                        limpiarEstadoCampo(el);
                    }
                });
            }

            if (this.modalEl) {
                this.modalEl.querySelectorAll(".invalid-feedback").forEach(msg => {
                    msg.classList.add("d-none");
                    msg.style.display = "";
                });
            }

            if (typeof this.cerrarPanel === "function") {
                this.cerrarPanel();
            } else {
                const panel = this.getPanel();
                if (panel) {
                    panel.classList.add("d-none");
                    panel.innerHTML = "";
                }
            }
        }

        _cancelarTimerExito() {
            if (this._timerExito) {
                clearTimeout(this._timerExito);
                this._timerExito = null;
            }
        }

        cancelarPanelExito() {
            this._cancelarTimerExito();
            this._ocultarPanelExito();
        }

        _panelExitoActivo(panel) {
            if (!panel || panel.classList.contains("d-none")) return false;
            if (panel.classList.contains("rp-panel-exito")) return true;
            return !!panel.querySelector(".rp-success-box");
        }

        _panelErrorActivo(panel) {
            if (!panel || panel.classList.contains("d-none")) return false;
            if (this._panelExitoActivo(panel)) return false;
            if (panel.querySelector(".rp-success-box")) return false;
            return !!panel.querySelector(".rp-error-box")
                || (!!panel.querySelector(".rp-error-message") && panel.classList.contains("rp-error-panel"));
        }

        _ocultarPanelError() {
            const panel = this.getPanel();
            if (!panel) return;

            this._errorVisible = false;
            this._ultimoMensajeError = null;

            if (typeof this.cerrarPanel === "function") {
                this.cerrarPanel();
            } else {
                panel.classList.add("d-none");
                panel.innerHTML = "";
            }
        }

        _actualizarTextoError(panel, mensajeHtml) {
            if (!panel) return;
            const destino = panel.querySelector(".rp-error-text, .rp-error-message");
            if (destino) {
                destino.innerHTML = mensajeHtml;
                this._ultimoMensajeError = mensajeHtml;
                return;
            }
            this._mostrarErrorValidacion(mensajeHtml, true);
        }

        _mostrarErrorValidacion(mensajeHtml, forzar = false) {
            const panel = this.getPanel();

            if (!forzar && (this._errorVisible || this._panelErrorActivo(panel))) {
                if (this._ultimoMensajeError !== mensajeHtml && panel) {
                    this._actualizarTextoError(panel, mensajeHtml);
                }
                return;
            }

            this._ultimoMensajeError = mensajeHtml;
            this._errorVisible = true;
            this._exitoMostradoEnSesion = false;
            this._ocultarPanelExito();

            if (typeof this.mostrarError === "function") {
                this.mostrarError(mensajeHtml);
            } else if (typeof window.mostrarErrorCampos === "function") {
                window.mostrarErrorCampos(mensajeHtml, null, "validacion");
            }
        }

        _ocultarPanelExito() {
            const panel = this.getPanel();
            if (!panel || !this._panelExitoActivo(panel)) return;

            this._cancelarTimerExito();
            this._restaurarPanelEstructura(panel);

            const msgEl = panel.querySelector(".rp-error-message");
            if (msgEl) {
                msgEl.innerHTML = "";
            } else {
                panel.innerHTML = "";
            }

            panel.classList.add("d-none");
            panel.classList.remove("rp-panel-exito-out", "rp-panel-fade-out");
            this._exitoVisible = false;
        }

        restaurarPanelEstructura() {
            this._restaurarPanelEstructura(this.getPanel());
        }

        _aplicarEstado(el, esValido, visible) {
            if (!el) return;
            if (!visible) {
                limpiarEstadoCampo(el);
                return;
            }
            if (typeof window.setEstadoCampo === "function") {
                window.setEstadoCampo(el, esValido);
            }
        }

        _debeMostrarEstado(el) {
            return this._submitIntento || this._tocados.has(el.id);
        }

        marcarTocado(el) {
            if (el?.id) this._tocados.add(el.id);
        }

        onBlur(el) {
            if (this.isSoloLectura() || !this.esObligatorio(el)) return true;

            this.marcarTocado(el);
            const esValido = this.esCampoValido(el);
            this._aplicarEstado(el, esValido, true);
            this._verificarPanelEstado();
            return esValido;
        }

        onInput(el) {
            if (this.isSoloLectura() || !this.esObligatorio(el)) return;

            const esValido = this.esCampoValido(el);
            const visible = this._debeMostrarEstado(el);

            if (visible) {
                this._aplicarEstado(el, esValido, true);
            }

            this._verificarPanelEstado();
        }

        onSelect2Change(el) {
            this.marcarTocado(el);
            this.onInput(el);
        }

        _todosCompletos() {
            return this._getCamposLista().every(c => {
                const id = this._idCampo(c);
                const el = this._getEl(id);
                return el && this.esCampoValido(el);
            });
        }

        /** Panel verde solo tras intento de guardar o haber visto el panel rojo de requeridos */
        _puedeMostrarPanelExito() {
            if (this._submitIntento) return true;
            if (this._errorVisible) return true;
            const panel = this.getPanel();
            return !!panel && this._panelErrorActivo(panel);
        }

        _verificarPanelEstado() {
            if (this.isSoloLectura()) return;

            const panel = this.getPanel();
            if (!panel) return;

            const todosOk = this._todosCompletos();
            const huboInteraccion = this._submitIntento || this._tocados.size > 0;

            if (!todosOk) {
                this._exitoMostradoEnSesion = false;
                if (this._exitoVisible || this._panelExitoActivo(panel)) {
                    this._ocultarPanelExito();
                }
            } else if (todosOk && huboInteraccion && this._puedeMostrarPanelExito()) {
                if (this._errorVisible || this._panelErrorActivo(panel)) {
                    this._ocultarPanelError();
                }
                if (this._exitoVisible || this._panelExitoActivo(panel)) {
                    return;
                }
                if (this._exitoMostradoEnSesion) {
                    return;
                }
                this._mostrarExito();
                return;
            }

            if (!this._submitIntento) return;

            const errores = this._listarErrores();
            if (errores.length > 0) {
                const msg = `Debes completar los campos requeridos:<br><strong>${errores.join(", ")}</strong>`;
                this._mostrarErrorValidacion(msg);
            } else if (this._errorVisible || this._panelErrorActivo(panel)) {
                this._ocultarPanelError();
            }
        }

        _listarErrores() {
            const errores = [];
            this._getCamposLista().forEach(c => {
                const id = this._idCampo(c);
                const el = this._getEl(id);
                if (!el || this.esCampoValido(el)) return;
                errores.push(this._nombreCampo(c));
            });
            return errores;
        }

        _restaurarPanelEstructura(panel) {
            if (!panel) return;

            panel.classList.remove("rp-panel-exito", "rp-panel-exito-enter", "rp-panel-exito-out", "rp-panel-fade-out");

            const titulo = panel.querySelector(".rp-error-title");
            if (titulo && panel.dataset.tituloError) {
                titulo.textContent = panel.dataset.tituloError;
            }

            const icono = panel.querySelector(".rp-error-icon i");
            if (icono && panel.dataset.iconoError) {
                icono.className = panel.dataset.iconoError;
            }
        }

        _mostrarExito() {
            const panel = this.getPanel();
            if (!panel) return;

            if (this._exitoVisible || this._panelExitoActivo(panel)) {
                return;
            }

            if (this._exitoMostradoEnSesion) {
                return;
            }

            this._exitoVisible = true;
            this._exitoMostradoEnSesion = true;

            this._getCamposLista().forEach(c => {
                const el = this._getEl(this._idCampo(c));
                if (el && this.esCampoValido(el)) {
                    this._aplicarEstado(el, true, true);
                }
            });

            const msgEl = panel.querySelector(".rp-error-message");

            if (msgEl) {
                if (!panel.dataset.tituloError) {
                    const titulo = panel.querySelector(".rp-error-title");
                    if (titulo) panel.dataset.tituloError = titulo.textContent;
                }
                if (!panel.dataset.iconoError) {
                    const icono = panel.querySelector(".rp-error-icon i");
                    if (icono) panel.dataset.iconoError = icono.className;
                }

                panel.classList.add("rp-panel-exito");
                const titulo = panel.querySelector(".rp-error-title");
                if (titulo) titulo.textContent = MSG_EXITO;
                const icono = panel.querySelector(".rp-error-icon i");
                if (icono) icono.className = "fa fa-check-circle";
                msgEl.innerHTML = "";
            } else {
                panel.innerHTML = `
                    <div class="rp-success-box">
                        <div class="rp-success-icon"><i class="fa fa-check-circle"></i></div>
                        <div class="rp-success-content">
                            <div class="rp-success-title">${MSG_EXITO}</div>
                        </div>
                    </div>`;
            }

            panel.classList.remove("d-none", "rp-panel-exito-out", "rp-panel-fade-out");
            panel.classList.add("rp-panel-exito-enter");

            const innerBox = panel.querySelector(".rp-success-box");
            if (innerBox) innerBox.classList.add("rp-panel-exito-enter");

            setTimeout(() => {
                panel.classList.remove("rp-panel-exito-enter");
                if (innerBox) innerBox.classList.remove("rp-panel-exito-enter");
            }, DURACION_ENTRADA_MS);

            panel.scrollIntoView({ behavior: "smooth", block: "nearest" });

            this._timerExito = setTimeout(() => {
                panel.classList.remove("rp-panel-exito-enter");
                if (innerBox) innerBox.classList.remove("rp-panel-exito-enter");
                panel.classList.add("rp-panel-exito-out");

                setTimeout(() => {
                    this._restaurarPanelEstructura(panel);
                    if (typeof this.cerrarPanel === "function") {
                        this.cerrarPanel();
                    } else {
                        panel.classList.add("d-none");
                        if (!msgEl) panel.innerHTML = "";
                    }
                    this._exitoVisible = false;
                    this._timerExito = null;
                }, DURACION_SALIDA_MS);
            }, DURACION_EXITO_MS);
        }

        validarTodos() {
            if (this.isSoloLectura()) return true;

            this._submitIntento = true;
            if (!this._exitoVisible) {
                this._cancelarTimerExito();
            }

            this._getCamposLista().forEach(c => {
                const id = this._idCampo(c);
                const el = this._getEl(id);
                if (!el) return;

                this.marcarTocado(el);
                const esValido = this.esCampoValido(el);
                this._aplicarEstado(el, esValido, true);
            });

            const errores = this._listarErrores();

            if (errores.length > 0) {
                const msg = `Debes completar los campos requeridos:<br><strong>${errores.join(", ")}</strong>`;
                this._mostrarErrorValidacion(msg);
                return false;
            }

            this._ocultarPanelError();

            this._verificarPanelEstado();
            return true;
        }

        attachEvents(options = {}) {
            if (!this.modalEl) return;

            const select2Ns = options.select2Namespace || "validacion-abm";

            this.modalEl.addEventListener("input", (e) => {
                const target = e.target;
                if (target?.classList?.contains("Inputmiles") && typeof window.formatearMilesInput === "function") {
                    window.formatearMilesInput(target);
                }
                if (target?.matches("input, select, textarea")) {
                    this.onInput(target);
                }
            });

            this.modalEl.addEventListener("blur", (e) => {
                const target = e.target;
                if (target?.matches("input, select, textarea")) {
                    this.onBlur(target);
                }
            }, true);

            this.modalEl.addEventListener("shown.bs.modal", () => {
                if (!window.jQuery) return;
                const $modal = window.jQuery(this.modalEl);
                $modal.off(`select2:select.${select2Ns} select2:clear.${select2Ns}`);
                $modal.on(`select2:select.${select2Ns} select2:clear.${select2Ns}`, "select", (ev) => {
                    if (ev.target) this.onSelect2Change(ev.target);
                });
            });
        }
    }

    /**
     * Paneles tipo Caja/Inventario: .rp-error-panel + .rp-error-message
     */
    function restaurarTituloPanelRp(panel) {
        if (!panel) return;
        const titulo = panel.querySelector(".rp-error-title");
        if (titulo && panel.dataset.tituloError) {
            titulo.textContent = panel.dataset.tituloError;
        }
        const icono = panel.querySelector(".rp-error-icon i");
        if (icono && panel.dataset.iconoError) {
            icono.className = panel.dataset.iconoError;
        }
    }

    function mostrarErrorPanelRp(panelSelector, mensajeHtml) {
        const panel = typeof panelSelector === "string"
            ? document.querySelector(panelSelector)
            : panelSelector;
        if (!panel) return;

        panel.classList.remove("d-none", "rp-panel-exito", "rp-panel-exito-enter", "rp-panel-exito-out");

        const titulo = panel.querySelector(".rp-error-title");
        if (titulo) {
            if (!panel.dataset.tituloError) panel.dataset.tituloError = titulo.textContent;
            titulo.textContent = "Campos requeridos";
        }

        const icono = panel.querySelector(".rp-error-icon i");
        if (icono) {
            if (!panel.dataset.iconoError) panel.dataset.iconoError = icono.className;
            icono.className = "fa fa-exclamation-circle";
        }

        const msgEl = panel.querySelector(".rp-error-message");
        if (msgEl) msgEl.innerHTML = mensajeHtml || "";
    }

    function cerrarPanelRp(panelSelector) {
        const panel = typeof panelSelector === "string"
            ? document.querySelector(panelSelector)
            : panelSelector;
        if (!panel) return;

        panel.classList.add("d-none");
        panel.classList.remove("rp-panel-exito", "rp-panel-exito-enter", "rp-panel-exito-out");

        const msgEl = panel.querySelector(".rp-error-message");
        if (msgEl) msgEl.innerHTML = "";

        restaurarTituloPanelRp(panel);
    }

    function crearValidacionPanelModulo(config) {
        const modalEl = document.querySelector(config.modalSelector);
        if (!modalEl) return null;

        const panelSel = config.panelSelector;
        let instancia = null;

        instancia = new ValidacionModalAbm({
            modalEl,
            getPanel: () => document.querySelector(panelSel),
            campos: config.campos || [],
            getCampos: config.getCampos || null,
            esCampoValido: config.esCampoValido || ((el) => {
                const valor = (el?.value ?? "").toString().trim();
                return valor !== "" && valor !== "Seleccionar";
            }),
            mostrarError: (msg) => {
                instancia?.cancelarPanelExito?.();
                mostrarErrorPanelRp(panelSel, msg);
            },
            cerrarPanel: () => cerrarPanelRp(panelSel)
        });

        if (config.attachEvents !== false) {
            instancia.attachEvents({ select2Namespace: config.select2Namespace || "validacion-panel" });
        }

        return instancia;
    }

    window.ValidacionModalAbm = ValidacionModalAbm;
    window.limpiarEstadoCampo = limpiarEstadoCampo;
    window.crearValidacionPanelModulo = crearValidacionPanelModulo;
    window.mostrarErrorPanelRp = mostrarErrorPanelRp;
    window.cerrarPanelRp = cerrarPanelRp;

})(window);
