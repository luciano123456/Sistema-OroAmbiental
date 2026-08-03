(function (window) {
    "use strict";

    class EstablecimientoModal {

        constructor(root, options = {}) {

            if (!root) {
                throw new Error("EstablecimientoModal requiere un root.");
            }

            this.root = root;

            this.options = Object.assign({
                token: window.token || "",
                endpoints: {
                    editar: "/ClientesEstablecimientos/EditarInfo?id={id}",
                    insertar: "/ClientesEstablecimientos/Insertar",
                    actualizar: "/ClientesEstablecimientos/Actualizar",
                    eliminar: "/ClientesEstablecimientos/Eliminar?id={id}",
                    clientes: "/Clientes/Lista",
                    clienteEditar: "/Clientes/EditarInfo?id={id}",
                    provincias: "/Provincias/Lista",
                    partidosPorProvincia: "/Partidos/ListaPorProvincia?idProvincia={idProvincia}",
                    localidadesPorPartido: "/Localidades/ListaPorPartido?idPartido={idPartido}",
                    condicionesIva: "/CondicionesIva/Lista",
                    dias: "/Dias/Lista",
                    semanas: "/Semanas/Lista",
                    listasPrecios: "/ListasPrecios/Lista",
                    camiones: "/Camiones/Lista?soloActivos=true",
                    tiposGenerador: "/ClientesTiposGenerador/Lista",
                    contactosLista: "/ClientesEstablecimientosContactos/ListaPorEstablecimiento?idEstablecimiento={idEstablecimiento}",
                    contactosInsertar: "/ClientesEstablecimientosContactos/Insertar",
                    contactosActualizar: "/ClientesEstablecimientosContactos/Actualizar",
                    contactosEliminar: "/ClientesEstablecimientosContactos/Eliminar?id={id}",
                    productosCatalogo: "/Productos/Lista?soloActivos=true",
                    productosPrecios: "/ProductosPrecios/ListaPorProducto?idProducto={idProducto}",
                    productosLista: "/ClientesEstablecimientosProductos/ListaPorEstablecimiento?idEstablecimiento={idEstablecimiento}",
                    productosInsertar: "/ClientesEstablecimientosProductos/Insertar",
                    productosActualizar: "/ClientesEstablecimientosProductos/Actualizar",
                    productosEliminar: "/ClientesEstablecimientosProductos/Eliminar?id={id}"
                },
                onSaved: null,
                onDeleted: null,
                onBeforeOpen: null,
                onOpen: null,
                onGuardarModelo: null
            }, options || {});

            this.modalEl = this.root.matches("[data-establecimiento-modal]")
                ? this.root
                : this.root.querySelector("[data-establecimiento-modal]");

            if (!this.modalEl) {
                throw new Error("No se encontr\u00F3 [data-establecimiento-modal].");
            }

            this.bsModal = new bootstrap.Modal(this.modalEl);
            this._ultimoModo = "nuevo";
            this._modeloActual = null;
            this._contactosCache = [];
            this._contactoSeleccionadoId = 0;
            this._productosCache = [];
            this._productoSeleccionadoId = 0;
            this._productosPrecioBound = false;
            this._precioListaSeq = 0;
            this._omitirAutoPrecio = false;
            this._cargarCombosSeq = 0;
            this._cargarPartidosSeq = 0;
            this._cargarLocalidadesSeq = 0;
            this._localidadesCargando = false;
            this._geoCache = { partidos: [], localidades: [] };
            this._localidadLegacy = null;

            this._camposObligatorios = [
                "cmbClienteEst", "txtNombreEst", "cmbDiaEst", "cmbSemanaEst"
            ];
            this._validacion = new ValidacionModalAbm({
                modalEl: this.modalEl,
                getPanel: () => this._id("errorCamposEst"),
                campos: [
                    { id: "cmbClienteEst", nombre: "Cliente" },
                    { id: "txtNombreEst", nombre: "Nombre establecimiento" },
                    { id: "cmbDiaEst", nombre: "D\u00EDa recolecci\u00F3n" },
                    { id: "cmbSemanaEst", nombre: "Semana recolecci\u00F3n" }
                ],
                esCampoValido: (el) => this._valorCampoValido(el),
                isSoloLectura: () => this.isSoloLectura(),
                mostrarError: (msg) => this.mostrarErrorCampos(msg, null, "validacion"),
                cerrarPanel: () => this.cerrarErrorCampos()
            });
            this._comboPorController = {
                CondicionesIva: { selectId: "cmbCondicionIvaEst", url: this.options.endpoints.condicionesIva },
                Provincias: { selectId: "cmbProvinciaEst", url: this.options.endpoints.provincias },
                Partidos: { selectId: "cmbPartidoEst", dependent: true },
                Localidades: { selectId: "cmbLocalidadEst", dependent: true },
                Dias: { selectId: "cmbDiaEst", url: this.options.endpoints.dias },
                Semanas: { selectId: "cmbSemanaEst", url: this.options.endpoints.semanas },
                ListasPrecios: { selectId: "cmbListaPrecioProdEst", url: this.options.endpoints.listasPrecios },
                ClientesTiposGenerador: { selectId: "cmbTipoGeneradorEst", url: this.options.endpoints.tiposGenerador, textField: "Etiqueta" },
                Camiones: { selectId: "cmbCamionEst", url: this.options.endpoints.camiones }
            };

            window.establecimientoModal = this;
            this._bindEvents();
            this._bindModalEvents();
            this._bindContactosEvents();
            this._bindProductosEvents();
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

        _leerNumero(valor) {
            if (typeof parseNumero === "function") return parseNumero(valor);
            if (valor === null || valor === undefined || valor === "") return 0;
            const n = parseFloat(String(valor).replace(/\./g, "").replace(",", "."));
            return Number.isNaN(n) ? 0 : n;
        }

        _parseHorario(valor) {
            if (!valor) return "";
            const s = String(valor);
            return s.length >= 5 ? s.substring(0, 5) : s;
        }

        _getFieldValue(id) {
            const el = this._id(id);
            if (!el) return "";
            if (el.type === "checkbox") return el.checked;
            if (window.jQuery) {
                const $el = window.jQuery(el);
                if ($el.data("select2")) return $el.val() ?? "";
            }
            return el.value ?? "";
        }

        _setFieldValue(id, value, refreshSelect2 = false) {
            const el = this._id(id);
            if (!el) return;
            if (el.type === "checkbox") {
                el.checked = !!value;
                if (id === "chkImpuestoIvaEst") this._syncIvaCardUI();
                return;
            }
            el.value = value ?? "";
            if (refreshSelect2) this._refreshSelect2Field(id);
        }

        _setCantidadField(valor) {
            const el = this._id("txtCantidadEst");
            if (!el) return;
            el.value = valor ?? "";
            if (typeof formatearMilesInput === "function" && el.value) {
                formatearMilesInput(el);
            }
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
            const value = this._getFieldValue("txtIdEst");
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
            [
                "cmbClienteEst", "cmbCondicionIvaEst", "cmbProvinciaEst", "cmbPartidoEst",
                "cmbLocalidadEst", "cmbTipoGeneradorEst",
                "cmbDiaEst", "cmbSemanaEst", "cmbCamionEst",
                "cmbProductoEst", "cmbListaPrecioProdEst"
            ].forEach(id => {
                this.ensureSelect2(window.jQuery(this._id(id)), opts);
            });
        }

        setModalSoloLectura(soloLectura) {
            const disabled = !!soloLectura;
            this.setSoloLecturaAttribute(disabled);

            this.modalEl.querySelectorAll("input, select, textarea").forEach(el => {
                if (el.id === "txtIdEst") return;
                const esCodigoGeo = el.id === "txtCodigoPartidoEst" || el.id === "txtCodigoLocalidadEst";
                el.disabled = disabled || esCodigoGeo;
                if (el.type !== "checkbox") el.readOnly = disabled || esCodigoGeo;
            });

            const btnGuardar = this._id("btnGuardarEst");
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
            this._setLocalidadDisabled(
                disabled || this._localidadesCargando || !this._getIntOrNull("cmbPartidoEst")
            );

            const idEst = this.getId();
            this.bloquearControlesContactos(disabled || !idEst);
            this.bloquearControlesProductos(disabled || !idEst);
        }

        _activarTabDatos() {
            const tabBtn = this._id("tabBtnDatosEst");
            if (tabBtn && window.bootstrap?.Tab) {
                window.bootstrap.Tab.getOrCreateInstance(tabBtn).show();
            }
        }

        actualizarBadgeEstablecimiento() {
            const nombre = (this._getFieldValue("txtNombreEst") || "").trim();
            const badgeContacto = this._id("contactoEstNombre");
            const badgeProducto = this._id("productoEstNombre");
            if (badgeContacto) badgeContacto.textContent = nombre || "Nuevo";
            if (badgeProducto) badgeProducto.textContent = nombre || "Nuevo";
        }

        // --- Contactos ---

        prepararContactosNuevo() {
            this._contactosCache = [];
            this._contactoSeleccionadoId = 0;
            this.limpiarFormContacto();
            this.renderListaContactos();
            this.actualizarBadgeEstablecimiento();
            this.habilitarSeccionContactos(false);
            this._activarTabDatos();
        }

        habilitarSeccionContactos(habilitar) {
            const section = this._id("sectionContactosEst");
            const hint = this._id("contactoEstHint");
            if (!section || !hint) return;

            if (habilitar) {
                section.classList.remove("rp-section-disabled");
                hint.classList.add("success");
                hint.innerHTML = `<i class="fa fa-check-circle"></i> Ya pod\u00E9s administrar los contactos del establecimiento.`;
            } else {
                section.classList.add("rp-section-disabled");
                hint.classList.remove("success");
                hint.innerHTML = `<i class="fa fa-info-circle"></i> Guard\u00E1 el establecimiento para administrar contactos.`;
            }

            this.bloquearControlesContactos(this.isSoloLectura() || !habilitar);
        }

        bloquearControlesContactos(bloquear) {
            const ids = [
                "txtContactoEstNombre", "txtContactoEstPuesto", "txtContactoEstTelefono",
                "txtContactoEstTelefonoAlt", "txtContactoEstEmail"
            ];
            ids.forEach(id => {
                const el = this._id(id);
                if (el) el.disabled = !!bloquear;
            });

            const btnGuardar = this._id("btnGuardarContactoEst");
            const btnNuevo = this._id("btnNuevoContactoEst");
            if (btnGuardar) btnGuardar.disabled = !!bloquear;
            if (btnNuevo) btnNuevo.disabled = !!bloquear;

            const lista = this._id("listaContactosEst");
            if (lista) {
                lista.querySelectorAll(".btn-eliminar-contacto").forEach(btn => {
                    btn.disabled = !!bloquear;
                });
            }
        }

        limpiarFormContacto() {
            this._contactoSeleccionadoId = 0;
            this._setFieldValue("txtContactoEstId", "");
            this._setFieldValue("txtContactoEstNombre", "");
            this._setFieldValue("txtContactoEstPuesto", "");
            this._setFieldValue("txtContactoEstTelefono", "");
            this._setFieldValue("txtContactoEstTelefonoAlt", "");
            this._setFieldValue("txtContactoEstEmail", "");
            const titulo = this._id("contactoEstFormTitulo");
            if (titulo) titulo.textContent = "Nuevo contacto";
            this._id("listaContactosEst")?.querySelectorAll(".rp-sub-item")
                .forEach(el => el.classList.remove("active"));
        }

        renderListaContactos() {
            const cont = this._id("listaContactosEst");
            const cant = this._id("contactoEstCantidad");
            if (!cont) return;

            const items = this._contactosCache || [];
            if (cant) cant.textContent = String(items.length);

            if (!items.length) {
                const idEst = this.getId();
                cont.innerHTML = `
                    <div class="rp-sub-empty">
                        <i class="fa fa-address-book-o"></i>
                        <p>${idEst > 0
                            ? "No hay contactos. Agreg\u00E1 uno desde el formulario."
                            : "Guard\u00E1 el establecimiento para ver contactos."}</p>
                    </div>`;
                return;
            }

            cont.innerHTML = items.map(c => {
                const meta = [c.Telefono, c.Email].filter(Boolean).join(" \u00B7 ");
                const active = c.Id === this._contactoSeleccionadoId ? " active" : "";
                return `
                    <div class="rp-sub-item${active}" data-id="${c.Id}">
                        <div class="rp-sub-item-avatar"><i class="fa fa-user"></i></div>
                        <div class="rp-sub-item-body">
                            <span class="rp-sub-item-title">${this._escapeHtml(c.Nombre || "")}</span>
                            ${c.Puesto ? `<span class="rp-sub-item-sub">${this._escapeHtml(c.Puesto)}</span>` : ""}
                            ${meta ? `<div class="rp-sub-item-meta">${this._escapeHtml(meta)}</div>` : ""}
                        </div>
                        <div class="rp-sub-item-actions">
                            <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-contacto" data-id="${c.Id}" title="Eliminar">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    </div>`;
            }).join("");
        }

        seleccionarContacto(id) {
            const item = (this._contactosCache || []).find(x => x.Id === id);
            if (!item) return;

            this._contactoSeleccionadoId = id;
            this._setFieldValue("txtContactoEstId", item.Id);
            this._setFieldValue("txtContactoEstNombre", item.Nombre || "");
            this._setFieldValue("txtContactoEstPuesto", item.Puesto || "");
            this._setFieldValue("txtContactoEstTelefono", item.Telefono || "");
            this._setFieldValue("txtContactoEstTelefonoAlt", item.TelefonoAlt || "");
            this._setFieldValue("txtContactoEstEmail", item.Email || "");

            const titulo = this._id("contactoEstFormTitulo");
            if (titulo) titulo.textContent = "Editar contacto";

            this.renderListaContactos();
        }

        nuevoContacto() {
            if (!this.getId()) return;
            this.limpiarFormContacto();
        }

        validarFormContacto() {
            const nombre = (this._getFieldValue("txtContactoEstNombre") || "").trim();
            if (!nombre) {
                if (typeof errorModal === "function") {
                    errorModal("El nombre del contacto es obligatorio.");
                }
                return false;
            }
            return true;
        }

        async cargarContactos(idEstablecimiento) {
            if (!idEstablecimiento || idEstablecimiento <= 0) {
                this.prepararContactosNuevo();
                return;
            }

            try {
                const url = this._replaceUrl(this.options.endpoints.contactosLista, { idEstablecimiento });
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
            const idEstablecimiento = this.getId();
            if (!idEstablecimiento) {
                if (typeof errorModal === "function") {
                    errorModal("Guard\u00E1 el establecimiento antes de agregar contactos.");
                }
                return;
            }
            if (!this.validarFormContacto()) return;

            const idContacto = this._toInt(this._getFieldValue("txtContactoEstId")) || 0;
            const modelo = {
                Id: idContacto,
                IdEstablecimiento: idEstablecimiento,
                Nombre: (this._getFieldValue("txtContactoEstNombre") || "").trim(),
                Puesto: this._getFieldValue("txtContactoEstPuesto") || null,
                Telefono: this._getFieldValue("txtContactoEstTelefono") || null,
                TelefonoAlt: this._getFieldValue("txtContactoEstTelefonoAlt") || null,
                Email: this._getFieldValue("txtContactoEstEmail") || null
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

                await this.cargarContactos(idEstablecimiento);
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

        async _guardarContactoInicial(idEstablecimiento) {
            const telefono = (this._getFieldValue("txtContactoEstTelefono") || "").trim();
            const telefonoAlt = (this._getFieldValue("txtContactoEstTelefonoAlt") || "").trim();
            const email = (this._getFieldValue("txtContactoEstEmail") || "").trim();
            if (!idEstablecimiento || (!telefono && !telefonoAlt && !email)) return;

            const modelo = {
                Id: 0,
                IdEstablecimiento: idEstablecimiento,
                Nombre: (this._getFieldValue("txtContactoEstNombre")
                    || this._getFieldValue("txtNombreEst")
                    || "Contacto principal").trim(),
                Puesto: "Contacto principal",
                Telefono: telefono || null,
                TelefonoAlt: telefonoAlt || null,
                Email: email || null
            };

            const data = await this._fetchJson(this.options.endpoints.contactosInsertar, {
                method: "POST",
                headers: this._headers(true),
                body: JSON.stringify(modelo)
            });
            if (!data?.valor) {
                throw new Error(data?.mensaje || "No se pudo copiar el contacto principal.");
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
            const lista = this._id("listaContactosEst");
            if (lista) {
                lista.addEventListener("click", (e) => {
                    const btnDel = e.target.closest(".btn-eliminar-contacto");
                    if (btnDel) {
                        e.stopPropagation();
                        const id = parseInt(btnDel.getAttribute("data-id"), 10);
                        if (id) this.eliminarContacto(id);
                        return;
                    }

                    const item = e.target.closest(".rp-sub-item");
                    if (item) {
                        const id = parseInt(item.getAttribute("data-id"), 10);
                        if (id) this.seleccionarContacto(id);
                    }
                });
            }

            const txtNombre = this._id("txtNombreEst");
            if (txtNombre) {
                txtNombre.addEventListener("input", () => this.actualizarBadgeEstablecimiento());
            }
        }

        // --- Productos ---

        prepararProductosNuevo() {
            this._productosCache = [];
            this._productoSeleccionadoId = 0;
            this.limpiarFormProducto();
            this.renderListaProductos();
            this.actualizarBadgeEstablecimiento();
            this.habilitarSeccionProductos(false);
        }

        habilitarSeccionProductos(habilitar) {
            const section = this._id("sectionProductosEst");
            const hint = this._id("productoEstHint");
            if (!section || !hint) return;

            if (habilitar) {
                section.classList.remove("rp-section-disabled");
                hint.classList.add("success");
                hint.innerHTML = `<i class="fa fa-check-circle"></i> Ya pod\u00E9s asignar productos al establecimiento.`;
            } else {
                section.classList.add("rp-section-disabled");
                hint.classList.remove("success");
                hint.innerHTML = `<i class="fa fa-info-circle"></i> Guard\u00E1 el establecimiento para asignar productos.`;
            }

            this.bloquearControlesProductos(this.isSoloLectura() || !habilitar);
        }

        bloquearControlesProductos(bloquear) {
            const ids = ["cmbProductoEst", "txtCantidadEst", "cmbListaPrecioProdEst", "txtPrecioVentaEst"];
            ids.forEach(id => {
                const el = this._id(id);
                if (el) el.disabled = !!bloquear;
            });

            const btnGuardar = this._id("btnGuardarProductoEst");
            const btnNuevo = this._id("btnNuevoProductoEst");
            if (btnGuardar) btnGuardar.disabled = !!bloquear;
            if (btnNuevo) btnNuevo.disabled = !!bloquear;

            ["cmbProductoEst", "cmbListaPrecioProdEst"].forEach(id => {
                const cmb = this._id(id);
                if (cmb && window.jQuery) {
                    const $el = window.jQuery(cmb);
                    if ($el.data("select2")) {
                        $el.prop("disabled", !!bloquear);
                        $el.trigger("change.select2");
                    }
                }
            });

            const lista = this._id("listaProductosEst");
            if (lista) {
                lista.querySelectorAll(".btn-eliminar-producto").forEach(btn => {
                    btn.disabled = !!bloquear;
                });
            }
        }

        limpiarFormProducto() {
            this._productoSeleccionadoId = 0;
            this._setFieldValue("txtProductoEstId", "");
            this._setFieldValue("cmbProductoEst", "", true);
            this._setCantidadField("");
            this._setFieldValue("cmbListaPrecioProdEst", "", true);
            this._setPrecioField("");
            const titulo = this._id("productoEstFormTitulo");
            if (titulo) titulo.textContent = "Agregar producto";
            this._id("listaProductosEst")?.querySelectorAll(".rp-sub-item")
                .forEach(el => el.classList.remove("active"));
        }

        _setPrecioField(valor) {
            const el = this._id("txtPrecioVentaEst");
            if (!el) return;
            if (valor === null || valor === undefined || valor === "") {
                el.value = "";
                return;
            }
            const n = Number(valor);
            if (Number.isNaN(n)) {
                el.value = String(valor);
                return;
            }
            el.value = typeof formatearNumero === "function"
                ? formatearNumero(n)
                : n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (typeof formatearMilesInput === "function") formatearMilesInput(el);
        }

        _formatCantidad(valor) {
            const n = Number(valor);
            if (Number.isNaN(n)) return String(valor ?? "");
            return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 4 });
        }

        _formatPrecioLista(valor) {
            const n = Number(valor);
            if (Number.isNaN(n)) return String(valor ?? "");
            return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        }

        renderListaProductos() {
            const cont = this._id("listaProductosEst");
            const cant = this._id("productoEstCantidad");
            if (!cont) return;

            const items = this._productosCache || [];
            if (cant) cant.textContent = String(items.length);

            if (!items.length) {
                const idEst = this.getId();
                cont.innerHTML = `
                    <div class="rp-sub-empty">
                        <i class="fa fa-cube"></i>
                        <p>${idEst > 0
                            ? "No hay productos asignados. Agreg\u00E1 uno desde el formulario."
                            : "Guard\u00E1 el establecimiento para asignar productos."}</p>
                    </div>`;
                return;
            }

            cont.innerHTML = items.map(p => {
                const active = p.Id === this._productoSeleccionadoId ? " active" : "";
                const nombre = p.Producto || `Producto #${p.IdProducto}`;
                const abrev = (p.Abreviatura || "").trim();
                const qty = this._formatCantidad(p.Cantidad);
                const lista = (p.ListaPrecio || "").trim() || "Sin lista";
                const precio = this._formatPrecioLista(p.PrecioVenta);
                const sub = abrev
                    ? `${this._escapeHtml(abrev)} · ${this._escapeHtml(lista)} · $ ${this._escapeHtml(precio)}`
                    : `${this._escapeHtml(lista)} · $ ${this._escapeHtml(precio)}`;
                return `
                    <div class="rp-sub-item${active}" data-id="${p.Id}">
                        <div class="rp-sub-item-avatar product"><i class="fa fa-cube"></i></div>
                        <div class="rp-sub-item-body">
                            <span class="rp-sub-item-title">${this._escapeHtml(nombre)}</span>
                            <span class="rp-sub-item-meta">${sub}</span>
                        </div>
                        <span class="rp-qty-badge"><i class="fa fa-sort-numeric-asc"></i> ${this._escapeHtml(qty)}</span>
                        <div class="rp-sub-item-actions">
                            <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-producto" data-id="${p.Id}" title="Eliminar">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    </div>`;
            }).join("");
        }

        seleccionarProducto(id) {
            const item = (this._productosCache || []).find(x => x.Id === id);
            if (!item) return;

            this._productoSeleccionadoId = id;
            this._omitirAutoPrecio = true;
            this._setFieldValue("txtProductoEstId", item.Id);
            this._setFieldValue("cmbProductoEst", item.IdProducto, true);
            this._setCantidadField(item.Cantidad);
            this._setFieldValue("cmbListaPrecioProdEst", item.IdListaPrecio || "", true);
            this._setPrecioField(item.PrecioVenta);
            setTimeout(() => { this._omitirAutoPrecio = false; }, 0);

            const titulo = this._id("productoEstFormTitulo");
            if (titulo) titulo.textContent = "Editar producto";

            this.renderListaProductos();
        }

        nuevoProducto() {
            if (!this.getId()) return;
            this.limpiarFormProducto();
        }

        validarFormProducto() {
            const idProducto = this._getIntOrNull("cmbProductoEst");
            if (!idProducto) {
                if (typeof errorModal === "function") {
                    errorModal("Debe seleccionar un producto.");
                }
                return false;
            }

            const cantidad = this._leerNumero(this._getFieldValue("txtCantidadEst"));
            if (cantidad <= 0) {
                if (typeof errorModal === "function") {
                    errorModal("La cantidad debe ser mayor a cero.");
                }
                return false;
            }

            const idLista = this._getIntOrNull("cmbListaPrecioProdEst");
            if (!idLista) {
                if (typeof errorModal === "function") {
                    errorModal("Debe seleccionar una lista de precios.");
                }
                return false;
            }

            const precio = this._leerNumero(this._getFieldValue("txtPrecioVentaEst"));
            if (precio < 0) {
                if (typeof errorModal === "function") {
                    errorModal("El precio no puede ser negativo.");
                }
                return false;
            }

            return true;
        }

        async cargarProductos(idEstablecimiento) {
            if (!idEstablecimiento || idEstablecimiento <= 0) {
                this.prepararProductosNuevo();
                return;
            }

            try {
                const url = this._replaceUrl(this.options.endpoints.productosLista, { idEstablecimiento });
                const data = await this._fetchJson(url, {
                    method: "GET",
                    headers: this._headers(false)
                });
                this._productosCache = Array.isArray(data) ? data : [];
                this.limpiarFormProducto();
                this.renderListaProductos();
                this.habilitarSeccionProductos(true);
            } catch (e) {
                console.error(e);
                this._productosCache = [];
                this.renderListaProductos();
            }
        }

        async guardarProducto() {
            if (this.isSoloLectura()) return;
            const idEstablecimiento = this.getId();
            if (!idEstablecimiento) {
                if (typeof errorModal === "function") {
                    errorModal("Guard\u00E1 el establecimiento antes de asignar productos.");
                }
                return;
            }
            if (!this.validarFormProducto()) return;

            const idItem = this._toInt(this._getFieldValue("txtProductoEstId")) || 0;
            const modelo = {
                Id: idItem,
                IdEstablecimiento: idEstablecimiento,
                IdProducto: this._getIntOrNull("cmbProductoEst"),
                Cantidad: this._leerNumero(this._getFieldValue("txtCantidadEst")),
                IdListaPrecio: this._getIntOrNull("cmbListaPrecioProdEst"),
                PrecioVenta: this._leerNumero(this._getFieldValue("txtPrecioVentaEst"))
            };

            const esNuevo = !modelo.Id;
            const url = esNuevo
                ? this.options.endpoints.productosInsertar
                : this.options.endpoints.productosActualizar;
            const method = esNuevo ? "POST" : "PUT";

            try {
                const data = await this._fetchJson(url, {
                    method,
                    headers: this._headers(true),
                    body: JSON.stringify(modelo)
                });

                if (!data?.valor) {
                    this.mostrarErrorCampos(
                        data?.mensaje || "No se pudo guardar el producto.",
                        null,
                        data?.tipo || "validacion"
                    );
                    return;
                }

                if (typeof exitoModal === "function") {
                    exitoModal(data.mensaje || "Producto guardado correctamente");
                }

                await this.cargarProductos(idEstablecimiento);
                if (esNuevo && data.id) {
                    this.seleccionarProducto(data.id);
                }
            } catch (e) {
                console.error(e);
                if (typeof errorModal === "function") {
                    errorModal("Ha ocurrido un error al guardar el producto.");
                }
            }
        }

        async eliminarProducto(id) {
            if (this.isSoloLectura()) return;

            const confirmado = typeof confirmarModal === "function"
                ? await confirmarModal("\u00BFDesea eliminar este producto?")
                : window.confirm("\u00BFDesea eliminar este producto?");

            if (!confirmado) return;

            try {
                const url = this._replaceUrl(this.options.endpoints.productosEliminar, { id });
                const data = await this._fetchJson(url, {
                    method: "DELETE",
                    headers: this._headers(false)
                });

                if (!data?.valor) {
                    if (typeof errorModal === "function") {
                        errorModal(data?.mensaje || "No se pudo eliminar el producto.");
                    }
                    return;
                }

                if (typeof exitoModal === "function") {
                    exitoModal(data.mensaje || "Producto eliminado correctamente");
                }

                await this.cargarProductos(this.getId());
            } catch (e) {
                console.error(e);
                if (typeof errorModal === "function") {
                    errorModal("Ha ocurrido un error al eliminar el producto.");
                }
            }
        }

        _bindProductosEvents() {
            const lista = this._id("listaProductosEst");
            if (lista) {
                lista.addEventListener("click", (e) => {
                    const btnDel = e.target.closest(".btn-eliminar-producto");
                    if (btnDel) {
                        e.stopPropagation();
                        const id = parseInt(btnDel.getAttribute("data-id"), 10);
                        if (id) this.eliminarProducto(id);
                        return;
                    }

                    const item = e.target.closest(".rp-sub-item");
                    if (item) {
                        const id = parseInt(item.getAttribute("data-id"), 10);
                        if (id) this.seleccionarProducto(id);
                    }
                });
            }

            // Delegado en el modal: Select2 hace destroy/off('.select2') y borra handlers
            // namespaced en el select; change sin namespace + delegacion sobrevive.
            if (window.jQuery && !this._productosPrecioBound) {
                this._productosPrecioBound = true;
                const $modal = window.jQuery(this.modalEl);
                $modal.on("change.rpEstProducto", "#cmbProductoEst, #cmbListaPrecioProdEst", () => {
                    this.aplicarPrecioDesdeLista();
                });
            }
        }

        async aplicarPrecioDesdeLista() {
            if (this.isSoloLectura() || this._omitirAutoPrecio) return;
            const idProducto = this._getIntOrNull("cmbProductoEst");
            const idLista = this._getIntOrNull("cmbListaPrecioProdEst");
            if (!idProducto || !idLista) return;

            this._precioListaSeq = (this._precioListaSeq || 0) + 1;
            const seq = this._precioListaSeq;

            try {
                const url = this._replaceUrl(this.options.endpoints.productosPrecios, { idProducto });
                const data = await this._fetchJson(url, {
                    method: "GET",
                    headers: this._headers(false)
                });

                if (seq !== this._precioListaSeq) return;

                const rows = Array.isArray(data) ? data : [];
                const match = rows.find(r => Number(r.IdListaPrecio) === Number(idLista));
                if (!match) return;

                // Trae el precio de la lista (aunque sea 0); el usuario puede editarlo.
                this._setPrecioField(match.PrecioVenta ?? 0);
            } catch (e) {
                console.warn("No se pudo obtener el precio de la lista.", e);
            }
        }

        _syncIvaCardUI() {
            const chk = this._id("chkImpuestoIvaEst");
            const card = this._id("rpIvaCardEst");
            const status = this._id("rpIvaCardStatusEst");
            if (!chk) return;
            const on = !!chk.checked;
            if (card) card.classList.toggle("is-active", on);
            if (status) status.textContent = on ? "Aplica IVA" : "No aplica";
        }

        _escapeHtml(text) {
            return String(text ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
        }

        // --- ABM principal ---

        _tieneClientesEnCombo() {
            const sel = this._id("cmbClienteEst");
            if (!sel) return false;
            return Array.from(sel.options).some(o => o.value && o.value !== "");
        }

        async _abrirNuevoCliente() {
            if (this.isSoloLectura()) return;
            if (typeof window.nuevoCliente === "function") {
                await window.nuevoCliente();
                return;
            }
            if (typeof errorModal === "function") {
                errorModal("No esta disponible el alta de clientes en esta pantalla. Anda a Clientes → Nuevo.");
            }
        }

        async abrirNuevo(idClientePreseleccionado = null) {
            try {
                this._ultimoModo = "nuevo";
                this._modeloActual = null;
                this._localidadLegacy = null;

                if (typeof this.options.onBeforeOpen === "function") {
                    await this.options.onBeforeOpen("nuevo", this);
                }

                this.limpiarModal();
                this.setModalSoloLectura(false);
                this.prepararContactosNuevo();
                this.prepararProductosNuevo();

                await this.cargarCombos();

                if (idClientePreseleccionado) {
                    this._setFieldValue("cmbClienteEst", idClientePreseleccionado, true);
                    await this.prefillDesdeCliente(idClientePreseleccionado);
                } else {
                    await this.limpiarGeoEspecifico();
                }

                if (!this._tieneClientesEnCombo()) {
                    this.mostrarErrorCampos(
                        "No hay clientes cargados. Crea primero un <strong>Cliente</strong> con el boton + al lado del combo (o en el menu Clientes → Nuevo). Despues podes registrar el establecimiento. <em>No hace falta ningun contrato.</em>",
                        null,
                        "validacion"
                    );
                } else {
                    this.cerrarErrorCampos();
                }

                this._syncIvaCardUI();

                this._id("modalEstablecimientoLabel").textContent = "Nuevo Establecimiento";
                this._id("btnGuardarEst").innerHTML = `<i class="fa fa-check"></i> Registrar`;

                this.bsModal.show();

                if (typeof this.options.onOpen === "function") {
                    await this.options.onOpen("nuevo", this);
                }
            } catch (e) {
                console.error(e);
                if (typeof errorModal === "function") errorModal("Ha ocurrido un error.");
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
                if (typeof errorModal === "function") errorModal("Ha ocurrido un error.");
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
                if (typeof errorModal === "function") errorModal("Ha ocurrido un error.");
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

            this._setFieldValue("txtIdEst", modelo.Id || "");
            this._setFieldValue("txtNombreEst", modelo.Nombre || "");
            this._setFieldValue("txtIdEstablecimientoClienteEst", modelo.IdEstablecimientoCliente || "");
            this._setFieldValue("txtCuitEst", modelo.Cuit || "");
            this._setFieldValue("txtCalleEst", modelo.Calle || modelo.Domicilio || "");
            this._setFieldValue("txtNumeroEst", modelo.Numero || "");
            this._setFieldValue("txtPisoDeptoEst", modelo.PisoDepartamento || "");
            this._setFieldValue("txtCodPostalEst", modelo.CodPostal || "");
            this._setFieldValue("chkImpuestoIvaEst", !!modelo.ImpuestoIva);
                this._setFieldValue("txtDiasHorariosEst", modelo.DiasHorarios || "");

            if (modelo.IdCliente) this._setFieldValue("cmbClienteEst", modelo.IdCliente, true);
            if (modelo.IdCondicionIva) this._setFieldValue("cmbCondicionIvaEst", modelo.IdCondicionIva, true);
            if (modelo.IdProvincia) {
                this._setFieldValue("cmbProvinciaEst", modelo.IdProvincia, true);
                await this.cargarPartidos(modelo.IdProvincia, modelo.IdPartido, modelo.IdLocalidad);
            }
            if (!modelo.IdLocalidad && modelo.Localidad) {
                this._localidadLegacy = modelo.Localidad;
                const localidad = this._id("cmbLocalidadEst");
                localidad.options[0].text = `${modelo.Localidad} (sin catalogo)`;
                this._refreshSelect2Field("cmbLocalidadEst");
            }
            if (modelo.IdTipoGenerador) this._setFieldValue("cmbTipoGeneradorEst", modelo.IdTipoGenerador, true);
            if (modelo.IdDiaRecoleccion) this._setFieldValue("cmbDiaEst", modelo.IdDiaRecoleccion, true);
            if (modelo.IdSemanaRecoleccion) this._setFieldValue("cmbSemanaEst", modelo.IdSemanaRecoleccion, true);
            if (modelo.IdCamion) this._setFieldValue("cmbCamionEst", modelo.IdCamion, true);

            this._setAuditoria(modelo);

            this._id("modalEstablecimientoLabel").textContent = soloLectura
                ? "Ver Establecimiento"
                : "Editar Establecimiento";
            this._id("btnGuardarEst").innerHTML = `<i class="fa fa-check"></i> Guardar`;

            this.actualizarBadgeEstablecimiento();
            if (modelo?.Id > 0) {
                await Promise.all([
                    this.cargarContactos(modelo.Id),
                    this.cargarProductos(modelo.Id)
                ]);
                this.setModalSoloLectura(soloLectura);
            } else {
                this.prepararContactosNuevo();
                this.prepararProductosNuevo();
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

        _actualizarCodigosGeo() {
            const partido = this._id("cmbPartidoEst")?.selectedOptions?.[0];
            const localidad = this._id("cmbLocalidadEst")?.selectedOptions?.[0];
            this._setFieldValue("txtCodigoPartidoEst", partido?.value ? (partido.dataset.codigo || "") : "");
            this._setFieldValue("txtCodigoLocalidadEst", localidad?.value ? (localidad.dataset.codigo || "") : "");
        }

        _setLocalidadDisabled(disabled) {
            const select = this._id("cmbLocalidadEst");
            if (!select) return;
            select.disabled = !!disabled;
            if (!window.jQuery) return;
            const $select = window.jQuery(select);
            if ($select.data("select2")) {
                $select.prop("disabled", select.disabled);
                $select.trigger("change.select2");
            }
        }

        async cargarPartidos(idProvincia, selectedPartidoId = null, selectedLocalidadId = null) {
            const seq = ++this._cargarPartidosSeq;
            ++this._cargarLocalidadesSeq;
            this._localidadesCargando = false;
            this.resetSelect("cmbPartidoEst", "Seleccionar");
            this.resetSelect("cmbLocalidadEst", "Seleccionar");
            this._geoCache.partidos = [];
            this._geoCache.localidades = [];
            this._actualizarCodigosGeo();
            this._setLocalidadDisabled(true);
            if (!idProvincia) return;

            const url = this._replaceUrl(this.options.endpoints.partidosPorProvincia, { idProvincia });
            const data = await this._fetchJson(url, { headers: this._headers(false) });
            if (seq !== this._cargarPartidosSeq) return;

            this._geoCache.partidos = Array.isArray(data) ? data : [];
            const select = this._id("cmbPartidoEst");
            this._geoCache.partidos.forEach(x => {
                const option = new Option(x.Nombre, x.Id);
                option.dataset.codigo = x.Codigo || "";
                select.append(option);
            });
            if (selectedPartidoId) this._setFieldValue("cmbPartidoEst", selectedPartidoId, true);
            await this.cargarLocalidades(selectedPartidoId, selectedLocalidadId);
            if (seq !== this._cargarPartidosSeq) return;
            this._actualizarCodigosGeo();
        }

        async cargarLocalidades(idPartido, selectedLocalidadId = null) {
            const seq = ++this._cargarLocalidadesSeq;
            this._localidadesCargando = !!idPartido;
            this.resetSelect("cmbLocalidadEst", "Seleccionar");
            this._geoCache.localidades = [];
            this._actualizarCodigosGeo();
            this._setLocalidadDisabled(true);
            if (!idPartido) {
                this._localidadesCargando = false;
                return;
            }

            try {
                const url = this._replaceUrl(this.options.endpoints.localidadesPorPartido, { idPartido });
                const data = await this._fetchJson(url, { headers: this._headers(false) });
                if (seq !== this._cargarLocalidadesSeq) return;

                this._geoCache.localidades = Array.isArray(data) ? data : [];
                const select = this._id("cmbLocalidadEst");
                this._geoCache.localidades.forEach(x => {
                    const option = new Option(x.Nombre, x.Id);
                    option.dataset.codigo = x.Codigo || "";
                    select.append(option);
                });
                if (selectedLocalidadId) this._setFieldValue("cmbLocalidadEst", selectedLocalidadId, true);
                this._actualizarCodigosGeo();
            } finally {
                if (seq === this._cargarLocalidadesSeq) {
                    this._localidadesCargando = false;
                    this._setLocalidadDisabled(this.isSoloLectura() || !this._getIntOrNull("cmbPartidoEst"));
                }
            }
        }

        async limpiarGeoEspecifico() {
            this._localidadLegacy = null;
            return await this.cargarPartidos(this._getIntOrNull("cmbProvinciaEst"));
        }

        async prefillDesdeCliente(idCliente) {
            if (this._ultimoModo !== "nuevo" || !idCliente) return;
            const url = this._replaceUrl(this.options.endpoints.clienteEditar, { id: idCliente });
            const c = await this._fetchJson(url, { headers: this._headers(false) });

            this._setFieldValue("txtNombreEst", c.Nombre || "");
            this._setFieldValue("txtCuitEst", c.Cuit || "");
            this._setFieldValue("txtCalleEst", c.Calle || c.Domicilio || "");
            this._setFieldValue("txtNumeroEst", c.Numero || "");
            this._setFieldValue("txtPisoDeptoEst", c.PisoDepartamento || "");
            this._setFieldValue("txtCodPostalEst", c.CodPostal || "");
            this._setFieldValue("txtContactoEstNombre", c.Nombre || "");
            this._setFieldValue("txtContactoEstTelefono", c.Telefono || "");
            this._setFieldValue("txtContactoEstTelefonoAlt", c.TelefonoAlt || "");
            this._setFieldValue("txtContactoEstEmail", c.Email || "");
            if (c.IdCondicionIva) this._setFieldValue("cmbCondicionIvaEst", c.IdCondicionIva, true);
            if (c.IdProvincia) this._setFieldValue("cmbProvinciaEst", c.IdProvincia, true);
            if (c.IdTipoGenerador) this._setFieldValue("cmbTipoGeneradorEst", c.IdTipoGenerador, true);
            await this.limpiarGeoEspecifico();
            this.actualizarBadgeEstablecimiento();
        }

        async _llenarCombo(selectId, url, seq, textField = "Nombre") {
            const data = await this._fetchJson(url, { headers: this._headers(false) });
            if (seq !== this._cargarCombosSeq) return;

            const select = this._id(selectId);
            if (!select) return;

            const seen = new Set();
            (data || []).forEach(x => {
                const id = String(x.Id);
                if (seen.has(id)) return;
                seen.add(id);
                select.append(new Option(x[textField] || x.Nombre, x.Id));
            });
        }

        async _llenarComboTiposGenerador(seq) {
            await this._llenarCombo("cmbTipoGeneradorEst", this.options.endpoints.tiposGenerador, seq, "Etiqueta");
        }

        async cargarCombos() {
            const seq = ++this._cargarCombosSeq;

            this.resetSelect("cmbClienteEst", "Seleccionar");
            this.resetSelect("cmbCondicionIvaEst", "Seleccionar");
            this.resetSelect("cmbProvinciaEst", "Seleccionar");
            this.resetSelect("cmbPartidoEst", "Seleccionar");
            this.resetSelect("cmbLocalidadEst", "Seleccionar");
            this.resetSelect("cmbTipoGeneradorEst", "Seleccionar");
            this.resetSelect("cmbDiaEst", "Seleccionar");
            this.resetSelect("cmbSemanaEst", "Seleccionar");
            this.resetSelect("cmbCamionEst", "Seleccionar");
            this.resetSelect("cmbProductoEst", "Seleccionar");
            this.resetSelect("cmbListaPrecioProdEst", "Seleccionar");
            this._setLocalidadDisabled(true);

            await Promise.all([
                this._llenarCombo("cmbClienteEst", this.options.endpoints.clientes, seq),
                this._llenarCombo("cmbCondicionIvaEst", this.options.endpoints.condicionesIva, seq),
                this._llenarCombo("cmbProvinciaEst", this.options.endpoints.provincias, seq),
                this._llenarComboTiposGenerador(seq),
                this._llenarCombo("cmbDiaEst", this.options.endpoints.dias, seq),
                this._llenarCombo("cmbSemanaEst", this.options.endpoints.semanas, seq),
                this._llenarCombo("cmbCamionEst", this.options.endpoints.camiones, seq),
                this._llenarCombo("cmbProductoEst", this.options.endpoints.productosCatalogo, seq),
                this._llenarCombo("cmbListaPrecioProdEst", this.options.endpoints.listasPrecios, seq)
            ]);

            if (seq !== this._cargarCombosSeq) return;

            this.inicializarSelect2Modal();
        }

        async guardar() {
            if (this.isSoloLectura()) return true;
            if (!this.validarCampos()) return false;

            const id = this._getFieldValue("txtIdEst");

            const modelo = {
                Id: id !== "" ? parseInt(id, 10) : 0,
                IdCliente: this._getIntOrNull("cmbClienteEst"),
                Nombre: this._getFieldValue("txtNombreEst"),
                IdEstablecimientoCliente: (this._getFieldValue("txtIdEstablecimientoClienteEst") || "").trim() || null,
                Cuit: this._getFieldValue("txtCuitEst") || null,
                IdCondicionIva: this._getIntOrNull("cmbCondicionIvaEst"),
                ImpuestoIva: !!this._getFieldValue("chkImpuestoIvaEst"),
                Calle: (this._getFieldValue("txtCalleEst") || "").trim() || null,
                Numero: (this._getFieldValue("txtNumeroEst") || "").trim() || null,
                PisoDepartamento: (this._getFieldValue("txtPisoDeptoEst") || "").trim() || null,
                IdTipoGenerador: this._getIntOrNull("cmbTipoGeneradorEst"),
                IdProvincia: this._getIntOrNull("cmbProvinciaEst"),
                IdPartido: this._getIntOrNull("cmbPartidoEst"),
                IdLocalidad: this._getIntOrNull("cmbLocalidadEst"),
                Localidad: this._getIntOrNull("cmbLocalidadEst")
                    ? (this._id("cmbLocalidadEst")?.selectedOptions?.[0]?.text || "").trim() || null
                    : this._localidadLegacy,
                CodPostal: this._getFieldValue("txtCodPostalEst") || null,
                IdDiaRecoleccion: this._getIntOrNull("cmbDiaEst") ?? 0,
                IdSemanaRecoleccion: this._getIntOrNull("cmbSemanaEst") ?? 0,
                IdListaPrecio: null,
                IdCamion: this._getIntOrNull("cmbCamionEst"),
                DiasHorarios: (this._getFieldValue("txtDiasHorariosEst") || "").trim() || null
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
                if (esNuevo && data.id) {
                    try {
                        await this._guardarContactoInicial(data.id);
                    } catch (contactoError) {
                        console.warn("El establecimiento se guardo, pero no se pudo copiar el contacto principal.", contactoError);
                    }
                }
                if (typeof exitoModal === "function") {
                    exitoModal(data.mensaje || (esNuevo
                        ? "Establecimiento registrado correctamente"
                        : "Establecimiento modificado correctamente"));
                }

                this.cerrar();

                if (typeof this.options.onSaved === "function") {
                    const modeloGuardado = esNuevo && data.id
                        ? { ...modelo, Id: data.id }
                        : modelo;
                    await this.options.onSaved(data, modeloGuardado, this);
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
                ? await confirmarModal("\u00BFDesea eliminar este establecimiento?")
                : window.confirm("\u00BFDesea eliminar este establecimiento?");

            if (!confirmado) return false;

            try {
                const url = this._replaceUrl(this.options.endpoints.eliminar, { id });
                const data = await this._fetchJson(url, {
                    method: "DELETE",
                    headers: this._headers(false)
                });

                const ok = !!(data?.valor ?? data?.Valor);
                const mensaje = data?.mensaje ?? data?.Mensaje ?? "No se pudo eliminar.";

                if (!ok) {
                    if (typeof errorModal === "function") {
                        errorModal(mensaje);
                    } else {
                        this.mostrarErrorCampos(
                            mensaje,
                            data?.idReferencia ?? data?.IdReferencia ?? null,
                            data?.tipo ?? data?.Tipo ?? "error"
                        );
                    }
                    return false;
                }

                if (typeof exitoModal === "function") {
                    exitoModal(data?.mensaje ?? data?.Mensaje ?? "Establecimiento eliminado correctamente");
                }

                if (typeof this.options.onDeleted === "function") {
                    await this.options.onDeleted(data, id, this);
                }

                return true;
            } catch (e) {
                console.error(e);
                if (typeof errorModal === "function") errorModal("Ha ocurrido un error.");
                return false;
            }
        }

        limpiarModal() {
            this.setSoloLecturaAttribute(false);
            this._localidadLegacy = null;
            this.modalEl.querySelectorAll("input, select, textarea").forEach(el => {
                if (el.id === "txtIdEst") { el.value = ""; return; }
                if (el.type === "checkbox") { el.checked = false; return; }
                if (el.tagName === "SELECT") el.selectedIndex = 0;
                else el.value = "";
            });
            this._validacion?.reset();
            this._id("infoAuditoriaEst")?.classList.add("d-none");
            if (this._id("infoRegistroEst")) this._id("infoRegistroEst").innerHTML = "";
            if (this._id("infoModificacionEst")) this._id("infoModificacionEst").innerHTML = "";
            this._refreshAllSelect2();
            this.prepararContactosNuevo();
            this.prepararProductosNuevo();
            this._syncIvaCardUI();
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

        async _recargarCombo(selectId, url, textField = "Nombre") {
            const el = this._id(selectId);
            if (!el) return;

            const valorActual = el.value;
            el.innerHTML = "";
            el.append(new Option("Seleccionar", ""));

            const data = await this._fetchJson(url, { headers: this._headers(false) });
            (data || []).forEach(x => el.append(new Option(x[textField] || x.Nombre, x.Id)));

            this._refreshSelect2Field(selectId);

            if (valorActual && Array.from(el.options).some(o => o.value === valorActual)) {
                this._setFieldValue(selectId, valorActual, true);
            }
        }

        async _onConfiguracionActualizada(detail) {
            const cfg = this._comboPorController[detail?.tipo];
            if (!cfg) return;

            if (detail?.tipo === "Partidos") {
                this._localidadLegacy = null;
                await this.cargarPartidos(this._getIntOrNull("cmbProvinciaEst"), detail.nuevoId || null);
                return;
            }
            if (detail?.tipo === "Localidades") {
                this._localidadLegacy = null;
                await this.cargarLocalidades(this._getIntOrNull("cmbPartidoEst"), detail.nuevoId || null);
                return;
            }

            await this._recargarCombo(cfg.selectId, cfg.url, cfg.textField || "Nombre");

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
                    console.error("Error recargando combo tras configuraci\u00F3n", err);
                }
            };

            document.addEventListener("configuracionActualizada", this._configListener);
        }

        mostrarErrorCampos(mensaje, idReferencia = null, tipo = "validacion") {
            if (tipo === "validacion") this._validacion?.cancelarPanelExito?.();
            const container = this._id("errorCamposEst");
            if (window.RpVerFicha?.renderErrorCampos) {
                window.RpVerFicha.renderErrorCampos(container, mensaje, idReferencia, tipo, "verFichaEstablecimiento");
            }
        }

        cerrarErrorCampos() {
            const container = this._id("errorCamposEst");
            if (!container) return;
            container.classList.add("d-none");
            container.innerHTML = "";
        }

        _setAuditoria(modelo) {
            const wrap = this._id("infoAuditoriaEst");
            const reg = this._id("infoRegistroEst");
            const mod = this._id("infoModificacionEst");
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
            const guardarBtn = this._id("btnGuardarEst");
            if (guardarBtn) {
                guardarBtn.removeAttribute("onclick");
                guardarBtn.addEventListener("click", () => withBusy(guardarBtn, () => this.guardar()));
            }

            const cerrarErrorBtn = this.modalEl.querySelector("#errorCamposEst .rp-error-close");
            if (cerrarErrorBtn) {
                cerrarErrorBtn.removeAttribute("onclick");
                cerrarErrorBtn.addEventListener("click", () => this.cerrarErrorCampos());
            }

            this._validacion?.attachEvents({ select2Namespace: "mestablecimientos" });

            const chkIva = this._id("chkImpuestoIvaEst");
            if (chkIva) {
                chkIva.addEventListener("change", () => this._syncIvaCardUI());
            }

            const btnCli = this._id("btnAgregarClienteEst");
            if (btnCli) {
                btnCli.addEventListener("click", () => this._abrirNuevoCliente());
            }

            const cliente = this._id("cmbClienteEst");
            if (cliente) {
                cliente.addEventListener("change", () => {
                    const id = this._getIntOrNull("cmbClienteEst");
                    if (id && this._ultimoModo === "nuevo") {
                        this.prefillDesdeCliente(id).catch(console.error);
                    }
                });
            }

            const provincia = this._id("cmbProvinciaEst");
            if (provincia) {
                window.jQuery(provincia)
                    .off("change.geoEst")
                    .on("change.geoEst", () => {
                    this._localidadLegacy = null;
                    this.resetSelect("cmbPartidoEst", "Seleccionar");
                    this.resetSelect("cmbLocalidadEst", "Seleccionar");
                    this._actualizarCodigosGeo();
                    this._setLocalidadDisabled(true);
                    this.cargarPartidos(this._getIntOrNull("cmbProvinciaEst")).catch(console.error);
                });
            }

            const partido = this._id("cmbPartidoEst");
            if (partido) {
                window.jQuery(partido)
                    .off("change.geoEst")
                    .on("change.geoEst", () => {
                    this._localidadLegacy = null;
                    this._actualizarCodigosGeo();
                    this.resetSelect("cmbLocalidadEst", "Seleccionar");
                    this._actualizarCodigosGeo();
                    this._setLocalidadDisabled(true);
                    this.cargarLocalidades(this._getIntOrNull("cmbPartidoEst")).catch(console.error);
                });
            }

            const localidad = this._id("cmbLocalidadEst");
            if (localidad) {
                window.jQuery(localidad)
                    .off("change.geoEst")
                    .on("change.geoEst", () => {
                    this._localidadLegacy = null;
                    this._actualizarCodigosGeo();
                });
            }
        }

        _bindModalEvents() {
            this.modalEl.addEventListener("shown.bs.modal", () => {
                this.inicializarSelect2Modal();
            });
        }
    }

    window.guardarEstablecimiento = function () {
        const btn = document.getElementById("btnGuardarEst");
        return withBusy(btn, () => window.establecimientoModal?.guardar?.());
    };

    window.guardarContactoEstablecimiento = function () {
        const btn = document.getElementById("btnGuardarContactoEst");
        return withBusy(btn, () => window.establecimientoModal?.guardarContacto?.());
    };

    window.nuevoContactoEstablecimiento = function () {
        return window.establecimientoModal?.nuevoContacto?.();
    };

    window.guardarProductoEstablecimiento = function () {
        return window.establecimientoModal?.guardarProducto?.();
    };

    window.nuevoProductoEstablecimiento = function () {
        return window.establecimientoModal?.nuevoProducto?.();
    };

    window.cerrarErrorCamposEst = function () {
        return window.establecimientoModal?.cerrarErrorCampos?.();
    };

    window.EstablecimientoModal = EstablecimientoModal;

    function initEstablecimientoModal(options = {}) {
        const root = document.querySelector("[data-establecimiento-modal]");
        if (!root) {
            console.warn("initEstablecimientoModal: incluya el partial M_ClientesEstablecimientos en la vista.");
            return null;
        }

        const merged = Object.assign({ token: window.token || "" }, options || {});

        if (!window.establecimientoModal || window.establecimientoModal.modalEl !== root) {
            window.establecimientoModal = new EstablecimientoModal(root, merged);
        } else {
            Object.assign(window.establecimientoModal.options, merged);
        }

        const abrirVer = (id) => window.establecimientoModal?.abrirVer?.(id);

        window.nuevoEstablecimiento = (idCliente) => window.establecimientoModal?.abrirNuevo?.(idCliente);
        window.verEstablecimiento = abrirVer;
        window.editarEstablecimiento = (id) => window.establecimientoModal?.abrirEditar?.(id);
        window.eliminarEstablecimiento = (id) => window.establecimientoModal?.eliminar?.(id);
        window.verFichaEstablecimiento = abrirVer;

        if (window.RpVerFicha?.registrar) {
            window.RpVerFicha.registrar("verFichaEstablecimiento", abrirVer);
        }

        return window.establecimientoModal;
    }

    window.initEstablecimientoModal = initEstablecimientoModal;

})(window);
