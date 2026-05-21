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
                    sucursales: "/Sucursales/Lista",
                    provincias: "/Provincias/Lista",
                    condicionesIva: "/CondicionesIva/Lista",
                    profesiones: "/ClientesProfesiones/Lista",
                    contactosLista: "/ClientesContactos/ListaPorCliente?idCliente={idCliente}",
                    contactosInsertar: "/ClientesContactos/Insertar",
                    contactosActualizar: "/ClientesContactos/Actualizar",
                    contactosEliminar: "/ClientesContactos/Eliminar?id={id}"
                },
                onSaved: null,
                onDeleted: null,
                onBeforeOpen: null,
                onOpen: null,
                onGuardarModelo: null
            }, options || {});

            this.modalEl = this.root.matches("[data-cliente-modal]")
                ? this.root
                : this.root.querySelector("[data-cliente-modal]");

            if (!this.modalEl) {
                throw new Error("No se encontr? [data-cliente-modal].");
            }

            this.bsModal = new bootstrap.Modal(this.modalEl);
            this._ultimoModo = "nuevo";
            this._modeloActual = null;
            this._contactosCache = [];
            this._contactoSeleccionadoId = 0;

            this._camposObligatorios = ["txtNombre", "txtCuit", "cmbSucursal"];
            this._comboPorController = {
                Sucursales: { selectId: "cmbSucursal", url: this.options.endpoints.sucursales },
                Provincias: { selectId: "cmbProvincia", url: this.options.endpoints.provincias },
                ClientesProfesiones: { selectId: "cmbProfesion", url: this.options.endpoints.profesiones },
                CondicionesIva: { selectId: "cmbCondicionIva", url: this.options.endpoints.condicionesIva }
            };

            window.clienteModal = this;
            this._bindEvents();
            this._bindModalEvents();
            this._bindContactosEvents();
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
            ["cmbSucursal", "cmbProvincia", "cmbProfesion", "cmbCondicionIva"].forEach(id => {
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

            this.bloquearControlesContactos(disabled || !this.getId());
        }

        _activarTabDatos() {
            const tabBtn = this._id("tabBtnDatosCliente");
            if (tabBtn && window.bootstrap?.Tab) {
                window.bootstrap.Tab.getOrCreateInstance(tabBtn).show();
            }
        }

        prepararContactosNuevo() {
            this._contactosCache = [];
            this._contactoSeleccionadoId = 0;
            this.limpiarFormContacto();
            this.renderListaContactos();
            this.actualizarBadgeClienteContactos();
            this.habilitarSeccionContactos(false);
            this._activarTabDatos();
        }

        habilitarSeccionContactos(habilitar) {
            const section = this._id("sectionContactosCliente");
            const hint = this._id("contactoHint");
            if (!section || !hint) return;

            if (habilitar) {
                section.classList.remove("rp-section-disabled");
                hint.classList.add("success");
                hint.innerHTML = `<i class="fa fa-check-circle"></i> Ya pod\u00E9s administrar los contactos del cliente.`;
            } else {
                section.classList.add("rp-section-disabled");
                hint.classList.remove("success");
                hint.innerHTML = `<i class="fa fa-info-circle"></i> Guard\u00E1 el cliente para administrar contactos.`;
            }

            this.bloquearControlesContactos(this.isSoloLectura() || !habilitar);
        }

        bloquearControlesContactos(bloquear) {
            const ids = [
                "txtContactoNombre", "txtContactoPuesto", "txtContactoTelefono",
                "txtContactoTelefonoAlt", "txtContactoEmail"
            ];
            ids.forEach(id => {
                const el = this._id(id);
                if (el) el.disabled = !!bloquear;
            });

            const btnGuardar = this._id("btnGuardarContacto");
            const btnNuevo = this._id("btnNuevoContacto");
            if (btnGuardar) btnGuardar.disabled = !!bloquear;
            if (btnNuevo) btnNuevo.disabled = !!bloquear;

            const lista = this._id("listaContactosCliente");
            if (lista) {
                lista.querySelectorAll(".btn-eliminar-contacto").forEach(btn => {
                    btn.disabled = !!bloquear;
                });
            }
        }

        actualizarBadgeClienteContactos() {
            const nombre = (this._getFieldValue("txtNombre") || "").trim();
            const badge = this._id("contactoClienteNombre");
            if (badge) badge.textContent = nombre || "Nuevo";
        }

        limpiarFormContacto() {
            this._contactoSeleccionadoId = 0;
            this._setFieldValue("txtContactoId", "");
            this._setFieldValue("txtContactoNombre", "");
            this._setFieldValue("txtContactoPuesto", "");
            this._setFieldValue("txtContactoTelefono", "");
            this._setFieldValue("txtContactoTelefonoAlt", "");
            this._setFieldValue("txtContactoEmail", "");
            const titulo = this._id("contactoFormTitulo");
            if (titulo) titulo.textContent = "Nuevo contacto";
            this._id("listaContactosCliente")?.querySelectorAll(".rp-contact-item")
                .forEach(el => el.classList.remove("active"));
        }

        renderListaContactos() {
            const cont = this._id("listaContactosCliente");
            const cant = this._id("contactoCantidad");
            if (!cont) return;

            const items = this._contactosCache || [];
            if (cant) cant.textContent = String(items.length);

            if (!items.length) {
                const idCliente = this.getId();
                cont.innerHTML = `<div class="rp-contact-empty">${
                    idCliente > 0
                        ? "No hay contactos cargados. Agreg\u00E1 uno desde el formulario."
                        : "Guard\u00E1 el cliente para ver contactos."
                }</div>`;
                return;
            }

            cont.innerHTML = items.map(c => {
                const meta = [
                    c.Telefono,
                    c.Email
                ].filter(Boolean).join(" \u00B7 ");
                const active = c.Id === this._contactoSeleccionadoId ? " active" : "";
                return `
                    <div class="rp-contact-item${active}" data-id="${c.Id}">
                        <div class="flex-grow-1">
                            <div class="rp-contact-item-main">
                                <strong>${this._escapeHtml(c.Nombre || "")}</strong>
                                ${c.Puesto ? `<small>${this._escapeHtml(c.Puesto)}</small>` : ""}
                            </div>
                            ${meta ? `<div class="rp-contact-item-meta">${this._escapeHtml(meta)}</div>` : ""}
                        </div>
                        <div class="rp-contact-item-actions">
                            <button type="button"
                                    class="btn btn-sm btn-outline-danger btn-eliminar-contacto"
                                    data-id="${c.Id}"
                                    title="Eliminar">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    </div>`;
            }).join("");
        }

        _escapeHtml(text) {
            return String(text ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
        }

        seleccionarContacto(id) {
            const item = (this._contactosCache || []).find(x => x.Id === id);
            if (!item) return;

            this._contactoSeleccionadoId = id;
            this._setFieldValue("txtContactoId", item.Id);
            this._setFieldValue("txtContactoNombre", item.Nombre || "");
            this._setFieldValue("txtContactoPuesto", item.Puesto || "");
            this._setFieldValue("txtContactoTelefono", item.Telefono || "");
            this._setFieldValue("txtContactoTelefonoAlt", item.TelefonoAlt || "");
            this._setFieldValue("txtContactoEmail", item.Email || "");

            const titulo = this._id("contactoFormTitulo");
            if (titulo) titulo.textContent = "Editar contacto";

            this.renderListaContactos();
        }

        nuevoContacto() {
            if (!this.getId()) return;
            this.limpiarFormContacto();
        }

        validarFormContacto() {
            const nombre = (this._getFieldValue("txtContactoNombre") || "").trim();
            if (!nombre) {
                if (typeof errorModal === "function") {
                    errorModal("El nombre del contacto es obligatorio.");
                }
                return false;
            }
            return true;
        }

        async cargarContactos(idCliente) {
            if (!idCliente || idCliente <= 0) {
                this.prepararContactosNuevo();
                return;
            }

            try {
                const url = this._replaceUrl(this.options.endpoints.contactosLista, { idCliente });
                const data = await this._fetchJson(url, {
                    method: "GET",
                    headers: this._headers(false)
                });
                this._contactosCache = Array.isArray(data) ? data : [];
                this.limpiarFormContacto();
                this.renderListaContactos();
                this.habilitarSeccionContactos(true);
            } catch (e) {
                console.error(e);
                this._contactosCache = [];
                this.renderListaContactos();
            }
        }

        async guardarContacto() {
            if (this.isSoloLectura()) return;
            const idCliente = this.getId();
            if (!idCliente) {
                if (typeof errorModal === "function") {
                    errorModal("Guard\u00E1 el cliente antes de agregar contactos.");
                }
                return;
            }
            if (!this.validarFormContacto()) return;

            const idContacto = this._toInt(this._getFieldValue("txtContactoId")) || 0;
            const modelo = {
                Id: idContacto,
                IdCliente: idCliente,
                Nombre: (this._getFieldValue("txtContactoNombre") || "").trim(),
                Puesto: this._getFieldValue("txtContactoPuesto") || null,
                Telefono: this._getFieldValue("txtContactoTelefono") || null,
                TelefonoAlt: this._getFieldValue("txtContactoTelefonoAlt") || null,
                Email: this._getFieldValue("txtContactoEmail") || null
            };

            const esNuevo = !modelo.Id;
            const url = esNuevo
                ? this.options.endpoints.contactosInsertar
                : this.options.endpoints.contactosActualizar;
            const method = esNuevo ? "POST" : "PUT";

            try {
                const data = await this._fetchJson(url, {
                    method,
                    headers: this._headers(true),
                    body: JSON.stringify(modelo)
                });

                if (!data?.valor) {
                    if (typeof errorModal === "function") {
                        errorModal(data?.mensaje || "No se pudo guardar el contacto.");
                    }
                    return;
                }

                if (typeof exitoModal === "function") {
                    exitoModal(data.mensaje || "Contacto guardado correctamente");
                }

                await this.cargarContactos(idCliente);
                if (esNuevo && data.id) {
                    this.seleccionarContacto(data.id);
                }
            } catch (e) {
                console.error(e);
                if (typeof errorModal === "function") {
                    errorModal("Ha ocurrido un error al guardar el contacto.");
                }
            }
        }

        async eliminarContacto(id) {
            if (this.isSoloLectura()) return;

            const confirmado = typeof confirmarModal === "function"
                ? await confirmarModal("\u00BFDesea eliminar este contacto?")
                : window.confirm("\u00BFDesea eliminar este contacto?");

            if (!confirmado) return;

            try {
                const url = this._replaceUrl(this.options.endpoints.contactosEliminar, { id });
                const data = await this._fetchJson(url, {
                    method: "DELETE",
                    headers: this._headers(false)
                });

                if (!data?.valor) {
                    if (typeof errorModal === "function") {
                        errorModal(data?.mensaje || "No se pudo eliminar el contacto.");
                    }
                    return;
                }

                if (typeof exitoModal === "function") {
                    exitoModal(data.mensaje || "Contacto eliminado correctamente");
                }

                await this.cargarContactos(this.getId());
            } catch (e) {
                console.error(e);
                if (typeof errorModal === "function") {
                    errorModal("Ha ocurrido un error al eliminar el contacto.");
                }
            }
        }

        _bindContactosEvents() {
            const lista = this._id("listaContactosCliente");
            if (lista) {
                lista.addEventListener("click", (e) => {
                    const btnDel = e.target.closest(".btn-eliminar-contacto");
                    if (btnDel) {
                        e.stopPropagation();
                        const id = parseInt(btnDel.getAttribute("data-id"), 10);
                        if (id) this.eliminarContacto(id);
                        return;
                    }

                    const item = e.target.closest(".rp-contact-item");
                    if (item) {
                        const id = parseInt(item.getAttribute("data-id"), 10);
                        if (id) this.seleccionarContacto(id);
                    }
                });
            }

            const txtNombre = this._id("txtNombre");
            if (txtNombre) {
                txtNombre.addEventListener("input", () => this.actualizarBadgeClienteContactos());
            }
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
                this.prepararContactosNuevo();

                await this.cargarCombos();

                this._id("modalEdicionLabel").textContent = "Nuevo Cliente";
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
            this._setFieldValue("txtTelefonoAlt", modelo.TelefonoAlt || "");
            this._setFieldValue("txtEmail", modelo.Email || "");
            this._setFieldValue("txtDomicilio", modelo.Domicilio || "");
            this._setFieldValue("txtLocalidad", modelo.Localidad || "");
            this._setFieldValue("txtCodPostal", modelo.CodPostal || "");

            if (modelo.IdSucursal) this._setFieldValue("cmbSucursal", modelo.IdSucursal, true);
            if (modelo.IdProvincia) this._setFieldValue("cmbProvincia", modelo.IdProvincia, true);
            if (modelo.IdProfesion) this._setFieldValue("cmbProfesion", modelo.IdProfesion, true);
            if (modelo.IdCondicionIva) this._setFieldValue("cmbCondicionIva", modelo.IdCondicionIva, true);

            this._setAuditoria(modelo);

            this._id("modalEdicionLabel").textContent = soloLectura ? "Ver Cliente" : "Editar Cliente";
            this._id("btnGuardar").innerHTML = `<i class="fa fa-check"></i> Guardar`;

            this.actualizarBadgeClienteContactos();
            if (modelo?.Id > 0) {
                await this.cargarContactos(modelo.Id);
                this.setModalSoloLectura(soloLectura);
            } else {
                this.prepararContactosNuevo();
            }

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
            this.resetSelect("cmbSucursal", "Seleccionar");
            this.resetSelect("cmbProvincia", "Seleccionar");
            this.resetSelect("cmbProfesion", "Seleccionar");
            this.resetSelect("cmbCondicionIva", "Seleccionar");

            await Promise.all([
                this._llenarCombo("cmbSucursal", this.options.endpoints.sucursales),
                this._llenarCombo("cmbProvincia", this.options.endpoints.provincias),
                this._llenarCombo("cmbProfesion", this.options.endpoints.profesiones),
                this._llenarCombo("cmbCondicionIva", this.options.endpoints.condicionesIva)
            ]);

            this.inicializarSelect2Modal();
        }

        async guardar() {
            if (this.isSoloLectura()) return true;
            if (!this.validarCampos()) return false;

            const id = this._getFieldValue("txtId");

            const modelo = {
                Id: id !== "" ? parseInt(id, 10) : 0,
                IdSucursal: this._getIntOrNull("cmbSucursal"),
                Nombre: this._getFieldValue("txtNombre"),
                Cuit: this._getFieldValue("txtCuit"),
                Telefono: this._getFieldValue("txtTelefono"),
                TelefonoAlt: this._getFieldValue("txtTelefonoAlt"),
                Email: this._getFieldValue("txtEmail"),
                Domicilio: this._getFieldValue("txtDomicilio"),
                Localidad: this._getFieldValue("txtLocalidad"),
                CodPostal: this._getFieldValue("txtCodPostal"),
                IdProvincia: this._getIntOrNull("cmbProvincia"),
                IdProfesion: this._getIntOrNull("cmbProfesion"),
                IdCondicionIva: this._getIntOrNull("cmbCondicionIva")
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
                exitoModal(data.mensaje || (esNuevo ? "Cliente registrado correctamente" : "Cliente modificado correctamente"));

                if (esNuevo && data.id) {
                    this._setFieldValue("txtId", data.id);
                    this._id("modalEdicionLabel").textContent = "Editar Cliente";
                    this._id("btnGuardar").innerHTML = `<i class="fa fa-check"></i> Guardar`;
                    this._ultimoModo = "editar";
                    this.actualizarBadgeClienteContactos();
                    await this.cargarContactos(data.id);

                    const tabBtn = this._id("tabBtnContactosCliente");
                    if (tabBtn && window.bootstrap?.Tab) {
                        window.bootstrap.Tab.getOrCreateInstance(tabBtn).show();
                    }

                    if (typeof this.options.onSaved === "function") {
                        await this.options.onSaved(data, { ...modelo, Id: data.id }, this);
                    }
                    return true;
                }

                this.cerrar();

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
                ? await confirmarModal("?Desea eliminar este cliente?")
                : window.confirm("?Desea eliminar este cliente?");

            if (!confirmado) return false;

            try {
                const url = this._replaceUrl(this.options.endpoints.eliminar, { id });
                const data = await this._fetchJson(url, {
                    method: "DELETE",
                    headers: this._headers(false)
                });

                if (!data.valor) {
                    this.mostrarErrorCampos(data.mensaje || "No se pudo eliminar.", data.idReferencia ?? null, data.tipo || "error");
                    return false;
                }

                exitoModal(data.mensaje || "Cliente eliminado correctamente");

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
                el.classList.remove("is-invalid", "is-valid");

                if (el.tagName === "SELECT" && window.jQuery?.(el).data("select2")) {
                    const { $selection, $container } = this.getSelect2Selection(el);
                    $selection.removeClass("is-invalid is-valid");
                    $container.removeClass("is-invalid is-valid");
                }
            });
            this.cerrarErrorCampos();
            this._id("infoAuditoria")?.classList.add("d-none");
            if (this._id("infoRegistro")) this._id("infoRegistro").innerHTML = "";
            if (this._id("infoModificacion")) this._id("infoModificacion").innerHTML = "";
            this._refreshAllSelect2();
            this.prepararContactosNuevo();
        }

        _valorCampoValido(el) {
            const valor = (el?.value ?? "").toString().trim();
            return valor !== "" && valor !== "Seleccionar";
        }

        validarCampoIndividual(el) {
            if (this.isSoloLectura()) return true;
            if (!el || !this._camposObligatorios.includes(el.id)) return true;

            const esValido = this._valorCampoValido(el);
            this.setEstadoCampo(el, esValido);
            this.verificarErroresGenerales();
            return esValido;
        }

        verificarErroresGenerales() {
            const panel = this._id("errorCampos");
            if (!panel) return;
            const hayInvalidos = this.modalEl.querySelectorAll(".is-invalid").length > 0;
            if (!hayInvalidos) this.cerrarErrorCampos();
        }

        validarCampos() {
            const campos = [
                { id: "txtNombre", nombre: "Nombre" },
                { id: "txtCuit", nombre: "CUIT" },
                { id: "cmbSucursal", nombre: "Sucursal" }
            ];

            const errores = [];

            campos.forEach(c => {
                const el = this._id(c.id);
                if (!el) return;
                const esValido = this._valorCampoValido(el);
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

            if (el.tagName === "SELECT" && window.jQuery?.(el).data("select2")) {
                const { $selection, $container } = this.getSelect2Selection(el);
                $selection.removeClass("is-invalid is-valid").addClass(esValido ? "is-valid" : "is-invalid");
                $container.removeClass("is-invalid is-valid").addClass(esValido ? "is-valid" : "is-invalid");
            }
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
                if (el) this.validarCampoIndividual(el);
            }
        }

        _bindConfiguracionActualizada() {
            if (this._configListener) return;

            this._configListener = async (e) => {
                try {
                    await this._onConfiguracionActualizada(e.detail || {});
                } catch (err) {
                    console.error("Error recargando combo tras configuraci?n", err);
                }
            };

            document.addEventListener("configuracionActualizada", this._configListener);
        }

        mostrarErrorCampos(mensaje, idReferencia = null, tipo = "validacion") {
            const container = this._id("errorCampos");
            if (!container) return;

            let titulo = "Campos requeridos";
            let icono = "fa-exclamation-circle";

            if (tipo === "duplicado") titulo = "Registro duplicado detectado";
            else if (tipo === "relacion") { titulo = "No se puede eliminar"; icono = "fa-link"; }
            else if (tipo === "error") { titulo = "No se pudo guardar"; icono = "fa-times-circle"; }

            let botonReferencia = "";
            if (idReferencia) {
                botonReferencia = `
                    <button class="rp-btn-ref" onclick="verFicha(${idReferencia})">
                        <i class="fa fa-eye me-1"></i> Abrir ficha existente ???
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

            this.modalEl.addEventListener("input", (e) => {
                const target = e.target;
                if (target?.matches("input, select, textarea")) {
                    this.validarCampoIndividual(target);
                }
            });

            this.modalEl.addEventListener("change", (e) => {
                const target = e.target;
                if (target?.matches("input, select, textarea")) {
                    this.validarCampoIndividual(target);
                }
            });

            this.modalEl.addEventListener("blur", (e) => {
                const target = e.target;
                if (target?.matches("input, select, textarea")) {
                    this.validarCampoIndividual(target);
                }
            }, true);
        }

        _bindModalEvents() {
            this.modalEl.addEventListener("shown.bs.modal", () => {
                this.inicializarSelect2Modal();

                if (window.jQuery) {
                    const $modal = window.jQuery(this.modalEl);
                    $modal.off("select2:select.mclientes select2:clear.mclientes");
                    $modal.on("select2:select.mclientes select2:clear.mclientes", "select", (e) => {
                        if (e.target) this.validarCampoIndividual(e.target);
                    });
                }
            });
        }
    }

    window.guardarCliente = function () {
        return window.clienteModal?.guardar?.();
    };

    window.guardarContactoCliente = function () {
        return window.clienteModal?.guardarContacto?.();
    };

    window.nuevoContactoCliente = function () {
        return window.clienteModal?.nuevoContacto?.();
    };

    window.cerrarErrorCampos = function () {
        return window.clienteModal?.cerrarErrorCampos?.();
    };

    window.ClienteModal = ClienteModal;

})(window);
