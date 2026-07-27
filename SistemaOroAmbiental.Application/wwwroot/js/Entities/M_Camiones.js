(function (window) {
    "use strict";

    class CamionModal {

        constructor(root, options = {}) {

            if (!root) {
                throw new Error("CamionModal requiere un root.");
            }

            this.root = root;

            this.options = Object.assign({
                token: window.token || "",
                endpoints: {
                    editar: "/Camiones/EditarInfo?id={id}",
                    insertar: "/Camiones/Insertar",
                    actualizar: "/Camiones/Actualizar",
                    eliminar: "/Camiones/Eliminar?id={id}"
                },
                onSaved: null,
                onDeleted: null,
                onBeforeOpen: null,
                onOpen: null
            }, options || {});

            this.modalEl = this.root.matches("[data-camion-modal]")
                ? this.root
                : this.root.querySelector("[data-camion-modal]");

            if (!this.modalEl) {
                throw new Error("No se encontró [data-camion-modal].");
            }

            this.bsModal = new bootstrap.Modal(this.modalEl);
            this._ultimoModo = "nuevo";
            this._modeloActual = null;

            this._validacion = new ValidacionModalAbm({
                modalEl: this.modalEl,
                getPanel: () => this._id("errorCampos"),
                campos: [
                    { id: "txtNombre", nombre: "Nombre" }
                ],
                esCampoValido: (el) => this._valorCampoValido(el),
                isSoloLectura: () => this.isSoloLectura(),
                mostrarError: (msg) => this.mostrarErrorCampos(msg, null, "validacion"),
                cerrarPanel: () => this.cerrarErrorCampos()
            });

            window.camionModal = this;
            this._bindEvents();
        }

        _id(id) { return this.modalEl.querySelector(`#${id}`); }

        _replaceUrl(url, values) {
            let result = url;
            Object.keys(values || {}).forEach(key => {
                result = result.replace(`{${key}}`, values[key]);
            });
            return result;
        }

        _headers(json = true) {
            const h = {};
            if (json) h["Content-Type"] = "application/json;charset=utf-8";
            if (this.options.token) h["Authorization"] = "Bearer " + this.options.token;
            return h;
        }

        async _fetchJson(url, options = {}) {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
            return await response.json();
        }

        _getFieldValue(id) {
            const el = this._id(id);
            if (!el) return "";
            return el.value ?? "";
        }

        _setFieldValue(id, value) {
            const el = this._id(id);
            if (!el) return;
            el.value = value ?? "";
        }

        getId() {
            const value = this._getFieldValue("txtId");
            return value ? parseInt(value, 10) : 0;
        }

        isSoloLectura() {
            return this.modalEl.getAttribute("data-sololectura") === "1";
        }

        setSoloLecturaAttribute(flag) {
            this.modalEl.setAttribute("data-sololectura", flag ? "1" : "0");
        }

        setModalSoloLectura(soloLectura) {
            const disabled = !!soloLectura;
            this.setSoloLecturaAttribute(disabled);

            this.modalEl.querySelectorAll("input, select, textarea").forEach(el => {
                if (el.id === "txtId") return;
                el.disabled = disabled;
                el.readOnly = disabled;
            });

            const btnGuardar = this._id("btnGuardar");
            if (btnGuardar) btnGuardar.classList.toggle("d-none", disabled);
        }

        async abrirNuevo() {
            try {
                this._ultimoModo = "nuevo";
                this._modeloActual = null;

                if (typeof this.options.onBeforeOpen === "function") {
                    await this.options.onBeforeOpen("nuevo", this);
                }

                this.limpiarModal();
                this.setModalSoloLectura(false);

                const chkActivo = this._id("chkActivoCamion");
                const lblActivo = this._id("lblActivoCamion");
                if (chkActivo) chkActivo.checked = true;
                if (lblActivo) lblActivo.textContent = "Activo";

                this._id("modalEdicionLabel").textContent = "Nuevo Camión";
                this._id("btnGuardar").innerHTML = `<i class="fa fa-check"></i> Registrar`;

                this.bsModal.show();

                if (typeof this.options.onOpen === "function") {
                    await this.options.onOpen("nuevo", this);
                }
            } catch (e) {
                console.error(e);
                errorModal("Ha ocurrido un error.");
            }
        }

        async abrirEditar(id) {
            try {
                this._ultimoModo = "editar";
                const url = this._replaceUrl(this.options.endpoints.editar, { id });
                const modelo = await this._fetchJson(url, {
                    method: "GET",
                    headers: this._headers(false)
                });

                await this.mostrarModal(modelo, false);
            } catch (e) {
                console.error(e);
                errorModal("Ha ocurrido un error.");
            }
        }

        async abrirVer(id) {
            this.cerrarErrorCampos();
            try {
                this._ultimoModo = "ver";
                const url = this._replaceUrl(this.options.endpoints.editar, { id });
                const modelo = await this._fetchJson(url, {
                    method: "GET",
                    headers: this._headers(false)
                });
                await this.mostrarModal(modelo, true);
            } catch (e) {
                console.error(e);
                errorModal("Ha ocurrido un error.");
            }
        }

        cerrar() {
            this.bsModal.hide();
        }

        async mostrarModal(modelo, soloLectura = false) {
            if (typeof this.options.onBeforeOpen === "function") {
                await this.options.onBeforeOpen(soloLectura ? "ver" : "editar", this, modelo);
            }

            this._modeloActual = modelo || null;
            this.limpiarModal();
            this.setModalSoloLectura(false);

            this._setFieldValue("txtId", modelo.Id || "");
            this._setFieldValue("txtNombre", modelo.Nombre || "");

            const chkActivo = this._id("chkActivoCamion");
            const lblActivo = this._id("lblActivoCamion");
            if (chkActivo) chkActivo.checked = modelo.Activo !== false;
            if (lblActivo) lblActivo.textContent = (chkActivo && chkActivo.checked) ? "Activo" : "Inactivo";

            this._setAuditoria(modelo);

            this._id("modalEdicionLabel").textContent = soloLectura ? "Ver Camión" : "Editar Camión";
            this._id("btnGuardar").innerHTML = `<i class="fa fa-check"></i> Guardar`;

            this.bsModal.show();
            this.setModalSoloLectura(soloLectura);

            if (typeof this.options.onOpen === "function") {
                await this.options.onOpen(soloLectura ? "ver" : "editar", this, modelo);
            }
        }

        async guardar() {
            if (this.isSoloLectura()) return true;
            if (!this.validarCampos()) return false;

            const id = this._getFieldValue("txtId");

            const modelo = {
                Id: id !== "" ? parseInt(id, 10) : 0,
                Nombre: this._getFieldValue("txtNombre").trim(),
                Activo: this._id("chkActivoCamion") ? this._id("chkActivoCamion").checked : true
            };

            const esNuevo = !modelo.Id;
            const url = esNuevo ? this.options.endpoints.insertar : this.options.endpoints.actualizar;
            const method = esNuevo ? "POST" : "PUT";

            try {
                const data = await this._fetchJson(url, {
                    method,
                    headers: this._headers(true),
                    body: JSON.stringify(modelo)
                });

                if (!data?.valor) {
                    this.mostrarErrorCampos(
                        data?.mensaje || "No se pudo guardar.",
                        data?.idReferencia ?? null,
                        data?.tipo || "validacion"
                    );
                    return false;
                }

                this.cerrarErrorCampos();
                this.cerrar();
                exitoModal(data.mensaje || (esNuevo ? "Camión registrado correctamente" : "Camión modificado correctamente"));

                if (typeof this.options.onSaved === "function") {
                    await this.options.onSaved(data, modelo, this);
                }

                return true;
            } catch (err) {
                console.error(err);
                this.mostrarErrorCampos("Ha ocurrido un error inesperado al guardar.", null, "error");
                return false;
            }
        }

        async eliminar(id) {
            const confirmado = typeof confirmarModal === "function"
                ? await confirmarModal("¿Desea eliminar este camión?")
                : window.confirm("¿Desea eliminar este camión?");

            if (!confirmado) return false;

            try {
                const url = this._replaceUrl(this.options.endpoints.eliminar, { id });
                const data = await this._fetchJson(url, {
                    method: "DELETE",
                    headers: this._headers(false)
                });

                if (!data?.valor) {
                    const msg = data?.mensaje || "No se pudo eliminar.";
                    if (typeof errorModal === "function") {
                        errorModal(msg);
                    } else {
                        this.mostrarErrorCampos(msg, data?.idReferencia ?? null, data?.tipo || "error");
                    }
                    return false;
                }

                if (typeof exitoModal === "function") {
                    exitoModal(data.mensaje || "Camión eliminado correctamente");
                }

                if (typeof this.options.onDeleted === "function") {
                    await this.options.onDeleted(data, id, this);
                }

                return true;
            } catch (e) {
                console.error(e);
                errorModal("Ha ocurrido un error.");
                return false;
            }
        }

        limpiarModal() {
            this.setSoloLecturaAttribute(false);
            this.modalEl.querySelectorAll("input, select, textarea").forEach(el => {
                if (el.id === "txtId") { el.value = ""; return; }
                if (el.tagName === "SELECT") el.selectedIndex = 0;
                else el.value = "";
            });
            this._validacion?.reset();
            this._id("infoAuditoria")?.classList.add("d-none");
            if (this._id("infoRegistro")) this._id("infoRegistro").innerHTML = "";
            if (this._id("infoModificacion")) this._id("infoModificacion").innerHTML = "";
        }

        _valorCampoValido(el) {
            if (!el) return false;
            const valor = (el.value ?? "").toString().trim();
            return valor !== "";
        }

        validarCampos() {
            return this._validacion?.validarTodos() ?? true;
        }

        mostrarErrorCampos(mensaje, idReferencia = null, tipo = "validacion") {
            if (tipo === "validacion") this._validacion?.cancelarPanelExito?.();
            const container = this._id("errorCampos");
            if (window.RpVerFicha?.renderErrorCampos) {
                window.RpVerFicha.renderErrorCampos(container, mensaje, idReferencia, tipo, "verCamion");
                return;
            }
            if (!container) return;

            let titulo = "Campos requeridos";
            let icono = "fa-exclamation-circle";

            if (tipo === "relacion") { titulo = "No se puede eliminar"; icono = "fa-link"; }
            else if (tipo === "error") { titulo = "No se pudo guardar"; icono = "fa-times-circle"; }

            container.innerHTML = `
                <div class="rp-error-box">
                    <div class="rp-error-icon"><i class="fa ${icono}"></i></div>
                    <div class="rp-error-content">
                        <div class="rp-error-title">${titulo}</div>
                        <div class="rp-error-text">${mensaje}</div>
                    </div>
                </div>`;

            container.classList.remove("d-none");
            container.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        cerrarErrorCampos() {
            const container = this._id("errorCampos");
            if (!container) return;
            container.classList.add("d-none");
            container.innerHTML = "";
        }

        _setAuditoria(modelo) {
            const wrap = this._id("infoAuditoria");
            const reg = this._id("infoRegistro");
            const mod = this._id("infoModificacion");
            if (!wrap || !reg || !mod) return;

            reg.innerHTML = "";
            mod.innerHTML = "";
            wrap.classList.add("d-none");

            if (!modelo) return;

            const txtUltimaMod = "\u00DAltima modificaci\u00F3n por";

            if (modelo.UsuarioModifica && modelo.FechaUsuarioModifica) {
                mod.innerHTML = `
                    <div class="rp-auditoria-item">
                        <i class="fa fa-edit"></i>
                        ${txtUltimaMod} <strong>${modelo.UsuarioModifica}</strong>
                        el <strong>${this.formatearFecha(modelo.FechaUsuarioModifica)}</strong>
                    </div>`;
                wrap.classList.remove("d-none");
                return;
            }

            if (modelo.UsuarioRegistra && modelo.FechaUsuarioRegistra) {
                reg.innerHTML = `
                    <div class="rp-auditoria-item">
                        <i class="fa fa-user"></i>
                        Registrado por <strong>${modelo.UsuarioRegistra}</strong>
                        el <strong>${this.formatearFecha(modelo.FechaUsuarioRegistra)}</strong>
                    </div>`;
                wrap.classList.remove("d-none");
            }
        }

        formatearFecha(fecha) {
            try {
                return new Date(fecha).toLocaleString("es-AR");
            } catch {
                return fecha;
            }
        }

        getModeloActual() {
            return this._modeloActual;
        }

        _bindEvents() {
            const guardarBtn = this._id("btnGuardar");
            if (guardarBtn) {
                guardarBtn.addEventListener("click", () => this.guardar());
            }

            const cerrarErrorBtn = this.modalEl.querySelector("#errorCampos .rp-error-close");
            if (cerrarErrorBtn) {
                cerrarErrorBtn.removeAttribute("onclick");
                cerrarErrorBtn.addEventListener("click", () => this.cerrarErrorCampos());
            }

            const chkActivo = this._id("chkActivoCamion");
            const lblActivo = this._id("lblActivoCamion");
            if (chkActivo && lblActivo) {
                chkActivo.addEventListener("change", () => {
                    lblActivo.textContent = chkActivo.checked ? "Activo" : "Inactivo";
                });
            }

            this._validacion?.attachEvents({ select2Namespace: "mcamiones" });
        }
    }

    window.guardarCamion = function () {
        return window.camionModal?.guardar?.();
    };

    window.cerrarErrorCamposCamion = function () {
        return window.camionModal?.cerrarErrorCampos?.();
    };

    function initCamionModal(options = {}) {
        const root = document.querySelector("[data-camion-modal]")
            || document.querySelector(".camion-modal-root");

        if (!root) {
            console.warn("initCamionModal: incluya el partial M_Camiones en la vista.");
            return null;
        }

        const merged = Object.assign({ token: window.token || "" }, options || {});

        if (!window.camionModal || window.camionModal.modalEl !== root) {
            window.camionModal = new CamionModal(root, merged);
        } else {
            Object.assign(window.camionModal.options, merged);
        }

        const abrirVer = (id) => window.camionModal?.abrirVer?.(id);

        window.nuevoCamion = () => window.camionModal?.abrirNuevo?.();
        window.verCamion = abrirVer;
        window.editarCamion = (id) => window.camionModal?.abrirEditar?.(id);
        window.eliminarCamion = (id) => window.camionModal?.eliminar?.(id);

        if (window.RpVerFicha?.registrar) {
            window.RpVerFicha.registrar("verCamion", abrirVer);
        }

        return window.camionModal;
    }

    window.initCamionModal = initCamionModal;
    window.CamionModal = CamionModal;

})(window);
