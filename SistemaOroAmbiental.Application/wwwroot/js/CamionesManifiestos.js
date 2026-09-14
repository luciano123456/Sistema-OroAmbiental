(function (window) {
    "use strict";

    function tokenCmf() {
        return window.token || localStorage.getItem("JwtToken") || "";
    }

    function headersCmf(json) {
        const h = { Authorization: "Bearer " + tokenCmf() };
        if (json) h["Content-Type"] = "application/json;charset=utf-8";
        return h;
    }

    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function fmtNumsManifiesto(nums) {
        if (!nums || !nums.length) return "—";
        if (nums.length === 1) return nums[0];
        return `${nums[0]} – ${nums[nums.length - 1]}`;
    }

    function fmtFecha(fecha) {
        try {
            const d = new Date(fecha);
            if (Number.isNaN(d.getTime())) return "—";
            return d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
        } catch {
            return "—";
        }
    }

    function fmtFechaCorta(fecha) {
        try {
            const d = new Date(fecha);
            if (Number.isNaN(d.getTime())) return "—";
            return d.toLocaleDateString("es-AR");
        } catch {
            return "—";
        }
    }

    function hoyIso() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    class CamionesManifiestosPanel {
        constructor(modalEl) {
            this.modalEl = modalEl;
            this._idCamion = 0;
            this._nombreCamion = "";
            this._soloLectura = false;
            this._rutas = [];
            this._clientes = [];
            this._historial = [];
            this._ruta = null;
            this._seleccion = new Set();
            this._copias = new Map();
            this._copiasTodas = "";
            this._bound = false;
            this._bind();
        }

        _el(id) {
            return this.modalEl.querySelector(`#${id}`);
        }

        _bind() {
            if (this._bound) return;
            this._bound = true;

            this._el("cmfBtnTodos")?.addEventListener("click", () => this._toggleTodos());
            this._el("cmfNumero")?.addEventListener("input", () => this._actualizarNumerosPreview());
            this._el("cmfBtnGenerar")?.addEventListener("click", busyHandler(() => this._generar("manifiesto"), { label: "Generando..." }));
            this._el("cmfBtnTxt")?.addEventListener("click", busyHandler(() => this._generar("txt"), { label: "Generando..." }));
            this._el("cmfBuscar")?.addEventListener("input", typeof rpDebounce === "function"
                ? rpDebounce(() => this._pintarHistorial(), 300)
                : () => this._pintarHistorial());
            this._el("cmfGenerarCertificados")?.addEventListener("change", () => this._toggleCertPanel());
            this._el("cmfBtnConfirmarCertificado")?.addEventListener("click", busyHandler(() => this._confirmarCertificadoHistorial(), { label: "Generando..." }));

            this._el("tabBtnManifiestosCamion")?.addEventListener("shown.bs.tab", () => {
                if (this._idCamion > 0) this.cargar();
            });
        }

        reset() {
            this._idCamion = 0;
            this._nombreCamion = "";
            this._soloLectura = false;
            this._rutas = [];
            this._clientes = [];
            this._historial = [];
            this._ruta = null;
            this._seleccion = new Set();
            this._copias = new Map();
            this._copiasTodas = "";
            this._setTabEnabled(false, 0);
            this._el("cmfLock")?.classList.remove("d-none");
            this._el("cmfPanel")?.classList.add("d-none");
            this._el("cmfNombre") && (this._el("cmfNombre").value = "");
            this._el("cmfNumero") && (this._el("cmfNumero").value = "");
            this._el("cmfFecha") && (this._el("cmfFecha").value = hoyIso());
            if (this._el("cmfBuscar")) this._el("cmfBuscar").value = "";
            if (this._el("cmfHeroNombre")) this._el("cmfHeroNombre").textContent = "Unidad";
            if (this._el("cmfKpiTotal")) this._el("cmfKpiTotal").textContent = "0";
            if (this._el("cmfKpiUltimo")) this._el("cmfKpiUltimo").textContent = "—";
            if (this._el("cmfKpiFecha")) this._el("cmfKpiFecha").textContent = "—";
            if (this._el("cmfRutas")) this._el("cmfRutas").innerHTML = "";
            if (this._el("cmfClientes")) this._el("cmfClientes").innerHTML = `<div class="cmf-empty-mini">Elegí un recorrido para ver los clientes.</div>`;
            if (this._el("cmfBtnTodos")) this._el("cmfBtnTodos").hidden = true;
            this._mostrarComposer(false);
            this._pintarHistorial();
            this._activarTabDatos();
        }

        async sync(idCamion, nombre, soloLectura) {
            this._idCamion = Number(idCamion) || 0;
            this._nombreCamion = nombre || "Unidad";
            this._soloLectura = !!soloLectura;
            this._el("cmfHeroNombre").textContent = this._nombreCamion;

            const hayId = this._idCamion > 0;
            this._setTabEnabled(hayId, 0);
            this._el("cmfLock")?.classList.toggle("d-none", hayId);
            this._el("cmfPanel")?.classList.toggle("d-none", !hayId);
            this._el("cmfAcciones")?.classList.toggle("cmf-actions--readonly", this._soloLectura);

            if (!hayId) return;

            const idOpds = leerIdTransportistaOpdsCmf();
            const inpOpds = this._el("cmfIdTransportistaOpds");
            if (inpOpds && idOpds && !inpOpds.value) inpOpds.value = idOpds;

            await this.cargar();
        }

        _setTabEnabled(enabled, count) {
            const btn = this._el("tabBtnManifiestosCamion");
            if (btn) btn.disabled = !enabled;
            const badge = this._el("cmfTabCount");
            if (!badge) return;
            const n = Number(count) || 0;
            badge.textContent = String(n);
            badge.hidden = n <= 0;
        }

        _activarTabDatos() {
            const btn = this._el("tabBtnDatosCamion");
            if (btn && window.bootstrap?.Tab) {
                window.bootstrap.Tab.getOrCreateInstance(btn).show();
            }
        }

        irAManifiestos() {
            const btn = this._el("tabBtnManifiestosCamion");
            if (btn && !btn.disabled && window.bootstrap?.Tab) {
                window.bootstrap.Tab.getOrCreateInstance(btn).show();
            }
        }

        async cargar() {
            if (this._idCamion <= 0) return;

            try {
                const [panel, rutas] = await Promise.all([
                    this._getJson(`/Recorridos/ManifiestosPorCamion?idCamion=${this._idCamion}`),
                    this._getJson(`/Recorridos/RutasManifiestoCamion?idCamion=${this._idCamion}`)
                ]);

                this._historial = Array.isArray(panel?.items || panel?.Items)
                    ? (panel.items || panel.Items)
                    : [];
                this._rutas = Array.isArray(rutas) ? rutas : [];

                const total = panel?.total ?? panel?.Total ?? this._historial.length;
                const ultimo = panel?.ultimoNumero ?? panel?.UltimoNumero ?? 0;
                const siguiente = panel?.siguienteNumero ?? panel?.SiguienteNumero ?? 1;
                const ultima = panel?.ultimaFecha ?? panel?.UltimaFecha;

                this._el("cmfKpiTotal").textContent = String(total);
                this._el("cmfKpiUltimo").textContent = ultimo > 0 ? String(ultimo) : "—";
                this._el("cmfKpiFecha").textContent = ultima ? fmtFechaCorta(ultima) : "—";
                this._setTabEnabled(true, total);

                if (!this._el("cmfNumero").value) {
                    this._el("cmfNumero").value = String(siguiente || 1);
                }
                if (this._el("cmfFecha") && !this._el("cmfFecha").value) {
                    this._el("cmfFecha").value = hoyIso();
                }
                await this._cargarNumerosCertificado();

                this._pintarRutas();
                this._pintarHistorial();
            } catch (e) {
                console.error(e);
            }
        }

        _mostrarComposer(hayRutas) {
            const empty = this._el("cmfComposerEmpty");
            const form = this._el("cmfComposerForm");
            const sub = this._el("cmfComposerSub");
            empty?.classList.toggle("is-visible", !hayRutas);
            form?.classList.toggle("is-hidden", !hayRutas);
            if (sub) {
                sub.textContent = hayRutas
                    ? "Elegí recorrido, clientes y número"
                    : "Hace falta un recorrido con clientes";
            }
            const generar = this._el("cmfBtnGenerar");
            const txt = this._el("cmfBtnTxt");
            if (generar) generar.disabled = !hayRutas || this._soloLectura;
            if (txt) txt.disabled = !hayRutas || this._soloLectura;
        }

        _pintarRutas() {
            const wrap = this._el("cmfRutas");
            if (!wrap) return;

            if (!this._rutas.length) {
                this._ruta = null;
                this._clientes = [];
                this._seleccion = new Set();
                wrap.innerHTML = "";
                this._mostrarComposer(false);
                return;
            }

            this._mostrarComposer(true);

            wrap.innerHTML = this._rutas.map((r, i) => {
                const idSemana = r.idSemana ?? r.IdSemana;
                const idDia = r.idDia ?? r.IdDia;
                const label = r.label || r.Label || `${r.semana || r.Semana || ""} ${r.dia || r.Dia || ""}`.trim();
                const cant = r.cantidadClientes ?? r.CantidadClientes ?? 0;
                const active = this._ruta
                    && this._ruta.idSemana === idSemana
                    && this._ruta.idDia === idDia;
                return `
                    <button type="button"
                            class="cmf-chip${active ? " is-active" : ""}"
                            data-ruta="${i}">
                        <span>${esc(label)}</span>
                        <em>${cant}</em>
                    </button>`;
            }).join("");

            wrap.querySelectorAll("[data-ruta]").forEach(btn => {
                btn.addEventListener("click", () => this._elegirRuta(Number(btn.getAttribute("data-ruta"))));
            });
        }

        async _elegirRuta(index) {
            const raw = this._rutas[index];
            if (!raw) return;

            this._ruta = {
                idSemana: raw.idSemana ?? raw.IdSemana,
                idDia: raw.idDia ?? raw.IdDia,
                zona: (raw.zona || raw.Zona || "").trim(),
                semana: raw.semana || raw.Semana || "",
                dia: raw.dia || raw.Dia || "",
                label: raw.label || raw.Label || ""
            };

            const nombre = this._ruta.zona
                || `${this._ruta.semana} ${this._ruta.dia}`.trim()
                || this._nombreCamion;
            this._el("cmfNombre").value = nombre;
            this._pintarRutas();

            try {
                const numeroData = await this._getJson(
                    `/Recorridos/SiguienteNumeroManifiesto?idCamion=${this._idCamion}&idSemana=${this._ruta.idSemana}&idDia=${this._ruta.idDia}`
                );
                this._el("cmfNumero").value = String(Number(numeroData?.numero) || 1);
            } catch {
                this._el("cmfNumero").value = "1";
            }

            try {
                this._clientes = await this._getJson(
                    `/Recorridos/ClientesPorRecorrido?idCamion=${this._idCamion}&idSemana=${this._ruta.idSemana}&idDia=${this._ruta.idDia}`
                ) || [];
            } catch {
                this._clientes = [];
            }

            this._seleccion = new Set(this._clientes.map(c => Number(c.id ?? c.Id)).filter(n => n > 0));
            this._clientes.forEach(c => {
                const id = Number(c.id ?? c.Id);
                if (id > 0 && !this._copias.has(id)) this._copias.set(id, 1);
            });
            this._pintarClientes();
        }

        _pintarClientes() {
            const wrap = this._el("cmfClientes");
            const btnTodos = this._el("cmfBtnTodos");
            if (!wrap) return;

            if (!this._ruta) {
                wrap.innerHTML = `<div class="cmf-empty-mini">Elegí un recorrido para ver los clientes.</div>`;
                if (btnTodos) btnTodos.hidden = true;
                return;
            }

            if (!this._clientes.length) {
                wrap.innerHTML = `<div class="cmf-empty-mini">Este recorrido no tiene clientes.</div>`;
                if (btnTodos) btnTodos.hidden = true;
                return;
            }

            if (btnTodos) {
                btnTodos.hidden = false;
                btnTodos.textContent = this._seleccion.size === this._clientes.length
                    ? "Quitar todos"
                    : "Seleccionar todos";
            }

            wrap.innerHTML = `
                <table class="cmf-lote-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>Nombre</th>
                            <th>Copias
                                <input type="number" class="cmf-copias cmf-copias-todas" data-copias-todas="1" min="0" max="50" step="1"
                                       placeholder="Todas" title="Aplicar a todos" value="${esc(this._copiasTodas ?? "")}" />
                            </th>
                            <th>Nº manif. cliente</th>
                            <th>Manifiesto Nº</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this._filasPreviewClientes()}
                    </tbody>
                </table>`;

            wrap.querySelectorAll("[data-cli]").forEach(chk => {
                chk.addEventListener("change", () => {
                    const id = Number(chk.getAttribute("data-cli"));
                    if (chk.checked) {
                        this._seleccion.add(id);
                        if (!this._copias.has(id)) this._copias.set(id, 1);
                    } else {
                        this._seleccion.delete(id);
                    }
                    this._pintarClientes();
                });
            });
            wrap.querySelectorAll("[data-copias]").forEach(inp => {
                inp.addEventListener("input", () => {
                    const id = Number(inp.getAttribute("data-copias"));
                    let n = parseInt(inp.value, 10);
                    if (!Number.isFinite(n) || n < 0) n = 0;
                    if (n > 50) n = 50;
                    this._copias.set(id, n);
                    this._actualizarNumerosPreview();
                });
            });
            wrap.querySelector("[data-copias-todas]")?.addEventListener("input", e => {
                const raw = String(e.target.value ?? "").trim();
                this._copiasTodas = raw;
                if (raw === "") return;
                let n = parseInt(raw, 10);
                if (!Number.isFinite(n) || n < 0) return;
                if (n > 50) n = 50;
                this._clientes.forEach(c => {
                    const id = Number(c.id ?? c.Id);
                    if (id <= 0) return;
                    this._copias.set(id, n);
                    if (n > 0) this._seleccion.add(id);
                });
                wrap.querySelectorAll("[data-copias]").forEach(inp => {
                    inp.disabled = n <= 0;
                    inp.value = String(n);
                });
                wrap.querySelectorAll("[data-cli]").forEach(chk => {
                    chk.checked = n > 0;
                });
                this._actualizarNumerosPreview();
            });
        }

        _filasPreviewClientes() {
            let numero = parseInt(this._el("cmfNumero")?.value, 10);
            if (!Number.isFinite(numero) || numero < 1) numero = 1;

            return this._clientes.map(c => {
                const id = Number(c.id ?? c.Id);
                const nombre = c.cliente || c.Cliente || "";
                const nroCli = (c.codigoOpds || c.CodigoOpds || "").trim() || "—";
                const checked = this._seleccion.has(id);
                const copias = checked ? (this._copias.get(id) ?? 1) : 0;
                const n = Math.max(0, Math.min(50, Number(copias) || 0));
                const nums = [];
                if (checked && n > 0) {
                    nums.push(String(numero));
                    numero++;
                }
                return `
                    <tr class="${checked ? "" : "is-off"}">
                        <td><input type="checkbox" data-cli="${id}" ${checked ? "checked" : ""} /></td>
                        <td><strong>${esc(nombre)}</strong></td>
                        <td><input type="number" class="cmf-copias" data-copias="${id}" min="0" max="50" step="1" value="${checked ? n : 0}" ${checked ? "" : "disabled"} /></td>
                        <td>${esc(nroCli)}</td>
                        <td class="cmf-num">${!nums.length ? "—" : (n <= 1 ? nums[0] : `${nums[0]} ×${n}`)}</td>
                    </tr>`;
            }).join("");
        }

        _actualizarNumerosPreview() {
            const wrap = this._el("cmfClientes");
            if (!wrap || !wrap.querySelector(".cmf-lote-table")) return;
            let numero = parseInt(this._el("cmfNumero")?.value, 10);
            if (!Number.isFinite(numero) || numero < 1) numero = 1;

            wrap.querySelectorAll("tbody tr").forEach(tr => {
                const inp = tr.querySelector("[data-copias]");
                const td = tr.querySelector(".cmf-num");
                if (!inp || !td) return;
                const id = Number(inp.getAttribute("data-copias"));
                const checked = this._seleccion.has(id);
                const n = checked ? Math.max(0, Math.min(50, Number(this._copias.get(id) ?? 1) || 0)) : 0;
                const nums = [];
                if (checked && n > 0) {
                    nums.push(String(numero));
                    numero++;
                }
                td.textContent = !nums.length
                    ? "—"
                    : (n <= 1 ? nums[0] : `${nums[0]} ×${n}`);
                tr.classList.toggle("is-off", !checked);
            });
        }

        _toggleTodos() {
            if (!this._clientes.length) return;
            if (this._seleccion.size === this._clientes.length) this._seleccion.clear();
            else this._seleccion = new Set(this._clientes.map(c => Number(c.id ?? c.Id)).filter(n => n > 0));
            this._pintarClientes();
        }

        _toggleCertPanel() {
            const on = !!this._el("cmfGenerarCertificados")?.checked;
            this._el("cmfCertificadosPanel")?.classList.toggle("d-none", !on);
            if (on) this._cargarNumerosCertificado();
        }

        async _cargarNumerosCertificado() {
            const iso = hoyIso();
            if (this._el("cmfFechaEmision")) this._el("cmfFechaEmision").value = this._el("cmfFechaEmision").value || iso;
            if (this._el("cmfFechaTratamiento")) this._el("cmfFechaTratamiento").value = this._el("cmfFechaTratamiento").value || iso;
            const chk = this._el("cmfGenerarCertificados");
            if (chk && !chk.dataset.initChecked) {
                chk.checked = true;
                chk.dataset.initChecked = "1";
                this._toggleCertPanel();
            }
            try {
                const data = await this._getJson("/Recorridos/SiguienteNumeroCertificado");
                if (this._el("cmfNumeroCertificado") && !this._el("cmfNumeroCertificado").value) {
                    this._el("cmfNumeroCertificado").value = String(Number(data?.numeroCertificado ?? data?.NumeroCertificado) || 1);
                }
                if (this._el("cmfNumeroOrden") && !this._el("cmfNumeroOrden").value) {
                    this._el("cmfNumeroOrden").value = String(Number(data?.numeroOrden ?? data?.NumeroOrden) || 1);
                }
            } catch (e) {
                console.warn(e);
            }
        }

        _pintarHistorial() {
            const wrap = this._el("cmfLista");
            if (!wrap) return;

            const q = (this._el("cmfBuscar")?.value || "").trim().toLowerCase();
            const items = this._historial.filter(x => {
                if (!q) return true;
                const blob = [
                    x.numero ?? x.Numero,
                    x.nombre ?? x.Nombre,
                    x.razonSocial ?? x.RazonSocial,
                    x.recorrido ?? x.Recorrido,
                    x.localidad ?? x.Localidad,
                    x.cuit ?? x.Cuit
                ].join(" ").toLowerCase();
                return blob.includes(q);
            });

            if (!items.length) {
                wrap.innerHTML = `
                    <div class="cmf-empty">
                        <i class="fa fa-file-o"></i>
                        <p>${this._historial.length ? "No hay resultados para esa búsqueda." : "Todavía no hay manifiestos en esta unidad."}</p>
                    </div>`;
                return;
            }

            wrap.innerHTML = items.map(x => {
                const id = x.id ?? x.Id;
                const numero = x.numero ?? x.Numero;
                const cliente = x.razonSocial || x.RazonSocial || x.nombre || x.Nombre || "Manifiesto";
                const recorrido = x.recorrido || x.Recorrido || "";
                const fecha = fmtFecha(x.fechaGeneracion ?? x.FechaGeneracion);
                const usuario = x.usuario || x.Usuario || "";
                const cuit = x.cuit || x.Cuit || "";
                return `
                    <article class="cmf-item">
                        <div class="cmf-item-num">Nº ${esc(numero)}</div>
                        <div class="cmf-item-body">
                            <div class="cmf-item-title">${esc(cliente)}</div>
                            <div class="cmf-item-meta">
                                ${recorrido ? `<span>${esc(recorrido)}</span>` : ""}
                                ${cuit ? `<span>${esc(cuit)}</span>` : ""}
                                <span>${esc(fecha)}</span>
                                ${usuario ? `<span>${esc(usuario)}</span>` : ""}
                            </div>
                        </div>
                        <div class="cmf-item-actions">
                            <button type="button" class="cmf-icon" data-ver="${id}" title="Ver / imprimir">
                                <i class="fa fa-print"></i>
                            </button>
                            ${this._soloLectura ? "" : `
                            <button type="button" class="cmf-icon" data-cert="${id}" title="Generar certificado">
                                <i class="fa fa-certificate"></i>
                            </button>
                            <button type="button" class="cmf-icon cmf-icon--danger" data-del="${id}" title="Quitar del historial">
                                <i class="fa fa-trash"></i>
                            </button>`}
                        </div>
                    </article>`;
            }).join("");

            wrap.querySelectorAll("[data-ver]").forEach(btn => {
                btn.addEventListener("click", busyHandler(
                    () => this._verHistorial(Number(btn.getAttribute("data-ver"))),
                    { loadingHtml: false }
                ));
            });
            wrap.querySelectorAll("[data-cert]").forEach(btn => {
                btn.addEventListener("click", () => this._abrirModalCertificado(Number(btn.getAttribute("data-cert"))));
            });
            wrap.querySelectorAll("[data-del]").forEach(btn => {
                btn.addEventListener("click", () => this._eliminar(Number(btn.getAttribute("data-del"))));
            });
        }

        _paramsGenerar() {
            if (!this._ruta) {
                if (typeof errorModal === "function") errorModal("Elegí un recorrido.");
                return null;
            }

            const numero = parseInt(this._el("cmfNumero")?.value, 10);
            if (!Number.isFinite(numero) || numero < 1) {
                if (typeof errorModal === "function") errorModal("Ingresá un número de manifiesto válido.");
                return null;
            }

            if (!this._seleccion.size) {
                if (typeof errorModal === "function") errorModal("Seleccioná al menos un cliente.");
                return null;
            }

            const params = new URLSearchParams();
            params.set("idCamion", String(this._idCamion));
            params.set("idSemana", String(this._ruta.idSemana));
            params.set("idDia", String(this._ruta.idDia));
            params.set("numeroInicial", String(numero));

            const nombre = (this._el("cmfNombre")?.value || "").trim();
            if (nombre) params.set("nombre", nombre);
            const fecha = (this._el("cmfFecha")?.value || "").trim() || hoyIso();
            params.set("fecha", fecha);

            const todos = this._clientes.map(c => Number(c.id ?? c.Id)).filter(n => n > 0);
            const copiasPartes = [];
            let impresos = 0;
            [...this._seleccion].forEach(id => {
                const n = this._copias.get(id) ?? 1;
                copiasPartes.push(`${id}:${n}`);
                if (n > 0) impresos += n;
            });
            if (impresos <= 0) {
                if (typeof errorModal === "function") errorModal("Poné al menos 1 copia en algún cliente.");
                return null;
            }
            if (copiasPartes.length) params.set("copias", copiasPartes.join(","));

            if (this._seleccion.size === 1) {
                params.set("idRecorrido", String([...this._seleccion][0]));
            } else if (this._seleccion.size < todos.length) {
                const excluir = todos.filter(id => !this._seleccion.has(id));
                if (excluir.length) params.set("excluirIds", excluir.join(","));
            }

            if (this._el("cmfGenerarCertificados")?.checked) {
                params.set("generarCertificados", "true");
                const fe = (this._el("cmfFechaEmision")?.value || "").trim();
                const ft = (this._el("cmfFechaTratamiento")?.value || "").trim();
                const nc = parseInt(this._el("cmfNumeroCertificado")?.value, 10);
                const no = parseInt(this._el("cmfNumeroOrden")?.value, 10);
                if (fe) params.set("fechaEmision", fe);
                if (ft) params.set("fechaTratamiento", ft);
                if (Number.isFinite(nc) && nc > 0) params.set("numeroCertificadoInicial", String(nc));
                if (Number.isFinite(no) && no > 0) params.set("numeroOrdenInicial", String(no));
            }

            return params;
        }

        async _generar(modo) {
            if (this._soloLectura) return;
            if (!this._rutas.length) {
                if (typeof errorModal === "function") {
                    errorModal("Esta unidad no tiene recorridos asignados. Armalos en Recorridos para poder generar manifiestos.");
                }
                return;
            }
            const params = this._paramsGenerar();
            if (!params) return;

            if (modo === "txt") {
                await this._descargarTxt(params);
                return;
            }

            const conCert = !!this._el("cmfGenerarCertificados")?.checked;
            const impresos = [...this._seleccion].reduce((s, id) => s + Math.max(0, this._copias.get(id) ?? 1), 0);
            const esLote = impresos > 1;
            const quiereLote = esLote && !!this._el("cmfGenerarLoteOpds")?.checked;
            params.set("formato", "manifiesto");

            const responseMf = await this._fetchArchivo(
                `/Recorridos/Manifiestos?${params.toString()}`,
                "No hay clientes para armar el manifiesto en esta hoja.",
                conCert ? "Generando manifiestos y certificados..." : "Generando manifiestos..."
            );
            if (!responseMf) return;

            if (conCert) {
                const certParams = new URLSearchParams(params.toString());
                certParams.set("formato", "certificados");
                certParams.set("generarCertificados", "true");
                const responseCert = await this._fetchArchivo(
                    `/Recorridos/Manifiestos?${certParams.toString()}`,
                    "No se pudo generar el certificado.",
                    "Descargando certificado..."
                );
                if (responseCert) {
                    await this._guardarBlobRespuesta(responseCert, "Certificado.pdf", true);
                    await new Promise(r => setTimeout(r, 400));
                } else {
                    await this._guardarBlobRespuesta(responseMf, "Manifiesto.pdf");
                    return;
                }
            }

            await this._guardarBlobRespuesta(responseMf, "Manifiesto.pdf");
            if (!quiereLote && typeof exitoModal === "function") {
                exitoModal(conCert ? "Se descargaron el manifiesto y el certificado." : "Se descargó el manifiesto en PDF.");
            }

            if (quiereLote) {
                const loteOk = await this._descargarLoteOpds(params);
                if (this._loteWarning && typeof advertenciaModal === "function") {
                    advertenciaModal(this._loteWarning);
                } else if (loteOk && typeof exitoModal === "function") {
                    exitoModal(conCert
                        ? "Se descargaron el PDF, el certificado y el archivo de lote OPDS."
                        : "Se descargaron el PDF de impresión y el archivo de lote OPDS.");
                } else if (!loteOk && typeof advertenciaModal === "function") {
                    advertenciaModal("El manifiesto se descargó, pero no se pudo armar el lote OPDS.");
                }
            }

            await this.cargar();
        }

        async _abrirModalCertificado(idManifiesto) {
            if (!idManifiesto) return;
            const modalEl = document.getElementById("modalCertificadoCamion");
            if (!modalEl) return;
            document.getElementById("cmfCertIdManifiesto").value = String(idManifiesto);
            const iso = hoyIso();
            document.getElementById("cmfCertFechaEmision").value = iso;
            document.getElementById("cmfCertFechaTrat").value = iso;
            try {
                const data = await this._getJson("/Recorridos/SiguienteNumeroCertificado");
                document.getElementById("cmfCertNumero").value = String(Number(data?.numeroCertificado ?? data?.NumeroCertificado) || 1);
                document.getElementById("cmfCertOrden").value = String(Number(data?.numeroOrden ?? data?.NumeroOrden) || 1);
            } catch (e) {
                console.warn(e);
            }
            if (window.bootstrap?.Modal) {
                window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
            }
        }

        async _confirmarCertificadoHistorial() {
            const idManifiesto = parseInt(document.getElementById("cmfCertIdManifiesto")?.value, 10) || 0;
            if (!idManifiesto || this._idCamion <= 0) return;

            const params = new URLSearchParams();
            params.set("idCamion", String(this._idCamion));
            params.set("idManifiesto", String(idManifiesto));
            const fe = (document.getElementById("cmfCertFechaEmision")?.value || "").trim();
            const ft = (document.getElementById("cmfCertFechaTrat")?.value || "").trim();
            const nc = parseInt(document.getElementById("cmfCertNumero")?.value, 10);
            const no = parseInt(document.getElementById("cmfCertOrden")?.value, 10);
            if (fe) params.set("fechaEmision", fe);
            if (ft) params.set("fechaTratamiento", ft);
            if (Number.isFinite(nc) && nc > 0) params.set("numeroCertificado", String(nc));
            if (Number.isFinite(no) && no > 0) params.set("numeroOrden", String(no));

            await this._descargarPdf(
                `/Recorridos/CertificadoHistorial?${params.toString()}`,
                "No se pudo generar el certificado.",
                "Se descargó el certificado en PDF.",
                "Generando certificado...",
                "Certificado.pdf",
                true
            );

            const modalEl = document.getElementById("modalCertificadoCamion");
            if (modalEl && window.bootstrap?.Modal) {
                window.bootstrap.Modal.getInstance(modalEl)?.hide();
            }
        }

        async _verHistorial(id) {
            if (!id) return;
            await this._descargarPdf(
                `/Recorridos/ManifiestoHistorial?idCamion=${this._idCamion}&ids=${id}`,
                "No se encontró el manifiesto.",
                "Se descargó el manifiesto en PDF.",
                "Descargando manifiesto..."
            );
        }

        async _eliminar(id) {
            if (!id || this._soloLectura) return;
            const ok = typeof confirmarModal === "function"
                ? await confirmarModal("¿Quitar este manifiesto del historial de la unidad?")
                : window.confirm("¿Quitar este manifiesto del historial de la unidad?");
            if (!ok) return;

            try {
                const data = await this._getJson(
                    `/Recorridos/EliminarManifiestoHistorial?idCamion=${this._idCamion}&id=${id}`,
                    { method: "DELETE" }
                );
                if (!data?.valor) {
                    if (typeof errorModal === "function") errorModal(data?.mensaje || "No se pudo eliminar.");
                    return;
                }
                if (typeof exitoModal === "function") exitoModal(data.mensaje || "Manifiesto eliminado del historial.");
                await this.cargar();
            } catch (e) {
                console.error(e);
                if (typeof errorModal === "function") errorModal("No se pudo eliminar el manifiesto.");
            }
        }

        async _fetchArchivo(url, msg404, textoProceso) {
            try {
                if (typeof mostrarProcesoOverlay === "function") {
                    mostrarProcesoOverlay(textoProceso || "Generando manifiestos...");
                }
                const response = await fetch(url, { headers: headersCmf(false) });
                if (response.status === 404) {
                    if (typeof errorModal === "function") errorModal(msg404 || "No se encontró el documento.");
                    return null;
                }
                if (!response.ok) {
                    if (typeof errorModal === "function") errorModal("No se pudo generar el PDF.");
                    return null;
                }
                return response;
            } catch (e) {
                console.error(e);
                if (typeof errorModal === "function") errorModal("Error al generar el PDF.");
                return null;
            } finally {
                if (typeof ocultarProcesoOverlay === "function") ocultarProcesoOverlay();
            }
        }

        _nombreDescarga(response, fallback) {
            const disp = response.headers.get("Content-Disposition") || "";
            const utf = /filename\*=UTF-8''([^;]+)/i.exec(disp);
            const basic = /filename="?([^";]+)"?/i.exec(disp);
            if (utf && utf[1]) {
                try { return decodeURIComponent(utf[1]); } catch { return utf[1]; }
            }
            if (basic && basic[1]) return basic[1];
            return fallback;
        }

        async _guardarBlobRespuesta(response, fallback, exigirPdf) {
            const raw = await response.blob();
            const ct = (response.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
            let archivo = this._nombreDescarga(response, fallback) || fallback || "archivo";
            const esZip = ct === "application/zip" || ct === "application/x-zip-compressed" || /\.zip$/i.test(archivo);
            if (exigirPdf && esZip) {
                if (typeof errorModal === "function") {
                    errorModal("El certificado no se pudo descargar como PDF.");
                }
                return;
            }
            const esPdf = !esZip && (exigirPdf || ct === "application/pdf" || /\.pdf$/i.test(fallback || ""));
            if (esPdf && (!/\.pdf$/i.test(archivo) || /\.zip$/i.test(archivo))) {
                archivo = fallback && /\.pdf$/i.test(fallback) ? fallback : "Certificado.pdf";
            }
            const blob = esPdf
                ? new Blob([raw], { type: "application/pdf" })
                : raw;
            const href = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = href;
            a.download = archivo;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(href), 1500);
        }

        async _descargarPdf(url, msg404, msgOk, textoProceso, fallbackNombre, exigirPdf) {
            const response = await this._fetchArchivo(url, msg404, textoProceso);
            if (!response) return;
            await this._guardarBlobRespuesta(response, fallbackNombre || "Manifiesto.pdf", exigirPdf);
            if (msgOk && typeof exitoModal === "function") {
                exitoModal(msgOk);
            }
        }

        async _descargarLoteOpds(params) {
            this._loteWarning = "";
            const idOpds = (this._el("cmfIdTransportistaOpds")?.value || "").trim() || leerIdTransportistaOpdsCmf();
            if (!idOpds) {
                this._loteWarning = "Falta el N° OPDS del transportista para el archivo de lote.";
                return false;
            }
            guardarIdTransportistaOpdsCmf(idOpds);
            if (this._el("cmfIdTransportistaOpds")) this._el("cmfIdTransportistaOpds").value = idOpds;

            const loteParams = new URLSearchParams(params.toString());
            loteParams.delete("formato");
            loteParams.delete("generarCertificados");
            loteParams.set("idTransportistaOpds", idOpds);

            try {
                if (typeof mostrarProcesoOverlay === "function") {
                    mostrarProcesoOverlay("Generando archivo de lote OPDS...");
                }
                await new Promise(r => setTimeout(r, 350));
                const response = await fetch(`/Recorridos/ManifiestoLoteOpds?${loteParams.toString()}`, {
                    headers: headersCmf(false)
                });
                if (response.status === 404) {
                    this._loteWarning = "No hay clientes para armar el archivo de lote.";
                    return false;
                }
                if (!response.ok) {
                    let msg = "No se pudo generar el archivo de lote OPDS.";
                    try {
                        const data = await response.json();
                        if (data?.mensaje) msg = data.mensaje;
                    } catch { /* ignore */ }
                    this._loteWarning = msg;
                    return false;
                }

                const blob = await response.blob();
                const disp = response.headers.get("Content-Disposition") || "";
                const utf = /filename\*=UTF-8''([^;]+)/i.exec(disp);
                const basic = /filename="?([^";]+)"?/i.exec(disp);
                let archivo = "LOTE_PATOGENICOS.txt";
                if (utf && utf[1]) {
                    try { archivo = decodeURIComponent(utf[1]); } catch { archivo = utf[1]; }
                } else if (basic && basic[1]) {
                    archivo = basic[1];
                }
                const href = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = href;
                a.download = archivo;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(href), 1500);
                try {
                    const raw = response.headers.get("X-OA-Warning") || "";
                    if (raw) this._loteWarning = decodeURIComponent(raw);
                } catch { /* ignore */ }
                return true;
            } catch (e) {
                console.error(e);
                this._loteWarning = "Error al generar el archivo de lote OPDS.";
                return false;
            } finally {
                if (typeof ocultarProcesoOverlay === "function") ocultarProcesoOverlay();
            }
        }

        async _descargarTxt(params) {
            try {
                if (typeof mostrarProcesoOverlay === "function") {
                    mostrarProcesoOverlay("Generando TXT...");
                }
                const response = await fetch(`/Recorridos/ArchivoIntercambio?${params.toString()}`, {
                    headers: headersCmf(false)
                });
                if (response.status === 404) {
                    if (typeof errorModal === "function") errorModal("No hay clientes para armar el archivo de intercambio.");
                    return;
                }
                if (!response.ok) {
                    if (typeof errorModal === "function") errorModal("No se pudo generar el TXT de planta.");
                    return;
                }

                const blob = await response.blob();
                const disp = response.headers.get("Content-Disposition") || "";
                const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(disp);
                const archivo = match ? decodeURIComponent(match[1]) : `INTERCAMBIO_${hoyIso().replaceAll("-", "")}.txt`;
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = archivo;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.createObjectURL && URL.revokeObjectURL(url), 1500);

                if (typeof exitoModal === "function") {
                    exitoModal("Se descargó el archivo TXT de intercambio para la planta.");
                }
                await this.cargar();
            } catch (e) {
                console.error(e);
                if (typeof errorModal === "function") errorModal("Error al exportar el TXT de planta.");
            } finally {
                if (typeof ocultarProcesoOverlay === "function") ocultarProcesoOverlay();
            }
        }

        async _getJson(url, options = {}) {
            const response = await fetch(url, {
                method: options.method || "GET",
                headers: headersCmf(false)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        }
    }

    function leerIdTransportistaOpdsCmf() {
        try { return (localStorage.getItem("mfIdTransportistaOpds") || "").trim(); } catch { return ""; }
    }

    function guardarIdTransportistaOpdsCmf(valor) {
        const v = (valor || "").trim();
        try {
            if (v) localStorage.setItem("mfIdTransportistaOpds", v);
            else localStorage.removeItem("mfIdTransportistaOpds");
        } catch { /* ignore */ }
    }

    function attachCamionesManifiestos(modalEl) {
        if (!modalEl) return null;
        if (modalEl._cmfPanel instanceof CamionesManifiestosPanel) {
            return modalEl._cmfPanel;
        }
        const panel = new CamionesManifiestosPanel(modalEl);
        modalEl._cmfPanel = panel;
        window.camionesManifiestos = panel;
        return panel;
    }

    window.attachCamionesManifiestos = attachCamionesManifiestos;
    window.CamionesManifiestosPanel = CamionesManifiestosPanel;

})(window);
