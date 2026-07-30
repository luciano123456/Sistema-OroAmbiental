(function (window) {
    "use strict";

    class ProductoModal {

        constructor(root, options = {}) {

            if (!root) {
                throw new Error("ProductoModal requiere un root.");
            }

            this.root = root;

            this.options = Object.assign({
                token: window.token || "",
                endpoints: {
                    editar: "/Productos/EditarInfo?id={id}",
                    historialCosto: "/Productos/HistorialCosto?id={id}",
                    insertar: "/Productos/Insertar",
                    actualizar: "/Productos/Actualizar",
                    eliminar: "/Productos/Eliminar?id={id}",
                    categorias: "/ProductosCategorias/Lista",
                    medidas: "/UnidadesMedida/Lista",
                    preciosLista: "/ProductosPrecios/ListaPorProducto?idProducto={id}",
                    preciosGuardar: "/ProductosPrecios/GuardarPorProducto"
                },
                onSaved: null,
                onDeleted: null,
                onBeforeOpen: null,
                onOpen: null,
                onGuardarModelo: null
            }, options || {});

            this.modalEl = this.root.matches("[data-producto-modal]")
                ? this.root
                : this.root.querySelector("[data-producto-modal]");

            if (!this.modalEl) {
                throw new Error("No se encontro [data-producto-modal].");
            }

            this.bsModal = new bootstrap.Modal(this.modalEl);
            const histEl = document.getElementById("modalHistorialCosto");
            this.bsModalHistorial = histEl ? new bootstrap.Modal(histEl) : null;
            this._ultimoModo = "nuevo";
            this._modeloActual = null;

            this._camposObligatorios = ["txtNombre", "cmbCategoria", "cmbMedida", "txtCostoUnitario"];
            this._validacion = new ValidacionModalAbm({
                modalEl: this.modalEl,
                getPanel: () => this._id("errorCampos"),
                campos: [
                    { id: "txtNombre", nombre: "Nombre" },
                    { id: "cmbCategoria", nombre: "Categoria" },
                    { id: "cmbMedida", nombre: "Unidad de medida" },
                    { id: "txtCostoUnitario", nombre: "Costo unitario" }
                ],
                esCampoValido: (el) => this._valorCampoValido(el),
                isSoloLectura: () => this.isSoloLectura(),
                mostrarError: (msg) => this.mostrarErrorCampos(msg, null, "validacion"),
                cerrarPanel: () => this.cerrarErrorCampos()
            });
            this._comboPorController = {
                ProductosCategorias: { selectId: "cmbCategoria", url: this.options.endpoints.categorias },
                UnidadesMedida: { selectId: "cmbMedida", url: this.options.endpoints.medidas }
            };

            window.productoModal = this;
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
            let n;
            if (typeof leerInputNumerico === "function") {
                n = leerInputNumerico(value);
            } else if (typeof parseNumero === "function") {
                n = parseNumero(value);
            } else {
                n = parseInt(String(value).replace(/\./g, ""), 10);
            }
            return Number.isNaN(n) ? null : Math.trunc(n);
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

        _getDecimal(id) {
            const v = this._getFieldValue(id);
            if (v === null || v === undefined || v === "") return 0;
            if (typeof parseNumero === "function") return parseNumero(v);
            const n = parseFloat(String(v).replace(/\./g, "").replace(",", "."));
            return Number.isNaN(n) ? 0 : n;
        }

        _fmtMoneda(valor) {
            const n = Number(valor ?? 0);
            if (typeof formatearMonedaARS === "function") return formatearMonedaARS(n);
            if (typeof formatearMiles === "function") return "$ " + formatearMiles(n);
            return "$ " + n.toFixed(2);
        }

        _obtenerPorcentajeVariacion(item, costoAnterior, costoNuevo, tendencia) {
            const desdeApi = item.PorcentajeVariacion ?? item.porcentajeVariacion;
            if (desdeApi !== null && desdeApi !== undefined && desdeApi !== "") {
                const n = Number(desdeApi);
                if (!Number.isNaN(n)) return n;
            }

            const ant = Number(costoAnterior ?? 0);
            const nuevo = Number(costoNuevo ?? 0);
            if (ant > 0 && tendencia !== "igual") {
                return Math.round(((nuevo - ant) / ant) * 10000) / 100;
            }

            return null;
        }

        _fmtPorcentajeVariacion(pct) {
            if (pct === null || pct === undefined || pct === "") return "";
            const n = Number(pct);
            if (Number.isNaN(n) || Math.abs(n) < 0.005) return "";
            const abs = Math.abs(n).toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
            const sign = n > 0 ? "+" : "-";
            return `${sign}${abs}%`;
        }

        _escapeHtml(texto) {
            if (texto == null) return "";
            return String(texto)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
        }

        _actualizarBtnHistorialCosto() {
            const btn = this._id("btnHistorialCosto");
            if (!btn) return;
            const id = this.getId();
            btn.disabled = !(id > 0);
        }

        async abrirHistorialCostoPorId(id, nombreProducto) {
            if (!id || !this.bsModalHistorial) return;

            const titulo = document.getElementById("histCostoTitulo");
            const sub = document.getElementById("histCostoSub");
            if (titulo) titulo.textContent = "Historial de costo";
            if (sub) sub.textContent = nombreProducto || "";

            const loading = document.getElementById("histCostoLoading");
            const empty = document.getElementById("histCostoEmpty");
            const actual = document.getElementById("histCostoActual");
            const timeline = document.getElementById("histCostoTimeline");

            loading?.classList.remove("d-none");
            empty?.classList.add("d-none");
            actual?.classList.add("d-none");
            timeline?.classList.add("d-none");
            if (timeline) timeline.innerHTML = "";
            if (actual) actual.innerHTML = "";

            this.bsModalHistorial.show();

            try {
                const url = this._replaceUrl(this.options.endpoints.historialCosto, { id });
                const data = await this._fetchJson(url, { headers: this._headers(false) });
                this._renderHistorialCosto(data);
            } catch (e) {
                console.error(e);
                errorModal("No se pudo cargar el historial de costo.");
                this.bsModalHistorial.hide();
            } finally {
                loading?.classList.add("d-none");
            }
        }

        async abrirHistorialCosto() {
            const id = this.getId();
            if (!id) return;
            await this.abrirHistorialCostoPorId(id, this._getFieldValue("txtNombre") || "");
        }

        _renderHistorialCosto(data) {
            const empty = document.getElementById("histCostoEmpty");
            const actual = document.getElementById("histCostoActual");
            const timeline = document.getElementById("histCostoTimeline");
            const sub = document.getElementById("histCostoSub");

            const nombre = data.NombreProducto || data.nombreProducto || "";
            const costoActual = data.CostoActual ?? data.costoActual ?? 0;
            const items = data.Items || data.items || [];

            if (sub && nombre) sub.textContent = nombre;

            if (actual) {
                actual.innerHTML = `
                    <div>
                        <div class="lbl">Costo actual</div>
                    </div>
                    <div class="val">${this._fmtMoneda(costoActual)}</div>`;
                actual.classList.remove("d-none");
            }

            if (!items.length) {
                empty?.classList.remove("d-none");
                timeline?.classList.add("d-none");
                return;
            }

            empty?.classList.add("d-none");

            const html = items.map(it => {
                const tend = (it.Tendencia || it.tendencia || "igual").toLowerCase();
                const ant = it.CostoAnterior ?? it.costoAnterior ?? 0;
                const nuevo = it.CostoNuevo ?? it.costoNuevo ?? 0;
                const variacion = Number(it.Variacion ?? it.variacion ?? (nuevo - ant));
                const pctNum = this._obtenerPorcentajeVariacion(it, ant, nuevo, tend);
                const pctTxt = this._fmtPorcentajeVariacion(pctNum);
                const badgeIcon = tend === "subio" ? "fa-arrow-up" : tend === "bajo" ? "fa-arrow-down" : "fa-minus";
                let montoTxt = "Sin cambio";
                if (tend === "subio") {
                    montoTxt = `+${this._fmtMoneda(Math.abs(variacion))}`;
                } else if (tend === "bajo") {
                    montoTxt = `-${this._fmtMoneda(Math.abs(variacion))}`;
                }

                const variacionHtml = pctTxt && tend !== "igual"
                    ? `<div class="prod-hist-var-row">
                            <span class="prod-hist-var-label">Variacion</span>
                            <span class="prod-hist-pct-large prod-hist-pct-large--${tend}">${pctTxt}</span>
                            <span class="prod-hist-monto-diff">${montoTxt}</span>
                       </div>`
                    : (tend !== "igual"
                        ? `<div class="prod-hist-var-row">
                            <span class="prod-hist-var-label">Variacion</span>
                            <span class="prod-hist-monto-diff">${montoTxt}</span>
                           </div>`
                        : "");

                const origen = it.OrigenTexto || it.origenTexto || it.Origen || it.origen || "";
                const proveedor = it.Proveedor || it.proveedor || it.Detalle || it.detalle || "";
                const usuario = it.Usuario || it.usuario || "";
                const fecha = this.formatearFecha(it.Fecha || it.fecha);
                const idCompra = it.IdCompra ?? it.idCompra;
                const origenCod = (it.Origen || it.origen || "").toUpperCase();
                const linkCompra = (origenCod === "COMPRA" || origenCod === "REVERSION_COMPRA") && idCompra
                    ? `<a href="/Compras/NuevoModif?id=${idCompra}" class="prod-hist-link-compra" target="_blank" rel="noopener">Ver compra</a>`
                    : "";

                const proveedorHtml = proveedor
                    ? `<div class="prod-hist-proveedor"><i class="fa fa-truck"></i> Proveedor: <strong>${this._escapeHtml(proveedor)}</strong></div>`
                    : "";

                const usuarioHtml = !proveedor && usuario
                    ? `<div class="prod-hist-detalle"><i class="fa fa-user"></i> ${this._escapeHtml(usuario)}</div>`
                    : "";

                return `
                    <article class="prod-hist-item prod-hist-item--${tend}">
                        <div class="prod-hist-item-head">
                            <div>
                                <div class="prod-hist-origen">${this._escapeHtml(origen)}${linkCompra}</div>
                                ${proveedorHtml}
                                ${usuarioHtml}
                            </div>
                            <span class="prod-hist-badge prod-hist-badge--${tend}">
                                <i class="fa ${badgeIcon}"></i> ${pctTxt || montoTxt}
                            </span>
                        </div>
                        <div class="prod-hist-fecha">${this._escapeHtml(fecha)}</div>
                        ${variacionHtml}
                        <div class="prod-hist-precios mt-2">
                            <span class="prod-hist-precio-ant">${this._fmtMoneda(ant)}</span>
                            <span class="prod-hist-arrow"><i class="fa fa-long-arrow-right"></i></span>
                            <span class="prod-hist-precio-nuevo">${this._fmtMoneda(nuevo)}</span>
                        </div>
                    </article>`;
            }).join("");

            if (timeline) {
                timeline.innerHTML = html;
                timeline.classList.remove("d-none");
            }
        }

        _formatearCostoUnitario(valor) {
            if (valor === null || valor === undefined || valor === "") return "";
            if (typeof formatearNumero === "function") return formatearNumero(valor);
            if (typeof formatearMiles === "function") return formatearMiles(valor);
            return String(valor);
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
            ["cmbCategoria", "cmbMedida"].forEach(id => {
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

            const grid = this._id("gridPreciosLista");
            if (grid) {
                grid.querySelectorAll("input").forEach(inp => {
                    inp.disabled = disabled;
                    inp.readOnly = disabled;
                });
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
                const chkActivo = this._id("chkActivoProducto");
                const lblActivo = this._id("lblActivoProducto");
                if (chkActivo) chkActivo.checked = true;
                if (lblActivo) lblActivo.textContent = "Activo";

                await this.cargarCombos();
                await this.cargarPreciosPorLista(0);

                this._id("modalEdicionLabel").textContent = "Nuevo Producto";
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
            this._setFieldValue("txtCostoUnitario", this._formatearCostoUnitario(modelo.CostoUnitario));
            const stockMin = modelo.StockMinimo ?? 0;
            this._setFieldValue("txtStockMinimo",
                typeof formatearMiles === "function" ? formatearMiles(String(stockMin)) : stockMin);
            const chkActivo = this._id("chkActivoProducto");
            const lblActivo = this._id("lblActivoProducto");
            if (chkActivo) chkActivo.checked = modelo.Activo !== false;
            if (lblActivo) lblActivo.textContent = (chkActivo && chkActivo.checked) ? "Activo" : "Inactivo";

            if (modelo.IdCategoria) this._setFieldValue("cmbCategoria", modelo.IdCategoria, true);
            if (modelo.IdMedida) this._setFieldValue("cmbMedida", modelo.IdMedida, true);

            await this.cargarPreciosPorLista(modelo.Id || 0);

            this._setAuditoria(modelo);
            this._actualizarBtnHistorialCosto();

            this._id("modalEdicionLabel").textContent = soloLectura ? "Ver Producto" : "Editar Producto";
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
            this.resetSelect("cmbCategoria", "Seleccionar");
            this.resetSelect("cmbMedida", "Seleccionar");

            await Promise.all([
                this._llenarCombo("cmbCategoria", this.options.endpoints.categorias),
                this._llenarCombo("cmbMedida", this.options.endpoints.medidas)
            ]);

            this.inicializarSelect2Modal();
        }

        _escapeHtml(text) {
            const div = document.createElement("div");
            div.textContent = text ?? "";
            return div.innerHTML;
        }

        async cargarPreciosPorLista(idProducto) {
            const grid = this._id("gridPreciosLista");
            const lblSinListas = this._id("lblPreciosSinListas");
            if (!grid) return;

            grid.innerHTML = "";

            const url = this._replaceUrl(this.options.endpoints.preciosLista, { id: idProducto || 0 });
            const data = await this._fetchJson(url, { headers: this._headers(false) });

            if (!data || data.length === 0) {
                lblSinListas?.classList.remove("d-none");
                return;
            }

            lblSinListas?.classList.add("d-none");

            (data || []).forEach(row => {
                const card = document.createElement("div");
                card.className = "rp-precio-card";
                card.dataset.idLista = row.IdListaPrecio;
                card.dataset.idPrecio = row.Id || 0;

                const precioFmt = row.PrecioVenta > 0
                    ? (typeof formatearNumero === "function" ? formatearNumero(row.PrecioVenta) : row.PrecioVenta)
                    : "";

                const rentFmt = row.PorcRentabilidad > 0
                    ? (typeof formatearNumero === "function" ? formatearNumero(row.PorcRentabilidad) : row.PorcRentabilidad)
                    : "";

                const nombreLista = this._escapeHtml(row.ListaPrecio || "");

                card.innerHTML = `
                    <div class="rp-precio-card-head">
                        <span class="rp-precio-card-badge"><i class="fa fa-tag"></i></span>
                        <span class="rp-precio-card-name">${nombreLista}</span>
                    </div>
                    <div class="rp-precio-card-body">
                        <div class="rp-precio-card-field">
                            <label>Precio venta</label>
                            <input type="text" inputmode="decimal" autocomplete="off"
                                   class="form-control Inputmiles precio-lista-precio"
                                   data-lista="${row.IdListaPrecio}" value="${precioFmt}" placeholder="0,00" />
                        </div>
                        <div class="rp-precio-card-field">
                            <label>% Rentabilidad</label>
                            <input type="text" inputmode="decimal" autocomplete="off"
                                   class="form-control Inputmiles precio-lista-rent"
                                   data-lista="${row.IdListaPrecio}" value="${rentFmt}" placeholder="0,00" />
                        </div>
                    </div>`;
                grid.appendChild(card);
            });
        }

        _obtenerPreciosDesdeForm() {
            const grid = this._id("gridPreciosLista");
            if (!grid) return [];

            return Array.from(grid.querySelectorAll(".rp-precio-card")).map(card => {
                const inpPrecio = card.querySelector(".precio-lista-precio");
                const inpRent = card.querySelector(".precio-lista-rent");
                const parse = typeof parseNumero === "function"
                    ? parseNumero
                    : (v) => parseFloat(String(v || "").replace(/\./g, "").replace(",", ".")) || 0;

                return {
                    Id: parseInt(card.dataset.idPrecio || "0", 10) || 0,
                    IdListaPrecio: parseInt(card.dataset.idLista || "0", 10),
                    ListaPrecio: card.querySelector(".rp-precio-card-name")?.textContent?.trim() || "",
                    PrecioVenta: parse(inpPrecio?.value || ""),
                    PorcRentabilidad: parse(inpRent?.value || "")
                };
            });
        }

        async _guardarPreciosPorLista(idProducto) {
            const precios = this._obtenerPreciosDesdeForm();
            const tieneAlguno = precios.some(p => p.PrecioVenta > 0 || p.PorcRentabilidad > 0);
            if (!tieneAlguno) return true;

            try {
                const data = await this._fetchJson(this.options.endpoints.preciosGuardar, {
                    method: "POST",
                    headers: this._headers(true),
                    body: JSON.stringify({ IdProducto: idProducto, Precios: precios })
                });

                if (!data?.valor) {
                    this.mostrarErrorCampos(data?.mensaje || "No se pudieron guardar los precios.", null, data?.tipo || "error");
                    return false;
                }

                return true;
            } catch (err) {
                console.error(err);
                this.mostrarErrorCampos("Error al guardar precios por lista.", null, "error");
                return false;
            }
        }

        async guardar() {
            if (this.isSoloLectura()) return true;
            if (!this.validarCampos()) return false;

            const id = this._getFieldValue("txtId");

            const modelo = {
                Id: id !== "" ? parseInt(id, 10) : 0,
                Nombre: this._getFieldValue("txtNombre"),
                IdCategoria: this._getIntOrNull("cmbCategoria"),
                IdMedida: this._getIntOrNull("cmbMedida"),
                CostoUnitario: this._getDecimal("txtCostoUnitario"),
                StockMinimo: this._getIntOrNull("txtStockMinimo") ?? 0,
                Activo: this._id("chkActivoProducto") ? this._id("chkActivoProducto").checked : true
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

                const idProducto = data?.id || modelo.Id;
                const preciosOk = await this._guardarPreciosPorLista(idProducto);
                if (!preciosOk) return false;

                this.cerrarErrorCampos();
                this.cerrar();
                exitoModal(data.mensaje || (esNuevo ? "Producto registrado correctamente" : "Producto modificado correctamente"));

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
                ? await confirmarModal("¿Desea eliminar este producto?")
                : window.confirm("¿Desea eliminar este producto?");

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
                    exitoModal(data.mensaje || "Producto eliminado correctamente");
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
            const gridPrecios = this._id("gridPreciosLista");
            if (gridPrecios) gridPrecios.innerHTML = "";
            this._id("lblPreciosSinListas")?.classList.add("d-none");
            this._refreshAllSelect2();
            this._actualizarBtnHistorialCosto();
        }

        _valorCampoValido(el) {
            if (!el) return false;
            const valor = (el.value ?? "").toString().trim();
            if (valor === "" || valor === "Seleccionar") return false;
            if (el.id === "txtCostoUnitario") {
                const n = typeof parseNumero === "function"
                    ? parseNumero(valor)
                    : parseFloat(valor.replace(/\./g, "").replace(",", "."));
                return !Number.isNaN(n) && n >= 0;
            }
            if (el.id === "txtStockMinimo") {
                const n = parseInt(valor, 10);
                return !Number.isNaN(n) && n >= 0;
            }
            return true;
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
            if (detail?.tipo === "ListasPrecios") {
                const idProducto = this.getId();
                await this.cargarPreciosPorLista(idProducto);
                return;
            }

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
                    console.error("Error recargando combo tras configuracion", err);
                }
            };

            document.addEventListener("configuracionActualizada", this._configListener);
        }

        mostrarErrorCampos(mensaje, idReferencia = null, tipo = "validacion") {
            if (tipo === "validacion") this._validacion?.cancelarPanelExito?.();
            const container = this._id("errorCampos");
            if (window.RpVerFicha?.renderErrorCampos) {
                window.RpVerFicha.renderErrorCampos(container, mensaje, idReferencia, tipo, "verProducto");
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
                    ? window.RpVerFicha.botonHtml(idReferencia, "verProducto")
                    : `
                    <button class="rp-btn-ref" data-rp-ver-ficha data-id="${idReferencia}" data-handler="verProducto">
                        <i class="fa fa-eye me-1"></i> Abrir ficha existente
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

            const btnHist = this._id("btnHistorialCosto");
            if (btnHist) {
                btnHist.addEventListener("click", (e) => {
                    e.preventDefault();
                    this.abrirHistorialCosto();
                });
            }

            const chkActivo = this._id("chkActivoProducto");
            const lblActivo = this._id("lblActivoProducto");
            if (chkActivo && lblActivo) {
                chkActivo.addEventListener("change", () => {
                    lblActivo.textContent = chkActivo.checked ? "Activo" : "Inactivo";
                });
            }

            this._validacion?.attachEvents({ select2Namespace: "mproductos" });
        }

        _bindModalEvents() {
            this.modalEl.addEventListener("shown.bs.modal", () => {
                this.inicializarSelect2Modal();
            });
        }
    }

    window.guardarProducto = function () {
        return window.productoModal?.guardar?.();
    };

    window.cerrarErrorCampos = function () {
        return window.productoModal?.cerrarErrorCampos?.();
    };

    /**
     * Inicializa (o reconfigura) el modal M_Productos de la pagina.
     * Incluir el partial M_Productos.cshtml y llamar desde el modulo host con onSaved, etc.
     */
    function initProductoModal(options = {}) {
        const root = document.querySelector("[data-producto-modal]")
            || document.querySelector(".producto-modal-root");

        if (!root) {
            console.warn("initProductoModal: incluya el partial M_Productos en la vista.");
            return null;
        }

        const merged = Object.assign({ token: window.token || "" }, options || {});

        if (!window.productoModal || window.productoModal.modalEl !== root) {
            window.productoModal = new ProductoModal(root, merged);
        } else {
            Object.assign(window.productoModal.options, merged);
        }

        const abrirVer = (id) => window.productoModal?.abrirVer?.(id);

        window.nuevoProducto = () => window.productoModal?.abrirNuevo?.();
        window.verProducto = abrirVer;
        window.editarProducto = (id) => window.productoModal?.abrirEditar?.(id);
        window.eliminarProducto = (id) => window.productoModal?.eliminar?.(id);
        window.verFicha = abrirVer;
        window.verHistorialCostoProducto = (id, nombre) =>
            window.productoModal?.abrirHistorialCostoPorId?.(id, nombre);

        if (window.RpVerFicha?.registrar) {
            window.RpVerFicha.registrar("verProducto", abrirVer);
        }

        return window.productoModal;
    }

    window.initProductoModal = initProductoModal;
    window.ProductoModal = ProductoModal;

})(window);