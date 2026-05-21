(function (window) {
    "use strict";

    class ProductoraModal {
        constructor(root, options = {}) {
            if (!root) throw new Error("ProductoraModal requiere un root.");

            this.root = root;
            this.options = Object.assign({
                token: window.token || "",
                endpoints: {
                    editar: "/Productoras/EditarInfo?id={id}",
                    insertar: "/Productoras/Insertar",
                    actualizar: "/Productoras/Actualizar",
                    eliminar: "/Productoras/Eliminar?id={id}",
                    paises: "/Paises/Lista",
                    provincias: "/PaisesProvincia/ListaPais?idPais={idPais}",
                    tiposDocumento: "/PaisesTiposDocumentos/Lista",
                    condicionesIva: "/PaisesCondicionesIVA/Lista",
                    clientes: "/Clientes/Lista"
                },
                onSaved: null,
                onDeleted: null,
                onBeforeOpen: null,
                onOpen: null,
                onGuardarModelo: null
            }, options || {});

            this.modalEl = this.root.matches("[data-productora-modal]")
                ? this.root
                : this.root.querySelector("[data-productora-modal]");

            if (!this.modalEl) {
                throw new Error("No se encontró [data-productora-modal].");
            }

            this.bsModal = new bootstrap.Modal(this.modalEl);

            this.clientesCache = [];
            this.clientesSeleccionados = [];
            this.clientesAutomaticos = [];
            this.clientesDesdeCliente = [];

            this._bindEvents();
            this._bindModalEvents();
        }

        /* =========================
           HELPERS DOM
        ========================= */

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
            Object.keys(values || {}).forEach(k => {
                result = result.replace(`{${k}}`, values[k]);
            });
            return result;
        }

        _headers(json = true) {
            const h = {};
            if (json) h["Content-Type"] = "application/json";
            if (this.options.token) {
                h["Authorization"] = "Bearer " + this.options.token;
            }
            return h;
        }

        async _fetchJson(url, options = {}) {
            const res = await fetch(url, options);
            if (!res.ok) {
                throw new Error(`Error HTTP ${res.status}`);
            }
            return await res.json();
        }

        _getFieldValue(id) {
            const el = this._id(id);
            if (!el) return "";
            if (el.type === "checkbox") return !!el.checked;
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
            const v = this._getFieldValue(id);
            return v !== null && v !== undefined && v !== "" ? parseInt(v, 10) : null;
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

        _setTitulo(txt) {
            const el = this._id("modalEdicionLabel");
            if (el) el.textContent = txt || "";
        }

        _setTextoGuardar(txt) {
            const btn = this._id("btnGuardar");
            if (btn) {
                btn.innerHTML = `<i class="fa fa-check"></i> ${txt || "Guardar"}`;
            }
        }

        getId() {
            const v = this._getFieldValue("txtId");
            return v ? parseInt(v, 10) : 0;
        }

        isSoloLectura() {
            return this._id("txtSoloLectura")?.value === "1";
        }

        /* =========================
           SELECT2
        ========================= */

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

        /* =========================
           SOLO LECTURA
        ========================= */

        setModalSoloLectura(soloLectura) {
            const disabled = !!soloLectura;

            const txtSoloLectura = this._id("txtSoloLectura");
            if (txtSoloLectura) txtSoloLectura.value = disabled ? "1" : "0";

            this._qa("input, select, textarea").forEach(el => {
                const id = el.id || "";

                if (id === "txtId" || id === "txtSoloLectura") return;

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

            const btnGuardar = this._id("btnGuardar");
            if (btnGuardar) {
                btnGuardar.classList.toggle("d-none", disabled);
            }

            this._qa("#listaClientes input[type='checkbox']").forEach(chk => {
                chk.disabled = disabled || chk.disabled;
            });

            const buscar = this._id("txtBuscarCliente");
            if (buscar) buscar.disabled = disabled;

            this._qa("select").forEach(el => {
                const $el = window.jQuery(el);
                if ($el.data("select2")) {
                    $el.prop("disabled", el.disabled);
                    $el.trigger("change.select2");
                }
            });
        }

        /* =========================
           EVENTS
        ========================= */

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

                if (target.id === "txtBuscarCliente") {
                    this._filtrarChecklistClientes(target.value || "");
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
                    this._actualizarEstadoVisualChecklist();
                }
            });

            this.modalEl.addEventListener("blur", (e) => {
                const target = e.target;
                if (!target) return;

                if (target.matches("input, select, textarea")) {
                    this.validarCampoIndividual(target);
                }
            }, true);
        }

        _bindModalEvents() {
            this.modalEl.addEventListener("shown.bs.modal", () => {
                this.inicializarSelect2Modal();

                if (window.jQuery) {
                    const $modal = window.jQuery(this.modalEl);

                    $modal.off("select2:select.mproductora select2:clear.mproductora change.mproductora", "select");
                    $modal.on("select2:select.mproductora select2:clear.mproductora change.mproductora", "select", (e) => {
                        this.validarCampoIndividual(e.target);
                    });

                    $modal.on("select2:select.mproductora", "#cmbPais", async (e) => {
                        console.log("SELECT2 cambio pais");
                        await this._onPaisChange();
                    });

                    $modal.off("scroll.select2fixproductora")
                        .on("scroll.select2fixproductora", () => {
                            $modal.find("select").select2("close");
                        });
                }
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

        /* =========================
           OPEN / CLOSE
        ========================= */

        async abrirNuevo() {

            if (!Permisos.tiene("Productoras", "Crear")) {
                errorModal("No tenés permisos.");
                return;
            }


            if (typeof this.options.onBeforeOpen === "function") {
                await this.options.onBeforeOpen("nuevo", this);
            }

            this.limpiarModal();
            this.setModalSoloLectura(false);

            this.clientesSeleccionados = [];
            this.clientesAutomaticos = [];
            this.clientesDesdeCliente = [];

            await Promise.all([
                this.listaPaises(),
                this.cargarClientesChecklist(true)
            ]);

            this.resetSelect("cmbProvincia", "Seleccionar");
            this.resetSelect("cmbTipoDocumento", "Seleccionar");
            this.resetSelect("cmbCondicionIva", "Seleccionar");

            this.inicializarSelect2Modal();
            this.renderChecklistClientes();
            this.activarBuscadorClientes();
            this.actualizarContadorClientes();
            this._actualizarEstadoVisualChecklist();

            this._setTextoGuardar("Registrar");
            this._setTitulo("Nueva Productora");

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

            const tabDatos = this.modalEl.querySelector('#productoraTabs button[data-bs-target="#tabDatosProductora"]');
            if (tabDatos) {
                const tab = new bootstrap.Tab(tabDatos);
                tab.show();
            }

            this.bsModal.show();

            if (typeof this.options.onOpen === "function") {
                await this.options.onOpen("nuevo", this);
            }
        }

        async abrirEditar(id) {
            try {

                if (!Permisos.tiene("Productoras", "Editar")) {
                    errorModal("No tenés permisos.");
                    return;
                }
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

            this.limpiarModal();
            this.setModalSoloLectura(false);

            const tabDatos = this.modalEl.querySelector('#productoraTabs button[data-bs-target="#tabDatosProductora"]');
            if (tabDatos) {
                const tab = new bootstrap.Tab(tabDatos);
                tab.show();
            }

            this._setFieldValue("txtId", modelo.Id || "");
            this._setFieldValue("txtNombre", modelo.Nombre || "");
            this._setFieldValue("txtDni", modelo.Dni || "");
            this._setFieldValue("txtNumeroDocumento", modelo.NumeroDocumento || "");
            this._setFieldValue("txtTelefono", modelo.Telefono || "");
            this._setFieldValue("txtTelefonoAlternativo", modelo.TelefonoAlternativo || "");
            this._setFieldValue("txtDireccion", modelo.Direccion || "");
            this._setFieldValue("txtLocalidad", modelo.Localidad || "");
            this._setFieldValue("txtEntreCalles", modelo.EntreCalles || "");
            this._setFieldValue("txtCodigoPostal", modelo.CodigoPostal || "");
            this._setFieldValue("txtEmail", modelo.Email || "");

            await Promise.all([
                this.listaPaises(),
                this.cargarClientesChecklist(true)
            ]);

            const idPais = modelo.Idpais ?? modelo.IdPais ?? null;

            if (idPais != null) {
                this._setFieldValue("cmbPais", idPais, true);
                await this.listaProvincias(idPais);
                await this.listaTiposDocumento(idPais);
                await this.listaCondicionesIva(idPais);
            } else {
                this.resetSelect("cmbProvincia", "Seleccionar");
                this.resetSelect("cmbTipoDocumento", "Seleccionar");
                this.resetSelect("cmbCondicionIva", "Seleccionar");
            }

            if (modelo.IdProvincia != null) {
                this._setFieldValue("cmbProvincia", modelo.IdProvincia, true);
            }

            if (modelo.IdTipoDocumento != null) {
                this._setFieldValue("cmbTipoDocumento", modelo.IdTipoDocumento, true);
            }

            if (modelo.IdCondicionIva != null) {
                this._setFieldValue("cmbCondicionIva", modelo.IdCondicionIva, true);
            }

            this.clientesSeleccionados = Array.isArray(modelo.clientesManualesIds)
                ? modelo.clientesManualesIds.map(x => parseInt(x, 10))
                : [];

            this.clientesAutomaticos = Array.isArray(modelo.clientesAutomaticosIds)
                ? modelo.clientesAutomaticosIds.map(x => parseInt(x, 10))
                : [];

            this.clientesDesdeCliente = Array.isArray(modelo.clientesDesdeClienteIds)
                ? modelo.clientesDesdeClienteIds.map(x => parseInt(x, 10))
                : [];

            this.renderChecklistClientes();
            this.activarBuscadorClientes();
            this.actualizarContadorClientes();
            this._actualizarEstadoVisualChecklist();
            this._setAuditoria(modelo);

            const chk = this._id("chkAsociacionAutomatica");
            if (chk) {
                chk.checked = true;
                chk.disabled = true;
            }

            this._setTextoGuardar("Guardar");
            this._setTitulo(soloLectura ? "Ver Productora" : "Editar Productora");

            this.bsModal.show();
            this.setModalSoloLectura(soloLectura);

            if (typeof this.options.onOpen === "function") {
                await this.options.onOpen(soloLectura ? "ver" : "editar", this, modelo);
            }
        }

        /* =========================
           CRUD
        ========================= */

        async guardar() {
            if (this.isSoloLectura()) return true;
            if (!this.validarCampos()) return false;

            const id = this._getFieldValue("txtId");

            const modelo = {
                Id: id !== "" ? parseInt(id, 10) : 0,

                Nombre: this._getFieldValue("txtNombre"),

                Idpais: this._getIntOrNull("cmbPais"),
                IdTipoDocumento: this._getIntOrNull("cmbTipoDocumento"),
                NumeroDocumento: this._getFieldValue("txtNumeroDocumento"),
                Dni: this._getFieldValue("txtDni"),

                IdCondicionIva: this._getIntOrNull("cmbCondicionIva"),
                IdProvincia: this._getIntOrNull("cmbProvincia"),

                Telefono: this._getFieldValue("txtTelefono"),
                TelefonoAlternativo: this._getFieldValue("txtTelefonoAlternativo"),

                Direccion: this._getFieldValue("txtDireccion"),
                Localidad: this._getFieldValue("txtLocalidad"),
                EntreCalles: this._getFieldValue("txtEntreCalles"),
                CodigoPostal: this._getFieldValue("txtCodigoPostal"),

                Email: this._getFieldValue("txtEmail"),

                AsociacionAutomatica: this._getFieldValue("chkAsociacionAutomatica"),

                ClientesIds: [...this.clientesSeleccionados]
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
                        else if (data.mensaje?.toLowerCase().includes("no se puede")) tipoError = "relacion";
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
                            ? "Productora registrada correctamente"
                            : "Productora modificada correctamente")
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


            if (!Permisos.tiene("Productoras", "Eliminar")) {
                errorModal("No tenés permisos.");
                return;
            }


            let confirmado = true;

            if (typeof window.confirmarModal === "function") {
                confirmado = await window.confirmarModal("¿Desea eliminar esta productora?");
            } else {
                confirmado = window.confirm("¿Desea eliminar esta productora?");
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
                    window.exitoModal(data.mensaje || "Productora eliminada correctamente");
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

        /* =========================
           COMBOS
        ========================= */

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

            const url = this._replaceUrl(this.options.endpoints.provincias, { idPais: idPaisSeleccionado });
            const data = await this._fetchJson(url, {
                headers: this._headers(false)
            });

            const select = this._id("cmbProvincia");
            (data || []).forEach(x => select.append(new Option(x.Nombre, x.Id)));

            this.inicializarSelect2Modal();
        }

        async _onPaisChange() {
            const idPais = this._getIntOrNull("cmbPais");

            const tipoDocActual = this._getFieldValue("cmbTipoDocumento");
            const ivaActual = this._getFieldValue("cmbCondicionIva");
            const provinciaActual = this._getFieldValue("cmbProvincia");

            await this.listaTiposDocumento(idPais);
            await this.listaCondicionesIva(idPais);
            await this.listaProvincias(idPais);

            if (tipoDocActual) this._setFieldValue("cmbTipoDocumento", tipoDocActual, true);
            if (ivaActual) this._setFieldValue("cmbCondicionIva", ivaActual, true);
            if (provinciaActual) this._setFieldValue("cmbProvincia", provinciaActual, true);
        }

        /* =========================
           CLIENTES CHECKLIST
        ========================= */

        async cargarClientesChecklist(force = false) {
            if (!force && this.clientesCache.length > 0) return;

            try {
                const data = await this._fetchJson(this.options.endpoints.clientes, {
                    method: "GET",
                    headers: this._headers(false)
                });

                this.clientesCache = Array.isArray(data) ? data : [];
            } catch (e) {
                console.error("No se pudo cargar Clientes", e);
                this.clientesCache = [];
            }
        }

        renderChecklistClientes() {
            const cont = this._id("listaClientes");
            if (!cont) return;

            cont.innerHTML = "";

            const asignados = [];
            const disponibles = [];

            (this.clientesCache || []).forEach(c => {
                const id = parseInt(c.Id, 10);

                const estaAsignado =
                    this.clientesSeleccionados.includes(id) ||
                    this.clientesAutomaticos.includes(id) ||
                    this.clientesDesdeCliente.includes(id);

                if (estaAsignado) asignados.push(c);
                else disponibles.push(c);
            });

            const getNombre = c => (c.Nombre || "").toString();

            const ordenar = (a, b) =>
                getNombre(a).localeCompare(getNombre(b));

            asignados.sort(ordenar);
            disponibles.sort(ordenar);

            const renderGrupo = (titulo, lista, claseGrupo) => {
                if (!lista.length) return;

                cont.insertAdjacentHTML("beforeend", `
                    <div class="rp-check-group ${claseGrupo}">
                        <div class="rp-check-group-title">
                            ${titulo}
                            <span class="rp-check-count">(${lista.length})</span>
                        </div>
                    </div>
                `);

                lista.forEach(c => {
                    const id = parseInt(c.Id, 10);

                    const esManual = this.clientesSeleccionados.includes(id);
                    const esAuto = this.clientesAutomaticos.includes(id);
                    const esDesde = this.clientesDesdeCliente.includes(id);

                    let checked = "";
                    let disabled = "";
                    let badge = "";
                    let claseExtra = "";


                    if (esManual) {
                        checked = "checked";
                        badge = `<span class="rp-badge manual">Manual</span>`;
                        claseExtra = "manual";
                    }
                    else if (esAuto) {
                        checked = "checked";
                        disabled = "disabled";
                        badge = `<span class="rp-badge auto">Automático</span>`;
                        claseExtra = "auto";
                    }
                    else if (esDesde) {
                        checked = "checked";
                        disabled = "disabled";
                        badge = `<span class="rp-badge cli">Automático</span>`;
                        claseExtra = "cli";
                    }

                    const nombre = getNombre(c);

                    cont.insertAdjacentHTML("beforeend", `
                        <label class="rp-check-item ${claseExtra}"
                               data-nombre="${nombre.toLowerCase()}">
                            <input type="checkbox"
                                   value="${id}"
                                   ${checked}
                                   ${disabled}
                                   onclick="return toggleClienteProductora(${id})">

                            <span class="rp-check-text">
                                ${nombre}
                                ${badge}
                            </span>
                        </label>
                    `);
                });
            };

            renderGrupo(
                `<i class="fa fa-check-circle"></i> Asignados`,
                asignados,
                "grupo-asignados"
            );

            renderGrupo(
                `<i class="fa fa-list"></i> Disponibles`,
                disponibles,
                "grupo-disponibles"
            );



            this.activarBuscadorClientes();
            this.actualizarContadorClientes();
            this._actualizarEstadoVisualChecklist();

            if (this.isSoloLectura()) {
                this._qa("#listaClientes input[type='checkbox']").forEach(chk => chk.disabled = true);
            }
        }

        toggleCliente(id) {
            if (this.isSoloLectura()) return false;

            id = parseInt(id, 10);

            if (this.clientesAutomaticos.includes(id) ||
                this.clientesDesdeCliente.includes(id)) {

                this.renderChecklistClientes(); // 🔥 revierte UI
                return false;
            }

            if (this.clientesSeleccionados.includes(id)) {
                this.clientesSeleccionados = this.clientesSeleccionados.filter(x => x !== id);
            } else {
                this.clientesSeleccionados.push(id);
            }

            this.renderChecklistClientes();
            return false; // 🔥 evita toggle del checkbox
        }

        activarBuscadorClientes() {
            const input = this._id("txtBuscarCliente");
            if (!input) return;

            input.oninput = () => {
                const texto = (input.value || "").toLowerCase();
                this._filtrarChecklistClientes(texto);
            };
        }

        _filtrarChecklistClientes(texto) {
            const t = (texto || "").toLowerCase();

            this._qa("#listaClientes .rp-check-item").forEach(el => {
                const nombre = (el.getAttribute("data-nombre") || "").toLowerCase();
                el.style.display = nombre.includes(t) ? "" : "none";
            });
        }

        actualizarContadorClientes() {
            const total =
                (this.clientesSeleccionados?.length || 0) +
                (this.clientesAutomaticos?.length || 0) +
                (this.clientesDesdeCliente?.length || 0);

            const el = this._id("cntClientes");
            if (el) el.textContent = `(${total})`;
        }

        _actualizarEstadoVisualChecklist() {
            const cont = this._id("listaClientes");
            const automatico = this._id("chkAsociacionAutomatica")?.checked;

            if (!cont) return;
            cont.style.opacity = automatico ? "0.85" : "1";
        }

        /* =========================
           VALIDACIONES
        ========================= */

        limpiarModal() {
            this._qa("input, select, textarea").forEach(el => {
                if (el.type === "checkbox") {
                    if (el.id === "chkAsociacionAutomatica") el.checked = true;
                    else el.checked = false;
                } else if (el.tagName === "SELECT") {
                    el.selectedIndex = 0;
                } else {
                    el.value = "";
                }

                el.classList.remove("is-invalid", "is-valid");

                if (el.tagName === "SELECT" && window.jQuery(el).data("select2")) {
                    const { $selection, $container } = this.getSelect2Selection(el);
                    $selection.removeClass("is-invalid is-valid");
                    $container.removeClass("is-invalid is-valid");
                }
            });

            const txtSoloLectura = this._id("txtSoloLectura");
            if (txtSoloLectura) txtSoloLectura.value = "0";

            this.clientesSeleccionados = [];
            this.clientesAutomaticos = [];
            this.clientesDesdeCliente = [];

            this.cerrarErrorCampos();

            const infoAuditoria = this._id("infoAuditoria");
            const infoRegistro = this._id("infoRegistro");
            const infoModificacion = this._id("infoModificacion");

            if (infoAuditoria) infoAuditoria.classList.add("d-none");
            if (infoRegistro) infoRegistro.innerHTML = "";
            if (infoModificacion) infoModificacion.innerHTML = "";

            this.actualizarContadorClientes();
            this._refreshAllSelect2();
        }

        validarCampoIndividual(el) {
            const camposObligatorios = [
                "txtNombre",
                "cmbPais",
                "cmbProvincia",
                "txtDni",
                "txtNumeroDocumento",
                "txtTelefono",
                "txtEmail"
            ];

            if (!camposObligatorios.includes(el.id)) return true;

            const valor = (el.value ?? "").toString().trim();

            const esValido =
                valor !== "" &&
                valor !== "Seleccionar" &&
                valor !== null;

            this.setEstadoCampo(el, esValido);
            this.verificarErroresGenerales();

            return esValido;
        }

        verificarErroresGenerales() {
            const errorMsg = this._id("errorCampos");
            if (!errorMsg) return;

            const hayInvalidos = this._qa(".is-invalid").length > 0;
            if (!hayInvalidos) errorMsg.classList.add("d-none");
        }

        validarCampos() {
            const campos = [
                { id: "txtNombre", nombre: "Nombre" },
                { id: "cmbPais", nombre: "País" },
                { id: "cmbProvincia", nombre: "Provincia" },
                { id: "txtDni", nombre: "DNI" },
                { id: "txtNumeroDocumento", nombre: "Número Documento" },
                { id: "txtTelefono", nombre: "Teléfono" },
                { id: "txtEmail", nombre: "Correo" }
            ];

            let errores = [];

            campos.forEach(c => {
                const el = this._id(c.id);
                if (!el) return;

                const valor = (el.value ?? "").toString().trim();
                const esValido = valor !== "" && valor !== "Seleccionar";

                this.setEstadoCampo(el, esValido);

                if (!esValido) errores.push(c.nombre);
            });

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

            if (el.tagName === "SELECT" && window.jQuery(el).data("select2")) {
                const { $selection, $container } = this.getSelect2Selection(el);
                $selection.removeClass("is-invalid is-valid").addClass(esValido ? "is-valid" : "is-invalid");
                $container.removeClass("is-invalid is-valid").addClass(esValido ? "is-valid" : "is-invalid");
            }
        }

        mostrarErrorCampos(
            mensaje,
            idReferencia = null,
            tipo = "validacion"
        ) {
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
                            onclick="verFichaProductora(${idReferencia})">
                        <i class="fa fa-eye me-1"></i>
                        Abrir ficha existente →
                    </button>`;
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

        /* =========================
           AUDITORIA
        ========================= */

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

        formatearFecha(fecha) {
            try {
                const d = new Date(fecha);
                return d.toLocaleString("es-AR");
            } catch {
                return fecha;
            }
        }
    }

    window.toggleClienteProductora = function (id) {
        if (window.productoraModal && typeof window.productoraModal.toggleCliente === "function") {
            return window.productoraModal.toggleCliente(id);
        }
        return false;
    };

    window.guardarProductora = function () {
        if (window.productoraModal && typeof window.productoraModal.guardar === "function") {
            return window.productoraModal.guardar();
        }
    };

    window.cerrarErrorCamposProductora = function () {
        if (window.productoraModal && typeof window.productoraModal.cerrarErrorCampos === "function") {
            return window.productoraModal.cerrarErrorCampos();
        }
    };

    window.verFichaProductora = function (id) {
        if (window.productoraModal && typeof window.productoraModal.abrirVer === "function") {
            return window.productoraModal.abrirVer(id);
        }
    };

    window.ProductoraModal = ProductoraModal;

})(window);