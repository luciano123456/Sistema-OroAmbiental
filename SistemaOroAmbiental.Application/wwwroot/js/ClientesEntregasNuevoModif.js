/* =========================================================
   ENTREGAS NUEVO/MODIF  estilo VentasNuevoModif (Levels)
========================================================= */

(function () {
    "use strict";

    const CM = {
        init: window.CM_INIT || { id: 0, idContrato: 0 },
        id: 0,
        soloLectura: false,
        contratos: [],
        estadosEntrega: [],
        sucursales: [],
        idSucursalCliente: 0,
        productos: [],
        lineas: [],
        nextLineId: 1,
        cobrosLineas: [],
        cobrosResumen: null,
        cuentasCaja: [],
        nextCobroKey: 1
    };

    const API = {
        editarInfo: id => `/ClientesEntregas/EditarInfo?id=${id}`,
        insertar: "/ClientesEntregas/Insertar",
        actualizar: "/ClientesEntregas/Actualizar",
        eliminar: id => `/ClientesEntregas/Eliminar?id=${id}`,
        cobros: id => `/ClientesEntregas/Cobros?id=${id}`,
        contratos: "/Contratos/Lista?soloVigentes=true",
        productos: "/Productos/Lista",
        estadosEntrega: "/EntregasEstados/Lista",
        sucursales: "/Sucursales/Lista",
        cuentas: "/Cuentas/Lista"
    };

    const TIPO_LINEA_ENTREGA = 1;
    const TIPO_LINEA_RETIRO = 2;

    const authHeaders = () => ({
        Authorization: "Bearer " + (token || ""),
        "Content-Type": "application/json"
    });

    function leerNum(val) {
        if (typeof leerInputNumerico === "function") return leerInputNumerico(val);
        if (typeof parseNumero === "function") return parseNumero(val);
        const n = parseFloat(String(val ?? "").replace(/\./g, "").replace(",", "."));
        return isNaN(n) ? 0 : n;
    }

    function fmtInputNum(n) {
        const num = Number(n ?? 0);
        if (isNaN(num)) return "";
        const s = String(num).replace(".", ",");
        return typeof formatearMiles === "function" ? formatearMiles(s) : s;
    }

    function prepararInputsMilesLinea($scope) {
        ($scope || $("#tbodyLineasEntrega")).find(".linea-cant, .linea-precio, .linea-desc, .linea-iva").each(function () {
            if (typeof prepararInputMiles === "function") {
                prepararInputMiles(this);
            } else {
                this.classList.add("Inputmiles");
                if (this.type === "number") this.type = "text";
            }
            if (this.value && typeof formatearMilesInput === "function") {
                formatearMilesInput(this);
            }
        });
    }

    function setValorInputMiles($input, valor) {
        if (!$input?.length) return;
        if (typeof prepararInputMiles === "function") {
            prepararInputMiles($input[0]);
        }
        $input.val(fmtInputNum(valor));
        if ($input[0].value && typeof formatearMilesInput === "function") {
            formatearMilesInput($input[0]);
        }
    }

    $(document).ready(async () => {
        CM.id = Number(CM.init.id || 0);

        initTabsEntrega();
        wireEventosEntrega();
        initModalesAtajos();
        initAtajosConfiguracionEntrega();

        await cargarCombosEntrega();
        await cargarCuentasCajaEntrega();

        if (CM.id > 0) {
            await cargarEntrega(CM.id);
            await cargarCobrosEntrega();
        } else {
            setModoNuevo();
            if (CM.init.idContrato) {
                const cInit = (CM.contratos || []).find(x => x.Id === CM.init.idContrato);
                const c0 = cInit ? obtenerContratoRepresentantePorCliente(Number(cInit.IdCliente || 0)) : null;
                $("#cContrato").val(String(c0?.Id || CM.init.idContrato)).trigger("change.select2");
                CM.idSucursalCliente = c0 ? Number(c0.IdSucursal || 0) : 0;
            }
            CM.lineas = [];
            CM.cobrosLineas = [];
            renderLineas();
            renderCobrosLineas();
            actualizarResumenCobrosUI();
        }
    });

    /** Productos / cobros vacíos: cartel visible + animación en botones agregar */
    function actualizarUIEstadoVaciosEntrega() {
        const sinProductos = (CM.lineas || []).length === 0;
        const sinCobros = (CM.cobrosLineas || []).length === 0;
        const lectura = !!CM.soloLectura;

        $("#lblSinLineas").prop("hidden", !sinProductos);
        $("#tblLineasEntrega").closest(".vn-gridtable").toggleClass("d-none", sinProductos);

        $("#lblSinCobros").prop("hidden", !sinCobros);
        $("#tblCobrosEntrega").closest(".vn-gridtable").toggleClass("d-none", sinCobros);
        $("#lblCobrosHint").toggleClass("d-none", sinCobros);

        $("#wrapAgregarLinea").toggleClass("vn-agregar-wrap--pulse", sinProductos && !lectura);
        $("#wrapAgregarCobro").toggleClass("vn-agregar-wrap--pulse", sinCobros && !lectura);

        $("#cntProductos").text(`(${CM.lineas.length})`);
        $("#cntCobros").text(`(${CM.cobrosLineas.length})`);
    }

    function initTabsEntrega() {
        $(".vn-head-btn").on("click", function () {
            const sec = $(this).data("sec");
            $(".vn-head-btn").removeClass("active");
            $(this).addClass("active");
            $(".vn-section").removeClass("active");
            $(`#sec-${sec}`).addClass("active");
        });
    }

    function wireEventosEntrega() {
        $("#btnGuardarEntrega").on("click", guardarEntrega);
        $("#btnEliminarEntrega").on("click", eliminarEntregaActual);
        $("#btnAgregarLinea").on("click", () => agregarLinea());

        $("#btnCrearProducto").on("click", () => {
            window.nuevoProducto?.();
        });

        $("#btnAgregarCobroEntrega").on("click", () => agregarCobroLinea());
    }

    window.cerrarErrorEntrega = function () {
        $("#errorCamposEntrega").addClass("d-none");
        limpiarMarcasErrorSeccionesEntrega();
    };

    function limpiarMarcasErrorSeccionesEntrega() {
        $(".vn-head-btn").removeClass("error");
    }

    function marcarSeccionesErrorEntrega(secciones) {
        limpiarMarcasErrorSeccionesEntrega();
        if (!secciones) return;

        if (secciones.datos) {
            $('.vn-head-btn[data-sec="datos"]').addClass("error");
        }
        if (secciones.productos) {
            $('.vn-head-btn[data-sec="productos"]').addClass("error");
        }
        if (secciones.cobros) {
            $('.vn-head-btn[data-sec="cobros"]').addClass("error");
        }

        if (secciones.datos) {
            activarTabEntrega("datos");
        } else if (secciones.productos) {
            activarTabEntrega("productos");
        } else if (secciones.cobros) {
            activarTabEntrega("cobros");
        }
    }

    function activarTabEntrega(sec) {
        const $btn = $(`.vn-head-btn[data-sec="${sec}"]`);
        if (!$btn.length) return;
        $btn.trigger("click");
    }

    function inferirSeccionesErrorEntrega(mensaje) {
        const m = String(mensaje || "").toLowerCase();
        const secciones = { datos: false, productos: false };

        const clavesDatos = ["contrato", "estado", "fecha", "nota"];
        const clavesCobros = ["cobro", "cobros", "cuenta", "caja"];
        const clavesProductos = ["producto", "línea", "linea", "cantidad", "costo", "ítem", "item", "líneas", "lineas"];

        clavesDatos.forEach(k => { if (m.includes(k)) secciones.datos = true; });
        clavesProductos.forEach(k => { if (m.includes(k)) secciones.productos = true; });
        clavesCobros.forEach(k => { if (m.includes(k)) secciones.cobros = true; });

        return secciones;
    }

    function cobrosActivos() {
        return (CM.cobrosLineas || []).filter(p => Number(p.Importe) > 0 || p.IdCobro > 0);
    }

    /** Cobros que se envían al guardar (importe > 0 y cuenta de caja). */
    function cobrosParaGuardar() {
        sincronizarCobrosDesdeDom();
        return (CM.cobrosLineas || []).filter(p =>
            Number(p.Importe) > 0 && Number(p.IdCuenta) > 0
        );
    }

    function validarCobrosLocal() {
        sincronizarCobrosDesdeDom();

        const conImporte = (CM.cobrosLineas || []).filter(p => Number(p.Importe) > 0);
        const paraGuardar = cobrosParaGuardar();

        if (conImporte.length > 0 && paraGuardar.length < conImporte.length) {
            return {
                ok: false,
                mensaje: "Revise los cobros: cada fila con importe debe tener sucursal y cuenta de caja seleccionadas."
            };
        }

        if (!paraGuardar.length) {
            return { ok: true, mensaje: "" };
        }

        const totalEntrega = calcularTotalEntregaDesdeLineas();
        const suma = paraGuardar.reduce((s, p) => s + Number(p.Importe || 0), 0);

        if (suma > totalEntrega + 0.01) {
            return {
                ok: false,
                mensaje: "La suma de los cobros no puede superar el total de la entrega."
            };
        }

        for (const p of paraGuardar) {
            if (!p.Fecha || !p.IdSucursal || !p.IdCuenta || !(p.Concepto || "").trim() || p.Importe <= 0) {
                return { ok: false, mensaje: "Revise los cobros: fecha, sucursal, cuenta, concepto e importe son obligatorios." };
            }
        }

        return { ok: true, mensaje: "" };
    }

    function sincronizarCobrosDesdeDom() {
        $("#tbodyCobrosEntrega tr").each(function () {
            const key = Number($(this).data("key"));
            const cobro = CM.cobrosLineas.find(x => x._key === key);
            if (cobro) syncCobroFromRow($(this), cobro);
        });
    }

    function sincronizarLineasDesdeDom() {
        $("#tbodyLineasEntrega tr").each(function () {
            const key = Number($(this).data("key"));
            const linea = CM.lineas.find(x => x._key === key);
            if (linea) syncLineaFromRow($(this), linea);
        });
    }

    function validarEntregaLocal() {
        sincronizarLineasDesdeDom();

        const erroresDatos = [];
        const erroresProductos = [];

        if (!$("#cFecha").val()) {
            erroresDatos.push("Indique la fecha de la entrega.");
        }
        if (!(parseInt($("#cContrato").val(), 10) > 0)) {
            erroresDatos.push("Seleccione un cliente.");
        }
        const lineasConProducto = CM.lineas.filter(l => l.IdProducto > 0);

        if (lineasConProducto.length === 0) {
            erroresProductos.push("Agregue al menos un producto a la entrega.");
        } else {
            const sinProducto = CM.lineas.some(l => !l.IdProducto);
            if (sinProducto) {
                erroresProductos.push("Hay líneas sin producto seleccionado.");
            }

            const cantidadInvalida = CM.lineas.some(l => l.IdProducto > 0 && !(Number(l.Cantidad) > 0));
            if (cantidadInvalida) {
                erroresProductos.push("Las cantidades deben ser mayores a cero.");
            }

            const costoInvalido = CM.lineas.some(l => l.IdProducto > 0 && Number(l.PrecioVenta) < 0);
            if (costoInvalido) {
                erroresProductos.push("El precio de venta no puede ser negativo.");
            }
        }

        const mensajes = [...erroresDatos, ...erroresProductos];
        const secciones = {
            datos: erroresDatos.length > 0,
            productos: erroresProductos.length > 0
        };

        return {
            ok: mensajes.length === 0,
            mensaje: mensajes.join(" "),
            secciones
        };
    }

    function mostrarErrorEntrega(msg, secciones) {
        const texto = msg || "Revise los datos ingresados.";
        const $p = $("#errorCamposEntrega");
        $p.find(".rp-error-message").text(texto);
        $p.removeClass("d-none");

        const flags = secciones || inferirSeccionesErrorEntrega(texto);
        if (flags.datos || flags.productos) {
            marcarSeccionesErrorEntrega(flags);
        } else {
            limpiarMarcasErrorSeccionesEntrega();
        }

        if ($p.offset()) {
            $("html, body").animate({ scrollTop: $p.offset().top - 80 }, 200);
        }
        if (typeof errorModal === "function") {
            errorModal(texto);
        }
    }

    function initAtajosConfiguracionEntrega() {
        if (window._entregaConfigListenerInit) return;
        window._entregaConfigListenerInit = true;

        document.addEventListener("configuracionActualizada", async (e) => {
            const ctrl = e.detail?.tipo || "";
            const nuevoId = e.detail?.nuevoId;

            if (ctrl === "EntregasEstados") {
                const prev = $("#cEstado").val();
                await cargarEstadoesEntrega();
                const idSel = nuevoId || prev;
                if (idSel) $("#cEstado").val(String(idSel)).trigger("change.select2");
                return;
            }

            if (ctrl === "Cuentas" || ctrl === "Sucursales") {
                if (ctrl === "Sucursales") await cargarSucursalesEntrega();
                await cargarCuentasCajaEntrega();

                const btn = window._rpUltimoAtajoConfigBtn;
                const $row = btn ? $(btn).closest("tr[data-key]") : null;
                const key = $row?.length ? parseInt($row.data("key"), 10) : 0;
                const cobro = key ? CM.cobrosLineas.find(x => x._key === key) : null;

                if (ctrl === "Cuentas" && cobro && nuevoId) {
                    cobro.IdCuenta = Number(nuevoId);
                }

                renderCobrosLineas();
                actualizarResumenCobrosUI();
            }
        });
    }

    function initModalesAtajos() {
        if (typeof initProductoModal === "function") {
            initProductoModal({
                token: token,
                onSaved: async (data) => {
                    await cargarProductosEntrega();
                    const id = data?.id ?? data?.Id;
                    if (id) {
                        const last = CM.lineas[CM.lineas.length - 1];
                        if (last) {
                            renderLineas();
                            const $sel = $(`#linea_${last._key}_producto`);
                            if ($sel.length) $sel.val(String(id)).trigger("change.select2");
                        }
                    }
                }
            });
        }
    }

    async function cargarCombosEntrega() {
        await Promise.all([
            cargarContratoesEntrega(),
            cargarEstadoesEntrega(),
            cargarSucursalesEntrega(),
            cargarProductosEntrega()
        ]);

        initSelectContratoHeader();
        ensureSelect2Cm($("#cEstado"), { placeholder: "Seleccionar estado" });

        $("#cContrato").off("change.entregaSuc").on("change.entregaSuc", function () {
            const id = parseInt($(this).val(), 10) || 0;
            const c = (CM.contratos || []).find(x => x.Id === id);
            CM.idSucursalCliente = c ? Number(c.IdSucursal || 0) : 0;
        });
    }

    async function cargarSucursalesEntrega() {
        CM.sucursales = typeof fetchSucursalesPermitidas === "function"
            ? await fetchSucursalesPermitidas(API.sucursales)
            : await (await fetch(API.sucursales, { headers: authHeaders() })).json();
    }

    async function cargarContratoesEntrega() {
        const r = await fetch(API.contratos, { headers: authHeaders() });
        CM.contratos = r.ok ? await r.json() : [];

        const $p = $("#cContrato");
        const valContratoActual = parseInt($p.val(), 10) || 0;
        const contratoActual = (CM.contratos || []).find(x => x.Id === valContratoActual);
        const idClienteActual = Number(contratoActual?.IdCliente || 0);

        const porCliente = new Map();
        (CM.contratos || []).forEach(c => {
            const idCli = Number(c.IdCliente || 0);
            if (idCli <= 0) return;
            if (!porCliente.has(idCli)) {
                porCliente.set(idCli, c);
            }
        });
        const opcionesCliente = Array.from(porCliente.values())
            .sort((a, b) => String(a.Cliente || "").localeCompare(String(b.Cliente || "")));

        $p.empty().append(`<option value="">Seleccionar</option>`);
        opcionesCliente.forEach(x => {
            $p.append(`<option value="${x.Id}">${x.Cliente || x.Etiqueta || ("Cliente #" + x.IdCliente)}</option>`);
        });
        if (idClienteActual > 0) {
            const rep = obtenerContratoRepresentantePorCliente(idClienteActual);
            if (rep) $p.val(String(rep.Id));
        }
        initSelectContratoHeader();
    }

    function obtenerContratoRepresentantePorCliente(idCliente) {
        const idCli = Number(idCliente || 0);
        if (idCli <= 0) return null;
        return (CM.contratos || []).find(x => Number(x.IdCliente || 0) === idCli) || null;
    }

    function initSelectContratoHeader() {
        const $p = $("#cContrato");
        if (!$p.length) return;
        ensureSelect2Cm($p, {
            placeholder: "Seleccionar cliente",
            dropdownParent: $(".entregas-nuevo")
        });
    }

    async function cargarEstadoesEntrega() {
        const rEst = await fetch(API.estadosEntrega, { headers: authHeaders() });
        CM.estadosEntrega = rEst.ok ? await rEst.json() : [];

        if (typeof llenarSelectEstadoes === "function") {
            llenarSelectEstadoes($("#cEstado"), CM.estadosEntrega);
        } else {
            const $s = $("#cEstado");
            $s.empty().append(`<option value="">Seleccionar</option>`);
            (CM.estadosEntrega || []).forEach(x => {
                $s.append(`<option value="${x.Id}">${x.Nombre}</option>`);
            });
        }
        ensureSelect2Cm($("#cEstado"), { placeholder: "Seleccionar estado" });
    }

    async function cargarProductosEntrega() {
        const r = await fetch(API.productos, { headers: authHeaders() });
        CM.productos = r.ok ? await r.json() : [];
    }

    function ensureSelect2Cm($el, opts) {
        if (!$el?.length) return;
        if ($el.data("select2")) $el.select2("destroy");
        $el.select2(Object.assign({ width: "100%", allowClear: false }, opts || {}));
    }

    function setModoNuevo() {
        CM.soloLectura = false;
        CM.cobrosLineas = [];
        $("#tituloPaginaEntrega").text("Nueva entrega");
        $("#lblGuardarEntrega").text("Registrar entrega");
        $("#btnEliminarEntrega").prop("hidden", true);
        $("#alertEntregaCobros").prop("hidden", true);

        const hoy = new Date().toISOString().slice(0, 10);
        $("#cFecha").val(hoy);
    }

    async function cargarEntrega(id) {
        const r = await fetch(API.editarInfo(id), { headers: authHeaders() });
        if (!r.ok) {
            errorModal("No se encontró la entrega.");
            return;
        }

        const d = await r.json();
        CM.id = d.Id;
        CM.soloLectura = !d.PuedeEditar;

        $("#tituloPaginaEntrega").text(`Entrega #${d.Id}`);
        $("#lblGuardarEntrega").text(d.PuedeEditar ? "Guardar cambios" : "Solo lectura");
        $("#btnEliminarEntrega").prop("hidden", !d.PuedeEliminar);
        $("#alertEntregaCobros").prop("hidden", !d.TieneCobros);
        CM.cobrosLineas = [];

        const fecha = d.Fecha ? String(d.Fecha).slice(0, 10) : "";
        $("#cFecha").val(fecha);
        $("#cNota").val(d.NotaInterna || "");
        $("#cNotaCliente").val(d.NotaCliente || "");

        const contratoReal = (CM.contratos || []).find(x => x.Id === d.IdContrato);
        const idCliente = Number(d.IdCliente || contratoReal?.IdCliente || 0);
        const contratoRepresentante = obtenerContratoRepresentantePorCliente(idCliente);
        $("#cContrato").val(String(contratoRepresentante?.Id || d.IdContrato)).trigger("change.select2");
        CM.idSucursalCliente = Number(d.IdSucursal || contratoRepresentante?.IdSucursal || 0);
        if (d.IdEstado) $("#cEstado").val(String(d.IdEstado)).trigger("change.select2");

        CM.lineas = (d.Lineas || []).map(l => ({
            _key: CM.nextLineId++,
            Id: l.Id,
            IdProducto: l.IdProducto,
            TipoMovimiento: Number(l.TipoMovimiento || TIPO_LINEA_ENTREGA),
            Cantidad: Number(l.Cantidad || 0),
            PrecioVenta: Number(l.PrecioVenta || 0),
            CostoUnitario: Number(l.CostoUnitario || 0),
            PorcDescuento: Number(l.PorcDescuento || 0),
            PorcIva: Number(l.PorcIva || 0)
        }));

        renderLineas();
        recalcularTotalesUI();

        if (CM.soloLectura) aplicarSoloLectura();

        await cargarCobrosEntrega();
    }

    function aplicarSoloLectura() {
        $("#btnGuardarEntrega").prop("disabled", true);
        $("#btnAgregarLinea, #btnCrearProducto, #btnAtajoEstadoEntrega").prop("hidden", true);
        $("#cFecha, #cNota").prop("disabled", true);
        $("#cContrato, #cEstado").prop("disabled", true);
        $("#tbodyLineasEntrega input, #tbodyLineasEntrega select").prop("disabled", true);
        $("#tbodyLineasEntrega .btn-quitar-linea").prop("hidden", true);
        $("#btnAgregarCobroEntrega").prop("hidden", true);
        $("#tbodyCobrosEntrega input, #tbodyCobrosEntrega select").prop("disabled", true);
        $("#tbodyCobrosEntrega .btn-quitar-cobro-linea, #tbodyCobrosEntrega .btn-atajo-cuenta-cobro").prop("hidden", true);
    }

    function restaurarEdicionEntrega() {
        $("#btnGuardarEntrega").prop("disabled", false);
        $("#lblGuardarEntrega").text("Guardar cambios");
        $("#btnAgregarLinea, #btnCrearProducto, #btnAtajoEstadoEntrega").prop("hidden", false);
        $("#cFecha, #cNota").prop("disabled", false);
        $("#cContrato, #cEstado").prop("disabled", false);
        $("#tbodyLineasEntrega input, #tbodyLineasEntrega select").prop("disabled", false);
        $("#tbodyLineasEntrega .btn-quitar-linea").prop("hidden", false);
        $("#btnAgregarCobroEntrega").prop("hidden", false);
        $("#tbodyCobrosEntrega input, #tbodyCobrosEntrega select").prop("disabled", false);
        $("#tbodyCobrosEntrega .btn-quitar-cobro-linea, #tbodyCobrosEntrega .btn-atajo-cuenta-cobro").prop("hidden", false);
        refrescarSelectsProducto();
        actualizarBotonAgregarLinea();
    }

    async function cargarCuentasCajaEntrega() {
        try {
            const r = await fetch(API.cuentas, { headers: authHeaders() });
            CM.cuentasCaja = r.ok ? await r.json() : [];
        } catch {
            CM.cuentasCaja = [];
        }
    }

    function cuentasPorSucursalEntrega(idSucursal) {
        if (!idSucursal) return CM.cuentasCaja || [];
        return (CM.cuentasCaja || []).filter(x => String(x.IdCombo) === String(idSucursal));
    }

    function calcularTotalEntregaDesdeLineas() {
        let tot = 0;
        CM.lineas.forEach(l => {
            tot += calcularLinea(l).subtotalFinal;
        });
        return tot;
    }

    function htmlOpcionesSucursalCobro(cobro) {
        return (CM.sucursales || [])
            .map(s =>
                `<option value="${s.Id}" ${String(s.Id) === String(cobro.IdSucursal) ? "selected" : ""}>${escapeHtmlCm(s.Nombre)}</option>`
            )
            .join("");
    }

    function htmlOpcionesCuentaCobro(cobro) {
        const cuentas = cuentasPorSucursalEntrega(cobro.IdSucursal);
        if (!cobro.IdSucursal) {
            return `<option value="">Seleccione sucursal</option>`;
        }
        return cuentas
            .map(c =>
                `<option value="${c.Id}" ${String(c.Id) === String(cobro.IdCuenta) ? "selected" : ""}>${escapeHtmlCm(c.Nombre)}</option>`
            )
            .join("");
    }

    function fechaInputValor(fecha) {
        if (!fecha) return "";
        const s = String(fecha);
        if (s.length >= 10) return s.slice(0, 10);
        try {
            return new Date(fecha).toISOString().slice(0, 10);
        } catch {
            return "";
        }
    }

    function conceptoCobroDefault() {
        return CM.id > 0 ? `Cobro entrega #${CM.id}` : "Cobro entrega";
    }

    function agregarCobroLinea(preset) {
        if (CM.soloLectura) return;

        const hoy = new Date().toISOString().slice(0, 10);
        const idSuc = CM.idSucursalCliente || 0;

        const cobro = preset || {
            _key: CM.nextCobroKey++,
            IdCobro: 0,
            IdMovimientoCc: 0,
            Fecha: hoy,
            IdSucursal: idSuc,
            IdCuenta: 0,
            Concepto: conceptoCobroDefault(),
            Importe: 0
        };

        if (!cobro.IdCuenta && cobro.IdSucursal) {
            const cuentas = cuentasPorSucursalEntrega(cobro.IdSucursal);
            if (cuentas.length === 1) {
                cobro.IdCuenta = Number(cuentas[0].Id) || 0;
            }
        }

        CM.cobrosLineas.push(cobro);
        renderCobrosLineas();
        actualizarResumenCobrosUI();
    }

    function quitarCobroLinea(key) {
        if (CM.soloLectura) return;
        CM.cobrosLineas = CM.cobrosLineas.filter(x => x._key !== key);
        renderCobrosLineas();
        actualizarResumenCobrosUI();
    }

    function syncCobroFromRow($tr, cobro) {
        cobro.Fecha = $tr.find(".cobro-fecha").val() || "";
        cobro.IdSucursal = parseInt($tr.find(".cobro-sucursal").val(), 10) || 0;
        cobro.IdCuenta = parseInt($tr.find(".cobro-cuenta").val(), 10) || 0;
        cobro.Concepto = ($tr.find(".cobro-concepto").val() || "").trim();
        cobro.Importe = leerNum($tr.find(".cobro-importe").val());
    }

    function renderCobrosLineas() {
        const $tb = $("#tbodyCobrosEntrega");
        $tb.empty();

        CM.cobrosLineas.forEach(cobro => {
            const k = cobro._key;
            const fechaVal = fechaInputValor(cobro.Fecha);
            const sucOpts = htmlOpcionesSucursalCobro(cobro);
            const ctaOpts = htmlOpcionesCuentaCobro(cobro);

            const tr = $(`
                <tr data-key="${k}">
                    <td><input type="date" class="form-control vn-input vn-mini cobro-fecha" value="${fechaVal}" /></td>
                    <td>
                        <select class="form-select vn-input vn-mini cobro-sucursal" id="cobro_${k}_sucursal">
                            <option value="">Seleccionar</option>
                            ${sucOpts}
                        </select>
                    </td>
                    <td>
                        <div class="vn-select-plus vn-select-plus--cobro">
                            <select class="form-select vn-input vn-mini cobro-cuenta" id="cobro_${k}_cuenta">
                                <option value="">Seleccionar</option>
                                ${ctaOpts}
                            </select>
                            <button type="button"
                                    class="vn-btn-plus btn-atajo-cuenta-cobro"
                                    title="Agregar cuenta"
                                    data-config-nombre="Cuentas"
                                    data-config-controller="Cuentas"
                                    data-config-combo-nombre="Sucursales"
                                    data-config-combo-controller="Sucursales"
                                    data-config-combo-label="Sucursal">
                                <i class="fa fa-plus"></i>
                            </button>
                        </div>
                    </td>
                    <td><input type="text" class="form-control vn-input vn-mini cobro-concepto" maxlength="200" /></td>
                    <td><input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles cobro-importe text-end" value="${fmtInputNum(cobro.Importe)}" /></td>
                    <td class="text-center">
                        <button type="button" class="btn btn-outline-danger btn-sm btn-quitar-cobro-linea" title="Quitar">
                            <i class="fa fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `);

            $tb.append(tr);
            tr.find(".cobro-concepto").val(cobro.Concepto || "");

            const $imp = tr.find(".cobro-importe");
            if (typeof prepararInputMiles === "function") prepararInputMiles($imp[0]);
            if ($imp[0].value && typeof formatearMilesInput === "function") formatearMilesInput($imp[0]);

            const $suc = tr.find(".cobro-sucursal");
            const $cta = tr.find(".cobro-cuenta");

            function repoblarCuentasCobro(mantenerCuenta) {
                const idCuentaPrev = mantenerCuenta ? (parseInt($cta.val(), 10) || cobro.IdCuenta || 0) : 0;
                const opts = htmlOpcionesCuentaCobro(cobro);
                if ($cta.data("select2")) $cta.select2("destroy");
                $cta.html(`<option value="">Seleccionar</option>${opts}`);
                ensureSelect2Cm($cta, { placeholder: "Cuenta", dropdownParent: $(".entregas-nuevo") });
                if (idCuentaPrev > 0) {
                    $cta.val(String(idCuentaPrev)).trigger("change.select2");
                    cobro.IdCuenta = idCuentaPrev;
                } else {
                    $cta.val("").trigger("change.select2");
                    cobro.IdCuenta = 0;
                }
            }

            ensureSelect2Cm($suc, { placeholder: "Sucursal", dropdownParent: $(".entregas-nuevo") });
            if (cobro.IdSucursal) {
                $suc.val(String(cobro.IdSucursal));
            }
            repoblarCuentasCobro(true);

            $suc.on("change", function () {
                cobro.IdSucursal = parseInt($(this).val(), 10) || 0;
                cobro.IdCuenta = 0;
                repoblarCuentasCobro(false);
                actualizarResumenCobrosUI();
            });

            tr.find(".cobro-fecha, .cobro-concepto, .cobro-importe").on("input change", function () {
                syncCobroFromRow(tr, cobro);
                actualizarResumenCobrosUI();
            });

            $cta.on("change", function () {
                syncCobroFromRow(tr, cobro);
                actualizarResumenCobrosUI();
            });

            tr.find(".btn-quitar-cobro-linea").on("click", () => quitarCobroLinea(k));
        });

        $("#btnAgregarCobroEntrega").prop("disabled", CM.soloLectura);
        $("#tbodyCobrosEntrega .btn-atajo-cuenta-cobro").prop("hidden", !!CM.soloLectura).prop("disabled", !!CM.soloLectura);
        actualizarUIEstadoVaciosEntrega();
    }

    function escapeHtmlCm(t) {
        return String(t ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function actualizarResumenCobrosUI() {
        const totalEntrega = calcularTotalEntregaDesdeLineas();
        const activos = cobrosActivos();
        const totalPagado = activos.reduce((s, p) => s + Number(p.Importe || 0), 0);

        const saldo = Math.max(0, totalEntrega - totalPagado);

        $("#cobroTotEntrega").text(fmtMoney(totalEntrega));
        $("#cobroTotPagado").text(fmtMoney(totalPagado));
        $("#cobroSaldoPend").text(fmtMoney(saldo));
        $("#totPagadoResumen").text(fmtMoney(totalPagado));
        $("#totSaldoResumen").text(fmtMoney(saldo));
        $("#lblCobrosHintText").text(
            activos.length
                ? `${activos.length} cobro(s) en la grilla. Se guardan al pulsar ?,?${CM.id > 0 ? "Guardar cambios" : "Registrar entrega"}?,? (caja y cuenta corriente).`
                : "Agregá filas de cobro como en productos. Nada se registra hasta guardar la entrega."
        );

        actualizarUIEstadoVaciosEntrega();
    }

    async function cargarCobrosEntrega() {
        if (CM.id <= 0) {
            renderCobrosLineas();
            actualizarResumenCobrosUI();
            return;
        }

        try {
            const r = await fetch(API.cobros(CM.id), { headers: authHeaders() });
            if (!r.ok) return;

            const d = await r.json();
            CM.cobrosResumen = d;
            const lista = d.Cobros || d.cobros || [];

            CM.cobrosLineas = lista.map(p => ({
                _key: CM.nextCobroKey++,
                IdCobro: p.IdCobro ?? p.idCobro ?? 0,
                IdMovimientoCc: p.IdMovimientoCc ?? p.idMovimientoCc ?? 0,
                Fecha: fechaInputValor(p.Fecha || p.fecha),
                IdSucursal: p.IdSucursal ?? p.idSucursal ?? 0,
                IdCuenta: p.IdCuenta ?? p.idCuenta ?? 0,
                Concepto: p.Concepto || p.concepto || conceptoCobroDefault(),
                Importe: Number(p.Importe ?? p.importe ?? 0)
            }));

            const tieneCobros = d.TieneCobros === true || d.tieneCobros === true || CM.cobrosLineas.length > 0;
            $("#alertEntregaCobros").prop("hidden", !tieneCobros);

            renderCobrosLineas();
            actualizarResumenCobrosUI();
        } catch (e) {
            console.error(e);
        }
    }

    function agregarLinea(preset) {
        if (CM.soloLectura) return;

        const linea = preset || {
            _key: CM.nextLineId++,
            Id: 0,
            IdProducto: 0,
            TipoMovimiento: TIPO_LINEA_ENTREGA,
            Cantidad: 1,
            PrecioVenta: 0,
            PorcDescuento: 0,
            PorcIva: 21
        };

        CM.lineas.push(linea);
        renderLineas();
        recalcularTotalesUI();
    }

    function quitarLinea(key) {
        if (CM.soloLectura) return;
        CM.lineas = CM.lineas.filter(x => x._key !== key);
        renderLineas();
        recalcularTotalesUI();
    }

    /** IDs de producto ya elegidos en otras líneas (no repetir en la misma entrega). */
    function idsProductosEnOtrasLineas(excluirKey) {
        const ids = new Set();
        CM.lineas.forEach(l => {
            if (l._key !== excluirKey && l.IdProducto > 0) {
                ids.add(`${l.IdProducto}_${Number(l.TipoMovimiento || TIPO_LINEA_ENTREGA)}`);
            }
        });
        return ids;
    }

    function htmlOpcionesProducto(linea) {
        const usados = idsProductosEnOtrasLineas(linea._key);
        const tipo = Number(linea.TipoMovimiento || TIPO_LINEA_ENTREGA);
        return (CM.productos || [])
            .filter(p => !usados.has(`${p.Id}_${tipo}`) || p.Id === linea.IdProducto)
            .map(p =>
                `<option value="${p.Id}" ${String(p.Id) === String(linea.IdProducto) ? "selected" : ""}>${p.Nombre}</option>`
            )
            .join("");
    }

    function refrescarSelectsProducto() {
        CM.lineas.forEach(linea => {
            const $sel = $(`#linea_${linea._key}_producto`);
            if (!$sel.length) return;

            const val = linea.IdProducto > 0 ? String(linea.IdProducto) : "";
            const opts = htmlOpcionesProducto(linea);

            if ($sel.data("select2")) {
                $sel.select2("destroy");
            }

            $sel.html(`<option value="">Seleccionar</option>${opts}`);
            $sel.val(val && $sel.find(`option[value="${val}"]`).length ? val : "");
            ensureSelect2Cm($sel, { placeholder: "Producto", dropdownParent: $(".entregas-nuevo") });
        });
    }

    function renderLineas() {
        const $tb = $("#tbodyLineasEntrega");
        $tb.empty();

        CM.lineas.forEach(linea => {
            const k = linea._key;
            const prodOpts = htmlOpcionesProducto(linea);

            const calc = calcularLinea(linea);

            const tr = $(`
                <tr data-key="${k}">
                    <td>
                        <select id="linea_${k}_producto" class="form-select vn-input vn-mini linea-producto">
                            <option value="">Seleccionar</option>
                            ${prodOpts}
                        </select>
                    </td>
                    <td>
                        <select class="form-select vn-input vn-mini linea-tipo">
                            <option value="${TIPO_LINEA_ENTREGA}" ${Number(linea.TipoMovimiento || TIPO_LINEA_ENTREGA) === TIPO_LINEA_ENTREGA ? "selected" : ""}>Entrega</option>
                            <option value="${TIPO_LINEA_RETIRO}" ${Number(linea.TipoMovimiento || TIPO_LINEA_ENTREGA) === TIPO_LINEA_RETIRO ? "selected" : ""}>Retiro</option>
                        </select>
                    </td>
                    <td><input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-cant" value="${fmtInputNum(linea.Cantidad)}" /></td>
                    <td><input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-precio" value="${fmtInputNum(linea.PrecioVenta)}" /></td>
                    <td><input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-desc" value="${fmtInputNum(linea.PorcDescuento)}" /></td>
                    <td><input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-iva" value="${fmtInputNum(linea.PorcIva)}" /></td>
                    <td class="text-end linea-subtotal-cell linea-subtotal">${fmtMoney(calc.signedSubtotalFinal)}</td>
                    <td class="text-center">
                        <button type="button" class="btn btn-outline-danger btn-quitar-linea" title="Quitar">
                            <i class="fa fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `);

            $tb.append(tr);
            prepararInputsMilesLinea(tr);

            const $sel = tr.find(".linea-producto");
            const $tipo = tr.find(".linea-tipo");
            ensureSelect2Cm($sel, { placeholder: "Producto", dropdownParent: $(".entregas-nuevo") });

            $tipo.on("change", function () {
                linea.TipoMovimiento = parseInt($(this).val(), 10) || TIPO_LINEA_ENTREGA;
                syncLineaFromRow(tr, linea);
                recalcularTotalesUI();
            });

            $sel.on("change", function () {
                linea.IdProducto = parseInt($(this).val(), 10) || 0;
                const prod = CM.productos.find(p => p.Id === linea.IdProducto);
                if (prod) {
                    if (!linea.PrecioVenta) {
                        linea.PrecioVenta = Number(prod.PrecioVenta || 0);
                        setValorInputMiles(tr.find(".linea-precio"), linea.PrecioVenta);
                    }
                    linea.CostoUnitario = Number(prod.CostoUnitario || 0);
                }
                syncLineaFromRow(tr, linea);
                tr.find(".linea-subtotal").text(fmtMoney(calcularLinea(linea).signedSubtotalFinal));
                recalcularTotalesUI();
            });

            tr.find(".linea-cant, .linea-precio, .linea-desc, .linea-iva").on("input change", function () {
                syncLineaFromRow(tr, linea);
                tr.find(".linea-subtotal").text(fmtMoney(calcularLinea(linea).signedSubtotalFinal));
                recalcularTotalesUI();
            });

            tr.find(".btn-quitar-linea").on("click", () => quitarLinea(k));
        });

        const usados = new Set(
            CM.lineas
                .filter(l => l.IdProducto > 0)
                .map(l => `${l.IdProducto}_${Number(l.TipoMovimiento || TIPO_LINEA_ENTREGA)}`)
        );
        const quedan = (CM.productos || []).some(p => (
            !usados.has(`${p.Id}_${TIPO_LINEA_ENTREGA}`) ||
            !usados.has(`${p.Id}_${TIPO_LINEA_RETIRO}`)
        ));
        $("#btnAgregarLinea").prop("disabled", CM.soloLectura || !quedan);
        actualizarUIEstadoVaciosEntrega();
    }

    function syncLineaFromRow($tr, linea) {
        linea.TipoMovimiento = parseInt($tr.find(".linea-tipo").val(), 10) || TIPO_LINEA_ENTREGA;
        linea.Cantidad = leerNum($tr.find(".linea-cant").val());
        linea.PrecioVenta = leerNum($tr.find(".linea-precio").val());
        linea.PorcDescuento = leerNum($tr.find(".linea-desc").val());
        linea.PorcIva = leerNum($tr.find(".linea-iva").val());
        linea.IdProducto = parseInt($tr.find(".linea-producto").val(), 10) || 0;
    }

    function calcularLinea(linea) {
        const cant = Number(linea.Cantidad || 0);
        const costo = Number(linea.PrecioVenta || 0);
        const porcDesc = Number(linea.PorcDescuento || 0);
        const porcIva = Number(linea.PorcIva || 0);

        const descUnit = costo * porcDesc / 100;
        const costoCdesc = costo - descUnit;
        const subtotalCdesc = costoCdesc * cant;
        const ivaUnit = costoCdesc * porcIva / 100;
        const ivaTotal = ivaUnit * cant;
        const subtotalFinal = subtotalCdesc + ivaTotal;
        const signo = Number(linea.TipoMovimiento || TIPO_LINEA_ENTREGA) === TIPO_LINEA_RETIRO ? -1 : 1;

        return {
            descTotal: descUnit * cant,
            subtotalCdesc,
            ivaTotal,
            subtotalFinal,
            signo,
            signedSubtotalcDesc: subtotalCdesc * signo,
            signedDescTotal: (descUnit * cant) * signo,
            signedIvaTotal: ivaTotal * signo,
            signedSubtotalFinal: subtotalFinal * signo
        };
    }

    function recalcularTotalesUI() {
        let sub = 0, desc = 0, iva = 0, tot = 0;

        CM.lineas.forEach(l => {
            const c = calcularLinea(l);
            sub += c.signedSubtotalcDesc;
            desc += c.signedDescTotal;
            iva += c.signedIvaTotal;
            tot += c.signedSubtotalFinal;
        });

        $("#totSubtotal").text(fmtMoney(sub));
        $("#totDescuentos").text(fmtMoney(desc));
        $("#totIva").text(fmtMoney(iva));
        $("#totImporte").text(fmtMoney(tot));
        actualizarResumenCobrosUI();
    }

    function obtenerPayload() {
        const payload = {
            Id: CM.id,
            Fecha: $("#cFecha").val() || null,
            IdContrato: parseInt($("#cContrato").val(), 10) || 0,
            IdEstado: parseInt($("#cEstado").val(), 10) || null,
            NotaInterna: ($("#cNota").val() || "").trim() || null,
            NotaCliente: ($("#cNotaCliente").val() || "").trim() || null,
            Lineas: CM.lineas.map(l => ({
                Id: l.Id || 0,
                IdProducto: l.IdProducto,
                TipoMovimiento: Number(l.TipoMovimiento || TIPO_LINEA_ENTREGA),
                Cantidad: l.Cantidad,
                PrecioVenta: l.PrecioVenta,
                CostoUnitario: l.CostoUnitario || 0,
                PorcDescuento: l.PorcDescuento,
                PorcIva: l.PorcIva
            })),
            Cobros: cobrosParaGuardar().map(p => ({
                IdCobro: p.IdCobro || 0,
                IdMovimientoCc: p.IdMovimientoCc || 0,
                IdCuenta: p.IdCuenta,
                Fecha: p.Fecha,
                Concepto: p.Concepto,
                Importe: p.Importe
            }))
        };

        return payload;
    }

    async function guardarEntrega() {
        if (CM.soloLectura) return;

        sincronizarLineasDesdeDom();
        sincronizarCobrosDesdeDom();

        const validacion = validarEntregaLocal();
        if (!validacion.ok) {
            mostrarErrorEntrega(validacion.mensaje, validacion.secciones);
            return;
        }

        const validCobros = validarCobrosLocal();
        if (!validCobros.ok) {
            mostrarErrorEntrega(validCobros.mensaje, { cobros: true });
            return;
        }

        const payload = obtenerPayload();
        const esNuevo = CM.id <= 0;
        const url = esNuevo ? API.insertar : API.actualizar;
        const method = esNuevo ? "POST" : "PUT";

        const r = await fetch(url, {
            method,
            headers: authHeaders(),
            body: JSON.stringify(payload)
        });

        if (!r.ok) {
            mostrarErrorEntrega("Error de comunicación con el servidor.");
            return;
        }

        const result = await r.json();
        const ok = result.valor === true || result.valor === "true" || result.ok === true;

        if (ok) {
            cerrarErrorEntrega();
            limpiarMarcasErrorSeccionesEntrega();
            exitoModal(result.mensaje || (esNuevo ? "Entrega registrada correctamente." : "Entrega guardada correctamente."));
            setTimeout(() => {
                window.location.href = "/ClientesEntregas";
            }, 1000);
        } else {
            const msg = result.mensaje || "No se pudo guardar.";
            mostrarErrorEntrega(msg, inferirSeccionesErrorEntrega(msg));
        }
    }

    async function eliminarEntregaActual() {
        if (CM.id <= 0) return;

        const tieneCobros = (CM.cobrosLineas || []).some(p => p.IdCobro > 0) || cobrosActivos().length > 0;
        const msgCobros = tieneCobros
            ? " También se revertirán los cobros (egresos de caja y cuenta corriente)."
            : "";
        const confirmado = await confirmarModal(
            `¿Eliminar esta entrega? Se revertirá stock y deuda del contrato.${msgCobros}`);
        if (!confirmado) return;

        const r = await fetch(API.eliminar(CM.id), { method: "DELETE", headers: authHeaders() });
        const result = await r.json();
        const exito = result.valor === true || result.valor === "true" || result.ok === true;

        if (exito) {
            exitoModal(result.mensaje || "Entrega eliminada correctamente.");
            window.location.href = "/ClientesEntregas";
        } else {
            errorModal(result.mensaje || "No se pudo eliminar.");
        }
    }

    function fmtMoney(n) {
        const num = Number(n || 0);
        const partes = num.toFixed(2).split(".");
        const txt = typeof formatearMiles === "function"
            ? formatearMiles(partes[0] + "," + partes[1])
            : partes[0] + "," + partes[1];
        return "$ " + txt;
    }
})();
