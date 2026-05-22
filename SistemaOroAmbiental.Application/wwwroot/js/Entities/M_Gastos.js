(function (window) {
    "use strict";

    class GastoModal {

        constructor(root, options = {}) {
            if (!root) throw new Error("GastoModal requiere un root.");

            this.root = root;
            this.options = Object.assign({
                token: window.token || "",
                endpoints: {
                    editar: "/Gastos/EditarInfo?id={id}",
                    insertar: "/Gastos/Insertar",
                    actualizar: "/Gastos/Actualizar",
                    eliminar: "/Gastos/Eliminar?id={id}",
                    categorias: "/GastosCategorias/Lista",
                    cuentas: "/Cuentas/Lista"
                },
                onSaved: null,
                onDeleted: null
            }, options || {});

            this.modalEl = this.root.matches("[data-gasto-modal]")
                ? this.root
                : this.root.querySelector("[data-gasto-modal]");

            if (!this.modalEl) throw new Error("No se encontró [data-gasto-modal].");

            this.bsModal = new bootstrap.Modal(this.modalEl);
            this._ultimoModo = "nuevo";
            this._modeloActual = null;
            this._cuentasCache = [];

            this._camposObligatorios = [
                "txtFecha", "cmbCategoria", "cmbCuenta", "txtConcepto", "txtImporteNeto"
            ];

            this._comboPorController = {
                GastosCategorias: { selectId: "cmbCategoria", url: this.options.endpoints.categorias },
                Cuentas: { selectId: "cmbCuenta", url: this.options.endpoints.cuentas, esCuenta: true }
            };

            this._labelsCampos = {
                txtFecha: "Fecha",
                cmbCategoria: "Categoría",
                cmbCuenta: "Cuenta",
                txtConcepto: "Concepto",
                txtImporteNeto: "Importe neto"
            };

            this._validacion = new ValidacionModalAbm({
                modalEl: this.modalEl,
                getPanel: () => this._id("errorCampos"),
                campos: this._camposObligatorios.map(id => ({
                    id,
                    nombre: this._labelsCampos[id] || id
                })),
                esCampoValido: (el) => this._valorCampoValido(el),
                isSoloLectura: () => this.isSoloLectura(),
                mostrarError: (msg) => this.mostrarErrorCampos(msg, null, "validacion"),
                cerrarPanel: () => this.cerrarErrorCampos()
            });

            window.gastoModal = this;
            this._bindEvents();
            this._bindModalEvents();
            this._bindConfiguracionActualizada();
        }

        _q(s) { return this.modalEl.querySelector(s); }
        _id(id) { return this.modalEl.querySelector(`#${id}`); }

        _replaceUrl(url, values) {
            let r = url;
            Object.keys(values || {}).forEach(k => {
                r = r.replace(`{${k}}`, values[k]);
            });
            return r;
        }

        _headers(json = true) {
            const h = {};
            if (json) h["Content-Type"] = "application/json;charset=utf-8";
            if (this.options.token) h.Authorization = "Bearer " + this.options.token;
            return h;
        }

        async _fetchJson(url, options = {}) {
            const r = await fetch(url, options);
            if (!r.ok) throw new Error(`Error HTTP ${r.status}`);
            return await r.json();
        }

        _getFieldValue(id) {
            const el = this._id(id);
            return el ? (el.value ?? "") : "";
        }

        _setFieldValue(id, value, refreshSelect2 = false) {
            const el = this._id(id);
            if (!el) return;
            el.value = value ?? "";
            if (refreshSelect2) this._refreshSelect2Field(id);
        }

        _getDecimal(id) {
            const v = this._getFieldValue(id);
            if (v === "") return 0;
            return typeof parseNumero === "function" ? parseNumero(v) : parseFloat(v) || 0;
        }

        _etiquetaCuenta(c) {
            const nom = (c.Nombre || "").trim();
            const suc = (c.NombreCombo || "").trim();
            return suc ? `${nom} (${suc})` : nom;
        }

        _refreshSelect2Field(id) {
            const el = this._id(id);
            if (!el || !window.jQuery) return;
            const $el = window.jQuery(el);
            if ($el.data("select2")) $el.trigger("change.select2");
        }

        getSelect2Selection(el) {
            const $el = window.jQuery(el);
            const $container = $el.next(".select2-container");
            return { $selection: $container.find(".select2-selection"), $container };
        }

        isSoloLectura() {
            return this.modalEl.getAttribute("data-sololectura") === "1";
        }

        setSoloLecturaAttribute(flag) {
            this.modalEl.setAttribute("data-sololectura", flag ? "1" : "0");
        }

        ensureSelect2($el, options) {
            if (!$el?.length) return;
            if ($el.data("select2")) $el.select2("destroy");
            $el.select2(Object.assign({
                width: "100%",
                allowClear: true,
                placeholder: "Seleccionar",
                dropdownParent: window.jQuery(this.modalEl)
            }, options || {}));
        }

        inicializarSelect2Modal() {
            if (!window.jQuery?.fn?.select2) return;
            ["cmbCategoria", "cmbCuenta"].forEach(id => {
                this.ensureSelect2(window.jQuery(this._id(id)), {
                    dropdownParent: window.jQuery(this.modalEl)
                });
            });
        }

        setModalSoloLectura(soloLectura) {
            const disabled = !!soloLectura;
            this.setSoloLecturaAttribute(disabled);

            this.modalEl.querySelectorAll("input, select, textarea").forEach(el => {
                if (el.id === "txtId") return;
                el.disabled = disabled;
                if (el.id !== "txtTotalIva" && el.id !== "txtImporteTotal") {
                    el.readOnly = disabled;
                }
            });

            const btn = this._id("btnGuardar");
            if (btn) btn.classList.toggle("d-none", disabled);

            this.modalEl.querySelectorAll(".rp-btn-plus").forEach(b => {
                b.disabled = disabled;
                b.style.display = disabled ? "none" : "";
            });

            this.modalEl.querySelectorAll("select").forEach(el => {
                const $el = window.jQuery(el);
                if ($el.data("select2")) {
                    $el.prop("disabled", el.disabled);
                    $el.trigger("change.select2");
                }
            });
        }

        recalcularTotales() {
            const neto = this._getDecimal("txtImporteNeto");
            const porc = this._getDecimal("txtPorcIva");
            const otros = this._getDecimal("txtOtrosImp");
            const iva = Math.round(neto * porc) / 100;
            const total = neto + iva + otros;
            const fmt = typeof formatearNumero === "function"
                ? formatearNumero
                : (n) => Number(n || 0).toFixed(2);

            this._setFieldValue("txtTotalIva", fmt(iva));
            this._setFieldValue("txtImporteTotal", fmt(total));
        }

        limpiarModal() {
            this.setSoloLecturaAttribute(false);
            this.modalEl.querySelectorAll("input, select, textarea").forEach(el => {
                if (el.id === "txtId") { el.value = ""; return; }
                if (el.tagName === "SELECT") el.selectedIndex = 0;
                else el.value = "";
            });

            this._setFieldValue("txtPorcIva", typeof formatearNumero === "function" ? formatearNumero(21) : "21");
            this._setFieldValue("txtOtrosImp", typeof formatearNumero === "function" ? formatearNumero(0) : "0");
            this.recalcularTotales();
            this._validacion?.reset();

            const aud = this._id("infoAuditoria");
            if (aud) aud.classList.add("d-none");
            if (this._id("infoRegistro")) this._id("infoRegistro").innerHTML = "";
            if (this._id("infoModificacion")) this._id("infoModificacion").innerHTML = "";

            this._refreshAllSelect2();
        }

        _refreshAllSelect2() {
            if (!window.jQuery) return;
            window.jQuery(this.modalEl).find("select").each(function () {
                const $el = window.jQuery(this);
                if ($el.data("select2")) $el.trigger("change.select2");
            });
        }

        resetSelect(id, placeholder) {
            const el = this._id(id);
            if (!el) return;
            el.innerHTML = "";
            el.append(new Option(placeholder || "Seleccionar", ""));
            this._refreshSelect2Field(id);
        }

        async _llenarComboSimple(selectId, url) {
            const data = await this._fetchJson(url, { headers: this._headers(false) });
            const sel = this._id(selectId);
            (data || []).forEach(x => sel.append(new Option(x.Nombre, x.Id)));
        }

        async _llenarComboCuentas() {
            const data = await this._fetchJson(this.options.endpoints.cuentas, { headers: this._headers(false) });
            this._cuentasCache = data || [];
            const sel = this._id("cmbCuenta");
            (this._cuentasCache).forEach(x => {
                sel.append(new Option(this._etiquetaCuenta(x), x.Id));
            });
        }

        async cargarCombos() {
            this.resetSelect("cmbCategoria", "Seleccionar");
            this.resetSelect("cmbCuenta", "Seleccionar");
            await Promise.all([
                this._llenarComboSimple("cmbCategoria", this.options.endpoints.categorias),
                this._llenarComboCuentas()
            ]);
            this.inicializarSelect2Modal();
        }

        _valorCampoValido(el) {
            if (!el) return false;
            const valor = (el.value ?? "").toString().trim();
            if (valor === "" || valor === "Seleccionar") return false;

            if (el.id === "txtImporteNeto") {
                const n = this._getDecimal("txtImporteNeto");
                return n > 0;
            }
            return true;
        }

        validarCampoIndividual(el) {
            return this._validacion?.onBlur(el) ?? true;
        }

        validarCampos() {
            return this._validacion?.validarTodos() ?? true;
        }

        mostrarErrorCampos(mensaje, idReferencia = null, tipo = "validacion") {
            if (tipo === "validacion") this._validacion?.cancelarPanelExito?.();
            const container = this._id("errorCampos");
            if (!container) return;

            let titulo = "Campos requeridos";
            let icono = "fa-exclamation-circle";

            if (tipo === "duplicado") titulo = "Registro duplicado detectado";
            else if (tipo === "relacion") { titulo = "No se puede eliminar"; icono = "fa-link"; }
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

            if (modelo.UsuarioModifica && modelo.FechaUsuarioModifica) {
                mod.innerHTML = `
                    <div class="rp-auditoria-item">
                        <i class="fa fa-edit"></i>
                        Modificado por <strong>${modelo.UsuarioModifica}</strong>
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

        async abrirNuevo() {
            try {
                this._ultimoModo = "nuevo";
                this._modeloActual = null;
                this.limpiarModal();
                this.setModalSoloLectura(false);

                await this.cargarCombos();

                const hoy = new Date().toISOString().slice(0, 10);
                this._setFieldValue("txtFecha", hoy);

                this._id("modalEdicionLabel").textContent = "Nuevo gasto";
                this._id("btnGuardar").innerHTML = `<i class="fa fa-check"></i> Registrar`;

                this.bsModal.show();
            } catch (e) {
                console.error(e);
                errorModal("Ha ocurrido un error.");
            }
        }

        async abrirEditar(id) {
            try {
                this._ultimoModo = "editar";
                const url = this._replaceUrl(this.options.endpoints.editar, { id });
                const modelo = await this._fetchJson(url, { method: "GET", headers: this._headers(false) });
                await this.mostrarModal(modelo, false);
            } catch (e) {
                console.error(e);
                errorModal("No se pudo cargar el gasto.");
            }
        }

        async abrirVer(id) {
            try {
                this._ultimoModo = "ver";
                const url = this._replaceUrl(this.options.endpoints.editar, { id });
                const modelo = await this._fetchJson(url, { method: "GET", headers: this._headers(false) });
                await this.mostrarModal(modelo, true);
            } catch (e) {
                console.error(e);
                errorModal("No se pudo cargar el gasto.");
            }
        }

        async mostrarModal(modelo, soloLectura = false) {
            this._modeloActual = modelo || null;
            this.limpiarModal();
            this.setModalSoloLectura(false);

            await this.cargarCombos();

            this._setFieldValue("txtId", modelo.Id || "");
            this._setFieldValue("txtFecha", (modelo.Fecha || "").toString().split("T")[0]);
            this._setFieldValue("txtNumReferencia", modelo.NumReferencia || "");
            this._setFieldValue("txtConcepto", modelo.Concepto || "");
            this._setFieldValue("txtImporteNeto", typeof formatearNumero === "function"
                ? formatearNumero(modelo.ImporteNeto ?? 0) : (modelo.ImporteNeto ?? 0));
            this._setFieldValue("txtPorcIva", typeof formatearNumero === "function"
                ? formatearNumero(modelo.PorcIva ?? 21) : (modelo.PorcIva ?? 21));
            this._setFieldValue("txtOtrosImp", typeof formatearNumero === "function"
                ? formatearNumero(modelo.OtrosImpuestos ?? 0) : (modelo.OtrosImpuestos ?? 0));
            this.recalcularTotales();
            this._setFieldValue("txtNotaInterna", modelo.NotaInterna || "");

            if (modelo.IdCategoria) this._setFieldValue("cmbCategoria", modelo.IdCategoria, true);
            if (modelo.IdCuenta) this._setFieldValue("cmbCuenta", modelo.IdCuenta, true);

            this._setAuditoria(modelo);

            this._id("modalEdicionLabel").textContent = soloLectura ? "Ver gasto" : "Editar gasto";
            this._id("btnGuardar").innerHTML = `<i class="fa fa-check"></i> Guardar`;

            this.bsModal.show();
            this.setModalSoloLectura(soloLectura);
        }

        _armarModelo() {
            return {
                Id: this.getId(),
                Fecha: this._getFieldValue("txtFecha"),
                IdCategoria: parseInt(this._getFieldValue("cmbCategoria"), 10) || 0,
                IdCuenta: parseInt(this._getFieldValue("cmbCuenta"), 10) || 0,
                NumReferencia: (this._getFieldValue("txtNumReferencia") || "").trim() || null,
                Concepto: (this._getFieldValue("txtConcepto") || "").trim(),
                ImporteNeto: this._getDecimal("txtImporteNeto"),
                PorcIva: this._getDecimal("txtPorcIva"),
                TotalIva: this._getDecimal("txtTotalIva"),
                OtrosImpuestos: this._getDecimal("txtOtrosImp"),
                ImporteTotal: this._getDecimal("txtImporteTotal"),
                NotaInterna: (this._getFieldValue("txtNotaInterna") || "").trim() || null
            };
        }

        getId() {
            const v = this._getFieldValue("txtId");
            return v ? parseInt(v, 10) : 0;
        }

        async guardar() {
            if (this.isSoloLectura()) return true;

            this.recalcularTotales();
            if (!this.validarCampos()) return false;

            const modelo = this._armarModelo();
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
                        data?.mensaje || "No se pudo guardar el gasto.",
                        null,
                        data?.tipo || "validacion"
                    );
                    return false;
                }

                this.cerrarErrorCampos();
                this.bsModal.hide();
                exitoModal(esNuevo ? "Gasto registrado correctamente." : "Gasto actualizado correctamente.");

                if (typeof this.options.onSaved === "function") {
                    await this.options.onSaved(data, modelo, this);
                }
                return true;
            } catch (e) {
                console.error(e);
                this.mostrarErrorCampos("Ha ocurrido un error inesperado al guardar.", null, "error");
                return false;
            }
        }

        async eliminar(id) {
            const ok = typeof confirmarModal === "function"
                ? await confirmarModal("¿Desea eliminar este gasto? Se revertirá el movimiento en caja.")
                : window.confirm("¿Desea eliminar este gasto?");

            if (!ok) return false;

            try {
                const url = this._replaceUrl(this.options.endpoints.eliminar, { id });
                const data = await this._fetchJson(url, { method: "DELETE", headers: this._headers(false) });

                if (!data?.valor) {
                    errorModal("No se pudo eliminar el gasto.");
                    return false;
                }

                exitoModal("Gasto eliminado correctamente.");
                if (typeof this.options.onDeleted === "function") {
                    await this.options.onDeleted(data, id, this);
                }
                return true;
            } catch (e) {
                console.error(e);
                errorModal("Error al eliminar.");
                return false;
            }
        }

        async _recargarCombo(selectId, url, esCuenta) {
            const el = this._id(selectId);
            const valorActual = el?.value;
            if (!el) return;

            el.innerHTML = "";
            el.append(new Option("Seleccionar", ""));

            if (esCuenta) {
                await this._llenarComboCuentas();
            } else {
                await this._llenarComboSimple(selectId, url);
            }

            this._refreshSelect2Field(selectId);

            if (valorActual && Array.from(el.options).some(o => o.value === valorActual)) {
                this._setFieldValue(selectId, valorActual, true);
            }
        }

        async _onConfiguracionActualizada(detail) {
            const cfg = this._comboPorController[detail?.tipo];
            if (!cfg) return;

            await this._recargarCombo(cfg.selectId, cfg.url, !!cfg.esCuenta);

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
                    console.error(err);
                }
            };
            document.addEventListener("configuracionActualizada", this._configListener);
        }

        _bindEvents() {
            const btn = this._id("btnGuardar");
            if (btn) {
                btn.removeAttribute("onclick");
                btn.addEventListener("click", () => this.guardar());
            }

            const cerrarBtn = this.modalEl.querySelector("#errorCampos .rp-error-close");
            if (cerrarBtn) {
                cerrarBtn.removeAttribute("onclick");
                cerrarBtn.addEventListener("click", () => this.cerrarErrorCampos());
            }

            this.modalEl.addEventListener("input", (e) => {
                const target = e.target;
                if (target?.id === "txtImporteNeto" || target?.id === "txtPorcIva" || target?.id === "txtOtrosImp") {
                    this.recalcularTotales();
                }
            });

            this.modalEl.addEventListener("change", (e) => {
                const target = e.target;
                if (target?.id === "txtImporteNeto" || target?.id === "txtPorcIva" || target?.id === "txtOtrosImp") {
                    this.recalcularTotales();
                }
            });

            this._validacion?.attachEvents({ select2Namespace: "mgastos" });
        }

        _bindModalEvents() {
            this.modalEl.addEventListener("shown.bs.modal", () => {
                this.inicializarSelect2Modal();
                if (typeof aplicarFormatoMiles === "function") aplicarFormatoMiles();
            });
        }
    }

    window.cerrarErrorCamposGasto = function () {
        return window.gastoModal?.cerrarErrorCampos?.();
    };

    function initGastoModal(options = {}) {
        const root = document.querySelector("[data-gasto-modal]") || document.querySelector(".gasto-modal-root");
        if (!root) {
            console.warn("initGastoModal: incluya el partial M_Gastos en la vista.");
            return null;
        }

        const merged = Object.assign({ token: window.token || "" }, options || {});

        if (!window.gastoModal || window.gastoModal.modalEl !== root) {
            window.gastoModal = new GastoModal(root, merged);
        } else {
            Object.assign(window.gastoModal.options, merged);
        }

        window.nuevoGasto = () => window.gastoModal?.abrirNuevo?.();
        window.verGasto = (id) => window.gastoModal?.abrirVer?.(id);
        window.editarGasto = (id) => window.gastoModal?.abrirEditar?.(id);
        window.eliminarGasto = (id) => window.gastoModal?.eliminar?.(id);

        return window.gastoModal;
    }

    window.initGastoModal = initGastoModal;
    window.GastoModal = GastoModal;

})(window);
