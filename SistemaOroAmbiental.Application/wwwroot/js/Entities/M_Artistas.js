(function (window) {
    "use strict";

    class ArtistasModal {
        constructor(root, options = {}) {
            if (!root) throw new Error("ArtistasModal requiere un root.");

            this.root = root;
            this.options = Object.assign({
                token: window.token || "",
                endpoints: {
                    editar: "/Artistas/EditarInfo?id={id}",
                    insertar: "/Artistas/Insertar",
                    actualizar: "/Artistas/Actualizar",
                    eliminar: "/Artistas/Eliminar?id={id}",
                    productoras: "/Productoras/Lista",
                    paises: "/Paises/Lista",
                    provinciasPorPais: "/PaisesProvincia/ListaPais?idPais={idPais}",
                    tiposDocumento: "/PaisesTiposDocumentos/Lista",
                    condicionesIva: "/PaisesCondicionesIVA/Lista",
                    monedas: "/PaisesMoneda/Lista",
                    personal: "/Personal/Lista"
                },
                onSaved: null,
                onDeleted: null,
                onBeforeOpen: null,
                onOpen: null,
                onGuardarModelo: null
            }, options || {});

            this.modalEl = this.root.matches("[data-artista-modal]")
                ? this.root
                : this.root.querySelector("[data-artista-modal]");

            if (!this.modalEl) {
                throw new Error("No se encontró [data-artista-modal].");
            }
            this.bsModal = new bootstrap.Modal(this.modalEl);

            this.personalCache = [];
            this.personalSeleccionado = [];
            this.personalAutomatico = [];
            this.personalDesdePersonal = [];

            this._bindEvents();
            this._bindModalEvents();
        }

        /* =========================
           HELPERS DOM
        ========================= */

        _q(selector) {
            return this.root.querySelector(selector);
        }

        _qa(selector) {
            return Array.from(this.root.querySelectorAll(selector));
        }

        field(name) {
            return this._q(`[data-field="${name}"]`);
        }

        role(name) {
            return this._q(`[data-role="${name}"]`);
        }

        action(name) {
            return this._q(`[data-action="${name}"]`);
        }

        getId() {
            const v = this.field("Id")?.value;
            return v ? parseInt(v, 10) : 0;
        }

        isSoloLectura() {
            return this.field("SoloLectura")?.value === "1";
        }

        setSoloLectura(value) {
            const hidden = this.field("SoloLectura");
            if (hidden) hidden.value = value ? "1" : "0";

            const disabled = !!value;

            this._qa("input, select, textarea, button[data-action='guardar']").forEach(el => {
                if (el.dataset.action === "cerrar-error") return;
                if (el.hasAttribute("data-bs-dismiss")) return;

                if (el.dataset.field === "SoloLectura") return;
                if (el.dataset.field === "Id") return;

                if (el.dataset.action === "guardar") {
                    el.classList.toggle("d-none", disabled);
                    return;
                }

                if (el.type === "checkbox") {
                    el.disabled = disabled;
                } else {
                    el.disabled = disabled;
                    el.readOnly = disabled;
                }
            });

            this._syncSelect2Disabled();
        }

        _headers() {
            const h = {
                "Content-Type": "application/json"
            };

            if (this.options.token) {
                h["Authorization"] = "Bearer " + this.options.token;
            }

            return h;
        }

        _replaceUrl(url, values) {
            let result = url;
            Object.keys(values || {}).forEach(k => {
                result = result.replace(`{${k}}`, values[k]);
            });
            return result;
        }

        async _fetchJson(url, options = {}) {
            const res = await fetch(url, options);
            if (!res.ok) {
                throw new Error(`Error HTTP ${res.status}`);
            }
            return await res.json();
        }

        /* =========================
           INIT / EVENTS
        ========================= */

        _bindEvents() {
            const guardarBtn = this.action("guardar");
            if (guardarBtn) {
                guardarBtn.addEventListener("click", () => this.guardar());
            }

            const cerrarErrorBtn = this.action("cerrar-error");
            if (cerrarErrorBtn) {
                cerrarErrorBtn.addEventListener("click", () => this.cerrarErrorCampos());
            }

            this.root.addEventListener("input", (e) => {
                const target = e.target;
                if (!target) return;

                if (target.matches("[data-field]")) {
                    this.validarCampoIndividual(target);
                }

                if (target.matches("[data-role='buscarPersonal']")) {
                    this._filtrarChecklistPersonal(target.value || "");
                }
            });

            this.root.addEventListener("change", async (e) => {
                const target = e.target;
                if (!target) return;

                if (target.matches("[data-field]")) {
                    this.validarCampoIndividual(target);
                }

                if (target.matches("[data-field='IdPais']")) {
                    await this._onPaisChange();
                }

                if (target.matches("[data-personal-check='1']")) {
                    this._togglePersonalFromCheckbox(target);
                }
            });

            this.root.addEventListener("blur", (e) => {
                const target = e.target;
                if (!target) return;

                if (target.matches("[data-field]")) {
                    this.validarCampoIndividual(target);
                }
            }, true);
        }

        _bindModalEvents() {
            this.modalEl.addEventListener("shown.bs.modal", () => {
                this._initSelect2Modal();
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

        _initSelect2Modal() {
            if (!window.jQuery || !window.jQuery.fn || !window.jQuery.fn.select2) return;

            const $modal = window.jQuery(this.modalEl);

            window.jQuery(this.root).find("select").each(function () {
                const $el = window.jQuery(this);

                if ($el.data("select2")) return;

                $el.select2({
                    width: "100%",
                    dropdownParent: $modal,
                    allowClear: true,
                    placeholder: "Seleccionar"
                });

                $el.on("select2:select select2:clear change", () => {
                    const ev = new Event("change", { bubbles: true });
                    this.dispatchEvent(ev);
                });
            });

            this._syncSelect2Disabled();
        }

        _syncSelect2Disabled() {
            if (!window.jQuery || !window.jQuery.fn || !window.jQuery.fn.select2) return;

            window.jQuery(this.root).find("select").each(function () {
                const $el = window.jQuery(this);
                if (!$el.data("select2")) return;

                $el.prop("disabled", this.disabled);
                $el.trigger("change.select2");
            });
        }

        /* =========================
           OPEN / CLOSE
        ========================= */

        async abrirNuevo() {

            if (!Permisos.tiene("Artistas", "Crear")) {
                errorModal("No tenés permisos.");
                return;
            }

            if (typeof this.options.onBeforeOpen === "function") {
                await this.options.onBeforeOpen("nuevo", this);
            }

            this.limpiarModal();
            this.setSoloLectura(false);

            this.personalSeleccionado = [];
            this.personalAutomatico = [];
            this.personalDesdePersonal = [];

            await Promise.all([
                this.listaProductoras(),
                this.listaPaises(),
                this.listaMonedas(),
                this.cargarPersonalChecklist(true)
            ]);

            this.resetSelect("IdProvincia", "Seleccionar");
            this.resetSelect("IdTipoDocumento", "Seleccionar");
            this.resetSelect("IdCondicionIva", "Seleccionar");

            this.renderChecklistPersonal();

            this._setTitulo("Nuevo Artista");
            this._setTextoGuardar("Registrar");
            this._setAuditoria(null);

            const chk = this.field("AsociacionAutomatica");
            if (chk) {
                chk.checked = true;
                chk.disabled = true;
            }

            this.bsModal.show();

            if (typeof this.options.onOpen === "function") {
                await this.options.onOpen("nuevo", this);
            }
        }

        async abrirEditar(id) {

            if (!Permisos.tiene("Artistas", "Editar")) {
                errorModal("No tenés permisos.");
                return;
            }
            const url = this._replaceUrl(this.options.endpoints.editar, { id });

            const modelo = await this._fetchJson(url, {
                method: "GET",
                headers: this._headers()
            });

            await this.mostrarModal(modelo, false);
        }

        async abrirVer(id) {
            const url = this._replaceUrl(this.options.endpoints.editar, { id });

            const modelo = await this._fetchJson(url, {
                method: "GET",
                headers: this._headers()
            });

            await this.mostrarModal(modelo, true);
        }

        cerrar() {
            this.bsModal.hide();
        }

        async mostrarModal(modelo, soloLectura = false) {
            if (typeof this.options.onBeforeOpen === "function") {
                await this.options.onBeforeOpen(soloLectura ? "ver" : "editar", this, modelo);
            }

            this.limpiarModal();
            this.setSoloLectura(false);

            this._setFieldValue("Id", modelo.Id || "");
            this._setFieldValue("Nombre", modelo.Nombre || "");
            this._setFieldValue("NombreArtistico", modelo.NombreArtistico || "");
            this._setFieldValue("Telefono", modelo.Telefono || "");
            this._setFieldValue("TelefonoAlternativo", modelo.TelefonoAlternativo || "");
            this._setFieldValue("Dni", modelo.Dni || "");
            this._setFieldValue("NumeroDocumento", modelo.NumeroDocumento || "");
            this._setFieldValue("Email", modelo.Email || "");
            this._setFieldValue("Direccion", modelo.Direccion || "");
            this._setFieldValue("Localidad", modelo.Localidad || "");
            this._setFieldValue("EntreCalles", modelo.EntreCalles || "");
            this._setFieldValue("CodigoPostal", modelo.CodigoPostal || "");
            this._setFieldValue("FechaNacimiento", this.normalizarDateInput(modelo.FechaNacimiento));
            this._setFieldValue("PrecioUnitario", modelo.PrecioUnitario ?? "");
            this._setFieldValue("PrecioNegMax", modelo.PrecioNegMax ?? "");
            this._setFieldValue("PrecioNegMin", modelo.PrecioNegMin ?? "");

            const chk = this.field("AsociacionAutomatica");
            if (chk) {
                chk.checked = true;
                chk.disabled = true;
            }

            await this.listaProductoras();
            await this.listaPaises();
            await this.listaMonedas();

            if (modelo.IdPais != null) {
                this._setFieldValue("IdPais", modelo.IdPais);
                this._triggerChange("IdPais");

                await this.listaTiposDocumento(modelo.IdPais);
                await this.listaCondicionesIva(modelo.IdPais);
                await this.listaProvincias(modelo.IdPais);
            } else {
                this.resetSelect("IdProvincia", "Seleccionar");
                this.resetSelect("IdTipoDocumento", "Seleccionar");
                this.resetSelect("IdCondicionIva", "Seleccionar");
            }

            if (modelo.IdProductora != null) this._setFieldValue("IdProductora", modelo.IdProductora, true);
            if (modelo.IdTipoDocumento != null) this._setFieldValue("IdTipoDocumento", modelo.IdTipoDocumento, true);
            if (modelo.IdCondicionIva != null) this._setFieldValue("IdCondicionIva", modelo.IdCondicionIva, true);
            if (modelo.IdProvincia != null) this._setFieldValue("IdProvincia", modelo.IdProvincia, true);
            if (modelo.IdMoneda != null) this._setFieldValue("IdMoneda", modelo.IdMoneda, true);

            this.personalSeleccionado = Array.isArray(modelo.PersonalIds) ? modelo.PersonalIds.map(x => parseInt(x, 10)) : [];
            this.personalAutomatico = Array.isArray(modelo.PersonalAutomaticosIds) ? modelo.PersonalAutomaticosIds.map(x => parseInt(x, 10)) : [];
            this.personalDesdePersonal = Array.isArray(modelo.PersonalDesdePersonalIds) ? modelo.PersonalDesdePersonalIds.map(x => parseInt(x, 10)) : [];

            await this.cargarPersonalChecklist(true);
            this.renderChecklistPersonal();

            this._setAuditoria(modelo);

            this._setTitulo(soloLectura ? "Ver Artista" : "Editar Artista");
            this._setTextoGuardar(soloLectura ? "Guardar" : "Guardar");

            this.bsModal.show();
            this.setSoloLectura(soloLectura);

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

            const modelo = this.obtenerModelo();

            if (typeof this.options.onGuardarModelo === "function") {
                const result = await this.options.onGuardarModelo(modelo, this);
                if (result === false) return false;
            }

            const id = modelo.Id || 0;
            const esNuevo = !id;
            const url = esNuevo ? this.options.endpoints.insertar : this.options.endpoints.actualizar;
            const method = esNuevo ? "POST" : "PUT";

            try {
                const data = await this._fetchJson(url, {
                    method,
                    headers: this._headers(),
                    body: JSON.stringify(modelo)
                });

                if (!data || data.valor === undefined) {
                    this.mostrarErrorCampos("Respuesta inválida del servidor.");
                    return false;
                }

                if (!data.valor) {
                    const msg =
                        (data.mensaje && String(data.mensaje).trim() !== "")
                            ? data.mensaje
                            : (data.tipo === "validacion"
                                ? "Debes completar los campos requeridos."
                                : "No se pudo guardar.");

                    this.mostrarErrorCampos(msg, data.idReferencia ?? null, data.tipo ?? null);
                    return false;
                }

                this.cerrarErrorCampos();
                this.cerrar();

                if (typeof window.exitoModal === "function") {
                    window.exitoModal(data.mensaje || "Guardado correctamente");
                }

                if (typeof this.options.onSaved === "function") {
                    await this.options.onSaved(data, modelo, this);
                }

                return true;
            } catch (e) {
                console.error(e);
                this.mostrarErrorCampos("Error inesperado.");
                return false;
            }
        }

        async eliminar(id) {

            if (!Permisos.tiene("Artistas", "Eliminar")) {
                errorModal("No tenés permisos.");
                return;
            }

            let confirmado = true;

            if (typeof window.confirmarModal === "function") {
                confirmado = await window.confirmarModal("¿Desea eliminar este artista?");
            } else {
                confirmado = window.confirm("¿Desea eliminar este artista?");
            }

            if (!confirmado) return false;

            try {
                const url = this._replaceUrl(this.options.endpoints.eliminar, { id });

                const data = await this._fetchJson(url, {
                    method: "DELETE",
                    headers: this._headers()
                });

                if (data && data.valor) {
                    if (typeof window.exitoModal === "function") {
                        window.exitoModal("Artista eliminado correctamente");
                    }

                    if (typeof this.options.onDeleted === "function") {
                        await this.options.onDeleted(data, id, this);
                    }

                    return true;
                }

                if (typeof window.errorModal === "function") {
                    window.errorModal("No se pudo eliminar.");
                } else {
                    alert("No se pudo eliminar.");
                }

                return false;
            } catch (e) {
                console.error(e);

                if (typeof window.errorModal === "function") {
                    window.errorModal("Ha ocurrido un error.");
                } else {
                    alert("Ha ocurrido un error.");
                }

                return false;
            }
        }

        /* =========================
           MODELO
        ========================= */

        obtenerModelo() {
            const id = this.getId();

            return {
                Id: id !== 0 ? id : 0,

                Nombre: this._getFieldValue("Nombre"),
                NombreArtistico: this._getFieldValue("NombreArtistico"),

                IdProductora: this._getIntOrNull("IdProductora"),

                IdPais: this._getIntOrNull("IdPais"),
                IdProvincia: this._getIntOrNull("IdProvincia"),

                IdTipoDocumento: this._getIntOrNull("IdTipoDocumento"),
                NumeroDocumento: this._getFieldValue("NumeroDocumento"),

                IdCondicionIva: this._getIntOrNull("IdCondicionIva"),

                Dni: this._getFieldValue("Dni"),
                Telefono: this._getFieldValue("Telefono"),
                TelefonoAlternativo: this._getFieldValue("TelefonoAlternativo"),

                Email: this._getFieldValue("Email"),

                Direccion: this._getFieldValue("Direccion"),
                Localidad: this._getFieldValue("Localidad"),
                EntreCalles: this._getFieldValue("EntreCalles"),
                CodigoPostal: this._getFieldValue("CodigoPostal"),

                FechaNacimiento: this._getFieldValue("FechaNacimiento") || null,

                IdMoneda: this._getIntOrNull("IdMoneda"),
                PrecioUnitario: this.toDecimal(this._getFieldValue("PrecioUnitario")),
                PrecioNegMax: this.toDecimal(this._getFieldValue("PrecioNegMax")),
                PrecioNegMin: this.toDecimal(this._getFieldValue("PrecioNegMin")),

                AsociacionAutomatica: !!this.field("AsociacionAutomatica")?.checked,

                PersonalIds: [...this.personalSeleccionado]
            };
        }

        /* =========================
           PERSONAL CHECKLIST
        ========================= */

        async cargarPersonalChecklist(force = false) {
            if (!force && this.personalCache.length > 0) return;

            const data = await this._fetchJson(this.options.endpoints.personal, {
                method: "GET",
                headers: this._headers()
            });

            this.personalCache = Array.isArray(data) ? data : [];
        }

        renderChecklistPersonal() {
            const cont = this.role("listaPersonal");
            if (!cont) return;

            cont.innerHTML = "";

            const asignados = [];
            const disponibles = [];

            (this.personalCache || []).forEach(p => {
                const id = parseInt(p.Id, 10);

                const estaAsignado =
                    this.personalSeleccionado.includes(id) ||
                    this.personalAutomatico.includes(id) ||
                    this.personalDesdePersonal.includes(id);

                if (estaAsignado) asignados.push(p);
                else disponibles.push(p);
            });

            const ordenar = (a, b) => (a.Nombre || "").localeCompare(b.Nombre || "");

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

                lista.forEach(p => {
                    const id = parseInt(p.Id, 10);

                    const esManual = this.personalSeleccionado.includes(id);
                    const esAuto = this.personalAutomatico.includes(id);
                    const esDesde = this.personalDesdePersonal.includes(id);

                    let checked = "";
                    let disabled = "";
                    let badge = "";
                    let claseExtra = "";

                    if (esManual) {
                        checked = "checked";
                        badge = `<span class="rp-badge manual">Manual</span>`;
                        claseExtra = "manual";
                    } else if (esAuto) {
                        checked = "checked";
                        disabled = "disabled";
                        badge = `<span class="rp-badge auto">Automático</span>`;
                        claseExtra = "auto";
                    } else if (esDesde) {
                        checked = "checked";
                        disabled = "disabled";
                        badge = `<span class="rp-badge cli">Automático</span>`;
                        claseExtra = "cli";
                    }

                    cont.insertAdjacentHTML("beforeend", `
                        <label class="rp-check-item ${claseExtra}">
                            <input type="checkbox"
                                   data-personal-check="1"
                                   value="${id}"
                                   ${checked}
                                   ${disabled}>
                            <span class="rp-check-text">
                                ${p.Nombre}
                                ${badge}
                            </span>
                        </label>
                    `);
                });
            };

            renderGrupo(`<i class="fa fa-check-circle"></i> Asignados`, asignados, "grupo-asignados");
            renderGrupo(`<i class="fa fa-list"></i> Disponibles`, disponibles, "grupo-disponibles");

            this.actualizarContadorPersonal();
            this._filtrarChecklistPersonal(this.role("buscarPersonal")?.value || "");
        }

        _togglePersonalFromCheckbox(chk) {
            const id = parseInt(chk.value, 10);

            if (this.personalAutomatico.includes(id)) {
                chk.checked = true;
                return;
            }

            if (this.personalDesdePersonal.includes(id)) {
                chk.checked = true;
                return;
            }

            if (chk.checked) {
                if (!this.personalSeleccionado.includes(id)) {
                    this.personalSeleccionado.push(id);
                }
            } else {
                this.personalSeleccionado = this.personalSeleccionado.filter(x => x !== id);
            }

            this.renderChecklistPersonal();
        }

        actualizarContadorPersonal() {
            const cnt = this.role("cntPersonal");
            if (!cnt) return;

            cnt.textContent = `(${this.personalSeleccionado.length + this.personalAutomatico.length + this.personalDesdePersonal.length})`;
        }

        _filtrarChecklistPersonal(texto) {
            const t = (texto || "").toLowerCase();

            this._qa("[data-role='listaPersonal'] .rp-check-item").forEach(el => {
                const nombre = (el.innerText || "").toLowerCase();
                el.style.display = nombre.includes(t) ? "" : "none";
            });
        }

        /* =========================
           COMBOS
        ========================= */

        resetSelect(fieldName, placeholder) {
            const el = this.field(fieldName);
            if (!el) return;

            el.innerHTML = "";
            el.append(new Option(placeholder || "Seleccionar", ""));
            this._refreshSelect2Field(fieldName);
        }

        async listaProductoras() {
            const data = await this._fetchJson(this.options.endpoints.productoras, {
                headers: this._headers()
            });

            this.resetSelect("IdProductora", "Seleccionar");
            const select = this.field("IdProductora");
            (data || []).forEach(x => select.append(new Option(x.Nombre, x.Id)));
            this._refreshSelect2Field("IdProductora");
        }

        async listaMonedas() {
            const data = await this._fetchJson(this.options.endpoints.monedas, {
                headers: this._headers()
            });

            this.resetSelect("IdMoneda", "Seleccionar");
            const select = this.field("IdMoneda");
            (data || []).forEach(x => select.append(new Option(x.Nombre, x.Id)));
            this._refreshSelect2Field("IdMoneda");
        }

        async listaPaises() {
            const data = await this._fetchJson(this.options.endpoints.paises, {
                headers: this._headers()
            });

            this.resetSelect("IdPais", "Seleccionar");
            const select = this.field("IdPais");
            (data || []).forEach(x => select.append(new Option(x.Nombre, x.Id)));
            this._refreshSelect2Field("IdPais");
        }

        async listaTiposDocumento(idPaisSeleccionado = null) {
            const data = await this._fetchJson(this.options.endpoints.tiposDocumento, {
                headers: this._headers()
            });

            this.resetSelect("IdTipoDocumento", "Seleccionar");
            const select = this.field("IdTipoDocumento");

            (data || [])
                .filter(x => !idPaisSeleccionado || x.IdCombo == idPaisSeleccionado)
                .forEach(x => select.append(new Option(x.Nombre, x.Id)));

            this._refreshSelect2Field("IdTipoDocumento");
        }

        async listaCondicionesIva(idPaisSeleccionado = null) {
            const data = await this._fetchJson(this.options.endpoints.condicionesIva, {
                headers: this._headers()
            });

            this.resetSelect("IdCondicionIva", "Seleccionar");
            const select = this.field("IdCondicionIva");

            (data || [])
                .filter(x => !idPaisSeleccionado || x.IdCombo == idPaisSeleccionado)
                .forEach(x => select.append(new Option(x.Nombre, x.Id)));

            this._refreshSelect2Field("IdCondicionIva");
        }

        async listaProvincias(idPaisSeleccionado = null) {
            this.resetSelect("IdProvincia", "Seleccionar");

            if (!idPaisSeleccionado) return;

            const url = this._replaceUrl(this.options.endpoints.provinciasPorPais, { idPais: idPaisSeleccionado });
            const data = await this._fetchJson(url, {
                headers: this._headers()
            });

            const select = this.field("IdProvincia");
            (data || []).forEach(x => select.append(new Option(x.Nombre, x.Id)));
            this._refreshSelect2Field("IdProvincia");
        }

        async _onPaisChange() {
            const idPais = this._getFieldValue("IdPais");

            const tipoDocActual = this._getFieldValue("IdTipoDocumento");
            const ivaActual = this._getFieldValue("IdCondicionIva");
            const provinciaActual = this._getFieldValue("IdProvincia");

            await this.listaTiposDocumento(idPais);
            await this.listaCondicionesIva(idPais);
            await this.listaProvincias(idPais);

            if (tipoDocActual) this._setFieldValue("IdTipoDocumento", tipoDocActual, true);
            if (ivaActual) this._setFieldValue("IdCondicionIva", ivaActual, true);
            if (provinciaActual) this._setFieldValue("IdProvincia", provinciaActual, true);
        }

        /* =========================
           VALIDACIONES
        ========================= */

        limpiarModal() {
            this._qa("input, select, textarea").forEach(el => {
                if (el.type === "checkbox") {
                    if (el.dataset.field === "AsociacionAutomatica") el.checked = true;
                    else el.checked = false;
                } else if (el.tagName === "SELECT") {
                    el.selectedIndex = 0;
                } else {
                    el.value = "";
                }

                el.classList.remove("is-invalid", "is-valid");
            });

            this.personalSeleccionado = [];
            this.personalAutomatico = [];
            this.personalDesdePersonal = [];

            this.cerrarErrorCampos();
            this._setAuditoria(null);
            this.actualizarContadorPersonal();
            this._refreshAllSelect2();
        }

        validarCampoIndividual(el) {
            if (this.isSoloLectura()) return true;
            if (!el || !el.dataset || el.dataset.required !== "1") return true;

            const esValido = this._isValidRequiredValue(el);
            this.setEstadoCampo(el, esValido);
            this.verificarErroresGenerales();

            return esValido;
        }

        verificarErroresGenerales() {
            const panel = this.role("errorPanel");
            if (!panel) return;

            const hayInvalidos = this._qa(".is-invalid").length > 0;
            if (!hayInvalidos) panel.classList.add("d-none");
        }

        validarCampos() {
            if (this.isSoloLectura()) return true;

            const campos = [
                { field: "Nombre", nombre: "Nombre completo" },
                { field: "NombreArtistico", nombre: "Nombre artístico" },
                { field: "IdPais", nombre: "País" },
                { field: "NumeroDocumento", nombre: "Número documento" },
                { field: "Dni", nombre: "DNI" }
            ];

            const errores = [];

            campos.forEach(c => {
                const el = this.field(c.field);
                if (!el) return;

                const esValido = this._isValidRequiredValue(el);
                this.setEstadoCampo(el, esValido);

                if (!esValido) errores.push(c.nombre);
            });

            if (errores.length > 0) {
                this.mostrarErrorCampos(`Debes completar los campos requeridos:<br><strong>${errores.join(", ")}</strong>`, null, "validacion");
                return false;
            }

            this.cerrarErrorCampos();
            return true;
        }

        _isValidRequiredValue(el) {
            if (!el) return false;
            if (el.type === "checkbox") return !!el.checked;

            const valor = (el.value ?? "").toString().trim();
            return valor !== "" && valor !== "Seleccionar";
        }

        setEstadoCampo(el, esValido) {
            if (!el) return;

            el.classList.remove("is-valid", "is-invalid");
            el.classList.add(esValido ? "is-valid" : "is-invalid");
        }

        mostrarErrorCampos(
            mensaje,
            idReferencia = null,
            tipo = "validacion" // validacion | duplicado | relacion | error
        ) {

            const container = this.root.querySelector("#errorCampos");
            if (!container) return;

            /* =========================
               CONFIG SEGÚN TIPO
            ========================= */

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

            /* =========================
               BOTON REFERENCIA
            ========================= */

            let botonReferencia = "";

            if (idReferencia) {
                botonReferencia = `
            <button class="rp-btn-ref"
                onclick="verFicha(${idReferencia})">
                <i class="fa fa-eye me-1"></i>
                Abrir ficha existente →
            </button>`;
            }

            /* =========================
               RENDER
            ========================= */

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

            const container = this.root.querySelector("#errorCampos");
            if (!container) return;

            container.classList.add("d-none");
            container.innerHTML = "";
        }

        /* =========================
           AUDITORIA
        ========================= */

        _setAuditoria(modelo) {
            const wrap = this.role("infoAuditoria");
            const reg = this.role("infoRegistro");
            const mod = this.role("infoModificacion");

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

        _setTitulo(txt) {
            const el = this.role("tituloModal");
            if (el) el.textContent = txt || "";
        }

        _setTextoGuardar(txt) {
            const el = this.role("textoBotonGuardar");
            if (el) el.textContent = txt || "";
        }

        /* =========================
           FIELD HELPERS
        ========================= */

        _getFieldValue(name) {
            const el = this.field(name);
            if (!el) return "";

            if (el.type === "checkbox") return el.checked;
            return el.value ?? "";
        }

        _setFieldValue(name, value, refreshSelect2 = false) {
            const el = this.field(name);
            if (!el) return;

            if (el.type === "checkbox") {
                el.checked = !!value;
            } else {
                el.value = value ?? "";
            }

            if (refreshSelect2) this._refreshSelect2Field(name);
        }

        _getIntOrNull(name) {
            const v = this._getFieldValue(name);
            return v ? parseInt(v, 10) : null;
        }

        _triggerChange(fieldName) {
            const el = this.field(fieldName);
            if (!el) return;

            const ev = new Event("change", { bubbles: true });
            el.dispatchEvent(ev);
        }

        _refreshSelect2Field(fieldName) {
            if (!window.jQuery) return;

            const el = this.field(fieldName);
            if (!el) return;

            const $el = window.jQuery(el);
            if ($el.data("select2")) {
                $el.trigger("change.select2");
            }
        }

        _refreshAllSelect2() {
            if (!window.jQuery) return;

            window.jQuery(this.root).find("select").each(function () {
                const $el = window.jQuery(this);
                if ($el.data("select2")) {
                    $el.trigger("change.select2");
                }
            });
        }

        /* =========================
           HELPERS VARIOS
        ========================= */

        toDecimal(val) {
            if (val == null) return 0;
            const s = (val + "").trim();
            if (!s) return 0;
            const n = Number(s.replace(",", "."));
            return Number.isFinite(n) ? n : 0;
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

        formatearFecha(fecha) {
            try {
                const d = new Date(fecha);
                return d.toLocaleString("es-AR");
            } catch {
                return fecha;
            }
        }
    }

    async function injectArtistasModal(container, options = {}) {
        const target = typeof container === "string" ? document.querySelector(container) : container;
        if (!target) throw new Error("No se encontró el contenedor para inyectar m_artistas.");

        const url = options.partialUrl || "/Artistas";
        const html = await fetch(url, { method: "GET" }).then(r => {
            if (!r.ok) throw new Error("No se pudo cargar /Entities/m_artistas");
            return r.text();
        });

        target.innerHTML = html;

        return new ArtistasModal(target, options);
    }

    window.ArtistasModal = ArtistasModal;
    window.injectArtistasModal = injectArtistasModal;

})(window);