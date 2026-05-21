(function (window) {
    "use strict";

    class ClienteModal {

        constructor(root, options = {}) {

            if (!root) {
                throw new Error("ClienteModal requiere un root.");
            }

            this.root = root;

            this.options = Object.assign({
                token: window.token || "",
                endpoints: {
                    editar: "/Clientes/EditarInfo?id={id}",
                    insertar: "/Clientes/Insertar",
                    actualizar: "/Clientes/Actualizar",
                    eliminar: "/Clientes/Eliminar?id={id}",

                    paises: "/Paises/Lista",
                    provincias: "/PaisesProvincia/ListaPais?idPais={idPais}",
                    provinciasLista: "/PaisesProvincia/Lista",
                    tiposDocumento: "/PaisesTiposDocumentos/Lista",
                    condicionesIva: "/PaisesCondicionesIVA/Lista",
                    productoras: "/Productoras/Lista"
                },

                onSaved: null,
                onDeleted: null,
                onBeforeOpen: null,
                onOpen: null,
                onGuardarModelo: null,
                onAfterRenderChecklist: null
            }, options || {});

            this.modalEl = this.root.matches("[data-cliente-modal]")
                ? this.root
                : this.root.querySelector("[data-cliente-modal]");

            if (!this.modalEl) {
                throw new Error("No se encontró [data-cliente-modal].");
            }

            this.bsModal = new bootstrap.Modal(this.modalEl);

            // =========================
            // ESTADO INTERNO
            // =========================
            this.productorasCache = [];
            this.productorasSeleccionadas = [];
            this.productorasAutomaticas = [];
            this.productorasDesdeProductora = [];

            this._ultimoModo = "nuevo";
            this._modeloActual = null;
            this._forzandoRenderChecklist = false;

            // importante para inline onclicks
            window.clienteModal = this;

            this._bindEvents();
            this._bindModalEvents();
        }

        /* =========================================================
           HELPERS DOM
        ========================================================= */

        _q(selector) {
            return this.modalEl.querySelector(selector);
        }

        _qa(selector) {
            return Array.from(this.modalEl.querySelectorAll(selector));
        }

        _id(id) {
            return this.modalEl.querySelector(`#${id}`);
        }

        _replaceUrl(url, values) {
            let result = url;

            Object.keys(values || {}).forEach(key => {
                result = result.replace(`{${key}}`, values[key]);
            });

            return result;
        }

        _headers(json = true) {
            const h = {};

            if (json) {
                h["Content-Type"] = "application/json;charset=utf-8";
            }

            if (this.options.token) {
                h["Authorization"] = "Bearer " + this.options.token;
            }

            return h;
        }

        async _fetchJson(url, options = {}) {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}`);
            }

            return await response.json();
        }

        _safeArray(arr) {
            return Array.isArray(arr) ? arr : [];
        }

        _toInt(value) {
            if (value === null || value === undefined || value === "") return null;
            const n = parseInt(value, 10);
            return Number.isNaN(n) ? null : n;
        }

        _toIntArray(arr) {
            return this._safeArray(arr)
                .map(x => parseInt(x, 10))
                .filter(x => !Number.isNaN(x));
        }

        _isNullOrEmpty(value) {
            return value === null || value === undefined || String(value).trim() === "";
        }

        _normalizeText(value) {
            if (value === null || value === undefined) return "";
            return String(value).trim();
        }

        _normalizeLower(value) {
            return this._normalizeText(value).toLowerCase();
        }

        _dispatchChange(el) {
            if (!el) return;
            el.dispatchEvent(new Event("change", { bubbles: true }));
        }

        _dispatchInput(el) {
            if (!el) return;
            el.dispatchEvent(new Event("input", { bubbles: true }));
        }

        _setTitulo(texto) {
            const el = this._id("modalEdicionLabel");
            if (el) el.textContent = texto || "";
        }

        _setTextoGuardar(texto) {
            const btn = this._id("btnGuardar");
            if (!btn) return;

            btn.innerHTML = `<i class="fa fa-check"></i> ${texto || "Guardar"}`;
        }

        _scrollToTopBody() {
            const body = this.modalEl.querySelector(".modal-body");
            if (!body) return;
            body.scrollTop = 0;
        }

        _getFieldValue(id) {
            const el = this._id(id);
            if (!el) return "";

            if (el.type === "checkbox") {
                return !!el.checked;
            }

            return el.value ?? "";
        }

        _setFieldValue(id, value, refreshSelect2 = false) {
            const el = this._id(id);
            if (!el) return;

            if (el.type === "checkbox") {
                el.checked = !!value;
            } else {
                el.value = value ?? "";
            }

            if (refreshSelect2) {
                this._refreshSelect2Field(id);
            }
        }

        _getIntOrNull(id) {
            return this._toInt(this._getFieldValue(id));
        }

        _refreshSelect2Field(id) {
            const el = this._id(id);
            if (!el || !window.jQuery) return;

            const $el = window.jQuery(el);
            if ($el.data("select2")) {
                $el.trigger("change.select2");
            }
        }

        _refreshAllSelect2() {
            if (!window.jQuery) return;

            window.jQuery(this.modalEl).find("select").each(function () {
                const $el = window.jQuery(this);
                if ($el.data("select2")) {
                    $el.trigger("change.select2");
                }
            });
        }

        _getTabButtonByTarget(target) {
            return this.modalEl.querySelector(`button[data-bs-target="${target}"]`);
        }

        _showTab(target) {
            const btn = this._getTabButtonByTarget(target);
            if (!btn) return;

            const tab = new bootstrap.Tab(btn);
            tab.show();
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

        /* =========================================================
           SELECT2
        ========================================================= */

        ensureSelect2($el, options) {
            if (!$el || !$el.length) return;

            if ($el.data("select2")) {
                $el.select2("destroy");
            }

            $el.select2(Object.assign({
                width: "100%",
                allowClear: true,
                placeholder: "Seleccionar",
                dropdownParent: window.jQuery(this.modalEl)
            }, options || {}));
        }

        inicializarSelect2Modal() {
            if (!window.jQuery || !window.jQuery.fn || !window.jQuery.fn.select2) return;

            const opts = {
                width: "100%",
                dropdownParent: window.jQuery(this.modalEl),
                allowClear: true,
                placeholder: "Seleccionar"
            };

            this.ensureSelect2(window.jQuery(this._id("cmbPais")), opts);
            this.ensureSelect2(window.jQuery(this._id("cmbProvincia")), opts);
            this.ensureSelect2(window.jQuery(this._id("cmbTipoDocumento")), opts);
            this.ensureSelect2(window.jQuery(this._id("cmbCondicionIva")), opts);
        }

        getSelect2Selection(el) {
            const $el = window.jQuery(el);
            const $container = $el.next(".select2-container");
            const $selection = $container.find(".select2-selection");
            return { $selection, $container };
        }

        /* =========================================================
           ESTADO SOLO LECTURA
        ========================================================= */

        setModalSoloLectura(soloLectura) {
            const disabled = !!soloLectura;

            this.setSoloLecturaAttribute(disabled);

            this._qa("input, select, textarea").forEach(el => {
                const id = el.id || "";


                if (id === "txtId") return;

                if (el.type === "checkbox") {
                    if (id === "chkAsociacionAutomatica") {
                        el.disabled = true;
                    } else {
                        el.disabled = disabled;
                    }
                } else {
                    el.disabled = disabled;
                    el.readOnly = disabled;
                }
            });


            // buscador checklist
            const buscador = this._id("txtBuscarProductora");
            if (buscador) {
                buscador.disabled = false;
                buscador.readOnly = false;
            }

            // botón guardar
            const btnGuardar = this._id("btnGuardar");
            if (btnGuardar) {
                btnGuardar.classList.toggle("d-none", disabled);
            }

            // select2 disabled state
            this._qa("select").forEach(el => {
                const $el = window.jQuery(el);
                if ($el.data("select2")) {
                    $el.prop("disabled", el.disabled);
                    $el.trigger("change.select2");
                }
            });

            // checklist manual: si es solo lectura, los manuales también quedan deshabilitados visualmente
            this._applySoloLecturaToChecklist(disabled);
        }

        _applySoloLecturaToChecklist(soloLectura) {
            const items = this._qa("#listaProductoras input[type='checkbox']");
            if (!items.length) return;

            items.forEach(chk => {
                const id = this._toInt(chk.value);

                const esAuto = this.productorasAutomaticas.includes(id);
                const esDesde = this.productorasDesdeProductora.includes(id);

                // 🔥 TODOS quedan deshabilitados en modo ver (pero solo checkbox)
                if (soloLectura) {
                    chk.disabled = true;
                    return;
                }

                // modo edición normal
                if (esAuto || esDesde) {
                    chk.disabled = true;
                } else {
                    chk.disabled = false;
                }
            });
        }

        /* =========================================================
           OPEN / CLOSE
        ========================================================= */

        async abrirNuevo() {
            try {

                if (!Permisos.tiene("Clientes", "Crear")) {
                    errorModal("No tenés permisos.");
                    return;
                }

                this._ultimoModo = "nuevo";
                this._modeloActual = null;

                if (typeof this.options.onBeforeOpen === "function") {
                    await this.options.onBeforeOpen("nuevo", this);
                }

                this.limpiarModal();
                this.setModalSoloLectura(false);

                this.productorasSeleccionadas = [];
                this.productorasAutomaticas = [];
                this.productorasDesdeProductora = [];

                await Promise.all([
                    this.listaPaises(),
                    this.cargarProductorasChecklist(true)
                ]);

                this.resetSelect("cmbProvincia", "Seleccionar");
                this.resetSelect("cmbTipoDocumento", "Seleccionar");
                this.resetSelect("cmbCondicionIva", "Seleccionar");

                this.inicializarSelect2Modal();

                this.renderChecklistProductoras();
                this.activarBuscadorProductoras();
                this.actualizarContadorProductoras();

                this._setTextoGuardar("Registrar");
                this._setTitulo("Nuevo Cliente");

                const chk = this._id("chkAsociacionAutomatica");
                if (chk) {
                    chk.checked = true;
                    chk.disabled = true;
                }

                const infoAuditoria = this._id("infoAuditoria");
                const infoRegistro = this._id("infoRegistro");
                const infoModificacion = this._id("infoModificacion");

                if (infoAuditoria) infoAuditoria.classList.add("d-none");
                if (infoRegistro) infoRegistro.innerHTML = "";
                if (infoModificacion) infoModificacion.innerHTML = "";

                this._showTab("#tabDatosCliente");
                this._scrollToTopBody();

                this.bsModal.show();

                if (typeof this.options.onOpen === "function") {
                    await this.options.onOpen("nuevo", this);
                }

            } catch (e) {
                console.error(e);
                if (typeof window.errorModal === "function") {
                    window.errorModal("Ha ocurrido un error.");
                }
            }
        }

        async abrirEditar(id) {
            try {

                if (!Permisos.tiene("Clientes", "Editar")) {
                    errorModal("No tenés permisos.");
                    return;
                }

                this._ultimoModo = "editar";

                const url = this._replaceUrl(this.options.endpoints.editar, { id });

                const modelo = await this._fetchJson(url, {
                    method: "GET",
                    headers: this._headers(false)
                });

                await this.mostrarModal(modelo, false);

            } catch (e) {
                console.error(e);
                if (typeof window.errorModal === "function") {
                    window.errorModal("Ha ocurrido un error.");
                }
            }
        }

        async abrirVer(id) {
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
                if (typeof window.errorModal === "function") {
                    window.errorModal("Ha ocurrido un error.");
                }
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
            this._setFieldValue("txtTelefono", modelo.Telefono || "");
            this._setFieldValue("txtTelefonoAlternativo", modelo.TelefonoAlternativo || "");
            this._setFieldValue("txtEmail", modelo.Email || "");
            this._setFieldValue("txtDni", modelo.Dni || "");
            this._setFieldValue("txtNumeroDocumento", modelo.NumeroDocumento || "");
            this._setFieldValue("txtDireccion", modelo.Direccion || "");
            this._setFieldValue("txtLocalidad", modelo.Localidad || "");
            this._setFieldValue("txtEntreCalles", modelo.EntreCalles || "");
            this._setFieldValue("txtCodigoPostal", modelo.CodigoPostal || "");

            await Promise.all([
                this.listaPaises(),
                this.cargarProductorasChecklist(true)
            ]);

            if (modelo.IdPais != null) {
                this._setFieldValue("cmbPais", modelo.IdPais, true);

                await this.listaTiposDocumento(modelo.IdPais);
                await this.listaCondicionesIva(modelo.IdPais);
                await this.listaProvincias(modelo.IdPais);
            } else {
                this.resetSelect("cmbProvincia", "Seleccionar");
                this.resetSelect("cmbTipoDocumento", "Seleccionar");
                this.resetSelect("cmbCondicionIva", "Seleccionar");
            }

            if (modelo.IdTipoDocumento != null) {
                this._setFieldValue("cmbTipoDocumento", modelo.IdTipoDocumento, true);
            }

            if (modelo.IdCondicionIva != null) {
                this._setFieldValue("cmbCondicionIva", modelo.IdCondicionIva, true);
            }

            if (modelo.IdProvincia != null) {
                this._setFieldValue("cmbProvincia", modelo.IdProvincia, true);
            }

            this.productorasSeleccionadas = this._toIntArray(
                modelo.ProductorasManualIds ||
                modelo.ProductorasIds ||
                []
            );

            this.productorasAutomaticas = this._toIntArray(
                modelo.ProductorasAutomaticasIds || []
            );

            this.productorasDesdeProductora = this._toIntArray(
                modelo.ProductorasDesdeProductoraIds || []
            );

            // deduplicación fuerte
            this._normalizarArraysProductoras();

            this.renderChecklistProductoras();
            this.activarBuscadorProductoras();
            this.actualizarContadorProductoras();

            const chk = this._id("chkAsociacionAutomatica");
            if (chk) {
                chk.checked = true;
                chk.disabled = true;
            }

            this._setAuditoria(modelo);

            this._setTextoGuardar("Guardar");
            this._setTitulo(soloLectura ? "Ver Cliente" : "Editar Cliente");

            this._showTab("#tabDatosCliente");
            this._scrollToTopBody();

            this.bsModal.show();
            this.setModalSoloLectura(soloLectura);

            if (typeof this.options.onOpen === "function") {
                await this.options.onOpen(soloLectura ? "ver" : "editar", this, modelo);
            }
        }

        /* =========================================================
           CRUD
        ========================================================= */

        async guardar() {
            if (this.isSoloLectura()) return true;
            if (!this.validarCampos()) return false;

            const id = this._getFieldValue("txtId");

            const asociacionAutomatica = this._getFieldValue("chkAsociacionAutomatica")
                ? 1
                : 0;

            this._normalizarArraysProductoras();

            const modelo = {
                Id: id !== "" ? parseInt(id, 10) : 0,

                Nombre: this._getFieldValue("txtNombre"),
                Telefono: this._getFieldValue("txtTelefono"),
                TelefonoAlternativo: this._getFieldValue("txtTelefonoAlternativo"),
                Email: this._getFieldValue("txtEmail"),

                Dni: this._getFieldValue("txtDni"),

                AsociacionAutomatica: asociacionAutomatica,
                ProductorasIds: [...this.productorasSeleccionadas],

                IdPais: this._getIntOrNull("cmbPais"),
                IdProvincia: this._getIntOrNull("cmbProvincia"),

                IdTipoDocumento: this._getIntOrNull("cmbTipoDocumento"),
                NumeroDocumento: this._getFieldValue("txtNumeroDocumento"),

                IdCondicionIva: this._getIntOrNull("cmbCondicionIva"),

                Direccion: this._getFieldValue("txtDireccion"),
                Localidad: this._getFieldValue("txtLocalidad"),
                EntreCalles: this._getFieldValue("txtEntreCalles"),
                CodigoPostal: this._getFieldValue("txtCodigoPostal")
            };

            if (typeof this.options.onGuardarModelo === "function") {
                const result = await this.options.onGuardarModelo(modelo, this);
                if (result === false) return false;
            }

            const esNuevo = !modelo.Id;

            const url = esNuevo
                ? this.options.endpoints.insertar
                : this.options.endpoints.actualizar;

            const method = esNuevo ? "POST" : "PUT";

            try {
                const data = await this._fetchJson(url, {
                    method,
                    headers: this._headers(true),
                    body: JSON.stringify(modelo)
                });

                if (!data || data.valor === undefined) {
                    this.mostrarErrorCampos("Respuesta inválida del servidor.", null, "error");
                    return false;
                }

                if (!data.valor) {
                    let tipoError = data.tipo;

                    if (!tipoError) {
                        if (data.idReferencia) tipoError = "duplicado";
                        else if ((data.mensaje || "").toLowerCase().includes("no se puede")) tipoError = "relacion";
                        else tipoError = "validacion";
                    }

                    this.mostrarErrorCampos(
                        data.mensaje || "No se pudo guardar.",
                        data.idReferencia ?? null,
                        tipoError
                    );

                    return false;
                }

                this.cerrarErrorCampos();
                this.cerrar();

                if (typeof window.exitoModal === "function") {
                    window.exitoModal(
                        data.mensaje ||
                        (esNuevo
                            ? "Cliente registrado correctamente"
                            : "Cliente modificado correctamente")
                    );
                }

                if (typeof this.options.onSaved === "function") {
                    await this.options.onSaved(data, modelo, this);
                }

                return true;

            } catch (err) {
                console.error("Error:", err);
                this.mostrarErrorCampos("Ha ocurrido un error inesperado al guardar.", null, "error");
                return false;
            }
        }

        async eliminar(id) {

            if (!Permisos.tiene("Clientes", "Eliminar")) {
                errorModal("No tenés permisos.");
                return;
            }


            let confirmado = true;

            if (typeof window.confirmarModal === "function") {
                confirmado = await window.confirmarModal("¿Desea eliminar este cliente?");
            } else {
                confirmado = window.confirm("¿Desea eliminar este cliente?");
            }

            if (!confirmado) return false;

            try {
                const url = this._replaceUrl(this.options.endpoints.eliminar, { id });

                const data = await this._fetchJson(url, {
                    method: "DELETE",
                    headers: this._headers(false)
                });

                if (!data.valor) {
                    this.mostrarErrorCampos(
                        data.mensaje || "No se pudo eliminar.",
                        data.idReferencia ?? null,
                        data.tipo || "error"
                    );
                    return false;
                }

                if (typeof window.exitoModal === "function") {
                    window.exitoModal(data.mensaje || "Cliente eliminado correctamente");
                }

                if (typeof this.options.onDeleted === "function") {
                    await this.options.onDeleted(data, id, this);
                }

                return true;

            } catch (e) {
                console.error("Ha ocurrido un error:", e);

                if (typeof window.errorModal === "function") {
                    window.errorModal("Ha ocurrido un error.");
                }

                return false;
            }
        }

        /* =========================================================
           COMBOS
        ========================================================= */

        resetSelect(id, placeholder) {
            const el = this._id(id);
            if (!el) return;

            el.innerHTML = "";
            el.append(new Option(placeholder || "Seleccionar", ""));

            this._refreshSelect2Field(id);
        }

        async listaPaises() {
            const data = await this._fetchJson(this.options.endpoints.paises, {
                headers: this._headers(false)
            });

            this.resetSelect("cmbPais", "Seleccionar");

            const select = this._id("cmbPais");
            (data || []).forEach(x => select.append(new Option(x.Nombre, x.Id)));

            this.inicializarSelect2Modal();
        }

        async listaTiposDocumento(idPaisSeleccionado = null) {
            const data = await this._fetchJson(this.options.endpoints.tiposDocumento, {
                headers: this._headers(false)
            });

            this.resetSelect("cmbTipoDocumento", "Seleccionar");

            const select = this._id("cmbTipoDocumento");

            (data || [])
                .filter(x => !idPaisSeleccionado || x.IdCombo == idPaisSeleccionado)
                .forEach(x => select.append(new Option(x.Nombre, x.Id)));

            this.inicializarSelect2Modal();
        }

        async listaCondicionesIva(idPaisSeleccionado = null) {
            const data = await this._fetchJson(this.options.endpoints.condicionesIva, {
                headers: this._headers(false)
            });

            this.resetSelect("cmbCondicionIva", "Seleccionar");

            const select = this._id("cmbCondicionIva");

            (data || [])
                .filter(x => !idPaisSeleccionado || x.IdCombo == idPaisSeleccionado)
                .forEach(x => select.append(new Option(x.Nombre, x.Id)));

            this.inicializarSelect2Modal();
        }

        async listaProvincias(idPaisSeleccionado = null) {
            this.resetSelect("cmbProvincia", "Seleccionar");

            if (!idPaisSeleccionado) {
                this.inicializarSelect2Modal();
                return;
            }

            const url = this._replaceUrl(this.options.endpoints.provincias, {
                idPais: idPaisSeleccionado
            });

            const data = await this._fetchJson(url, {
                headers: this._headers(false)
            });

            const select = this._id("cmbProvincia");

            (data || []).forEach(x => {
                select.append(new Option(x.Nombre, x.Id));
            });

            this.inicializarSelect2Modal();
        }

        async _onPaisChange() {
            const idPais = this._getFieldValue("cmbPais");

            const provinciaActual = this._getFieldValue("cmbProvincia");
            const tipoDocActual = this._getFieldValue("cmbTipoDocumento");
            const ivaActual = this._getFieldValue("cmbCondicionIva");

            await this.listaTiposDocumento(idPais);
            await this.listaCondicionesIva(idPais);
            await this.listaProvincias(idPais);

            if (provinciaActual) {
                this._setFieldValue("cmbProvincia", provinciaActual, true);
            }

            if (tipoDocActual) {
                this._setFieldValue("cmbTipoDocumento", tipoDocActual, true);
            }

            if (ivaActual) {
                this._setFieldValue("cmbCondicionIva", ivaActual, true);
            }
        }

        /* =========================================================
           PRODUCTORAS CHECKLIST
        ========================================================= */

        _normalizarArraysProductoras() {
            this.productorasSeleccionadas = [...new Set(this._toIntArray(this.productorasSeleccionadas))];
            this.productorasAutomaticas = [...new Set(this._toIntArray(this.productorasAutomaticas))];
            this.productorasDesdeProductora = [...new Set(this._toIntArray(this.productorasDesdeProductora))];

            // quita duplicados cruzados para evitar inconsistencias
            this.productorasSeleccionadas = this.productorasSeleccionadas.filter(id =>
                !this.productorasAutomaticas.includes(id) &&
                !this.productorasDesdeProductora.includes(id)
            );

            this.productorasAutomaticas = this.productorasAutomaticas.filter(id =>
                !this.productorasDesdeProductora.includes(id)
            );
        }

        getTotalProductorasSeleccionadas() {
            this._normalizarArraysProductoras();

            return (
                (this.productorasSeleccionadas?.length || 0) +
                (this.productorasAutomaticas?.length || 0) +
                (this.productorasDesdeProductora?.length || 0)
            );
        }

        async cargarProductorasChecklist(force = false) {
            if (!force && this.productorasCache.length > 0) return;

            try {
                const data = await this._fetchJson(this.options.endpoints.productoras, {
                    method: "GET",
                    headers: this._headers(false)
                });

                this.productorasCache = Array.isArray(data) ? data : [];
            } catch (e) {
                console.error("No se pudo cargar Productoras", e);
                this.productorasCache = [];
            }
        }

        _crearWrapperChecklistProductorasSiNoExiste() {
            const cont = this._id("listaProductoras");
            if (!cont) return null;
            return cont;
        }

        _getNombreProductora(p) {
            return (p?.Nombre || p?.nombre || "").toString();
        }

        _ordenarProductorasPorNombre(a, b) {
            return this._getNombreProductora(a).localeCompare(this._getNombreProductora(b));
        }

        _estaProductoraAsignada(id) {
            return (
                this.productorasSeleccionadas.includes(id) ||
                this.productorasAutomaticas.includes(id) ||
                this.productorasDesdeProductora.includes(id)
            );
        }

        _buildBadgeProductora({ esManual, esAuto, esDesde }) {
            if (esManual) {
                return `<span class="rp-badge manual">Manual</span>`;
            }

            if (esAuto) {
                return `<span class="rp-badge auto">Automático</span>`;
            }

            if (esDesde) {
                return `<span class="rp-badge prod">Automático</span>`;
            }

            return "";
        }

        _buildChecklistLabelHtml(p) {
            const id = parseInt(p.Id, 10);

            const esManual = this.productorasSeleccionadas.includes(id);
            const esAuto = this.productorasAutomaticas.includes(id);
            const esDesde = this.productorasDesdeProductora.includes(id);

            let checked = "";
            let disabled = "";
            let claseExtra = "";

            if (esManual) {
                checked = "checked";
                claseExtra = "manual";
            }
            else if (esAuto) {
                checked = "checked";
                disabled = "disabled";
                claseExtra = "auto";
            }
            else if (esDesde) {
                checked = "checked";
                disabled = "disabled";
                claseExtra = "prod";
            }

            if (this.isSoloLectura() && !esAuto && !esDesde) {
                disabled = "disabled";
            }

            const badge = this._buildBadgeProductora({ esManual, esAuto, esDesde });
            const nombre = this._getNombreProductora(p);
            const nombreLower = nombre.toLowerCase();

            return `
                <label class="rp-check-item ${claseExtra}"
                       data-nombre="${nombreLower}"
                       data-id="${id}">

                    <input type="checkbox"
                           value="${id}"
                           ${checked}
                           ${disabled}
                           onchange="toggleProductora(${id})">

                    <span class="rp-check-text">
                        ${nombre}
                        ${badge}
                    </span>
                </label>
            `;
        }

        _renderGrupoProductoras(container, tituloHtml, lista, claseGrupo) {
            if (!lista.length) return;

            container.insertAdjacentHTML("beforeend", `
                <div class="rp-check-group ${claseGrupo}">
                    <div class="rp-check-group-title">
                        ${tituloHtml}
                        <span class="rp-check-count">(${lista.length})</span>
                    </div>
                </div>
            `);

            lista.forEach(p => {
                container.insertAdjacentHTML("beforeend", this._buildChecklistLabelHtml(p));
            });
        }

        renderChecklistProductoras() {
            const cont = this._crearWrapperChecklistProductorasSiNoExiste();
            if (!cont) return;

            if (this._forzandoRenderChecklist) return;

            this._forzandoRenderChecklist = true;

            try {
                this._normalizarArraysProductoras();
                cont.innerHTML = "";

                const asignadas = [];
                const disponibles = [];

                (this.productorasCache || []).forEach(p => {
                    const id = parseInt(p.Id, 10);

                    if (this._estaProductoraAsignada(id)) {
                        asignadas.push(p);
                    } else {
                        disponibles.push(p);
                    }
                });

                asignadas.sort((a, b) => this._ordenarProductorasPorNombre(a, b));
                disponibles.sort((a, b) => this._ordenarProductorasPorNombre(a, b));

                this._renderGrupoProductoras(
                    cont,
                    `<i class="fa fa-check-circle"></i> Asignadas`,
                    asignadas,
                    "grupo-asignadas"
                );

                this._renderGrupoProductoras(
                    cont,
                    `<i class="fa fa-list"></i> Disponibles`,
                    disponibles,
                    "grupo-disponibles"
                );

                this.actualizarContadorProductoras();
                this.activarBuscadorProductoras();
                this._applySoloLecturaToChecklist(this.isSoloLectura());

                if (typeof this.options.onAfterRenderChecklist === "function") {
                    this.options.onAfterRenderChecklist(this);
                }

            } finally {
                this._forzandoRenderChecklist = false;
            }
        }

        toggleProductora(id) {
            id = parseInt(id, 10);

            if (Number.isNaN(id)) return;

            if (this.productorasAutomaticas.includes(id)) return;
            if (this.productorasDesdeProductora.includes(id)) return;
            if (this.isSoloLectura()) return;

            if (this.productorasSeleccionadas.includes(id)) {
                this.productorasSeleccionadas =
                    this.productorasSeleccionadas.filter(x => x !== id);
            } else {
                this.productorasSeleccionadas.push(id);
            }

            this._normalizarArraysProductoras();
            this.renderChecklistProductoras();
            this.verificarErroresGenerales();
        }

        activarBuscadorProductoras() {
            const input = this._id("txtBuscarProductora");
            if (!input) return;

            input.oninput = () => {
                const texto = (input.value || "").toLowerCase();
                this._filtrarChecklistProductoras(texto);
            };
        }

        _filtrarChecklistProductoras(texto) {
            const t = (texto || "").toLowerCase();

            this._qa("#listaProductoras .rp-check-item").forEach(el => {
                const nombre = (el.getAttribute("data-nombre") || "").toLowerCase();
                el.style.display = nombre.includes(t) ? "" : "none";
            });
        }

        actualizarContadorProductoras() {
            const total = this.getTotalProductorasSeleccionadas();
            const el = this._id("cntProductoras");
            if (el) el.textContent = `(${total})`;
        }

        /* =========================================================
           VALIDACIONES
        ========================================================= */

        limpiarModal() {
            this.setSoloLecturaAttribute(false);

            this._qa("input, select, textarea").forEach(el => {
                if (el.type === "checkbox") {
                    if (el.id === "chkAsociacionAutomatica") {
                        el.checked = true;
                    } else {
                        el.checked = false;
                    }
                }
                else if (el.tagName === "SELECT") {
                    el.selectedIndex = 0;
                }
                else {
                    el.value = "";
                }

                el.classList.remove("is-invalid", "is-valid");

                if (el.tagName === "SELECT" && window.jQuery && window.jQuery(el).data("select2")) {
                    const { $selection, $container } = this.getSelect2Selection(el);
                    $selection.removeClass("is-invalid is-valid");
                    $container.removeClass("is-invalid is-valid");
                }
            });

            this.productorasSeleccionadas = [];
            this.productorasAutomaticas = [];
            this.productorasDesdeProductora = [];

            this.cerrarErrorCampos();

            const infoAuditoria = this._id("infoAuditoria");
            const infoRegistro = this._id("infoRegistro");
            const infoModificacion = this._id("infoModificacion");

            if (infoAuditoria) infoAuditoria.classList.add("d-none");
            if (infoRegistro) infoRegistro.innerHTML = "";
            if (infoModificacion) infoModificacion.innerHTML = "";

            this.actualizarContadorProductoras();
            this._refreshAllSelect2();

            const lista = this._id("listaProductoras");
            if (lista) lista.innerHTML = "";

            const buscador = this._id("txtBuscarProductora");
            if (buscador) buscador.value = "";
        }

        validarCampoIndividual(el) {
            if (this.isSoloLectura()) return true;
            if (!el) return true;

            const camposObligatorios = [
                "txtNombre",
                "txtDni",
                "txtEmail"
            ];

            if (!camposObligatorios.includes(el.id)) return true;

            const valor = (el.value ?? "").toString().trim();

            const esValido =
                valor !== "" &&
                valor !== null &&
                valor !== "Seleccionar";

            this.setEstadoCampo(el, esValido);
            this.verificarErroresGenerales();

            return esValido;
        }

        verificarErroresGenerales() {
            const errorMsg = this._id("errorCampos");
            if (!errorMsg) return;

            const hayInvalidos = this._qa(".is-invalid").length > 0;

            if (!hayInvalidos) {
                errorMsg.classList.add("d-none");
            }
        }

        validarCampos() {
            if (this.isSoloLectura()) return true;

            const campos = [
                { id: "txtNombre", nombre: "Nombre" },
                { id: "txtDni", nombre: "DNI" },
                { id: "txtEmail", nombre: "Correo electrónico" }
            ];

            let errores = [];

            campos.forEach(c => {
                const el = this._id(c.id);
                if (!el) return;

                const valor = (el.value ?? "").toString().trim();
                const esValido = valor !== "" && valor !== "Seleccionar";

                this.setEstadoCampo(el, esValido);

                if (!esValido) {
                    errores.push(c.nombre);
                }
            });

            const totalProductoras = this.getTotalProductorasSeleccionadas();

            if (totalProductoras === 0) {
                errores.push("Productora");
            }

            if (errores.length > 0) {
                this.mostrarErrorCampos(
                    `Debes completar los campos requeridos:<br><strong>${errores.join(", ")}</strong>`,
                    null,
                    "validacion"
                );

            

                return false;
            }

            this.cerrarErrorCampos();
            return true;
        }

        setEstadoCampo(el, esValido) {
            if (!el) return;

            el.classList.remove("is-invalid", "is-valid");
            el.classList.add(esValido ? "is-valid" : "is-invalid");

            if (el.tagName === "SELECT" && window.jQuery && window.jQuery(el).data("select2")) {
                const { $selection, $container } = this.getSelect2Selection(el);
                $selection.removeClass("is-invalid is-valid").addClass(esValido ? "is-valid" : "is-invalid");
                $container.removeClass("is-invalid is-valid").addClass(esValido ? "is-valid" : "is-invalid");
            }
        }

        mostrarErrorCampos(mensaje, idReferencia = null, tipo = "validacion") {
            const container = this._id("errorCampos");
            if (!container) return;

            let titulo = "";
            let icono = "fa-exclamation-triangle";

            switch (tipo) {
                case "duplicado":
                    titulo = "Registro duplicado detectado";
                    break;
                case "relacion":
                    titulo = "No se puede eliminar";
                    icono = "fa-link";
                    break;
                case "error":
                    titulo = "No se pudo guardar";
                    icono = "fa-times-circle";
                    break;
                default:
                    titulo = "Campos requeridos";
                    icono = "fa-exclamation-circle";
                    break;
            }

            let botonReferencia = "";

            if (idReferencia) {
                botonReferencia = `
                    <button class="rp-btn-ref"
                            onclick="verFicha(${idReferencia})">
                        <i class="fa fa-eye me-1"></i>
                        Abrir ficha existente →
                    </button>
                `;
            }

            container.innerHTML = `
                <div class="rp-error-box">
                    <div class="rp-error-icon">
                        <i class="fa ${icono}"></i>
                    </div>

                    <div class="rp-error-content">
                        <div class="rp-error-title">
                            ${titulo}
                        </div>

                        <div class="rp-error-text">
                            ${mensaje}
                        </div>
                    </div>

                    ${botonReferencia}
                </div>
            `;

            container.classList.remove("d-none");

            container.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }

        cerrarErrorCampos() {
            const container = this._id("errorCampos");
            if (!container) return;

            container.classList.add("d-none");
            container.innerHTML = "";
        }

        /* =========================================================
           AUDITORÍA
        ========================================================= */

        _setAuditoria(modelo) {
            const wrap = this._id("infoAuditoria");
            const reg = this._id("infoRegistro");
            const mod = this._id("infoModificacion");

            if (!wrap || !reg || !mod) return;

            reg.innerHTML = "";
            mod.innerHTML = "";
            wrap.classList.add("d-none");

            if (!modelo) return;

            if (modelo.UsuarioModifica && modelo.FechaModifica) {
                mod.innerHTML = `
                    <i class="fa fa-edit"></i>
                    Última modificación por
                    <strong>${modelo.UsuarioModifica}</strong>
                    el <strong>${this.formatearFecha(modelo.FechaModifica)}</strong>
                `;
                wrap.classList.remove("d-none");
                return;
            }

            if (modelo.UsuarioRegistra && modelo.FechaRegistra) {
                reg.innerHTML = `
                    <i class="fa fa-user"></i>
                    Registrado por
                    <strong>${modelo.UsuarioRegistra}</strong>
                    el <strong>${this.formatearFecha(modelo.FechaRegistra)}</strong>
                `;
                wrap.classList.remove("d-none");
            }
        }

        /* =========================================================
           HELPERS FECHA / NÚMEROS / TEXTO
        ========================================================= */

        formatearFecha(fecha) {
            try {
                const d = new Date(fecha);
                return d.toLocaleString("es-AR");
            } catch {
                return fecha;
            }
        }

        normalizarDateInput(fecha) {
            if (!fecha) return "";

            try {
                const d = new Date(fecha);
                if (isNaN(d.getTime())) return "";

                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");

                return `${yyyy}-${mm}-${dd}`;
            } catch {
                return "";
            }
        }

        toDecimal(val) {
            if (val == null) return 0;
            const s = (val + "").trim();
            if (!s) return 0;
            const n = Number(s.replace(",", "."));
            return Number.isFinite(n) ? n : 0;
        }

        sanitizePasteText(texto) {
            return (texto || "")
                .replace(/[“”]/g, '"')
                .replace(/[‘’]/g, "'")
                .replace(/\u00A0/g, ' ')
                .trim();
        }

        /* =========================================================
           MISC
        ========================================================= */

        getModeloActual() {
            return this._modeloActual;
        }

        getEstadoProductoras() {
            return {
                productorasCache: [...this.productorasCache],
                productorasSeleccionadas: [...this.productorasSeleccionadas],
                productorasAutomaticas: [...this.productorasAutomaticas],
                productorasDesdeProductora: [...this.productorasDesdeProductora]
            };
        }

        debugEstadoProductoras() {
            console.log("productorasSeleccionadas", this.productorasSeleccionadas);
            console.log("productorasAutomaticas", this.productorasAutomaticas);
            console.log("productorasDesdeProductora", this.productorasDesdeProductora);
            console.log("total", this.getTotalProductorasSeleccionadas());
        }

        /* =========================================================
           BIND EVENTS
        ========================================================= */

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

            this.modalEl.addEventListener("input", (e) => {
                const target = e.target;
                if (!target) return;

                if (target.matches("input, select, textarea")) {
                    this.validarCampoIndividual(target);
                }

                if (target.id === "txtBuscarProductora") {
                    this._filtrarChecklistProductoras(target.value || "");
                }
            });

            this.modalEl.addEventListener("change", async (e) => {
                const target = e.target;
                if (!target) return;

                if (target.matches("input, select, textarea")) {
                    this.validarCampoIndividual(target);
                }

                if (target.id === "cmbPais") {
                    await this._onPaisChange();
                }

                if (target.id === "chkAsociacionAutomatica") {
                    const cont = this._id("listaProductoras");
                    if (cont) {
                        cont.style.opacity = target.checked ? "0.85" : "1";
                    }
                }
            });

            this.modalEl.addEventListener("blur", (e) => {
                const target = e.target;
                if (!target) return;

                if (target.matches("input, select, textarea")) {
                    this.validarCampoIndividual(target);
                }
            }, true);

            // paste limpio dentro del modal
            this.modalEl.addEventListener("paste", (e) => {
                const target = e.target;
                if (!target) return;

                if (!target.matches("input[type='text'], input:not([type]), textarea")) return;

                e.preventDefault();

                let texto = "";
                if ((e.clipboardData || window.clipboardData)) {
                    texto = (e.clipboardData || window.clipboardData).getData("text");
                }

                texto = this.sanitizePasteText(texto);

                if (document.queryCommandSupported && document.queryCommandSupported("insertText")) {
                    document.execCommand("insertText", false, texto);
                } else {
                    const start = target.selectionStart ?? target.value.length;
                    const end = target.selectionEnd ?? target.value.length;
                    const actual = target.value || "";

                    target.value = actual.slice(0, start) + texto + actual.slice(end);
                    target.selectionStart = target.selectionEnd = start + texto.length;

                    this._dispatchInput(target);
                }
            });
        }

        _bindModalEvents() {
            this.modalEl.addEventListener("shown.bs.modal", () => {
                this.inicializarSelect2Modal();

                if (window.jQuery) {
                    const $modal = window.jQuery(this.modalEl);

                    // 🔥 IMPORTANTE: escuchar cambio de pais con select2
                    $modal.on("select2:select.mclientes select2:clear.mclientes", "#cmbPais", async (e) => {
                        await this._onPaisChange();
                    });
                }

                this._applySoloLecturaToChecklist(this.isSoloLectura());
            });

            this.modalEl.addEventListener("hidden.bs.modal", () => {
                setTimeout(() => {
                    const modalesAbiertos = document.querySelectorAll(".modal.show").length;

                    if (modalesAbiertos === 0) {
                        document.body.classList.remove("modal-open");
                        document.body.style.overflow = "";
                        document.body.style.paddingRight = "";
                        document.querySelectorAll(".modal-backdrop").forEach(x => x.remove());
                    }
                }, 150);
            });
        }
    }

    /* =========================================================
       COMPATIBILIDAD GLOBAL
    ========================================================= */

    window.toggleProductora = function (id) {
        if (window.clienteModal && typeof window.clienteModal.toggleProductora === "function") {
            return window.clienteModal.toggleProductora(id);
        }
    };

    window.guardarCliente = function () {
        if (window.clienteModal && typeof window.clienteModal.guardar === "function") {
            return window.clienteModal.guardar();
        }
    };

    window.cerrarErrorCampos = function () {
        if (window.clienteModal && typeof window.clienteModal.cerrarErrorCampos === "function") {
            return window.clienteModal.cerrarErrorCampos();
        }
    };

    window.ClienteModal = ClienteModal;

})(window);