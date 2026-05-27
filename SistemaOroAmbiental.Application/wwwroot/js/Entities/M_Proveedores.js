(function (window) {
    "use strict";

    class ProveedorModal {

        constructor(root, options = {}) {

            if (!root) {
                throw new Error("ProveedorModal requiere un root.");
            }

            this.root = root;

            this.options = Object.assign({
                token: window.token || "",
                endpoints: {
                    editar: "/Proveedores/EditarInfo?id={id}",
                    insertar: "/Proveedores/Insertar",
                    actualizar: "/Proveedores/Actualizar",
                    eliminar: "/Proveedores/Eliminar?id={id}",
                    condicionesIva: "/CondicionesIva/Lista",
                    bancos: "/Bancos/Lista"
                },
                onSaved: null,
                onDeleted: null,
                onBeforeOpen: null,
                onOpen: null,
                onGuardarModelo: null
            }, options || {});

            this.modalEl = this.root.matches("[data-proveedor-modal]")
                ? this.root
                : this.root.querySelector("[data-proveedor-modal]");

            if (!this.modalEl) {
                throw new Error("No se encontr� [data-proveedor-modal].");
            }

            this.bsModal = new bootstrap.Modal(this.modalEl);
            this._ultimoModo = "nuevo";
            this._modeloActual = null;

            this._camposObligatorios = ["txtNombre", "txtCuit", "cmbCondicionIva"];
            this._validacion = new ValidacionModalAbm({
                modalEl: this.modalEl,
                getPanel: () => this._id("errorCampos"),
                campos: [
                    { id: "txtNombre", nombre: "Nombre" },
                    { id: "txtCuit", nombre: "CUIT" },
                    { id: "cmbCondicionIva", nombre: "Condición IVA" }
                ],
                esCampoValido: (el) => this._valorCampoValido(el),
                isSoloLectura: () => this.isSoloLectura(),
                mostrarError: (msg) => this.mostrarErrorCampos(msg, null, "validacion"),
                cerrarPanel: () => this.cerrarErrorCampos()
            });
            this._comboPorController = {
                CondicionesIva: { selectId: "cmbCondicionIva", url: this.options.endpoints.condicionesIva },
                Bancos: { selectId: "cmbBanco", url: this.options.endpoints.bancos }
            };

            window.proveedorModal = this;
            this._bindEvents();
            this._bindModalEvents();
            this._bindConfiguracionActualizada();
        }

        _q(selector) { return this.modalEl.querySelector(selector); }
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

        _toInt(value) {
            if (value === null || value === undefined || value === "") return null;
            const n = parseInt(value, 10);
            return Number.isNaN(n) ? null : n;
        }

        _getFieldValue(id) {
            const el = this._id(id);
            if (!el) return "";
            return el.value ?? "";
        }

        _setFieldValue(id, value, refreshSelect2 = false) {
            const el = this._id(id);
            if (!el) return;
            el.value = value ?? "";
            if (refreshSelect2) this._refreshSelect2Field(id);
        }

        _getIntOrNull(id) {
            return this._toInt(this._getFieldValue(id));
        }

        _refreshSelect2Field(id) {
            const el = this._id(id);
            if (!el || !window.jQuery) return;
            const $el = window.jQuery(el);
            if ($el.data("select2")) $el.trigger("change.select2");
        }

        _refreshAllSelect2() {
            if (!window.jQuery) return;
            window.jQuery(this.modalEl).find("select").each(function () {
                const $el = window.jQuery(this);
                if ($el.data("select2")) $el.trigger("change.select2");
            });
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

        ensureSelect2($el, options) {
            if (!$el || !$el.length) return;
            if ($el.data("select2")) $el.select2("destroy");
            $el.select2(Object.assign({
                width: "100%",
                allowClear: true,
                placeholder: "Seleccionar",
                dropdownParent: window.jQuery(this.modalEl)
            }, options || {}));
        }

        getSelect2Selection(el) {
            const $el = window.jQuery(el);
            const $container = $el.next(".select2-container");
            const $selection = $container.find(".select2-selection");
            return { $selection, $container };
        }

        inicializarSelect2Modal() {
            if (!window.jQuery?.fn?.select2) return;
            const opts = {
                width: "100%",
                dropdownParent: window.jQuery(this.modalEl),
                allowClear: true,
                placeholder: "Seleccionar"
            };
            ["cmbCondicionIva", "cmbBanco"].forEach(id => {
                this.ensureSelect2(window.jQuery(this._id(id)), opts);
            });
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

            this.modalEl.querySelectorAll(".rp-btn-plus").forEach(btn => {
                btn.disabled = disabled;
                btn.style.display = disabled ? "none" : "";
            });

            this.modalEl.querySelectorAll("select").forEach(el => {
                const $el = window.jQuery(el);
                if ($el.data("select2")) {
                    $el.prop("disabled", el.disabled);
                    $el.trigger("change.select2");
                }
            });
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

                await this.cargarCombos();

                this._id("modalEdicionLabel").textContent = "Nuevo Proveedor";
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

            await this.cargarCombos();

            this._setFieldValue("txtId", modelo.Id || "");
            this._setFieldValue("txtNombre", modelo.Nombre || "");
            this._setFieldValue("txtCuit", modelo.Cuit || "");
            this._setFieldValue("txtTelefono", modelo.Telefono || "");
            this._setFieldValue("txtEmail", modelo.Email || "");
            this._setFieldValue("txtAliasBancario", modelo.AliasBancario || "");
            this._setFieldValue("txtCbuBancario", modelo.CbuBancario || "");

            if (modelo.IdCondicionIva) this._setFieldValue("cmbCondicionIva", modelo.IdCondicionIva, true);
            if (modelo.IdBanco) this._setFieldValue("cmbBanco", modelo.IdBanco, true);

            this._setAuditoria(modelo);

            this._id("modalEdicionLabel").textContent = soloLectura ? "Ver Proveedor" : "Editar Proveedor";
            this._id("btnGuardar").innerHTML = `<i class="fa fa-check"></i> Guardar`;

            this.bsModal.show();
            this.setModalSoloLectura(soloLectura);

            if (typeof this.options.onOpen === "function") {
                await this.options.onOpen(soloLectura ? "ver" : "editar", this, modelo);
            }
        }

        resetSelect(id, placeholder) {
            const el = this._id(id);
            if (!el) return;
            el.innerHTML = "";
            el.append(new Option(placeholder || "Seleccionar", ""));
            this._refreshSelect2Field(id);
        }

        async _llenarCombo(selectId, url) {
            const data = await this._fetchJson(url, { headers: this._headers(false) });
            const select = this._id(selectId);
            (data || []).forEach(x => select.append(new Option(x.Nombre, x.Id)));
        }

        async cargarCombos() {
            this.resetSelect("cmbCondicionIva", "Seleccionar");
            this.resetSelect("cmbBanco", "Seleccionar");

            await Promise.all([
                this._llenarCombo("cmbCondicionIva", this.options.endpoints.condicionesIva),
                this._llenarCombo("cmbBanco", this.options.endpoints.bancos)
            ]);

            this.inicializarSelect2Modal();
        }

        async guardar() {
            if (this.isSoloLectura()) return true;
            if (!this.validarCampos()) return false;

            const id = this._getFieldValue("txtId");

            const modelo = {
                Id: id !== "" ? parseInt(id, 10) : 0,
                Nombre: this._getFieldValue("txtNombre"),
                Cuit: this._getFieldValue("txtCuit"),
                Telefono: this._getFieldValue("txtTelefono"),
                Email: this._getFieldValue("txtEmail"),
                IdCondicionIva: this._getIntOrNull("cmbCondicionIva"),
                IdBanco: this._getIntOrNull("cmbBanco"),
                AliasBancario: this._getFieldValue("txtAliasBancario"),
                CbuBancario: this._getFieldValue("txtCbuBancario")
            };

            if (typeof this.options.onGuardarModelo === "function") {
                const result = await this.options.onGuardarModelo(modelo, this);
                if (result === false) return false;
            }

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
                exitoModal(data.mensaje || (esNuevo ? "Proveedor registrado correctamente" : "Proveedor modificado correctamente"));

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
            if (typeof window.ejecutarEliminacionEntidad !== "function") {
                errorModal("No está disponible el asistente de eliminación.");
                return false;
            }

            const resultado = await window.ejecutarEliminacionEntidad({
                entidadLabel: "este proveedor",
                urlDependencias: `/Proveedores/DependenciasEliminar?id=${id}`,
                urlEliminar: cascada => `/Proveedores/Eliminar?id=${id}&cascada=${cascada ? "true" : "false"}`,
                headers: this._headers(false),
                fetchJson: (url, options) => this._fetchJson(url, options)
            });

            if (resultado.accion !== "ok") return false;

            const data = resultado.data;
            if (typeof exitoModal === "function") {
                exitoModal(data?.mensaje ?? data?.Mensaje ?? "Proveedor eliminado correctamente");
            }

            if (typeof this.options.onDeleted === "function") {
                await this.options.onDeleted(data, id, this);
            }

            return true;
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
            this._refreshAllSelect2();
        }

        _valorCampoValido(el) {
            const valor = (el?.value ?? "").toString().trim();
            return valor !== "" && valor !== "Seleccionar";
        }

        validarCampoIndividual(el) {
            return this._validacion?.onBlur(el) ?? true;
        }

        validarCampos() {
            return this._validacion?.validarTodos() ?? true;
        }

        async _recargarCombo(selectId, url) {
            const el = this._id(selectId);
            if (!el) return;

            const valorActual = el.value;
            el.innerHTML = "";
            el.append(new Option("Seleccionar", ""));

            const data = await this._fetchJson(url, { headers: this._headers(false) });
            (data || []).forEach(x => el.append(new Option(x.Nombre, x.Id)));

            this._refreshSelect2Field(selectId);

            if (valorActual && Array.from(el.options).some(o => o.value === valorActual)) {
                this._setFieldValue(selectId, valorActual, true);
            }
        }

        async _onConfiguracionActualizada(detail) {
            const cfg = this._comboPorController[detail?.tipo];
            if (!cfg) return;

            await this._recargarCombo(cfg.selectId, cfg.url);

            if (detail.nuevoId) {
                this._setFieldValue(cfg.selectId, detail.nuevoId, true);
                const el = this._id(cfg.selectId);
                if (el) this._validacion?.onSelect2Change(el);
            }
        }

        _bindConfiguracionActualizada() {
            if (this._configListener) return;

            this._configListener = async (e) => {
                try {
                    await this._onConfiguracionActualizada(e.detail || {});
                } catch (err) {
                    console.error("Error recargando combo tras configuración", err);
                }
            };

            document.addEventListener("configuracionActualizada", this._configListener);
        }

        mostrarErrorCampos(mensaje, idReferencia = null, tipo = "validacion") {
            if (tipo === "validacion") this._validacion?.cancelarPanelExito?.();
            const container = this._id("errorCampos");
            if (window.RpVerFicha?.renderErrorCampos) {
                window.RpVerFicha.renderErrorCampos(container, mensaje, idReferencia, tipo, "verProveedor");
                return;
            }
            if (!container) return;

            let titulo = "Campos requeridos";
            let icono = "fa-exclamation-circle";

            if (tipo === "duplicado") titulo = "Registro duplicado detectado";
            else if (tipo === "relacion") { titulo = "No se puede eliminar"; icono = "fa-link"; }
            else if (tipo === "error") { titulo = "No se pudo guardar"; icono = "fa-times-circle"; }

            let botonReferencia = "";
            if (idReferencia) {
                botonReferencia = window.RpVerFicha?.botonHtml
                    ? window.RpVerFicha.botonHtml(idReferencia, "verProveedor")
                    : `
                    <button class="rp-btn-ref" data-rp-ver-ficha data-id="${idReferencia}" data-handler="verProveedor">
                        <i class="fa fa-eye me-1"></i> Abrir ficha existente �??
                    </button>`;
            }

            container.innerHTML = `
                <div class="rp-error-box">
                    <div class="rp-error-icon"><i class="fa ${icono}"></i></div>
                    <div class="rp-error-content">
                        <div class="rp-error-title">${titulo}</div>
                        <div class="rp-error-text">${mensaje}</div>
                    </div>
                    ${botonReferencia}
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
                guardarBtn.removeAttribute("onclick");
                guardarBtn.addEventListener("click", () => this.guardar());
            }

            const cerrarErrorBtn = this.modalEl.querySelector("#errorCampos .rp-error-close");
            if (cerrarErrorBtn) {
                cerrarErrorBtn.removeAttribute("onclick");
                cerrarErrorBtn.addEventListener("click", () => this.cerrarErrorCampos());
            }

            this._validacion?.attachEvents({ select2Namespace: "mproveedores" });
        }

        _bindModalEvents() {
            this.modalEl.addEventListener("shown.bs.modal", () => {
                this.inicializarSelect2Modal();
            });
        }
    }

    window.guardarProveedor = function () {
        return window.proveedorModal?.guardar?.();
    };

    window.cerrarErrorCampos = function () {
        return window.proveedorModal?.cerrarErrorCampos?.();
    };

    /**
     * Inicializa (o reconfigura) el modal M_Proveedores de la página.
     */
    function initProveedorModal(options = {}) {
        const root = document.querySelector("[data-proveedor-modal]")
            || document.querySelector(".proveedor-modal-root");

        if (!root) {
            console.warn("initProveedorModal: incluya el partial M_Proveedores en la vista.");
            return null;
        }

        const merged = Object.assign({ token: window.token || "" }, options || {});

        if (!window.proveedorModal || window.proveedorModal.modalEl !== root) {
            window.proveedorModal = new ProveedorModal(root, merged);
        } else {
            Object.assign(window.proveedorModal.options, merged);
        }

        const abrirVer = (id) => window.proveedorModal?.abrirVer?.(id);

        window.nuevoProveedor = () => window.proveedorModal?.abrirNuevo?.();
        window.verProveedor = abrirVer;
        window.editarProveedor = (id) => window.proveedorModal?.abrirEditar?.(id);
        window.eliminarProveedor = (id) => window.proveedorModal?.eliminar?.(id);
        window.verFichaProveedor = abrirVer;

        if (window.RpVerFicha?.registrar) {
            window.RpVerFicha.registrar("verProveedor", abrirVer);
            window.RpVerFicha.registrar("verFichaProveedor", abrirVer);
        }

        return window.proveedorModal;
    }

    window.initProveedorModal = initProveedorModal;
    window.ProveedorModal = ProveedorModal;

})(window);