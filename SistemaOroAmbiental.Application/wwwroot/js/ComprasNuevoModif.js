/* =========================================================
   COMPRAS NUEVO/MODIF  estilo VentasNuevoModif (Levels)
========================================================= */

(function () {
    "use strict";

    const CM = {
        init: window.CM_INIT || { id: 0, idProveedor: 0 },
        id: 0,
        soloLectura: false,
        proveedores: [],
        sucursales: [],
        productos: [],
        lineas: [],
        nextLineId: 1,
        pagosLineas: [],
        pagosResumen: null,
        cuentasCaja: [],
        nextPagoKey: 1
    };

    const API = {
        editarInfo: id => `/Compras/EditarInfo?id=${id}`,
        insertar: "/Compras/Insertar",
        actualizar: "/Compras/Actualizar",
        eliminar: id => `/Compras/Eliminar?id=${id}`,
        pagos: id => `/Compras/Pagos?id=${id}`,
        proveedores: "/Proveedores/Lista",
        productos: "/Productos/Lista",
        sucursales: "/Sucursales/Lista",
        cuentas: "/Cuentas/Lista"
    };

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
        ($scope || $("#tbodyLineasCompra")).find(".linea-cant, .linea-costo, .linea-desc, .linea-iva").each(function () {
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

        initTabsCompra();
        wireEventosCompra();
        initModalesAtajos();

        await cargarCombosCompra();
        await cargarCuentasCajaCompra();

        if (CM.id > 0) {
            await cargarCompra(CM.id);
            await cargarPagosCompra();
        } else {
            setModoNuevo();
            if (CM.init.idProveedor) {
                $("#cProveedor").val(String(CM.init.idProveedor)).trigger("change.select2");
            }
            agregarLinea();
            actualizarResumenPagosUI();
        }
    });

    function initTabsCompra() {
        $(".vn-head-btn").on("click", function () {
            const sec = $(this).data("sec");
            $(".vn-head-btn").removeClass("active");
            $(this).addClass("active");
            $(".vn-section").removeClass("active");
            $(`#sec-${sec}`).addClass("active");
        });
    }

    function wireEventosCompra() {
    $("#btnGuardarCompra").on("click", busyHandler(guardarCompra));
        $("#btnEliminarCompra").on("click", eliminarCompraActual);
        $("#btnAgregarLinea").on("click", () => agregarLinea());

        $("#btnCrearProveedor").on("click", () => {
            window.nuevoProveedor?.();
        });

        $("#btnCrearProducto").on("click", () => {
            window.nuevoProducto?.();
        });

        $("#btnAgregarPagoCompra").on("click", () => agregarPagoLinea());
    }

    window.cerrarErrorCompra = function () {
        $("#errorCamposCompra").addClass("d-none");
        limpiarMarcasErrorSeccionesCompra();
    };

    function limpiarMarcasErrorSeccionesCompra() {
        $(".vn-head-btn").removeClass("error");
    }

    function marcarSeccionesErrorCompra(secciones) {
        limpiarMarcasErrorSeccionesCompra();
        if (!secciones) return;

        if (secciones.datos) {
            $('.vn-head-btn[data-sec="datos"]').addClass("error");
        }
        if (secciones.productos) {
            $('.vn-head-btn[data-sec="productos"]').addClass("error");
        }
        if (secciones.pagos) {
            $('.vn-head-btn[data-sec="pagos"]').addClass("error");
        }

        if (secciones.datos) {
            activarTabCompra("datos");
        } else if (secciones.productos) {
            activarTabCompra("productos");
        } else if (secciones.pagos) {
            activarTabCompra("pagos");
        }
    }

    function activarTabCompra(sec) {
        const $btn = $(`.vn-head-btn[data-sec="${sec}"]`);
        if (!$btn.length) return;
        $btn.trigger("click");
    }

    function inferirSeccionesErrorCompra(mensaje) {
        const m = String(mensaje || "").toLowerCase();
        const secciones = { datos: false, productos: false };

        const clavesDatos = ["proveedor", "sucursal", "fecha", "nota"];
        const clavesPagos = ["pago", "pagos", "cuenta", "caja"];
        const clavesProductos = ["producto", "linea", "cantidad", "costo", "item", "lineas"];

        clavesDatos.forEach(k => { if (m.includes(k)) secciones.datos = true; });
        clavesProductos.forEach(k => { if (m.includes(k)) secciones.productos = true; });
        clavesPagos.forEach(k => { if (m.includes(k)) secciones.pagos = true; });

        return secciones;
    }

    function pagosActivos() {
        return (CM.pagosLineas || []).filter(p => Number(p.Importe) > 0 || p.IdPago > 0);
    }

    function validarPagosLocal() {
        sincronizarPagosDesdeDom();

        const activos = pagosActivos();
        if (!activos.length) {
            return { ok: true, mensaje: "" };
        }

        const totalCompra = calcularTotalCompraDesdeLineas();
        const suma = activos.reduce((s, p) => s + Number(p.Importe || 0), 0);

        if (suma > totalCompra + 0.01) {
            return {
                ok: false,
                mensaje: "La suma de los pagos no puede superar el total de la compra."
            };
        }

        for (const p of activos) {
            if (!p.Fecha || !p.IdSucursal || !p.IdCuenta || !(p.Concepto || "").trim() || p.Importe <= 0) {
                return { ok: false, mensaje: "Revise los pagos: fecha, sucursal, cuenta, concepto e importe son obligatorios." };
            }
        }

        return { ok: true, mensaje: "" };
    }

    function sincronizarPagosDesdeDom() {
        $("#tbodyPagosCompra tr").each(function () {
            const key = Number($(this).data("key"));
            const pago = CM.pagosLineas.find(x => x._key === key);
            if (pago) syncPagoFromRow($(this), pago);
        });
    }

    function sincronizarLineasDesdeDom() {
        $("#tbodyLineasCompra tr").each(function () {
            const key = Number($(this).data("key"));
            const linea = CM.lineas.find(x => x._key === key);
            if (linea) syncLineaFromRow($(this), linea);
        });
    }

    function validarCompraLocal() {
        sincronizarLineasDesdeDom();

        const erroresDatos = [];
        const erroresProductos = [];

        if (!$("#cFecha").val()) {
            erroresDatos.push("Indique la fecha de la compra.");
        }
        if (!(parseInt($("#cProveedor").val(), 10) > 0)) {
            erroresDatos.push("Seleccione un proveedor.");
        }
        if (!(parseInt($("#cSucursal").val(), 10) > 0)) {
            erroresDatos.push("Seleccione una sucursal.");
        }

        const lineasConProducto = CM.lineas.filter(l => l.IdProducto > 0);

        if (lineasConProducto.length === 0) {
            erroresProductos.push("Agregue al menos un producto a la compra.");
        } else {
            const sinProducto = CM.lineas.some(l => !l.IdProducto);
            if (sinProducto) {
                erroresProductos.push("Hay lineas sin producto seleccionado.");
            }

            const cantidadInvalida = CM.lineas.some(l => l.IdProducto > 0 && !(Number(l.Cantidad) > 0));
            if (cantidadInvalida) {
                erroresProductos.push("Las cantidades deben ser mayores a cero.");
            }

            const costoInvalido = CM.lineas.some(l => l.IdProducto > 0 && Number(l.CostoUnitario) < 0);
            if (costoInvalido) {
                erroresProductos.push("El costo unitario no puede ser negativo.");
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

    function mostrarErrorCompra(msg, secciones) {
        const texto = msg || "Revise los datos ingresados.";
        const $p = $("#errorCamposCompra");
        $p.find(".rp-error-message").text(texto);
        $p.removeClass("d-none");

        const flags = secciones || inferirSeccionesErrorCompra(texto);
        if (flags.datos || flags.productos) {
            marcarSeccionesErrorCompra(flags);
        } else {
            limpiarMarcasErrorSeccionesCompra();
        }

        if ($p.offset()) {
            $("html, body").animate({ scrollTop: $p.offset().top - 80 }, 200);
        }
        if (typeof errorModal === "function") {
            errorModal(texto);
        }
    }

    function initModalesAtajos() {
        if (typeof initProveedorModal === "function") {
            initProveedorModal({
                token: token,
                onSaved: async (data) => {
                    await cargarProveedoresCompra();
                    const id = data?.id ?? data?.Id;
                    if (id) $("#cProveedor").val(String(id)).trigger("change.select2");
                }
            });
        }

        if (typeof initProductoModal === "function") {
            initProductoModal({
                token: token,
                onSaved: async (data) => {
                    await cargarProductosCompra();
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

    async function cargarCombosCompra() {
        await Promise.all([
            cargarProveedoresCompra(),
            cargarSucursalesCompra(),
            cargarProductosCompra()
        ]);

        initSelectProveedorHeader();
        ensureSelect2Cm($("#cSucursal"), { placeholder: "Seleccionar sucursal" });

        if (typeof aplicarBloqueoSucursalUnica === "function") {
            aplicarBloqueoSucursalUnica($("#cSucursal"), { triggerChange: false, sucursales: CM.sucursales });
        }
    }

    async function cargarProveedoresCompra() {
        const r = await fetch(API.proveedores, { headers: authHeaders() });
        CM.proveedores = r.ok ? await r.json() : [];

        const $p = $("#cProveedor");
        const val = $p.val();
        $p.empty().append(`<option value="">Seleccionar</option>`);
        CM.proveedores.forEach(x => {
            $p.append(`<option value="${x.Id}">${x.Nombre}</option>`);
        });
        if (val) $p.val(val);
        initSelectProveedorHeader();
    }

    function initSelectProveedorHeader() {
        const $p = $("#cProveedor");
        if (!$p.length) return;
        ensureSelect2Cm($p, {
            placeholder: "Seleccionar proveedor",
            dropdownParent: $(".compras-nuevo")
        });
    }

    async function cargarSucursalesCompra() {
        CM.sucursales = typeof fetchSucursalesPermitidas === "function"
            ? await fetchSucursalesPermitidas(API.sucursales)
            : await (await fetch(API.sucursales, { headers: authHeaders() })).json();

        if (typeof llenarSelectSucursales === "function") {
            llenarSelectSucursales($("#cSucursal"), CM.sucursales);
        } else {
            const $s = $("#cSucursal");
            $s.empty().append(`<option value="">Seleccionar</option>`);
            (CM.sucursales || []).forEach(x => {
                $s.append(`<option value="${x.Id}">${x.Nombre}</option>`);
            });
        }
        ensureSelect2Cm($("#cSucursal"), { placeholder: "Seleccionar sucursal" });
    }

    async function cargarProductosCompra() {
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
        CM.pagosLineas = [];
        $("#tituloPaginaCompra").text("Nueva compra");
        $("#lblGuardarCompra").text("Registrar compra");
        $("#btnEliminarCompra").prop("hidden", true);
        $("#alertCompraPagos").prop("hidden", true);

        const hoy = new Date().toISOString().slice(0, 10);
        $("#cFecha").val(hoy);
    }

    async function cargarCompra(id) {
        const r = await fetch(API.editarInfo(id), { headers: authHeaders() });
        if (!r.ok) {
            errorModal("No se encontro la compra.");
            return;
        }

        const d = await r.json();
        CM.id = d.Id;
        CM.soloLectura = !d.PuedeEditar;

        $("#tituloPaginaCompra").text(`Compra #${d.Id}`);
        $("#lblGuardarCompra").text(d.PuedeEditar ? "Guardar cambios" : "Solo lectura");
        $("#btnEliminarCompra").prop("hidden", !d.PuedeEliminar);
        $("#alertCompraPagos").prop("hidden", !d.TienePagos);
        CM.pagosLineas = [];

        const fecha = d.Fecha ? String(d.Fecha).slice(0, 10) : "";
        $("#cFecha").val(fecha);
        $("#cNota").val(d.NotaInterna || "");

        $("#cProveedor").val(String(d.IdProveedor)).trigger("change.select2");
        $("#cSucursal").val(String(d.IdSucursal)).trigger("change.select2");

        CM.lineas = (d.Lineas || []).map(l => ({
            _key: CM.nextLineId++,
            Id: l.Id,
            IdProducto: l.IdProducto,
            Cantidad: Number(l.Cantidad || 0),
            CostoUnitario: Number(l.CostoUnitario || 0),
            PorcDescuento: Number(l.PorcDescuento || 0),
            PorcIva: Number(l.PorcIva || 0)
        }));

        renderLineas();
        recalcularTotalesUI();

        if (CM.soloLectura) aplicarSoloLectura();

        await cargarPagosCompra();
    }

    function aplicarSoloLectura() {
        $("#btnGuardarCompra").prop("disabled", true);
        $("#btnAgregarLinea, #btnCrearProducto, #btnCrearProveedor").prop("hidden", true);
        $("#cFecha, #cNota").prop("disabled", true);
        $("#cProveedor, #cSucursal").prop("disabled", true);
        $("#tbodyLineasCompra input, #tbodyLineasCompra select").prop("disabled", true);
        $("#tbodyLineasCompra .btn-quitar-linea").prop("hidden", true);
        $("#btnAgregarPagoCompra").prop("hidden", true);
        $("#tbodyPagosCompra input, #tbodyPagosCompra select").prop("disabled", true);
        $("#tbodyPagosCompra .btn-quitar-pago-linea").prop("hidden", true);
    }

    function restaurarEdicionCompra() {
        $("#btnGuardarCompra").prop("disabled", false);
        $("#lblGuardarCompra").text("Guardar cambios");
        $("#btnAgregarLinea, #btnCrearProducto, #btnCrearProveedor").prop("hidden", false);
        $("#cFecha, #cNota").prop("disabled", false);
        $("#cProveedor, #cSucursal").prop("disabled", false);
        $("#tbodyLineasCompra input, #tbodyLineasCompra select").prop("disabled", false);
        $("#tbodyLineasCompra .btn-quitar-linea").prop("hidden", false);
        $("#btnAgregarPagoCompra").prop("hidden", false);
        $("#tbodyPagosCompra input, #tbodyPagosCompra select").prop("disabled", false);
        $("#tbodyPagosCompra .btn-quitar-pago-linea").prop("hidden", false);
        refrescarSelectsProducto();
        actualizarBotonAgregarLinea();
    }

    async function cargarCuentasCajaCompra() {
        try {
            const r = await fetch(API.cuentas, { headers: authHeaders() });
            CM.cuentasCaja = r.ok ? await r.json() : [];
        } catch {
            CM.cuentasCaja = [];
        }
    }

    function cuentasPorSucursalCompra(idSucursal) {
        if (!idSucursal) return CM.cuentasCaja || [];
        return (CM.cuentasCaja || []).filter(x => String(x.IdCombo) === String(idSucursal));
    }

    function calcularTotalCompraDesdeLineas() {
        let tot = 0;
        CM.lineas.forEach(l => {
            tot += calcularLinea(l).subtotalFinal;
        });
        return tot;
    }

    function htmlOpcionesSucursalPago(pago) {
        return (CM.sucursales || [])
            .map(s =>
                `<option value="${s.Id}" ${String(s.Id) === String(pago.IdSucursal) ? "selected" : ""}>${escapeHtmlCm(s.Nombre)}</option>`
            )
            .join("");
    }

    function htmlOpcionesCuentaPago(pago) {
        const cuentas = cuentasPorSucursalCompra(pago.IdSucursal);
        if (!pago.IdSucursal) {
            return `<option value="">Seleccione sucursal</option>`;
        }
        return cuentas
            .map(c =>
                `<option value="${c.Id}" ${String(c.Id) === String(pago.IdCuenta) ? "selected" : ""}>${escapeHtmlCm(c.Nombre)}</option>`
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

    function conceptoPagoDefault() {
        return CM.id > 0 ? `Pago compra #${CM.id}` : "Pago compra";
    }

    function agregarPagoLinea(preset) {
        if (CM.soloLectura) return;

        const hoy = new Date().toISOString().slice(0, 10);
        const idSucCompra = parseInt($("#cSucursal").val(), 10) || 0;

        const pago = preset || {
            _key: CM.nextPagoKey++,
            IdPago: 0,
            IdMovimientoCc: 0,
            Fecha: hoy,
            IdSucursal: idSucCompra,
            IdCuenta: 0,
            Concepto: conceptoPagoDefault(),
            Importe: 0
        };

        CM.pagosLineas.push(pago);
        renderPagosLineas();
        actualizarResumenPagosUI();
    }

    function quitarPagoLinea(key) {
        if (CM.soloLectura) return;
        CM.pagosLineas = CM.pagosLineas.filter(x => x._key !== key);
        renderPagosLineas();
        actualizarResumenPagosUI();
    }

    function syncPagoFromRow($tr, pago) {
        pago.Fecha = $tr.find(".pago-fecha").val() || "";
        pago.IdSucursal = parseInt($tr.find(".pago-sucursal").val(), 10) || 0;
        pago.IdCuenta = parseInt($tr.find(".pago-cuenta").val(), 10) || 0;
        pago.Concepto = ($tr.find(".pago-concepto").val() || "").trim();
        pago.Importe = leerNum($tr.find(".pago-importe").val());
    }

    function renderPagosLineas() {
        const $tb = $("#tbodyPagosCompra");
        $tb.empty();

        const vacio = CM.pagosLineas.length === 0;
        $("#lblSinPagos").prop("hidden", !vacio);
        $("#tblPagosCompra").closest(".vn-gridtable").toggleClass("d-none", vacio);

        CM.pagosLineas.forEach(pago => {
            const k = pago._key;
            const fechaVal = fechaInputValor(pago.Fecha);
            const sucOpts = htmlOpcionesSucursalPago(pago);
            const ctaOpts = htmlOpcionesCuentaPago(pago);

            const tr = $(`
                <tr data-key="${k}">
                    <td><input type="date" class="form-control vn-input vn-mini pago-fecha" value="${fechaVal}" /></td>
                    <td>
                        <select class="form-select vn-input vn-mini pago-sucursal" id="pago_${k}_sucursal">
                            <option value="">Seleccionar</option>
                            ${sucOpts}
                        </select>
                    </td>
                    <td>
                        <select class="form-select vn-input vn-mini pago-cuenta" id="pago_${k}_cuenta">
                            <option value="">Seleccionar</option>
                            ${ctaOpts}
                        </select>
                    </td>
                    <td><input type="text" class="form-control vn-input vn-mini pago-concepto" maxlength="200" /></td>
                    <td><input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles pago-importe text-end" value="${fmtInputNum(pago.Importe)}" /></td>
                    <td class="text-center">
                        <button type="button" class="btn btn-outline-danger btn-sm btn-quitar-pago-linea" title="Quitar">
                            <i class="fa fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `);

            $tb.append(tr);
            tr.find(".pago-concepto").val(pago.Concepto || "");

            const $imp = tr.find(".pago-importe");
            if (typeof prepararInputMiles === "function") prepararInputMiles($imp[0]);
            if ($imp[0].value && typeof formatearMilesInput === "function") formatearMilesInput($imp[0]);

            const $suc = tr.find(".pago-sucursal");
            const $cta = tr.find(".pago-cuenta");
            ensureSelect2Cm($suc, { placeholder: "Sucursal", dropdownParent: $(".compras-nuevo") });
            ensureSelect2Cm($cta, { placeholder: "Cuenta", dropdownParent: $(".compras-nuevo") });

            $suc.on("change", function () {
                pago.IdSucursal = parseInt($(this).val(), 10) || 0;
                pago.IdCuenta = 0;
                const opts = htmlOpcionesCuentaPago(pago);
                if ($cta.data("select2")) $cta.select2("destroy");
                $cta.html(`<option value="">Seleccionar</option>${opts}`).val("");
                ensureSelect2Cm($cta, { placeholder: "Cuenta", dropdownParent: $(".compras-nuevo") });
                actualizarResumenPagosUI();
            });

            tr.find(".pago-fecha, .pago-concepto, .pago-importe").on("input change", function () {
                syncPagoFromRow(tr, pago);
                actualizarResumenPagosUI();
            });

            $cta.on("change", function () {
                syncPagoFromRow(tr, pago);
                actualizarResumenPagosUI();
            });

            tr.find(".btn-quitar-pago-linea").on("click", () => quitarPagoLinea(k));
        });

        $("#btnAgregarPagoCompra").prop("disabled", CM.soloLectura);
    }

    function escapeHtmlCm(t) {
        return String(t ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function actualizarResumenPagosUI() {
        const totalCompra = calcularTotalCompraDesdeLineas();
        const activos = pagosActivos();
        const totalPagado = activos.reduce((s, p) => s + Number(p.Importe || 0), 0);

        const saldo = Math.max(0, totalCompra - totalPagado);

        $("#pagoTotCompra").text(fmtMoney(totalCompra));
        $("#pagoTotPagado").text(fmtMoney(totalPagado));
        $("#pagoSaldoPend").text(fmtMoney(saldo));
        $("#totPagadoResumen").text(fmtMoney(totalPagado));
        $("#totSaldoResumen").text(fmtMoney(saldo));
        $("#cntPagos").text(`(${activos.length})`);

        const accionGuardar = CM.id > 0 ? "Guardar cambios" : "Registrar compra";
        $("#lblPagosHintText").text(
            activos.length
                ? `${activos.length} pago(s) en la grilla. Se guardan al pulsar ${accionGuardar} (caja y cuenta corriente).`
                : "Agrega filas de pago como en productos. Nada se registra hasta guardar la compra."
        );
    }

    async function cargarPagosCompra() {
        if (CM.id <= 0) {
            renderPagosLineas();
            actualizarResumenPagosUI();
            return;
        }

        try {
            const r = await fetch(API.pagos(CM.id), { headers: authHeaders() });
            if (!r.ok) return;

            const d = await r.json();
            CM.pagosResumen = d;
            const lista = d.Pagos || d.pagos || [];

            CM.pagosLineas = lista.map(p => ({
                _key: CM.nextPagoKey++,
                IdPago: p.IdPago ?? p.idPago ?? 0,
                IdMovimientoCc: p.IdMovimientoCc ?? p.idMovimientoCc ?? 0,
                Fecha: fechaInputValor(p.Fecha || p.fecha),
                IdSucursal: p.IdSucursal ?? p.idSucursal ?? 0,
                IdCuenta: p.IdCuenta ?? p.idCuenta ?? 0,
                Concepto: p.Concepto || p.concepto || conceptoPagoDefault(),
                Importe: Number(p.Importe ?? p.importe ?? 0)
            }));

            const tienePagos = d.TienePagos === true || d.tienePagos === true || CM.pagosLineas.length > 0;
            $("#alertCompraPagos").prop("hidden", !tienePagos);

            renderPagosLineas();
            actualizarResumenPagosUI();
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
            Cantidad: 1,
            CostoUnitario: 0,
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

    /** IDs de producto ya elegidos en otras lineas (no repetir en la misma compra). */
    function idsProductosEnOtrasLineas(excluirKey) {
        const ids = new Set();
        CM.lineas.forEach(l => {
            if (l._key !== excluirKey && l.IdProducto > 0) {
                ids.add(l.IdProducto);
            }
        });
        return ids;
    }

    function htmlOpcionesProducto(linea) {
        const usados = idsProductosEnOtrasLineas(linea._key);
        return (CM.productos || [])
            .filter(p => !usados.has(p.Id) || p.Id === linea.IdProducto)
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
            ensureSelect2Cm($sel, { placeholder: "Producto", dropdownParent: $(".compras-nuevo") });
        });
    }

    function renderLineas() {
        const $tb = $("#tbodyLineasCompra");
        $tb.empty();

        const vacio = CM.lineas.length === 0;
        $("#lblSinLineas").prop("hidden", !vacio);
        $(".vn-gridtable").prop("hidden", vacio);
        $("#cntProductos").text(`(${CM.lineas.length})`);

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
                    <td><input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-cant" value="${fmtInputNum(linea.Cantidad)}" /></td>
                    <td><input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-costo" value="${fmtInputNum(linea.CostoUnitario)}" /></td>
                    <td><input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-desc" value="${fmtInputNum(linea.PorcDescuento)}" /></td>
                    <td><input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-iva" value="${fmtInputNum(linea.PorcIva)}" /></td>
                    <td class="text-end linea-subtotal-cell linea-subtotal">${fmtMoney(calc.subtotalFinal)}</td>
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
            ensureSelect2Cm($sel, { placeholder: "Producto", dropdownParent: $(".compras-nuevo") });

            $sel.on("change", function () {
                linea.IdProducto = parseInt($(this).val(), 10) || 0;
                const prod = CM.productos.find(p => p.Id === linea.IdProducto);
                if (prod && !linea.CostoUnitario) {
                    linea.CostoUnitario = Number(prod.CostoUnitario || 0);
                    setValorInputMiles(tr.find(".linea-costo"), linea.CostoUnitario);
                }
                syncLineaFromRow(tr, linea);
                tr.find(".linea-subtotal").text(fmtMoney(calcularLinea(linea).subtotalFinal));
                recalcularTotalesUI();
                refrescarSelectsProducto();
            });

            tr.find(".linea-cant, .linea-costo, .linea-desc, .linea-iva").on("input change", function () {
                syncLineaFromRow(tr, linea);
                tr.find(".linea-subtotal").text(fmtMoney(calcularLinea(linea).subtotalFinal));
                recalcularTotalesUI();
            });

            tr.find(".btn-quitar-linea").on("click", () => quitarLinea(k));
        });

        const usados = new Set(CM.lineas.filter(l => l.IdProducto > 0).map(l => l.IdProducto));
        const quedan = (CM.productos || []).some(p => !usados.has(p.Id));
        $("#btnAgregarLinea").prop("disabled", CM.soloLectura || !quedan);
    }

    function syncLineaFromRow($tr, linea) {
        linea.Cantidad = leerNum($tr.find(".linea-cant").val());
        linea.CostoUnitario = leerNum($tr.find(".linea-costo").val());
        linea.PorcDescuento = leerNum($tr.find(".linea-desc").val());
        linea.PorcIva = leerNum($tr.find(".linea-iva").val());
        linea.IdProducto = parseInt($tr.find(".linea-producto").val(), 10) || 0;
    }

    function calcularLinea(linea) {
        const cant = Number(linea.Cantidad || 0);
        const costo = Number(linea.CostoUnitario || 0);
        const porcDesc = Number(linea.PorcDescuento || 0);
        const porcIva = Number(linea.PorcIva || 0);

        const descUnit = costo * porcDesc / 100;
        const costoCdesc = costo - descUnit;
        const subtotalCdesc = costoCdesc * cant;
        const ivaUnit = costoCdesc * porcIva / 100;
        const ivaTotal = ivaUnit * cant;
        const subtotalFinal = subtotalCdesc + ivaTotal;

        return {
            descTotal: descUnit * cant,
            subtotalCdesc,
            ivaTotal,
            subtotalFinal
        };
    }

    function recalcularTotalesUI() {
        let sub = 0, desc = 0, iva = 0, tot = 0;

        CM.lineas.forEach(l => {
            const c = calcularLinea(l);
            sub += c.subtotalCdesc;
            desc += c.descTotal;
            iva += c.ivaTotal;
            tot += c.subtotalFinal;
        });

        $("#totSubtotal").text(fmtMoney(sub));
        $("#totDescuentos").text(fmtMoney(desc));
        $("#totIva").text(fmtMoney(iva));
        $("#totImporte").text(fmtMoney(tot));
        actualizarResumenPagosUI();
    }

    function obtenerPayload() {
        const payload = {
            Id: CM.id,
            Fecha: $("#cFecha").val() || null,
            IdProveedor: parseInt($("#cProveedor").val(), 10) || 0,
            IdSucursal: parseInt($("#cSucursal").val(), 10) || 0,
            NotaInterna: ($("#cNota").val() || "").trim() || null,
            Lineas: CM.lineas.map(l => ({
                Id: l.Id || 0,
                IdProducto: l.IdProducto,
                Cantidad: l.Cantidad,
                CostoUnitario: l.CostoUnitario,
                PorcDescuento: l.PorcDescuento,
                PorcIva: l.PorcIva
            })),
            Pagos: pagosActivos().map(p => ({
                IdPago: p.IdPago || 0,
                IdMovimientoCc: p.IdMovimientoCc || 0,
                IdCuenta: p.IdCuenta,
                Fecha: p.Fecha,
                Concepto: p.Concepto,
                Importe: p.Importe
            }))
        };

        return payload;
    }

    async function guardarCompra() {
        if (CM.soloLectura) return;

        sincronizarLineasDesdeDom();
        sincronizarPagosDesdeDom();

        const validacion = validarCompraLocal();
        if (!validacion.ok) {
            mostrarErrorCompra(validacion.mensaje, validacion.secciones);
            return;
        }

        const validPagos = validarPagosLocal();
        if (!validPagos.ok) {
            mostrarErrorCompra(validPagos.mensaje, { pagos: true });
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
            mostrarErrorCompra("Error de comunicacion con el servidor.");
            return;
        }

        const result = await r.json();
        const ok = result.valor === true || result.valor === "true" || result.ok === true;

        if (ok) {
            cerrarErrorCompra();
            limpiarMarcasErrorSeccionesCompra();
            exitoModal(result.mensaje || (esNuevo ? "Compra registrada correctamente." : "Compra guardada correctamente."));
            setTimeout(() => {
                window.location.href = "/Compras";
            }, 1000);
        } else {
            const msg = result.mensaje || "No se pudo guardar.";
            mostrarErrorCompra(msg, inferirSeccionesErrorCompra(msg));
        }
    }

    async function eliminarCompraActual() {
        if (CM.id <= 0) return;

        const tienePagos = (CM.pagosLineas || []).some(p => p.IdPago > 0) || pagosActivos().length > 0;
        const msgPagos = tienePagos
            ? " Tambien se revertiran los pagos (egresos de caja y cuenta corriente)."
            : "";
        const confirmado = await confirmarModal(
            `Eliminar esta compra? Se revertira stock y deuda del proveedor.${msgPagos}`);
        if (!confirmado) return;

        const r = await fetch(API.eliminar(CM.id), { method: "DELETE", headers: authHeaders() });
        const result = await r.json();
        const exito = result.valor === true || result.valor === "true" || result.ok === true;

        if (exito) {
            exitoModal(result.mensaje || "Compra eliminada correctamente.");
            window.location.href = "/Compras";
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
