(function (window) {
    "use strict";

    class ContratoModal {

        constructor(root, options = {}) {
            if (!root) throw new Error("ContratoModal requiere root.");

            this.root = root;
            this.options = Object.assign({
                token: window.token || "",
                endpoints: {
                    editar: "/Contratos/EditarInfo?id={id}",
                    insertar: "/Contratos/Insertar",
                    actualizar: "/Contratos/Actualizar",
                    eliminar: "/Contratos/Eliminar?id={id}",
                    clientes: "/Clientes/Lista",
                    establecimientosPorCliente: "/ClientesEstablecimientos/ListaPorCliente?idCliente={idCliente}",
                    renovLista: "/ContratosRenovaciones/ListaPorContrato?idContrato={idContrato}",
                    renovInsertar: "/ContratosRenovaciones/Insertar",
                    renovActualizar: "/ContratosRenovaciones/Actualizar",
                    renovEliminar: "/ContratosRenovaciones/Eliminar?id={id}"
                },
                onSaved: null,
                onDeleted: null
            }, options || {});

            this.modalEl = this.root.matches("[data-contrato-modal]")
                ? this.root
                : this.root.querySelector("[data-contrato-modal]");

            if (!this.modalEl) throw new Error("No se encontró [data-contrato-modal].");

            this.bsModal = new bootstrap.Modal(this.modalEl);
            this._ultimoModo = "nuevo";
            this._modeloActual = null;
            this._clientes = [];
            this._establecimientos = [];
            this._renovaciones = [];
            this._renovSeleccionadaId = 0;

            this._comboPorController = {
                TiposContratos: { selectId: "cmbTipoContrato" }
            };

            this._validacion = new ValidacionModalAbm({
                modalEl: this.modalEl,
                getPanel: () => this._id("errorCamposContrato"),
                campos: [
                    { id: "cmbClienteContrato", nombre: "Cliente" },
                    { id: "cmbEstablecimientoContrato", nombre: "Establecimiento" },
                    { id: "txtFechaContrato", nombre: "Fecha contrato" },
                    { id: "txtFechaInicioContrato", nombre: "Fecha inicio" },
                    { id: "txtFechaVencContrato", nombre: "Fecha vencimiento" }
                ],
                esCampoValido: (el) => this._valorCampoValido(el),
                isSoloLectura: () => this.isSoloLectura(),
                mostrarError: (msg) => this._mostrarErrorValidacionPanel(msg),
                cerrarPanel: () => this._cerrarPanelValidacion()
            });

            window.contratoModal = this;
            this._bindEvents();
            this._bindModalEvents();
            this._bindDocumentosEvents();
            this._bindRenovacionesEvents();
            this._bindConfiguracionActualizada();
        }

        _q(s) { return this.modalEl.querySelector(s); }
        _id(id) { return this.modalEl.querySelector(`#${id}`); }

        _replaceUrl(url, values) {
            let r = url;
            Object.keys(values || {}).forEach(k => { r = r.replace(`{${k}}`, values[k]); });
            return r;
        }

        _headers(json = true) {
            const h = {};
            if (json) h["Content-Type"] = "application/json;charset=utf-8";
            if (this.options.token) h.Authorization = "Bearer " + this.options.token;
            return h;
        }

        async _fetchJson(url, opts = {}) {
            const r = await fetch(url, opts);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return await r.json();
        }

        _toInt(v) {
            const n = parseInt(v, 10);
            return Number.isNaN(n) ? 0 : n;
        }

        _escapeHtml(text) {
            return String(text ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
        }

        getId() {
            return this._toInt(this._id("txtIdContrato")?.value);
        }

        isSoloLectura() {
            return this.modalEl.getAttribute("data-sololectura") === "1";
        }

        setSoloLectura(flag) {
            this.modalEl.setAttribute("data-sololectura", flag ? "1" : "0");
        }

        _valorCampoValido(el) {
            if (!el) return false;

            let valor = (el.value ?? "").toString().trim();
            if (el.tagName === "SELECT" && window.jQuery) {
                const $el = window.jQuery(el);
                if ($el.data("select2")) {
                    valor = ($el.val() ?? "").toString().trim();
                }
            }

            if (el.tagName === "SELECT") return this._toInt(valor) > 0;
            if (el.type === "date") return !!valor;
            return !!valor;
        }

        ensureSelect2($el, opts) {
            if (!$el?.length || !window.jQuery) return;
            if ($el.data("select2")) $el.select2("destroy");
            $el.select2(Object.assign({ width: "100%", allowClear: false }, opts || {}));
        }

        _setTextoBotonPrincipal(esNuevo) {
            const btn = this._id("btnGuardarContrato");
            if (!btn) return;
            btn.innerHTML = esNuevo
                ? `<i class="fa fa-check"></i> Registrar`
                : `<i class="fa fa-check"></i> Guardar`;
        }

        _setTextoBotonRenovacion(esNuevo) {
            const lbl = this._id("lblGuardarRenovContrato");
            if (lbl) lbl.textContent = esNuevo ? "Registrar renovación" : "Guardar renovación";
        }

        limpiarModal() {
            this.setSoloLectura(false);
            this._id("txtIdContrato").value = "";
            this.modalEl.querySelectorAll("input, select, textarea").forEach(el => {
                if (el.id === "txtIdContrato") return;
                if (el.tagName === "SELECT") el.selectedIndex = 0;
                else el.value = "";
            });
            this._validacion?.reset();
            this._setAuditoria(null);
            this.prepararRenovacionesNuevo();
            this.cerrarErrorCampos();
            this._refreshAllSelect2();
        }

        _refreshAllSelect2() {
            if (!window.jQuery) return;
            window.jQuery(this.modalEl).find("select").each(function () {
                const $el = window.jQuery(this);
                if ($el.data("select2")) $el.trigger("change.select2");
            });
        }

        async cargarCombos() {
            await Promise.all([
                this._cargarClientes(),
                this._cargarTiposContrato(),
                this._cargarEstablecimientos(0)
            ]);
        }

        async _cargarTiposContrato(idSeleccionar) {
            const sel = this._id("cmbTipoContrato");
            if (!sel) return;

            const prev = idSeleccionar || this._toInt(window.jQuery(sel).val());

            try {
                const lista = await this._fetchJson("/TiposContratos/Lista", { headers: this._headers(false) });
                sel.innerHTML = `<option value="">Seleccionar</option>` +
                    (lista || []).map(t =>
                        `<option value="${t.Id}">${this._escapeHtml(t.Nombre)}</option>`
                    ).join("");
            } catch {
                sel.innerHTML = `<option value="">Seleccionar</option>`;
            }

            const id = idSeleccionar || prev;
            if (id && window.jQuery) {
                window.jQuery(sel).val(String(id)).trigger("change");
            } else if (window.jQuery?.(sel).data("select2")) {
                window.jQuery(sel).trigger("change.select2");
            }
        }

        async recargarTiposContrato(idSeleccionar) {
            await this._cargarTiposContrato(idSeleccionar);
        }

        async _onConfiguracionActualizada(detail) {
            const cfg = this._comboPorController[detail?.tipo];
            if (!cfg) return;

            await this.recargarTiposContrato(detail.nuevoId || null);

            if (detail.nuevoId) {
                const el = this._id(cfg.selectId);
                if (el) this._validacion?.onSelect2Change?.(el);
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

        async recargarClientes(idSeleccionar) {
            const prev = idSeleccionar || this._toInt(window.jQuery(this._id("cmbClienteContrato")).val());
            await this._cargarClientes();
            if (prev) {
                window.jQuery(this._id("cmbClienteContrato")).val(String(prev)).trigger("change");
            }
        }

        async recargarEstablecimientos(idCliente, idSeleccionar) {
            const cli = idCliente || this._toInt(window.jQuery(this._id("cmbClienteContrato")).val());
            await this._cargarEstablecimientos(cli);
            const prev = idSeleccionar || this._toInt(window.jQuery(this._id("cmbEstablecimientoContrato")).val());
            if (prev) {
                window.jQuery(this._id("cmbEstablecimientoContrato")).val(String(prev)).trigger("change");
            }
        }

        inicializarSelect2Modal() {
            if (!window.jQuery) return;
            const $modal = window.jQuery(this.modalEl);
            ["cmbClienteContrato", "cmbEstablecimientoContrato", "cmbTipoContrato", "cmbTipoRenovContrato"].forEach(id => {
                const $el = $modal.find(`#${id}`);
                if ($el.length) {
                    this.ensureSelect2($el, { dropdownParent: $modal, placeholder: "Seleccionar" });
                }
            });
        }

        _bindEvents() {
            const guardarBtn = this._id("btnGuardarContrato");
            if (guardarBtn) {
                guardarBtn.removeAttribute("onclick");
                guardarBtn.addEventListener("click", () => this.guardar());
            }

            const elimBtn = this._id("btnEliminarContrato");
            if (elimBtn) {
                elimBtn.addEventListener("click", () => this.eliminar(this.getId()));
            }

            const cerrarBtn = this.modalEl.querySelector("#errorCamposContrato .rp-error-close");
            if (cerrarBtn) {
                cerrarBtn.removeAttribute("onclick");
                cerrarBtn.addEventListener("click", () => this.cerrarErrorCampos());
            }

            const btnCli = this._id("btnAgregarClienteContrato");
            if (btnCli) {
                btnCli.addEventListener("click", () => this._abrirNuevoCliente());
            }

            const btnEst = this._id("btnAgregarEstablecimientoContrato");
            if (btnEst) {
                btnEst.addEventListener("click", () => this._abrirNuevoEstablecimiento());
            }

            const $cli = window.jQuery(this._id("cmbClienteContrato"));
            $cli.off("change.contrato").on("change.contrato", () => this._onClienteChange());

            this._validacion?.attachEvents({ select2Namespace: "mcontratos" });
        }

        _bindModalEvents() {
            this.modalEl.addEventListener("shown.bs.modal", () => {
                this.inicializarSelect2Modal();
            });
        }

        _bindDocumentosEvents() {
            const btnWord = this._id("btnContratoWord");
            const lista = this._id("listaDocsContrato");

            if (btnWord) {
                btnWord.addEventListener("click", () => this._generarDocumento());
            }

            if (lista) {
                lista.addEventListener("click", async (e) => {
                    const btnDl = e.target.closest(".btn-doc-descargar");
                    const btnDel = e.target.closest(".btn-doc-eliminar");
                    if (btnDl) {
                        e.preventDefault();
                        const id = Number(btnDl.dataset.id);
                        const nombre = btnDl.getAttribute("data-nombre") || "";
                        await this._descargarDocumentoAdjunto(id, nombre);
                    }
                    if (btnDel) {
                        const id = Number(btnDel.dataset.id);
                        await this._eliminarDocumento(id);
                    }
                });
            }
        }

        _setEstadoDocumentos(modo, texto) {
            const box = this._id("docContratoEstado");
            const txt = this._id("docContratoEstadoTexto");
            if (!box || !txt) return;

            box.classList.remove("d-none", "is-ok", "is-error");
            const icon = box.querySelector("i");

            if (modo === "loading") {
                if (icon) icon.className = "fa fa-spinner fa-spin";
                txt.textContent = texto || "Generando contrato...";
            } else if (modo === "ok") {
                box.classList.add("is-ok");
                if (icon) icon.className = "fa fa-check-circle";
                txt.textContent = texto || "Contrato generado correctamente.";
            } else if (modo === "error") {
                box.classList.add("is-error");
                if (icon) icon.className = "fa fa-exclamation-circle";
                txt.textContent = texto || "No se pudo generar el contrato.";
            } else {
                box.classList.add("d-none");
                return;
            }
        }

        _bloquearBotonesDocumentos(bloquear) {
            const btnWord = this._id("btnContratoWord");
            if (btnWord) btnWord.disabled = !!bloquear;
        }

        async _descargarDocumentoAdjunto(id, nombre) {
            if (!window.ContratosDocumentos?.descargarDocumentoContrato) {
                if (typeof errorModal === "function") errorModal("Módulo de documentos no cargado.");
                return;
            }
            this._setEstadoDocumentos("loading", "Descargando archivo...");
            try {
                await window.ContratosDocumentos.descargarDocumentoContrato(id, nombre);
                this._setEstadoDocumentos("ok", "Descarga iniciada.");
                setTimeout(() => this._setEstadoDocumentos("hide"), 2500);
            } catch (e) {
                console.error(e);
                this._setEstadoDocumentos("error", e.message || "No se pudo descargar el archivo.");
            }
        }

        async _generarDocumento() {
            if (this.isSoloLectura()) return;
            const id = this.getId();
            const idTipo = this._toInt(window.jQuery(this._id("cmbTipoContrato")).val());

            if (!window.ContratosDocumentos?.exportarContratoDocumento) {
                if (typeof errorModal === "function") errorModal("Módulo de documentos no cargado.");
                return;
            }

            const tabDoc = this._id("tabBtnDocContrato");
            if (tabDoc && window.bootstrap?.Tab) {
                bootstrap.Tab.getOrCreateInstance(tabDoc).show();
            }

            this._bloquearBotonesDocumentos(true);
            this._setEstadoDocumentos("loading", "Generando contrato Word...");

            try {
                const generado = await window.ContratosDocumentos.exportarContratoDocumento({
                    idContrato: id,
                    idTipoContrato: idTipo,
                    formato: "word",
                    sinModalExito: true,
                    onProgress: (txt) => this._setEstadoDocumentos("loading", txt)
                });
                const nuevoDocId = Number(generado?.id || 0);
                await this._cargarDocumentosAdjuntos(nuevoDocId);
                this._setEstadoDocumentos("ok", "Contrato generado y adjuntado. Podés descargarlo desde la lista.");
                setTimeout(() => this._setEstadoDocumentos("hide"), 4000);
            } catch (e) {
                console.error(e);
                this._setEstadoDocumentos("error", e.message || "No se pudo generar el documento. Verifique la plantilla .docx.");
            } finally {
                this.habilitarSeccionDocumentos(!this.isSoloLectura() && this.getId() > 0);
            }
        }

        async _cargarDocumentosAdjuntos(idDestacar) {
            const $lista = window.jQuery(this._id("listaDocsContrato"));
            if (!$lista.length || !window.ContratosDocumentos?.cargarListaDocumentosContrato) return;
            await window.ContratosDocumentos.cargarListaDocumentosContrato(this.getId(), $lista, idDestacar);
        }

        async _eliminarDocumento(id) {
            const ok = typeof confirmarModal === "function"
                ? await confirmarModal("¿Eliminar este documento adjunto?")
                : window.confirm("¿Eliminar documento?");
            if (!ok) return;

            const r = await fetch(`/ContratosDocumentos/Eliminar?id=${id}`, {
                method: "DELETE",
                headers: this._headers(false)
            });
            const res = await r.json();
            if (res.valor) {
                if (typeof exitoModal === "function") exitoModal(res.mensaje || "Documento eliminado.");
                await this._cargarDocumentosAdjuntos();
            } else if (typeof errorModal === "function") {
                errorModal(res.mensaje || "No se pudo eliminar.");
            }
        }

        _bindRenovacionesEvents() {
            const lista = this._id("listaRenovContrato");
            if (lista) {
                lista.addEventListener("click", (e) => {
                    const btnDel = e.target.closest(".btn-eliminar-renov");
                    if (btnDel) {
                        e.stopPropagation();
                        const id = this._toInt(btnDel.getAttribute("data-id"));
                        if (id) this.eliminarRenovacion(id);
                        return;
                    }
                    const item = e.target.closest(".rp-sub-item");
                    if (item) {
                        const id = this._toInt(item.getAttribute("data-id"));
                        if (id) this._seleccionarRenovacion(id);
                    }
                });
            }

            const btnGuardarRenov = this._id("btnGuardarRenovContrato");
            if (btnGuardarRenov) {
                btnGuardarRenov.removeAttribute("onclick");
                btnGuardarRenov.addEventListener("click", () => this.guardarRenovacion());
            }

            const btnNuevoRenov = this._id("btnNuevoRenovContrato");
            if (btnNuevoRenov) {
                btnNuevoRenov.removeAttribute("onclick");
                btnNuevoRenov.addEventListener("click", () => this.nuevaRenovacion());
            }
        }

        _abrirNuevoCliente() {
            if (this.isSoloLectura()) return;
            if (typeof window.nuevoCliente === "function") {
                window.nuevoCliente();
                return;
            }
            if (typeof errorModal === "function") {
                errorModal("No está disponible el alta de clientes en esta pantalla.");
            }
        }

        async _abrirNuevoEstablecimiento() {
            if (this.isSoloLectura()) return;
            const idCliente = this._toInt(window.jQuery(this._id("cmbClienteContrato")).val());
            if (!idCliente) {
                if (typeof errorModal === "function") {
                    errorModal("Seleccioná un cliente antes de agregar un establecimiento (o creá uno con el botón + en Cliente).");
                }
                return;
            }
            if (typeof window.nuevoEstablecimiento === "function") {
                await window.nuevoEstablecimiento(idCliente);
                return;
            }
            if (typeof errorModal === "function") {
                errorModal("No está disponible el alta de establecimientos en esta pantalla.");
            }
        }

        async _cargarClientes() {
            this._clientes = await this._fetchJson(this.options.endpoints.clientes, { headers: this._headers(false) });
            const $c = window.jQuery(this._id("cmbClienteContrato"));
            const val = $c.val();
            $c.empty().append(`<option value="">Seleccionar</option>`);
            (this._clientes || []).forEach(x => {
                $c.append(`<option value="${x.Id}">${x.Nombre}</option>`);
            });
            if (val) $c.val(val);
            this.ensureSelect2($c, { dropdownParent: window.jQuery(this.modalEl), placeholder: "Seleccionar" });
        }

        async _cargarEstablecimientos(idCliente) {
            const $e = window.jQuery(this._id("cmbEstablecimientoContrato"));
            const val = $e.val();
            $e.empty().append(`<option value="">Seleccionar</option>`);

            if (!idCliente) {
                this.ensureSelect2($e, { dropdownParent: window.jQuery(this.modalEl), placeholder: "Seleccionar" });
                return;
            }

            const url = this._replaceUrl(this.options.endpoints.establecimientosPorCliente, { idCliente });
            this._establecimientos = await this._fetchJson(url, { headers: this._headers(false) });
            (this._establecimientos || []).forEach(x => {
                $e.append(`<option value="${x.Id}">${x.Nombre}</option>`);
            });
            if (val) $e.val(val);
            this.ensureSelect2($e, { dropdownParent: window.jQuery(this.modalEl), placeholder: "Seleccionar" });
        }

        async _onClienteChange() {
            const idCliente = this._toInt(window.jQuery(this._id("cmbClienteContrato")).val());
            await this._cargarEstablecimientos(idCliente);
            this.actualizarBadgeContrato();
        }

        _avatarClassRenov(tipo) {
            const t = (tipo || "").toUpperCase();
            if (t === "AMPLIACION") return "tipo-ampliacion";
            if (t === "MODIFICACION") return "tipo-modificacion";
            return "";
        }

        _fechaInput(d) {
            if (!d) return "";
            const s = String(d).trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
            const dt = new Date(d);
            if (isNaN(dt.getTime())) return "";
            const pad = n => String(n).padStart(2, "0");
            return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
        }

        _fechaPayload(valor) {
            const s = String(valor || "").trim();
            if (!s) return "";
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
            return this._fechaInput(s);
        }

        _normalizeRenovacion(r) {
            if (!r) return null;
            return {
                Id: this._toInt(r.Id ?? r.id),
                IdContrato: this._toInt(r.IdContrato ?? r.idContrato),
                Tipo: r.Tipo ?? r.tipo ?? "",
                FechaInicio: r.FechaInicio ?? r.fechaInicio,
                FechaVencimiento: r.FechaVencimiento ?? r.fechaVencimiento
            };
        }

        _activarTabRenovaciones() {
            const btn = this._id("tabBtnRenovContrato");
            if (btn && window.bootstrap?.Tab) {
                bootstrap.Tab.getOrCreateInstance(btn).show();
            } else if (btn) {
                btn.click();
            }
        }

        formatearFecha(fecha) {
            try {
                return new Date(fecha).toLocaleString("es-AR");
            } catch {
                return fecha;
            }
        }

        async abrirNuevo(idCliente, idEstablecimiento) {
            try {
                this._ultimoModo = "nuevo";
                this._modeloActual = null;
                this.limpiarModal();
                this._id("modalContratoLabel").textContent = "Nuevo contrato";
                this._id("btnEliminarContrato").hidden = true;
                this._setTextoBotonPrincipal(true);

                const hoy = new Date().toISOString().slice(0, 10);
                await this.cargarCombos();

                this._id("txtFechaContrato").value = hoy;
                this._id("txtFechaInicioContrato").value = hoy;
                this._id("txtFechaVencContrato").value = hoy;

                if (idCliente) {
                    window.jQuery(this._id("cmbClienteContrato")).val(String(idCliente)).trigger("change");
                    await this._onClienteChange();
                }
                if (idEstablecimiento) {
                    window.jQuery(this._id("cmbEstablecimientoContrato")).val(String(idEstablecimiento)).trigger("change");
                }

                this.actualizarBadgeContrato();
                this.bsModal.show();
            } catch (e) {
                console.error(e);
                if (typeof errorModal === "function") errorModal("No se pudo abrir el formulario de contrato.");
            }
        }

        async abrirEditar(id) {
            this._ultimoModo = "editar";
            await this._cargarDatos(id, false);
        }

        async abrirVer(id) {
            this.cerrarErrorCampos();
            this._ultimoModo = "ver";
            await this._cargarDatos(id, true);
        }

        async _cargarDatos(id, soloLectura) {
            this.limpiarModal();
            const d = await this._fetchJson(this._replaceUrl(this.options.endpoints.editar, { id }), {
                headers: this._headers(false)
            });

            this._modeloActual = d;
            this.setSoloLectura(soloLectura);
            this._id("modalContratoLabel").textContent = soloLectura
                ? `Ver contrato #${d.Id}`
                : `Editar contrato #${d.Id}`;
            this._id("txtIdContrato").value = d.Id;
            this._id("btnEliminarContrato").hidden = soloLectura;
            this._setTextoBotonPrincipal(false);

            await this._cargarClientes();
            window.jQuery(this._id("cmbClienteContrato")).val(String(d.IdCliente)).trigger("change");
            await this._onClienteChange();
            window.jQuery(this._id("cmbEstablecimientoContrato")).val(String(d.IdEstablecimiento)).trigger("change");
            await this._cargarTiposContrato(d.IdTipoContrato || d.idTipoContrato || null);

            this._id("txtFechaContrato").value = this._fechaInput(d.FechaContrato);
            this._id("txtFechaInicioContrato").value = this._fechaInput(d.FechaInicio);
            this._id("txtFechaVencContrato").value = this._fechaInput(d.FechaVencimiento);

            this._setAuditoria(d);
            this.actualizarBadgeContrato();
            await this._cargarRenovaciones();
            await this._cargarDocumentosAdjuntos();
            this.habilitarSeccionDocumentos(id > 0);
            this._aplicarSoloLectura(soloLectura);
            this.cerrarErrorCampos();
            this.bsModal.show();
        }

        _setAuditoria(modelo) {
            const wrap = this._id("infoAuditoriaContrato");
            const reg = this._id("infoRegistroContrato");
            const mod = this._id("infoModificacionContrato");
            if (!wrap || !reg || !mod) return;

            reg.innerHTML = "";
            mod.innerHTML = "";
            wrap.classList.add("d-none");

            if (!modelo) return;

            const txtUltimaMod = "Última modificación por";

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

        actualizarBadgeContrato() {
            const id = this.getId();
            const cliente = window.jQuery(this._id("cmbClienteContrato")).find("option:selected").text() || "";
            const est = window.jQuery(this._id("cmbEstablecimientoContrato")).find("option:selected").text() || "";
            const nombre = id > 0 && this._modeloActual
                ? `#${id} · ${this._modeloActual.Cliente || cliente} / ${this._modeloActual.Establecimiento || est}`
                : (cliente && est && cliente !== "Seleccionar" ? `${cliente} / ${est}` : "Nuevo");

            const elNombre = this._id("renovContratoNombre");
            if (elNombre) elNombre.textContent = nombre;

            this.habilitarSeccionRenovaciones(id > 0);
            this.habilitarSeccionDocumentos(id > 0);
        }

        habilitarSeccionDocumentos(habilitar) {
            const section = this._id("sectionDocContrato");
            const hint = this._id("docContratoHint");
            const btnW = this._id("btnContratoWord");
            if (!section) return;

            if (habilitar) {
                section.classList.remove("rp-section-disabled");
                if (hint) {
                    hint.classList.add("success");
                    hint.innerHTML = `<i class="fa fa-check-circle"></i> Generá el Word y queda adjunto al contrato en el servidor.`;
                }
            } else {
                section.classList.add("rp-section-disabled");
                if (hint) {
                    hint.classList.remove("success");
                    hint.innerHTML = `<i class="fa fa-info-circle"></i> Guardá el contrato para generar y adjuntar documentos.`;
                }
            }

            const dis = this.isSoloLectura() || !habilitar;
            if (btnW) btnW.disabled = dis;
            const cmbTipo = this._id("cmbTipoContrato");
            if (cmbTipo) cmbTipo.disabled = dis;
        }

        prepararRenovacionesNuevo() {
            this._renovaciones = [];
            this._renovSeleccionadaId = 0;
            this.limpiarFormRenovacion();
            this.renderListaRenovaciones();
            this.habilitarSeccionRenovaciones(false);
            this.habilitarSeccionDocumentos(false);
            this._cargarDocumentosAdjuntos();
        }

        habilitarSeccionRenovaciones(habilitar) {
            const section = this._id("sectionRenovContrato");
            const hint = this._id("renovContratoHint");
            if (!section || !hint) return;

            if (habilitar) {
                section.classList.remove("rp-section-disabled");
                hint.classList.add("success");
                hint.innerHTML = `<i class="fa fa-check-circle"></i> Ya podés administrar las renovaciones del contrato.`;
            } else {
                section.classList.add("rp-section-disabled");
                hint.classList.remove("success");
                hint.innerHTML = `<i class="fa fa-info-circle"></i> Guardá el contrato para administrar renovaciones.`;
            }

            this.bloquearControlesRenovaciones(this.isSoloLectura() || !habilitar);
        }

        bloquearControlesRenovaciones(bloquear) {
            ["cmbTipoRenovContrato", "txtRenovInicioContrato", "txtRenovVencContrato"].forEach(id => {
                const el = this._id(id);
                if (el) el.disabled = !!bloquear;
            });
            const btnG = this._id("btnGuardarRenovContrato");
            const btnN = this._id("btnNuevoRenovContrato");
            if (btnG) btnG.disabled = !!bloquear;
            if (btnN) btnN.disabled = !!bloquear;

            const lista = this._id("listaRenovContrato");
            if (lista) {
                lista.querySelectorAll(".btn-eliminar-renov").forEach(btn => {
                    btn.disabled = !!bloquear;
                });
            }
        }

        _aplicarSoloLectura(flag) {
            const dis = flag;
            const btnGuardar = this._id("btnGuardarContrato");
            if (btnGuardar) btnGuardar.classList.toggle("d-none", dis);

            ["cmbClienteContrato", "cmbEstablecimientoContrato", "cmbTipoContrato", "txtFechaContrato", "txtFechaInicioContrato", "txtFechaVencContrato"].forEach(id => {
                const el = this._id(id);
                if (el) el.disabled = dis;
            });

            const btnCli = this._id("btnAgregarClienteContrato");
            const btnEst = this._id("btnAgregarEstablecimientoContrato");
            const btnTipo = this._id("btnAgregarTipoContrato");
            if (btnCli) btnCli.disabled = dis;
            if (btnEst) btnEst.disabled = dis;
            if (btnTipo) btnTipo.disabled = dis;

            this.bloquearControlesRenovaciones(dis || this.getId() <= 0);
            this.habilitarSeccionDocumentos(!dis && this.getId() > 0);
        }

        _payload() {
            return {
                Id: this.getId(),
                IdCliente: this._toInt(window.jQuery(this._id("cmbClienteContrato")).val()),
                IdEstablecimiento: this._toInt(window.jQuery(this._id("cmbEstablecimientoContrato")).val()),
                IdTipoContrato: this._toInt(window.jQuery(this._id("cmbTipoContrato")).val()) || null,
                FechaContrato: this._id("txtFechaContrato").value,
                FechaInicio: this._id("txtFechaInicioContrato").value,
                FechaVencimiento: this._id("txtFechaVencContrato").value
            };
        }

        async guardar() {
            if (this.isSoloLectura()) return;

            if (!(this._validacion?.validarTodos() ?? true)) {
                return;
            }

            const payload = this._payload();
            const esNuevo = payload.Id <= 0;
            const url = esNuevo ? this.options.endpoints.insertar : this.options.endpoints.actualizar;
            const method = esNuevo ? "POST" : "PUT";

            try {
                const r = await fetch(url, {
                    method,
                    headers: this._headers(),
                    body: JSON.stringify(payload)
                });

                const res = await r.json();
                if (!res.valor) {
                    this.mostrarErrorCampos(
                        res.mensaje || "No se pudo guardar.",
                        res.idReferencia ?? null,
                        res.tipo || "validacion"
                    );
                    return;
                }

                this.cerrarErrorCampos();

                if (esNuevo && res.id) {
                    this._id("txtIdContrato").value = res.id;
                    payload.Id = res.id;
                    this._modeloActual = { ...payload, Id: res.id };
                    this.habilitarSeccionRenovaciones(true);
                    this.habilitarSeccionDocumentos(true);
                    this._id("modalContratoLabel").textContent = `Editar contrato #${res.id}`;
                    this._id("btnEliminarContrato").hidden = false;
                    this._setTextoBotonPrincipal(false);
                }

                if (typeof exitoModal === "function") {
                    exitoModal(res.mensaje || (esNuevo
                        ? "Contrato registrado correctamente"
                        : "Contrato modificado correctamente"));
                }

                if (!esNuevo) {
                    this.bsModal.hide();
                } else {
                    await this._cargarRenovaciones();
                    await this._cargarDocumentosAdjuntos();
                }

                if (typeof this.options.onSaved === "function") {
                    await this.options.onSaved(res, payload, this);
                }
            } catch (e) {
                console.error(e);
                this.mostrarErrorCampos("Ha ocurrido un error inesperado al guardar.", null, "error");
            }
        }

        async eliminar(id) {
            if (!id) return;
            const ok = typeof confirmarModal === "function"
                ? await confirmarModal("¿Eliminar este contrato? No debe tener entregas asociadas.")
                : window.confirm("¿Eliminar este contrato?");
            if (!ok) return;

            try {
                const r = await fetch(this._replaceUrl(this.options.endpoints.eliminar, { id }), {
                    method: "DELETE",
                    headers: this._headers(false)
                });
                const res = await r.json();
                const okDel = !!(res?.valor ?? res?.Valor);
                const msgDel = res?.mensaje ?? res?.Mensaje ?? "No se pudo eliminar.";

                if (!okDel) {
                    if (typeof errorModal === "function") {
                        errorModal(msgDel);
                    } else {
                        this.mostrarErrorCampos(
                            msgDel,
                            res?.idReferencia ?? res?.IdReferencia ?? null,
                            res?.tipo ?? res?.Tipo ?? "error"
                        );
                    }
                    return;
                }

                if (typeof exitoModal === "function") {
                    exitoModal(res?.mensaje ?? res?.Mensaje ?? "Contrato eliminado correctamente");
                }
                this.bsModal.hide();
                if (typeof this.options.onDeleted === "function") {
                    await this.options.onDeleted(res, id, this);
                }
            } catch (e) {
                console.error(e);
                if (typeof errorModal === "function") errorModal("Ha ocurrido un error al eliminar.");
            }
        }

        _mostrarErrorValidacionPanel(mensaje) {
            this._validacion?.cancelarPanelExito?.();
            const panel = this._id("errorCamposContrato");
            if (!panel) return;

            if (typeof window.mostrarErrorPanelRp === "function") {
                window.mostrarErrorPanelRp(panel, mensaje);
            } else {
                panel.classList.remove("rp-panel-exito", "rp-panel-exito-enter", "rp-panel-exito-out");
                const msgEl = panel.querySelector(".rp-error-message");
                if (msgEl) msgEl.innerHTML = mensaje || "";
                panel.classList.remove("d-none");
            }

            panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        _cerrarPanelValidacion() {
            const panel = this._id("errorCamposContrato");
            if (!panel) return;

            if (typeof window.cerrarPanelRp === "function") {
                window.cerrarPanelRp(panel);
            } else {
                panel.classList.remove("rp-panel-exito", "rp-panel-exito-enter", "rp-panel-exito-out");
                panel.classList.add("d-none");
                const msgEl = panel.querySelector(".rp-error-message");
                if (msgEl) msgEl.innerHTML = "";
            }
        }

        mostrarErrorCampos(mensaje, idReferencia = null, tipo = "validacion") {
            if (tipo === "validacion") {
                this._mostrarErrorValidacionPanel(mensaje);
                return;
            }

            this._validacion?.cancelarPanelExito?.();
            const container = this._id("errorCamposContrato");
            if (container) {
                container.classList.remove("rp-panel-exito", "rp-panel-exito-enter", "rp-panel-exito-out");
            }

            if (window.RpVerFicha?.renderErrorCampos) {
                window.RpVerFicha.renderErrorCampos(container, mensaje, idReferencia, tipo, "verContrato");
                return;
            }

            if (!container) return;

            const { titulo, icono } = window.RpVerFicha?.tituloIcono
                ? window.RpVerFicha.tituloIcono(tipo)
                : { titulo: "No se pudo guardar", icono: "fa-exclamation-circle" };

            const titleEl = container.querySelector(".rp-error-title");
            const msgEl = container.querySelector(".rp-error-message");
            const iconEl = container.querySelector(".rp-error-icon i");

            if (titleEl) titleEl.textContent = titulo;
            if (msgEl) msgEl.innerHTML = mensaje || "";
            if (iconEl) iconEl.className = `fa ${icono}`;

            container.classList.remove("d-none");
            container.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        cerrarErrorCampos() {
            this._cerrarPanelValidacion();
        }

        /* --- Renovaciones --- */

        async _cargarRenovaciones() {
            const id = this.getId();
            if (id <= 0) {
                this.prepararRenovacionesNuevo();
                return;
            }

            try {
                const url = this._replaceUrl(this.options.endpoints.renovLista, { idContrato: id });
                const data = await this._fetchJson(url, { headers: this._headers(false) });
                this._renovaciones = (Array.isArray(data) ? data : [])
                    .map(r => this._normalizeRenovacion(r))
                    .filter(Boolean);
            } catch (e) {
                console.error(e);
                this._renovaciones = [];
                if (typeof errorModal === "function") {
                    errorModal("No se pudo cargar el historial de renovaciones.");
                }
            }

            this.limpiarFormRenovacion();
            this.renderListaRenovaciones();
            this.habilitarSeccionRenovaciones(true);
        }

        limpiarFormRenovacion() {
            this._renovSeleccionadaId = 0;
            this._id("txtRenovContratoId").value = "";
            this._id("cmbTipoRenovContrato").value = "RENOVACION";
            this._id("txtRenovInicioContrato").value = "";
            this._id("txtRenovVencContrato").value = "";
            const titulo = this._id("renovContratoFormTitulo");
            if (titulo) titulo.textContent = "Nueva renovación";
            this._setTextoBotonRenovacion(true);
            this._id("listaRenovContrato")?.querySelectorAll(".rp-sub-item")
                .forEach(el => el.classList.remove("active"));
        }

        renderListaRenovaciones() {
            const cont = this._id("listaRenovContrato");
            const cant = this._id("renovContratoCantidad");
            if (!cont) return;

            const items = this._renovaciones || [];
            if (cant) cant.textContent = String(items.length);

            const idContrato = this.getId();
            if (!items.length) {
                cont.innerHTML = `
                    <div class="rp-sub-empty">
                        <i class="fa fa-refresh"></i>
                        <p>${idContrato > 0
                            ? "No hay renovaciones. Agregá una desde el formulario."
                            : "Guardá el contrato para ver renovaciones."}</p>
                    </div>`;
                return;
            }

            const fmt = typeof formatearFechaParaVista === "function" ? formatearFechaParaVista : x => x;
            cont.innerHTML = items.map(r => {
                const active = r.Id === this._renovSeleccionadaId ? " active" : "";
                const meta = `${fmt(r.FechaInicio)} → ${fmt(r.FechaVencimiento)}`;
                const avCls = this._avatarClassRenov(r.Tipo);
                return `
                    <div class="rp-sub-item${active}" data-id="${r.Id}">
                        <div class="rp-sub-item-avatar ${avCls}"><i class="fa fa-refresh"></i></div>
                        <div class="rp-sub-item-body">
                            <span class="rp-sub-item-title">${this._escapeHtml(r.Tipo || "")}</span>
                            <div class="rp-sub-item-meta">${this._escapeHtml(meta)}</div>
                        </div>
                        <div class="rp-sub-item-actions">
                            ${this.isSoloLectura() ? "" : `
                            <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-renov" data-id="${r.Id}" title="Eliminar">
                                <i class="fa fa-trash"></i>
                            </button>`}
                        </div>
                    </div>`;
            }).join("");
        }

        _seleccionarRenovacion(id) {
            const r = this._renovaciones.find(x => x.Id === id);
            if (!r) return;

            this._renovSeleccionadaId = id;
            this._id("txtRenovContratoId").value = r.Id;
            this._id("cmbTipoRenovContrato").value = r.Tipo || "RENOVACION";
            this._id("txtRenovInicioContrato").value = this._fechaInput(r.FechaInicio);
            this._id("txtRenovVencContrato").value = this._fechaInput(r.FechaVencimiento);
            this._id("renovContratoFormTitulo").textContent = `Editar renovación #${r.Id}`;
            this._setTextoBotonRenovacion(false);
            this.renderListaRenovaciones();
        }

        nuevaRenovacion() {
            if (this.getId() <= 0 || this.isSoloLectura()) return;
            this.limpiarFormRenovacion();
            const hoy = new Date().toISOString().slice(0, 10);
            this._id("txtRenovInicioContrato").value = hoy;
            this._id("txtRenovVencContrato").value = this._id("txtFechaVencContrato").value || hoy;
            this.renderListaRenovaciones();
        }

        async guardarRenovacion() {
            if (this.getId() <= 0 || this.isSoloLectura()) return;

            const idRenov = this._toInt(this._id("txtRenovContratoId").value);
            const payload = {
                Id: idRenov,
                IdContrato: this.getId(),
                Tipo: this._id("cmbTipoRenovContrato").value,
                FechaInicio: this._fechaPayload(this._id("txtRenovInicioContrato").value),
                FechaVencimiento: this._fechaPayload(this._id("txtRenovVencContrato").value)
            };

            if (!payload.Tipo || !payload.FechaInicio || !payload.FechaVencimiento) {
                if (typeof errorModal === "function") {
                    errorModal("Complete tipo, fecha inicio y vencimiento.");
                }
                return;
            }

            const url = idRenov > 0
                ? this.options.endpoints.renovActualizar
                : this.options.endpoints.renovInsertar;
            const method = idRenov > 0 ? "PUT" : "POST";

            try {
                const r = await fetch(url, {
                    method,
                    headers: this._headers(),
                    body: JSON.stringify(payload)
                });

                let res = {};
                try {
                    res = await r.json();
                } catch {
                    res = {};
                }

                if (!r.ok || !res.valor) {
                    if (typeof errorModal === "function") {
                        errorModal(res.mensaje || `No se pudo guardar la renovación (${r.status}).`);
                    }
                    return;
                }

                if (typeof exitoModal === "function") {
                    exitoModal(res.mensaje || "Renovación guardada correctamente");
                }

                await this._cargarRenovaciones();
                this._activarTabRenovaciones();

                try {
                    const d = await this._fetchJson(this._replaceUrl(this.options.endpoints.editar, { id: this.getId() }), {
                        headers: this._headers(false)
                    });
                    this._modeloActual = d;
                    this._id("txtFechaVencContrato").value = this._fechaInput(d.FechaVencimiento);
                } catch (e) {
                    console.warn("No se pudo refrescar el contrato tras la renovación.", e);
                }

                const nuevoId = this._toInt(res.id ?? res.Id);
                if (idRenov === 0 && nuevoId > 0) {
                    this._seleccionarRenovacion(nuevoId);
                } else {
                    this.nuevaRenovacion();
                }
            } catch (e) {
                console.error(e);
                if (typeof errorModal === "function") {
                    errorModal("Ha ocurrido un error al guardar la renovación.");
                }
            }
        }

        async eliminarRenovacion(id) {
            if (!id || this.isSoloLectura()) return;
            const ok = typeof confirmarModal === "function"
                ? await confirmarModal("¿Eliminar esta renovación?")
                : window.confirm("¿Eliminar esta renovación?");
            if (!ok) return;

            try {
                const r = await fetch(this._replaceUrl(this.options.endpoints.renovEliminar, { id }), {
                    method: "DELETE",
                    headers: this._headers(false)
                });
                const res = await r.json();
                if (!res.valor) {
                    if (typeof errorModal === "function") {
                        errorModal(res.mensaje || "No se pudo eliminar.");
                    }
                    return;
                }

                if (typeof exitoModal === "function") exitoModal(res.mensaje || "Renovación eliminada correctamente");
                await this._cargarRenovaciones();
                this.nuevaRenovacion();
            } catch (e) {
                console.error(e);
                if (typeof errorModal === "function") errorModal("Ha ocurrido un error al eliminar.");
            }
        }
    }

    window.ContratoModal = ContratoModal;

    function initContratoModal(options = {}) {
        const root = document.querySelector("[data-contrato-modal]");
        if (!root) {
            console.warn("initContratoModal: incluya el partial M_Contratos en la vista.");
            return null;
        }

        const merged = Object.assign({ token: window.token || "" }, options || {});

        if (!window.contratoModal || window.contratoModal.modalEl !== root) {
            window.contratoModal = new ContratoModal(root, merged);
        } else {
            Object.assign(window.contratoModal.options, merged);
        }

        const abrirVer = (id) => window.contratoModal?.abrirVer?.(id);

        window.nuevoContrato = (idCliente, idEstablecimiento) =>
            window.contratoModal?.abrirNuevo?.(idCliente, idEstablecimiento);
        window.verContrato = abrirVer;
        window.editarContrato = (id) => window.contratoModal?.abrirEditar?.(id);
        window.eliminarContrato = (id) => window.contratoModal?.eliminar?.(id);

        if (window.RpVerFicha?.registrar) {
            window.RpVerFicha.registrar("verContrato", abrirVer);
        }

        return window.contratoModal;
    }

    window.initContratoModal = initContratoModal;

    window.guardarRenovacionContrato = function () {
        return window.contratoModal?.guardarRenovacion?.();
    };
    window.nuevaRenovacionContrato = function () {
        return window.contratoModal?.nuevaRenovacion?.();
    };

    window.cerrarErrorCamposContrato = function () {
        return window.contratoModal?.cerrarErrorCampos?.();
    };

})(window);
