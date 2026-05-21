(function (window) {
    "use strict";

    class PersonalModal {
        constructor(root, options = {}) {
            if (!root) throw new Error("PersonalModal requiere un root.");

            this.root = root;
            this.options = Object.assign({
                token: window.token || "",
                endpoints: {
                    editar: "/Personal/EditarInfo?id={id}",
                    insertar: "/Personal/Insertar",
                    actualizar: "/Personal/Actualizar",
                    eliminar: "/Personal/Eliminar?id={id}",
                    paises: "/Paises/Lista",
                    tiposDocumento: "/PaisesTiposDocumentos/Lista",
                    condicionesIva: "/PaisesCondicionesIVA/Lista",
                    roles: "/PersonalRol/Lista",
                    artistas: "/Artistas/Lista"
                },
                onSaved: null,
                onDeleted: null,
                onBeforeOpen: null,
                onOpen: null,
                onGuardarModelo: null
            }, options || {});

            this.modalEl = this.root.matches("[data-personal-modal]")
                ? this.root
                : this.root.querySelector("[data-personal-modal]");

            if (!this.modalEl) {
                throw new Error("No se encontró [data-personal-modal].");
            }

            this.bsModal = new bootstrap.Modal(this.modalEl);

            this.rolesCatalogo = [];
            this.artistasCache = [];
            this.artistasSeleccionado = [];
            this.artistasDesdeArtista = [];
            this.artistasAutomatico = [];

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

        _triggerChange(id) {
            const el = this._id(id);
            if (!el) return;
            const ev = new Event("change", { bubbles: true });
            el.dispatchEvent(ev);
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
           ESTADO SOLO LECTURA
        ========================= */

        setModalSoloLectura(soloLectura) {
            const disabled = !!soloLectura;

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

            const btnGuardar = this._id("btnGuardar");
            if (btnGuardar) {
                btnGuardar.classList.toggle("d-none", disabled);
            }

            this._qa("select").forEach(el => {
                const $el = window.jQuery(el);
                if ($el.data("select2")) {
                    $el.prop("disabled", el.disabled);
                    $el.trigger("change.select2");
                }
            });
        }

        /* =========================
           INIT / EVENTS
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

                if (target.id === "txtBuscarArtista") {
                    this._filtrarChecklistArtistas(target.value || "");
                }
            });

            this.modalEl.addEventListener("change", async (e) => {
                const target = e.target;
                if (!target) return;

                if (target.matches("input, select, textarea")) {
                    this.validarCampoIndividual(target);
                }

                if (target.matches("#listaRoles input[type='checkbox']")) {
                    this.evaluarBloqueArtistas();
                    this.actualizarContadoresTabs();
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

    
                    $modal.off("select2:select.mpersonal select2:clear.mpersonal", "select");

                    $modal.on("select2:select.mpersonal select2:clear.mpersonal", "select", async (e) => {
                        const target = e.target;

                        this.validarCampoIndividual(target);

                        if (target.id === "cmbPais") {
                            await this._onPaisChange();
                        }
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

            if (!Permisos.tiene("Personal", "Crear")) {
                errorModal("No tenés permisos.");
                return;
            }

            if (typeof this.options.onBeforeOpen === "function") {
                await this.options.onBeforeOpen("nuevo", this);
            }

            this.limpiarModal();
            this.setModalSoloLectura(false);

            this.artistasSeleccionado = [];
            this.artistasAutomatico = [];
            this.artistasDesdeArtista = [];

            await Promise.all([
                this.listaPaises(),
                this.listaRoles(),
                this.cargarArtistasChecklist(true)
            ]);

            this.evaluarPestaniaArtistas();

            this.resetSelect("cmbTipoDocumento", "Seleccionar");
            this.resetSelect("cmbCondicionIva", "Seleccionar");

            this.inicializarSelect2Modal();
            this.renderChecklistArtistas();
            this.activarBuscadorArtistas();
            this.actualizarContadoresTabs();

            this._setTextoGuardar("Registrar");
            this._setTitulo("Nuevo Personal");

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

            this.bsModal.show();

            if (typeof this.options.onOpen === "function") {
                await this.options.onOpen("nuevo", this);
            }
        }

        async abrirEditar(id) {
            try {

                if (!Permisos.tiene("Personal", "Editar")) {
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

            const tabDatos = this.modalEl.querySelector('#personalTabs button[data-bs-target="#tabDatos"]');
            if (tabDatos) {
                const tab = new bootstrap.Tab(tabDatos);
                tab.show();
            }

            this._setFieldValue("txtId", modelo.Id || "");
            this._setFieldValue("txtNombre", modelo.Nombre || "");
            this._setFieldValue("txtDni", modelo.Dni || "");
            this._setFieldValue("txtNumeroDocumento", modelo.NumeroDocumento || "");
            this._setFieldValue("txtDireccion", modelo.Direccion || "");
            this._setFieldValue("txtTelefono", modelo.Telefono || "");
            this._setFieldValue("txtEmail", modelo.Email || "");
            this._setFieldValue("txtFechaNacimiento", this.normalizarDateInput(modelo.FechaNacimiento));

            await Promise.all([
                this.listaPaises(),
                this.listaRoles(),
                this.cargarArtistasChecklist(true)
            ]);

            if (modelo.IdPais != null) {
                this._setFieldValue("cmbPais", modelo.IdPais, true);
                await this.listaTiposDocumento(modelo.IdPais);
                await this.listaCondicionesIva(modelo.IdPais);
            } else {
                this.resetSelect("cmbTipoDocumento", "Seleccionar");
                this.resetSelect("cmbCondicionIva", "Seleccionar");
            }

            if (modelo.IdTipoDocumento != null) {
                this._setFieldValue("cmbTipoDocumento", modelo.IdTipoDocumento, true);
            }

            if (modelo.IdCondicionIva != null) {
                this._setFieldValue("cmbCondicionIva", modelo.IdCondicionIva, true);
            }

            if (modelo.RolesIds) {
                this._qa("#listaRoles input[type=checkbox]").forEach(chk => {
                    const id = parseInt(chk.value, 10);
                    chk.checked = modelo.RolesIds.includes(id);
                });
            }

            this.artistasSeleccionado = Array.isArray(modelo.ArtistasIds)
                ? modelo.ArtistasIds.map(x => parseInt(x, 10))
                : [];

            this.artistasDesdeArtista = Array.isArray(modelo.ArtistasDesdeArtistaIds)
                ? modelo.ArtistasDesdeArtistaIds.map(x => parseInt(x, 10))
                : [];

            this.artistasAutomatico = Array.isArray(modelo.ArtistasAutomaticosIds)
                ? modelo.ArtistasAutomaticosIds.map(x => parseInt(x, 10))
                : [];

            this.evaluarBloqueArtistas();
            this.renderChecklistArtistas();
            this.activarBuscadorArtistas();
            this.actualizarContadoresTabs();

            this._setAuditoria(modelo);

            const chk = this._id("chkAsociacionAutomatica");
            if (chk) {
                chk.checked = true;
                chk.disabled = true;
            }

            this._setTextoGuardar("Guardar");
            this._setTitulo(soloLectura ? "Ver Personal" : "Editar Personal");

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
            const fechaNacimiento = this._getFieldValue("txtFechaNacimiento") || null;

            const modelo = {
                Id: id !== "" ? parseInt(id, 10) : 0,

                Nombre: this._getFieldValue("txtNombre"),
                Dni: this._getFieldValue("txtDni"),

                IdPais: this._getIntOrNull("cmbPais"),
                IdTipoDocumento: this._getIntOrNull("cmbTipoDocumento"),
                NumeroDocumento: this._getFieldValue("txtNumeroDocumento"),

                Direccion: this._getFieldValue("txtDireccion"),
                Telefono: this._getFieldValue("txtTelefono"),
                Email: this._getFieldValue("txtEmail"),

                FechaNacimiento: fechaNacimiento,

                IdCondicionIva: this._getIntOrNull("cmbCondicionIva"),

                RolesIds: this.getRolesSeleccionadosIds(),
                ArtistasIds: [...this.artistasSeleccionado]
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
                            ? "Personal registrado correctamente"
                            : "Personal modificado correctamente")
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

            if (!Permisos.tiene("Personal", "Eliminar")) {
                errorModal("No tenés permisos.");
                return;
            }


            let confirmado = true;

            if (typeof window.confirmarModal === "function") {
                confirmado = await window.confirmarModal("¿Desea eliminar este registro de personal?");
            } else {
                confirmado = window.confirm("¿Desea eliminar este registro de personal?");
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
                    window.exitoModal(data.mensaje || "Personal eliminado correctamente");
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

        async _onPaisChange() {
            const idPais = this._getFieldValue("cmbPais");

            const tipoDocActual = this._getFieldValue("cmbTipoDocumento");
            const ivaActual = this._getFieldValue("cmbCondicionIva");

            await this.listaTiposDocumento(idPais);
            await this.listaCondicionesIva(idPais);

            if (tipoDocActual) {
                this._setFieldValue("cmbTipoDocumento", tipoDocActual, true);
            }

            if (ivaActual) {
                this._setFieldValue("cmbCondicionIva", ivaActual, true);
            }
        }

        /* =========================
           ROLES
        ========================= */

        async listaRoles() {
            const data = await this._fetchJson(this.options.endpoints.roles, {
                headers: this._headers(false)
            });

            this.rolesCatalogo = Array.isArray(data) ? data : [];

            const container = this._id("listaRoles");
            if (!container) return;

            container.innerHTML = "";

            this.rolesCatalogo.forEach(x => {
                container.insertAdjacentHTML("beforeend", `
                    <label class="rp-check-item">
                        <input type="checkbox" value="${x.Id}">
                        <span>${x.Nombre}</span>
                    </label>
                `);
            });

            this.actualizarContadoresTabs();
        }

        getRolesSeleccionadosIds() {
            const ids = [];
            this._qa("#listaRoles input[type=checkbox]:checked").forEach(chk => {
                ids.push(parseInt(chk.value, 10));
            });
            return ids;
        }

        evaluarPestaniaArtistas() {
            const rolesIds = this.getRolesSeleccionadosIds();
            const tieneRol = true;

            const tabBtn = this._id("tabArtistasBtn");
            if (!tabBtn) return;

            if (rolesIds.length > 0 && tieneRol) {
                tabBtn.classList.remove("d-none");
            } else {
                tabBtn.classList.add("d-none");
                this.artistasSeleccionado = [];
                this.renderChecklistArtistas();
                this.actualizarContadoresTabs();
            }
        }

        evaluarBloqueArtistas() {
            this.evaluarPestaniaArtistas();
        }

        /* =========================
           ARTISTAS CHECKLIST
        ========================= */

        async cargarArtistasChecklist(force = false) {
            if (!force && this.artistasCache.length > 0) return;

            try {
                const data = await this._fetchJson(this.options.endpoints.artistas, {
                    method: "GET",
                    headers: this._headers(false)
                });

                this.artistasCache = Array.isArray(data) ? data : [];
            } catch (e) {
                console.error("No se pudo cargar Artistas", e);
                this.artistasCache = [];
            }
        }

        renderChecklistArtistas() {
            const cont = this._id("listaArtistas");
            if (!cont) return;

            cont.innerHTML = "";

            cont.insertAdjacentHTML("beforeend", `
                <div class="mb-3">
                    <input type="text"
                           id="txtBuscarArtista"
                           class="form-control"
                           placeholder="Buscar artista...">
                </div>

                <div class="rp-checklist-box">
                    <div id="listaArtistasItems" class="rp-checklist"></div>
                </div>
            `);

            const items = this._id("listaArtistasItems");
            if (!items) return;

            const asignados = [];
            const disponibles = [];

            (this.artistasCache || []).forEach(a => {
                const id = parseInt(a.Id, 10);

                const estaAsignado =
                    this.artistasSeleccionado.includes(id) ||
                    this.artistasAutomatico.includes(id) ||
                    this.artistasDesdeArtista.includes(id);

                if (estaAsignado) asignados.push(a);
                else disponibles.push(a);
            });

            const getNombre = a => (a.NombreArtistico || a.Nombre || "").toString();

            const ordenar = (a, b) =>
                getNombre(a).localeCompare(getNombre(b));

            asignados.sort(ordenar);
            disponibles.sort(ordenar);

            const renderGrupo = (titulo, lista, claseGrupo) => {
                if (!lista.length) return;

                items.insertAdjacentHTML("beforeend", `
                    <div class="rp-check-group ${claseGrupo}">
                        <div class="rp-check-group-title">
                            ${titulo}
                            <span class="rp-check-count">(${lista.length})</span>
                        </div>
                    </div>
                `);

                lista.forEach(a => {
                    const id = parseInt(a.Id, 10);

                    const esManual = this.artistasSeleccionado.includes(id);
                    const esAuto = this.artistasAutomatico.includes(id);
                    const esDesde = this.artistasDesdeArtista.includes(id);

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

                    const nombre = getNombre(a);

                    items.insertAdjacentHTML("beforeend", `
                         <label class="rp-check-item ${claseExtra}"
                               data-nombre="${nombre.toLowerCase()}">
                            <input type="checkbox"
                                   value="${id}"
                                   ${checked}
                                   ${disabled}
                                   onchange="toggleClienteProductora(${id})">

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

            this.activarBuscadorArtistas();
            this.actualizarContadoresTabs();
        }

        toggleArtista(id) {
            id = parseInt(id, 10);

            if (this.artistasAutomatico.includes(id)) return;
            if (this.artistasDesdeArtista.includes(id)) return;

            if (this.artistasSeleccionado.includes(id)) {
                this.artistasSeleccionado = this.artistasSeleccionado.filter(x => x !== id);
            } else {
                this.artistasSeleccionado.push(id);
            }

            this.renderChecklistArtistas();
        }

        activarBuscadorArtistas() {
            const input = this._id("txtBuscarArtista");
            if (!input) return;

            input.oninput = () => {
                const texto = (input.value || "").toLowerCase();

                this._qa("#listaArtistasItems .rp-check-item").forEach(el => {
                    const nombre = (el.getAttribute("data-nombre") || "").toLowerCase();
                    el.style.display = nombre.includes(texto) ? "" : "none";
                });
            };
        }

        _filtrarChecklistArtistas(texto) {
            const t = (texto || "").toLowerCase();

            this._qa("#listaArtistasItems .rp-check-item").forEach(el => {
                const nombre = (el.getAttribute("data-nombre") || "").toLowerCase();
                el.style.display = nombre.includes(t) ? "" : "none";
            });
        }

        actualizarContadoresTabs() {
            const cantRoles = this._qa("#listaRoles input:checked").length;

            const cantArtistas =
                (this.artistasSeleccionado?.length || 0) +
                (this.artistasDesdeArtista?.length || 0) +
                (this.artistasAutomatico?.length || 0);

            const contadorRoles = this._id("contadorRoles");
            const contadorArtistas = this._id("contadorArtistas");

            if (contadorRoles) contadorRoles.textContent = `(${cantRoles})`;
            if (contadorArtistas) contadorArtistas.textContent = `(${cantArtistas})`;
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

            this.artistasSeleccionado = [];
            this.artistasAutomatico = [];
            this.artistasDesdeArtista = [];

            this.cerrarErrorCampos();

            const infoAuditoria = this._id("infoAuditoria");
            const infoRegistro = this._id("infoRegistro");
            const infoModificacion = this._id("infoModificacion");

            if (infoAuditoria) infoAuditoria.classList.add("d-none");
            if (infoRegistro) infoRegistro.innerHTML = "";
            if (infoModificacion) infoModificacion.innerHTML = "";

            this.actualizarContadoresTabs();
            this._refreshAllSelect2();
        }

        validarCampoIndividual(el) {
            const camposObligatorios = [
                "txtNombre",
                "cmbPais",
                "txtDni",
                "txtNumeroDocumento"
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
                { id: "txtDni", nombre: "DNI" },
                { id: "txtNumeroDocumento", nombre: "Número Documento" }
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
                        onclick="verFicha(${idReferencia})">
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

        /* =========================
           HELPERS DE FECHA / SELECT
        ========================= */

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
    }

    // Compatibilidad con inline onclicks viejos
    window.toggleArtista = function (id) {
        if (window.personalModal && typeof window.personalModal.toggleArtista === "function") {
            return window.personalModal.toggleArtista(id);
        }
    };

    window.guardarPersonal = function () {
        if (window.personalModal && typeof window.personalModal.guardar === "function") {
            return window.personalModal.guardar();
        }
    };

    window.cerrarErrorCampos = function () {
        if (window.personalModal && typeof window.personalModal.cerrarErrorCampos === "function") {
            return window.personalModal.cerrarErrorCampos();
        }
    };

    window.PersonalModal = PersonalModal;

})(window);